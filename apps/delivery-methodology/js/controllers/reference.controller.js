/* Delivery Methodology "Reference" widget: appendix left nav, prose sections, glossary CRUD,
   and the cross-methodology job aids index. Visible only when AppState.view === 'reference'. */
angular.module('deliveryMethodology').controller('DmReferenceController', [
  '$rootScope', '$scope', 'AppStateService', 'MethodologyDomainService', 'NavigationService', 'ReferenceService',
  'JargonService', 'TipService', 'IconService', 'UrlPolicyService', 'SearchService', 'RaciGridService',
  'MessagingService', 'ContentEditService', 'StructureEditService', 'ReferenceEditService',
  function (
    $rootScope, $scope, AppStateService, MethodologyDomainService, NavigationService, ReferenceService,
    JargonService, TipService, IconService, UrlPolicyService, SearchService, RaciGridService,
    MessagingService, ContentEditService, StructureEditService, ReferenceEditService
  ) {
  'use strict';
  var c = this;

  var SECTION_NAV_ORDER = [
    'raci',
    'challenges',
    'consultant-lifecycle',
    'em-lifecycle',
    'escalation'
  ];

  c.searchOpen = SearchService.isOpen;
  AppStateService.bindActiveView(c, 'reference');
  TipService.bind(c);
  IconService.bind(c);
  UrlPolicyService.bind(c);
  RaciGridService.bindLegend(c);

  c.referencePanelId = 'section:raci';
  c.newJargonTerm = '';
  c.newJargonDefinition = '';
  c.editingJargonTerm = null;
  c.editJargonDefinition = '';

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
  function raciGridContext() {
    return {
      methodology: MethodologyDomainService.currentMethodology(c.methodologies, c.methodologyId),
      sortJobTitleIds: sortJobTitleIds,
      hasContent: MethodologyDomainService.hasContent
    };
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

  function buildNavItems(sections) {
    var byKey = {};
    var items = [];
    var index = 0;

    (sections || []).forEach(function (section) {
      if (section && section.key) {
        byKey[section.key] = section;
      }
    });

    items.push({
      id: 'tasks-by-role',
      label: 'Tasks by Role',
      kind: 'jump'
    });

    SECTION_NAV_ORDER.forEach(function (key) {
      if (byKey[key]) {
        items.push({
          id: 'section:' + key,
          label: byKey[key].title || byKey[key].name || key,
          kind: 'section',
          key: key
        });
        delete byKey[key];
      }
      if (key === 'raci') {
        items.push({
          id: 'glossary',
          label: 'Glossary',
          kind: 'panel'
        });
      }
      if (key === 'challenges') {
        items.push({
          id: 'job-aids',
          label: 'Assets & Job Aids',
          kind: 'panel'
        });
      }
    });

    Object.keys(byKey).sort().forEach(function (key) {
      items.push({
        id: 'section:' + key,
        label: byKey[key].title || byKey[key].name || key,
        kind: 'section',
        key: key
      });
    });

    return items;
  }

  function sectionByKey(key) {
    var sections = ReferenceEditService.sectionsSource();
    return (sections || []).find(function (section) {
      return section.key === key;
    });
  }

  function syncNav() {
    c.navItems = buildNavItems(ReferenceEditService.sectionsSource());
    if (!c.navItems.some(function (item) {
      return item.id === c.referencePanelId;
    })) {
      if (c.navItems.length) {
        c.referencePanelId = c.navItems[0].id;
      }
    }
    c.activeSection = null;
    if (c.referencePanelId.indexOf('section:') === 0) {
      c.activeSection = sectionByKey(c.referencePanelId.slice(8));
    }
  }

  function syncAppState() {
    var appState = AppStateService.readState();
    c.methodologies = appState.methodologies;
    c.jobTitles = appState.jobTitles;
    c.methodologyId = appState.methodologyId;
    c.referenceSections = ReferenceEditService.sectionsSource();
    c.jargon = appState.jargon || {};
    c.jargonEntries = glossaryEntries(c.jargon);
    c.canEdit = appState.canEdit;
    c.loading = appState.loading;
    c.isSaving = appState.isSaving;
    var referenceEditState = ReferenceEditService.readState();
    c.referenceEditMode = referenceEditState.referenceEditMode;
    syncNav();
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

  function blockIfBusy() {
    if (ReferenceEditService.isEditing()) {
      MessagingService.toast('Finish reference edit first');
      return true;
    }
    return otherEditOpen();
  }

  c.selectReferencePanel = function (item) {
    if (!item) {
      return;
    }
    if (item.kind === 'jump') {
      c.openTasksByRole();
      return;
    }
    if (c.referencePanelId === item.id) {
      return;
    }
    c.referencePanelId = item.id;
    c.cancelEditJargon();
    syncNav();
  };

  c.openTasksByRole = function () {
    if (blockIfBusy()) {
      return;
    }
    NavigationService.setView('raci');
    RaciGridService.setMode('byrole', raciGridContext());
    AppStateService.notify();
  };

  c.onReferenceNavKeydown = function ($event) {
    var key = $event.key;
    if (key !== 'ArrowUp' && key !== 'ArrowDown' && key !== 'Home' && key !== 'End') {
      return;
    }
    var links = Array.prototype.slice.call($event.currentTarget.querySelectorAll('.ref-nav-item'));
    if (!links.length) {
      return;
    }
    var current = links.indexOf(document.activeElement);
    if (current < 0) {
      current = c.navItems.findIndex(function (item) {
        return item.id === c.referencePanelId;
      });
      if (current < 0) {
        current = 0;
      }
    }
    var next = current;
    if (key === 'ArrowUp') {
      next = (current - 1 + links.length) % links.length;
    } else if (key === 'ArrowDown') {
      next = (current + 1) % links.length;
    } else if (key === 'Home') {
      next = 0;
    } else {
      next = links.length - 1;
    }
    $event.preventDefault();
    links[next].focus();
    links[next].click();
  };

  c.enterReferenceEdit = function () {
    ReferenceEditService.enterReferenceEdit();
    syncAll();
  };
  c.cancelReferenceEdit = function () {
    ReferenceEditService.cancelReferenceEdit();
    syncAll();
  };
  c.saveReferenceEdit = function () {
    ReferenceEditService.saveReferenceEdit();
    syncAll();
  };
  c.addReferenceSection = function () {
    ReferenceEditService.addSection();
    syncAll();
  };
  c.moveReferenceSection = function (sectionKey, direction) {
    var sections = ReferenceEditService.sectionsSource();
    var index = sections.findIndex(function (section) {
      return section.key === sectionKey;
    });
    if (index < 0) {
      return;
    }
    ReferenceEditService.moveSection(index, direction);
    syncAll();
  };
  c.deleteReferenceSection = function (section) {
    ReferenceEditService.deleteSection(section);
    syncAll();
  };
  c.renameReferenceSection = function (section) {
    ReferenceEditService.renameSection(section);
  };

  function cloneJargon() {
    return angular.extend({}, AppStateService.getJargon() || {});
  }

  function persistJargon(nextJargon, successMessage) {
    if (!AppStateService.getCanEdit()) {
      MessagingService.toast('You do not have permission to edit');
      return;
    }
    if (blockIfBusy()) {
      return;
    }
    if (!AppStateService.tryBeginSave()) {
      return;
    }
    var previousJargon = cloneJargon();
    AppStateService.setJargon(nextJargon);
    AppStateService.persistMethodologies().then(function () {
      MessagingService.toast(successMessage);
      syncAll();
    }, function () {
      AppStateService.setJargon(previousJargon);
      syncAll();
    });
  }

  c.startEditJargon = function (entry) {
    if (!c.canEdit || !entry || c.referenceEditMode) {
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
    if (!c.canEdit || !entry || c.referenceEditMode) {
      return;
    }
    if (blockIfBusy()) {
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
