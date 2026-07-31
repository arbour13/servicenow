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

  function scrollPageToTop() {
    $timeout(function () {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }, 0);
  }

  function scrollToEditBar() {
    $timeout(function () {
      // Broadened from '.main .edit-bar' to a page-wide query: '.main' no longer exists once the
      // Methodology view (the only widget with an edit bar) is its own widget/DOM subtree - see
      // ServiceNow/apps/delivery-methodology/CLAUDE.md's multi-widget note.
      var bar = document.querySelector('.edit-bar');
      if (bar) {
        var stickyTop = parseFloat(window.getComputedStyle(bar).top) || 0;
        var target = Math.max(0, window.scrollY + bar.getBoundingClientRect().top - stickyTop);
        window.scrollTo({
          top: target,
          behavior: 'smooth'
        });
      }
    }, 0);
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
