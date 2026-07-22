[
  '$rootScope', 'EncoderService', 'AggregateService', 'SchemaLiveService', 'ConnectionService',
  function ($rootScope, EncoderService, AggregateService, SchemaLiveService, ConnectionService) {
    'use strict';

    var svc = {
      preview: { open: false, table: '', loading: false, error: '', kind: 'records', cols: [], rows: [], stats: [] },
    };
    function resetPreview(open, table, kind) {
      var p = svc.preview;
      p.open = open; p.table = table; p.loading = true; p.error = ''; p.kind = kind;
      p.cols = []; p.rows = []; p.stats = [];
    }
    svc.close = function () { svc.preview.open = false; };
    svc.cell = function (v) { return (v && typeof v === 'object') ? (v.display_value || '') : (v || ''); };

    svc.records = function (state, connection) {
      var table = (state.table || '').trim();
      if (!table) { return; }
      var query = EncoderService.encodeGroups(state.grArgGroups) || (state.exampleQuery || '').trim();
      resetPreview(true, table, 'records');
      SchemaLiveService.previewRecords(table, query, connection).then(function (rows) {
        $rootScope.$applyAsync(function () {
          svc.preview.loading = false;
          svc.preview.rows = rows;
          svc.preview.cols = rows.length ? Object.keys(rows[0]).slice(0, 8) : [];
        });
      }).catch(function (e) {
        $rootScope.$applyAsync(function () {
          svc.preview.loading = false;
          svc.preview.error = ConnectionService.formatConnError(e);
        });
      });
    };

    // GlideAggregate's preview - reuses the same modal/state, branching on AggregateService's own
    // aggShape() (the single source of truth this app already uses for "what shape does this
    // aggregate produce"): the grouped/array shape reuses the records data-table renderer, scalar/
    // object shapes render as a compact label:value list (kind: 'stats').
    svc.aggregate = function (aggState, connection) {
      var table = (aggState.table || '').trim();
      if (!table) { return; }
      var query = EncoderService.encodeGroups(aggState.groups) || (aggState.gaExampleQuery || '').trim();
      var shape = AggregateService.aggShape(aggState);
      resetPreview(true, table, shape === 'array' ? 'records' : 'stats');
      SchemaLiveService.previewAggregate(table, query, aggState.aggregates, aggState.groupBys, connection).then(function (result) {
        $rootScope.$applyAsync(function () {
          svc.preview.loading = false;
          if (shape === 'array') {
            var groups = (result && result.groupby_fields) || [];
            var rows = groups.map(function (g) {
              var row = { group: g.display_value || g.value };
              if (g.stats) {
                if (g.stats.count !== undefined) { row.count = g.stats.count; }
                ['sum', 'avg', 'min', 'max'].forEach(function (fn) {
                  if (g.stats[fn]) { Object.keys(g.stats[fn]).forEach(function (field) { row[fn + '(' + field + ')'] = g.stats[fn][field]; }); }
                });
              }
              return row;
            });
            svc.preview.rows = rows;
            svc.preview.cols = rows.length ? Object.keys(rows[0]).slice(0, 8) : [];
          } else {
            var stats = result && result.stats;
            var entries = [];
            if (stats && stats.count !== undefined) { entries.push({ label: 'count', value: stats.count }); }
            ['sum', 'avg', 'min', 'max'].forEach(function (fn) {
              if (stats && stats[fn]) {
                Object.keys(stats[fn]).forEach(function (field) { entries.push({ label: fn + '(' + field + ')', value: stats[fn][field] }); });
              }
            });
            svc.preview.stats = entries;
          }
        });
      }).catch(function (e) {
        $rootScope.$applyAsync(function () {
          svc.preview.loading = false;
          svc.preview.error = ConnectionService.formatConnError(e);
        });
      });
    };

    return svc;
  }
]