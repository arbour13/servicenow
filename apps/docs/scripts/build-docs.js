/* Builds the in-app docs from the pages/ tree.
 *
 *   node scripts/build-docs.js
 *       Renders every pages/<group>/<page>.md into js/services/docs.service.js - a normal
 *       glidefastDocs provider whose content is pre-parsed into groups / pages / sections of HTML
 *       with stable anchor ids (id="docs-<slug>"). Run this after ANY edit under pages/.
 *
 * Content model: pages/<NN-group-slug>/<NN-page-slug>.md. A directory under pages/ is a nav group
 * (its display title is the folder name, numeric prefix stripped, title-cased); a markdown file
 * inside it is one docs page. The numeric prefixes control display order and are stripped from
 * both the group slug and the page id, so reordering never changes a page's stable id. Each page
 * file starts with exactly one `# Title` heading (consumed as the page title, not rendered); `##`
 * headings below it become the page's own sections, same as this app's previous single-document
 * chapter/section split - a page here is what a chapter used to be, just as its own file.
 *
 * pages/home.md is plain markdown (no heading required) rendered as the docs' landing intro.
 * pages/planned.json optionally maps a group slug to an array of "coming soon" page titles shown
 * as ghost tiles on the home hub - see PLANNED_FILE below.
 *
 * Cross-page links use `[[page-id]]` or `[[page-id|Link text]]`, optionally `[[page-id#section-id]]`
 * to point at a specific section. Resolved and validated against every known page/section id at
 * build time - an unknown target is a build error, not a silent dead link.
 */
'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var PAGES_DIR = path.join(ROOT, 'pages');
var HOME_FILE = path.join(PAGES_DIR, 'home.md');
var PLANNED_FILE = path.join(PAGES_DIR, 'planned.json');
var SERVICE_OUT = path.join(ROOT, 'js', 'services', 'docs.service.js');
var SEED_OUT = path.join(ROOT, 'js', 'data', 'standard-content.js');

/* ------------------------------- page discovery ------------------------------- */

function stripPrefix(name) {
  return name.replace(/^\d+-/, '');
}

function titleCase(slug) {
  return slug.split('-').map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ');
}

function discoverGroups() {
  var groupDirs = fs.readdirSync(PAGES_DIR, { withFileTypes: true })
    .filter(function (entry) { return entry.isDirectory(); })
    .map(function (entry) { return entry.name; })
    .sort();

  return groupDirs.map(function (dirName) {
    var slug = stripPrefix(dirName);
    var files = fs.readdirSync(path.join(PAGES_DIR, dirName))
      .filter(function (name) { return /\.md$/.test(name); })
      .sort()
      .map(function (name) {
        return {
          path: path.join(PAGES_DIR, dirName, name),
          id: slugify(stripPrefix(name).replace(/\.md$/, '')),
        };
      });
    return { slug: slug, title: titleCase(slug), files: files };
  });
}

/* ------------------------------- render step ------------------------------- */

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Minimal JS syntax highlighter -> HTML string with .c-kw/.c-str/.c-num/.c-com/.c-fn token spans.
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
  return title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

var DOC_LINK_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

// Inline markdown -> HTML. Code spans are pulled out first so their contents are never touched by
// the emphasis/link passes; \* escapes are shelved before the <em> pass so prose like "(/\*)" can't
// be misread as an emphasis delimiter, then restored as literal asterisks. linkTargets/sourceFile
// are only used by the [[cross-page link]] pass, resolved and validated against every known
// page/section id collected by the prescan in build() - an unknown target throws, naming the
// source file.
function renderInline(text, linkTargets, sourceFile) {
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
    var pageId = targetParts[0];
    var sectionId = targetParts[1];
    var knownSections = linkTargets[pageId];
    if (!knownSections) {
      throw new Error('Unknown link target "' + pageId + '" in ' + sourceFile + ' (from [[' + target + ']])');
    }
    if (sectionId && !knownSections[sectionId]) {
      throw new Error('Unknown section "' + sectionId + '" on page "' + pageId + '" in ' + sourceFile + ' (from [[' + target + ']])');
    }
    var href = 'docs:' + pageId + (sectionId ? '#' + sectionId : '');
    var linkText = (label || target).trim();
    return '<a href="' + href + '" class="docs-link" data-page="' + pageId + '"' +
      (sectionId ? ' data-section="' + sectionId + '"' : '') + '>' + linkText + '</a>';
  });

  out = out.replace(/\u0000(\d+)\u0000/g, function (m, i) { return codeSpans[Number(i)]; });
  return out;
}

