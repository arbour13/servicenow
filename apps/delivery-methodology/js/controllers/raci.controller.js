/* Delivery Methodology "RACI" widget: grid / by-role views of the active methodology's tasks.
   Visible only when AppState.view === 'raci' (see isActiveView). Owns RaciGridService's mode/
   filter/focus state end to end - StructureEditService.refreshDerived() may recompute the grid's
   groups when structure changes elsewhere (Methodology widget), which is why this controller
   re-syncs c.raciGrid on every 'dm-state' broadcast rather than only after its own actions. */
angular.module('deliveryMethodology').controller('DmRaciController', [
  '$rootScope', '$scope', 'AppStateService', 'MethodologyDomainService', 'NavigationService', 'RaciGridService', 'TipService',
  'IconService',
  function ($rootScope, $scope, AppStateService, MethodologyDomainService, NavigationService, RaciGridService, TipService,
    IconService) {
  'use strict';
  var c = this;

  c.hoverColumnRoleId = null;
  AppStateService.bindActiveView(c, 'raci');
  TipService.bind(c);
  IconService.bind(c);
  RaciGridService.bindLegend(c);

  function currentMethodology() {
    return MethodologyDomainService.currentMethodology(c.methodologies, c.methodologyId);
  }
  c.currentMethodology = currentMethodology;
  c.jobTitleById = function (jobTitleId) {
    return MethodologyDomainService.jobTitleById(c.jobTitles, jobTitleId);
  };
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

  function syncAppState() {
    var appState = AppStateService.readState();
    c.methodologies = appState.methodologies;
    c.jobTitles = appState.jobTitles;
    c.methodologyId = appState.methodologyId;
    c.loading = appState.loading;
  }
  function syncRaciGrid() {
    var state = RaciGridService.readState();
    c.raciMode = state.raciMode;
    c.activePhases = state.activePhases;
    c.gridFocusRoleId = state.gridFocusRoleId;
    c.byRoleFocusRoleId = state.byRoleFocusRoleId;
    c.raciGrid = state.raciGrid;
  }
  function syncAll() {
    syncAppState();
    syncRaciGrid();
  }
  syncAll();
  AppStateService.subscribe($rootScope, $scope, syncAll);

  // Enter this view with a stale grid (e.g. tasks changed while on another view) - refresh once
  // up front so the grid is never a run behind the current methodology.
  RaciGridService.refresh(raciGridContext());
  syncRaciGrid();

  c.jumpTo = function (subPhaseId, methodologyId, elementKey) {
    NavigationService.jumpTo(subPhaseId, methodologyId, elementKey);
  };

  c.toggleRaciPhase = function (phaseId) {
    RaciGridService.togglePhase(phaseId, raciGridContext());
    syncRaciGrid();
  };
  c.toggleRaciColumn = function (roleId) {
    RaciGridService.toggleCol(roleId, raciGridContext());
    syncRaciGrid();
  };
  c.clearRaciFocus = function () {
    RaciGridService.clearFocus(raciGridContext());
    syncRaciGrid();
  };
  c.setRaciMode = function (mode) {
    RaciGridService.setMode(mode, raciGridContext());
    syncRaciGrid();
  };
  c.selectRaciByRole = function (roleId) {
    RaciGridService.selectByRole(roleId, raciGridContext());
    syncRaciGrid();
  };
}]);
