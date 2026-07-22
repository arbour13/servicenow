/* Core - the shared foundation app for the ServiceNow AngularJS suite. Hosts reusable
   providers (services/directives) that consumer apps (Glide Studio, Standards, ...) inject BY NAME
   at runtime, plus (later) a generic documentation/wiki widget. Consumer apps declare this module
   as a dependency in their own module definition, e.g.
     angular.module('glideStudio', ['core'])
   and load Core's provider files in their dev harness. In a deployed Service Portal every
   sp_angular_provider record registers into the one shared page injector, so a consumer widget
   injects these providers by name - as long as the Core app is installed on the instance.

   Deployed once; every dependent app reuses these providers instead of shipping its own copies. */
angular.module('core', []);
