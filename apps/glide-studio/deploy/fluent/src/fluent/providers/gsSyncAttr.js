function () {
  return {
    restrict: 'A',
    link: function (scope, el, attrs) {
      var name = scope.$eval(attrs.gsSyncAttr);
      function apply(val) {
        if (val === null || val === undefined) { el.removeAttr(name); }
        else { el.attr(name, val); }
      }
      apply(scope.$eval(attrs.gsSyncValue));
      scope.$watch(attrs.gsSyncValue, apply);
    }
  };
}