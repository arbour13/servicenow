['$rootScope', '$timeout', 'DocsService', '$sce', function ($rootScope, $timeout, DocsService, $sce) {
  'use strict';

  // Plain-text search corpus: strips tags from rendered HTML and lowercases once here rather than
  // per keystroke/digest.
  function stripHtml(html) {
    var div = document.createElement('div');
    div.innerHTML = html;
    return (div.textContent || div.innerText || '').toLowerCase();
  }

  // The documentation content (see DocsService - a generated provider built from pages/**/*.md).
  // Trusted ONCE here into a stable structure - ng-bind-html re-evaluates per digest, so handing it
  // a fresh trustAsHtml() result each time would never settle. pagesById gives the controller O(1)
  // lookup for vm.openPage(id, ...) without walking groups/pages itself.
  var pagesById = {};
  var doc = {
    home: { lead: $sce.trustAsHtml(DocsService.DOC.home.lead) },
    groups: DocsService.DOC.groups.map(function (group) {
      return {
        name: group.name,
        slug: group.slug,
        planned: group.planned,
        pages: group.pages.map(function (page) {
          var sections = page.sections.map(function (section) {
            return { id: section.id, title: section.title, html: $sce.trustAsHtml(section.html), searchText: stripHtml(section.html) };
          });
          var docsPage = { id: page.id, title: page.title, lead: $sce.trustAsHtml(page.lead), sections: sections };
          pagesById[page.id] = docsPage;
          return docsPage;
        }),
      };
    }),
  };

  // Hand-rolled scrollTop animation, not the browser's native `scrollTo({behavior:'smooth'})`/
  // `el.scrollIntoView({behavior:'smooth'})` - both were tried first and silently no-op when issued
  // right after this pane's ng-if just rendered new DOM (scrollTop stayed 0). Driving scrollTop
  // directly every frame is the exact mechanism that already reliably works in that situation (a
  // plain assignment does), just spread across frames with easing instead of one instant jump. Kept
  // deliberately quick (200-450ms) - a fast, confident hop reads calmer than a slow one. Respects
  // prefers-reduced-motion the same way the rest of this app's CSS transitions/animations already do
  // (see the global override in app.scss).
  function animateScrollTop(pane, targetTop, onDone) {
    var startTop = pane.scrollTop;
    var delta = targetTop - startTop;
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (Math.abs(delta) < 2 || reduced) {
      pane.scrollTop = targetTop;
      if (onDone) { onDone(); }
      return;
    }
    var duration = Math.min(450, Math.max(200, Math.abs(delta) * 0.15));
    var startTime = null;
    var landed = false;
    function finish() {
      if (landed) { return; }
      landed = true;
      pane.scrollTop = targetTop;
      if (onDone) { onDone(); }
    }
    function step(timestamp) {
      if (landed) { return; }
      if (startTime === null) { startTime = timestamp; }
      var progress = Math.min((timestamp - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic - fast start, gentle landing
      pane.scrollTop = startTop + delta * eased;
      if (progress < 1) { requestAnimationFrame(step); } else { finish(); }
    }
    requestAnimationFrame(step);
    // Safety net: some environments (a backgrounded tab, battery-saver throttling, some headless/
    // automation contexts) suspend or heavily delay requestAnimationFrame - without this, a reader
    // would silently land on the WRONG section (the pane just never scrolls) instead of merely
    // losing the easing. `landed` makes whichever path wins - rAF finishing normally, or this timeout
    // - a no-op for the other.
    setTimeout(finish, duration + 150);
  }

  // Scrolls to section `id` on the CURRENTLY MOUNTED page (the caller has already switched pages,
  // if needed, before calling this). `enteringFresh` (arriving from another mode, not already
  // browsing this page) spotlights JUST the target section once the scroll lands - onFocusChange(id)
  // reports that back, since vm.activeSectionId lives on the controller, not here. Deliberately NOT
  // engaged up front - only once the scroll actually LANDS - so the page stays fully sharp while it
  // scrolls and the focus dim fades in only once the reader has actually arrived.
  // The element lookup retries with backoff rather than a single fixed-delay shot: opening a page
  // and jumping straight to one of its sections both happen in the same call, and the page's h2s may
  // not have painted yet on the very first attempt (unlike this app's old single-document design,
  // where the whole doc was already mounted and a lookup only had to wait out one digest cycle).
  // While a programmatic scroll (a deep-link or a rail-link click) is animating, the scroll-spy is
  // suppressed so its intermediate - and at-bottom - positions don't drag the rail highlight off the
  // section the user actually picked.
  var spySuppressed = false;
  function scrollTo(id, enteringFresh, onFocusChange, attempt) {
    attempt = attempt || 0;
    spySuppressed = true;
    $timeout(function () {
      var el = document.getElementById('docs-' + id);
      var pane = document.querySelector('.docs-pane');
      if (!el || !pane) {
        if (attempt < 8) { scrollTo(id, enteringFresh, onFocusChange, attempt + 1); return; }
        spySuppressed = false;
        return;
      }
      // 115px clearance: the sticky header's own footprint (59px, measured live) plus ~56px of
      // breathing room - landing any closer reads as the heading crowding the pinned header.
      var top = Math.max(0, pane.scrollTop + el.getBoundingClientRect().top - pane.getBoundingClientRect().top - 115);
      animateScrollTop(pane, top, function () {
        spySuppressed = false; // scroll landed - let the spy track normal scrolling again
        $timeout(function () {
          if (enteringFresh) { onFocusChange(id); }
          el.classList.add('docs-flash');
          $timeout(function () { el.classList.remove('docs-flash'); }, 1600);
        });
      });
    }, attempt === 0 ? 80 : 120);
  }

  // Scrolls the reading pane back to the top - used both for the Home rail item and for opening a
  // page with no specific section target, same easing as scrollTo() above.
  function scrollToTop() {
    var pane = document.querySelector('.docs-pane');
    if (pane) { animateScrollTop(pane, 0); }
  }

  // The sticky "on this page" rail highlights whichever section is currently at the top of the
  // reading pane. Watches every h2 the CURRENTLY MOUNTED page has (there is only ever one page's
  // worth in the DOM at a time - see this file's header comment); torn down and re-set-up whenever
  // the active page changes so it never fires against detached DOM from the page just left.
  var observer = null;
  var scrollPane = null;
  var scrollHandler = null;
  function teardownScrollSpy() {
    if (observer) { observer.disconnect(); observer = null; }
    if (scrollPane && scrollHandler) { scrollPane.removeEventListener('scroll', scrollHandler); }
    scrollPane = null;
    scrollHandler = null;
  }
  // On a fresh page mount, its ng-bind-html sections can still be mid-render when this fires - retry
  // with backoff rather than a single fixed delay, so a slow first paint doesn't leave the rail
  // permanently unhighlighted until the reader switches pages and back.
  function setupScrollSpy(onActiveChange, attempt) {
    attempt = attempt || 0;
    teardownScrollSpy();
    var pane = document.querySelector('.docs-pane');
    var heads = document.querySelectorAll('.docs-layout h2[id^="docs-"]');
    if (!pane || !heads.length) {
      if (attempt < 5) { $timeout(function () { setupScrollSpy(onActiveChange, attempt + 1); }, 250); }
      return;
    }
    var lastId = heads[heads.length - 1].id.replace(/^docs-/, '');
    function commit(id) { $rootScope.$applyAsync(function () { onActiveChange(id); }); }
    // The rootMargin below shrinks the observer's active band to the top of the pane, so a heading
    // only wins once it can be scrolled up there. The last sections physically can't reach it - the
    // pane bottoms out first - so at the very bottom the observer alone would keep an earlier section
    // lit, and the last few rail links never highlighted. atBottom() lets the bottom win instead,
    // guarded so a page that doesn't overflow isn't treated as "at bottom" (which would wrongly light
    // the last section on a short page).
    function atBottom() {
      return pane.scrollHeight > pane.clientHeight + 4 &&
        pane.scrollTop + pane.clientHeight >= pane.scrollHeight - 4;
    }
    // Tracks every observed heading's OWN latest intersecting position (or null), updated
    // incrementally from each callback - NOT just whichever headings happen to appear in the current
    // batch. IntersectionObserver only reports elements whose state flipped since the last check, so
    // on a short section the next heading can enter the scroll-spy band in its OWN later batch,
    // containing just that one entry; picking the topmost from that batch alone would silently
    // promote it over a still-intersecting, still-topmost heading that simply wasn't mentioned in
    // this particular batch. Recomputing the topmost from the full known state every time fixes that.
    var intersectingTops = {};
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        intersectingTops[e.target.id] = e.isIntersecting ? e.boundingClientRect.top : null;
      });
      if (spySuppressed) { return; }
      if (atBottom()) { commit(lastId); return; }
      var visible = Object.keys(intersectingTops)
        .filter(function (id) { return intersectingTops[id] !== null; })
        .map(function (id) { return { id: id, top: intersectingTops[id] }; });
      if (!visible.length) { return; }
      visible.sort(function (a, b) { return a.top - b.top; });
      commit(visible[0].id.replace(/^docs-/, ''));
    }, { root: pane, rootMargin: '0px 0px -75% 0px', threshold: 0 });
    heads.forEach(function (h) { observer.observe(h); });
    // The observer only fires on intersection flips; scrolling the final pixels to the very bottom
    // may not cause one, so a scroll listener asserts the last section there directly.
    scrollPane = pane;
    scrollHandler = function () { if (spySuppressed) { return; } if (atBottom()) { commit(lastId); } };
    pane.addEventListener('scroll', scrollHandler, { passive: true });
  }

  // Click-delegation for [[cross-page links]] embedded in ng-bind-html content - that content is
  // raw, trusted HTML with no Angular bindings, so a plain <a> in it can't carry an ng-click into
  // vm. Bound ONCE on .docs-pane (the outer scroll container, never itself destroyed across a page
  // switch - only its children swap), so delegation covers every page's content without rebinding
  // per page. onNavigate(pageId, sectionId) mirrors scrollTo's callback style; sectionId is null
  // when the link targets a page with no specific section.
  var linkClickPane = null;
  var linkClickHandler = null;
  function teardownDocsLinkClicks() {
    if (linkClickPane && linkClickHandler) { linkClickPane.removeEventListener('click', linkClickHandler); }
    linkClickPane = null;
    linkClickHandler = null;
  }
  function setupDocsLinkClicks(onNavigate) {
    teardownDocsLinkClicks();
    var pane = document.querySelector('.docs-pane');
    if (!pane) { return; }
    linkClickHandler = function (event) {
      var anchor = event.target.closest('.docs-link');
      if (!anchor) { return; }
      event.preventDefault();
      var pageId = anchor.getAttribute('data-page');
      var sectionId = anchor.getAttribute('data-section') || null;
      $rootScope.$applyAsync(function () { onNavigate(pageId, sectionId); });
    };
    pane.addEventListener('click', linkClickHandler);
    linkClickPane = pane;
  }

  return {
    doc: doc,
    pagesById: pagesById,
    scrollTo: scrollTo,
    scrollToTop: scrollToTop,
    setupScrollSpy: setupScrollSpy,
    teardownScrollSpy: teardownScrollSpy,
    setupDocsLinkClicks: setupDocsLinkClicks,
  };
}]