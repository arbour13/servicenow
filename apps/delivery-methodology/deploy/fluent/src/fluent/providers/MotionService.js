['$timeout', function ($timeout) {
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
}]