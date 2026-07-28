[
  'DataService', 'IdSeqService', 'NavigationService', 'RaciGridService', 'MessagingService',
  'WhatsNewService', 'ReferenceService',
  function (
    DataService, IdSeqService, NavigationService, RaciGridService, MessagingService,
    WhatsNewService, ReferenceService
  ) {
  'use strict';

  var hooks = {};
  var state = {
    structureEditUiEnabled: true,
    structureEditMode: false,
    structureSnapshot: null,
    structureNavSnapshot: null
  };

  function bind(hostHooks) {
    hooks = hostHooks || {};
  }

  // Peer refreshes + one host sync for template mirrors (whatsNew / jobAids / rg).
  function refreshDerived() {
    var methodologies = hooks.getMethodologies();
    WhatsNewService.refresh(methodologies);
    ReferenceService.refresh(methodologies, hooks.sortJobTitleIds, hooks.jobTitleById);
    if (hooks.getView() === 'raci') {
      RaciGridService.refresh({
        methodology: hooks.curMeth(),
        sortJobTitleIds: hooks.sortJobTitleIds,
        hasContent: hooks.hasContent
      });
    }
    if (hooks.syncDerived) {
      hooks.syncDerived();
    }
  }

  function markReadCurrent() {
    var location = hooks.getLoc && hooks.getLoc();
    if (!location || !location.sp) {
      return;
    }
    var entries = WhatsNewService.markRead(location.sp, hooks.getMethodologies());
    if (hooks.setJustRead) {
      hooks.setJustRead(entries);
    }
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
    state.structureSnapshot = IdSeqService.deepClone(hooks.getMethodologies());
    state.structureNavSnapshot = {
      methodologyId: hooks.getMethodologyId(),
      subPhaseId: hooks.getSubPhaseId(),
      methSubPhaseById: NavigationService.getResumeMap(),
      rgActivePhases: RaciGridService.getActivePhases(),
      navHistory: NavigationService.getHistory()
    };
    state.structureEditMode = true;
    MessagingService.scrollToEditBar();
  }

  function exitStructureEdit() {
    state.structureSnapshot = null;
    state.structureNavSnapshot = null;
    state.structureEditMode = false;
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
      return;
    }
    enterStructureEdit();
  }

  function cancelStructureEdit() {
    if (state.structureSnapshot) {
      hooks.setMethodologies(IdSeqService.deepClone(state.structureSnapshot));
      if (state.structureNavSnapshot) {
        hooks.setMethodologyId(state.structureNavSnapshot.methodologyId);
        hooks.setSubPhaseId(state.structureNavSnapshot.subPhaseId);
        NavigationService.setResumeMap(state.structureNavSnapshot.methSubPhaseById);
        NavigationService.setHistory(state.structureNavSnapshot.navHistory);
        RaciGridService.setActivePhases(state.structureNavSnapshot.rgActivePhases);
      }
    }
    exitStructureEdit();
    if (hooks.refreshLoc) {
      hooks.refreshLoc();
    }
    refreshDerived();
    MessagingService.toast('Structure edit cancelled - changes reverted');
    MessagingService.scrollPageToTop();
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
    if (hooks.tryBeginSave && !hooks.tryBeginSave()) {
      return;
    }
    var methodologies = hooks.getMethodologies();
    var coercedNames = coerceBlankNames(methodologies);
    hooks.persistMethodologies().then(function () {
      exitStructureEdit();
      if (hooks.refreshLoc) {
        hooks.refreshLoc();
      }
      refreshDerived();
      NavigationService.push();
      if (hooks.afterSaveSuccess) {
        hooks.afterSaveSuccess();
      }
      MessagingService.toast('Structure saved');
      MessagingService.scrollPageToTop();
    }, function () {
      restoreCoercedNames(coercedNames);
      if (hooks.afterSaveFailure) {
        hooks.afterSaveFailure();
      }
    });
  }

  function renameMethodology(methodology) {
    if (!methodology || !String(methodology.name || '').trim()) {
      methodology.name = 'Untitled';
    }
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
    var methodologyId = IdSeqService.next('methodology');
    var phase = {
      id: IdSeqService.next('phase'),
      name: 'New Phase',
      order: 1,
      subPhases: []
    };
    var subPhase = DataService.blankSubPhase(IdSeqService.next('subPhase'), '', 'New Sub-Phase', 1);
    subPhase.changelog.push({
      id: IdSeqService.next('changelog'),
      ts: IdSeqService.today(),
      text: 'Sub-phase created',
      read: false
    });
    phase.subPhases.push(subPhase);
    var methodology = {
      id: methodologyId,
      name: 'New Methodology',
      order: hooks.getMethodologies().length + 1,
      summary: '',
      description: '',
      feedbackUrl: '',
      feedbackLabel: 'Provide Feedback',
      diagramUrl: '',
      phases: [phase]
    };
    hooks.getMethodologies().push(methodology);
    IdSeqService.recomputeSids(methodology);
    hooks.setMethodologyId(methodologyId);
    NavigationService.remember(methodologyId, subPhase.id);
    hooks.setSubPhaseId(subPhase.id);
    RaciGridService.ensureActivePhases(methodology);
    if (hooks.syncRg) {
      hooks.syncRg();
    }
    var activePhases = hooks.getRgActivePhasesMirror && hooks.getRgActivePhasesMirror();
    if (activePhases) {
      activePhases[phase.id] = true;
    }
    if (hooks.refreshLoc) {
      hooks.refreshLoc();
    }
    markReadCurrent();
    refreshDerived();
    NavigationService.push();
  }

  function deleteMethodology() {
    if (!hooks.canEdit()) {
      MessagingService.toast('You do not have permission to edit');
      return;
    }
    if (hooks.isContentEditing && hooks.isContentEditing()) {
      MessagingService.toast('Finish editing first');
      return;
    }
    var methodologies = hooks.getMethodologies();
    if (methodologies.length <= 1) {
      MessagingService.toast('Keep at least one methodology');
      return;
    }
    var methodology = hooks.curMeth();
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
      var index = methodologies.findIndex(function (item) {
        return item.id === methodology.id;
      });
      if (index < 0) {
        return;
      }
      methodologies.splice(index, 1);
      NavigationService.forget(methodology.id);
      var next = methodologies[Math.max(0, index - 1)] || methodologies[0];
      hooks.setMethodologyId(next.id);
      hooks.setSubPhaseId(NavigationService.remembered(next.id) || hooks.firstContentSubPhase(next));
      NavigationService.remember(next.id, hooks.getSubPhaseId());
      if (hooks.refreshLoc) {
        hooks.refreshLoc();
      }
      refreshDerived();
      NavigationService.push();
    });
  }

  function renamePhase(phase) {
    if (!phase || !String(phase.name || '').trim()) {
      phase.name = 'Untitled';
    }
  }

  function renameSubPhase(subPhase) {
    if (!subPhase || !String(subPhase.name || '').trim()) {
      subPhase.name = 'Untitled';
    }
  }

  function addPhase() {
    var methodology = hooks.curMeth();
    var phase = {
      id: IdSeqService.next('phase'),
      name: 'New Phase',
      order: methodology.phases.length + 1,
      subPhases: []
    };
    var subPhase = DataService.blankSubPhase(IdSeqService.next('subPhase'), '', 'New Sub-Phase', 1);
    subPhase.changelog.push({
      id: IdSeqService.next('changelog'),
      ts: IdSeqService.today(),
      text: 'Sub-phase created',
      read: false
    });
    phase.subPhases.push(subPhase);
    methodology.phases.push(phase);
    IdSeqService.recomputeSids(methodology);
    RaciGridService.ensureActivePhases(methodology);
    if (hooks.syncRg) {
      hooks.syncRg();
    }
    var activePhases = hooks.getRgActivePhasesMirror && hooks.getRgActivePhasesMirror();
    if (activePhases) {
      activePhases[phase.id] = true;
    }
    hooks.setSubPhaseId(subPhase.id);
    NavigationService.remember(methodology.id, subPhase.id);
    if (hooks.refreshLoc) {
      hooks.refreshLoc();
    }
  }

  function addSubPhase(phaseIndex) {
    if (hooks.tryBeginSave && !hooks.tryBeginSave()) {
      return;
    }
    var methodology = hooks.curMeth();
    var phase = methodology.phases[phaseIndex];
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
    IdSeqService.recomputeSids(methodology);
    hooks.persistMethodologies().then(function () {
      exitStructureEdit();
      hooks.setSubPhaseId(subPhase.id);
      NavigationService.remember(methodology.id, subPhase.id);
      if (hooks.refreshLoc) {
        hooks.refreshLoc();
      }
      markReadCurrent();
      refreshDerived();
      if (hooks.enterContentEdit) {
        hooks.enterContentEdit();
      }
    }, function () {
      // Keep the new sub-phase in the open structure draft; only roll back the sid numbers
      // if the host wants a sync. Persist toast already fired.
      IdSeqService.recomputeSids(methodology);
      if (hooks.afterSaveFailure) {
        hooks.afterSaveFailure();
      }
      if (hooks.refreshLoc) {
        hooks.refreshLoc();
      }
    });
  }

  function movePhase(index, direction) {
    var methodology = hooks.curMeth();
    var swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= methodology.phases.length) {
      return;
    }
    var temporary = methodology.phases[index];
    methodology.phases[index] = methodology.phases[swapIndex];
    methodology.phases[swapIndex] = temporary;
    IdSeqService.recomputeSids(methodology);
  }

  function moveSubPhase(phaseIndex, index, direction) {
    var methodology = hooks.curMeth();
    var array = methodology.phases[phaseIndex].subPhases;
    var swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= array.length) {
      return;
    }
    var temporary = array[index];
    array[index] = array[swapIndex];
    array[swapIndex] = temporary;
    IdSeqService.recomputeSids(methodology);
  }

  function deletePhase(index) {
    var methodology = hooks.curMeth();
    if (methodology.phases.length <= 1) {
      MessagingService.toast('A methodology needs at least one phase');
      return;
    }
    var phase = methodology.phases[index];
    MessagingService.confirm({
      title: 'Remove phase?',
      body: 'Remove “' + phase.name + '” and all ' + phase.subPhases.length + ' of its sub-phases from this draft? Cancel structure edit to undo.',
      cancel: 'Keep',
      ok: 'Remove'
    }).then(function (accepted) {
      if (!accepted) {
        return;
      }
      var removedIds = phase.subPhases.map(function (subPhase) {
        return subPhase.id;
      });
      methodology.phases.splice(index, 1);
      IdSeqService.recomputeSids(methodology);
      var activePhases = hooks.getRgActivePhasesMirror && hooks.getRgActivePhasesMirror();
      if (activePhases) {
        delete activePhases[phase.id];
      }
      if (removedIds.indexOf(hooks.getSubPhaseId()) >= 0) {
        hooks.setSubPhaseId(hooks.firstContentSubPhase(methodology));
        if (hooks.refreshLoc) {
          hooks.refreshLoc();
        }
      }
      refreshDerived();
    });
  }

  function deleteSubPhase(phaseIndex, index) {
    var methodology = hooks.curMeth();
    var array = methodology.phases[phaseIndex].subPhases;
    var subPhase = array[index];
    MessagingService.confirm({
      title: 'Remove sub-phase?',
      body: 'Remove “' + subPhase.name + '” from this draft? Cancel structure edit to undo.',
      cancel: 'Keep',
      ok: 'Remove'
    }).then(function (accepted) {
      if (!accepted) {
        return;
      }
      var wasOpen = subPhase.id === hooks.getSubPhaseId();
      array.splice(index, 1);
      IdSeqService.recomputeSids(methodology);
      if (wasOpen) {
        var next = array[index] || array[index - 1];
        if (next) {
          hooks.setSubPhaseId(next.id);
          NavigationService.remember(methodology.id, next.id);
        } else {
          hooks.setSubPhaseId(hooks.firstContentSubPhase(methodology));
          NavigationService.remember(methodology.id, hooks.getSubPhaseId());
        }
        if (hooks.refreshLoc) {
          hooks.refreshLoc();
        }
      }
      refreshDerived();
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