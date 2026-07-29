/* Shared application state and persistence lifecycle.

   Multi-widget note: this service is the ONE cross-widget source of truth (Shell/Methodology/RACI/
   Reference/What's New each get their own controller instance, but share this same injected
   singleton). A widget's own controller mirrors slices of this state onto its `c` for template
   binding at init time - those mirrors go stale the moment ANOTHER widget's controller calls a
   setter here, since AngularJS digest alone doesn't re-copy plain properties across controllers.
   notify() (a $rootScope.$broadcast('dm-state')) is the fix: every setter/mutator below calls it,
   and every widget controller $on('dm-state', ...)s to re-run its own sync function. See
   ServiceNow/apps/delivery-methodology/CLAUDE.md for the full cross-widget sync writeup. */
angular.module('deliveryMethodology').factory('AppStateService', [
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
    loc: null,
    canEdit: true,
    loading: true,
    isSaving: false,
    justRead: [],
    tmpLoeRole: ''
  };

  function getMethodologies() { return state.methodologies; }
  function setMethodologies(methodologies) { state.methodologies = methodologies || []; notify(); }
  function getJobTitles() { return state.jobTitles; }
  function setJobTitles(jobTitles) { state.jobTitles = jobTitles || []; notify(); }
  function getJargon() { return state.jargon; }
  function setJargon(jargon) { state.jargon = jargon || {}; notify(); }
  function getReferenceSections() { return state.referenceSections; }
  function setReferenceSections(referenceSections) { state.referenceSections = referenceSections || []; notify(); }
  function getMethodologyId() { return state.methodologyId; }
  function setMethodologyId(methodologyId) { state.methodologyId = methodologyId; notify(); }
  function getSubPhaseId() { return state.subPhaseId; }
  function setSubPhaseId(subPhaseId) { state.subPhaseId = subPhaseId; notify(); }
  function getView() { return state.view; }
  function setView(view) { state.view = view; notify(); }
  function getLoc() { return state.loc; }
  function setLoc(location) { state.loc = location; notify(); }
  function getCanEdit() { return state.canEdit; }
  function setCanEdit(canEdit) { state.canEdit = canEdit !== false; notify(); }
  function getLoading() { return state.loading; }
  function setLoading(loading) { state.loading = !!loading; notify(); }
  function getIsSaving() { return state.isSaving; }
  function setIsSaving(isSaving) { state.isSaving = !!isSaving; notify(); }
  function getJustRead() { return state.justRead; }
  function setJustRead(justRead) { state.justRead = justRead || []; notify(); }
  function getTmpLoeRole() { return state.tmpLoeRole; }
  function setTmpLoeRole(tmpLoeRole) { state.tmpLoeRole = tmpLoeRole || ''; notify(); }

  function refreshLoc() {
    state.loc = MethodologyDomainService.findSubPhase(state.methodologies, state.subPhaseId);
    if (state.loc) {
      state.loc.loeRows = MethodologyDomainService.computeLoeRows(state.jobTitles, state.loc.sp);
      state.loc.taskTableRoles = MethodologyDomainService.taskTableRoles(state.jobTitles, state.loc.sp);
    }
    notify();
    return state.loc;
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
      refreshLoc();
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
      MethodologyDomainService.curMeth(state.methodologies, state.methodologyId)
    ));
    refreshLoc();
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
      loc: state.loc,
      canEdit: state.canEdit,
      loading: state.loading,
      isSaving: state.isSaving,
      justRead: state.justRead,
      tmpLoeRole: state.tmpLoeRole
    };
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
    getLoc: getLoc,
    setLoc: setLoc,
    getCanEdit: getCanEdit,
    setCanEdit: setCanEdit,
    getLoading: getLoading,
    setLoading: setLoading,
    getIsSaving: getIsSaving,
    setIsSaving: setIsSaving,
    getJustRead: getJustRead,
    setJustRead: setJustRead,
    getTmpLoeRole: getTmpLoeRole,
    setTmpLoeRole: setTmpLoeRole,
    refreshLoc: refreshLoc,
    tryBeginSave: tryBeginSave,
    persistMethodologies: persistMethodologies,
    applyLoadedData: applyLoadedData,
    readState: readState
  };
}]);