// Block-level markdown -> HTML for everything BELOW the h2 chunking (paragraphs, fenced code,
// lists, tables, h3 subsections). Only the constructs this content actually uses.
function renderBlocks(lines, slugs, linkTargets, sourceFile) {
  var html = [];
  var i = 0;

  while (i < lines.length) {
    var line = lines[i];

    if (!line.trim()) { i++; continue; }

    if (/^### /.test(line)) {
      var h3Title = line.slice(4).trim();
      html.push('<h3 id="docs-' + registerSlug(slugs, h3Title) + '">' + renderInline(h3Title, linkTargets, sourceFile) + '</h3>');
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
      html.push('<ul>' + items.map(function (it) { return '<li>' + renderInline(it, linkTargets, sourceFile) + '</li>'; }).join('') + '</ul>');
      continue;
    }

    if (/^\d+\. /.test(line)) {
      var numbered = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) { numbered.push(lines[i].replace(/^\d+\. /, '')); i++; }
      html.push('<ol>' + numbered.map(function (it) { return '<li>' + renderInline(it, linkTargets, sourceFile) + '</li>'; }).join('') + '</ol>');
      continue;
    }

    if (/^\|/.test(line) && i + 1 < lines.length && /^\|[\s|:-]+\|$/.test(lines[i + 1].trim())) {
      var headerCells = splitTableRow(line);
      i += 2;
      var rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) { rows.push(splitTableRow(lines[i])); i++; }
      var thead = '<tr>' + headerCells.map(function (c) { return '<th>' + renderInline(c, linkTargets, sourceFile) + '</th>'; }).join('') + '</tr>';
      var tbody = rows.map(function (cells) {
        return '<tr>' + cells.map(function (c) { return '<td>' + renderInline(c, linkTargets, sourceFile) + '</td>'; }).join('') + '</tr>';
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
    html.push('<p>' + renderInline(para.join(' '), linkTargets, sourceFile) + '</p>');
  }

  return html.join('\n');
}

function splitTableRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (c) { return c.trim(); });
}

// `<!-- badge: Some Label -->` on its own line, anywhere in a section's body - strips the tag and
// carries its free-text label out as a small pill next to the section heading. No fixed vocabulary
// (unlike this app's old "source: Addition" enum) - any label works, since general documentation
// has no single fixed reason a section might need one.
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

function registerSlug(slugs, title) {
  var slug = slugify(title);
  if (slugs[slug]) { throw new Error('Duplicate heading slug: ' + slug); }
  slugs[slug] = true;
  return slug;
}

/* ------------------------------- page parsing ------------------------------- */

function parsePage(fileMeta, slugs, linkTargets) {
  var raw = fs.readFileSync(fileMeta.path, 'utf8').replace(/\r\n/g, '\n');
  var lines = raw.split('\n');
  var markdownSource = raw; // full raw file text - shipped on the page object in BOTH outputs:
  // docs.service.js (the client editor needs real source to seed a textarea and re-render live
  // preview client-side - see js/lib/docs-renderer.js) and the seed payload (seedStandard() needs
  // it to write the `markdown` column).
  if (!/^# /.test(lines[0])) {
    throw new Error('Page ' + fileMeta.path + ' must start with a single "# Title" heading on its first line');
  }
  var title = lines[0].slice(2).trim();
  var leadLines = [];
  var sections = [];
  var currentSection = null;
  var buffer = leadLines;

  lines.slice(1).forEach(function (line) {
    if (/^# /.test(line)) {
      throw new Error('Page ' + fileMeta.path + ' has a second "# " heading - each page file is exactly one page');
    }
    if (/^## /.test(line)) {
      currentSection = { title: line.slice(3).trim(), lines: [] };
      sections.push(currentSection);
      buffer = currentSection.lines;
    } else {
      buffer.push(line);
    }
  });

  return {
    id: fileMeta.id,
    title: title,
    lead: renderBlocks(leadLines, slugs, linkTargets, fileMeta.path),
    sections: sections.map(function (section) {
      var id = registerSlug(slugs, section.title);
      var badge = extractBadge(section.lines);
      var badgeHtml = badge.label ? ' <span class="docs-badge">' + escapeHtml(badge.label) + '</span>' : '';
      return {
        id: id,
        title: section.title,
        html: '<h2 id="docs-' + id + '">' + renderInline(section.title, linkTargets, fileMeta.path) + badgeHtml + '</h2>\n' +
          renderBlocks(badge.lines, slugs, linkTargets, fileMeta.path),
      };
    }),
    markdown: markdownSource,
  };
}

// A separate, lighter tree for js/data/standard-content.js - the one-time seed payload
// js/server/docs.server.js's seedStandard() inserts into an empty page table (mirrors Delivery
// Methodology's own DMStandardContent / standard-content.js). Needs raw markdown (what
// seedStandard() actually writes to the `markdown` column) alongside the same lead/sections HTML
// docs.service.js already has, so seeding doesn't have to re-render anything.
function buildSeedPayload(docGroups) {
  return {
    groups: docGroups.map(function (group) {
      return {
        slug: group.slug,
        name: group.name,
        planned: group.planned,
        pages: group.pages.map(function (page) {
          return {
            id: page.id,
            title: page.title,
            markdown: page.markdown,
            lead: page.lead,
            sections: page.sections.map(function (section) {
              return { id: section.id, title: section.title, html: section.html };
            }),
          };
        }),
      };
    }),
  };
}

