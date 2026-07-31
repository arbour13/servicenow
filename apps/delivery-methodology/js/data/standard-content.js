/* Standard GlideFast Delivery 2.0 starter content - the one-time "Load standard content"
   action offers this when an instance's content table is empty (see content.server.js's
   seedStandard action and js/services/data.service.js's seedStandard()). Deployed (unlike
   js/data/seed.js, which stays deploy: false / harness-only) - see deploy.manifest.js's
   files.contentModel entry, which concatenates this onto the widget SERVER script alongside
   url-policy.js / content-model.js, in the same Rhino-safe bare-var style.

   GENERATED, do not hand-edit. This is js/data/seed.js's payload (jobTitles/methodologies/
   jargon/referenceSections only - not its blankSubPhase harness helper or version field, which
   the server has no use for) with nothing else changed. Regenerate after any seed.js content
   change: node -e "var vm=require('vm'),fs=require('fs');var sandbox={self:{}};
   vm.createContext(sandbox);vm.runInContext(fs.readFileSync('js/data/seed.js','utf8'),
   sandbox);var s=sandbox.self.DMSeed;console.log(JSON.stringify({jobTitles:s.jobTitles,
   methodologies:s.methodologies,jargon:s.jargon,referenceSections:s.referenceSections},null,2));"
   then paste the output into the DMStandardContent literal below. Verified 2026-07-30 against
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
                      "A",
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
                  "id": "d2-1-1-t2",
                  "order": 2,
                  "text": "Take thorough notes",
                  "raci": {
                    "arch": [
                      "R"
                    ],
                    "em": [
                      "A",
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
                      "A",
                      "R"
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
                      "roles": []
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
                      "A",
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
                  "id": "d2-1-2-t4",
                  "order": 4,
                  "text": "Discuss Q&A, risks and issues. Document in RIDAC on the project record.",
                  "raci": {
                    "em": [
                      "A",
                      "R"
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
                      ]
                    },
                    {
                      "id": "ja-d212t4-2",
                      "url": "#",
                      "roles": [
                        "arch"
                      ]
                    }
                  ]
                },
                {
                  "id": "d2-1-2-t5",
                  "order": 5,
                  "text": "Tailor the Customer Startup checklist",
                  "raci": {
                    "em": [
                      "A",
                      "R"
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
                      "roles": []
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
                      "A",
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
                      "id": "ja-d212t6-1",
                      "url": "#",
                      "roles": []
                    }
                  ]
                },
                {
                  "id": "d2-1-2-t7",
                  "order": 7,
                  "text": "Re-baseline resource plans",
                  "raci": {
                    "em": [
                      "A",
                      "R"
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
                      "A",
                      "R"
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
                      ]
                    },
                    {
                      "id": "ja-d213t1-2",
                      "url": "#",
                      "roles": [
                        "arch"
                      ]
                    }
                  ]
                },
                {
                  "id": "d2-1-3-t2",
                  "order": 2,
                  "text": "Prepare and walk through the start-up checklist with the customer",
                  "raci": {
                    "em": [
                      "A",
                      "R"
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
                      "roles": []
                    }
                  ]
                },
                {
                  "id": "d2-1-3-t3",
                  "order": 3,
                  "text": "Identify customer stakeholders and subject matter experts",
                  "raci": {
                    "em": [
                      "A",
                      "R"
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
                      "A",
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
                  "id": "d2-1-3-t5",
                  "order": 5,
                  "text": "Coordinate client schedules for kickoff and workshops",
                  "raci": {
                    "em": [
                      "A",
                      "R"
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
                      "A",
                      "R"
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
                      "roles": []
                    }
                  ]
                },
                {
                  "id": "d2-1-3-t7",
                  "order": 7,
                  "text": "Facilitate the meeting using the standard Customer Pre-Kickoff deck",
                  "raci": {
                    "em": [
                      "A",
                      "R"
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
                      "roles": []
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
                      "A",
                      "R"
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
                      "roles": []
                    }
                  ]
                },
                {
                  "id": "d2-1-4-t2",
                  "order": 2,
                  "text": "Introduction of all team members",
                  "raci": {
                    "em": [
                      "A",
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
                      "A",
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
                      "A",
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
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d214t4-1",
                      "url": "#",
                      "roles": []
                    }
                  ]
                },
                {
                  "id": "d2-1-4-t5",
                  "order": 5,
                  "text": "Tailor the customer kickoff deck in collaboration with BPC and Architect",
                  "raci": {
                    "em": [
                      "A",
                      "R"
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
                      "A",
                      "R"
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
                      "A",
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
                      "A",
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
                    "es": [
                      "C"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d215t2-1",
                      "url": "#",
                      "roles": []
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
                      "A",
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
                      "A",
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
                      "id": "ja-d215t4-1",
                      "url": "#",
                      "roles": []
                    }
                  ]
                },
                {
                  "id": "d2-1-5-t5",
                  "order": 5,
                  "text": "Create the first status report / status meeting",
                  "raci": {
                    "em": [
                      "A",
                      "R"
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
                      "roles": []
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
                      "A",
                      "R"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d215t6-1",
                      "url": "#",
                      "roles": []
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
                      "A",
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
                  "id": "d2-2-1-t2",
                  "order": 2,
                  "text": "Align on future workshop needs (including agenda) and logistics",
                  "raci": {
                    "em": [
                      "R"
                    ],
                    "bpc": [
                      "A",
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
                  "id": "d2-2-1-t3",
                  "order": 3,
                  "text": "Role play prep for workshop",
                  "raci": {
                    "em": [
                      "R"
                    ],
                    "bpc": [
                      "A",
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
                      "id": "ja-d221t3-1",
                      "url": "#",
                      "roles": []
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
                      "A",
                      "R"
                    ],
                    "tc": [
                      "C"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d221t4-1",
                      "url": "#",
                      "roles": []
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
                      "A",
                      "R"
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
                      "A",
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
                      "id": "ja-d221t6-1",
                      "url": "#",
                      "roles": []
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
                      "A",
                      "R"
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
                      "A",
                      "R"
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
                      "A",
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
                  "id": "d2-2-2-t2",
                  "order": 2,
                  "text": "Execute the Product Workshop",
                  "raci": {
                    "em": [
                      "C"
                    ],
                    "bpc": [
                      "A",
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
                      "id": "ja-d222t2-1",
                      "url": "#",
                      "roles": []
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
                      "A",
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
                  "id": "d2-2-2-t4",
                  "order": 4,
                  "text": "Lead the effort to coordinate requirements gathering cadence",
                  "raci": {
                    "em": [
                      "C"
                    ],
                    "bpc": [
                      "A",
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
                      "id": "ja-d222t4-1",
                      "url": "#",
                      "roles": []
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
                      "A",
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
                      "id": "ja-d222t5-1",
                      "url": "#",
                      "roles": []
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
                      "A",
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
                      "id": "ja-d222t6-1",
                      "url": "#",
                      "roles": []
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
                      "A",
                      "R"
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
                      "A",
                      "R"
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
                      "A",
                      "R"
                    ],
                    "arch": [
                      "R"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d223t1-1",
                      "url": "#",
                      "roles": []
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
                      "A",
                      "R"
                    ],
                    "arch": [
                      "R"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d223t2-1",
                      "url": "#",
                      "roles": []
                    }
                  ]
                },
                {
                  "id": "d2-2-3-t3",
                  "order": 3,
                  "text": "Risk assessment: work with EM on deviation risks from original scope/timeline",
                  "raci": {
                    "em": [
                      "A",
                      "R"
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
                      "A",
                      "R"
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
                      "A",
                      "R"
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
                      "roles": []
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
                      "A",
                      "R"
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
                      "A",
                      "R"
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
                      "A",
                      "R"
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
                      "roles": []
                    }
                  ]
                },
                {
                  "id": "d2-2-4-t3",
                  "order": 3,
                  "text": "Facilitate change order based on scope rebalancing outcomes",
                  "raci": {
                    "em": [
                      "A",
                      "R"
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
                      "roles": []
                    },
                    {
                      "id": "ja-d224t3-2",
                      "url": "#",
                      "roles": []
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
                      "A",
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
                      "id": "ja-d225t1-1",
                      "url": "#",
                      "roles": []
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
                      "A",
                      "R"
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
                      "A",
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
                      "id": "ja-d225t3-1",
                      "url": "#",
                      "roles": []
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
                      "A",
                      "R"
                    ],
                    "tc": [
                      "R"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d225t4-1",
                      "url": "#",
                      "roles": []
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
                      "A",
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
                  "id": "d2-2-5-t6",
                  "order": 6,
                  "text": "Organize sprint roadmap in customer instance",
                  "raci": {
                    "em": [
                      "C"
                    ],
                    "bpc": [
                      "A",
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
                  "id": "d2-2-5-t7",
                  "order": 7,
                  "text": "Prepare draft sprint planning to review with customer",
                  "raci": {
                    "em": [
                      "C"
                    ],
                    "bpc": [
                      "A",
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
                  "id": "d2-2-5-t8",
                  "order": 8,
                  "text": "Schedule customer sprint planning review",
                  "raci": {
                    "em": [
                      "A",
                      "R"
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
                      "roles": []
                    }
                  ]
                },
                {
                  "id": "d2-2-5-t9",
                  "order": 9,
                  "text": "Refine project plan",
                  "raci": {
                    "em": [
                      "A",
                      "R"
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
                      "A",
                      "R"
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
                      "A",
                      "R"
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
                      "roles": []
                    }
                  ]
                },
                {
                  "id": "d2-2-6-t3",
                  "order": 3,
                  "text": "Core team assign stories for development, post-approval from the customer",
                  "raci": {
                    "em": [
                      "A",
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
                      "A",
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
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d231t1-1",
                      "url": "#",
                      "roles": []
                    }
                  ]
                },
                {
                  "id": "d2-3-1-t2",
                  "order": 2,
                  "text": "Review stories with the project team and ensure plan for the sprint is aligned with GF and client",
                  "raci": {
                    "em": [
                      "A",
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
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d231t2-1",
                      "url": "#",
                      "roles": []
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
                      "A",
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
                      "id": "ja-d231t3-1",
                      "url": "#",
                      "roles": []
                    }
                  ]
                },
                {
                  "id": "d2-3-1-t4",
                  "order": 4,
                  "text": "Establish Daily Standup (DSU) cadence with the client and GlideFast team",
                  "raci": {
                    "em": [
                      "A",
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
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d231t4-1",
                      "url": "#",
                      "roles": []
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
                      "A",
                      "R"
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
                      "A",
                      "R"
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
                      "A",
                      "R"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d231t7-1",
                      "url": "#",
                      "roles": []
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
                      "A",
                      "R"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d231t8-1",
                      "url": "#",
                      "roles": []
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
                      "A",
                      "R"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d231t9-1",
                      "url": "#",
                      "roles": []
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
                      "A",
                      "R"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d231t10-1",
                      "url": "#",
                      "roles": []
                    }
                  ]
                },
                {
                  "id": "d2-3-1-t11",
                  "order": 11,
                  "text": "Prepare for the demonstration at the end of the sprint",
                  "raci": {
                    "em": [
                      "A",
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
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d231t11-1",
                      "url": "#",
                      "roles": []
                    }
                  ]
                },
                {
                  "id": "d2-3-1-t12",
                  "order": 12,
                  "text": "Coordinate with team which stories are being reviewed in Sprint demos",
                  "raci": {
                    "em": [
                      "A",
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
                      "A",
                      "R"
                    ],
                    "tc": [
                      "R"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d231t13-1",
                      "url": "#",
                      "roles": []
                    }
                  ]
                },
                {
                  "id": "d2-3-1-t14",
                  "order": 14,
                  "text": "Obtain customer approvals after sprint demo & adjust backlog as needed",
                  "raci": {
                    "em": [
                      "A",
                      "R"
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
                      "A",
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
                      "A",
                      "R"
                    ],
                    "tc": [
                      "R"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d232t1-1",
                      "url": "#",
                      "roles": []
                    }
                  ]
                },
                {
                  "id": "d2-3-2-t2",
                  "order": 2,
                  "text": "Facilitate and prepare for end-to-end (E2E) demos, including testing all configuration from sprints",
                  "raci": {
                    "em": [
                      "A",
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
                      "A",
                      "R"
                    ],
                    "tc": [
                      "R"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d232t3-1",
                      "url": "#",
                      "roles": []
                    }
                  ]
                },
                {
                  "id": "d2-3-2-t4",
                  "order": 4,
                  "text": "Schedule and conduct UAT Kickoff meetings (including deck preparation)",
                  "raci": {
                    "em": [
                      "A",
                      "R"
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
                      "roles": []
                    }
                  ]
                },
                {
                  "id": "d2-3-2-t5",
                  "order": 5,
                  "text": "Execute Change Enablement and Go-Live Support planning",
                  "raci": {
                    "em": [
                      "A",
                      "R"
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
                      "roles": []
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
                      "A",
                      "R"
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
                      "A",
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
                      "A",
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
                  "id": "d2-4-1-t2",
                  "order": 2,
                  "text": "Establish UAT reporting cadence",
                  "raci": {
                    "em": [
                      "A",
                      "R"
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
                      "roles": []
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
                      "A",
                      "R"
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
                      "A",
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
                      "id": "ja-d241t4-1",
                      "url": "#",
                      "roles": []
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
                      "A",
                      "R"
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
                      "roles": []
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
                      "A",
                      "R"
                    ],
                    "tc": [
                      "R"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d242t2-1",
                      "url": "#",
                      "roles": []
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
                      "A",
                      "R"
                    ],
                    "tc": [
                      "R"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d242t3-1",
                      "url": "#",
                      "roles": []
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
                      "A",
                      "R"
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
                      "A",
                      "R"
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
                      "A",
                      "R"
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
                      "A",
                      "R"
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
                      "roles": []
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
                      "roles": []
                    }
                  ]
                },
                {
                  "id": "d2-4-3-t2",
                  "order": 2,
                  "text": "Obtain signoff (go/no-go) from customer",
                  "raci": {
                    "em": [
                      "A",
                      "R"
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
                      "A",
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
                      "id": "ja-d243t3-1",
                      "url": "#",
                      "roles": []
                    }
                  ]
                },
                {
                  "id": "d2-4-3-t4",
                  "order": 4,
                  "text": "Discuss schedule & logistics for “go live” celebration",
                  "raci": {
                    "em": [
                      "A",
                      "R"
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
                      "A",
                      "R"
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
                      "A",
                      "R"
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
                      "A",
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
                      "A",
                      "R"
                    ],
                    "tc": [
                      "R"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d244t3-1",
                      "url": "#",
                      "roles": []
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
                      "A",
                      "R"
                    ],
                    "tc": [
                      "R"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d244t4-1",
                      "url": "#",
                      "roles": []
                    }
                  ]
                },
                {
                  "id": "d2-4-4-t5",
                  "order": 5,
                  "text": "Execute “go live” / change enablement",
                  "raci": {
                    "em": [
                      "A",
                      "R"
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
                      "roles": []
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
                      "A",
                      "R"
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
                      "A",
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
                      "A",
                      "R"
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
                      "A",
                      "R"
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
                      "roles": []
                    }
                  ]
                },
                {
                  "id": "d2-4-5-t4",
                  "order": 4,
                  "text": "Send Hypercare complete email with final status",
                  "raci": {
                    "em": [
                      "A",
                      "R"
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
                      "A",
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
                    "pssc": [
                      "R"
                    ],
                    "es": [
                      "I",
                      "C"
                    ],
                    "mktg": [
                      "R"
                    ],
                    "ae": [
                      "I",
                      "C"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d251t1-1",
                      "url": "#",
                      "roles": []
                    }
                  ]
                },
                {
                  "id": "d2-5-1-t2",
                  "order": 2,
                  "text": "Confirm customer equipment return process and facilitate with each GlideFast team member",
                  "raci": {
                    "em": [
                      "A",
                      "R"
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
                      "A",
                      "R"
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
                      "A",
                      "R"
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
                      "roles": []
                    }
                  ]
                },
                {
                  "id": "d2-5-1-t6",
                  "order": 6,
                  "text": "EM schedules customer retrospective",
                  "raci": {
                    "em": [
                      "A",
                      "R"
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
                      "A",
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
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d252t1-1",
                      "url": "#",
                      "roles": []
                    }
                  ]
                },
                {
                  "id": "d2-5-2-t2",
                  "order": 2,
                  "text": "Update customer project closure deck (EM)",
                  "raci": {
                    "em": [
                      "A",
                      "R"
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
                      "roles": []
                    }
                  ]
                },
                {
                  "id": "d2-5-2-t3",
                  "order": 3,
                  "text": "EM, BPC, Architect, and TC participate with client",
                  "raci": {
                    "em": [
                      "A",
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
                      "A",
                      "R"
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
                      "A",
                      "R"
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
                      "I",
                      "C"
                    ],
                    "ae": [
                      "I",
                      "C"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d253t1-1",
                      "url": "#",
                      "roles": []
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
                      "I",
                      "C"
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
                      "I",
                      "C"
                    ],
                    "ae": [
                      "I",
                      "C"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d253t3-1",
                      "url": "#",
                      "roles": []
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
                      "roles": []
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
                      "roles": []
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
                      "I",
                      "C"
                    ],
                    "arch": [
                      "I",
                      "C"
                    ],
                    "tc": [
                      "I",
                      "C"
                    ]
                  },
                  "jobAids": [
                    {
                      "id": "ja-d253t6-1",
                      "url": "#",
                      "roles": []
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
                      "I",
                      "C"
                    ],
                    "arch": [
                      "I",
                      "C"
                    ],
                    "tc": [
                      "I",
                      "C"
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
    "IPKT": "Internal Project Kickoff Transition - the handoff of a sold engagement from Sales to Delivery.",
    "RTM": "Requirements Traceability Matrix - maps requirements to stories and tests through delivery.",
    "SOW": "Statement of Work - the contracted scope, deliverables and terms of the engagement.",
    "ROM": "Rough Order of Magnitude - an early, approximate estimate of effort or cost.",
    "UAT": "User Acceptance Testing - customer validation of the built solution against requirements.",
    "GRS": "GlideFast Remote Services - ongoing remote ServiceNow support and delivery engagements, typically leaner than a full Project implementation.",
    "HLD": "High Level Design - the architectural design document for the solution."
  },
  "referenceSections": [
    {
      "key": "raci",
      "title": "How to use RACI",
      "body": "Every task in this methodology assigns each involved job title one or more RACI letters. They answer one question: for this task, what is that person's relationship to the work?\n\nExactly one A per task. Accountability shouldn't be shared - if two people sign off, no one does.\n\nR and A can be the same person (shown together as A R) - they do it and own it.\n\nEvery task needs at least an R and an A - someone doing the work, someone owning the result.\n\nThe customer appears in the RACI wherever the engagement requires their input, approval, or participation."
    },
    {
      "key": "escalation",
      "title": "Escalation Management",
      "body": ""
    }
  ]
};

if (typeof module === 'object' && module.exports) {
  module.exports = DMStandardContent;
}
if (typeof self !== 'undefined') {
  self.DMStandardContent = DMStandardContent;
}
