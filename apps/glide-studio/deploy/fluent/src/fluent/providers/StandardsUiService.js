['$rootScope', '$timeout', 'StandardsService', '$sce', function ($rootScope, $timeout, StandardsService, $sce) {
  'use strict';

  // Plain-text search corpus for a section: strips tags from its rendered HTML (which already
  // includes the title inside its <h2>, so this alone covers both) and lowercases once here rather
  // than per keystroke/digest.
  function stripHtml(html) {
    var div = document.createElement('div');
    div.innerHTML = html;
    return (div.textContent || div.innerText || '').toLowerCase();
  }

  // Mirrors build-standards.js's own slugify() so chapter/band ids read the same way section ids
  // do. Computed client-side (not via that script's registerSlug/duplicate-checked registry) - the
  // 'chapter-'/'band-' prefixes below are what actually guarantee no collision with a real section
  // slug, not this function's uniqueness on its own.
  function slugify(title) {
    return String(title).toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
  }

  // The combined GlideFast scripting standards, hosted in-app (see StandardsService - a generated
  // provider built from standards/glidefast-scripting-standards.md). Trusted ONCE here into a stable
  // structure - ng-bind-html re-evaluates per digest, so handing it a fresh trustAsHtml() result
  // each time would never settle.
  var doc = {
    lead: $sce.trustAsHtml(StandardsService.DOC.lead),
    parts: StandardsService.DOC.parts.map(function (part) {
      return {
        // 'chapter-' prefix: a chapter title (e.g. "Choose Client or Server") could otherwise
        // slugify to something a section heading also plausibly uses - the prefix keeps this id
        // namespace disjoint from section ids without needing build-standards.js's slug registry.
        id: 'chapter-' + slugify(part.title),
        title: part.title,
        group: part.group,
        lead: $sce.trustAsHtml(part.lead),
        sections: part.sections.map(function (section) {
          return { id: section.id, title: section.title, html: $sce.trustAsHtml(section.html), searchText: stripHtml(section.html) };
        }),
      };
    }),
  };
  // A grouped VIEW of the same parts, for the rail/content bands (see index.html) - doc.parts
  // stays flat and untouched for anything that still wants to walk every chapter directly. Order
  // here is the display order of the bands; must match build-standards.js's VALID_GROUPS keys.
  var GROUP_ORDER = ['Principles', 'Build It Well'];
  // Chapters known to be coming but not written yet - shown as dashed "Planned" tiles in the
  // Contents hub (index.html's .std-hub) so the roadmap is visible instead of the band just
  // looking thin. Plain strings, not real parts - no id/lead/sections, nothing to click through
  // to. Edit this list as chapters land (remove here) or as new ones are planned (add here); it
  // has no other effect on the doc.
  var PLANNED_BY_GROUP = {
    'Build It Well': ['Flows', 'Widgets', 'CSS', 'Portals', 'UI Builder'],
  };
  doc.groups = GROUP_ORDER.map(function (name) {
    return {
      name: name,
      id: 'band-' + slugify(name),
      parts: doc.parts.filter(function (p) { return p.group === name; }),
      planned: PLANNED_BY_GROUP[name] || [],
    };
  }).filter(function (g) { return g.parts.length > 0; });

  // Hand-rolled scrollTop animation, not the browser's native `scrollTo({behavior:'smooth'})`/
  // `el.scrollIntoView({behavior:'smooth'})` - both were tried first and silently no-op when issued
  // right after this pane's ng-if just rendered ~50KB of new DOM (scrollTop stayed 0). Driving
  // scrollTop directly every frame is the exact mechanism that already reliably works in that
  // situation (a plain assignment does), just spread across frames with easing instead of one
  // instant jump. Kept deliberately quick (200-450ms) - a fast, confident hop reads calmer than a
  // slow one. Respects prefers-reduced-motion the same way the rest of this app's CSS transitions/
  // animations already do (see the global override in app.scss).
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
    function step(timestamp) {
      if (startTime === null) { startTime = timestamp; }
      var progress = Math.min((timestamp - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic - fast start, gentle landing
      pane.scrollTop = startTop + delta * eased;
      if (progress < 1) { requestAnimationFrame(step); } else if (onDone) { onDone(); }
    }
    requestAnimationFrame(step);
  }

  // Scrolls to section `id` (called after the caller has already switched into Standards mode).
  // `enteringFresh` (arriving from another mode, not already browsing Standards) spotlights JUST the
  // target section once the scroll lands - onFocusChange(id) is how that's reported back, since
  // vm.stdFocusId lives on the controller, not here. Deliberately NOT engaged up front - only once
  // the scroll actually LANDS - so the page stays fully sharp while it scrolls and the focus dim
  // fades in only once the reader has actually arrived (engaging it up front used to mean the whole
  // page went dim+blurry for the full scroll).
  // While a programmatic scroll (a deep-link or a rail-link click) is animating, the scroll-spy is
  // suppressed so its intermediate - and at-bottom - positions don't drag the rail highlight off the
  // section the user actually picked. The controller sets vm.activeStdId to that section up front,
  // and this keeps it there until the scroll lands. It matters most near the bottom: those sections
  // can't reach the top-of-pane active band, so without this the spy would snap the highlight to the
  // last section the moment the click bottomed the pane out - the exact "last few links don't
  // highlight when clicked" symptom.
  var spySuppressed = false;
  function scrollTo(id, enteringFresh, onFocusChange) {
    spySuppressed = true;
    $timeout(function () {
      var el = document.getElementById('std-' + id);
      var pane = document.querySelector('.builder');
      if (!el || !pane) { spySuppressed = false; return; }
      // 115px clearance: the sticky header's own footprint (59px, measured live) plus ~56px of
      // breathing room - landing any closer reads as the heading crowding the pinned header (91px/
      // ~32px of room was tried first and felt cramped, especially with the focus-mode Back/Stay
      // buttons occupying the same row).
      var top = Math.max(0, pane.scrollTop + el.getBoundingClientRect().top - pane.getBoundingClientRect().top - 115);
      animateScrollTop(pane, top, function () {
        spySuppressed = false; // scroll landed - let the spy track normal scrolling again
        $timeout(function () {
          if (enteringFresh) { onFocusChange(id); }
          el.classList.add('std-flash');
          $timeout(function () { el.classList.remove('std-flash'); }, 1600);
        });
      });
    }, 80);
  }

  // Overview rail item: scrolls the reading pane back to the top of the Contents card (the hub),
  // same easing as scrollTo() above - the reciprocal of "jump to a chapter."
  function scrollToTop() {
    var pane = document.querySelector('.builder');
    if (pane) { animateScrollTop(pane, 0); }
  }

  // The sticky "on this page" rail highlights whichever section is currently at the top of the
  // reading pane. One observer watches every section h2 (the same ids scrollTo() targets); torn down
  // whenever the reader leaves Standards so it doesn't keep firing against detached DOM.
  var observer = null;
  var scrollPane = null;
  var scrollHandler = null;
  function teardownScrollSpy() {
    if (observer) { observer.disconnect(); observer = null; }
    if (scrollPane && scrollHandler) { scrollPane.removeEventListener('scroll', scrollHandler); }
    scrollPane = null;
    scrollHandler = null;
  }
  // On the FIRST visit to Standards, the doc's ~25 ng-bind-html sections can still be mid-render when
  // this fires - retry with backoff rather than a single fixed delay, so a slow first paint doesn't
  // leave the rail permanently unhighlighted until the reader leaves and comes back.
  function setupScrollSpy(onActiveChange, attempt) {
    attempt = attempt || 0;
    teardownScrollSpy();
    var pane = document.querySelector('.builder');
    var heads = document.querySelectorAll('.standards-doc h2[id^="std-"]');
    if (!pane || !heads.length) {
      if (attempt < 5) { $timeout(function () { setupScrollSpy(onActiveChange, attempt + 1); }, 250); }
      return;
    }
    var lastId = heads[heads.length - 1].id.replace(/^std-/, '');
    function commit(id) { $rootScope.$applyAsync(function () { onActiveChange(id); }); }
    // The rootMargin below shrinks the observer's active band to the top of the pane, so a heading
    // only wins once it can be scrolled up there. The last sections physically can't reach it - the
    // pane bottoms out first - so at the very bottom the observer alone would keep an earlier section
    // lit, and the last few rail links never highlighted. atBottom() lets the bottom win instead,
    // guarded so a doc that doesn't overflow isn't treated as "at bottom" (which would wrongly light
    // the last section on a short page).
    function atBottom() {
      return pane.scrollHeight > pane.clientHeight + 4 &&
        pane.scrollTop + pane.clientHeight >= pane.scrollHeight - 4;
    }
    // Tracks every observed heading's OWN latest intersecting position (or null), updated
    // incrementally from each callback - NOT just whichever headings happen to appear in the current
    // batch. IntersectionObserver only reports elements whose state flipped since the last check, so
    // on a short section the next heading can enter the scroll-spy band in its OWN later batch,
    // containing just that one entry; picking the topmost from that batch alone (the old logic)
    // silently promoted it over a still-intersecting, still-topmost heading that simply wasn't
    // mentioned in this particular batch. Recomputing the topmost from the full known state every
    // time fixes that.
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
      commit(visible[0].id.replace(/^std-/, ''));
    }, { root: pane, rootMargin: '0px 0px -75% 0px', threshold: 0 });
    heads.forEach(function (h) { observer.observe(h); });
    // The observer only fires on intersection flips; scrolling the final pixels to the very bottom
    // may not cause one, so a scroll listener asserts the last section there directly.
    scrollPane = pane;
    scrollHandler = function () { if (spySuppressed) { return; } if (atBottom()) { commit(lastId); } };
    pane.addEventListener('scroll', scrollHandler, { passive: true });
  }

  return {
    doc: doc,
    scrollTo: scrollTo,
    scrollToTop: scrollToTop,
    setupScrollSpy: setupScrollSpy,
    teardownScrollSpy: teardownScrollSpy,
  };
}]