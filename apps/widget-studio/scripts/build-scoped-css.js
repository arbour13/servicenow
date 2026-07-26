#!/usr/bin/env node
/*
 * build-scoped-css.js — turns the vendored Bootstrap 3.3.6 stylesheet into the two files the
 * editor loads, so the design canvas is painted by the SAME CSS a ServiceNow Service Portal page
 * gets instead of by hand-written look-alike styles.
 *
 *   vendor/css/bootstrap-3.3.6.css  (upstream, untouched — also served as-is to the preview iframe)
 *     ├─ bootstrap-3.3.6.scoped.css      every selector prefixed with `.ws-stage`
 *     └─ bootstrap-3.3.6.glyphicons.css  the @font-face + .glyphicon* rules, left GLOBAL
 *
 * Why scoped: the canvas is not an iframe (drag/drop, selection outlines and measurement all read
 * element rects out of the main document), so dropping unscoped Bootstrap on the page would repaint
 * the editor's own chrome too. Prefixing every selector with one class keeps Bootstrap's internal
 * cascade intact — every rule gains exactly the same +1 class of specificity — while author styles,
 * which the canvas applies inline, still win over all of it.
 *
 * Why glyphicons stay global: the palette and icon picker render `.glyphicon-*` previews in the
 * editor chrome, outside `.ws-stage`. Scoping those would leave the picker showing blank squares.
 * (Font Awesome is vendored but needs no transform at all — it is only `.fa*` rules plus a
 * @font-face, and is loaded globally for the same picker reason.)
 *
 * Usage: node scripts/build-scoped-css.js   (from apps/widget-studio/)
 */
'use strict';

const fs = require('fs');
const path = require('path');

const SCOPE = '.ws-stage';
// Every element the user places on the canvas is rendered inside an interactive wrapper div that
// carries `data-node-id` (it's what hosts selection outlines, drag handles and hit-testing). That
// wrapper sits between a parent element and its child elements, which silently breaks Bootstrap's
// child combinators: the real DOM is `.panel > [data-node-id] > .panel-heading`, so the stock
// `.panel-default > .panel-heading` rule never matches and a panel heading renders with no grey fill.
// So each `>` also gets a variant that steps through one wrapper — see expandWrappers.
const WRAP = '> [data-node-id] >';
// Cap on how many child combinators get expanded, since each one doubles the variants. 1–2 covers
// every case where a `>` crosses a NODE boundary: presets nest one node inside another (panel →
// heading → title), and a hand-built list/nav is at most `ul > li > a`. Selectors with 3+ are
// Bootstrap's internal table and carousel structure (`.table > thead > tr > th`), which the canvas
// renders as one unbroken subtree with no wrappers in it, so the stock selector already matches.
const MAX_EXPAND = 2;
const VENDOR = path.join(__dirname, '..', 'vendor', 'css');
const SRC = path.join(VENDOR, 'bootstrap-3.3.6.css');

/* ---------------------------------------------------------------- selectors */

// Split a selector list on its TOP-LEVEL commas only, so `:not(a, b)` stays one selector.
function splitSelectors(list) {
  const out = []; let buf = ''; let depth = 0;
  for (const ch of list) {
    if (ch === '(' || ch === '[') { depth++; }
    else if (ch === ')' || ch === ']') { depth--; }
    if (ch === ',' && depth === 0) { out.push(buf); buf = ''; continue; }
    buf += ch;
  }
  if (buf.trim()) { out.push(buf); }
  return out.map(s => s.trim()).filter(Boolean);
}

// Split on TOP-LEVEL `>` only, so a `>` inside :not(...) or [attr=">"] is left alone.
function splitChild(sel) {
  const parts = []; let buf = ''; let depth = 0; let quote = null;
  for (const ch of sel) {
    if (quote) { buf += ch; if (ch === quote) { quote = null; } continue; }
    if (ch === '"' || ch === "'") { quote = ch; buf += ch; continue; }
    if (ch === '(' || ch === '[') { depth++; }
    else if (ch === ')' || ch === ']') { depth--; }
    if (ch === '>' && depth === 0) { parts.push(buf); buf = ''; continue; }
    buf += ch;
  }
  parts.push(buf);
  return parts.map(p => p.trim());
}

// `A > B` in, `[A > B, A > [data-node-id] > B]` out — the original plus every combination that steps
// through the editor's per-node wrapper. Returns just the input when there's nothing to expand.
//
// This does NOT make structural selectors fully faithful, and deliberately doesn't try to: sibling
// combinators (`.radio + .radio`) and positional pseudos (`.list-group-item:first-child`) are also
// confused by the wrapper — a wrapped element is always an only-child of its own wrapper — and no
// selector rewrite fixes those. `>` is expanded because it's where the visible damage was.
function expandWrappers(sel) {
  const parts = splitChild(sel);
  const gaps = parts.length - 1;
  if (gaps < 1 || gaps > MAX_EXPAND) { return [sel]; }
  const out = [];
  for (let mask = 0; mask < (1 << gaps); mask++) {
    let s = parts[0];
    for (let i = 0; i < gaps; i++) { s += ((mask >> i) & 1 ? ' ' + WRAP + ' ' : ' > ') + parts[i + 1]; }
    out.push(s);
  }
  return out;
}

