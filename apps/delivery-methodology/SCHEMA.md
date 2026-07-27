# Delivery Methodology — ServiceNow data-tier schema

Design target for the eventual port off `localStorage` onto real ServiceNow tables. **Not built
yet** — `js/services/data.service.js` still ships a hardcoded seed + browser `localStorage`, and
that's deliberate until this schema is approved and the table exists. This file is the single
source of truth for the design; earlier drafts lived only in a plan file and in project memory and
are now superseded by this reconciliation (2026-07-25/26).

## Why this reconciliation exists

The schema went through three distinct shapes in two days: 5 tables (2026-07-24, before structure
editing existed) → 3 tables (2026-07-26, RACI folded into JSON on `sub_phase` — Decision C) → **1
table** (2026-07-26, this version — every entity, including the lookup content that used to ride
`dl_matcher`, folded into one self-referencing tree — Decision D). Each step is kept in **Decisions
made this reconciliation** below rather than erased, because the reasoning at each step is what
justifies the next one.

## Shape

**One table, `methodology_content`** *(name still open — see the note at the end of this file;
everything below uses this name as a placeholder)*. Every entity in the app — methodology, phase,
sub-phase, task, RACI assignment, input, deliverable, comment, participant, meeting, level-of-effort
entry, changelog entry, job aid, job aid's role scoping, job title, glossary term, appendix
content — is a row in this one table, distinguished by a `type` field, linked into a tree by a
single self-referencing `parent` column.

```
methodology_content (self-referencing on `parent`, discriminated by `type`)
  methodology
   └─ phase
       └─ sub_phase
           ├─ sub_phase_input / sub_phase_deliverable / sub_phase_comment
           ├─ sub_phase_participant  (content.job_title → another row, soft ref)
           ├─ sub_phase_meeting      (content.scheduledBy/ledBy → other rows, soft ref)
           ├─ sub_phase_loe          (content.job_title → another row, soft ref; null = "all")
           ├─ sub_phase_changelog
           └─ methodology_task
               ├─ task_raci          (content.job_title → another row, soft ref)
               └─ task_job_aid
                   └─ task_job_aid_role (content.job_title → another row, soft ref)
  job_title / glossary_term / appendix_content   (parent: null — cross-cutting lookup content,
                                                    formerly on dl_matcher, now just more rows here)
```

## The governing constraint — read this before the type table

**A self-referencing table with one `parent` column can express exactly one relationship per row:
the tree parent.** Every entity above that's a genuine hierarchy step (`phase` under `methodology`,
`sub_phase` under `phase`, `methodology_task` under `sub_phase`, `task_job_aid` under
`methodology_task`) uses `parent` for that and gets a real, enforceable, native-query relationship.

Every entity that's a **join** — associates two things with no hierarchy between them
(`task_raci`, `sub_phase_participant`, `sub_phase_meeting`'s scheduler/leader, `sub_phase_loe`'s
role, `task_job_aid_role`) — already has its one `parent` slot spent on its *actual* container (the
task, the sub-phase, the job aid). The **second** thing it needs to reference — always a
`job_title` row — has nowhere to go but inside `content`, as a plain id string. Not a foreign key.
Not enforced. Adding more `type` values doesn't fix this; it's inherent to having one parent column,
not a gap in the enum. This is the same soft-reference pattern `meetings[].scheduledBy`/`ledBy`
already used one schema version ago — it's now the rule for every join-shaped entity, not an
exception for one field.

## Table: `methodology_content`

| Field | Type |
|---|---|
| `type` | Choice — see the full enum below (17 values, 18 if Open Item 1 resolves to option *b*) |
| `parent` | Reference → `methodology_content` (self; `null` for the three lookup types) |
| `name` | String(150) — used where a real display value exists; `null`/unused for pure-join types |
| `order` | Integer — used where a real position exists; `null`/unused for pure-join types |
| `content` | JSON — type-specific payload, including any soft references |

## The `type` enum — every entity, one table

