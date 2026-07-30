/* Delivery Methodology "Reference" widget: RACI how-to, escalation guidance, and the cross-
   methodology job aids index. Visible only when AppState.view === 'reference' (see isActiveView). */
angular.module('deliveryMethodology').controller('DmReferenceController', [
  '$rootScope', '$scope', 'AppStateService', 'MethodologyDomainService', 'NavigationService', 'ReferenceService',
  'JargonService', 'TipService', 'IconService', 'UrlPolicyService', 'SearchService',
  function (
    $rootScope, $scope, AppStateService, MethodologyDomainService, NavigationService, ReferenceService,
    JargonService, TipService, IconService, UrlPolicyService, SearchService
  ) {
  'use strict';
  var c = this;

  // Drives this widget's own .view-blur while the Shell's search overlay is open - Shell's
  // .search-active class can't reach a sibling widget's DOM (see CLAUDE.md's multi-widget note).
  c.searchOpen = SearchService.isOpen;
  AppStateService.bindActiveView(c, 'reference');
  TipService.bind(c);
  IconService.bind(c);
  UrlPolicyService.bind(c);

  // Shares the one JargonService flag with the Methodology view's copy of this control - see that
  // controller's note; getterSetter avoids a per-controller mirror going stale.
  c.jargonModel = function (value) {
    if (arguments.length) {
      JargonService.setShowJargon(value);
    }
    return JargonService.getShowJargon();
  };
  c.jargonHtml = function (text) {
    return JargonService.jargonHtml(text, JargonService.getShowJargon());
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
    var referenceState = ReferenceService.readState();
    c.jobAids = referenceState.jobAids;
    c.jobAidGroups = referenceState.jobAidGroups;
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
}]);
