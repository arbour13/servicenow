# Structure Code for Reuse

Break work into small, focused pieces. Small functions are easy to write, easy to understand, and easy to test - and easy for the next person to modify. As you build them, keep an eye on how the pieces fit: running the same query inside ten separate functions is a sign the shape is wrong.

## Create Small, Modular Components

When you see the same logic repeated, extract a function. It raises quality, saves you hunting through near-identical blocks when something breaks, and keeps the code maintainable. A Script Include is the natural home for that shared server-side logic - a library other server scripts call:

```js
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
