/* Live content sync for Service Portal: spUtil.recordWatch on the content table, then reload
   when the revision changes. Harness has no spUtil - start() is a no-op there.
   While the viewer is editing or saving, remote changes are deferred until they finish. */
angular.module('deliveryMethodology').factory('LiveSyncService', [
  '$injector', '$timeout', '$rootScope', 'DataService', 'AppStateService', 'MessagingService',
  'ContentEditService', 'StructureEditService', 'ReferenceEditService',
  function (
    $injector, $timeout, $rootScope, DataService, AppStateService, MessagingService,
    ContentEditService, StructureEditService, ReferenceEditService
  ) {
  'use strict';

  var DEBOUNCE_MS = 600;
  var started = false;
  var debouncePromise = null;
  var reloadInFlight = false;
  var pendingRemoteChange = false;
  var deferredToastShown = false;
  var unsubscribeState = null;

  function getSpUtil() {
    if ($injector.has('spUtil')) {
      return $injector.get('spUtil');
    }
    return null;
  }

  function isBusyEditing() {
    return ContentEditService.isEditing() || StructureEditService.isEditing()
      || ReferenceEditService.isEditing();
  }

  function scheduleReload() {
    if (debouncePromise) {
      $timeout.cancel(debouncePromise);
    }
    debouncePromise = $timeout(function () {
      debouncePromise = null;
      tryReload();
    }, DEBOUNCE_MS);
  }

  function tryReload() {
    if (reloadInFlight || AppStateService.getLoading()) {
      pendingRemoteChange = true;
      return;
    }

    if (AppStateService.getIsSaving()) {
      pendingRemoteChange = true;
      return;
    }

    if (isBusyEditing()) {
      pendingRemoteChange = true;
      if (!deferredToastShown) {
        deferredToastShown = true;
        MessagingService.toast('Content updated elsewhere - sync when you finish editing');
      }
      return;
    }

    pendingRemoteChange = false;
    deferredToastShown = false;
    reloadInFlight = true;

    var previousRevision = DataService.getContentRevision();

    DataService.getData().then(function (payload) {
      reloadInFlight = false;

      var nextRevision = payload && payload.contentRevision != null
        ? String(payload.contentRevision)
        : '';

      if (previousRevision && nextRevision && previousRevision === nextRevision) {
        return;
      }

      AppStateService.applySyncedData(payload, {
        canEdit: AppStateService.getCanEdit(),
        canAdmin: AppStateService.getCanAdmin(),
        onAfterLoad: hooksOnAfterLoad
      });
      MessagingService.toast('Content updated');
    }, function () {
      reloadInFlight = false;
      pendingRemoteChange = true;
    });
  }

  // Shell binds the same handleContentLoaded used for bootstrap/seed; kept here so live sync
  // reuses derived-cache refresh without pushing a new history entry.
  var hooksOnAfterLoad = null;

  function bind(hostHooks) {
    var hooks = hostHooks || {};
    hooksOnAfterLoad = hooks.onAfterLoad || null;
  }

  function flushIfIdle() {
    if (!pendingRemoteChange) {
      return;
    }
    if (AppStateService.getIsSaving() || isBusyEditing() || AppStateService.getLoading()) {
      return;
    }
    scheduleReload();
  }

  function start($scope, contentTable) {
    if (started || !$scope || !contentTable) {
      return;
    }

    var spUtil = getSpUtil();
    if (!spUtil || typeof spUtil.recordWatch !== 'function') {
      return;
    }

    started = true;

    spUtil.recordWatch($scope, contentTable, 'sys_idISNOTEMPTY', function () {
      pendingRemoteChange = true;
      scheduleReload();
    });

    unsubscribeState = $rootScope.$on('dm-state', flushIfIdle);
    $scope.$on('$destroy', function () {
      if (unsubscribeState) {
        unsubscribeState();
        unsubscribeState = null;
      }
      if (debouncePromise) {
        $timeout.cancel(debouncePromise);
        debouncePromise = null;
      }
      started = false;
    });
  }

  return {
    bind: bind,
    start: start
  };
}]);
