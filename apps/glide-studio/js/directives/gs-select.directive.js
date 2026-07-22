/* <gs-select> - searchable dropdown (select2-style: search box always shown, even for short
   fixed lists), used in place of every plain native <select> in the app.

   Two option modes, auto-detected from the first item's type:
     - Plain strings -> value IS the label (table/field names): free-text entry allowed via a
       "+ Use "typed"" option (there's no fixed set of valid tables/fields).
     - {value,label} objects -> a closed enum (Operation, Returns, an operator list, ...): no
       free-text entry (there's no such thing as a custom Operation), search matches the LABEL,
       ngModel holds the VALUE.

   Usage:
     <gs-select ng-model="vm.state.table" gs-options="vm.tables" placeholder="table name"></gs-select>
     <gs-select ng-model="vm.state.operation" gs-options="vm.operations" placeholder="operation"></gs-select>
     <gs-select ng-model="c.field" gs-options="vm.fieldsFor(table)" gs-exclude="isExcluded(name)"
                placeholder="field" no-options-text="No fields for this table"></gs-select>

   Connected mode: gs-options="vm.tables" ALSO reflects live-discovered tables automatically -
   SchemaService.addLiveTable mutates that same array in place (push, never reassigned), so once
   this directive's isolate scope holds a reference to it, new entries show up with no rebind
   needed (see SchemaService's own comment for why that in-place-mutation choice matters - and why
   any *other* gs-options source that gets reassigned instead of mutated, e.g. a computed enum
   list that changes per operation, must follow the same in-place-mutation discipline or risk the
   $rootScope:infdig bug documented at length elsewhere in this app). The only extra wiring needed
   for live search is triggering it and re-filtering once it resolves:
     <gs-select ng-model="vm.state.table" gs-options="vm.tables"
                gs-live-search="vm.searchTables(query)" placeholder="table name"></gs-select>
   gs-live-search is invoked (debounced) with the current search text; it should return a promise
   and is expected to have already pushed any results into the gs-options array as a side effect.

   Integrates with ngModel properly (require: 'ngModel') rather than a bespoke two-way binding,
   so it behaves like any other form control (works inside ng-form, $setViewValue triggers
   validators/watchers normally). */
