/* Teaches Monaco this app's own markdown dialect - a standalone Monarch tokenizer (Monarch has no
   inheritance, so this can't just extend Monaco's bundled markdown language) covering everything
   DocsHighlightService already covers for the textarea-overlay fallback: headings, bold, italic,
   inline code, fenced code blocks, [[wikilinks]], [text](url) links, list/table markers, and
   `<!-- badge: X -->` comments. Token names map 1:1 onto DocsHighlightService's md-* CSS classes
   (md.heading <-> .md-heading, etc.) so the two highlighters describe the same dialect from two
   different engines - unavoidable duplication (one emits HTML spans, one emits Monarch token
   states), kept in sync by hand; if you add a construct to one, add it to the other.

   RISK, called out in the implementation plan: Monarch tests each rule's regex against a
   POSITION within the current line, and this tokenizer relies on `^`-anchored patterns (heading,
   fence, comment, list marker) only ever matching at the TRUE start of a line - the same idiom
   Monaco's own bundled markdown.ts uses. This has not been verified against a live Monaco
   instance from this environment; if a heading/fence/comment/marker pattern is ever seen matching
   mid-line (e.g. right after a list marker consumes its prefix), that's this assumption breaking -
   the fix is moving those four rules into a state entered only once per line rather than tested
   via bare `^` in a flat list.

   The theme half of this file reads LITERAL HEX off the DOM (Monaco's theme API rejects anything
   else, e.g. rgb()/rgba()) rather than hardcoding colours, so app.scss's --ed-md-* custom
   properties stay the one place these colours are edited - see their definition there. */
angular.module('glidefastDocs').factory('MonacoMarkdownService', [function () {
  'use strict';

  var LANGUAGE_ID = 'gfd-markdown';

  var MONARCH_LANGUAGE = {
    defaultToken: '',
    tokenizer: {
      root: [
        [/^\s*```.*$/, { token: 'md.fence', next: '@codeblock' }],
        [/^\s*<!--.*-->\s*$/, 'md.comment'],
        [/^#{1,6}(\s.*)?$/, 'md.heading'],
        [/^(\s*)([*+-]|\d+\.)(\s)/, 'md.marker'],
        [/`[^`]*`/, 'md.code'],
        [/\[\[[^\]]*\]\]/, 'md.wikilink'],
        [/(\[[^\]]*\])(\([^)]*\))/, ['md.linktext', 'md.linkurl']],
        [/\*\*[^*]+\*\*/, 'md.bold'],
        [/\*[^*\n]+\*/, 'md.italic'],
        [/\|/, 'md.marker'],
        // Catch-all: every state needs one or Monarch stalls the moment it hits ordinary prose
        // none of the rules above matched (ordinary words are the common case, not the exception).
        [/[^*`\[|#]+/, ''],
        [/./, ''],
      ],
      codeblock: [
        [/^\s*```.*$/, { token: 'md.fence', next: '@pop' }],
        [/.*$/, 'md.codeblock'],
      ],
    },
  };

  var languageRegistered = false;
  function registerLanguage(monaco) {
    if (languageRegistered) { return; }
    languageRegistered = true;
    monaco.languages.register({ id: LANGUAGE_ID });
    monaco.languages.setMonarchTokensProvider(LANGUAGE_ID, MONARCH_LANGUAGE);
  }

  // Token -> the --ed-md-* custom property carrying its colour, and a baked fallback (this file's
  // copy of app.scss's LIGHT values) used only if the property is missing or isn't a literal hex
  // colour. Keys are exactly the token names MONARCH_LANGUAGE emits above.
  var TOKEN_CSS_VARS = {
    'md.heading': '--ed-md-heading',
    'md.bold': '--ed-md-bold',
    'md.italic': '--ed-md-italic',
    'md.code': '--ed-md-code',
    'md.fence': '--ed-md-fence',
    'md.codeblock': '--ed-md-code-block',
    'md.linktext': '--ed-md-link-text',
    'md.linkurl': '--ed-md-link-url',
    'md.wikilink': '--ed-md-wikilink',
    'md.marker': '--ed-md-marker',
    'md.comment': '--ed-md-comment',
  };
  var TOKEN_FALLBACK_HEX = {
    'md.heading': '054b80',
    'md.bold': '1c2128',
    'md.italic': '1c2128',
    'md.code': '116329',
    'md.fence': '6b7280',
    'md.codeblock': '8250df',
    'md.linktext': '054b80',
    'md.linkurl': '116329',
    'md.wikilink': '6d3fc9',
    'md.marker': '9aa1ab',
    'md.comment': '6b7280',
  };

  function isHex(value) {
    return /^#[0-9a-fA-F]{6}$/.test(value);
  }

  function readHex(computedStyle, cssVar, fallbackHex) {
    var value = computedStyle.getPropertyValue(cssVar).trim();
    return isHex(value) ? value : ('#' + fallbackHex);
  }

  function buildRules(computedStyle) {
    return Object.keys(TOKEN_CSS_VARS).map(function (token) {
      var hex = readHex(computedStyle, TOKEN_CSS_VARS[token], TOKEN_FALLBACK_HEX[token]);
      return { token: token, foreground: hex.replace('#', '') };
    });
  }

  function buildColors(computedStyle) {
    return {
      'editor.background': readHex(computedStyle, '--ed-md-bg', 'ffffff'),
      'editor.foreground': readHex(computedStyle, '--ed-md-text', '1c2128'),
      'editor.selectionBackground': readHex(computedStyle, '--ed-md-selection', 'd6e6f2'),
      'editor.lineHighlightBackground': readHex(computedStyle, '--ed-md-line-highlight', 'fbfbfd'),
      'editorCursor.foreground': readHex(computedStyle, '--ed-md-caret', '1c2128'),
    };
  }

  // Defines (or REdefines) exactly one theme - 'gfdDocsLight' or 'gfdDocsDark' - from whatever the
  // --ed-md-* custom properties CURRENTLY resolve to on containerElement. Only one, not both: this
  // only ever runs while the app is actually IN that theme (mount, or right after a toggle), which
  // is the only moment getComputedStyle can see that theme's real values - reading the page while
  // it's light can't tell you what dark's custom properties would be. Read from containerElement
  // (the editor's own DOM, not documentElement) because the SN Deployment Packager rewrites
  // `:root[data-theme]` to `.gfd-widget[data-theme]` at package time - only the container is
  // guaranteed to see whatever actually resolved, in the harness and in a deployed widget alike.
  function defineTheme(monaco, containerElement, themeName) {
    var computedStyle = getComputedStyle(containerElement);
    var monacoThemeName = themeName === 'dark' ? 'gfdDocsDark' : 'gfdDocsLight';
    monaco.editor.defineTheme(monacoThemeName, {
      base: themeName === 'dark' ? 'vs-dark' : 'vs',
      inherit: false,
      rules: buildRules(computedStyle),
      colors: buildColors(computedStyle),
    });
    return monacoThemeName;
  }

  return {
    registerLanguage: registerLanguage,
    defineTheme: defineTheme,
  };
}]);
