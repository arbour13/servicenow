/* Shared motion helpers.

   `transition()` wraps a DOM change in a browser View Transition (a crossfade between a before and
   after snapshot of the page). This exists because the app's biggest state changes - switching
   view widget, swapping the sub-phase panel, toggling theme - all replace DOM wholesale via ng-if
   or a [data-theme] flip, so there is no surviving element for a CSS transition to animate, and
   ngAnimate is not loaded. View Transitions animate exactly that case: identity does not have to
   survive, because the browser crossfades pictures rather than elements.

   Unchanged regions crossfade against themselves and so read as static - which is why one
   whole-page transition can serve a whole-page theme flip AND a single-panel content swap without
   either needing per-component styling. Duration lives in app.scss's ::view-transition-old/-new. */
angular.module('deliveryMethodology').factory('MotionService', ['$timeout', function ($timeout) {
  'use strict';

  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function supportsViewTransitions() {
    return typeof document.startViewTransition === 'function';
  }

  // apply() must perform the DOM change. Callers are expected to already be inside an ng-click
  // digest; the fallback path therefore calls apply() straight through (still inside that digest),
  // while the transition path defers via $timeout - see the note below.
  //
  // scopeClass (optional) is put on <html> for the life of the transition, so CSS can change what
  // the transition actually animates. Without it the browser crossfades ONE group - `root`, the
  // whole viewport - which is right for a theme flip or a view swap, but wrong for a change
  // confined to one region: see the panel-only rules in app.scss, which use a scope class to give
  // the panel its own group and silence root's. It is a class rather than a flag because only CSS
  // can express "name this element's group" and "don't animate root".
  function transition(apply, scopeClass) {
    if (prefersReducedMotion() || !supportsViewTransitions()) {
      apply();
      return null;
    }

    var root = document.documentElement;

    // Added BEFORE startViewTransition, never inside the callback: the browser captures the
    // "old" snapshot the moment startViewTransition is called, and view-transition-name has to
    // already be in effect by then or the element is captured as part of root instead.
    if (scopeClass) {
      root.classList.add(scopeClass);
    }

    // $timeout rather than a bare apply(): startViewTransition needs a promise that settles only
    // once the "after" DOM exists, and this runs inside ng-click's own $apply, where calling
    // $apply/$digest again synchronously throws "$apply already in progress". $timeout defers to
    // the next tick - after the current digest has finished - and wraps its callback in a fresh
    // $apply, so Angular has actually re-rendered before the after-snapshot is taken.
    var viewTransition = document.startViewTransition(function () {
      return $timeout(apply, 0);
    });

    if (scopeClass) {
      // then(cleanup, cleanup) not .finally(): `finished` REJECTS when a transition is skipped
      // (an overlapping one, a backgrounded tab), and an uncleaned scope class would silently
      // re-scope every later transition on the page.
      viewTransition.finished.then(function () {
        root.classList.remove(scopeClass);
      }, function () {
        root.classList.remove(scopeClass);
      });
    }

    return viewTransition;
  }

  return {
    prefersReducedMotion: prefersReducedMotion,
    supportsViewTransitions: supportsViewTransitions,
    transition: transition
  };
}]);
