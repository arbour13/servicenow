/* Builds the in-app Standards document.
 *
 *   node scripts/build-standards.js
 *       Renders standards/glidefast-scripting-standards.md into js/services/standards.service.js
 *       - a normal standardsPortal provider (so build-deploy.js packages it like every other
 *       service) whose content is the document pre-parsed into parts (h1 chapters) / sections
 *       (h2) of HTML with stable anchor ids (id="std-<slug>"). Run this after ANY edit to the
 *       markdown.
 *
 * The markdown is the single hand-maintained source of truth. It is organized BY TOPIC (readable
 * code, reuse, data, defensive coding, ...), NOT by the three source guides it was woven from -
 * so there is no automated combine-from-3-files step anymore (it would clobber the hand-woven
 * structure). The old `combine` command is retired; see the guard in main() for the one-off
 * re-import escape hatch and why you almost never want it.
 *
 * This app is a standalone reference viewer - there is no builder to link back to, so the
 * `build=<mode>` fenced-code tag and the `<!-- build: ... -->` section annotation (which some
 * copies of this markdown/script pair turn into "Build this in <mode> ->" buttons) are both
 * recognized here ONLY so they can be stripped from the rendered output, since the markdown
 * source may still carry them. No button is ever emitted.
 */
'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var COMBINED_MD = path.join(ROOT, 'standards', 'glidefast-scripting-standards.md');
var SERVICE_OUT = path.join(ROOT, 'js', 'services', 'standards.service.js');

/* ------------------------------- combine step ------------------------------- */

// Exact-string mechanical fixes for defects in the source documents (mismatched variable names
// between prose and example, stray characters from find/replace). Content-neutral only - anything
// judgment-based stays untouched in the sources.
var TYPO_FIXES = [
  { from: "current.getValue('.u_coordinator')", to: "current.getValue('u_coordinator')" },
  { from: "current.getValue('.caller_id')", to: "current.getValue('caller_id')" },
  { from: 'if (inc.next()) {', to: 'if (incidentGr.next()) {' },
  { from: 'current.setWorkFlow(false)', to: 'current.setWorkflow(false)' },
  { from: 'Because the gr object is not enclosed', to: 'Because the incidentGr object is not enclosed' },
  { from: 'the scope of the variable grInc is limited', to: 'the scope of the variable incidentGr is limited' },
  { from: 'fill out aBusiness Rule form at once', to: 'fill out a request form at once' },
  { from: 'ga.addParam', to: 'glideAjax.addParam' },
  { from: 'ga.getXMLAnswer', to: 'glideAjax.getXMLAnswer' },
];

function cleanSourceDoc(raw) {
  var text = raw.replace(/\r\n/g, '\n');

  // <style>...</style> block, logo <img>, and the </br> spacers under it.
  text = text.replace(/<style>[\s\S]*?<\/style>\s*/g, '');
  text = text.replace(/^<img[^>]*>\s*$/gm, '');
  text = text.replace(/^<\/?br\s*\/?>\s*$/gm, '');

  // Screenshot references - the PNGs aren't part of the app.
  text = text.replace(/^!\[[^\]]*\]\([^)]*\)\s*$/gm, '');

  // "Covered in this guide/section:" + its bullet list of anchor links - the app builds its own
  // table of contents from the headings, so these per-doc navigation lists are just duplication.
  text = text.replace(/^Covered in this (?:guide|section):\s*\n+(?:^\* \[[^\n]*\n)+/gm, '');

  // Heading TOC-suppression markers from the source tooling.
  text = text.replace(/\s*<!-- omit in toc -->/g, '');

  TYPO_FIXES.forEach(function (fix) {
    text = text.split(fix.from).join(fix.to);
  });

  // Collapse the 3+ blank lines the removals leave behind.
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim() + '\n';
}

// RETIRED normal path (see main()'s guard). The canonical markdown is now hand-woven by TOPIC, so
// a flat concatenation of the three sources by-guide would destroy that structure. Kept only as a
// --force scratch dump: cleans the raw sources into a throwaway file to hand-weave FROM when
// GlideFast issues revised docs - it deliberately does NOT touch the canonical COMBINED_MD.
function combine(sources) {
  var scratch = path.join(ROOT, 'standards', '_reimport-scratch.md');
  var parts = sources.map(function (file) {
    return cleanSourceDoc(fs.readFileSync(file, 'utf8'));
  });
  var out = parts.join('\n\n');
  fs.mkdirSync(path.dirname(scratch), { recursive: true });
  fs.writeFileSync(scratch, out);
  console.log('Wrote cleaned-source SCRATCH to ' + path.relative(ROOT, scratch) + ' (' + out.length +
    ' chars). Hand-weave from it into ' + path.relative(ROOT, COMBINED_MD) + '; the canonical doc was NOT touched.');
}

/* ------------------------------- render step ------------------------------- */

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Minimal JS syntax highlighter -> HTML string with .c-kw/.c-str/.c-num/.c-com/.c-fn token spans.
// KEEP IN SYNC with CodegenService.highlight in js/services/codegen.service.js - this is a verbatim
// copy so the doc's code samples colorize IDENTICALLY to the generated-script output pane (that
// was the whole point of "color-coded as it is in the generated script"). It's ~30 stable lines
// ("ported verbatim"); if it ever grows, extract to a shared file both load instead of duplicating.
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