| `type` | `parent` → | `name` holds | `content` holds |
|---|---|---|---|
| `methodology` | — | methodology name | `{ description }` |
| `phase` | a `methodology` row | phase name | `{}` |
| `sub_phase` | a `phase` row | sub-phase name | `{ overview, objective }` |
| `methodology_task` | a `sub_phase` row | the task text | `{}` |
| `task_raci` | a `methodology_task` row | the letter (`R`/`A`/`C`/`I`) | `{ job_title }` *(soft ref — one row per task×job_title×letter, same granularity the earlier `task_raci` table used)* |
| `task_job_aid` | a `methodology_task` row | — *(no label field today)* | `{ url }` |
| `task_job_aid_role` | a `task_job_aid` row | — | `{ job_title }` *(soft ref; zero rows for a given job aid = "applies to every role," same as today's empty array)* |
| `sub_phase_input` | a `sub_phase` row | the input text | `{}` |
| `sub_phase_deliverable` | a `sub_phase` row | the deliverable text | `{}` |
| `sub_phase_comment` | a `sub_phase` row | the comment text | `{}` |
| `sub_phase_participant` | a `sub_phase` row | — | `{ job_title }` *(soft ref — pure join, no attributes of its own)* |
| `sub_phase_meeting` | a `sub_phase` row | — *(no name field today)* | `{ scheduledBy, ledBy, external }` *(both soft refs)* |
| `sub_phase_loe` | a `sub_phase` row | — | `{ job_title, text, billable, optional }` *(`job_title: null` = "all participants" mode — inferable, no separate mode field needed)* |
| `sub_phase_changelog` | a `sub_phase` row | — | `{ ts, text, read }` — **see Open Item 1**, `read` is still a single global flag |
| `job_title` | `null` | full name | `{ abbreviation, description, external }` |
| `glossary_term` | `null` | the term | `{ definition }` |
| `appendix_content` | `null` | label | `{ key, body }` |
| `sub_phase_changelog_ack` *(only if Open Item 1 resolves to option b)* | a `sub_phase_changelog` row | — | `{ user, read_on }` *(soft ref to `sys_user` — same second-reference limit as everything else above)* |

`sid` (`'1.1'`, `'2.3'`, …) still isn't stored — computed by walking `parent` up to the `phase` row
and its own `parent` up to the `methodology` row, using each level's `order`. One extra hop of
indirection versus the 3-table version (which had a typed `phase` reference to dot-walk directly),
but the same computation.

## Decisions made this reconciliation

**A. `phase` restored as its own identity (originally: its own table).** The very first draft
folded Phase into `sub_phase` as denormalized `phase_name`/`phase_order`, reasoning that "Phase has
no fields or behavior of its own beyond grouping and order." Structure editing (`d8bd1ac`) made that
false: `addPhase()` can create a phase with zero sub-phases (denormalization can't represent an
empty phase at all); `renamePhase()`/`movePhase()` need to be single-field operations, not bulk
rewrites; and the RACI grid's phase filter (`rgActivePhases`) had to move from name-keyed to
id-keyed specifically because a name isn't stable identity. All of that reasoning is exactly why
`phase` is still its own `type` value with its own row identity now, even though it's no longer its
own *table*.

**B. `sid` is derived, not stored.** `recomputeSids()` (added alongside structure editing) computes
`sid` from position on every structural mutation, replacing hand-authored sids that used to drift.
Still true here — see the note above the enum table.

**C. `methodology_task`/`task_raci` folded into `sub_phase.tasks` JSON — 5 tables → 3 *(superseded
by Decision D below — kept for the reasoning trail, not as the current design)*.** Reopened by
asking: if `inputs`/`deliverables`/`comments`/`meetings` aren't tables, why is `tasks`? The honest
answer was "only because RACI is relational," which was a choice, not a necessity. That question is
also exactly what led to Decision D — the same "why is X special" logic, run one more time against
every remaining table.

**D. Every remaining table folded into one, `type`-discriminated, self-referencing table — 3 tables
→ 1.** Asked directly: extend the same collapsing logic to *every* table a fully-relational design
would have built (the 17-table analysis from earlier in this schema's history), not just the ones
already folded. Answer: yes, all of it, including `dl_matcher`'s three lookup types — they were only
ever separated out because `dl_matcher` doesn't count against a licensed custom-table limit, and
that benefit stops mattering once the whole app is one table regardless.

This is the largest trade in this schema's history, and it cuts in more directions than Decision C
did:

- **Gained:** one table to build, one table to secure/ACL, one place to look. `dl_matcher` and its
  entire unverified-extension risk (Open Item 3, below) disappear — nothing rides an OOB table
  anymore. `task_job_aid` becoming its own row (rather than nested JSON) actually makes the
  Reference job-aid index *more* natively queryable than the 3-table version had it (see **Read
  paths**) — a genuine, if incidental, improvement.
- **Given up, restored, then given up again:** `participants` has now changed representation three
  times in two days — JSON array → native `List`/`glide_list` field (for `addQuery(...,
  'CONTAINS', ...)`) → back to JSON-soft-reference, now as its own `sub_phase_participant` row
  instead of an array entry. Worth being honest that this oscillation happened, not just showing
  the final state.
- **Cascade delete gets deeper, not shallower.** Decision C's benefit — deleting a sub-phase
  discarding its tasks and RACI "for free" as one JSON field — is **gone**. Every entity is a real
  row with a real `parent` pointer again, so deleting a `methodology` row now means walking and
  deleting every descendant row across up to 6 levels (methodology → phase → sub_phase →
  methodology_task → task_raci / task_job_aid → task_job_aid_role), the deepest cascade this schema
  has had at any point (see Open Item 2, updated below).
- **RACI's native query is still gone, and this does NOT bring it back.** `type='task_raci'` is a
  real, indexed, native filter — an improvement over scanning every `sub_phase` row's JSON blob one
  level up. But matching *which* job title still means reading those rows and checking
  `content.job_title` in script, not a native reference-field query — the same fundamental
  limitation Decision C accepted, just relocated. Whether ServiceNow's JSON field type supports any
  server-side filtering into a JSON value at all (as opposed to whole-field equality) is genuinely
  unverified — flagged, not assumed, consistent with how `ReferenceColumn`'s target-table property
  was flagged earlier rather than guessed.
- **The deciding question, extended:** Decision C asked whether RACI needs platform-level query
  capability. This decision asks the same question about *everything else* — do inputs, meetings,
  participants, job aids, or lookup content need to be independently queryable/reportable by
  ServiceNow, or does only this widget ever read them? Decided: **widget only, for all of it.**
  Every one of these can become its own table again later without touching anything else in this
  design — the tree still shows exactly what would need to split out and why.

## Open items — need your input before this table is built

1. **Per-user read state for What's New.** Unchanged problem: `content.read` on a
   `sub_phase_changelog` row is one global flag, so the first person to open a sub-phase clears the
   badge for everyone. Options unchanged in substance, only the mechanics shifted: *(a)* accept it;
   *(b)* a `sub_phase_changelog_ack` **type** row (user + read_on, soft-referencing `sys_user` —
   listed in the enum above, contingent on picking this option) rather than a whole 4th table;
   *(c)* a per-user last-viewed timestamp, ridable on a user preference record. Not yet picked.
2. **Cascade delete — now the deepest it's been, reversing Decision C's improvement.** Deleting a
   `methodology`, `phase`, or `sub_phase` row needs every descendant row deleted too, across up to
   6 levels (see Decision D). GlideRecord does not cascade automatically. This most likely needs a
   recursive `before delete` Business Rule (walk `parent` down, delete bottom-up) rather than
   per-field cascade config, since the tree depth is now dynamic and unbounded by table structure.
   Not yet decided, and now the single biggest implementation risk in this schema.
3. ~~`dl_matcher` check in Studio~~ — **resolved by Decision D.** Nothing rides `dl_matcher`
   anymore; `job_title`/`glossary_term`/`appendix_content` are just more `type` rows on this same
   table. No Studio check needed.
4. **Does the standalone prototype survive the port?** Unchanged by this decision.
5. **Table name.** `methodology_content` no longer only holds methodology content — it holds job
   titles and glossary terms too. Kept as a placeholder name throughout this file; a more general
   name may fit better. Not yet decided — flagged again at the end of this file.

## Verified against the live seed

Every field in the current `DEFAULT_DATA` (`js/services/data.service.js`) has a home in the `type`
table above, checked by enumerating every key actually present, not assumed — the same check run at
every prior version of this schema, repeated here because the shape changed again:

`methodology {id, name, order, phases}` · `phase {id, name, order, subPhases}` ·
`sub_phase {id, sid, name, order, changelog, overview, objective, participants, comments, inputs,
deliverables, tasks, meetings, levelOfEffort}` · `task {id, order, text, raci, jobAids}` ·
`jobAids[] {id, url, roles}` · `meetings[] {id, scheduledBy, ledBy, external}` ·
`changelog[] {id, ts, text, read}` · `levelOfEffort {mode, all, roles}` (each entry:
`{text, billable, optional}`) · `jobTitle {id, name, abbr, description, external}`.

Two fields caught early that are easy to miss on a quick read and are still real here:
`levelOfEffort` entries carry an `optional` boolean alongside `text`/`billable`, and job titles
carry `external` (drives sort-to-end + dashed/diamond styling throughout the UI, not cosmetic) —
both land in `content` for their respective types above.

**One thing this version genuinely lost versus the immediately prior one:** `sub_phase.tasks` used
to map exactly 1:1 onto the app's own live JS shape (`sub_phase.tasks[]`) with zero translation. That
stops being true here — the live JS shape still nests tasks inside their sub-phase as an array;
this schema instead makes each task its own row, linked by `parent`. Whichever host script reads
this table back into the app's in-memory shape has to reconstruct that nesting by walking `parent`
chains and grouping by `type`, work the 3-table version didn't need. Worth naming since "closer to
the app's real shape" was one of Decision C's stated benefits, and this reverses it.

**`sub_phase_participant` needs one caveat the raw seed doesn't show.** Counting `participants`
directly against `DEFAULT_DATA` gives **0** — the raw seed never stores it. `participants` is
populated only at runtime, client-side, by `backfillParticipants()`/`deriveParticipantIdsFromTasks()`
(`main.controller.js:189-211`), which derives a roster from whichever job titles already carry a
RACI letter on some task in that sub-phase. The volume table below uses the *backfilled* count, not
the raw-seed count, since the raw-seed number would understate this table's real row count.

## Volume — every entity is a real row again (measured, not estimated)

| `type` | Today | Projected, all 26 sub-phases authored |
|---|---|---|
| `methodology` | 2 | 2 |
| `phase` | 8 | 8 |
| `sub_phase` | 26 | 26 |
| `methodology_task` | 16 | ~69 |
| `task_raci` | 86 | ~373 |
| `sub_phase_input` | 17 | ~74 |
| `sub_phase_deliverable` | 19 | ~82 |
| `sub_phase_comment` | 4 | ~17 |
| `sub_phase_participant` | 28 *(backfilled — see caveat above, not the raw-seed 0)* | ~121 |
| `sub_phase_meeting` | 4 | ~17 |
| `sub_phase_loe` | 16 | ~69 |
| `sub_phase_changelog` | 3 | ~13 *(roughest estimate here — changelog is activity-driven, not content-depth-driven, so this scaling is weaker than the others)* |
| `task_job_aid` | 8 | ~35 |
| `task_job_aid_role` | 1 | ~4 |
| `job_title` | 13 | 13 *(fixed — reference content, not authoring-depth-dependent)* |
| `glossary_term` | 7 | 7 *(fixed)* |
| **Total** | **~258** | **~930** |

Both numbers are trivial for a single ServiceNow table — this isn't a volume concern at any point on
this path. What changed is *what* the number represents: Decision C's version measured JSON payload
bytes per `sub_phase` row; this version is back to counting real rows, because every entity is one
again. Projections beyond `methodology_task`/`task_raci` (which already had a measured ratio from
Decision C) are scaled by the same 26÷6 sub-phases-written ratio and are rougher as a result — they
describe order of magnitude, not a precise projection.

## Read paths this schema needs to keep cheap

- **By Role — still not a native query, mechanics changed.** `type='task_raci'` is a real, indexed
  filter (an improvement over scanning every `sub_phase` row's nested JSON one level up). Matching
  a specific job title within those rows still means reading `content.job_title` in script for each
  matched row, not a native reference-field query — see Decision D. Whether ServiceNow's JSON field
  type supports genuine server-side filtering on a nested key (as opposed to reading the whole field
  and checking client/script-side) is **unverified** — flagged rather than assumed either way.
- **What's New** — unchanged in kind: order `sub_phase` rows by `sys_updated_on` (OOB, indexed),
  read matched rows' `sub_phase_changelog` children (now real child rows via `parent`, not a nested
  JSON array) for entry text. The *filter* (unread-only) still depends on Open Item 1.
- **Reference job-aid index — genuinely improved by Decision D.** `task_job_aid` is now its own row
  with a real `parent` chain up through `methodology_task` → `sub_phase` → `phase` → `methodology`,
  so building the index is a native query (`type='task_job_aid'`) with a dot-walkable path back to
  full context, instead of reading every task's nested JSON client-side. The one thing still not
  native: which roles a job aid is scoped to (`task_job_aid_role`'s `content.job_title` is a soft
  reference, same limitation as everything else joined).

## Structure-editing operations against this schema

(`vm.addPhase`/`renamePhase`/`movePhase`/`deletePhase` and the sub-phase equivalents,
`js/controllers/main.controller.js`)

- **Add** — one `insert` (any `type`, with the right `parent`).
- **Rename** — one field update on one row.
- **Reorder** — the app only supports adjacent up/down swaps, so an `order` update on the two
  swapped rows.
- **Delete — the operation Decision D made most expensive.** Deleting a `phase` or `sub_phase` row
  now requires deleting every descendant row across however many levels sit beneath it (see Open
  Item 2) — the opposite of Decision C's "tasks and RACI go with the row for free," which depended
  on them being JSON on that same row rather than separate rows again.

---

**Still unresolved, flagging once more since it wasn't answered:** does `methodology_content` stay
the table's name now that it holds job titles, glossary terms, and appendix content alongside the
methodology tree itself? A name like `gf_content` (or similar) might read more honestly, since
"methodology" is no longer the whole scope of what the table holds. Every reference in this file
uses `methodology_content` as a placeholder pending that call.
