# Spec: table + record emission in the SN Deployment Packager

**Status:** design proposal, not implemented. Handoff to a chat scoped to
`tools/sn-deployment-packager/` — this app's own chat is scoped to `apps/delivery-methodology/` and
does not edit the packager. Written 2026-07-26, against the packager as it stood after its
`tools/packager/` → `tools/sn-deployment-packager/` rename that same day.

## Why this exists

`apps/delivery-methodology/SCHEMA.md` designs 3 ServiceNow tables for this app's eventual data
tier (revised down from 5, 2026-07-26 — RACI moved from a relational table into JSON on
`sub_phase`; see `SCHEMA.md` Decision C). The packager (`tools/sn-deployment-packager/`) has no way
to emit a table today — its shared record model only knows about portal/widget/security records.
This spec designs the extension, using this app's own 3 tables as the worked example, so the
packager owner has a concrete first consumer rather than a hypothetical one. The extension itself
(a `tables[]` manifest key, structural per-emitter rendering) is unaffected by which or how many
tables this particular app ends up declaring.

## What the packager does today (verified against the code)

`core.js`'s `buildRecordModel(manifest, parts)` emits a fixed, ordered array of records — always
exactly these tables, regardless of app: `sys_app`, `sp_theme`, `sp_page`, `sp_container`,
`sp_row`, `sp_column`, N × `sp_angular_provider`, `sp_widget`, `sp_instance`, `sp_portal`, and
(when `features.roles`) 2 × `sys_user_role`, 2 × `sys_user_group`, 2 × `sys_group_has_role`,
8 × `sys_security_acl`, 8 × `sys_security_acl_role`. There is no manifest key that adds to this set.

Both emitters walk that same ordered array:

- **XML** (`assembleXml` → `renderXmlRecord`) is fully generic:
  `'<' + rec.table + ' action="INSERT_OR_UPDATE">'`, then one child tag per field
  (`cdata`-wrapped or self-closed per the field's own markers). It would emit any table
  `buildRecordModel` handed it — the constraint is entirely upstream.
- **Fluent** (`assembleFluent`, `fluent.js`) special-cases exactly two record types —
  `sp_widget` and `sp_angular_provider` — because those have first-class typed SDK APIs whose
  field names differ from the XML/dictionary names (`client_script`→`clientScript`,
  `css`→`customCss`, etc.) and whose long bodies externalize to `Now.include()` files.
  **Everything else — 12 of the 15 record types above — already goes through the generic**
  `Record({ $id, table, data })` **API**, grouped into a file by table (page/portal/role
  buckets). `sys_app` is skipped entirely (its identity lives in `now.config.json`).

sys_id derivation: `stableSysId(sysIdPrefix, seed) = sysIdPrefix + 8-hex-digit-hash(seed) +
'00112233'`. `deriveSysIds(manifest)` calls this with fixed seeds — `'app'`, `'theme'`, `'portal'`,
`'page'`, `'container'`, `'row'`, `'column'`, `'widget'`, `'instance'`, and (if `features.roles`)
`'user_role'`, `'admin_role'`, `'user_group'`, `'admin_group'`. **`'column'` is already taken** (it
seeds `sp_column`, the Service Portal layout column, not a database column) — any new seed for a
dictionary/table-definition record must not collide with it or the others above. `build.js`
cross-checks the final id list and throws `'Duplicate sys_id(s) generated: ' + ids.join(', ')` if
anything collides — the safety net already exists, seeds just need to be chosen to not need it.

## Findings from ServiceNow's own documentation

Verified against `github.com/ServiceNow/ServiceNowDocs`, branch `zurich` (docs are branched per
release family, not on `main` — `main` holds only the repo's own README/index). Exact paths cited
so a future reader can re-check without re-searching.

**1. Fluent has two APIs that matter here, and tables have the more specific one.**

- `Record({ $id, table, data })` — per its own doc,
  *"defines records in any table. Use the Record API to define application metadata that doesn't
  have a dedicated ServiceNow Fluent API."*
  (`markdown/application-development/servicenow-sdk/record-api-now-ts.md`)
- `Table({ name, schema, extends, label, ... })` — *"Create a table [sys_db_object] in an
  application. From the schema property, add Column objects... to define the columns."* Its
  `schema` is an array of `Column` objects: *"Add a column [sys_dictionary] to a table."* Column
  objects are named `<Type>Column` — the supported list includes `StringColumn`, `IntegerColumn`,
  `ReferenceColumn`, `ChoiceColumn`, `JsonColumn`, `MultiLineTextColumn`, among ~35 others.
  (`markdown/application-development/servicenow-sdk/table-api-now-ts.md`)

Tables **do** have a dedicated Fluent API — which is exactly the case the Record API's own doc
says NOT to use it for. **This is the one thing that breaks the packager's "one shared record
model, two thin emitters" pattern**: every record type it handles today is the same shape at the
same abstraction level for both targets (a flat `{table, fields}`). A table is not — XML wants it
**record-shaped** (`sys_db_object` + N × `sys_dictionary` rows), Fluent wants it **schema-shaped**
(one `Table()` call with a nested `schema` array). Flattening a table into records upstream (so
both emitters see the same shape, matching every other record type) would serve XML fine but leave
Fluent reverse-engineering a `Table()`/`Column[]` declaration back out of scattered rows — exactly
backwards from how Fluent's typed branches already work (they take the flat model and re-shape
it *into* their own type, not the other way around). Tables need to be declared structurally in the
manifest and rendered natively by each emitter — the same principle that already justifies
`sp_widget` and `sp_angular_provider` getting their own Fluent branches.

**2. ServiceNow has a native JSON field type — confirms `SCHEMA.md`'s design, no change needed.**

Internal type `json`, platform label "JSON" — listed in the platform field-type reference
(`markdown/platform-administration/r_FieldTypes.md`) and exposed by Fluent as `JsonColumn`
(`table-api-now-ts.md`). Every JSON field on `sub_phase` in `SCHEMA.md` (`inputs`, `deliverables`,
`comments`, `meetings`, `level_of_effort`, `changelog`, `tasks`) is this real, typed column — not a
large-string workaround, which was worth confirming since the schema design predates this check.
(`participants` is a `List`/`glide_list`, not JSON — see the column-type mapping below.)

**3. `dl_matcher` is not documented anywhere** — zero hits searching all 47,239 files in the
`zurich` branch. Not this spec's concern (see `SCHEMA.md` Open Item 3), but confirms it can only be
settled by inspecting a real instance in Studio, not by reading further docs.

**4. One property left genuinely unverified: `ReferenceColumn`'s target-table property name.**
The Column object's base properties (`label`, `maxLength`, `active`, `mandatory`, `readOnly`,
`default`, `choices`, `attributes`, `functionDefinition`, `dynamicValueDefinitions`) are fully
documented in `table-api-now-ts.md` — but that page doesn't enumerate `ReferenceColumn`'s
type-specific extra property (the referenced table). The doc points to
`github.com/ServiceNow/sdk-examples` as canonical for real usage; confirming this requires
authenticated GitHub code search, which wasn't available when writing this spec. **Flagged, not
guessed** — the implementer should check `sdk-examples` for a working `ReferenceColumn` example
before writing the mapping.

