api.controller = function ($scope, $timeout, ThemeService, DocsUiService) {
    'use strict';
    var vm = this;

    // App-wide light/dark toggle (see ThemeService) - persists to localStorage and applies
    // straight to documentElement. vm.theme is a thin display mirror the template reads; syncTheme
    // refreshes it after each toggle.
    // Init with this app's own key prefix so the docs keep their independent stored theme choice
    // ('glidefastDocsTheme').
    ThemeService.init('glidefastDocs');
    function syncTheme() { vm.theme = ThemeService.readState().theme; }
    syncTheme();
    vm.toggleTheme = function () { ThemeService.toggleApp(); syncTheme(); };

    /* ============================= Docs (hosted pages) ============================= */
    vm.docsGroups = DocsUiService.doc.groups;
    vm.homeLead = DocsUiService.doc.home.lead;

    // Reverse lookup from a page id to the group that contains it - built once here (view-shaping,
    // not DOM mechanics, so it lives in the controller rather than DocsUiService) so vm.openPage can
    // set the breadcrumb without walking every group on each navigation.
    var groupByPageId = {};
    vm.docsGroups.forEach(function (grp) {
      grp.pages.forEach(function (page) { groupByPageId[page.id] = grp; });
    });

    // Three content-area states sharing one mounted rail: 'home' (the intro + hub of every page,
    // grouped), 'page' (one page's own content), or - whenever vm.docsQuery is non-empty, regardless
    // of docsView - a search-results list (see vm.docsSearchResults). Only the page actually being
    // shown is ever mounted (ng-if, not ng-show/visibility - see DocsUiService's own header comment
    // for why that's safe here even though this app's OLD single-document design deliberately avoided
    // ng-if for the same DOM).
    vm.docsView = 'home';
    vm.activeGroup = null;
    vm.activePage = null;
    vm.activePageId = null;
    vm.activeSectionId = null;

    // Search: filters the rail down to matching sections, and - since content isn't all mounted at
    // once any more - REPLACES the content area with a results list rather than just hiding/showing
    // already-rendered cards. Plain per-digest boolean predicates - cheap at this app's size (~40
    // sections), no memoization needed.
    vm.docsQuery = '';
    vm.docsSectionMatches = function (section) {
      var q = vm.docsQuery.trim().toLowerCase();
      return !q || section.searchText.indexOf(q) !== -1;
    };
    vm.docsPageVisible = function (page) {
      return !vm.docsQuery.trim() || page.sections.some(vm.docsSectionMatches);
    };
    vm.docsGroupVisible = function (grp) {
      return !vm.docsQuery.trim() || grp.pages.some(vm.docsPageVisible);
    };
    vm.docsHasMatches = function () { return vm.docsGroups.some(vm.docsGroupVisible); };
    // Results grouped by page (a page with two matching sections shows both under one heading,
    // mirroring the rail's own page-then-sections nesting) rather than a flat section list. A
    // recomputed PROPERTY, not a function ng-repeat calls fresh every digest - the latter hands back
    // a brand-new array of brand-new objects each time even when the query hasn't changed, which
    // Angular's dirty-checking sees as permanent change and never stops digesting (an infinite
    // $digest loop), since ng-model's own writes to vm.docsQuery don't trigger ng-change on their
    // own. updateDocsSearchResults() is called from both search inputs' ng-change and everywhere
    // else vm.docsQuery is set programmatically (vm.clearDocsSearch, vm.openPage).
    vm.docsSearchResults = [];
    vm.updateDocsSearchResults = function () {
      var results = [];
      vm.docsGroups.forEach(function (grp) {
        grp.pages.forEach(function (page) {
          var matched = page.sections.filter(vm.docsSectionMatches);
          if (matched.length) { results.push({ group: grp, page: page, sections: matched }); }
        });
      });
      vm.docsSearchResults = results;
    };
    vm.clearDocsSearch = function () { vm.docsQuery = ''; vm.updateDocsSearchResults(); };

    // The rail page BUTTON's own highlight - active only when the reader is at the page's own top,
    // not a nested section (a section carries its own highlight instead, .docs-rail-section.active
    // in index.html) - mirrors this app's previous chapter/section highlight split.
    vm.docsPageHeadingActive = function (page) { return vm.activePageId === page.id && !vm.activeSectionId; };
    // Per-page expand/collapse for the rail's section sub-list - purely manual, keyed by page.id
    // (plain object, not part of vm.docsGroups - this is rail UI state, not doc data). The ONLY way
    // this changes is vm.toggleDocsExpand, wired to the chevron alone (index.html) - navigating to a
    // page or section, or typing a search, never touches this map.
    vm.docsExpanded = {};
    vm.docsPageExpanded = function (page) { return !!vm.docsExpanded[page.id]; };
    vm.toggleDocsExpand = function (page, $event) {
      if ($event) { $event.stopPropagation(); }
      vm.docsExpanded[page.id] = !vm.docsExpanded[page.id];
    };

    // Navigates to a page, optionally a specific section on it - a rail link, a home hub tile, a
    // search result, or an in-content [[cross-page link]] (see DocsUiService.setupDocsLinkClicks
    // below) all route through this. Clears any active search so the just-opened page is actually
    // visible instead of staying hidden behind the results list.
    vm.openPage = function (pageId, sectionId) {
      var page = DocsUiService.pagesById[pageId];
      if (!page) { return; } // build-time link validation means this should never happen
      vm.docsView = 'page';
      vm.activeGroup = groupByPageId[pageId] || null;
      vm.activePage = page;
      vm.activePageId = pageId;
      // Highlight the picked section in the rail immediately; DocsUiService.scrollTo suppresses the
      // scroll-spy through the scroll so it can't snap the highlight elsewhere before landing.
      vm.activeSectionId = sectionId || null;
      vm.docsQuery = '';
      vm.updateDocsSearchResults();
      if (sectionId) {
        DocsUiService.scrollTo(sectionId, false, function () {});
      } else {
        DocsUiService.scrollToTop();
      }
      // The page just changed docsView to 'page', which mounts fresh h2 nodes via ng-if - the spy
      // has to re-attach to them; $timeout gives Angular a digest to actually create that DOM first.
      $timeout(function () {
        DocsUiService.setupScrollSpy(function (id) { if (vm.docsView === 'page') { vm.activeSectionId = id; } });
      });
    };
    // Rail's pinned "Home" item - the reciprocal of openPage: hides any open page, shows the hub.
    vm.showDocsHome = function () {
      vm.docsView = 'home';
      vm.activeGroup = null;
      vm.activePage = null;
      vm.activePageId = null;
      vm.activeSectionId = null;
      vm.docsQuery = '';
      vm.updateDocsSearchResults();
      DocsUiService.teardownScrollSpy(); // no page mounted on Home - nothing left for it to watch
      DocsUiService.scrollToTop();
    };

    // [[cross-page links]] embedded in rendered page content are plain, untrusted-by-Angular HTML
    // (see DocsUiService's own header comment) - this wires their clicks back into vm.openPage.
    // Bound once for the app's whole lifetime, same as setupScrollSpy above.
    DocsUiService.setupDocsLinkClicks(function (pageId, sectionId) { vm.openPage(pageId, sectionId); });
  },;