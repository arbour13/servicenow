/* Main controller for the standalone GlideFast Docs - only the docs-related vm surface and the
   app-wide theme toggle exist here; there is no script-builder mode, sidenav mode-switcher, or
   Settings/Connection page, since this app is nothing but a hosted collection of reference pages. */
angular.module('glidefastDocs').controller('MainController', [
  '$scope', '$timeout', '$sce', 'ThemeService', 'DocsUiService', 'DocsEditService', 'MarkdownEditorService',
  function ($scope, $timeout, $sce, ThemeService, DocsUiService, DocsEditService, MarkdownEditorService) {
    'use strict';
    var vm = this;

    // Service Portal sets $scope.data server-side from the widget's own server script (see
    // docs.server.js: data.canEdit = gs.hasRole(scope + '.editor') || gs.hasRole(scope +
    // '.admin')) - the platform binds it onto $scope before this function runs. Read
    // DEFENSIVELY: this app's local dev harness has no widget bootstrap at all, so $scope.data is
    // always undefined there, and Edit should still show (nothing to enforce locally, and hiding
    // it would make the harness useless for testing the editor). Only an EXPLICIT false - a real
    // deployed widget actively denying a non-editor - hides it. Same convention Delivery
    // Methodology already uses (see its shell.controller.js, AppStateService.setCanEdit).
    var canEditByRole = !($scope.data && $scope.data.canEdit === false);

    // App-wide light/dark toggle (see ThemeService) - persists to localStorage and applies
    // straight to documentElement. vm.theme is a thin display mirror the template reads; syncTheme
    // refreshes it after each toggle.
    // Init with this app's own key prefix so the docs keep their independent stored theme choice
    // ('glidefastDocsTheme').
    ThemeService.init('glidefastDocs');
    function syncTheme() { vm.theme = ThemeService.readState().theme; }
    syncTheme();
    vm.toggleTheme = function () {
      ThemeService.toggleApp();
      syncTheme();
      // No-ops if no editor is currently mounted; otherwise pushes the new theme onto whichever
      // driver is live (Monaco redefines its theme from the just-changed --ed-md-* custom
      // properties; the textarea driver already re-themes for free via those same properties).
      MarkdownEditorService.applyEditorTheme(vm.theme);
    };

    /* ============================= Docs (hosted pages) ============================= */
    vm.docsGroups = DocsUiService.doc.groups;
    vm.homeLead = DocsUiService.doc.home.lead;

    // Two lookups off one walk of the group/page tree, both view-shaping rather than DOM mechanics,
    // so they live in the controller rather than DocsUiService:
    //   - groupByPageId: page id -> its group, so vm.openPage sets the breadcrumb without walking
    //     every group on each navigation.
    //   - readingOrder / readingOrderIndexById: the flat front-to-back sequence a reader moves
    //     through, so Prev/Next is an index step rather than a tree search. Groups are ordered, and
    //     pages within a group are ordered, so flattening in place IS the reading order - Next off
    //     the last page of a group therefore continues into the first page of the following one,
    //     which is the point (a group boundary isn't a dead end for someone reading straight
    //     through). A group's `planned` titles are placeholders with no page to open, so they're
    //     correctly absent here - they only ever render as badges on the Home hub.
    // Re-derived (not just built once) after any local edit save/reset, since DocsUiService.rebuild()
    // replaces vm.docsGroups with a whole new array of new group objects - the old lookups would
    // otherwise point at group and page objects nothing else references any more.
    var groupByPageId = {};
    var readingOrder = [];
    var readingOrderIndexById = {};
    function syncPageLookups() {
      groupByPageId = {};
      readingOrder = [];
      readingOrderIndexById = {};
      vm.docsGroups.forEach(function (grp) {
        grp.pages.forEach(function (page) {
          groupByPageId[page.id] = grp;
          readingOrderIndexById[page.id] = readingOrder.length;
          readingOrder.push(page);
        });
      });
    }
    syncPageLookups();

    // The neighbour `step` places away in reading order, as the flat {id, title, groupName} the
    // Prev/Next footer renders, or null at either end of the whole doc.
    function getReadingOrderNeighbor(pageId, step) {
      var index = readingOrderIndexById[pageId];
      if (index === undefined) { return null; }
      var neighbor = readingOrder[index + step];
      if (!neighbor) { return null; }
      var group = groupByPageId[neighbor.id];
      return {
        id: neighbor.id,
        title: neighbor.title,
        groupName: group ? group.name : '',
      };
    }

    // Two content-area states sharing one mounted rail: 'home' (the intro + hub of every page,
    // grouped) or 'page' (one page's own content). Only the page actually being shown is ever
    // mounted (ng-if, not ng-show/visibility - see DocsUiService's own header comment for why
    // that's safe here even though this app's OLD single-document design deliberately avoided
    // ng-if for the same DOM). Search is NOT a third state - it's the palette overlay below,
    // floating over whichever of these two is current.
    vm.docsView = 'home';
    vm.activePage = null;
    vm.activePageId = null;
    vm.activeSectionId = null;
    // Recomputed PROPERTIES set by vm.openPage, not functions the template calls fresh each digest -
    // same reasoning as vm.docsPaletteResults below. They only change when the open page changes.
    vm.docsPrevPage = null;
    vm.docsNextPage = null;

    // The search palette (the topbar trigger and ⌘K/Ctrl+K both open it) - the app's ONE search
    // surface, replacing the old rail-filter + inline-results-page arrangement. An overlay, never a
    // docsView: closing it lands the reader exactly where they were. vm.docsPaletteResults is a
    // recomputed property, not a function the template calls - an ng-repeat over a fresh-array-
    // returning function never stops digesting (see this suite's AngularJS gotchas).
    vm.docsPaletteOpen = false;
    vm.docsPaletteQuery = '';
    vm.docsPaletteResults = [];
    vm.docsPaletteIndex = 0;
    vm.docsPaletteShortcutLabel = DocsUiService.isMacPlatform() ? '⌘K' : 'Ctrl K';

    vm.openDocsPalette = function () {
      vm.docsPaletteOpen = true;
      vm.docsPaletteQuery = '';
      vm.docsPaletteResults = [];
      vm.docsPaletteIndex = 0;
      // The input doesn't exist until ng-if mounts the overlay - focus needs the digest to finish.
      $timeout(function () {
        var input = document.querySelector('.docs-palette-input');
        if (input) { input.focus(); }
      });
    };
    vm.closeDocsPalette = function () { vm.docsPaletteOpen = false; };

    vm.updateDocsPaletteResults = function () {
      vm.docsPaletteResults = DocsUiService.searchDocs(vm.docsPaletteQuery);
      vm.docsPaletteIndex = 0;
    };

    vm.docsPaletteGo = function (result) {
      if (!result) { return; }
      vm.closeDocsPalette();
      vm.openPage(result.pageId, result.sectionId);
    };

    // Arrows move the highlight (wrapping at either end), Enter opens it, Esc closes. preventDefault
    // on the arrows so the caret doesn't ALSO jump to the input's start/end on every press.
    vm.docsPaletteKeydown = function ($event) {
      var count = vm.docsPaletteResults.length;

      if ($event.key === 'Escape') {
        vm.closeDocsPalette();
        return;
      }
      if ($event.key === 'Enter') {
        vm.docsPaletteGo(vm.docsPaletteResults[vm.docsPaletteIndex]);
        return;
      }
      if (!count) { return; }

      if ($event.key === 'ArrowDown') {
        $event.preventDefault();
        vm.docsPaletteIndex = (vm.docsPaletteIndex + 1) % count;
      } else if ($event.key === 'ArrowUp') {
        $event.preventDefault();
        vm.docsPaletteIndex = (vm.docsPaletteIndex - 1 + count) % count;
      } else {
        return;
      }
      // After the digest moves the .active class, make sure the highlighted row is actually in
      // view inside the scrollable results list.
      $timeout(function () {
        var activeRow = document.querySelector('.docs-palette-row.active');
        if (activeRow && activeRow.scrollIntoView) { activeRow.scrollIntoView({ block: 'nearest' }); }
      });
    };

    // The left rail's page-button highlight - active for whichever page is open, regardless of
    // which of its sections the reader has scrolled to (that gets its own highlight in the right
    // "on this page" rail instead, .docs-toc-section.active in index.html).
    vm.docsPageHeadingActive = function (page) { return vm.activePageId === page.id; };

    // Navigates to a page, optionally a specific section on it - a rail link, a home hub tile, a
    // palette result, or an in-content [[cross-page link]] (see DocsUiService.setupDocsLinkClicks
    // below) all route through this.
    vm.openPage = function (pageId, sectionId) {
      var page = DocsUiService.pagesById[pageId];
      if (!page) { return; } // build-time link validation means this should never happen
      vm.exitDocsEdit(); // navigating away from an open editor discards its UNSAVED text only -
      // an already-saved local edit lives in DocsEditService regardless.
      vm.docsView = 'page';
      vm.activePage = page;
      vm.activePageId = pageId;
      // Highlight the picked section in the rail immediately; DocsUiService.scrollTo suppresses the
      // scroll-spy through the scroll so it can't snap the highlight elsewhere before landing.
      vm.activeSectionId = sectionId || null;
      vm.docsPrevPage = getReadingOrderNeighbor(pageId, -1);
      vm.docsNextPage = getReadingOrderNeighbor(pageId, 1);
      // AFTER the state writes above: the hashchange this fires compares against vm state to know
      // it's an echo (see the setupHashRouting callbacks at the bottom of this controller).
      DocsUiService.writeDocsHash(pageId, sectionId || null);
      if (sectionId) {
        DocsUiService.scrollTo(sectionId, false, function () {});
      } else {
        DocsUiService.scrollToTop();
      }
      // The page just changed docsView to 'page', which mounts fresh h2 and code-block nodes via
      // ng-if - the spy has to re-attach to the headings and the copy buttons have to be injected
      // into the new blocks; $timeout gives Angular a digest to actually create that DOM first.
      $timeout(function () {
        DocsUiService.setupScrollSpy(function (id) { if (vm.docsView === 'page') { vm.activeSectionId = id; } });
        DocsUiService.setupCodeCopyButtons();
        DocsUiService.setupStickyHeadState();
      });
    };
    // Rail's pinned "Home" item - the reciprocal of openPage: hides any open page, shows the hub.
    vm.showDocsHome = function () {
      vm.exitDocsEdit();
      vm.docsView = 'home';
      vm.activePage = null;
      vm.activePageId = null;
      vm.activeSectionId = null;
      vm.docsPrevPage = null;
      vm.docsNextPage = null;
      DocsUiService.writeDocsHash(null, null);
      // No page mounted on Home - nothing left for either observer to watch.
      DocsUiService.teardownScrollSpy();
      DocsUiService.teardownStickyHeadState();
      DocsUiService.scrollToTop();
    };

    /* ============================= Local editing (localStorage, no server) ============================= */
    // See js/services/docs-edit.service.js's own header comment for why this is immediate-save,
    // not draft-then-publish, and why it's a deliberately smaller stopgap ahead of the eventual
    // server-backed editor rather than a permanent second editing path.
    vm.docsEditMode = false;
    vm.docsEditPreview = null; // {title, lead, sections} trusted-html, or null when not editing
    vm.docsEditErrors = [];

    vm.canEditDocs = function () { return canEditByRole && vm.docsView === 'page' && !!vm.activePage; };

    // "Copy page" - the open page's SOURCE MARKDOWN (docs-site convention: a whole page you can
    // paste into an editor or an LLM), not its rendered text. Reuses the service's clipboard
    // mechanics from the per-code-block Copy buttons; label doubles as the confirmation, honest
    // about failure the same way ("Press ⌘C" - the manual fallback - not a fake "Copied"). The
    // callback can resolve from the async clipboard promise outside a digest, so the label writes
    // are wrapped in $timeout rather than assigned bare.
    var COPY_PAGE_CONFIRM_MS = 1500;
    var copyPageResetTimer = null;
    vm.docsCopyPageLabel = 'Copy page';
    vm.copyDocsPageMarkdown = function () {
      if (!vm.activePage) { return; }
      DocsUiService.copyText(vm.activePage.markdown || '', function (copied) {
        $timeout(function () {
          if (copied) {
            vm.docsCopyPageLabel = 'Copied';
          } else {
            vm.docsCopyPageLabel = 'Press ⌘C';
          }
          // Cancel any revert still pending from an earlier click, so a second click restarts the
          // confirmation instead of the first click's timer wiping the label out from under it -
          // same guard as the code-block buttons' clearTimeout(button.copyResetTimer).
          if (copyPageResetTimer) { $timeout.cancel(copyPageResetTimer); }
          copyPageResetTimer = $timeout(function () { vm.docsCopyPageLabel = 'Copy page'; }, COPY_PAGE_CONFIRM_MS);
        });
      });
    };

    vm.startDocsEdit = function () {
      if (!vm.canEditDocs()) { return; }
      var markdown = vm.activePage.markdown || '';
      vm.docsEditMode = true;
      vm.updateDocsEditPreview(markdown);
      // MarkdownEditorService.mountEditor owns the wait for ng-if to actually mount the editor
      // markup (retries with backoff, same shape as DocsUiService.setupScrollSpy) - no $timeout
      // needed here the way this method used to need one.
      MarkdownEditorService.mountEditor(markdown, {
        onTextChange: vm.updateDocsEditPreview,
        onRequestExit: vm.exitDocsEdit,
        theme: vm.theme,
      });
    };

    // Leaves edit mode WITHOUT touching anything already saved to localStorage - only discards
    // whatever's currently sitting unsaved in the editor. Safe to call even when not editing
    // (vm.openPage/vm.showDocsHome call this unconditionally on every navigation). Escape-to-exit
    // is owned by MarkdownEditorService itself now (see mountEditor's onRequestExit above) - each
    // driver knows its own rules for when Escape means "leave" versus something driver-internal
    // (Monaco's find widget wants first refusal on its own Escape).
    vm.exitDocsEdit = function () {
      MarkdownEditorService.unmountEditor();
      vm.docsEditMode = false;
      vm.docsEditPreview = null;
      vm.docsEditErrors = [];
    };

    // Re-renders the live preview from the given markdown text - called once up front by
    // startDocsEdit (the page's saved markdown) and then passed to mountEditor as onTextChange, so
    // both drivers call it with their own current text on every keystroke. Takes `text` as a
    // parameter rather than reading a vm property (see vm.docsPaletteResults's own comment for why
    // a template-called function returning a fresh object/array causes an infinite $digest - same
    // reasoning: this returns void and writes to a vm property, never called bare from a template).
    // Reuses DocsUiService's linkTargets so a still-unsaved edit's [[links]] validate against the
    // same "every page's current section slugs" picture the reader view itself was just built from.
    vm.updateDocsEditPreview = function (text) {
      var linkTargets = DocsUiService.getLinkTargets();
      var rendered = DocsRenderer.renderPage(text, linkTargets);
      vm.docsEditPreview = {
        title: rendered.title,
        lead: $sce.trustAsHtml(rendered.lead),
        sections: rendered.sections.map(function (section) {
          return { id: section.id, title: section.title, html: $sce.trustAsHtml(section.html) };
        }),
      };
      vm.docsEditErrors = rendered.errors;
    };

    // Re-derives the whole reader-facing doc structure from DocsService + localStorage (picking up
    // whatever save/reset just changed) and re-opens the same page so the reader view reflects it
    // immediately - vm.docsGroups/vm.homeLead point at DocsUiService's PREVIOUS doc object until
    // reassigned here, and groupByPageId's values point at group objects from that same previous
    // object, so both need refreshing together, in this order.
    function refreshDocsAfterLocalEdit(pageId) {
      DocsUiService.rebuild();
      vm.docsGroups = DocsUiService.doc.groups;
      vm.homeLead = DocsUiService.doc.home.lead;
      syncPageLookups();
      vm.openPage(pageId);
    }

    vm.saveDocsEdit = function () {
      if (!vm.canEditDocs() || vm.docsEditErrors.length) { return; }
      var pageId = vm.activePage.id;
      DocsEditService.saveEdit(pageId, MarkdownEditorService.getEditorText());
      refreshDocsAfterLocalEdit(pageId);
    };

    vm.resetDocsEdit = function () {
      if (!vm.activePage) { return; }
      var pageId = vm.activePage.id;
      DocsEditService.resetEdit(pageId);
      refreshDocsAfterLocalEdit(pageId);
    };

    // Toolbar - one delegating one-liner per button, tied 1:1 to constructs this app's own
    // renderer actually supports rather than a generic markdown toolbar (DocsRenderer.js). The
    // insertion mechanics themselves (wrap-selection, pad-onto-own-line, prefix-every-touched-
    // line, native-undo-preserving execCommand vs. Monaco's own undo stack) live in
    // MarkdownEditorService, written once there against whichever editor is actually live -
    // nothing here knows or cares whether that's Monaco or the textarea fallback.
    vm.docsToolbarBold = function () { MarkdownEditorService.insertWrap('**', '**', 'bold text'); };
    vm.docsToolbarItalic = function () { MarkdownEditorService.insertWrap('*', '*', 'italic text'); };
    vm.docsToolbarCode = function () { MarkdownEditorService.insertWrap('`', '`', 'code'); };
    vm.docsToolbarCodeBlock = function () { MarkdownEditorService.insertBlock('```\n', '\n```', 'code'); };
    vm.docsToolbarLink = function () { MarkdownEditorService.insertWrap('[', '](https://)', 'link text'); };
    vm.docsToolbarWikilink = function () { MarkdownEditorService.insertWrap('[[', ']]', 'page-slug'); };
    vm.docsToolbarHeading = function () { MarkdownEditorService.insertLinePrefix('## '); };
    vm.docsToolbarSubheading = function () { MarkdownEditorService.insertLinePrefix('### '); };
    vm.docsToolbarBullet = function () { MarkdownEditorService.insertLinePrefix('* '); };
    vm.docsToolbarNumberedList = function () { MarkdownEditorService.insertOrderedList(); };
    vm.docsToolbarTable = function () { MarkdownEditorService.insertBlock('| Column | Column |\n| --- | --- |\n| ', ' |', 'cell'); };

    // [[cross-page links]] embedded in rendered page content are plain, untrusted-by-Angular HTML
    // (see DocsUiService's own header comment) - this wires their clicks back into vm.openPage.
    // Bound once for the app's whole lifetime, same as setupScrollSpy above.
    DocsUiService.setupDocsLinkClicks(function (pageId, sectionId) { vm.openPage(pageId, sectionId); });

    // ⌘K/Ctrl+K from anywhere opens the palette (even mid-edit - navigating from a result then
    // discards unsaved editor text exactly like clicking a rail link mid-edit already does).
    // Bound once, same as the link-click delegation above.
    DocsUiService.setupPaletteShortcut(function () { vm.openDocsPalette(); });

    // Deep links: every explicit navigation writes #/page-id(/section-id) - see vm.openPage and
    // vm.showDocsHome - and this reads them back on Back/Forward or a hand-edited hash. Both
    // callbacks skip when the target already matches vm state: that catches the echo hashchange
    // that writeDocsHash's own assignment fires, without any suppress-flag timing.
    var initialHashTarget = DocsUiService.setupHashRouting(
      function (pageId, sectionId) {
        var alreadyThere = vm.docsView === 'page' && vm.activePageId === pageId && (vm.activeSectionId || null) === (sectionId || null);
        if (alreadyThere) { return; }
        vm.openPage(pageId, sectionId || undefined);
      },
      function () {
        if (vm.docsView === 'home') { return; }
        vm.showDocsHome();
      }
    );
    // Boot restore: a shared #/page/section link opens where it points. An unknown page id (a stale
    // link outliving a rename) falls through openPage's own existence guard and simply leaves the
    // reader on Home rather than erroring.
    if (!initialHashTarget.home) {
      vm.openPage(initialHashTarget.pageId, initialHashTarget.sectionId || undefined);
    }
  },
]);
