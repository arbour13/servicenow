[
  '$injector', '$interval', '$document',
  function ($injector, $interval, $document) {
  'use strict';

  var HEARTBEAT_MS = 60000;
  var DEDUPE_MS = 400;

  var snAnalytics = null;
  var snResolved = false;
  var sessionStarted = false;
  var heartbeatPromise = null;
  var lastView = '';
  var lastViewAt = 0;
  var lastSubPhaseId = '';
  var lastEventKey = '';
  var lastEventAt = 0;

  function resolveAnalytics() {
    if (snResolved) {
      return snAnalytics;
    }
    snResolved = true;
    try {
      if (typeof $injector.has !== 'function' || $injector.has('snAnalytics')) {
        snAnalytics = $injector.get('snAnalytics');
      }
    } catch (resolveError) {
      snAnalytics = null;
    }
    return snAnalytics;
  }

  function eventKey(name, data) {
    var parts = [name];
    if (data) {
      Object.keys(data).sort().forEach(function (key) {
        parts.push(key + '=' + data[key]);
      });
    }
    return parts.join('|');
  }

  function track(name, data) {
    if (!name) {
      return;
    }
    var payloadData = data || {};
    var key = eventKey(name, payloadData);
    var now = Date.now();
    if (key === lastEventKey && (now - lastEventAt) < DEDUPE_MS) {
      return;
    }
    lastEventKey = key;
    lastEventAt = now;

    var analytics = resolveAnalytics();
    if (!analytics || typeof analytics.addEvent !== 'function') {
      return;
    }
    try {
      analytics.addEvent({
        name: name,
        data: payloadData
      });
    } catch (trackError) {
      /* analytics must never break the app */
    }
  }

  function trackView(view) {
    if (!view) {
      return;
    }
    var now = Date.now();
    if (lastView && lastView !== view && lastViewAt) {
      track('DM View Left', {
        View: lastView,
        DurationSec: String(Math.max(0, Math.round((now - lastViewAt) / 1000)))
      });
    }
    if (view === lastView) {
      return;
    }
    lastView = view;
    lastViewAt = now;
    track('DM View Opened', {
      View: view
    });
  }

  function trackSubPhase(details) {
    details = details || {};
    var subPhaseId = details.subPhaseId || '';
    if (!subPhaseId || subPhaseId === lastSubPhaseId) {
      return;
    }
    lastSubPhaseId = subPhaseId;
    track('DM Sub-phase Opened', {
      'Methodology': details.methodologyName || '',
      'Methodology ID': details.methodologyId || '',
      Phase: details.phaseName || '',
      'Sub-phase': details.subPhaseName || '',
      'Sub-phase ID': subPhaseId
    });
  }

  function trackSearch(query, resultCount) {
    var trimmed = String(query || '').trim();
    if (trimmed.length < 2) {
      return;
    }
    track('DM Search', {
      'Query Length': String(trimmed.length),
      Results: String(resultCount == null ? 0 : resultCount),
      'Zero Results': resultCount === 0 ? 'yes' : 'no'
    });
  }

  function trackFeedback(details) {
    details = details || {};
    track('DM Feedback Clicked', {
      'Methodology': details.methodologyName || '',
      'Methodology ID': details.methodologyId || ''
    });
  }

  function trackReference(panelId) {
    if (!panelId) {
      return;
    }
    track('DM Reference Opened', {
      Panel: String(panelId)
    });
  }

  function trackEditEntered() {
    track('DM Edit Entered', {
      View: lastView || 'methodology'
    });
  }

  function pageIsVisible() {
    var documentRef = $document[0];
    if (!documentRef || documentRef.visibilityState == null) {
      return true;
    }
    return documentRef.visibilityState === 'visible';
  }

  function stopHeartbeat() {
    if (heartbeatPromise) {
      $interval.cancel(heartbeatPromise);
      heartbeatPromise = null;
    }
  }

  function startHeartbeat() {
    stopHeartbeat();
    heartbeatPromise = $interval(function () {
      if (!pageIsVisible()) {
        return;
      }
      track('DM Heartbeat', {
        View: lastView || ''
      });
    }, HEARTBEAT_MS);
  }

  function startSession(details) {
    details = details || {};
    if (!sessionStarted) {
      sessionStarted = true;
      track('DM Session Started', {
        View: details.view || lastView || 'methodology',
        Empty: details.empty ? 'yes' : 'no'
      });
    }
    startHeartbeat();

    var documentRef = $document[0];
    if (documentRef && !documentRef._dmAnalyticsVisibilityBound) {
      documentRef._dmAnalyticsVisibilityBound = true;
      angular.element(documentRef).on('visibilitychange', function () {
        if (pageIsVisible()) {
          startHeartbeat();
        } else {
          stopHeartbeat();
        }
      });
    }
  }

  // Test / harness hook - not required by production callers.
  function isEnabled() {
    return !!resolveAnalytics();
  }

  return {
    track: track,
    trackView: trackView,
    trackSubPhase: trackSubPhase,
    trackSearch: trackSearch,
    trackFeedback: trackFeedback,
    trackReference: trackReference,
    trackEditEntered: trackEditEntered,
    startSession: startSession,
    isEnabled: isEnabled
  };
}]