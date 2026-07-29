['$sce', 'MessagingService', function ($sce, MessagingService) {
  'use strict';

  var searchQuery = '';
  var searchResultsList = [];

  function escapeHtml(text) {
    var value = '';
    if (text != null) {
      value = String(text);
    }
    return value
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function makeSnippet(haystack, query) {
    var clean = haystack.replace(/\n+/g, ' · ');
    var matchIndex = clean.toLowerCase().indexOf(query);
    if (matchIndex < 0) {
      return $sce.trustAsHtml(escapeHtml(clean.slice(0, 120)));
    }
    var start = Math.max(0, matchIndex - 40);
    var segment = clean.slice(start, matchIndex + query.length + 60);
    var before = escapeHtml(segment.slice(0, matchIndex - start));
    var match = escapeHtml(segment.slice(matchIndex - start, matchIndex - start + query.length));
    var after = escapeHtml(segment.slice(matchIndex - start + query.length));
    var html = '';
    if (start > 0) {
      html += '…';
    }
    html += before + '<mark>' + match + '</mark>' + after + '…';
    return $sce.trustAsHtml(html);
  }

  function readState() {
    return {
      searchQuery: searchQuery,
      searchResultsList: searchResultsList
    };
  }

  function setQuery(query) {
    if (query == null) {
      searchQuery = '';
    } else {
      searchQuery = String(query);
    }
  }

  function clear() {
    searchQuery = '';
    searchResultsList = [];
    return readState();
  }

  function isOpen() {
    return !!(searchQuery || '').trim();
  }

  function getQuery() {
    return searchQuery;
  }

  function run(methodologies, options) {
    options = options || {};
    var trimmed = (searchQuery || '').trim();
    if (trimmed.length >= 1 && options.isEditing && options.isEditing()) {
      MessagingService.toast('Finish editing first');
      return clear();
    }

    var query = trimmed.toLowerCase();
    if (query.length < 2) {
      searchResultsList = [];
      return readState();
    }

    var results = [];
    (methodologies || []).forEach(function (methodology) {
      (methodology.phases || []).forEach(function (phase) {
        (phase.subPhases || []).forEach(function (subPhase) {
          var haystack = [subPhase.name, subPhase.overview, subPhase.objective]
            .concat(subPhase.comments || [], subPhase.inputs || [], subPhase.deliverables || [])
            .concat((subPhase.tasks || []).map(function (task) {
              return task.text;
            }))
            .join('  ');
          if (haystack.toLowerCase().indexOf(query) >= 0) {
            results.push({
              methodology: methodology,
              phase: phase,
              subPhase: subPhase,
              snippetHtml: makeSnippet(haystack, query)
            });
          }
        });
      });
    });
    searchResultsList = results;
    return readState();
  }

  return {
    readState: readState,
    setQuery: setQuery,
    getQuery: getQuery,
    clear: clear,
    isOpen: isOpen,
    run: run
  };
}]