// Inline markdown -> HTML. Code spans are pulled out first so their contents are never touched
// by the emphasis/link passes; \* escapes are shelved before the <em> pass so prose like "(/\*)"
// can't be misread as an emphasis delimiter, then restored as literal asterisks.
function renderInline(text) {
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

  out = out.replace(/\u0000(\d+)\u0000/g, function (m, i) { return codeSpans[Number(i)]; });
  return out;
}

// Block-level markdown -> HTML for everything BELOW the h1/h2 chunking (paragraphs, fenced code,
// lists, tables, h3 subsections). Only the constructs these documents actually use.
function renderBlocks(lines, slugs) {
  var html = [];
  var i = 0;

  while (i < lines.length) {
    var line = lines[i];

    if (!line.trim()) { i++; continue; }

    if (/^### /.test(line)) {
      var h3Title = line.slice(4).trim();
      html.push('<h3 id="std-' + registerSlug(slugs, h3Title) + '">' + renderInline(h3Title) + '</h3>');
      i++;
      continue;
    }

    if (/^```/.test(line)) {
      // Opening fence may carry a `build=<mode>` info string (some copies of this script turn
      // that into a "Build this in <mode>" button) - this app has no builder to link to, so the
      // tag is simply ignored; only the code itself renders.
      var code = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) { code.push(lines[i]); i++; }
      i++; // closing fence
      html.push('<pre class="std-pre"><code>' + highlight(code.join('\n')) + '</code></pre>');
      continue;
    }

    if (/^\* /.test(line)) {
      var items = [];
      while (i < lines.length && /^\* /.test(lines[i])) { items.push(lines[i].slice(2)); i++; }
      html.push('<ul>' + items.map(function (it) { return '<li>' + renderInline(it) + '</li>'; }).join('') + '</ul>');
      continue;
    }

    if (/^\d+\. /.test(line)) {
      var numbered = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) { numbered.push(lines[i].replace(/^\d+\. /, '')); i++; }
      html.push('<ol>' + numbered.map(function (it) { return '<li>' + renderInline(it) + '</li>'; }).join('') + '</ol>');
      continue;
    }

    if (/^\|/.test(line) && i + 1 < lines.length && /^\|[\s|:-]+\|$/.test(lines[i + 1].trim())) {
      var headerCells = splitTableRow(line);
      i += 2;
      var rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) { rows.push(splitTableRow(lines[i])); i++; }
      var thead = '<tr>' + headerCells.map(function (c) { return '<th>' + renderInline(c) + '</th>'; }).join('') + '</tr>';
      var tbody = rows.map(function (cells) {
        return '<tr>' + cells.map(function (c) { return '<td>' + renderInline(c) + '</td>'; }).join('') + '</tr>';
      }).join('');
      html.push('<table class="std-table"><thead>' + thead + '</thead><tbody>' + tbody + '</tbody></table>');
      continue;
    }

    var para = [];
    while (i < lines.length && lines[i].trim() &&
      !/^(### |```|\* |\d+\. |\|)/.test(lines[i])) {
      para.push(lines[i].trim());
      i++;
    }
    html.push('<p>' + renderInline(para.join(' ')) + '</p>');
  }

  return html.join('\n');
}

function splitTableRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (c) { return c.trim(); });
}

// Strips `<!-- build: ModeA, ModeB -->` annotation lines out of a section's body (some copies of
// this script turn these into a "Build this in <mode>" button row; this app has no builder to
// link to, so the tag is dropped rather than translated into anything).
function stripBuildModes(lines) {
  return lines.filter(function (line) { return !/^<!--\s*build:\s*([^>]+?)\s*-->\s*$/.test(line); });
}

// Valid `<!-- source: ... -->` tags - same one-line-comment convention as extractBuildModes above,
// piggybacked on the same strip-before-render mechanism. Default (no tag) means GlideFast canon -
// unmarked is the common case, not an oversight; a section is only tagged when it genuinely goes
// beyond the three original GlideFast source guides (see the doc's own intro paragraph).
var VALID_SOURCES = { Addition: true };
function extractSource(lines) {
  var source = null;
  var kept = [];
  lines.forEach(function (line) {
    var m = line.match(/^<!--\s*source:\s*([^>]+?)\s*-->\s*$/);
    if (m) {
      var key = m[1].trim();
      if (!VALID_SOURCES[key]) { throw new Error('Unknown source tag: "' + key + '" (expected: ' + Object.keys(VALID_SOURCES).join(', ') + ')'); }
      source = key;
    } else {
      kept.push(line);
    }
  });
  return { source: source, lines: kept };
}

