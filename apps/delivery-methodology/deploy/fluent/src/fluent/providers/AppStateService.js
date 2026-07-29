[
  'DataService', '$q', '$rootScope', 'MessagingService', 'MethodologyDomainService', 'IdSeqService', 'IconService', 'JargonService',
  function (DataService, $q, $rootScope, MessagingService, MethodologyDomainService, IdSeqService, IconService, JargonService) {
  'use strict';

  // applyLoadedData() below calls a dozen-plus setters in one pass while bootstrapping; without
  // this flag each setter's own notify() would broadcast separately, running every widget's sync
  // function a dozen-plus times for what is really one atomic "data just loaded" event. Every
  // other caller (one setter at a time, mid-session) is unaffected - silenced stays false.
  var silenced = false;

  function notify() {
    if (silenced) {
      return;
    }
    $rootScope.$broadcast('dm-state');
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

  function applyLoadedData(data, options) {
    var loadOptions = options || {};
    silenced = true;
    setJobTitles(data.jobTitles);
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
        });
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
      loadOptions.onAfterLoad(result);
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
      return !getLoading() && getView() === viewName;
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
    readState: readState,
    bindActiveView: bindActiveView,
    subscribe: subscribe
  };
}]