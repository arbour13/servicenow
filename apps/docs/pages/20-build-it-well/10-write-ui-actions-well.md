# Write UI Actions Well

A UI Action is the button or link a user clicks on a form or list. It can run on the client, on the server, or hand off from one to the other - and choosing the right side, showing it only when it makes sense, and telling the user what happened are what separate a solid button from a confusing one.

## Choose Client or Server
<!-- badge: Extended guidance -->

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
<!-- badge: Extended guidance -->

The **Condition** field decides when the button or link appears. Leave it blank and the action shows for everyone, on every record, whether or not it could possibly apply - clutter at best, a confusing dead end at worst. Set the condition declaratively, the same way a Business Rule gets one, so the platform hides the action when it does not apply instead of the script running and bailing out:

```js
gs.hasRole('incident_manager') && current.active
```

## Redirect and Respond Deliberately
<!-- badge: Extended guidance -->

After a server UI Action does its work, tell the user what happened. `action.setRedirectURL()` sends them somewhere sensible - back to the saved record, on to a related list, or to a landing page - and `gs.addInfoMessage()` (or `addErrorMessage()`) confirms the outcome. Skipping both leaves the user on a stale form wondering whether the click did anything.

## Reach for Declarative First
<!-- badge: Extended guidance -->

Before writing a UI Action at all, ask whether it needs a script. If the goal is to set a field, flip a state, or show and hide controls, a UI Policy or a Flow often does it with no code to maintain - and the less script there is, the less there is to break when the form or the requirement changes.
