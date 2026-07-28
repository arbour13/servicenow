# Spec: table + record emission in the SN Deployment Packager

**Status: implemented (Fluent-only)** — see `tools/sn-deployment-packager/manifest.schema.md`
(`tables[]`, optional `editorRoleName`) and `core.js` / `fluent.js`.

This document was the 2026-07-26 design handoff. The packager now:

- Accepts optional `manifest.tables[]` and emits Fluent `Table()` files under
  `src/fluent/tables/`
- Keeps a parallel `model.tables` (not flattened into portal records)
- Maps column types `choice` / `reference` / `string` / `integer` / `json` to
  `ChoiceColumn` / `ReferenceColumn` / `StringColumn` / `IntegerColumn` / `JsonColumn`
- Uses `referenceTable` + optional `cascadeRule` on reference columns
- Prefixes short table names with `manifest.scope`

XML emission was removed from the packager earlier; there is no `sys_db_object` XML path.

**First consumer:** `apps/delivery-methodology/deploy.manifest.js` — one `content` table with
five columns (`type`, `parent`, `name`, `order`, `content`). See `SCHEMA.md`.

Historical research notes (Fluent Table vs Record API, ChoiceColumn, etc.) remain valid; treat
`manifest.schema.md` + the generated Fluent output as the live contract.
