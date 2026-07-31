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

  /* A role is "minor" when it carries a RACI letter on fewer than this share of the currently
     visible tasks, and the grid hides its column until the reader asks for it. Measured against
     the real methodology: four roles sit at 91-99% of tasks and the other seven at 1-9%, so over
     half the grid's width was rendering dashes. The gap between those two clusters is wide enough
     that anything from ~0.10 to ~0.85 splits them identically - 0.10 is chosen as the conservative
     end of that range, so a role has to be genuinely peripheral to drop out.
     Deliberately a SHARE, not a fixed count: roleTaskCounts is computed over the active phase
     filters only, so filtering down to one phase re-evaluates which roles are peripheral there
     rather than judging them against the whole engagement. No role is ever unreachable - By Role
     mode still lists every role, and the toggle reveals the hidden columns in place. */
  var MINOR_ROLE_SHARE = 0.1;

  var raciMode = 'grid';
  var activePhases = null;
  var lastRefreshedMethodologyId = null;
  var gridFocusRoleId = null;
  var byRoleFocusRoleId = null;
  var showAllRoles = false;
  var raciGrid = {
    roleIds: [],
    visibleRoleIds: [],
    minorRoleIds: [],
    roleCounts: {},
    roleTaskCounts: {},
    groups: [],
    byRoleGroups: []
  };

  function readState() {
    return {
      raciMode: raciMode,
      activePhases: activePhases ? Object.assign({}, activePhases) : null,
      gridFocusRoleId: gridFocusRoleId,
      byRoleFocusRoleId: byRoleFocusRoleId,
      showAllRoles: showAllRoles,
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
    if (needsReset) {
      activePhases = {};
      phaseIds.forEach(function (phaseId) {
        activePhases[phaseId] = true;
      });
      return;
    }
    phaseIds.forEach(function (phaseId) {
      if (!Object.prototype.hasOwnProperty.call(activePhases, phaseId)) {
        activePhases[phaseId] = true;
      }
    });
  }

  // Structure edits (add/delete a phase) call these directly instead of round-tripping through a
  // controller-owned "activePhases mirror" - in the multi-widget split, structure edits happen in
  // the Methodology widget while this state belongs to the RACI widget, so there is no single
  // controller left that could hand back such a mirror. ensureActivePhases() alone does not cover
  // "a phase was just ADDED to an already-active methodology" (it only resets on phase REMOVAL),
  // hence the explicit add/remove pair here.
  function activatePhase(phaseId) {
    // Only mutate an existing all-phases map. Creating a one-key object here would leave every
    // other phase filtered out until the next full ensureActivePhases reset.
    if (!activePhases) {
      return;
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
        visibleRoleIds: [],
        minorRoleIds: [],
        roleCounts: {},
        roleTaskCounts: {},
        groups: [],
        byRoleGroups: []
      };
      lastRefreshedMethodologyId = null;
      return readState();
    }

    if (methodology.id !== lastRefreshedMethodologyId) {
      activePhases = null;
      gridFocusRoleId = null;
      lastRefreshedMethodologyId = methodology.id;
    }

    ensureActivePhases(methodology);

    var roleIds = [];
    methodology.phases.forEach(function (phase) {
      (phase.subPhases || []).forEach(function (subPhase) {
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

    // roleCounts sums RACI LETTERS (a task can give one role both A and R) and is what the column
    // header / totals row show. roleTaskCounts counts DISTINCT TASKS and is what the minor-role
    // test uses - "on 9% of tasks" is the honest statement, where a letter sum would overstate a
    // role that doubles up. Both are gated by the same active-phase + hasContent filters as the
    // rows below, so every figure describes exactly what is on screen.
    var roleCounts = {};
    var roleTaskCounts = {};
    var visibleTaskTotal = 0;
    methodology.phases.forEach(function (phase) {
      if (!activePhases[phase.id]) {
        return;
      }
      (phase.subPhases || []).forEach(function (subPhase) {
        if (!hasContent(subPhase)) {
          return;
        }
        (subPhase.tasks || []).forEach(function (task) {
          visibleTaskTotal = visibleTaskTotal + 1;
          Object.keys(task.raci || {}).forEach(function (roleId) {
            roleCounts[roleId] = (roleCounts[roleId] || 0) + task.raci[roleId].length;
            roleTaskCounts[roleId] = (roleTaskCounts[roleId] || 0) + 1;
          });
        });
      });
    });

    var minorRoleIds = roleIds.filter(function (roleId) {
      return (roleTaskCounts[roleId] || 0) < visibleTaskTotal * MINOR_ROLE_SHARE;
    });
    var visibleRoleIds = roleIds.filter(function (roleId) {
      if (showAllRoles || minorRoleIds.indexOf(roleId) < 0) {
        return true;
      }
      // A focused role always keeps its column - focusing a minor role from By Role and coming
      // back to Grid must not hide the very column being focused.
      return gridFocusRoleId === roleId;
    });

    var groups = [];
    var byRoleGroups = [];
    methodology.phases.forEach(function (phase, phaseIndex) {
      if (!activePhases[phase.id]) {
        return;
      }
      var color = MethodologyDomainService.phaseColor(phaseIndex);
      (phase.subPhases || []).filter(hasContent).forEach(function (subPhase) {
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
      visibleRoleIds: visibleRoleIds,
      minorRoleIds: minorRoleIds,
      // Actual columns withheld right now - NOT minorRoleIds.length, which overstates by one
      // whenever a focused minor role is being kept visible.
      hiddenRoleCount: roleIds.length - visibleRoleIds.length,
      roleCounts: roleCounts,
      roleTaskCounts: roleTaskCounts,
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

  function toggleColumn(roleId, context) {
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

  function toggleShowAllRoles(context) {
    showAllRoles = !showAllRoles;
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

  function sortLetters(letters) {
    return (letters || []).slice().sort(function (left, right) {
      return RACI_LETTERS.indexOf(left) - RACI_LETTERS.indexOf(right);
    });
  }

  // Display and tips iterate letter arrays in stored order — keep every task's letters in
  // R-A-C-I sequence so "RA" never renders as "AR" (or "CI" as "IC") after load/edit/import.
  function normalizeMethodologies(methodologies) {
    (methodologies || []).forEach(function (methodology) {
      (methodology.phases || []).forEach(function (phase) {
        (phase.subPhases || []).forEach(function (subPhase) {
          (subPhase.tasks || []).forEach(function (task) {
            var raci = task && task.raci;
            if (!raci) {
              return;
            }
            Object.keys(raci).forEach(function (roleId) {
              raci[roleId] = sortLetters(raci[roleId]);
            });
          });
        });
      });
    });
  }

  return {
    LETTERS: RACI_LETTERS,
    NAMES: RACI_NAMES,
    HEX: RACI_HEX,
    sortLetters: sortLetters,
    normalizeMethodologies: normalizeMethodologies,
    readState: readState,
    getActivePhases: getActivePhases,
    setActivePhases: setActivePhases,
    ensureActivePhases: ensureActivePhases,
    activatePhase: activatePhase,
    deactivatePhase: deactivatePhase,
    refresh: refresh,
    togglePhase: togglePhase,
    toggleColumn: toggleColumn,
    clearFocus: clearFocus,
    toggleShowAllRoles: toggleShowAllRoles,
    setMode: setMode,
    selectByRole: selectByRole,
    bindLegend: bindLegend
  };
}]