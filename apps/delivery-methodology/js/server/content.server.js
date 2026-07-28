/* Widget server script: load/save the scoped content table.
   Prefixed at package time with js/lib/content-model.js (DMContentModel).
   input.action: load (default) | save. One GlideRecordSecure per function. */
(function () {
  data.canEdit = gs.hasRole('editor') || gs.hasRole('admin');
  data.error = '';
  data.empty = false;
  data.saved = false;

  var logPrefix = 'Delivery Methodology content: ';
  var allowedActions = {
    load: true,
    save: true
  };
  var maximumSaveRows = 5000;

  function getContentTableName() {
    try {
      if (typeof gs.getCurrentScopeName === 'function') {
        var scopeName = String(gs.getCurrentScopeName() || '');

        if (scopeName && scopeName !== 'global') {
          return scopeName + '_content';
        }
      }
    } catch (scopeError) {
      gs.warn(logPrefix + 'could not resolve scope name - falling back to content: ' + scopeError);
    }

    return 'content';
  }

  var contentTable = getContentTableName();

  function isContentTableReady() {
    return !!(contentTable && contentTable !== '');
  }

  function getAllContentRecords() {
    var records = [];
    var contentRecord = new GlideRecordSecure(contentTable);

    contentRecord.orderBy('order');
    contentRecord.query();

    while (contentRecord.next()) {
      var parentSystemId = contentRecord.getValue('parent');
      var parentValue = null;

      if (parentSystemId) {
        parentValue = String(parentSystemId);
      }

      records.push({
        systemId: String(contentRecord.getUniqueValue()),
        type: String(contentRecord.getValue('type') || ''),
        parent: parentValue,
        name: String(contentRecord.getValue('name') || ''),
        order: parseInt(contentRecord.getValue('order'), 10) || 0,
        content: String(contentRecord.getValue('content') || '')
      });
    }

    return records;
  }

  function deleteRootContentRecords() {
    var contentRecord = new GlideRecordSecure(contentTable);

    contentRecord.addNullQuery('parent');
    contentRecord.query();

    while (contentRecord.next()) {
      contentRecord.deleteRecord();
    }
  }

  function deleteRemainingContentRecords() {
    var contentRecord = new GlideRecordSecure(contentTable);

    contentRecord.query();

    while (contentRecord.next()) {
      contentRecord.deleteRecord();
    }
  }

  function createContentRecord(row, parentSystemId) {
    var contentRecord = new GlideRecordSecure(contentTable);
    var orderValue = 0;

    if (row.order != null) {
      orderValue = row.order;
    }

    contentRecord.initialize();

    contentRecord.setValue('type', row.type);
    contentRecord.setValue('name', row.name || '');
    contentRecord.setValue('order', orderValue);
    contentRecord.setValue('content', JSON.stringify(row.content || {}));

    if (parentSystemId) {
      contentRecord.setValue('parent', parentSystemId);
    }

    var createdSystemId = contentRecord.insert();

    if (!createdSystemId) {
      return '';
    }

    return String(createdSystemId);
  }

  function deleteAllContentRecords() {
    deleteRootContentRecords();
    deleteRemainingContentRecords();
    return true;
  }

  function createMappedContentRecord(row, clientIdToSystemId) {
    if (!row || !row.type) {
      gs.error(logPrefix + 'createMappedContentRecord: missing type');
      return false;
    }

    if (DMContentModel.ALLOWED_TYPES && !DMContentModel.ALLOWED_TYPES[row.type]) {
      gs.error(logPrefix + 'createMappedContentRecord: disallowed type ' + row.type);
      return false;
    }

    var parentClientId = row.parentClientId;
    var parentSystemId = '';

    if (parentClientId && clientIdToSystemId[parentClientId]) {
      parentSystemId = clientIdToSystemId[parentClientId];
    }

    var createdSystemId = createContentRecord(row, parentSystemId);

    if (!createdSystemId) {
      gs.error(logPrefix + 'create failed for type=' + row.type + ' clientId=' + (row.clientId || ''));
      return false;
    }

    if (row.clientId) {
      clientIdToSystemId[row.clientId] = createdSystemId;
    }

    return true;
  }

  function createContentRecords(flatRows) {
    var clientIdToSystemId = {};
    var pendingRows = flatRows.slice();
    var safetyPassCount = 0;

    while (pendingRows.length && safetyPassCount < flatRows.length + 5) {
      safetyPassCount++;
      var stillWaiting = [];

      for (var index = 0; index < pendingRows.length; index++) {
        var row = pendingRows[index];
        var parentClientId = row.parentClientId;

        if (parentClientId && !clientIdToSystemId[parentClientId]) {
          stillWaiting.push(row);
          continue;
        }

        if (!createMappedContentRecord(row, clientIdToSystemId)) {
          return false;
        }
      }

      if (stillWaiting.length === pendingRows.length) {
        gs.warn(logPrefix + 'unresolvable parents for ' + stillWaiting.length +
          ' row(s); refusing to orphan them');
        return false;
      }

      pendingRows = stillWaiting;
    }

    if (pendingRows.length) {
      gs.error(logPrefix + 'createContentRecords: unfinished queue (' + pendingRows.length + ')');
      return false;
    }

    return true;
  }

  function restoreContentFromSnapshot(snapshotRecords) {
    var flatRows = [];

    for (var index = 0; index < snapshotRecords.length; index++) {
      var snapshotRecord = snapshotRecords[index];

      flatRows.push({
        type: snapshotRecord.type,
        parentClientId: snapshotRecord.parent,
        name: snapshotRecord.name,
        order: snapshotRecord.order,
        content: DMContentModel.parseContent(snapshotRecord.content),
        clientId: snapshotRecord.systemId
      });
    }

    return createContentRecords(flatRows);
  }

  function publishContentToClient(payload) {
    data.methodologies = (payload && payload.methodologies) || [];
    data.jobTitles = (payload && payload.jobTitles) || [];
    data.jargon = (payload && payload.jargon) || {};
    data.referenceSections = (payload && payload.referenceSections) || [];

    data.empty = !(data.methodologies && data.methodologies.length);

    return !data.empty;
  }

  function emptyContentPayload() {
    return {
      methodologies: [],
      jobTitles: [],
      jargon: {},
      referenceSections: []
    };
  }

  function validateSavePayload(payload) {
    if (!payload || typeof payload !== 'object') {
      return 'Save payload must be an object.';
    }

    if (!Array.isArray(payload.methodologies)) {
      return 'methodologies must be an array.';
    }

    if (!Array.isArray(payload.jobTitles)) {
      return 'jobTitles must be an array.';
    }

    if (!payload.jargon || typeof payload.jargon !== 'object' || Array.isArray(payload.jargon)) {
      return 'jargon must be an object.';
    }

    if (payload.referenceSections != null && !Array.isArray(payload.referenceSections)) {
      return 'referenceSections must be an array when provided.';
    }

    return '';
  }

  function validateFlatRows(flatRows) {
    if (!Array.isArray(flatRows)) {
      return 'Dehydrated rows must be an array.';
    }

    if (flatRows.length > maximumSaveRows) {
      return 'Save exceeds the maximum of ' + maximumSaveRows + ' content rows.';
    }

    for (var index = 0; index < flatRows.length; index++) {
      var row = flatRows[index];
      var type = row && row.type;

      if (!type || (DMContentModel.ALLOWED_TYPES && !DMContentModel.ALLOWED_TYPES[type])) {
        return 'Disallowed or missing content type at row ' + index + ': ' + type;
      }
    }

    return '';
  }

  function saveContent(payload) {
    var validationError = validateSavePayload(payload);

    if (validationError) {
      data.error = validationError;
      gs.warn(logPrefix + validationError);
      return false;
    }

    var flatRows;

    try {
      flatRows = DMContentModel.dehydrate(payload);
    } catch (dehydrateError) {
      data.error = 'Could not prepare content for save.';
      gs.error(logPrefix + 'dehydrate failed - ' + dehydrateError);
      return false;
    }

    var flatRowsError = validateFlatRows(flatRows);

    if (flatRowsError) {
      data.error = flatRowsError;
      gs.warn(logPrefix + flatRowsError);
      return false;
    }

    var snapshotRecords = getAllContentRecords();

    try {
      deleteAllContentRecords();

      if (!createContentRecords(flatRows)) {
        data.error = 'Save failed while writing content rows.';
        gs.error(logPrefix + 'createContentRecords failed - attempting restore of ' +
          snapshotRecords.length + ' row(s)');

        if (!restoreContentFromSnapshot(snapshotRecords)) {
          gs.error(logPrefix + 'restore after failed save also failed');
        }

        publishContentToClient(DMContentModel.hydrate(getAllContentRecords()));
        return false;
      }

      publishContentToClient(DMContentModel.hydrate(getAllContentRecords()));
      data.saved = true;
      return true;
    } catch (saveError) {
      data.error = 'Save failed.';
      gs.error(logPrefix + 'saveContent threw - ' + saveError);

      try {
        if (!restoreContentFromSnapshot(snapshotRecords)) {
          gs.error(logPrefix + 'restore after exception also failed');
        }
      } catch (restoreError) {
        gs.error(logPrefix + 'restore threw - ' + restoreError);
      }

      publishContentToClient(DMContentModel.hydrate(getAllContentRecords()));
      return false;
    }
  }

  function loadContent() {
    try {
      return publishContentToClient(DMContentModel.hydrate(getAllContentRecords()));
    } catch (loadError) {
      data.error = 'Could not load content.';
      gs.error(logPrefix + 'load failed - ' + loadError);
      publishContentToClient(emptyContentPayload());
      return false;
    }
  }

  if (!isContentTableReady()) {
    data.error = 'Content table is not configured.';
    gs.error(logPrefix + 'empty table name');
    publishContentToClient(emptyContentPayload());
    return;
  }

  var action = 'load';

  if (input && input.action) {
    action = String(input.action);
  }

  if (!allowedActions[action]) {
    data.error = 'Unknown action.';
    gs.warn(logPrefix + 'rejected action=' + action);
    loadContent();
    return;
  }

  if (action === 'save') {
    if (!data.canEdit) {
      data.error = 'Not authorized to edit content.';
      gs.warn(logPrefix + 'save denied - caller lacks editor/admin');
      loadContent();
      return;
    }

    saveContent({
      methodologies: input.methodologies,
      jobTitles: input.jobTitles,
      jargon: input.jargon,
      referenceSections: input.referenceSections || []
    });
    return;
  }

  loadContent();
})();
