/* HTML5 drag-and-drop reorder for edit lists. Put dm-reorder on each row; put dm-reorder-handle
   on the grip inside that row. dm-reorder-on receives locals fromIndex and toIndex. */
angular.module('deliveryMethodology').directive('dmReorder', ['$parse', function ($parse) {
  'use strict';

  var dragState = {
    group: null,
    fromIndex: -1,
    sourceElement: null
  };

  function clearDragOver() {
    var nodes = document.querySelectorAll('.dm-drag-over');
    Array.prototype.forEach.call(nodes, function (node) {
      node.classList.remove('dm-drag-over');
    });
  }

  function clearDragging() {
    if (dragState.sourceElement) {
      dragState.sourceElement.classList.remove('dm-dragging');
    }
    dragState.group = null;
    dragState.fromIndex = -1;
    dragState.sourceElement = null;
    clearDragOver();
  }

  return {
    restrict: 'A',
    link: function (scope, element, attrs) {
      var row = element[0];
      var onReorder = $parse(attrs.dmReorderOn);
      var handle = row.querySelector('[dm-reorder-handle]');

      if (!handle) {
        return;
      }

      handle.setAttribute('draggable', 'true');
      handle.setAttribute('aria-grabbed', 'false');

      function groupName() {
        return attrs.dmReorderGroup || 'default';
      }

      function rowIndex() {
        return parseInt(attrs.dmReorderIndex, 10);
      }

      function onDragStart(event) {
        var index = rowIndex();
        if (isNaN(index)) {
          event.preventDefault();
          return;
        }
        dragState.group = groupName();
        dragState.fromIndex = index;
        dragState.sourceElement = row;
        row.classList.add('dm-dragging');
        handle.setAttribute('aria-grabbed', 'true');
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', String(index));
          try {
            event.dataTransfer.setDragImage(row, 16, 16);
          } catch (ignore) {
            // Some browsers reject setDragImage on certain nodes - default ghost is fine.
          }
        }
      }

      function onDragEnd() {
        handle.setAttribute('aria-grabbed', 'false');
        clearDragging();
      }

      function onDragOver(event) {
        if (dragState.fromIndex < 0 || dragState.group !== groupName()) {
          return;
        }
        event.preventDefault();
        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = 'move';
        }
        if (!row.classList.contains('dm-drag-over')) {
          clearDragOver();
          row.classList.add('dm-drag-over');
        }
      }

      function onDragLeave(event) {
        if (!row.contains(event.relatedTarget)) {
          row.classList.remove('dm-drag-over');
        }
      }

      function onDrop(event) {
        if (dragState.fromIndex < 0 || dragState.group !== groupName()) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        var toIndex = rowIndex();
        var fromIndex = dragState.fromIndex;
        clearDragging();
        handle.setAttribute('aria-grabbed', 'false');
        if (isNaN(toIndex) || fromIndex === toIndex) {
          return;
        }
        scope.$applyAsync(function () {
          onReorder(scope, {
            fromIndex: fromIndex,
            toIndex: toIndex
          });
        });
      }

      handle.addEventListener('dragstart', onDragStart);
      handle.addEventListener('dragend', onDragEnd);
      row.addEventListener('dragover', onDragOver);
      row.addEventListener('dragleave', onDragLeave);
      row.addEventListener('drop', onDrop);

      scope.$on('$destroy', function () {
        handle.removeEventListener('dragstart', onDragStart);
        handle.removeEventListener('dragend', onDragEnd);
        row.removeEventListener('dragover', onDragOver);
        row.removeEventListener('dragleave', onDragLeave);
        row.removeEventListener('drop', onDrop);
      });
    }
  };
}]);
