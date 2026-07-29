/* Monotonic id counters and display sid derivation for structure/content edits. */
angular.module('deliveryMethodology').factory('IdSeqService', [function () {
  'use strict';

  var taskSeq = 1;
  var jobAidSeq = 1;
  var meetingSeq = 1;
  var changelogSeq = 1000;
  var phaseSeq = 1;
  var subPhaseSeq = 1;
  var methodologySeq = 1;

  function today() {
    var date = new Date();
    var month = date.getMonth() + 1;
    var day = date.getDate();
    return date.getFullYear() + '-' + (month < 10 ? '0' : '') + month + '-' + (day < 10 ? '0' : '') + day;
  }

  function deepClone(object) {
    return JSON.parse(JSON.stringify(object));
  }

  function idNum(prefix, id) {
    if (typeof id !== 'string') {
      return 0;
    }
    if (id.indexOf(prefix) !== 0) {
      return 0;
    }
    var number = parseInt(id.slice(prefix.length), 10);
    if (isNaN(number)) {
      return 0;
    }
    return number;
  }

  function seedFromMethodologies(methodologies) {
    (methodologies || []).forEach(function (methodology) {
      // Prefer the full 'methodology' prefix; still honor legacy 'methN' ids so harness
      // localStorage / older drafts do not reset the counter to 1.
      methodologySeq = Math.max(
        methodologySeq,
        idNum('methodology', methodology.id) + 1,
        idNum('meth', methodology.id) + 1
      );
      (methodology.phases || []).forEach(function (phase) {
        phaseSeq = Math.max(phaseSeq, idNum('phase', phase.id) + 1);
        (phase.subPhases || []).forEach(function (subPhase) {
          subPhaseSeq = Math.max(subPhaseSeq, idNum('subphase', subPhase.id) + 1);
          (subPhase.meetings || []).forEach(function (meeting) {
            meetingSeq = Math.max(meetingSeq, idNum('mt', meeting.id) + 1);
          });
          (subPhase.changelog || []).forEach(function (entry) {
            changelogSeq = Math.max(changelogSeq, idNum('c', entry.id) + 1);
          });
          (subPhase.tasks || []).forEach(function (task) {
            taskSeq = Math.max(taskSeq, idNum('t', task.id) + 1);
            (task.jobAids || []).forEach(function (jobAid) {
              jobAidSeq = Math.max(jobAidSeq, idNum('ja', jobAid.id) + 1);
            });
          });
        });
      });
    });
  }

  function next(kind) {
    if (kind === 'task') {
      return 't' + (taskSeq++);
    }
    if (kind === 'jobAid') {
      return 'ja' + (jobAidSeq++);
    }
    if (kind === 'meeting') {
      return 'mt' + (meetingSeq++);
    }
    if (kind === 'changelog') {
      return 'c' + (changelogSeq++);
    }
    if (kind === 'phase') {
      return 'phase' + (phaseSeq++);
    }
    if (kind === 'subPhase') {
      return 'subphase' + (subPhaseSeq++);
    }
    if (kind === 'methodology') {
      return 'methodology' + (methodologySeq++);
    }
    return '';
  }

  function recomputeSids(methodology) {
    (methodology.phases || []).forEach(function (phase, phaseIndex) {
      (phase.subPhases || []).forEach(function (subPhase, subPhaseIndex) {
        subPhase.sid = (phaseIndex + 1) + '.' + (subPhaseIndex + 1);
      });
    });
  }

  return {
    today: today,
    deepClone: deepClone,
    seedFromMethodologies: seedFromMethodologies,
    next: next,
    recomputeSids: recomputeSids
  };
}]);
