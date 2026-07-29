[function () {
  'use strict';

  var JOB_TITLE_ORDER = ['em', 'bpc', 'arch', 'tc', 'ux'];

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

  function curMeth(methodologies, methodologyId) {
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
    return (jobTitle && jobTitle.external) ? 'var(--ink-soft)' : 'var(--ink-soft)';
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
        return leftExternal ? 1 : -1;
      }
      var leftIndex = JOB_TITLE_ORDER.indexOf(leftId);
      var rightIndex = JOB_TITLE_ORDER.indexOf(rightId);
      return (leftIndex === -1 ? 999 : leftIndex) - (rightIndex === -1 ? 999 : rightIndex);
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
            meth: methodology,
            phase: phase,
            phaseIndex: phaseIndex,
            sp: subPhase
          };
        }
      }
    }
    return null;
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
    curMeth: curMeth,
    jobTitleById: jobTitleById,
    jobTitleColor: jobTitleColor,
    sortJobTitleIds: sortJobTitleIds,
    isExternalJobTitle: isExternalJobTitle,
    findSubPhase: findSubPhase,
    participantsOf: participantsOf,
    taskTableRoles: taskTableRoles,
    computeLoeRows: computeLoeRows,
    backfillParticipants: backfillParticipants,
    deriveParticipantIdsFromTasks: deriveParticipantIdsFromTasks
  };
}]