// One source selector in, one or more scoped selectors out.
//
// `html` / `body` are the page-level hooks Bootstrap uses for its base typography, and the stage
// element stands in for the page — so they BECOME the scope rather than being nested under it
// (`body.modal-open` → `.ws-stage.modal-open`, `body a` → `.ws-stage a`).
//
// `*` has to be doubled: the stage itself is a descendant of nothing inside the scope, so
// `.ws-stage *` alone would miss it (border-box on the stage box would be lost).
function scopeSelector(sel) {
  const pageRoot = /^(?:html|body)(?![\w-])\s*/;
  if (pageRoot.test(sel)) {
    const rest = sel.replace(pageRoot, '').trim();
    // Bootstrap writes `html body` in a couple of spots; collapse a second page-root token too.
    const tail = rest.replace(pageRoot, '').trim();
    if (!tail) { return [SCOPE]; }
    // `body.modal-open` — attach directly; `body a` — nest.
    return [/^[.:[#]/.test(tail) ? SCOPE + tail : SCOPE + ' ' + tail];
  }
  if (sel === '*') { return [SCOPE, SCOPE + ' *']; }
  if (/^\*(?=[:.[])/.test(sel)) {
    const rest = sel.slice(1);
    return [SCOPE + rest, SCOPE + ' *' + rest];
  }
  return [SCOPE + ' ' + sel];
}

/* ------------------------------------------------------------------ scanner */

// Read from `i` to the matching close brace of the block that starts at the next `{`.
// Returns [innerBody, indexAfterCloseBrace].
function readBlock(css, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < css.length; i++) {
    const ch = css[i];
    if (ch === '{') { depth++; }
    else if (ch === '}') { depth--; if (depth === 0) { return [css.slice(openIdx + 1, i), i + 1]; } }
  }
  throw new Error('unbalanced braces at ' + openIdx);
}

const isGlyphRule = sels => sels.every(s => s.startsWith('.glyphicon'));

// Walk a stylesheet (or the body of an @media/@supports block) and route every rule into the
// scoped bucket or the global-glyphicon bucket.
function transform(css, out) {
  let i = 0;
  while (i < css.length) {
    // Skip whitespace and any stray semicolons between rules.
    if (/[\s;]/.test(css[i])) { i++; continue; }

    if (css[i] === '@') {
      const semi = css.indexOf(';', i);
      const brace = css.indexOf('{', i);
      // Statement at-rule (@charset, @import) — nothing to scope.
      if (brace === -1 || (semi !== -1 && semi < brace)) {
        out.scoped += css.slice(i, semi + 1) + '\n';
        i = semi + 1; continue;
      }
      const prelude = css.slice(i, brace).trim();
      const name = (prelude.match(/^@([\w-]+)/) || [, ''])[1].toLowerCase();
      const [body, next] = readBlock(css, brace);
      if (name === 'media' || name === 'supports') {
        // Conditional group: keep the condition, scope what's inside it.
        const inner = { scoped: '', glyph: '' };
        transform(body, inner);
        if (inner.scoped.trim()) { out.scoped += prelude + ' {\n' + inner.scoped + '}\n'; }
        if (inner.glyph.trim()) { out.glyph += prelude + ' {\n' + inner.glyph + '}\n'; }
      } else if (name === 'font-face') {
        // Font descriptors have no selectors to scope, and the glyphicon face must stay global so
        // the editor's own icon picker can render with it. Relative `../fonts/` src URLs resolve
        // against this file's own location, which is why the outputs sit beside the source.
        const bucket = /Glyphicons/i.test(body) ? 'glyph' : 'scoped';
        out[bucket] += '@font-face {' + body + '}\n';
      } else {
        // @keyframes, @-ms-viewport, @page — no selectors, emit verbatim.
        out.scoped += prelude + ' {' + body + '}\n';
      }
      i = next; continue;
    }

    const brace = css.indexOf('{', i);
    if (brace === -1) { break; }
    const sels = splitSelectors(css.slice(i, brace));
    const [body, next] = readBlock(css, brace);
    if (sels.length) {
      const decls = body.trim();
      if (decls) {
        if (isGlyphRule(sels)) { out.glyph += sels.join(',\n') + ' {' + body + '}\n'; }
        else {
          const scoped = sels.reduce((acc, s) => acc.concat(scopeSelector(s)), [])
            .reduce((acc, s) => acc.concat(expandWrappers(s)), []);
          out.scoped += scoped.join(',\n') + ' {' + body + '}\n';
        }
      }
    }
    i = next;
  }
}

/* -------------------------------------------------------------------- build */

// Comments can't nest and Bootstrap has none inside string/url() literals, so a flat strip is safe.
const src = fs.readFileSync(SRC, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const out = { scoped: '', glyph: '' };
transform(src, out);

const banner = what => [
  '/* GENERATED by scripts/build-scoped-css.js — do not edit by hand.',
  ' * Source: vendor/css/bootstrap-3.3.6.css (Bootstrap 3.3.6, the version ServiceNow Service',
  ' * Portal ships). ' + what,
  ' */', ''
].join('\n');

const targets = [
  ['bootstrap-3.3.6.scoped.css', banner('Every selector prefixed with `' + SCOPE + '` so it paints the design canvas only.'), out.scoped],
  ['bootstrap-3.3.6.glyphicons.css', banner('Glyphicon @font-face + .glyphicon* rules, left GLOBAL for the editor icon picker.'), out.glyph]
];
for (const [name, head, body] of targets) {
  fs.writeFileSync(path.join(VENDOR, name), head + body);
  console.log(name.padEnd(34), (Buffer.byteLength(head + body) / 1024).toFixed(1) + ' KB');
}
