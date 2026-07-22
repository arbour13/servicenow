function () {
  'use strict';

  // Full operator set verified against ServiceNow's own addQuery()/encoded-query grammar (not
  // just the handful a typical condition builder exposes by default): comparison + string-match +
  // set + empty-check operators every condition builder has, plus the less common ones ServiceNow
  // also supports - date-relative (RELATIVEGT/GE/EE/LE/LT, LESSTHAN/MORETHAN, DATEPART, NOTON),
  // field-to-field comparison (SAMEAS/NSAMEAS/GT_FIELD/GT_OR_EQUALS_FIELD/LT_FIELD/
  // LT_OR_EQUALS_FIELD), dynamic values (DYNAMIC), and change-tracking (VALCHANGES/CHANGESFROM/
  // CHANGESTO, most useful in Business Rule conditions rather than a plain GlideRecord query, but
  // valid query-grammar operators regardless). Internal key === wire token for every operator
  // except CONTAINS/DOES NOT CONTAIN (ENC_OP_MAP below maps those to the real LIKE/NOT LIKE
  // tokens - ServiceNow's scripting API accepts CONTAINS as an addQuery() alias, but the actual
  // encoded-query string on the wire always uses LIKE).
  var OPS = [
    ['=', 'is'], ['!=', 'is not'], ['>', 'greater than'], ['<', 'less than'],
    ['>=', 'greater than or equal'], ['<=', 'less than or equal'],
    ['IN', 'is one of'], ['NOT IN', 'is not one of'],
    ['STARTSWITH', 'starts with'], ['ENDSWITH', 'ends with'],
    ['CONTAINS', 'contains'], ['DOES NOT CONTAIN', 'does not contain'],
    ['ISEMPTY', 'is empty'], ['ISNOTEMPTY', 'is not empty'], ['EMPTYSTRING', 'is empty string'],
    ['ANYTHING', 'is anything'],
    ['ON', 'on (date)'], ['NOTON', 'not on (date)'], ['BETWEEN', 'between'],
    ['SAMEAS', 'is same as (field)'], ['NSAMEAS', 'is different from (field)'],
    ['GT_FIELD', 'greater than (field)'], ['GT_OR_EQUALS_FIELD', 'greater than or equal to (field)'],
    ['LT_FIELD', 'less than (field)'], ['LT_OR_EQUALS_FIELD', 'less than or equal to (field)'],
    ['LESSTHAN', 'is less than (relative to field)'], ['MORETHAN', 'is more than (relative to field)'],
    ['DATEPART', 'date part trend'],
    ['RELATIVEGT', 'relative: greater than'], ['RELATIVEGE', 'relative: greater than or equal'],
    ['RELATIVEEE', 'relative: equals'], ['RELATIVELE', 'relative: less than or equal'], ['RELATIVELT', 'relative: less than'],
    ['DYNAMIC', 'is (dynamic value)'],
    ['VALCHANGES', 'changes'], ['CHANGESFROM', 'changes from'], ['CHANGESTO', 'changes to'],
  ].map(function (pair) { return { value: pair[0], label: pair[1] }; });

  // Wire-format token for each internal op key - identical to the key itself except CONTAINS/DOES
  // NOT CONTAIN (see header comment above); listed explicitly (not left to a fallback) so the
  // full operator set is visible in one place.
  var ENC_OP_MAP = {
    '=': '=', '!=': '!=', '>': '>', '<': '<', '>=': '>=', '<=': '<=',
    'IN': 'IN', 'NOT IN': 'NOT IN',
    'STARTSWITH': 'STARTSWITH', 'ENDSWITH': 'ENDSWITH',
    'CONTAINS': 'LIKE', 'DOES NOT CONTAIN': 'NOT LIKE',
    'ISEMPTY': 'ISEMPTY', 'ISNOTEMPTY': 'ISNOTEMPTY', 'EMPTYSTRING': 'EMPTYSTRING', 'ANYTHING': 'ANYTHING',
    'ON': 'ON', 'NOTON': 'NOTON', 'BETWEEN': 'BETWEEN',
    'SAMEAS': 'SAMEAS', 'NSAMEAS': 'NSAMEAS',
    'GT_FIELD': 'GT_FIELD', 'GT_OR_EQUALS_FIELD': 'GT_OR_EQUALS_FIELD',
    'LT_FIELD': 'LT_FIELD', 'LT_OR_EQUALS_FIELD': 'LT_OR_EQUALS_FIELD',
    'LESSTHAN': 'LESSTHAN', 'MORETHAN': 'MORETHAN', 'DATEPART': 'DATEPART',
    'RELATIVEGT': 'RELATIVEGT', 'RELATIVEGE': 'RELATIVEGE', 'RELATIVEEE': 'RELATIVEEE', 'RELATIVELE': 'RELATIVELE', 'RELATIVELT': 'RELATIVELT',
    'DYNAMIC': 'DYNAMIC',
    'VALCHANGES': 'VALCHANGES', 'CHANGESFROM': 'CHANGESFROM', 'CHANGESTO': 'CHANGESTO',
  };

  // Which operators are valid per field type - a condition row filters its operator <select> down
  // to these, so e.g. a boolean field never offers STARTSWITH. Falls back to 'string' (every op)
  // for any type not listed here (e.g. an unrecognized/custom type). Additive: every type keeps
  // its original narrow set (string never offered BETWEEN, boolean never offered STARTSWITH, ...)
  // plus whichever of the operators above are semantically type-appropriate (comparison ops ->
  // numeric/date, string-match ops -> string/reference/list, date-only ops -> date fields, and
  // the type-agnostic ones - ANYTHING/SAMEAS/NSAMEAS/DYNAMIC/VALCHANGES/CHANGESFROM/CHANGESTO -
  // everywhere).
  var TYPE_OPS = {
    string: ['=', '!=', 'STARTSWITH', 'ENDSWITH', 'CONTAINS', 'DOES NOT CONTAIN', 'ISEMPTY', 'ISNOTEMPTY', 'EMPTYSTRING', 'IN', 'NOT IN', 'ANYTHING', 'SAMEAS', 'NSAMEAS', 'DYNAMIC', 'VALCHANGES', 'CHANGESFROM', 'CHANGESTO'],
    integer: ['=', '!=', '>', '<', '>=', '<=', 'BETWEEN', 'ISEMPTY', 'ISNOTEMPTY', 'IN', 'NOT IN', 'ANYTHING', 'GT_FIELD', 'GT_OR_EQUALS_FIELD', 'LT_FIELD', 'LT_OR_EQUALS_FIELD', 'SAMEAS', 'NSAMEAS', 'DYNAMIC', 'VALCHANGES', 'CHANGESFROM', 'CHANGESTO'],
    decimal: ['=', '!=', '>', '<', '>=', '<=', 'BETWEEN', 'ISEMPTY', 'ISNOTEMPTY', 'ANYTHING', 'GT_FIELD', 'GT_OR_EQUALS_FIELD', 'LT_FIELD', 'LT_OR_EQUALS_FIELD', 'SAMEAS', 'NSAMEAS', 'DYNAMIC', 'VALCHANGES', 'CHANGESFROM', 'CHANGESTO'],
    boolean: ['=', 'ISEMPTY', 'ISNOTEMPTY', 'ANYTHING', 'SAMEAS', 'NSAMEAS', 'DYNAMIC', 'VALCHANGES', 'CHANGESFROM', 'CHANGESTO'],
    reference: ['=', '!=', 'IN', 'NOT IN', 'STARTSWITH', 'CONTAINS', 'ENDSWITH', 'DOES NOT CONTAIN', 'ISEMPTY', 'ISNOTEMPTY', 'EMPTYSTRING', 'ANYTHING', 'SAMEAS', 'NSAMEAS', 'DYNAMIC', 'VALCHANGES', 'CHANGESFROM', 'CHANGESTO'],
    glide_date: ['=', '!=', '>', '<', '>=', '<=', 'BETWEEN', 'ON', 'NOTON', 'ISEMPTY', 'ISNOTEMPTY', 'ANYTHING', 'LESSTHAN', 'MORETHAN', 'DATEPART', 'RELATIVEGT', 'RELATIVEGE', 'RELATIVEEE', 'RELATIVELE', 'RELATIVELT', 'GT_FIELD', 'GT_OR_EQUALS_FIELD', 'LT_FIELD', 'LT_OR_EQUALS_FIELD', 'SAMEAS', 'NSAMEAS', 'DYNAMIC', 'VALCHANGES', 'CHANGESFROM', 'CHANGESTO'],
    glide_date_time: ['=', '!=', '>', '<', '>=', '<=', 'BETWEEN', 'ON', 'NOTON', 'ISEMPTY', 'ISNOTEMPTY', 'ANYTHING', 'LESSTHAN', 'MORETHAN', 'DATEPART', 'RELATIVEGT', 'RELATIVEGE', 'RELATIVEEE', 'RELATIVELE', 'RELATIVELT', 'GT_FIELD', 'GT_OR_EQUALS_FIELD', 'LT_FIELD', 'LT_OR_EQUALS_FIELD', 'SAMEAS', 'NSAMEAS', 'DYNAMIC', 'VALCHANGES', 'CHANGESFROM', 'CHANGESTO'],
    choice: ['=', '!=', 'IN', 'NOT IN', 'ISEMPTY', 'ISNOTEMPTY', 'ANYTHING', 'SAMEAS', 'NSAMEAS', 'DYNAMIC', 'VALCHANGES', 'CHANGESFROM', 'CHANGESTO'],
    glide_list: ['CONTAINS', 'DOES NOT CONTAIN', 'ISEMPTY', 'ISNOTEMPTY', 'EMPTYSTRING', 'ANYTHING'],
  };
  // Date fields relabel a handful of operators to read naturally ("on"/"after"/"before" instead
  // of "is"/"greater than"/"less than") - everything not listed here keeps its normal OPS label.
  var DATE_LABELS = { '=': 'on', '!=': 'not on', '>': 'after', '<': 'before', '>=': 'on or after', '<=': 'on or before' };

  function opsForType(type) { return TYPE_OPS[type] || TYPE_OPS.string; }
  // The operator <select>'s option list for a field type: filtered to valid ops, with date
  // fields' labels swapped in. Returns [{value,label}], same shape as OPS.
  // Memoized by type: called from an ng-repeat expression (gs-condition-groups' `o in
  // opsFor(c)`) re-evaluated every digest - a fresh array/objects on every call looks like a
  // "change" to Angular's watchers every single digest, which previously caused a real
  // $rootScope:infdig (infinite digest) error (same root cause as vm.fieldNames's fix). Returning
  // the same cached array/object references for a given type keeps every binding stable.
  var opsForFieldCache = {};
  function opsForField(type) {
    var key = type || '';
    if (!opsForFieldCache[key]) {
      var allowed = opsForType(type);
      var isDate = type === 'glide_date' || type === 'glide_date_time';
      opsForFieldCache[key] = OPS.filter(function (o) { return allowed.indexOf(o.value) !== -1; })
        .map(function (o) { return { value: o.value, label: (isDate && DATE_LABELS[o.value]) ? DATE_LABELS[o.value] : o.label }; });
    }
    return opsForFieldCache[key];
  }
  // The operator to keep selected after the field (and so its type/allowed-ops) changes - the
  // current op if still valid, else the type's first allowed op.
  function effectiveOp(currentOp, type) {
    var allowed = opsForType(type);
    return allowed.indexOf(currentOp) !== -1 ? currentOp : (allowed[0] || '=');
  }

  var NO_VALUE_OPS = { ISEMPTY: true, ISNOTEMPTY: true, ANYTHING: true, EMPTYSTRING: true, VALCHANGES: true };
  function needsValue(op) { return !NO_VALUE_OPS[op]; }
  // Operators whose value is a FIELD NAME on the same table, not a literal - gs-condition-groups
  // renders these as a field picker rather than a free-text box.
  var FIELD_VALUE_OPS = { SAMEAS: true, NSAMEAS: true, GT_FIELD: true, GT_OR_EQUALS_FIELD: true, LT_FIELD: true, LT_OR_EQUALS_FIELD: true };
  // Example value formats for the operators whose expected input isn't a plain literal - shown as
  // the value input's placeholder so these are at least discoverable without external docs.
  // Ported from ServiceNow's own GlideSystem (gs) date-math API and documented encoded-query
  // examples (see this file's header comment for sourcing).
  var VALUE_PLACEHOLDERS = {
    DYNAMIC: 'dynamic value sys_id, e.g. javascript:gs.getUserID()',
    LESSTHAN: 'other_field@day@before@3',
    MORETHAN: 'other_field@day@before@1',
    DATEPART: 'Monday@javascript:gs.daysAgoStart(0)',
    RELATIVEGT: '@hour@ago@1', RELATIVEGE: '@hour@ago@1', RELATIVEEE: '@hour@ago@1',
    RELATIVELE: '@hour@ago@1', RELATIVELT: '@hour@ago@1',
    CHANGESFROM: 'old value', CHANGESTO: 'new value',
    ON: 'Today@javascript:gs.beginningOfToday()@javascript:gs.endOfToday()',
    NOTON: 'Today@javascript:gs.beginningOfToday()@javascript:gs.endOfToday()',
  };
  function valuePlaceholder(op) { return VALUE_PLACEHOLDERS[op] || ''; }

  function encodeGroups(groups) {
    var segments = [];
    (groups || []).forEach(function (g) {
      var conds = g.conds.filter(function (c) { return c.field.trim() !== '' || !needsValue(c.op); });
      if (!conds.length) { return; }
      var groupStr = conds.map(function (c) {
        var opCode = ENC_OP_MAP[c.op] || c.op;
        var val = needsValue(c.op) ? (c.value || '') : '';
        return c.field + opCode + val;
      }).join('^OR');
      // Plain '^' resumes AND after the preceding group's '^OR' chain closes (ServiceNow encoded
      // query operator precedence: '^OR' binds to the immediately preceding condition, so a bare
      // '^' after it starts a new AND-ed term).
      if (segments.length > 0) { segments.push('^' + groupStr); }
      else { segments.push(groupStr); }
    });
    return segments.join('');
  }

  function genEncoder(groups) {
    var q = encodeGroups(groups).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    return "var encodedQuery = '" + q + "';";
  }

  // "Import encoded query" - the inverse of encodeGroups(): parses a real ServiceNow encoded
  // query string back into condition groups. IMPORT_OP_MAP is ENC_OP_MAP's inverse for the two
  // operators whose app-internal code differs from the raw encoded-query operator (LIKE/NOTLIKE
  // -> CONTAINS/DOES NOT CONTAIN); every other operator's raw code and app-internal code are
  // identical.
  var IMPORT_OP_MAP = { LIKE: 'CONTAINS', NOTLIKE: 'DOES NOT CONTAIN' };
  // Ordered so no token is a false-prefix match of a longer one that shares its start (>= before
  // >, NOT IN/NOTLIKE before IN/LIKE, etc.) - every new token added here was checked against this
  // same rule (none of the new tokens are a strict prefix of another, so their relative order
  // among themselves doesn't matter, only their position relative to the pre-existing ones above).
  var TOKEN_RE = /^([a-zA-Z0-9_.]+?)(>=|<=|!=|=|>|<|ISNOTEMPTY|ISEMPTY|EMPTYSTRING|STARTSWITH|ENDSWITH|NOT IN|NOTLIKE|LIKE|IN|BETWEEN|NOTON|ON|GT_OR_EQUALS_FIELD|GT_FIELD|LT_OR_EQUALS_FIELD|LT_FIELD|RELATIVEGE|RELATIVEGT|RELATIVEEE|RELATIVELE|RELATIVELT|LESSTHAN|MORETHAN|DATEPART|NSAMEAS|SAMEAS|ANYTHING|DYNAMIC|VALCHANGES|CHANGESFROM|CHANGESTO)(.*)$/;
  function parseToken(token) {
    var m = token.match(TOKEN_RE);
    if (!m) { return null; }
    var field = m[1];
    var op = m[2];
    var value = m[3];
    if (IMPORT_OP_MAP[op]) { op = IMPORT_OP_MAP[op]; }
    if (NO_VALUE_OPS[op]) { value = ''; }
    if (!OPS.some(function (o) { return o.value === op; })) { return null; }
    return { field: field, op: op, value: value };
  }
  // '^OR' binds to the immediately preceding group (OR-condition within it); a bare '^' or '^NQ'
  // starts a new AND-ed group - '^NQ' is technically a "New Query" union, but accepted here too
  // since a pasted query built by this same app (or a hand-written one) commonly uses it where a
  // plain '^' was intended (see encodeGroups' own header comment on that exact confusion).
  function parseEncoded(str) {
    var parts = String(str || '').split('^');
    var groups = [];
    var current = null;
    parts.forEach(function (raw) {
      if (raw.trim() === '') { return; }
      var token = raw.trim();
      var isOr = false;
      if (/^OR/i.test(token)) { isOr = true; token = token.slice(2); }
      else if (/^NQ/i.test(token)) { token = token.slice(2); }
      var cond = parseToken(token);
      if (!cond) { return; }
      if (isOr && current) { current.conds.push(cond); }
      else { current = { conds: [cond] }; groups.push(current); }
    });
    return groups;
  }

  // Relative-date presets for the encoded-query condition builders. Method names verified
  // against ServiceNow's documented GlideSystem (gs) API: beginningOf<Period>()/endOf<Period>()
  // pairs, and daysAgoStart(N)/hoursAgoStart(N).
  var RELATIVE_DATE_PERIODS = [
    { key: 'today', label: 'Today', text: 'Today', gs: 'Today' },
    { key: 'yesterday', label: 'Yesterday', text: 'Yesterday', gs: 'Yesterday' },
    { key: 'thisWeek', label: 'This week', text: 'This week', gs: 'ThisWeek' },
    { key: 'lastWeek', label: 'Last week', text: 'Last week', gs: 'LastWeek' },
    { key: 'nextWeek', label: 'Next week', text: 'Next week', gs: 'NextWeek' },
    { key: 'thisMonth', label: 'This month', text: 'This month', gs: 'ThisMonth' },
    { key: 'lastMonth', label: 'Last month', text: 'Last month', gs: 'LastMonth' },
    { key: 'nextMonth', label: 'Next month', text: 'Next month', gs: 'NextMonth' },
    { key: 'thisQuarter', label: 'This quarter', text: 'This quarter', gs: 'ThisQuarter' },
    { key: 'lastQuarter', label: 'Last quarter', text: 'Last quarter', gs: 'LastQuarter' },
    { key: 'nextQuarter', label: 'Next quarter', text: 'Next quarter', gs: 'NextQuarter' },
    { key: 'thisYear', label: 'This year', text: 'This year', gs: 'ThisYear' },
    { key: 'lastYear', label: 'Last year', text: 'Last year', gs: 'LastYear' },
    { key: 'nextYear', label: 'Next year', text: 'Next year', gs: 'NextYear' },
  ];
  var RELATIVE_DATE_RANGES = [
    { key: 'lastNDays', label: 'Last N days', op: '>=', gsFn: 'daysAgoStart' },
    { key: 'lastNHours', label: 'Last N hours', op: '>=', gsFn: 'hoursAgoStart' },
    { key: 'moreThanNDaysAgo', label: 'More than N days ago', op: '<', gsFn: 'daysAgoStart' },
  ];
  function applyRelativeDatePreset(c, key, n) {
    var period = RELATIVE_DATE_PERIODS.filter(function (p) { return p.key === key; })[0];
    if (period) {
      c.op = 'ON';
      c.value = period.text + '@javascript:gs.beginningOf' + period.gs + '()@javascript:gs.endOf' + period.gs + '()';
      return;
    }
    var range = RELATIVE_DATE_RANGES.filter(function (r) { return r.key === key; })[0];
    if (range) {
      c.op = range.op;
      c.value = 'javascript:gs.' + range.gsFn + '(' + n + ')';
    }
  }
  function detectRelativeDatePreset(c) {
    if (c.op === 'ON') {
      var period = RELATIVE_DATE_PERIODS.filter(function (p) {
        return c.value === p.text + '@javascript:gs.beginningOf' + p.gs + '()@javascript:gs.endOf' + p.gs + '()';
      })[0];
      return { key: period ? period.key : '', n: null };
    }
    var m = /^javascript:gs\.(days|hours)AgoStart\((-?\d+)\)$/.exec(c.value || '');
    if (m) {
      var unit = m[1]; var n = parseInt(m[2], 10);
      var range = RELATIVE_DATE_RANGES.filter(function (r) { return r.gsFn === unit + 'AgoStart' && r.op === c.op; })[0];
      if (range) { return { key: range.key, n: n }; }
    }
    return { key: '', n: null };
  }
  function isRangeKey(key) { return RELATIVE_DATE_RANGES.some(function (r) { return r.key === key; }); }

  return {
    OPS: OPS,
    needsValue: needsValue,
    isFieldValueOp: function (op) { return !!FIELD_VALUE_OPS[op]; },
    valuePlaceholder: valuePlaceholder,
    opsForField: opsForField,
    effectiveOp: effectiveOp,
    encodeGroups: encodeGroups,
    genEncoder: genEncoder,
    parseEncoded: parseEncoded,
    RELATIVE_DATE_PERIODS: RELATIVE_DATE_PERIODS,
    RELATIVE_DATE_RANGES: RELATIVE_DATE_RANGES,
    applyRelativeDatePreset: applyRelativeDatePreset,
    detectRelativeDatePreset: detectRelativeDatePreset,
    isRangeKey: isRangeKey,
  };
}