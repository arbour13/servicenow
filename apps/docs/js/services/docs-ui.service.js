/* The docs' READER-VIEW DOM mechanics: the deep-link scroll-to-section animation, the "on this
   page" rail's scroll-spy (IntersectionObserver), click-delegation for [[cross-page links]]
   embedded in rendered page content, palette search, hash routing, and the code-block copy
   buttons. Single-instance UI (there's only one docs pane), so this stays a plain service like the
   app's other UI-state extractions rather than a directive.

   The EDITOR's own DOM mechanics (scroll sync between source/preview, syntax-highlight painting,
   Monaco vs. textarea) live in MarkdownEditorService instead - a separate service because editing
   is a self-contained subsystem with its own DOM lifecycle (mount/unmount per Edit click) that has
   nothing to do with reading a page.

   Only the CURRENTLY OPEN page's HTML is ever mounted (see MainController's vm.activePage) - unlike
   this app's previous single-document design, where every chapter rendered at once and visibility
   alone decided what showed. That means setupScrollSpy's h2 selector naturally scopes itself to
   whichever page is mounted (there is only ever one page's worth of h2s in the DOM), and scrollTo's
   element lookup below has to tolerate a fresh page mount that may not have painted yet, not just a
   digest-cycle delay - see its own comment for why it retries instead of a single fixed-delay shot.

   vm.activeSectionId stays OWNED BY MainController (read directly in template spots as plain
   `vm.activeSectionId`, not through a function call) - this service never touches it, it reports
   changes back through the onFocusChange/onActiveChange callbacks scrollTo()/setupScrollSpy() take,
   and the controller writes them onto vm itself. Mode-routing (vm.docsView, vm.openPage,
   vm.showDocsHome) also stays in the controller - this service only does what happens once you're
   already looking at a page, not how you got there. */
