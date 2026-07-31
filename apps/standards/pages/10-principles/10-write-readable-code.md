# Write Readable Code

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
