[
  'IdSeqService', 'MessagingService', 'AppStateService',
  function (IdSeqService, MessagingService, AppStateService) {
  'use strict';

  var hooks = {};
  var state = {
    referenceEditMode: false,
    referenceSnapshot: null
  };

  function notify() {
    AppStateService.notify();
  }

  function bind(hostHooks) {
    hooks = hostHooks || {};
  }

  function isEditing() {
    return state.referenceEditMode;
  }

  function readState() {
    return {
      referenceEditMode: state.referenceEditMode,
      referenceSnapshot: state.referenceSnapshot
    };
  }

  function sectionsSource() {
    if (state.referenceEditMode && state.referenceSnapshot) {
      return state.referenceSnapshot;
    }
    return AppStateService.getReferenceSections() || [];
  }

  function slugify(title) {
    var slug = String(title || 'section').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (!slug) {
      slug = 'section';
    }
    return slug;
  }

  function uniqueKey(baseKey, sections) {
    var key = baseKey;
    var suffix = 2;
    while (sections.some(function (section) {
      return section.key === key;
    })) {
      key = baseKey + '-' + suffix;
      suffix = suffix + 1;
    }
    return key;
  }

  function enterReferenceEdit() {
    if (hooks.canEdit && !hooks.canEdit()) {
      MessagingService.toast('You do not have permission to edit');
      return;
    }
    if (hooks.isContentEditing && hooks.isContentEditing()) {
      MessagingService.toast('Finish editing first');
      return;
    }
    if (hooks.isStructureEditing && hooks.isStructureEditing()) {
      MessagingService.toast('Finish editing first');
      return;
    }
    state.referenceSnapshot = IdSeqService.deepClone(AppStateService.getReferenceSections() || []);
    state.referenceEditMode = true;
    MessagingService.scrollToEditBar();
    notify();
  }

  function toggleReferenceEdit() {
    if (state.referenceEditMode) {
      cancelReferenceEdit();
      return;
    }
    enterReferenceEdit();
  }

  function cancelReferenceEdit() {
    state.referenceSnapshot = null;
    state.referenceEditMode = false;
    MessagingService.toast('Appendix edit cancelled — changes reverted');
    notify();
  }

  function saveReferenceEdit() {
    if (!state.referenceEditMode || !state.referenceSnapshot) {
      return;
    }
    if (!AppStateService.tryBeginSave()) {
      return;
    }
    var nextSections = IdSeqService.deepClone(state.referenceSnapshot);
    state.referenceSnapshot = null;
    state.referenceEditMode = false;
    AppStateService.setReferenceSections(nextSections);
    AppStateService.persistMethodologies().then(function () {
      MessagingService.toast('Appendix saved');
      notify();
    }, function () {
      state.referenceEditMode = true;
      state.referenceSnapshot = nextSections;
      notify();
    });
  }

  function renameSection(section) {
    if (!section) {
      return;
    }
    var title = String(section.title || section.name || '').trim();
    if (!title) {
      section.title = 'Untitled section';
    } else {
      section.title = title;
    }
    section.name = section.title;
    notify();
  }

  function addSection() {
    if (!state.referenceEditMode || !state.referenceSnapshot) {
      return null;
    }
    var title = 'New section';
    var key = uniqueKey(slugify(title), state.referenceSnapshot);
    var section = {
      key: key,
      title: title,
      name: title,
      body: ''
    };
    state.referenceSnapshot.push(section);
    notify();
    return section;
  }

  function deleteSection(section) {
    if (!state.referenceEditMode || !state.referenceSnapshot || !section) {
      return;
    }
    MessagingService.confirm({
      title: 'Remove reference section?',
      body: 'Remove “' + (section.title || section.name) + '” from the appendix? Cancel appendix edit to undo.',
      ok: 'Remove'
    }).then(function (accepted) {
      if (!accepted) {
        return;
      }
      state.referenceSnapshot = state.referenceSnapshot.filter(function (candidate) {
        return candidate.key !== section.key;
      });
      notify();
    });
  }

  function moveSection(index, direction) {
    var nextIndex = direction === 'up' ? index - 1 : index + 1;
    reorderSection(index, nextIndex);
  }

  function reorderSection(fromIndex, toIndex) {
    if (!state.referenceEditMode || !state.referenceSnapshot) {
      return;
    }
    var array = state.referenceSnapshot;
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0
      || fromIndex >= array.length || toIndex >= array.length) {
      return;
    }
    var moved = array.splice(fromIndex, 1)[0];
    array.splice(toIndex, 0, moved);
    notify();
  }

  return {
    bind: bind,
    isEditing: isEditing,
    readState: readState,
    sectionsSource: sectionsSource,
    enterReferenceEdit: enterReferenceEdit,
    toggleReferenceEdit: toggleReferenceEdit,
    cancelReferenceEdit: cancelReferenceEdit,
    saveReferenceEdit: saveReferenceEdit,
    renameSection: renameSection,
    addSection: addSection,
    deleteSection: deleteSection,
    moveSection: moveSection,
    reorderSection: reorderSection
  };
}]