angular.module('glideStudio').directive('gsSelect', ['$timeout', function ($timeout) {
  'use strict';
  var CHEV = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  return {
    restrict: 'E',
    require: 'ngModel',
    scope: {
      options: '=gsOptions',
      exclude: '&gsExclude',
      liveSearch: '&gsLiveSearch',
      labelFor: '&gsLabelFor',
    },
    template:
      '<div class="gs-sel-wrap">' +
      '  <button type="button" class="gs-sel-trigger" ng-class="{open: isOpen}" ng-click="toggle($event)">' +
      '    <span class="gs-sel-val" ng-class="{placeholder: !currentLabel}">{{currentLabel || placeholder}}</span>' +
      '    <span class="gs-sel-chevron">' + CHEV + '</span>' +
      '  </button>' +
      '  <div class="gs-sel-dropdown" ng-class="{open: isOpen}">' +
      // NOTE: no ng-if here (unlike the sibling nodes below) - ng-if creates a child scope, and
      // this input's ng-model="query" is a primitive, so a write from a child scope would create
      // a shadowing own-property there instead of updating the isolate scope buildList() reads
      // from (the classic Angular primitive/child-scope "dot rule" gotcha). The parent
      // .gs-sel-dropdown's display:none already fully hides this while closed, so ng-if buys
      // nothing here and only introduces the bug.
      '    <div class="gs-sel-search-wrap">' +
      '      <input type="text" class="gs-sel-search" ng-model="query" ng-change="buildList()" ' +
      '             ng-keydown="onKeydown($event)" placeholder="Search…" autocomplete="off">' +
      '    </div>' +
      '    <div class="gs-sel-opt" ng-if="isOpen && !filtered.length && !query" >{{noOptionsText || \'No options\'}}</div>' +
      '    <div class="gs-sel-opt" ng-class="{selected: optValue(o) === current}" ng-repeat="o in filtered" ' +
      '         ng-mousedown="$event.preventDefault(); pick(o)">' +
      '      <span class="gs-sel-opt-label">{{optDisplayLabel(o)}}</span>' +
      '      <span class="gs-sel-opt-name" ng-if="optSecondaryName(o)">{{optSecondaryName(o)}}</span>' +
      '    </div>' +
      '    <div class="gs-sel-opt gs-sel-custom-opt" ng-if="isOpen && showCustom" ' +
      '         ng-mousedown="$event.preventDefault(); setValue(query.trim())">+ Use "{{query.trim()}}"</div>' +
      '  </div>' +
      '</div>',
    link: function (scope, element, attrs, ngModelCtrl) {
      scope.placeholder = attrs.placeholder || '';
      // $observe, not a one-time read - every current usage is a static string EXCEPT the table
      // pickers' own "Type to search tables…" vs "No options" (see index.html), which needs to
      // track vm.connection.status changing while the field is already on the page (i.e. the user
      // connects mid-session, not just on a fresh load).
      attrs.$observe('noOptionsText', function (val) { scope.noOptionsText = val || ''; });
      scope.current = '';
      scope.currentLabel = '';
      scope.isOpen = false;
      scope.query = '';
      scope.filtered = [];
      scope.showCustom = false;

      // {value,label} objects vs plain strings - see file header. Re-checked on every
      // refreshFiltered() call (cheap - one typeof check) rather than cached once, since some
      // gs-options sources start out empty (options load in later, e.g. before a connected-mode
      // pull resolves) and mode must be re-detected once real items arrive.
      function isObjMode() { return !!(scope.options && scope.options.length && typeof scope.options[0] === 'object'); }
      scope.optValue = function (o) { return isObjMode() ? o.value : o; };
      scope.optLabel = function (o) { return isObjMode() ? o.label : o; };
      // Optional two-line option rows: a gs-label-for="fn(name)" lookup can supply a human label
      // for a plain-string option (table names, live-discovered via Connected mode) - primary
      // line becomes the label, secondary line shows the technical name muted underneath.
      // String-mode only; a closed {value,label} enum already carries its own label and has no
      // separate "technical name" to show.
      function knownLabel(o) {
        if (isObjMode() || !attrs.gsLabelFor) { return ''; }
        var v = scope.optValue(o);
        var l = scope.labelFor({ name: v });
        return (l && l !== v) ? l : '';
      }
      scope.optDisplayLabel = function (o) { return knownLabel(o) || scope.optLabel(o); };
      scope.optSecondaryName = function (o) { return knownLabel(o) ? scope.optValue(o) : ''; };
      function findByValue(v) {
        if (!isObjMode()) { return null; }
        return (scope.options || []).filter(function (o) { return o.value === v; })[0] || null;
      }

      ngModelCtrl.$render = function () {
        scope.current = ngModelCtrl.$viewValue || '';
        var match = findByValue(scope.current);
        scope.currentLabel = match ? match.label : scope.current;
      };

      // Pure local filter/render - no side effects, safe to call from anywhere (including after
      // a live search resolves) without re-triggering another search.
      function refreshFiltered() {
        var opts = scope.options || [];
        if (attrs.gsExclude) { opts = opts.filter(function (n) { return !scope.exclude({ name: scope.optValue(n) }); }); }
        var q = (scope.query || '').toLowerCase().trim();
        scope.filtered = q ? opts.filter(function (o) { return scope.optLabel(o).toLowerCase().indexOf(q) !== -1; }) : opts;
        // Free-text "+ Use ..." only makes sense for open-ended string lists (table/field names) -
        // a fixed {value,label} enum (Operation, Returns, ...) has no such thing as a custom entry.
        var typed = (scope.query || '').trim();
        scope.showCustom = !isObjMode() && !!typed && opts.indexOf(typed) === -1;
        // Re-sync the displayed label in case options arrived/changed after $render last ran
        // (e.g. a live pull resolved, or an enum's option list was swapped for a new operation).
        var match = findByValue(scope.current);
        if (match) { scope.currentLabel = match.label; }
      }
      // Called from user-facing entry points (search input, opening the dropdown): filters
      // immediately AND kicks off a live search if configured.
      scope.buildList = function () {
        refreshFiltered();
        if (attrs.gsLiveSearch) { triggerLiveSearch(); }
      };

      // Debounced (300ms) live search - never fires on an empty query, never re-filters after a
      // stale response (the query changed, or the dropdown closed, while the request was in
      // flight). gs-live-search's own implementation is expected to push results into the
      // gs-options array as a side effect (see SchemaLiveService.searchInstanceTables); this just
      // re-runs the LOCAL filter afterward so the new entries show up - calling refreshFiltered()
      // directly here (not buildList()) is deliberate, since buildList() would re-trigger another
      // search of the same unchanged query every time one completes, looping forever.
      var liveSearchTimer = null;
      function triggerLiveSearch() {
        var q = scope.query;
        if (liveSearchTimer) { $timeout.cancel(liveSearchTimer); }
        if (!q || !q.trim()) { return; }
        liveSearchTimer = $timeout(function () {
          var result = scope.liveSearch({ query: q.trim() });
          if (result && result.then) {
            result.then(function () {
              if (scope.isOpen && scope.query === q) { refreshFiltered(); }
            });
          }
        }, 300);
      }

      scope.setValue = function (v) {
        ngModelCtrl.$setViewValue(v);
        scope.current = v;
        var match = findByValue(v);
        scope.currentLabel = match ? match.label : v;
        scope.close();
      };
      // Click handler for a rendered option row: o is the raw option (string, or {value,label}).
      scope.pick = function (o) { scope.setValue(scope.optValue(o)); };

      var triggerEl, dropdownEl;
      function position() {
        var rect = triggerEl.getBoundingClientRect();
        dropdownEl.style.top = (rect.bottom + 3) + 'px';
        dropdownEl.style.left = rect.left + 'px';
        dropdownEl.style.width = Math.max(rect.width, 180) + 'px';
      }

      scope.open = function () {
        triggerEl = element[0].querySelector('.gs-sel-trigger');
        dropdownEl = element[0].querySelector('.gs-sel-dropdown');
        scope.query = '';
        scope.isOpen = true;
        scope.buildList();
        // Position SYNCHRONOUSLY, before this digest even applies the `open` class that makes the
        // dropdown visible (.gs-sel-dropdown itself has no ng-if - see the template comment above
        // - so triggerEl/dropdownEl already exist and getBoundingClientRect() is safe to read
        // right now). Deferring this into a setTimeout(0), like an earlier version of this
        // function did, left a real window where the dropdown could paint at position:fixed's
        // default (viewport top-left, since no inline top/left is set yet) before snapping into
        // place a tick later - normally too fast to notice, but a scroll landing in that window
        // (a wheel event forces a synchronous style/layout flush) could catch and show it,
        // reading as the dropdown briefly rendering "strangely" right after opening.
        position();
        // Only focus() still needs to wait - the search input isn't `display:none` (so no timing
        // bug there either), but calling .focus() before this digest's DOM writes have actually
        // been applied can silently no-op in some browsers.
        setTimeout(function () {
          var input = element[0].querySelector('.gs-sel-search');
          if (input) { input.focus(); }
        }, 0);
      };
      scope.close = function () { scope.isOpen = false; };
      scope.toggle = function (e) {
        e.stopPropagation();
        if (scope.isOpen) { scope.$applyAsync(scope.close); } else { scope.$applyAsync(scope.open); }
      };
      scope.onKeydown = function (e) {
        if (e.key === 'Escape') { scope.close(); }
        if (e.key === 'Enter') {
          e.preventDefault();
          var t = (scope.query || '').trim();
          if (t) { scope.setValue(t); }
        }
      };

      var docHandler = function (e) {
        if (scope.isOpen && !element[0].contains(e.target)) { scope.$applyAsync(scope.close); }
      };
      document.addEventListener('click', docHandler);
      scope.$on('$destroy', function () { document.removeEventListener('click', docHandler); });
    },
  };
}]);

