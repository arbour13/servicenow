/* Delivery Methodology "RACI" widget: grid / by-role views of the active methodology's tasks.
   Visible only when AppState.view === 'raci' (see isActiveView). Owns RaciGridService's mode/
   filter/focus state end to end - StructureEditService.refreshDerived() may recompute the grid's
   groups when structure changes elsewhere (Methodology widget), which is why this controller
   re-syncs c.raciGrid on every 'dm-state' broadcast rather than only after its own actions. */
angular.module('deliveryMethodology').controller('DmRaciController', [
  '$rootScope', '$scope', '$timeout', 'AppStateService', 'MethodologyDomainService', 'NavigationService', 'RaciGridService', 'TipService',
  'IconService', 'SearchService',
  function ($rootScope, $scope, $timeout, AppStateService, MethodologyDomainService, NavigationService, RaciGridService, TipService,
    IconService, SearchService) {
  'use strict';
  var c = this;
  var wasRaciView = false;

  c.hoverColumnRoleId = null;
  // Drives this widget's own .view-blur while the Shell's search overlay is open - Shell's
  // .search-active class can't reach a sibling widget's DOM (see CLAUDE.md's multi-widget note).
  c.searchOpen = SearchService.isOpen;
  AppStateService.bindActiveView(c, 'raci');
  TipService.bind(c);
  IconService.bind(c);
  RaciGridService.bindLegend(c);

  function currentMethodology() {
    return MethodologyDomainService.currentMethodology(
      AppStateService.getMethodologies(),
      AppStateService.getMethodologyId()
    );
  }
  c.currentMethodology = function () {
    return MethodologyDomainService.currentMethodology(c.methodologies, c.methodologyId);
  };
  c.jobTitleById = function (jobTitleId) {
    return MethodologyDomainService.jobTitleById(c.jobTitles, jobTitleId);
  };
  function raciGridContext() {
    return {
      methodology: currentMethodology(),
      sortJobTitleIds: function (jobTitleIds) {
        return MethodologyDomainService.sortJobTitleIds(AppStateService.getJobTitles(), jobTitleIds);
      },
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
    // Copy so chip bindings cannot mutate the service map by reference.
    c.activePhases = state.activePhases ? Object.assign({}, state.activePhases) : null;
    c.gridFocusRoleId = state.gridFocusRoleId;
    c.byRoleFocusRoleId = state.byRoleFocusRoleId;
    c.showAllRoles = state.showAllRoles;
    c.raciGrid = state.raciGrid;
  }
  function refreshAndSync() {
    RaciGridService.refresh(raciGridContext());
    syncRaciGrid();
  }
  // Rebuild after the panel is actually shown. Building the table while the view is display:none
  // (or mid View Transition into RACI) left ng-repeat with a partial tbody set - only a couple of
  // sub-phase groups - until a later in-view refresh (e.g. toggling a phase chip) forced a full
  // re-link. $timeout(0) runs after the current digest / transition update callback.
  function refreshWhenVisible() {
    $timeout(function () {
      if (AppStateService.getView() !== 'raci') {
        return;
      }
      refreshAndSync();
    }, 0);
  }
  function syncAll() {
    syncAppState();
    syncRaciGrid();
    var isRaciView = AppStateService.getView() === 'raci';
    if (isRaciView && !wasRaciView) {
      refreshWhenVisible();
    }
    wasRaciView = isRaciView;
  }

  syncAppState();
  refreshAndSync();
  wasRaciView = AppStateService.getView() === 'raci';
  if (wasRaciView) {
    refreshWhenVisible();
  }
  AppStateService.subscribe($rootScope, $scope, syncAll);

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
