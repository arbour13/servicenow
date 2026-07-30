/* Delivery Methodology "RACI" widget: grid / by-role views of the active methodology's tasks.
   Visible only when AppState.view === 'raci' (see isActiveView). Owns RaciGridService's mode/
   filter/focus state end to end - StructureEditService.refreshDerived() may recompute the grid's
   groups when structure changes elsewhere (Methodology widget), which is why this controller
   re-syncs c.raciGrid on every 'dm-state' broadcast rather than only after its own actions. */
angular.module('deliveryMethodology').controller('DmRaciController', [
  '$rootScope', '$scope', 'AppStateService', 'MethodologyDomainService', 'NavigationService', 'RaciGridService', 'TipService',
  'IconService', 'SearchService',
  function ($rootScope, $scope, AppStateService, MethodologyDomainService, NavigationService, RaciGridService, TipService,
    IconService, SearchService) {
  'use strict';
  var c = this;

  c.hoverColumnRoleId = null;
  // Drives this widget's own .view-blur while the Shell's search overlay is open - Shell's
  // .search-active class can't reach a sibling widget's DOM (see CLAUDE.md's multi-widget note).
  c.searchOpen = SearchService.isOpen;
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
    c.showAllRoles = state.showAllRoles;
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
    RaciGridService.toggleColumn(roleId, raciGridContext());
    syncRaciGrid();
  };
  c.clearRaciFocus = function () {
    RaciGridService.clearFocus(raciGridContext());
    syncRaciGrid();
  };
  c.toggleShowAllRoles = function () {
    RaciGridService.toggleShowAllRoles(raciGridContext());
    syncRaciGrid();
  };
  c.setRaciMode = function (mode) {
    RaciGridService.setMode(mode, raciGridContext());
    syncRaciGrid();
  };
  c.onRaciTabKeydown = function ($event) {
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
      current = c.raciMode === 'byrole' ? 1 : 0;
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
  c.selectRaciByRole = function (roleId) {
    RaciGridService.selectByRole(roleId, raciGridContext());
    syncRaciGrid();
  };
}]);
