api.controller = function ($rootScope, $scope, AppStateService, MethodologyDomainService, NavigationService, ReferenceService, JargonService, TipService, IconService, UrlPolicyService, SearchService, RaciGridService, MessagingService, ContentEditService, StructureEditService, ReferenceEditService, AnalyticsService) {
  'use strict';
  var c = this;

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

  /* Presentation-only parsing of the standard sections' own text conventions - the body stays one
     plain-text field (schema, editor, and search untouched), same pattern as the hardcoded 'raci'
     definition cards. 'challenges' paragraphs read "Title - explanation" and become one card each;
     the lifecycle sections' "Daily:/Weekly:/Throughout:" duties group into one card per cadence.
     Paragraphs that don't match stay prose, before (lead) or after (trail) the cards, so a
     rewritten body degrades to the plain-prose rendering rather than breaking.

     Memoized per section key + body: these return fresh objects, and ng-repeat over a fresh
     object graph re-triggers every digest (see the suite's infinite-digest note). */
  var sectionLayoutCache = {};

  var CHALLENGE_TITLE_MAX = 100;
  var CADENCE_LABEL_PATTERN = /^([A-Z][A-Za-z ]{2,20}):\s+/;

  // First and last paragraphs are ALWAYS prose (the section's intro/outro convention) - both
  // happen to contain mid-sentence " - " separators, so position, not punctuation, is what
  // reliably separates them from the "Title - explanation" card paragraphs between them. A title
  // that contains a full sentence is prose too, wherever it sits.
  function parseChallengeCards(paragraphs) {
    var lead = [], cards = [], trail = [];
    paragraphs.forEach(function (paragraph, index) {
      var isEdge = index === 0 || (index === paragraphs.length - 1 && paragraphs.length > 1);
      var splitAt = paragraph.indexOf(' - ');
      var title = paragraph.slice(0, splitAt).trim();
      var looksLikeCard = splitAt > 0 && splitAt <= CHALLENGE_TITLE_MAX && title.indexOf('. ') < 0;
      if (!isEdge && looksLikeCard) {
        cards.push({
          title: title,
          body: paragraph.slice(splitAt + 3).trim()
        });
      } else if (!cards.length) {
        lead.push(paragraph);
      } else {
        trail.push(paragraph);
      }
    });
    return {
      kind: 'cards',
      lead: lead,
      cards: cards,
      trail: trail
    };
  }

  // "Role Lifecycles": ONE section holding every role's standing duties. Grammar per block:
  // a short "Role: <name>" paragraph starts the block; paragraphs after it that carry no cadence
  // prefix are that role's description; "Daily:/Weekly:/..." lines group into its cadence cards.
  // Paragraphs before the first Role: line are the section lead. Adding a role is typing a new
  // Role: block into the body - no new section, key, or code.
  var ROLE_BLOCK_PATTERN = /^Role:\s+(.{1,60})$/;

  function parseRoleLifecycles(paragraphs) {
    var lead = [];
    var roles = [];
    var current = null;
    paragraphs.forEach(function (paragraph) {
      var roleMatch = paragraph.match(ROLE_BLOCK_PATTERN);
      if (roleMatch) {
        current = {
          title: roleMatch[1].trim(),
          description: [],
          groups: [],
          groupsByLabel: {}
        };
        roles.push(current);
        return;
      }
      if (!current) {
        lead.push(paragraph);
        return;
      }
      var cadenceMatch = paragraph.match(CADENCE_LABEL_PATTERN);
      if (cadenceMatch && cadenceMatch[1] !== 'Role') {
        var label = cadenceMatch[1];
        if (!current.groupsByLabel[label]) {
          current.groupsByLabel[label] = {
            label: label,
            items: []
          };
          current.groups.push(current.groupsByLabel[label]);
        }
        current.groupsByLabel[label].items.push(paragraph.slice(cadenceMatch[0].length).trim());
        return;
      }
      current.description.push(paragraph);
    });
    return {
      kind: 'roles',
      lead: lead,
      roles: roles
    };
  }

  function parseCadenceGroups(paragraphs) {
    var lead = [], groups = [], trail = [];
    var groupsByLabel = {};
    paragraphs.forEach(function (paragraph) {
      var match = paragraph.match(CADENCE_LABEL_PATTERN);
      if (match) {
        var label = match[1];
        if (!groupsByLabel[label]) {
          groupsByLabel[label] = {
            label: label,
            items: []
          };
          groups.push(groupsByLabel[label]);
        }
        groupsByLabel[label].items.push(paragraph.slice(match[0].length).trim());
      } else if (!groups.length) {
        lead.push(paragraph);
      } else {
        trail.push(paragraph);
      }
    });
    return {
      kind: 'cadence',
      lead: lead,
      groups: groups,
      trail: trail
    };
  }

  c.sectionLayout = function (section) {
    var key = section && section.key;
    var body = section && section.body != null ? String(section.body) : '';
    var cached = sectionLayoutCache[key];
    if (cached && cached.body === body) {
      return cached.layout;
    }

    var paragraphs = c.sectionParagraphs(section);
    var layout = {
      kind: 'prose'
    };
    if (key === 'challenges') {
      layout = parseChallengeCards(paragraphs);
      if (!layout.cards.length) {
        layout = {
          kind: 'prose'
        };
      }
    } else if (key === 'role-lifecycles') {
      layout = parseRoleLifecycles(paragraphs);
      if (!layout.roles.length) {
        layout = {
          kind: 'prose'
        };
      }
    } else if (key === 'consultant-lifecycle' || key === 'em-lifecycle') {
      // Superseded by the combined 'role-lifecycles' section (seed v26) - kept so an instance
      // still carrying the old per-role rows renders them as cards rather than prose.
      layout = parseCadenceGroups(paragraphs);
      if (!layout.groups.length) {
        layout = {
          kind: 'prose'
        };
      }
    }

    sectionLayoutCache[key] = {
      body: body,
      layout: layout
    };
    return layout;
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

  function buildNavItems(sections) {
    var items = [];
    var list = sections || [];
    var insertedGlossary = false;
    var insertedJobAids = false;

    list.forEach(function (section) {
      if (!section || !section.key) {
        return;
      }
      items.push({
        id: 'section:' + section.key,
        label: section.title || section.name || section.key,
        kind: 'section',
        key: section.key
      });
      if (section.key === 'raci') {
        items.push({
          id: 'glossary',
          label: 'Glossary',
          kind: 'panel'
        });
        insertedGlossary = true;
      }
      if (section.key === 'challenges') {
        items.push({
          id: 'job-aids',
          label: 'Assets & Job Aids',
          kind: 'panel'
        });
        insertedJobAids = true;
      }
    });

    if (!insertedGlossary) {
      items.push({
        id: 'glossary',
        label: 'Glossary',
        kind: 'panel'
      });
    }
    if (!insertedJobAids) {
      items.push({
        id: 'job-aids',
        label: 'Assets & Job Aids',
        kind: 'panel'
      });
    }

    return items;
  }

  function firstSectionPanelId(sections) {
    var first = (sections || []).find(function (section) {
      return section && section.key;
    });
    if (first) {
      return 'section:' + first.key;
    }
    return null;
  }

  function firstBrowsePanelId(navItems) {
    var found = (navItems || []).find(function (item) {
      return item.kind === 'section' || item.kind === 'panel';
    });
    if (found) {
      return found.id;
    }
    return 'glossary';
  }

  function sectionByKey(key) {
    var sections = ReferenceEditService.sectionsSource();
    return (sections || []).find(function (section) {
      return section.key === key;
    });
  }

  function syncActiveSection() {
    c.activeSection = null;
    if (c.referencePanelId.indexOf('section:') === 0) {
      c.activeSection = sectionByKey(c.referencePanelId.slice(8));
    }
  }

  function syncNav() {
    var sections = ReferenceEditService.sectionsSource();
    c.navItems = buildNavItems(sections);

    if (c.referenceEditMode) {
      if (!c.activeSection || !sectionByKey(c.activeSection.key)) {
        var editPanelId = firstSectionPanelId(sections);
        if (editPanelId) {
          c.referencePanelId = editPanelId;
        }
      } else {
        c.referencePanelId = 'section:' + c.activeSection.key;
      }
    } else if (!c.navItems.some(function (item) {
      return item.id === c.referencePanelId;
    })) {
      c.referencePanelId = firstBrowsePanelId(c.navItems);
    }

    syncActiveSection();
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
      MessagingService.toast('Finish appendix edit first');
      return true;
    }
    return otherEditOpen();
  }

  c.selectReferencePanel = function (item) {
    if (!item || c.referenceEditMode) {
      return;
    }
    if (c.referencePanelId === item.id) {
      return;
    }
    c.referencePanelId = item.id;
    c.cancelEditJargon();
    syncActiveSection();
    AnalyticsService.trackReference(item.id);
  };

  c.selectEditSection = function (section) {
    if (!section || !section.key) {
      return;
    }
    c.referencePanelId = 'section:' + section.key;
    syncActiveSection();
  };

  c.onReferenceNavKeydown = function ($event) {
    if (c.referenceEditMode) {
      return;
    }
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

  c.cancelReferenceEdit = function () {
    ReferenceEditService.cancelReferenceEdit();
    syncAll();
  };
  c.saveReferenceEdit = function () {
    ReferenceEditService.saveReferenceEdit();
    syncAll();
  };
  c.addReferenceSection = function () {
    var section = ReferenceEditService.addSection();
    if (section) {
      c.referencePanelId = 'section:' + section.key;
    }
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
  c.reorderReferenceSection = function (fromIndex, toIndex) {
    ReferenceEditService.reorderSection(fromIndex, toIndex);
    syncAll();
  };
  c.deleteReferenceSectionByKey = function (sectionKey) {
    var section = sectionByKey(sectionKey);
    if (!section) {
      return;
    }
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
      MessagingService.toast('That term already exists - edit it instead');
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
};