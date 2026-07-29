[
  '$timeout', 'MessagingService', 'SearchService', 'AppStateService', 'MethodologyDomainService',
  function ($timeout, MessagingService, SearchService, AppStateService, MethodologyDomainService) {
  'use strict';

  var navStack = [];
  var navIndex = -1;
  var navSilent = false;
  var methSubPhaseById = {};
  var hooks = {};

  function bind(hostHooks) {
    hooks = hostHooks || {};
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

  function apply(snap) {
    navSilent = true;
    clearSearchOverlay();
    AppStateService.setView(snap.view);
    AppStateService.setMethodologyId(snap.methodologyId);
    AppStateService.setSubPhaseId(snap.subPhaseId);
    if (snap.methodologyId && snap.subPhaseId) {
      methSubPhaseById[snap.methodologyId] = snap.subPhaseId;
    }
    AppStateService.refreshLoc();
    if (hooks.afterOpenSubPhase) {
      hooks.afterOpenSubPhase();
    }
    if (hooks.refreshRgIfRaci) {
      hooks.refreshRgIfRaci();
    }
    navSilent = false;
  }

  function canGoBack() {
    return navIndex > 0;
  }

  function canGoForward() {
    return navIndex >= 0 && navIndex < navStack.length - 1;
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

  function goBack() {
    if (denyIfEditing()) {
      return;
    }
    if (!canGoBack()) {
      return;
    }
    navIndex -= 1;
    apply(navStack[navIndex]);
  }

  function goForward() {
    if (denyIfEditing()) {
      return;
    }
    if (!canGoForward()) {
      return;
    }
    navIndex += 1;
    apply(navStack[navIndex]);
  }

  function setView(view) {
    if (denyIfEditing()) {
      return;
    }
    AppStateService.setView(view);
    if (view === 'raci' && hooks.refreshRgIfRaci) {
      hooks.refreshRgIfRaci();
    }
    clearSearchOverlay();
    push();
  }

  function switchMethodology(methodologyId) {
    if (denyIfEditing()) {
      return;
    }
    if (methodologyId === AppStateService.getMethodologyId()) {
      return;
    }
    var currentMethodologyId = AppStateService.getMethodologyId();
    var currentSubPhaseId = AppStateService.getSubPhaseId();
    if (currentMethodologyId && currentSubPhaseId) {
      methSubPhaseById[currentMethodologyId] = currentSubPhaseId;
    }
    AppStateService.setMethodologyId(methodologyId);
    var resume = methSubPhaseById[methodologyId];
    var location = resume && MethodologyDomainService.findSubPhase(AppStateService.getMethodologies(), resume);
    if (!location || location.meth.id !== methodologyId) {
      resume = MethodologyDomainService.firstContentSubPhase(
        MethodologyDomainService.curMeth(AppStateService.getMethodologies(), methodologyId)
      );
    }
    openSubPhase(resume);
    if (AppStateService.getView() === 'raci' && hooks.refreshRgIfRaci) {
      hooks.refreshRgIfRaci();
    }
  }

  function selectPhase(phaseIndex) {
    if (hooks.isEditing && hooks.isEditing()) {
      return;
    }
    var methodology = MethodologyDomainService.curMeth(
      AppStateService.getMethodologies(),
      AppStateService.getMethodologyId()
    );
    if (!methodology) {
      return;
    }
    var phase = methodology.phases[phaseIndex];
    if (!phase.subPhases.length) {
      return;
    }
    var written = phase.subPhases.find(MethodologyDomainService.hasContent);
    openSubPhase((written || phase.subPhases[0]).id);
  }

  function openSubPhase(subPhaseId) {
    if (hooks.isEditing && hooks.isEditing()) {
      return;
    }
    AppStateService.setSubPhaseId(subPhaseId);
    var methodologyId = AppStateService.getMethodologyId();
    if (methodologyId) {
      methSubPhaseById[methodologyId] = subPhaseId;
    }
    AppStateService.refreshLoc();
    if (hooks.afterOpenSubPhase) {
      hooks.afterOpenSubPhase();
    }
    push();
  }

  function focusJumpTarget(elementKey) {
    if (!elementKey) {
      return;
    }
    $timeout(function () {
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
        return;
      }
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
      target.classList.remove('jump-hl');
      void target.offsetWidth;
      target.classList.add('jump-hl');
      $timeout(function () {
        target.classList.remove('jump-hl');
      }, 2000);
    }, 0);
  }

  function jumpTo(subPhaseId, methodologyId, elementKey) {
    if (hooks.isEditing && hooks.isEditing()) {
      return;
    }
    if (methodologyId && methodologyId !== AppStateService.getMethodologyId()) {
      AppStateService.setMethodologyId(methodologyId);
    }
    AppStateService.setView('methodology');
    clearSearchOverlay();
    openSubPhase(subPhaseId);
    focusJumpTarget(elementKey);
  }

  function applyDeepLinkFromUrl() {
    try {
      var params = new URLSearchParams(window.location.search || '');
      var subPhaseId = params.get('sub');
      if (!subPhaseId) {
        return false;
      }
      var location = MethodologyDomainService.findSubPhase(AppStateService.getMethodologies(), subPhaseId);
      if (!location) {
        return false;
      }
      AppStateService.setMethodologyId(location.meth.id);
      AppStateService.setView('methodology');
      openSubPhase(subPhaseId);
      focusJumpTarget(params.get('el'));
      return true;
    } catch (deepLinkError) {
      return false;
    }
  }

  function remember(methodologyId, subPhaseId) {
    if (methodologyId && subPhaseId) {
      methSubPhaseById[methodologyId] = subPhaseId;
    }
  }

  function remembered(methodologyId) {
    return methSubPhaseById[methodologyId];
  }

  function forget(methodologyId) {
    delete methSubPhaseById[methodologyId];
  }

  function getResumeMap() {
    return Object.assign({}, methSubPhaseById);
  }

  function setResumeMap(map) {
    methSubPhaseById = Object.assign({}, map || {});
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
    canGoBack: canGoBack,
    canGoForward: canGoForward,
    goBack: goBack,
    goForward: goForward,
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