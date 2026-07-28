/* In-app back/forward, view/methodology/sub-phase navigation, and deep links.
   Bind host hooks once after the controller's location helpers exist - avoids DI cycles
   with Raci/Search/WhatsNew. */
angular.module('deliveryMethodology').factory('NavigationService', [
  '$timeout', 'MessagingService', 'SearchService',
  function ($timeout, MessagingService, SearchService) {
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
      view: hooks.getView(),
      methodologyId: hooks.getMethodologyId(),
      subPhaseId: hooks.getSubPhaseId()
    };
  }

  function sameSnapshot(left, right) {
    return !!(left && right
      && left.view === right.view
      && left.methodologyId === right.methodologyId
      && left.subPhaseId === right.subPhaseId);
  }

  function push() {
    if (navSilent || (hooks.isLoading && hooks.isLoading())) {
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
    hooks.setView(snap.view);
    hooks.setMethodologyId(snap.methodologyId);
    hooks.setSubPhaseId(snap.subPhaseId);
    if (snap.methodologyId && snap.subPhaseId) {
      methSubPhaseById[snap.methodologyId] = snap.subPhaseId;
    }
    if (hooks.refreshLoc) {
      hooks.refreshLoc();
    }
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
    hooks.setView(view);
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
    if (methodologyId === hooks.getMethodologyId()) {
      return;
    }
    var currentMethodologyId = hooks.getMethodologyId();
    var currentSubPhaseId = hooks.getSubPhaseId();
    if (currentMethodologyId && currentSubPhaseId) {
      methSubPhaseById[currentMethodologyId] = currentSubPhaseId;
    }
    hooks.setMethodologyId(methodologyId);
    var resume = methSubPhaseById[methodologyId];
    var location = resume && hooks.findSubPhase ? hooks.findSubPhase(resume) : null;
    if (!location || location.meth.id !== methodologyId) {
      resume = hooks.firstContentSubPhase(hooks.curMeth());
    }
    openSubPhase(resume);
    if (hooks.getView() === 'raci' && hooks.refreshRgIfRaci) {
      hooks.refreshRgIfRaci();
    }
  }

  function selectPhase(phaseIndex) {
    if (hooks.isEditing && hooks.isEditing()) {
      return;
    }
    var methodology = hooks.curMeth();
    var phase = methodology.phases[phaseIndex];
    if (!phase.subPhases.length) {
      return;
    }
    var written = phase.subPhases.find(hooks.hasContent);
    openSubPhase((written || phase.subPhases[0]).id);
  }

  function openSubPhase(subPhaseId) {
    if (hooks.isEditing && hooks.isEditing()) {
      return;
    }
    hooks.setSubPhaseId(subPhaseId);
    var methodologyId = hooks.getMethodologyId();
    if (methodologyId) {
      methSubPhaseById[methodologyId] = subPhaseId;
    }
    if (hooks.refreshLoc) {
      hooks.refreshLoc();
    }
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
      var nodes = document.querySelectorAll('.main [data-el]');
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
    if (methodologyId && methodologyId !== hooks.getMethodologyId()) {
      hooks.setMethodologyId(methodologyId);
    }
    hooks.setView('methodology');
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
      var location = hooks.findSubPhase(subPhaseId);
      if (!location) {
        return false;
      }
      hooks.setMethodologyId(location.meth.id);
      hooks.setView('methodology');
      openSubPhase(subPhaseId);
      focusJumpTarget(params.get('el'));
      return true;
    } catch (err) {
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
}]);
