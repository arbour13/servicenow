['DocViewerService', '$timeout', function (DocViewerService, $timeout) {
  return {
    restrict: 'E',
    scope: { rawDoc: '=doc' },
    template:
      '<div class="doc">' +
        '<div class="doc-lead" ng-if="model.lead" ng-bind-html="model.lead"></div>' +
        '<div class="doc-layout">' +
          '<aside class="doc-rail">' +
            '<input class="doc-search" type="text" ng-model="query" placeholder="Search the docs…" aria-label="Search the docs">' +
            '<nav class="doc-nav" aria-label="On this page">' +
              '<div class="doc-nav-part" ng-repeat="part in model.parts" ng-if="partVisible(part)">' +
                '<a class="doc-nav-chapter" href="" ng-click="scrollTo(part.id); $event.preventDefault()">{{part.title}}</a>' +
                '<a class="doc-nav-link" ng-repeat="s in part.sections" ng-if="match(s)" href="" ' +
                   'ng-class="{active: activeId === s.id}" ng-click="scrollTo(s.id); $event.preventDefault()">{{s.title}}</a>' +
              '</div>' +
            '</nav>' +
          '</aside>' +
          '<div class="doc-content">' +
            '<section class="doc-part" ng-repeat="part in model.parts" ng-if="partVisible(part)">' +
              '<h2 class="doc-chapter" id="{{part.id}}">{{part.title}}</h2>' +
              '<div class="doc-chapter-lead" ng-if="part.lead" ng-bind-html="part.lead"></div>' +
              '<article class="doc-section" ng-repeat="s in part.sections" ng-if="match(s)" id="{{s.id}}">' +
                '<h3 class="doc-section-title">{{s.title}}</h3>' +
                '<div class="doc-section-body" ng-bind-html="s.html"></div>' +
              '</article>' +
            '</section>' +
            '<p class="doc-empty" ng-if="!anyVisible()">No sections match “{{query}}”.</p>' +
          '</div>' +
        '</div>' +
      '</div>',
    link: function (scope, element) {
      var root = element[0];

      function rebuild() { scope.model = DocViewerService.build(scope.rawDoc); }
      rebuild();
      scope.$watch('rawDoc', function (nv, ov) { if (nv !== ov) { rebuild(); reobserve(); } });

      scope.query = '';
      scope.activeId = null;
      scope.match = function (s) { return DocViewerService.matches(s, scope.query); };
      scope.partVisible = function (p) { return p.sections.some(scope.match); };
      scope.anyVisible = function () { return scope.model.parts.some(scope.partVisible); };

      /* Hand-rolled eased window scroll rather than el.scrollIntoView({behavior:'smooth'}) - native
         smooth scroll silently no-ops here (instant works, smooth doesn't; the same behavior
         Standards documented and worked around). Driving window.scrollTo per frame is the mechanism
         that reliably works. Respects prefers-reduced-motion. */
      function animateWindowScroll(targetY) {
        var start = window.pageYOffset || window.scrollY;
        var delta = targetY - start;
        var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (Math.abs(delta) < 2 || reduced) { window.scrollTo(0, targetY); return; }
        var duration = Math.min(450, Math.max(200, Math.abs(delta) * 0.15)), t0 = null;
        function frame(ts) {
          if (t0 === null) { t0 = ts; }
          var p = Math.min((ts - t0) / duration, 1);
          var eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
          window.scrollTo(0, start + delta * eased);
          if (p < 1) { requestAnimationFrame(frame); }
        }
        requestAnimationFrame(frame);
      }
      // Attribute selector (not #id) because ids come from arbitrary titles - a numeric-leading or
      // punctuation-bearing slug would break a CSS #id selector but is fine as [id="..."].
      scope.scrollTo = function (id) {
        var el = root.querySelector('[id="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
        if (!el) { return; }
        var y = (window.pageYOffset || window.scrollY) + el.getBoundingClientRect().top - 12;
        animateWindowScroll(Math.max(0, y));
      };

      /* Scroll-spy: highlight whichever section heading sits nearest the top of the viewport. The
         -70% bottom rootMargin shrinks the "active" band to the top slice of the viewport so a
         section only wins once scrolled up there; recompute the topmost from the full known state
         each callback (IntersectionObserver only reports elements whose state flipped). */
      var tops = {};
      var lastId = null;
      // Near the bottom of the page the last sections can't reach the top band (the page bottoms out
      // first), so without this the final nav links would never highlight - the observer keeps an
      // earlier section lit. At the bottom, force the last section active instead.
      function atBottom() {
        var d = document.documentElement;
        return d.scrollHeight > window.innerHeight + 4 &&
          (window.pageYOffset || 0) + window.innerHeight >= d.scrollHeight - 4;
      }
      function commit(id) { scope.$applyAsync(function () { scope.activeId = id; }); }
      function recompute() {
        if (atBottom() && lastId) { commit(lastId); return; }
        var visible = Object.keys(tops)
          .filter(function (id) { return tops[id] !== null; })
          .map(function (id) { return { id: id, top: tops[id] }; })
          .sort(function (a, b) { return a.top - b.top; });
        if (visible.length) { commit(visible[0].id); }
      }
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { tops[e.target.id] = e.isIntersecting ? e.boundingClientRect.top : null; });
        recompute();
      }, { rootMargin: '0px 0px -70% 0px', threshold: 0 });

      function reobserve() {
        observer.disconnect();
        tops = {};
        $timeout(function () {
          var secs = root.querySelectorAll('.doc-section');
          lastId = secs.length ? secs[secs.length - 1].id : null;
          Array.prototype.forEach.call(secs, function (s) { observer.observe(s); });
        });
      }
      reobserve();
      // Re-observe when search filtering adds/removes sections from the DOM.
      scope.$watch('query', function (nv, ov) { if (nv !== ov) { reobserve(); } });

      // The observer only fires on intersection flips; the final scroll pixels may not cause one, so
      // a scroll listener asserts the bottom section directly.
      var onScroll = function () { if (atBottom() && lastId) { commit(lastId); } };
      window.addEventListener('scroll', onScroll, { passive: true });

      scope.$on('$destroy', function () { observer.disconnect(); window.removeEventListener('scroll', onScroll); });
    },
  };
}]