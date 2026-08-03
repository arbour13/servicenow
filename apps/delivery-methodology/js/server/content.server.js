/* Widget server script: load/save the scoped content table.
   Prefixed at package time with js/lib/url-policy.js + js/lib/content-model.js
   (DMUrlPolicy, DMContentModel). input.action: load (default) | save | saveChangelogSeen.
   One GlideRecordSecure per function. */
(function () {
  data.error = '';
  data.empty = false;
  data.saved = false;
  data.changelogSeen = {};

  var logPrefix = 'Delivery Methodology content: ';
  var changelogSeenPreference = 'dm.changelog.seen';
  var allowedActions = {
    load: true,
    save: true,
    saveChangelogSeen: true,
    importStandardContent: true,
    clearAll: true
  };
  var maximumSaveRows = 5000;

  function getAppScopeName() {
    try {
      if (typeof gs.getCurrentScopeName === 'function') {
        var scopeName = String(gs.getCurrentScopeName() || '');

        if (scopeName && scopeName !== 'global') {
          return scopeName;
        }
      }
    } catch (scopeError) {
      gs.warn(logPrefix + 'could not resolve scope name: ' + scopeError);
    }

    return '';
  }

  function getContentTableName() {
    var scopeName = getAppScopeName();

    if (scopeName) {
      return scopeName + '_content';
    }

    return 'content';
  }

  var appScopeName = getAppScopeName();
  var isSystemAdmin = gs.hasRole('admin');
  var isAppAdmin = !!(appScopeName && gs.hasRole(appScopeName + '.admin'));
  var isAppEditor = !!(appScopeName && gs.hasRole(appScopeName + '.editor'));
  // Import + normal content edit: app editor/admin, or platform admin.
  data.canEdit = !!(isAppEditor || isAppAdmin || isSystemAdmin);
  // Clear all content: app admin or platform admin only (not editors).
  data.canAdmin = !!(isAppAdmin || isSystemAdmin);

  var contentTable = getContentTableName();
  // Client LiveSyncService watches this table via spUtil.recordWatch.
  data.contentTable = contentTable;

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

  // Cheap fingerprint of the flat table so a second editor cannot silently clobber the first
  // (full-replace save). Client echoes data.contentRevision on save; mismatch → hard fail + reload.
  function contentRevision(records) {
    var list = records || [];
    var parts = [];
    var index;
    for (index = 0; index < list.length; index++) {
      var row = list[index];
      parts.push(
        String(row.systemId || '') + ':' +
        String(row.type || '') + ':' +
        String(row.order || 0) + ':' +
        String(row.name || '') + ':' +
        String(row.content || '').length
      );
    }
    var raw = String(list.length) + '|' + parts.join('|');
    var hash = 0;
    for (index = 0; index < raw.length; index++) {
      hash = ((hash << 5) - hash) + raw.charCodeAt(index);
      hash |= 0;
    }
    return String(list.length) + ':' + String(hash);
  }

  function readChangelogSeenPreference() {
    try {
      var raw = gs.getUser().getPreference(changelogSeenPreference);
      if (!raw) {
        return {};
      }
      var parsed = JSON.parse(String(raw));
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return {};
      }
      return parsed;
    } catch (preferenceError) {
      gs.warn(logPrefix + 'could not read ' + changelogSeenPreference + ' - ' + preferenceError);
      return {};
    }
  }

  function writeChangelogSeenPreference(seenMap) {
    try {
      var map = seenMap;
      if (!map || typeof map !== 'object' || Array.isArray(map)) {
        map = {};
      }
      var cleaned = {};
      Object.keys(map).forEach(function (entryId) {
        if (map[entryId]) {
          cleaned[String(entryId)] = true;
        }
      });
      gs.getUser().savePreference(changelogSeenPreference, JSON.stringify(cleaned));
      data.changelogSeen = cleaned;
      data.saved = true;
      return true;
    } catch (preferenceError) {
      data.error = 'Could not save changelog read preference.';
      gs.warn(logPrefix + 'could not write ' + changelogSeenPreference + ' - ' + preferenceError);
      return false;
    }
  }

  function publishContentToClient(payload) {
    data.methodologies = (payload && payload.methodologies) || [];
    data.jobTitles = (payload && payload.jobTitles) || [];
    data.jargon = (payload && payload.jargon) || {};
    data.referenceSections = (payload && payload.referenceSections) || [];
    data.contentRevision = contentRevision(getAllContentRecords());
    data.changelogSeen = readChangelogSeenPreference();

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

  function jobTitleIdFromRow(row) {
    // Soft refs store bare job-title ids (`arch`); dehydrate uses clientId `jt:arch` only as a
    // row identity helper — never treat that prefix as the soft-ref key.
    if (row && row.content && row.content.id) {
      return String(row.content.id);
    }
    return '';
  }

  function validateSoftJobTitleRef(value, jobTitleIds, fieldLabel, rowIndex) {
    if (value == null || value === '') {
      return '';
    }
    var roleId = String(value);
    if (!jobTitleIds[roleId]) {
      return 'Unknown job_title soft ref "' + roleId + '" in ' + fieldLabel + ' at row ' + rowIndex + '.';
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

    var jobTitleIds = {};
    var index;
    var row;
    var type;
    var softRefError;

    for (index = 0; index < flatRows.length; index++) {
      row = flatRows[index];
      type = row && row.type;

      if (!type || (DMContentModel.ALLOWED_TYPES && !DMContentModel.ALLOWED_TYPES[type])) {
        return 'Disallowed or missing content type at row ' + index + ': ' + type;
      }

      if (type === 'job_title') {
        var jobTitleId = jobTitleIdFromRow(row);
        if (!jobTitleId) {
          return 'job_title row ' + index + ' is missing an id.';
        }
        jobTitleIds[jobTitleId] = true;
      }
    }

    for (index = 0; index < flatRows.length; index++) {
      row = flatRows[index];
      type = row && row.type;
      var content = (row && row.content) || {};

      if (type === 'participant' || type === 'raci' || type === 'job_aid_role') {
        softRefError = validateSoftJobTitleRef(content.job_title, jobTitleIds, type + '.job_title', index);
        if (softRefError) {
          return softRefError;
        }
      }

      if (type === 'level_of_effort' && content.job_title != null && content.job_title !== '') {
        softRefError = validateSoftJobTitleRef(content.job_title, jobTitleIds, 'level_of_effort.job_title', index);
        if (softRefError) {
          return softRefError;
        }
      }

      if (type === 'meeting') {
        softRefError = validateSoftJobTitleRef(content.scheduledBy, jobTitleIds, 'meeting.scheduledBy', index);
        if (softRefError) {
          return softRefError;
        }
        softRefError = validateSoftJobTitleRef(content.ledBy, jobTitleIds, 'meeting.ledBy', index);
        if (softRefError) {
          return softRefError;
        }
      }
    }

    return '';
  }

  function instanceOrigins() {
    var origins = [];
    try {
      var servletUri = gs.getProperty('glide.servlet.uri');
      if (servletUri) {
        origins.push(String(servletUri).replace(/\/$/, ''));
      }
    } catch (originError) {
      /* property unavailable — DMUrlPolicy still strips *.service-now.com */
    }
    return origins;
  }

  function saveContent(payload) {
    var validationError = validateSavePayload(payload);

    if (validationError) {
      data.error = validationError;
      gs.warn(logPrefix + validationError);
      return false;
    }

    var snapshotRecords = getAllContentRecords();
    var expectedRevision = payload && payload.contentRevision != null
      ? String(payload.contentRevision)
      : '';
    var currentRevision = contentRevision(snapshotRecords);

    // Empty expected = first save from a client that never loaded (or harness). Otherwise require
    // the fingerprint from the last load so concurrent full-replace cannot last-write-wins silently.
    if (expectedRevision && expectedRevision !== currentRevision) {
      data.error = 'Content was changed elsewhere. Reload and try again.';
      gs.warn(logPrefix + 'contentRevision mismatch expected=' + expectedRevision +
        ' current=' + currentRevision);
      publishContentToClient(DMContentModel.hydrate(snapshotRecords));
      return false;
    }

    var flatRows;

    try {
      flatRows = DMContentModel.dehydrate(payload, {
        instanceOrigins: instanceOrigins()
      });
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

  // One-time "Import Delivery 2.0 content" action - offered to editors when a fresh instance's
  // content table is empty (see js/data/standard-content.js's own header for provenance). Reuses
  // saveContent() wholesale rather than a second insert path: dehydrate/validate/parent-link/
  // create is exactly the same job whether the payload came from a client's edit or from this
  // bundled starter. The ONLY new logic here is the emptiness guard, which is what makes this
  // action structurally incapable of clobbering existing content - it refuses outright rather
  // than relying on the save path's contentRevision check (that only catches CONCURRENT edits,
  // not "there was already content here").
  function hasAnyContentRecords() {
    var contentRecord = new GlideRecordSecure(contentTable);
    contentRecord.setLimit(1);
    contentRecord.query();
    return contentRecord.next();
  }

  function importStandardContent() {
    if (hasAnyContentRecords()) {
      data.error = 'Content already exists - Delivery 2.0 content only imports into an empty table.';
      gs.warn(logPrefix + 'importStandardContent refused - table is not empty');
      loadContent();
      return false;
    }

    if (typeof DMStandardContent === 'undefined') {
      data.error = 'Delivery 2.0 content is not available on this instance.';
      gs.error(logPrefix + 'importStandardContent: DMStandardContent missing from the server ' +
        'bundle - check deploy.manifest.js files.contentModel includes js/data/standard-content.js');
      return false;
    }

    return saveContent({
      methodologies: DMStandardContent.methodologies,
      jobTitles: DMStandardContent.jobTitles,
      jargon: DMStandardContent.jargon,
      referenceSections: DMStandardContent.referenceSections
    });
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

  if (action === 'saveChangelogSeen') {
    writeChangelogSeenPreference(input && input.changelogSeen);
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
      referenceSections: input.referenceSections || [],
      contentRevision: input.contentRevision
    });
    return;
  }

  if (action === 'importStandardContent') {
    if (!data.canEdit) {
      data.error = 'Not authorized to edit content.';
      gs.warn(logPrefix + 'importStandardContent denied - caller lacks editor/admin');
      loadContent();
      return;
    }

    importStandardContent();
    return;
  }

  if (action === 'clearAll') {
    if (!data.canAdmin) {
      data.error = 'Not authorized to clear all content.';
      gs.warn(logPrefix + 'clearAll denied - caller lacks app/system admin');
      loadContent();
      return;
    }

    saveContent({
      methodologies: [],
      jobTitles: [],
      jargon: {},
      referenceSections: [],
      contentRevision: input && input.contentRevision
    });
    return;
  }

  loadContent();
})();
