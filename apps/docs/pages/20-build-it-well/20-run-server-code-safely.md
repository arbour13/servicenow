# Run Server Code Safely

Code that runs unattended - on a schedule, once across a whole table, or in a background window with full rights - has no user watching to catch a mistake, and often no undo. That earns it extra care: bound what it touches, make it safe to re-run, and prove it somewhere disposable first.

## Scheduled Jobs
<!-- badge: Extended guidance -->

A Scheduled Job runs a script on a timer, unattended. Its danger is scale: a job that loops every matching record can hold resources for a long time and slow the instance for everyone. Bound the work - process a capped batch per run, or filter to only the records that still need attention - and let a later run pick up the rest, rather than trying to finish an unbounded set in one pass. When the job's real work can happen out of band, fire an event and let the event queue carry the load (see below) so the job itself returns quickly.

## Fix Scripts
<!-- badge: Extended guidance -->

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
<!-- badge: Extended guidance -->

The **Scripts - Background** module runs whatever you paste, immediately, against the instance you are on, with full rights and no undo. It is the right tool for a quick read or a one-off check - and the wrong place to try anything destructive in production. While you are developing, add `setLimit()` so a runaway query cannot touch more than you meant, read before you write, and if you want the change to travel to other instances, put it in a Fix Script instead so it is captured, reviewable, and repeatable.

## Events and Script Actions
<!-- badge: Extended guidance -->

When something happens that should trigger extra work - notify a team, sync an external system - do not make the user's transaction wait for it. Hand the work to the event queue with `gs.eventQueue()`; a Script Action (or the notification engine) picks the event up out of band, so the click returns to the user immediately and the follow-on work runs asynchronously:

```js
// in a Business Rule - queue the work and return; the Script Action does the rest
gs.eventQueue('incident.escalated', current, current.getValue('assigned_to'), priorityLabel);
```

This is the reusable, decoupled cousin of an [[control-when-code-runs#choose-the-right-business-rule-timing|async Business Rule]]: many producers can fire the same event, and one Script Action handles it in one place.
