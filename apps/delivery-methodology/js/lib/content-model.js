/* Shared hydrate/dehydrate between the nested UI payload and flat `content` table rows.
   Runs on the widget server (concatenated into the server script at package time) and optionally
   in the browser. Soft refs stay as client job-title ids (`arch`, `em`, …). Client entity ids
   (`d2-1-1`, …) live in `content` JSON as `id` so round-trips keep UI identity stable.
   See apps/delivery-methodology/SCHEMA.md.
   Exposes a bare `var DMContentModel` so the concatenated ServiceNow server script can call it
   without relying on `window`/`self` (Rhino). */
var DMContentModel = (function () {
  'use strict';

  // Choice values on the content.type field - keep in sync with deploy.manifest.js / SCHEMA.md.
  var ALLOWED_TYPES = {
    methodology: true,
    phase: true,
    sub_phase: true,
    task: true,
    raci: true,
    job_aid: true,
    job_aid_role: true,
    input: true,
    deliverable: true,
    comment: true,
    participant: true,
    meeting: true,
    level_of_effort: true,
    changelog_entry: true,
    job_title: true,
    glossary_term: true,
    reference_section: true
  };

  function parseContent(raw) {
    if (raw == null || raw === '') {
      return {};
    }

    if (typeof raw === 'object') {
      return raw;
    }

    try {
      return JSON.parse(String(raw)) || {};
    } catch (parseError) {
      return {};
    }
  }

  function pushRow(rows, type, parentClientId, name, order, content, clientId) {
    if (!ALLOWED_TYPES[type]) {
      return;
    }

    var resolvedParentClientId = null;
    var resolvedName = '';
    var resolvedOrder = 0;
    var resolvedClientId = null;

    if (parentClientId != null) {
      resolvedParentClientId = parentClientId;
    }

    if (name != null) {
      resolvedName = String(name);
    }

    if (order != null) {
      resolvedOrder = Number(order) || 0;
    }

    if (clientId != null) {
      resolvedClientId = String(clientId);
    }

    rows.push({
      type: type,
      parentClientId: resolvedParentClientId,
      name: resolvedName,
      order: resolvedOrder,
      content: content || {},
      clientId: resolvedClientId
    });
  }

  // Nested UI payload → flat rows (ready for GlideRecord insert).
  function dehydrate(payload) {
    var rows = [];
    var jobTitles = (payload && payload.jobTitles) || [];
    var jargon = (payload && payload.jargon) || {};
    var methodologies = (payload && payload.methodologies) || [];
    var referenceSections = (payload && payload.referenceSections) || [];
    var index;

    for (index = 0; index < jobTitles.length; index++) {
      var jobTitle = jobTitles[index];
      pushRow(rows, 'job_title', null, jobTitle.name, index + 1, {
        id: jobTitle.id,
        abbreviation: jobTitle.abbr || '',
        description: jobTitle.description || '',
        external: !!jobTitle.external
      }, 'jt:' + jobTitle.id);
    }

    var jargonKeys = Object.keys(jargon);
    for (index = 0; index < jargonKeys.length; index++) {
      var term = jargonKeys[index];
      pushRow(rows, 'glossary_term', null, term, index + 1, {
        definition: jargon[term] || ''
      }, 'gloss:' + term);
    }

    for (index = 0; index < referenceSections.length; index++) {
      var referenceSection = referenceSections[index];
      pushRow(rows, 'reference_section', null, referenceSection.title || referenceSection.name || '', index + 1, {
        key: referenceSection.key || '',
        body: referenceSection.body || ''
      }, 'ref:' + (referenceSection.key || index));
    }

    methodologies.forEach(function (methodology) {
      pushRow(rows, 'methodology', null, methodology.name, methodology.order, {
        id: methodology.id,
        title: methodology.title || '',
        summary: methodology.summary || '',
        description: methodology.description || '',
        feedbackUrl: methodology.feedbackUrl || '',
        feedbackLabel: methodology.feedbackLabel || '',
        diagramUrl: methodology.diagramUrl || ''
      }, methodology.id);

      (methodology.phases || []).forEach(function (phase) {
        pushRow(rows, 'phase', methodology.id, phase.name, phase.order, {
          id: phase.id
        }, phase.id);

        (phase.subPhases || []).forEach(function (subPhase) {
          pushRow(rows, 'sub_phase', phase.id, subPhase.name, subPhase.order, {
            id: subPhase.id,
            overview: subPhase.overview || '',
            objective: subPhase.objective || '',
            icon: subPhase.icon || 'doc'
          }, subPhase.id);

          (subPhase.inputs || []).forEach(function (text, inputIndex) {
            pushRow(rows, 'input', subPhase.id, text, inputIndex + 1, {}, null);
          });
          (subPhase.deliverables || []).forEach(function (text, deliverableIndex) {
            pushRow(rows, 'deliverable', subPhase.id, text, deliverableIndex + 1, {}, null);
          });
          (subPhase.comments || []).forEach(function (text, commentIndex) {
            pushRow(rows, 'comment', subPhase.id, text, commentIndex + 1, {}, null);
          });
          (subPhase.participants || []).forEach(function (roleId, participantIndex) {
            pushRow(rows, 'participant', subPhase.id, '', participantIndex + 1, {
              job_title: roleId
            }, null);
          });
          (subPhase.meetings || []).forEach(function (meeting, meetingIndex) {
            pushRow(rows, 'meeting', subPhase.id, meeting.name || '', meetingIndex + 1, {
              id: meeting.id,
              scheduledBy: meeting.scheduledBy || null,
              ledBy: meeting.ledBy || null,
              external: !!meeting.external
            }, meeting.id || null);
          });

          var levelOfEffort = subPhase.levelOfEffort || {
            mode: 'all',
            all: {},
            roles: {}
          };
          if (levelOfEffort.mode === 'byRole') {
            var roleIds = Object.keys(levelOfEffort.roles || {});
            roleIds.forEach(function (roleId, loeIndex) {
              var entry = levelOfEffort.roles[roleId] || {};
              pushRow(rows, 'level_of_effort', subPhase.id, '', loeIndex + 1, {
                job_title: roleId,
                text: entry.text || '',
                billable: !!entry.billable,
                optional: !!entry.optional
              }, null);
            });
          } else if (levelOfEffort.all && (levelOfEffort.all.text || levelOfEffort.all.billable != null)) {
            pushRow(rows, 'level_of_effort', subPhase.id, '', 1, {
              job_title: null,
              text: levelOfEffort.all.text || '',
              billable: !!levelOfEffort.all.billable,
              optional: !!levelOfEffort.all.optional
            }, null);
          }

          (subPhase.changelog || []).forEach(function (entry, changelogIndex) {
            pushRow(rows, 'changelog_entry', subPhase.id, '', changelogIndex + 1, {
              id: entry.id,
              ts: entry.ts || '',
              text: entry.text || ''
            }, entry.id || null);
          });

          (subPhase.tasks || []).forEach(function (task) {
            pushRow(rows, 'task', subPhase.id, task.text || '', task.order, {
              id: task.id
            }, task.id);
            var raci = task.raci || {};
            Object.keys(raci).forEach(function (roleId) {
              (raci[roleId] || []).forEach(function (letter) {
                pushRow(rows, 'raci', task.id, letter, 0, {
                  job_title: roleId
                }, null);
              });
            });
            (task.jobAids || []).forEach(function (jobAid, jobAidIndex) {
              var jobAidId = jobAid.id || (task.id + '-ja' + (jobAidIndex + 1));
              pushRow(rows, 'job_aid', task.id, '', jobAidIndex + 1, {
                id: jobAidId,
                url: jobAid.url || ''
              }, jobAidId);
              (jobAid.roles || []).forEach(function (jobAidRoleId, jobAidRoleIndex) {
                pushRow(rows, 'job_aid_role', jobAidId, '', jobAidRoleIndex + 1, {
                  job_title: jobAidRoleId
                }, null);
              });
            });
          });
        });
      });
    });

    return rows;
  }

  function sortByOrder(a, b) {
    return (a.order || 0) - (b.order || 0);
  }

  // Flat rows (from GlideRecord) → nested UI payload.
  function hydrate(rawRows) {
    var rows = (rawRows || []).map(function (row) {
      var content = parseContent(row.content);
      var systemId = row.systemId || row.sysId || row.sys_id || null;
      var resolvedOrder = 0;

      if (row.order != null) {
        resolvedOrder = Number(row.order) || 0;
      }

      return {
        systemId: systemId,
        type: row.type,
        parentSystemId: row.parentSystemId || row.parentSysId || row.parent || null,
        name: row.name || '',
        order: resolvedOrder,
        content: content,
        clientId: content.id || null
      };
    });

    var bySystemId = {};
    rows.forEach(function (row) {
      if (row.systemId) {
        bySystemId[row.systemId] = row;
      }
    });

    rows.forEach(function (row) {
      row.parentClientId = null;

      if (row.parentSystemId && bySystemId[row.parentSystemId]) {
        var parent = bySystemId[row.parentSystemId];
        row.parentClientId = parent.clientId || parent.systemId;
      }
    });

    rows.forEach(function (row) {
      if (!row.clientId) {
        if (row.type === 'job_title' && row.content.id) {
          row.clientId = row.content.id;
        } else if (row.systemId) {
          row.clientId = row.systemId;
        }
      }
    });

    rows.forEach(function (row) {
      if (row.parentSystemId && bySystemId[row.parentSystemId]) {
        row.parentClientId = bySystemId[row.parentSystemId].clientId;
      }
    });

    var childrenOf = {};
    rows.forEach(function (row) {
      var key = row.parentClientId || '__root__';

      if (!childrenOf[key]) {
        childrenOf[key] = [];
      }

      childrenOf[key].push(row);
    });

    Object.keys(childrenOf).forEach(function (parentKey) {
      childrenOf[parentKey].sort(sortByOrder);
    });

    function kids(parentClientId, type) {
      return (childrenOf[parentClientId] || []).filter(function (row) {
        return row.type === type;
      });
    }

    var roots = childrenOf.__root__ || [];

    var jobTitlesOut = roots.filter(function (row) {
      return row.type === 'job_title';
    }).map(function (row) {
      return {
        id: row.content.id || row.clientId,
        name: row.name,
        abbr: row.content.abbreviation || '',
        description: row.content.description || '',
        external: !!row.content.external
      };
    });

    var jargon = {};
    roots.filter(function (row) {
      return row.type === 'glossary_term';
    }).forEach(function (row) {
      jargon[row.name] = row.content.definition || '';
    });

    var referenceSections = roots.filter(function (row) {
      return row.type === 'reference_section';
    }).map(function (row) {
      return {
        key: row.content.key || '',
        title: row.name,
        name: row.name,
        body: row.content.body || ''
      };
    });

    var methodologies = roots.filter(function (row) {
      return row.type === 'methodology';
    }).map(function (methodologyRow) {
      var methodologyId = methodologyRow.content.id || methodologyRow.clientId;
      return {
        id: methodologyId,
        name: methodologyRow.name,
        order: methodologyRow.order,
        title: methodologyRow.content.title || '',
        summary: methodologyRow.content.summary || '',
        description: methodologyRow.content.description || '',
        feedbackUrl: methodologyRow.content.feedbackUrl || '',
        feedbackLabel: methodologyRow.content.feedbackLabel || '',
        diagramUrl: methodologyRow.content.diagramUrl || '',
        phases: kids(methodologyId, 'phase').map(function (phaseRow) {
          var phaseId = phaseRow.content.id || phaseRow.clientId;
          return {
            id: phaseId,
            name: phaseRow.name,
            order: phaseRow.order,
            subPhases: kids(phaseId, 'sub_phase').map(function (subPhaseRow) {
              var subPhaseId = subPhaseRow.content.id || subPhaseRow.clientId;
              var loeRows = kids(subPhaseId, 'level_of_effort');
              var levelOfEffort = {
                mode: 'all',
                all: {},
                roles: {}
              };

              if (loeRows.length === 1 && (loeRows[0].content.job_title == null || loeRows[0].content.job_title === '')) {
                levelOfEffort.mode = 'all';
                levelOfEffort.all = {
                  text: loeRows[0].content.text || '',
                  billable: !!loeRows[0].content.billable,
                  optional: !!loeRows[0].content.optional
                };
              } else if (loeRows.length) {
                levelOfEffort.mode = 'byRole';
                loeRows.forEach(function (loeRow) {
                  var roleId = loeRow.content.job_title;

                  if (!roleId) {
                    return;
                  }

                  levelOfEffort.roles[roleId] = {
                    text: loeRow.content.text || '',
                    billable: !!loeRow.content.billable,
                    optional: !!loeRow.content.optional
                  };
                });
              }

              return {
                id: subPhaseId,
                sid: '',
                name: subPhaseRow.name,
                order: subPhaseRow.order,
                icon: subPhaseRow.content.icon || 'doc',
                overview: subPhaseRow.content.overview || '',
                objective: subPhaseRow.content.objective || '',
                inputs: kids(subPhaseId, 'input').map(function (row) {
                  return row.name;
                }),
                deliverables: kids(subPhaseId, 'deliverable').map(function (row) {
                  return row.name;
                }),
                comments: kids(subPhaseId, 'comment').map(function (row) {
                  return row.name;
                }),
                participants: kids(subPhaseId, 'participant').map(function (row) {
                  return row.content.job_title;
                }).filter(Boolean),
                meetings: kids(subPhaseId, 'meeting').map(function (row) {
                  return {
                    id: row.content.id || row.clientId,
                    name: row.name || '',
                    scheduledBy: row.content.scheduledBy || null,
                    ledBy: row.content.ledBy || null,
                    external: !!row.content.external
                  };
                }),
                levelOfEffort: levelOfEffort,
                changelog: kids(subPhaseId, 'changelog_entry').map(function (row) {
                  return {
                    id: row.content.id || row.clientId || row.systemId,
                    ts: row.content.ts || '',
                    text: row.content.text || '',
                    read: false
                  };
                }),
                tasks: kids(subPhaseId, 'task').map(function (taskRow) {
                  var taskId = taskRow.content.id || taskRow.clientId;
                  var raci = {};

                  kids(taskId, 'raci').forEach(function (raciRow) {
                    var roleId = raciRow.content.job_title;
                    var letter = raciRow.name;

                    if (!roleId || !letter) {
                      return;
                    }

                    if (!raci[roleId]) {
                      raci[roleId] = [];
                    }

                    if (raci[roleId].indexOf(letter) < 0) {
                      raci[roleId].push(letter);
                    }
                  });

                  return {
                    id: taskId,
                    order: taskRow.order,
                    text: taskRow.name,
                    raci: raci,
                    jobAids: kids(taskId, 'job_aid').map(function (jobAidRow) {
                      var jobAidId = jobAidRow.content.id || jobAidRow.clientId;
                      return {
                        id: jobAidId,
                        url: jobAidRow.content.url || '',
                        roles: kids(jobAidId, 'job_aid_role').map(function (jobAidRoleRow) {
                          return jobAidRoleRow.content.job_title;
                        }).filter(Boolean)
                      };
                    })
                  };
                })
              };
            })
          };
        })
      };
    });

    return {
      jobTitles: jobTitlesOut,
      jargon: jargon,
      referenceSections: referenceSections,
      methodologies: methodologies
    };
  }

  return {
    ALLOWED_TYPES: ALLOWED_TYPES,
    dehydrate: dehydrate,
    hydrate: hydrate,
    parseContent: parseContent
  };
})();

if (typeof module === 'object' && module.exports) {
  module.exports = DMContentModel;
}
if (typeof self !== 'undefined') {
  self.DMContentModel = DMContentModel;
}
