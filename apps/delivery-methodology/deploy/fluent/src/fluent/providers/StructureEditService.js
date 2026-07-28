[
  'DataService', 'IdSeqService', 'NavigationService', 'RaciGridService',
  function (DataService, IdSeqService, NavigationService, RaciGridService) {
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
      rgActivePhases: RaciGridService.getActivePhases()
    };
    state.structureEditMode = true;
    if (hooks.scrollToEditBar) {
      hooks.scrollToEditBar();
    }
  }

  function exitStructureEdit() {
    state.structureSnapshot = null;
    state.structureNavSnapshot = null;
    state.structureEditMode = false;
  }

  function toggleStructureEdit() {
    if (!hooks.canEdit()) {
      hooks.denyEdit();
      return;
    }
    if (hooks.isContentEditing && hooks.isContentEditing()) {
      hooks.showToast('Finish editing first');
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
        RaciGridService.setActivePhases(state.structureNavSnapshot.rgActivePhases);
        if (hooks.syncRg) {
          hooks.syncRg();
        }
      }
    }
    exitStructureEdit();
    if (hooks.refreshLoc) {
      hooks.refreshLoc();
    }
    if (hooks.refreshWhatsNew) {
      hooks.refreshWhatsNew();
    }
    if (hooks.refreshJobAids) {
      hooks.refreshJobAids();
    }
    if (hooks.getView() === 'raci' && hooks.refreshRgIfRaci) {
      hooks.refreshRgIfRaci();
    }
    hooks.showToast('Structure edit cancelled - changes reverted');
    if (hooks.scrollPageToTop) {
      hooks.scrollPageToTop();
    }
  }

  function saveStructureEdit() {
    var methodologies = hooks.getMethodologies();
    methodologies.forEach(function (methodology) {
      if (!methodology || !String(methodology.name || '').trim()) {
        methodology.name = 'Untitled';
      }
      (methodology.phases || []).forEach(function (phase) {
        if (!phase || !String(phase.name || '').trim()) {
          phase.name = 'Untitled';
        }
        (phase.subPhases || []).forEach(function (subPhase) {
          if (!subPhase || !String(subPhase.name || '').trim()) {
            subPhase.name = 'Untitled';
          }
        });
      });
    });
    hooks.persistMethodologies().then(function () {
      exitStructureEdit();
      if (hooks.refreshLoc) {
        hooks.refreshLoc();
      }
      if (hooks.refreshWhatsNew) {
        hooks.refreshWhatsNew();
      }
      if (hooks.refreshJobAids) {
        hooks.refreshJobAids();
      }
      if (hooks.getView() === 'raci' && hooks.refreshRgIfRaci) {
        hooks.refreshRgIfRaci();
      }
      if (hooks.pushNav) {
        hooks.pushNav();
      }
      if (hooks.afterSaveSuccess) {
        hooks.afterSaveSuccess();
      }
      hooks.showToast('Structure saved');
      if (hooks.scrollPageToTop) {
        hooks.scrollPageToTop();
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
      hooks.denyEdit();
      return;
    }
    if (hooks.isContentEditing && hooks.isContentEditing()) {
      hooks.showToast('Finish editing first');
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
    if (hooks.markReadCurrent) {
      hooks.markReadCurrent();
    }
    if (hooks.refreshWhatsNew) {
      hooks.refreshWhatsNew();
    }
    if (hooks.getView() === 'raci' && hooks.refreshRgIfRaci) {
      hooks.refreshRgIfRaci();
    }
    if (hooks.pushNav) {
      hooks.pushNav();
    }
  }

  function deleteMethodology() {
    if (!hooks.canEdit()) {
      hooks.denyEdit();
      return;
    }
    if (hooks.isContentEditing && hooks.isContentEditing()) {
      hooks.showToast('Finish editing first');
      return;
    }
    var methodologies = hooks.getMethodologies();
    if (methodologies.length <= 1) {
      hooks.showToast('Keep at least one methodology');
      return;
    }
    var methodology = hooks.curMeth();
    if (!methodology) {
      return;
    }
    if (!window.confirm('Remove methodology “' + methodology.name + '” and all of its phases from this draft? Cancel structure edit to undo.')) {
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
    if (hooks.refreshWhatsNew) {
      hooks.refreshWhatsNew();
    }
    if (hooks.getView() === 'raci' && hooks.refreshRgIfRaci) {
      hooks.refreshRgIfRaci();
    }
    if (hooks.pushNav) {
      hooks.pushNav();
    }
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
      if (hooks.markReadCurrent) {
        hooks.markReadCurrent();
      }
      if (hooks.refreshWhatsNew) {
        hooks.refreshWhatsNew();
      }
      if (hooks.getView() === 'raci' && hooks.refreshRgIfRaci) {
        hooks.refreshRgIfRaci();
      }
      if (hooks.enterContentEdit) {
        hooks.enterContentEdit();
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
      hooks.showToast('A methodology needs at least one phase');
      return;
    }
    var phase = methodology.phases[index];
    if (!window.confirm('Remove phase “' + phase.name + '” and all ' + phase.subPhases.length + ' of its sub-phases from this draft? Cancel structure edit to undo.')) {
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
    if (hooks.refreshWhatsNew) {
      hooks.refreshWhatsNew();
    }
    if (hooks.getView() === 'raci' && hooks.refreshRgIfRaci) {
      hooks.refreshRgIfRaci();
    }
  }

  function deleteSubPhase(phaseIndex, index) {
    var methodology = hooks.curMeth();
    var array = methodology.phases[phaseIndex].subPhases;
    var subPhase = array[index];
    if (!window.confirm('Remove sub-phase “' + subPhase.name + '” from this draft? Cancel structure edit to undo.')) {
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
    if (hooks.refreshWhatsNew) {
      hooks.refreshWhatsNew();
    }
    if (hooks.getView() === 'raci' && hooks.refreshRgIfRaci) {
      hooks.refreshRgIfRaci();
    }
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