angular.module('glidefastDocs').factory('DocsUiService', ['$rootScope', '$timeout', 'DocsService', 'DocsEditService', '$sce', function ($rootScope, $timeout, DocsService, DocsEditService, $sce) {
  'use strict';

  // Plain-text search corpus: strips tags from rendered HTML once here rather than per keystroke.
  // Original casing preserved - searchDocs() lowercases for MATCHING but shows snippets from the
  // cased text, so a result excerpt reads like the page, not like a shouted-down version of it.
  function stripHtml(html) {
    var div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }

  // {pageId: {sectionSlug: true}} across every page's CURRENT source - a local edit's markdown if
  // one exists, else the baked original - so a [[link]] resolves against what a reader would
  // actually see right now, whether or not the target (or the page containing the link) has a
  // local edit. Exposed via buildDoc()'s return so the controller's live-preview-while-typing
  // renderer (see main.controller.js) can reuse the exact same map instead of rescanning.
  function buildLinkTargets() {
    var linkTargets = {};
    DocsService.DOC.groups.forEach(function (group) {
      group.pages.forEach(function (page) {
        var markdown = DocsEditService.getEditedMarkdown(page.id) || page.markdown;
        linkTargets[page.id] = DocsRenderer.scanSectionSlugs(markdown);
      });
    });
    return linkTargets;
  }

  // The documentation content (see DocsService - a generated provider built from pages/**/*.md).
  // A page with a local edit (see DocsEditService) is re-rendered client-side from that edit's
  // markdown right here, in place of its baked lead/sections/title - everything downstream (the
  // rail, search, ng-bind-html) reads this ONE overlaid structure and has no idea whether a given
  // page's HTML came from the build or a local edit. Trusted ONCE per build here into a stable
  // structure - ng-bind-html re-evaluates per digest, so handing it a fresh trustAsHtml() result
  // each time would never settle. pagesById gives the controller O(1) lookup for vm.openPage(id,
  // ...) without walking groups/pages itself. Callable again as rebuild() after a save/reset (see
  // the bottom of this file) - the controller re-reads .doc/.pagesById off the SAME service object
  // afterward, since a plain reassignment inside this closure wouldn't reach references the
  // controller already bound to vm.
  function buildDoc() {
    var pagesById = {};
    var linkTargets = buildLinkTargets();

    var doc = {
      home: { lead: $sce.trustAsHtml(DocsService.DOC.home.lead) },
      groups: DocsService.DOC.groups.map(function (group) {
        return {
          name: group.name,
          slug: group.slug,
          planned: group.planned,
          pages: group.pages.map(function (page) {
            var editedMarkdown = DocsEditService.getEditedMarkdown(page.id);
            var title = page.title;
            var leadHtml = page.lead;
            var rawSections = page.sections;

            if (editedMarkdown) {
              var rendered = DocsRenderer.renderPage(editedMarkdown, linkTargets);
              title = rendered.title || page.title;
              leadHtml = rendered.lead;
              rawSections = rendered.sections;
            }

            var sections = rawSections.map(function (section) {
              // The stripped HTML opens with the section's own <h2> text - drop it from the body
              // corpus, since the title is matched (and displayed) separately; leaving it in would
              // just make every snippet start by repeating the path line above it.
              var plainText = stripHtml(section.html);
              if (plainText.indexOf(section.title) === 0) { plainText = plainText.slice(section.title.length); }
              plainText = plainText.replace(/\s+/g, ' ').trim();
              return { id: section.id, title: section.title, html: $sce.trustAsHtml(section.html), plainText: plainText, searchText: plainText.toLowerCase() };
            });
            var docsPage = {
              id: page.id,
              title: title,
              lead: $sce.trustAsHtml(leadHtml),
              sections: sections,
              markdown: editedMarkdown || page.markdown,
              locallyEdited: !!editedMarkdown,
            };
            pagesById[page.id] = docsPage;
            return docsPage;
          }),
        };
      }),
    };

    return { doc: doc, pagesById: pagesById, linkTargets: linkTargets };
  }

  var built = buildDoc();

  // Instant jump, deliberately NOT animated. This went through the full arc before landing here:
  // an eased rAF scroll (because the browser's native scrollTo({behavior:'smooth'})/scrollIntoView
  // both silently no-op right after ng-if renders new DOM - plain scrollTop assignment is the one
  // mechanism that reliably works there, which is still why this drives scrollTop directly), then
  // distance-capped easing, then removed outright (2026-07-31, user decision): once the "on this
  // page" rail made section-jumping the PRIMARY way of moving around a page, the in-between motion
  // was just noise between the reader and where they asked to be. The landed heading's own
  // arrival flash went the same way and for the same reason - the "on this page" rail already
  // shows which section you're in, so flashing the heading was a second answer to a question
  // nothing had asked. Resist reintroducing either without re-reading this paragraph.
  function setPaneScrollTop(pane, targetTop, onDone) {
    pane.scrollTop = targetTop;
    // Push the sticky-header state directly rather than waiting for the scroll event this
    // assignment is supposed to fire. A deep link lands mid-page with the header already pinned,
    // and setupStickyHeadState's own initial refresh() has by then already run against the
    // pre-jump position (scrollTo defers the jump ~80ms, the setup does not) - so without this the
    // header sits pinned with its title still showing until the reader happens to scroll. Relying
    // on a programmatic scroll to fire its event is the same class of assumption that has bitten
    // this app before, so it asserts the state instead of hoping for the notification.
    if (stickyHeadHandler) { stickyHeadHandler(); }
    if (onDone) { onDone(); }
  }

  // Scrolls to section `id` on the CURRENTLY MOUNTED page (the caller has already switched pages,
  // if needed, before calling this). `enteringFresh` (arriving from another mode, not already
  // browsing this page) spotlights JUST the target section once the jump lands - onFocusChange(id)
  // reports that back, since vm.activeSectionId lives on the controller, not here.
  // The element lookup retries with backoff rather than a single fixed-delay shot: opening a page
  // and jumping straight to one of its sections both happen in the same call, and the page's h2s may
  // not have painted yet on the very first attempt (unlike this app's old single-document design,
  // where the whole doc was already mounted and a lookup only had to wait out one digest cycle).
  // The scroll-spy stays suppressed through the retry window so a not-yet-landed pane position
  // can't drag the rail highlight off the section the user actually picked.
  var SCROLL_LANDING_GAP = 24; // breathing room below the sticky chrome - a heading flush against it reads as crowded
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
      // Clearance for everything sticky above the landing spot, MEASURED rather than hardcoded, so
      // a padding or font change in the header can't silently strand headings underneath it. Only
      // ONE row is sticky now - each page's own .docs-page-head; the app row above it scrolls away
      // (see $gfd-sticky-page-head-top in app.scss), so it contributes no clearance and isn't
      // measured here. Zero on Home, which has no page head at all.
      var stickyChrome = 0;
      var pageHeader = document.querySelector('.docs-page-head');
      if (pageHeader) { stickyChrome += pageHeader.getBoundingClientRect().height; }
      var top = Math.max(0, pane.scrollTop + el.getBoundingClientRect().top - pane.getBoundingClientRect().top - stickyChrome - SCROLL_LANDING_GAP);
      setPaneScrollTop(pane, top, function () {
        spySuppressed = false; // jump landed - let the spy track normal scrolling again
        if (enteringFresh) { $timeout(function () { onFocusChange(id); }); }
      });
    }, attempt === 0 ? 80 : 120);
  }

  // Scrolls the reading pane back to the top - used both for the Home rail item and for opening a
  // page with no specific section target, same instant jump as scrollTo() above.
  function scrollToTop() {
    var pane = document.querySelector('.docs-pane');
    if (pane) { setPaneScrollTop(pane, 0); }
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

  // Adds .is-stuck to the open page's sticky header once it's actually pinned, so its title can
  // fade out and leave just the actions (see .docs-page-head in app.scss for why).
  // A plain passive scroll listener, NOT an IntersectionObserver on a sentinel element: the usual
  // sentinel trick needs a zero-height node above the header, and IntersectionObserver does not
  // reliably report on a zero-AREA target (confirmed here - it never fired, while the header was
  // demonstrably pinned). Comparing the header's own top against where it sticks needs no extra
  // DOM at all and can't drift out of sync with the CSS, since it reads the rendered position
  // rather than re-deriving the offset.
  var stickyHeadPane = null;
  var stickyHeadHandler = null;
  function teardownStickyHeadState() {
    if (stickyHeadPane && stickyHeadHandler) { stickyHeadPane.removeEventListener('scroll', stickyHeadHandler); }
    stickyHeadPane = null;
    stickyHeadHandler = null;
  }
  // Retries with backoff for the same reason setupScrollSpy does: on a deep-link boot the page
  // card is still being mounted by ng-if when this first runs, so the header simply isn't in the
  // DOM yet and a single-shot lookup silently attaches nothing.
  function setupStickyHeadState(attempt) {
    attempt = attempt || 0;
    teardownStickyHeadState();
    var pane = document.querySelector('.docs-pane');
    var head = document.querySelector('.docs-page-head');
    if (!pane || !head) {
      if (attempt < 5) { $timeout(function () { setupStickyHeadState(attempt + 1); }, 120); }
      return;
    }

    // The header pins at the pane's own top edge now - nothing sticky sits above it any more, so
    // there is no other chrome height to add here.
    // 1px of slack: the pinned position can land a subpixel under the threshold at some zoom
    // levels, which would otherwise flicker the class on and off as the reader scrolls.
    function refresh() {
      var stickAt = pane.getBoundingClientRect().top;
      head.classList.toggle('is-stuck', head.getBoundingClientRect().top <= stickAt + 1);
    }
    refresh(); // a deep link can land mid-page, already stuck, before any scroll event fires
    stickyHeadHandler = refresh;
    pane.addEventListener('scroll', stickyHeadHandler, { passive: true });
    stickyHeadPane = pane;
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

  // Palette search across every page. Match semantics: the query splits on whitespace and EVERY
  // term must land somewhere in a result's page title, section title, or body text - multi-word
  // queries narrow, they don't widen. Ranking is where the terms landed: a term in the section's
  // own title (+3) beats one in its body (+2) beats one found only in the parent page's title (+1,
  // kept as a fallback so "readable comments" still surfaces the Comment Your Code section of
  // Write Readable Code even though "readable" appears only in the page title). A page-level row
  // (no section) is added when the whole query matches the page title alone; it naturally sorts
  // ahead of that page's sections on the doc-order tiebreak. Walks service.doc live, so local
  // edits are searchable the moment rebuild() runs.
  var PALETTE_RESULT_CAP = 20;
  var SNIPPET_RADIUS = 60;

  function makeSnippet(section, term) {
    var at = section.searchText.indexOf(term);
    if (at === -1) { return ''; }
    var start = Math.max(0, at - SNIPPET_RADIUS);
    var end = Math.min(section.plainText.length, at + term.length + SNIPPET_RADIUS);
    var prefix = '';
    var suffix = '';

    if (start > 0) { prefix = '…'; }
    if (end < section.plainText.length) { suffix = '…'; }

    return prefix + section.plainText.slice(start, end).trim() + suffix;
  }

  function scoreSection(section, pageTitleLower, terms) {
    var score = 0;
    var snippetTerm = null;
    var sectionTitleLower = section.title.toLowerCase();
    var everyTermLanded = terms.every(function (term) {
      if (sectionTitleLower.indexOf(term) !== -1) { score += 3; return true; }
      if (section.searchText.indexOf(term) !== -1) { score += 2; if (!snippetTerm) { snippetTerm = term; } return true; }
      if (pageTitleLower.indexOf(term) !== -1) { score += 1; return true; }
      return false;
    });

    if (!everyTermLanded) { return null; }
    var snippet = '';
    if (snippetTerm) { snippet = makeSnippet(section, snippetTerm); }
    return { score: score, snippet: snippet };
  }

  function searchDocs(query) {
    var terms = String(query || '').trim().toLowerCase().split(/\s+/).filter(function (term) { return !!term; });
    if (!terms.length) { return []; }

    var results = [];
    var order = 0;
    service.doc.groups.forEach(function (group) {
      group.pages.forEach(function (page) {
        var pageTitleLower = page.title.toLowerCase();
        var wholeQueryInPageTitle = terms.every(function (term) { return pageTitleLower.indexOf(term) !== -1; });
        order++;

        if (wholeQueryInPageTitle) {
          results.push({
            pageId: page.id,
            sectionId: null,
            pageTitle: page.title,
            sectionTitle: null,
            groupName: group.name,
            snippet: '',
            score: terms.length * 3,
            order: order,
          });
        }

        page.sections.forEach(function (section) {
          var scored = scoreSection(section, pageTitleLower, terms);
          order++;
          if (!scored) { return; }
          results.push({
            pageId: page.id,
            sectionId: section.id,
            pageTitle: page.title,
            sectionTitle: section.title,
            groupName: group.name,
            snippet: scored.snippet,
            score: scored.score,
            order: order,
          });
        });
      });
    });

    results.sort(function (a, b) {
      if (b.score !== a.score) { return b.score - a.score; }
      return a.order - b.order;
    });
    return results.slice(0, PALETTE_RESULT_CAP);
  }

  function isMacPlatform() {
    return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  }

  // Hash deep links: #/page-id, #/page-id/section-id, or #/ for Home. Plain location.hash, no
  // history API - hash assignment gets a real history entry for free, so Back/Forward walk the
  // reader's navigation trail without any pushState bookkeeping. The hash only changes on explicit
  // navigation (opening a page/section, Home), never as the scroll-spy tracks reading position -
  // scrolling must not spam history with entries the reader never chose.
  // NOTE for the eventual Service Portal deploy: the portal shell has its own AngularJS $location;
  // if the two ever fight over the fragment, this is the seam to swap for an SP-safe carrier (e.g.
  // a query param) - everything else routes through these three functions.
  function parseDocsHash() {
    var raw = window.location.hash.replace(/^#\/?/, '');
    if (!raw) { return { home: true, pageId: null, sectionId: null }; }
    var parts = raw.split('/');
    return { home: false, pageId: parts[0], sectionId: parts[1] || null };
  }

  function writeDocsHash(pageId, sectionId) {
    var next = '#/';
    if (pageId) { next += pageId; }
    if (pageId && sectionId) { next += '/' + sectionId; }
    if (window.location.hash === next) { return; }
    window.location.hash = next;
  }

  // The one hashchange listener - fires on Back/Forward and on any hash the reader edits by hand.
  // Also fires right after writeDocsHash() above, which is why the controller's callbacks compare
  // the target against current vm state and skip when they already match - that comparison IS the
  // echo guard, with no suppress-flag timing to get wrong. Returns the initial parse so boot can
  // restore a deep-linked position with the same callbacks.
  var hashChangeHandler = null;
  function setupHashRouting(onNavigate, onHome) {
    if (hashChangeHandler) { window.removeEventListener('hashchange', hashChangeHandler); }
    hashChangeHandler = function () {
      var target = parseDocsHash();
      $rootScope.$applyAsync(function () {
        if (target.home) { onHome(); } else { onNavigate(target.pageId, target.sectionId); }
      });
    };
    window.addEventListener('hashchange', hashChangeHandler);
    return parseDocsHash();
  }

  // ⌘K/Ctrl+K anywhere in the document opens the palette. Deliberately NOT gated off while a
  // textarea has focus - reaching for search mid-edit is legitimate, and navigating away from the
  // editor already has defined discard semantics (vm.openPage calls vm.exitDocsEdit). Bound once
  // per callback, same shape as the delegated handlers above.
  var paletteShortcutHandler = null;
  function setupPaletteShortcut(onTrigger) {
    if (paletteShortcutHandler) { document.removeEventListener('keydown', paletteShortcutHandler); }
    paletteShortcutHandler = function (event) {
      var isShortcut = (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && String(event.key).toLowerCase() === 'k';
      if (!isShortcut) { return; }
      event.preventDefault();
      $rootScope.$applyAsync(function () { onTrigger(); });
    };
    document.addEventListener('keydown', paletteShortcutHandler);
  }

  // A "Copy" control on every code block in the reader view. The buttons are INJECTED here rather
  // than emitted by DocsRenderer, because the renderer's output is CONTENT - it gets stored in and
  // served from the docs tables (and re-rendered for the editor's live preview), and a UI control
  // has no business being baked into it. Same division as [[cross-page links]] above: the markup
  // carries the data, this service supplies the behaviour.
  //
  // Each <pre> gets wrapped so the button can sit over it absolutely WITHOUT living inside the
  // <pre> itself, where it would be swept up in the reader's own text selection when they drag
  // across the code by hand - the exact thing the button exists to save them from.
  var COPY_CONFIRM_MS = 1500;

  // aria-hidden on each: the button's own aria-label is the accessible name, and an unlabelled
  // decorative <svg> would otherwise be announced as a bare "graphic" alongside it.
  var COPY_ICON_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>';
  var COPIED_ICON_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  var COPY_FAILED_ICON_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>';

  // navigator.clipboard is unavailable outside a secure context and can be permission-blocked even
  // inside one, so a staged-textarea execCommand('copy') stands in - the same deprecated-but-still-
  // unreplaced API the editor's toolbar leans on, for the same reason: nothing standard covers it.
  // Returns whether the copy actually took, so the button can stay honest rather than flashing
  // "Copied" over a clipboard that never changed.
  function copyTextViaStagedTextarea(text) {
    var staging = document.createElement('textarea');
    staging.value = text;
    staging.setAttribute('readonly', '');
    staging.style.position = 'fixed';
    staging.style.top = '0';
    staging.style.opacity = '0';
    document.body.appendChild(staging);
    staging.select();

    var copied = false;
    try {
      copied = document.execCommand('copy');
    } catch (error) {
      copied = false;
    }

    document.body.removeChild(staging);
    return copied;
  }

  function copyText(text, onDone) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { onDone(true); },
        function () { onDone(copyTextViaStagedTextarea(text)); }
      );
      return;
    }
    onDone(copyTextViaStagedTextarea(text));
  }

  // Plain setTimeout, not $timeout: this only swaps the button's own icon and class, touching no
  // scope state, so forcing a digest per copy would be pure overhead. The timer id is parked on the
  // element so a second click restarts the confirmation instead of letting the first click's timer
  // clear it out from under the second.
  // The button is icon-only, so the confirmation is an icon swap (tick on success, warning
  // triangle on failure) plus the title/aria-label - the label text that used to carry it is gone.
  // A failure still has to LOOK different from a success: silently showing a tick over a clipboard
  // that never changed is worse than showing nothing.
  function showCopyConfirmation(button, copied) {
    button.innerHTML = copied ? COPIED_ICON_SVG : COPY_FAILED_ICON_SVG;
    button.setAttribute('title', copied ? 'Copied' : 'Copy failed - press ⌘C');
    button.setAttribute('aria-label', copied ? 'Code copied to clipboard' : 'Copy failed - press Command-C to copy manually');
    button.classList.add('copied');
    clearTimeout(button.copyResetTimer);
    button.copyResetTimer = setTimeout(function () {
      button.innerHTML = COPY_ICON_SVG;
      button.setAttribute('title', 'Copy');
      button.setAttribute('aria-label', 'Copy code to clipboard');
      button.classList.remove('copied');
    }, COPY_CONFIRM_MS);
  }

  var copyClickPane = null;
  var copyClickHandler = null;
  function teardownCodeCopyButtons() {
    if (copyClickPane && copyClickHandler) { copyClickPane.removeEventListener('click', copyClickHandler); }
    copyClickPane = null;
    copyClickHandler = null;
  }
  // Called after each page mount (the buttons live in content ng-if destroys and recreates), and
  // idempotent on both halves: an already-wrapped <pre> is skipped, and the delegated listener is
  // only bound the first time for a given pane.
  function setupCodeCopyButtons() {
    var pane = document.querySelector('.docs-pane');
    if (!pane) { return; }

    pane.querySelectorAll('.docs-content .docs-pre').forEach(function (pre) {
      if (pre.parentNode.classList.contains('docs-pre-wrap')) { return; }
      var wrap = document.createElement('div');
      wrap.className = 'docs-pre-wrap';
      pre.parentNode.insertBefore(wrap, pre);
      wrap.appendChild(pre);

      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'docs-copy-btn';
      button.innerHTML = COPY_ICON_SVG;
      // Icon-only, so the accessible name has to come from aria-label - there's no text node to
      // read. The title gives sighted mouse users the same word on hover.
      button.setAttribute('aria-label', 'Copy code to clipboard');
      button.setAttribute('title', 'Copy');
      wrap.appendChild(button);
    });

    if (copyClickPane === pane) { return; }
    teardownCodeCopyButtons();
    copyClickHandler = function (event) {
      var button = event.target.closest('.docs-copy-btn');
      if (!button) { return; }
      var code = button.parentNode.querySelector('.docs-pre code');
      if (!code) { return; }
      copyText(code.textContent, function (copied) { showCopyConfirmation(button, copied); });
    };
    pane.addEventListener('click', copyClickHandler);
    copyClickPane = pane;
  }

  var service = {
    doc: built.doc,
    pagesById: built.pagesById,
    // Re-derives doc/pagesById from DocsService + whatever's now in DocsEditService's localStorage
    // and writes them back onto THIS SAME object - call after any save/reset, then re-read
    // service.doc/service.pagesById (a plain local reassignment inside buildDoc() wouldn't reach
    // vm.docsGroups, which the controller bound to the array this object held at some earlier
    // point in time).
    rebuild: function () {
      built = buildDoc();
      service.doc = built.doc;
      service.pagesById = built.pagesById;
    },
    // The linkTargets map from the CURRENT build - reused by the controller's live-preview
    // renderer (see main.controller.js) so it validates [[links]] against the same picture of
    // "every page's current section slugs" this service itself just rendered from.
    getLinkTargets: function () { return built.linkTargets; },
    scrollTo: scrollTo,
    scrollToTop: scrollToTop,
    setupScrollSpy: setupScrollSpy,
    teardownScrollSpy: teardownScrollSpy,
    setupStickyHeadState: setupStickyHeadState,
    teardownStickyHeadState: teardownStickyHeadState,
    setupDocsLinkClicks: setupDocsLinkClicks,
    searchDocs: searchDocs,
    isMacPlatform: isMacPlatform,
    setupPaletteShortcut: setupPaletteShortcut,
    writeDocsHash: writeDocsHash,
    setupHashRouting: setupHashRouting,
    copyText: copyText,
    setupCodeCopyButtons: setupCodeCopyButtons,
  };
  return service;
}]);
