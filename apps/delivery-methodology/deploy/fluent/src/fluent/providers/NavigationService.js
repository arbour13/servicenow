[
  '$timeout', 'MessagingService', 'SearchService', 'AppStateService', 'MethodologyDomainService',
  function ($timeout, MessagingService, SearchService, AppStateService, MethodologyDomainService) {
  'use strict';

  var navStack = [];
  var navIndex = -1;
  var navSilent = false;
  var methodologySubPhaseById = {};
  var hooks = {};

  function bind(hostHooks) {
    if (hostHooks) {
      hooks = hostHooks;
    } else {
      hooks = {};
    }
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

  function setView(view) {
    if (denyIfEditing()) {
      return;
    }
    AppStateService.setView(view);
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
    push();
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
      AppStateService.batch(function () {
        AppStateService.setMethodologyId(location.methodology.id);
        AppStateService.setView('methodology');
        AppStateService.setSubPhaseId(subPhaseId);
        methodologySubPhaseById[location.methodology.id] = subPhaseId;
        AppStateService.refreshLocation();
        afterOpenSubPhase();
      });
      push();
      focusJumpTarget(params.get('el'));
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