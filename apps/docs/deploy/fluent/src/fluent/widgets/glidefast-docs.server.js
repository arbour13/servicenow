/* Markdown -> HTML for ONE page's body text, at runtime (not build time). Same core algorithm as
   scripts/build-docs.js (escapeHtml/highlight/slugify/renderInline/renderBlocks) - keep the two in
   sync by hand if either changes; this is the one place they're allowed to diverge in BEHAVIOR
   (not shape): the build script throws on a bad [[link]] or a duplicate heading slug, because it
   runs once, unattended, against a human who'll see the failure and fix the markdown file before
   committing. This renderer instead COLLECTS problems into an `errors` array and still produces a
   best-effort render - it also drives an author's live preview while they're mid-edit, and an
   uncaught exception there would blank the whole preview over one typo instead of just flagging it.
   The caller (js/server/docs.server.js) is what decides errors.length blocks an actual save.

   Runs on the widget server (concatenated into the server script at package time) and, for the
   editor's live preview, in the browser too - see docs-editor.service.js.
   Exposes a bare `var DocsRenderer` so the concatenated ServiceNow server script can call it
   without relying on `window`/`self` (Rhino). */
var DocsRenderer = (function () {
  'use strict';

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Minimal JS syntax highlighter -> HTML string with .c-kw/.c-str/.c-num/.c-com/.c-fn token spans.
  // Verbatim copy of build-docs.js's own highlight() - keep the two in sync.
  function highlight(code) {
    var kw = { 'var': 1, 'new': 1, 'while': 1, 'if': 1, 'else': 1, 'for': 1, 'function': 1, 'return': 1, 'true': 1, 'false': 1, 'null': 1 };
    var out = '', i = 0;
    while (i < code.length) {
      var ch = code[i];
      if (ch === '/' && code[i + 1] === '*') {
        var j1 = i + 2;
        while (j1 < code.length && !(code[j1] === '*' && code[j1 + 1] === '/')) { j1++; }
        j1 += 2;
        out += '<span class="c-com">' + escapeHtml(code.slice(i, Math.min(j1, code.length))) + '</span>'; i = j1; continue;
      }
      if (ch === '/' && code[i + 1] === '/') {
        var j2 = i; while (j2 < code.length && code[j2] !== '\n') { j2++; }
        out += '<span class="c-com">' + escapeHtml(code.slice(i, j2)) + '</span>'; i = j2; continue;
      }
      if (ch === "'" || ch === '"') {
        var j3 = i + 1;
        while (j3 < code.length && code[j3] !== ch) { if (code[j3] === '\\') { j3++; } j3++; }
        j3++;
        out += '<span class="c-str">' + escapeHtml(code.slice(i, Math.min(j3, code.length))) + '</span>'; i = j3; continue;
      }
      if (/[A-Za-z_$]/.test(ch)) {
        var j4 = i; while (j4 < code.length && /[A-Za-z0-9_$]/.test(code[j4])) { j4++; }
        var w = code.slice(i, j4);
        if (kw[w]) { out += '<span class="c-kw">' + w + '</span>'; }
        else if (code[j4] === '(') { out += '<span class="c-fn">' + escapeHtml(w) + '</span>'; }
        else { out += escapeHtml(w); }
        i = j4; continue;
      }
      if (/[0-9]/.test(ch)) {
        var j5 = i; while (j5 < code.length && /[0-9.]/.test(code[j5])) { j5++; }
        out += '<span class="c-num">' + code.slice(i, j5) + '</span>'; i = j5; continue;
      }
      out += escapeHtml(ch); i++;
    }
    return out;
  }

  function slugify(title) {
    return String(title).toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  }

  var DOC_LINK_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

  // Same inline pass as build-docs.js's renderInline, except an unknown [[link]] target pushes to
  // `errors` and renders as plain escaped text (the raw [[...]] source) instead of throwing - see
  // this file's header comment for why.
  function renderInline(text, linkTargets, errors) {
    var codeSpans = [];
    var out = escapeHtml(text);

    out = out.replace(/`([^`]+)`/g, function (m, code) {
      codeSpans.push('<code>' + code + '</code>');
      return '\u0000' + (codeSpans.length - 1) + '\u0000';
    });

    out = out.split('\\*').join('\u0001');
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
    out = out.split('\u0001').join('*');

    out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    out = out.replace(DOC_LINK_RE, function (m, target, label) {
      var targetParts = target.trim().split('#');
      var pageSlug = targetParts[0];
      var sectionSlug = targetParts[1];
      var knownSections = linkTargets[pageSlug];
      var linkText = (label || target).trim();

      if (!knownSections) {
        errors.push('Unknown link target "' + pageSlug + '" (from [[' + target + ']]).');
        return escapeHtml('[[' + target + (label ? '|' + label : '') + ']]');
      }
      if (sectionSlug && !knownSections[sectionSlug]) {
        errors.push('Unknown section "' + sectionSlug + '" on page "' + pageSlug + '" (from [[' + target + ']]).');
        return escapeHtml('[[' + target + (label ? '|' + label : '') + ']]');
      }

      var href = 'docs:' + pageSlug + (sectionSlug ? '#' + sectionSlug : '');
      return '<a href="' + href + '" class="docs-link" data-page="' + pageSlug + '"' +
        (sectionSlug ? ' data-section="' + sectionSlug + '"' : '') + '>' + linkText + '</a>';
    });

    out = out.replace(/\u0000(\d+)\u0000/g, function (m, i) { return codeSpans[Number(i)]; });
    return out;
  }

  // Same shape as build-docs.js's registerSlug, except a collision gets a deduped -2/-3 suffix
  // (pushed to errors) instead of throwing - a mid-typing preview still needs a valid, unique DOM
  // id even while the author hasn't fixed the duplicate heading yet.
  function registerSlug(slugs, title, errors) {
    var base = slugify(title);
    var slug = base;
    var suffix = 2;
    while (slugs[slug]) {
      errors.push('Duplicate heading "' + title + '" - using "' + base + '-' + suffix + '" instead.');
      slug = base + '-' + suffix;
      suffix++;
    }
    slugs[slug] = true;
    return slug;
  }

  function splitTableRow(line) {
    return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (c) { return c.trim(); });
  }

  // `<!-- badge: Some Label -->` on its own line, anywhere in a section's body - strips the tag and
  // carries its free-text label out as a small pill next to the section heading.
  function extractBadge(lines) {
    var label = null;
    var kept = [];
    lines.forEach(function (line) {
      var m = line.match(/^<!--\s*badge:\s*([^>]+?)\s*-->\s*$/);
      if (m) {
        label = m[1].trim();
      } else {
        kept.push(line);
      }
    });
    return { label: label, lines: kept };
  }

  // Block-level markdown -> HTML for everything BELOW the h2 chunking. Same constructs as
  // build-docs.js's renderBlocks, just threading `errors` instead of throwing.
  function renderBlocks(lines, slugs, linkTargets, errors) {
    var html = [];
    var i = 0;

    while (i < lines.length) {
      var line = lines[i];

      if (!line.trim()) { i++; continue; }

      if (/^### /.test(line)) {
        var h3Title = line.slice(4).trim();
        html.push('<h3 id="docs-' + registerSlug(slugs, h3Title, errors) + '">' + renderInline(h3Title, linkTargets, errors) + '</h3>');
        i++;
        continue;
      }

      if (/^```/.test(line)) {
        var code = [];
        i++;
        while (i < lines.length && !/^```/.test(lines[i])) { code.push(lines[i]); i++; }
        i++; // closing fence
        html.push('<pre class="docs-pre"><code>' + highlight(code.join('\n')) + '</code></pre>');
        continue;
      }

      if (/^\* /.test(line)) {
        var items = [];
        while (i < lines.length && /^\* /.test(lines[i])) { items.push(lines[i].slice(2)); i++; }
        html.push('<ul>' + items.map(function (it) { return '<li>' + renderInline(it, linkTargets, errors) + '</li>'; }).join('') + '</ul>');
        continue;
      }

      if (/^\d+\. /.test(line)) {
        var numbered = [];
        while (i < lines.length && /^\d+\. /.test(lines[i])) { numbered.push(lines[i].replace(/^\d+\. /, '')); i++; }
        html.push('<ol>' + numbered.map(function (it) { return '<li>' + renderInline(it, linkTargets, errors) + '</li>'; }).join('') + '</ol>');
        continue;
      }

      if (/^\|/.test(line) && i + 1 < lines.length && /^\|[\s|:-]+\|$/.test(lines[i + 1].trim())) {
        var headerCells = splitTableRow(line);
        i += 2;
        var rows = [];
        while (i < lines.length && /^\|/.test(lines[i])) { rows.push(splitTableRow(lines[i])); i++; }
        var thead = '<tr>' + headerCells.map(function (c) { return '<th>' + renderInline(c, linkTargets, errors) + '</th>'; }).join('') + '</tr>';
        var tbody = rows.map(function (cells) {
          return '<tr>' + cells.map(function (c) { return '<td>' + renderInline(c, linkTargets, errors) + '</td>'; }).join('') + '</tr>';
        }).join('');
        html.push('<table class="docs-table"><thead>' + thead + '</thead><tbody>' + tbody + '</tbody></table>');
        continue;
      }

      var para = [];
      while (i < lines.length && lines[i].trim() &&
        !/^(### |```|\* |\d+\. |\|)/.test(lines[i])) {
        para.push(lines[i].trim());
        i++;
      }
      html.push('<p>' + renderInline(para.join(' '), linkTargets, errors) + '</p>');
    }

    return html.join('\n');
  }

  // Scans raw markdown for its OWN ##/### heading slugs, without a full render - used to build the
  // linkTargets map (page slug -> its section slug set) cheaply across every page when validating
  // one page's [[links]], mirroring build-docs.js's prescan but sourced from GlideRecord rows
  // instead of files (see docs.server.js's buildLinkTargets()).
  function scanSectionSlugs(markdown) {
    var slugs = {};
    String(markdown || '').replace(/\r\n/g, '\n').split('\n').forEach(function (line) {
      var h2 = line.match(/^## (.+)/);
      var h3 = line.match(/^### (.+)/);
      if (h2) { slugs[slugify(h2[1].trim())] = true; }
      if (h3) { slugs[slugify(h3[1].trim())] = true; }
    });
    return slugs;
  }

  // Parses and renders ONE page's raw markdown body into {title, lead, sections, errors}. `slugs`
  // is a FRESH {} scoped to just this page, not shared across every page in the docs app like
  // build-docs.js's registry - a heading only needs to be unique within its OWN page's DOM (only
  // one page is ever mounted at a time in the reader), not across the whole app; requiring global
  // uniqueness here would mean re-scanning every OTHER page just to validate one page's save.
  // `linkTargets` is {pageSlug: {sectionSlug: true}} across every KNOWN page (see
  // buildLinkTargets() in docs.server.js) - passed in rather than computed here, since building it
  // needs a GlideRecord query this pure function has no business making.
  function renderPage(markdown, linkTargets) {
    var errors = [];
    var raw = String(markdown || '').replace(/\r\n/g, '\n');
    var lines = raw.split('\n');

    if (!/^# /.test(lines[0] || '')) {
      errors.push('Page must start with a single "# Title" heading on its first line.');
      return { title: '', lead: '', sections: [], errors: errors };
    }

    var title = lines[0].slice(2).trim();
    var leadLines = [];
    var sections = [];
    var currentSection = null;
    var buffer = leadLines;

    lines.slice(1).forEach(function (line) {
      if (/^# /.test(line)) {
        errors.push('A second "# " heading was found and ignored - a page is exactly one title.');
        return;
      }
      if (/^## /.test(line)) {
        currentSection = { title: line.slice(3).trim(), lines: [] };
        sections.push(currentSection);
        buffer = currentSection.lines;
      } else {
        buffer.push(line);
      }
    });

    var slugs = {};
    var renderedSections = sections.map(function (section) {
      var id = registerSlug(slugs, section.title, errors);
      var badge = extractBadge(section.lines);
      var badgeHtml = badge.label ? ' <span class="docs-badge">' + escapeHtml(badge.label) + '</span>' : '';
      return {
        id: id,
        title: section.title,
        html: '<h2 id="docs-' + id + '">' + renderInline(section.title, linkTargets, errors) + badgeHtml + '</h2>\n' +
          renderBlocks(badge.lines, slugs, linkTargets, errors),
      };
    });

    return {
      title: title,
      lead: renderBlocks(leadLines, slugs, linkTargets, errors),
      sections: renderedSections,
      errors: errors,
    };
  }

  return {
    renderPage: renderPage,
    scanSectionSlugs: scanSectionSlugs,
    slugify: slugify,
  };
})();

if (typeof module === 'object' && module.exports) {
  module.exports = DocsRenderer;
}
if (typeof self !== 'undefined') {
  self.DocsRenderer = DocsRenderer;
}

/* GENERATED FILE - do not edit by hand. Built from every page under pages/ by scripts/build-docs.js
   (run: node scripts/build-docs.js). The one-time seed payload js/server/docs.server.js's
   seedStandard() action inserts into an EMPTY page table - see that script and
   deploy.manifest.js's files.contentModel. Bare `var` (not an Angular provider) so it works
   concatenated raw into the ServiceNow server script (Rhino has no `window`).

   Content edits belong in the markdown; renderer changes belong in the build script. */
