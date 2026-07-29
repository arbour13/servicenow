api.controller = function (
    $rootScope, $scope, DataService, ThemeService, MessagingService, TipService,
    AppStateService, MethodologyDomainService, NavigationService, SearchService,
    WhatsNewService, ReferenceService, RaciGridService, ContentEditService, StructureEditService,
    IconService
  ) {
  'use strict';
  var c = this;

  ThemeService.init('deliveryMethodology');

  function syncTheme() {
    c.theme = ThemeService.readState().theme;
    ThemeService.stampWidgets();
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
          refreshRaciGrid();
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