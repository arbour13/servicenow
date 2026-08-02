[
  'DataService', '$q', '$rootScope', '$timeout', 'MessagingService', 'MethodologyDomainService', 'IdSeqService', 'IconService', 'JargonService',
  'UrlPolicyService', 'RaciGridService',
  function (DataService, $q, $rootScope, $timeout, MessagingService, MethodologyDomainService, IdSeqService, IconService, JargonService,
    UrlPolicyService, RaciGridService) {
  'use strict';

  // applyLoadedData() below calls a dozen-plus setters in one pass while bootstrapping; without
  // this flag each setter's own notify() would broadcast separately, running every widget's sync
  // function a dozen-plus times for what is really one atomic "data just loaded" event. Every
  // other caller (one setter at a time, mid-session) is unaffected - silenced stays false.
  var silenced = false;

  // Post-load side effects (RACI grid, job aids index, What's New hydration, the initial nav
  // push) live in Shell's own closures over services this factory does not inject - see
  // shell.controller.js's bootstrap call. bind() lets seedStandard() below reuse that SAME
  // callback instead of duplicating it, the same way ContentEditService/StructureEditService/
  // NavigationService already take a hostHooks object from Shell.
  var hooks = {};

  function bind(hostHooks) {
    hooks = hostHooks || {};
  }

  // Service Portal often digests only the widget that handled the click/ng-change. Sibling
  // widgets still receive dm-state and update their `c` mirrors, but ng-class (edit/search blur)
  // will not paint until those scopes digest. A zero-delay $timeout runs $apply from $rootScope
  // so every widget paints on the next tick - instant in the harness, required on the instance.
  function notify() {
    if (silenced) {
      return;
    }
    $rootScope.$broadcast('dm-state');
    $timeout(angular.noop, 0);
  }

  // Run several setters as one logical update (one dm-state at the end). Nested batch() calls
  // keep silence until the outermost finishes so nav gestures do not fan out 4–5 broadcasts.
  function batch(work) {
    var wasSilenced = silenced;
    silenced = true;
    try {
      work();
    } finally {
      silenced = wasSilenced;
      if (!silenced) {
        notify();
      }
    }
  }

  var state = {
    methodologies: [],
    jobTitles: [],
    jargon: {},
    referenceSections: [],
    methodologyId: null,
    subPhaseId: null,
    view: 'methodology',
    location: null,
    canEdit: true,
    canAdmin: true,
    loading: true,
    isSaving: false,
    justRead: [],
    tmpLevelOfEffortRoleId: ''
  };

  function getMethodologies() {
    return state.methodologies;
  }
  function setMethodologies(methodologies) {
    if (methodologies) {
      state.methodologies = methodologies;
    } else {
      state.methodologies = [];
    }
    notify();
  }
  function getJobTitles() {
    return state.jobTitles;
  }
  function setJobTitles(jobTitles) {
    if (jobTitles) {
      state.jobTitles = jobTitles;
    } else {
      state.jobTitles = [];
    }
    notify();
  }
  function getJargon() {
    return state.jargon;
  }
  function setJargon(jargon) {
    if (jargon) {
      state.jargon = jargon;
    } else {
      state.jargon = {};
    }
    // Keep the highlight engine and the save cache on the same map - jargon edits are not on
    // methodologies, so persistMethodologies() would otherwise re-send a stale cachedJargon.
    JargonService.setGlossary(state.jargon);
    DataService.setCachedJargon(state.jargon);
    notify();
  }
  function getReferenceSections() {
    return state.referenceSections;
  }
  function setReferenceSections(referenceSections) {
    if (referenceSections) {
      state.referenceSections = referenceSections;
    } else {
      state.referenceSections = [];
    }
    DataService.setCachedReferenceSections(state.referenceSections);
    notify();
  }
  function getMethodologyId() {
    return state.methodologyId;
  }
  function setMethodologyId(methodologyId) {
    state.methodologyId = methodologyId;
    notify();
  }
  function getSubPhaseId() {
    return state.subPhaseId;
  }
  function setSubPhaseId(subPhaseId) {
    state.subPhaseId = subPhaseId;
    notify();
  }
  function getView() {
    return state.view;
  }
  function setView(view) {
    state.view = view;
    notify();
  }
  function getLocation() {
    return state.location;
  }
  function setLocation(location) {
    state.location = location;
    notify();
  }
  function getCanEdit() {
    return state.canEdit;
  }
  function setCanEdit(canEdit) {
    state.canEdit = canEdit !== false;
    notify();
  }
  function getCanAdmin() {
    return state.canAdmin;
  }
  function setCanAdmin(canAdmin) {
    state.canAdmin = canAdmin !== false;
    notify();
  }
  function getLoading() {
    return state.loading;
  }
  function setLoading(loading) {
    state.loading = !!loading;
    notify();
  }
  function getIsSaving() {
    return state.isSaving;
  }
  function setIsSaving(isSaving) {
    state.isSaving = !!isSaving;
    notify();
  }
  function getJustRead() {
    return state.justRead;
  }
  function setJustRead(justRead) {
    if (justRead) {
      state.justRead = justRead;
    } else {
      state.justRead = [];
    }
    notify();
  }
  function getTmpLevelOfEffortRoleId() {
    return state.tmpLevelOfEffortRoleId;
  }
  function setTmpLevelOfEffortRoleId(tmpLevelOfEffortRoleId) {
    if (tmpLevelOfEffortRoleId) {
      state.tmpLevelOfEffortRoleId = tmpLevelOfEffortRoleId;
    } else {
      state.tmpLevelOfEffortRoleId = '';
    }
    notify();
  }

  function refreshLocation() {
    state.location = MethodologyDomainService.findSubPhase(state.methodologies, state.subPhaseId);
    if (state.location) {
      state.location.levelOfEffortRows = MethodologyDomainService.computeLoeRows(
        state.jobTitles,
        state.location.subPhase
      );
      state.location.taskTableRoles = MethodologyDomainService.taskTableRoles(
        state.jobTitles,
        state.location.subPhase
      );
    }
    notify();
    return state.location;
  }

  function tryBeginSave() {
    if (state.isSaving) {
      MessagingService.toast('Save already in progress');
      return false;
    }
    state.isSaving = true;
    notify();
    return true;
  }

  function persistMethodologies() {
    if (!state.isSaving) {
      state.isSaving = true;
      notify();
    }
    return DataService.saveData(state.methodologies).then(function (result) {
      state.isSaving = false;
      notify();
      return result;
    }, function (error) {
      state.isSaving = false;
      notify();
      var message = 'Could not save changes.';
      if (error && error.error) {
        message = error.error;
      }
      MessagingService.toast(message);
      return $q.reject(error);
    });
  }

  // One-time "Import Delivery 2.0 content" action, callable from any widget once loading has finished
  // (unlike applyLoadedData, which is bootstrap-only). Runs the exact same post-load pipeline as
  // the initial load - recompute sids, backfill participants, pick a starting sub-phase, and
  // Shell's own bound onAfterLoad (RACI grid / job aids / What's New / nav push) - because a
  // table that was empty a moment ago now has real methodologies/phases/tasks that every one of
  // those needs to see for the first time, same as any other fresh load.
  function seedStandard() {
    if (!tryBeginSave()) {
      return $q.reject({
        error: 'Save already in progress'
      });
    }

    return DataService.seedStandard().then(function (data) {
      // No extra notify() here: applyLoadedData() below already broadcasts once at the end of
      // its own run (in both its empty and non-empty branches), and by then state.isSaving is
      // already false - a second broadcast would be pure redundancy, not a missed update.
      state.isSaving = false;
      return applyLoadedData(data, {
        canEdit: state.canEdit,
        canAdmin: state.canAdmin,
        onAfterLoad: hooks.onAfterLoad
      });
    }, function (error) {
      state.isSaving = false;
      notify();
      var message = 'Could not import Delivery 2.0 content.';
      if (error && error.error) {
        message = error.error;
      }
      MessagingService.toast(message);
      return $q.reject(error);
    });
  }

  // Testing counterpart to seedStandard() - clears all content so the fresh-instance empty state
  // can be exercised repeatedly. Runs the same applyLoadedData() pipeline on the way back, which
  // takes its own empty branch (null methodologyId/subPhaseId, no nav push) and leaves every
  // widget correctly showing nothing. Server clearAll requires canAdmin.
  function resetAllContent() {
    if (!state.canAdmin) {
      MessagingService.toast('Only admins can clear all content');
      return $q.reject({
        error: 'Not authorized to clear all content.'
      });
    }

    if (!tryBeginSave()) {
      return $q.reject({
        error: 'Save already in progress'
      });
    }

    return DataService.resetAllContent().then(function () {
      state.isSaving = false;
      return applyLoadedData({
        methodologies: [],
        jobTitles: [],
        jargon: {},
        referenceSections: []
      }, {
        canEdit: state.canEdit,
        canAdmin: state.canAdmin,
        onAfterLoad: hooks.onAfterLoad
      });
    }, function (error) {
      state.isSaving = false;
      notify();
      var message = 'Could not clear content.';
      if (error && error.error) {
        message = error.error;
      }
      MessagingService.toast(message);
      return $q.reject(error);
    });
  }

  function applyLoadedData(data, options) {
    var loadOptions = options || {};
    silenced = true;
    setJobTitles(data.jobTitles);
    UrlPolicyService.normalizeMethodologies(data.methodologies);
    RaciGridService.normalizeMethodologies(data.methodologies);
    setMethodologies(data.methodologies);
    setJargon(data.jargon);
    setReferenceSections(data.referenceSections);
    MethodologyDomainService.backfillParticipants(state.methodologies);
    state.methodologies.forEach(function (methodology) {
      IdSeqService.recomputeSids(methodology);
      (methodology.phases || []).forEach(function (phase) {
        (phase.subPhases || []).forEach(function (subPhase) {
          IconService.ensureIcon(subPhase);
        });
      });
    });
    IdSeqService.seedFromMethodologies(state.methodologies);
    JargonService.setGlossary(state.jargon);
    setCanEdit(loadOptions.canEdit);
    setCanAdmin(loadOptions.canAdmin);

    if (!state.methodologies.length) {
      setMethodologyId(null);
      setSubPhaseId(null);
      refreshLocation();
      setLoading(false);
      silenced = false;
      notify();
      if (loadOptions.onAfterLoad) {
        loadOptions.onAfterLoad({
          empty: true
        }, data);
      }
      return {
        empty: true
      };
    }

    setMethodologyId(state.methodologies[0].id);
    setSubPhaseId(MethodologyDomainService.firstContentSubPhase(
      MethodologyDomainService.currentMethodology(state.methodologies, state.methodologyId)
    ));
    refreshLocation();
    setLoading(false);
    silenced = false;
    notify();
    var result = {
      empty: false,
      methodologyId: state.methodologyId,
      subPhaseId: state.subPhaseId
    };
    if (loadOptions.onAfterLoad) {
      loadOptions.onAfterLoad(result, data);
    }
    return result;
  }

  // Live-sync path: replace content from the DB but keep the viewer's methodology/sub-phase/view
  // when those ids still exist. Bootstrap still uses applyLoadedData() (first sub-phase + nav push).
  function applySyncedData(data, options) {
    var loadOptions = options || {};
    var previousMethodologyId = state.methodologyId;
    var previousSubPhaseId = state.subPhaseId;

    silenced = true;
    setJobTitles(data.jobTitles);
    UrlPolicyService.normalizeMethodologies(data.methodologies);
    RaciGridService.normalizeMethodologies(data.methodologies);
    setMethodologies(data.methodologies);
    setJargon(data.jargon);
    setReferenceSections(data.referenceSections);
    MethodologyDomainService.backfillParticipants(state.methodologies);
    state.methodologies.forEach(function (methodology) {
      IdSeqService.recomputeSids(methodology);
      (methodology.phases || []).forEach(function (phase) {
        (phase.subPhases || []).forEach(function (subPhase) {
          IconService.ensureIcon(subPhase);
        });
      });
    });
    IdSeqService.seedFromMethodologies(state.methodologies);
    JargonService.setGlossary(state.jargon);
    if (loadOptions.canEdit != null) {
      setCanEdit(loadOptions.canEdit);
    }
    if (loadOptions.canAdmin != null) {
      setCanAdmin(loadOptions.canAdmin);
    }

    if (!state.methodologies.length) {
      setMethodologyId(null);
      setSubPhaseId(null);
      refreshLocation();
      setLoading(false);
      silenced = false;
      notify();
      if (loadOptions.onAfterLoad) {
        loadOptions.onAfterLoad({
          empty: true,
          liveSync: true
        }, data);
      }
      return {
        empty: true,
        liveSync: true
      };
    }

    var methodologyStillExists = !!MethodologyDomainService.currentMethodology(
      state.methodologies,
      previousMethodologyId
    );
    if (methodologyStillExists) {
      setMethodologyId(previousMethodologyId);
    } else {
      setMethodologyId(state.methodologies[0].id);
    }

    var subPhaseStillExists = !!MethodologyDomainService.findSubPhase(
      state.methodologies,
      previousSubPhaseId
    );
    if (subPhaseStillExists) {
      setSubPhaseId(previousSubPhaseId);
    } else {
      setSubPhaseId(MethodologyDomainService.firstContentSubPhase(
        MethodologyDomainService.currentMethodology(state.methodologies, state.methodologyId)
      ));
    }

    refreshLocation();
    setLoading(false);
    silenced = false;
    notify();
    var result = {
      empty: false,
      liveSync: true,
      methodologyId: state.methodologyId,
      subPhaseId: state.subPhaseId
    };
    if (loadOptions.onAfterLoad) {
      loadOptions.onAfterLoad(result, data);
    }
    return result;
  }

  function readState() {
    return {
      methodologies: state.methodologies,
      jobTitles: state.jobTitles,
      jargon: state.jargon,
      referenceSections: state.referenceSections,
      methodologyId: state.methodologyId,
      subPhaseId: state.subPhaseId,
      view: state.view,
      location: state.location,
      canEdit: state.canEdit,
      canAdmin: state.canAdmin,
      loading: state.loading,
      isSaving: state.isSaving,
      justRead: state.justRead,
      tmpLevelOfEffortRoleId: state.tmpLevelOfEffortRoleId
    };
  }

  // View widgets share the same isActiveView / dm-state subscribe pattern - attach once here
  // instead of copying the three-line blocks into every controller.
  function bindActiveView(controller, viewName) {
    controller.isActiveView = function () {
      return getView() === viewName;
    };
  }

  function subscribe($rootScope, $scope, syncAll) {
    var unsubscribe = $rootScope.$on('dm-state', syncAll);
    $scope.$on('$destroy', unsubscribe);
    return unsubscribe;
  }

  return {
    getMethodologies: getMethodologies,
    setMethodologies: setMethodologies,
    getJobTitles: getJobTitles,
    setJobTitles: setJobTitles,
    getJargon: getJargon,
    setJargon: setJargon,
    getReferenceSections: getReferenceSections,
    setReferenceSections: setReferenceSections,
    getMethodologyId: getMethodologyId,
    setMethodologyId: setMethodologyId,
    getSubPhaseId: getSubPhaseId,
    setSubPhaseId: setSubPhaseId,
    getView: getView,
    setView: setView,
    getLocation: getLocation,
    setLocation: setLocation,
    getCanEdit: getCanEdit,
    setCanEdit: setCanEdit,
    getCanAdmin: getCanAdmin,
    setCanAdmin: setCanAdmin,
    getLoading: getLoading,
    setLoading: setLoading,
    getIsSaving: getIsSaving,
    setIsSaving: setIsSaving,
    getJustRead: getJustRead,
    setJustRead: setJustRead,
    getTmpLevelOfEffortRoleId: getTmpLevelOfEffortRoleId,
    setTmpLevelOfEffortRoleId: setTmpLevelOfEffortRoleId,
    refreshLocation: refreshLocation,
    tryBeginSave: tryBeginSave,
    persistMethodologies: persistMethodologies,
    applyLoadedData: applyLoadedData,
    applySyncedData: applySyncedData,
    seedStandard: seedStandard,
    resetAllContent: resetAllContent,
    readState: readState,
    bindActiveView: bindActiveView,
    subscribe: subscribe,
    batch: batch,
    bind: bind,
    notify: notify
  };
}]