/* Main controller for the standalone Standards portal - only the Standards-related vm surface and
   the app-wide theme toggle exist here; there is no script-builder mode, sidenav mode-switcher, or
   Settings/Connection page, since this app is nothing but the hosted GlideFast scripting standards
   document. There is no other page to navigate to or back from, so this also has no focus-mode
   spotlight mechanic (no vm.stdFocusId/vm.backFromStandards/vm.exitStdFocus) - that only makes
   sense when a reader could arrive via a deep link and want to jump back to wherever they came
   from; with only one page, there is nowhere to go back to. */
angular.module('standardsPortal').controller('MainController', [
  '$scope', 'ThemeService', 'StandardsUiService',
  function ($scope, ThemeService, StandardsUiService) {
    'use strict';
    var vm = this;

    // App-wide light/dark toggle (see ThemeService) - persists to localStorage and applies
    // straight to documentElement. vm.theme is a thin display mirror the template reads; syncTheme
    // refreshes it after each toggle.
    // Init with this app's own key prefix so Standards keeps its independent stored theme choice
    // ('standardsPortalTheme').
    ThemeService.init('standardsPortal');
    function syncTheme() { vm.theme = ThemeService.readState().theme; }
    syncTheme();
    vm.toggleTheme = function () { ThemeService.toggleApp(); syncTheme(); };

    /* ============================= Standards (hosted document) ============================= */
    // The document itself, and the deep-link-scroll/scroll-spy mechanics, live in
    // StandardsUiService - passed straight through (vm.standardsDoc is built once and never
    // reassigned, so this one-time reference copy is safe).
    vm.standardsDoc = StandardsUiService.doc;
    // Two views sharing one mounted DOM: 'overview' (the Contents card's chapter hub, doc hidden) vs
    // 'reading' (the doc visible, hub hidden) - see .std-reading-hidden in app.scss for why this is
    // a visibility toggle, not ng-if/ng-show. Starts on 'overview'; openStandard is the one place
    // that flips it to 'reading', since every path that lands on a specific chapter/section (a hub
    // tile, a rail link, or an external deep-link) already routes through it.
    vm.stdView = 'overview';
    // Search: filters the rail + reading pane down to matching sections via ng-show (NOT ng-if -
    // ng-if would destroy/recreate the <h2> nodes the scroll-spy's IntersectionObserver already
    // snapshotted, permanently desyncing it). Plain per-digest boolean predicates - cheap at this
    // doc's size (~40 sections), no memoization needed.
    vm.stdQuery = '';
    vm.stdSectionMatches = function (section) {
      var q = vm.stdQuery.trim().toLowerCase();
      return !q || section.searchText.indexOf(q) !== -1;
    };
    vm.stdPartVisible = function (part) {
      return !vm.stdQuery.trim() || part.sections.some(vm.stdSectionMatches);
    };
    vm.stdGroupVisible = function (grp) {
      return !vm.stdQuery.trim() || grp.parts.some(vm.stdPartVisible);
    };
    vm.stdHasMatches = function () { return vm.standardsDoc.groups.some(vm.stdGroupVisible); };
    vm.clearStdSearch = function () { vm.stdQuery = ''; };
    // The chapter BUTTON's own highlight - exact id match only (the chapter heading itself, not any
    // section under it). Once the reader has drilled into a specific section, that section carries
    // its own highlight (.std-rail-section.active in index.html) instead.
    vm.stdPartHeadingActive = function (part) { return vm.activeStdId === part.id; };
    // Per-chapter expand/collapse for the rail's section sub-list - purely manual, keyed by part.id
    // (plain object, not part of vm.standardsDoc - this is rail UI state, not doc data). The ONLY
    // way this changes is vm.toggleStdExpand, wired to the chevron alone (index.html) - navigating
    // to a chapter or section, or typing a search, never touches this map.
    vm.stdExpanded = {};
    vm.stdPartExpanded = function (part) { return !!vm.stdExpanded[part.id]; };
    vm.toggleStdExpand = function (part, $event) {
      if ($event) { $event.stopPropagation(); }
      vm.stdExpanded[part.id] = !vm.stdExpanded[part.id];
    };
    // Navigates to a chapter/section id (a hub tile, a rail link, or an external deep-link all
    // route through this).
    vm.openStandard = function (id) {
      vm.stdView = 'reading';
      // Highlight the picked section in the rail immediately; StandardsUiService.scrollTo
      // suppresses the scroll-spy through the scroll so it can't snap the highlight elsewhere
      // before landing.
      vm.activeStdId = id;
      StandardsUiService.scrollTo(id, false, function () {});
    };
    // Rail's pinned "Overview" item - the reciprocal of openStandard: hides the doc, shows the hub.
    vm.showStdOverview = function () {
      vm.stdView = 'overview';
      vm.activeStdId = null;
      StandardsUiService.scrollToTop();
    };
    vm.activeStdId = null;
    // The sticky rail's scroll-spy runs for the app's whole lifetime - there is no other page to
    // leave it for, so unlike a multi-page app's mode-driven setup/teardown, this fires once.
    StandardsUiService.setupScrollSpy(function (id) { if (vm.stdView === 'reading') { vm.activeStdId = id; } });
  },
]);
