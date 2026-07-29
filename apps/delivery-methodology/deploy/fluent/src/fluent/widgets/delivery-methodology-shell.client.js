api.controller = function (
    $rootScope, $scope, $timeout, DataService, ThemeService, MessagingService, TipService,
    AppStateService, MethodologyDomainService, NavigationService, SearchService,
    WhatsNewService, ReferenceService, RaciGridService, ContentEditService, StructureEditService,
    IconService
  ) {
  'use strict';
  var c = this;

  ThemeService.init('deliveryMethodology');

  /* Deployed-widget theme plumbing. ThemeService writes data-theme to <html>, which is right in
     this dev harness. It is NOT enough once packaged: the packager scopes this app's whole
     stylesheet under .dm-widget (deploy.manifest.js widgetScopeClass), so :root[data-theme="light"]
     compiles to .dm-widget[data-theme="light"] - and .dm-widget is a wrapper the packager generates
     around each widget's own markup. This app ships FIVE such wrappers (one per sp_instance), so
     every one of them needs the attribute, not just the first - hence querySelectorAll, not
     querySelector. $timeout(0) because on first run the widget elements may not be in the DOM yet;
     on toggle they already are. No-op in this harness, where .dm-widget doesn't exist. */
  function stampWidgetTheme() {
    var widgets = document.querySelectorAll('.dm-widget');
    for (var index = 0; index < widgets.length; index++) {
      widgets[index].setAttribute('data-theme', c.theme);
    }
  }
  function syncTheme() {
    c.theme = ThemeService.readState().theme;
    $timeout(stampWidgetTheme, 0);
  }
  syncTheme();
  c.toggleTheme = function () {
    ThemeService.toggleApp();
    syncTheme();
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
      methodology: currentMethodology(),
      sortJobTitleIds: sortJobTitleIds,
      hasContent: MethodologyDomainService.hasContent
    };
  }
  function refreshRaciGrid() {
    RaciGridService.refresh(raciGridContext());
  }
  function refreshWhatsNew() {
    WhatsNewService.refresh(c.methodologies);
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
    c.searchResultsList = state.searchResultsList;
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

  c.showMethodologySwitch = function () {
    return (c.view === 'methodology' || c.view === 'raci') && c.methodologies.length > 1;
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

  c.canGoBack = function () {
    return NavigationService.canGoBack();
  };
  c.canGoForward = function () {
    return NavigationService.canGoForward();
  };
  c.goBack = function () {
    NavigationService.goBack();
  };
  c.goForward = function () {
    NavigationService.goForward();
  };
  c.setView = function (view) {
    NavigationService.setView(view);
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
  c.searchResultsList = [];
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
  c.clearSearch = function () {
    SearchService.clear();
    syncSearch();
  };
  c.pickSearchResult = function (result) {
    c.jumpTo(result.subPhase.id, result.methodology.id);
  };
  c.runSearch = function () {
    SearchService.setQuery(c.searchQuery);
    SearchService.run(c.methodologies, {
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
    refreshRgIfRaci: function () {
      if (AppStateService.getView() === 'raci') {
        refreshRaciGrid();
      }
    }
  });

  function applyLoadedData(data) {
    AppStateService.applyLoadedData(data, {
      canEdit: c.data && c.data.canEdit,
      onAfterLoad: function (result) {
        if (!result.empty) {
          NavigationService.remember(result.methodologyId, result.subPhaseId);
          refreshWhatsNew();
          refreshJobAids();
          if (!NavigationService.applyDeepLinkFromUrl()) {
            NavigationService.push();
          }
        }
        // WhatsNewService/ReferenceService refresh() above updates THEIR OWN internal state, which
        // has no $rootScope of its own to broadcast from - one explicit nudge here lets the
        // What's New / Reference widgets (already mounted and listening) pick up the fresh data,
        // matching every other cross-widget state change in this app (see AppStateService header).
        $rootScope.$broadcast('dm-state');
      }
    });
  }

  // Bootstrap after all helpers/counters exist. Harness hydrates sync (seed + localStorage) so the
  // first paint isn't Loading… → jump; instance loads stay async via the server.
  if (c.server) {
    DataService.getData().then(applyLoadedData, function (error) {
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