/* ---------------------------------- build ---------------------------------- */

function build() {
  var groups = discoverGroups();

  // Prescan: a cheap raw walk (no rendering, no slug registry) that collects every page id and its
  // section slugs before the real render pass, so [[links]] anywhere - including a forward
  // reference to a page not yet parsed - can be validated. Uses the same pure slugify() the real
  // pass uses via registerSlug, so a predicted section slug here always matches what gets assigned.
  var linkTargets = {};
  groups.forEach(function (group) {
    group.files.forEach(function (fileMeta) {
      if (linkTargets[fileMeta.id]) {
        throw new Error('Duplicate page id "' + fileMeta.id + '" (' + fileMeta.path + ')');
      }
      var raw = fs.readFileSync(fileMeta.path, 'utf8').replace(/\r\n/g, '\n');
      var sectionSlugs = {};
      raw.split('\n').forEach(function (line) {
        if (/^## /.test(line)) { sectionSlugs[slugify(line.slice(3).trim())] = true; }
      });
      linkTargets[fileMeta.id] = sectionSlugs;
    });
  });

  var planned = JSON.parse(fs.readFileSync(PLANNED_FILE, 'utf8'));
  var slugs = {};

  var docGroups = groups.map(function (group) {
    return {
      name: group.title,
      slug: group.slug,
      planned: planned[group.slug] || [],
      pages: group.files.map(function (fileMeta) { return parsePage(fileMeta, slugs, linkTargets); }),
    };
  });

  var homeRaw = fs.readFileSync(HOME_FILE, 'utf8').replace(/\r\n/g, '\n');
  var doc = {
    home: { lead: renderBlocks(homeRaw.split('\n'), slugs, linkTargets, HOME_FILE) },
    groups: docGroups,
  };

  var service = [
    '/* GENERATED FILE - do not edit by hand. Built from every page under pages/ by scripts/build-docs.js',
    '   (run: node scripts/build-docs.js). Content edits belong in the markdown; renderer changes',
    '   belong in the build script.',
    '',
    '   The documentation content, pre-parsed into groups / pages / sections of HTML with stable',
    '   anchor ids (id="docs-<slug>"). The app renders these directly. */',
    "angular.module('glidefastDocs').factory('DocsService', function () {",
    "  'use strict';",
    '',
    '  var DOC = ' + JSON.stringify(doc, null, 2).replace(/\n/g, '\n  ') + ';',
    '',
    '  return {',
    '    DOC: DOC,',
    '  };',
    '});',
    '',
  ].join('\n');

  fs.writeFileSync(SERVICE_OUT, service);

  var seedPayload = buildSeedPayload(docGroups);
  var seedFile = [
    '/* GENERATED FILE - do not edit by hand. Built from every page under pages/ by scripts/build-docs.js',
    '   (run: node scripts/build-docs.js). The one-time seed payload js/server/docs.server.js\'s',
    '   seedStandard() action inserts into an EMPTY page table - see that script and',
    '   deploy.manifest.js\'s files.contentModel. Bare `var` (not an Angular provider) so it works',
    '   concatenated raw into the ServiceNow server script (Rhino has no `window`).',
    '',
    '   Content edits belong in the markdown; renderer changes belong in the build script. */',
    'var DocsStandardContent = ' + JSON.stringify(seedPayload, null, 2) + ';',
    '',
    'if (typeof module === \'object\' && module.exports) {',
    '  module.exports = DocsStandardContent;',
    '}',
    'if (typeof self !== \'undefined\') {',
    '  self.DocsStandardContent = DocsStandardContent;',
    '}',
    '',
  ].join('\n');

  fs.mkdirSync(path.dirname(SEED_OUT), { recursive: true });
  fs.writeFileSync(SEED_OUT, seedFile);

  var pageCount = docGroups.reduce(function (n, g) { return n + g.pages.length; }, 0);
  var sectionCount = docGroups.reduce(function (n, g) {
    return n + g.pages.reduce(function (m, p) { return m + p.sections.length; }, 0);
  }, 0);
  console.log('Wrote ' + path.relative(ROOT, SEED_OUT) + ' (seed payload for docs.server.js)');
  console.log('Wrote ' + path.relative(ROOT, SERVICE_OUT) + ' - ' + docGroups.length + ' groups, ' +
    pageCount + ' pages, ' + sectionCount + ' sections, ' + Object.keys(slugs).length + ' section anchors');
}

build();
