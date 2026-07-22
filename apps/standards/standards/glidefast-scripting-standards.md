The GlideFast scripting standards, in one place. Strong ServiceNow functionality begins with high-quality code: make it manageable, efficient, and scalable from the start, and you get better performance, fewer defects, and easier debugging. The practices below apply wherever you write server- or client-side script - Business Rules, Script Includes, Client Scripts, UI Actions, scheduled jobs, access controls, and beyond.

The code samples here are proven, real-world implementations, not illustrative pseudocode.

**Version 1.0 · Last reviewed 2026-07-15.** Sections marked **Extended guidance** cover practices beyond GlideFast's original three source guides; everything else follows GlideFast's own guidance directly.

# Write Readable Code
<!-- group: Principles -->

Others will work with your code in the future. Always make it easy to read and understand, and follow your organization's formatting standards. What is obvious today is rarely obvious six months from now.

## Comment Your Code

Comments should be as well-written and clear as the code they annotate. A single-line comment starts with `//`; everything after it to the end of the line is the comment:

```js
// a comment can sit on its own line, above the code it explains
var count = 0;

count += batchSize; // or trail a statement, after the code on the same line
```

A block comment runs from `/*` to `*/`. Use [jsdoc](https://jsdoc.app/) syntax to describe a function's purpose, inputs, and outputs:

```js
/**
 * Save a user preference for the current user. If the preference already exists, check the
 * current value and update it only if necessary.
 *
 * @param {string} preferenceName Name of the user preference.
 * @param {string} preferenceValue Value of the user preference.
 * @returns {boolean} True if the preference was updated, false if it was left unchanged.
 */
```

Keep comments accurate and current - an out-of-date comment is worse than none, because it actively misleads. And write comments that add something. Restating the code teaches nothing:

```js
// unhelpful - the code already says this:
// set i to 0
var i = 0;

// helpful - explains intent that the code alone does not convey:
// stop this record from ever reminding again
recordGr.setValue('return_reminder', new GlideDateTime());
recordGr.update();
```

## Use White Space

Empty lines and spaces make code readable, and readable code is easier to fix. Blank lines group related statements so the logical structure is visible; spaces within a line make the individual tokens legible. The **Format Code** button in the ServiceNow syntax editor adjusts indentation without disturbing your other spacing.

Cramped code hides its own logic:

```js
function createRelationship(typeId,childGr,parentGr){
var relationshipGr=new GlideRecord('cmdb_rel_ci');
var relationshipTypeGr=new GlideRecord('cmdb_rel_type');
if(childGr==parentGr)
return;
if(relationshipTypeGr.get(typeId)){
relationshipGr.initialize();
relationshipGr.setValue('type',relationshipTypeGr.getUniqueValue());
relationshipGr.setValue('child',childGr.getValue('sys_id'));
relationshipGr.setValue('parent',parentGr.getValue('sys_id'));
relationshipGr.insert();
}
}
```

A few spaces, blank lines, and consistent braces make the same logic obvious - and always wrap an `if` body in curly braces, even a one-liner:

```js
function createRelationship(typeId, childGr, parentGr) {
  var relationshipGr = new GlideRecord('cmdb_rel_ci');
  var relationshipTypeGr = new GlideRecord('cmdb_rel_type');

  if (childGr == parentGr) {
    return;
  }

  if (relationshipTypeGr.get(typeId)) {
    relationshipGr.initialize();

    relationshipGr.setValue('type', relationshipTypeGr.getUniqueValue());
    relationshipGr.setValue('child', childGr.getUniqueValue());
    relationshipGr.setValue('parent', parentGr.getUniqueValue());

    return relationshipGr.insert();
  }
}
```

## Write Simple Statements

Less experienced developers may maintain your code later, so favor clarity over cleverness - it is the engine's job to make code fast, not yours. An experienced developer reads a ternary without effort:

```js
var result = x === y ? a : b;
```

but the plain form is unambiguous for everyone:

```js
var result;

if (x === y) {
  result = a;

} else {
  result = b;
}
```

## Use Descriptive Names

Meaningful names tell the reader what the code is for. This is impossible to follow:

```js
function del(r, d, s) {
  var a = 0;

  if (s === 13) { // 13 = cancelled
    r.deleteRecord();

  } else {
    a = d;
  }

  return a;
}
```

Rename everything for intent and it reads itself:

```js
function deleteIfCanceled(glideRecord, state, defaultAnswer) {
  var answer = 0;

  if (state === 13) { // 13 = cancelled
    glideRecord.deleteRecord();

  } else {
    answer = defaultAnswer;
  }

  return answer;
}
```

Short names are fine where convention makes them clear - `i` as a loop counter, for example:

```js
for (var i = 0; i < list.length; i++) {
  // process each item
}
```

## Store Repeated Results in a Variable

Avoid calling the same function repeatedly to get the same answer - it hurts both readability and, depending on the call, performance. Name the value once and reuse it:

```js
if (gs.getUserID() === current.getValue('assigned_to') ||
  gs.getUserID() === current.getValue('u_coordinator') ||
  gs.getUserID() === current.getValue('caller_id')) {
    // do some processing here
}
```

reads far better as:

```js
var currentUser = gs.getUserID();
var isOwner = currentUser === current.getValue('assigned_to');
var isCoordinator = currentUser === current.getValue('u_coordinator');
var isCaller = currentUser === current.getValue('caller_id');

if (isOwner || isCoordinator || isCaller) {
  // do some processing here
}
```

# Structure Code for Reuse
<!-- group: Principles -->

Break work into small, focused pieces. Small functions are easy to write, easy to understand, and easy to test - and easy for the next person to modify. As you build them, keep an eye on how the pieces fit: running the same query inside ten separate functions is a sign the shape is wrong.

## Create Small, Modular Components

When you see the same logic repeated, extract a function. It raises quality, saves you hunting through near-identical blocks when something breaks, and keeps the code maintainable. A Script Include is the natural home for that shared server-side logic - a library other server scripts call:

```js build=ScriptInclude
var IncidentService = Class.create();
IncidentService.prototype = {
    initialize: function() {
    },

    getIncident: function(sysId) {
        var incidentGr = new GlideRecord('incident');

        if (incidentGr.get(sysId)) {
            return incidentGr;
        }

        return null;
    },

    type: 'IncidentService'
};
```

Suppose a process adds a user to one watch list, a different user to another, and a CI to a user-defined glide_list. Only the field and the element differ; the logic is identical. Write it once as `addGlideListElement(fieldValue, id)` and call it wherever you need it:

```js
addGlideListElement: function(fieldValue, id) {
  var ids = [];

  if (fieldValue) {
    ids = fieldValue.split(',');
  }

  if (ids.indexOf(id) === -1) {
    ids.push(id);
  }

  return ids.join(',');
}
```

Then a Business Rule, workflow activity, or any other server script simply calls it:

```js
var acmeIncident = new AcmeIncident();

var watchList = current.getValue('watch_list');
var userId = gs.getUserID();

current.setValue('watch_list', acmeIncident.addGlideListElement(watchList, userId));
```

When you test a function, test both valid and invalid inputs so it holds up in the real world.

## Wrap Code in a Function

Code that is not enclosed in a function leaks its variables into the shared server- or client-side scope, where they can collide with variables of the same name in other scripts. Those collisions are painful to debug, because the usual tools point at the script producing the wrong result, not the script that leaked the global. Wrapping every script in a function makes the whole class of problem go away.

A Business Rule gives you the wrapper for free - keep it:

```js
(function executeRule(current, previous) {
  var incidentGr = new GlideRecord('incident');

  incidentGr.addQuery('active', true);
  incidentGr.query();

  while (incidentGr.next()) {
    // do some processing here
  }
})(current, previous);
```

Because `incidentGr` lives inside the function, no other script can see or clobber it. As added insurance, avoid the generic name `gr` entirely - a distinctive name makes a collision more remote still.

A Client Script is wrapped by default for the same reason. Declare your variables inside the handler, never outside it:

```js
function onSubmit() {
  var state = '6';

  if (g_form.getValue('incident_state') === state) {
    alert('This incident is Resolved');
  }
}
```

For a script that only ever runs in one place - a transform map script, for instance - a self-executing function gives you the same isolation without a named, reusable definition. Inner functions declared inside it are private to it:

```js
(function () {
  function helperFunction() {
    // return some value
  }

  var value = helperFunction(); // valid - helperFunction is in scope here
})();

var value2 = helperFunction(); // invalid - helperFunction is not visible out here
```

## Prefer Script Includes to Global Scripts

A global script - a Business Rule or Client Script whose table is **Global** - loads on every page in the system, whether or not it is ever used there. Most such logic is narrow (an advanced reference qualifier on a single field, say), so loading it everywhere is pure overhead. A Script Include, by contrast, loads only when it is called.

If you have a global Business Rule, move its function into a Script Include of the same name; existing calls keep working unchanged. This global rule:

```js
function backfillAssignmentGroup() {
  var assignmentGroupIds = [];

  var assignedToId = current.getValue('assigned_to');

  // return everything if the assigned_to value is empty
  if (!assignedToId) {
    return;
  }

  // sys_user_grmember holds the user-to-group relationship
  var groupMemberGr = new GlideRecord('sys_user_grmember');

  groupMemberGr.addQuery('user', assignedToId);
  groupMemberGr.query();

  while (groupMemberGr.next()) {
    assignmentGroupIds.push(groupMemberGr.getValue('group'));
  }

  return 'sys_idIN' + assignmentGroupIds.join(',');
}
```

belongs in a Script Include:

```js
var AssignmentGroup = Class.create();
AssignmentGroup.prototype = {
  initialize: function() {},

  backfillAssignmentGroup: function() {
    var assignmentGroupIds = [];

    var assignedToId = current.getValue('assigned_to');

    if (!assignedToId) {
      return;
    }

    var groupMemberGr = new GlideRecord('sys_user_grmember');

    groupMemberGr.addQuery('user', assignedToId);
    groupMemberGr.query();

    while (groupMemberGr.next()) {
      assignmentGroupIds.push(groupMemberGr.getValue('group'));
    }

    return 'sys_idIN' + assignmentGroupIds.join(',');
  },

  type: 'AssignmentGroup'
};
```

The same reasoning applies on the client. Rather than a global Client Script, move field logic onto a base table such as Task or Configuration Item, where the extending tables inherit it - so it loads on those forms instead of every home page and catalog item in the instance.

# Work with Data Efficiently
<!-- group: Principles -->

Every database interaction has a cost, and that cost grows as your instance does. Lean on the database to do the heavy lifting, and never fetch more than you need.

## Avoid Complex GlideRecord Queries
<!-- build: Encoder -->

Rather than assembling a result with a chain of `addQuery()` and `addOrCondition()` calls, build an encoded query and pass it to `addEncodedQuery()`. Consider "all active Apple printers and computers in the Santa Ana office." The chained-condition version is fiddly to get right - and the moment the requirement changes (another location, another manufacturer), it becomes hard to maintain.

Instead, build the filter in a list, copy its encoded query string, and use that. When the requirement changes, rebuild the filter, confirm the results with whoever owns the requirement, and drop the new string into the same script.

## Prefer GlideQuery for Clear, Safe Queries
<!-- build: GlideQuery -->
<!-- source: Addition -->

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

```js build=GlideAggregate
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
<!-- build: GlideRecord -->

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

```js build=GlideAjax
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

# Code Defensively
<!-- group: Principles -->

Assume inputs can be missing or wrong, and assume the state of the world can change between two lines of your script. Defensive code fails safely instead of silently.

## Verify Values Exist Before Using Them

Check that a variable or field has a value before you use it, or you risk unpredictable results and log warnings:

```js
var table = current.getTableName();

if (table) {
  gs.print('Table is: ' + table);

} else {
  gs.print('Warning: table is undefined');
}
```

## Return a Meaningful Value

Get in the habit of returning something from every function you write - the return value tells the caller how the call went. Common conventions are a count (0 to signal an error), a success flag (true for success), or an object (null for failure):

```js
if (!saveRecord(current)) {
  gs.addErrorMessage('Save Error');
}

function saveRecord(glideRecord) {
  var recordId = glideRecord.update();

  if (!recordId.nil()) {
    return true;
  }

  return false;
}
```

## Handle Errors Gracefully

Some operations can fail at runtime through no fault of your logic - parsing a string that turns out not to be valid JSON, calling an integration that times out, reading a record on a table a plugin never activated. An unhandled failure aborts the whole transaction, and the user gets a stack trace instead of a useful message. Wrap the operation that can realistically fail in a `try`/`catch`, log the error with enough context to find it, and fail safely:

```js
function getRequestPayload(jsonString) {
  try {
    return JSON.parse(jsonString);

  } catch (e) {
    // log with context so the failure is findable, then fail safely
    gs.error('getRequestPayload: could not parse payload - ' + e.message);
    return null;
  }
}
```

Wrap the specific risky call, not the whole script - a blanket `try`/`catch` around everything hides the ordinary bugs you *want* to fail loudly while you are still developing. And always do something in the `catch`: an empty catch block swallows the problem and leaves you debugging a symptom far from its cause. This is the shape to follow - a `try`/`catch` that logs with `gs.error`.

## Log at the Right Level

ServiceNow gives you leveled logging - `gs.info`, `gs.warn`, and `gs.error` - and each entry is tagged with its source and filterable by level in the system log. Match the level to the severity: `gs.error` for a genuine failure, `gs.warn` for a recoverable oddity worth noticing, `gs.info` for a milestone. The older `gs.log()` and `gs.print()` are global-scope holdovers - `gs.print` in particular writes only to background-script and node output, not the system log - so keep them for ad-hoc testing and reach for the leveled methods in code you ship.

Log something you could actually debug from - carry the values that would let you reconstruct what happened, not a bare marker:

```js
// unhelpful - tells you it ran, nothing more:
gs.info('here');

// helpful - carries the context you would need to trace a problem:
gs.info('AssignmentGroup: no group found for user ' + assignedToId);
```

Verbose tracing is invaluable during an incident and pure noise the rest of the time. Gate it behind a system property so you can switch it on without a code change, and leave it off by default:

```js
if (gs.getProperty('acme.debug') === 'true') {
  gs.info('AssignmentGroup: resolved group to ' + groupId);
}
```

## Double-Check Critical Input on the Server

A Client Script validating input is good for the user - they learn about a problem before submitting. In this example, Low impact is not allowed with High priority:

```js
if (g_form.getValue('impact') === '3' && g_form.getValue('priority') === '1') {
  g_form.showErrorBox('impact', 'Low impact not allowed with High priority');
}
```

But client-side validation is not enough on its own, because data can change between the moment the form is filled in and the moment it is submitted. Suppose a request lets users reserve items, showing only available ones. Two people open the form at the same time and both pick the same item - it still looks available to each, because neither has submitted. Re-check the critical condition in a Business Rule at submit time so the second request is caught:

```js
(function executeRule(current, previous) {
  isCiAvailable();

  function isCiAvailable() {
    var loanerUtils = new LoanerUtils();

    if (!loanerUtils.isAvailable(current.cmdb_ci, current.start_date, current.end_date)) {
      gs.addErrorMessage(gs.getMessage('Sorry, that item has already been allocated'));

      current.setValue('cmdb_ci', 'NULL');
    }
  }
})(current, previous);
```

## Prevent Recursive Updates

Never call `current.update()` in a Business Rule. `update()` fires the insert/update Business Rules on the same table again, which can make a rule call itself indefinitely. Changes made in a before rule are saved automatically once all before rules finish, and after rules should update related records, not the current one - so `current.update()` is never needed under normal guidelines. ServiceNow will detect and stop a recursive rule and log the error, but it costs performance you do not need to spend.

If a rare requirement genuinely needs an update outside those guidelines, pair it with `current.setWorkflow(false)` to stop Business Rules and related engines from running on that write and breaking the cycle.

## Avoid the eval() Function

`eval()` executes whatever string you hand it, which opens the door to injection and makes debugging harder - errors carry no line numbers. Where you must evaluate a string, use the platform API instead:

```js
GlideEvaluator.evaluateString('gs.log(\'Hello World\');');
```

# Control When Code Runs
<!-- group: Principles -->

Code that runs when it does not need to is wasted work - and on a form or a busy table, wasted work the user feels. Run logic only when its conditions are actually met.

## Choose the Right Business Rule Timing

The **When** value decides whether a Business Rule runs before or after the record is written. Match it to what the rule does:

| Value | Use it to |
|-------|-----------|
| display | Give client-side scripts access to server-side data (via `g_scratchpad`). |
| before | Update fields on the current record - e.g. `current.setValue('state', 3);` before it is saved. |
| after | Update related records that must be visible immediately. |
| async | Update related records that can wait - metrics, SLAs - so control returns to the user sooner. |

An async rule is like an after rule but runs in the background after the commit; it frees the user sooner at the cost of updating related objects slightly later.

## Order Business Rules and Client Scripts

When more than one Business Rule runs at the same timing on the same table, the **Order** field decides the sequence - the lowest number runs first, and the default is 100. Order matters the moment one rule depends on what another just did. If a *before* rule sets `current.assignment_group` and a second *before* rule reads that group to pick an approver, the rule that sets the value must have the lower Order - otherwise the second rule runs first and reads an empty field.

Leave gaps between the numbers - 100, 200, 300 rather than 1, 2, 3 - so you can slot a new rule between two existing ones later without renumbering the rest.

And resist spreading one piece of order-dependent logic across many small rules just because you can. A chain of five rules that must fire in an exact sequence is hard to reason about, and a single changed Order number breaks it silently. When steps are tightly coupled, keep them together in one rule - or in one Script Include the rule calls - where the order is simply the order of the lines.

Client Scripts have the same lever, with one catch: their **Order** field isn't on the form by default, so add it before you rely on it. The rule is identical - lower runs first - so when one onLoad or onChange script depends on a value another sets, give the script that sets it the lower Order.

## Run Only What's Needed

Because Business Rules run on every insert, update, delete, or query to their table, always give them a condition. The condition is evaluated first; the script runs only if it passes. Without one, the rule executes for every operation on the table - more work, and harder to debug, since you can no longer tell at a glance which rules should have fired. Set the condition in the **Filter Conditions** (or **Condition**) field, not in the script.

Client Scripts have no condition field, so an `onLoad` or `onChange` script runs in full every time the form loads. Do only necessary work, and add guards early. Starting from an inefficient handler that looks up the CI's support group on every change:

```js
function onChange(control, oldValue, newValue, isLoading) {
  var ciSupportGroup = g_form.getReference('cmdb_ci').support_group;

  if (ciSupportGroup && g_form.getValue('assignment_group')) {
    g_form.setValue('assignment_group', ciSupportGroup.sys_id);
  }
}
```

layer in the standard guards, cheapest first, so the expensive server call happens as rarely as possible:

```js
function onChange(control, oldValue, newValue, isLoading, isTemplate) {
  // isLoading: nothing to do on form load - the logic already ran when the field last changed
  if (isLoading) {
    return;
  }

  // newValue: skip when the field was cleared
  if (!newValue) {
    return;
  }

  // only react to an actual change
  if (newValue === oldValue) {
    return;
  }

  // check what the client already knows before calling the server
  if (g_form.getValue('assignment_group')) {
    return;
  }

  var glideAjax = new GlideAjax('ConfigurationItem');

  glideAjax.addParam('sysparm_name', 'getSupportGroup');
  glideAjax.addParam('sysparm_ci', g_form.getValue('cmdb_ci'));

  glideAjax.getXMLAnswer(function (response) {
    g_form.setValue('assignment_group', response);
  });
}
```

Two related habits: prefer a **UI Policy** to a Client Script when you only need to make a field mandatory, read-only, or visible - no script required. And remember that UI Policies and Client Scripts apply to forms only; to keep the same rules in a list, disable list editing, add an access control or data policy, or write an `onCellEdit` Client Script.

# Avoid Common Pitfalls
<!-- group: Principles -->

A handful of specific mistakes cause an outsized share of hard-to-trace defects. Learn to spot them.

## Do Not Use Hard-Coded Values

Hard-coded values produce unpredictable behavior and are hard to track down. sys_ids are the worst offenders - they differ between instances, so a value copied from a dev instance will not exist in production:

```js
var taskId = '26c811f06075388068d07268c841dcd0';
var groupName = 'Service Desk';
```

Look the value up, or store it in a system property and read it with `gs.getProperty()`:

```js
var taskId = gs.getProperty('acme.default.task');
var groupName = gs.getProperty('acme.group.name');
```

Hard-coded names cause the same trouble the moment the organization changes. If a workflow needs approval from the IT director and you hard-code that person, you rewrite the workflow every time the role changes hands. Instead, create an **IT Director** group, use a Group Approval activity, and change group membership when the role changes - the workflow never moves.

## Avoid Dot-Walking to a Reference's sys_id

A reference field's value already *is* a sys_id, so dot-walking to `.sys_id` forces an extra database query to load the referenced record and read it back:

```js
var id = current.caller_id.sys_id;
```

Read the field directly:

```js
var id = current.getValue('caller_id');
```

## Use getDisplayValue() Effectively

Do not hard-code the display field's name (`number`, `name`, and so on); use `getDisplayValue()`. Naming the field couples your code to a dictionary setting that can change:

```js
var parent = current.parent.number;
var myCi = current.cmdb_ci.name;
```

If someone changes the display field on the Configuration Item table from `name` to `serial_number`, the second line is now wrong. Ask for the display value and the platform gives you whatever the current display field is:

```js
var parent = current.getDisplayValue('parent');
var myCi = current.getDisplayValue('cmdb_ci');
```

## Set Fields with setValue() and setDisplayValue()
<!-- build: GlideRecord -->
<!-- source: Addition -->

Set fields the same deliberate way you read them - with `setValue()`, the write-side counterpart to `getValue()` - rather than assigning the field directly. Direct assignment leans on an auto-setter that blurs the line between a field's stored value and its display value, and can mishandle typed fields like dates, durations, and references. `setValue()` is explicit and type-safe:

```js
// fragile - relies on the auto-setter:
current.state = 3;

// explicit and type-safe:
current.setValue('state', 3);
```

When what you have is the *display* value rather than the stored value - a choice label, or a reference by its name - use `setDisplayValue()` and let the platform resolve it to the underlying value:

```js
// set a reference field from the record's display name, not its sys_id:
current.setDisplayValue('assigned_to', 'Fred Luddy');
```

The same idea applies on the client through `g_form.setValue()` - and when the field is a reference, pass the display value alongside the sys_id to avoid a round trip (see Minimize Server Lookups).

## Avoid DOM Manipulation

Avoid manipulating the DOM directly - it breaks when browsers update, and referencing an out-of-box element by id or CSS selector breaks when that element's id or position changes. Use the GlideForm (`g_form`) API instead, or rethink the approach. The only place DOM work is defensible is where you own the DOM: UI Pages and the Service Portal.

## Work in Stages

Do not write hundreds of lines in one sitting, especially while learning something new - write a little, test it, and continue. It feels slower, but tracing a defect through a small increment beats hunting through a large one.

And prove out new ideas in a sandbox, not a shared development instance. Experimenting inside an update set risks promoting unwanted changes; experimenting outside one can leave your development instance behaving unlike the others. If you have no sandbox, use a ServiceNow demo instance, then build the real thing in development once you understand the approach.

# Enforce Security
<!-- group: Principles -->

Access control is the platform's job - until you write a line of server code, where you can either step around it or become it. Both directions deserve care: code that reads data on a user's behalf should respect what that user is allowed to see, and an access rule you write runs on every record it guards.

## Keep ACL Scripts Fast
<!-- source: Addition -->

An ACL script evaluates every time someone reads, writes, or even sees a record or field it protects - and on a list, that is once per row, per column. A cheap check costs nothing noticeable; a GlideRecord query inside the script is paid on every one of those evaluations and quietly tanks list performance. Keep an ACL script to in-memory checks - roles, and values already on the current record - and have it set `answer` to a boolean:

```js
// runs on every record this rule guards - keep it cheap, no queries
answer = gs.hasRole('incident_manager') || current.getValue('assigned_to') === gs.getUserID();
```

If a rule genuinely needs data from another table, resolve it once and cache it rather than querying inside the ACL itself.

## Enforce ACLs in Server Code with GlideRecordSecure
<!-- build: GlideRecord -->
<!-- source: Addition -->

A plain `new GlideRecord()` runs with full rights and ignores access controls entirely. That is correct for trusted background logic, but dangerous the moment your code acts on behalf of a user - a client-callable Script Include answering a GlideAjax call, or a Scripted REST resource. There, use `GlideRecordSecure`, which enforces the same ACLs the user would hit in the UI, so your code cannot hand back records they were never allowed to see:

```js
// honors the caller's ACLs - they get only the records they are permitted to read
var incidentGr = new GlideRecordSecure('incident');

incidentGr.addQuery('active', true);
incidentGr.query();
```

The rule of thumb: GlideRecord for trusted server-to-server work, GlideRecordSecure whenever a user's request is driving the query.

## Back Reference Qualifiers with a Script Include
<!-- source: Addition -->

An advanced reference qualifier decides which records a reference field is allowed to offer. Written inline on the dictionary entry, that logic is hard to test, impossible to reuse, and easy to lose. Move it into a Script Include that returns an encoded query and point the qualifier at it - the same "extract shared logic, load it only when called" reasoning behind preferring Script Includes to global scripts.

The `AssignmentGroup` Script Include shown earlier already returns exactly the right shape - a `sys_idIN…` string of the groups a user belongs to. A reference qualifier can call it directly:

```
javascript: new AssignmentGroup().backfillAssignmentGroup()
```

Now the field offers only valid groups, the logic lives in one testable place, and it loads only when that field is actually shown.

# Write UI Actions Well
<!-- group: Build It Well -->

A UI Action is the button or link a user clicks on a form or list. It can run on the client, on the server, or hand off from one to the other - and choosing the right side, showing it only when it makes sense, and telling the user what happened are what separate a solid button from a confusing one.

## Choose Client or Server
<!-- source: Addition -->

A **server** UI Action runs a script with `current` and `action` after the click - use it to change records and redirect. A **client** UI Action (the *Client* checkbox, with an `onclick` handler) runs in the browser with `g_form` and never touches the server on its own - use it for confirmation dialogs and form validation that should happen before anything is submitted.

Match the side to the work. Validation the browser can do needs no server round trip:

```js
// Client UI Action - runs in the browser with g_form
function validateAndSubmit() {
  if (!g_form.getValue('short_description')) {
    g_form.addErrorMessage('Enter a short description first.');
    return false;
  }

  g_form.save();
}
```

Work that changes records belongs on the server, where it runs with `current`:

```js
// Server UI Action - runs with current and action
current.setValue('state', 3);
current.update();

gs.addInfoMessage('Incident closed.');
action.setRedirectURL(current); // send the user back to the saved record
```

## Always Give a UI Action a Condition
<!-- source: Addition -->

The **Condition** field decides when the button or link appears. Leave it blank and the action shows for everyone, on every record, whether or not it could possibly apply - clutter at best, a confusing dead end at worst. Set the condition declaratively, the same way a Business Rule gets one, so the platform hides the action when it does not apply instead of the script running and bailing out:

```js
gs.hasRole('incident_manager') && current.active
```

## Redirect and Respond Deliberately
<!-- source: Addition -->

After a server UI Action does its work, tell the user what happened. `action.setRedirectURL()` sends them somewhere sensible - back to the saved record, on to a related list, or to a landing page - and `gs.addInfoMessage()` (or `addErrorMessage()`) confirms the outcome. Skipping both leaves the user on a stale form wondering whether the click did anything.

## Reach for Declarative First
<!-- source: Addition -->

Before writing a UI Action at all, ask whether it needs a script. If the goal is to set a field, flip a state, or show and hide controls, a UI Policy or a Flow often does it with no code to maintain - and the less script there is, the less there is to break when the form or the requirement changes.

# Run Server Code Safely
<!-- group: Build It Well -->

Code that runs unattended - on a schedule, once across a whole table, or in a background window with full rights - has no user watching to catch a mistake, and often no undo. That earns it extra care: bound what it touches, make it safe to re-run, and prove it somewhere disposable first.

## Scheduled Jobs
<!-- source: Addition -->

A Scheduled Job runs a script on a timer, unattended. Its danger is scale: a job that loops every matching record can hold resources for a long time and slow the instance for everyone. Bound the work - process a capped batch per run, or filter to only the records that still need attention - and let a later run pick up the rest, rather than trying to finish an unbounded set in one pass. When the job's real work can happen out of band, fire an event and let the event queue carry the load (see below) so the job itself returns quickly.

## Fix Scripts
<!-- source: Addition -->

A Fix Script is a one-time data change, run once when its update set is committed to an instance. Two habits make it safe. Make it **idempotent** - safe to run twice - by checking state before it writes, so a re-run or a partial failure does not double-apply. And have it **log what it touched** so you can confirm afterward exactly what changed:

```js
var updated = 0;
var incidentGr = new GlideRecord('incident');

incidentGr.addQuery('category', 'inquiry');
incidentGr.addQuery('subcategory', ''); // only the ones not already fixed - keeps a re-run safe
incidentGr.query();

while (incidentGr.next()) {
  incidentGr.setValue('subcategory', 'general');
  incidentGr.update();
  updated++;
}

gs.info('Fix: set default subcategory on ' + updated + ' inquiry incidents');
```

Run it against a sub-production copy first and confirm the count matches what you expected before you promote it.

## Background Scripts
<!-- source: Addition -->

The **Scripts - Background** module runs whatever you paste, immediately, against the instance you are on, with full rights and no undo. It is the right tool for a quick read or a one-off check - and the wrong place to try anything destructive in production. While you are developing, add `setLimit()` so a runaway query cannot touch more than you meant, read before you write, and if you want the change to travel to other instances, put it in a Fix Script instead so it is captured, reviewable, and repeatable.

## Events and Script Actions
<!-- source: Addition -->

When something happens that should trigger extra work - notify a team, sync an external system - do not make the user's transaction wait for it. Hand the work to the event queue with `gs.eventQueue()`; a Script Action (or the notification engine) picks the event up out of band, so the click returns to the user immediately and the follow-on work runs asynchronously:

```js
// in a Business Rule - queue the work and return; the Script Action does the rest
gs.eventQueue('incident.escalated', current, current.getValue('assigned_to'), priorityLabel);
```

This is the reusable, decoupled cousin of an async Business Rule: many producers can fire the same event, and one Script Action handles it in one place.
