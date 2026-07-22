/* Core's own widget controller. Core's widget is a live doc viewer: it renders Core's self-
   documentation (CoreDocsService) through the generic <core-doc> directive - doubling as a demo of
   the shared viewer and a useful reference for the apps that depend on Core. The packager reads this
   controller as the widget's client_script (see scripts/build-deploy.js). */
angular.module('core').controller('MainController', ['CoreDocsService', function (CoreDocsService) {
  'use strict';
  var vm = this;
  vm.doc = CoreDocsService.DOC;
}]);
