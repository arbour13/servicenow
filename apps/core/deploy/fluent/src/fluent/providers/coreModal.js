['$timeout', function ($timeout) {
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
}]