['$document', '$timeout', function ($document, $timeout) {
  'use strict';

  var CARET_PATH = '<path d="M6 9l6 6 6-6"/>';
  var ESTIMATED_LIST_HEIGHT = 250;
  var comboCount = 0;
  var openCombo = null;

  return {
    restrict: 'E',
    scope: {
      value: '=',
      options: '<',
      placeholder: '@',
      label: '@'
    },
    template:
      '<div class="cbx">' +
        '<input type="text" class="edit-in" ng-model="value" role="combobox" aria-autocomplete="list"' +
          ' ng-attr-placeholder="{{placeholder}}" ng-attr-aria-label="{{label}}"' +
          ' ng-attr-aria-expanded="{{isOpen}}" ng-attr-aria-controls="{{listId}}"' +
          ' ng-attr-aria-activedescendant="{{activeOptionId()}}" ng-keydown="onKeydown($event)">' +
        '<button type="button" class="cbx-toggle" tabindex="-1" ng-click="toggle()"' +
          ' ng-attr-aria-label="{{isOpen ? \'Hide common values\' : \'Show common values\'}}">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"' +
          ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + CARET_PATH + '</svg>' +
        '</button>' +
        '<ul class="cbx-list" ng-if="isOpen" ng-class="{up: dropUp}" id="{{listId}}" role="listbox">' +
          '<li ng-repeat="option in options track by option" class="cbx-opt" role="option"' +
            ' id="{{listId}}-{{$index}}" ng-attr-aria-selected="{{option === value}}"' +
            ' ng-class="{on: option === value, active: $index === activeIndex}"' +
            ' ng-mousedown="choose(option, $event)" ng-mouseenter="activeIndex = $index">{{option}}</li>' +
        '</ul>' +
      '</div>',
    link: function (scope, element) {
      var host = element[0];
      var input = host.querySelector('input');
      comboCount = comboCount + 1;
      scope.listId = 'dm-combo-' + comboCount;
      scope.isOpen = false;
      scope.dropUp = false;
      scope.activeIndex = -1;

      scope.activeOptionId = function () {
        if (!scope.isOpen || scope.activeIndex < 0) {
          return '';
        }
        return scope.listId + '-' + scope.activeIndex;
      };

      function optionCount() {
        if (!scope.options) {
          return 0;
        }
        return scope.options.length;
      }

      // Opening below would cover the rows underneath, which is exactly the value the reader is
      // about to replace. Flip above when there is more room there.
      function chooseDirection() {
        var bounds = input.getBoundingClientRect();
        var spaceBelow = window.innerHeight - bounds.bottom;
        scope.dropUp = spaceBelow < ESTIMATED_LIST_HEIGHT && bounds.top > spaceBelow;
      }

      function scrollActiveIntoView() {
        $timeout(function () {
          var active = host.querySelector('.cbx-opt.active');
          if (active && active.scrollIntoView) {
            active.scrollIntoView({ block: 'nearest' });
          }
        });
      }

      function onDocumentMouseDown(event) {
        if (host.contains(event.target)) {
          return;
        }
        scope.$apply(function () {
          close();
        });
      }

      function open() {
        if (openCombo && openCombo !== scope) {
          openCombo.closeCombo();
        }
        chooseDirection();
        scope.isOpen = true;
        scope.activeIndex = currentValueIndex();
        openCombo = scope;
        $document.on('mousedown', onDocumentMouseDown);
        scrollActiveIntoView();
      }

      function close() {
        if (!scope.isOpen) {
          return;
        }
        scope.isOpen = false;
        scope.activeIndex = -1;
        if (openCombo === scope) {
          openCombo = null;
        }
        $document.off('mousedown', onDocumentMouseDown);
      }

      function currentValueIndex() {
        if (!scope.options) {
          return -1;
        }
        return scope.options.indexOf(scope.value);
      }

      function moveActive(step) {
        var count = optionCount();
        if (!count) {
          return;
        }
        var next = scope.activeIndex + step;
        if (next < 0) {
          next = count - 1;
        }
        if (next >= count) {
          next = 0;
        }
        scope.activeIndex = next;
        scrollActiveIntoView();
      }

      scope.closeCombo = close;

      scope.toggle = function () {
        if (scope.isOpen) {
          close();
          return;
        }
        open();
        input.focus();
      };

      // mousedown, not click: click fires after the input has already blurred, and the blur would
      // close the list out from under the pointer.
      scope.choose = function (option, event) {
        event.preventDefault();
        scope.value = option;
        close();
        input.focus();
      };

      scope.onKeydown = function (event) {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          if (!scope.isOpen) {
            open();
            return;
          }
          moveActive(1);
          return;
        }

        if (event.key === 'ArrowUp' && scope.isOpen) {
          event.preventDefault();
          moveActive(-1);
          return;
        }

        if (event.key === 'Enter' && scope.isOpen && scope.activeIndex >= 0) {
          event.preventDefault();
          scope.value = scope.options[scope.activeIndex];
          close();
          return;
        }

        // Stop the app's own Escape handling (which cancels edit mode) from firing too - closing
        // the list is the only thing the reader meant by that first Escape.
        if (event.key === 'Escape' && scope.isOpen) {
          event.preventDefault();
          event.stopPropagation();
          close();
          return;
        }

        if (event.key === 'Tab') {
          close();
        }
      };

      scope.$on('$destroy', function () {
        close();
      });
    }
  };
}]