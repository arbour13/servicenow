/* Client-side-only page editing, persisted to localStorage - no ServiceNow instance involved.
   This is a SMALLER, faster-to-use alternative to the eventual server-backed editor (see
   js/server/docs.server.js): immediate save, not draft-then-publish. That's a deliberate
   difference, not a shortcut taken by mistake - draft/publish exists to protect OTHER readers
   from seeing a half-finished edit while multiple people can edit the same live content; a
   localStorage edit only ever affects the browser that made it, so there is no "other reader" to
   protect and the extra step would just be friction. If/when this app is deployed with real
   server-backed editing, this service's job shrinks to "local scratch copy" or goes away
   entirely - it isn't meant to become the permanent editing path.

   One localStorage key holds a map of pageId -> { markdown, savedAt }. Every read is wrapped in
   try/catch: localStorage can throw (private browsing, quota, disabled storage) and a broken
   editor should never take the read-only app down with it - on any failure this just behaves as
   if nothing has been locally edited. */
angular.module('docsApp').factory('DocsEditService', [function () {
  'use strict';

  var STORAGE_KEY = 'docsAppEdits';

  function readStore() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : {};
      return (parsed && typeof parsed === 'object') ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  function writeStore(store) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
      return true;
    } catch (e) {
      return false;
    }
  }

  function getEditedMarkdown(pageId) {
    var entry = readStore()[pageId];
    return entry ? entry.markdown : null;
  }

  function getEditMeta(pageId) {
    var entry = readStore()[pageId];
    return entry ? { savedAt: entry.savedAt } : null;
  }

  function hasEdit(pageId) {
    return !!readStore()[pageId];
  }

  function saveEdit(pageId, markdown) {
    var store = readStore();
    store[pageId] = { markdown: markdown, savedAt: new Date().toISOString() };
    return writeStore(store);
  }

  function resetEdit(pageId) {
    var store = readStore();
    delete store[pageId];
    return writeStore(store);
  }

  function listEditedPageIds() {
    return Object.keys(readStore());
  }

  return {
    getEditedMarkdown: getEditedMarkdown,
    getEditMeta: getEditMeta,
    hasEdit: hasEdit,
    saveEdit: saveEdit,
    resetEdit: resetEdit,
    listEditedPageIds: listEditedPageIds,
  };
}]);
