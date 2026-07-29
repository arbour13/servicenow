/* Editor URL policy: scheme allowlist + strip ServiceNow instance origins to relative paths.
   Shared by the widget server (concatenated ahead of content-model) and the browser harness /
   UrlPolicyService. Soft-fail friendly: empty string means "do not link / do not persist".
   Rhino-safe — no URL / window / document APIs. */
var DMUrlPolicy = (function () {
  'use strict';

  var HREF_SCHEMES = {
    http: true,
    https: true,
    mailto: true
  };
  var SRC_SCHEMES = {
    http: true,
    https: true
  };

  function trim(value) {
    return String(value == null ? '' : value).replace(/^\s+|\s+$/g, '');
  }

  function schemeOf(value) {
    var match = String(value).match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
    return match ? match[1].toLowerCase() : '';
  }

  function isServiceNowHost(host) {
    var normalized = String(host || '').toLowerCase();
    return normalized === 'service-now.com' || normalized.slice(-16) === '.service-now.com';
  }

  function normalizeOrigin(origin) {
    return trim(origin).replace(/\/$/, '').toLowerCase();
  }

  // https://user:pass@host:port/path?query#hash → parts (null if not http(s)).
  function parseHttpUrl(value) {
    var match = String(value).match(/^(https?):\/\/([^\/?#]*)([^?#]*)(\?[^#]*)?(#.*)?$/i);
    if (!match) {
      return null;
    }

    var hostPort = match[2];
    var at = hostPort.lastIndexOf('@');
    if (at >= 0) {
      hostPort = hostPort.slice(at + 1);
    }

    var host = hostPort;
    var colon = hostPort.indexOf(':');
    if (colon >= 0) {
      host = hostPort.slice(0, colon);
    }

    return {
      scheme: match[1].toLowerCase(),
      host: host.toLowerCase(),
      hostPort: hostPort.toLowerCase(),
      path: match[3] || '/',
      search: match[4] || '',
      hash: match[5] || '',
      origin: match[1].toLowerCase() + '://' + hostPort.toLowerCase()
    };
  }

  function shouldStripOrigin(parsed, instanceOrigins) {
    if (isServiceNowHost(parsed.host)) {
      return true;
    }

    var list = instanceOrigins || [];
    var index;
    for (index = 0; index < list.length; index++) {
      var origin = normalizeOrigin(list[index]);
      if (origin && parsed.origin === origin) {
        return true;
      }
    }
    return false;
  }

  // Instance links become query-relative so they resolve on whatever path the portal
  // page is served from (…/sp?id=… → ?id=…). Path-only URLs (no ?) keep path+hash.
  function toRelative(parsed) {
    if (parsed.search) {
      return parsed.search + parsed.hash;
    }
    var path = parsed.path || '/';
    if (path.charAt(0) !== '/') {
      path = '/' + path;
    }
    return path + parsed.hash;
  }

  function normalize(value, options) {
    var opts = options || {};
    var allowed = opts.allowMailto ? HREF_SCHEMES : SRC_SCHEMES;
    var raw = trim(value);

    if (!raw) {
      return '';
    }

    // Protocol-relative URLs inherit the page scheme and are too easy to weaponize.
    if (raw.slice(0, 2) === '//') {
      return '';
    }

    var scheme = schemeOf(raw);
    if (scheme) {
      if (!allowed[scheme]) {
        return '';
      }
      if (scheme === 'mailto') {
        return raw;
      }

      var parsed = parseHttpUrl(raw);
      if (!parsed) {
        return '';
      }
      if (shouldStripOrigin(parsed, opts.instanceOrigins)) {
        return toRelative(parsed);
      }
      return parsed.scheme + '://' + parsed.hostPort + (parsed.path || '/') + parsed.search + parsed.hash;
    }

    // No scheme → already relative / in-app (#, /sp?…, kb_view.do?…).
    return raw;
  }

  function normalizeHref(value, options) {
    return normalize(value, {
      allowMailto: true,
      instanceOrigins: options && options.instanceOrigins
    });
  }

  function normalizeSrc(value, options) {
    return normalize(value, {
      allowMailto: false,
      instanceOrigins: options && options.instanceOrigins
    });
  }

  function normalizeMethodologies(methodologies, options) {
    var list = methodologies || [];
    var urlOpts = {
      instanceOrigins: (options && options.instanceOrigins) || []
    };
    var methodologyIndex;

    for (methodologyIndex = 0; methodologyIndex < list.length; methodologyIndex++) {
      var methodology = list[methodologyIndex];
      if (!methodology) {
        continue;
      }
      methodology.feedbackUrl = normalizeHref(methodology.feedbackUrl, urlOpts);
      methodology.diagramUrl = normalizeSrc(methodology.diagramUrl, urlOpts);

      (methodology.phases || []).forEach(function (phase) {
        (phase.subPhases || []).forEach(function (subPhase) {
          (subPhase.tasks || []).forEach(function (task) {
            (task.jobAids || []).forEach(function (jobAid) {
              if (jobAid) {
                jobAid.url = normalizeHref(jobAid.url, urlOpts);
              }
            });
          });
        });
      });
    }

    return list;
  }

  return {
    normalizeHref: normalizeHref,
    normalizeSrc: normalizeSrc,
    normalizeMethodologies: normalizeMethodologies
  };
})();

if (typeof module === 'object' && module.exports) {
  module.exports = DMUrlPolicy;
}
if (typeof self !== 'undefined') {
  self.DMUrlPolicy = DMUrlPolicy;
}

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

  function urlOpts(options) {
    return {
      instanceOrigins: (options && options.instanceOrigins) || []
    };
  }

  function safeHref(value, options) {
    if (typeof DMUrlPolicy !== 'undefined' && DMUrlPolicy.normalizeHref) {
      return DMUrlPolicy.normalizeHref(value, urlOpts(options));
    }
    return value || '';
  }

  function safeSrc(value, options) {
    if (typeof DMUrlPolicy !== 'undefined' && DMUrlPolicy.normalizeSrc) {
      return DMUrlPolicy.normalizeSrc(value, urlOpts(options));
    }
    return value || '';
  }

  // Nested UI payload → flat rows (ready for GlideRecord insert).
  // options.instanceOrigins — optional list of origins (e.g. glide.servlet.uri) to strip to
  // relative paths alongside any *.service-now.com host (see DMUrlPolicy).
  function dehydrate(payload, options) {
    var rows = [];
    var jobTitles = (payload && payload.jobTitles) || [];
    var jargon = (payload && payload.jargon) || {};
    var methodologies = (payload && payload.methodologies) || [];
    var referenceSections = (payload && payload.referenceSections) || [];
    var index;
    var linkOpts = urlOpts(options);

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
        feedbackUrl: safeHref(methodology.feedbackUrl, linkOpts),
        feedbackLabel: methodology.feedbackLabel || '',
        diagramUrl: safeSrc(methodology.diagramUrl, linkOpts)
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
                url: safeHref(jobAid.url, linkOpts)
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
        feedbackUrl: safeHref(methodologyRow.content.feedbackUrl || ''),
        feedbackLabel: methodologyRow.content.feedbackLabel || '',
        diagramUrl: safeSrc(methodologyRow.content.diagramUrl || ''),
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
                        url: safeHref(jobAidRow.content.url || ''),
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

/* Widget server script: load/save the scoped content table.
   Prefixed at package time with js/lib/url-policy.js + js/lib/content-model.js
   (DMUrlPolicy, DMContentModel). input.action: load (default) | save | saveChangelogSeen.
   One GlideRecordSecure per function. */
(function () {
  data.canEdit = gs.hasRole('delivery_methodology_editor') || gs.hasRole('delivery_methodology_admin');
  data.error = '';
  data.empty = false;
  data.saved = false;
  data.changelogSeen = {};

  var logPrefix = 'Delivery Methodology content: ';
  var changelogSeenPreference = 'dm.changelog.seen';
  var allowedActions = {
    load: true,
    save: true,
    saveChangelogSeen: true
  };
  var maximumSaveRows = 5000;

  function getContentTableName() {
    try {
      if (typeof gs.getCurrentScopeName === 'function') {
        var scopeName = String(gs.getCurrentScopeName() || '');

        if (scopeName && scopeName !== 'global') {
          return scopeName + '_content';
        }
      }
    } catch (scopeError) {
      gs.warn(logPrefix + 'could not resolve scope name - falling back to content: ' + scopeError);
    }

    return 'content';
  }

  var contentTable = getContentTableName();

  function isContentTableReady() {
    return !!(contentTable && contentTable !== '');
  }

  function getAllContentRecords() {
    var records = [];
    var contentRecord = new GlideRecordSecure(contentTable);

    contentRecord.orderBy('order');
    contentRecord.query();

    while (contentRecord.next()) {
      var parentSystemId = contentRecord.getValue('parent');
      var parentValue = null;

      if (parentSystemId) {
        parentValue = String(parentSystemId);
      }

      records.push({
        systemId: String(contentRecord.getUniqueValue()),
        type: String(contentRecord.getValue('type') || ''),
        parent: parentValue,
        name: String(contentRecord.getValue('name') || ''),
        order: parseInt(contentRecord.getValue('order'), 10) || 0,
        content: String(contentRecord.getValue('content') || '')
      });
    }

    return records;
  }

  function deleteRootContentRecords() {
    var contentRecord = new GlideRecordSecure(contentTable);

    contentRecord.addNullQuery('parent');
    contentRecord.query();

    while (contentRecord.next()) {
      contentRecord.deleteRecord();
    }
  }

  function deleteRemainingContentRecords() {
    var contentRecord = new GlideRecordSecure(contentTable);

    contentRecord.query();

    while (contentRecord.next()) {
      contentRecord.deleteRecord();
    }
  }

  function createContentRecord(row, parentSystemId) {
    var contentRecord = new GlideRecordSecure(contentTable);
    var orderValue = 0;

    if (row.order != null) {
      orderValue = row.order;
    }

    contentRecord.initialize();

    contentRecord.setValue('type', row.type);
    contentRecord.setValue('name', row.name || '');
    contentRecord.setValue('order', orderValue);
    contentRecord.setValue('content', JSON.stringify(row.content || {}));

    if (parentSystemId) {
      contentRecord.setValue('parent', parentSystemId);
    }

    var createdSystemId = contentRecord.insert();

    if (!createdSystemId) {
      return '';
    }

    return String(createdSystemId);
  }

  function deleteAllContentRecords() {
    deleteRootContentRecords();
    deleteRemainingContentRecords();
    return true;
  }

  function createMappedContentRecord(row, clientIdToSystemId) {
    if (!row || !row.type) {
      gs.error(logPrefix + 'createMappedContentRecord: missing type');
      return false;
    }

    if (DMContentModel.ALLOWED_TYPES && !DMContentModel.ALLOWED_TYPES[row.type]) {
      gs.error(logPrefix + 'createMappedContentRecord: disallowed type ' + row.type);
      return false;
    }

    var parentClientId = row.parentClientId;
    var parentSystemId = '';

    if (parentClientId && clientIdToSystemId[parentClientId]) {
      parentSystemId = clientIdToSystemId[parentClientId];
    }

    var createdSystemId = createContentRecord(row, parentSystemId);

    if (!createdSystemId) {
      gs.error(logPrefix + 'create failed for type=' + row.type + ' clientId=' + (row.clientId || ''));
      return false;
    }

    if (row.clientId) {
      clientIdToSystemId[row.clientId] = createdSystemId;
    }

    return true;
  }

  function createContentRecords(flatRows) {
    var clientIdToSystemId = {};
    var pendingRows = flatRows.slice();
    var safetyPassCount = 0;

    while (pendingRows.length && safetyPassCount < flatRows.length + 5) {
      safetyPassCount++;
      var stillWaiting = [];

      for (var index = 0; index < pendingRows.length; index++) {
        var row = pendingRows[index];
        var parentClientId = row.parentClientId;

        if (parentClientId && !clientIdToSystemId[parentClientId]) {
          stillWaiting.push(row);
          continue;
        }

        if (!createMappedContentRecord(row, clientIdToSystemId)) {
          return false;
        }
      }

      if (stillWaiting.length === pendingRows.length) {
        gs.warn(logPrefix + 'unresolvable parents for ' + stillWaiting.length +
          ' row(s); refusing to orphan them');
        return false;
      }

      pendingRows = stillWaiting;
    }

    if (pendingRows.length) {
      gs.error(logPrefix + 'createContentRecords: unfinished queue (' + pendingRows.length + ')');
      return false;
    }

    return true;
  }

  function restoreContentFromSnapshot(snapshotRecords) {
    var flatRows = [];

    for (var index = 0; index < snapshotRecords.length; index++) {
      var snapshotRecord = snapshotRecords[index];

      flatRows.push({
        type: snapshotRecord.type,
        parentClientId: snapshotRecord.parent,
        name: snapshotRecord.name,
        order: snapshotRecord.order,
        content: DMContentModel.parseContent(snapshotRecord.content),
        clientId: snapshotRecord.systemId
      });
    }

    return createContentRecords(flatRows);
  }

  // Cheap fingerprint of the flat table so a second editor cannot silently clobber the first
  // (full-replace save). Client echoes data.contentRevision on save; mismatch → hard fail + reload.
  function contentRevision(records) {
    var list = records || [];
    var parts = [];
    var index;
    for (index = 0; index < list.length; index++) {
      var row = list[index];
      parts.push(
        String(row.systemId || '') + ':' +
        String(row.type || '') + ':' +
        String(row.order || 0) + ':' +
        String(row.name || '') + ':' +
        String(row.content || '').length
      );
    }
    var raw = String(list.length) + '|' + parts.join('|');
    var hash = 0;
    for (index = 0; index < raw.length; index++) {
      hash = ((hash << 5) - hash) + raw.charCodeAt(index);
      hash |= 0;
    }
    return String(list.length) + ':' + String(hash);
  }

  function readChangelogSeenPreference() {
    try {
      var raw = gs.getUser().getPreference(changelogSeenPreference);
      if (!raw) {
        return {};
      }
      var parsed = JSON.parse(String(raw));
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return {};
      }
      return parsed;
    } catch (preferenceError) {
      gs.warn(logPrefix + 'could not read ' + changelogSeenPreference + ' - ' + preferenceError);
      return {};
    }
  }

  function writeChangelogSeenPreference(seenMap) {
    try {
      var map = seenMap;
      if (!map || typeof map !== 'object' || Array.isArray(map)) {
        map = {};
      }
      var cleaned = {};
      Object.keys(map).forEach(function (entryId) {
        if (map[entryId]) {
          cleaned[String(entryId)] = true;
        }
      });
      gs.getUser().savePreference(changelogSeenPreference, JSON.stringify(cleaned));
      data.changelogSeen = cleaned;
      data.saved = true;
      return true;
    } catch (preferenceError) {
      data.error = 'Could not save changelog read preference.';
      gs.warn(logPrefix + 'could not write ' + changelogSeenPreference + ' - ' + preferenceError);
      return false;
    }
  }

  function publishContentToClient(payload) {
    data.methodologies = (payload && payload.methodologies) || [];
    data.jobTitles = (payload && payload.jobTitles) || [];
    data.jargon = (payload && payload.jargon) || {};
    data.referenceSections = (payload && payload.referenceSections) || [];
    data.contentRevision = contentRevision(getAllContentRecords());
    data.changelogSeen = readChangelogSeenPreference();

    data.empty = !(data.methodologies && data.methodologies.length);

    return !data.empty;
  }

  function emptyContentPayload() {
    return {
      methodologies: [],
      jobTitles: [],
      jargon: {},
      referenceSections: []
    };
  }

  function validateSavePayload(payload) {
    if (!payload || typeof payload !== 'object') {
      return 'Save payload must be an object.';
    }

    if (!Array.isArray(payload.methodologies)) {
      return 'methodologies must be an array.';
    }

    if (!Array.isArray(payload.jobTitles)) {
      return 'jobTitles must be an array.';
    }

    if (!payload.jargon || typeof payload.jargon !== 'object' || Array.isArray(payload.jargon)) {
      return 'jargon must be an object.';
    }

    if (payload.referenceSections != null && !Array.isArray(payload.referenceSections)) {
      return 'referenceSections must be an array when provided.';
    }

    return '';
  }

  function jobTitleIdFromRow(row) {
    // Soft refs store bare job-title ids (`arch`); dehydrate uses clientId `jt:arch` only as a
    // row identity helper — never treat that prefix as the soft-ref key.
    if (row && row.content && row.content.id) {
      return String(row.content.id);
    }
    return '';
  }

  function validateSoftJobTitleRef(value, jobTitleIds, fieldLabel, rowIndex) {
    if (value == null || value === '') {
      return '';
    }
    var roleId = String(value);
    if (!jobTitleIds[roleId]) {
      return 'Unknown job_title soft ref "' + roleId + '" in ' + fieldLabel + ' at row ' + rowIndex + '.';
    }
    return '';
  }

  function validateFlatRows(flatRows) {
    if (!Array.isArray(flatRows)) {
      return 'Dehydrated rows must be an array.';
    }

    if (flatRows.length > maximumSaveRows) {
      return 'Save exceeds the maximum of ' + maximumSaveRows + ' content rows.';
    }

    var jobTitleIds = {};
    var index;
    var row;
    var type;
    var softRefError;

    for (index = 0; index < flatRows.length; index++) {
      row = flatRows[index];
      type = row && row.type;

      if (!type || (DMContentModel.ALLOWED_TYPES && !DMContentModel.ALLOWED_TYPES[type])) {
        return 'Disallowed or missing content type at row ' + index + ': ' + type;
      }

      if (type === 'job_title') {
        var jobTitleId = jobTitleIdFromRow(row);
        if (!jobTitleId) {
          return 'job_title row ' + index + ' is missing an id.';
        }
        jobTitleIds[jobTitleId] = true;
      }
    }

    for (index = 0; index < flatRows.length; index++) {
      row = flatRows[index];
      type = row && row.type;
      var content = (row && row.content) || {};

      if (type === 'participant' || type === 'raci' || type === 'job_aid_role') {
        softRefError = validateSoftJobTitleRef(content.job_title, jobTitleIds, type + '.job_title', index);
        if (softRefError) {
          return softRefError;
        }
      }

      if (type === 'level_of_effort' && content.job_title != null && content.job_title !== '') {
        softRefError = validateSoftJobTitleRef(content.job_title, jobTitleIds, 'level_of_effort.job_title', index);
        if (softRefError) {
          return softRefError;
        }
      }

      if (type === 'meeting') {
        softRefError = validateSoftJobTitleRef(content.scheduledBy, jobTitleIds, 'meeting.scheduledBy', index);
        if (softRefError) {
          return softRefError;
        }
        softRefError = validateSoftJobTitleRef(content.ledBy, jobTitleIds, 'meeting.ledBy', index);
        if (softRefError) {
          return softRefError;
        }
      }
    }

    return '';
  }

  function instanceOrigins() {
    var origins = [];
    try {
      var servletUri = gs.getProperty('glide.servlet.uri');
      if (servletUri) {
        origins.push(String(servletUri).replace(/\/$/, ''));
      }
    } catch (originError) {
      /* property unavailable — DMUrlPolicy still strips *.service-now.com */
    }
    return origins;
  }

  function saveContent(payload) {
    var validationError = validateSavePayload(payload);

    if (validationError) {
      data.error = validationError;
      gs.warn(logPrefix + validationError);
      return false;
    }

    var snapshotRecords = getAllContentRecords();
    var expectedRevision = payload && payload.contentRevision != null
      ? String(payload.contentRevision)
      : '';
    var currentRevision = contentRevision(snapshotRecords);

    // Empty expected = first save from a client that never loaded (or harness). Otherwise require
    // the fingerprint from the last load so concurrent full-replace cannot last-write-wins silently.
    if (expectedRevision && expectedRevision !== currentRevision) {
      data.error = 'Content was changed elsewhere. Reload and try again.';
      gs.warn(logPrefix + 'contentRevision mismatch expected=' + expectedRevision +
        ' current=' + currentRevision);
      publishContentToClient(DMContentModel.hydrate(snapshotRecords));
      return false;
    }

    var flatRows;

    try {
      flatRows = DMContentModel.dehydrate(payload, {
        instanceOrigins: instanceOrigins()
      });
    } catch (dehydrateError) {
      data.error = 'Could not prepare content for save.';
      gs.error(logPrefix + 'dehydrate failed - ' + dehydrateError);
      return false;
    }

    var flatRowsError = validateFlatRows(flatRows);

    if (flatRowsError) {
      data.error = flatRowsError;
      gs.warn(logPrefix + flatRowsError);
      return false;
    }

    try {
      deleteAllContentRecords();

      if (!createContentRecords(flatRows)) {
        data.error = 'Save failed while writing content rows.';
        gs.error(logPrefix + 'createContentRecords failed - attempting restore of ' +
          snapshotRecords.length + ' row(s)');

        if (!restoreContentFromSnapshot(snapshotRecords)) {
          gs.error(logPrefix + 'restore after failed save also failed');
        }

        publishContentToClient(DMContentModel.hydrate(getAllContentRecords()));
        return false;
      }

      publishContentToClient(DMContentModel.hydrate(getAllContentRecords()));
      data.saved = true;
      return true;
    } catch (saveError) {
      data.error = 'Save failed.';
      gs.error(logPrefix + 'saveContent threw - ' + saveError);

      try {
        if (!restoreContentFromSnapshot(snapshotRecords)) {
          gs.error(logPrefix + 'restore after exception also failed');
        }
      } catch (restoreError) {
        gs.error(logPrefix + 'restore threw - ' + restoreError);
      }

      publishContentToClient(DMContentModel.hydrate(getAllContentRecords()));
      return false;
    }
  }

  function loadContent() {
    try {
      return publishContentToClient(DMContentModel.hydrate(getAllContentRecords()));
    } catch (loadError) {
      data.error = 'Could not load content.';
      gs.error(logPrefix + 'load failed - ' + loadError);
      publishContentToClient(emptyContentPayload());
      return false;
    }
  }

  if (!isContentTableReady()) {
    data.error = 'Content table is not configured.';
    gs.error(logPrefix + 'empty table name');
    publishContentToClient(emptyContentPayload());
    return;
  }

  var action = 'load';

  if (input && input.action) {
    action = String(input.action);
  }

  if (!allowedActions[action]) {
    data.error = 'Unknown action.';
    gs.warn(logPrefix + 'rejected action=' + action);
    loadContent();
    return;
  }

  if (action === 'saveChangelogSeen') {
    writeChangelogSeenPreference(input && input.changelogSeen);
    return;
  }

  if (action === 'save') {
    if (!data.canEdit) {
      data.error = 'Not authorized to edit content.';
      gs.warn(logPrefix + 'save denied - caller lacks editor/admin');
      loadContent();
      return;
    }

    saveContent({
      methodologies: input.methodologies,
      jobTitles: input.jobTitles,
      jargon: input.jargon,
      referenceSections: input.referenceSections || [],
      contentRevision: input.contentRevision
    });
    return;
  }

  loadContent();
})();
