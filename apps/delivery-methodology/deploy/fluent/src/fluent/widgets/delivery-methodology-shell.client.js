api.controller = function ($rootScope, $scope, DataService, ThemeService, MessagingService, TipService, AppStateService, MethodologyDomainService, NavigationService, SearchService, WhatsNewService, ReferenceService, RaciGridService, ContentEditService, StructureEditService, IconService, MotionService, LiveSyncService) {
  'use strict';
  var c = this;

  ThemeService.init('deliveryMethodology');

  function syncTheme() {
    c.theme = ThemeService.readState().theme;
    ThemeService.stampWidgets();
  }
  syncTheme();

  // Cross-fades the whole page between themes rather than hand-writing a transition on every
  // themed property: the naive approach (a blanket `* { transition: background-color …, color … }`
  // while toggling) loses to any element that already declares its OWN `transition` for something
  // else (.fcard's hover-lift, for instance) - the two don't merge, whichever rule wins takes the
  // property outright - so some elements would snap while others crossfade. See MotionService.
  c.toggleTheme = function () {
    MotionService.transition(function () {
      ThemeService.toggleApp();
      syncTheme();
    });
  };

  // Editor/admin roles set data.canEdit in the widget server script. Local harness has no server
  // payload, so default true. Read-only users (role `user` only) cannot enter edit.
  AppStateService.setCanEdit(!(c.data && c.data.canEdit === false));

  // Service Portal exposes c.server on the widget carrying the real server script (this one);
  // the local harness does not. Bind so getData/saveData hit the content table when deployed.
  if (c.server) {
    DataService.bindServer(c.server);
  }

  // Live object refs - MessagingService mutates these; template binds c.toast / c.confirm.
  var messagingState = MessagingService.readState();
  c.toast = messagingState.toast;
  c.confirm = messagingState.confirm;
  c.dismissConfirm = MessagingService.dismissConfirm;
  c.acceptConfirm = MessagingService.acceptConfirm;

  TipService.bind(c);
  IconService.bind(c);

  function currentMethodology() {
    return MethodologyDomainService.currentMethodology(c.methodologies, c.methodologyId);
  }
  function sortJobTitleIds(jobTitleIds) {
    return MethodologyDomainService.sortJobTitleIds(c.jobTitles, jobTitleIds);
  }
  function raciGridContext() {
    return {
      methodology: MethodologyDomainService.currentMethodology(
        AppStateService.getMethodologies(),
        AppStateService.getMethodologyId()
      ),
      sortJobTitleIds: function (jobTitleIds) {
        return MethodologyDomainService.sortJobTitleIds(AppStateService.getJobTitles(), jobTitleIds);
      },
      hasContent: MethodologyDomainService.hasContent
    };
  }
  // RaciGridService has no $rootScope of its own to broadcast from (same reasoning as
  // WhatsNewService/ReferenceService below), so this nudge is required - not optional - whenever
  // Shell triggers a refresh as a SIDE EFFECT of navigation (switching methodology, view tabs)
  // rather than as a direct user action inside the RACI widget itself. Without it,
  // the RACI controller's own c.activePhases/c.raciGrid keep showing whatever was live at the
  // LAST broadcast: ensureActivePhases() resets the phase-active map here against the new
  // methodology's phase ids, but the RACI widget - a separate always-mounted scope - never hears
  // about that reset, so its phase chips still reference the OLD methodology's phase ids (all
  // read as off) while the grid itself renders from data actually already switched over.
  function refreshRaciGrid() {
    RaciGridService.refresh(raciGridContext());
    $rootScope.$broadcast('dm-state');
  }
  function refreshWhatsNew(serverSeen) {
    WhatsNewService.hydrateSeen(c.methodologies, serverSeen);
  }
  function refreshJobAids() {
    ReferenceService.refresh(c.methodologies, sortJobTitleIds, function (jobTitleId) {
      return MethodologyDomainService.jobTitleById(c.jobTitles, jobTitleId);
    });
  }

  function syncAppState() {
    var appState = AppStateService.readState();
    c.methodologies = appState.methodologies;
    c.jobTitles = appState.jobTitles;
    c.methodologyId = appState.methodologyId;
    c.view = appState.view;
    c.canEdit = appState.canEdit;
    c.loading = appState.loading;
  }
  function syncStructure() {
    var structureState = StructureEditService.readState();
    c.structureEditMode = structureState.structureEditMode;
    c.structureEditUiEnabled = structureState.structureEditUiEnabled;
  }
  function syncEdit() {
    c.editMode = ContentEditService.readState().editMode;
  }
  function syncSearch() {
    var state = SearchService.readState();
    c.searchResultGroups = state.searchResultGroups;
    c.searchResultCount = state.searchResultCount;
    c.searchQuery = state.searchQuery;
  }
  function syncAll() {
    syncAppState();
    syncStructure();
    syncEdit();
  }
  syncAll();
  syncSearch();
  AppStateService.subscribe($rootScope, $scope, syncAll);

  // Always show the switch when there is at least one methodology so a lone methodology still
  // reads as selected (the .on tab). With more than one, the same control is the switcher.
  // Structure edit adds "+ Add" beside the tabs (shell template) without cluttering the panel.
  c.showMethodologySwitch = function () {
    return (c.view === 'methodology' || c.view === 'raci') && c.methodologies.length >= 1;
  };
  // Pencil only after content exists - a fresh instance's only starting path is Import Delivery 2.0 content.
  c.showStructureEdit = function () {
    return c.view === 'methodology'
      && c.structureEditUiEnabled
      && c.canEdit
      && c.methodologies.length >= 1;
  };
  c.pageTitle = function () {
    if (c.view === 'raci') {
      return 'RACI';
    }
    if (c.view === 'whatsnew') {
      return "What's New";
    }
    if (c.view === 'reference') {
      return 'Reference';
    }
    return 'Methodology';
  };
  c.pageSub = function () {
    if (c.view === 'raci') {
      var raciMethodology = currentMethodology();
      if (!raciMethodology) {
        return 'Every task and every job title across the engagement. Focus a column to see one role.';
      }
      return 'Every task and every job title in ' + raciMethodology.name + '. Focus a column to see one role across the whole engagement.';
    }
    if (c.view === 'whatsnew') {
      return 'Every change since you last looked - detected automatically, and cleared as you open the sub-phase it belongs to.';
    }
    if (c.view === 'reference') {
      return 'How to read a RACI, escalation guidance, and every job aid across the methodology in one place.';
    }
    var methodology = currentMethodology();
    if (methodology && methodology.summary) {
      return methodology.summary;
    }
    if (methodology) {
      return 'Playbook for ' + methodology.name + ' engagements.';
    }
    return 'GlideFast\'s playbook for delivering an engagement end to end.';
  };
  c.anyUnread = function () {
    return WhatsNewService.anyUnread(c.methodologies);
  };

  // Each view is its own always-mounted widget gated by ng-if, so switching tabs replaces the
  // whole page body with no element left over to transition - crossfade the snapshots instead.
  // Guard reads AppStateService rather than the mirrored c.view: the mirror only catches up on the
  // next dm-state broadcast, so back-to-back tab clicks (or a double-click) could both pass a stale
  // check and fire a pointless second crossfade over identical content.
  c.setView = function (view) {
    if (view === AppStateService.getView()) {
      return;
    }

    MotionService.transition(function () {
      NavigationService.setView(view);
    });
  };
  c.onViewTabKeydown = function ($event) {
    var key = $event.key;
    if (key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== 'Home' && key !== 'End') {
      return;
    }
    var tabs = Array.prototype.slice.call($event.currentTarget.querySelectorAll('[role="tab"]'));
    if (!tabs.length) {
      return;
    }
    var current = tabs.indexOf(document.activeElement);
    if (current < 0) {
      current = 0;
      var index;
      for (index = 0; index < tabs.length; index++) {
        if (tabs[index].getAttribute('aria-selected') === 'true') {
          current = index;
          break;
        }
      }
    }
    var next = current;
    if (key === 'ArrowLeft') {
      next = (current - 1 + tabs.length) % tabs.length;
    } else if (key === 'ArrowRight') {
      next = (current + 1) % tabs.length;
    } else if (key === 'Home') {
      next = 0;
    } else {
      next = tabs.length - 1;
    }
    $event.preventDefault();
    tabs[next].focus();
    tabs[next].click();
  };
  c.switchMethodology = function (methodologyId) {
    NavigationService.switchMethodology(methodologyId);
  };
  c.toggleStructureEdit = function () {
    StructureEditService.toggleStructureEdit();
  };
  c.jumpTo = function (subPhaseId, methodologyId, elementKey) {
    NavigationService.jumpTo(subPhaseId, methodologyId, elementKey);
  };

  c.searchQuery = '';
  c.searchResultGroups = [];
  c.searchResultCount = 0;
  c.searchOpen = function () {
    return SearchService.isOpen() || !!(c.searchQuery || '').trim();
  };
  c.searchKeydown = function ($event) {
    if ($event.key === 'Escape') {
      c.clearSearch();
      if ($event.target && $event.target.blur) {
        $event.target.blur();
      }
    }
  };

  // "/" focuses search from anywhere - the one shortcut worth having in a reference tool people
  // read more than they operate. Ignored while typing (any field, or a contenteditable) so it can
  // never swallow a literal slash mid-edit, and ignored with a modifier held so it does not
  // shadow browser/OS chords. Listener is document-level, so it unbinds on $destroy like the
  // dm-modal directive's does.
  function onGlobalKeydown(event) {
    if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    var target = event.target;
    var tagName = target && target.tagName;

    if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT' || (target && target.isContentEditable)) {
      return;
    }

    var searchInput = document.querySelector('.hsearch input');

    if (!searchInput) {
      return;
    }

    event.preventDefault();
    searchInput.focus();
    searchInput.select();
  }

  document.addEventListener('keydown', onGlobalKeydown);
  $scope.$on('$destroy', function () {
    document.removeEventListener('keydown', onGlobalKeydown);
  });
  c.clearSearch = function () {
    SearchService.clear();
    syncSearch();
  };
  // Per-kind landing: job aids anchor to their task row; Reference sections switch the view
  // (they have no sub-phase to jump to); glossary rows are informational and never reach here
  // (rendered as non-buttons). Everything else opens its sub-phase. jumpTo clears the search
  // overlay itself (NavigationService.clearSearchOverlay); the reference path clears explicitly.
  c.pickSearchResult = function (result) {
    if (result.kind === 'reference') {
      c.clearSearch();
      c.setView('reference');
      return;
    }
    if (result.kind === 'jobaid') {
      c.jumpTo(result.subPhase.id, result.methodology.id, 'task:' + result.task.id);
      return;
    }
    c.jumpTo(result.subPhase.id, result.methodology.id);
  };
  c.runSearch = function () {
    SearchService.setQuery(c.searchQuery);
    SearchService.run({
      methodologies: c.methodologies,
      jargon: AppStateService.getJargon(),
      referenceSections: AppStateService.getReferenceSections()
    }, {
      isEditing: function () {
        return ContentEditService.isEditing() || StructureEditService.isEditing();
      }
    });
    syncSearch();
  };

  ContentEditService.bind({
    canEdit: function () {
      return AppStateService.getCanEdit();
    },
    isStructureEditing: StructureEditService.isEditing,
    afterSaveSuccess: function (entries) {
      AppStateService.setJustRead(entries);
      AppStateService.refreshLocation();
      refreshWhatsNew();
      refreshJobAids();
    }
  });

  StructureEditService.bind({
    canEdit: function () {
      return AppStateService.getCanEdit();
    },
    isContentEditing: ContentEditService.isEditing,
    enterContentEdit: function () {
      ContentEditService.enterEdit();
    }
  });

  NavigationService.bind({
    isEditing: function () {
      return ContentEditService.isEditing() || StructureEditService.isEditing();
    },
    syncSearch: syncSearch,
    afterOpenSubPhase: function () {
      var location = AppStateService.getLocation();
      if (location) {
        AppStateService.setJustRead(WhatsNewService.markRead(location.subPhase, AppStateService.getMethodologies()));
      } else {
        AppStateService.setJustRead([]);
      }
    },
    refreshRaciGridIfNeeded: function () {
      if (AppStateService.getView() === 'raci') {
        refreshRaciGrid();
      }
    }
  });

  // Runs after EITHER kind of content load: the bootstrap getData() below, or a later
  // AppStateService.seedStandard() call from the Methodology widget's empty-state button (a
  // table that was empty a moment ago now has real content none of these derived caches have
  // ever seen). Named and bound via AppStateService.bind() rather than left as bootstrap's own
  // inline closure, so seedStandard() can reuse it instead of duplicating this list. loadedData
  // is AppStateService.applyLoadedData()'s own first argument, passed through unchanged - this
  // is the only place changelogSeen is available (result itself only carries {empty,
  // methodologyId, subPhaseId}).
  function handleContentLoaded(result, loadedData) {
    // Empty tree (fresh install or Clear all content): leave structure edit so the pencil/panel
    // cannot be the starting path - Import Delivery 2.0 content is.
    if (result.empty && StructureEditService.isEditing()) {
      StructureEditService.exitStructureEdit();
    }

    // Stamp changelog read flags from user preference + localStorage before What's New refresh.
    refreshWhatsNew(loadedData && loadedData.changelogSeen);

    // Rebuilt on EVERY load including the empty one, deliberately. These two hold derived caches
    // (RACI groups, the job-aids index) computed from the methodology tree, and "empty" is no
    // longer only first-boot-with-nothing-cached: resetAllContent() empties a session whose
    // caches are already full, and skipping the refresh there left the RACI view rendering 21
    // phantom groups and Reference listing 69 job aids belonging to just-deleted content.
    // Both are cheap no-ops against an empty tree.
    refreshJobAids();
    refreshRaciGrid();

    if (!result.empty) {
      NavigationService.remember(result.methodologyId, result.subPhaseId);
      // Live sync keeps the viewer in place — do not re-apply deep links or push history.
      if (!result.liveSync && !NavigationService.applyDeepLinkFromUrl()) {
        NavigationService.push();
      }
    }
    // WhatsNewService/ReferenceService refresh() above updates THEIR OWN internal state, which
    // has no $rootScope of its own to broadcast from - one explicit nudge here lets the
    // What's New / Reference widgets (already mounted and listening) pick up the fresh data,
    // matching every other cross-widget state change in this app (see AppStateService header).
    $rootScope.$broadcast('dm-state');
  }

  AppStateService.bind({
    onAfterLoad: handleContentLoaded
  });

  LiveSyncService.bind({
    onAfterLoad: handleContentLoaded
  });

  function applyLoadedData(data) {
    AppStateService.applyLoadedData(data, {
      canEdit: c.data && c.data.canEdit,
      onAfterLoad: handleContentLoaded
    });
  }

  // Bootstrap after all helpers/counters exist. Harness hydrates sync (seed + localStorage) so the
  // first paint isn't Loading… → jump; instance loads stay async via the server.
  if (c.server) {
    DataService.getData().then(function (data) {
      applyLoadedData(data);
      LiveSyncService.start($scope, c.data && c.data.contentTable);
    }, function (error) {
      var message = 'Could not load content.';
      if (error && error.error) {
        message = error.error;
      }
      MessagingService.toast(message);
      AppStateService.setLoading(false);
    });
  } else {
    applyLoadedData(DataService.readLocalData());
  }
};