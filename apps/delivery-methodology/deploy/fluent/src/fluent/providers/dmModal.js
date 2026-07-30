['$timeout', function ($timeout) {
  // Background-scroll lock, shared across every dm-modal instance (search overlay, confirm
  // dialog) via a module-level counter rather than a per-instance flag - if a second modal ever
  // opens while one is already up, the lock must survive the first one closing until the LAST
  // one does. Counts down under the same guarantee $destroy already gives keydown/focus cleanup.
  var openCount = 0;

  function lockScroll() {
    openCount = openCount + 1;
    if (openCount === 1) {
      // Both elements, not body alone: the page's actual scrolling box is whichever of the two
      // ends up with the propagated overflow (CSS root-viewport propagation moves body's
      // overflow onto the initial containing block only when html's own computed overflow is
      // 'visible' - true here, but locking both sidesteps that propagation rule entirely rather
      // than depending on it, and covers the case where a future html-level rule sets its own
      // overflow and breaks the propagation this depended on).
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    }
  }

  function unlockScroll() {
    openCount = Math.max(0, openCount - 1);
    if (openCount === 0) {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    }
  }

  return {
    restrict: 'A',
    link: function (scope, element, attrs) {
      var root = element[0];
      var lastFocus = document.activeElement;
      var skipFocus = attrs.dmModalNofocus != null;

      lockScroll();

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
        unlockScroll();
        document.removeEventListener('keydown', onKeydown);
        if (lastFocus && lastFocus.focus) {
          lastFocus.focus();
        }
      });
    }
  };
}]