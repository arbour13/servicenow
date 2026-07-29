api.controller = function ($rootScope, $scope, AppStateService, MethodologyDomainService, NavigationService, RaciGridService, TipService,
    IconService) {
  'use strict';
  var c = this;

  c.icon = IconService.paths;

  c.isActiveView = function () {
    return !AppStateService.getLoading() && AppStateService.getView() === 'raci';
  };

  c.tip = TipService.tip;
  c.tipMouseOver = function ($event) { TipService.tipMouseOver($event); };
  c.tipMouseOut = function ($event) { TipService.tipMouseOut($event); };
  c.dismissTip = function () { TipService.dismissTip(); };

  c.raciLetters = ['R', 'A', 'C', 'I'];
  c.raciNames = { R: 'Responsible', A: 'Accountable', C: 'Consulted', I: 'Informed' };
  c.raciHex = { R: '#01cc52', A: '#e5c20b', C: '#3ec2f8', I: '#bdc2cb' };

  function curMeth() {
    return MethodologyDomainService.curMeth(c.methodologies, c.methodologyId);
  }
  c.curMeth = curMeth;
  c.jobTitleById = function (id) { return MethodologyDomainService.jobTitleById(c.jobTitles, id); };
  function sortJobTitleIds(ids) { return MethodologyDomainService.sortJobTitleIds(c.jobTitles, ids); }
  function rgContext() {
    return {
      methodology: curMeth(),
      sortJobTitleIds: sortJobTitleIds,
      hasContent: MethodologyDomainService.hasContent
    };
  }

  function syncAppState() {
    var appState = AppStateService.readState();
    c.methodologies = appState.methodologies;
    c.jobTitles = appState.jobTitles;
    c.methodologyId = appState.methodologyId;
    c.loading = appState.loading;
  }
  function syncRg() {
    var state = RaciGridService.readState();
    c.raciMode = state.raciMode;
    c.rgActivePhases = state.rgActivePhases;
    c.rgGridFocusJob = state.rgGridFocusJob;
    c.rgByRoleFocusJob = state.rgByRoleFocusJob;
    c.rg = state.rg;
  }
  function syncAll() {
    syncAppState();
    syncRg();
  }
  syncAll();
  var unsubscribeDmState = $rootScope.$on('dm-state', syncAll);
  $scope.$on('$destroy', unsubscribeDmState);

  // Enter this view with a stale grid (e.g. tasks changed while on another view) - refresh once
  // up front so the grid is never a run behind the current methodology.
  RaciGridService.refresh(rgContext());
  syncRg();

  c.jumpTo = function (subId, methId, elKey) { NavigationService.jumpTo(subId, methId, elKey); };

  c.rgTogglePhase = function (id) { RaciGridService.togglePhase(id, rgContext()); syncRg(); };
  c.rgToggleCol = function (id) { RaciGridService.toggleCol(id, rgContext()); syncRg(); };
  c.rgClearFocus = function () { RaciGridService.clearFocus(rgContext()); syncRg(); };
  c.rgSetMode = function (mode) { RaciGridService.setMode(mode, rgContext()); syncRg(); };
  c.rgSelectByRole = function (id) { RaciGridService.selectByRole(id, rgContext()); syncRg(); };
};