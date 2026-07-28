[function () {
  'use strict';

  var jobAids = [];

  function jobAidScope(task, jobAid, sortJobTitleIds, jobTitleById) {
    if (!jobAid.roles || !jobAid.roles.length) { return []; }
    return sortJobTitleIds(jobAid.roles).map(jobTitleById).filter(Boolean);
  }

  function refresh(methodologies, sortJobTitleIds, jobTitleById) {
    var aids = [];
    (methodologies || []).forEach(function (methodology) {
      methodology.phases.forEach(function (phase) {
        phase.subPhases.forEach(function (subPhase) {
          (subPhase.tasks || []).forEach(function (task) {
            (task.jobAids || []).forEach(function (aid) {
              if (!aid.url) { return; }
              aids.push({
                m: methodology,
                p: phase,
                s: subPhase,
                t: task,
                j: aid,
                scope: jobAidScope(task, aid, sortJobTitleIds, jobTitleById)
              });
            });
          });
        });
      });
    });
    jobAids = aids;
    return jobAids;
  }

  function readState() {
    return { jobAids: jobAids };
  }

  return {
    jobAidScope: jobAidScope,
    refresh: refresh,
    readState: readState
  };
}]