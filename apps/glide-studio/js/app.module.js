/* Glide Studio - AngularJS rebuild, root module.
   No dependencies on ngRoute/ngResource etc. yet - single controller-as view for now,
   modes are switched with plain show/hide (mirrors how the Service Portal widget target
   is itself a single controller, not a routed SPA). */
angular.module('glideStudio', ['core']);
