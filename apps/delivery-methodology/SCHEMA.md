# Delivery Methodology — ServiceNow data-tier schema

Design target for the port off `localStorage` onto real ServiceNow tables. **Table + roles are
declared in `deploy.manifest.js` and emitted by the packager** (`tables[]` → Fluent `Table()`;
prefixed roles + ACLs). Runtime load/save: widget server script
(`js/server/content.server.js` + `js/lib/content-model.js`) hydrates flat `content` rows into the
nested UI payload; `DataService` uses `c.server` on the instance and seed + `localStorage` in the
local harness.

## Shape

**One table, `content`** (full scoped name `x_<scope>_content`). Every entity in the app —
methodology, phase, sub-phase, task, RACI assignment, input, deliverable, comment, participant,
meeting, level-of-effort entry, changelog entry, job aid, job aid's role scoping, job title,
glossary term, reference section — is a row in this one table, distinguished by a `type` field,
linked into a tree by a single self-referencing `parent` column (`cascadeRule: 'cascade'` so
deleting a parent removes descendants).

```
content (self-referencing on `parent`, discriminated by `type`)
  methodology
   └─ phase
       └─ sub_phase
           ├─ input / deliverable / comment
           ├─ participant       (content.job_title → another row, soft ref)
           ├─ meeting           (content.scheduledBy/ledBy → other rows, soft ref)
           ├─ level_of_effort   (content.job_title → another row, soft ref; null = "all")
           ├─ changelog_entry
           └─ task
               ├─ raci          (content.job_title → another row, soft ref)
               └─ job_aid
                   └─ job_aid_role (content.job_title → another row, soft ref)
  job_title / glossary_term / reference_section   (parent: null — lookups + Reference page prose)
```

## Roles

Explicit prefixed role names (same pattern as Glide Studio) — **not** bare `user` / `editor` /
`admin`. Declared in `deploy.manifest.js` and checked with those exact strings in
`content.server.js` (`gs.hasRole('delivery_methodology_editor')`, etc.).

| Role | Page | Edit in tool | Content table write | App metadata write |
|---|---|---|---|---|
| `delivery_methodology_user` | yes | no | no | no |
| `delivery_methodology_editor` | yes | yes | yes | no |
| `delivery_methodology_admin` | yes | yes | yes | yes |

Widget server sets `data.canEdit` from editor/admin roles; local harness defaults to editable.

## The governing constraint — read this before the type table

**A self-referencing table with one `parent` column can express exactly one relationship per row:
the tree parent.** Every entity above that's a genuine hierarchy step uses `parent` for that.

Every entity that's a **join** — associates two things with no hierarchy between them
(`raci`, `participant`, `meeting`'s scheduler/leader, `level_of_effort`'s role, `job_aid_role`) —
already has its one `parent` slot spent on its *actual* container. The **second** thing it needs
to reference — always a `job_title` row — lives inside `content` as a plain id string (soft ref).

## Table: `content`

| Field | Type |
|---|---|
| `type` | Choice — 17 values (see enum below) |
| `parent` | Reference → `content` (self; `null` for the three lookup types); cascade delete |
| `name` | String(150) — used where a real display value exists; unused for pure-join types |
| `order` | Integer — used where a real position exists; unused for pure-join types |
| `content` | JSON — type-specific payload, including any soft references |

## The `type` enum

| `type` | `parent` → | `name` holds | `content` holds |
|---|---|---|---|
| `methodology` | — | short chip name (e.g. Project) | `{ id, title, summary, description, feedbackUrl, feedbackLabel, diagramUrl }` — `summary` is the one-line Methodology subtitle; `description` is multi-paragraph intro prose (`\n\n`-separated); `title` is optional legacy/display heading  (Methodology view uses “About {name}” instead); feedback is a URL (often `mailto:…`); `diagramUrl` is optional illustration |
| `phase` | a `methodology` row | phase name | `{ id }` |
| `sub_phase` | a `phase` row | sub-phase name | `{ id, overview, objective, icon }` |
| `task` | a `sub_phase` row | the task text | `{ id }` |
| `raci` | a `task` row | the letter (`R`/`A`/`C`/`I`) | `{ job_title }` *(soft ref)* |
| `job_aid` | a `task` row | aid title (optional; UI falls back to "Job Aid") | `{ id, url }` |
| `job_aid_role` | a `job_aid` row | — | `{ job_title }` *(soft ref; zero rows = all roles)* |
| `input` | a `sub_phase` row | the input text | `{}` |
| `deliverable` | a `sub_phase` row | the deliverable text | `{}` |
| `comment` | a `sub_phase` row | the comment text | `{}` |
| `participant` | a `sub_phase` row | — | `{ job_title }` *(soft ref)* |
| `meeting` | a `sub_phase` row | meeting title | `{ id, scheduledBy, ledBy, external }` *(soft refs)* |
| `level_of_effort` | a `sub_phase` row | — | `{ job_title, text, billable, optional }` *(`job_title: null` = all)* |
| `changelog_entry` | a `sub_phase` row | — | `{ id, ts, text }` — **no global `read` flag** |
| `job_title` | `null` | full name | `{ id, abbreviation, description, external }` |
| `glossary_term` | `null` | the term | `{ definition }` |
| `reference_section` | `null` | section title | `{ key, body }` — Reference page prose (e.g. How to use RACI, Escalation). Not job aids or glossary terms. |

`sid` (`'1.1'`, `'2.3'`, …) is not stored — derived by walking `parent`/`order`.

## Resolved design decisions

1. **Table name:** `content` (scoped `x_<scope>_content`).
2. **Changelog read state:** per-user via **user preference** `dm.changelog.seen` → JSON map of
   changelog **content.id** values (stable client ids that survive full-replace save; not row
   sys_ids, which change on recreate). Harness uses the same key in localStorage. No ack type; no
   global `content.read`.
3. **Cascade delete:** Fluent `parent` column `cascadeRule: 'cascade'` — platform deletes
   descendants when a parent row is deleted. Soft refs inside JSON are not cascaded.
4. **`icon`:** on `sub_phase` content as `{ overview, objective, icon }`.
5. **Roles:** `delivery_methodology_user` / `_editor` / `_admin` as above.
6. **Type choice values** are short labels (`task`, `raci`, `input`, …) — hierarchy is carried by
   `parent`, not by prefixes on the choice value.

## Decisions made this reconciliation (history)

**A–D.** See git history / earlier drafts. Summary: phases are first-class rows; `sid` is derived;
the design collapsed from 5 tables → 3 → **1** self-referencing `type`-discriminated tree
(Decision D, 2026-07-26). Soft refs in `content` for join-shaped entities are inherent to one
`parent` column.

## Verified against the live seed

Every field in the current seed (`js/services/data.service.js`) has a home in the `type` table
above. Notably: `sub_phase.icon`, `levelOfEffort` `optional`, job title `external`, and
participants (often backfilled client-side from RACI).

## Follow-up (not this pass)

- Optional install-time seed (today: first editor load persists the client seed)

Server load/save follows GlideFast scripting standards: `GlideRecordSecure`, server-side
payload validation, insert-result checks, leveled logging, and best-effort restore after a
failed full replace.

## Packager

`tables[]` + optional `editorRoleName` are implemented in `tools/sn-deployment-packager/` —
see `manifest.schema.md`. First consumer: this app's `deploy.manifest.js`.
