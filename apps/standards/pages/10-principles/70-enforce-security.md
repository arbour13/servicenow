# Enforce Security

Access control is the platform's job - until you write a line of server code, where you can either step around it or become it. Both directions deserve care: code that reads data on a user's behalf should respect what that user is allowed to see, and an access rule you write runs on every record it guards.

## Keep ACL Scripts Fast
<!-- badge: Extended guidance -->

An ACL script evaluates every time someone reads, writes, or even sees a record or field it protects - and on a list, that is once per row, per column. A cheap check costs nothing noticeable; a GlideRecord query inside the script is paid on every one of those evaluations and quietly tanks list performance. Keep an ACL script to in-memory checks - roles, and values already on the current record - and have it set `answer` to a boolean:

```js
// runs on every record this rule guards - keep it cheap, no queries
answer = gs.hasRole('incident_manager') || current.getValue('assigned_to') === gs.getUserID();
```

If a rule genuinely needs data from another table, resolve it once and cache it rather than querying inside the ACL itself.

## Enforce ACLs in Server Code with GlideRecordSecure
<!-- badge: Extended guidance -->

A plain `new GlideRecord()` runs with full rights and ignores access controls entirely. That is correct for trusted background logic, but dangerous the moment your code acts on behalf of a user - a client-callable Script Include answering a GlideAjax call, or a Scripted REST resource. There, use `GlideRecordSecure`, which enforces the same ACLs the user would hit in the UI, so your code cannot hand back records they were never allowed to see:

```js
// honors the caller's ACLs - they get only the records they are permitted to read
var incidentGr = new GlideRecordSecure('incident');

incidentGr.addQuery('active', true);
incidentGr.query();
```

The rule of thumb: GlideRecord for trusted server-to-server work, GlideRecordSecure whenever a user's request is driving the query.

## Back Reference Qualifiers with a Script Include
<!-- badge: Extended guidance -->

An advanced reference qualifier decides which records a reference field is allowed to offer. Written inline on the dictionary entry, that logic is hard to test, impossible to reuse, and easy to lose. Move it into a Script Include that returns an encoded query and point the qualifier at it - the same "extract shared logic, load it only when called" reasoning behind preferring Script Includes to global scripts.

The `AssignmentGroup` Script Include shown in [[structure-code-for-reuse#prefer-script-includes-to-global-scripts|Prefer Script Includes to Global Scripts]] already returns exactly the right shape - a `sys_idIN…` string of the groups a user belongs to. A reference qualifier can call it directly:

```
javascript: new AssignmentGroup().backfillAssignmentGroup()
```

Now the field offers only valid groups, the logic lives in one testable place, and it loads only when that field is actually shown.
