[
  'DataService', 'IdSeqService', 'NavigationService', 'RaciGridService', 'MessagingService',
  'WhatsNewService', 'ReferenceService', 'AppStateService', 'MethodologyDomainService', '$rootScope',
  function (
    DataService, IdSeqService, NavigationService, RaciGridService, MessagingService,
    WhatsNewService, ReferenceService, AppStateService, MethodologyDomainService, $rootScope
  ) {
  'use strict';

  function notify() {
    $rootScope.$broadcast('dm-state');
  }

  var hooks = {};
  var state = {
    structureEditUiEnabled: true,
    structureEditMode: false,
    structureSnapshot: null,
    structureNavSnapshot: null
  };

  function bind(hostHooks) {
    if (hostHooks) {
      hooks = hostHooks;
    } else {
      hooks = {};
    }
  }

  function currentMethodology() {
    return MethodologyDomainService.currentMethodology(
      AppStateService.getMethodologies(),
      AppStateService.getMethodologyId()
    );
  }

  function jobTitleById(jobTitleId) {
    return MethodologyDomainService.jobTitleById(AppStateService.getJobTitles(), jobTitleId);
  }

  function sortJobTitleIds(jobTitleIds) {
    return MethodologyDomainService.sortJobTitleIds(AppStateService.getJobTitles(), jobTitleIds);
  }

  // Peer refreshes + one host sync for template mirrors (whatsNew / jobAids / rg).
  function refreshDerived() {
    var methodologies = AppStateService.getMethodologies();
    WhatsNewService.refresh(methodologies);
    ReferenceService.refresh(methodologies, sortJobTitleIds, jobTitleById);
    if (AppStateService.getView() === 'raci') {
      RaciGridService.refresh({
        methodology: currentMethodology(),
        sortJobTitleIds: sortJobTitleIds,
        hasContent: MethodologyDomainService.hasContent
      });
    }
    if (hooks.syncDerived) {
      hooks.syncDerived();
    }
  }

  function markReadCurrent() {
    var location = AppStateService.getLocation();
    if (!location || !location.subPhase) {
      return;
    }
    var entries = WhatsNewService.markRead(location.subPhase, AppStateService.getMethodologies());
    AppStateService.setJustRead(entries);
  }

  function isEditing() {
    return state.structureEditMode;
  }

  function readState() {
    return {
      structureEditUiEnabled: state.structureEditUiEnabled,
      structureEditMode: state.structureEditMode,
      structureSnapshot: state.structureSnapshot,
      structureNavSnapshot: state.structureNavSnapshot
    };
  }

  function enterStructureEdit() {
    state.structureSnapshot = IdSeqService.deepClone(AppStateService.getMethodologies());
    state.structureNavSnapshot = {
      methodologyId: AppStateService.getMethodologyId(),
      subPhaseId: AppStateService.getSubPhaseId(),
      methodologySubPhaseById: NavigationService.getResumeMap(),
      activePhases: RaciGridService.getActivePhases(),
      navHistory: NavigationService.getHistory()
    };
    state.structureEditMode = true;
    MessagingService.scrollToEditBar();
    notify();
  }

  function exitStructureEdit() {
    state.structureSnapshot = null;
    state.structureNavSnapshot = null;
    state.structureEditMode = false;
    notify();
  }

  function toggleStructureEdit() {
    if (!hooks.canEdit()) {
      MessagingService.toast('You do not have permission to edit');
      return;
    }
    if (hooks.isContentEditing && hooks.isContentEditing()) {
      MessagingService.toast('Finish editing first');
      return;
    }
    if (state.structureEditMode) {
      cancelStructureEdit();
      return;
    }
    enterStructureEdit();
  }

  function cancelStructureEdit() {
    if (state.structureSnapshot) {
      AppStateService.setMethodologies(IdSeqService.deepClone(state.structureSnapshot));
      if (state.structureNavSnapshot) {
        AppStateService.setMethodologyId(state.structureNavSnapshot.methodologyId);
        AppStateService.setSubPhaseId(state.structureNavSnapshot.subPhaseId);
        NavigationService.setResumeMap(state.structureNavSnapshot.methodologySubPhaseById);
        NavigationService.setHistory(state.structureNavSnapshot.navHistory);
        RaciGridService.setActivePhases(state.structureNavSnapshot.activePhases);
      }
    }
    exitStructureEdit();
    AppStateService.refreshLocation();
    refreshDerived();
    MessagingService.toast('Structure edit cancelled - changes reverted');
    MessagingService.scrollPageToTop();
    notify();
  }

  // Fill blank names for persist; keep previous values so a failed save can restore them
  // (draft stays open — same honesty model as ContentEditService.saveEdit).
  function coerceBlankNames(methodologies) {
    var coerced = [];

    function coerce(target) {
      if (!target) {
        return;
      }
      var previous = target.name;
      if (!String(previous || '').trim()) {
        coerced.push({
          target: target,
          previous: previous
        });
        target.name = 'Untitled';
      }
    }

    (methodologies || []).forEach(function (methodology) {
      coerce(methodology);
      (methodology.phases || []).forEach(function (phase) {
        coerce(phase);
        (phase.subPhases || []).forEach(coerce);
      });
    });
    return coerced;
  }

  function restoreCoercedNames(coerced) {
    (coerced || []).forEach(function (item) {
      if (item && item.target) {
        item.target.name = item.previous;
      }
    });
  }

  function saveStructureEdit() {
    if (!AppStateService.tryBeginSave()) {
      return;
    }
    var methodologies = AppStateService.getMethodologies();
    var coercedNames = coerceBlankNames(methodologies);
    AppStateService.persistMethodologies().then(function () {
      exitStructureEdit();
      AppStateService.refreshLocation();
      refreshDerived();
      NavigationService.push();
      if (hooks.afterSaveSuccess) {
        hooks.afterSaveSuccess();
      }
      MessagingService.toast('Structure saved');
      MessagingService.scrollPageToTop();
      notify();
    }, function () {
      restoreCoercedNames(coercedNames);
      if (hooks.afterSaveFailure) {
        hooks.afterSaveFailure();
      }
      notify();
    });
  }

  function renameMethodology(methodology) {
    if (!methodology || !String(methodology.name || '').trim()) {
      methodology.name = 'Untitled';
    }
    notify();
  }

  // Default placeholder from addMethodology - must be renamed before another can be added,
  // otherwise the header tabs stack identical "New Methodology" labels while the form only
  // ever edits the current one.
  function methodologyNeedsSetup(methodology) {
    if (!methodology) {
      return false;
    }
    var name = String(methodology.name || '').trim();
    if (!name) {
      return true;
    }
    return name.toLowerCase() === 'new methodology';
  }

  function addMethodology() {
    if (!hooks.canEdit()) {
      MessagingService.toast('You do not have permission to edit');
      return;
    }
    if (hooks.isContentEditing && hooks.isContentEditing()) {
      MessagingService.toast('Finish editing first');
      return;
    }
    if (!state.structureEditMode) {
      enterStructureEdit();
    }
    var unsettled = AppStateService.getMethodologies().find(methodologyNeedsSetup);
    if (unsettled) {
      AppStateService.setMethodologyId(unsettled.id);
      AppStateService.setSubPhaseId(null);
      AppStateService.refreshLocation();
      notify();
      MessagingService.toast('Name this methodology before adding another');
      return;
    }
    var methodologyId = IdSeqService.next('methodology');
    var methodology = {
      id: methodologyId,
      name: 'New Methodology',
      order: AppStateService.getMethodologies().length + 1,
      summary: '',
      description: '',
      feedbackUrl: '',
      feedbackLabel: 'Provide Feedback',
      diagramUrl: '',
      phases: []
    };
    AppStateService.getMethodologies().push(methodology);
    IdSeqService.recomputeSids(methodology);
    AppStateService.setMethodologyId(methodologyId);
    AppStateService.setSubPhaseId(null);
    RaciGridService.ensureActivePhases(methodology);
    AppStateService.refreshLocation();
    markReadCurrent();
    refreshDerived();
    NavigationService.push();
    notify();
  }

  function deleteMethodology(methodology) {
    if (!hooks.canEdit()) {
      MessagingService.toast('You do not have permission to edit');
      return;
    }
    if (hooks.isContentEditing && hooks.isContentEditing()) {
      MessagingService.toast('Finish editing first');
      return;
    }
    if (!methodology) {
      return;
    }
    MessagingService.confirm({
      title: 'Remove methodology?',
      body: 'Remove “' + methodology.name + '” and all of its phases from this draft? Cancel structure edit to undo.',
      cancel: 'Keep',
      ok: 'Remove'
    }).then(function (accepted) {
      if (!accepted) {
        return;
      }
      var methodologies = AppStateService.getMethodologies();
      var index = methodologies.findIndex(function (item) {
        return item.id === methodology.id;
      });
      if (index < 0) {
        return;
      }
      var wasActive = methodology.id === AppStateService.getMethodologyId();
      methodologies.splice(index, 1);
      NavigationService.forget(methodology.id);
      if (wasActive) {
        if (!methodologies.length) {
          AppStateService.setMethodologyId(null);
          AppStateService.setSubPhaseId(null);
        } else {
          var next = methodologies[Math.max(0, index - 1)] || methodologies[0];
          AppStateService.setMethodologyId(next.id);
          AppStateService.setSubPhaseId(NavigationService.remembered(next.id) || MethodologyDomainService.firstContentSubPhase(next));
          NavigationService.remember(next.id, AppStateService.getSubPhaseId());
        }
      }
      AppStateService.refreshLocation();
      refreshDerived();
      NavigationService.push();
      notify();
    });
  }

  function renamePhase(phase) {
    if (!phase || !String(phase.name || '').trim()) {
      phase.name = 'Untitled';
    }
    notify();
  }

  function renameSubPhase(subPhase) {
    if (!subPhase || !String(subPhase.name || '').trim()) {
      subPhase.name = 'Untitled';
    }
    notify();
  }

  function addPhase(methodology) {
    if (!methodology) {
      MessagingService.toast('Add a methodology first');
      return;
    }
    if (!methodology.phases) {
      methodology.phases = [];
    }
    var phase = {
      id: IdSeqService.next('phase'),
      name: 'New Phase',
      order: methodology.phases.length + 1,
      subPhases: []
    };
    methodology.phases.push(phase);
    IdSeqService.recomputeSids(methodology);
    RaciGridService.ensureActivePhases(methodology);
    RaciGridService.activatePhase(phase.id);
    AppStateService.refreshLocation();
    notify();
  }

  // Keep sibling .order dense and aligned with array position. Hydrate sorts by .order, so a
  // swap/add that only mutates the array (and leaves stale .order) is undone on every SN reload.
  function renumberPhaseOrders(methodology) {
    (methodology.phases || []).forEach(function (phase, orderIndex) {
      phase.order = orderIndex + 1;
    });
  }

  function renumberSubPhaseOrders(phase) {
    (phase.subPhases || []).forEach(function (subPhase, orderIndex) {
      subPhase.order = orderIndex + 1;
    });
  }

  // Draft-only, same as addPhase: stays in structure edit until Save. (Previously this path
  // force-persisted the whole draft and jumped into content edit, so Cancel could no longer
  // undo prior structure changes.)
  function addSubPhase(phaseIndex, methodology) {
    if (!methodology) {
      return;
    }
    var phase = methodology.phases[phaseIndex];
    if (!phase) {
      return;
    }
    if (!phase.subPhases) {
      phase.subPhases = [];
    }
    var subPhase = DataService.blankSubPhase(
      IdSeqService.next('subPhase'),
      '',
      'New Sub-Phase',
      phase.subPhases.length + 1
    );
    subPhase.changelog.push({
      id: IdSeqService.next('changelog'),
      ts: IdSeqService.today(),
      text: 'Sub-phase created',
      read: false
    });
    phase.subPhases.push(subPhase);
    renumberSubPhaseOrders(phase);
    IdSeqService.recomputeSids(methodology);
    AppStateService.setMethodologyId(methodology.id);
    AppStateService.setSubPhaseId(subPhase.id);
    NavigationService.remember(methodology.id, subPhase.id);
    AppStateService.refreshLocation();
    notify();
  }

  function movePhase(index, direction, methodology) {
    if (!methodology) {
      return;
    }
    var swapIndex;
    if (direction === 'up') {
      swapIndex = index - 1;
    } else {
      swapIndex = index + 1;
    }
    if (swapIndex < 0 || swapIndex >= methodology.phases.length) {
      return;
    }
    var temporary = methodology.phases[index];
    methodology.phases[index] = methodology.phases[swapIndex];
    methodology.phases[swapIndex] = temporary;
    renumberPhaseOrders(methodology);
    IdSeqService.recomputeSids(methodology);
    notify();
  }

  function moveSubPhase(phaseIndex, index, direction, methodology) {
    if (!methodology) {
      return;
    }
    var array = methodology.phases[phaseIndex].subPhases;
    var swapIndex;
    if (direction === 'up') {
      swapIndex = index - 1;
    } else {
      swapIndex = index + 1;
    }
    if (swapIndex < 0 || swapIndex >= array.length) {
      return;
    }
    var temporary = array[index];
    array[index] = array[swapIndex];
    array[swapIndex] = temporary;
    renumberSubPhaseOrders(methodology.phases[phaseIndex]);
    IdSeqService.recomputeSids(methodology);
    notify();
  }

  function deletePhase(index, methodology) {
    if (!methodology) {
      return;
    }
    var phase = methodology.phases[index];
    if (!phase) {
      return;
    }
    var subPhases = phase.subPhases || [];
    MessagingService.confirm({
      title: 'Remove phase?',
      body: 'Remove “' + phase.name + '” and all ' + subPhases.length + ' of its sub-phases from this draft? Cancel structure edit to undo.',
      cancel: 'Keep',
      ok: 'Remove'
    }).then(function (accepted) {
      if (!accepted) {
        return;
      }
      var removedIds = subPhases.map(function (subPhase) {
        return subPhase.id;
      });
      methodology.phases.splice(index, 1);
      renumberPhaseOrders(methodology);
      IdSeqService.recomputeSids(methodology);
      RaciGridService.deactivatePhase(phase.id);
      if (removedIds.indexOf(AppStateService.getSubPhaseId()) >= 0) {
        AppStateService.setSubPhaseId(MethodologyDomainService.firstContentSubPhase(methodology));
        AppStateService.refreshLocation();
      }
      refreshDerived();
      notify();
    });
  }

  function deleteSubPhase(phaseIndex, index, methodology) {
    if (!methodology) {
      return;
    }
    var phase = methodology.phases[phaseIndex];
    if (!phase) {
      return;
    }
    if (!phase.subPhases) {
      phase.subPhases = [];
    }
    var array = phase.subPhases;
    var subPhase = array[index];
    if (!subPhase) {
      return;
    }
    MessagingService.confirm({
      title: 'Remove sub-phase?',
      body: 'Remove “' + subPhase.name + '” from this draft? Cancel structure edit to undo.',
      cancel: 'Keep',
      ok: 'Remove'
    }).then(function (accepted) {
      if (!accepted) {
        return;
      }
      var wasOpen = subPhase.id === AppStateService.getSubPhaseId();
      array.splice(index, 1);
      renumberSubPhaseOrders(phase);
      IdSeqService.recomputeSids(methodology);
      if (wasOpen) {
        var next = array[index] || array[index - 1];
        if (next) {
          AppStateService.setSubPhaseId(next.id);
          NavigationService.remember(methodology.id, next.id);
        } else {
          AppStateService.setSubPhaseId(MethodologyDomainService.firstContentSubPhase(methodology));
          NavigationService.remember(methodology.id, AppStateService.getSubPhaseId());
        }
        AppStateService.refreshLocation();
      }
      refreshDerived();
      notify();
    });
  }

  return {
    bind: bind,
    state: state,
    isEditing: isEditing,
    readState: readState,
    enterStructureEdit: enterStructureEdit,
    exitStructureEdit: exitStructureEdit,
    toggleStructureEdit: toggleStructureEdit,
    cancelStructureEdit: cancelStructureEdit,
    saveStructureEdit: saveStructureEdit,
    renameMethodology: renameMethodology,
    methodologyNeedsSetup: methodologyNeedsSetup,
    addMethodology: addMethodology,
    deleteMethodology: deleteMethodology,
    renamePhase: renamePhase,
    renameSubPhase: renameSubPhase,
    addPhase: addPhase,
    addSubPhase: addSubPhase,
    movePhase: movePhase,
    moveSubPhase: moveSubPhase,
    deletePhase: deletePhase,
    deleteSubPhase: deleteSubPhase
  };
}]