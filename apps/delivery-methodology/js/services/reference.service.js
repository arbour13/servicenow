/* Reference view job-aids index. Methodology view also uses jobAidScope for per-task chips.
   Two shapes from one walk: `jobAids` (flat, for the count badge and search) and `jobAidGroups`
   (grouped by methodology+phase, one entry per TASK with that task's aids together - the index
   used to render one row per aid, which repeated the task line whenever a task carried two aids
   and read as duplicate entries). */
angular.module('deliveryMethodology').factory('ReferenceService', [function () {
  'use strict';

  var jobAids = [];
  var jobAidGroups = [];

  function jobAidScope(task, jobAid, sortJobTitleIds, jobTitleById) {
    if (!jobAid.roles || !jobAid.roles.length) {
      return [];
    }
    return sortJobTitleIds(jobAid.roles).map(jobTitleById).filter(Boolean);
  }

  function refresh(methodologies, sortJobTitleIds, jobTitleById) {
    var aids = [];
    var groups = [];

    (methodologies || []).forEach(function (methodology) {
      methodology.phases.forEach(function (phase) {
        var group = null;

        phase.subPhases.forEach(function (subPhase) {
          (subPhase.tasks || []).forEach(function (task) {
            var taskEntry = null;

            (task.jobAids || []).forEach(function (jobAid) {
              if (!jobAid.url) {
                return;
              }

              var aid = {
                methodology: methodology,
                phase: phase,
                subPhase: subPhase,
                task: task,
                jobAid: jobAid,
                scope: jobAidScope(task, jobAid, sortJobTitleIds, jobTitleById)
              };
              aids.push(aid);

              if (!group) {
                group = {
                  methodology: methodology,
                  phase: phase,
                  entries: []
                };
                groups.push(group);
              }

              if (!taskEntry) {
                taskEntry = {
                  methodology: methodology,
                  phase: phase,
                  subPhase: subPhase,
                  task: task,
                  aids: []
                };
                group.entries.push(taskEntry);
              }

              taskEntry.aids.push(aid);
            });
          });
        });
      });
    });

    jobAids = aids;
    jobAidGroups = groups;
    return jobAids;
  }

  function readState() {
    return {
      jobAids: jobAids,
      jobAidGroups: jobAidGroups
    };
  }

  return {
    jobAidScope: jobAidScope,
    refresh: refresh,
    readState: readState
  };
}]);
