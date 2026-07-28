/* Seed + dual persistence: local harness uses localStorage; Service Portal uses the widget
   server script against the scoped `content` table (see js/server/content.server.js + SCHEMA.md).
   Call bindServer(c.server) from the controller when `c.server` exists. */
angular.module('deliveryMethodology').factory('DataService', ['$q', function ($q) {
  'use strict';

  // Bump SEED_VERSION whenever METHODOLOGIES/JOB_TITLES below change shape or seed content in a
  // way that would be confusing to silently merge with someone's already-saved edits (e.g. today's
  // job title renames) - a mismatched version just falls back to the fresh seed below, rather than
  // trying to migrate an old snapshot.
  // v2: sub-phase `sid` is now DERIVED from position (see main.controller.js's recomputeSids), not
  // hand-authored - a v1 snapshot's sids are still position-correct today, but bumping the version
  // means any future structural edit made under v1 (before that controller change existed) is
  // discarded in favor of the fresh seed rather than silently trusted as still position-correct.
  var STORAGE_KEY = 'gf-delivery-methodology-v1';
  var SEED_VERSION = 2;
  var serverApi = null;
  var cachedJobTitles = null;
  var cachedJargon = null;
  var cachedReferenceSections = null;

  function loadStoredMethodologies() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) { return null; }
      var parsed = JSON.parse(raw);
      return (parsed && parsed.version === SEED_VERSION) ? parsed.methodologies : null;
    } catch (e) { return null; }
  }
  function storeMethodologies(methodologies) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SEED_VERSION, methodologies: methodologies }));
    } catch (e) { /* storage unavailable/full - edits still work for this session, just won't survive a reload */ }
  }

  var JOB_TITLES = [
    { id: 'arch', name: 'Architect', abbr: 'ARCH', description: 'Owns the technical solution design and integrity of the build across the engagement.' },
    { id: 'em', name: 'Engagement Manager', abbr: 'EM', description: 'Owns delivery, client relationship, scope, schedule and internal coordination.' },
    { id: 'bpc', name: 'Business Process Consultant', abbr: 'BPC', description: 'Owns process design, requirements facilitation and workshop readiness.' },
    { id: 'tc', name: 'Technical Consultant', abbr: 'TC', description: 'Builds and configures the ServiceNow solution against approved stories.' },
    { id: 'ux', name: 'UX Designer', abbr: 'UX', description: 'Designs portal and interface experience when in scope for the project.' },
    { id: 'sa', name: 'Solutions Consultant', abbr: 'SC', description: 'Solutions-side consultant supporting scoping, handoff and closure.' },
    { id: 'es', name: 'Executive Sponsor', abbr: 'ES', description: 'GlideFast executive accountable for the account relationship.' },
    { id: 'mktg', name: 'Marketing Specialist', abbr: 'MS', description: 'Marketing team representative capturing the engagement narrative into a case study.' },
    { id: 'ae', name: 'Sales Executive', abbr: 'SE', description: 'Owns the commercial relationship and CRM opportunity, and schedules GRS transition touchpoints.' },
    { id: 'csm', name: 'Customer Success Manager', abbr: 'CSM', description: 'Owns the customer relationship after go-live, driving adoption, renewal and expansion.' },
    { id: 'trainer', name: 'Training Specialist', abbr: 'TS', description: 'Delivers end-user training and enablement sessions for the customer team.' },
    { id: 'resourcing', name: 'Resourcing Specialist', abbr: 'RS', description: 'Assigns and staffs the delivery team, and sets up engagement Slack channels ahead of kickoff.' },
    { id: 'customer', name: 'Customer', abbr: 'CUST', external: true, description: 'The customer / client stakeholders - included in the RACI wherever the engagement requires their input, approval or participation.' }
  ];

  function task(id, order, text, raci, jobAids) {
    return { id: id, order: order, text: text, raci: raci, jobAids: jobAids || [] };
  }
  function blankSubPhase(id, sid, name, order, icon) {
    return { id: id, sid: sid, name: name, order: order, icon: icon || 'doc', changelog: [], overview: '', objective: '', participants: [], comments: [], inputs: [], deliverables: [], tasks: [], meetings: [], levelOfEffort: { mode: 'all', all: {}, roles: {} } };
  }

  var METHODOLOGIES = [
    {
      id: 'delivery2', name: 'Project', order: 1,
      phases: [
        {
          id: 'd2-initiate', name: 'Initiate', order: 1,
          subPhases: [
            Object.assign(blankSubPhase('d2-1-1', '1.1', 'Pre-IPKT', 1, 'inbox'), {
              changelog: [
                { id: 'c1', ts: '2026-07-14', text: 'Input added: “ROM”', read: false },
                { id: 'c2', ts: '2026-07-14', text: 'Task edited: “Review SOW inputs”', read: false }
              ],
              overview: 'At this phase, the engagement is extremely likely to commence. Sales Executive has moved the opportunity in the Customer Relations Management (CRM) system to “Verbal” and we assign the future project team to get ready.',
              objective: 'The primary objective of this step is to familiarize yourself with the sales & contracting assets, ensure we have matched the correct skills to the customer expectations and call out any conflicts or anomalies well ahead of customer engagement.',
              levelOfEffort: { mode: 'all', all: { text: '3–5 hours', billable: true }, roles: {} },
              comments: ['To be reviewed in advance of the IPKT. Recommended, over a week prior.'],
              inputs: ['Addition to Slack Channel by Resourcing team', 'SoW / Work Order', 'IPKT Document', 'ROM'],
              deliverables: ['Notes and risks to the bottom section of the IPKT document', 'If time sensitive and applicable (prior to IPKT), discuss with Sales team in advance'],
              tasks: [
                task('d2-1-1-t1', 1, 'Review SOW inputs', { arch: ['R'], em: ['A', 'R'], bpc: ['R'], tc: ['R'] }),
                task('d2-1-1-t2', 2, 'Take thorough notes', { arch: ['R'], em: ['A', 'R'], bpc: ['R'], tc: ['R'] }),
                task('d2-1-1-t3', 3, 'Review and/or consult with AE / other Delivery personnel regarding previous / concurrent projects / GRSs conducted with the client', { arch: ['R'], em: ['R'], bpc: ['R'], tc: ['R'] })
              ]
            }),
            blankSubPhase('d2-1-2', '1.2', 'IPKT', 2, 'exchange'),
            blankSubPhase('d2-1-3', '1.3', 'Customer Pre-Kickoff', 3, 'door'),
            blankSubPhase('d2-1-4', '1.4', 'Get to Know the Team', 4, 'users'),
            blankSubPhase('d2-1-5', '1.5', 'Kickoff', 5, 'flag')
          ]
        },
        {
          id: 'd2-plan', name: 'Plan', order: 2,
          subPhases: [
            Object.assign(blankSubPhase('d2-2-1', '2.1', 'Pre-Workshop Planning', 1, 'clipboard'), {
              changelog: [{ id: 'c3', ts: '2026-07-10', text: 'Task added: “Prepare Demo instance”', read: false }],
              overview: 'At this phase, we are getting our customer team ready for a successful and efficient start of the project. Most of the steps are internal readiness activities, but coordination is needed while interfacing with the client.',
              objective: 'The primary objective of this stage is to ensure all logistics are cared for on our end, customer expectations are fully aligned, and we maximize the time and effort during the actual workshops, once they begin. This is our first big effort with the customer, and we need to show up prepared, aligned and productive.',
              levelOfEffort: { mode: 'byRole', all: {}, roles: { arch: { text: '2 hours', billable: true }, bpc: { text: '3 hours', billable: true }, em: { text: '1 hour', billable: true }, ux: { text: '1 hour', billable: true } } },
              comments: ['BPC facilitates readiness and logistics'],
              inputs: ['Customer demo instance', 'Completed customer value statement', 'Completed customer startup checklist'],
              deliverables: ['Workshop calendar invites & Workshop agenda (embedded in calendar invite & provided separately) sent to customer participants, by EM', 'Customer pre-reads, prerequisites', 'Workshop assets finalized (demo instance, decks, etc.)'],
              meetings: [{ id: 'mt1', scheduledBy: 'bpc', ledBy: 'bpc', external: false }],
              tasks: [
                task('d2-2-1-t1', 1, 'Review completed Startup checklist', { em: ['R'], bpc: ['A', 'R'], arch: ['R'], tc: ['C'] }),
                task('d2-2-1-t2', 2, 'Align on future workshop needs (including agenda) and logistics', { em: ['R'], bpc: ['A', 'R'], arch: ['R'], tc: ['C'] }),
                task('d2-2-1-t3', 3, 'Role play prep for workshop', { em: ['R'], bpc: ['A', 'R'], arch: ['R'], tc: ['C'] }, [{ id: 'ja-d221t3-1', url: '#', roles: [] }]),
                task('d2-2-1-t4', 4, 'Prepare Demo instance', { em: ['I'], bpc: ['C'], arch: ['A', 'R'], tc: ['C'] }, [{ id: 'ja-d221t4-1', url: '#', roles: [] }, { id: 'ja-d221t4-2', url: '#', roles: ['arch'] }])
              ]
            }),
            blankSubPhase('d2-2-2', '2.2', 'Customer Workshops', 2, 'presentation'),
            blankSubPhase('d2-2-3', '2.3', 'Post Workshop', 3, 'archive'),
            blankSubPhase('d2-2-4', '2.4', 'Scope Rebalancing', 4, 'scales'),
            blankSubPhase('d2-2-5', '2.5', 'Refinement & Sprint Planning', 5, 'list'),
            blankSubPhase('d2-2-6', '2.6', 'Sprint Planning with Customer', 6, 'calendar')
          ]
        },
        {
          id: 'd2-execute', name: 'Execute', order: 3,
          subPhases: [
            Object.assign(blankSubPhase('d2-3-1', '3.1', 'Build Activities', 1, 'code'), {
              overview: 'This phase is where we execute high quality development and code configurations within the ServiceNow platform. We do this iteratively and incrementally, ensuring that the output evolves in alignment with the plans set forth with the customer, prior.',
              objective: 'The objective of the development phase is to build upon the user stories established and create a working ServiceNow platform environment that will help customer meet their stated business objectives, in the timeline set forth.',
              levelOfEffort: { mode: 'all', all: { text: 'As Defined', billable: true }, roles: {} },
              inputs: ['Sprint roadmap', 'Approved stories', 'New requirements & defects', 'Project Plan', 'Resource Plan', 'Requirements traceability matrix (RTM)'],
              deliverables: ['Completion & sign off of stories within sprint(s)', 'Code release', 'Weekly status reports (EM)', 'Requirements traceability matrix (RTM)', 'Sprint plan'],
              tasks: [
                task('d2-3-1-t1', 1, 'Facilitate and prepare for Sprint planning prior to start of the upcoming sprint', { em: ['A', 'R'], bpc: ['R'], arch: ['R'], tc: ['R'] }, [{ id: 'ja-d231t1-1', url: '#', roles: [] }]),
                task('d2-3-1-t2', 2, 'Review stories with the project team and ensure plan for the sprint is aligned with GF and client', { em: ['A', 'R'], bpc: ['R'], arch: ['R'], tc: ['R'] }, [{ id: 'ja-d231t2-1', url: '#', roles: [] }]),
                task('d2-3-1-t3', 3, 'User story refining and unblocking', { em: ['C'], bpc: ['A', 'R'], arch: ['R'], tc: ['C'] }, [{ id: 'ja-d231t3-1', url: '#', roles: [] }])
              ]
            }),
            blankSubPhase('d2-3-2', '3.2', 'Build Validation and UAT Readiness', 2, 'flask')
          ]
        },
        {
          id: 'd2-deliver', name: 'Deliver', order: 4,
          subPhases: [
            Object.assign(blankSubPhase('d2-4-1', '4.1', 'UAT', 1, 'shield'), {
              overview: 'The User Acceptance Testing (UAT) is a phase in our overall engagement in which the software/configuration built by GlideFast is tested in “real world” environments with representatives of the personas who will be using ServiceNow simulating their future use and accepting the work performed based on the requirements.',
              objective: 'The primary objective of UAT is to ensure the ServiceNow code we delivered can perform required tasks in “real world” scenarios, based on the battery of tests built prior. Furthermore, to ensure that defects, if any, are worked on and resolved satisfactorily.',
              levelOfEffort: { mode: 'all', all: { text: 'As Defined', billable: true }, roles: {} },
              comments: ['User Acceptance Testing is critical because it validates that the configured solution meets business requirements and workflows before go-live, reducing the risk of defects and ensuring user adoption.'],
              inputs: ['UAT strategy & plan from kick off'],
              deliverables: ['Progress and status reports throughout UAT phase', 'UAT signoff', 'Backlog inventory within customer’s agile platform'],
              meetings: [{ id: 'mt2', scheduledBy: 'em', ledBy: 'em', external: true }],
              tasks: [
                task('d2-4-1-t1', 1, 'Execute UAT based on testing services in the SOW. Note: baseline testing efforts of premium testing not purchased by customer', { em: ['R'], bpc: ['A', 'R'], arch: ['R'], tc: ['C'], customer: ['R'] }),
                task('d2-4-1-t2', 2, 'Establish UAT reporting cadence', { em: ['A', 'R'], bpc: ['C'], arch: ['C'], tc: ['C'] }, [{ id: 'ja-d241t2-1', url: '#', roles: [] }]),
                task('d2-4-1-t3', 3, 'Prioritize and address defects thru resolution', { em: ['C'], bpc: ['C'], arch: ['R'], tc: ['R'], customer: ['I'] })
              ]
            }),
            blankSubPhase('d2-4-2', '4.2', 'Go Live Preparedness', 2, 'rocket'),
            blankSubPhase('d2-4-3', '4.3', 'Customer Signoff & Go Live Readiness', 3, 'stamp'),
            blankSubPhase('d2-4-4', '4.4', 'Deploy', 4, 'cloud'),
            blankSubPhase('d2-4-5', '4.5', 'Hypercare', 5, 'lifebuoy')
          ]
        },
        {
          id: 'd2-close', name: 'Close', order: 5,
          subPhases: [
            Object.assign(blankSubPhase('d2-5-1', '5.1', 'Internal Closure Meeting', 1, 'briefcase'), {
              overview: 'This is the phase in the journey where we prepare for the customer official closure meeting, discuss lessons learned, and care for any internal logistics necessary and associated with the closure of the engagement.',
              objective: 'The primary objective of this step is to capture all learnings from the engagement for the purpose of internal improvement and closely align on what is expected at the customer closure meeting.',
              levelOfEffort: { mode: 'byRole', all: {}, roles: { em: { text: '1 hour', billable: true }, bpc: { text: '1 hour', billable: true }, arch: { text: '1 hour', billable: true }, tc: { text: '1 hour', billable: true }, sa: { text: '1 hour', billable: false }, es: { text: '1 hour', billable: false, optional: true }, mktg: { text: '1 hour', billable: false }, ae: { text: '1 hour', billable: false } } },
              inputs: ['Internal closure deck template'],
              deliverables: ['Revised external closure deck', 'Schedule external closure meeting', 'Lessons learned', 'Draft marketing case study'],
              meetings: [{ id: 'mt3', scheduledBy: 'em', ledBy: 'em', external: false }],
              tasks: [
                task('d2-5-1-t1', 1, 'Schedule and facilitates internal retrospective & executes internal lesson learned gathering and document in SPACE', { em: ['A', 'R'], bpc: ['R'], arch: ['R'], tc: ['R'], sa: ['R'], es: ['I', 'C'], mktg: ['R'], ae: ['I', 'C'] }, [{ id: 'ja-d251t1-1', url: '#', roles: [] }]),
                task('d2-5-1-t2', 2, 'Confirms customer equipment return process and facilitates with each GlideFast team member', { em: ['A', 'R'], bpc: ['C'], arch: ['C'], tc: ['C'] })
              ]
            }),
            blankSubPhase('d2-5-2', '5.2', 'Customer Retrospective', 2, 'refresh'),
            blankSubPhase('d2-5-3', '5.3', 'Customer Closure Meeting', 3, 'check')
          ]
        }
      ]
    },
    {
      id: 'grs', name: 'GRS', order: 2,
      phases: [
        {
          id: 'grs-initiate', name: 'Initiate', order: 1,
          subPhases: [
            Object.assign(blankSubPhase('grs-1-2', '1.2', 'IPKT', 1, 'exchange'), {
              overview: 'At this phase, the GRS engagement is confirmed. The Account Executive has moved the opportunity in the Customer Relations Management (CRM) system to “Closed Won” and we are just about ready to meet the client and commence the GRS engagement. The heart of this step is the completion and live review of the IPKT document (and supporting documents) which serves as the transition phase.',
              objective: 'The primary objective of this step is to obtain knowledge from the sales team that negotiated the merits of the client engagement. A proper “handoff” will help ensure we come across as One company, remove any seams in the transition to Delivery and address any insights, risks and actions that we must take prior to meeting the client for the first time.',
              levelOfEffort: { mode: 'all', all: { text: '1 hour', billable: true }, roles: {} },
              comments: ['Aligned to AE'],
              inputs: ['IPKT Document', 'CRM opportunity record'],
              deliverables: ['Completed IPKT review', 'Transition risks & actions logged'],
              meetings: [{ id: 'mt4', scheduledBy: 'ae', ledBy: 'arch', external: false }],
              tasks: [task('grs-1-2-t1', 1, 'Complete and live-review the IPKT document with the sales team', { arch: ['A', 'R'], tc: ['A', 'R'], ae: ['C'] })]
            }),
            blankSubPhase('grs-1-3', '1.3', 'Team Touchpoint', 2, 'message'),
            blankSubPhase('grs-1-4', '1.4', 'Kickoff', 3, 'flag')
          ]
        },
        { id: 'grs-lifecycle', name: 'Lifecycle Check-ins', order: 2, subPhases: [blankSubPhase('grs-2-1', '2.1', 'Periodic Check-in', 1, 'calendar')] },
        { id: 'grs-closure', name: 'Closure', order: 3, subPhases: [blankSubPhase('grs-3-1', '3.1', 'Closure', 1, 'check')] }
      ]
    }
  ];

  var JARGON = {
    'IPKT': 'Internal Project Kickoff Transition - the handoff of a sold engagement from Sales to Delivery.',
    'RTM': 'Requirements Traceability Matrix - maps requirements to stories and tests through delivery.',
    'SOW': 'Statement of Work - the contracted scope, deliverables and terms of the engagement.',
    'ROM': 'Rough Order of Magnitude - an early, approximate estimate of effort or cost.',
    'UAT': 'User Acceptance Testing - customer validation of the built solution against requirements.',
    'GRS': 'GlideFast Remote Services - ongoing remote delivery/support engagements.',
    'HLD': 'High Level Design - the architectural design document for the solution.'
  };

  function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

  // Keeps authored sp.icon in sync for known seed ids when loading from localStorage
  // (storage may predate the icon field, or hold an older keyword-fallback value).
  function applySeedIcons(methodologies) {
    var iconById = {};
    METHODOLOGIES.forEach(function (m) {
      m.phases.forEach(function (p) {
        p.subPhases.forEach(function (s) { if (s.icon) { iconById[s.id] = s.icon; } });
      });
    });
    methodologies.forEach(function (m) {
      m.phases.forEach(function (p) {
        p.subPhases.forEach(function (s) {
          if (iconById[s.id]) { s.icon = iconById[s.id]; }
          else if (!s.icon) { s.icon = 'doc'; }
        });
      });
    });
  }

  function seedPayload() {
    var methodologies = deepClone(METHODOLOGIES);
    applySeedIcons(methodologies);
    return {
      jobTitles: deepClone(JOB_TITLES),
      methodologies: methodologies,
      jargon: deepClone(JARGON),
      referenceSections: []
    };
  }

  function cacheLookups(payload) {
    cachedJobTitles = payload.jobTitles;
    cachedJargon = payload.jargon;
    cachedReferenceSections = payload.referenceSections || [];
  }

  function localGetData() {
    var stored = loadStoredMethodologies();
    var payload = seedPayload();
    if (stored) {
      payload.methodologies = deepClone(stored);
      applySeedIcons(payload.methodologies);
    }
    cacheLookups(payload);
    return $q.resolve(payload);
  }

  function fromServerData(d) {
    return {
      jobTitles: d.jobTitles || [],
      methodologies: d.methodologies || [],
      jargon: d.jargon || {},
      referenceSections: d.referenceSections || []
    };
  }

  function rejectServerError(d, fallbackMessage) {
    var message = (d && d.error) ? d.error : (fallbackMessage || 'Content save failed.');
    return $q.reject({ error: message, data: d });
  }

  function savePayload(methodologies) {
    return {
      action: 'save',
      methodologies: methodologies,
      jobTitles: cachedJobTitles || deepClone(JOB_TITLES),
      jargon: cachedJargon || deepClone(JARGON),
      referenceSections: cachedReferenceSections || []
    };
  }

  return {
    // Wire the Service Portal widget server API (c.server). No-op in the local harness.
    bindServer: function (api) {
      if (api && typeof api.get === 'function') { serverApi = api; }
    },
    getData: function () {
      if (!serverApi) { return localGetData(); }
      return serverApi.get({ action: 'load' }).then(function (response) {
        var d = (response && response.data) || {};
        if (d.error && !(d.methodologies && d.methodologies.length)) {
          return rejectServerError(d, 'Could not load content.');
        }
        if (d.methodologies && d.methodologies.length) {
          var payload = fromServerData(d);
          cacheLookups(payload);
          return payload;
        }
        // Empty content table — use seed. Editors persist it so the next load is shared.
        var seed = seedPayload();
        cacheLookups(seed);
        if (d.canEdit) {
          return serverApi.get(savePayload(seed.methodologies)).then(function (saveRes) {
            var sd = (saveRes && saveRes.data) || {};
            if (sd.error || sd.saved === false) {
              return seed;
            }
            if (sd.methodologies && sd.methodologies.length) {
              var saved = fromServerData(sd);
              cacheLookups(saved);
              return saved;
            }
            return seed;
          }, function () { return seed; });
        }
        return seed;
      }, function () { return localGetData(); });
    },
    // Persists the FULL methodologies tree (both Project and GRS) every time - simplest correct
    // thing when a single sub-phase save or a read-state change could touch either one, and the
    // payload is small enough that writing all of it each time costs nothing noticeable.
    saveData: function (methodologies) {
      if (!serverApi) {
        storeMethodologies(methodologies);
        return $q.resolve({ saved: true });
      }
      return serverApi.get(savePayload(methodologies)).then(function (response) {
        var d = (response && response.data) || {};
        if (d.error || d.saved === false) {
          return rejectServerError(d);
        }
        if (d.jobTitles) { cachedJobTitles = d.jobTitles; }
        if (d.jargon) { cachedJargon = d.jargon; }
        if (d.referenceSections) { cachedReferenceSections = d.referenceSections; }
        return d;
      });
    },
    resetData: function () { try { window.localStorage.removeItem(STORAGE_KEY); } catch (e) {} },
    // Exposed so the controller can mint new sub-phases (structure editing) with the same shape
    // as every seeded one, instead of hand-rolling a second copy of this object literal.
    blankSubPhase: blankSubPhase
  };
}]);