## Proposed manifest additions

Two new optional keys, kept deliberately distinct because they solve different problems (see
finding 1):

```js
// Structural — a real table + its columns. Renders natively per emitter.
tables: [
  {
    name: 'sub_phase',                    // full scoped name, e.g. x_<scope>_sub_phase
    label: 'Sub-Phase',
    columns: [
      { name: 'phase', type: 'reference', reference: 'phase', label: 'Phase', mandatory: true },
      { name: 'name', type: 'string', maxLength: 150, label: 'Name' },
      { name: 'order', type: 'integer', label: 'Order' },
      { name: 'overview', type: 'multi_line_text', label: 'Overview' },
      { name: 'level_of_effort', type: 'json', label: 'Level of Effort' },
      // ...
    ],
  },
  // ...
],

// Generic escape hatch — anything that's genuinely just a record and has no
// dedicated Fluent API of its own (a Business Rule, a Script Include, a UI Action).
// Maps directly onto Fluent's own Record() API and its own stated purpose.
records: [
  { table: 'sys_script', key: 'my_business_rule', fields: { name: '...', script: '...' } },
],
```

Both optional; an app declaring neither key must produce **byte-identical** output to today —
Core, Standards, and Glide Studio are the regression check (none would declare either key).

## Emitter behavior per target

**XML:** expand each `tables[]` entry into one `sys_db_object` record + one `sys_dictionary`
record per column (+ one `sys_choice` per choice value, for columns with `choices`), inserted into
the model in manifest order. `renderXmlRecord` needs **no changes** — it already renders whatever
table/fields it's handed. The expansion is new code in (or adjacent to) `buildRecordModel`, not a
change to the emitter. Raw `sys_dictionary` field names (`element`, `internal_type`, `reference`,
etc.) aren't confirmed by the docs checked here — general ServiceNow platform convention, not
verified against this doc set, so confirm against a real instance or `sdk-examples` before
implementing.

**Fluent:** a new typed branch in `assembleFluent`, alongside the existing `sp_widget` /
`sp_angular_provider` checks, matching on a `rec.kind === 'table'` (or equivalent) marker: emit
`Table({ name, label, schema: [...] })` with one `<Type>Column` per declared column, writing to its
own file (e.g. `src/fluent/tables/<name>.now.ts`), not through `renderRecord`.

