/* Delivery Methodology "Reference" widget: RACI how-to, escalation guidance, glossary CRUD, and
   the cross-methodology job aids index. Visible only when AppState.view === 'reference'
   (see isActiveView). */
angular.module('deliveryMethodology').controller('DmReferenceController', [
  '$rootScope', '$scope', 'AppStateService', 'MethodologyDomainService', 'NavigationService', 'ReferenceService',
  'JargonService', 'TipService', 'IconService', 'UrlPolicyService', 'SearchService', 'RaciGridService',
  'MessagingService', 'ContentEditService', 'StructureEditService',
  function (
    $rootScope, $scope, AppStateService, MethodologyDomainService, NavigationService, ReferenceService,
    JargonService, TipService, IconService, UrlPolicyService, SearchService, RaciGridService,
    MessagingService, ContentEditService, StructureEditService
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
  RaciGridService.bindLegend(c);

  var REFERENCE_MODES = ['guidance', 'glossary', 'jobaids'];

  c.referenceMode = 'guidance';
  c.newJargonTerm = '';
  c.newJargonDefinition = '';
  c.editingJargonTerm = null;
  c.editJargonDefinition = '';

  c.setReferenceMode = function (mode) {
    if (REFERENCE_MODES.indexOf(mode) < 0) {
      return;
    }
    if (c.referenceMode === mode) {
      return;
    }
    c.referenceMode = mode;
    if (mode !== 'glossary') {
      c.cancelEditJargon();
    }
  };

  c.onReferenceTabKeydown = function ($event) {
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
      current = REFERENCE_MODES.indexOf(c.referenceMode);
      if (current < 0) {
        current = 0;
      }
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

  c.jargonHtml = function (text) {
    return JargonService.jargonHtml(text);
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

  function glossaryEntries(jargon) {
    return Object.keys(jargon || {}).sort(function (left, right) {
      return left.toLowerCase().localeCompare(right.toLowerCase());
    }).map(function (term) {
      return {
        term: term,
        definition: jargon[term]
      };
    });
  }

  function syncAppState() {
    var appState = AppStateService.readState();
    c.methodologies = appState.methodologies;
    c.jobTitles = appState.jobTitles;
    c.referenceSections = appState.referenceSections || [];
    c.jargon = appState.jargon || {};
    c.jargonEntries = glossaryEntries(c.jargon);
    c.canEdit = appState.canEdit;
    c.loading = appState.loading;
    c.isSaving = appState.isSaving;
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

  function otherEditOpen() {
    if (ContentEditService.readState().editMode) {
      MessagingService.toast('Finish editing first');
      return true;
    }
    if (StructureEditService.readState().structureEditMode) {
      MessagingService.toast('Finish editing first');
      return true;
    }
    return false;
  }

  function cloneJargon() {
    return angular.extend({}, AppStateService.getJargon() || {});
  }

  function persistJargon(nextJargon, successMessage) {
    if (!AppStateService.getCanEdit()) {
      MessagingService.toast('You do not have permission to edit');
      return;
    }
    if (otherEditOpen()) {
      return;
    }
    if (!AppStateService.tryBeginSave()) {
      return;
    }
    var previousJargon = cloneJargon();
    AppStateService.setJargon(nextJargon);
    AppStateService.persistMethodologies().then(function () {
      MessagingService.toast(successMessage);
      syncAppState();
    }, function () {
      AppStateService.setJargon(previousJargon);
      syncAppState();
    });
  }

  c.startEditJargon = function (entry) {
    if (!c.canEdit || !entry) {
      return;
    }
    c.editingJargonTerm = entry.term;
    c.editJargonDefinition = entry.definition;
    c.newJargonTerm = '';
    c.newJargonDefinition = '';
  };

  c.cancelEditJargon = function () {
    c.editingJargonTerm = null;
    c.editJargonDefinition = '';
  };

  c.saveEditJargon = function () {
    var term = c.editingJargonTerm;
    var definition = String(c.editJargonDefinition || '').replace(/^\s+|\s+$/g, '');
    if (!term) {
      return;
    }
    if (!definition) {
      MessagingService.toast('Definition is required');
      return;
    }
    var nextJargon = cloneJargon();
    nextJargon[term] = definition;
    c.cancelEditJargon();
    persistJargon(nextJargon, 'Glossary term updated');
  };

  c.addJargon = function () {
    var term = String(c.newJargonTerm || '').replace(/^\s+|\s+$/g, '');
    var definition = String(c.newJargonDefinition || '').replace(/^\s+|\s+$/g, '');
    if (!term) {
      MessagingService.toast('Term is required');
      return;
    }
    if (!definition) {
      MessagingService.toast('Definition is required');
      return;
    }
    var nextJargon = cloneJargon();
    if (Object.prototype.hasOwnProperty.call(nextJargon, term)) {
      MessagingService.toast('That term already exists — edit it instead');
      return;
    }
    nextJargon[term] = definition;
    c.newJargonTerm = '';
    c.newJargonDefinition = '';
    persistJargon(nextJargon, 'Glossary term added');
  };

  c.deleteJargon = function (entry) {
    if (!c.canEdit || !entry) {
      return;
    }
    if (otherEditOpen()) {
      return;
    }
    MessagingService.confirm({
      title: 'Remove glossary term?',
      body: 'Remove “' + entry.term + '” from the glossary? Prose will stop highlighting it.',
      ok: 'Remove'
    }).then(function (accepted) {
      if (!accepted) {
        return;
      }
      var nextJargon = cloneJargon();
      delete nextJargon[entry.term];
      if (c.editingJargonTerm === entry.term) {
        c.cancelEditJargon();
      }
      persistJargon(nextJargon, 'Glossary term removed');
    });
  };
}]);
