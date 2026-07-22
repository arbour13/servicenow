/* <div class="modal-overlay" ng-if="vm.confirm.open" core-modal="vm.closeConfirm()" core-modal-focus="confirmCancelBtn">

   Shared chrome for every modal-overlay: Escape closes it (via the core-modal expression), Tab is
   trapped inside it, focus moves to core-modal-focus's element once it renders (falling back to the
   first focusable control if that id isn't found/given), and whatever was focused before opening is
   restored once it closes. One directive instance per modal, not a single global listener with an
   if/else chain naming every modal by hand - adding a modal means adding this attribute, not editing
   shared code that already knows about the others.

   Link/destroy is the right hook for this: each modal-overlay is ng-if, so link fires exactly when
   it's inserted (= opened) and scope's $destroy fires exactly when it's removed (= closed, however
   that happened - Cancel, Confirm, Escape, or a backdrop click) - open/close bodies never need to
   call into this directive themselves.

   Shared in Core; consumer apps use the `core-modal` attribute directive by name. */
angular.module('core').directive('coreModal', ['$timeout', function ($timeout) {
  return {
    restrict: 'A',
    link: function (scope, element, attrs) {
      var root = element[0];
      var lastFocus = document.activeElement;

      $timeout(function () {
        var target = attrs.coreModalFocus ? document.getElementById(attrs.coreModalFocus) : null;
        if (!target) { target = root.querySelector('button, textarea'); }
        if (target && target.focus) { target.focus(); }
      });

      // Only button/textarea count as tab-stops here, matching this app's other interactive
      // controls (gs-select, condition rows) which aren't plain form fields.
      function focusable() {
        return Array.prototype.slice.call(root.querySelectorAll('button, textarea'))
          .filter(function (el) { return !el.disabled && el.offsetParent !== null; });
      }
      function onKeydown(e) {
        if (e.key === 'Escape') {
          scope.$apply(function () { scope.$eval(attrs.coreModal); });
          return;
        }
        if (e.key !== 'Tab') { return; }
        var list = focusable();
        if (!list.length) { return; }
        var first = list[0], last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
      document.addEventListener('keydown', onKeydown);

      scope.$on('$destroy', function () {
        document.removeEventListener('keydown', onKeydown);
        if (lastFocus && lastFocus.focus) { lastFocus.focus(); }
      });
    }
  };
}]);
