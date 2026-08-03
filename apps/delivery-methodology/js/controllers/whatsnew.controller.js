/* Delivery Methodology "What's New" widget: unread changelog entries across every methodology.
   Visible only when AppState.view === 'whatsnew' (see isActiveView). */
angular.module('deliveryMethodology').controller('DmWhatsNewController', [
  '$rootScope', '$scope', 'AppStateService', 'NavigationService', 'WhatsNewService', 'SearchService',
  function ($rootScope, $scope, AppStateService, NavigationService, WhatsNewService, SearchService) {
  'use strict';
  var c = this;

  // Drives this widget's own .view-blur while the Shell's search overlay is open - Shell's
  // .search-active class can't reach a sibling widget's DOM (see CLAUDE.md's multi-widget note).
  c.searchOpen = SearchService.isOpen;
  AppStateService.bindActiveView(c, 'whatsnew');
  WhatsNewService.bindFormatters(c);

  c.jumpTo = function (subPhaseId, methodologyId) {
    NavigationService.jumpTo(subPhaseId, methodologyId);
  };

  function syncAppState() {
    var appState = AppStateService.readState();
    c.methodologies = appState.methodologies;
    c.loading = appState.loading;
  }
  function syncWhatsNew() {
    var whatsNewState = WhatsNewService.readState();
    c.whatsNew = whatsNewState.whatsNew;
  }
  function syncAll() {
    syncAppState();
    syncWhatsNew();
  }
  syncAll();
  AppStateService.subscribe($rootScope, $scope, syncAll);

  // Enter this view with a stale list (e.g. entries changed while on another view) - refresh once
  // up front so the list is never a run behind the current content.
  WhatsNewService.refresh(c.methodologies);
  syncWhatsNew();
}]);
