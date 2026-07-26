# Delivery Methodology — ServiceNow data-tier schema

Design target for the eventual port off `localStorage` onto real ServiceNow tables. **Not built
yet** — `js/services/data.service.js` still ships a hardcoded seed + browser `localStorage`, and
that's deliberate until this schema is approved and the tables exist. This file is the single
source of truth for the design; earlier drafts lived only in a plan file and in project memory and
are now superseded by this reconciliation (2026-07-25).

## Why this reconciliation exists

The schema was first designed 2026-07-24, before phase/sub-phase structure editing existed. That
feature shipped 2026-07-25 (`d8bd1ac`) and invalidated one of the earlier design's load-bearing
assumptions (see **A** below). This version re-derives the schema against the app as it actually
stands today, verified against the live seed data, not against memory of an earlier draft.

## Shape

```
methodology ─< phase ─< sub_phase                    sub_phase.participants >─ dl_matcher (job_title)
                          └─ tasks[] (JSON, carries raci + jobAids)
```

**3 net-new custom tables** + one extended OOB table (`dl_matcher`, which doesn't count against a
licensed custom-table count).

## Tables

### 1. `methodology`
| Field | Type |
|---|---|
| name | String(100) |
| order | Integer |
| description | String(255) *(optional — unused by any seeded methodology today)* |

### 2. `phase`
| Field | Type |
|---|---|
| methodology | Reference → `methodology` |
| name | String(100) |
| order | Integer |

Kept as its own table, **not** folded into `sub_phase` as denormalized `phase_name`/`phase_order`
(see **Decision A**).

### 3. `sub_phase`
| Field | Type |
|---|---|
| phase | Reference → `phase` |
| name | String(150) |
| order | Integer |
| overview | String, plain text (large) |
| objective | String, plain text (large) |
| participants | List (`glide_list`) — references `dl_matcher`, filtered to `category = 'job_title'` |
| inputs | JSON — array of strings |
| deliverables | JSON — array of strings |
| comments | JSON — array of strings |
| meetings | JSON — array of `{ id, scheduledBy, ledBy, external }` (`scheduledBy`/`ledBy` are `job_title` sys_ids — **soft references**, not enforced) |
| level_of_effort | JSON — `{ mode: 'all'\|'byRole', all: {text, billable, optional}, roles: { <job_title_id>: {text, billable, optional} } }` |
| changelog | JSON — array of `{ id, ts, text, read }` — **see Open Item 1**, `read` is presently a single global flag with no per-user dimension |
| tasks | JSON — array of `{ id, order, text, raci: { <job_title_id>: ['R','A',...] }, jobAids: [{ id, url, roles }] }` — **see Decision C**, moved here from two separate tables |

No stored `sid` (see **Decision B**) — the widget computes it as `phase.order + '.' + sub_phase.order`.
`sys_updated_on` is OOB and is what drives What's New; no custom "updated on" field needed.

### Extended `dl_matcher` (not a new table — rides the OOB extension)

Discriminated by a `category` field:

| category | Columns used |
|---|---|
| `job_title` | name, abbreviation, description, **external** *(boolean — distinguishes the Customer "job title" from internal delivery-team roles; drives sort-to-end ordering and a dashed/diamond visual treatment throughout the UI — this is a real, actively-read field, not cosmetic-only)* |
| `glossary_term` | term, definition |
| `appendix_content` | key, label, body |

`sub_phase.participants` (List) points here, filtered to `category = 'job_title'` — the one
*enforced* reference to `job_title` in this model. The job_title ids inside `sub_phase.tasks[].raci`
and `.jobAids[].roles`, and inside `meetings[].scheduledBy`/`ledBy`, are **soft references** — plain
strings inside JSON, not FKs — so deleting a `dl_matcher` job_title row silently orphans them with
nothing to stop it (see **Decision C**, and the new item in **Open items**).

**Unverified:** the real `dl_matcher` schema and extension mechanics on the target instance have
not been inspected. Column names above are illustrative until checked in Studio (see
**Open item 3**) — confirmed absent from ServiceNow's own documentation too (zero hits across the
full `ServiceNowDocs` corpus, `zurich` branch), so this genuinely can't be settled from docs alone.

