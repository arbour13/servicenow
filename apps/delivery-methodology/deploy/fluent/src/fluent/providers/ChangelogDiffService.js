[function () {
  'use strict';

  function truncateText(text, maxLength) {
    var value = String(text);
    if (value.length <= maxLength) {
      return value;
    }
    return value.slice(0, maxLength - 1) + '…';
  }

  function uniqueKeys(keys) {
    return keys.filter(function (value, index, list) {
      return list.indexOf(value) === index;
    });
  }

  function abbreviationFor(jobTitleById, roleId) {
    var jobTitle = jobTitleById(roleId);
    if (jobTitle) {
      return jobTitle.abbr;
    }
    return roleId;
  }

  // True only for a pure reorder: same ids/counts, different positions.
  function idSequenceChanged(beforeIds, afterIds) {
    if (beforeIds.length !== afterIds.length) {
      return false;
    }

    var sortedBefore = beforeIds.slice().sort();
    var sortedAfter = afterIds.slice().sort();
    for (var sortIndex = 0; sortIndex < sortedBefore.length; sortIndex++) {
      if (sortedBefore[sortIndex] !== sortedAfter[sortIndex]) {
        return false;
      }
    }

    for (var orderIndex = 0; orderIndex < beforeIds.length; orderIndex++) {
      if (beforeIds[orderIndex] !== afterIds[orderIndex]) {
        return true;
      }
    }
    return false;
  }

  // Multiset counts so duplicate strings add/remove correctly; reorder when counts match.
  function describeListFieldChanges(before, after, label) {
    before = before || [];
    after = after || [];
    var descriptions = [];
    var beforeCount = {};
    var afterCount = {};

    before.forEach(function (item) {
      beforeCount[item] = (beforeCount[item] || 0) + 1;
    });
    after.forEach(function (item) {
      afterCount[item] = (afterCount[item] || 0) + 1;
    });

    uniqueKeys(Object.keys(beforeCount).concat(Object.keys(afterCount))).forEach(function (item) {
      var delta = (afterCount[item] || 0) - (beforeCount[item] || 0);
      var addedIndex;
      var removedIndex;
      for (addedIndex = 0; addedIndex < delta; addedIndex++) {
        descriptions.push(label + ' added: “' + truncateText(item, 60) + '”');
      }
      for (removedIndex = 0; removedIndex < -delta; removedIndex++) {
        descriptions.push(label + ' removed: “' + truncateText(item, 60) + '”');
      }
    });

    if (!descriptions.length && idSequenceChanged(before, after)) {
      descriptions.push(label + 's reordered');
    }
    return descriptions;
  }

  function describeRaciChanges(before, after, taskLabel, jobTitleById) {
    before = before || {};
    after = after || {};
    var roleIds = uniqueKeys(Object.keys(before).concat(Object.keys(after)));
    var descriptions = [];

    roleIds.forEach(function (roleId) {
      var beforeLetters = (before[roleId] || []).join('');
      var afterLetters = (after[roleId] || []).join('');
      if (beforeLetters === afterLetters) {
        return;
      }

      var abbreviation = abbreviationFor(jobTitleById, roleId);
      if (!beforeLetters) {
        descriptions.push('RACI added on “' + taskLabel + '”: ' + abbreviation + ' (' + afterLetters + ')');
      } else if (!afterLetters) {
        descriptions.push('RACI removed on “' + taskLabel + '”: ' + abbreviation);
      } else {
        descriptions.push('RACI changed on “' + taskLabel + '”: ' + abbreviation + ' ' + beforeLetters + ' → ' + afterLetters);
      }
    });
    return descriptions;
  }

  function levelOfEffortEntrySame(beforeEntry, afterEntry) {
    beforeEntry = beforeEntry || {};
    afterEntry = afterEntry || {};
    return (beforeEntry.text || '') === (afterEntry.text || '')
      && !!beforeEntry.billable === !!afterEntry.billable
      && !!beforeEntry.optional === !!afterEntry.optional;
  }

  function describeLevelOfEffortChanges(before, after, jobTitleById) {
    before = before || { mode: 'all', all: {}, roles: {} };
    after = after || { mode: 'all', all: {}, roles: {} };
    var descriptions = [];

    if (before.mode !== after.mode) {
      if (after.mode === 'all') {
        descriptions.push('Level of effort set to one value for all participants');
      } else {
        descriptions.push('Level of effort broken out per role');
      }
    }

    if (after.mode === 'all') {
      if (!levelOfEffortEntrySame(before.all, after.all)) {
        descriptions.push('Level of effort updated (all participants)');
      }
      return descriptions;
    }

    var roleIds = uniqueKeys(Object.keys(before.roles || {}).concat(Object.keys(after.roles || {})));
    roleIds.forEach(function (roleId) {
      var beforeEntry = (before.roles || {})[roleId];
      var afterEntry = (after.roles || {})[roleId];
      if (levelOfEffortEntrySame(beforeEntry, afterEntry)) {
        return;
      }
      // Per-role mode seeds empty rows for every participant; only log when real text exists.
      if (!(beforeEntry && beforeEntry.text) && !(afterEntry && afterEntry.text)) {
        return;
      }
      descriptions.push('Level of effort updated for ' + abbreviationFor(jobTitleById, roleId));
    });
    return descriptions;
  }

  function meetingLabel(meeting, jobTitleById) {
    if (meeting && meeting.name) {
      return meeting.name;
    }

    var parts = [];
    var scheduledBy = meeting.scheduledBy && jobTitleById(meeting.scheduledBy);
    var ledBy = meeting.ledBy && jobTitleById(meeting.ledBy);
    if (scheduledBy) {
      parts.push('scheduled by ' + scheduledBy.abbr);
    }
    if (ledBy) {
      parts.push('led by ' + ledBy.abbr);
    }
    if (parts.length) {
      return parts.join(', ');
    }
    return 'meeting';
  }

  function meetingSame(beforeMeeting, afterMeeting) {
    return beforeMeeting.name === afterMeeting.name
      && beforeMeeting.scheduledBy === afterMeeting.scheduledBy
      && beforeMeeting.ledBy === afterMeeting.ledBy
      && !!beforeMeeting.external === !!afterMeeting.external;
  }

  function describeMeetingChanges(before, after, jobTitleById) {
    var descriptions = [];
    var beforeById = {};
    var afterById = {};

    (before || []).forEach(function (meeting) { beforeById[meeting.id] = meeting; });
    (after || []).forEach(function (meeting) { afterById[meeting.id] = meeting; });

    (after || []).forEach(function (meeting) {
      if (!beforeById[meeting.id]) {
        descriptions.push('Meeting added: “' + meetingLabel(meeting, jobTitleById) + '”');
        return;
      }
      if (!meetingSame(beforeById[meeting.id], meeting)) {
        descriptions.push('Meeting edited: “' + meetingLabel(meeting, jobTitleById) + '”');
      }
    });

    (before || []).forEach(function (meeting) {
      if (!afterById[meeting.id]) {
        descriptions.push('Meeting removed: “' + meetingLabel(meeting, jobTitleById) + '”');
      }
    });

    if (!descriptions.length && idSequenceChanged(
      (before || []).map(function (meeting) { return meeting.id; }),
      (after || []).map(function (meeting) { return meeting.id; })
    )) {
      descriptions.push('Meetings reordered');
    }
    return descriptions;
  }

  function describeParticipantChanges(before, after, jobTitleById) {
    before = before || [];
    after = after || [];
    var descriptions = [];

    after.filter(function (roleId) { return before.indexOf(roleId) < 0; }).forEach(function (roleId) {
      descriptions.push('Participant added: ' + abbreviationFor(jobTitleById, roleId));
    });
    before.filter(function (roleId) { return after.indexOf(roleId) < 0; }).forEach(function (roleId) {
      descriptions.push('Participant removed: ' + abbreviationFor(jobTitleById, roleId));
    });
    return descriptions;
  }

  function describeTaskChanges(beforeTasks, afterTasks, jobTitleById) {
    beforeTasks = beforeTasks || [];
    afterTasks = afterTasks || [];
    var descriptions = [];
    var beforeById = {};
    var afterById = {};

    beforeTasks.forEach(function (task) { beforeById[task.id] = task; });
    afterTasks.forEach(function (task) { afterById[task.id] = task; });

    afterTasks.forEach(function (task) {
      var label = truncateText(task.text, 50);
      if (!beforeById[task.id]) {
        descriptions.push('Task added: “' + label + '”');
        return;
      }

      var beforeTask = beforeById[task.id];
      if (beforeTask.text !== task.text) {
        descriptions.push('Task edited: “' + label + '”');
      }
      if (JSON.stringify(beforeTask.jobAids || []) !== JSON.stringify(task.jobAids || [])) {
        descriptions.push('Job aids updated on “' + label + '”');
      }
      descriptions = descriptions.concat(describeRaciChanges(beforeTask.raci, task.raci, label, jobTitleById));
    });

    beforeTasks.forEach(function (task) {
      if (!afterById[task.id]) {
        descriptions.push('Task removed: “' + truncateText(task.text, 50) + '”');
      }
    });

    if (idSequenceChanged(
      beforeTasks.map(function (task) { return task.id; }),
      afterTasks.map(function (task) { return task.id; })
    )) {
      descriptions.push('Tasks reordered');
    }
    return descriptions;
  }

  function describeChanges(before, after, jobTitleById) {
    var resolveJobTitle = jobTitleById || function () {
      return null;
    };
    var changes = [];

    if (before.name !== after.name) {
      changes.push('Renamed to “' + after.name + '”');
    }
    if (before.overview !== after.overview) {
      changes.push('Overview edited');
    }
    if (before.objective !== after.objective) {
      changes.push('Objective edited');
    }

    changes = changes.concat(describeParticipantChanges(before.participants, after.participants, resolveJobTitle));
    changes = changes.concat(describeLevelOfEffortChanges(before.levelOfEffort, after.levelOfEffort, resolveJobTitle));
    changes = changes.concat(describeMeetingChanges(before.meetings, after.meetings, resolveJobTitle));
    changes = changes.concat(describeListFieldChanges(before.inputs, after.inputs, 'Input'));
    changes = changes.concat(describeListFieldChanges(before.deliverables, after.deliverables, 'Deliverable'));
    changes = changes.concat(describeListFieldChanges(before.comments, after.comments, 'Comment'));
    changes = changes.concat(describeTaskChanges(before.tasks, after.tasks, resolveJobTitle));
    return changes;
  }

  return {
    describeChanges: describeChanges
  };
}]