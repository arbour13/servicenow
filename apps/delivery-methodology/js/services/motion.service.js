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
  function transition(apply) {
    if (prefersReducedMotion() || !supportsViewTransitions()) {
      apply();
      return null;
    }

    // $timeout rather than a bare apply(): startViewTransition needs a promise that settles only
    // once the "after" DOM exists, and this runs inside ng-click's own $apply, where calling
    // $apply/$digest again synchronously throws "$apply already in progress". $timeout defers to
    // the next tick - after the current digest has finished - and wraps its callback in a fresh
    // $apply, so Angular has actually re-rendered before the after-snapshot is taken.
    return document.startViewTransition(function () {
      return $timeout(apply, 0);
    });
  }

  return {
    prefersReducedMotion: prefersReducedMotion,
    supportsViewTransitions: supportsViewTransitions,
    transition: transition
  };
}]);
