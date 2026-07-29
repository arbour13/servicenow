/* <div class="msg-overlay" ng-if="c.confirm.open" dm-modal="c.dismissConfirm()" dm-modal-focus="dmConfirmCancel">
   Escape dismisses (via the expression), Tab stays inside the dialog, focus moves to
   dm-modal-focus on open, and prior focus restores on close.
   Optional dm-modal-nofocus skips the open focus move (e.g. search: typing stays in the header
   field). Tab trapping only applies while focus is inside the dialog root. */
angular.module('deliveryMethodology').directive('dmModal', ['$timeout', function ($timeout) {
  return {
    restrict: 'A',
    link: function (scope, element, attrs) {
      var root = element[0];
      var lastFocus = document.activeElement;
      var skipFocus = attrs.dmModalNofocus != null;

      if (!skipFocus) {
        $timeout(function () {
          var target = attrs.dmModalFocus ? document.getElementById(attrs.dmModalFocus) : null;
          if (!target) {
            target = root.querySelector('button, [href], input, textarea, select');
          }
          if (target && target.focus) {
            target.focus();
          }
        });
      }

      function focusable() {
        return Array.prototype.slice.call(
          root.querySelectorAll('button, [href], input, textarea, select')
        ).filter(function (el) {
          return !el.disabled && el.offsetParent !== null;
        });
      }

      function onKeydown(event) {
        if (event.key === 'Escape') {
          scope.$apply(function () {
            scope.$eval(attrs.dmModal);
          });
          return;
        }
        if (event.key !== 'Tab') {
          return;
        }
        if (!root.contains(document.activeElement)) {
          return;
        }
        var list = focusable();
        if (!list.length) {
          return;
        }
        var first = list[0];
        var last = list[list.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }

      document.addEventListener('keydown', onKeydown);

      scope.$on('$destroy', function () {
        document.removeEventListener('keydown', onKeydown);
        if (lastFocus && lastFocus.focus) {
          lastFocus.focus();
        }
      });
    }
  };
}]);
