[
  '$sce', 'MessagingService', 'AppStateService',
  function ($sce, MessagingService, AppStateService) {
  'use strict';

  var searchQuery = '';
  var searchResultGroups = [];
  var searchResultCount = 0;

  // View widgets bind .view-blur off isOpen(); without a dm-state kick, Service Portal leaves
  // sibling widgets undigested so the blur lags until some later interaction.
  function notifyUi() {
    AppStateService.notify();
  }

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
      searchResultGroups: searchResultGroups,
      searchResultCount: searchResultCount
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
    searchResultGroups = [];
    searchResultCount = 0;
    notifyUi();
    return readState();
  }

  function isOpen() {
    return !!(searchQuery || '').trim();
  }

  function getQuery() {
    return searchQuery;
  }

  function findSubPhaseResults(methodologies, query) {
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
              kind: 'subphase',
              methodology: methodology,
              subPhase: subPhase,
              loc: methodology.name + ' › ' + phase.name + ' › ' + subPhase.sid,
              title: subPhase.name,
              snippetHtml: makeSnippet(haystack, query)
            });
          }
        });
      });
    });
    return results;
  }

  function findJobAidResults(methodologies, query) {
    var results = [];
    (methodologies || []).forEach(function (methodology) {
      (methodology.phases || []).forEach(function (phase) {
        (phase.subPhases || []).forEach(function (subPhase) {
          (subPhase.tasks || []).forEach(function (task) {
            (task.jobAids || []).forEach(function (jobAid) {
              if (!jobAid.url) {
                return;
              }
              var haystack = [jobAid.label || '', task.text].join('  ');
              if (haystack.toLowerCase().indexOf(query) >= 0) {
                results.push({
                  kind: 'jobaid',
                  methodology: methodology,
                  subPhase: subPhase,
                  task: task,
                  loc: methodology.name + ' › ' + subPhase.sid + ' ' + subPhase.name,
                  title: jobAid.label || 'Job Aid',
                  snippetHtml: makeSnippet(task.text, query)
                });
              }
            });
          });
        });
      });
    });
    return results;
  }

  function findWhatsNewResults(methodologies, query) {
    var results = [];
    (methodologies || []).forEach(function (methodology) {
      (methodology.phases || []).forEach(function (phase) {
        (phase.subPhases || []).forEach(function (subPhase) {
          (subPhase.changelog || []).forEach(function (entry) {
            // Same set the What's New tab shows - a read entry doesn't exist there, so it must
            // not surface here either (this used to search ALL changelog entries regardless of
            // entry.read, so a since-read match would count in the search badge/results while
            // being invisible - and unreachable - from the tab itself).
            if (entry.read) {
              return;
            }
            if ((entry.text || '').toLowerCase().indexOf(query) < 0) {
              return;
            }
            results.push({
              kind: 'whatsnew',
              methodology: methodology,
              subPhase: subPhase,
              loc: methodology.name + ' › ' + subPhase.sid + ' ' + subPhase.name,
              title: subPhase.name,
              snippetHtml: makeSnippet(entry.text || '', query)
            });
          });
        });
      });
    });
    return results;
  }

  function findGlossaryResults(jargon, query) {
    var results = [];
    Object.keys(jargon || {}).forEach(function (term) {
      var definition = jargon[term] || '';
      if ((term + '  ' + definition).toLowerCase().indexOf(query) < 0) {
        return;
      }
      results.push({
        kind: 'glossary',
        title: term,
        snippetHtml: makeSnippet(definition, query)
      });
    });
    return results;
  }

  function findReferenceResults(referenceSections, query) {
    var results = [];
    (referenceSections || []).forEach(function (section) {
      var title = section.title || section.name || '';
      var haystack = title + '  ' + (section.body || '');
      if (haystack.toLowerCase().indexOf(query) < 0) {
        return;
      }
      results.push({
        kind: 'reference',
        title: title,
        snippetHtml: makeSnippet(section.body || title, query)
      });
    });
    return results;
  }

  function run(context, options) {
    options = options || {};
    var trimmed = (searchQuery || '').trim();
    if (trimmed.length >= 1 && options.isEditing && options.isEditing()) {
      MessagingService.toast('Finish editing first');
      return clear();
    }

    var query = trimmed.toLowerCase();
    if (query.length < 2) {
      searchResultGroups = [];
      searchResultCount = 0;
      notifyUi();
      return readState();
    }

    var methodologies = (context && context.methodologies) || [];
    var groups = [
      { kind: 'subphase', label: 'Sub-phases', results: findSubPhaseResults(methodologies, query) },
      { kind: 'jobaid', label: 'Job aids', results: findJobAidResults(methodologies, query) },
      { kind: 'whatsnew', label: 'What’s New', results: findWhatsNewResults(methodologies, query) },
      { kind: 'glossary', label: 'Glossary', results: findGlossaryResults(context && context.jargon, query) },
      { kind: 'reference', label: 'Appendix', results: findReferenceResults(context && context.referenceSections, query) }
    ];

    searchResultGroups = groups.filter(function (group) {
      return group.results.length > 0;
    });
    searchResultCount = searchResultGroups.reduce(function (total, group) {
      return total + group.results.length;
    }, 0);
    notifyUi();
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