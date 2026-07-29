[
  'MethodologyDomainService',
  function (MethodologyDomainService) {
  'use strict';

  var RACI_LETTERS = ['R', 'A', 'C', 'I'];
  var RACI_NAMES = {
    R: 'Responsible',
    A: 'Accountable',
    C: 'Consulted',
    I: 'Informed'
  };
  var RACI_HEX = {
    R: '#01cc52',
    A: '#e5c20b',
    C: '#3ec2f8',
    I: '#bdc2cb'
  };

  var raciMode = 'grid';
  var activePhases = null;
  var gridFocusRoleId = null;
  var byRoleFocusRoleId = null;
  var raciGrid = {
    roleIds: [],
    roleCounts: {},
    groups: [],
    byRoleGroups: []
  };

  function readState() {
    return {
      raciMode: raciMode,
      activePhases: activePhases,
      gridFocusRoleId: gridFocusRoleId,
      byRoleFocusRoleId: byRoleFocusRoleId,
      raciGrid: raciGrid
    };
  }

  function getActivePhases() {
    if (activePhases) {
      return Object.assign({}, activePhases);
    }
    return null;
  }

  function setActivePhases(map) {
    if (map) {
      activePhases = Object.assign({}, map);
    } else {
      activePhases = null;
    }
  }

  function ensureActivePhases(methodology) {
    if (!methodology || !methodology.phases) {
      return;
    }
    var phaseIds = methodology.phases.map(function (phase) {
      return phase.id;
    });
    var needsReset = !activePhases
      || Object.keys(activePhases).some(function (phaseId) {
        return phaseIds.indexOf(phaseId) < 0;
      });
    if (!needsReset) {
      return;
    }
    activePhases = {};
    phaseIds.forEach(function (phaseId) {
      activePhases[phaseId] = true;
    });
  }

  // Structure edits (add/delete a phase) call these directly instead of round-tripping through a
  // controller-owned "activePhases mirror" - in the multi-widget split, structure edits happen in
  // the Methodology widget while this state belongs to the RACI widget, so there is no single
  // controller left that could hand back such a mirror. ensureActivePhases() alone does not cover
  // "a phase was just ADDED to an already-active methodology" (it only resets on phase REMOVAL),
  // hence the explicit add/remove pair here.
  function activatePhase(phaseId) {
    if (!activePhases) {
      activePhases = {};
    }
    activePhases[phaseId] = true;
  }

  function deactivatePhase(phaseId) {
    if (activePhases) {
      delete activePhases[phaseId];
    }
  }

  function refresh(context) {
    var methodology = context && context.methodology;
    var sortJobTitleIds = context && context.sortJobTitleIds;
    var hasContent = context && context.hasContent;
    if (!methodology || !sortJobTitleIds || !hasContent) {
      raciGrid = {
        roleIds: [],
        roleCounts: {},
        groups: [],
        byRoleGroups: []
      };
      return readState();
    }

    ensureActivePhases(methodology);

    var roleIds = [];
    methodology.phases.forEach(function (phase) {
      phase.subPhases.forEach(function (subPhase) {
        if (!hasContent(subPhase)) {
          return;
        }
        (subPhase.tasks || []).forEach(function (task) {
          Object.keys(task.raci || {}).forEach(function (roleId) {
            if (roleIds.indexOf(roleId) < 0) {
              roleIds.push(roleId);
            }
          });
        });
      });
    });
    roleIds = sortJobTitleIds(roleIds);

    if (gridFocusRoleId && roleIds.indexOf(gridFocusRoleId) < 0) {
      gridFocusRoleId = null;
    }
    if (raciMode === 'byrole' && (!byRoleFocusRoleId || roleIds.indexOf(byRoleFocusRoleId) < 0)) {
      byRoleFocusRoleId = roleIds[0] || null;
    }

    var roleCounts = {};
    methodology.phases.forEach(function (phase) {
      if (!activePhases[phase.id]) {
        return;
      }
      phase.subPhases.forEach(function (subPhase) {
        if (!hasContent(subPhase)) {
          return;
        }
        (subPhase.tasks || []).forEach(function (task) {
          Object.keys(task.raci || {}).forEach(function (roleId) {
            roleCounts[roleId] = (roleCounts[roleId] || 0) + task.raci[roleId].length;
          });
        });
      });
    });

    var groups = [];
    var byRoleGroups = [];
    methodology.phases.forEach(function (phase, phaseIndex) {
      if (!activePhases[phase.id]) {
        return;
      }
      var color = MethodologyDomainService.phaseColor(phaseIndex);
      phase.subPhases.filter(hasContent).forEach(function (subPhase) {
        var rows;
        if (gridFocusRoleId) {
          rows = subPhase.tasks.filter(function (task) {
            return task.raci[gridFocusRoleId];
          });
        } else {
          rows = subPhase.tasks;
        }
        if (rows.length) {
          groups.push({
            phase: phase,
            subPhase: subPhase,
            color: color,
            rows: rows.map(function (task) {
              return {
                task: task
              };
            })
          });
        }
        if (byRoleFocusRoleId) {
          var matched = subPhase.tasks.filter(function (task) {
            return task.raci[byRoleFocusRoleId];
          });
          if (matched.length) {
            byRoleGroups.push({
              phase: phase,
              subPhase: subPhase,
              color: color,
              tasks: matched
            });
          }
        }
      });
    });

    raciGrid = {
      roleIds: roleIds,
      roleCounts: roleCounts,
      groups: groups,
      byRoleGroups: byRoleGroups
    };
    return readState();
  }

  function togglePhase(phaseId, context) {
    ensureActivePhases(context && context.methodology);
    activePhases[phaseId] = !activePhases[phaseId];
    return refresh(context);
  }

  function toggleCol(roleId, context) {
    if (gridFocusRoleId === roleId) {
      gridFocusRoleId = null;
    } else {
      gridFocusRoleId = roleId;
    }
    return refresh(context);
  }

  function clearFocus(context) {
    gridFocusRoleId = null;
    return refresh(context);
  }

  function setMode(mode, context) {
    raciMode = mode;
    return refresh(context);
  }

  function selectByRole(roleId, context) {
    byRoleFocusRoleId = roleId;
    return refresh(context);
  }

  function bindLegend(controller) {
    controller.raciLetters = RACI_LETTERS;
    controller.raciNames = RACI_NAMES;
    controller.raciHex = RACI_HEX;
  }

  return {
    LETTERS: RACI_LETTERS,
    NAMES: RACI_NAMES,
    HEX: RACI_HEX,
    readState: readState,
    getActivePhases: getActivePhases,
    setActivePhases: setActivePhases,
    ensureActivePhases: ensureActivePhases,
    activatePhase: activatePhase,
    deactivatePhase: deactivatePhase,
    refresh: refresh,
    togglePhase: togglePhase,
    toggleCol: toggleCol,
    clearFocus: clearFocus,
    setMode: setMode,
    selectByRole: selectByRole,
    bindLegend: bindLegend
  };
}]