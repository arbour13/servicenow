# Work with Data Efficiently

Every database interaction has a cost, and that cost grows as your instance does. Lean on the database to do the heavy lifting, and never fetch more than you need.

## Avoid Complex GlideRecord Queries

Rather than assembling a result with a chain of `addQuery()` and `addOrCondition()` calls, build an encoded query and pass it to `addEncodedQuery()`. Consider "all active Apple printers and computers in the Santa Ana office." The chained-condition version is fiddly to get right - and the moment the requirement changes (another location, another manufacturer), it becomes hard to maintain.

Instead, build the filter in a list, copy its encoded query string, and use that. When the requirement changes, rebuild the filter, confirm the results with whoever owns the requirement, and drop the new string into the same script.

## Prefer GlideQuery for Clear, Safe Queries
<!-- badge: Extended guidance -->

GlideQuery is a modern, fluent wrapper over the database that reads top to bottom as a single sentence and fails loudly when something is wrong. The same "get one incident, guard the result" shape you would build with GlideRecord becomes:

```js
var incident = new GlideQuery('incident')
  .where('sys_id', sysId)
  .selectOne('number', 'priority')
  .orElse(null);

if (incident) {
  // incident is a plain object - { sys_id, number, priority } - already narrowed to the fields you asked for
}
```

Two things make it safer than a hand-written GlideRecord loop. It is **null-safe**: `selectOne` returns an Optional, so you have to decide what happens when nothing matches (`orElse`) instead of forgetting the `if (gr.next())` guard. And it is **strict**: a mistyped field name throws immediately, where `gr.getValue('piority')` would hand back an empty string and send you hunting for the bug later.

It counts and aggregates too, so it can stand in for many GlideRecord and GlideAggregate patterns:

```js
var activeCount = new GlideQuery('incident')
  .where('active', true)
  .count();
```

Reach for GlideQuery for the everyday reads, writes, and counts in new code. GlideRecord is still the right tool when you are streaming a very large result set or need an API GlideQuery does not wrap - and the GlideRecord guidance above (guard the result, cap what you return, name the variable well) applies to GlideQuery just the same.

## Use GlideAggregate for Simple Record Counting

To count rows you have two options: `getRowCount()` on a GlideRecord, or GlideAggregate. GlideRecord retrieves every matching record and then counts them, which does not scale as the table grows. GlideAggregate asks the database to count, which is fast and scales cleanly. Prefer it:

```js
function getIncidentCount(encodedQuery) {
  var incidentGa = new GlideAggregate('incident');

  incidentGa.addEncodedQuery(encodedQuery);
  incidentGa.addAggregate('COUNT');
  incidentGa.query();

  if (incidentGa.next()) {
    return parseInt(incidentGa.getAggregate('COUNT'), 10);
  }

  return 0;
}
```

## Let the Database Do the Work

Whenever you can, let the database return exactly the records you need. To check whether *at least one* active incident exists, a first attempt might query them all:

```js
var incidentGr = new GlideRecord('incident');

incidentGr.addQuery('active', true);
incidentGr.query();

if (incidentGr.hasNext()) {
  // there is at least one active record
}
```

If there are 250,000 active records, `query()` retrieves all of them. Ask the database for one instead - it is far faster:

```js
var incidentGr = new GlideRecord('incident');

incidentGr.addQuery('active', true);
incidentGr.setLimit(1); // return at most one record
incidentGr.query();

if (incidentGr.hasNext()) {
  // there is at least one active record
}
```

## Avoid Complex Queries on Large Data Sets

Limit how often you search large tables; as the instance grows, those searches degrade performance. Imagine needing the importance of every upstream service related to a server whenever that server is added to an incident. On a small CMDB, querying the Relationship [cmdb_rel_ci] table is fine. On a CMDB with three million CIs and hundreds of thousands of relationships, that query could take hours.

A better design precomputes the answer: maintain a related list of affected services on the CI, updated by a Business Rule as relationships change. When the CI is added to an incident, read the short related list instead of launching a long search across the relationship table.

## Minimize Server Lookups

Client code runs on data already on the form or data fetched from the server; use what is already there whenever you can, because server round trips are slow. The two efficient ways to pull from the server are `g_scratchpad` (pushed once, when the form loads) and an asynchronous GlideAjax call (requested on demand). Older approaches - `GlideRecord` on the client and `g_form.getReference()` - are no longer recommended: they fetch every field when you usually need one, and the client-side GlideRecord API is unavailable in scoped applications.

When you know before load what the client will need, a display Business Rule can stage it in `g_scratchpad`:

```js
g_scratchpad.css = gs.getProperty('css.base.color');
g_scratchpad.hasAttachments = current.hasAttachments();
g_scratchpad.managerName = current.caller_id.manager.getDisplayValue();
```

When the need arises dynamically, call a client-callable Script Include asynchronously. Always use the asynchronous `getXMLAnswer()`, never a synchronous call. This is the client half of that call:

```js
function getIncident(sysId, callback) {
  var incidentServiceAjax = new GlideAjax('IncidentService');

  incidentServiceAjax.addParam('sysparm_name', 'getIncident');
  incidentServiceAjax.addParam('sysparm_sys_id', sysId);

  incidentServiceAjax.getXMLAnswer(function (response) {
    callback(response ? JSON.parse(response) : null);
  });
}
```

backed by an `AbstractAjaxProcessor` Script Include on the server:

```js
var ConfigurationItem = Class.create();
ConfigurationItem.prototype = Object.extendsObject(AbstractAjaxProcessor, {
  getSupportGroup: function() {
    var configurationItemId = this.getParameter('sysparm_configuration_item_id');
    var assignmentGroupId = this.getParameter('sysparm_assignment_group_id');

    var configurationItemGr = new GlideRecord('cmdb_ci');

    if (configurationItemGr.get(configurationItemId)) {
      if (configurationItemGr.getValue('support_group') === assignmentGroupId) {
        return 'CI support group and assignment group match';
      }
    }

    return 'CI support group and assignment group do not match';
  }
});
```

One more round trip worth avoiding: when you `setValue()` a reference field, pass the display value alongside the sys_id. Without it, the client makes a synchronous call back to the server just to resolve the label:

```js
// causes a synchronous server call to fetch the display value:
g_form.setValue('assigned_to', assignedToId);

// no server call - the display value is supplied:
g_form.setValue('assigned_to', assignedToId, assignedToName);
```
