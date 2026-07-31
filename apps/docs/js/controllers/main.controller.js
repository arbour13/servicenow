/* Main controller for the standalone GlideFast Docs - only the docs-related vm surface and the
   app-wide theme toggle exist here; there is no script-builder mode, sidenav mode-switcher, or
   Settings/Connection page, since this app is nothing but a hosted collection of reference pages. */
angular.module('glidefastDocs').controller('MainController', [
  '$scope', '$timeout', '$sce', 'ThemeService', 'DocsUiService', 'DocsEditService',
  function ($scope, $timeout, $sce, ThemeService, DocsUiService, DocsEditService) {
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

    // Reverse lookup from a page id to the group that contains it - built here (view-shaping, not
    // DOM mechanics, so it lives in the controller rather than DocsUiService) so vm.openPage can set
    // the breadcrumb without walking every group on each navigation. Re-derived (not just built
    // once) after any local edit save/reset, since DocsUiService.rebuild() replaces vm.docsGroups
    // with a whole new array of new group objects - the old lookup's values would otherwise point
    // at group objects nothing else references any more.
    var groupByPageId = {};
    function syncGroupByPageId() {
      groupByPageId = {};
      vm.docsGroups.forEach(function (grp) {
        grp.pages.forEach(function (page) { groupByPageId[page.id] = grp; });
      });
    }
    syncGroupByPageId();

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

    // The left rail's page-button highlight - active for whichever page is open, regardless of
    // which of its sections the reader has scrolled to (that gets its own highlight in the right
    // "on this page" rail instead, .docs-toc-section.active in index.html).
    vm.docsPageHeadingActive = function (page) { return vm.activePageId === page.id; };

    // Navigates to a page, optionally a specific section on it - a rail link, a home hub tile, a
    // search result, or an in-content [[cross-page link]] (see DocsUiService.setupDocsLinkClicks
    // below) all route through this. Clears any active search so the just-opened page is actually
    // visible instead of staying hidden behind the results list.
    vm.openPage = function (pageId, sectionId) {
      var page = DocsUiService.pagesById[pageId];
      if (!page) { return; } // build-time link validation means this should never happen
      vm.exitDocsEdit(); // navigating away from an open editor discards its UNSAVED text only -
      // an already-saved local edit lives in DocsEditService regardless.
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
      vm.exitDocsEdit();
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

    /* ============================= Local editing (localStorage, no server) ============================= */
    // See js/services/docs-edit.service.js's own header comment for why this is immediate-save,
    // not draft-then-publish, and why it's a deliberately smaller stopgap ahead of the eventual
    // server-backed editor rather than a permanent second editing path.
    vm.docsEditMode = false;
    vm.docsEditText = '';
    vm.docsEditPreview = null; // {title, lead, sections} trusted-html, or null when not editing
    vm.docsEditErrors = [];

    vm.canEditDocs = function () { return vm.docsView === 'page' && !!vm.activePage; };

    vm.startDocsEdit = function () {
      if (!vm.canEditDocs()) { return; }
      vm.docsEditText = vm.activePage.markdown || '';
      vm.docsEditMode = true;
      vm.updateDocsEditPreview();
      // The editor's panes don't exist until ng-if mounts them, so focus and the scroll-sync
      // binding both have to wait a digest. scrollTop is reset explicitly AFTER focus: focusing a
      // textarea whose content overflows can leave it scrolled to the end even with the caret at
      // position 0, so without this an author opens the editor staring at the bottom of their page.
      $timeout(function () {
        var textarea = document.querySelector('.docs-editor-textarea');
        if (textarea) {
          textarea.focus();
          textarea.setSelectionRange(0, 0);
          textarea.scrollTop = 0;
        }
        DocsUiService.setupEditorScrollSync();
        // Paint the highlight layer HERE, not in the updateDocsEditPreview() call above - that one
        // runs before ng-if has mounted the editor, so the layer doesn't exist yet and the paint
        // silently no-ops, leaving the source pane blank (the textarea's own text is transparent).
        DocsUiService.paintEditorHighlight(vm.docsEditText);
      });
    };

    // Escape leaves the editor - same discard-unsaved-text behavior as Cancel (see
    // vm.exitDocsEdit). Kept even though this is an inline panel rather than a modal: it's the
    // reflex people have with a focused textarea, and the editor is the only thing Escape could
    // plausibly mean while it's open. Bound on document because the focused element is the
    // textarea inside the editor, and keydown from there bubbles up here. Torn down with the
    // controller so it can't outlive the app.
    function onDocumentKeydown(event) {
      if (event.key !== 'Escape' || !vm.docsEditMode) { return; }
      $scope.$applyAsync(function () { vm.exitDocsEdit(); });
    }
    document.addEventListener('keydown', onDocumentKeydown);
    $scope.$on('$destroy', function () { document.removeEventListener('keydown', onDocumentKeydown); });

    // Leaves edit mode WITHOUT touching anything already saved to localStorage - only discards
    // whatever's currently sitting unsaved in the textarea. Safe to call even when not editing
    // (vm.openPage/vm.showDocsHome call this unconditionally on every navigation).
    vm.exitDocsEdit = function () {
      // Unbinds the pane scroll listeners before ng-if tears the panes out of the DOM - otherwise
      // the handlers keep a reference to detached elements until the next edit replaces them.
      DocsUiService.teardownEditorScrollSync();
      vm.docsEditMode = false;
      vm.docsEditText = '';
      vm.docsEditPreview = null;
      vm.docsEditErrors = [];
    };

    // Re-renders the live preview from the CURRENT textarea contents - called on every keystroke
    // via ng-change (never directly from a template expression; see vm.docsSearchResults's own
    // comment for why a template-called function returning a fresh object/array causes an infinite
    // $digest - this returns void and writes to a vm property instead, same fix, same reason).
    // Reuses DocsUiService's linkTargets so a still-unsaved edit's [[links]] validate against the
    // same "every page's current section slugs" picture the reader view itself was just built from.
    vm.updateDocsEditPreview = function () {
      DocsUiService.paintEditorHighlight(vm.docsEditText);
      var linkTargets = DocsUiService.getLinkTargets();
      var rendered = DocsRenderer.renderPage(vm.docsEditText, linkTargets);
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
      syncGroupByPageId();
      vm.openPage(pageId);
    }

    vm.saveDocsEdit = function () {
      if (!vm.canEditDocs() || vm.docsEditErrors.length) { return; }
      var pageId = vm.activePage.id;
      DocsEditService.saveEdit(pageId, vm.docsEditText);
      refreshDocsAfterLocalEdit(pageId);
    };

    vm.resetDocsEdit = function () {
      if (!vm.activePage) { return; }
      var pageId = vm.activePage.id;
      DocsEditService.resetEdit(pageId);
      refreshDocsAfterLocalEdit(pageId);
    };

    // Toolbar helpers - insert markdown syntax into the textarea at the cursor (or around the
    // current selection), tied 1:1 to constructs this app's own renderer actually supports rather
    // than a generic markdown toolbar. Query the textarea by class each call rather than caching
    // the element, matching this app's existing style of querying singleton DOM nodes directly
    // (see DocsUiService's .docs-pane lookups) - it only exists while vm.docsEditMode is true.
    // Every insertion goes through execCommand('insertText') rather than assigning
    // vm.docsEditText. That looks like the long way round, and it's the whole reason Cmd/Ctrl+Z
    // works in this editor: writing to a textarea's value programmatically CLEARS the browser's
    // native undo stack, so a toolbar click used to make everything typed before it unundoable.
    // execCommand is formally deprecated, but there is still no standard API that edits a textarea
    // while participating in native undo - contentEditable's alternatives don't apply to <textarea>.
    // It also fires a real `input` event, which is what lets ng-model and its ng-change (the live
    // preview + highlight refresh) update on their own with no manual call here.
    // Runs inside $timeout because ng-click already has us in a digest, and the synchronous input
    // event would otherwise re-enter $apply.
    function replaceSelection(text, onDone) {
      var textarea = document.querySelector('.docs-editor-textarea');
      if (!textarea) { return; }
      $timeout(function () {
        textarea.focus();
        document.execCommand('insertText', false, text);
        if (onDone) { onDone(textarea); }
      });
    }
    function insertWrap(before, after, placeholder) {
      var textarea = document.querySelector('.docs-editor-textarea');
      if (!textarea) { return; }
      var start = textarea.selectionStart;
      var selected = vm.docsEditText.slice(start, textarea.selectionEnd) || placeholder;
      replaceSelection(before + selected + after, function (el) {
        // Leave the inner text selected so it can be typed straight over - the placeholder case is
        // the point ("bold text" should be replaceable immediately).
        el.setSelectionRange(start + before.length, start + before.length + selected.length);
      });
    }
    function insertLinePrefix(prefix) {
      var textarea = document.querySelector('.docs-editor-textarea');
      if (!textarea) { return; }
      var start = textarea.selectionStart;
      var lineStart = vm.docsEditText.lastIndexOf('\n', start - 1) + 1;
      // Collapse to the line's start so the prefix lands there rather than at the caret, then put
      // the caret back where the author actually was, shifted by what was inserted.
      textarea.setSelectionRange(lineStart, lineStart);
      replaceSelection(prefix, function (el) {
        el.setSelectionRange(start + prefix.length, start + prefix.length);
      });
    }
    function insertLine(line) {
      var textarea = document.querySelector('.docs-editor-textarea');
      if (!textarea) { return; }
      var start = textarea.selectionStart;
      var needsLeadingNewline = start > 0 && vm.docsEditText[start - 1] !== '\n';
      replaceSelection((needsLeadingNewline ? '\n' : '') + line + '\n');
    }
    vm.docsToolbarBold = function () { insertWrap('**', '**', 'bold text'); };
    vm.docsToolbarCode = function () { insertWrap('`', '`', 'code'); };
    vm.docsToolbarLink = function () { insertWrap('[', '](https://)', 'link text'); };
    vm.docsToolbarHeading = function () { insertLinePrefix('## '); };
    vm.docsToolbarSubheading = function () { insertLinePrefix('### '); };
    vm.docsToolbarBullet = function () { insertLinePrefix('* '); };
    vm.docsToolbarBadge = function () { insertLine('<!-- badge: Extended guidance -->'); };

    // [[cross-page links]] embedded in rendered page content are plain, untrusted-by-Angular HTML
    // (see DocsUiService's own header comment) - this wires their clicks back into vm.openPage.
    // Bound once for the app's whole lifetime, same as setupScrollSpy above.
    DocsUiService.setupDocsLinkClicks(function (pageId, sectionId) { vm.openPage(pageId, sectionId); });
  },
]);
