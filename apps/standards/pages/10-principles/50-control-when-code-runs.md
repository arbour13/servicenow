# Control When Code Runs

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
