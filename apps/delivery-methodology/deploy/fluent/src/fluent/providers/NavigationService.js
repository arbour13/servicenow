[
  '$timeout', '$location', 'MessagingService', 'SearchService', 'AppStateService', 'MethodologyDomainService',
  'AnalyticsService',
  function ($timeout, $location, MessagingService, SearchService, AppStateService, MethodologyDomainService,
    AnalyticsService) {
  'use strict';

  var navStack = [];
  var navIndex = -1;
  var navSilent = false;
  var methodologySubPhaseById = {};
  var hooks = {};

  // Service Portal / ESC often rewrites the URL (Angular $location) and can drop unknown query
  // params before content finishes loading. Capture deep-link intent as soon as this factory
  // first runs, then also re-read at apply time from search + hash + top.location.
  var pendingDeepLink = captureDeepLinkFromWindow();

  function bind(hostHooks) {
    if (hostHooks) {
      hooks = hostHooks;
    } else {
      hooks = {};
    }
  }

  function decodeParam(value) {
    try {
      return decodeURIComponent(String(value || '').replace(/\+/g, ' '));
    } catch (error) {
      return String(value || '');
    }
  }

  function parseQueryString(query) {
    var params = {};
    String(query || '').split('&').forEach(function (pair) {
      if (!pair) {
        return;
      }
      var eq = pair.indexOf('=');
      var key = decodeParam(eq >= 0 ? pair.slice(0, eq) : pair);
      var value = decodeParam(eq >= 0 ? pair.slice(eq + 1) : '');
      if (key) {
        params[key] = value;
      }
    });
    return params;
  }

  function queryStringsFromHref(href) {
    var queries = [];
    if (!href) {
      return queries;
    }
    var hashIndex = href.indexOf('#');
    var beforeHash = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
    var hash = hashIndex >= 0 ? href.slice(hashIndex + 1) : '';
    var qIndex = beforeHash.indexOf('?');
    if (qIndex >= 0) {
      queries.push(beforeHash.slice(qIndex + 1));
    }
    if (hash) {
      var hashQueryIndex = hash.indexOf('?');
      if (hashQueryIndex >= 0) {
        queries.push(hash.slice(hashQueryIndex + 1));
      } else if (hash.indexOf('=') >= 0) {
        queries.push(hash);
      }
    }
    return queries;
  }

  function readLocationHrefs() {
    var hrefs = [];
    try {
      if (window.location && window.location.href) {
        hrefs.push(window.location.href);
      }
    } catch (error) {
      // ignore
    }
    try {
      if (window.top && window.top.location && window.top.location.href) {
        hrefs.push(window.top.location.href);
      }
    } catch (crossOriginError) {
      // Widget may be cross-origin relative to top; search/hash on window still work.
    }
    return hrefs;
  }

  function deepLinkFromParams(params) {
    var sub = params.dm_sub || params.sub || '';
    var el = params.dm_el || params.el || '';
    var sid = params.dm_sid || params.sid || '';
    var meth = params.dm_meth || params.meth || params.methodology || '';
    if (!sub && !sid) {
      return null;
    }
    return {
      sub: sub,
      el: el,
      sid: sid,
      meth: meth
    };
  }

  function captureDeepLinkFromWindow() {
    var hrefs = readLocationHrefs();
    var index;
    for (index = 0; index < hrefs.length; index++) {
      var queries = queryStringsFromHref(hrefs[index]);
      var queryIndex;
      for (queryIndex = 0; queryIndex < queries.length; queryIndex++) {
        var link = deepLinkFromParams(parseQueryString(queries[queryIndex]));
        if (link) {
          return link;
        }
      }
    }
    try {
      if ($location && typeof $location.search === 'function') {
        return deepLinkFromParams($location.search() || {});
      }
    } catch (locationError) {
      // $location may throw if used too early; href parse above is enough.
    }
    return null;
  }

  function resolveDeepLinkLocation(link) {
    var methodologies = AppStateService.getMethodologies();
    if (link.sub) {
      var byId = MethodologyDomainService.findSubPhase(methodologies, link.sub);
      if (byId) {
        return byId;
      }
    }
    if (link.sid) {
      return MethodologyDomainService.findSubPhaseBySid(methodologies, link.sid, link.meth || null);
    }
    return null;
  }

  function snapshot() {
    return {
      view: AppStateService.getView(),
      methodologyId: AppStateService.getMethodologyId(),
      subPhaseId: AppStateService.getSubPhaseId()
    };
  }

  function sameSnapshot(left, right) {
    return !!(left && right
      && left.view === right.view
      && left.methodologyId === right.methodologyId
      && left.subPhaseId === right.subPhaseId);
  }

  function push() {
    if (navSilent || AppStateService.getLoading()) {
      return;
    }
    var snap = snapshot();
    if (!snap.methodologyId) {
      return;
    }
    if (navIndex >= 0 && sameSnapshot(navStack[navIndex], snap)) {
      return;
    }
    navStack = navStack.slice(0, navIndex + 1);
    navStack.push(snap);
    navIndex = navStack.length - 1;
  }

  function refreshRaciGridIfNeeded() {
    if (hooks.refreshRaciGridIfNeeded) {
      hooks.refreshRaciGridIfNeeded();
    }
  }

  function afterOpenSubPhase() {
    if (hooks.afterOpenSubPhase) {
      hooks.afterOpenSubPhase();
    }
  }

  function denyIfEditing() {
    if (hooks.isEditing && hooks.isEditing()) {
      MessagingService.toast('Finish editing first');
      return true;
    }
    return false;
  }

  function clearSearchOverlay() {
    SearchService.clear();
    if (hooks.syncSearch) {
      hooks.syncSearch();
    }
  }

  function trackOpenSubPhase(subPhaseId) {
    var location = AppStateService.getLocation();
    if (!location || !location.subPhase || location.subPhase.id !== subPhaseId) {
      location = MethodologyDomainService.findSubPhase(AppStateService.getMethodologies(), subPhaseId);
    }
    if (!location || !location.subPhase) {
      return;
    }
    AnalyticsService.trackSubPhase({
      methodologyId: location.methodology && location.methodology.id,
      methodologyName: location.methodology && location.methodology.name,
      phaseName: location.phase && location.phase.name,
      subPhaseId: location.subPhase.id,
      subPhaseName: location.subPhase.name
    });
  }

  function setView(view) {
    if (denyIfEditing()) {
      return;
    }
    AppStateService.setView(view);
    AnalyticsService.trackView(view);
    if (view === 'raci') {
      refreshRaciGridIfNeeded();
    }
    clearSearchOverlay();
    push();
  }

  function switchMethodology(methodologyId) {
    if (denyIfEditing()) {
      return;
    }
    clearSearchOverlay();
    if (methodologyId === AppStateService.getMethodologyId()) {
      return;
    }
    var currentMethodologyId = AppStateService.getMethodologyId();
    var currentSubPhaseId = AppStateService.getSubPhaseId();
    if (currentMethodologyId && currentSubPhaseId) {
      methodologySubPhaseById[currentMethodologyId] = currentSubPhaseId;
    }
    var resume = methodologySubPhaseById[methodologyId];
    var location = resume && MethodologyDomainService.findSubPhase(AppStateService.getMethodologies(), resume);
    if (!location || location.methodology.id !== methodologyId) {
      resume = MethodologyDomainService.firstContentSubPhase(
        MethodologyDomainService.currentMethodology(AppStateService.getMethodologies(), methodologyId)
      );
    }
    AppStateService.batch(function () {
      AppStateService.setMethodologyId(methodologyId);
      AppStateService.setSubPhaseId(resume);
      if (methodologyId && resume) {
        methodologySubPhaseById[methodologyId] = resume;
      }
      AppStateService.refreshLocation();
      afterOpenSubPhase();
    });
    if (resume) {
      trackOpenSubPhase(resume);
    }
    push();
    if (AppStateService.getView() === 'raci') {
      refreshRaciGridIfNeeded();
    }
  }

  function openSubPhaseUnlocked(subPhaseId) {
    AppStateService.batch(function () {
      AppStateService.setSubPhaseId(subPhaseId);
      var methodologyId = AppStateService.getMethodologyId();
      if (methodologyId) {
        methodologySubPhaseById[methodologyId] = subPhaseId;
      }
      AppStateService.refreshLocation();
      afterOpenSubPhase();
    });
    trackOpenSubPhase(subPhaseId);
    push();
  }

  function selectPhase(phaseIndex) {
    if (denyIfEditing()) {
      return;
    }
    var methodology = MethodologyDomainService.currentMethodology(
      AppStateService.getMethodologies(),
      AppStateService.getMethodologyId()
    );
    if (!methodology) {
      return;
    }
    var phase = methodology.phases[phaseIndex];
    if (!phase) {
      return;
    }
    var subPhases = phase.subPhases || [];
    if (!subPhases.length) {
      return;
    }
    var written = subPhases.find(MethodologyDomainService.hasContent);
    if (written) {
      openSubPhaseUnlocked(written.id);
    } else {
      openSubPhaseUnlocked(subPhases[0].id);
    }
  }

  function openSubPhase(subPhaseId) {
    if (denyIfEditing()) {
      return;
    }
    openSubPhaseUnlocked(subPhaseId);
  }

  function focusJumpTarget(elementKey) {
    if (!elementKey) {
      return;
    }
    var attempts = 0;
    var maxAttempts = 20;
    // Sub-phase panels pin to the top of the viewport; task rows stay centered in view.
    var alignStart = elementKey.indexOf('sub:') === 0;

    function attempt() {
      attempts += 1;
      // Broadened from '.main [data-el]' to a page-wide query: '.main' no longer exists once the
      // Methodology view is its own widget/DOM subtree, separate from Shell's - see
      // ServiceNow/apps/delivery-methodology/CLAUDE.md's multi-widget note.
      var nodes = document.querySelectorAll('[data-el]');
      var target = null;
      for (var index = 0; index < nodes.length; index++) {
        if (nodes[index].getAttribute('data-el') === elementKey) {
          target = nodes[index];
          break;
        }
      }
      if (!target) {
        if (attempts < maxAttempts) {
          $timeout(attempt, 50);
        }
        return;
      }

      var behavior = 'smooth';
      try {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          behavior = 'auto';
        }
      } catch (error) {
        behavior = 'smooth';
      }

      target.scrollIntoView({
        behavior: behavior,
        block: alignStart ? 'start' : 'center'
      });
      target.classList.remove('jump-hl');
      void target.offsetWidth;
      target.classList.add('jump-hl');
      $timeout(function () {
        target.classList.remove('jump-hl');
      }, 2400);
    }

    // Retries cover Methodology ng-if mount + the sibling-widget digest kick on Service Portal.
    $timeout(attempt, 0);
  }

  function jumpTo(subPhaseId, methodologyId, elementKey) {
    if (denyIfEditing()) {
      return;
    }
    clearSearchOverlay();
    AppStateService.batch(function () {
      if (methodologyId && methodologyId !== AppStateService.getMethodologyId()) {
        AppStateService.setMethodologyId(methodologyId);
      }
      AppStateService.setView('methodology');
      AppStateService.setSubPhaseId(subPhaseId);
      var activeMethodologyId = AppStateService.getMethodologyId();
      if (activeMethodologyId) {
        methodologySubPhaseById[activeMethodologyId] = subPhaseId;
      }
      AppStateService.refreshLocation();
      afterOpenSubPhase();
    });
    AnalyticsService.trackView('methodology');
    trackOpenSubPhase(subPhaseId);
    push();
    focusJumpTarget(elementKey || ('sub:' + subPhaseId));
  }

  function applyDeepLinkFromUrl() {
    try {
      var link = pendingDeepLink || captureDeepLinkFromWindow();
      pendingDeepLink = null;
      if (!link) {
        return false;
      }

      var location = resolveDeepLinkLocation(link);
      if (!location || !location.subPhase) {
        return false;
      }

      var subPhaseId = location.subPhase.id;
      AppStateService.batch(function () {
        AppStateService.setMethodologyId(location.methodology.id);
        AppStateService.setView('methodology');
        AppStateService.setSubPhaseId(subPhaseId);
        methodologySubPhaseById[location.methodology.id] = subPhaseId;
        AppStateService.refreshLocation();
        afterOpenSubPhase();
      });
      push();

      // Task rows use data-el="task:…"; the .panel uses data-el="sub:…" so a bare sub-phase
      // link scrolls the panel to the top and pulses its border.
      var elementKey = link.el || ('sub:' + subPhaseId);
      focusJumpTarget(elementKey);
      return true;
    } catch (deepLinkError) {
      return false;
    }
  }

  function remember(methodologyId, subPhaseId) {
    if (methodologyId && subPhaseId) {
      methodologySubPhaseById[methodologyId] = subPhaseId;
    }
  }

  function remembered(methodologyId) {
    return methodologySubPhaseById[methodologyId];
  }

  function forget(methodologyId) {
    delete methodologySubPhaseById[methodologyId];
  }

  function getResumeMap() {
    return Object.assign({}, methodologySubPhaseById);
  }

  function setResumeMap(map) {
    methodologySubPhaseById = Object.assign({}, map || {});
  }

  function getHistory() {
    return {
      stack: navStack.slice(),
      index: navIndex
    };
  }

  function setHistory(history) {
    if (!history || !Array.isArray(history.stack)) {
      navStack = [];
      navIndex = -1;
      return;
    }
    navStack = history.stack.slice();
    var nextIndex = history.index;
    if (typeof nextIndex !== 'number' || nextIndex < -1) {
      nextIndex = navStack.length - 1;
    }
    if (nextIndex >= navStack.length) {
      nextIndex = navStack.length - 1;
    }
    navIndex = nextIndex;
  }

  return {
    bind: bind,
    push: push,
    setView: setView,
    switchMethodology: switchMethodology,
    selectPhase: selectPhase,
    openSubPhase: openSubPhase,
    jumpTo: jumpTo,
    applyDeepLinkFromUrl: applyDeepLinkFromUrl,
    remember: remember,
    remembered: remembered,
    forget: forget,
    getResumeMap: getResumeMap,
    setResumeMap: setResumeMap,
    getHistory: getHistory,
    setHistory: setHistory
  };
}]