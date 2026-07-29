api.controller = function (
    $rootScope, $scope, AppStateService, MethodologyDomainService, NavigationService, ReferenceService,
    JargonService, TipService, IconService
  ) {
  'use strict';
  var c = this;

  c.icon = IconService.paths;

  c.isActiveView = function () {
    return !AppStateService.getLoading() && AppStateService.getView() === 'reference';
  };

  c.tip = TipService.tip;
  c.tipMouseOver = function ($event) { TipService.tipMouseOver($event); };
  c.tipMouseOut = function ($event) { TipService.tipMouseOut($event); };
  c.dismissTip = function () { TipService.dismissTip(); };

  c.showJargon = false;
  c.jargonHtml = function (text) { return JargonService.jargonHtml(text, c.showJargon); };
  c.jobTitleColor = function (id) { return MethodologyDomainService.jobTitleColor(c.jobTitles, id); };
  c.jumpTo = function (subId, methId) { NavigationService.jumpTo(subId, methId); };

  function sortJobTitleIds(ids) { return MethodologyDomainService.sortJobTitleIds(c.jobTitles, ids); }
  function jobTitleById(id) { return MethodologyDomainService.jobTitleById(c.jobTitles, id); }

  function syncAppState() {
    var appState = AppStateService.readState();
    c.methodologies = appState.methodologies;
    c.jobTitles = appState.jobTitles;
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
  var unsubscribeDmState = $rootScope.$on('dm-state', syncAll);
  $scope.$on('$destroy', unsubscribeDmState);

  // Enter this view with a stale index (e.g. job aids changed while on another view) - refresh
  // once up front so the index is never a run behind the current content.
  ReferenceService.refresh(c.methodologies, sortJobTitleIds, jobTitleById);
  syncJobAids();
};