# Spec: table + record emission in the SN Deployment Packager

**Status:** design proposal, not implemented. Handoff to a chat scoped to
`tools/sn-deployment-packager/` — this app's own chat is scoped to `apps/delivery-methodology/` and
does not edit the packager. Written 2026-07-26, against the packager as it stood after its
`tools/packager/` → `tools/sn-deployment-packager/` rename that same day.

## Why this exists

`apps/delivery-methodology/SCHEMA.md` designs **1** ServiceNow table for this app's eventual data
tier (revised down twice on 2026-07-26 — 5 → 3 tables when RACI moved from a relational table into
JSON on `sub_phase`, then 3 → 1 when every remaining table, including the lookup content that used
to ride `dl_matcher`, folded into a single `type`-discriminated, self-referencing tree; see
`SCHEMA.md` Decisions C and D). The packager (`tools/sn-deployment-packager/`) has no way to emit a
table today — its shared record model only knows about portal/widget/security records. This spec
designs the extension, using this app's own table as the worked example, so the packager owner has
a concrete first consumer rather than a hypothetical one. The extension itself (a `tables[]`
manifest key, structural per-emitter rendering) is unaffected by which or how many tables this
particular app ends up declaring — everything below still applies even though the count dropped to
one.

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
(`table-api-now-ts.md`). Every `content` field in `SCHEMA.md`'s `type` enum is this real, typed
column — not a large-string workaround. (`participants` was briefly a `List`/`glide_list` field in
an intermediate version of the schema; `SCHEMA.md` Decision D folded it back into `content` as its
own `sub_phase_participant` **type**, so `ListColumn` is no longer part of this app's design at
all — see the column-type mapping below.)

**3. `dl_matcher` is not documented anywhere** — zero hits searching all 47,239 files in the
`zurich` branch. **No longer this spec's concern at all** (was `SCHEMA.md` Open Item 3; resolved by
Decision D — nothing rides `dl_matcher` anymore, so its extension mechanics never need verifying).
Kept here only as a historical note in case a future app reconsiders using it.

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
finding 1). The `tables[]` example below (a `sub_phase` table with several typed columns) is
illustrative of the general feature — an arbitrary table with arbitrary columns — not this app's
actual final shape; see **First consumer** below for what this app's manifest really declares now
that `SCHEMA.md` collapsed to one table.

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
| `type` (the discriminator itself) | `ChoiceColumn` (with `choices`) | `choice` + `sys_choice` rows — **back in active use**, reversing the note in an earlier version of this spec. `SCHEMA.md`'s Decision D reintroduced a Choice field, just a different one: not `task_raci.designation` (gone, folded into `content`) but the table's own `type` column, with ~17 choice values (18 if `SCHEMA.md` Open Item 1 adds `sub_phase_changelog_ack`) |
| `parent` | `ReferenceColumn` | `reference` — **self-referencing** (target table = this same table). Target-table property name still **unverified** (finding 4), and a self-reference doesn't add new risk beyond that — it's a well-established platform pattern (e.g. `sys_user.manager`), just worth confirming the property accepts the declaring table's own name before writing it |
| `name` | `StringColumn` | `string` |
| `order` | `IntegerColumn` | `integer` |
| `content` | `JsonColumn` | `json` |

**Only 5 columns total, because every entity shares one table.** This app's manifest declares one
`tables[]` entry with exactly these 5 columns — `type`/`parent`/`name`/`order`/`content` — not one
entry per entity. `StringColumn`/`MultiLineTextColumn` distinctions inside `overview`/`objective`
etc. from an earlier version of this schema no longer apply at the table-definition level, since
those fields now live inside `content` (JSON) rather than as their own dictionary columns — see
`SCHEMA.md`'s `type` enum for what each `content` shape holds.

## sys_id derivation for new records

Reuse `stableSysId(sysIdPrefix, seed)` unchanged. New seeds needed: one per table
(`'table:sub_phase'`, `'table:phase'`, …) and one per column (`'column:sub_phase.name'`, …) —
namespaced with a `table:`/`column:` prefix specifically so `'column:...'` can never collide with
the existing bare `'column'` seed (`sp_column`). `build.js`'s existing duplicate check is the
backstop if a seed collision happens anyway.

## Ordering

The record model is an ordered array and both emitters preserve that order. A table with a
`reference` column must have its **target table's record appear earlier** in the array than its
own — this still matters in general (it's why this rule is documented here, for whatever future app
declares multiple tables), but **this app no longer exercises it at all**: with one table whose only
`reference` column points at itself, there is no cross-table ordering to get right. The general rule
survives this app happening not to need it.

## First consumer — this app's 1 table

Once the above lands, `apps/delivery-methodology/deploy.manifest.js` (not yet written — gated on
this spec, per project sequencing) declares a single `tables[]` entry — `methodology_content` (name
still open, see `SCHEMA.md`'s closing note) — with exactly the 5 columns in the mapping table above:
`type` (`ChoiceColumn`, ~17-18 values), `parent` (`ReferenceColumn`, self), `name` (`StringColumn`),
`order` (`IntegerColumn`), `content` (`JsonColumn`). Nothing else. This is a smaller manifest
declaration than either prior version of this spec described, despite the table now holding every
entity in the app — the complexity moved into the `type` enum and the `content` shape per type,
neither of which the packager's table-definition emission needs to know about at all. Whoever
implements this should *not* expect a large `tables[]` array from this app; one entry, five columns,
is the actual first consumer.

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
5. This app's 1-table worked example round-trips: all 5 columns (`type`, `parent`, `name`, `order`,
   `content`) have a row in the mapping table above, none silently dropped. Unlike prior versions of
   this spec, there is no longer a per-entity column list to check against `SCHEMA.md` — the
   type-specific shapes all live inside `content`, which the table-definition layer never inspects.
