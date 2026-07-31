# Code Defensively

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
