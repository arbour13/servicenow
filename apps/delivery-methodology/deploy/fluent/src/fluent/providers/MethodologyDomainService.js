[function () {
  'use strict';

  var JOB_TITLE_ORDER = ['em', 'bpc', 'arch', 'tc', 'ux'];
  // CSS var references (not literal hexes) so consumers stay theme-aware.
  var PHASE_COLORS = ['var(--p1)', 'var(--p2)', 'var(--p3)', 'var(--p4)', 'var(--p5)'];

  function phaseColor(phaseIndex) {
    return PHASE_COLORS[phaseIndex % PHASE_COLORS.length];
  }

  function hasContent(subPhase) {
    return !!(subPhase && (subPhase.overview || subPhase.objective
      || (subPhase.tasks && subPhase.tasks.length) || (subPhase.participants && subPhase.participants.length)
      || (subPhase.comments && subPhase.comments.length) || (subPhase.meetings && subPhase.meetings.length)
      || (subPhase.inputs && subPhase.inputs.length) || (subPhase.deliverables && subPhase.deliverables.length)));
  }

  function firstContentSubPhase(methodology) {
    if (!methodology || !methodology.phases) {
      return null;
    }
    for (var phaseIndex = 0; phaseIndex < methodology.phases.length; phaseIndex++) {
      var writtenSubPhase = (methodology.phases[phaseIndex].subPhases || []).find(hasContent);
      if (writtenSubPhase) {
        return writtenSubPhase.id;
      }
    }
    for (var fallbackPhaseIndex = 0; fallbackPhaseIndex < methodology.phases.length; fallbackPhaseIndex++) {
      var subPhases = methodology.phases[fallbackPhaseIndex].subPhases || [];
      if (subPhases.length) {
        return subPhases[0].id;
      }
    }
    return null;
  }

  function currentMethodology(methodologies, methodologyId) {
    return (methodologies || []).find(function (methodology) {
      return methodology.id === methodologyId;
    });
  }

  function jobTitleById(jobTitles, jobTitleId) {
    return (jobTitles || []).find(function (jobTitle) {
      return jobTitle.id === jobTitleId;
    });
  }

  function jobTitleColor(jobTitles, jobTitleId) {
    var jobTitle = jobTitleById(jobTitles, jobTitleId);
    if (jobTitle && jobTitle.external) {
      return 'var(--ink-soft)';
    }
    return 'var(--ink-soft)';
  }

  function isExternalJobTitle(jobTitles, jobTitleId) {
    var jobTitle = jobTitleById(jobTitles, jobTitleId);
    return !!(jobTitle && jobTitle.external);
  }

  function sortJobTitleIds(jobTitles, jobTitleIds) {
    return (jobTitleIds || []).slice().sort(function (leftId, rightId) {
      var leftExternal = isExternalJobTitle(jobTitles, leftId);
      var rightExternal = isExternalJobTitle(jobTitles, rightId);
      if (leftExternal !== rightExternal) {
        if (leftExternal) {
          return 1;
        }
        return -1;
      }
      var leftIndex = JOB_TITLE_ORDER.indexOf(leftId);
      var rightIndex = JOB_TITLE_ORDER.indexOf(rightId);
      var leftRank = 999;
      var rightRank = 999;
      if (leftIndex !== -1) {
        leftRank = leftIndex;
      }
      if (rightIndex !== -1) {
        rightRank = rightIndex;
      }
      return leftRank - rightRank;
    });
  }

  function findSubPhase(methodologies, subPhaseId) {
    for (var methodologyIndex = 0; methodologyIndex < (methodologies || []).length; methodologyIndex++) {
      var methodology = methodologies[methodologyIndex];
      for (var phaseIndex = 0; phaseIndex < (methodology.phases || []).length; phaseIndex++) {
        var phase = methodology.phases[phaseIndex];
        var subPhase = (phase.subPhases || []).find(function (candidate) {
          return candidate.id === subPhaseId;
        });
        if (subPhase) {
          return {
            methodology: methodology,
            phase: phase,
            phaseIndex: phaseIndex,
            subPhase: subPhase
          };
        }
      }
    }
    return null;
  }

  // Deep links can use display sids (1.2) when the stable seed id is unknown. Optional
  // methodologyId disambiguates Project vs GRS (both have a 1.2).
  function findSubPhaseBySid(methodologies, sid, methodologyId) {
    if (!sid) {
      return null;
    }
    var want = String(sid);
    var match = null;
    for (var methodologyIndex = 0; methodologyIndex < (methodologies || []).length; methodologyIndex++) {
      var methodology = methodologies[methodologyIndex];
      if (methodologyId && methodology.id !== methodologyId) {
        continue;
      }
      for (var phaseIndex = 0; phaseIndex < (methodology.phases || []).length; phaseIndex++) {
        var phase = methodology.phases[phaseIndex];
        var subPhase = (phase.subPhases || []).find(function (candidate) {
          return String(candidate.sid) === want;
        });
        if (subPhase) {
          match = {
            methodology: methodology,
            phase: phase,
            phaseIndex: phaseIndex,
            subPhase: subPhase
          };
          if (methodologyId) {
            return match;
          }
          // Prefer the first methodology (seed order: Project before GRS) when meth is omitted.
          return match;
        }
      }
    }
    return match;
  }

  function participantsOf(jobTitles, subPhase) {
    return sortJobTitleIds(jobTitles, subPhase && subPhase.participants).map(function (jobTitleId) {
      return jobTitleById(jobTitles, jobTitleId);
    }).filter(Boolean);
  }

  function taskTableRoles(jobTitles, subPhase) {
    var participantIds = subPhase.participants || [];
    var roleIds = participantIds.slice();
    (subPhase.tasks || []).forEach(function (task) {
      Object.keys(task.raci || {}).forEach(function (jobTitleId) {
        if (roleIds.indexOf(jobTitleId) < 0) {
          roleIds.push(jobTitleId);
        }
      });
    });
    return sortJobTitleIds(jobTitles, roleIds).map(function (jobTitleId) {
      var jobTitle = jobTitleById(jobTitles, jobTitleId);
      if (!jobTitle) {
        return null;
      }
      return {
        id: jobTitle.id,
        abbr: jobTitle.abbr,
        name: jobTitle.name,
        description: jobTitle.description,
        external: jobTitle.external,
        orphan: participantIds.indexOf(jobTitleId) < 0
      };
    }).filter(Boolean);
  }

  function computeLoeRows(jobTitles, subPhase) {
    var levelOfEffort = subPhase.levelOfEffort || {
      mode: 'all',
      all: {},
      roles: {}
    };
    if (levelOfEffort.mode === 'all') {
      var allParticipants = levelOfEffort.all || {};
      if (!allParticipants.text && !allParticipants.billable && !allParticipants.optional) {
        return {
          mode: 'all',
          rows: []
        };
      }
      return {
        mode: 'all',
        rows: [{
          label: 'All participants',
          text: allParticipants.text,
          billable: allParticipants.billable,
          optional: allParticipants.optional
        }]
      };
    }
    var rows = sortJobTitleIds(jobTitles, Object.keys(levelOfEffort.roles || {})).map(function (jobTitleId) {
      return jobTitleById(jobTitles, jobTitleId);
    }).filter(Boolean).filter(function (jobTitle) {
      return levelOfEffort.roles[jobTitle.id] && levelOfEffort.roles[jobTitle.id].text;
    }).map(function (jobTitle) {
      var roleEffort = levelOfEffort.roles[jobTitle.id];
      return {
        label: jobTitle.abbr,
        name: jobTitle.name,
        description: jobTitle.description,
        text: roleEffort.text,
        billable: roleEffort.billable,
        optional: roleEffort.optional,
        color: jobTitleColor(jobTitles, jobTitle.id)
      };
    });
    return {
      mode: 'roles',
      rows: rows
    };
  }

  function deriveParticipantIdsFromTasks(subPhase) {
    var participantIds = [];
    (subPhase.tasks || []).forEach(function (task) {
      Object.keys(task.raci || {}).forEach(function (jobTitleId) {
        if (participantIds.indexOf(jobTitleId) < 0) {
          participantIds.push(jobTitleId);
        }
      });
    });
    return participantIds;
  }

  function backfillParticipants(methodologies) {
    (methodologies || []).forEach(function (methodology) {
      (methodology.phases || []).forEach(function (phase) {
        (phase.subPhases || []).forEach(function (subPhase) {
          if (!subPhase.participants || !subPhase.participants.length) {
            subPhase.participants = deriveParticipantIdsFromTasks(subPhase);
          }
        });
      });
    });
  }

  return {
    hasContent: hasContent,
    firstContentSubPhase: firstContentSubPhase,
    currentMethodology: currentMethodology,
    jobTitleById: jobTitleById,
    jobTitleColor: jobTitleColor,
    sortJobTitleIds: sortJobTitleIds,
    isExternalJobTitle: isExternalJobTitle,
    findSubPhase: findSubPhase,
    findSubPhaseBySid: findSubPhaseBySid,
    participantsOf: participantsOf,
    taskTableRoles: taskTableRoles,
    computeLoeRows: computeLoeRows,
    backfillParticipants: backfillParticipants,
    deriveParticipantIdsFromTasks: deriveParticipantIdsFromTasks,
    phaseColor: phaseColor
  };
}]