var DocsStandardContent = {
  "groups": [
    {
      "slug": "principles",
      "name": "Principles",
      "planned": [],
      "pages": [
        {
          "id": "write-readable-code",
          "title": "Write Readable Code",
          "markdown": "# Write Readable Code\n\nOthers will work with your code in the future. Always make it easy to read and understand, and follow your organization's formatting standards. What is obvious today is rarely obvious six months from now.\n\n## Comment Your Code\n\nComments should be as well-written and clear as the code they annotate. A single-line comment starts with `//`; everything after it to the end of the line is the comment:\n\n```js\n// a comment can sit on its own line, above the code it explains\nvar count = 0;\n\ncount += batchSize; // or trail a statement, after the code on the same line\n```\n\nA block comment runs from `/*` to `*/`. Use [jsdoc](https://jsdoc.app/) syntax to describe a function's purpose, inputs, and outputs:\n\n```js\n/**\n * Save a user preference for the current user. If the preference already exists, check the\n * current value and update it only if necessary.\n *\n * @param {string} preferenceName Name of the user preference.\n * @param {string} preferenceValue Value of the user preference.\n * @returns {boolean} True if the preference was updated, false if it was left unchanged.\n */\n```\n\nKeep comments accurate and current - an out-of-date comment is worse than none, because it actively misleads. And write comments that add something. Restating the code teaches nothing:\n\n```js\n// unhelpful - the code already says this:\n// set i to 0\nvar i = 0;\n\n// helpful - explains intent that the code alone does not convey:\n// stop this record from ever reminding again\nrecordGr.setValue('return_reminder', new GlideDateTime());\nrecordGr.update();\n```\n\n## Use White Space\n\nEmpty lines and spaces make code readable, and readable code is easier to fix. Blank lines group related statements so the logical structure is visible; spaces within a line make the individual tokens legible. The **Format Code** button in the ServiceNow syntax editor adjusts indentation without disturbing your other spacing.\n\nCramped code hides its own logic:\n\n```js\nfunction createRelationship(typeId,childGr,parentGr){\nvar relationshipGr=new GlideRecord('cmdb_rel_ci');\nvar relationshipTypeGr=new GlideRecord('cmdb_rel_type');\nif(childGr==parentGr)\nreturn;\nif(relationshipTypeGr.get(typeId)){\nrelationshipGr.initialize();\nrelationshipGr.setValue('type',relationshipTypeGr.getUniqueValue());\nrelationshipGr.setValue('child',childGr.getValue('sys_id'));\nrelationshipGr.setValue('parent',parentGr.getValue('sys_id'));\nrelationshipGr.insert();\n}\n}\n```\n\nA few spaces, blank lines, and consistent braces make the same logic obvious - and always wrap an `if` body in curly braces, even a one-liner:\n\n```js\nfunction createRelationship(typeId, childGr, parentGr) {\n  var relationshipGr = new GlideRecord('cmdb_rel_ci');\n  var relationshipTypeGr = new GlideRecord('cmdb_rel_type');\n\n  if (childGr == parentGr) {\n    return;\n  }\n\n  if (relationshipTypeGr.get(typeId)) {\n    relationshipGr.initialize();\n\n    relationshipGr.setValue('type', relationshipTypeGr.getUniqueValue());\n    relationshipGr.setValue('child', childGr.getUniqueValue());\n    relationshipGr.setValue('parent', parentGr.getUniqueValue());\n\n    return relationshipGr.insert();\n  }\n}\n```\n\n## Write Simple Statements\n\nLess experienced developers may maintain your code later, so favor clarity over cleverness - it is the engine's job to make code fast, not yours. An experienced developer reads a ternary without effort:\n\n```js\nvar result = x === y ? a : b;\n```\n\nbut the plain form is unambiguous for everyone:\n\n```js\nvar result;\n\nif (x === y) {\n  result = a;\n\n} else {\n  result = b;\n}\n```\n\n## Use Descriptive Names\n\nMeaningful names tell the reader what the code is for. This is impossible to follow:\n\n```js\nfunction del(r, d, s) {\n  var a = 0;\n\n  if (s === 13) { // 13 = cancelled\n    r.deleteRecord();\n\n  } else {\n    a = d;\n  }\n\n  return a;\n}\n```\n\nRename everything for intent and it reads itself:\n\n```js\nfunction deleteIfCanceled(glideRecord, state, defaultAnswer) {\n  var answer = 0;\n\n  if (state === 13) { // 13 = cancelled\n    glideRecord.deleteRecord();\n\n  } else {\n    answer = defaultAnswer;\n  }\n\n  return answer;\n}\n```\n\nShort names are fine where convention makes them clear - `i` as a loop counter, for example:\n\n```js\nfor (var i = 0; i < list.length; i++) {\n  // process each item\n}\n```\n\n## Store Repeated Results in a Variable\n\nAvoid calling the same function repeatedly to get the same answer - it hurts both readability and, depending on the call, performance. Name the value once and reuse it:\n\n```js\nif (gs.getUserID() === current.getValue('assigned_to') ||\n  gs.getUserID() === current.getValue('u_coordinator') ||\n  gs.getUserID() === current.getValue('caller_id')) {\n    // do some processing here\n}\n```\n\nreads far better as:\n\n```js\nvar currentUser = gs.getUserID();\nvar isOwner = currentUser === current.getValue('assigned_to');\nvar isCoordinator = currentUser === current.getValue('u_coordinator');\nvar isCaller = currentUser === current.getValue('caller_id');\n\nif (isOwner || isCoordinator || isCaller) {\n  // do some processing here\n}\n```\n",
          "lead": "<p>Others will work with your code in the future. Always make it easy to read and understand, and follow your organization's formatting standards. What is obvious today is rarely obvious six months from now.</p>",
          "sections": [
            {
              "id": "comment-your-code",
              "title": "Comment Your Code",
              "html": "<h2 id=\"docs-comment-your-code\">Comment Your Code</h2>\n<p>Comments should be as well-written and clear as the code they annotate. A single-line comment starts with <code>//</code>; everything after it to the end of the line is the comment:</p>\n<pre class=\"docs-pre\"><code><span class=\"c-com\">// a comment can sit on its own line, above the code it explains</span>\n<span class=\"c-kw\">var</span> count = <span class=\"c-num\">0</span>;\n\ncount += batchSize; <span class=\"c-com\">// or trail a statement, after the code on the same line</span></code></pre>\n<p>A block comment runs from <code>/*</code> to <code>*/</code>. Use <a href=\"https://jsdoc.app/\" target=\"_blank\" rel=\"noopener\">jsdoc</a> syntax to describe a function's purpose, inputs, and outputs:</p>\n<pre class=\"docs-pre\"><code><span class=\"c-com\">/**\n * Save a user preference for the current user. If the preference already exists, check the\n * current value and update it only if necessary.\n *\n * @param {string} preferenceName Name of the user preference.\n * @param {string} preferenceValue Value of the user preference.\n * @returns {boolean} True if the preference was updated, false if it was left unchanged.\n */</span></code></pre>\n<p>Keep comments accurate and current - an out-of-date comment is worse than none, because it actively misleads. And write comments that add something. Restating the code teaches nothing:</p>\n<pre class=\"docs-pre\"><code><span class=\"c-com\">// unhelpful - the code already says this:</span>\n<span class=\"c-com\">// set i to 0</span>\n<span class=\"c-kw\">var</span> i = <span class=\"c-num\">0</span>;\n\n<span class=\"c-com\">// helpful - explains intent that the code alone does not convey:</span>\n<span class=\"c-com\">// stop this record from ever reminding again</span>\nrecordGr.<span class=\"c-fn\">setValue</span>(<span class=\"c-str\">'return_reminder'</span>, <span class=\"c-kw\">new</span> <span class=\"c-fn\">GlideDateTime</span>());\nrecordGr.<span class=\"c-fn\">update</span>();</code></pre>"
            },
            {
              "id": "use-white-space",
              "title": "Use White Space",
              "html": "<h2 id=\"docs-use-white-space\">Use White Space</h2>\n<p>Empty lines and spaces make code readable, and readable code is easier to fix. Blank lines group related statements so the logical structure is visible; spaces within a line make the individual tokens legible. The <strong>Format Code</strong> button in the ServiceNow syntax editor adjusts indentation without disturbing your other spacing.</p>\n<p>Cramped code hides its own logic:</p>\n<pre class=\"docs-pre\"><code><span class=\"c-kw\">function</span> <span class=\"c-fn\">createRelationship</span>(typeId,childGr,parentGr){\n<span class=\"c-kw\">var</span> relationshipGr=<span class=\"c-kw\">new</span> <span class=\"c-fn\">GlideRecord</span>(<span class=\"c-str\">'cmdb_rel_ci'</span>);\n<span class=\"c-kw\">var</span> relationshipTypeGr=<span class=\"c-kw\">new</span> <span class=\"c-fn\">GlideRecord</span>(<span class=\"c-str\">'cmdb_rel_type'</span>);\n<span class=\"c-kw\">if</span>(childGr==parentGr)\n<span class=\"c-kw\">return</span>;\n<span class=\"c-kw\">if</span>(relationshipTypeGr.<span class=\"c-fn\">get</span>(typeId)){\nrelationshipGr.<span class=\"c-fn\">initialize</span>();\nrelationshipGr.<span class=\"c-fn\">setValue</span>(<span class=\"c-str\">'type'</span>,relationshipTypeGr.<span class=\"c-fn\">getUniqueValue</span>());\nrelationshipGr.<span class=\"c-fn\">setValue</span>(<span class=\"c-str\">'child'</span>,childGr.<span class=\"c-fn\">getValue</span>(<span class=\"c-str\">'sys_id'</span>));\nrelationshipGr.<span class=\"c-fn\">setValue</span>(<span class=\"c-str\">'parent'</span>,parentGr.<span class=\"c-fn\">getValue</span>(<span class=\"c-str\">'sys_id'</span>));\nrelationshipGr.<span class=\"c-fn\">insert</span>();\n}\n}</code></pre>\n<p>A few spaces, blank lines, and consistent braces make the same logic obvious - and always wrap an <code>if</code> body in curly braces, even a one-liner:</p>\n<pre class=\"docs-pre\"><code><span class=\"c-kw\">function</span> <span class=\"c-fn\">createRelationship</span>(typeId, childGr, parentGr) {\n  <span class=\"c-kw\">var</span> relationshipGr = <span class=\"c-kw\">new</span> <span class=\"c-fn\">GlideRecord</span>(<span class=\"c-str\">'cmdb_rel_ci'</span>);\n  <span class=\"c-kw\">var</span> relationshipTypeGr = <span class=\"c-kw\">new</span> <span class=\"c-fn\">GlideRecord</span>(<span class=\"c-str\">'cmdb_rel_type'</span>);\n\n  <span class=\"c-kw\">if</span> (childGr == parentGr) {\n    <span class=\"c-kw\">return</span>;\n  }\n\n  <span class=\"c-kw\">if</span> (relationshipTypeGr.<span class=\"c-fn\">get</span>(typeId)) {\n    relationshipGr.<span class=\"c-fn\">initialize</span>();\n\n    relationshipGr.<span class=\"c-fn\">setValue</span>(<span class=\"c-str\">'type'</span>, relationshipTypeGr.<span class=\"c-fn\">getUniqueValue</span>());\n    relationshipGr.<span class=\"c-fn\">setValue</span>(<span class=\"c-str\">'child'</span>, childGr.<span class=\"c-fn\">getUniqueValue</span>());\n    relationshipGr.<span class=\"c-fn\">setValue</span>(<span class=\"c-str\">'parent'</span>, parentGr.<span class=\"c-fn\">getUniqueValue</span>());\n\n    <span class=\"c-kw\">return</span> relationshipGr.<span class=\"c-fn\">insert</span>();\n  }\n}</code></pre>"
            },
            {
              "id": "write-simple-statements",
              "title": "Write Simple Statements",
              "html": "<h2 id=\"docs-write-simple-statements\">Write Simple Statements</h2>\n<p>Less experienced developers may maintain your code later, so favor clarity over cleverness - it is the engine's job to make code fast, not yours. An experienced developer reads a ternary without effort:</p>\n<pre class=\"docs-pre\"><code><span class=\"c-kw\">var</span> result = x === y ? a : b;</code></pre>\n<p>but the plain form is unambiguous for everyone:</p>\n<pre class=\"docs-pre\"><code><span class=\"c-kw\">var</span> result;\n\n<span class=\"c-kw\">if</span> (x === y) {\n  result = a;\n\n} <span class=\"c-kw\">else</span> {\n  result = b;\n}</code></pre>"
            },
            {
              "id": "use-descriptive-names",
              "title": "Use Descriptive Names",
              "html": "<h2 id=\"docs-use-descriptive-names\">Use Descriptive Names</h2>\n<p>Meaningful names tell the reader what the code is for. This is impossible to follow:</p>\n<pre class=\"docs-pre\"><code><span class=\"c-kw\">function</span> <span class=\"c-fn\">del</span>(r, d, s) {\n  <span class=\"c-kw\">var</span> a = <span class=\"c-num\">0</span>;\n\n  <span class=\"c-kw\">if</span> (s === <span class=\"c-num\">13</span>) { <span class=\"c-com\">// 13 = cancelled</span>\n    r.<span class=\"c-fn\">deleteRecord</span>();\n\n  } <span class=\"c-kw\">else</span> {\n    a = d;\n  }\n\n  <span class=\"c-kw\">return</span> a;\n}</code></pre>\n<p>Rename everything for intent and it reads itself:</p>\n<pre class=\"docs-pre\"><code><span class=\"c-kw\">function</span> <span class=\"c-fn\">deleteIfCanceled</span>(glideRecord, state, defaultAnswer) {\n  <span class=\"c-kw\">var</span> answer = <span class=\"c-num\">0</span>;\n\n  <span class=\"c-kw\">if</span> (state === <span class=\"c-num\">13</span>) { <span class=\"c-com\">// 13 = cancelled</span>\n    glideRecord.<span class=\"c-fn\">deleteRecord</span>();\n\n  } <span class=\"c-kw\">else</span> {\n    answer = defaultAnswer;\n  }\n\n  <span class=\"c-kw\">return</span> answer;\n}</code></pre>\n<p>Short names are fine where convention makes them clear - <code>i</code> as a loop counter, for example:</p>\n<pre class=\"docs-pre\"><code><span class=\"c-kw\">for</span> (<span class=\"c-kw\">var</span> i = <span class=\"c-num\">0</span>; i &lt; list.length; i++) {\n  <span class=\"c-com\">// process each item</span>\n}</code></pre>"
            },
            {
              "id": "store-repeated-results-in-a-variable",
              "title": "Store Repeated Results in a Variable",
              "html": "<h2 id=\"docs-store-repeated-results-in-a-variable\">Store Repeated Results in a Variable</h2>\n<p>Avoid calling the same function repeatedly to get the same answer - it hurts both readability and, depending on the call, performance. Name the value once and reuse it:</p>\n<pre class=\"docs-pre\"><code><span class=\"c-kw\">if</span> (gs.<span class=\"c-fn\">getUserID</span>() === current.<span class=\"c-fn\">getValue</span>(<span class=\"c-str\">'assigned_to'</span>) ||\n  gs.<span class=\"c-fn\">getUserID</span>() === current.<span class=\"c-fn\">getValue</span>(<span class=\"c-str\">'u_coordinator'</span>) ||\n  gs.<span class=\"c-fn\">getUserID</span>() === current.<span class=\"c-fn\">getValue</span>(<span class=\"c-str\">'caller_id'</span>)) {\n    <span class=\"c-com\">// do some processing here</span>\n}</code></pre>\n<p>reads far better as:</p>\n<pre class=\"docs-pre\"><code><span class=\"c-kw\">var</span> currentUser = gs.<span class=\"c-fn\">getUserID</span>();\n<span class=\"c-kw\">var</span> isOwner = currentUser === current.<span class=\"c-fn\">getValue</span>(<span class=\"c-str\">'assigned_to'</span>);\n<span class=\"c-kw\">var</span> isCoordinator = currentUser === current.<span class=\"c-fn\">getValue</span>(<span class=\"c-str\">'u_coordinator'</span>);\n<span class=\"c-kw\">var</span> isCaller = currentUser === current.<span class=\"c-fn\">getValue</span>(<span class=\"c-str\">'caller_id'</span>);\n\n<span class=\"c-kw\">if</span> (isOwner || isCoordinator || isCaller) {\n  <span class=\"c-com\">// do some processing here</span>\n}</code></pre>"
            }
          ]
        },
        {
          "id": "structure-code-for-reuse",
          "title": "Structure Code for Reuse",
          "markdown": "# Structure Code for Reuse\n\nBreak work into small, focused pieces. Small functions are easy to write, easy to understand, and easy to test - and easy for the next person to modify. As you build them, keep an eye on how the pieces fit: running the same query inside ten separate functions is a sign the shape is wrong.\n\n## Create Small, Modular Components\n\nWhen you see the same logic repeated, extract a function. It raises quality, saves you hunting through near-identical blocks when something breaks, and keeps the code maintainable. A Script Include is the natural home for that shared server-side logic - a library other server scripts call:\n\n```js\nvar IncidentService = Class.create();\nIncidentService.prototype = {\n    initialize: function() {\n    },\n\n    getIncident: function(sysId) {\n        var incidentGr = new GlideRecord('incident');\n\n        if (incidentGr.get(sysId)) {\n            return incidentGr;\n        }\n\n        return null;\n    },\n\n    type: 'IncidentService'\n};\n```\n\nSuppose a process adds a user to one watch list, a different user to another, and a CI to a user-defined glide_list. Only the field and the element differ; the logic is identical. Write it once as `addGlideListElement(fieldValue, id)` and call it wherever you need it:\n\n```js\naddGlideListElement: function(fieldValue, id) {\n  var ids = [];\n\n  if (fieldValue) {\n    ids = fieldValue.split(',');\n  }\n\n  if (ids.indexOf(id) === -1) {\n    ids.push(id);\n  }\n\n  return ids.join(',');\n}\n```\n\nThen a Business Rule, workflow activity, or any other server script simply calls it:\n\n```js\nvar acmeIncident = new AcmeIncident();\n\nvar watchList = current.getValue('watch_list');\nvar userId = gs.getUserID();\n\ncurrent.setValue('watch_list', acmeIncident.addGlideListElement(watchList, userId));\n```\n\nWhen you test a function, test both valid and invalid inputs so it holds up in the real world.\n\n## Wrap Code in a Function\n\nCode that is not enclosed in a function leaks its variables into the shared server- or client-side scope, where they can collide with variables of the same name in other scripts. Those collisions are painful to debug, because the usual tools point at the script producing the wrong result, not the script that leaked the global. Wrapping every script in a function makes the whole class of problem go away.\n\nA Business Rule gives you the wrapper for free - keep it:\n\n```js\n(function executeRule(current, previous) {\n  var incidentGr = new GlideRecord('incident');\n\n  incidentGr.addQuery('active', true);\n  incidentGr.query();\n\n  while (incidentGr.next()) {\n    // do some processing here\n  }\n})(current, previous);\n```\n\nBecause `incidentGr` lives inside the function, no other script can see or clobber it. As added insurance, avoid the generic name `gr` entirely - a distinctive name makes a collision more remote still.\n\nA Client Script is wrapped by default for the same reason. Declare your variables inside the handler, never outside it:\n\n```js\nfunction onSubmit() {\n  var state = '6';\n\n  if (g_form.getValue('incident_state') === state) {\n    alert('This incident is Resolved');\n  }\n}\n```\n\nFor a script that only ever runs in one place - a transform map script, for instance - a self-executing function gives you the same isolation without a named, reusable definition. Inner functions declared inside it are private to it:\n\n```js\n(function () {\n  function helperFunction() {\n    // return some value\n  }\n\n  var value = helperFunction(); // valid - helperFunction is in scope here\n})();\n\nvar value2 = helperFunction(); // invalid - helperFunction is not visible out here\n```\n\n## Prefer Script Includes to Global Scripts\n\nA global script - a Business Rule or Client Script whose table is **Global** - loads on every page in the system, whether or not it is ever used there. Most such logic is narrow (an advanced reference qualifier on a single field, say), so loading it everywhere is pure overhead. A Script Include, by contrast, loads only when it is called.\n\nIf you have a global Business Rule, move its function into a Script Include of the same name; existing calls keep working unchanged. This global rule:\n\n```js\nfunction backfillAssignmentGroup() {\n  var assignmentGroupIds = [];\n\n  var assignedToId = current.getValue('assigned_to');\n\n  // return everything if the assigned_to value is empty\n  if (!assignedToId) {\n    return;\n  }\n\n  // sys_user_grmember holds the user-to-group relationship\n  var groupMemberGr = new GlideRecord('sys_user_grmember');\n\n  groupMemberGr.addQuery('user', assignedToId);\n  groupMemberGr.query();\n\n  while (groupMemberGr.next()) {\n    assignmentGroupIds.push(groupMemberGr.getValue('group'));\n  }\n\n  return 'sys_idIN' + assignmentGroupIds.join(',');\n}\n```\n\nbelongs in a Script Include:\n\n```js\nvar AssignmentGroup = Class.create();\nAssignmentGroup.prototype = {\n  initialize: function() {},\n\n  backfillAssignmentGroup: function() {\n    var assignmentGroupIds = [];\n\n    var assignedToId = current.getValue('assigned_to');\n\n    if (!assignedToId) {\n      return;\n    }\n\n    var groupMemberGr = new GlideRecord('sys_user_grmember');\n\n    groupMemberGr.addQuery('user', assignedToId);\n    groupMemberGr.query();\n\n    while (groupMemberGr.next()) {\n      assignmentGroupIds.push(groupMemberGr.getValue('group'));\n    }\n\n    return 'sys_idIN' + assignmentGroupIds.join(',');\n  },\n\n  type: 'AssignmentGroup'\n};\n```\n\nThe same reasoning applies on the client. Rather than a global Client Script, move field logic onto a base table such as Task or Configuration Item, where the extending tables inherit it - so it loads on those forms instead of every home page and catalog item in the instance.\n",
          "lead": "<p>Break work into small, focused pieces. Small functions are easy to write, easy to understand, and easy to test - and easy for the next person to modify. As you build them, keep an eye on how the pieces fit: running the same query inside ten separate functions is a sign the shape is wrong.</p>",
          "sections": [
            {
              "id": "create-small-modular-components",
              "title": "Create Small, Modular Components",
              "html": "<h2 id=\"docs-create-small-modular-components\">Create Small, Modular Components</h2>\n<p>When you see the same logic repeated, extract a function. It raises quality, saves you hunting through near-identical blocks when something breaks, and keeps the code maintainable. A Script Include is the natural home for that shared server-side logic - a library other server scripts call:</p>\n<pre class=\"docs-pre\"><code><span class=\"c-kw\">var</span> IncidentService = Class.<span class=\"c-fn\">create</span>();\nIncidentService.prototype = {\n    initialize: <span class=\"c-kw\">function</span>() {\n    },\n\n    getIncident: <span class=\"c-kw\">function</span>(sysId) {\n        <span class=\"c-kw\">var</span> incidentGr = <span class=\"c-kw\">new</span> <span class=\"c-fn\">GlideRecord</span>(<span class=\"c-str\">'incident'</span>);\n\n        <span class=\"c-kw\">if</span> (incidentGr.<span class=\"c-fn\">get</span>(sysId)) {\n            <span class=\"c-kw\">return</span> incidentGr;\n        }\n\n        <span class=\"c-kw\">return</span> <span class=\"c-kw\">null</span>;\n    },\n\n    type: <span class=\"c-str\">'IncidentService'</span>\n};</code></pre>\n<p>Suppose a process adds a user to one watch list, a different user to another, and a CI to a user-defined glide_list. Only the field and the element differ; the logic is identical. Write it once as <code>addGlideListElement(fieldValue, id)</code> and call it wherever you need it:</p>\n<pre class=\"docs-pre\"><code>addGlideListElement: <span class=\"c-kw\">function</span>(fieldValue, id) {\n  <span class=\"c-kw\">var</span> ids = [];\n\n  <span class=\"c-kw\">if</span> (fieldValue) {\n    ids = fieldValue.<span class=\"c-fn\">split</span>(<span class=\"c-str\">','</span>);\n  }\n\n  <span class=\"c-kw\">if</span> (ids.<span class=\"c-fn\">indexOf</span>(id) === -<span class=\"c-num\">1</span>) {\n    ids.<span class=\"c-fn\">push</span>(id);\n  }\n\n  <span class=\"c-kw\">return</span> ids.<span class=\"c-fn\">join</span>(<span class=\"c-str\">','</span>);\n}</code></pre>\n<p>Then a Business Rule, workflow activity, or any other server script simply calls it:</p>\n<pre class=\"docs-pre\"><code><span class=\"c-kw\">var</span> acmeIncident = <span class=\"c-kw\">new</span> <span class=\"c-fn\">AcmeIncident</span>();\n\n<span class=\"c-kw\">var</span> watchList = current.<span class=\"c-fn\">getValue</span>(<span class=\"c-str\">'watch_list'</span>);\n<span class=\"c-kw\">var</span> userId = gs.<span class=\"c-fn\">getUserID</span>();\n\ncurrent.<span class=\"c-fn\">setValue</span>(<span class=\"c-str\">'watch_list'</span>, acmeIncident.<span class=\"c-fn\">addGlideListElement</span>(watchList, userId));</code></pre>\n<p>When you test a function, test both valid and invalid inputs so it holds up in the real world.</p>"
            },
            {
              "id": "wrap-code-in-a-function",
              "title": "Wrap Code in a Function",
              "html": "<h2 id=\"docs-wrap-code-in-a-function\">Wrap Code in a Function</h2>\n<p>Code that is not enclosed in a function leaks its variables into the shared server- or client-side scope, where they can collide with variables of the same name in other scripts. Those collisions are painful to debug, because the usual tools point at the script producing the wrong result, not the script that leaked the global. Wrapping every script in a function makes the whole class of problem go away.</p>\n<p>A Business Rule gives you the wrapper for free - keep it:</p>\n<pre class=\"docs-pre\"><code>(<span class=\"c-kw\">function</span> <span class=\"c-fn\">executeRule</span>(current, previous) {\n  <span class=\"c-kw\">var</span> incidentGr = <span class=\"c-kw\">new</span> <span class=\"c-fn\">GlideRecord</span>(<span class=\"c-str\">'incident'</span>);\n\n  incidentGr.<span class=\"c-fn\">addQuery</span>(<span class=\"c-str\">'active'</span>, <span class=\"c-kw\">true</span>);\n  incidentGr.<span class=\"c-fn\">query</span>();\n\n  <span class=\"c-kw\">while</span> (incidentGr.<span class=\"c-fn\">next</span>()) {\n    <span class=\"c-com\">// do some processing here</span>\n  }\n})(current, previous);</code></pre>\n<p>Because <code>incidentGr</code> lives inside the function, no other script can see or clobber it. As added insurance, avoid the generic name <code>gr</code> entirely - a distinctive name makes a collision more remote still.</p>\n<p>A Client Script is wrapped by default for the same reason. Declare your variables inside the handler, never outside it:</p>\n<pre class=\"docs-pre\"><code><span class=\"c-kw\">function</span> <span class=\"c-fn\">onSubmit</span>() {\n  <span class=\"c-kw\">var</span> state = <span class=\"c-str\">'6'</span>;\n\n  <span class=\"c-kw\">if</span> (g_form.<span class=\"c-fn\">getValue</span>(<span class=\"c-str\">'incident_state'</span>) === state) {\n    <span class=\"c-fn\">alert</span>(<span class=\"c-str\">'This incident is Resolved'</span>);\n  }\n}</code></pre>\n<p>For a script that only ever runs in one place - a transform map script, for instance - a self-executing function gives you the same isolation without a named, reusable definition. Inner functions declared inside it are private to it:</p>\n<pre class=\"docs-pre\"><code>(<span class=\"c-kw\">function</span> () {\n  <span class=\"c-kw\">function</span> <span class=\"c-fn\">helperFunction</span>() {\n    <span class=\"c-com\">// return some value</span>\n  }\n\n  <span class=\"c-kw\">var</span> value = <span class=\"c-fn\">helperFunction</span>(); <span class=\"c-com\">// valid - helperFunction is in scope here</span>\n})();\n\n<span class=\"c-kw\">var</span> value2 = <span class=\"c-fn\">helperFunction</span>(); <span class=\"c-com\">// invalid - helperFunction is not visible out here</span></code></pre>"
            },
            {
              "id": "prefer-script-includes-to-global-scripts",
              "title": "Prefer Script Includes to Global Scripts",
              "html": "<h2 id=\"docs-prefer-script-includes-to-global-scripts\">Prefer Script Includes to Global Scripts</h2>\n<p>A global script - a Business Rule or Client Script whose table is <strong>Global</strong> - loads on every page in the system, whether or not it is ever used there. Most such logic is narrow (an advanced reference qualifier on a single field, say), so loading it everywhere is pure overhead. A Script Include, by contrast, loads only when it is called.</p>\n<p>If you have a global Business Rule, move its function into a Script Include of the same name; existing calls keep working unchanged. This global rule:</p>\n<pre class=\"docs-pre\"><code><span class=\"c-kw\">function</span> <span class=\"c-fn\">backfillAssignmentGroup</span>() {\n  <span class=\"c-kw\">var</span> assignmentGroupIds = [];\n\n  <span class=\"c-kw\">var</span> assignedToId = current.<span class=\"c-fn\">getValue</span>(<span class=\"c-str\">'assigned_to'</span>);\n\n  <span class=\"c-com\">// return everything if the assigned_to value is empty</span>\n  <span class=\"c-kw\">if</span> (!assignedToId) {\n    <span class=\"c-kw\">return</span>;\n  }\n\n  <span class=\"c-com\">// sys_user_grmember holds the user-to-group relationship</span>\n  <span class=\"c-kw\">var</span> groupMemberGr = <span class=\"c-kw\">new</span> <span class=\"c-fn\">GlideRecord</span>(<span class=\"c-str\">'sys_user_grmember'</span>);\n\n  groupMemberGr.<span class=\"c-fn\">addQuery</span>(<span class=\"c-str\">'user'</span>, assignedToId);\n  groupMemberGr.<span class=\"c-fn\">query</span>();\n\n  <span class=\"c-kw\">while</span> (groupMemberGr.<span class=\"c-fn\">next</span>()) {\n    assignmentGroupIds.<span class=\"c-fn\">push</span>(groupMemberGr.<span class=\"c-fn\">getValue</span>(<span class=\"c-str\">'group'</span>));\n  }\n\n  <span class=\"c-kw\">return</span> <span class=\"c-str\">'sys_idIN'</span> + assignmentGroupIds.<span class=\"c-fn\">join</span>(<span class=\"c-str\">','</span>);\n}</code></pre>\n<p>belongs in a Script Include:</p>\n<pre class=\"docs-pre\"><code><span class=\"c-kw\">var</span> AssignmentGroup = Class.<span class=\"c-fn\">create</span>();\nAssignmentGroup.prototype = {\n  initialize: <span class=\"c-kw\">function</span>() {},\n\n  backfillAssignmentGroup: <span class=\"c-kw\">function</span>() {\n    <span class=\"c-kw\">var</span> assignmentGroupIds = [];\n\n    <span class=\"c-kw\">var</span> assignedToId = current.<span class=\"c-fn\">getValue</span>(<span class=\"c-str\">'assigned_to'</span>);\n\n    <span class=\"c-kw\">if</span> (!assignedToId) {\n      <span class=\"c-kw\">return</span>;\n    }\n\n    <span class=\"c-kw\">var</span> groupMemberGr = <span class=\"c-kw\">new</span> <span class=\"c-fn\">GlideRecord</span>(<span class=\"c-str\">'sys_user_grmember'</span>);\n\n    groupMemberGr.<span class=\"c-fn\">addQuery</span>(<span class=\"c-str\">'user'</span>, assignedToId);\n    groupMemberGr.<span class=\"c-fn\">query</span>();\n\n    <span class=\"c-kw\">while</span> (groupMemberGr.<span class=\"c-fn\">next</span>()) {\n      assignmentGroupIds.<span class=\"c-fn\">push</span>(groupMemberGr.<span class=\"c-fn\">getValue</span>(<span class=\"c-str\">'group'</span>));\n    }\n\n    <span class=\"c-kw\">return</span> <span class=\"c-str\">'sys_idIN'</span> + assignmentGroupIds.<span class=\"c-fn\">join</span>(<span class=\"c-str\">','</span>);\n  },\n\n  type: <span class=\"c-str\">'AssignmentGroup'</span>\n};</code></pre>\n<p>The same reasoning applies on the client. Rather than a global Client Script, move field logic onto a base table such as Task or Configuration Item, where the extending tables inherit it - so it loads on those forms instead of every home page and catalog item in the instance.</p>"
            }
          ]
        },
        {
          "id": "work-with-data-efficiently",
          "title": "Work with Data Efficiently",
          "markdown": "# Work with Data Efficiently\n\nEvery database interaction has a cost, and that cost grows as your instance does. Lean on the database to do the heavy lifting, and never fetch more than you need.\n\n## Avoid Complex GlideRecord Queries\n\nRather than assembling a result with a chain of `addQuery()` and `addOrCondition()` calls, build an encoded query and pass it to `addEncodedQuery()`. Consider \"all active Apple printers and computers in the Santa Ana office.\" The chained-condition version is fiddly to get right - and the moment the requirement changes (another location, another manufacturer), it becomes hard to maintain.\n\nInstead, build the filter in a list, copy its encoded query string, and use that. When the requirement changes, rebuild the filter, confirm the results with whoever owns the requirement, and drop the new string into the same script.\n\n## Prefer GlideQuery for Clear, Safe Queries\n<!-- badge: Extended guidance -->\n\nGlideQuery is a modern, fluent wrapper over the database that reads top to bottom as a single sentence and fails loudly when something is wrong. The same \"get one incident, guard the result\" shape you would build with GlideRecord becomes:\n\n```js\nvar incident = new GlideQuery('incident')\n  .where('sys_id', sysId)\n  .selectOne('number', 'priority')\n  .orElse(null);\n\nif (incident) {\n  // incident is a plain object - { sys_id, number, priority } - already narrowed to the fields you asked for\n}\n```\n\nTwo things make it safer than a hand-written GlideRecord loop. It is **null-safe**: `selectOne` returns an Optional, so you have to decide what happens when nothing matches (`orElse`) instead of forgetting the `if (gr.next())` guard. And it is **strict**: a mistyped field name throws immediately, where `gr.getValue('piority')` would hand back an empty string and send you hunting for the bug later.\n\nIt counts and aggregates too, so it can stand in for many GlideRecord and GlideAggregate patterns:\n\n```js\nvar activeCount = new GlideQuery('incident')\n  .where('active', true)\n  .count();\n```\n\nReach for GlideQuery for the everyday reads, writes, and counts in new code. GlideRecord is still the right tool when you are streaming a very large result set or need an API GlideQuery does not wrap - and the GlideRecord guidance above (guard the result, cap what you return, name the variable well) applies to GlideQuery just the same.\n\n## Use GlideAggregate for Simple Record Counting\n\nTo count rows you have two options: `getRowCount()` on a GlideRecord, or GlideAggregate. GlideRecord retrieves every matching record and then counts them, which does not scale as the table grows. GlideAggregate asks the database to count, which is fast and scales cleanly. Prefer it:\n\n```js\nfunction getIncidentCount(encodedQuery) {\n  var incidentGa = new GlideAggregate('incident');\n\n  incidentGa.addEncodedQuery(encodedQuery);\n  incidentGa.addAggregate('COUNT');\n  incidentGa.query();\n\n  if (incidentGa.next()) {\n    return parseInt(incidentGa.getAggregate('COUNT'), 10);\n  }\n\n  return 0;\n}\n```\n\n## Let the Database Do the Work\n\nWhenever you can, let the database return exactly the records you need. To check whether *at least one* active incident exists, a first attempt might query them all:\n\n```js\nvar incidentGr = new GlideRecord('incident');\n\nincidentGr.addQuery('active', true);\nincidentGr.query();\n\nif (incidentGr.hasNext()) {\n  // there is at least one active record\n}\n```\n\nIf there are 250,000 active records, `query()` retrieves all of them. Ask the database for one instead - it is far faster:\n\n```js\nvar incidentGr = new GlideRecord('incident');\n\nincidentGr.addQuery('active', true);\nincidentGr.setLimit(1); // return at most one record\nincidentGr.query();\n\nif (incidentGr.hasNext()) {\n  // there is at least one active record\n}\n```\n\n## Avoid Complex Queries on Large Data Sets\n\nLimit how often you search large tables; as the instance grows, those searches degrade performance. Imagine needing the importance of every upstream service related to a server whenever that server is added to an incident. On a small CMDB, querying the Relationship [cmdb_rel_ci] table is fine. On a CMDB with three million CIs and hundreds of thousands of relationships, that query could take hours.\n\nA better design precomputes the answer: maintain a related list of affected services on the CI, updated by a Business Rule as relationships change. When the CI is added to an incident, read the short related list instead of launching a long search across the relationship table.\n\n## Minimize Server Lookups\n\nClient code runs on data already on the form or data fetched from the server; use what is already there whenever you can, because server round trips are slow. The two efficient ways to pull from the server are `g_scratchpad` (pushed once, when the form loads) and an asynchronous GlideAjax call (requested on demand). Older approaches - `GlideRecord` on the client and `g_form.getReference()` - are no longer recommended: they fetch every field when you usually need one, and the client-side GlideRecord API is unavailable in scoped applications.\n\nWhen you know before load what the client will need, a display Business Rule can stage it in `g_scratchpad`:\n\n```js\ng_scratchpad.css = gs.getProperty('css.base.color');\ng_scratchpad.hasAttachments = current.hasAttachments();\ng_scratchpad.managerName = current.caller_id.manager.getDisplayValue();\n```\n\nWhen the need arises dynamically, call a client-callable Script Include asynchronously. Always use the asynchronous `getXMLAnswer()`, never a synchronous call. This is the client half of that call:\n\n```js\nfunction getIncident(sysId, callback) {\n  var incidentServiceAjax = new GlideAjax('IncidentService');\n\n  incidentServiceAjax.addParam('sysparm_name', 'getIncident');\n  incidentServiceAjax.addParam('sysparm_sys_id', sysId);\n\n  incidentServiceAjax.getXMLAnswer(function (response) {\n    callback(response ? JSON.parse(response) : null);\n  });\n}\n```\n\nbacked by an `AbstractAjaxProcessor` Script Include on the server:\n\n```js\nvar ConfigurationItem = Class.create();\nConfigurationItem.prototype = Object.extendsObject(AbstractAjaxProcessor, {\n  getSupportGroup: function() {\n    var configurationItemId = this.getParameter('sysparm_configuration_item_id');\n    var assignmentGroupId = this.getParameter('sysparm_assignment_group_id');\n\n    var configurationItemGr = new GlideRecord('cmdb_ci');\n\n    if (configurationItemGr.get(configurationItemId)) {\n      if (configurationItemGr.getValue('support_group') === assignmentGroupId) {\n        return 'CI support group and assignment group match';\n      }\n    }\n\n    return 'CI support group and assignment group do not match';\n  }\n});\n```\n\nOne more round trip worth avoiding: when you `setValue()` a reference field, pass the display value alongside the sys_id. Without it, the client makes a synchronous call back to the server just to resolve the label:\n\n```js\n// causes a synchronous server call to fetch the display value:\ng_form.setValue('assigned_to', assignedToId);\n\n// no server call - the display value is supplied:\ng_form.setValue('assigned_to', assignedToId, assignedToName);\n```\n",
          "lead": "<p>Every database interaction has a cost, and that cost grows as your instance does. Lean on the database to do the heavy lifting, and never fetch more than you need.</p>",
          "sections": [
            {
              "id": "avoid-complex-gliderecord-queries",
              "title": "Avoid Complex GlideRecord Queries",
              "html": "<h2 id=\"docs-avoid-complex-gliderecord-queries\">Avoid Complex GlideRecord Queries</h2>\n<p>Rather than assembling a result with a chain of <code>addQuery()</code> and <code>addOrCondition()</code> calls, build an encoded query and pass it to <code>addEncodedQuery()</code>. Consider \"all active Apple printers and computers in the Santa Ana office.\" The chained-condition version is fiddly to get right - and the moment the requirement changes (another location, another manufacturer), it becomes hard to maintain.</p>\n<p>Instead, build the filter in a list, copy its encoded query string, and use that. When the requirement changes, rebuild the filter, confirm the results with whoever owns the requirement, and drop the new string into the same script.</p>"
            },
            {
              "id": "prefer-glidequery-for-clear-safe-queries",
              "title": "Prefer GlideQuery for Clear, Safe Queries",
              "html": "<h2 id=\"docs-prefer-glidequery-for-clear-safe-queries\">Prefer GlideQuery for Clear, Safe Queries <span class=\"docs-badge\">Extended guidance</span></h2>\n<p>GlideQuery is a modern, fluent wrapper over the database that reads top to bottom as a single sentence and fails loudly when something is wrong. The same \"get one incident, guard the result\" shape you would build with GlideRecord becomes:</p>\n<pre class=\"docs-pre\"><code><span class=\"c-kw\">var</span> incident = <span class=\"c-kw\">new</span> <span class=\"c-fn\">GlideQuery</span>(<span class=\"c-str\">'incident'</span>)\n  .<span class=\"c-fn\">where</span>(<span class=\"c-str\">'sys_id'</span>, sysId)\n  .<span class=\"c-fn\">selectOne</span>(<span class=\"c-str\">'number'</span>, <span class=\"c-str\">'priority'</span>)\n  .<span class=\"c-fn\">orElse</span>(<span class=\"c-kw\">null</span>);\n\n<span class=\"c-kw\">if</span> (incident) {\n  <span class=\"c-com\">// incident is a plain object - { sys_id, number, priority } - already narrowed to the fields you asked for</span>\n}</code></pre>\n<p>Two things make it safer than a hand-written GlideRecord loop. It is <strong>null-safe</strong>: <code>selectOne</code> returns an Optional, so you have to decide what happens when nothing matches (<code>orElse</code>) instead of forgetting the <code>if (gr.next())</code> guard. And it is <strong>strict</strong>: a mistyped field name throws immediately, where <code>gr.getValue('piority')</code> would hand back an empty string and send you hunting for the bug later.</p>\n<p>It counts and aggregates too, so it can stand in for many GlideRecord and GlideAggregate patterns:</p>\n<pre class=\"docs-pre\"><code><span class=\"c-kw\">var</span> activeCount = <span class=\"c-kw\">new</span> <span class=\"c-fn\">GlideQuery</span>(<span class=\"c-str\">'incident'</span>)\n  .<span class=\"c-fn\">where</span>(<span class=\"c-str\">'active'</span>, <span class=\"c-kw\">true</span>)\n  .<span class=\"c-fn\">count</span>();</code></pre>\n<p>Reach for GlideQuery for the everyday reads, writes, and counts in new code. GlideRecord is still the right tool when you are streaming a very large result set or need an API GlideQuery does not wrap - and the GlideRecord guidance above (guard the result, cap what you return, name the variable well) applies to GlideQuery just the same.</p>"
            },
            {
              "id": "use-glideaggregate-for-simple-record-counting",
              "title": "Use GlideAggregate for Simple Record Counting",
              "html": "<h2 id=\"docs-use-glideaggregate-for-simple-record-counting\">Use GlideAggregate for Simple Record Counting</h2>\n<p>To count rows you have two options: <code>getRowCount()</code> on a GlideRecord, or GlideAggregate. GlideRecord retrieves every matching record and then counts them, which does not scale as the table grows. GlideAggregate asks the database to count, which is fast and scales cleanly. Prefer it:</p>\n<pre class=\"docs-pre\"><code><span class=\"c-kw\">function</span> <span class=\"c-fn\">getIncidentCount</span>(encodedQuery) {\n  <span class=\"c-kw\">var</span> incidentGa = <span class=\"c-kw\">new</span> <span class=\"c-fn\">GlideAggregate</span>(<span class=\"c-str\">'incident'</span>);\n\n  incidentGa.<span class=\"c-fn\">addEncodedQuery</span>(encodedQuery);\n  incidentGa.<span class=\"c-fn\">addAggregate</span>(<span class=\"c-str\">'COUNT'</span>);\n  incidentGa.<span class=\"c-fn\">query</span>();\n\n  <span class=\"c-kw\">if</span> (incidentGa.<span class=\"c-fn\">next</span>()) {\n    <span class=\"c-kw\">return</span> <span class=\"c-fn\">parseInt</span>(incidentGa.<span class=\"c-fn\">getAggregate</span>(<span class=\"c-str\">'COUNT'</span>), <span class=\"c-num\">10</span>);\n  }\n\n  <span class=\"c-kw\">return</span> <span class=\"c-num\">0</span>;\n}</code></pre>"
            },
            {
              "id": "let-the-database-do-the-work",
              "title": "Let the Database Do the Work",
              "html": "<h2 id=\"docs-let-the-database-do-the-work\">Let the Database Do the Work</h2>\n<p>Whenever you can, let the database return exactly the records you need. To check whether <em>at least one</em> active incident exists, a first attempt might query them all:</p>\n<pre class=\"docs-pre\"><code><span class=\"c-kw\">var</span> incidentGr = <span class=\"c-kw\">new</span> <span class=\"c-fn\">GlideRecord</span>(<span class=\"c-str\">'incident'</span>);\n\nincidentGr.<span class=\"c-fn\">addQuery</span>(<span class=\"c-str\">'active'</span>, <span class=\"c-kw\">true</span>);\nincidentGr.<span class=\"c-fn\">query</span>();\n\n<span class=\"c-kw\">if</span> (incidentGr.<span class=\"c-fn\">hasNext</span>()) {\n  <span class=\"c-com\">// there is at least one active record</span>\n}</code></pre>\n<p>If there are 250,000 active records, <code>query()</code> retrieves all of them. Ask the database for one instead - it is far faster:</p>\n<pre class=\"docs-pre\"><code><span class=\"c-kw\">var</span> incidentGr = <span class=\"c-kw\">new</span> <span class=\"c-fn\">GlideRecord</span>(<span class=\"c-str\">'incident'</span>);\n\nincidentGr.<span class=\"c-fn\">addQuery</span>(<span class=\"c-str\">'active'</span>, <span class=\"c-kw\">true</span>);\nincidentGr.<span class=\"c-fn\">setLimit</span>(<span class=\"c-num\">1</span>); <span class=\"c-com\">// return at most one record</span>\nincidentGr.<span class=\"c-fn\">query</span>();\n\n<span class=\"c-kw\">if</span> (incidentGr.<span class=\"c-fn\">hasNext</span>()) {\n  <span class=\"c-com\">// there is at least one active record</span>\n}</code></pre>"
            },
            {
              "id": "avoid-complex-queries-on-large-data-sets",
              "title": "Avoid Complex Queries on Large Data Sets",
              "html": "<h2 id=\"docs-avoid-complex-queries-on-large-data-sets\">Avoid Complex Queries on Large Data Sets</h2>\n<p>Limit how often you search large tables; as the instance grows, those searches degrade performance. Imagine needing the importance of every upstream service related to a server whenever that server is added to an incident. On a small CMDB, querying the Relationship [cmdb_rel_ci] table is fine. On a CMDB with three million CIs and hundreds of thousands of relationships, that query could take hours.</p>\n<p>A better design precomputes the answer: maintain a related list of affected services on the CI, updated by a Business Rule as relationships change. When the CI is added to an incident, read the short related list instead of launching a long search across the relationship table.</p>"
            },
            {
              "id": "minimize-server-lookups",
              "title": "Minimize Server Lookups",
              "html": "<h2 id=\"docs-minimize-server-lookups\">Minimize Server Lookups</h2>\n<p>Client code runs on data already on the form or data fetched from the server; use what is already there whenever you can, because server round trips are slow. The two efficient ways to pull from the server are <code>g_scratchpad</code> (pushed once, when the form loads) and an asynchronous GlideAjax call (requested on demand). Older approaches - <code>GlideRecord</code> on the client and <code>g_form.getReference()</code> - are no longer recommended: they fetch every field when you usually need one, and the client-side GlideRecord API is unavailable in scoped applications.</p>\n<p>When you know before load what the client will need, a display Business Rule can stage it in <code>g_scratchpad</code>:</p>\n<pre class=\"docs-pre\"><code>g_scratchpad.css = gs.<span class=\"c-fn\">getProperty</span>(<span class=\"c-str\">'css.base.color'</span>);\ng_scratchpad.hasAttachments = current.<span class=\"c-fn\">hasAttachments</span>();\ng_scratchpad.managerName = current.caller_id.manager.<span class=\"c-fn\">getDisplayValue</span>();</code></pre>\n<p>When the need arises dynamically, call a client-callable Script Include asynchronously. Always use the asynchronous <code>getXMLAnswer()</code>, never a synchronous call. This is the client half of that call:</p>\n<pre class=\"docs-pre\"><code><span class=\"c-kw\">function</span> <span class=\"c-fn\">getIncident</span>(sysId, callback) {\n  <span class=\"c-kw\">var</span> incidentServiceAjax = <span class=\"c-kw\">new</span> <span class=\"c-fn\">GlideAjax</span>(<span class=\"c-str\">'IncidentService'</span>);\n\n  incidentServiceAjax.<span class=\"c-fn\">addParam</span>(<span class=\"c-str\">'sysparm_name'</span>, <span class=\"c-str\">'getIncident'</span>);\n  incidentServiceAjax.<span class=\"c-fn\">addParam</span>(<span class=\"c-str\">'sysparm_sys_id'</span>, sysId);\n\n  incidentServiceAjax.<span class=\"c-fn\">getXMLAnswer</span>(<span class=\"c-kw\">function</span> (response) {\n    <span class=\"c-fn\">callback</span>(response ? JSON.<span class=\"c-fn\">parse</span>(response) : <span class=\"c-kw\">null</span>);\n  });\n}</code></pre>\n<p>backed by an <code>AbstractAjaxProcessor</code> Script Include on the server:</p>\n<pre class=\"docs-pre\"><code><span class=\"c-kw\">var</span> ConfigurationItem = Class.<span class=\"c-fn\">create</span>();\nConfigurationItem.prototype = Object.<span class=\"c-fn\">extendsObject</span>(AbstractAjaxProcessor, {\n  getSupportGroup: <span class=\"c-kw\">function</span>() {\n    <span class=\"c-kw\">var</span> configurationItemId = this.<span class=\"c-fn\">getParameter</span>(<span class=\"c-str\">'sysparm_configuration_item_id'</span>);\n    <span class=\"c-kw\">var</span> assignmentGroupId = this.<span class=\"c-fn\">getParameter</span>(<span class=\"c-str\">'sysparm_assignment_group_id'</span>);\n\n    <span class=\"c-kw\">var</span> configurationItemGr = <span class=\"c-kw\">new</span> <span class=\"c-fn\">GlideRecord</span>(<span class=\"c-str\">'cmdb_ci'</span>);\n\n    <span class=\"c-kw\">if</span> (configurationItemGr.<span class=\"c-fn\">get</span>(configurationItemId)) {\n      <span class=\"c-kw\">if</span> (configurationItemGr.<span class=\"c-fn\">getValue</span>(<span class=\"c-str\">'support_group'</span>) === assignmentGroupId) {\n        <span class=\"c-kw\">return</span> <span class=\"c-str\">'CI support group and assignment group match'</span>;\n      }\n    }\n\n    <span class=\"c-kw\">return</span> <span class=\"c-str\">'CI support group and assignment group do not match'</span>;\n  }\n});</code></pre>\n<p>One more round trip worth avoiding: when you <code>setValue()</code> a reference field, pass the display value alongside the sys_id. Without it, the client makes a synchronous call back to the server just to resolve the label:</p>\n<pre class=\"docs-pre\"><code><span class=\"c-com\">// causes a synchronous server call to fetch the display value:</span>\ng_form.<span class=\"c-fn\">setValue</span>(<span class=\"c-str\">'assigned_to'</span>, assignedToId);\n\n<span class=\"c-com\">// no server call - the display value is supplied:</span>\ng_form.<span class=\"c-fn\">setValue</span>(<span class=\"c-str\">'assigned_to'</span>, assignedToId, assignedToName);</code></pre>"
            }
          ]
        },
        {
          "id": "code-defensively",
          "title": "Code Defensively",
          "markdown": "# Code Defensively\n\nAssume inputs can be missing or wrong, and assume the state of the world can change between two lines of your script. Defensive code fails safely instead of silently.\n\n## Verify Values Exist Before Using Them\n\nCheck that a variable or field has a value before you use it, or you risk unpredictable results and log warnings:\n\n```js\nvar table = current.getTableName();\n\nif (table) {\n  gs.print('Table is: ' + table);\n\n} else {\n  gs.print('Warning: table is undefined');\n}\n```\n\n## Return a Meaningful Value\n\nGet in the habit of returning something from every function you write - the return value tells the caller how the call went. Common conventions are a count (0 to signal an error), a success flag (true for success), or an object (null for failure):\n\n```js\nif (!saveRecord(current)) {\n  gs.addErrorMessage('Save Error');\n}\n\nfunction saveRecord(glideRecord) {\n  var recordId = glideRecord.update();\n\n  if (!recordId.nil()) {\n    return true;\n  }\n\n  return false;\n}\n```\n\n## Handle Errors Gracefully\n\nSome operations can fail at runtime through no fault of your logic - parsing a string that turns out not to be valid JSON, calling an integration that times out, reading a record on a table a plugin never activated. An unhandled failure aborts the whole transaction, and the user gets a stack trace instead of a useful message. Wrap the operation that can realistically fail in a `try`/`catch`, log the error with enough context to find it, and fail safely:\n\n```js\nfunction getRequestPayload(jsonString) {\n  try {\n    return JSON.parse(jsonString);\n\n  } catch (e) {\n    // log with context so the failure is findable, then fail safely\n    gs.error('getRequestPayload: could not parse payload - ' + e.message);\n    return null;\n  }\n}\n```\n\nWrap the specific risky call, not the whole script - a blanket `try`/`catch` around everything hides the ordinary bugs you *want* to fail loudly while you are still developing. And always do something in the `catch`: an empty catch block swallows the problem and leaves you debugging a symptom far from its cause. This is the shape to follow - a `try`/`catch` that logs with `gs.error`.\n\n## Log at the Right Level\n\nServiceNow gives you leveled logging - `gs.info`, `gs.warn`, and `gs.error` - and each entry is tagged with its source and filterable by level in the system log. Match the level to the severity: `gs.error` for a genuine failure, `gs.warn` for a recoverable oddity worth noticing, `gs.info` for a milestone. The older `gs.log()` and `gs.print()` are global-scope holdovers - `gs.print` in particular writes only to background-script and node output, not the system log - so keep them for ad-hoc testing and reach for the leveled methods in code you ship.\n\nLog something you could actually debug from - carry the values that would let you reconstruct what happened, not a bare marker:\n\n```js\n// unhelpful - tells you it ran, nothing more:\ngs.info('here');\n\n// helpful - carries the context you would need to trace a problem:\ngs.info('AssignmentGroup: no group found for user ' + assignedToId);\n```\n\nVerbose tracing is invaluable during an incident and pure noise the rest of the time. Gate it behind a system property so you can switch it on without a code change, and leave it off by default:\n\n```js\nif (gs.getProperty('acme.debug') === 'true') {\n  gs.info('AssignmentGroup: resolved group to ' + groupId);\n}\n```\n\n## Double-Check Critical Input on the Server\n\nA Client Script validating input is good for the user - they learn about a problem before submitting. In this example, Low impact is not allowed with High priority:\n\n```js\nif (g_form.getValue('impact') === '3' && g_form.getValue('priority') === '1') {\n  g_form.showErrorBox('impact', 'Low impact not allowed with High priority');\n}\n```\n\nBut client-side validation is not enough on its own, because data can change between the moment the form is filled in and the moment it is submitted. Suppose a request lets users reserve items, showing only available ones. Two people open the form at the same time and both pick the same item - it still looks available to each, because neither has submitted. Re-check the critical condition in a Business Rule at submit time so the second request is caught:\n\n```js\n(function executeRule(current, previous) {\n  isCiAvailable();\n\n  function isCiAvailable() {\n    var loanerUtils = new LoanerUtils();\n\n    if (!loanerUtils.isAvailable(current.cmdb_ci, current.start_date, current.end_date)) {\n      gs.addErrorMessage(gs.getMessage('Sorry, that item has already been allocated'));\n\n      current.setValue('cmdb_ci', 'NULL');\n    }\n  }\n})(current, previous);\n```\n\n## Prevent Recursive Updates\n\nNever call `current.update()` in a Business Rule. `update()` fires the insert/update Business Rules on the same table again, which can make a rule call itself indefinitely. Changes made in a before rule are saved automatically once all before rules finish, and after rules should update related records, not the current one - so `current.update()` is never needed under normal guidelines. ServiceNow will detect and stop a recursive rule and log the error, but it costs performance you do not need to spend.\n\nIf a rare requirement genuinely needs an update outside those guidelines, pair it with `current.setWorkflow(false)` to stop Business Rules and related engines from running on that write and breaking the cycle.\n\n## Avoid the eval() Function\n\n`eval()` executes whatever string you hand it, which opens the door to injection and makes debugging harder - errors carry no line numbers. Where you must evaluate a string, use the platform API instead:\n\n```js\nGlideEvaluator.evaluateString('gs.log(\\'Hello World\\');');\n```\n",
          "lead": "<p>Assume inputs can be missing or wrong, and assume the state of the world can change between two lines of your script. Defensive code fails safely instead of silently.</p>",
          "sections": [
            {
              "id": "verify-values-exist-before-using-them",
              "title": "Verify Values Exist Before Using Them",
              "html": "<h2 id=\"docs-verify-values-exist-before-using-them\">Verify Values Exist Before Using Them</h2>\n<p>Check that a variable or field has a value before you use it, or you risk unpredictable results and log warnings:</p>\n<pre class=\"docs-pre\"><code><span class=\"c-kw\">var</span> table = current.<span class=\"c-fn\">getTableName</span>();\n\n<span class=\"c-kw\">if</span> (table) {\n  gs.<span class=\"c-fn\">print</span>(<span class=\"c-str\">'Table is: '</span> + table);\n\n} <span class=\"c-kw\">else</span> {\n  gs.<span class=\"c-fn\">print</span>(<span class=\"c-str\">'Warning: table is undefined'</span>);\n}</code></pre>"
            },
            {
              "id": "return-a-meaningful-value",
              "title": "Return a Meaningful Value",
              "html": "<h2 id=\"docs-return-a-meaningful-value\">Return a Meaningful Value</h2>\n<p>Get in the habit of returning something from every function you write - the return value tells the caller how the call went. Common conventions are a count (0 to signal an error), a success flag (true for success), or an object (null for failure):</p>\n<pre class=\"docs-pre\"><code><span class=\"c-kw\">if</span> (!<span class=\"c-fn\">saveRecord</span>(current)) {\n  gs.<span class=\"c-fn\">addErrorMessage</span>(<span class=\"c-str\">'Save Error'</span>);\n}\n\n<span class=\"c-kw\">function</span> <span class=\"c-fn\">saveRecord</span>(glideRecord) {\n  <span class=\"c-kw\">var</span> recordId = glideRecord.<span class=\"c-fn\">update</span>();\n\n  <span class=\"c-kw\">if</span> (!recordId.<span class=\"c-fn\">nil</span>()) {\n    <span class=\"c-kw\">return</span> <span class=\"c-kw\">true</span>;\n  }\n\n  <span class=\"c-kw\">return</span> <span class=\"c-kw\">false</span>;\n}</code></pre>"
            },
            {
              "id": "handle-errors-gracefully",
              "title": "Handle Errors Gracefully",
              "html": "<h2 id=\"docs-handle-errors-gracefully\">Handle Errors Gracefully</h2>\n<p>Some operations can fail at runtime through no fault of your logic - parsing a string that turns out not to be valid JSON, calling an integration that times out, reading a record on a table a plugin never activated. An unhandled failure aborts the whole transaction, and the user gets a stack trace instead of a useful message. Wrap the operation that can realistically fail in a <code>try</code>/<code>catch</code>, log the error with enough context to find it, and fail safely:</p>\n<pre class=\"docs-pre\"><code><span class=\"c-kw\">function</span> <span class=\"c-fn\">getRequestPayload</span>(jsonString) {\n  try {\n    <span class=\"c-kw\">return</span> JSON.<span class=\"c-fn\">parse</span>(jsonString);\n\n  } catch (e) {\n    <span class=\"c-com\">// log with context so the failure is findable, then fail safely</span>\n    gs.<span class=\"c-fn\">error</span>(<span class=\"c-str\">'getRequestPayload: could not parse payload - '</span> + e.message);\n    <span class=\"c-kw\">return</span> <span class=\"c-kw\">null</span>;\n  }\n}</code></pre>\n<p>Wrap the specific risky call, not the whole script - a blanket <code>try</code>/<code>catch</code> around everything hides the ordinary bugs you <em>want</em> to fail loudly while you are still developing. And always do something in the <code>catch</code>: an empty catch block swallows the problem and leaves you debugging a symptom far from its cause. This is the shape to follow - a <code>try</code>/<code>catch</code> that logs with <code>gs.error</code>.</p>"
            },
            {
              "id": "log-at-the-right-level",
              "title": "Log at the Right Level",
              "html": "<h2 id=\"docs-log-at-the-right-level\">Log at the Right Level</h2>\n<p>ServiceNow gives you leveled logging - <code>gs.info</code>, <code>gs.warn</code>, and <code>gs.error</code> - and each entry is tagged with its source and filterable by level in the system log. Match the level to the severity: <code>gs.error</code> for a genuine failure, <code>gs.warn</code> for a recoverable oddity worth noticing, <code>gs.info</code> for a milestone. The older <code>gs.log()</code> and <code>gs.print()</code> are global-scope holdovers - <code>gs.print</code> in particular writes only to background-script and node output, not the system log - so keep them for ad-hoc testing and reach for the leveled methods in code you ship.</p>\n<p>Log something you could actually debug from - carry the values that would let you reconstruct what happened, not a bare marker:</p>\n<pre class=\"docs-pre\"><code><span class=\"c-com\">// unhelpful - tells you it ran, nothing more:</span>\ngs.<span class=\"c-fn\">info</span>(<span class=\"c-str\">'here'</span>);\n\n<span class=\"c-com\">// helpful - carries the context you would need to trace a problem:</span>\ngs.<span class=\"c-fn\">info</span>(<span class=\"c-str\">'AssignmentGroup: no group found for user '</span> + assignedToId);</code></pre>\n<p>Verbose tracing is invaluable during an incident and pure noise the rest of the time. Gate it behind a system property so you can switch it on without a code change, and leave it off by default:</p>\n<pre class=\"docs-pre\"><code><span class=\"c-kw\">if</span> (gs.<span class=\"c-fn\">getProperty</span>(<span class=\"c-str\">'acme.debug'</span>) === <span class=\"c-str\">'true'</span>) {\n  gs.<span class=\"c-fn\">info</span>(<span class=\"c-str\">'AssignmentGroup: resolved group to '</span> + groupId);\n}</code></pre>"
            },
            {
              "id": "double-check-critical-input-on-the-server",
              "title": "Double-Check Critical Input on the Server",
              "html": "<h2 id=\"docs-double-check-critical-input-on-the-server\">Double-Check Critical Input on the Server</h2>\n<p>A Client Script validating input is good for the user - they learn about a problem before submitting. In this example, Low impact is not allowed with High priority:</p>\n<pre class=\"docs-pre\"><code><span class=\"c-kw\">if</span> (g_form.<span class=\"c-fn\">getValue</span>(<span class=\"c-str\">'impact'</span>) === <span class=\"c-str\">'3'</span> &amp;&amp; g_form.<span class=\"c-fn\">getValue</span>(<span class=\"c-str\">'priority'</span>) === <span class=\"c-str\">'1'</span>) {\n  g_form.<span class=\"c-fn\">showErrorBox</span>(<span class=\"c-str\">'impact'</span>, <span class=\"c-str\">'Low impact not allowed with High priority'</span>);\n}</code></pre>\n<p>But client-side validation is not enough on its own, because data can change between the moment the form is filled in and the moment it is submitted. Suppose a request lets users reserve items, showing only available ones. Two people open the form at the same time and both pick the same item - it still looks available to each, because neither has submitted. Re-check the critical condition in a Business Rule at submit time so the second request is caught:</p>\n<pre class=\"docs-pre\"><code>(<span class=\"c-kw\">function</span> <span class=\"c-fn\">executeRule</span>(current, previous) {\n  <span class=\"c-fn\">isCiAvailable</span>();\n\n  <span class=\"c-kw\">function</span> <span class=\"c-fn\">isCiAvailable</span>() {\n    <span class=\"c-kw\">var</span> loanerUtils = <span class=\"c-kw\">new</span> <span class=\"c-fn\">LoanerUtils</span>();\n\n    <span class=\"c-kw\">if</span> (!loanerUtils.<span class=\"c-fn\">isAvailable</span>(current.cmdb_ci, current.start_date, current.end_date)) {\n      gs.<span class=\"c-fn\">addErrorMessage</span>(gs.<span class=\"c-fn\">getMessage</span>(<span class=\"c-str\">'Sorry, that item has already been allocated'</span>));\n\n      current.<span class=\"c-fn\">setValue</span>(<span class=\"c-str\">'cmdb_ci'</span>, <span class=\"c-str\">'NULL'</span>);\n    }\n  }\n})(current, previous);</code></pre>"
            },
            {
              "id": "prevent-recursive-updates",
              "title": "Prevent Recursive Updates",
              "html": "<h2 id=\"docs-prevent-recursive-updates\">Prevent Recursive Updates</h2>\n<p>Never call <code>current.update()</code> in a Business Rule. <code>update()</code> fires the insert/update Business Rules on the same table again, which can make a rule call itself indefinitely. Changes made in a before rule are saved automatically once all before rules finish, and after rules should update related records, not the current one - so <code>current.update()</code> is never needed under normal guidelines. ServiceNow will detect and stop a recursive rule and log the error, but it costs performance you do not need to spend.</p>\n<p>If a rare requirement genuinely needs an update outside those guidelines, pair it with <code>current.setWorkflow(false)</code> to stop Business Rules and related engines from running on that write and breaking the cycle.</p>"
            },
            {
              "id": "avoid-the-eval-function",
              "title": "Avoid the eval() Function",
              "html": "<h2 id=\"docs-avoid-the-eval-function\">Avoid the eval() Function</h2>\n<p><code>eval()</code> executes whatever string you hand it, which opens the door to injection and makes debugging harder - errors carry no line numbers. Where you must evaluate a string, use the platform API instead:</p>\n<pre class=\"docs-pre\"><code>GlideEvaluator.<span class=\"c-fn\">evaluateString</span>(<span class=\"c-str\">'gs.log(\\'Hello World\\');'</span>);</code></pre>"
            }
          ]
        },
        {
          "id": "control-when-code-runs",
          "title": "Control When Code Runs",
          "markdown": "# Control When Code Runs\n\nCode that runs when it does not need to is wasted work - and on a form or a busy table, wasted work the user feels. Run logic only when its conditions are actually met.\n\n## Choose the Right Business Rule Timing\n\nThe **When** value decides whether a Business Rule runs before or after the record is written. Match it to what the rule does:\n\n| Value | Use it to |\n|-------|-----------|\n| display | Give client-side scripts access to server-side data (via `g_scratchpad`). |\n| before | Update fields on the current record - e.g. `current.setValue('state', 3);` before it is saved. |\n| after | Update related records that must be visible immediately. |\n| async | Update related records that can wait - metrics, SLAs - so control returns to the user sooner. |\n\nAn async rule is like an after rule but runs in the background after the commit; it frees the user sooner at the cost of updating related objects slightly later.\n\n## Order Business Rules and Client Scripts\n\nWhen more than one Business Rule runs at the same timing on the same table, the **Order** field decides the sequence - the lowest number runs first, and the default is 100. Order matters the moment one rule depends on what another just did. If a *before* rule sets `current.assignment_group` and a second *before* rule reads that group to pick an approver, the rule that sets the value must have the lower Order - otherwise the second rule runs first and reads an empty field.\n\nLeave gaps between the numbers - 100, 200, 300 rather than 1, 2, 3 - so you can slot a new rule between two existing ones later without renumbering the rest.\n\nAnd resist spreading one piece of order-dependent logic across many small rules just because you can. A chain of five rules that must fire in an exact sequence is hard to reason about, and a single changed Order number breaks it silently. When steps are tightly coupled, keep them together in one rule - or in one Script Include the rule calls - where the order is simply the order of the lines.\n\nClient Scripts have the same lever, with one catch: their **Order** field isn't on the form by default, so add it before you rely on it. The rule is identical - lower runs first - so when one onLoad or onChange script depends on a value another sets, give the script that sets it the lower Order.\n\n## Run Only What's Needed\n\nBecause Business Rules run on every insert, update, delete, or query to their table, always give them a condition. The condition is evaluated first; the script runs only if it passes. Without one, the rule executes for every operation on the table - more work, and harder to debug, since you can no longer tell at a glance which rules should have fired. Set the condition in the **Filter Conditions** (or **Condition**) field, not in the script.\n\nClient Scripts have no condition field, so an `onLoad` or `onChange` script runs in full every time the form loads. Do only necessary work, and add guards early. Starting from an inefficient handler that looks up the CI's support group on every change:\n\n```js\nfunction onChange(control, oldValue, newValue, isLoading) {\n  var ciSupportGroup = g_form.getReference('cmdb_ci').support_group;\n\n  if (ciSupportGroup && g_form.getValue('assignment_group')) {\n    g_form.setValue('assignment_group', ciSupportGroup.sys_id);\n  }\n}\n```\n\nlayer in the standard guards, cheapest first, so the expensive server call happens as rarely as possible:\n\n```js\nfunction onChange(control, oldValue, newValue, isLoading, isTemplate) {\n  // isLoading: nothing to do on form load - the logic already ran when the field last changed\n  if (isLoading) {\n    return;\n  }\n\n  // newValue: skip when the field was cleared\n  if (!newValue) {\n    return;\n  }\n\n  // only react to an actual change\n  if (newValue === oldValue) {\n    return;\n  }\n\n  // check what the client already knows before calling the server\n  if (g_form.getValue('assignment_group')) {\n    return;\n  }\n\n  var glideAjax = new GlideAjax('ConfigurationItem');\n\n  glideAjax.addParam('sysparm_name', 'getSupportGroup');\n  glideAjax.addParam('sysparm_ci', g_form.getValue('cmdb_ci'));\n\n  glideAjax.getXMLAnswer(function (response) {\n    g_form.setValue('assignment_group', response);\n  });\n}\n```\n\nTwo related habits: prefer a **UI Policy** to a Client Script when you only need to make a field mandatory, read-only, or visible - no script required. And remember that UI Policies and Client Scripts apply to forms only; to keep the same rules in a list, disable list editing, add an access control or data policy, or write an `onCellEdit` Client Script.\n",
          "lead": "<p>Code that runs when it does not need to is wasted work - and on a form or a busy table, wasted work the user feels. Run logic only when its conditions are actually met.</p>",
          "sections": [
            {
              "id": "choose-the-right-business-rule-timing",
              "title": "Choose the Right Business Rule Timing",
              "html": "<h2 id=\"docs-choose-the-right-business-rule-timing\">Choose the Right Business Rule Timing</h2>\n<p>The <strong>When</strong> value decides whether a Business Rule runs before or after the record is written. Match it to what the rule does:</p>\n<table class=\"docs-table\"><thead><tr><th>Value</th><th>Use it to</th></tr></thead><tbody><tr><td>display</td><td>Give client-side scripts access to server-side data (via <code>g_scratchpad</code>).</td></tr><tr><td>before</td><td>Update fields on the current record - e.g. <code>current.setValue('state', 3);</code> before it is saved.</td></tr><tr><td>after</td><td>Update related records that must be visible immediately.</td></tr><tr><td>async</td><td>Update related records that can wait - metrics, SLAs - so control returns to the user sooner.</td></tr></tbody></table>\n<p>An async rule is like an after rule but runs in the background after the commit; it frees the user sooner at the cost of updating related objects slightly later.</p>"
            },
            {
              "id": "order-business-rules-and-client-scripts",
              "title": "Order Business Rules and Client Scripts",
              "html": "<h2 id=\"docs-order-business-rules-and-client-scripts\">Order Business Rules and Client Scripts</h2>\n<p>When more than one Business Rule runs at the same timing on the same table, the <strong>Order</strong> field decides the sequence - the lowest number runs first, and the default is 100. Order matters the moment one rule depends on what another just did. If a <em>before</em> rule sets <code>current.assignment_group</code> and a second <em>before</em> rule reads that group to pick an approver, the rule that sets the value must have the lower Order - otherwise the second rule runs first and reads an empty field.</p>\n<p>Leave gaps between the numbers - 100, 200, 300 rather than 1, 2, 3 - so you can slot a new rule between two existing ones later without renumbering the rest.</p>\n<p>And resist spreading one piece of order-dependent logic across many small rules just because you can. A chain of five rules that must fire in an exact sequence is hard to reason about, and a single changed Order number breaks it silently. When steps are tightly coupled, keep them together in one rule - or in one Script Include the rule calls - where the order is simply the order of the lines.</p>\n<p>Client Scripts have the same lever, with one catch: their <strong>Order</strong> field isn't on the form by default, so add it before you rely on it. The rule is identical - lower runs first - so when one onLoad or onChange script depends on a value another sets, give the script that sets it the lower Order.</p>"
            },
            {
              "id": "run-only-whats-needed",
              "title": "Run Only What's Needed",
              "html": "<h2 id=\"docs-run-only-whats-needed\">Run Only What's Needed</h2>\n<p>Because Business Rules run on every insert, update, delete, or query to their table, always give them a condition. The condition is evaluated first; the script runs only if it passes. Without one, the rule executes for every operation on the table - more work, and harder to debug, since you can no longer tell at a glance which rules should have fired. Set the condition in the <strong>Filter Conditions</strong> (or <strong>Condition</strong>) field, not in the script.</p>\n<p>Client Scripts have no condition field, so an <code>onLoad</code> or <code>onChange</code> script runs in full every time the form loads. Do only necessary work, and add guards early. Starting from an inefficient handler that looks up the CI's support group on every change:</p>\n<pre class=\"docs-pre\"><code><span class=\"c-kw\">function</span> <span class=\"c-fn\">onChange</span>(control, oldValue, newValue, isLoading) {\n  <span class=\"c-kw\">var</span> ciSupportGroup = g_form.<span class=\"c-fn\">getReference</span>(<span class=\"c-str\">'cmdb_ci'</span>).support_group;\n\n  <span class=\"c-kw\">if</span> (ciSupportGroup &amp;&amp; g_form.<span class=\"c-fn\">getValue</span>(<span class=\"c-str\">'assignment_group'</span>)) {\n    g_form.<span class=\"c-fn\">setValue</span>(<span class=\"c-str\">'assignment_group'</span>, ciSupportGroup.sys_id);\n  }\n}</code></pre>\n<p>layer in the standard guards, cheapest first, so the expensive server call happens as rarely as possible:</p>\n<pre class=\"docs-pre\"><code><span class=\"c-kw\">function</span> <span class=\"c-fn\">onChange</span>(control, oldValue, newValue, isLoading, isTemplate) {\n  <span class=\"c-com\">// isLoading: nothing to do on form load - the logic already ran when the field last changed</span>\n  <span class=\"c-kw\">if</span> (isLoading) {\n    <span class=\"c-kw\">return</span>;\n  }\n\n  <span class=\"c-com\">// newValue: skip when the field was cleared</span>\n  <span class=\"c-kw\">if</span> (!newValue) {\n    <span class=\"c-kw\">return</span>;\n  }\n\n  <span class=\"c-com\">// only react to an actual change</span>\n  <span class=\"c-kw\">if</span> (newValue === oldValue) {\n    <span class=\"c-kw\">return</span>;\n  }\n\n  <span class=\"c-com\">// check what the client already knows before calling the server</span>\n  <span class=\"c-kw\">if</span> (g_form.<span class=\"c-fn\">getValue</span>(<span class=\"c-str\">'assignment_group'</span>)) {\n    <span class=\"c-kw\">return</span>;\n  }\n\n  <span class=\"c-kw\">var</span> glideAjax = <span class=\"c-kw\">new</span> <span class=\"c-fn\">GlideAjax</span>(<span class=\"c-str\">'ConfigurationItem'</span>);\n\n  glideAjax.<span class=\"c-fn\">addParam</span>(<span class=\"c-str\">'sysparm_name'</span>, <span class=\"c-str\">'getSupportGroup'</span>);\n  glideAjax.<span class=\"c-fn\">addParam</span>(<span class=\"c-str\">'sysparm_ci'</span>, g_form.<span class=\"c-fn\">getValue</span>(<span class=\"c-str\">'cmdb_ci'</span>));\n\n  glideAjax.<span class=\"c-fn\">getXMLAnswer</span>(<span class=\"c-kw\">function</span> (response) {\n    g_form.<span class=\"c-fn\">setValue</span>(<span class=\"c-str\">'assignment_group'</span>, response);\n  });\n}</code></pre>\n<p>Two related habits: prefer a <strong>UI Policy</strong> to a Client Script when you only need to make a field mandatory, read-only, or visible - no script required. And remember that UI Policies and Client Scripts apply to forms only; to keep the same rules in a list, disable list editing, add an access control or data policy, or write an <code>onCellEdit</code> Client Script.</p>"
            }
          ]
        },
        {
          "id": "avoid-common-pitfalls",
          "title": "Avoid Common Pitfalls",
          "markdown": "# Avoid Common Pitfalls\n\nA handful of specific mistakes cause an outsized share of hard-to-trace defects. Learn to spot them.\n\n## Do Not Use Hard-Coded Values\n\nHard-coded values produce unpredictable behavior and are hard to track down. sys_ids are the worst offenders - they differ between instances, so a value copied from a dev instance will not exist in production:\n\n```js\nvar taskId = '26c811f06075388068d07268c841dcd0';\nvar groupName = 'Service Desk';\n```\n\nLook the value up, or store it in a system property and read it with `gs.getProperty()`:\n\n```js\nvar taskId = gs.getProperty('acme.default.task');\nvar groupName = gs.getProperty('acme.group.name');\n```\n\nHard-coded names cause the same trouble the moment the organization changes. If a workflow needs approval from the IT director and you hard-code that person, you rewrite the workflow every time the role changes hands. Instead, create an **IT Director** group, use a Group Approval activity, and change group membership when the role changes - the workflow never moves.\n\n## Avoid Dot-Walking to a Reference's sys_id\n\nA reference field's value already *is* a sys_id, so dot-walking to `.sys_id` forces an extra database query to load the referenced record and read it back:\n\n```js\nvar id = current.caller_id.sys_id;\n```\n\nRead the field directly:\n\n```js\nvar id = current.getValue('caller_id');\n```\n\n## Use getDisplayValue() Effectively\n\nDo not hard-code the display field's name (`number`, `name`, and so on); use `getDisplayValue()`. Naming the field couples your code to a dictionary setting that can change:\n\n```js\nvar parent = current.parent.number;\nvar myCi = current.cmdb_ci.name;\n```\n\nIf someone changes the display field on the Configuration Item table from `name` to `serial_number`, the second line is now wrong. Ask for the display value and the platform gives you whatever the current display field is:\n\n```js\nvar parent = current.getDisplayValue('parent');\nvar myCi = current.getDisplayValue('cmdb_ci');\n```\n\n## Set Fields with setValue() and setDisplayValue()\n<!-- badge: Extended guidance -->\n\nSet fields the same deliberate way you read them - with `setValue()`, the write-side counterpart to `getValue()` - rather than assigning the field directly. Direct assignment leans on an auto-setter that blurs the line between a field's stored value and its display value, and can mishandle typed fields like dates, durations, and references. `setValue()` is explicit and type-safe:\n\n```js\n// fragile - relies on the auto-setter:\ncurrent.state = 3;\n\n// explicit and type-safe:\ncurrent.setValue('state', 3);\n```\n\nWhen what you have is the *display* value rather than the stored value - a choice label, or a reference by its name - use `setDisplayValue()` and let the platform resolve it to the underlying value:\n\n```js\n// set a reference field from the record's display name, not its sys_id:\ncurrent.setDisplayValue('assigned_to', 'Fred Luddy');\n```\n\nThe same idea applies on the client through `g_form.setValue()` - and when the field is a reference, pass the display value alongside the sys_id to avoid a round trip (see [[work-with-data-efficiently#minimize-server-lookups|Minimize Server Lookups]]).\n\n## Avoid DOM Manipulation\n\nAvoid manipulating the DOM directly - it breaks when browsers update, and referencing an out-of-box element by id or CSS selector breaks when that element's id or position changes. Use the GlideForm (`g_form`) API instead, or rethink the approach. The only place DOM work is defensible is where you own the DOM: UI Pages and the Service Portal.\n\n## Work in Stages\n\nDo not write hundreds of lines in one sitting, especially while learning something new - write a little, test it, and continue. It feels slower, but tracing a defect through a small increment beats hunting through a large one.\n\nAnd prove out new ideas in a sandbox, not a shared development instance. Experimenting inside an update set risks promoting unwanted changes; experimenting outside one can leave your development instance behaving unlike the others. If you have no sandbox, use a ServiceNow demo instance, then build the real thing in development once you understand the approach.\n",
          "lead": "<p>A handful of specific mistakes cause an outsized share of hard-to-trace defects. Learn to spot them.</p>",
          "sections": [
            {
              "id": "do-not-use-hard-coded-values",
              "title": "Do Not Use Hard-Coded Values",
              "html": "<h2 id=\"docs-do-not-use-hard-coded-values\">Do Not Use Hard-Coded Values</h2>\n<p>Hard-coded values produce unpredictable behavior and are hard to track down. sys_ids are the worst offenders - they differ between instances, so a value copied from a dev instance will not exist in production:</p>\n<pre class=\"docs-pre\"><code><span class=\"c-kw\">var</span> taskId = <span class=\"c-str\">'26c811f06075388068d07268c841dcd0'</span>;\n<span class=\"c-kw\">var</span> groupName = <span class=\"c-str\">'Service Desk'</span>;</code></pre>\n<p>Look the value up, or store it in a system property and read it with <code>gs.getProperty()</code>:</p>\n<pre class=\"docs-pre\"><code><span class=\"c-kw\">var</span> taskId = gs.<span class=\"c-fn\">getProperty</span>(<span class=\"c-str\">'acme.default.task'</span>);\n<span class=\"c-kw\">var</span> groupName = gs.<span class=\"c-fn\">getProperty</span>(<span class=\"c-str\">'acme.group.name'</span>);</code></pre>\n<p>Hard-coded names cause the same trouble the moment the organization changes. If a workflow needs approval from the IT director and you hard-code that person, you rewrite the workflow every time the role changes hands. Instead, create an <strong>IT Director</strong> group, use a Group Approval activity, and change group membership when the role changes - the workflow never moves.</p>"
            },
            {
              "id": "avoid-dot-walking-to-a-references-sysid",
              "title": "Avoid Dot-Walking to a Reference's sys_id",
              "html": "<h2 id=\"docs-avoid-dot-walking-to-a-references-sysid\">Avoid Dot-Walking to a Reference's sys_id</h2>\n<p>A reference field's value already <em>is</em> a sys_id, so dot-walking to <code>.sys_id</code> forces an extra database query to load the referenced record and read it back:</p>\n<pre class=\"docs-pre\"><code><span class=\"c-kw\">var</span> id = current.caller_id.sys_id;</code></pre>\n<p>Read the field directly:</p>\n<pre class=\"docs-pre\"><code><span class=\"c-kw\">var</span> id = current.<span class=\"c-fn\">getValue</span>(<span class=\"c-str\">'caller_id'</span>);</code></pre>"
            },
            {
              "id": "use-getdisplayvalue-effectively",
              "title": "Use getDisplayValue() Effectively",
              "html": "<h2 id=\"docs-use-getdisplayvalue-effectively\">Use getDisplayValue() Effectively</h2>\n<p>Do not hard-code the display field's name (<code>number</code>, <code>name</code>, and so on); use <code>getDisplayValue()</code>. Naming the field couples your code to a dictionary setting that can change:</p>\n<pre class=\"docs-pre\"><code><span class=\"c-kw\">var</span> parent = current.parent.number;\n<span class=\"c-kw\">var</span> myCi = current.cmdb_ci.name;</code></pre>\n<p>If someone changes the display field on the Configuration Item table from <code>name</code> to <code>serial_number</code>, the second line is now wrong. Ask for the display value and the platform gives you whatever the current display field is:</p>\n<pre class=\"docs-pre\"><code><span class=\"c-kw\">var</span> parent = current.<span class=\"c-fn\">getDisplayValue</span>(<span class=\"c-str\">'parent'</span>);\n<span class=\"c-kw\">var</span> myCi = current.<span class=\"c-fn\">getDisplayValue</span>(<span class=\"c-str\">'cmdb_ci'</span>);</code></pre>"
            },
            {
              "id": "set-fields-with-setvalue-and-setdisplayvalue",
              "title": "Set Fields with setValue() and setDisplayValue()",
              "html": "<h2 id=\"docs-set-fields-with-setvalue-and-setdisplayvalue\">Set Fields with setValue() and setDisplayValue() <span class=\"docs-badge\">Extended guidance</span></h2>\n<p>Set fields the same deliberate way you read them - with <code>setValue()</code>, the write-side counterpart to <code>getValue()</code> - rather than assigning the field directly. Direct assignment leans on an auto-setter that blurs the line between a field's stored value and its display value, and can mishandle typed fields like dates, durations, and references. <code>setValue()</code> is explicit and type-safe:</p>\n<pre class=\"docs-pre\"><code><span class=\"c-com\">// fragile - relies on the auto-setter:</span>\ncurrent.state = <span class=\"c-num\">3</span>;\n\n<span class=\"c-com\">// explicit and type-safe:</span>\ncurrent.<span class=\"c-fn\">setValue</span>(<span class=\"c-str\">'state'</span>, <span class=\"c-num\">3</span>);</code></pre>\n<p>When what you have is the <em>display</em> value rather than the stored value - a choice label, or a reference by its name - use <code>setDisplayValue()</code> and let the platform resolve it to the underlying value:</p>\n<pre class=\"docs-pre\"><code><span class=\"c-com\">// set a reference field from the record's display name, not its sys_id:</span>\ncurrent.<span class=\"c-fn\">setDisplayValue</span>(<span class=\"c-str\">'assigned_to'</span>, <span class=\"c-str\">'Fred Luddy'</span>);</code></pre>\n<p>The same idea applies on the client through <code>g_form.setValue()</code> - and when the field is a reference, pass the display value alongside the sys_id to avoid a round trip (see <a href=\"docs:work-with-data-efficiently#minimize-server-lookups\" class=\"docs-link\" data-page=\"work-with-data-efficiently\" data-section=\"minimize-server-lookups\">Minimize Server Lookups</a>).</p>"
            },
            {
              "id": "avoid-dom-manipulation",
              "title": "Avoid DOM Manipulation",
              "html": "<h2 id=\"docs-avoid-dom-manipulation\">Avoid DOM Manipulation</h2>\n<p>Avoid manipulating the DOM directly - it breaks when browsers update, and referencing an out-of-box element by id or CSS selector breaks when that element's id or position changes. Use the GlideForm (<code>g_form</code>) API instead, or rethink the approach. The only place DOM work is defensible is where you own the DOM: UI Pages and the Service Portal.</p>"
            },
            {
              "id": "work-in-stages",
              "title": "Work in Stages",
              "html": "<h2 id=\"docs-work-in-stages\">Work in Stages</h2>\n<p>Do not write hundreds of lines in one sitting, especially while learning something new - write a little, test it, and continue. It feels slower, but tracing a defect through a small increment beats hunting through a large one.</p>\n<p>And prove out new ideas in a sandbox, not a shared development instance. Experimenting inside an update set risks promoting unwanted changes; experimenting outside one can leave your development instance behaving unlike the others. If you have no sandbox, use a ServiceNow demo instance, then build the real thing in development once you understand the approach.</p>"
            }
          ]
        },
        {
          "id": "enforce-security",
          "title": "Enforce Security",
          "markdown": "# Enforce Security\n\nAccess control is the platform's job - until you write a line of server code, where you can either step around it or become it. Both directions deserve care: code that reads data on a user's behalf should respect what that user is allowed to see, and an access rule you write runs on every record it guards.\n\n## Keep ACL Scripts Fast\n<!-- badge: Extended guidance -->\n\nAn ACL script evaluates every time someone reads, writes, or even sees a record or field it protects - and on a list, that is once per row, per column. A cheap check costs nothing noticeable; a GlideRecord query inside the script is paid on every one of those evaluations and quietly tanks list performance. Keep an ACL script to in-memory checks - roles, and values already on the current record - and have it set `answer` to a boolean:\n\n```js\n// runs on every record this rule guards - keep it cheap, no queries\nanswer = gs.hasRole('incident_manager') || current.getValue('assigned_to') === gs.getUserID();\n```\n\nIf a rule genuinely needs data from another table, resolve it once and cache it rather than querying inside the ACL itself.\n\n## Enforce ACLs in Server Code with GlideRecordSecure\n<!-- badge: Extended guidance -->\n\nA plain `new GlideRecord()` runs with full rights and ignores access controls entirely. That is correct for trusted background logic, but dangerous the moment your code acts on behalf of a user - a client-callable Script Include answering a GlideAjax call, or a Scripted REST resource. There, use `GlideRecordSecure`, which enforces the same ACLs the user would hit in the UI, so your code cannot hand back records they were never allowed to see:\n\n```js\n// honors the caller's ACLs - they get only the records they are permitted to read\nvar incidentGr = new GlideRecordSecure('incident');\n\nincidentGr.addQuery('active', true);\nincidentGr.query();\n```\n\nThe rule of thumb: GlideRecord for trusted server-to-server work, GlideRecordSecure whenever a user's request is driving the query.\n\n## Back Reference Qualifiers with a Script Include\n<!-- badge: Extended guidance -->\n\nAn advanced reference qualifier decides which records a reference field is allowed to offer. Written inline on the dictionary entry, that logic is hard to test, impossible to reuse, and easy to lose. Move it into a Script Include that returns an encoded query and point the qualifier at it - the same \"extract shared logic, load it only when called\" reasoning behind preferring Script Includes to global scripts.\n\nThe `AssignmentGroup` Script Include shown in [[structure-code-for-reuse#prefer-script-includes-to-global-scripts|Prefer Script Includes to Global Scripts]] already returns exactly the right shape - a `sys_idIN…` string of the groups a user belongs to. A reference qualifier can call it directly:\n\n```\njavascript: new AssignmentGroup().backfillAssignmentGroup()\n```\n\nNow the field offers only valid groups, the logic lives in one testable place, and it loads only when that field is actually shown.\n",
          "lead": "<p>Access control is the platform's job - until you write a line of server code, where you can either step around it or become it. Both directions deserve care: code that reads data on a user's behalf should respect what that user is allowed to see, and an access rule you write runs on every record it guards.</p>",
          "sections": [
            {
              "id": "keep-acl-scripts-fast",
              "title": "Keep ACL Scripts Fast",
              "html": "<h2 id=\"docs-keep-acl-scripts-fast\">Keep ACL Scripts Fast <span class=\"docs-badge\">Extended guidance</span></h2>\n<p>An ACL script evaluates every time someone reads, writes, or even sees a record or field it protects - and on a list, that is once per row, per column. A cheap check costs nothing noticeable; a GlideRecord query inside the script is paid on every one of those evaluations and quietly tanks list performance. Keep an ACL script to in-memory checks - roles, and values already on the current record - and have it set <code>answer</code> to a boolean:</p>\n<pre class=\"docs-pre\"><code><span class=\"c-com\">// runs on every record this rule guards - keep it cheap, no queries</span>\nanswer = gs.<span class=\"c-fn\">hasRole</span>(<span class=\"c-str\">'incident_manager'</span>) || current.<span class=\"c-fn\">getValue</span>(<span class=\"c-str\">'assigned_to'</span>) === gs.<span class=\"c-fn\">getUserID</span>();</code></pre>\n<p>If a rule genuinely needs data from another table, resolve it once and cache it rather than querying inside the ACL itself.</p>"
            },
            {
              "id": "enforce-acls-in-server-code-with-gliderecordsecure",
              "title": "Enforce ACLs in Server Code with GlideRecordSecure",
              "html": "<h2 id=\"docs-enforce-acls-in-server-code-with-gliderecordsecure\">Enforce ACLs in Server Code with GlideRecordSecure <span class=\"docs-badge\">Extended guidance</span></h2>\n<p>A plain <code>new GlideRecord()</code> runs with full rights and ignores access controls entirely. That is correct for trusted background logic, but dangerous the moment your code acts on behalf of a user - a client-callable Script Include answering a GlideAjax call, or a Scripted REST resource. There, use <code>GlideRecordSecure</code>, which enforces the same ACLs the user would hit in the UI, so your code cannot hand back records they were never allowed to see:</p>\n<pre class=\"docs-pre\"><code><span class=\"c-com\">// honors the caller's ACLs - they get only the records they are permitted to read</span>\n<span class=\"c-kw\">var</span> incidentGr = <span class=\"c-kw\">new</span> <span class=\"c-fn\">GlideRecordSecure</span>(<span class=\"c-str\">'incident'</span>);\n\nincidentGr.<span class=\"c-fn\">addQuery</span>(<span class=\"c-str\">'active'</span>, <span class=\"c-kw\">true</span>);\nincidentGr.<span class=\"c-fn\">query</span>();</code></pre>\n<p>The rule of thumb: GlideRecord for trusted server-to-server work, GlideRecordSecure whenever a user's request is driving the query.</p>"
            },
            {
              "id": "back-reference-qualifiers-with-a-script-include",
              "title": "Back Reference Qualifiers with a Script Include",
              "html": "<h2 id=\"docs-back-reference-qualifiers-with-a-script-include\">Back Reference Qualifiers with a Script Include <span class=\"docs-badge\">Extended guidance</span></h2>\n<p>An advanced reference qualifier decides which records a reference field is allowed to offer. Written inline on the dictionary entry, that logic is hard to test, impossible to reuse, and easy to lose. Move it into a Script Include that returns an encoded query and point the qualifier at it - the same \"extract shared logic, load it only when called\" reasoning behind preferring Script Includes to global scripts.</p>\n<p>The <code>AssignmentGroup</code> Script Include shown in <a href=\"docs:structure-code-for-reuse#prefer-script-includes-to-global-scripts\" class=\"docs-link\" data-page=\"structure-code-for-reuse\" data-section=\"prefer-script-includes-to-global-scripts\">Prefer Script Includes to Global Scripts</a> already returns exactly the right shape - a <code>sys_idIN…</code> string of the groups a user belongs to. A reference qualifier can call it directly:</p>\n<pre class=\"docs-pre\"><code>javascript: <span class=\"c-kw\">new</span> <span class=\"c-fn\">AssignmentGroup</span>().<span class=\"c-fn\">backfillAssignmentGroup</span>()</code></pre>\n<p>Now the field offers only valid groups, the logic lives in one testable place, and it loads only when that field is actually shown.</p>"
            }
          ]
        }
      ]
    },
    {
      "slug": "build-it-well",
      "name": "Build It Well",
      "planned": [
        "Flows",
        "Widgets",
        "CSS",
        "Portals",
        "UI Builder"
      ],
      "pages": [
        {
          "id": "write-ui-actions-well",
          "title": "Write UI Actions Well",
          "markdown": "# Write UI Actions Well\n\nA UI Action is the button or link a user clicks on a form or list. It can run on the client, on the server, or hand off from one to the other - and choosing the right side, showing it only when it makes sense, and telling the user what happened are what separate a solid button from a confusing one.\n\n## Choose Client or Server\n<!-- badge: Extended guidance -->\n\nA **server** UI Action runs a script with `current` and `action` after the click - use it to change records and redirect. A **client** UI Action (the *Client* checkbox, with an `onclick` handler) runs in the browser with `g_form` and never touches the server on its own - use it for confirmation dialogs and form validation that should happen before anything is submitted.\n\nMatch the side to the work. Validation the browser can do needs no server round trip:\n\n```js\n// Client UI Action - runs in the browser with g_form\nfunction validateAndSubmit() {\n  if (!g_form.getValue('short_description')) {\n    g_form.addErrorMessage('Enter a short description first.');\n    return false;\n  }\n\n  g_form.save();\n}\n```\n\nWork that changes records belongs on the server, where it runs with `current`:\n\n```js\n// Server UI Action - runs with current and action\ncurrent.setValue('state', 3);\ncurrent.update();\n\ngs.addInfoMessage('Incident closed.');\naction.setRedirectURL(current); // send the user back to the saved record\n```\n\n## Always Give a UI Action a Condition\n<!-- badge: Extended guidance -->\n\nThe **Condition** field decides when the button or link appears. Leave it blank and the action shows for everyone, on every record, whether or not it could possibly apply - clutter at best, a confusing dead end at worst. Set the condition declaratively, the same way a Business Rule gets one, so the platform hides the action when it does not apply instead of the script running and bailing out:\n\n```js\ngs.hasRole('incident_manager') && current.active\n```\n\n## Redirect and Respond Deliberately\n<!-- badge: Extended guidance -->\n\nAfter a server UI Action does its work, tell the user what happened. `action.setRedirectURL()` sends them somewhere sensible - back to the saved record, on to a related list, or to a landing page - and `gs.addInfoMessage()` (or `addErrorMessage()`) confirms the outcome. Skipping both leaves the user on a stale form wondering whether the click did anything.\n\n## Reach for Declarative First\n<!-- badge: Extended guidance -->\n\nBefore writing a UI Action at all, ask whether it needs a script. If the goal is to set a field, flip a state, or show and hide controls, a UI Policy or a Flow often does it with no code to maintain - and the less script there is, the less there is to break when the form or the requirement changes.\n",
          "lead": "<p>A UI Action is the button or link a user clicks on a form or list. It can run on the client, on the server, or hand off from one to the other - and choosing the right side, showing it only when it makes sense, and telling the user what happened are what separate a solid button from a confusing one.</p>",
          "sections": [
            {
              "id": "choose-client-or-server",
              "title": "Choose Client or Server",
              "html": "<h2 id=\"docs-choose-client-or-server\">Choose Client or Server <span class=\"docs-badge\">Extended guidance</span></h2>\n<p>A <strong>server</strong> UI Action runs a script with <code>current</code> and <code>action</code> after the click - use it to change records and redirect. A <strong>client</strong> UI Action (the <em>Client</em> checkbox, with an <code>onclick</code> handler) runs in the browser with <code>g_form</code> and never touches the server on its own - use it for confirmation dialogs and form validation that should happen before anything is submitted.</p>\n<p>Match the side to the work. Validation the browser can do needs no server round trip:</p>\n<pre class=\"docs-pre\"><code><span class=\"c-com\">// Client UI Action - runs in the browser with g_form</span>\n<span class=\"c-kw\">function</span> <span class=\"c-fn\">validateAndSubmit</span>() {\n  <span class=\"c-kw\">if</span> (!g_form.<span class=\"c-fn\">getValue</span>(<span class=\"c-str\">'short_description'</span>)) {\n    g_form.<span class=\"c-fn\">addErrorMessage</span>(<span class=\"c-str\">'Enter a short description first.'</span>);\n    <span class=\"c-kw\">return</span> <span class=\"c-kw\">false</span>;\n  }\n\n  g_form.<span class=\"c-fn\">save</span>();\n}</code></pre>\n<p>Work that changes records belongs on the server, where it runs with <code>current</code>:</p>\n<pre class=\"docs-pre\"><code><span class=\"c-com\">// Server UI Action - runs with current and action</span>\ncurrent.<span class=\"c-fn\">setValue</span>(<span class=\"c-str\">'state'</span>, <span class=\"c-num\">3</span>);\ncurrent.<span class=\"c-fn\">update</span>();\n\ngs.<span class=\"c-fn\">addInfoMessage</span>(<span class=\"c-str\">'Incident closed.'</span>);\naction.<span class=\"c-fn\">setRedirectURL</span>(current); <span class=\"c-com\">// send the user back to the saved record</span></code></pre>"
            },
            {
              "id": "always-give-a-ui-action-a-condition",
              "title": "Always Give a UI Action a Condition",
              "html": "<h2 id=\"docs-always-give-a-ui-action-a-condition\">Always Give a UI Action a Condition <span class=\"docs-badge\">Extended guidance</span></h2>\n<p>The <strong>Condition</strong> field decides when the button or link appears. Leave it blank and the action shows for everyone, on every record, whether or not it could possibly apply - clutter at best, a confusing dead end at worst. Set the condition declaratively, the same way a Business Rule gets one, so the platform hides the action when it does not apply instead of the script running and bailing out:</p>\n<pre class=\"docs-pre\"><code>gs.<span class=\"c-fn\">hasRole</span>(<span class=\"c-str\">'incident_manager'</span>) &amp;&amp; current.active</code></pre>"
            },
            {
              "id": "redirect-and-respond-deliberately",
              "title": "Redirect and Respond Deliberately",
              "html": "<h2 id=\"docs-redirect-and-respond-deliberately\">Redirect and Respond Deliberately <span class=\"docs-badge\">Extended guidance</span></h2>\n<p>After a server UI Action does its work, tell the user what happened. <code>action.setRedirectURL()</code> sends them somewhere sensible - back to the saved record, on to a related list, or to a landing page - and <code>gs.addInfoMessage()</code> (or <code>addErrorMessage()</code>) confirms the outcome. Skipping both leaves the user on a stale form wondering whether the click did anything.</p>"
            },
            {
              "id": "reach-for-declarative-first",
              "title": "Reach for Declarative First",
              "html": "<h2 id=\"docs-reach-for-declarative-first\">Reach for Declarative First <span class=\"docs-badge\">Extended guidance</span></h2>\n<p>Before writing a UI Action at all, ask whether it needs a script. If the goal is to set a field, flip a state, or show and hide controls, a UI Policy or a Flow often does it with no code to maintain - and the less script there is, the less there is to break when the form or the requirement changes.</p>"
            }
          ]
        },
        {
          "id": "run-server-code-safely",
          "title": "Run Server Code Safely",
          "markdown": "# Run Server Code Safely\n\nCode that runs unattended - on a schedule, once across a whole table, or in a background window with full rights - has no user watching to catch a mistake, and often no undo. That earns it extra care: bound what it touches, make it safe to re-run, and prove it somewhere disposable first.\n\n## Scheduled Jobs\n<!-- badge: Extended guidance -->\n\nA Scheduled Job runs a script on a timer, unattended. Its danger is scale: a job that loops every matching record can hold resources for a long time and slow the instance for everyone. Bound the work - process a capped batch per run, or filter to only the records that still need attention - and let a later run pick up the rest, rather than trying to finish an unbounded set in one pass. When the job's real work can happen out of band, fire an event and let the event queue carry the load (see below) so the job itself returns quickly.\n\n## Fix Scripts\n<!-- badge: Extended guidance -->\n\nA Fix Script is a one-time data change, run once when its update set is committed to an instance. Two habits make it safe. Make it **idempotent** - safe to run twice - by checking state before it writes, so a re-run or a partial failure does not double-apply. And have it **log what it touched** so you can confirm afterward exactly what changed:\n\n```js\nvar updated = 0;\nvar incidentGr = new GlideRecord('incident');\n\nincidentGr.addQuery('category', 'inquiry');\nincidentGr.addQuery('subcategory', ''); // only the ones not already fixed - keeps a re-run safe\nincidentGr.query();\n\nwhile (incidentGr.next()) {\n  incidentGr.setValue('subcategory', 'general');\n  incidentGr.update();\n  updated++;\n}\n\ngs.info('Fix: set default subcategory on ' + updated + ' inquiry incidents');\n```\n\nRun it against a sub-production copy first and confirm the count matches what you expected before you promote it.\n\n## Background Scripts\n<!-- badge: Extended guidance -->\n\nThe **Scripts - Background** module runs whatever you paste, immediately, against the instance you are on, with full rights and no undo. It is the right tool for a quick read or a one-off check - and the wrong place to try anything destructive in production. While you are developing, add `setLimit()` so a runaway query cannot touch more than you meant, read before you write, and if you want the change to travel to other instances, put it in a Fix Script instead so it is captured, reviewable, and repeatable.\n\n## Events and Script Actions\n<!-- badge: Extended guidance -->\n\nWhen something happens that should trigger extra work - notify a team, sync an external system - do not make the user's transaction wait for it. Hand the work to the event queue with `gs.eventQueue()`; a Script Action (or the notification engine) picks the event up out of band, so the click returns to the user immediately and the follow-on work runs asynchronously:\n\n```js\n// in a Business Rule - queue the work and return; the Script Action does the rest\ngs.eventQueue('incident.escalated', current, current.getValue('assigned_to'), priorityLabel);\n```\n\nThis is the reusable, decoupled cousin of an [[control-when-code-runs#choose-the-right-business-rule-timing|async Business Rule]]: many producers can fire the same event, and one Script Action handles it in one place.\n",
          "lead": "<p>Code that runs unattended - on a schedule, once across a whole table, or in a background window with full rights - has no user watching to catch a mistake, and often no undo. That earns it extra care: bound what it touches, make it safe to re-run, and prove it somewhere disposable first.</p>",
          "sections": [
            {
              "id": "scheduled-jobs",
              "title": "Scheduled Jobs",
              "html": "<h2 id=\"docs-scheduled-jobs\">Scheduled Jobs <span class=\"docs-badge\">Extended guidance</span></h2>\n<p>A Scheduled Job runs a script on a timer, unattended. Its danger is scale: a job that loops every matching record can hold resources for a long time and slow the instance for everyone. Bound the work - process a capped batch per run, or filter to only the records that still need attention - and let a later run pick up the rest, rather than trying to finish an unbounded set in one pass. When the job's real work can happen out of band, fire an event and let the event queue carry the load (see below) so the job itself returns quickly.</p>"
            },
            {
              "id": "fix-scripts",
              "title": "Fix Scripts",
              "html": "<h2 id=\"docs-fix-scripts\">Fix Scripts <span class=\"docs-badge\">Extended guidance</span></h2>\n<p>A Fix Script is a one-time data change, run once when its update set is committed to an instance. Two habits make it safe. Make it <strong>idempotent</strong> - safe to run twice - by checking state before it writes, so a re-run or a partial failure does not double-apply. And have it <strong>log what it touched</strong> so you can confirm afterward exactly what changed:</p>\n<pre class=\"docs-pre\"><code><span class=\"c-kw\">var</span> updated = <span class=\"c-num\">0</span>;\n<span class=\"c-kw\">var</span> incidentGr = <span class=\"c-kw\">new</span> <span class=\"c-fn\">GlideRecord</span>(<span class=\"c-str\">'incident'</span>);\n\nincidentGr.<span class=\"c-fn\">addQuery</span>(<span class=\"c-str\">'category'</span>, <span class=\"c-str\">'inquiry'</span>);\nincidentGr.<span class=\"c-fn\">addQuery</span>(<span class=\"c-str\">'subcategory'</span>, <span class=\"c-str\">''</span>); <span class=\"c-com\">// only the ones not already fixed - keeps a re-run safe</span>\nincidentGr.<span class=\"c-fn\">query</span>();\n\n<span class=\"c-kw\">while</span> (incidentGr.<span class=\"c-fn\">next</span>()) {\n  incidentGr.<span class=\"c-fn\">setValue</span>(<span class=\"c-str\">'subcategory'</span>, <span class=\"c-str\">'general'</span>);\n  incidentGr.<span class=\"c-fn\">update</span>();\n  updated++;\n}\n\ngs.<span class=\"c-fn\">info</span>(<span class=\"c-str\">'Fix: set default subcategory on '</span> + updated + <span class=\"c-str\">' inquiry incidents'</span>);</code></pre>\n<p>Run it against a sub-production copy first and confirm the count matches what you expected before you promote it.</p>"
            },
            {
              "id": "background-scripts",
              "title": "Background Scripts",
              "html": "<h2 id=\"docs-background-scripts\">Background Scripts <span class=\"docs-badge\">Extended guidance</span></h2>\n<p>The <strong>Scripts - Background</strong> module runs whatever you paste, immediately, against the instance you are on, with full rights and no undo. It is the right tool for a quick read or a one-off check - and the wrong place to try anything destructive in production. While you are developing, add <code>setLimit()</code> so a runaway query cannot touch more than you meant, read before you write, and if you want the change to travel to other instances, put it in a Fix Script instead so it is captured, reviewable, and repeatable.</p>"
            },
            {
              "id": "events-and-script-actions",
              "title": "Events and Script Actions",
              "html": "<h2 id=\"docs-events-and-script-actions\">Events and Script Actions <span class=\"docs-badge\">Extended guidance</span></h2>\n<p>When something happens that should trigger extra work - notify a team, sync an external system - do not make the user's transaction wait for it. Hand the work to the event queue with <code>gs.eventQueue()</code>; a Script Action (or the notification engine) picks the event up out of band, so the click returns to the user immediately and the follow-on work runs asynchronously:</p>\n<pre class=\"docs-pre\"><code><span class=\"c-com\">// in a Business Rule - queue the work and return; the Script Action does the rest</span>\ngs.<span class=\"c-fn\">eventQueue</span>(<span class=\"c-str\">'incident.escalated'</span>, current, current.<span class=\"c-fn\">getValue</span>(<span class=\"c-str\">'assigned_to'</span>), priorityLabel);</code></pre>\n<p>This is the reusable, decoupled cousin of an <a href=\"docs:control-when-code-runs#choose-the-right-business-rule-timing\" class=\"docs-link\" data-page=\"control-when-code-runs\" data-section=\"choose-the-right-business-rule-timing\">async Business Rule</a>: many producers can fire the same event, and one Script Action handles it in one place.</p>"
            }
          ]
        }
      ]
    }
  ]
};

if (typeof module === 'object' && module.exports) {
  module.exports = DocsStandardContent;
}
if (typeof self !== 'undefined') {
  self.DocsStandardContent = DocsStandardContent;
}

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
  data.canEdit = gs.hasRole('glidefast_docs_editor') || gs.hasRole('glidefast_docs_admin');
  data.canPublish = gs.hasRole('glidefast_docs_admin');
  data.error = '';
  data.saved = false;

  var logPrefix = 'GlideFast Docs: ';
  var allowedActions = {
    load: true,
    loadPage: true,
    saveDraft: true,
    publish: true,
    discardDraft: true,
    seedStandard: true
  };

  function getTableName(shortName) {
    try {
      if (typeof gs.getCurrentScopeName === 'function') {
        var scopeName = String(gs.getCurrentScopeName() || '');
        if (scopeName && scopeName !== 'global') {
          return scopeName + '_' + shortName;
        }
      }
    } catch (scopeError) {
      gs.warn(logPrefix + 'could not resolve scope name for ' + shortName + ' - ' + scopeError);
    }
    return shortName;
  }

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
