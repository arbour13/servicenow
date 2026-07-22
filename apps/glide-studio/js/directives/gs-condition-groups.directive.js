/* <gs-condition-groups> - the AND-of-OR-groups condition builder, generalized from the markup
   originally written inline for Encoder mode so GlideRecord's and GlideAggregate's "Example
   inputs" cards can reuse it verbatim instead of duplicating the template three times.

   Usage: <gs-condition-groups groups="vm.state.grArgGroups" gs-change="vm.onFieldChange()"
                                gs-fields="vm.fieldNames(table)" gs-table="vm.state.table"></gs-condition-groups>
   `groups` is the two-way-bound array of {conds:[{field,op,value}]}; `gs-change` fires after any
   edit/add/remove (same trigger points the inline Encoder markup called vm.onEncFieldChange()).
   `gs-table` (optional) is the table used to resolve each condition's field type, which drives
   type-aware operator filtering (a boolean field never offers STARTSWITH) and date relabeling
   (on/after/before instead of is/greater than/less than) - see EncoderService.opsForField. */
angular.module('glideStudio').directive('gsConditionGroups', ['EncoderService', 'SchemaService', 'SchemaLiveService', function (EncoderService, SchemaService, SchemaLiveService) {
  'use strict';
  // Module-scoped (shared across every gs-condition-groups instance, like the original's single
  // state.choiceCache) - a field's choice list never differs between the GlideRecord and
  // GlideAggregate condition builders, so there's no reason to fetch it twice.
  var choiceCache = {};
  var choicePending = {};
  return {
    restrict: 'E',
    scope: {
      groups: '=',
      change: '&gsChange',
      conn: '=gsConn',
    },
    template:
      '<div>' +
      '  <div class="row" style="margin-bottom:10px;">' +
      '    <button type="button" class="btn btn-sm" ng-click="toggleImport()">Import encoded query</button>' +
      '  </div>' +
      '  <div class="enc-box" ng-class="{show: showImport}">' +
      '    <label class="field-label">Paste an encoded query to parse into conditions</label>' +
      '    <textarea rows="3" placeholder="active=true^priorityIN1,2^short_descriptionLIKEerror" ' +
      '              ng-class="{\'import-error\': importError}" ng-model="importText"></textarea>' +
      '    <div class="row" style="margin-top:8px;">' +
      '      <button type="button" class="btn btn-accent btn-sm" ng-click="doImport()">Parse &amp; replace conditions</button>' +
      '      <button type="button" class="btn btn-sm" ng-click="cancelImport()">Cancel</button>' +
      '    </div>' +
      '  </div>' +
      '  <div ng-repeat="g in groups">' +
      '    <div class="group-join" ng-if="!$first">' +
      '      <span class="and-sep-pill"><span class="and-sep-label">AND</span></span>' +
      '    </div>' +
      '    <div class="group">' +
      '      <div ng-repeat="c in g.conds">' +
      '        <div class="or-tag" ng-if="!$first">OR</div>' +
      '        <div class="cond-row">' +
      '          <gs-select ng-model="c.field" ng-change="onFieldPick(c)" gs-options="fieldOptions" placeholder="field name" ' +
      '                     no-options-text="{{fieldNoOptionsText()}}"></gs-select>' +
      '          <gs-select ng-model="c.op" ng-change="notify()" gs-options="opsFor(c)" placeholder="operator"></gs-select>' +
      '          <div class="cond-val-wrap">' +
      '            <input type="text" placeholder="-" disabled autocomplete="off" ng-if="valueKind(c) === \'none\'">' +
      '            <span class="between-pair" ng-if="valueKind(c) === \'between\'" ng-init="initBetween(c)">' +
      '              <input type="text" placeholder="from" autocomplete="off" ng-model="c._from" ng-change="betweenChanged(c)">' +
      '              <span class="between-sep">and</span>' +
      '              <input type="text" placeholder="to" autocomplete="off" ng-model="c._to" ng-change="betweenChanged(c)">' +
      '            </span>' +
      '            <select ng-if="valueKind(c) === \'boolean\'" ng-model="c.value" ng-change="notify()" ng-init="c.value = c.value || \'true\'">' +
      '              <option value="true">true</option>' +
      '              <option value="false">false</option>' +
      '            </select>' +
      '            <span ng-if="valueKind(c) === \'choice\'" style="flex:1;min-width:0;">' +
      '              <input type="text" placeholder="Loading choices…" disabled ng-if="!choiceOptionsFor(c)">' +
      '              <select ng-if="choiceOptionsFor(c) && choiceOptionsFor(c).length" ng-model="c.value" ng-change="notify()">' +
      '                <option value="">Choose…</option>' +
      '                <option ng-repeat="o in choiceOptionsFor(c)" value="{{o.value}}">{{o.label}}</option>' +
      '              </select>' +
      '              <input type="text" autocomplete="off" placeholder="value" ng-if="choiceOptionsFor(c) && !choiceOptionsFor(c).length" ' +
      '                     ng-model="c.value" ng-change="notify()">' +
      '            </span>' +
      '            <span ng-if="valueKind(c) === \'reference\'" style="flex:1;min-width:0;" ng-init="initRefOptions(c)">' +
      '              <gs-select ng-model="c.value" ng-change="notify()" gs-options="c._refOptions" ' +
      '                         gs-live-search="searchRef(c, query)" placeholder="Search records…"></gs-select>' +
      '            </span>' +
      '            <span ng-if="valueKind(c) === \'field\'" style="flex:1;min-width:0;">' +
      '              <gs-select ng-model="c.value" ng-change="notify()" gs-options="fieldOptions" placeholder="field name" ' +
      '                         no-options-text="{{fieldNoOptionsText()}}"></gs-select>' +
      '            </span>' +
      '            <input type="text" ng-if="valueKind(c) === \'text\'" autocomplete="off" ' +
      '                   placeholder="{{textPlaceholder(c)}}" ' +
      '                   ng-model="c.value" ng-change="notify()">' +
      '          </div>' +
      '          <button type="button" class="icon-btn" ng-click="removeCond(g, $parent.$index, $index)" title="Remove">✕</button>' +
      '        </div>' +
      '        <div class="rel-date-row" ng-if="isDateField(c)" ng-init="initRelDate(c)">' +
      '          <select ng-model="c._relKey" ng-change="applyRelDate(c)">' +
      '            <option value="">Or pick a relative date…</option>' +
      '            <optgroup label="On (period)">' +
      '              <option ng-repeat="p in relDatePeriods" value="{{p.key}}">{{p.label}}</option>' +
      '            </optgroup>' +
      '            <optgroup label="Range">' +
      '              <option ng-repeat="r in relDateRanges" value="{{r.key}}">{{r.label}}</option>' +
      '            </optgroup>' +
      '          </select>' +
      '          <input type="number" min="1" placeholder="N" style="max-width:64px;" ' +
      '                 ng-if="isRangeKey(c._relKey)" ng-model="c._relN" ng-change="applyRelDate(c)">' +
      '        </div>' +
      '      </div>' +
      '      <div class="group-foot">' +
      '        <button type="button" class="btn btn-sm" ng-click="addCond(g)">+ OR condition</button>' +
      '      </div>' +
      '    </div>' +
      '  </div>' +
      '  <button type="button" class="btn btn-ghost" ng-click="addGroup()" style="margin-top:10px;width:100%;justify-content:center;">+ Add condition group (AND)</button>' +
      '</div>',
    link: function (scope, element, attrs) {
      scope.needsValue = EncoderService.needsValue;
      // Optional gs-fields="expr" attribute supplies field-name suggestions (e.g. vm.fieldNames(table));
      // falls back to an empty list (gs-select still allows free-text entry either way).
      scope.fieldOptions = [];
      if (attrs.gsFields) {
        scope.$parent.$watch(attrs.gsFields, function (v) { scope.fieldOptions = v || []; });
      }
      scope.table = '';
      if (attrs.gsTable) {
        scope.$parent.$watch(attrs.gsTable, function (v) { scope.table = v || ''; });
      }
      scope.opsFor = function (c) { return EncoderService.opsForField(SchemaService.fieldType(c.field, scope.table)); };
      function isConnected() { return !!(scope.conn && scope.conn.status === 'connected'); }
      // fieldOptions is empty both "not connected, no table picked yet" AND "connected, fields
      // still loading" (see vm.fieldNames's connected/'|live' branch, which returns [] rather than
      // falling back to this tool's own hardcoded field list once connected) - distinguish the two
      // so a connected user doesn't read an empty field picker as "this table has no fields".
      scope.fieldNoOptionsText = function () { return isConnected() ? 'Loading fields…' : 'No options'; };
      // Which widget the value cell renders for this condition - a single source of truth so the
      // template's branches stay mutually exclusive (avoids re-deriving field type per branch and
      // risking two branches disagreeing). Precedence: no-value op -> BETWEEN -> field
      // (SAMEAS/GT_FIELD/...) -> boolean -> choice (connected) -> reference (connected) -> plain
      // text.
      scope.valueKind = function (c) {
        if (!scope.needsValue(c.op)) { return 'none'; }
        if (c.op === 'BETWEEN') { return 'between'; }
        if (EncoderService.isFieldValueOp(c.op)) { return 'field'; }
        var type = SchemaService.fieldType(c.field, scope.table);
        if (type === 'boolean' && c.op === '=') { return 'boolean'; }
        if (isConnected() && type === 'choice') { return 'choice'; }
        if (isConnected() && type === 'reference' && SchemaService.fieldRefTable(c.field, scope.table)) { return 'reference'; }
        return 'text';
      };
      // Placeholder for the plain-text value cell - a documented example format for operators
      // whose value isn't a simple literal (dynamic values, relative-date math, date-part trends,
      // ...), else the existing IN/NOT IN vs plain "value" hint.
      scope.textPlaceholder = function (c) {
        return EncoderService.valuePlaceholder(c.op) || ((c.op === 'IN' || c.op === 'NOT IN') ? 'val1,val2,…' : 'value');
      };
      // Choice values, lazily pulled once per table.field (see the module-scoped choiceCache
      // above) - returns null while loading (renders a disabled "Loading choices…" placeholder),
      // an array of {value,label} once resolved, or an empty array if the table genuinely has no
      // choices for that field (falls through to a plain text input - same as the original's
      // "cached but empty" branch, e.g. an inherited-only choice list this lookup can't see).
      scope.choiceOptionsFor = function (c) {
        var key = scope.table + '.' + c.field;
        if (choiceCache[key]) { return choiceCache[key]; }
        if (!choicePending[key]) {
          choicePending[key] = true;
          SchemaLiveService.pullFieldChoices(scope.table, c.field, scope.conn).then(function (opts) {
            choiceCache[key] = opts;
          }).catch(function () { choiceCache[key] = []; });
        }
        return null;
      };
      // Reference picker - reuses <gs-select>'s own search/debounce machinery instead of a bespoke
      // widget (unlike the original, which hand-rolls this one). c._refOptions is a per-condition
      // scratch array (mirrors c._from/c._to's pattern above): seeded with the currently-selected
      // record (if any) so its label displays correctly before any search runs, then grown in
      // place by searchRef as gs-select's gs-live-search fires.
      scope.initRefOptions = function (c) {
        if (!c._refOptions) { c._refOptions = c.value ? [{ value: c.value, label: c.valueLabel || c.value }] : []; }
      };
      scope.searchRef = function (c, query) {
        var refTable = SchemaService.fieldRefTable(c.field, scope.table);
        if (!refTable || !query) { return null; }
        return SchemaLiveService.searchReferenceRecords(refTable, query, scope.conn).then(function (results) {
          c._refOptions.length = 0;
          results.forEach(function (r) { c._refOptions.push({ value: r.sysId, label: r.label }); });
        });
      };
      // BETWEEN's canonical value is a single "from@to" string (see EncoderService/CodegenService) -
      // c._from/c._to are directive-local scratch properties on the condition object purely so the
      // two inputs have real assignable ng-model paths; re-seeded from c.value via ng-init each time
      // this row becomes a BETWEEN row (e.g. after switching operators back and forth).
      scope.initBetween = function (c) {
        var parts = (c.value || '').split('@');
        c._from = parts[0] || '';
        c._to = parts[1] || '';
      };
      scope.betweenChanged = function (c) {
        c.value = (c._from || '') + '@' + (c._to || '');
        scope.notify();
      };
      // Relative-date preset picker - shown below the row for date fields only. c._relKey/c._relN
      // are directive-local scratch properties (same pattern as c._from/c._to above): re-detected
      // from c.op/c.value via ng-init each time this row becomes a date row.
      scope.relDatePeriods = EncoderService.RELATIVE_DATE_PERIODS;
      scope.relDateRanges = EncoderService.RELATIVE_DATE_RANGES;
      scope.isRangeKey = EncoderService.isRangeKey;
      scope.isDateField = function (c) {
        var type = SchemaService.fieldType(c.field, scope.table);
        return type === 'glide_date' || type === 'glide_date_time';
      };
      scope.initRelDate = function (c) {
        var detected = EncoderService.detectRelativeDatePreset(c);
        c._relKey = detected.key;
        c._relN = detected.n != null ? detected.n : 7;
      };
      scope.applyRelDate = function (c) {
        if (!c._relKey) { c.op = '='; c.value = ''; } else { EncoderService.applyRelativeDatePreset(c, c._relKey, parseInt(c._relN, 10) || 7); }
        scope.notify();
      };
      // When the field changes, re-sync the operator to one still valid for the new type (e.g.
      // switching from a string field with STARTSWITH selected to a boolean field snaps the
      // operator back to '=') - matches the original's syncOpSelect.
      scope.onFieldPick = function (c) {
        c.op = EncoderService.effectiveOp(c.op, SchemaService.fieldType(c.field, scope.table));
        scope.notify();
      };
      scope.notify = function () { scope.change(); };

      // "Import encoded query" - a successful parse REPLACES scope.groups wholesale with a fresh
      // array. Safe here because it's a one-time write from a click handler, not something
      // re-evaluated every digest, so it doesn't trip the isolate `=` binding infdig pattern
      // documented elsewhere in this app (that class of bug only bites when a *function* feeding
      // the binding is re-invoked every digest and returns a new reference
      // each time - a single explicit reassignment is exactly what two-way binding is for).
      scope.showImport = false;
      scope.importText = '';
      scope.importError = false;
      scope.toggleImport = function () { scope.showImport = !scope.showImport; };
      scope.cancelImport = function () { scope.showImport = false; scope.importText = ''; scope.importError = false; };
      scope.doImport = function () {
        var parsed = EncoderService.parseEncoded(scope.importText);
        if (parsed.length) {
          scope.groups = parsed;
          scope.showImport = false;
          scope.importText = '';
          scope.importError = false;
          scope.notify();
        } else {
          scope.importError = true;
          setTimeout(function () { scope.$applyAsync(function () { scope.importError = false; }); }, 1200);
        }
      };

      scope.addGroup = function () { scope.groups.push({ conds: [{ field: '', op: '=', value: '' }] }); scope.notify(); };
      scope.addCond = function (g) { g.conds.push({ field: '', op: '=', value: '' }); scope.notify(); };
      scope.removeCond = function (g, gi, ci) {
        g.conds.splice(ci, 1);
        if (!g.conds.length) { scope.groups.splice(gi, 1); }
        if (!scope.groups.length) { scope.addGroup(); return; }
        scope.notify();
      };
    },
  };
}]);
