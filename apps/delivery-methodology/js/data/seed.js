/* Harness-only seed for Delivery Methodology. Sets window.DMSeed.
   Listed in deploy.manifest.js with deploy: false so the packager does not ship it.
   Local index.html loads this before DataService. */
(function (root) {
  'use strict';

  var JOB_TITLES = [
    { id: 'arch', name: 'Architect', abbr: 'ARCH', description: 'Owns the technical solution design and integrity of the build across the engagement.' },
    { id: 'em', name: 'Engagement Manager', abbr: 'EM', description: 'Owns delivery, client relationship, scope, schedule and internal coordination.' },
    { id: 'bpc', name: 'Business Process Consultant', abbr: 'BPC', description: 'Owns process design, requirements facilitation and workshop readiness.' },
    { id: 'ba', name: 'Business Analyst', abbr: 'BA', description: 'Supports requirements gathering and analysis when assigned to the engagement.' },
    { id: 'tc', name: 'Technical Consultant', abbr: 'TC', description: 'Builds and configures the ServiceNow solution against approved stories.' },
    { id: 'ux', name: 'UX Designer', abbr: 'UX', description: 'Designs portal and interface experience when in scope for the project.' },
    { id: 'sa', name: 'Solutions Consultant', abbr: 'SC', description: 'Solutions-side consultant supporting scoping, handoff and closure.' },
    { id: 'pssc', name: 'Pre-Sales Solutions Consultant', abbr: 'PSSC', description: 'Pre-sales solutions consultant who often initiates and facilitates the IPKT handoff.' },
    { id: 'es', name: 'Executive Sponsor', abbr: 'ES', description: 'GlideFast executive accountable for the account relationship (A/VP level).' },
    { id: 'mktg', name: 'Marketing Specialist', abbr: 'MS', description: 'Marketing team representative capturing the engagement narrative into a case study.' },
    { id: 'ae', name: 'Sales Executive', abbr: 'SE', description: 'Owns the commercial relationship and CRM opportunity, and schedules GRS transition touchpoints.' },
    { id: 'snse', name: 'ServiceNow Sales Executive', abbr: 'SNSE', description: 'ServiceNow-side sales executive involved in the opportunity and handoff.' },
    { id: 'apex', name: 'Apex Sales Representative', abbr: 'APEX', description: 'Apex sales representative when applicable to the engagement.' },
    { id: 'csm', name: 'Customer Success Manager', abbr: 'CSM', description: 'Owns the customer relationship after go-live, driving adoption, renewal and expansion.' },
    { id: 'trainer', name: 'Training Specialist', abbr: 'TS', description: 'Delivers end-user training and enablement sessions for the customer team.' },
    { id: 'tpm', name: 'Training Program Manager', abbr: 'TPM', description: 'Owns training program planning when training is in scope for the engagement.' },
    { id: 'resourcing', name: 'Resourcing Specialist', abbr: 'RS', description: 'Assigns and staffs the delivery team, and sets up engagement Slack channels ahead of kickoff.' },
    { id: 'customer', name: 'Customer', abbr: 'CUST', external: true, description: 'The customer / client stakeholders - included in the RACI wherever the engagement requires their input, approval or participation.' }
  ];

  function task(id, order, text, raci, jobAids) {
    return {
      id: id,
      order: order,
      text: text,
      raci: raci,
      jobAids: jobAids || []
    };
  }
  function blankSubPhase(id, sid, name, order, icon) {
    return {
      id: id,
      sid: sid,
      name: name,
      order: order,
      icon: icon || 'doc',
      changelog: [],
      overview: '',
      objective: '',
      participants: [],
      comments: [],
      inputs: [],
      deliverables: [],
      tasks: [],
      meetings: [],
      levelOfEffort: {
        mode: 'all',
        all: {},
        roles: {}
      }
    };
  }

  var METHODOLOGIES = [
    {
      id: 'delivery2',
      name: 'Project',
      order: 1,
      title: 'Delivery 2.0 Methodology & Process',
      summary: 'Project engagement playbook, phase by phase.',
      description: [
        'A strong services methodology is essential for delivering efficient, high-quality outcomes and consistent client experiences. GlideFast\'s Delivery 2.0 methodology provides a structured, repeatable framework that clarifies deliverables, timelines, roles, and resource allocation while addressing common implementation challenges and reducing delivery risk.',
        'Each chapter outlines the key inputs, activities, and deliverables across the customer journey, beginning with the Initiate and Plan phases. A RACI designation (Responsible, Accountable, Consulted, Informed) appears next to each task to indicate baseline role expectations; teams should validate and tailor these during the initiation phase based on the specific engagement.',
        'The methodology is organized into five phases and presented sequentially from Initiate through Closure. However, most engagements follow an Agile approach, with Initiate, Plan, and Execute activities operating as iterative cycles throughout the lifecycle.',
        'Delivery 2.0 will continue to evolve based on lessons learned from real engagements. Teams are encouraged to share feedback, gaps, and improvement ideas through the provided feedback link so the methodology remains practical, relevant, and continuously improving.'
      ].join('\n\n'),
      feedbackUrl: 'mailto:delivery2.0@glidefast.com?subject=Delivery%202.0%20Feedback%20and%20Ideas%20Submission',
      feedbackLabel: 'Provide Feedback',
      diagramUrl: '',
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
              levelOfEffort: { mode: 'all', all: { text: '3-5 hours', billable: true }, roles: {} },
              participants: ['arch', 'em', 'bpc'],
              comments: ['To be reviewed in advance of the IPKT. Recommended, over a week prior.'],
              inputs: [
                'Addition to Slack Channel by Resourcing team',
                'SoW / Work Order',
                'IPKT Document',
                'ROM',
                'Lessons learned',
                'Previous / concurrent projects / GRSs conducted with the client',
                'Review outputs and insights from previous strategic advisory engagements with the client, if applicable'
              ],
              deliverables: [
                'Notes and risks to the bottom section of the IPKT document',
                'If time sensitive and applicable (prior to IPKT), discuss with Sales team in advance'
              ],
              tasks: [
                task('d2-1-1-t1', 1, 'Review SOW inputs', { arch: ['R'], em: ['R', 'A'], bpc: ['R'], tc: ['R'] }),
                task('d2-1-1-t2', 2, 'Take thorough notes', { arch: ['R'], em: ['R', 'A'], bpc: ['R'], tc: ['R'] }),
                task('d2-1-1-t3', 3, 'Review and/or consult with AE / other Delivery personnel regarding previous / concurrent projects / GRSs conducted with the client', { arch: ['R'], em: ['R'], bpc: ['R'], tc: ['R'] }),
                task('d2-1-1-t4', 4, 'Review lessons learned from previous engagements with the client', { arch: ['R'], em: ['R'], bpc: ['R'], tc: ['R'] }),
                task('d2-1-1-t5', 5, 'Notate any questions or concerns in the IPKT document to discuss during IPKT', { arch: ['R'], em: ['R', 'A'], bpc: ['R'], tc: ['R'] }, [{ id: 'ja-d211t5-1', url: '#', roles: [] }])
              ]
            }),
            Object.assign(blankSubPhase('d2-1-2', '1.2', 'IPKT', 2, 'exchange'), {
              overview: 'At this phase, the engagement is confirmed. The Sales Executive has moved the opportunity in the Customer Relations Management (CRM) system to “Closed Won” and we are just about ready to meet the client and commence. The heart of this step is the completion and live review of the IPKT document (and supporting documents) which serves as the transition phase.',
              objective: 'The primary objective of this step is to obtain knowledge from the sales team that negotiated the merits of the client engagement. A proper “handoff” will help ensure we come across as One company, remove any seams in the transition to Delivery and address any insights, risks and actions that we must take prior to meeting the client for the first time.',
              participants: ['arch', 'em', 'bpc', 'ux', 'tc', 'ae', 'snse', 'pssc', 'tpm', 'es', 'resourcing', 'apex'],
              levelOfEffort: {
                mode: 'byRole',
                all: {},
                roles: {
                  arch: { text: '1 hour', billable: true },
                  em: { text: '1 hour', billable: true },
                  bpc: { text: '1 hour', billable: true },
                  ux: { text: '1 hour', billable: true, optional: true },
                  tc: { text: '1 hour each', billable: true }
                }
              },
              comments: [
                'Remember to come prepared, after reviewing assets.',
                'Sales Executive - Should add IPKT document at least 5 business days prior to meeting.',
                'ServiceNow Sales Executive - consult with GlideFast sales exec to consider adding.',
                'Pre-Sales Solutions Consultant - Initiator & Facilitator of the meeting.',
                'Executive Sponsor at A/VP Level - Documented in the project channel.'
              ],
              meetings: [{ id: 'mt-d212-1', name: 'IPKT', scheduledBy: 'ae', ledBy: 'pssc', external: false }],
              inputs: [
                'IPKT Doc',
                'ROM',
                'SOW / Work Order',
                'Other customer collateral, as applicable'
              ],
              deliverables: [
                'EM notates Risks on RIDAC within SPACE',
                'Execute resourcing / personnel modifications or mitigations',
                'Startup Checklist (revised)',
                'EM incorporates Workshop Outline into Pre-Kickoff and Kickoff decks'
              ],
              tasks: [
                task('d2-1-2-t1', 1, 'Sales presents the deal from their perspective', { ae: ['A'], arch: ['I'], em: ['I'], bpc: ['I'], tc: ['I'] }),
                task('d2-1-2-t2', 2, 'Review of IPKT documentation', { arch: ['R'], em: ['R'], bpc: ['R'], tc: ['R'] }),
                task('d2-1-2-t3', 3, 'Discussion and review of pre-IPKT highlights and notes', { arch: ['R'], em: ['R', 'A'], bpc: ['R'], tc: ['R'] }),
                task('d2-1-2-t4', 4, 'Discuss Q&A, risks and issues. Document in RIDAC on the project record.', { em: ['R', 'A'], arch: ['R'], bpc: ['R'], tc: ['C'] }, [{ id: 'ja-d212t4-1', url: '#', roles: ['em'] }, { id: 'ja-d212t4-2', url: '#', roles: ['arch'] }]),
                task('d2-1-2-t5', 5, 'Tailor the Customer Startup checklist', { em: ['R', 'A'], bpc: ['R'], arch: ['R'], tc: ['I'] }, [{ id: 'ja-d212t5-1', url: '#', roles: [] }]),
                task('d2-1-2-t6', 6, 'Outline workshops, duration, and attendees', { em: ['C'], bpc: ['R', 'A'], arch: ['R'], tc: ['C'] }, [{ id: 'ja-d212t6-1', url: '#', roles: [] }]),
                task('d2-1-2-t7', 7, 'Re-baseline resource plans', { em: ['R', 'A'], bpc: ['C'], arch: ['C'], tc: ['C'] })
              ]
            }),
            Object.assign(blankSubPhase('d2-1-3', '1.3', 'Customer Pre-Kickoff', 3, 'door'), {
              overview: 'Meet with the primary customer contact to plan logistics for the official kickoff and readiness activities ahead of engaging the broader customer team.',
              objective: 'Align on the timetable and readiness activities so everyone is prepared before the larger customer team gets involved.',
              participants: ['arch', 'bpc', 'em', 'es', 'ae', 'apex'],
              levelOfEffort: {
                mode: 'byRole',
                all: {},
                roles: {
                  arch: { text: '1 hour', billable: true },
                  bpc: { text: '1 hour', billable: true },
                  em: { text: '1 hour', billable: true }
                }
              },
              comments: [
                'Sales Executive schedules the online meeting & introduces the team',
                'Engagement Manager facilitates the meeting'
              ],
              meetings: [{ id: 'mt-d213-1', name: 'Customer Pre-Kickoff', scheduledBy: 'ae', ledBy: 'em', external: true }],
              inputs: [
                'Customer Pre-Kickoff deck',
                'Startup checklist pre-modified by EM, Architect & BPC',
                'Outputs from previous strategic advisory engagements (if applicable)',
                'Workshop outline'
              ],
              deliverables: [
                'Startup checklist (to be completed by customer)',
                'Success criteria value statements',
                'Updated Canvas with supplementary information',
                'Summary minutes',
                'Initial project schedule in PPM',
                'Initial workshop schedule'
              ],
              tasks: [
                task('d2-1-3-t1', 1, 'Introduction to the core GlideFast team', { em: ['R', 'A'], bpc: ['R'], arch: ['R'], tc: ['I'] }, [{ id: 'ja-d213t1-1', url: '#', roles: ['em'] }, { id: 'ja-d213t1-2', url: '#', roles: ['arch'] }]),
                task('d2-1-3-t2', 2, 'Prepare and walk through the start-up checklist with the customer', { em: ['R', 'A'], bpc: ['R'], arch: ['R'], tc: ['I'] }, [{ id: 'ja-d213t2-1', url: '#', roles: [] }]),
                task('d2-1-3-t3', 3, 'Identify customer stakeholders and subject matter experts', { em: ['R', 'A'], bpc: ['R'], arch: ['R'], tc: ['C'] }),
                task('d2-1-3-t4', 4, 'Review the Workshop Outline with the customer', { em: ['C'], bpc: ['R', 'A'], arch: ['R'], tc: ['C'] }),
                task('d2-1-3-t5', 5, 'Coordinate client schedules for kickoff and workshops', { em: ['R', 'A'], bpc: ['R'], arch: ['C'], tc: ['I'] }),
                task('d2-1-3-t6', 6, 'Create the initial project plan', { em: ['R', 'A'], bpc: ['R'], arch: ['R'], tc: ['C'] }, [{ id: 'ja-d213t6-1', url: '#', roles: [] }]),
                task('d2-1-3-t7', 7, 'Facilitate the meeting using the standard Customer Pre-Kickoff deck', { em: ['R', 'A'], bpc: ['R'], arch: ['R'], tc: ['I'] }, [{ id: 'ja-d213t7-1', url: '#', roles: [] }])
              ]
            }),
            Object.assign(blankSubPhase('d2-1-4', '1.4', 'Get to Know the Team', 4, 'users'), {
              overview: 'An internal step to assemble the engagement team and familiarize members with the merits of the project before customer kickoff.',
              objective: 'Align the team on customer expectations, ensure readiness and logistics, and establish architectural and development standards (led by the Architect).',
              participants: ['arch', 'em', 'bpc', 'tpm', 'tc', 'ux'],
              levelOfEffort: {
                mode: 'all',
                all: { text: '30-45 minutes each', billable: true },
                roles: {}
              },
              comments: ['Engagement Manager facilitates the meeting.'],
              meetings: [{ id: 'mt-d214-1', name: 'Get to Know the Team', scheduledBy: 'em', ledBy: 'em', external: false }],
              inputs: [
                'Customized Get to Know You Deck',
                'Notes & Summaries from IPKT and Pre-Kickoff Customer Meeting',
                'SoW and ROM'
              ],
              deliverables: [
                'Risks & mitigations documented in RIDAC',
                'Tailored Customer Kickoff Deck'
              ],
              tasks: [
                task('d2-1-4-t1', 1, 'Engagement Manager customizes the Get to Know You deck', { em: ['R', 'A'], bpc: ['C'], arch: ['C'], tc: ['I'] }, [{ id: 'ja-d214t1-1', url: '#', roles: [] }]),
                task('d2-1-4-t2', 2, 'Introduction of all team members', { em: ['R', 'A'], bpc: ['R'], arch: ['R'], tc: ['R'] }),
                task('d2-1-4-t3', 3, 'Facilitate project readiness review using the standard deck', { em: ['R', 'A'], bpc: ['R'], arch: ['R'], tc: ['R'] }),
                task('d2-1-4-t4', 4, 'Review timekeeping guidelines and progress notes', { em: ['R', 'A'], bpc: ['R'], arch: ['R'], tc: ['R'] }, [{ id: 'ja-d214t4-1', url: '#', roles: [] }]),
                task('d2-1-4-t5', 5, 'Tailor the customer kickoff deck in collaboration with BPC and Architect', { em: ['R', 'A'], bpc: ['R'], arch: ['R'], tc: ['C'] }),
                task('d2-1-4-t6', 6, 'Initiate client onboarding and access to instances working with client stakeholders. Confirm if client equipment is required and facilitate distribution. Track equipment and understand the return process as we close down the project.', { em: ['R', 'A'], bpc: ['C'], arch: ['R'], tc: ['R'] })
              ]
            }),
            Object.assign(blankSubPhase('d2-1-5', '1.5', 'Kickoff', 5, 'flag'), {
              overview: 'Meet with the full customer team contributors to formally kick off the engagement.',
              objective: 'Ensure a successful start by aligning on project goals, deliverables, timelines, success criteria, clarifying roles, and discussing potential risks.',
              participants: ['arch', 'em', 'bpc', 'tc', 'ux', 'es', 'tpm', 'ae', 'apex'],
              levelOfEffort: {
                mode: 'all',
                all: { text: '1 hour each', billable: true },
                roles: {}
              },
              comments: [
                'Engagement Manager facilitates the meeting',
                'Executive Sponsor documented in the project channel',
                'Training Program Manager included if training is included in SoW'
              ],
              meetings: [{ id: 'mt-d215-1', name: 'Kickoff', scheduledBy: 'em', ledBy: 'em', external: true }],
              inputs: [
                'Project kickoff deck (tailored in advance by EM, BPC, and Architect)'
              ],
              deliverables: [
                'Summary minutes (created and sent by EM)',
                'Workshop planner sent to client participants',
                'RIDAC modifications'
              ],
              tasks: [
                task('d2-1-5-t1', 1, 'Review the draft kickoff deck', { em: ['R', 'A'], bpc: ['R'], arch: ['R'], tc: ['R'], es: ['C'] }),
                task('d2-1-5-t2', 2, 'Facilitate the meeting using the standard kickoff deck covering project readiness', { em: ['R', 'A'], bpc: ['R'], arch: ['R'], tc: ['R'], es: ['C'] }, [{ id: 'ja-d215t2-1', url: '#', roles: [] }]),
                task('d2-1-5-t3', 3, 'Introduce upcoming Change Enablement and Testing Strategy sessions', { em: ['C'], bpc: ['R', 'A'], arch: ['C'], tc: ['C'] }),
                task('d2-1-5-t4', 4, 'Finalize schedule, agenda, and SMEs for future workshops', { em: ['C'], bpc: ['R', 'A'], arch: ['R'], tc: ['C'] }, [{ id: 'ja-d215t4-1', url: '#', roles: [] }]),
                task('d2-1-5-t5', 5, 'Create the first status report / status meeting', { em: ['R', 'A'], bpc: ['C'], arch: ['C'], tc: ['C'], es: ['I'] }, [{ id: 'ja-d215t5-1', url: '#', roles: [] }]),
                task('d2-1-5-t6', 6, 'Determine leadership check-in cadence (Executive Sponsor)', { em: ['C'], bpc: ['C'], arch: ['C'], tc: ['C'], es: ['R', 'A'] }, [{ id: 'ja-d215t6-1', url: '#', roles: [] }])
              ]
            })
          ]
        },
        {
          id: 'd2-plan', name: 'Plan', order: 2,
          subPhases: [
            Object.assign(blankSubPhase('d2-2-1', '2.1', 'Pre-Workshop Planning', 1, 'clipboard'), {
              changelog: [{ id: 'c3', ts: '2026-07-10', text: 'Task added: “Prepare Demo instance”', read: false }],
              overview: 'At this phase, we are getting our customer team ready for a successful and efficient start of the project. Most of the steps are internal readiness activities, but coordination is needed while interfacing with the client.',
              objective: 'The primary objective of this stage is to ensure all logistics are cared for on our end, customer expectations are fully aligned, and we maximize the time and effort during the actual workshops, once they begin. This is our first big effort with the customer, and we need to show up prepared, aligned and productive.',
              participants: ['arch', 'bpc', 'em', 'ux'],
              levelOfEffort: {
                mode: 'byRole',
                all: {},
                roles: {
                  arch: { text: '2 hours', billable: true },
                  bpc: { text: '3 hours', billable: true },
                  em: { text: '1 hour', billable: true },
                  ux: { text: '1 hour', billable: true, optional: true }
                }
              },
              comments: ['BPC facilitates readiness and logistics.'],
              meetings: [{ id: 'mt-d221-1', name: 'Pre-Workshop Planning', scheduledBy: 'bpc', ledBy: 'bpc', external: false }],
              inputs: [
                'Customer demo instance',
                'Completed customer value statement',
                'Completed customer startup checklist'
              ],
              deliverables: [
                'Workshop calendar invites & Workshop agenda (embedded in calendar invite & provided separately) sent to customer participants, by EM',
                'Customer pre-reads, prerequisites',
                'Workshop assets finalized (demo instance, decks, etc.)'
              ],
              tasks: [
                task('d2-2-1-t1', 1, 'Review completed Startup checklist', { em: ['R'], bpc: ['R', 'A'], arch: ['R'], tc: ['C'] }),
                task('d2-2-1-t2', 2, 'Align on future workshop needs (including agenda) and logistics', { em: ['R'], bpc: ['R', 'A'], arch: ['R'], tc: ['C'] }),
                task('d2-2-1-t3', 3, 'Role play prep for workshop', { em: ['R'], bpc: ['R', 'A'], arch: ['R'], tc: ['C'] }, [{ id: 'ja-d221t3-1', url: '#', roles: [] }]),
                task('d2-2-1-t4', 4, 'Prepare Demo instance', { em: ['I'], bpc: ['C'], arch: ['R', 'A'], tc: ['C'] }, [{ id: 'ja-d221t4-1', url: '#', roles: [] }]),
                task('d2-2-1-t5', 5, 'Review current instance versions across instance stack (i.e. Dev/Test/Production) and ensure alignment ahead of proposed design and workshops. Coordinate with EM to document and mitigate issues.', { em: ['I'], bpc: ['C'], arch: ['R', 'A'], tc: ['C'] }),
                task('d2-2-1-t6', 6, 'Lead Product Workshop preparation', { em: ['C'], bpc: ['R', 'A'], arch: ['R'], tc: ['C'] }, [{ id: 'ja-d221t6-1', url: '#', roles: [] }]),
                task('d2-2-1-t7', 7, 'Coordinate Design team representative', { em: ['C'], bpc: ['R', 'A'], arch: ['C'], ux: ['R'] }),
                task('d2-2-1-t8', 8, 'Work with customer to enable Agile 2.0 module in their instance to track user stories and agile components', { em: ['R', 'A'], bpc: ['C'], arch: ['C'], tc: ['C'] })
              ]
            }),
            Object.assign(blankSubPhase('d2-2-2', '2.2', 'Customer Workshops', 2, 'presentation'), {
              overview: 'Engage stakeholders to plan the engagement, understand business objectives, processes, and expectations for digital transformation with ServiceNow.',
              objective: 'Translate findings from workshops into tangible user stories to be developed/configured into the platform.',
              participants: ['arch', 'em', 'bpc', 'ba', 'tc', 'tpm', 'ux'],
              levelOfEffort: {
                mode: 'byRole',
                all: {},
                roles: {
                  arch: { text: 'Varies per SoW', billable: true },
                  em: { text: 'Varies per SoW', billable: true },
                  bpc: { text: 'Varies per SoW', billable: true },
                  ux: { text: 'Varies per SoW', billable: true, optional: true },
                  tc: { text: 'Non-billable unless EM & Architect say otherwise', billable: false }
                }
              },
              comments: [
                'BPC facilitates logistics. Include design team representatives, if part of the engagement',
                'TC attendance will be determined during workshop pre-planning'
              ],
              meetings: [{ id: 'mt-d222-1', name: 'Customer Workshops', scheduledBy: 'em', ledBy: 'bpc', external: true }],
              inputs: [
                'Customer demo instance',
                'Tailored workshop decks',
                'Use cases & case studies',
                'Prior epics/themes/stories (from advisory engagement)',
                'Starter user stories'
              ],
              deliverables: [
                'Themes & epics',
                'Initial Requirement Traceability Matrix (RTM) work in progress',
                'Follow up sessions (demos, process reviews, shadowing, meetings)',
                'Documented testing strategy, UAT plan, and defined roles/responsibilities for solution testing',
                'Documented Change Enablement recommendations',
                'RIDAC updates',
                'Consolidated action items and summary notes'
              ],
              tasks: [
                task('d2-2-2-t1', 1, 'Load in any applicable GlideFast Starter Stories to help prepare for workshop topics and requirements-gathering discussions', { em: ['I'], bpc: ['R', 'A'], arch: ['R'], tc: ['C'] }),
                task('d2-2-2-t2', 2, 'Execute the Product Workshop', { em: ['C'], bpc: ['R', 'A'], arch: ['R'], tc: ['C'] }, [{ id: 'ja-d222t2-1', url: '#', roles: [] }]),
                task('d2-2-2-t3', 3, 'Deliver workshop activities per plan', { em: ['C'], bpc: ['R', 'A'], arch: ['R'], tc: ['C'] }),
                task('d2-2-2-t4', 4, 'Lead the effort to coordinate requirements gathering cadence', { em: ['C'], bpc: ['R', 'A'], arch: ['R'], tc: ['C'] }, [{ id: 'ja-d222t4-1', url: '#', roles: [] }]),
                task('d2-2-2-t5', 5, 'Initiate Testing Strategy and UAT Planning working session(s)', { em: ['C'], bpc: ['R', 'A'], arch: ['R'], tc: ['C'] }, [{ id: 'ja-d222t5-1', url: '#', roles: [] }]),
                task('d2-2-2-t6', 6, 'Initiate Change Enablement & Governance workshop session(s)', { em: ['C'], bpc: ['R', 'A'], arch: ['C'], tc: ['C'] }, [{ id: 'ja-d222t6-1', url: '#', roles: [] }]),
                task('d2-2-2-t7', 7, 'Coordinate training logistics', { em: ['C'], bpc: ['R'], tpm: ['R', 'A'], arch: ['I'] }),
                task('d2-2-2-t8', 8, 'Initiate and lead design workshop', { em: ['C'], bpc: ['C'], arch: ['R'], ux: ['R', 'A'] })
              ]
            }),
            Object.assign(blankSubPhase('d2-2-3', '2.3', 'Post Workshop', 3, 'archive'), {
              overview: 'Internal phase where the Business Process Consultant and Architect align on high-level requirements and scope captured during customer workshops before presenting recommendations back to the client.',
              objective: 'Align on information absorbed during workshops, create initial user stories in the platform, identify scope issues/risks, and identify timeline dependencies.',
              participants: ['arch', 'em', 'bpc'],
              levelOfEffort: {
                mode: 'byRole',
                all: {},
                roles: {
                  arch: { text: '2 days per workshop', billable: true },
                  bpc: { text: '2 days per workshop', billable: true },
                  em: { text: 'Informed', billable: false }
                }
              },
              comments: [
                'Remember to keep the momentum going and communicate clearly to customer next steps and timing needed to prepare user stories for review'
              ],
              meetings: [{ id: 'mt-d223-1', name: 'Post Workshop', scheduledBy: 'bpc', ledBy: 'bpc', external: false }],
              inputs: [
                'Epics & themes from the workshop',
                'Draft Requirements Traceability Matrix (RTM)',
                'Statement of Work (SoW)',
                'Workshop summary & notes',
                'Testing Strategy and UAT Plan',
                'Change Enablement recommendations'
              ],
              deliverables: [
                'Updated Risks to the plan',
                'Initial dependencies (e.g. integrations) tracked on the project plan',
                'Scheduled additional working sessions for data collection',
                'Scope rebalancing impact meeting invite',
                'Revisions to the RTM',
                'Draft user stories',
                'Draft design concept(s)'
              ],
              tasks: [
                task('d2-2-3-t1', 1, 'Draft / populate user stories capturing workshop information into the platform', { bpc: ['R', 'A'], arch: ['R'] }, [{ id: 'ja-d223t1-1', url: '#', roles: [] }]),
                task('d2-2-3-t2', 2, 'Calibrate scope: compare draft with SoW and enter data into the RTM', { em: ['R'], bpc: ['R', 'A'], arch: ['R'] }, [{ id: 'ja-d223t2-1', url: '#', roles: [] }]),
                task('d2-2-3-t3', 3, 'Risk assessment: work with EM on deviation risks from original scope/timeline', { em: ['R', 'A'], bpc: ['R'], arch: ['R'] }),
                task('d2-2-3-t4', 4, 'Schedule scope rebalancing impact meetings with the client', { em: ['R', 'A'], bpc: ['R'], arch: ['R'] }),
                task('d2-2-3-t5', 5, 'Create a deployment record on the ServiceNow partner portal', { em: ['R', 'A'], bpc: ['I'], arch: ['C'] }, [{ id: 'ja-d223t5-1', url: '#', roles: [] }]),
                task('d2-2-3-t6', 6, 'Propose design concepts to the customer', { arch: ['R'], ux: ['R', 'A'] })
              ]
            }),
            Object.assign(blankSubPhase('d2-2-4', '2.4', 'Scope Rebalancing', 4, 'scales'), {
              overview: 'Post-workshop analysis of scope, priorities, and timelines based on the Requirements Traceability Matrix (RTM). Confirm with the customer what will be delivered, deferred, or descoped to establish a baseline.',
              objective: 'Secure formal client alignment and approval on the rebalanced scope before development begins.',
              participants: ['arch', 'bpc', 'em'],
              levelOfEffort: {
                mode: 'all',
                all: { text: '1 hour', billable: true },
                roles: {}
              },
              comments: [
                'Client alignment is critical for us to be successful. Ensure we clear all blockers and have a proper path forward to execute.'
              ],
              meetings: [{ id: 'mt-d224-1', name: 'Scope Rebalancing', scheduledBy: 'em', ledBy: 'em', external: true }],
              inputs: ['Completed RTM'],
              deliverables: [
                'Update RIDAC',
                'Change order with details and next steps from scope sessions',
                'Schedule additional calibration meetings until final decisions and alignment is met'
              ],
              tasks: [
                task('d2-2-4-t1', 1, 'Review RTM with client', { em: ['R', 'A'], bpc: ['R'], arch: ['R'], tc: ['C'] }),
                task('d2-2-4-t2', 2, 'Discuss approach for non-in-scope stories and determine next steps', { em: ['R', 'A'], bpc: ['R'], arch: ['R'], tc: ['C'] }, [{ id: 'ja-d224t2-1', url: '#', roles: [] }]),
                task('d2-2-4-t3', 3, 'Facilitate change order based on scope rebalancing outcomes', { em: ['R', 'A'], bpc: ['C'], arch: ['C'], tc: ['C'], es: ['I'], ae: ['I'] }, [{ id: 'ja-d224t3-1', url: '#', roles: [] }, { id: 'ja-d224t3-2', url: '#', roles: [] }])
              ]
            }),
            Object.assign(blankSubPhase('d2-2-5', '2.5', 'Refinement & Sprint Planning', 5, 'list'), {
              overview: 'Internal phase where the GlideFast Architect and Business Process Consultant meet to review the scope, identify work, identify the backlog, and estimate effort for sprints.',
              objective: 'Create a well-defined, prioritized backlog with direction, definition, and goals for each sprint to be presented to the customer.',
              participants: ['arch', 'bpc', 'em'],
              levelOfEffort: {
                mode: 'byRole',
                all: {},
                roles: {
                  arch: { text: '8-12 hrs each, per focus area', billable: true },
                  bpc: { text: '8-12 hrs each, per focus area', billable: true },
                  em: { text: '2-5 hrs', billable: true }
                }
              },
              comments: [],
              meetings: [{ id: 'mt-d225-1', name: 'Refinement & Sprint Planning', scheduledBy: 'bpc', ledBy: 'bpc', external: false }],
              inputs: [
                'Stories in-scope from customer scope re-balancing meeting',
                'Initial project plan'
              ],
              deliverables: [
                'Groomed user stories & proposal for level of effort',
                'Sprint sequencing in customer instance (or agile platform) and aligned to project plan',
                'High level technical approach (part of High-level Design (HLD))',
                'Refined project plan'
              ],
              tasks: [
                task('d2-2-5-t1', 1, 'Add short descriptions, personas, acceptance criteria, story pointing, and technical approach within the customer instance or customer’s agile/project application', { em: ['C'], bpc: ['R', 'A'], arch: ['R'], tc: ['C'] }, [{ id: 'ja-d225t1-1', url: '#', roles: [] }]),
                task('d2-2-5-t2', 2, 'Identify blockers (APIs, additional customer inputs needed, data sources, etc.) as they relate to the solution', { em: ['C'], bpc: ['R'], arch: ['R', 'A'], tc: ['R'] }),
                task('d2-2-5-t3', 3, 'Add testing acceptance criteria for functional business requirements in user stories', { em: ['C'], bpc: ['R', 'A'], arch: ['R'], tc: ['C'] }, [{ id: 'ja-d225t3-1', url: '#', roles: [] }]),
                task('d2-2-5-t4', 4, 'Draft high level technical approach to development within the High-Level Proposed Design (HLD) document', { em: ['I'], bpc: ['C'], arch: ['R', 'A'], tc: ['R'] }, [{ id: 'ja-d225t4-1', url: '#', roles: [] }]),
                task('d2-2-5-t5', 5, 'User story sequencing & dependencies identified', { em: ['C'], bpc: ['R', 'A'], arch: ['R'], tc: ['C'] }),
                task('d2-2-5-t6', 6, 'Organize sprint roadmap in customer instance', { em: ['C'], bpc: ['R', 'A'], arch: ['R'], tc: ['C'] }),
                task('d2-2-5-t7', 7, 'Prepare draft sprint planning to review with customer', { em: ['C'], bpc: ['R', 'A'], arch: ['R'], tc: ['C'] }),
                task('d2-2-5-t8', 8, 'Schedule customer sprint planning review', { em: ['R', 'A'], bpc: ['R'], arch: ['C'], tc: ['I'] }, [{ id: 'ja-d225t8-1', url: '#', roles: [] }]),
                task('d2-2-5-t9', 9, 'Refine project plan', { em: ['R', 'A'], bpc: ['R'], arch: ['C'], tc: ['I'] })
              ]
            }),
            Object.assign(blankSubPhase('d2-2-6', '2.6', 'Sprint Planning with Customer', 6, 'calendar'), {
              overview: 'External sprint planning meeting to align all stakeholders, especially the customer, with goals, scope, and priorities for upcoming sprints.',
              objective: 'Align on sprint goals; define scope/deliverables; discuss dependencies, risks, and concerns; agree on priorities; set expectations; and discuss next steps.',
              participants: ['arch', 'bpc', 'em', 'tc'],
              levelOfEffort: {
                mode: 'byRole',
                all: {},
                roles: {
                  arch: { text: '1-2 hours per sprint', billable: true },
                  bpc: { text: '1-2 hours per sprint', billable: true },
                  em: { text: '1-2 hours per sprint', billable: true },
                  tc: { text: '1-2 hours per sprint', billable: true }
                }
              },
              comments: [],
              meetings: [{ id: 'mt-d226-1', name: 'Sprint Planning with Customer', scheduledBy: 'bpc', ledBy: 'bpc', external: true }],
              inputs: [
                'Draft sprint plan within customer’s agile/project planning tool',
                'Draft High-Level Design (HLD)'
              ],
              deliverables: [
                'Re-calibration of plan (if applicable), scheduled follow up meetings',
                'Project plan refinement',
                'EM sends summary and next steps to customer & stakeholders'
              ],
              tasks: [
                task('d2-2-6-t1', 1, 'Review proposed plan', { em: ['R', 'A'], bpc: ['R'], arch: ['R'], tc: ['C'] }),
                task('d2-2-6-t2', 2, 'Obtain customer approval and signoff. Document approvals within user stories', { em: ['R', 'A'], bpc: ['R'], arch: ['R'], tc: ['C'] }, [{ id: 'ja-d226t2-1', url: '#', roles: [] }]),
                task('d2-2-6-t3', 3, 'Core team assign stories for development, post-approval from the customer', { em: ['R', 'A'], bpc: ['R'], arch: ['R'], tc: ['R'] })
              ]
            })
          ]
        },
        {
          id: 'd2-execute', name: 'Execute', order: 3,
          subPhases: [
            Object.assign(blankSubPhase('d2-3-1', '3.1', 'Build Activities', 1, 'code'), {
              overview: 'This phase is where we execute high quality development and code configurations within the ServiceNow platform. We do this iteratively and incrementally, ensuring that the output evolves in alignment with the plans set forth with the customer, prior.',
              objective: 'The objective of the development phase is to build upon the user stories established and create a working ServiceNow platform environment that will help customer meet their stated business objectives, in the timeline set forth.',
              participants: ['arch', 'bpc', 'em', 'tc', 'ux'],
              levelOfEffort: {
                mode: 'all',
                all: { text: 'As Defined', billable: true },
                roles: {
                  ux: { text: 'Defined by portal concept complexity', billable: true, optional: true }
                }
              },
              comments: [],
              inputs: [
                'Sprint roadmap',
                'Approved stories',
                'New requirements & defects',
                'Project Plan',
                'Resource Plan',
                'Requirements traceability matrix (RTM)'
              ],
              deliverables: [
                'Completion & sign off of stories within sprint(s)',
                'Code release',
                'Weekly status reports (EM)',
                'Requirements traceability matrix (RTM)',
                'Sprint plan'
              ],
              tasks: [
                task('d2-3-1-t1', 1, 'Facilitate and prepare for Sprint planning prior to start of the upcoming sprint', { em: ['R', 'A'], bpc: ['R'], arch: ['R'], tc: ['R'] }, [{ id: 'ja-d231t1-1', url: '#', roles: [] }]),
                task('d2-3-1-t2', 2, 'Review stories with the project team and ensure plan for the sprint is aligned with GF and client', { em: ['R', 'A'], bpc: ['R'], arch: ['R'], tc: ['R'] }, [{ id: 'ja-d231t2-1', url: '#', roles: [] }]),
                task('d2-3-1-t3', 3, 'User story refining and unblocking', { em: ['C'], bpc: ['R', 'A'], arch: ['R'], tc: ['C'] }, [{ id: 'ja-d231t3-1', url: '#', roles: [] }]),
                task('d2-3-1-t4', 4, 'Establish Daily Standup (DSU) cadence with the client and GlideFast team', { em: ['R', 'A'], bpc: ['R'], arch: ['R'], tc: ['R'] }, [{ id: 'ja-d231t4-1', url: '#', roles: [] }]),
                task('d2-3-1-t5', 5, 'Guide Architects / TCs on agreed-upon design concepts', { em: ['I'], bpc: ['C'], arch: ['R', 'A'], ux: ['R'], tc: ['C'] }),
                task('d2-3-1-t6', 6, 'Development and configuration of user stories', { em: ['I'], bpc: ['C'], arch: ['C'], tc: ['R', 'A'] }),
                task('d2-3-1-t7', 7, 'Defect remediation', { em: ['C'], bpc: ['C'], arch: ['R'], tc: ['R', 'A'] }, [{ id: 'ja-d231t7-1', url: '#', roles: [] }]),
                task('d2-3-1-t8', 8, 'Create code notations and work notes within stories', { em: ['I'], bpc: ['C'], arch: ['C'], tc: ['R', 'A'] }, [{ id: 'ja-d231t8-1', url: '#', roles: [] }]),
                task('d2-3-1-t9', 9, 'Conduct unit tests for developed features', { em: ['I'], bpc: ['C'], arch: ['C'], tc: ['R', 'A'] }, [{ id: 'ja-d231t9-1', url: '#', roles: [] }]),
                task('d2-3-1-t10', 10, 'Conduct peer reviews of code / configurations', { em: ['I'], bpc: ['C'], arch: ['R'], tc: ['R', 'A'] }, [{ id: 'ja-d231t10-1', url: '#', roles: [] }]),
                task('d2-3-1-t11', 11, 'Prepare for the demonstration at the end of the sprint', { em: ['R', 'A'], bpc: ['R'], arch: ['R'], tc: ['R'] }, [{ id: 'ja-d231t11-1', url: '#', roles: [] }]),
                task('d2-3-1-t12', 12, 'Coordinate with team which stories are being reviewed in Sprint demos', { em: ['R', 'A'], bpc: ['R'], arch: ['R'], tc: ['R'] }),
                task('d2-3-1-t13', 13, 'Deliver sprint demos', { em: ['R'], bpc: ['R'], arch: ['R', 'A'], tc: ['R'] }, [{ id: 'ja-d231t13-1', url: '#', roles: [] }]),
                task('d2-3-1-t14', 14, 'Obtain customer approvals after sprint demo & adjust backlog as needed', { em: ['R', 'A'], bpc: ['R'], arch: ['R'], tc: ['C'] }),
                task('d2-3-1-t15', 15, 'Reconcile RTM from planning phase and refine during sprint planning. Additional scope calibration sessions may be needed to ensure alignment with client post demos and/or sprint planning', { em: ['R'], bpc: ['R', 'A'], arch: ['R'], tc: ['C'] })
              ]
            }),
            Object.assign(blankSubPhase('d2-3-2', '3.2', 'Build Validation and UAT Readiness', 2, 'flask'), {
              overview: 'Collaborative effort to finalize system configuration, validate functionality, and prepare for User Acceptance Testing (UAT) and go-live.',
              objective: 'Ensure a seamless transition from build to validation/readiness by coordinating technical documentation, testing, UAT readiness, change enablement, and training.',
              participants: ['arch', 'bpc', 'em', 'tc', 'ux'],
              levelOfEffort: {
                mode: 'all',
                all: { text: 'As Defined', billable: true },
                roles: {}
              },
              comments: [],
              inputs: [
                'Test strategy and decisions',
                'Testing Plan',
                'New requirements & defects',
                'Project Plan',
                'Resource Plan',
                'Requirements traceability matrix (RTM)'
              ],
              deliverables: [
                'UAT materials and calendar invite for kickoff',
                'Training plan and logistics',
                'UAT kick off',
                'Test plans & script finalization',
                'Completion & sign off of stories, end to end',
                'Weekly status reports (EM)',
                'Requirements traceability matrix (RTM)'
              ],
              tasks: [
                task('d2-3-2-t1', 1, 'Draft technical documentation and As Built documents', { em: ['I'], bpc: ['R'], arch: ['R', 'A'], tc: ['R'] }, [{ id: 'ja-d232t1-1', url: '#', roles: [] }]),
                task('d2-3-2-t2', 2, 'Facilitate and prepare for end-to-end (E2E) demos, including testing all configuration from sprints', { em: ['R', 'A'], bpc: ['R'], arch: ['R'], tc: ['R'] }),
                task('d2-3-2-t3', 3, 'Deliver E2E demos', { em: ['R'], bpc: ['R'], arch: ['R', 'A'], tc: ['R'] }, [{ id: 'ja-d232t3-1', url: '#', roles: [] }]),
                task('d2-3-2-t4', 4, 'Schedule and conduct UAT Kickoff meetings (including deck preparation)', { em: ['R', 'A'], bpc: ['R'], arch: ['C'], tc: ['C'] }, [{ id: 'ja-d232t4-1', url: '#', roles: [] }]),
                task('d2-3-2-t5', 5, 'Execute Change Enablement and Go-Live Support planning', { em: ['R', 'A'], bpc: ['R'], arch: ['C'], tc: ['C'] }, [{ id: 'ja-d232t5-1', url: '#', roles: [] }]),
                task('d2-3-2-t6', 6, 'Execution of the training plan by the training team', { em: ['C'], bpc: ['C'], tpm: ['R', 'A'], trainer: ['R'] }),
                task('d2-3-2-t7', 7, 'Validate the final set of user stories against the RTM', { em: ['C'], bpc: ['R', 'A'], arch: ['R'], tc: ['C'] })
              ]
            })
          ]
        },
        {
          id: 'd2-deliver', name: 'Deliver', order: 4,
          subPhases: [
            Object.assign(blankSubPhase('d2-4-1', '4.1', 'UAT', 1, 'shield'), {
              overview: 'The User Acceptance Testing (UAT) is a phase in our overall engagement in which the software/configuration built by GlideFast is tested in “real world” environments with representatives of the personas who will be using ServiceNow simulating their future use and accepting the work performed based on the requirements.',
              objective: 'The primary objective of UAT is to ensure the ServiceNow code we delivered can perform required tasks in “real world” scenarios, based on the battery of tests built prior. Furthermore, to ensure that defects, if any, are worked on and resolved satisfactorily.',
              participants: ['arch', 'bpc', 'em', 'tc'],
              levelOfEffort: {
                mode: 'all',
                all: { text: 'As Defined', billable: true },
                roles: {}
              },
              comments: [
                'User Acceptance Testing is critical because it validates that the configured solution meets business requirements and workflows before go-live, reducing the risk of defects and ensuring user adoption.'
              ],
              meetings: [{ id: 'mt-d241-1', name: 'UAT', scheduledBy: 'em', ledBy: 'em', external: true }],
              inputs: ['UAT strategy & plan from kick off'],
              deliverables: [
                'Progress and status reports throughout UAT phase',
                'UAT signoff',
                'Backlog inventory within customer’s agile platform'
              ],
              tasks: [
                task('d2-4-1-t1', 1, 'Execute UAT based on testing services in the SOW. Note: baseline testing efforts of premium testing not purchased by customer', { em: ['R'], bpc: ['R', 'A'], arch: ['R'], tc: ['C'] }),
                task('d2-4-1-t2', 2, 'Establish UAT reporting cadence', { em: ['R', 'A'], bpc: ['C'], arch: ['C'], tc: ['C'] }, [{ id: 'ja-d241t2-1', url: '#', roles: [] }]),
                task('d2-4-1-t3', 3, 'Prioritize and address defects thru resolution', { em: ['C'], bpc: ['C'], arch: ['R', 'A'], tc: ['R'] }),
                task('d2-4-1-t4', 4, 'Work with customer on backlog prioritization and plan for enhancements', { em: ['R'], bpc: ['R', 'A'], arch: ['R'], tc: ['C'] }, [{ id: 'ja-d241t4-1', url: '#', roles: [] }])
              ]
            }),
            Object.assign(blankSubPhase('d2-4-2', '4.2', 'Go Live Preparedness', 2, 'rocket'), {
              overview: 'Final assessment phase where the team ensures everything is ready for launch to avoid disruptions. Covers communication and training delivery ahead of customer sign-off.',
              objective: 'Ensure all internal readiness tasks (Technical, Operational, Business) are finished and ready for customer sign-off.',
              participants: ['arch', 'bpc', 'em', 'tc'],
              levelOfEffort: {
                mode: 'all',
                all: { text: '8-16 hours', billable: true },
                roles: {}
              },
              comments: [],
              meetings: [{ id: 'mt-d242-1', name: 'Go Live Preparedness', scheduledBy: 'em', ledBy: 'em', external: true }],
              inputs: [
                'UAT signoff',
                'RTM document complete',
                'Backlog'
              ],
              deliverables: [
                'Deployment runbook',
                'As-built technical document',
                'Process documents',
                'Go Live checklist',
                'Hypercare plan'
              ],
              tasks: [
                task('d2-4-2-t1', 1, 'Schedule and prepare for the Go Live readiness meeting with the customer', { em: ['R', 'A'], bpc: ['R'], arch: ['C'], tc: ['C'] }, [{ id: 'ja-d242t1-1', url: '#', roles: [] }]),
                task('d2-4-2-t2', 2, 'Finalize the deployment runbook', { em: ['C'], bpc: ['C'], arch: ['R', 'A'], tc: ['R'] }, [{ id: 'ja-d242t2-1', url: '#', roles: [] }]),
                task('d2-4-2-t3', 3, 'Finalize the As-Built technical document', { em: ['I'], bpc: ['C'], arch: ['R', 'A'], tc: ['R'] }, [{ id: 'ja-d242t3-1', url: '#', roles: [] }]),
                task('d2-4-2-t4', 4, 'Review and validate all instance (i.e. Dev/Test/Production) versions are in sync in preparation for deployment', { em: ['C'], bpc: ['C'], arch: ['R', 'A'], tc: ['R'] }),
                task('d2-4-2-t5', 5, 'Schedule and deliver Knowledge Transfer (KT) sessions to the client', { em: ['R', 'A'], bpc: ['R'], arch: ['R'], tc: ['C'] }),
                task('d2-4-2-t6', 6, 'Finalize and deliver process documents and training', { em: ['C'], bpc: ['R', 'A'], tpm: ['R'], trainer: ['R'] }),
                task('d2-4-2-t7', 7, 'Develop and finalize the hypercare plan', { em: ['R', 'A'], bpc: ['R'], arch: ['C'], tc: ['C'] }, [{ id: 'ja-d242t7-1', url: '#', roles: [] }])
              ]
            }),
            Object.assign(blankSubPhase('d2-4-3', '4.3', 'Customer Signoff & Go Live Readiness', 3, 'stamp'), {
              overview: 'Critical step to ensure scope delivery and customer sign-off before official go-live activities.',
              objective: 'Ensure complete buy-in and sign-off for transitioning to go-live preparation.',
              participants: ['arch', 'bpc', 'em', 'tc'],
              levelOfEffort: {
                mode: 'all',
                all: { text: '1-2 hrs', billable: true },
                roles: {}
              },
              comments: [],
              meetings: [{ id: 'mt-d243-1', name: 'Customer Signoff & Go Live Readiness', scheduledBy: 'em', ledBy: 'em', external: true }],
              inputs: ['UAT signoff'],
              deliverables: ['Summary email & customer sign off'],
              tasks: [
                task('d2-4-3-t1', 1, 'Review standard go live readiness agenda deck (run book, RTM, Go Live checklist)', { em: ['A'], bpc: ['R'], arch: ['R'], tc: ['C'] }, [{ id: 'ja-d243t1-1', url: '#', roles: [] }]),
                task('d2-4-3-t2', 2, 'Obtain signoff (go/no-go) from customer', { em: ['R', 'A'], bpc: ['C'], arch: ['C'], tc: ['I'] }),
                task('d2-4-3-t3', 3, 'Prepare for “go live” / change enablement final phases of plan', { em: ['C'], bpc: ['R', 'A'], arch: ['C'], tc: ['C'] }, [{ id: 'ja-d243t3-1', url: '#', roles: [] }]),
                task('d2-4-3-t4', 4, 'Discuss schedule & logistics for “go live” celebration', { em: ['R', 'A'], bpc: ['C'], arch: ['C'], tc: ['C'] }),
                task('d2-4-3-t5', 5, 'Submit Go Live Request', { em: ['R', 'A'], bpc: ['C'], arch: ['C'], tc: ['I'] })
              ]
            }),
            Object.assign(blankSubPhase('d2-4-4', '4.4', 'Deploy', 4, 'cloud'), {
              overview: 'Make the system available to customer users by implementing ServiceNow software in a live, production environment.',
              objective: 'Successfully deploy based on a plan, complete smoke testing, and ensure the system performs to customer expectations.',
              participants: ['arch', 'bpc', 'em', 'tc'],
              levelOfEffort: {
                mode: 'byRole',
                all: {},
                roles: {
                  arch: { text: '10h', billable: true },
                  bpc: { text: '10h', billable: true },
                  em: { text: '8h', billable: true },
                  tc: { text: '10h each', billable: true }
                }
              },
              comments: [],
              meetings: [{ id: 'mt-d244-1', name: 'Deploy', scheduledBy: 'em', ledBy: 'em', external: false }],
              inputs: [
                'Run book',
                'Update sets',
                'Data load, if applicable',
                'Go Live plan'
              ],
              deliverables: [
                'Update sets committed to production',
                'Deployment complete email to all stakeholders'
              ],
              tasks: [
                task('d2-4-4-t1', 1, 'Schedule deployment window', { em: ['R', 'A'], bpc: ['C'], arch: ['C'], tc: ['C'] }),
                task('d2-4-4-t2', 2, 'Provide status and progress during the window', { em: ['R', 'A'], bpc: ['R'], arch: ['R'], tc: ['R'] }),
                task('d2-4-4-t3', 3, 'Commit update sets to production', { em: ['C'], bpc: ['C'], arch: ['R', 'A'], tc: ['R'] }, [{ id: 'ja-d244t3-1', url: '#', roles: [] }]),
                task('d2-4-4-t4', 4, 'Execute and complete smoke testing', { em: ['C'], bpc: ['R'], arch: ['R', 'A'], tc: ['R'] }, [{ id: 'ja-d244t4-1', url: '#', roles: [] }]),
                task('d2-4-4-t5', 5, 'Execute “go live” / change enablement', { em: ['R', 'A'], bpc: ['R'], arch: ['C'], tc: ['C'] }, [{ id: 'ja-d244t5-1', url: '#', roles: [] }]),
                task('d2-4-4-t6', 6, 'Training team executes training plan', { em: ['C'], bpc: ['C'], tpm: ['R', 'A'], trainer: ['R'] })
              ]
            }),
            Object.assign(blankSubPhase('d2-4-5', '4.5', 'Hypercare', 5, 'lifebuoy'), {
              overview: 'Period where GlideFast is available for post-go-live support (anomalies, bugs, questions).',
              objective: 'Ensure a smooth transition into full production for the customer.',
              participants: ['arch', 'bpc', 'em', 'tc'],
              levelOfEffort: {
                mode: 'byRole',
                all: {},
                roles: {
                  arch: { text: '2 hours / week', billable: true },
                  bpc: { text: '2 hours / week', billable: true },
                  em: { text: '5 hours / week', billable: true },
                  tc: { text: '3 hours / week', billable: true }
                }
              },
              comments: [],
              meetings: [{ id: 'mt-d245-1', name: 'Hypercare', scheduledBy: 'em', ledBy: 'em', external: false }],
              inputs: ['Hypercare plan & schedule'],
              deliverables: [
                'Hypercare summary & status emails',
                'Documented defects or enhancements added to the backlog'
              ],
              tasks: [
                task('d2-4-5-t1', 1, 'Document issues, defects, and enhancements', { em: ['R', 'A'], bpc: ['R'], arch: ['R'], tc: ['R'] }),
                task('d2-4-5-t2', 2, 'Remediate issues and defects', { em: ['C'], bpc: ['C'], arch: ['R'], tc: ['R', 'A'] }),
                task('d2-4-5-t3', 3, 'Send Hypercare end of day status', { em: ['R', 'A'], bpc: ['R'], arch: ['C'], tc: ['C'] }, [{ id: 'ja-d245t3-1', url: '#', roles: [] }]),
                task('d2-4-5-t4', 4, 'Send Hypercare complete email with final status', { em: ['R', 'A'], bpc: ['C'], arch: ['C'], tc: ['C'] })
              ]
            })
          ]
        },
        {
          id: 'd2-close', name: 'Close', order: 5,
          subPhases: [
            Object.assign(blankSubPhase('d2-5-1', '5.1', 'Internal Closure Meeting', 1, 'briefcase'), {
              overview: 'This is the phase in the journey where we prepare for the customer official closure meeting, discuss lessons learned, and care for any internal logistics necessary and associated with the closure of the engagement.',
              objective: 'The primary objective of this step is to capture all learnings from the engagement for the purpose of internal improvement and closely align on what is expected at the customer closure meeting.',
              participants: ['arch', 'bpc', 'em', 'tc', 'sa', 'pssc', 'ae', 'es', 'mktg'],
              levelOfEffort: {
                mode: 'all',
                all: { text: '1hr all roles', billable: true },
                roles: {}
              },
              comments: [],
              meetings: [{ id: 'mt-d251-1', name: 'Internal Closure Meeting', scheduledBy: 'em', ledBy: 'em', external: false }],
              inputs: ['Internal closure deck template'],
              deliverables: [
                'Revised external closure deck',
                'Schedule external closure meeting',
                'Lessons learned',
                'Draft marketing case study'
              ],
              tasks: [
                task('d2-5-1-t1', 1, 'Schedule and facilitate internal retrospective & execute internal lesson learned gathering and document in SPACE', { em: ['R', 'A'], bpc: ['R'], arch: ['R'], tc: ['R'], pssc: ['R'], es: ['C', 'I'], mktg: ['R'], ae: ['C', 'I'] }, [{ id: 'ja-d251t1-1', url: '#', roles: [] }]),
                task('d2-5-1-t2', 2, 'Confirm customer equipment return process and facilitate with each GlideFast team member', { em: ['R', 'A'], bpc: ['C'], arch: ['C'], tc: ['C'] }),
                task('d2-5-1-t3', 3, 'Schedule customer closure meeting', { em: ['R', 'A'], bpc: ['C'], arch: ['C'], tc: ['C'] }),
                task('d2-5-1-t4', 4, 'Finalize case study questions and interviews with relevant team members', { em: ['R'], bpc: ['R'], arch: ['R'], tc: ['R'], mktg: ['A'] }),
                task('d2-5-1-t5', 5, 'Confirm go live celebration logistics with Marketing team and client stakeholders', { em: ['R', 'A'], bpc: ['C'], arch: ['C'], tc: ['C'], es: ['C'] }, [{ id: 'ja-d251t5-1', url: '#', roles: [] }]),
                task('d2-5-1-t6', 6, 'EM schedules customer retrospective', { em: ['R', 'A'], bpc: ['C'], arch: ['C'], tc: ['C'], es: ['I'], ae: ['I'] })
              ]
            }),
            Object.assign(blankSubPhase('d2-5-2', '5.2', 'Customer Retrospective', 2, 'refresh'), {
              overview: 'This is the phase in the journey where we meet with the client stakeholders to discuss what went well, what did not go well, and what could be improved.',
              objective: 'The primary objective of this step is to collaborate with the customer to capture all learnings from the engagement and capture lessons learned.',
              participants: ['arch', 'bpc', 'em', 'tc', 'es', 'ae', 'apex'],
              levelOfEffort: {
                mode: 'byRole',
                all: {},
                roles: {
                  arch: { text: '1 hour', billable: true },
                  bpc: { text: '1 hour', billable: true },
                  em: { text: '1 hour', billable: true },
                  tc: { text: '1 hour', billable: true }
                }
              },
              comments: [
                'This retrospective is client facing, be cognizant of what is shared externally.',
                'This retrospective can be combined with the customer closure meeting and celebration based on customer preference'
              ],
              meetings: [{ id: 'mt-d252-1', name: 'Customer Retrospective', scheduledBy: 'em', ledBy: 'em', external: true }],
              inputs: [
                'Customer retrospective deck',
                'Customer closure and celebration deck'
              ],
              deliverables: [
                'Documented lessons learned',
                'Customer retrospective deck',
                'Draft customer closure deck'
              ],
              tasks: [
                task('d2-5-2-t1', 1, 'EM facilitates delivery of retrospective deck', { em: ['R', 'A'], bpc: ['R'], arch: ['R'], tc: ['R'] }, [{ id: 'ja-d252t1-1', url: '#', roles: [] }]),
                task('d2-5-2-t2', 2, 'Update customer project closure deck (EM)', { em: ['R', 'A'], bpc: ['C'], arch: ['C'], tc: ['I'] }, [{ id: 'ja-d252t2-1', url: '#', roles: [] }]),
                task('d2-5-2-t3', 3, 'EM, BPC, Architect, and TC participate with client', { em: ['R', 'A'], bpc: ['R'], arch: ['R'], tc: ['R'] }),
                task('d2-5-2-t4', 4, 'EM documents lessons learned in the project record', { em: ['R', 'A'], bpc: ['C'], arch: ['C'], tc: ['I'] }),
                task('d2-5-2-t5', 5, 'EM schedules an internal meeting if there are feedback and or concerns identified during client retrospective that requires further debrief and next steps', { em: ['R', 'A'], bpc: ['R'], arch: ['C'], tc: ['C'] })
              ]
            }),
            Object.assign(blankSubPhase('d2-5-3', '5.3', 'Customer Closure Meeting', 3, 'check'), {
              overview: 'This phase marks the official closure of the client engagement, emphasizing the successful delivery of project outcomes and obtaining formal sign-off. Additionally, we will celebrate our achievements with a virtual or in-person go-live event.',
              objective: 'Successfully close the client engagement by ensuring all deliverables are met, obtaining formal sign-off, and celebrating project completion through a virtual or in-person go-live event.',
              participants: ['arch', 'bpc', 'em', 'tc', 'es', 'ae'],
              levelOfEffort: {
                mode: 'byRole',
                all: {},
                roles: {
                  arch: { text: '1 hour', billable: true },
                  bpc: { text: '1 hour', billable: true },
                  em: { text: '1 hour', billable: true },
                  tc: { text: 'n/a', billable: false, optional: true }
                }
              },
              comments: [],
              meetings: [{ id: 'mt-d253-1', name: 'Customer Closure Meeting', scheduledBy: 'em', ledBy: 'em', external: true }],
              inputs: ['Customer closure deck'],
              deliverables: [
                'Archive project documentation for future reference',
                'Celebration pictures',
                'Customer closure deck',
                'Chief Delivery Officer closure email',
                'Post closure meeting notes'
              ],
              tasks: [
                task('d2-5-3-t1', 1, 'EM facilitates delivery of closure deck', { em: ['A'], bpc: ['R'], arch: ['R'], tc: ['I'], es: ['C', 'I'], ae: ['C', 'I'] }, [{ id: 'ja-d253t1-1', url: '#', roles: [] }]),
                task('d2-5-3-t2', 2, 'EM facilitates go live celebration and takes virtual/live pictures (upon client approval) to provide to marketing@glidefast.com', { em: ['A'], bpc: ['I'], arch: ['I'], tc: ['I'], ae: ['C', 'I'], es: ['I'] }),
                task('d2-5-3-t3', 3, 'EM confirms ServiceNow CSAT risk of the project', { em: ['A'], bpc: ['R'], arch: ['R'], tc: ['I'], es: ['C', 'I'], ae: ['C', 'I'] }, [{ id: 'ja-d253t3-1', url: '#', roles: [] }]),
                task('d2-5-3-t4', 4, 'EM notifies Chief Customer / Delivery officer to send project completion thank you email to customer contacts (cc ServiceNow rep)', { em: ['A'], bpc: ['I'], arch: ['I'], tc: ['I'], es: ['I'] }, [{ id: 'ja-d253t4-1', url: '#', roles: [] }]),
                task('d2-5-3-t5', 5, 'EM validates data on ServiceNow partner portal and closes deployment record', { em: ['A'], bpc: ['C'], arch: ['C'], tc: ['C'] }, [{ id: 'ja-d253t5-1', url: '#', roles: [] }]),
                task('d2-5-3-t6', 6, 'EM closes timesheet project tasks and resource plans', { em: ['A'], bpc: ['C', 'I'], arch: ['C', 'I'], tc: ['C', 'I'] }, [{ id: 'ja-d253t6-1', url: '#', roles: [] }]),
                task('d2-5-3-t7', 7, 'EM consolidates and archives all project documentation and ensures it resides on project drive', { em: ['A'], bpc: ['C', 'I'], arch: ['C', 'I'], tc: ['C', 'I'] })
              ]
            })
          ]
        }
      ]
    },
    {
      id: 'grs',
      name: 'GRS',
      order: 2,
      summary: 'Remote Services playbook from handoff to close.',
      description: [
        'GlideFast Remote Services (GRS) is how we deliver ongoing, remote ServiceNow support and delivery work for customers who need skilled capacity without a full project implementation. GRS engagements are typically leaner than Project work: a clear handoff from Sales, a focused kickoff with the customer, periodic check-ins through the lifecycle, and a deliberate close.',
        'This playbook outlines the inputs, activities, and deliverables for a GRS engagement. A RACI designation (Responsible, Accountable, Consulted, Informed) appears next to each task as a baseline for role expectations; teams should confirm and adjust those assignments during initiation based on the specific engagement.',
        'GRS methodology will continue to evolve from real engagements. Share feedback, gaps, and improvement ideas through the feedback link so the playbook stays practical for delivery teams.'
      ].join('\n\n'),
      feedbackUrl: 'mailto:delivery2.0@glidefast.com?subject=Delivery%202.0%20Feedback%20and%20Ideas%20Submission',
      feedbackLabel: 'Provide Feedback',
      diagramUrl: '',
      phases: [
        {
          id: 'grs-initiate', name: 'Initiate', order: 1,
          subPhases: [
            blankSubPhase('grs-1-1', '1.1', 'Pre-IPKT', 1, 'inbox'),
            blankSubPhase('grs-1-2', '1.2', 'IPKT', 2, 'exchange'),
            blankSubPhase('grs-1-3', '1.3', 'Customer Pre-Kickoff', 3, 'door'),
            blankSubPhase('grs-1-4', '1.4', 'Get to Know the Team', 4, 'users'),
            blankSubPhase('grs-1-5', '1.5', 'Kickoff', 5, 'flag')
          ]
        },
        {
          id: 'grs-checkin', name: 'Check-in', order: 2,
          subPhases: [
            blankSubPhase('grs-2-1', '2.1', 'Check-in', 1, 'calendar')
          ]
        },
        {
          id: 'grs-close', name: 'Close', order: 3,
          subPhases: [
            blankSubPhase('grs-3-1', '3.1', 'Internal Closure Meeting', 1, 'briefcase'),
            blankSubPhase('grs-3-2', '3.2', 'Customer Retrospective', 2, 'refresh'),
            blankSubPhase('grs-3-3', '3.3', 'Customer Closure Meeting', 3, 'check')
          ]
        }
      ]
    }
  ];

  var JARGON = {
    'IPKT': 'Internal Project Kickoff Transition - the handoff of a sold engagement from Sales to Delivery.',
    'RTM': 'Requirements Traceability Matrix - maps requirements to stories and tests through delivery.',
    'SOW': 'Statement of Work - the contracted scope, deliverables and terms of the engagement.',
    'ROM': 'Rough Order of Magnitude - an early, approximate estimate of effort or cost.',
    'UAT': 'User Acceptance Testing - customer validation of the built solution against requirements.',
    'GRS': 'GlideFast Remote Services - ongoing remote ServiceNow support and delivery engagements, typically leaner than a full Project implementation.',
    'HLD': 'High Level Design - the architectural design document for the solution.'
  };


  var REFERENCE_SECTIONS = [
    {
      key: 'raci',
      title: 'How to use RACI',
      body: [
        'Every task in this methodology assigns each involved job title one or more RACI letters. They answer one question: for this task, what is that person\'s relationship to the work?',
        'Exactly one A per task. Accountability shouldn\'t be shared - if two people sign off, no one does.',
        'R and A can be the same person (shown together as R A) - they do it and own it.',
        'Every task needs at least an R and an A - someone doing the work, someone owning the result.',
        'The customer appears in the RACI wherever the engagement requires their input, approval, or participation.'
      ].join('\n\n')
    },
    {
      key: 'escalation',
      title: 'Escalation Management',
      body: ''
    }
  ];

  root.DMSeed = {
    version: 22,
    jobTitles: JOB_TITLES,
    methodologies: METHODOLOGIES,
    jargon: JARGON,
    referenceSections: REFERENCE_SECTIONS,
    blankSubPhase: blankSubPhase
  };
})(typeof self !== 'undefined' ? self : this);