**Generic `records[]`:** needs nothing new in either emitter — it's precisely what the existing
generic path already does.

## Column type mapping (this app's worked example, from `SCHEMA.md`)

| `SCHEMA.md` type | Fluent Column | Platform internal type |
|---|---|---|
| String(n) | `StringColumn` | `string` |
| Integer | `IntegerColumn` | `integer` |
| Reference → X | `ReferenceColumn` | `reference` (target-table property name: **unverified**, see finding 4) |
| List → X (`sub_phase.participants` only) | `ListColumn` | `glide_list` — a genuine upgrade over JSON for this one field: `participants` is the only array on `sub_phase` that's a bare list of `job_title` references with nothing else attached (every other array holds strings or structured objects and needs JSON). Gets native multi-value reference semantics + `addQuery('participants', 'CONTAINS', jobTitleId)` querying, the same mechanism Incident's Watch List uses. Same unverified caveat as `ReferenceColumn`: `ListColumn`'s own scoping properties aren't spelled out in the reference page |
| JSON | `JsonColumn` | `json` |
| String, plain text (large) | `MultiLineTextColumn` | plain string — **not** `html`; confirmed by tracing the app's own render path (`overview`/`objective` are authored in a plain `<textarea>` and the controller runs the stored value through `escapeHtml()` before display, which only makes sense if the stored value is plain text — escaping real markup would visibly break it) |

**`ChoiceColumn` (`choice` + `sys_choice` rows) is a real, documented Fluent type and the extension
should still support it** — kept here as general capability for whatever future app needs a choice
field. This app's own worked example doesn't currently exercise it: `task_raci.designation`
(R/A/C/I) was the one place it would have been used, and `task_raci` was folded into
`sub_phase.tasks` JSON 2026-07-26 (`SCHEMA.md` Decision C — RACI is queried only by this widget, not
by ServiceNow itself, so it no longer needs to be a relational table). If the implementer wants a
worked `ChoiceColumn` example against a real field, `SCHEMA.md`'s history has one; this app's
*current* schema doesn't.

## sys_id derivation for new records

Reuse `stableSysId(sysIdPrefix, seed)` unchanged. New seeds needed: one per table
(`'table:sub_phase'`, `'table:phase'`, …) and one per column (`'column:sub_phase.name'`, …) —
namespaced with a `table:`/`column:` prefix specifically so `'column:...'` can never collide with
the existing bare `'column'` seed (`sp_column`). `build.js`'s existing duplicate check is the
backstop if a seed collision happens anyway.

## Ordering

The record model is an ordered array and both emitters preserve that order. A table with a
`reference` column must have its **target table's record appear earlier** in the array than its
own. For this app: `methodology` → `phase` → `sub_phase`, which is also the natural declaration
order in `SCHEMA.md`. (`sub_phase.participants` is a `List` referencing `dl_matcher`, an OOB table
the packager never declares — not part of this ordering concern.)

## First consumer — this app's 3 tables

Once the above lands, `apps/delivery-methodology/deploy.manifest.js` (not yet written — gated on
this spec, per project sequencing) declares its `tables[]` using `SCHEMA.md`'s 3 tables verbatim:
`methodology`, `phase`, `sub_phase`. No `ChoiceColumn` appears in this app's current model (see the
column-type mapping note above) — the manifest's `tables[]` for this app is a `StringColumn`/
`IntegerColumn`/`ReferenceColumn`/`ListColumn`/`JsonColumn`/`MultiLineTextColumn` exercise only.

## Open question for the packager chat, not decided here

Whether table expansion belongs *inside* `buildRecordModel` (keeping one shared record array, with
Fluent reading a structural marker on relevant entries) or whether the model grows a **parallel,
non-record concept** (`model.tables` alongside `model.records`) that each emitter consumes
independently. Both are consistent with everything verified above; this is a packager-architecture
call the packager owner should make, not one to prescribe from an app-scoped spec.

## Verification checklist for whoever implements this

1. Every claim about `core.js` / `fluent.js` above still matches the code — re-check line-level
   behavior, since this was written against a specific point-in-time snapshot.
2. Every ServiceNow claim still matches current docs — re-check against whatever release branch is
   current at implementation time (`zurich` was current when this was written).
3. `ReferenceColumn`'s target-table property confirmed against `sdk-examples` (or a real instance)
   before the column-type mapping table above is treated as final.
4. Core, Standards, and Glide Studio emit byte-identical XML/Fluent output before and after this
   change (no `tables`/`records` key declared in any of their manifests).
5. This app's 3-table worked example round-trips: every column in `SCHEMA.md` has a row in the
   mapping table above, none silently dropped.
