[function () {
  'use strict';

  var PHASE_COLORS = ['var(--p1)', 'var(--p2)', 'var(--p3)', 'var(--p4)', 'var(--p5)'];

  var raciMode = 'grid';
  var rgActivePhases = null;
  var rgGridFocusJob = null;
  var rgByRoleFocusJob = null;
  var rg = { ids: [], counts: {}, groups: [], byRoleGroups: [] };

  function readState() {
    return {
      raciMode: raciMode,
      rgActivePhases: rgActivePhases,
      rgGridFocusJob: rgGridFocusJob,
      rgByRoleFocusJob: rgByRoleFocusJob,
      rg: rg
    };
  }

  function getActivePhases() {
    return rgActivePhases ? Object.assign({}, rgActivePhases) : null;
  }

  function setActivePhases(map) {
    rgActivePhases = map ? Object.assign({}, map) : null;
  }

  function ensureActivePhases(methodology) {
    if (!methodology || !methodology.phases) { return; }
    var phaseIds = methodology.phases.map(function (phase) { return phase.id; });
    var needsReset = !rgActivePhases
      || Object.keys(rgActivePhases).some(function (phaseId) { return phaseIds.indexOf(phaseId) < 0; });
    if (!needsReset) { return; }
    rgActivePhases = {};
    phaseIds.forEach(function (phaseId) { rgActivePhases[phaseId] = true; });
  }

  function refresh(context) {
    var methodology = context && context.methodology;
    var sortJobTitleIds = context && context.sortJobTitleIds;
    var hasContent = context && context.hasContent;
    if (!methodology || !sortJobTitleIds || !hasContent) {
      rg = { ids: [], counts: {}, groups: [], byRoleGroups: [] };
      return readState();
    }

    ensureActivePhases(methodology);

    var roleIds = [];
    methodology.phases.forEach(function (phase) {
      phase.subPhases.forEach(function (subPhase) {
        if (!hasContent(subPhase)) { return; }
        (subPhase.tasks || []).forEach(function (task) {
          Object.keys(task.raci || {}).forEach(function (roleId) {
            if (roleIds.indexOf(roleId) < 0) { roleIds.push(roleId); }
          });
        });
      });
    });
    roleIds = sortJobTitleIds(roleIds);

    if (rgGridFocusJob && roleIds.indexOf(rgGridFocusJob) < 0) {
      rgGridFocusJob = null;
    }
    if (raciMode === 'byrole' && (!rgByRoleFocusJob || roleIds.indexOf(rgByRoleFocusJob) < 0)) {
      rgByRoleFocusJob = roleIds[0] || null;
    }

    var counts = {};
    methodology.phases.forEach(function (phase) {
      if (!rgActivePhases[phase.id]) { return; }
      phase.subPhases.forEach(function (subPhase) {
        if (!hasContent(subPhase)) { return; }
        (subPhase.tasks || []).forEach(function (task) {
          Object.keys(task.raci || {}).forEach(function (roleId) {
            counts[roleId] = (counts[roleId] || 0) + task.raci[roleId].length;
          });
        });
      });
    });

    var groups = [];
    var byRoleGroups = [];
    methodology.phases.forEach(function (phase, phaseIndex) {
      if (!rgActivePhases[phase.id]) { return; }
      var color = PHASE_COLORS[phaseIndex % PHASE_COLORS.length];
      phase.subPhases.filter(hasContent).forEach(function (subPhase) {
        var rows = rgGridFocusJob
          ? subPhase.tasks.filter(function (task) { return task.raci[rgGridFocusJob]; })
          : subPhase.tasks;
        if (rows.length) {
          groups.push({
            phase: phase,
            sp: subPhase,
            color: color,
            rows: rows.map(function (task) { return { task: task }; })
          });
        }
        if (rgByRoleFocusJob) {
          var matched = subPhase.tasks.filter(function (task) { return task.raci[rgByRoleFocusJob]; });
          if (matched.length) {
            byRoleGroups.push({ phase: phase, sp: subPhase, color: color, tasks: matched });
          }
        }
      });
    });

    rg = { ids: roleIds, counts: counts, groups: groups, byRoleGroups: byRoleGroups };
    return readState();
  }

  function togglePhase(phaseId, context) {
    ensureActivePhases(context && context.methodology);
    rgActivePhases[phaseId] = !rgActivePhases[phaseId];
    return refresh(context);
  }

  function toggleCol(roleId, context) {
    rgGridFocusJob = (rgGridFocusJob === roleId) ? null : roleId;
    return refresh(context);
  }

  function clearFocus(context) {
    rgGridFocusJob = null;
    return refresh(context);
  }

  function setMode(mode, context) {
    raciMode = mode;
    return refresh(context);
  }

  function selectByRole(roleId, context) {
    rgByRoleFocusJob = roleId;
    return refresh(context);
  }

  return {
    readState: readState,
    getActivePhases: getActivePhases,
    setActivePhases: setActivePhases,
    ensureActivePhases: ensureActivePhases,
    refresh: refresh,
    togglePhase: togglePhase,
    toggleCol: toggleCol,
    clearFocus: clearFocus,
    setMode: setMode,
    selectByRole: selectByRole
  };
}]