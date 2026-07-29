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
    hooks = hostHooks || {};
  }

  function curMeth() {
    return MethodologyDomainService.curMeth(
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
        methodology: curMeth(),
        sortJobTitleIds: sortJobTitleIds,
        hasContent: MethodologyDomainService.hasContent
      });
    }
    if (hooks.syncDerived) {
      hooks.syncDerived();
    }
  }

  function markReadCurrent() {
    var location = AppStateService.getLoc();
    if (!location || !location.sp) {
      return;
    }
    var entries = WhatsNewService.markRead(location.sp, AppStateService.getMethodologies());
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
      methSubPhaseById: NavigationService.getResumeMap(),
      rgActivePhases: RaciGridService.getActivePhases(),
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
        NavigationService.setResumeMap(state.structureNavSnapshot.methSubPhaseById);
        NavigationService.setHistory(state.structureNavSnapshot.navHistory);
        RaciGridService.setActivePhases(state.structureNavSnapshot.rgActivePhases);
      }
    }
    exitStructureEdit();
    AppStateService.refreshLoc();
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
      AppStateService.refreshLoc();
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
      order: AppStateService.getMethodologies().length + 1,
      summary: '',
      description: '',
      feedbackUrl: '',
      feedbackLabel: 'Provide Feedback',
      diagramUrl: '',
      phases: [phase]
    };
    AppStateService.getMethodologies().push(methodology);
    IdSeqService.recomputeSids(methodology);
    AppStateService.setMethodologyId(methodologyId);
    NavigationService.remember(methodologyId, subPhase.id);
    AppStateService.setSubPhaseId(subPhase.id);
    RaciGridService.ensureActivePhases(methodology);
    RaciGridService.activatePhase(phase.id);
    AppStateService.refreshLoc();
    markReadCurrent();
    refreshDerived();
    NavigationService.push();
    notify();
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
    var methodologies = AppStateService.getMethodologies();
    if (methodologies.length <= 1) {
      MessagingService.toast('Keep at least one methodology');
      return;
    }
    var methodology = curMeth();
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
      AppStateService.setMethodologyId(next.id);
      AppStateService.setSubPhaseId(NavigationService.remembered(next.id) || MethodologyDomainService.firstContentSubPhase(next));
      NavigationService.remember(next.id, AppStateService.getSubPhaseId());
      AppStateService.refreshLoc();
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

  function addPhase() {
    var methodology = curMeth();
    if (!methodology) {
      MessagingService.toast('Add a methodology first');
      return;
    }
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
    RaciGridService.activatePhase(phase.id);
    AppStateService.setSubPhaseId(subPhase.id);
    NavigationService.remember(methodology.id, subPhase.id);
    AppStateService.refreshLoc();
    notify();
  }

  function addSubPhase(phaseIndex) {
    var methodology = curMeth();
    if (!methodology) {
      return;
    }
    if (!AppStateService.tryBeginSave()) {
      return;
    }
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
    AppStateService.persistMethodologies().then(function () {
      exitStructureEdit();
      AppStateService.setSubPhaseId(subPhase.id);
      NavigationService.remember(methodology.id, subPhase.id);
      AppStateService.refreshLoc();
      markReadCurrent();
      refreshDerived();
      if (hooks.enterContentEdit) {
        hooks.enterContentEdit();
      }
      notify();
    }, function () {
      // Keep the new sub-phase in the open structure draft; only roll back the sid numbers
      // if the host wants a sync. Persist toast already fired.
      IdSeqService.recomputeSids(methodology);
      if (hooks.afterSaveFailure) {
        hooks.afterSaveFailure();
      }
      AppStateService.refreshLoc();
      notify();
    });
  }

  function movePhase(index, direction) {
    var methodology = curMeth();
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
    IdSeqService.recomputeSids(methodology);
    notify();
  }

  function moveSubPhase(phaseIndex, index, direction) {
    var methodology = curMeth();
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
    IdSeqService.recomputeSids(methodology);
    notify();
  }

  function deletePhase(index) {
    var methodology = curMeth();
    if (!methodology) {
      return;
    }
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
      RaciGridService.deactivatePhase(phase.id);
      if (removedIds.indexOf(AppStateService.getSubPhaseId()) >= 0) {
        AppStateService.setSubPhaseId(MethodologyDomainService.firstContentSubPhase(methodology));
        AppStateService.refreshLoc();
      }
      refreshDerived();
      notify();
    });
  }

  function deleteSubPhase(phaseIndex, index) {
    var methodology = curMeth();
    if (!methodology) {
      return;
    }
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
      var wasOpen = subPhase.id === AppStateService.getSubPhaseId();
      array.splice(index, 1);
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
        AppStateService.refreshLoc();
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