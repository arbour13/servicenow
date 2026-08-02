/* Widget server script: load/edit the scoped group + page tables.
   Prefixed at package time with js/lib/docs-renderer.js + js/data/standard-content.js
   (DocsRenderer, DocsStandardContent - see deploy.manifest.js's files.contentModel).
   input.action: load (default) | loadPage | saveDraft | publish | discardDraft | seedStandard.
   One GlideRecordSecure per function.

   Draft/publish: a page's `markdown`/`html` are what readers see; `draftMarkdown`/`draftHtml` are
   a separate in-progress edit that never affects a reader until publish() copies draft -> live.
   saveDraft is gated by the editor role; publish (and discardDraft, since abandoning your own
   draft is no more dangerous than making it) by editor-or-admin - same split as
   deploy.manifest.js's roles block: editorRoleName can draft, adminRoleName can publish. */
(function () {
  data.error = '';
  data.saved = false;

  var logPrefix = 'Docs: ';
  var allowedActions = {
    load: true,
    loadPage: true,
    saveDraft: true,
    publish: true,
    discardDraft: true,
    seedStandard: true
  };

  function getAppScopeName() {
    try {
      if (typeof gs.getCurrentScopeName === 'function') {
        var scopeName = String(gs.getCurrentScopeName() || '');
        if (scopeName && scopeName !== 'global') {
          return scopeName;
        }
      }
    } catch (scopeError) {
      gs.warn(logPrefix + 'could not resolve scope name - ' + scopeError);
    }
    return '';
  }

  function getTableName(shortName) {
    var scopeName = getAppScopeName();
    if (scopeName) {
      return scopeName + '_' + shortName;
    }
    return shortName;
  }

  var appScopeName = getAppScopeName();
  data.canEdit = !!(appScopeName
    && (gs.hasRole(appScopeName + '.editor') || gs.hasRole(appScopeName + '.admin')));
  data.canPublish = !!(appScopeName && gs.hasRole(appScopeName + '.admin'));

  var groupTable = getTableName('group');
  var pageTable = getTableName('page');

  function isTablesReady() {
    return !!(groupTable && pageTable);
  }

  /* ------------------------------- reads ------------------------------- */

  function getAllGroups() {
    var groups = [];
    var groupRecord = new GlideRecordSecure(groupTable);
    groupRecord.orderBy('order');
    groupRecord.query();
    while (groupRecord.next()) {
      var plannedRaw = String(groupRecord.getValue('planned') || '[]');
      var planned = [];
      try { planned = JSON.parse(plannedRaw); } catch (parseError) { planned = []; }
      groups.push({
        systemId: String(groupRecord.getUniqueValue()),
        slug: String(groupRecord.getValue('slug') || ''),
        title: String(groupRecord.getValue('title') || ''),
        order: parseInt(groupRecord.getValue('order'), 10) || 0,
        planned: planned
      });
    }
    return groups;
  }

  function getAllPageSummaries() {
    var pages = [];
    var pageRecord = new GlideRecordSecure(pageTable);
    pageRecord.orderBy('order');
    pageRecord.query();
    while (pageRecord.next()) {
      pages.push({
        systemId: String(pageRecord.getUniqueValue()),
        groupSystemId: String(pageRecord.getValue('group') || ''),
        slug: String(pageRecord.getValue('slug') || ''),
        title: String(pageRecord.getValue('title') || ''),
        order: parseInt(pageRecord.getValue('order'), 10) || 0,
        html: String(pageRecord.getValue('html') || ''),
        hasDraft: !!String(pageRecord.getValue('draftMarkdown') || '').trim()
      });
    }
    return pages;
  }

  function findPageRecordBySlug(slug) {
    var pageRecord = new GlideRecordSecure(pageTable);
    pageRecord.addQuery('slug', slug);
    pageRecord.setLimit(1);
    pageRecord.query();
    if (pageRecord.next()) { return pageRecord; }
    return null;
  }

  // {pageSlug: {sectionSlug: true}} across every page EXCEPT the one being edited (its own section
  // set is recomputed fresh from the markdown actually being saved, not its last-saved row) -
  // mirrors build-docs.js's prescan, sourced from table rows instead of files. Reads `markdown`
  // (published), not `draftMarkdown` - a [[link]] should resolve against what's actually live, not
  // another author's in-progress draft.
  function buildLinkTargets(excludeSlug) {
    var linkTargets = {};
    var pageRecord = new GlideRecordSecure(pageTable);
    pageRecord.query();
    while (pageRecord.next()) {
      var slug = String(pageRecord.getValue('slug') || '');
      if (slug === excludeSlug) { continue; }
      linkTargets[slug] = DocsRenderer.scanSectionSlugs(String(pageRecord.getValue('markdown') || ''));
    }
    return linkTargets;
  }

  function loadContent() {
    data.groups = getAllGroups();
    data.pages = getAllPageSummaries();
  }

  function loadPage(slug) {
    var pageRecord = findPageRecordBySlug(slug);
    if (!pageRecord) {
      data.error = 'No page found for "' + slug + '".';
      gs.warn(logPrefix + 'loadPage: not found - ' + slug);
      return;
    }
    data.page = {
      systemId: String(pageRecord.getUniqueValue()),
      slug: String(pageRecord.getValue('slug') || ''),
      title: String(pageRecord.getValue('title') || ''),
      markdown: String(pageRecord.getValue('markdown') || ''),
      draftMarkdown: String(pageRecord.getValue('draftMarkdown') || ''),
      draftUpdatedBy: String(pageRecord.getValue('draftUpdatedBy') || ''),
      draftUpdatedOn: String(pageRecord.getValue('draftUpdatedOn') || '')
    };
  }

  /* ------------------------------- writes ------------------------------- */

  function saveDraft(slug, markdown) {
    var pageRecord = findPageRecordBySlug(slug);
    if (!pageRecord) {
      data.error = 'No page found for "' + slug + '".';
      gs.warn(logPrefix + 'saveDraft: not found - ' + slug);
      return;
    }

    var linkTargets = buildLinkTargets(slug);
    linkTargets[slug] = DocsRenderer.scanSectionSlugs(markdown);
    var rendered = DocsRenderer.renderPage(markdown, linkTargets);

    if (rendered.errors.length) {
      data.error = rendered.errors.join(' ');
      gs.warn(logPrefix + 'saveDraft rejected for ' + slug + ' - ' + data.error);
      loadPage(slug);
      return;
    }

    pageRecord.setValue('draftMarkdown', markdown);
    pageRecord.setValue('draftHtml', JSON.stringify({ title: rendered.title, lead: rendered.lead, sections: rendered.sections }));
    pageRecord.setValue('draftUpdatedBy', gs.getUserDisplayName());
    pageRecord.setValue('draftUpdatedOn', new GlideDateTime().getDisplayValue());
    pageRecord.update();

    data.saved = true;
    loadPage(slug);
  }

  function publish(slug) {
    var pageRecord = findPageRecordBySlug(slug);
    if (!pageRecord) {
      data.error = 'No page found for "' + slug + '".';
      gs.warn(logPrefix + 'publish: not found - ' + slug);
      return;
    }

    var draftMarkdown = String(pageRecord.getValue('draftMarkdown') || '');
    if (!draftMarkdown.trim()) {
      data.error = 'There is no draft to publish for "' + slug + '".';
      loadPage(slug);
      return;
    }

    pageRecord.setValue('markdown', draftMarkdown);
    pageRecord.setValue('html', String(pageRecord.getValue('draftHtml') || ''));
    pageRecord.setValue('title', String(pageRecord.getValue('title') || ''));
    pageRecord.setValue('draftMarkdown', '');
    pageRecord.setValue('draftHtml', '');
    pageRecord.setValue('draftUpdatedBy', '');
    pageRecord.setValue('draftUpdatedOn', '');
    pageRecord.update();

    data.saved = true;
    loadPage(slug);
  }

  function discardDraft(slug) {
    var pageRecord = findPageRecordBySlug(slug);
    if (!pageRecord) {
      data.error = 'No page found for "' + slug + '".';
      gs.warn(logPrefix + 'discardDraft: not found - ' + slug);
      return;
    }

    pageRecord.setValue('draftMarkdown', '');
    pageRecord.setValue('draftHtml', '');
    pageRecord.setValue('draftUpdatedBy', '');
    pageRecord.setValue('draftUpdatedOn', '');
    pageRecord.update();

    data.saved = true;
    loadPage(slug);
  }

  /* ------------------------------- seeding ------------------------------- */

  function hasAnyPageRecords() {
    var pageRecord = new GlideRecordSecure(pageTable);
    pageRecord.setLimit(1);
    pageRecord.query();
    return pageRecord.next();
  }

  function createGroupRecord(group) {
    var groupRecord = new GlideRecordSecure(groupTable);
    groupRecord.initialize();
    groupRecord.setValue('slug', group.slug);
    groupRecord.setValue('title', group.name);
    groupRecord.setValue('order', group.order || 0);
    groupRecord.setValue('planned', JSON.stringify(group.planned || []));
    var createdSystemId = groupRecord.insert();
    if (!createdSystemId) { return ''; }
    return String(createdSystemId);
  }

  function createPageRecord(page, groupSystemId) {
    var pageRecord = new GlideRecordSecure(pageTable);
    pageRecord.initialize();
    pageRecord.setValue('group', groupSystemId);
    pageRecord.setValue('slug', page.id);
    pageRecord.setValue('title', page.title);
    pageRecord.setValue('order', page.order || 0);
    pageRecord.setValue('markdown', page.markdown || '');
    pageRecord.setValue('html', JSON.stringify({ lead: page.lead, sections: page.sections }));
    var createdSystemId = pageRecord.insert();
    return !!createdSystemId;
  }

  // Seeds from DocsStandardContent - a generated snapshot of pages/**/*.md (see
  // scripts/build-docs.js), the same relationship Delivery Methodology's seedStandard() has to its
  // own DMStandardContent. Refuses on a non-empty page table rather than merging or overwriting -
  // seeding is for a fresh instance only.
  function seedStandard() {
    if (hasAnyPageRecords()) {
      data.error = 'Content already exists - standard content only loads into an empty table.';
      gs.warn(logPrefix + 'seedStandard refused - table is not empty');
      loadContent();
      return;
    }
    if (typeof DocsStandardContent === 'undefined') {
      data.error = 'Standard content is not available on this instance.';
      gs.error(logPrefix + 'seedStandard: DocsStandardContent missing');
      return;
    }

    var groupOrder = 0;
    DocsStandardContent.groups.forEach(function (group) {
      groupOrder += 10;
      var groupSystemId = createGroupRecord({
        slug: group.slug,
        name: group.name,
        order: groupOrder,
        planned: group.planned
      });
      if (!groupSystemId) {
        gs.error(logPrefix + 'seedStandard: failed to create group ' + group.slug);
        return;
      }
      var pageOrder = 0;
      group.pages.forEach(function (page) {
        pageOrder += 10;
        if (!createPageRecord({
          id: page.id,
          title: page.title,
          order: pageOrder,
          markdown: page.markdown,
          lead: page.lead,
          sections: page.sections
        }, groupSystemId)) {
          gs.error(logPrefix + 'seedStandard: failed to create page ' + page.id);
        }
      });
    });

    data.saved = true;
    loadContent();
  }

  /* ---------------------------------- dispatch ---------------------------------- */

  if (!isTablesReady()) {
    data.error = 'Docs tables are not configured.';
    gs.error(logPrefix + 'empty table name');
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

  if (action === 'loadPage') {
    loadPage(input.slug);
    return;
  }

  if (action === 'saveDraft') {
    if (!data.canEdit) {
      data.error = 'Not authorized to edit docs.';
      gs.warn(logPrefix + 'saveDraft denied - caller lacks editor/admin');
      loadPage(input.slug);
      return;
    }
    saveDraft(input.slug, input.markdown || '');
    return;
  }

  if (action === 'publish') {
    if (!data.canPublish) {
      data.error = 'Not authorized to publish docs.';
      gs.warn(logPrefix + 'publish denied - caller lacks admin');
      loadPage(input.slug);
      return;
    }
    publish(input.slug);
    return;
  }

  if (action === 'discardDraft') {
    if (!data.canEdit) {
      data.error = 'Not authorized to edit docs.';
      gs.warn(logPrefix + 'discardDraft denied - caller lacks editor/admin');
      loadPage(input.slug);
      return;
    }
    discardDraft(input.slug);
    return;
  }

  if (action === 'seedStandard') {
    if (!data.canEdit) {
      data.error = 'Not authorized to edit docs.';
      gs.warn(logPrefix + 'seedStandard denied - caller lacks editor/admin');
      loadContent();
      return;
    }
    seedStandard();
    return;
  }

  loadContent();
})();