// Chapter-level `<!-- group: ... -->` tag, same one-line-comment convention as extractBuildModes/
// extractSource above, applied to a chapter's leadLines (its content between the `# ` heading and
// the first `## `) rather than a section's. Unlike extractSource, this is REQUIRED - untagged
// content has nowhere to render once the rail/content split into "Principles"/"Build It Well"
// bands, so absence is a build error, not a default. chapterTitle is only for the error message
// (there's no matched tag to report context from when the failure is an absence, not a bad value).
var VALID_GROUPS = { Principles: true, 'Build It Well': true };
function extractGroup(lines, chapterTitle) {
  var group = null;
  var kept = [];
  lines.forEach(function (line) {
    var m = line.match(/^<!--\s*group:\s*([^>]+?)\s*-->\s*$/);
    if (m) {
      var key = m[1].trim();
      if (!VALID_GROUPS[key]) { throw new Error('Unknown group tag: "' + key + '" (expected: ' + Object.keys(VALID_GROUPS).join(', ') + ')'); }
      group = key;
    } else {
      kept.push(line);
    }
  });
  if (!group) { throw new Error('Chapter "' + chapterTitle + '" is missing a required <!-- group: ... --> tag (expected: ' + Object.keys(VALID_GROUPS).join(', ') + ')'); }
  return { group: group, lines: kept };
}

function registerSlug(slugs, title) {
  var slug = slugify(title);
  if (slugs[slug]) { throw new Error('Duplicate heading slug: ' + slug); }
  slugs[slug] = true;
  return slug;
}

function render() {
  var md = fs.readFileSync(COMBINED_MD, 'utf8').replace(/\r\n/g, '\n');
  var lines = md.split('\n');
  var slugs = {};

  // Chunk on h1 (parts) and h2 (sections); everything below h2 is renderBlocks' job.
  var docLeadLines = [];
  var parts = [];
  var currentPart = null;
  var currentSection = null;
  var buffer = docLeadLines;

  lines.forEach(function (line) {
    if (/^# /.test(line)) {
      currentPart = { title: line.slice(2).trim(), leadLines: [], sections: [] };
      parts.push(currentPart);
      currentSection = null;
      buffer = currentPart.leadLines;
    } else if (/^## /.test(line)) {
      if (!currentPart) { throw new Error('h2 before any h1: ' + line); }
      currentSection = { title: line.slice(3).trim(), lines: [] };
      currentPart.sections.push(currentSection);
      buffer = currentSection.lines;
    } else {
      buffer.push(line);
    }
  });

  var doc = {
    lead: renderBlocks(docLeadLines, slugs),
    parts: parts.map(function (part) {
      var grp = extractGroup(part.leadLines, part.title);
      return {
        title: part.title,
        group: grp.group,
        lead: renderBlocks(grp.lines, slugs),
        sections: part.sections.map(function (section) {
          var id = registerSlug(slugs, section.title);
          var src = extractSource(stripBuildModes(section.lines));
          var sourceBadge = src.source
            ? ' <span class="std-source-badge" title="Beyond GlideFast\'s original three guides">Extended guidance</span>'
            : '';
          return {
            id: id,
            title: section.title,
            html: '<h2 id="std-' + id + '">' + renderInline(section.title) + sourceBadge + '</h2>\n' + renderBlocks(src.lines, slugs),
          };
        }),
      };
    }),
  };

  var service = [
    '/* GENERATED FILE - do not edit by hand. Built from standards/glidefast-scripting-standards.md',
    '   by scripts/build-standards.js (run: node scripts/build-standards.js). Content edits belong',
    '   in the markdown; renderer changes belong in the build script.',
    '',
    '   The GlideFast scripting standards, woven by topic into one document and pre-parsed into',
    '   parts (h1 chapters) / sections (h2) of HTML with stable anchor ids (id="std-<slug>"). The',
    '   Standards page renders these directly. */',
    "angular.module('standardsPortal').factory('StandardsService', function () {",
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
  var sectionCount = doc.parts.reduce(function (n, p) { return n + p.sections.length; }, 0);
  console.log('Wrote ' + path.relative(ROOT, SERVICE_OUT) + ' - ' + doc.parts.length + ' parts, ' +
    sectionCount + ' sections, ' + Object.keys(slugs).length + ' anchors');
  console.log('Anchors: ' + Object.keys(slugs).join(', '));
}

/* ---------------------------------- main ---------------------------------- */

var args = process.argv.slice(2);
if (args[0] === 'combine') {
  // Retired: the canonical doc is hand-woven by topic now. `combine` would only produce the old
  // by-guide concatenation. The escape hatch (a scratch dump to hand-weave from) needs --force so
  // nobody clobbers real work by muscle memory.
  var rest = args.slice(1).filter(function (a) { return a !== '--force'; });
  if (args.indexOf('--force') === -1) {
    console.error('`combine` is retired - the canonical markdown is hand-woven by topic and combine would only rebuild the old by-guide split.');
    console.error('To dump freshly-cleaned sources to a scratch file to hand-weave from, re-run with --force:');
    console.error('  node scripts/build-standards.js combine --force <scripting.md> <business-rules.md> <client-scripting.md>');
    process.exit(1);
  }
  if (rest.length !== 3) {
    console.error('Usage: node scripts/build-standards.js combine --force <scripting.md> <business-rules.md> <client-scripting.md>');
    process.exit(1);
  }
  combine(rest);
} else {
  render();
}
