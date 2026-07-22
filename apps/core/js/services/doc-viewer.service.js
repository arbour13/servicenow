/* Generic documentation/wiki viewer LOGIC (Core). Content-agnostic: it turns a plain doc-data
   object into a render-ready view model and answers search queries. It has NO DOM knowledge - the
   coreDoc directive owns rendering, scrolling, and scroll-spy. Any app can build a doc widget by
   feeding this its own content in the shape below and dropping <core-doc doc="..."> in its template.

   Doc-data shape (what an app provides):
     {
       lead: '<p>intro html</p>',                       // optional
       parts: [                                          // chapters
         { title, group?, lead?, sections: [            // section = one addressable topic
             { id?, title, html }                        // html = the section BODY (no heading)
         ] }
       ]
     }
   Missing ids are derived from titles (slugified). */
angular.module('core').factory('DocViewerService', ['$sce', function ($sce) {
  'use strict';

  function slugify(title) {
    return String(title || '').toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
  }
  // Plain-text search corpus for a section: title + tag-stripped body, lowercased once here rather
  // than per keystroke. Built at model time and cached on the section.
  function stripHtml(html) {
    var div = document.createElement('div');
    div.innerHTML = html || '';
    return (div.textContent || div.innerText || '');
  }

  // Trust each html fragment ONCE into a stable structure - ng-bind-html re-evaluates per digest, so
  // a fresh trustAsHtml() per render would never settle. Returns a view model the directive binds to.
  function build(rawDoc) {
    rawDoc = rawDoc || {};
    return {
      lead: rawDoc.lead ? $sce.trustAsHtml(rawDoc.lead) : null,
      parts: (rawDoc.parts || []).map(function (part) {
        return {
          // 'chapter-' prefix keeps chapter ids in a namespace disjoint from section ids, so a
          // chapter and a section that slugify the same never collide as scroll targets.
          id: part.id || ('chapter-' + slugify(part.title)),
          title: part.title,
          group: part.group || null,
          lead: part.lead ? $sce.trustAsHtml(part.lead) : null,
          sections: (part.sections || []).map(function (s) {
            var body = s.html || '';
            return {
              id: s.id || slugify(s.title),
              title: s.title,
              html: $sce.trustAsHtml(body),
              searchText: (String(s.title || '') + ' ' + stripHtml(body)).toLowerCase(),
            };
          }),
        };
      }),
    };
  }

  // True when the section should show for the current query (empty query shows everything).
  function matches(section, query) {
    query = (query || '').trim().toLowerCase();
    if (!query) { return true; }
    return section.searchText.indexOf(query) !== -1;
  }

  return { build: build, matches: matches, slugify: slugify };
}]);
