/* Shared hydrate/dehydrate between the nested UI payload and flat `content` table rows.
   Runs on the widget server (concatenated into the server script at package time) and optionally
   in the browser. Soft refs stay as client job-title ids (`arch`, `em`, …). Client entity ids
   (`d2-1-1`, …) live in `content` JSON as `id` so round-trips keep UI identity stable.
   See apps/delivery-methodology/SCHEMA.md.
   Exposes a bare `var DMContentModel` so the concatenated ServiceNow server script can call it
   without relying on `window`/`self` (Rhino). */
var DMContentModel = (function () {
  'use strict';

  // Choice values on the content.type field — keep in sync with deploy.manifest.js / SCHEMA.md.
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
    var i;

    for (i = 0; i < jobTitles.length; i++) {
      var jt = jobTitles[i];
      pushRow(rows, 'job_title', null, jt.name, i + 1, {
        id: jt.id,
        abbreviation: jt.abbr || '',
        description: jt.description || '',
        external: !!jt.external
      }, 'jt:' + jt.id);
    }

    var jargonKeys = Object.keys(jargon);
    for (i = 0; i < jargonKeys.length; i++) {
      var term = jargonKeys[i];
      pushRow(rows, 'glossary_term', null, term, i + 1, {
        definition: jargon[term] || ''
      }, 'gloss:' + term);
    }

    for (i = 0; i < referenceSections.length; i++) {
      var rs = referenceSections[i];
      pushRow(rows, 'reference_section', null, rs.title || rs.name || '', i + 1, {
        key: rs.key || '',
        body: rs.body || ''
      }, 'ref:' + (rs.key || i));
    }

    methodologies.forEach(function (m) {
      pushRow(rows, 'methodology', null, m.name, m.order, {
        id: m.id,
        description: m.description || ''
      }, m.id);

      (m.phases || []).forEach(function (p) {
        pushRow(rows, 'phase', m.id, p.name, p.order, { id: p.id }, p.id);

        (p.subPhases || []).forEach(function (sp) {
          pushRow(rows, 'sub_phase', p.id, sp.name, sp.order, {
            id: sp.id,
            overview: sp.overview || '',
            objective: sp.objective || '',
            icon: sp.icon || 'doc'
          }, sp.id);

          (sp.inputs || []).forEach(function (text, idx) {
            pushRow(rows, 'input', sp.id, text, idx + 1, {}, null);
          });
          (sp.deliverables || []).forEach(function (text, idx) {
            pushRow(rows, 'deliverable', sp.id, text, idx + 1, {}, null);
          });
          (sp.comments || []).forEach(function (text, idx) {
            pushRow(rows, 'comment', sp.id, text, idx + 1, {}, null);
          });
          (sp.participants || []).forEach(function (roleId, idx) {
            pushRow(rows, 'participant', sp.id, '', idx + 1, { job_title: roleId }, null);
          });
          (sp.meetings || []).forEach(function (mt, idx) {
            pushRow(rows, 'meeting', sp.id, '', idx + 1, {
              id: mt.id,
              scheduledBy: mt.scheduledBy || null,
              ledBy: mt.ledBy || null,
              external: !!mt.external
            }, mt.id || null);
          });

          var loe = sp.levelOfEffort || { mode: 'all', all: {}, roles: {} };
          if (loe.mode === 'byRole') {
            var roleIds = Object.keys(loe.roles || {});
            roleIds.forEach(function (rid, idx) {
              var entry = loe.roles[rid] || {};
              pushRow(rows, 'level_of_effort', sp.id, '', idx + 1, {
                job_title: rid,
                text: entry.text || '',
                billable: !!entry.billable,
                optional: !!entry.optional
              }, null);
            });
          } else if (loe.all && (loe.all.text || loe.all.billable != null)) {
            pushRow(rows, 'level_of_effort', sp.id, '', 1, {
              job_title: null,
              text: loe.all.text || '',
              billable: !!loe.all.billable,
              optional: !!loe.all.optional
            }, null);
          }

          (sp.changelog || []).forEach(function (entry, idx) {
            pushRow(rows, 'changelog_entry', sp.id, '', idx + 1, {
              id: entry.id,
              ts: entry.ts || '',
              text: entry.text || ''
            }, entry.id || null);
          });

          (sp.tasks || []).forEach(function (t) {
            pushRow(rows, 'task', sp.id, t.text || '', t.order, { id: t.id }, t.id);
            var raci = t.raci || {};
            Object.keys(raci).forEach(function (roleId) {
              (raci[roleId] || []).forEach(function (letter) {
                pushRow(rows, 'raci', t.id, letter, 0, { job_title: roleId }, null);
              });
            });
            (t.jobAids || []).forEach(function (ja, jaIdx) {
              var jaId = ja.id || (t.id + '-ja' + (jaIdx + 1));
              pushRow(rows, 'job_aid', t.id, '', jaIdx + 1, { id: jaId, url: ja.url || '' }, jaId);
              (ja.roles || []).forEach(function (roleId, rIdx) {
                pushRow(rows, 'job_aid_role', jaId, '', rIdx + 1, { job_title: roleId }, null);
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
    var rows = (rawRows || []).map(function (r) {
      var content = parseContent(r.content);
      var systemId = r.systemId || r.sysId || r.sys_id || null;
      var resolvedOrder = 0;

      if (r.order != null) {
        resolvedOrder = Number(r.order) || 0;
      }

      return {
        systemId: systemId,
        type: r.type,
        parentSystemId: r.parentSystemId || r.parentSysId || r.parent || null,
        name: r.name || '',
        order: resolvedOrder,
        content: content,
        clientId: content.id || null
      };
    });

    var bySystemId = {};
    rows.forEach(function (r) {
      if (r.systemId) {
        bySystemId[r.systemId] = r;
      }
    });

    rows.forEach(function (r) {
      r.parentClientId = null;

      if (r.parentSystemId && bySystemId[r.parentSystemId]) {
        var parent = bySystemId[r.parentSystemId];
        r.parentClientId = parent.clientId || parent.systemId;
      }
    });

    rows.forEach(function (r) {
      if (!r.clientId) {
        if (r.type === 'job_title' && r.content.id) {
          r.clientId = r.content.id;
        } else if (r.systemId) {
          r.clientId = r.systemId;
        }
      }
    });

    rows.forEach(function (r) {
      if (r.parentSystemId && bySystemId[r.parentSystemId]) {
        r.parentClientId = bySystemId[r.parentSystemId].clientId;
      }
    });

    var childrenOf = {};
    rows.forEach(function (r) {
      var key = r.parentClientId || '__root__';

      if (!childrenOf[key]) {
        childrenOf[key] = [];
      }

      childrenOf[key].push(r);
    });

    Object.keys(childrenOf).forEach(function (k) {
      childrenOf[k].sort(sortByOrder);
    });

    function kids(parentClientId, type) {
      return (childrenOf[parentClientId] || []).filter(function (r) {
        return r.type === type;
      });
    }

    var roots = childrenOf.__root__ || [];

    var jobTitlesOut = roots.filter(function (r) { return r.type === 'job_title'; }).map(function (r) {
      return {
        id: r.content.id || r.clientId,
        name: r.name,
        abbr: r.content.abbreviation || '',
        description: r.content.description || '',
        external: !!r.content.external
      };
    });

    var jargon = {};
    roots.filter(function (r) { return r.type === 'glossary_term'; }).forEach(function (r) {
      jargon[r.name] = r.content.definition || '';
    });

    var referenceSections = roots.filter(function (r) { return r.type === 'reference_section'; }).map(function (r) {
      return {
        key: r.content.key || '',
        title: r.name,
        name: r.name,
        body: r.content.body || ''
      };
    });

    var methodologies = roots.filter(function (r) { return r.type === 'methodology'; }).map(function (mRow) {
      var mid = mRow.content.id || mRow.clientId;
      return {
        id: mid,
        name: mRow.name,
        order: mRow.order,
        description: mRow.content.description || '',
        phases: kids(mid, 'phase').map(function (pRow) {
          var pid = pRow.content.id || pRow.clientId;
          return {
            id: pid,
            name: pRow.name,
            order: pRow.order,
            subPhases: kids(pid, 'sub_phase').map(function (spRow) {
              var sid = spRow.content.id || spRow.clientId;
              var loeRows = kids(sid, 'level_of_effort');
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
                loeRows.forEach(function (lr) {
                  var rid = lr.content.job_title;

                  if (!rid) {
                    return;
                  }

                  levelOfEffort.roles[rid] = {
                    text: lr.content.text || '',
                    billable: !!lr.content.billable,
                    optional: !!lr.content.optional
                  };
                });
              }

              return {
                id: sid,
                sid: '',
                name: spRow.name,
                order: spRow.order,
                icon: spRow.content.icon || 'doc',
                overview: spRow.content.overview || '',
                objective: spRow.content.objective || '',
                inputs: kids(sid, 'input').map(function (r) { return r.name; }),
                deliverables: kids(sid, 'deliverable').map(function (r) { return r.name; }),
                comments: kids(sid, 'comment').map(function (r) { return r.name; }),
                participants: kids(sid, 'participant').map(function (r) { return r.content.job_title; }).filter(Boolean),
                meetings: kids(sid, 'meeting').map(function (r) {
                  return {
                    id: r.content.id || r.clientId,
                    scheduledBy: r.content.scheduledBy || null,
                    ledBy: r.content.ledBy || null,
                    external: !!r.content.external
                  };
                }),
                levelOfEffort: levelOfEffort,
                changelog: kids(sid, 'changelog_entry').map(function (r) {
                  return {
                    id: r.content.id || r.clientId || r.systemId,
                    ts: r.content.ts || '',
                    text: r.content.text || '',
                    read: false
                  };
                }),
                tasks: kids(sid, 'task').map(function (tRow) {
                  var tid = tRow.content.id || tRow.clientId;
                  var raci = {};

                  kids(tid, 'raci').forEach(function (rr) {
                    var roleId = rr.content.job_title;
                    var letter = rr.name;

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
                    id: tid,
                    order: tRow.order,
                    text: tRow.name,
                    raci: raci,
                    jobAids: kids(tid, 'job_aid').map(function (jaRow) {
                      var jaId = jaRow.content.id || jaRow.clientId;
                      return {
                        id: jaId,
                        url: jaRow.content.url || '',
                        roles: kids(jaId, 'job_aid_role').map(function (jr) { return jr.content.job_title; }).filter(Boolean)
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