// One shared listener (not one per <gs-select> instance) that closes every open dropdown when
// the page scrolls anywhere outside the dropdown itself - position:fixed dropdowns don't track
// their trigger on scroll, so without this a fast scroll leaves them visually detached.
//
// Closes the class DIRECTLY (classList.remove), not just via each dropdown's isolate scope +
// $applyAsync - an earlier version of this listener only went through Angular (s.close() +
// $applyAsync), which SCHEDULES a digest rather than running one immediately. Scroll events fire
// repeatedly (many times a second) for the duration of a scroll gesture; if the browser keeps
// firing them back-to-back without an idle gap, that scheduled digest can end up deferred for the
// whole gesture, so the dropdown stays visually open - still showing `display:block` at its
// original (now-stale) position:fixed coordinates - and visibly detaches from its trigger as the
// page scrolls underneath it, exactly the "displays strangely" symptom this is fixing. Direct
// classList removal takes effect on the very next paint regardless of digest timing; s.close()
// (still called right after) keeps the Angular model in sync for whenever the digest does catch
// up, so ng-class's own re-evaluation agrees with what's already on screen instead of fighting it.
document.addEventListener('scroll', function (e) {
  if (e.target && e.target.closest && e.target.closest('.gs-sel-dropdown')) { return; }
  var openDropdowns = document.querySelectorAll('.gs-sel-dropdown.open');
  if (!openDropdowns.length) { return; }
  openDropdowns.forEach(function (dd) {
    dd.classList.remove('open');
    var trigger = dd.parentNode && dd.parentNode.querySelector('.gs-sel-trigger');
    if (trigger) { trigger.classList.remove('open'); }
    var s = angular.element(dd).scope();
    if (s && s.close) { s.close(); }
  });
  var root = angular.element(document.querySelector('[ng-controller]')).scope();
  if (root) { root.$applyAsync(function () {}); }
}, true);
