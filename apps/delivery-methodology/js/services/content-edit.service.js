/* Sub-phase content edit mode: working copy, save/cancel, and field mutators.
   Bind host hooks once after the controller's location/persist helpers exist - the Shell widget
   owns the one bind() call (see shell.controller.js) since it is always mounted; Methodology (the
   only widget whose template actually renders edit mode) reads this service's state directly.

   Cross-widget note: editMode itself is broadcast ($rootScope.$broadcast('dm-state')) on
   enter/cancel/save so OTHER widgets (Shell's ng-class="{editing: ...}" wrapper) can re-sync -
   the field-level mutators below (toggleParticipant, addTask, ...) are NOT broadcast because they
   only ever mutate state.editSubPhase, which only the Methodology widget's own template reads. */
angular.module('deliveryMethodology').factory('ContentEditService', [
  'ChangelogDiffService', 'IdSeqService', 'MessagingService', 'AppStateService', 'MethodologyDomainService',
  'RaciGridService', 'WhatsNewService',
  function (
    ChangelogDiffService, IdSeqService, MessagingService, AppStateService, MethodologyDomainService,
    RaciGridService, WhatsNewService
  ) {
  'use strict';

  function notify() {
    AppStateService.notify();
  }

  // Template helpers used to allocate fresh arrays every digest. Cache until the next mutator.
  var derived = {
    idleParticipants: null,
    loeRoleRows: null,
    loeAvailableRoles: null,
    internalRoles: null,
    taskRaciRolesByTaskId: null,
    taskAvailableRolesByTaskId: null
  };

  function invalidateDerived() {
    derived.idleParticipants = null;
    derived.loeRoleRows = null;
    derived.loeAvailableRoles = null;
    derived.internalRoles = null;
    derived.taskRaciRolesByTaskId = null;
    derived.taskAvailableRolesByTaskId = null;
  }

  var LOE_ROLE_DEFAULTS = {
    em: {
      billable: true,
      optional: false
    },
    bpc: {
      billable: true,
      optional: false
    },
    arch: {
      billable: true,
      optional: false
    },
    tc: {
      billable: true,
      optional: false
    },
    ux: {
      billable: true,
      optional: false
    },
    ae: {
      billable: false,
      optional: false
    },
    sa: {
      billable: false,
      optional: false
    },
    es: {
      billable: false,
      optional: true
    }
  };

  var CORE_TEAM = ['em', 'bpc', 'arch', 'tc'];

  var hooks = {};
  var state = {
    editMode: false,
    editSubPhase: null,
    editSnapshot: null,
    tmpAddJobTitle: {}
  };

  function bind(hostHooks) {
    if (hostHooks) {
      hooks = hostHooks;
    } else {
      hooks = {};
    }
  }

  function jobTitleById(jobTitleId) {
    return MethodologyDomainService.jobTitleById(AppStateService.getJobTitles(), jobTitleId);
  }

  function sortJobTitleIds(jobTitleIds) {
    return MethodologyDomainService.sortJobTitleIds(AppStateService.getJobTitles(), jobTitleIds);
  }

  function participantsOf(subPhase) {
    return MethodologyDomainService.participantsOf(AppStateService.getJobTitles(), subPhase);
  }

  function isEditing() {
    return state.editMode;
  }

  function readState() {
    return {
      editMode: state.editMode,
      editSubPhase: state.editSubPhase,
      editSnapshot: state.editSnapshot,
      tmpAddJobTitle: state.tmpAddJobTitle
    };
  }

  function getEditSubPhase() {
    return state.editSubPhase;
  }

  function getEditSnapshot() {
    return state.editSnapshot;
  }

  function defaultLoeEntry(roleId) {
    var defaults = LOE_ROLE_DEFAULTS[roleId] || {
      billable: false,
      optional: false
    };
    return {
      text: '',
      billable: defaults.billable,
      optional: defaults.optional
    };
  }

  function collapseJobAidRoles(subPhase) {
    (subPhase.tasks || []).forEach(function (task) {
      var roleIds = sortJobTitleIds(Object.keys(task.raci || {}));
      (task.jobAids || []).forEach(function (jobAid) {
        if (Array.isArray(jobAid.roles) && jobAid.roles.length && roleIds.length
          && roleIds.every(function (roleId) { return jobAid.roles.indexOf(roleId) >= 0; })) {
          jobAid.roles = [];
        }
      });
    });
  }

  function enterEdit() {
    if (!hooks.canEdit()) {
      MessagingService.toast('You do not have permission to edit');
      return;
    }
    if (hooks.isStructureEditing && hooks.isStructureEditing()) {
      return;
    }
    if (hooks.isReferenceEditing && hooks.isReferenceEditing()) {
      MessagingService.toast('Finish appendix edit first');
      return;
    }
    var location = AppStateService.getLocation();
    if (!location || !location.subPhase) {
      MessagingService.toast('Nothing to edit yet');
      return;
    }
    state.editSnapshot = IdSeqService.deepClone(location.subPhase);
    state.editSubPhase = IdSeqService.deepClone(location.subPhase);
    state.tmpAddJobTitle = {};
    AppStateService.setTmpLevelOfEffortRoleId('');
    state.editMode = true;
    invalidateDerived();
    notify();
    MessagingService.scrollToEditBar();
  }

  function cancelEdit() {
    state.editMode = false;
    state.editSubPhase = null;
    state.editSnapshot = null;
    invalidateDerived();
    MessagingService.toast('Edit cancelled - changes reverted');
    MessagingService.scrollPageToTop();
    notify();
  }

  function saveEdit() {
    if (!AppStateService.tryBeginSave()) {
      return;
    }
    collapseJobAidRoles(state.editSubPhase);
    var changes = ChangelogDiffService.describeChanges(state.editSnapshot, state.editSubPhase, jobTitleById);
    var entries = [];
    var location = AppStateService.getLocation();
    var index = location.phase.subPhases.findIndex(function (subPhase) {
      return subPhase.id === state.editSubPhase.id;
    });
    var previous = IdSeqService.deepClone(state.editSnapshot);
    var toSave = IdSeqService.deepClone(state.editSubPhase);
    if (changes.length) {
      if (!toSave.changelog) {
        toSave.changelog = [];
      }
      // Own saves start read so What's New / unread dots don't treat the editor's write
      // as someone else's update. justRead still surfaces them in the post-save banner.
      entries = changes.map(function (text) {
        return {
          id: IdSeqService.next('changelog'),
          ts: IdSeqService.today(),
          text: text,
          read: true
        };
      });
      toSave.changelog.unshift.apply(toSave.changelog, entries);
    }
    location.phase.subPhases[index] = toSave;
    AppStateService.persistMethodologies().then(function () {
      state.editMode = false;
      state.editSubPhase = null;
      state.editSnapshot = null;
      invalidateDerived();
      if (entries.length) {
        WhatsNewService.rememberSeenEntries(entries);
      }
      if (hooks.afterSaveSuccess) {
        hooks.afterSaveSuccess(entries, changes.length);
      }
      if (changes.length) {
        var changeWord = 'change';
        if (changes.length > 1) {
          changeWord = 'changes';
        }
        MessagingService.toast('Saved - ' + changes.length + ' ' + changeWord + ' detected and logged automatically');
      } else {
        MessagingService.toast('Saved - no changes detected');
      }
      MessagingService.scrollPageToTop();
      notify();
    }, function () {
      location.phase.subPhases[index] = previous;
      if (hooks.afterSaveFailure) {
        hooks.afterSaveFailure(previous, index);
      }
      AppStateService.refreshLocation();
      notify();
    });
  }

  function participantOn(roleId) {
    return (state.editSubPhase.participants || []).indexOf(roleId) >= 0;
  }

  function toggleParticipant(roleId) {
    if (!state.editSubPhase.participants) {
      state.editSubPhase.participants = [];
    }
    var index = state.editSubPhase.participants.indexOf(roleId);
    if (index >= 0) {
      state.editSubPhase.participants.splice(index, 1);
    } else {
      state.editSubPhase.participants.push(roleId);
    }
    invalidateDerived();
  }

  function idleParticipants() {
    if (!derived.idleParticipants) {
      var used = {};
      (state.editSubPhase.tasks || []).forEach(function (task) {
        Object.keys(task.raci || {}).forEach(function (roleId) {
          if (task.raci[roleId] && task.raci[roleId].length) {
            used[roleId] = true;
          }
        });
      });
      derived.idleParticipants = participantsOf(state.editSubPhase).filter(function (role) {
        return !used[role.id];
      });
    }
    return derived.idleParticipants;
  }

  function addListItem(kind) {
    state.editSubPhase[kind].push('');
    invalidateDerived();
  }

  function removeListItem(kind, index) {
    state.editSubPhase[kind].splice(index, 1);
    invalidateDerived();
  }

  function moveListItem(kind, index, direction) {
    var array = state.editSubPhase[kind];
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
    invalidateDerived();
  }

  function setLoeMode(mode) {
    state.editSubPhase.levelOfEffort.mode = mode;
    if (mode === 'byRole' && !Object.keys(state.editSubPhase.levelOfEffort.roles || {}).length) {
      if (!state.editSubPhase.levelOfEffort.roles) {
        state.editSubPhase.levelOfEffort.roles = {};
      }
      participantsOf(state.editSubPhase).filter(function (role) {
        return !role.external;
      }).forEach(function (role) {
        state.editSubPhase.levelOfEffort.roles[role.id] = defaultLoeEntry(role.id);
      });
    }
    invalidateDerived();
  }

  function loeAvailableRoles() {
    if (!derived.loeAvailableRoles) {
      var used = Object.keys(state.editSubPhase.levelOfEffort.roles || {});
      derived.loeAvailableRoles = participantsOf(state.editSubPhase).filter(function (role) {
        return !role.external && used.indexOf(role.id) < 0;
      });
    }
    return derived.loeAvailableRoles;
  }

  function addLoeRole() {
    var roleId = AppStateService.getTmpLevelOfEffortRoleId();
    if (!roleId) {
      return;
    }
    if (!state.editSubPhase.levelOfEffort.roles) {
      state.editSubPhase.levelOfEffort.roles = {};
    }
    state.editSubPhase.levelOfEffort.roles[roleId] = defaultLoeEntry(roleId);
    AppStateService.setTmpLevelOfEffortRoleId('');
    invalidateDerived();
  }

  function removeLoeRole(roleId) {
    delete state.editSubPhase.levelOfEffort.roles[roleId];
    invalidateDerived();
  }

  function setLoeFlag(entry, value) {
    if (value === 'optional') {
      entry.optional = true;
      entry.billable = false;
    } else if (value === 'mandatory') {
      entry.optional = false;
    } else if (value === 'billable' && !entry.optional) {
      entry.billable = true;
    } else if (value === 'nonbillable' && !entry.optional) {
      entry.billable = false;
    }
  }

  function loeRoleOrphan(roleId) {
    return (state.editSubPhase.participants || []).indexOf(roleId) < 0;
  }

  function loeRoleRows() {
    if (!derived.loeRoleRows) {
      derived.loeRoleRows = sortJobTitleIds(Object.keys(state.editSubPhase.levelOfEffort.roles || {}))
        .map(jobTitleById).filter(Boolean);
    }
    return derived.loeRoleRows;
  }

  function addMeeting() {
    state.editSubPhase.meetings.push({
      id: IdSeqService.next('meeting'),
      name: '',
      scheduledBy: '',
      ledBy: '',
      external: false
    });
    invalidateDerived();
  }

  function removeMeeting(index) {
    state.editSubPhase.meetings.splice(index, 1);
    invalidateDerived();
  }

  function moveMeeting(index, direction) {
    var array = state.editSubPhase.meetings;
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
    invalidateDerived();
  }

  function internalRoles() {
    if (!derived.internalRoles) {
      derived.internalRoles = participantsOf(state.editSubPhase).filter(function (role) {
        return !role.external;
      });
    }
    return derived.internalRoles;
  }

  function meetingPersonOrphan(roleId) {
    return !!roleId && (state.editSubPhase.participants || []).indexOf(roleId) < 0;
  }

  function addTask() {
    state.editSubPhase.tasks.push({
      id: IdSeqService.next('task'),
      order: state.editSubPhase.tasks.length + 1,
      text: '',
      jobAids: [],
      raci: {}
    });
    invalidateDerived();
  }

  function removeTask(index) {
    state.editSubPhase.tasks.splice(index, 1);
    invalidateDerived();
  }

  function moveTask(index, direction) {
    var array = state.editSubPhase.tasks;
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
    array.forEach(function (task, orderIndex) {
      task.order = orderIndex + 1;
    });
    invalidateDerived();
  }

  function taskRaciRoles(task) {
    if (!task) {
      return [];
    }
    if (!derived.taskRaciRolesByTaskId) {
      derived.taskRaciRolesByTaskId = {};
    }
    if (!derived.taskRaciRolesByTaskId[task.id]) {
      derived.taskRaciRolesByTaskId[task.id] = sortJobTitleIds(Object.keys(task.raci || {}))
        .map(jobTitleById).filter(Boolean);
    }
    return derived.taskRaciRolesByTaskId[task.id];
  }

  function taskRoleOrphan(roleId) {
    return (state.editSubPhase.participants || []).indexOf(roleId) < 0;
  }

  function taskAvailableRoles(task) {
    if (!task) {
      return [];
    }
    if (!derived.taskAvailableRolesByTaskId) {
      derived.taskAvailableRolesByTaskId = {};
    }
    if (!derived.taskAvailableRolesByTaskId[task.id]) {
      var used = Object.keys(task.raci || {});
      derived.taskAvailableRolesByTaskId[task.id] = participantsOf(state.editSubPhase).filter(function (role) {
        return used.indexOf(role.id) < 0;
      });
    }
    return derived.taskAvailableRolesByTaskId[task.id];
  }

  function taskCoreTeamMissing(task) {
    var used = Object.keys(task.raci || {});
    var participating = state.editSubPhase.participants || [];
    return CORE_TEAM.some(function (roleId) {
      return participating.indexOf(roleId) >= 0 && used.indexOf(roleId) < 0;
    });
  }

  function toggleRaci(task, roleId, letter) {
    var letters = task.raci[roleId] || (task.raci[roleId] = []);
    var index = letters.indexOf(letter);
    if (index >= 0) {
      letters.splice(index, 1);
    } else {
      letters.push(letter);
      task.raci[roleId] = RaciGridService.sortLetters(letters);
    }
    invalidateDerived();
  }

  function removeTaskRole(task, roleId) {
    delete task.raci[roleId];
    invalidateDerived();
  }

  function addTaskRole(task, roleId) {
    if (!roleId) {
      return;
    }
    if (roleId === '__core__') {
      var participating = state.editSubPhase.participants || [];
      CORE_TEAM.forEach(function (coreRoleId) {
        if (participating.indexOf(coreRoleId) >= 0 && !task.raci[coreRoleId]) {
          task.raci[coreRoleId] = [];
        }
      });
      invalidateDerived();
      return;
    }
    if (!task.raci[roleId]) {
      task.raci[roleId] = [];
    }
    invalidateDerived();
  }

  function addJobAid(task) {
    if (!Array.isArray(task.jobAids)) {
      task.jobAids = [];
    }
    task.jobAids.push({
      id: IdSeqService.next('jobAid'),
      label: '',
      url: '',
      roles: []
    });
    invalidateDerived();
  }

  function removeJobAid(task, index) {
    task.jobAids.splice(index, 1);
    invalidateDerived();
  }

  function toggleJobAidRole(task, jobAid, roleId) {
    var roleIds = sortJobTitleIds(Object.keys(task.raci || {}));
    var array;
    if (jobAid.roles && jobAid.roles.length) {
      array = jobAid.roles.slice();
    } else {
      array = roleIds.slice();
    }
    var index = array.indexOf(roleId);
    if (index >= 0) {
      array.splice(index, 1);
    } else {
      array.push(roleId);
    }
    var allRolesSelected = roleIds.length && roleIds.every(function (role) {
      return array.indexOf(role) >= 0;
    });
    if (allRolesSelected) {
      jobAid.roles = [];
    } else {
      jobAid.roles = array;
    }
    invalidateDerived();
  }

  function jobAidRoleOn(task, jobAid, roleId) {
    return !jobAid.roles || !jobAid.roles.length || jobAid.roles.indexOf(roleId) >= 0;
  }

  return {
    bind: bind,
    state: state,
    isEditing: isEditing,
    readState: readState,
    getEditSubPhase: getEditSubPhase,
    getEditSnapshot: getEditSnapshot,
    enterEdit: enterEdit,
    cancelEdit: cancelEdit,
    saveEdit: saveEdit,
    collapseJobAidRoles: collapseJobAidRoles,
    participantOn: participantOn,
    toggleParticipant: toggleParticipant,
    idleParticipants: idleParticipants,
    addListItem: addListItem,
    removeListItem: removeListItem,
    moveListItem: moveListItem,
    setLoeMode: setLoeMode,
    loeAvailableRoles: loeAvailableRoles,
    addLoeRole: addLoeRole,
    removeLoeRole: removeLoeRole,
    setLoeFlag: setLoeFlag,
    loeRoleOrphan: loeRoleOrphan,
    loeRoleRows: loeRoleRows,
    addMeeting: addMeeting,
    removeMeeting: removeMeeting,
    moveMeeting: moveMeeting,
    internalRoles: internalRoles,
    meetingPersonOrphan: meetingPersonOrphan,
    addTask: addTask,
    removeTask: removeTask,
    moveTask: moveTask,
    taskRaciRoles: taskRaciRoles,
    taskRoleOrphan: taskRoleOrphan,
    taskAvailableRoles: taskAvailableRoles,
    taskCoreTeamMissing: taskCoreTeamMissing,
    toggleRaci: toggleRaci,
    removeTaskRole: removeTaskRole,
    addTaskRole: addTaskRole,
    addJobAid: addJobAid,
    removeJobAid: removeJobAid,
    toggleJobAidRole: toggleJobAidRole,
    jobAidRoleOn: jobAidRoleOn
  };
}]);
