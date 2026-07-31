# Avoid Common Pitfalls

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
<!-- badge: Extended guidance -->

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

The same idea applies on the client through `g_form.setValue()` - and when the field is a reference, pass the display value alongside the sys_id to avoid a round trip (see [[work-with-data-efficiently#minimize-server-lookups|Minimize Server Lookups]]).

## Avoid DOM Manipulation

Avoid manipulating the DOM directly - it breaks when browsers update, and referencing an out-of-box element by id or CSS selector breaks when that element's id or position changes. Use the GlideForm (`g_form`) API instead, or rethink the approach. The only place DOM work is defensible is where you own the DOM: UI Pages and the Service Portal.

## Work in Stages

Do not write hundreds of lines in one sitting, especially while learning something new - write a little, test it, and continue. It feels slower, but tracing a defect through a small increment beats hunting through a large one.

And prove out new ideas in a sandbox, not a shared development instance. Experimenting inside an update set risks promoting unwanted changes; experimenting outside one can leave your development instance behaving unlike the others. If you have no sandbox, use a ServiceNow demo instance, then build the real thing in development once you understand the approach.
