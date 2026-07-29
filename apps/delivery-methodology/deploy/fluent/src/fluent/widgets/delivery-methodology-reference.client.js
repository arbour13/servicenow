api.controller = function (
    $rootScope, $scope, AppStateService, MethodologyDomainService, NavigationService, ReferenceService,
    JargonService, TipService, IconService, UrlPolicyService
  ) {
  'use strict';
  var c = this;

  AppStateService.bindActiveView(c, 'reference');
  TipService.bind(c);
  IconService.bind(c);
  UrlPolicyService.bind(c);

  c.showJargon = false;
  c.jargonHtml = function (text) {
    return JargonService.jargonHtml(text, c.showJargon);
  };
  c.sectionParagraphs = function (section) {
    var body = section && section.body != null ? String(section.body) : '';
    var trimmed = body.replace(/^\s+|\s+$/g, '');
    if (!trimmed) {
      return [];
    }
    return trimmed.split(/\n\n+/);
  };
  c.jobTitleColor = function (jobTitleId) {
    return MethodologyDomainService.jobTitleColor(c.jobTitles, jobTitleId);
  };
  c.jumpTo = function (subPhaseId, methodologyId) {
    NavigationService.jumpTo(subPhaseId, methodologyId);
  };

  function sortJobTitleIds(jobTitleIds) {
    return MethodologyDomainService.sortJobTitleIds(c.jobTitles, jobTitleIds);
  }
  function jobTitleById(jobTitleId) {
    return MethodologyDomainService.jobTitleById(c.jobTitles, jobTitleId);
  }

  function syncAppState() {
    var appState = AppStateService.readState();
    c.methodologies = appState.methodologies;
    c.jobTitles = appState.jobTitles;
    c.referenceSections = appState.referenceSections || [];
    c.loading = appState.loading;
  }
  function syncJobAids() {
    c.jobAids = ReferenceService.readState().jobAids;
  }
  function syncAll() {
    syncAppState();
    syncJobAids();
  }
  syncAll();
  AppStateService.subscribe($rootScope, $scope, syncAll);

  // Enter this view with a stale index (e.g. job aids changed while on another view) - refresh
  // once up front so the index is never a run behind the current content.
  ReferenceService.refresh(c.methodologies, sortJobTitleIds, jobTitleById);
  syncJobAids();
};