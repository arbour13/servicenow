/* Core's own documentation content - the doc-data the Core widget renders through <core-doc>. This
   is Core documenting itself (what it is, how to depend on it, what each shared provider does), so
   Core's widget is both a live demo of the generic doc viewer AND a useful reference. Other apps
   supply their own service in this same shape (see DocViewerService for the contract) - this one is
   Core-specific content, not shared machinery. */
angular.module('core').factory('CoreDocsService', [function () {
  'use strict';

  return {
    DOC: {
      lead: '<p><strong>Core</strong> is the shared foundation for the ServiceNow AngularJS app suite. It hosts reusable providers — services and directives — that every other app injects <em>by name</em>, plus this generic documentation viewer. Deployed once, reused everywhere.</p>',
      parts: [
        {
          title: 'Getting Started',
          group: 'Guide',
          lead: '<p>How an app depends on Core and reuses what it provides.</p>',
          sections: [
            {
              id: 'depend-on-core',
              title: 'Depend on Core',
              html: '<p>Declare Core as a module dependency, then inject its providers by name — no copying, no vendoring:</p>' +
                    '<pre class="doc-code"><code>angular.module(\'glideStudio\', [\'core\']);</code></pre>' +
                    '<p>At runtime every app on a Service Portal page shares one Angular injector, so a widget resolves Core\'s providers by name as long as the Core app is installed on the instance.</p>',
            },
            {
              id: 'build-a-doc-widget',
              title: 'Build a doc widget',
              html: '<p>Feed <code>&lt;core-doc&gt;</code> a doc-data object and it renders a searchable, navigable document — the same viewer you are reading now:</p>' +
                    '<pre class="doc-code"><code>&lt;core-doc doc="vm.doc"&gt;&lt;/core-doc&gt;</code></pre>' +
                    '<p>The content is plain data (chapters and sections of HTML); the search box, the “on this page” rail, and the scroll-spy highlight all come for free.</p>',
            },
          ],
        },
        {
          title: 'Shared Providers',
          group: 'Reference',
          lead: '<p>The reusable services and directives Core currently hosts.</p>',
          sections: [
            {
              id: 'themeservice',
              title: 'ThemeService',
              html: '<p>The app-wide light/dark toggle (sets <code>data-theme</code> on the document). Each app calls <code>ThemeService.init(\'&lt;appKey&gt;\')</code> once so its stored preference stays independent from every other app.</p>',
            },
            {
              id: 'confirmmodalservice',
              title: 'ConfirmModalService',
              html: '<p>A generic confirmation dialog — title, body, Cancel / OK, and a callback run on OK. Any destructive action reuses it via <code>open(opts, onOk)</code>.</p>',
            },
            {
              id: 'coremodal',
              title: 'coreModal',
              html: '<p>An attribute directive that adds shared modal chrome to any overlay: Escape to close, focus trapping, focus restore on close. Add the attribute; no shared code to edit per modal.</p>',
            },
            {
              id: 'coresyncattr',
              title: 'coreSyncAttr',
              html: '<p>An attribute directive that sets a DOM attribute synchronously during link — closing the one-frame gap that interpolated <code>ng-attr-*</code> leaves on freshly-inserted elements.</p>',
            },
          ],
        },
      ],
    },
  };
}]);
