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

  // Same order as RaciGridService.LETTERS — hydrate must not depend on Angular.
  var RACI_LETTER_ORDER = {
    R: 0,
    A: 1,
    C: 2,
    I: 3
  };

  function sortRaciLetters(letters) {
    return (letters || []).slice().sort(function (left, right) {
      var leftRank = RACI_LETTER_ORDER[left];
      var rightRank = RACI_LETTER_ORDER[right];
      if (leftRank == null) {
        leftRank = 99;
      }
      if (rightRank == null) {
        rightRank = 99;
      }
      return leftRank - rightRank;
    });
  }

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
              // Label rides the row's own name column (the "real display value" slot per
              // SCHEMA.md), not the content JSON - empty when the aid is unnamed.
              pushRow(rows, 'job_aid', task.id, jobAid.label || '', jobAidIndex + 1, {
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

                  Object.keys(raci).forEach(function (roleId) {
                    raci[roleId] = sortRaciLetters(raci[roleId]);
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
                        label: jobAidRow.name || '',
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

/* Delivery 2.0 content payload - the one-time "Import Delivery 2.0 content" action offers this
   when an instance's content table is empty (see content.server.js's seedStandard action and
   js/services/data.service.js's seedStandard()). Deployed (unlike js/data/seed.js, which stays
   deploy: false / harness-only) - see deploy.manifest.js's files.contentModel entry, which
   concatenates this onto the widget SERVER script alongside url-policy.js / content-model.js,
   in the same Rhino-safe bare-var style.

   GENERATED, do not hand-edit. This is js/data/seed.js's payload (jobTitles/methodologies/
   jargon/referenceSections only - not its blankSubPhase harness helper or version field, which
   the server has no use for) with nothing else changed. Regenerate after any seed.js content
   change: node -e "var vm=require('vm'),fs=require('fs');var sandbox={self:{}};
   vm.createContext(sandbox);vm.runInContext(fs.readFileSync('js/data/seed.js','utf8'),
   sandbox);var s=sandbox.self.DMSeed;console.log(JSON.stringify({jobTitles:s.jobTitles,
   methodologies:s.methodologies,jargon:s.jargon,referenceSections:s.referenceSections},null,2));"
   then paste the output into the DMStandardContent literal below. Verified 2026-07-31 against
   content.server.js's real validation path: dehydrates to 1310 rows, 0 soft-ref errors, under
   the 5000-row save cap. */
var DMStandardContent = {
  "jobTitles": [
    {
      "id": "arch",
      "name": "Architect",
      "abbr": "ARCH",
      "description": "Owns the technical solution design and integrity of the build across the engagement."
    },
    {
      "id": "em",
      "name": "Engagement Manager",
      "abbr": "EM",
      "description": "Owns delivery, client relationship, scope, schedule and internal coordination."
    },
    {
      "id": "bpc",
      "name": "Business Process Consultant",
      "abbr": "BPC",
      "description": "Owns process design, requirements facilitation and workshop readiness."
    },
    {
      "id": "ba",
      "name": "Business Analyst",
      "abbr": "BA",
      "description": "Supports requirements gathering and analysis when assigned to the engagement."
    },
    {
      "id": "tc",
      "name": "Technical Consultant",
      "abbr": "TC",
      "description": "Builds and configures the ServiceNow solution against approved stories."
    },
    {
      "id": "ux",
      "name": "UX Designer",
      "abbr": "UX",
      "description": "Designs portal and interface experience when in scope for the project."
    },
    {
      "id": "sa",
      "name": "Solutions Consultant",
      "abbr": "SC",
      "description": "Solutions-side consultant supporting scoping, handoff and closure."
    },
    {
      "id": "pssc",
      "name": "Pre-Sales Solutions Consultant",
      "abbr": "PSSC",
      "description": "Pre-sales solutions consultant who often initiates and facilitates the IPKT handoff."
    },
    {
      "id": "es",
      "name": "Executive Sponsor",
      "abbr": "ES",
      "description": "GlideFast executive accountable for the account relationship (A/VP level)."
    },
    {
      "id": "mktg",
      "name": "Marketing Specialist",
      "abbr": "MS",
      "description": "Marketing team representative capturing the engagement narrative into a case study."
    },
    {
      "id": "ae",
      "name": "Sales Executive",
      "abbr": "SE",
      "description": "Owns the commercial relationship and CRM opportunity, and schedules GRS transition touchpoints."
    },
    {
      "id": "snse",
      "name": "ServiceNow Sales Executive",
      "abbr": "SNSE",
      "description": "ServiceNow-side sales executive involved in the opportunity and handoff."
    },
    {
      "id": "apex",
      "name": "Apex Sales Representative",
      "abbr": "APEX",
      "description": "Apex sales representative when applicable to the engagement."
    },
    {
      "id": "csm",
      "name": "Customer Success Manager",
      "abbr": "CSM",
      "description": "Owns the customer relationship after go-live, driving adoption, renewal and expansion."
    },
    {
      "id": "trainer",
      "name": "Training Specialist",
      "abbr": "TS",
      "description": "Delivers end-user training and enablement sessions for the customer team."
    },
    {
      "id": "tpm",
      "name": "Training Program Manager",
      "abbr": "TPM",
      "description": "Owns training program planning when training is in scope for the engagement."
    },
    {
      "id": "resourcing",
      "name": "Resourcing Specialist",
      "abbr": "RS",
      "description": "Assigns and staffs the delivery team, and sets up engagement Slack channels ahead of kickoff."
    },
    {
      "id": "customer",
      "name": "Customer",
      "abbr": "CUST",
      "external": true,
      "description": "The customer / client stakeholders - included in the RACI wherever the engagement requires their input, approval or participation."
    }
  ],
  "methodologies": [
    {
      "id": "delivery2",
      "name": "Project",
      "order": 1,
      "title": "Delivery 2.0 Methodology & Process",
      "summary": "Project engagement playbook, phase by phase.",
      "description": "A strong services methodology is essential for delivering efficient, high-quality outcomes and consistent client experiences. GlideFast's Delivery 2.0 methodology provides a structured, repeatable framework that clarifies deliverables, timelines, roles, and resource allocation while addressing common implementation challenges and reducing delivery risk.\n\nEach chapter outlines the key inputs, activities, and deliverables across the customer journey, beginning with the Initiate and Plan phases. A RACI designation (Responsible, Accountable, Consulted, Informed) appears next to each task to indicate baseline role expectations; teams should validate and tailor these during the initiation phase based on the specific engagement.\n\nThe methodology is organized into five phases and presented sequentially from Initiate through Closure. However, most engagements follow an Agile approach, with Initiate, Plan, and Execute activities operating as iterative cycles throughout the lifecycle.\n\nDelivery 2.0 will continue to evolve based on lessons learned from real engagements. Teams are encouraged to share feedback, gaps, and improvement ideas through the provided feedback link so the methodology remains practical, relevant, and continuously improving.",
      "feedbackUrl": "mailto:delivery2.0@glidefast.com?subject=Delivery%202.0%20Feedback%20and%20Ideas%20Submission",
      "feedbackLabel": "Provide Feedback",
      "diagramUrl": "",
      "phases": [
        {
          "id": "d2-initiate",
          "name": "Initiate",
          "order": 1,
          "subPhases": [
            {
              "id": "d2-1-1",
              "sid": "1.1",
              "name": "Pre-IPKT",
              "order": 1,
              "icon": "inbox",
              "changelog": [
                {
                  "id": "c1",
                  "ts": "2026-07-14",
                  "text": "Input added: “ROM”",
                  "read": false
                },
                {
                  "id": "c2",
                  "ts": "2026-07-14",
                  "text": "Task edited: “Review SOW inputs”",
                  "read": false
                }
              ],
              "overview": "At this phase, the engagement is extremely likely to commence. Sales Executive has moved the opportunity in the Customer Relations Management (CRM) system to “Verbal” and we assign the future project team to get ready.",
              "objective": "The primary objective of this step is to familiarize yourself with the sales & contracting assets, ensure we have matched the correct skills to the customer expectations and call out any conflicts or anomalies well ahead of customer engagement.",
              "participants": [
                "arch",
                "em",
                "bpc"
              ],
              "comments": [
                "To be reviewed in advance of the IPKT. Recommended, over a week prior."
              ],
              "inputs": [
                "Addition to Slack Channel by Resourcing team",
                "SoW / Work Order",
                "IPKT Document",
                "ROM",
                "Lessons learned",
                "Previous / concurrent projects / GRSs conducted with the client",
                "Review outputs and insights from previous strategic advisory engagements with the client, if applicable"
              ],
              "deliverables": [
                "Notes and risks to the bottom section of the IPKT document",
                "If time sensitive and applicable (prior to IPKT), discuss with Sales team in advance"
              ],
              "tasks": [
                {
                  "id": "d2-1-1-t1",
                  "order": 1,
                  "text": "Review SOW inputs",
                  "raci": {
                    "arch": [
                      "R"
                    ],
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "tc": [
                      "R"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-1-1-t2",
                  "order": 2,
                  "text": "Take thorough notes",
                  "raci": {
                    "arch": [
                      "R"
                    ],
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "tc": [
                      "R"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-1-1-t3",
                  "order": 3,
                  "text": "Review and/or consult with AE / other Delivery personnel regarding previous / concurrent projects / GRSs conducted with the client",
                  "raci": {
                    "arch": [
                      "R"
                    ],
                    "em": [
                      "R"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "tc": [
                      "R"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-1-1-t4",
                  "order": 4,
                  "text": "Review lessons learned from previous engagements with the client",
                  "raci": {
                    "arch": [
                      "R"
                    ],
                    "em": [
                      "R"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "tc": [
                      "R"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-1-1-t5",
                  "order": 5,
                  "text": "Notate any questions or concerns in the IPKT document to discuss during IPKT",
                  "raci": {
                    "arch": [
                      "R"
                    ],
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "tc": [
                      "R"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d211t5-1",
                      "url": "#",
                      "roles": [],
                      "label": "Notate any questions or concerns in the IPKT document to discuss duri…"
                    }
                  ]
                }
              ],
              "meetings": [],
              "levelOfEffort": {
                "mode": "all",
                "all": {
                  "text": "3-5 hours",
                  "billable": true
                },
                "roles": {}
              }
            },
            {
              "id": "d2-1-2",
              "sid": "1.2",
              "name": "IPKT",
              "order": 2,
              "icon": "exchange",
              "changelog": [],
              "overview": "At this phase, the engagement is confirmed. The Sales Executive has moved the opportunity in the Customer Relations Management (CRM) system to “Closed Won” and we are just about ready to meet the client and commence. The heart of this step is the completion and live review of the IPKT document (and supporting documents) which serves as the transition phase.",
              "objective": "The primary objective of this step is to obtain knowledge from the sales team that negotiated the merits of the client engagement. A proper “handoff” will help ensure we come across as One company, remove any seams in the transition to Delivery and address any insights, risks and actions that we must take prior to meeting the client for the first time.",
              "participants": [
                "arch",
                "em",
                "bpc",
                "ux",
                "tc",
                "ae",
                "snse",
                "pssc",
                "tpm",
                "es",
                "resourcing",
                "apex"
              ],
              "comments": [
                "Remember to come prepared, after reviewing assets.",
                "Sales Executive - Should add IPKT document at least 5 business days prior to meeting.",
                "ServiceNow Sales Executive - consult with GlideFast sales exec to consider adding.",
                "Pre-Sales Solutions Consultant - Initiator & Facilitator of the meeting.",
                "Executive Sponsor at A/VP Level - Documented in the project channel."
              ],
              "inputs": [
                "IPKT Doc",
                "ROM",
                "SOW / Work Order",
                "Other customer collateral, as applicable"
              ],
              "deliverables": [
                "EM notates Risks on RIDAC within SPACE",
                "Execute resourcing / personnel modifications or mitigations",
                "Startup Checklist (revised)",
                "EM incorporates Workshop Outline into Pre-Kickoff and Kickoff decks"
              ],
              "tasks": [
                {
                  "id": "d2-1-2-t1",
                  "order": 1,
                  "text": "Sales presents the deal from their perspective",
                  "raci": {
                    "ae": [
                      "A"
                    ],
                    "arch": [
                      "I"
                    ],
                    "em": [
                      "I"
                    ],
                    "bpc": [
                      "I"
                    ],
                    "tc": [
                      "I"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-1-2-t2",
                  "order": 2,
                  "text": "Review of IPKT documentation",
                  "raci": {
                    "arch": [
                      "R"
                    ],
                    "em": [
                      "R"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "tc": [
                      "R"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-1-2-t3",
                  "order": 3,
                  "text": "Discussion and review of pre-IPKT highlights and notes",
                  "raci": {
                    "arch": [
                      "R"
                    ],
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "tc": [
                      "R"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-1-2-t4",
                  "order": 4,
                  "text": "Discuss Q&A, risks and issues. Document in RIDAC on the project record.",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "arch": [
                      "R"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d212t4-1",
                      "url": "#",
                      "roles": [
                        "em"
                      ],
                      "label": "Discuss Q&A, risks and issues. Document in RIDAC on the project record. (1)"
                    },
                    {
                      "id": "ja-d212t4-2",
                      "url": "#",
                      "roles": [
                        "arch"
                      ],
                      "label": "Discuss Q&A, risks and issues. Document in RIDAC on the project record. (2)"
                    }
                  ]
                },
                {
                  "id": "d2-1-2-t5",
                  "order": 5,
                  "text": "Tailor the Customer Startup checklist",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "I"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d212t5-1",
                      "url": "#",
                      "roles": [],
                      "label": "Tailor the Customer Startup checklist"
                    }
                  ]
                },
                {
                  "id": "d2-1-2-t6",
                  "order": 6,
                  "text": "Outline workshops, duration, and attendees",
                  "raci": {
                    "em": [
                      "C"
                    ],
                    "bpc": [
                      "R",
                      "A"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d212t6-1",
                      "url": "#",
                      "roles": [],
                      "label": "Outline workshops, duration, and attendees"
                    }
                  ]
                },
                {
                  "id": "d2-1-2-t7",
                  "order": 7,
                  "text": "Re-baseline resource plans",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "C"
                    ],
                    "arch": [
                      "C"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": []
                }
              ],
              "meetings": [
                {
                  "id": "mt-d212-1",
                  "name": "IPKT",
                  "scheduledBy": "ae",
                  "ledBy": "pssc",
                  "external": false
                }
              ],
              "levelOfEffort": {
                "mode": "byRole",
                "all": {},
                "roles": {
                  "arch": {
                    "text": "1 hour",
                    "billable": true
                  },
                  "em": {
                    "text": "1 hour",
                    "billable": true
                  },
                  "bpc": {
                    "text": "1 hour",
                    "billable": true
                  },
                  "ux": {
                    "text": "1 hour",
                    "billable": true,
                    "optional": true
                  },
                  "tc": {
                    "text": "1 hour each",
                    "billable": true
                  }
                }
              }
            },
            {
              "id": "d2-1-3",
              "sid": "1.3",
              "name": "Customer Pre-Kickoff",
              "order": 3,
              "icon": "door",
              "changelog": [],
              "overview": "Meet with the primary customer contact to plan logistics for the official kickoff and readiness activities ahead of engaging the broader customer team.",
              "objective": "Align on the timetable and readiness activities so everyone is prepared before the larger customer team gets involved.",
              "participants": [
                "arch",
                "bpc",
                "em",
                "es",
                "ae",
                "apex"
              ],
              "comments": [
                "Sales Executive schedules the online meeting & introduces the team",
                "Engagement Manager facilitates the meeting"
              ],
              "inputs": [
                "Customer Pre-Kickoff deck",
                "Startup checklist pre-modified by EM, Architect & BPC",
                "Outputs from previous strategic advisory engagements (if applicable)",
                "Workshop outline"
              ],
              "deliverables": [
                "Startup checklist (to be completed by customer)",
                "Success criteria value statements",
                "Updated Canvas with supplementary information",
                "Summary minutes",
                "Initial project schedule in PPM",
                "Initial workshop schedule"
              ],
              "tasks": [
                {
                  "id": "d2-1-3-t1",
                  "order": 1,
                  "text": "Introduction to the core GlideFast team",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "I"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d213t1-1",
                      "url": "#",
                      "roles": [
                        "em"
                      ],
                      "label": "Introduction to the core GlideFast team (1)"
                    },
                    {
                      "id": "ja-d213t1-2",
                      "url": "#",
                      "roles": [
                        "arch"
                      ],
                      "label": "Introduction to the core GlideFast team (2)"
                    }
                  ]
                },
                {
                  "id": "d2-1-3-t2",
                  "order": 2,
                  "text": "Prepare and walk through the start-up checklist with the customer",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "I"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d213t2-1",
                      "url": "#",
                      "roles": [],
                      "label": "Prepare and walk through the start-up checklist with the customer"
                    }
                  ]
                },
                {
                  "id": "d2-1-3-t3",
                  "order": 3,
                  "text": "Identify customer stakeholders and subject matter experts",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-1-3-t4",
                  "order": 4,
                  "text": "Review the Workshop Outline with the customer",
                  "raci": {
                    "em": [
                      "C"
                    ],
                    "bpc": [
                      "R",
                      "A"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-1-3-t5",
                  "order": 5,
                  "text": "Coordinate client schedules for kickoff and workshops",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "C"
                    ],
                    "tc": [
                      "I"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-1-3-t6",
                  "order": 6,
                  "text": "Create the initial project plan",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d213t6-1",
                      "url": "#",
                      "roles": [],
                      "label": "Create the initial project plan"
                    }
                  ]
                },
                {
                  "id": "d2-1-3-t7",
                  "order": 7,
                  "text": "Facilitate the meeting using the standard Customer Pre-Kickoff deck",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "I"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d213t7-1",
                      "url": "#",
                      "roles": [],
                      "label": "Facilitate the meeting using the standard Customer Pre-Kickoff deck"
                    }
                  ]
                }
              ],
              "meetings": [
                {
                  "id": "mt-d213-1",
                  "name": "Customer Pre-Kickoff",
                  "scheduledBy": "ae",
                  "ledBy": "em",
                  "external": true
                }
              ],
              "levelOfEffort": {
                "mode": "byRole",
                "all": {},
                "roles": {
                  "arch": {
                    "text": "1 hour",
                    "billable": true
                  },
                  "bpc": {
                    "text": "1 hour",
                    "billable": true
                  },
                  "em": {
                    "text": "1 hour",
                    "billable": true
                  }
                }
              }
            },
            {
              "id": "d2-1-4",
              "sid": "1.4",
              "name": "Get to Know the Team",
              "order": 4,
              "icon": "users",
              "changelog": [],
              "overview": "An internal step to assemble the engagement team and familiarize members with the merits of the project before customer kickoff.",
              "objective": "Align the team on customer expectations, ensure readiness and logistics, and establish architectural and development standards (led by the Architect).",
              "participants": [
                "arch",
                "em",
                "bpc",
                "tpm",
                "tc",
                "ux"
              ],
              "comments": [
                "Engagement Manager facilitates the meeting."
              ],
              "inputs": [
                "Customized Get to Know You Deck",
                "Notes & Summaries from IPKT and Pre-Kickoff Customer Meeting",
                "SoW and ROM"
              ],
              "deliverables": [
                "Risks & mitigations documented in RIDAC",
                "Tailored Customer Kickoff Deck"
              ],
              "tasks": [
                {
                  "id": "d2-1-4-t1",
                  "order": 1,
                  "text": "Engagement Manager customizes the Get to Know You deck",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "C"
                    ],
                    "arch": [
                      "C"
                    ],
                    "tc": [
                      "I"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d214t1-1",
                      "url": "#",
                      "roles": [],
                      "label": "Engagement Manager customizes the Get to Know You deck"
                    }
                  ]
                },
                {
                  "id": "d2-1-4-t2",
                  "order": 2,
                  "text": "Introduction of all team members",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "R"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-1-4-t3",
                  "order": 3,
                  "text": "Facilitate project readiness review using the standard deck",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "R"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-1-4-t4",
                  "order": 4,
                  "text": "Review timekeeping guidelines and progress notes",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "R"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d214t4-1",
                      "url": "#",
                      "roles": [],
                      "label": "Review timekeeping guidelines and progress notes"
                    }
                  ]
                },
                {
                  "id": "d2-1-4-t5",
                  "order": 5,
                  "text": "Tailor the customer kickoff deck in collaboration with BPC and Architect",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-1-4-t6",
                  "order": 6,
                  "text": "Initiate client onboarding and access to instances working with client stakeholders. Confirm if client equipment is required and facilitate distribution. Track equipment and understand the return process as we close down the project.",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "C"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "R"
                    ]
                  },
                  "jobAids": []
                }
              ],
              "meetings": [
                {
                  "id": "mt-d214-1",
                  "name": "Get to Know the Team",
                  "scheduledBy": "em",
                  "ledBy": "em",
                  "external": false
                }
              ],
              "levelOfEffort": {
                "mode": "all",
                "all": {
                  "text": "30-45 minutes each",
                  "billable": true
                },
                "roles": {}
              }
            },
            {
              "id": "d2-1-5",
              "sid": "1.5",
              "name": "Kickoff",
              "order": 5,
              "icon": "flag",
              "changelog": [],
              "overview": "Meet with the full customer team contributors to formally kick off the engagement.",
              "objective": "Ensure a successful start by aligning on project goals, deliverables, timelines, success criteria, clarifying roles, and discussing potential risks.",
              "participants": [
                "arch",
                "em",
                "bpc",
                "tc",
                "ux",
                "es",
                "tpm",
                "ae",
                "apex"
              ],
              "comments": [
                "Engagement Manager facilitates the meeting",
                "Executive Sponsor documented in the project channel",
                "Training Program Manager included if training is included in SoW"
              ],
              "inputs": [
                "Project kickoff deck (tailored in advance by EM, BPC, and Architect)"
              ],
              "deliverables": [
                "Summary minutes (created and sent by EM)",
                "Workshop planner sent to client participants",
                "RIDAC modifications"
              ],
              "tasks": [
                {
                  "id": "d2-1-5-t1",
                  "order": 1,
                  "text": "Review the draft kickoff deck",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "R"
                    ],
                    "es": [
                      "C"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-1-5-t2",
                  "order": 2,
                  "text": "Facilitate the meeting using the standard kickoff deck covering project readiness",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "R"
                    ],
                    "es": [
                      "C"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d215t2-1",
                      "url": "#",
                      "roles": [],
                      "label": "Facilitate the meeting using the standard kickoff deck covering proje…"
                    }
                  ]
                },
                {
                  "id": "d2-1-5-t3",
                  "order": 3,
                  "text": "Introduce upcoming Change Enablement and Testing Strategy sessions",
                  "raci": {
                    "em": [
                      "C"
                    ],
                    "bpc": [
                      "R",
                      "A"
                    ],
                    "arch": [
                      "C"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-1-5-t4",
                  "order": 4,
                  "text": "Finalize schedule, agenda, and SMEs for future workshops",
                  "raci": {
                    "em": [
                      "C"
                    ],
                    "bpc": [
                      "R",
                      "A"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d215t4-1",
                      "url": "#",
                      "roles": [],
                      "label": "Finalize schedule, agenda, and SMEs for future workshops"
                    }
                  ]
                },
                {
                  "id": "d2-1-5-t5",
                  "order": 5,
                  "text": "Create the first status report / status meeting",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "C"
                    ],
                    "arch": [
                      "C"
                    ],
                    "tc": [
                      "C"
                    ],
                    "es": [
                      "I"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d215t5-1",
                      "url": "#",
                      "roles": [],
                      "label": "Create the first status report / status meeting"
                    }
                  ]
                },
                {
                  "id": "d2-1-5-t6",
                  "order": 6,
                  "text": "Determine leadership check-in cadence (Executive Sponsor)",
                  "raci": {
                    "em": [
                      "C"
                    ],
                    "bpc": [
                      "C"
                    ],
                    "arch": [
                      "C"
                    ],
                    "tc": [
                      "C"
                    ],
                    "es": [
                      "R",
                      "A"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d215t6-1",
                      "url": "#",
                      "roles": [],
                      "label": "Determine leadership check-in cadence (Executive Sponsor)"
                    }
                  ]
                }
              ],
              "meetings": [
                {
                  "id": "mt-d215-1",
                  "name": "Kickoff",
                  "scheduledBy": "em",
                  "ledBy": "em",
                  "external": true
                }
              ],
              "levelOfEffort": {
                "mode": "all",
                "all": {
                  "text": "1 hour each",
                  "billable": true
                },
                "roles": {}
              }
            }
          ]
        },
        {
          "id": "d2-plan",
          "name": "Plan",
          "order": 2,
          "subPhases": [
            {
              "id": "d2-2-1",
              "sid": "2.1",
              "name": "Pre-Workshop Planning",
              "order": 1,
              "icon": "clipboard",
              "changelog": [
                {
                  "id": "c3",
                  "ts": "2026-07-10",
                  "text": "Task added: “Prepare Demo instance”",
                  "read": false
                }
              ],
              "overview": "At this phase, we are getting our customer team ready for a successful and efficient start of the project. Most of the steps are internal readiness activities, but coordination is needed while interfacing with the client.",
              "objective": "The primary objective of this stage is to ensure all logistics are cared for on our end, customer expectations are fully aligned, and we maximize the time and effort during the actual workshops, once they begin. This is our first big effort with the customer, and we need to show up prepared, aligned and productive.",
              "participants": [
                "arch",
                "bpc",
                "em",
                "ux"
              ],
              "comments": [
                "BPC facilitates readiness and logistics."
              ],
              "inputs": [
                "Customer demo instance",
                "Completed customer value statement",
                "Completed customer startup checklist"
              ],
              "deliverables": [
                "Workshop calendar invites & Workshop agenda (embedded in calendar invite & provided separately) sent to customer participants, by EM",
                "Customer pre-reads, prerequisites",
                "Workshop assets finalized (demo instance, decks, etc.)"
              ],
              "tasks": [
                {
                  "id": "d2-2-1-t1",
                  "order": 1,
                  "text": "Review completed Startup checklist",
                  "raci": {
                    "em": [
                      "R"
                    ],
                    "bpc": [
                      "R",
                      "A"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-2-1-t2",
                  "order": 2,
                  "text": "Align on future workshop needs (including agenda) and logistics",
                  "raci": {
                    "em": [
                      "R"
                    ],
                    "bpc": [
                      "R",
                      "A"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-2-1-t3",
                  "order": 3,
                  "text": "Role play prep for workshop",
                  "raci": {
                    "em": [
                      "R"
                    ],
                    "bpc": [
                      "R",
                      "A"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d221t3-1",
                      "url": "#",
                      "roles": [],
                      "label": "Role play prep for workshop"
                    }
                  ]
                },
                {
                  "id": "d2-2-1-t4",
                  "order": 4,
                  "text": "Prepare Demo instance",
                  "raci": {
                    "em": [
                      "I"
                    ],
                    "bpc": [
                      "C"
                    ],
                    "arch": [
                      "R",
                      "A"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d221t4-1",
                      "url": "#",
                      "roles": [],
                      "label": "Prepare Demo instance"
                    }
                  ]
                },
                {
                  "id": "d2-2-1-t5",
                  "order": 5,
                  "text": "Review current instance versions across instance stack (i.e. Dev/Test/Production) and ensure alignment ahead of proposed design and workshops. Coordinate with EM to document and mitigate issues.",
                  "raci": {
                    "em": [
                      "I"
                    ],
                    "bpc": [
                      "C"
                    ],
                    "arch": [
                      "R",
                      "A"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-2-1-t6",
                  "order": 6,
                  "text": "Lead Product Workshop preparation",
                  "raci": {
                    "em": [
                      "C"
                    ],
                    "bpc": [
                      "R",
                      "A"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d221t6-1",
                      "url": "#",
                      "roles": [],
                      "label": "Lead Product Workshop preparation"
                    }
                  ]
                },
                {
                  "id": "d2-2-1-t7",
                  "order": 7,
                  "text": "Coordinate Design team representative",
                  "raci": {
                    "em": [
                      "C"
                    ],
                    "bpc": [
                      "R",
                      "A"
                    ],
                    "arch": [
                      "C"
                    ],
                    "ux": [
                      "R"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-2-1-t8",
                  "order": 8,
                  "text": "Work with customer to enable Agile 2.0 module in their instance to track user stories and agile components",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "C"
                    ],
                    "arch": [
                      "C"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": []
                }
              ],
              "meetings": [
                {
                  "id": "mt-d221-1",
                  "name": "Pre-Workshop Planning",
                  "scheduledBy": "bpc",
                  "ledBy": "bpc",
                  "external": false
                }
              ],
              "levelOfEffort": {
                "mode": "byRole",
                "all": {},
                "roles": {
                  "arch": {
                    "text": "2 hours",
                    "billable": true
                  },
                  "bpc": {
                    "text": "3 hours",
                    "billable": true
                  },
                  "em": {
                    "text": "1 hour",
                    "billable": true
                  },
                  "ux": {
                    "text": "1 hour",
                    "billable": true,
                    "optional": true
                  }
                }
              }
            },
            {
              "id": "d2-2-2",
              "sid": "2.2",
              "name": "Customer Workshops",
              "order": 2,
              "icon": "presentation",
              "changelog": [],
              "overview": "Engage stakeholders to plan the engagement, understand business objectives, processes, and expectations for digital transformation with ServiceNow.",
              "objective": "Translate findings from workshops into tangible user stories to be developed/configured into the platform.",
              "participants": [
                "arch",
                "em",
                "bpc",
                "ba",
                "tc",
                "tpm",
                "ux"
              ],
              "comments": [
                "BPC facilitates logistics. Include design team representatives, if part of the engagement",
                "TC attendance will be determined during workshop pre-planning"
              ],
              "inputs": [
                "Customer demo instance",
                "Tailored workshop decks",
                "Use cases & case studies",
                "Prior epics/themes/stories (from advisory engagement)",
                "Starter user stories"
              ],
              "deliverables": [
                "Themes & epics",
                "Initial Requirement Traceability Matrix (RTM) work in progress",
                "Follow up sessions (demos, process reviews, shadowing, meetings)",
                "Documented testing strategy, UAT plan, and defined roles/responsibilities for solution testing",
                "Documented Change Enablement recommendations",
                "RIDAC updates",
                "Consolidated action items and summary notes"
              ],
              "tasks": [
                {
                  "id": "d2-2-2-t1",
                  "order": 1,
                  "text": "Load in any applicable GlideFast Starter Stories to help prepare for workshop topics and requirements-gathering discussions",
                  "raci": {
                    "em": [
                      "I"
                    ],
                    "bpc": [
                      "R",
                      "A"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-2-2-t2",
                  "order": 2,
                  "text": "Execute the Product Workshop",
                  "raci": {
                    "em": [
                      "C"
                    ],
                    "bpc": [
                      "R",
                      "A"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d222t2-1",
                      "url": "#",
                      "roles": [],
                      "label": "Execute the Product Workshop"
                    }
                  ]
                },
                {
                  "id": "d2-2-2-t3",
                  "order": 3,
                  "text": "Deliver workshop activities per plan",
                  "raci": {
                    "em": [
                      "C"
                    ],
                    "bpc": [
                      "R",
                      "A"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-2-2-t4",
                  "order": 4,
                  "text": "Lead the effort to coordinate requirements gathering cadence",
                  "raci": {
                    "em": [
                      "C"
                    ],
                    "bpc": [
                      "R",
                      "A"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d222t4-1",
                      "url": "#",
                      "roles": [],
                      "label": "Lead the effort to coordinate requirements gathering cadence"
                    }
                  ]
                },
                {
                  "id": "d2-2-2-t5",
                  "order": 5,
                  "text": "Initiate Testing Strategy and UAT Planning working session(s)",
                  "raci": {
                    "em": [
                      "C"
                    ],
                    "bpc": [
                      "R",
                      "A"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d222t5-1",
                      "url": "#",
                      "roles": [],
                      "label": "Initiate Testing Strategy and UAT Planning working session(s)"
                    }
                  ]
                },
                {
                  "id": "d2-2-2-t6",
                  "order": 6,
                  "text": "Initiate Change Enablement & Governance workshop session(s)",
                  "raci": {
                    "em": [
                      "C"
                    ],
                    "bpc": [
                      "R",
                      "A"
                    ],
                    "arch": [
                      "C"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d222t6-1",
                      "url": "#",
                      "roles": [],
                      "label": "Initiate Change Enablement & Governance workshop session(s)"
                    }
                  ]
                },
                {
                  "id": "d2-2-2-t7",
                  "order": 7,
                  "text": "Coordinate training logistics",
                  "raci": {
                    "em": [
                      "C"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "tpm": [
                      "R",
                      "A"
                    ],
                    "arch": [
                      "I"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-2-2-t8",
                  "order": 8,
                  "text": "Initiate and lead design workshop",
                  "raci": {
                    "em": [
                      "C"
                    ],
                    "bpc": [
                      "C"
                    ],
                    "arch": [
                      "R"
                    ],
                    "ux": [
                      "R",
                      "A"
                    ]
                  },
                  "jobAids": []
                }
              ],
              "meetings": [
                {
                  "id": "mt-d222-1",
                  "name": "Customer Workshops",
                  "scheduledBy": "em",
                  "ledBy": "bpc",
                  "external": true
                }
              ],
              "levelOfEffort": {
                "mode": "byRole",
                "all": {},
                "roles": {
                  "arch": {
                    "text": "Varies per SoW",
                    "billable": true
                  },
                  "em": {
                    "text": "Varies per SoW",
                    "billable": true
                  },
                  "bpc": {
                    "text": "Varies per SoW",
                    "billable": true
                  },
                  "ux": {
                    "text": "Varies per SoW",
                    "billable": true,
                    "optional": true
                  },
                  "tc": {
                    "text": "Non-billable unless EM & Architect say otherwise",
                    "billable": false
                  }
                }
              }
            },
            {
              "id": "d2-2-3",
              "sid": "2.3",
              "name": "Post Workshop",
              "order": 3,
              "icon": "archive",
              "changelog": [],
              "overview": "Internal phase where the Business Process Consultant and Architect align on high-level requirements and scope captured during customer workshops before presenting recommendations back to the client.",
              "objective": "Align on information absorbed during workshops, create initial user stories in the platform, identify scope issues/risks, and identify timeline dependencies.",
              "participants": [
                "arch",
                "em",
                "bpc"
              ],
              "comments": [
                "Remember to keep the momentum going and communicate clearly to customer next steps and timing needed to prepare user stories for review"
              ],
              "inputs": [
                "Epics & themes from the workshop",
                "Draft Requirements Traceability Matrix (RTM)",
                "Statement of Work (SoW)",
                "Workshop summary & notes",
                "Testing Strategy and UAT Plan",
                "Change Enablement recommendations"
              ],
              "deliverables": [
                "Updated Risks to the plan",
                "Initial dependencies (e.g. integrations) tracked on the project plan",
                "Scheduled additional working sessions for data collection",
                "Scope rebalancing impact meeting invite",
                "Revisions to the RTM",
                "Draft user stories",
                "Draft design concept(s)"
              ],
              "tasks": [
                {
                  "id": "d2-2-3-t1",
                  "order": 1,
                  "text": "Draft / populate user stories capturing workshop information into the platform",
                  "raci": {
                    "bpc": [
                      "R",
                      "A"
                    ],
                    "arch": [
                      "R"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d223t1-1",
                      "url": "#",
                      "roles": [],
                      "label": "Draft / populate user stories capturing workshop information into the…"
                    }
                  ]
                },
                {
                  "id": "d2-2-3-t2",
                  "order": 2,
                  "text": "Calibrate scope: compare draft with SoW and enter data into the RTM",
                  "raci": {
                    "em": [
                      "R"
                    ],
                    "bpc": [
                      "R",
                      "A"
                    ],
                    "arch": [
                      "R"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d223t2-1",
                      "url": "#",
                      "roles": [],
                      "label": "Calibrate scope: compare draft with SoW and enter data into the RTM"
                    }
                  ]
                },
                {
                  "id": "d2-2-3-t3",
                  "order": 3,
                  "text": "Risk assessment: work with EM on deviation risks from original scope/timeline",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "R"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-2-3-t4",
                  "order": 4,
                  "text": "Schedule scope rebalancing impact meetings with the client",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "R"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-2-3-t5",
                  "order": 5,
                  "text": "Create a deployment record on the ServiceNow partner portal",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "I"
                    ],
                    "arch": [
                      "C"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d223t5-1",
                      "url": "#",
                      "roles": [],
                      "label": "Create a deployment record on the ServiceNow partner portal"
                    }
                  ]
                },
                {
                  "id": "d2-2-3-t6",
                  "order": 6,
                  "text": "Propose design concepts to the customer",
                  "raci": {
                    "arch": [
                      "R"
                    ],
                    "ux": [
                      "R",
                      "A"
                    ]
                  },
                  "jobAids": []
                }
              ],
              "meetings": [
                {
                  "id": "mt-d223-1",
                  "name": "Post Workshop",
                  "scheduledBy": "bpc",
                  "ledBy": "bpc",
                  "external": false
                }
              ],
              "levelOfEffort": {
                "mode": "byRole",
                "all": {},
                "roles": {
                  "arch": {
                    "text": "2 days per workshop",
                    "billable": true
                  },
                  "bpc": {
                    "text": "2 days per workshop",
                    "billable": true
                  },
                  "em": {
                    "text": "Informed",
                    "billable": false
                  }
                }
              }
            },
            {
              "id": "d2-2-4",
              "sid": "2.4",
              "name": "Scope Rebalancing",
              "order": 4,
              "icon": "scales",
              "changelog": [],
              "overview": "Post-workshop analysis of scope, priorities, and timelines based on the Requirements Traceability Matrix (RTM). Confirm with the customer what will be delivered, deferred, or descoped to establish a baseline.",
              "objective": "Secure formal client alignment and approval on the rebalanced scope before development begins.",
              "participants": [
                "arch",
                "bpc",
                "em"
              ],
              "comments": [
                "Client alignment is critical for us to be successful. Ensure we clear all blockers and have a proper path forward to execute."
              ],
              "inputs": [
                "Completed RTM"
              ],
              "deliverables": [
                "Update RIDAC",
                "Change order with details and next steps from scope sessions",
                "Schedule additional calibration meetings until final decisions and alignment is met"
              ],
              "tasks": [
                {
                  "id": "d2-2-4-t1",
                  "order": 1,
                  "text": "Review RTM with client",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-2-4-t2",
                  "order": 2,
                  "text": "Discuss approach for non-in-scope stories and determine next steps",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d224t2-1",
                      "url": "#",
                      "roles": [],
                      "label": "Discuss approach for non-in-scope stories and determine next steps"
                    }
                  ]
                },
                {
                  "id": "d2-2-4-t3",
                  "order": 3,
                  "text": "Facilitate change order based on scope rebalancing outcomes",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "C"
                    ],
                    "arch": [
                      "C"
                    ],
                    "tc": [
                      "C"
                    ],
                    "es": [
                      "I"
                    ],
                    "ae": [
                      "I"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d224t3-1",
                      "url": "#",
                      "roles": [],
                      "label": "Facilitate change order based on scope rebalancing outcomes (1)"
                    },
                    {
                      "id": "ja-d224t3-2",
                      "url": "#",
                      "roles": [],
                      "label": "Facilitate change order based on scope rebalancing outcomes (2)"
                    }
                  ]
                }
              ],
              "meetings": [
                {
                  "id": "mt-d224-1",
                  "name": "Scope Rebalancing",
                  "scheduledBy": "em",
                  "ledBy": "em",
                  "external": true
                }
              ],
              "levelOfEffort": {
                "mode": "all",
                "all": {
                  "text": "1 hour",
                  "billable": true
                },
                "roles": {}
              }
            },
            {
              "id": "d2-2-5",
              "sid": "2.5",
              "name": "Refinement & Sprint Planning",
              "order": 5,
              "icon": "list",
              "changelog": [],
              "overview": "Internal phase where the GlideFast Architect and Business Process Consultant meet to review the scope, identify work, identify the backlog, and estimate effort for sprints.",
              "objective": "Create a well-defined, prioritized backlog with direction, definition, and goals for each sprint to be presented to the customer.",
              "participants": [
                "arch",
                "bpc",
                "em"
              ],
              "comments": [],
              "inputs": [
                "Stories in-scope from customer scope re-balancing meeting",
                "Initial project plan"
              ],
              "deliverables": [
                "Groomed user stories & proposal for level of effort",
                "Sprint sequencing in customer instance (or agile platform) and aligned to project plan",
                "High level technical approach (part of High-level Design (HLD))",
                "Refined project plan"
              ],
              "tasks": [
                {
                  "id": "d2-2-5-t1",
                  "order": 1,
                  "text": "Add short descriptions, personas, acceptance criteria, story pointing, and technical approach within the customer instance or customer’s agile/project application",
                  "raci": {
                    "em": [
                      "C"
                    ],
                    "bpc": [
                      "R",
                      "A"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d225t1-1",
                      "url": "#",
                      "roles": [],
                      "label": "Add short descriptions, personas, acceptance criteria, story pointing…"
                    }
                  ]
                },
                {
                  "id": "d2-2-5-t2",
                  "order": 2,
                  "text": "Identify blockers (APIs, additional customer inputs needed, data sources, etc.) as they relate to the solution",
                  "raci": {
                    "em": [
                      "C"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "R",
                      "A"
                    ],
                    "tc": [
                      "R"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-2-5-t3",
                  "order": 3,
                  "text": "Add testing acceptance criteria for functional business requirements in user stories",
                  "raci": {
                    "em": [
                      "C"
                    ],
                    "bpc": [
                      "R",
                      "A"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d225t3-1",
                      "url": "#",
                      "roles": [],
                      "label": "Add testing acceptance criteria for functional business requirements …"
                    }
                  ]
                },
                {
                  "id": "d2-2-5-t4",
                  "order": 4,
                  "text": "Draft high level technical approach to development within the High-Level Proposed Design (HLD) document",
                  "raci": {
                    "em": [
                      "I"
                    ],
                    "bpc": [
                      "C"
                    ],
                    "arch": [
                      "R",
                      "A"
                    ],
                    "tc": [
                      "R"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d225t4-1",
                      "url": "#",
                      "roles": [],
                      "label": "Draft high level technical approach to development within the High-Le…"
                    }
                  ]
                },
                {
                  "id": "d2-2-5-t5",
                  "order": 5,
                  "text": "User story sequencing & dependencies identified",
                  "raci": {
                    "em": [
                      "C"
                    ],
                    "bpc": [
                      "R",
                      "A"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-2-5-t6",
                  "order": 6,
                  "text": "Organize sprint roadmap in customer instance",
                  "raci": {
                    "em": [
                      "C"
                    ],
                    "bpc": [
                      "R",
                      "A"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-2-5-t7",
                  "order": 7,
                  "text": "Prepare draft sprint planning to review with customer",
                  "raci": {
                    "em": [
                      "C"
                    ],
                    "bpc": [
                      "R",
                      "A"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-2-5-t8",
                  "order": 8,
                  "text": "Schedule customer sprint planning review",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "C"
                    ],
                    "tc": [
                      "I"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d225t8-1",
                      "url": "#",
                      "roles": [],
                      "label": "Schedule customer sprint planning review"
                    }
                  ]
                },
                {
                  "id": "d2-2-5-t9",
                  "order": 9,
                  "text": "Refine project plan",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "C"
                    ],
                    "tc": [
                      "I"
                    ]
                  },
                  "jobAids": []
                }
              ],
              "meetings": [
                {
                  "id": "mt-d225-1",
                  "name": "Refinement & Sprint Planning",
                  "scheduledBy": "bpc",
                  "ledBy": "bpc",
                  "external": false
                }
              ],
              "levelOfEffort": {
                "mode": "byRole",
                "all": {},
                "roles": {
                  "arch": {
                    "text": "8-12 hrs each, per focus area",
                    "billable": true
                  },
                  "bpc": {
                    "text": "8-12 hrs each, per focus area",
                    "billable": true
                  },
                  "em": {
                    "text": "2-5 hrs",
                    "billable": true
                  }
                }
              }
            },
            {
              "id": "d2-2-6",
              "sid": "2.6",
              "name": "Sprint Planning with Customer",
              "order": 6,
              "icon": "calendar",
              "changelog": [],
              "overview": "External sprint planning meeting to align all stakeholders, especially the customer, with goals, scope, and priorities for upcoming sprints.",
              "objective": "Align on sprint goals; define scope/deliverables; discuss dependencies, risks, and concerns; agree on priorities; set expectations; and discuss next steps.",
              "participants": [
                "arch",
                "bpc",
                "em",
                "tc"
              ],
              "comments": [],
              "inputs": [
                "Draft sprint plan within customer’s agile/project planning tool",
                "Draft High-Level Design (HLD)"
              ],
              "deliverables": [
                "Re-calibration of plan (if applicable), scheduled follow up meetings",
                "Project plan refinement",
                "EM sends summary and next steps to customer & stakeholders"
              ],
              "tasks": [
                {
                  "id": "d2-2-6-t1",
                  "order": 1,
                  "text": "Review proposed plan",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-2-6-t2",
                  "order": 2,
                  "text": "Obtain customer approval and signoff. Document approvals within user stories",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d226t2-1",
                      "url": "#",
                      "roles": [],
                      "label": "Obtain customer approval and signoff. Document approvals within user …"
                    }
                  ]
                },
                {
                  "id": "d2-2-6-t3",
                  "order": 3,
                  "text": "Core team assign stories for development, post-approval from the customer",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "R"
                    ]
                  },
                  "jobAids": []
                }
              ],
              "meetings": [
                {
                  "id": "mt-d226-1",
                  "name": "Sprint Planning with Customer",
                  "scheduledBy": "bpc",
                  "ledBy": "bpc",
                  "external": true
                }
              ],
              "levelOfEffort": {
                "mode": "byRole",
                "all": {},
                "roles": {
                  "arch": {
                    "text": "1-2 hours per sprint",
                    "billable": true
                  },
                  "bpc": {
                    "text": "1-2 hours per sprint",
                    "billable": true
                  },
                  "em": {
                    "text": "1-2 hours per sprint",
                    "billable": true
                  },
                  "tc": {
                    "text": "1-2 hours per sprint",
                    "billable": true
                  }
                }
              }
            }
          ]
        },
        {
          "id": "d2-execute",
          "name": "Execute",
          "order": 3,
          "subPhases": [
            {
              "id": "d2-3-1",
              "sid": "3.1",
              "name": "Build Activities",
              "order": 1,
              "icon": "code",
              "changelog": [],
              "overview": "This phase is where we execute high quality development and code configurations within the ServiceNow platform. We do this iteratively and incrementally, ensuring that the output evolves in alignment with the plans set forth with the customer, prior.",
              "objective": "The objective of the development phase is to build upon the user stories established and create a working ServiceNow platform environment that will help customer meet their stated business objectives, in the timeline set forth.",
              "participants": [
                "arch",
                "bpc",
                "em",
                "tc",
                "ux"
              ],
              "comments": [],
              "inputs": [
                "Sprint roadmap",
                "Approved stories",
                "New requirements & defects",
                "Project Plan",
                "Resource Plan",
                "Requirements traceability matrix (RTM)"
              ],
              "deliverables": [
                "Completion & sign off of stories within sprint(s)",
                "Code release",
                "Weekly status reports (EM)",
                "Requirements traceability matrix (RTM)",
                "Sprint plan"
              ],
              "tasks": [
                {
                  "id": "d2-3-1-t1",
                  "order": 1,
                  "text": "Facilitate and prepare for Sprint planning prior to start of the upcoming sprint",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "R"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d231t1-1",
                      "url": "#",
                      "roles": [],
                      "label": "Facilitate and prepare for Sprint planning prior to start of the upco…"
                    }
                  ]
                },
                {
                  "id": "d2-3-1-t2",
                  "order": 2,
                  "text": "Review stories with the project team and ensure plan for the sprint is aligned with GF and client",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "R"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d231t2-1",
                      "url": "#",
                      "roles": [],
                      "label": "Review stories with the project team and ensure plan for the sprint i…"
                    }
                  ]
                },
                {
                  "id": "d2-3-1-t3",
                  "order": 3,
                  "text": "User story refining and unblocking",
                  "raci": {
                    "em": [
                      "C"
                    ],
                    "bpc": [
                      "R",
                      "A"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d231t3-1",
                      "url": "#",
                      "roles": [],
                      "label": "User story refining and unblocking"
                    }
                  ]
                },
                {
                  "id": "d2-3-1-t4",
                  "order": 4,
                  "text": "Establish Daily Standup (DSU) cadence with the client and GlideFast team",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "R"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d231t4-1",
                      "url": "#",
                      "roles": [],
                      "label": "Establish Daily Standup (DSU) cadence with the client and GlideFast team"
                    }
                  ]
                },
                {
                  "id": "d2-3-1-t5",
                  "order": 5,
                  "text": "Guide Architects / TCs on agreed-upon design concepts",
                  "raci": {
                    "em": [
                      "I"
                    ],
                    "bpc": [
                      "C"
                    ],
                    "arch": [
                      "R",
                      "A"
                    ],
                    "ux": [
                      "R"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-3-1-t6",
                  "order": 6,
                  "text": "Development and configuration of user stories",
                  "raci": {
                    "em": [
                      "I"
                    ],
                    "bpc": [
                      "C"
                    ],
                    "arch": [
                      "C"
                    ],
                    "tc": [
                      "R",
                      "A"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-3-1-t7",
                  "order": 7,
                  "text": "Defect remediation",
                  "raci": {
                    "em": [
                      "C"
                    ],
                    "bpc": [
                      "C"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "R",
                      "A"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d231t7-1",
                      "url": "#",
                      "roles": [],
                      "label": "Defect remediation"
                    }
                  ]
                },
                {
                  "id": "d2-3-1-t8",
                  "order": 8,
                  "text": "Create code notations and work notes within stories",
                  "raci": {
                    "em": [
                      "I"
                    ],
                    "bpc": [
                      "C"
                    ],
                    "arch": [
                      "C"
                    ],
                    "tc": [
                      "R",
                      "A"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d231t8-1",
                      "url": "#",
                      "roles": [],
                      "label": "Create code notations and work notes within stories"
                    }
                  ]
                },
                {
                  "id": "d2-3-1-t9",
                  "order": 9,
                  "text": "Conduct unit tests for developed features",
                  "raci": {
                    "em": [
                      "I"
                    ],
                    "bpc": [
                      "C"
                    ],
                    "arch": [
                      "C"
                    ],
                    "tc": [
                      "R",
                      "A"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d231t9-1",
                      "url": "#",
                      "roles": [],
                      "label": "Conduct unit tests for developed features"
                    }
                  ]
                },
                {
                  "id": "d2-3-1-t10",
                  "order": 10,
                  "text": "Conduct peer reviews of code / configurations",
                  "raci": {
                    "em": [
                      "I"
                    ],
                    "bpc": [
                      "C"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "R",
                      "A"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d231t10-1",
                      "url": "#",
                      "roles": [],
                      "label": "Conduct peer reviews of code / configurations"
                    }
                  ]
                },
                {
                  "id": "d2-3-1-t11",
                  "order": 11,
                  "text": "Prepare for the demonstration at the end of the sprint",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "R"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d231t11-1",
                      "url": "#",
                      "roles": [],
                      "label": "Prepare for the demonstration at the end of the sprint"
                    }
                  ]
                },
                {
                  "id": "d2-3-1-t12",
                  "order": 12,
                  "text": "Coordinate with team which stories are being reviewed in Sprint demos",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "R"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-3-1-t13",
                  "order": 13,
                  "text": "Deliver sprint demos",
                  "raci": {
                    "em": [
                      "R"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "R",
                      "A"
                    ],
                    "tc": [
                      "R"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d231t13-1",
                      "url": "#",
                      "roles": [],
                      "label": "Deliver sprint demos"
                    }
                  ]
                },
                {
                  "id": "d2-3-1-t14",
                  "order": 14,
                  "text": "Obtain customer approvals after sprint demo & adjust backlog as needed",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-3-1-t15",
                  "order": 15,
                  "text": "Reconcile RTM from planning phase and refine during sprint planning. Additional scope calibration sessions may be needed to ensure alignment with client post demos and/or sprint planning",
                  "raci": {
                    "em": [
                      "R"
                    ],
                    "bpc": [
                      "R",
                      "A"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": []
                }
              ],
              "meetings": [],
              "levelOfEffort": {
                "mode": "all",
                "all": {
                  "text": "As Defined",
                  "billable": true
                },
                "roles": {
                  "ux": {
                    "text": "Defined by portal concept complexity",
                    "billable": true,
                    "optional": true
                  }
                }
              }
            },
            {
              "id": "d2-3-2",
              "sid": "3.2",
              "name": "Build Validation and UAT Readiness",
              "order": 2,
              "icon": "flask",
              "changelog": [],
              "overview": "Collaborative effort to finalize system configuration, validate functionality, and prepare for User Acceptance Testing (UAT) and go-live.",
              "objective": "Ensure a seamless transition from build to validation/readiness by coordinating technical documentation, testing, UAT readiness, change enablement, and training.",
              "participants": [
                "arch",
                "bpc",
                "em",
                "tc",
                "ux"
              ],
              "comments": [],
              "inputs": [
                "Test strategy and decisions",
                "Testing Plan",
                "New requirements & defects",
                "Project Plan",
                "Resource Plan",
                "Requirements traceability matrix (RTM)"
              ],
              "deliverables": [
                "UAT materials and calendar invite for kickoff",
                "Training plan and logistics",
                "UAT kick off",
                "Test plans & script finalization",
                "Completion & sign off of stories, end to end",
                "Weekly status reports (EM)",
                "Requirements traceability matrix (RTM)"
              ],
              "tasks": [
                {
                  "id": "d2-3-2-t1",
                  "order": 1,
                  "text": "Draft technical documentation and As Built documents",
                  "raci": {
                    "em": [
                      "I"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "R",
                      "A"
                    ],
                    "tc": [
                      "R"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d232t1-1",
                      "url": "#",
                      "roles": [],
                      "label": "Draft technical documentation and As Built documents"
                    }
                  ]
                },
                {
                  "id": "d2-3-2-t2",
                  "order": 2,
                  "text": "Facilitate and prepare for end-to-end (E2E) demos, including testing all configuration from sprints",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "R"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-3-2-t3",
                  "order": 3,
                  "text": "Deliver E2E demos",
                  "raci": {
                    "em": [
                      "R"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "R",
                      "A"
                    ],
                    "tc": [
                      "R"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d232t3-1",
                      "url": "#",
                      "roles": [],
                      "label": "Deliver E2E demos"
                    }
                  ]
                },
                {
                  "id": "d2-3-2-t4",
                  "order": 4,
                  "text": "Schedule and conduct UAT Kickoff meetings (including deck preparation)",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "C"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d232t4-1",
                      "url": "#",
                      "roles": [],
                      "label": "Schedule and conduct UAT Kickoff meetings (including deck preparation)"
                    }
                  ]
                },
                {
                  "id": "d2-3-2-t5",
                  "order": 5,
                  "text": "Execute Change Enablement and Go-Live Support planning",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "C"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d232t5-1",
                      "url": "#",
                      "roles": [],
                      "label": "Execute Change Enablement and Go-Live Support planning"
                    }
                  ]
                },
                {
                  "id": "d2-3-2-t6",
                  "order": 6,
                  "text": "Execution of the training plan by the training team",
                  "raci": {
                    "em": [
                      "C"
                    ],
                    "bpc": [
                      "C"
                    ],
                    "tpm": [
                      "R",
                      "A"
                    ],
                    "trainer": [
                      "R"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-3-2-t7",
                  "order": 7,
                  "text": "Validate the final set of user stories against the RTM",
                  "raci": {
                    "em": [
                      "C"
                    ],
                    "bpc": [
                      "R",
                      "A"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": []
                }
              ],
              "meetings": [],
              "levelOfEffort": {
                "mode": "all",
                "all": {
                  "text": "As Defined",
                  "billable": true
                },
                "roles": {}
              }
            }
          ]
        },
        {
          "id": "d2-deliver",
          "name": "Deliver",
          "order": 4,
          "subPhases": [
            {
              "id": "d2-4-1",
              "sid": "4.1",
              "name": "UAT",
              "order": 1,
              "icon": "shield",
              "changelog": [],
              "overview": "The User Acceptance Testing (UAT) is a phase in our overall engagement in which the software/configuration built by GlideFast is tested in “real world” environments with representatives of the personas who will be using ServiceNow simulating their future use and accepting the work performed based on the requirements.",
              "objective": "The primary objective of UAT is to ensure the ServiceNow code we delivered can perform required tasks in “real world” scenarios, based on the battery of tests built prior. Furthermore, to ensure that defects, if any, are worked on and resolved satisfactorily.",
              "participants": [
                "arch",
                "bpc",
                "em",
                "tc"
              ],
              "comments": [
                "User Acceptance Testing is critical because it validates that the configured solution meets business requirements and workflows before go-live, reducing the risk of defects and ensuring user adoption."
              ],
              "inputs": [
                "UAT strategy & plan from kick off"
              ],
              "deliverables": [
                "Progress and status reports throughout UAT phase",
                "UAT signoff",
                "Backlog inventory within customer’s agile platform"
              ],
              "tasks": [
                {
                  "id": "d2-4-1-t1",
                  "order": 1,
                  "text": "Execute UAT based on testing services in the SOW. Note: baseline testing efforts of premium testing not purchased by customer",
                  "raci": {
                    "em": [
                      "R"
                    ],
                    "bpc": [
                      "R",
                      "A"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-4-1-t2",
                  "order": 2,
                  "text": "Establish UAT reporting cadence",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "C"
                    ],
                    "arch": [
                      "C"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d241t2-1",
                      "url": "#",
                      "roles": [],
                      "label": "Establish UAT reporting cadence"
                    }
                  ]
                },
                {
                  "id": "d2-4-1-t3",
                  "order": 3,
                  "text": "Prioritize and address defects thru resolution",
                  "raci": {
                    "em": [
                      "C"
                    ],
                    "bpc": [
                      "C"
                    ],
                    "arch": [
                      "R",
                      "A"
                    ],
                    "tc": [
                      "R"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-4-1-t4",
                  "order": 4,
                  "text": "Work with customer on backlog prioritization and plan for enhancements",
                  "raci": {
                    "em": [
                      "R"
                    ],
                    "bpc": [
                      "R",
                      "A"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d241t4-1",
                      "url": "#",
                      "roles": [],
                      "label": "Work with customer on backlog prioritization and plan for enhancements"
                    }
                  ]
                }
              ],
              "meetings": [
                {
                  "id": "mt-d241-1",
                  "name": "UAT",
                  "scheduledBy": "em",
                  "ledBy": "em",
                  "external": true
                }
              ],
              "levelOfEffort": {
                "mode": "all",
                "all": {
                  "text": "As Defined",
                  "billable": true
                },
                "roles": {}
              }
            },
            {
              "id": "d2-4-2",
              "sid": "4.2",
              "name": "Go Live Preparedness",
              "order": 2,
              "icon": "rocket",
              "changelog": [],
              "overview": "Final assessment phase where the team ensures everything is ready for launch to avoid disruptions. Covers communication and training delivery ahead of customer sign-off.",
              "objective": "Ensure all internal readiness tasks (Technical, Operational, Business) are finished and ready for customer sign-off.",
              "participants": [
                "arch",
                "bpc",
                "em",
                "tc"
              ],
              "comments": [],
              "inputs": [
                "UAT signoff",
                "RTM document complete",
                "Backlog"
              ],
              "deliverables": [
                "Deployment runbook",
                "As-built technical document",
                "Process documents",
                "Go Live checklist",
                "Hypercare plan"
              ],
              "tasks": [
                {
                  "id": "d2-4-2-t1",
                  "order": 1,
                  "text": "Schedule and prepare for the Go Live readiness meeting with the customer",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "C"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d242t1-1",
                      "url": "#",
                      "roles": [],
                      "label": "Schedule and prepare for the Go Live readiness meeting with the customer"
                    }
                  ]
                },
                {
                  "id": "d2-4-2-t2",
                  "order": 2,
                  "text": "Finalize the deployment runbook",
                  "raci": {
                    "em": [
                      "C"
                    ],
                    "bpc": [
                      "C"
                    ],
                    "arch": [
                      "R",
                      "A"
                    ],
                    "tc": [
                      "R"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d242t2-1",
                      "url": "#",
                      "roles": [],
                      "label": "Finalize the deployment runbook"
                    }
                  ]
                },
                {
                  "id": "d2-4-2-t3",
                  "order": 3,
                  "text": "Finalize the As-Built technical document",
                  "raci": {
                    "em": [
                      "I"
                    ],
                    "bpc": [
                      "C"
                    ],
                    "arch": [
                      "R",
                      "A"
                    ],
                    "tc": [
                      "R"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d242t3-1",
                      "url": "#",
                      "roles": [],
                      "label": "Finalize the As-Built technical document"
                    }
                  ]
                },
                {
                  "id": "d2-4-2-t4",
                  "order": 4,
                  "text": "Review and validate all instance (i.e. Dev/Test/Production) versions are in sync in preparation for deployment",
                  "raci": {
                    "em": [
                      "C"
                    ],
                    "bpc": [
                      "C"
                    ],
                    "arch": [
                      "R",
                      "A"
                    ],
                    "tc": [
                      "R"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-4-2-t5",
                  "order": 5,
                  "text": "Schedule and deliver Knowledge Transfer (KT) sessions to the client",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-4-2-t6",
                  "order": 6,
                  "text": "Finalize and deliver process documents and training",
                  "raci": {
                    "em": [
                      "C"
                    ],
                    "bpc": [
                      "R",
                      "A"
                    ],
                    "tpm": [
                      "R"
                    ],
                    "trainer": [
                      "R"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-4-2-t7",
                  "order": 7,
                  "text": "Develop and finalize the hypercare plan",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "C"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d242t7-1",
                      "url": "#",
                      "roles": [],
                      "label": "Develop and finalize the hypercare plan"
                    }
                  ]
                }
              ],
              "meetings": [
                {
                  "id": "mt-d242-1",
                  "name": "Go Live Preparedness",
                  "scheduledBy": "em",
                  "ledBy": "em",
                  "external": true
                }
              ],
              "levelOfEffort": {
                "mode": "all",
                "all": {
                  "text": "8-16 hours",
                  "billable": true
                },
                "roles": {}
              }
            },
            {
              "id": "d2-4-3",
              "sid": "4.3",
              "name": "Customer Signoff & Go Live Readiness",
              "order": 3,
              "icon": "stamp",
              "changelog": [],
              "overview": "Critical step to ensure scope delivery and customer sign-off before official go-live activities.",
              "objective": "Ensure complete buy-in and sign-off for transitioning to go-live preparation.",
              "participants": [
                "arch",
                "bpc",
                "em",
                "tc"
              ],
              "comments": [],
              "inputs": [
                "UAT signoff"
              ],
              "deliverables": [
                "Summary email & customer sign off"
              ],
              "tasks": [
                {
                  "id": "d2-4-3-t1",
                  "order": 1,
                  "text": "Review standard go live readiness agenda deck (run book, RTM, Go Live checklist)",
                  "raci": {
                    "em": [
                      "A"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d243t1-1",
                      "url": "#",
                      "roles": [],
                      "label": "Review standard go live readiness agenda deck (run book, RTM, Go Live…"
                    }
                  ]
                },
                {
                  "id": "d2-4-3-t2",
                  "order": 2,
                  "text": "Obtain signoff (go/no-go) from customer",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "C"
                    ],
                    "arch": [
                      "C"
                    ],
                    "tc": [
                      "I"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-4-3-t3",
                  "order": 3,
                  "text": "Prepare for “go live” / change enablement final phases of plan",
                  "raci": {
                    "em": [
                      "C"
                    ],
                    "bpc": [
                      "R",
                      "A"
                    ],
                    "arch": [
                      "C"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d243t3-1",
                      "url": "#",
                      "roles": [],
                      "label": "Prepare for “go live” / change enablement final phases of plan"
                    }
                  ]
                },
                {
                  "id": "d2-4-3-t4",
                  "order": 4,
                  "text": "Discuss schedule & logistics for “go live” celebration",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "C"
                    ],
                    "arch": [
                      "C"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-4-3-t5",
                  "order": 5,
                  "text": "Submit Go Live Request",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "C"
                    ],
                    "arch": [
                      "C"
                    ],
                    "tc": [
                      "I"
                    ]
                  },
                  "jobAids": []
                }
              ],
              "meetings": [
                {
                  "id": "mt-d243-1",
                  "name": "Customer Signoff & Go Live Readiness",
                  "scheduledBy": "em",
                  "ledBy": "em",
                  "external": true
                }
              ],
              "levelOfEffort": {
                "mode": "all",
                "all": {
                  "text": "1-2 hrs",
                  "billable": true
                },
                "roles": {}
              }
            },
            {
              "id": "d2-4-4",
              "sid": "4.4",
              "name": "Deploy",
              "order": 4,
              "icon": "cloud",
              "changelog": [],
              "overview": "Make the system available to customer users by implementing ServiceNow software in a live, production environment.",
              "objective": "Successfully deploy based on a plan, complete smoke testing, and ensure the system performs to customer expectations.",
              "participants": [
                "arch",
                "bpc",
                "em",
                "tc"
              ],
              "comments": [],
              "inputs": [
                "Run book",
                "Update sets",
                "Data load, if applicable",
                "Go Live plan"
              ],
              "deliverables": [
                "Update sets committed to production",
                "Deployment complete email to all stakeholders"
              ],
              "tasks": [
                {
                  "id": "d2-4-4-t1",
                  "order": 1,
                  "text": "Schedule deployment window",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "C"
                    ],
                    "arch": [
                      "C"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-4-4-t2",
                  "order": 2,
                  "text": "Provide status and progress during the window",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "R"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-4-4-t3",
                  "order": 3,
                  "text": "Commit update sets to production",
                  "raci": {
                    "em": [
                      "C"
                    ],
                    "bpc": [
                      "C"
                    ],
                    "arch": [
                      "R",
                      "A"
                    ],
                    "tc": [
                      "R"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d244t3-1",
                      "url": "#",
                      "roles": [],
                      "label": "Commit update sets to production"
                    }
                  ]
                },
                {
                  "id": "d2-4-4-t4",
                  "order": 4,
                  "text": "Execute and complete smoke testing",
                  "raci": {
                    "em": [
                      "C"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "R",
                      "A"
                    ],
                    "tc": [
                      "R"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d244t4-1",
                      "url": "#",
                      "roles": [],
                      "label": "Execute and complete smoke testing"
                    }
                  ]
                },
                {
                  "id": "d2-4-4-t5",
                  "order": 5,
                  "text": "Execute “go live” / change enablement",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "C"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d244t5-1",
                      "url": "#",
                      "roles": [],
                      "label": "Execute “go live” / change enablement"
                    }
                  ]
                },
                {
                  "id": "d2-4-4-t6",
                  "order": 6,
                  "text": "Training team executes training plan",
                  "raci": {
                    "em": [
                      "C"
                    ],
                    "bpc": [
                      "C"
                    ],
                    "tpm": [
                      "R",
                      "A"
                    ],
                    "trainer": [
                      "R"
                    ]
                  },
                  "jobAids": []
                }
              ],
              "meetings": [
                {
                  "id": "mt-d244-1",
                  "name": "Deploy",
                  "scheduledBy": "em",
                  "ledBy": "em",
                  "external": false
                }
              ],
              "levelOfEffort": {
                "mode": "byRole",
                "all": {},
                "roles": {
                  "arch": {
                    "text": "10h",
                    "billable": true
                  },
                  "bpc": {
                    "text": "10h",
                    "billable": true
                  },
                  "em": {
                    "text": "8h",
                    "billable": true
                  },
                  "tc": {
                    "text": "10h each",
                    "billable": true
                  }
                }
              }
            },
            {
              "id": "d2-4-5",
              "sid": "4.5",
              "name": "Hypercare",
              "order": 5,
              "icon": "lifebuoy",
              "changelog": [],
              "overview": "Period where GlideFast is available for post-go-live support (anomalies, bugs, questions).",
              "objective": "Ensure a smooth transition into full production for the customer.",
              "participants": [
                "arch",
                "bpc",
                "em",
                "tc"
              ],
              "comments": [],
              "inputs": [
                "Hypercare plan & schedule"
              ],
              "deliverables": [
                "Hypercare summary & status emails",
                "Documented defects or enhancements added to the backlog"
              ],
              "tasks": [
                {
                  "id": "d2-4-5-t1",
                  "order": 1,
                  "text": "Document issues, defects, and enhancements",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "R"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-4-5-t2",
                  "order": 2,
                  "text": "Remediate issues and defects",
                  "raci": {
                    "em": [
                      "C"
                    ],
                    "bpc": [
                      "C"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "R",
                      "A"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-4-5-t3",
                  "order": 3,
                  "text": "Send Hypercare end of day status",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "C"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d245t3-1",
                      "url": "#",
                      "roles": [],
                      "label": "Send Hypercare end of day status"
                    }
                  ]
                },
                {
                  "id": "d2-4-5-t4",
                  "order": 4,
                  "text": "Send Hypercare complete email with final status",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "C"
                    ],
                    "arch": [
                      "C"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": []
                }
              ],
              "meetings": [
                {
                  "id": "mt-d245-1",
                  "name": "Hypercare",
                  "scheduledBy": "em",
                  "ledBy": "em",
                  "external": false
                }
              ],
              "levelOfEffort": {
                "mode": "byRole",
                "all": {},
                "roles": {
                  "arch": {
                    "text": "2 hours / week",
                    "billable": true
                  },
                  "bpc": {
                    "text": "2 hours / week",
                    "billable": true
                  },
                  "em": {
                    "text": "5 hours / week",
                    "billable": true
                  },
                  "tc": {
                    "text": "3 hours / week",
                    "billable": true
                  }
                }
              }
            }
          ]
        },
        {
          "id": "d2-close",
          "name": "Close",
          "order": 5,
          "subPhases": [
            {
              "id": "d2-5-1",
              "sid": "5.1",
              "name": "Internal Closure Meeting",
              "order": 1,
              "icon": "briefcase",
              "changelog": [],
              "overview": "This is the phase in the journey where we prepare for the customer official closure meeting, discuss lessons learned, and care for any internal logistics necessary and associated with the closure of the engagement.",
              "objective": "The primary objective of this step is to capture all learnings from the engagement for the purpose of internal improvement and closely align on what is expected at the customer closure meeting.",
              "participants": [
                "arch",
                "bpc",
                "em",
                "tc",
                "sa",
                "pssc",
                "ae",
                "es",
                "mktg"
              ],
              "comments": [],
              "inputs": [
                "Internal closure deck template"
              ],
              "deliverables": [
                "Revised external closure deck",
                "Schedule external closure meeting",
                "Lessons learned",
                "Draft marketing case study"
              ],
              "tasks": [
                {
                  "id": "d2-5-1-t1",
                  "order": 1,
                  "text": "Schedule and facilitate internal retrospective & execute internal lesson learned gathering and document in SPACE",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "R"
                    ],
                    "pssc": [
                      "R"
                    ],
                    "es": [
                      "C",
                      "I"
                    ],
                    "mktg": [
                      "R"
                    ],
                    "ae": [
                      "C",
                      "I"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d251t1-1",
                      "url": "#",
                      "roles": [],
                      "label": "Schedule and facilitate internal retrospective & execute internal les…"
                    }
                  ]
                },
                {
                  "id": "d2-5-1-t2",
                  "order": 2,
                  "text": "Confirm customer equipment return process and facilitate with each GlideFast team member",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "C"
                    ],
                    "arch": [
                      "C"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-5-1-t3",
                  "order": 3,
                  "text": "Schedule customer closure meeting",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "C"
                    ],
                    "arch": [
                      "C"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-5-1-t4",
                  "order": 4,
                  "text": "Finalize case study questions and interviews with relevant team members",
                  "raci": {
                    "em": [
                      "R"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "R"
                    ],
                    "mktg": [
                      "A"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-5-1-t5",
                  "order": 5,
                  "text": "Confirm go live celebration logistics with Marketing team and client stakeholders",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "C"
                    ],
                    "arch": [
                      "C"
                    ],
                    "tc": [
                      "C"
                    ],
                    "es": [
                      "C"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d251t5-1",
                      "url": "#",
                      "roles": [],
                      "label": "Confirm go live celebration logistics with Marketing team and client …"
                    }
                  ]
                },
                {
                  "id": "d2-5-1-t6",
                  "order": 6,
                  "text": "EM schedules customer retrospective",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "C"
                    ],
                    "arch": [
                      "C"
                    ],
                    "tc": [
                      "C"
                    ],
                    "es": [
                      "I"
                    ],
                    "ae": [
                      "I"
                    ]
                  },
                  "jobAids": []
                }
              ],
              "meetings": [
                {
                  "id": "mt-d251-1",
                  "name": "Internal Closure Meeting",
                  "scheduledBy": "em",
                  "ledBy": "em",
                  "external": false
                }
              ],
              "levelOfEffort": {
                "mode": "all",
                "all": {
                  "text": "1hr all roles",
                  "billable": true
                },
                "roles": {}
              }
            },
            {
              "id": "d2-5-2",
              "sid": "5.2",
              "name": "Customer Retrospective",
              "order": 2,
              "icon": "refresh",
              "changelog": [],
              "overview": "This is the phase in the journey where we meet with the client stakeholders to discuss what went well, what did not go well, and what could be improved.",
              "objective": "The primary objective of this step is to collaborate with the customer to capture all learnings from the engagement and capture lessons learned.",
              "participants": [
                "arch",
                "bpc",
                "em",
                "tc",
                "es",
                "ae",
                "apex"
              ],
              "comments": [
                "This retrospective is client facing, be cognizant of what is shared externally.",
                "This retrospective can be combined with the customer closure meeting and celebration based on customer preference"
              ],
              "inputs": [
                "Customer retrospective deck",
                "Customer closure and celebration deck"
              ],
              "deliverables": [
                "Documented lessons learned",
                "Customer retrospective deck",
                "Draft customer closure deck"
              ],
              "tasks": [
                {
                  "id": "d2-5-2-t1",
                  "order": 1,
                  "text": "EM facilitates delivery of retrospective deck",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "R"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d252t1-1",
                      "url": "#",
                      "roles": [],
                      "label": "EM facilitates delivery of retrospective deck"
                    }
                  ]
                },
                {
                  "id": "d2-5-2-t2",
                  "order": 2,
                  "text": "Update customer project closure deck (EM)",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "C"
                    ],
                    "arch": [
                      "C"
                    ],
                    "tc": [
                      "I"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d252t2-1",
                      "url": "#",
                      "roles": [],
                      "label": "Update customer project closure deck (EM)"
                    }
                  ]
                },
                {
                  "id": "d2-5-2-t3",
                  "order": 3,
                  "text": "EM, BPC, Architect, and TC participate with client",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "R"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-5-2-t4",
                  "order": 4,
                  "text": "EM documents lessons learned in the project record",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "C"
                    ],
                    "arch": [
                      "C"
                    ],
                    "tc": [
                      "I"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-5-2-t5",
                  "order": 5,
                  "text": "EM schedules an internal meeting if there are feedback and or concerns identified during client retrospective that requires further debrief and next steps",
                  "raci": {
                    "em": [
                      "R",
                      "A"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "C"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": []
                }
              ],
              "meetings": [
                {
                  "id": "mt-d252-1",
                  "name": "Customer Retrospective",
                  "scheduledBy": "em",
                  "ledBy": "em",
                  "external": true
                }
              ],
              "levelOfEffort": {
                "mode": "byRole",
                "all": {},
                "roles": {
                  "arch": {
                    "text": "1 hour",
                    "billable": true
                  },
                  "bpc": {
                    "text": "1 hour",
                    "billable": true
                  },
                  "em": {
                    "text": "1 hour",
                    "billable": true
                  },
                  "tc": {
                    "text": "1 hour",
                    "billable": true
                  }
                }
              }
            },
            {
              "id": "d2-5-3",
              "sid": "5.3",
              "name": "Customer Closure Meeting",
              "order": 3,
              "icon": "check",
              "changelog": [],
              "overview": "This phase marks the official closure of the client engagement, emphasizing the successful delivery of project outcomes and obtaining formal sign-off. Additionally, we will celebrate our achievements with a virtual or in-person go-live event.",
              "objective": "Successfully close the client engagement by ensuring all deliverables are met, obtaining formal sign-off, and celebrating project completion through a virtual or in-person go-live event.",
              "participants": [
                "arch",
                "bpc",
                "em",
                "tc",
                "es",
                "ae"
              ],
              "comments": [],
              "inputs": [
                "Customer closure deck"
              ],
              "deliverables": [
                "Archive project documentation for future reference",
                "Celebration pictures",
                "Customer closure deck",
                "Chief Delivery Officer closure email",
                "Post closure meeting notes"
              ],
              "tasks": [
                {
                  "id": "d2-5-3-t1",
                  "order": 1,
                  "text": "EM facilitates delivery of closure deck",
                  "raci": {
                    "em": [
                      "A"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "I"
                    ],
                    "es": [
                      "C",
                      "I"
                    ],
                    "ae": [
                      "C",
                      "I"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d253t1-1",
                      "url": "#",
                      "roles": [],
                      "label": "EM facilitates delivery of closure deck"
                    }
                  ]
                },
                {
                  "id": "d2-5-3-t2",
                  "order": 2,
                  "text": "EM facilitates go live celebration and takes virtual/live pictures (upon client approval) to provide to marketing@glidefast.com",
                  "raci": {
                    "em": [
                      "A"
                    ],
                    "bpc": [
                      "I"
                    ],
                    "arch": [
                      "I"
                    ],
                    "tc": [
                      "I"
                    ],
                    "ae": [
                      "C",
                      "I"
                    ],
                    "es": [
                      "I"
                    ]
                  },
                  "jobAids": []
                },
                {
                  "id": "d2-5-3-t3",
                  "order": 3,
                  "text": "EM confirms ServiceNow CSAT risk of the project",
                  "raci": {
                    "em": [
                      "A"
                    ],
                    "bpc": [
                      "R"
                    ],
                    "arch": [
                      "R"
                    ],
                    "tc": [
                      "I"
                    ],
                    "es": [
                      "C",
                      "I"
                    ],
                    "ae": [
                      "C",
                      "I"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d253t3-1",
                      "url": "#",
                      "roles": [],
                      "label": "EM confirms ServiceNow CSAT risk of the project"
                    }
                  ]
                },
                {
                  "id": "d2-5-3-t4",
                  "order": 4,
                  "text": "EM notifies Chief Customer / Delivery officer to send project completion thank you email to customer contacts (cc ServiceNow rep)",
                  "raci": {
                    "em": [
                      "A"
                    ],
                    "bpc": [
                      "I"
                    ],
                    "arch": [
                      "I"
                    ],
                    "tc": [
                      "I"
                    ],
                    "es": [
                      "I"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d253t4-1",
                      "url": "#",
                      "roles": [],
                      "label": "EM notifies Chief Customer / Delivery officer to send project complet…"
                    }
                  ]
                },
                {
                  "id": "d2-5-3-t5",
                  "order": 5,
                  "text": "EM validates data on ServiceNow partner portal and closes deployment record",
                  "raci": {
                    "em": [
                      "A"
                    ],
                    "bpc": [
                      "C"
                    ],
                    "arch": [
                      "C"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d253t5-1",
                      "url": "#",
                      "roles": [],
                      "label": "EM validates data on ServiceNow partner portal and closes deployment …"
                    }
                  ]
                },
                {
                  "id": "d2-5-3-t6",
                  "order": 6,
                  "text": "EM closes timesheet project tasks and resource plans",
                  "raci": {
                    "em": [
                      "A"
                    ],
                    "bpc": [
                      "C",
                      "I"
                    ],
                    "arch": [
                      "C",
                      "I"
                    ],
                    "tc": [
                      "C",
                      "I"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d253t6-1",
                      "url": "#",
                      "roles": [],
                      "label": "EM closes timesheet project tasks and resource plans"
                    }
                  ]
                },
                {
                  "id": "d2-5-3-t7",
                  "order": 7,
                  "text": "EM consolidates and archives all project documentation and ensures it resides on project drive",
                  "raci": {
                    "em": [
                      "A"
                    ],
                    "bpc": [
                      "C",
                      "I"
                    ],
                    "arch": [
                      "C",
                      "I"
                    ],
                    "tc": [
                      "C",
                      "I"
                    ]
                  },
                  "jobAids": []
                }
              ],
              "meetings": [
                {
                  "id": "mt-d253-1",
                  "name": "Customer Closure Meeting",
                  "scheduledBy": "em",
                  "ledBy": "em",
                  "external": true
                }
              ],
              "levelOfEffort": {
                "mode": "byRole",
                "all": {},
                "roles": {
                  "arch": {
                    "text": "1 hour",
                    "billable": true
                  },
                  "bpc": {
                    "text": "1 hour",
                    "billable": true
                  },
                  "em": {
                    "text": "1 hour",
                    "billable": true
                  },
                  "tc": {
                    "text": "n/a",
                    "billable": false,
                    "optional": true
                  }
                }
              }
            }
          ]
        }
      ]
    },
    {
      "id": "grs",
      "name": "GRS",
      "order": 2,
      "summary": "Remote Services playbook from handoff to close.",
      "description": "GlideFast Remote Services (GRS) is how we deliver ongoing, remote ServiceNow support and delivery work for customers who need skilled capacity without a full project implementation. GRS engagements are typically leaner than Project work: a clear handoff from Sales, a focused kickoff with the customer, periodic check-ins through the lifecycle, and a deliberate close.\n\nThis playbook outlines the inputs, activities, and deliverables for a GRS engagement. A RACI designation (Responsible, Accountable, Consulted, Informed) appears next to each task as a baseline for role expectations; teams should confirm and adjust those assignments during initiation based on the specific engagement.\n\nGRS methodology will continue to evolve from real engagements. Share feedback, gaps, and improvement ideas through the feedback link so the playbook stays practical for delivery teams.",
      "feedbackUrl": "mailto:delivery2.0@glidefast.com?subject=Delivery%202.0%20Feedback%20and%20Ideas%20Submission",
      "feedbackLabel": "Provide Feedback",
      "diagramUrl": "",
      "phases": [
        {
          "id": "grs-initiate",
          "name": "Initiate",
          "order": 1,
          "subPhases": [
            {
              "id": "grs-1-1",
              "sid": "1.1",
              "name": "Pre-IPKT",
              "order": 1,
              "icon": "inbox",
              "changelog": [],
              "overview": "",
              "objective": "",
              "participants": [],
              "comments": [],
              "inputs": [],
              "deliverables": [],
              "tasks": [],
              "meetings": [],
              "levelOfEffort": {
                "mode": "all",
                "all": {},
                "roles": {}
              }
            },
            {
              "id": "grs-1-2",
              "sid": "1.2",
              "name": "IPKT",
              "order": 2,
              "icon": "exchange",
              "changelog": [],
              "overview": "",
              "objective": "",
              "participants": [],
              "comments": [],
              "inputs": [],
              "deliverables": [],
              "tasks": [],
              "meetings": [],
              "levelOfEffort": {
                "mode": "all",
                "all": {},
                "roles": {}
              }
            },
            {
              "id": "grs-1-3",
              "sid": "1.3",
              "name": "Customer Pre-Kickoff",
              "order": 3,
              "icon": "door",
              "changelog": [],
              "overview": "",
              "objective": "",
              "participants": [],
              "comments": [],
              "inputs": [],
              "deliverables": [],
              "tasks": [],
              "meetings": [],
              "levelOfEffort": {
                "mode": "all",
                "all": {},
                "roles": {}
              }
            },
            {
              "id": "grs-1-4",
              "sid": "1.4",
              "name": "Get to Know the Team",
              "order": 4,
              "icon": "users",
              "changelog": [],
              "overview": "",
              "objective": "",
              "participants": [],
              "comments": [],
              "inputs": [],
              "deliverables": [],
              "tasks": [],
              "meetings": [],
              "levelOfEffort": {
                "mode": "all",
                "all": {},
                "roles": {}
              }
            },
            {
              "id": "grs-1-5",
              "sid": "1.5",
              "name": "Kickoff",
              "order": 5,
              "icon": "flag",
              "changelog": [],
              "overview": "",
              "objective": "",
              "participants": [],
              "comments": [],
              "inputs": [],
              "deliverables": [],
              "tasks": [],
              "meetings": [],
              "levelOfEffort": {
                "mode": "all",
                "all": {},
                "roles": {}
              }
            }
          ]
        },
        {
          "id": "grs-checkin",
          "name": "Check-in",
          "order": 2,
          "subPhases": [
            {
              "id": "grs-2-1",
              "sid": "2.1",
              "name": "Check-in",
              "order": 1,
              "icon": "calendar",
              "changelog": [],
              "overview": "",
              "objective": "",
              "participants": [],
              "comments": [],
              "inputs": [],
              "deliverables": [],
              "tasks": [],
              "meetings": [],
              "levelOfEffort": {
                "mode": "all",
                "all": {},
                "roles": {}
              }
            }
          ]
        },
        {
          "id": "grs-close",
          "name": "Close",
          "order": 3,
          "subPhases": [
            {
              "id": "grs-3-1",
              "sid": "3.1",
              "name": "Internal Closure Meeting",
              "order": 1,
              "icon": "briefcase",
              "changelog": [],
              "overview": "",
              "objective": "",
              "participants": [],
              "comments": [],
              "inputs": [],
              "deliverables": [],
              "tasks": [],
              "meetings": [],
              "levelOfEffort": {
                "mode": "all",
                "all": {},
                "roles": {}
              }
            },
            {
              "id": "grs-3-2",
              "sid": "3.2",
              "name": "Customer Retrospective",
              "order": 2,
              "icon": "refresh",
              "changelog": [],
              "overview": "",
              "objective": "",
              "participants": [],
              "comments": [],
              "inputs": [],
              "deliverables": [],
              "tasks": [],
              "meetings": [],
              "levelOfEffort": {
                "mode": "all",
                "all": {},
                "roles": {}
              }
            },
            {
              "id": "grs-3-3",
              "sid": "3.3",
              "name": "Customer Closure Meeting",
              "order": 3,
              "icon": "check",
              "changelog": [],
              "overview": "",
              "objective": "",
              "participants": [],
              "comments": [],
              "inputs": [],
              "deliverables": [],
              "tasks": [],
              "meetings": [],
              "levelOfEffort": {
                "mode": "all",
                "all": {},
                "roles": {}
              }
            }
          ]
        }
      ]
    }
  ],
  "jargon": {
    "AE": "Account Executive - the GlideFast sales owner for the commercial relationship and CRM opportunity.",
    "AVP": "Area Vice President - regional executive leadership for the account and delivery oversight.",
    "BPC": "Business Process Consultant - owns process design, requirements facilitation and workshop readiness.",
    "CSAT": "Customer Satisfaction - measured feedback on delivery quality, often collected at milestones and closure.",
    "EM": "Engagement Manager - owns delivery, client relationship, scope, schedule and internal coordination.",
    "GRS": "GlideFast Remote Services - ongoing remote ServiceNow support and delivery engagements, typically leaner than a full Project implementation.",
    "GTK": "Get to Know You - early customer session to introduce the team and set working norms.",
    "GTKT": "Get to Know the Team - variant of the introductory customer session focused on team introductions.",
    "HLD": "High Level Design - the architectural design document for the solution.",
    "IPKT": "Internal Project Kickoff Transition - the handoff of a sold engagement from Sales to Delivery.",
    "IPKT doc": "Internal Project Kickoff Transition document - the structured handoff artifact from Sales to Delivery.",
    "RIDAC": "Risks, Issues, Decisions, Actions, Changes - the living log on the project record for delivery governance.",
    "ROM": "Rough Order of Magnitude - an early, approximate estimate of effort or cost.",
    "RTM": "Requirements Traceability Matrix - maps requirements to stories and tests through delivery.",
    "SOW": "Statement of Work - the contracted scope, deliverables and terms of the engagement.",
    "TC": "Technical Consultant - builds and configures the ServiceNow solution against approved stories.",
    "UAT": "User Acceptance Testing - customer validation of the built solution against requirements.",
    "UIX": "User Interface Experience - portal and interface design work when UX is in scope."
  },
  "referenceSections": [
    {
      "key": "raci",
      "title": "Using RACI",
      "body": "Purpose: RACI clarifies who does the work, who owns the outcome, who must be consulted, and who needs to stay informed — so teams move quickly without ambiguity about decisions or handoffs.\n\nEvery task in this methodology assigns each involved job title one or more RACI letters. They answer one question: for this task, what is that person's relationship to the work?\n\nExactly one A per task. Accountability shouldn't be shared - if two people sign off, no one does.\n\nR and A can be the same person (shown together as R A) - they do it and own it.\n\nEvery task needs at least an R and an A - someone doing the work, someone owning the result.\n\nThe customer appears in the RACI wherever the engagement requires their input, approval, or participation.\n\nRemember: RACI is a collaboration tool, not a permission slip. Consulted means their input is sought before a decision; Informed means they need visibility after. When in doubt, over-communicate early rather than re-litigating accountability later."
    },
    {
      "key": "challenges",
      "title": "Challenges",
      "body": "Delivery engagements fail in predictable ways. Watch for these common pitfalls — and use the methodology tasks and job aids to stay ahead of them.\n\nScope creep without a change path — new asks accumulate without rebaselining the SOW, RTM, or project plan. Address it in Plan and Execute with explicit change-order tasks.\n\nWeak IPKT / sales-to-delivery handoff — the delivery team starts blind. Treat the IPKT and IPKT doc as non-negotiable; capture open questions before customer-facing work.\n\nCustomer availability — workshops and UAT stall when SMEs are unavailable. Surface it early in status, escalate through the EM, and adjust the plan visibly.\n\nRACI ambiguity — two Accountables or no clear Responsible on a task. Fix it in Initiate; don't let it linger into Execute.\n\nRequirements without acceptance criteria — stories that cannot be tested. Tie every requirement to testable criteria before build accelerates.\n\nEnvironment and access delays — instances, integrations, or credentials block the TC. Track as RIDAC items with owners and dates.\n\nStatus without decisions — recurring meetings that report activity but never close actions. Every checkpoint should produce decisions, owners, and dates.\n\nTesting compressed at the end — UAT becomes a single gate instead of continuous validation. Plan UAT working sessions during Plan, not only at Deliver.\n\nSilent customer dissatisfaction — issues surface only at closure. Use CSAT touchpoints, executive check-ins, and transparent RAID logs.\n\nKnowledge transfer as an afterthought — go-live succeeds but adoption fails. Start enablement and training planning during Execute, not after deployment.\n\nTeams that recognize these patterns early — and escalate through the EM using the Escalation guidance — recover faster than teams that treat each as a one-off surprise."
    },
    {
      "key": "consultant-lifecycle",
      "title": "Consultant Lifecycle",
      "body": "Beyond phase-specific tasks, every consultant on an engagement carries standing duties. These recur daily, weekly, and throughout the engagement.\n\nDaily: Update timekeeping and progress notes per GlideFast policy. Review assigned stories/tasks and RIDAC items you own. Prepare for any customer sessions that day.\n\nDaily: Flag blockers to the EM or Architect — don't wait for the weekly status meeting.\n\nWeekly: Participate in internal team sync and customer status as scheduled. Confirm your deliverables for the week match the project plan.\n\nWeekly: Review open actions from workshops and meetings; close or reassign stale items.\n\nThroughout: Follow the methodology tasks for your role in each sub-phase — the RACI grid and By Role view summarize your standing responsibilities.\n\nThroughout: Use job aids linked from tasks for templates, checklists, and knowledge articles — don't reinvent standard artifacts.\n\nThroughout: Raise risks and issues in RIDAC on the project record; keep descriptions factual and actionable.\n\nThroughout: Model GlideFast delivery standards in customer sessions — prepared, on time, and aligned to the agreed agenda."
    },
    {
      "key": "em-lifecycle",
      "title": "EM Lifecycle",
      "body": "The Engagement Manager owns delivery health end to end. These standing duties apply in every phase — in addition to the EM's RACI assignments on individual tasks.\n\nDaily: Review project health — schedule, scope, budget, RAID, and team utilization. Clear or delegate blockers.\n\nDaily: Ensure customer communications are timely; nothing important should wait for a standing meeting.\n\nWeekly: Facilitate or delegate customer status and internal team sync. Publish the status report / status meeting artifacts per Initiate and Execute tasks.\n\nWeekly: Confirm staffing and upcoming milestones with Resourcing and the delivery team.\n\nThroughout: Own the SOW baseline — scope changes flow through change order tasks, not side conversations.\n\nThroughout: Maintain RIDAC hygiene; escalate per the Escalation section when customer or internal alignment breaks down.\n\nThroughout: Keep executive sponsors (ES / AVP) informed at the agreed cadence — not only when things go wrong.\n\nThroughout: Coach the team on methodology use — correct RACI gaps, missing job aids, and skipped sub-phases early.\n\nAt closure: Ensure case study / marketing capture, CSAT, and internal retrospective tasks complete before the engagement is marked done."
    },
    {
      "key": "escalation",
      "title": "Escalation",
      "body": "Escalation Management guidance is coming soon. Until then, use RIDAC on the project record, notify your Engagement Manager immediately for customer-impacting issues, and involve the Executive Sponsor when schedule, scope, or relationship risk exceeds the EM's authority to resolve."
    }
  ]
};

/* Widget server script: load/save the scoped content table.
   Prefixed at package time with js/lib/url-policy.js + js/lib/content-model.js
   (DMUrlPolicy, DMContentModel). input.action: load (default) | save | saveChangelogSeen.
   One GlideRecordSecure per function. */
(function () {
  data.error = '';
  data.empty = false;
  data.saved = false;
  data.changelogSeen = {};

  var logPrefix = 'Delivery Methodology content: ';
  var changelogSeenPreference = 'dm.changelog.seen';
  var allowedActions = {
    load: true,
    save: true,
    saveChangelogSeen: true,
    seedStandard: true,
    clearAll: true
  };
  var maximumSaveRows = 5000;

  function getAppScopeName() {
    try {
      if (typeof gs.getCurrentScopeName === 'function') {
        var scopeName = String(gs.getCurrentScopeName() || '');

        if (scopeName && scopeName !== 'global') {
          return scopeName;
        }
      }
    } catch (scopeError) {
      gs.warn(logPrefix + 'could not resolve scope name: ' + scopeError);
    }

    return '';
  }

  function getContentTableName() {
    var scopeName = getAppScopeName();

    if (scopeName) {
      return scopeName + '_content';
    }

    return 'content';
  }

  var appScopeName = getAppScopeName();
  var isSystemAdmin = gs.hasRole('admin');
  var isAppAdmin = !!(appScopeName && gs.hasRole(appScopeName + '.admin'));
  var isAppEditor = !!(appScopeName && gs.hasRole(appScopeName + '.editor'));
  // Import + normal content edit: app editor/admin, or platform admin.
  data.canEdit = !!(isAppEditor || isAppAdmin || isSystemAdmin);
  // Clear all content: app admin or platform admin only (not editors).
  data.canAdmin = !!(isAppAdmin || isSystemAdmin);

  var contentTable = getContentTableName();
  // Client LiveSyncService watches this table via spUtil.recordWatch.
  data.contentTable = contentTable;

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

  // One-time "Import Delivery 2.0 content" action - offered to editors when a fresh instance's
  // content table is empty (see js/data/standard-content.js's own header for provenance). Reuses
  // saveContent() wholesale rather than a second insert path: dehydrate/validate/parent-link/
  // create is exactly the same job whether the payload came from a client's edit or from this
  // bundled starter. The ONLY new logic here is the emptiness guard, which is what makes this
  // action structurally incapable of clobbering existing content - it refuses outright rather
  // than relying on the save path's contentRevision check (that only catches CONCURRENT edits,
  // not "there was already content here").
  function hasAnyContentRecords() {
    var contentRecord = new GlideRecordSecure(contentTable);
    contentRecord.setLimit(1);
    contentRecord.query();
    return contentRecord.next();
  }

  function seedStandard() {
    if (hasAnyContentRecords()) {
      data.error = 'Content already exists - Delivery 2.0 content only imports into an empty table.';
      gs.warn(logPrefix + 'seedStandard refused - table is not empty');
      loadContent();
      return false;
    }

    if (typeof DMStandardContent === 'undefined') {
      data.error = 'Delivery 2.0 content is not available on this instance.';
      gs.error(logPrefix + 'seedStandard: DMStandardContent missing from the server bundle - ' +
        'check deploy.manifest.js files.contentModel includes js/data/standard-content.js');
      return false;
    }

    return saveContent({
      methodologies: DMStandardContent.methodologies,
      jobTitles: DMStandardContent.jobTitles,
      jargon: DMStandardContent.jargon,
      referenceSections: DMStandardContent.referenceSections
    });
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

  if (action === 'seedStandard') {
    if (!data.canEdit) {
      data.error = 'Not authorized to edit content.';
      gs.warn(logPrefix + 'seedStandard denied - caller lacks editor/admin');
      loadContent();
      return;
    }

    seedStandard();
    return;
  }

  if (action === 'clearAll') {
    if (!data.canAdmin) {
      data.error = 'Not authorized to clear all content.';
      gs.warn(logPrefix + 'clearAll denied - caller lacks app/system admin');
      loadContent();
      return;
    }

    saveContent({
      methodologies: [],
      jobTitles: [],
      jargon: {},
      referenceSections: [],
      contentRevision: input && input.contentRevision
    });
    return;
  }

  loadContent();
})();
