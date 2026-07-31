/* Screen messaging: ephemeral toasts, blocking confirms, and small chrome scroll helpers.
   confirm(opts) resolves true on OK and false on Cancel / Escape / backdrop. */
angular.module('deliveryMethodology').factory('MessagingService', ['$timeout', '$q', function ($timeout, $q) {
  'use strict';

  var TOAST_MS = 2200;
  var toastTimer = null;
  var toast = {
    show: false,
    msg: ''
  };

  var confirmState = {
    open: false,
    title: '',
    body: '',
    cancel: 'Cancel',
    ok: 'Confirm'
  };
  var pendingResolve = null;

  function toastMessage(msg) {
    toast.msg = msg || '';
    toast.show = true;
    if (toastTimer) {
      $timeout.cancel(toastTimer);
    }
    toastTimer = $timeout(function () {
      toast.show = false;
    }, TOAST_MS);
  }

  function closeConfirm(accepted) {
    var resolve = pendingResolve;
    pendingResolve = null;
    confirmState.open = false;
    if (resolve) {
      resolve(!!accepted);
    }
  }

  function confirm(opts) {
    opts = opts || {};
    if (confirmState.open) {
      closeConfirm(false);
    }
    confirmState.title = opts.title || 'Are you sure?';
    confirmState.body = opts.body || '';
    confirmState.cancel = opts.cancel || 'Cancel';
    confirmState.ok = opts.ok || 'Confirm';
    confirmState.open = true;
    return $q(function (resolve) {
      pendingResolve = resolve;
    });
  }

  function acceptConfirm() {
    closeConfirm(true);
  }

  function dismissConfirm() {
    closeConfirm(false);
  }

  function scrollBehavior() {
    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return 'auto';
      }
    } catch (error) {
      // matchMedia can throw in older embedded browsers; fall through to smooth.
    }
    return 'smooth';
  }

  function scrollPageToTop() {
    $timeout(function () {
      // scrollIntoView on a top sentinel is more reliable than window.scrollTo in Service Portal,
      // where the real scroller is often a portal container rather than the window.
      var root = document.querySelector('.app--chrome') || document.querySelector('.dm-widget') || document.body;
      if (root && root.scrollIntoView) {
        root.scrollIntoView({
          behavior: scrollBehavior(),
          block: 'start'
        });
      }
      window.scrollTo({
        top: 0,
        behavior: scrollBehavior()
      });
    }, 0);
  }

  function scrollToEditBar() {
    var attempts = 0;
    var maxAttempts = 12;

    function attempt() {
      attempts += 1;
      // Broadened from '.main .edit-bar' to a page-wide query: '.main' no longer exists once the
      // Methodology view (the only widget with an edit bar) is its own widget/DOM subtree - see
      // ServiceNow/apps/delivery-methodology/CLAUDE.md's multi-widget note.
      var bar = document.querySelector('.edit-bar');
      if (!bar) {
        if (attempts < maxAttempts) {
          $timeout(attempt, 50);
        }
        return;
      }

      // scrollIntoView walks ancestor overflow containers (SP page scrollers). window.scrollTo
      // alone is a no-op when the portal, not the window, is the scrolling box.
      bar.scrollIntoView({
        behavior: scrollBehavior(),
        block: 'start'
      });
    }

    // Retries cover ng-if mount after dm-state + the sibling-widget $timeout digest kick.
    $timeout(attempt, 0);
  }

  function readState() {
    return {
      toast: toast,
      confirm: confirmState
    };
  }

  return {
    toast: toastMessage,
    confirm: confirm,
    acceptConfirm: acceptConfirm,
    dismissConfirm: dismissConfirm,
    scrollPageToTop: scrollPageToTop,
    scrollToEditBar: scrollToEditBar,
    readState: readState
  };
}]);
