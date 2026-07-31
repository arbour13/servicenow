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

    // A missing title is reported but NOT fatal - this used to bail out returning empty content,
    // which blanked the editor's live preview the moment anything (a toolbar insertion at the
    // caret, a half-finished retype of the first line) sat above the `# Title`. Blanking the whole
    // preview over one malformed line contradicts this file's own collect-errors-and-render-anyway
    // contract; the error still blocks an actual save (see docs.server.js's saveDraft), which is
    // where refusing genuinely belongs.
    var hasTitle = /^# /.test(lines[0] || '');
    if (!hasTitle) {
      errors.push('Page must start with a single "# Title" heading on its first line.');
    }

    var title = hasTitle ? lines[0].slice(2).trim() : '';
    var bodyLines = hasTitle ? lines.slice(1) : lines;
    var leadLines = [];
    var sections = [];
    var currentSection = null;
    var buffer = leadLines;

    bodyLines.forEach(function (line) {
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
