/* Sub-phase content edit mode: working copy, save/cancel, and field mutators.
   Bind host hooks once after the controller's location/persist helpers exist. */
angular.module('deliveryMethodology').factory('ContentEditService', [
  'ChangelogDiffService', 'IdSeqService',
  function (ChangelogDiffService, IdSeqService) {
  'use strict';

  var LOE_ROLE_DEFAULTS = {
    em: { billable: true, optional: false },
    bpc: { billable: true, optional: false },
    arch: { billable: true, optional: false },
    tc: { billable: true, optional: false },
    ux: { billable: true, optional: false },
    ae: { billable: false, optional: false },
    sa: { billable: false, optional: false },
    es: { billable: false, optional: true }
  };

  var CORE_TEAM = ['em', 'bpc', 'arch', 'tc'];

  var hooks = {};
  var state = {
    editMode: false,
    editSp: null,
    editSnapshot: null,
    tmpAddJt: {}
  };

  function bind(hostHooks) {
    hooks = hostHooks || {};
  }

  function isEditing() {
    return state.editMode;
  }

  function readState() {
    return {
      editMode: state.editMode,
      editSp: state.editSp,
      editSnapshot: state.editSnapshot,
      tmpAddJt: state.tmpAddJt
    };
  }

  function getEditSp() {
    return state.editSp;
  }

  function getEditSnapshot() {
    return state.editSnapshot;
  }

  function defaultLoeEntry(roleId) {
    var defaults = LOE_ROLE_DEFAULTS[roleId] || { billable: false, optional: false };
    return {
      text: '',
      billable: defaults.billable,
      optional: defaults.optional
    };
  }

  function collapseJobAidRoles(subPhase) {
    (subPhase.tasks || []).forEach(function (task) {
      var roleIds = hooks.sortJobTitleIds(Object.keys(task.raci || {}));
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
      hooks.denyEdit();
      return;
    }
    if (hooks.isStructureEditing && hooks.isStructureEditing()) {
      return;
    }
    var location = hooks.getLoc();
    state.editSnapshot = IdSeqService.deepClone(location.sp);
    state.editSp = IdSeqService.deepClone(location.sp);
    state.tmpAddJt = {};
    if (hooks.clearTmpLoeRole) {
      hooks.clearTmpLoeRole();
    }
    state.editMode = true;
    if (hooks.scrollToEditBar) {
      hooks.scrollToEditBar();
    }
  }

  function cancelEdit() {
    state.editMode = false;
    state.editSp = null;
    state.editSnapshot = null;
    if (hooks.showToast) {
      hooks.showToast('Edit cancelled - changes reverted');
    }
    if (hooks.scrollPageToTop) {
      hooks.scrollPageToTop();
    }
  }

  function saveEdit() {
    collapseJobAidRoles(state.editSp);
    var changes = ChangelogDiffService.describeChanges(state.editSnapshot, state.editSp, hooks.jobTitleById);
    var entries = [];
    var location = hooks.getLoc();
    var index = location.phase.subPhases.findIndex(function (subPhase) {
      return subPhase.id === state.editSp.id;
    });
    var previous = IdSeqService.deepClone(state.editSnapshot);
    var toSave = IdSeqService.deepClone(state.editSp);
    if (changes.length) {
      if (!toSave.changelog) {
        toSave.changelog = [];
      }
      entries = changes.map(function (text) {
        return {
          id: IdSeqService.next('changelog'),
          ts: IdSeqService.today(),
          text: text,
          read: false
        };
      });
      toSave.changelog.unshift.apply(toSave.changelog, entries);
    }
    location.phase.subPhases[index] = toSave;
    hooks.persistMethodologies().then(function () {
      state.editMode = false;
      state.editSp = null;
      state.editSnapshot = null;
      if (hooks.afterSaveSuccess) {
        hooks.afterSaveSuccess(entries, changes.length);
      }
      if (hooks.showToast) {
        if (changes.length) {
          hooks.showToast('Saved - ' + changes.length + ' change' + (changes.length > 1 ? 's' : '') + ' detected and logged automatically');
        } else {
          hooks.showToast('Saved - no changes detected');
        }
      }
      if (hooks.scrollPageToTop) {
        hooks.scrollPageToTop();
      }
    }, function () {
      location.phase.subPhases[index] = previous;
      if (hooks.afterSaveFailure) {
        hooks.afterSaveFailure(previous, index);
      }
      if (hooks.refreshLoc) {
        hooks.refreshLoc();
      }
    });
  }

  function participantOn(roleId) {
    return (state.editSp.participants || []).indexOf(roleId) >= 0;
  }

  function toggleParticipant(roleId) {
    if (!state.editSp.participants) {
      state.editSp.participants = [];
    }
    var index = state.editSp.participants.indexOf(roleId);
    if (index >= 0) {
      state.editSp.participants.splice(index, 1);
    } else {
      state.editSp.participants.push(roleId);
    }
  }

  function idleParticipants() {
    var used = {};
    (state.editSp.tasks || []).forEach(function (task) {
      Object.keys(task.raci || {}).forEach(function (roleId) {
        if (task.raci[roleId] && task.raci[roleId].length) {
          used[roleId] = true;
        }
      });
    });
    return hooks.participantsOf(state.editSp).filter(function (role) {
      return !used[role.id];
    });
  }

  function addListItem(kind) {
    state.editSp[kind].push('');
  }

  function removeListItem(kind, index) {
    state.editSp[kind].splice(index, 1);
  }

  function moveListItem(kind, index, direction) {
    var array = state.editSp[kind];
    var swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= array.length) {
      return;
    }
    var temporary = array[index];
    array[index] = array[swapIndex];
    array[swapIndex] = temporary;
  }

  function setLoeMode(mode) {
    state.editSp.levelOfEffort.mode = mode;
    if (mode === 'byRole' && !Object.keys(state.editSp.levelOfEffort.roles || {}).length) {
      if (!state.editSp.levelOfEffort.roles) {
        state.editSp.levelOfEffort.roles = {};
      }
      hooks.participantsOf(state.editSp).filter(function (role) {
        return !role.external;
      }).forEach(function (role) {
        state.editSp.levelOfEffort.roles[role.id] = defaultLoeEntry(role.id);
      });
    }
  }

  function loeAvailableRoles() {
    var used = Object.keys(state.editSp.levelOfEffort.roles || {});
    return hooks.participantsOf(state.editSp).filter(function (role) {
      return !role.external && used.indexOf(role.id) < 0;
    });
  }

  function addLoeRole() {
    var roleId = hooks.getTmpLoeRole ? hooks.getTmpLoeRole() : '';
    if (!roleId) {
      return;
    }
    if (!state.editSp.levelOfEffort.roles) {
      state.editSp.levelOfEffort.roles = {};
    }
    state.editSp.levelOfEffort.roles[roleId] = defaultLoeEntry(roleId);
    if (hooks.clearTmpLoeRole) {
      hooks.clearTmpLoeRole();
    }
  }

  function removeLoeRole(roleId) {
    delete state.editSp.levelOfEffort.roles[roleId];
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
    return (state.editSp.participants || []).indexOf(roleId) < 0;
  }

  function loeRoleRows() {
    return hooks.sortJobTitleIds(Object.keys(state.editSp.levelOfEffort.roles || {}))
      .map(hooks.jobTitleById).filter(Boolean);
  }

  function addMeeting() {
    state.editSp.meetings.push({
      id: IdSeqService.next('meeting'),
      name: '',
      scheduledBy: '',
      ledBy: '',
      external: false
    });
  }

  function removeMeeting(index) {
    state.editSp.meetings.splice(index, 1);
  }

  function moveMeeting(index, direction) {
    var array = state.editSp.meetings;
    var swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= array.length) {
      return;
    }
    var temporary = array[index];
    array[index] = array[swapIndex];
    array[swapIndex] = temporary;
  }

  function internalRoles() {
    return hooks.participantsOf(state.editSp).filter(function (role) {
      return !role.external;
    });
  }

  function meetingPersonOrphan(roleId) {
    return !!roleId && (state.editSp.participants || []).indexOf(roleId) < 0;
  }

  function addTask() {
    state.editSp.tasks.push({
      id: IdSeqService.next('task'),
      order: state.editSp.tasks.length + 1,
      text: '',
      jobAids: [],
      raci: {}
    });
  }

  function removeTask(index) {
    state.editSp.tasks.splice(index, 1);
  }

  function moveTask(index, direction) {
    var array = state.editSp.tasks;
    var swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= array.length) {
      return;
    }
    var temporary = array[index];
    array[index] = array[swapIndex];
    array[swapIndex] = temporary;
    array.forEach(function (task, orderIndex) {
      task.order = orderIndex + 1;
    });
  }

  function taskRaciRoles(task) {
    return hooks.sortJobTitleIds(Object.keys(task.raci || {})).map(hooks.jobTitleById).filter(Boolean);
  }

  function taskRoleOrphan(roleId) {
    return (state.editSp.participants || []).indexOf(roleId) < 0;
  }

  function taskAvailableRoles(task) {
    var used = Object.keys(task.raci || {});
    return hooks.participantsOf(state.editSp).filter(function (role) {
      return used.indexOf(role.id) < 0;
    });
  }

  function taskCoreTeamMissing(task) {
    var used = Object.keys(task.raci || {});
    var participating = state.editSp.participants || [];
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
      letters.sort(function (left, right) {
        return hooks.raciLetters().indexOf(left) - hooks.raciLetters().indexOf(right);
      });
    }
  }

  function removeTaskRole(task, roleId) {
    delete task.raci[roleId];
  }

  function addTaskRole(task, roleId) {
    if (!roleId) {
      return;
    }
    if (roleId === '__core__') {
      var participating = state.editSp.participants || [];
      CORE_TEAM.forEach(function (coreRoleId) {
        if (participating.indexOf(coreRoleId) >= 0 && !task.raci[coreRoleId]) {
          task.raci[coreRoleId] = [];
        }
      });
      return;
    }
    if (!task.raci[roleId]) {
      task.raci[roleId] = [];
    }
  }

  function addJobAid(task) {
    if (!Array.isArray(task.jobAids)) {
      task.jobAids = [];
    }
    task.jobAids.push({
      id: IdSeqService.next('jobAid'),
      url: '',
      roles: []
    });
  }

  function removeJobAid(task, index) {
    task.jobAids.splice(index, 1);
  }

  function toggleJobAidRole(task, jobAid, roleId) {
    var roleIds = hooks.sortJobTitleIds(Object.keys(task.raci || {}));
    var array = (jobAid.roles && jobAid.roles.length) ? jobAid.roles.slice() : roleIds.slice();
    var index = array.indexOf(roleId);
    if (index >= 0) {
      array.splice(index, 1);
    } else {
      array.push(roleId);
    }
    jobAid.roles = (roleIds.length && roleIds.every(function (role) {
      return array.indexOf(role) >= 0;
    })) ? [] : array;
  }

  function jobAidRoleOn(task, jobAid, roleId) {
    return !jobAid.roles || !jobAid.roles.length || jobAid.roles.indexOf(roleId) >= 0;
  }

  return {
    bind: bind,
    state: state,
    isEditing: isEditing,
    readState: readState,
    getEditSp: getEditSp,
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
