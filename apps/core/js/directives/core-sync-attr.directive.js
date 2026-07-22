/* <div core-sync-attr="'data-editor-theme'" core-sync-value="vm.editorThemeApplied">

   Sets a DOM attribute synchronously, during link, instead of via ng-attr-*'s interpolation
   ({{...}}), whose underlying attrs.$observe() defers its FIRST callback to the next digest - a
   real gap on a freshly ng-if'd element (compiled + linked + inserted all synchronously in the
   same tick) that briefly has no attribute at all. For a pane keyed off an attribute (e.g.
   .output-pane's data-editor-theme), that gap means a fresh pane paints one frame without the
   attribute, falling through to the wrong tokens - a visible flash. Setting the attribute directly
   in link() closes the gap: it's present before the element is ever inserted into the visible DOM.
   Still reactive afterward via $watch, for the case the value changes while already on a page that
   shows the element.

   Shared in Core; consumer apps use the `core-sync-attr` attribute directive by name. */
angular.module('core').directive('coreSyncAttr', function () {
  return {
    restrict: 'A',
    link: function (scope, el, attrs) {
      var name = scope.$eval(attrs.coreSyncAttr);
      function apply(val) {
        if (val === null || val === undefined) { el.removeAttr(name); }
        else { el.attr(name, val); }
      }
      apply(scope.$eval(attrs.coreSyncValue));
      scope.$watch(attrs.coreSyncValue, apply);
    }
  };
});
