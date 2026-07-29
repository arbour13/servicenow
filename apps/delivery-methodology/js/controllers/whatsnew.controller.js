/* Delivery Methodology "What's New" widget: unread changelog entries across every methodology.
   Visible only when AppState.view === 'whatsnew' (see isActiveView). */
angular.module('deliveryMethodology').controller('DmWhatsNewController', [
  '$rootScope', '$scope', 'AppStateService', 'NavigationService', 'WhatsNewService',
  function ($rootScope, $scope, AppStateService, NavigationService, WhatsNewService) {
  'use strict';
  var c = this;

  c.isActiveView = function () {
    return !AppStateService.getLoading() && AppStateService.getView() === 'whatsnew';
  };

  c.jumpTo = function (subId, methId) { NavigationService.jumpTo(subId, methId); };
  c.fmtDate = function (d) { return WhatsNewService.fmtDate(d); };
  c.daysAgo = function (dateStr) { return WhatsNewService.daysAgo(dateStr); };

  function syncAppState() {
    var appState = AppStateService.readState();
    c.methodologies = appState.methodologies;
    c.loading = appState.loading;
  }
  function syncWhatsNew() {
    c.whatsNew = WhatsNewService.readState().whatsNew;
  }
  function syncAll() {
    syncAppState();
    syncWhatsNew();
  }
  syncAll();
  var unsubscribeDmState = $rootScope.$on('dm-state', syncAll);
  $scope.$on('$destroy', unsubscribeDmState);

  // Enter this view with a stale list (e.g. entries changed while on another view) - refresh once
  // up front so the list is never a run behind the current content.
  WhatsNewService.refresh(c.methodologies);
  syncWhatsNew();
}]);