**Why `methodology` and `phase` don't ride `dl_matcher` too, even though they're small (2 and 8
rows).** Row count isn't the qualifying test — graph position and write pattern are: a `dl_matcher`
candidate is a *leaf* (referenced but referencing nothing) that the app only *reads*. `job_title` /
`glossary_term` / `appendix_content` are exactly that. `methodology` and `phase` aren't, and the gap
between them is real: `methodology` has **zero** write operations in
`js/controllers/main.controller.js` (`switchMethodology` only sets a local id), while `phase` has
**four** (`addPhase`/`renamePhase`/`movePhase`/`deletePhase`, all shipped alongside structure
editing) — so they aren't the same case, and `methodology`-only was considered and declined too, to
keep the decision uniform. Staying at 3 custom tables keeps referential integrity structural (a
`Reference → phase` column can't hold a glossary term; a `dl_matcher` reference could, silently),
avoids a self-reference (`phase → methodology` inside the same OOB table), avoids depending on
unverified cross-scope create/update/delete access to an OOB table, and keeps the cascade-delete
question (Open Item 2) inside our own tables rather than needing a Business Rule reaching into one
we don't own.

**The table-vs-JSON rule.** The `dl_matcher` test above is one instance of a rule the whole model
follows: **every table is a reference target; everything that isn't a reference target is JSON.**
Check it against the schema above — the reference targets are exactly `methodology`, `phase`,
`sub_phase`, `dl_matcher`, which is precisely the table list. Every JSON field passes the inverse:
nothing references `inputs`, `deliverables`, `comments`, `meetings`, `level_of_effort`, `changelog`,
or `tasks` — see **Decision C**, which is the reversal that made this true. (An earlier version of
this rule, and of this schema, kept `methodology_task`/`task_raci` as tables *because* `task_raci`
referenced `methodology_task` — the rule held then too; it's the referencing that changed, not the
rule.)

**Field types are the platform's real native types, not workarounds.** Verified against
ServiceNow's Table/Column SDK reference (`servicenow-sdk/table-api-now-ts.md`) and the platform
field-type reference (`platform-administration/r_FieldTypes.md`, `zurich` branch): ServiceNow has a
native `json` field type (Fluent: `JsonColumn`), so every JSON field on `sub_phase` above is a real
typed column, not a large-string stand-in. Every `Reference →` column maps to `ReferenceColumn`, and
`phase`/`sub_phase` themselves to `Table()` with a `schema` array of `Column` objects (`Table` →
`sys_db_object`, `Column` → `sys_dictionary`, confirmed from the same reference). One property
genuinely still unverified: `ReferenceColumn`'s exact target-table property name isn't documented in
that reference page — it points to `github.com/ServiceNow/sdk-examples` as the canonical source,
which requires authenticated GitHub code search to check properly. Flagged, not guessed. (A `Choice`
column / `sys_choice` rows are no longer needed anywhere in this model — that was `task_raci`'s
`designation` field, and `task_raci` is gone; see Decision C. One fewer platform record type to
worry about.)

**`participants` upgraded from JSON to a native List field, caught by asking "isn't this just a
list collector?"** ("List Collector" itself is a Service Catalog variable type, not a base table
field — the actual match is `glide_list`, platform label "List", confirmed in the same field-type
reference; Fluent: `ListColumn`.) It's a genuine improvement, not a wash: `participants` is the
*only* array field on `sub_phase` that's a bare list of `job_title` references with nothing else
attached (`vm.toggleParticipant`/`vm.participantOn`, `main.controller.js:311-315` — push/splice/
indexOf against a flat id array, no per-item data) — every other array field (`inputs`,
`deliverables`, `comments`, `meetings`, `changelog`) holds strings or structured objects and
genuinely needs JSON. A List field gets native multi-value reference semantics instead of an
opaque blob, including queryability the JSON version didn't have (`addQuery('participants',
'CONTAINS', jobTitleId)`, the same mechanism Incident's Watch List uses). Same unverified caveat
as `ReferenceColumn` above: `ListColumn`'s own properties (how it's scoped to a target table) aren't
spelled out in the reference page either.

## Decisions made this reconciliation

**A. `phase` restored as its own table.** The prior draft folded Phase into `sub_phase` as
denormalized `phase_name`/`phase_order`, reasoning that "Phase has no fields or behavior of its own
beyond grouping and order." Structure editing (`d8bd1ac`) made that false: `addPhase()` can create
a phase with zero sub-phases (denormalization can't represent an empty phase — there's no row to
carry it, and the app has explicit crash guards for exactly this state); `renamePhase()`/
`movePhase()` are single-field operations against a real row instead of bulk rewrites across every
sub-phase in the phase; and the RACI grid's phase filter (`rgActivePhases`) was changed *this
session* from name-keyed to id-keyed specifically because a name isn't stable identity — renaming
silently reset the filter, and two same-named phases collapsed into one chip. A denormalized
`phase_name` reintroduces that exact bug.

**B. `sid` is derived, not stored.** `recomputeSids()` (added alongside structure editing) computes
`sid` from array position on every structural mutation, replacing hand-authored sids that used to
drift on insert/delete/reorder. With `phase` restored as a table, `sid` is exactly
`phase.order + '.' + sub_phase.order` — computing it in the widget avoids reintroducing the drift
that was just eliminated in the app layer.

**C. `methodology_task` and `task_raci` folded into `sub_phase.tasks` (JSON) — 5 tables → 3.** An
earlier version of this schema kept both as tables, on the grounds that `task_raci` should stay
relational so `addQuery('job_title', X)` — the query behind By Role — works natively, and that
`task_raci.task` needing a referent meant `methodology_task` had to be a table too. Reopened by
asking directly: if `inputs`/`deliverables`/`comments`/`meetings` aren't tables, why is `tasks`? The
honest answer was "only because RACI is relational" — that was a choice, not a structural necessity,
and the schema is more internally consistent without it.

This is a genuine trade, made deliberately, not a free simplification:
- **Gained:** the table-vs-JSON rule now applies with zero exceptions instead of one; `tasks` maps
  1:1 onto the app's own live JS shape (`sub_phase.tasks[]`, confirmed in **Verified against the
  live seed** below) with no table/JSON impedance mismatch at all; deleting a sub_phase now discards
  its tasks and RACI as part of one JSON field, not a multi-level cascade (see **Structure-editing
  operations**, and Open Item 2 below is narrower as a result); one fewer platform record type
  (`sys_choice`, previously needed for `task_raci.designation`).
- **Given up:** `task_raci.addQuery('job_title', X)` — By Role becomes a full scan of `sub_phase`
  rows with a client-side JSON filter instead of a native GlideRecord query (see **Read paths**
  below; cheap at this app's actual volume, not free at any volume). No native reporting or list
  views on RACI from outside the widget. Referential integrity from a task's RACI back to
  `job_title` is gone — those ids are now soft references inside JSON, same as `meetings[].
  scheduledBy`/`ledBy` already were, so deleting a `dl_matcher` job_title row can silently orphan
  RACI letters with nothing to stop it (a new, explicitly accepted instance of the same orphan
  pattern the app already handles in-code for `taskRoleOrphan`/`loeRoleOrphan`/
  `meetingPersonOrphan`).
- **The deciding question, stated plainly:** does RACI need to be queryable by ServiceNow itself, or
  only by this widget? Decided: **widget only.** If that changes — a future integration or
  Performance Analytics dashboard needs to report on RACI directly — `task_raci` (and the
  `methodology_task` row it requires) can come back; nothing else in this schema depends on RACI
  staying JSON.

## Open items — need your input before tables are built

1. **Per-user read state for What's New.** Today `changelog[].read` is one global boolean per
   entry — the first person to open a sub-phase on a shared instance clears the badge for everyone.
   Three ways to resolve, not yet picked:
   - *(a)* Accept it — global read state, feature quietly degrades on a multi-user instance.
   - *(b)* Add a 4th table, `sub_phase_ack` (user, sub_phase, entry_id, read_on) — correct, costs
     one more table.
   - *(c)* A per-user "last viewed" timestamp per sub-phase, compared against entry dates — no
     per-entry granularity, but doesn't need a new table if it rides `dl_matcher` or a user
     preference record.
2. **Cascade delete — narrower since Decision C.** `deletePhase()` removes a phase and every
   sub_phase row under it; `deleteSubPhase()` now removes just one row (tasks and RACI go with it
   automatically, being JSON on that same row — no separate cascade level needed there anymore).
   GlideRecord does not cascade-delete children automatically, so the phase→sub_phase step still
   needs either the reference field's cascade-delete behavior configured, or a `before delete`
   Business Rule. Not yet decided which.
3. **`dl_matcher` check in Studio.** Confirm real field names and what "extend" means in this org's
   setup before the column mapping above is final.
4. **Does the standalone prototype survive the port?** Once data lives in tables,
   `delivery-methodology.html` has no data tier of its own and the dual-maintenance rule (every
   change mirrored into both files) can't hold. Retire it at that point, or keep it as a frozen
   design sandbox?

## Verified against the live seed

Every field in the current `DEFAULT_DATA` (`js/services/data.service.js`) round-trips into this
shape with no orphaned fields — checked by enumerating every key actually present, not assumed:

`methodology {id, name, order, phases}` · `phase {id, name, order, subPhases}` ·
`sub_phase {id, sid, name, order, changelog, overview, objective, participants, comments, inputs,
deliverables, tasks, meetings, levelOfEffort}` · `task {id, order, text, raci, jobAids}` ·
`jobAids[] {id, url, roles}` · `meetings[] {id, scheduledBy, ledBy, external}` ·
`changelog[] {id, ts, text, read}` · `levelOfEffort {mode, all, roles}` (each entry:
`{text, billable, optional}`) · `jobTitle {id, name, abbr, description, external}`.

Two fields this check caught that an earlier pass would have missed: `levelOfEffort` entries carry
an `optional` boolean alongside `text`/`billable` (documented above), and job titles carry
`external` (also documented above, in the `dl_matcher` table) — both are read throughout
`main.controller.js`, not incidental. A third thing worth naming: `sub_phase.tasks` in this schema
is now *exactly* `m.phases[].subPhases[].tasks[]` in the live JS shape — Decision C didn't just
remove two tables, it removed the last place this schema translated the app's own data shape into
something else.

## Volume — row counts, plus per-row JSON payload size (measured, not estimated)

| | Today | Projected, all sub-phases authored |
|---|---|---|
| methodologies / phases / sub-phases (real rows) | 2 / 8 / 26 (6 written, 20 stub) | 2 / 8 / 26 |
| `dl_matcher` | 13 job titles + 7 glossary terms | + appendix entries |

Row counts are trivial across the board now — there's no `methodology_task`/`task_raci` row count
to worry about, because tasks live inside each `sub_phase` row's own `tasks` JSON field instead.
What matters now is **payload size per row**, not row count, since editing one task rewrites the
whole field:

| | Today (heaviest sub_phase row) |
|---|---|
| Tasks in one `tasks` field | 4 (`Pre-Workshop Planning`) |
| RACI letters in one `tasks` field | 20 (`Pre-Workshop Planning`) |
| `tasks` field size | 724 bytes |

Even scaling the busiest row up several-fold as the remaining 20 stub sub-phases get authored, this
stays low single-digit KB per row — trivial for a JSON field (ServiceNow JSON fields routinely carry
form layouts and widget configs an order of magnitude larger). The one thing this *does* introduce
that row-per-task never had: two people editing **different tasks in the same sub-phase** at the
same time now race on one field, last-write-wins, rather than touching different rows. Narrower
blast radius than the single-table-per-app JSON design rejected earlier in this schema's history,
but a real, new consideration — not previously true when `methodology_task` was its own table.

## Read paths this schema needs to keep cheap

- **By Role — the one read path Decision C made more expensive, stated plainly.** No more
  `task_raci.addQuery('job_title', X)`. Now: read every `sub_phase` row (26 today, structurally
  bounded — nothing makes this grow past "sub-phases in the methodology"), parse each `tasks` JSON
  field, filter tasks where `raci[jobTitleId]` exists. A full scan-and-parse, not a native query —
  fine at this app's actual volume (worst case ~69 tasks total once fully authored), **not** fine at
  arbitrary volume, and gone as a capability for anything outside this widget (no report or list
  view can filter on RACI directly anymore). This is the concrete cost named in Decision C, not a
  new finding.
- **What's New** — order sub_phases by `sys_updated_on` (OOB, indexed), then parse each matched
  row's `changelog` JSON for entry text. Cheap as long as the *filter* (unread-only) doesn't need
  the per-user dimension Open Item 1 hasn't resolved yet — under option (a) it's a single boolean
  check per entry; under (b) it's a join against `sub_phase_ack`.
- **Reference job-aid index** — `job_aids` was already JSON before Decision C (now nested one level
  deeper, inside `tasks[].jobAids`, same as the live app's own shape) — building the index means
  reading every `sub_phase` row and parsing its `tasks` JSON client-side; there's no native query for
  "every job aid across the tree." Fine at ~69 tasks projected; unaffected by Decision C since it
  was never relational to begin with.

## Structure-editing operations against this schema

(`vm.addPhase`/`renamePhase`/`movePhase`/`deletePhase` and the sub-phase equivalents,
`js/controllers/main.controller.js`)

- **Add** — one `insert` (phase or sub_phase row).
- **Rename** — one field update on one row. This is the specific win over the folded design.
- **Reorder** — the app only supports adjacent up/down swaps (no arbitrary drag-to-position), so
  this is an `order` update on the two swapped rows, not a full-table shift.
- **Delete** — one `delete`. Deleting a sub_phase no longer cascades anywhere (its tasks and RACI go
  with it automatically, being JSON on that same row); deleting a phase still cascades to its
  sub_phase rows (Open Item 2).
