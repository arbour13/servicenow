/* The markdown editor's whole DOM lifecycle, behind ONE facade the controller talks to regardless
   of which of two DRIVERS is actually live:
     - The Monaco driver, when https://cdn.jsdelivr.net's Monaco has loaded (see
       MonacoLoaderService) - a real code editor: line numbers, find, multi-cursor, bracket
       matching, syntax colouring via MonacoMarkdownService's Monarch tokenizer.
     - The textarea driver, the ORIGINAL hand-rolled editor this app shipped with before Monaco -
       a transparent <textarea> over a <pre> layer DocsHighlightService repaints every keystroke.
       This is not a degraded emergency mode; it's the FIRST editor of every cold session (see
       mountEditor below) and the ONLY editor a deployed Service Portal widget ever runs, since the
       packager ships only the <div class="app"> subtree and Monaco's <script> tag lives outside
       it - see MonacoLoaderService's own header comment.

   Both drivers implement the same offset-based contract (character offsets into the flat text,
   never Monaco line/column positions or textarea DOM quirks), so every toolbar button, the
   scroll-sync between source and preview, and Escape-to-exit are each written ONCE against that
   contract and behave identically either way:
     name, getText(), setText(text), getSelection(), setSelectionRange(start, end),
     replaceRange(start, end, text, selStart, selEnd), focusEditor(), applyTheme(theme),
     getScrollFraction(), setScrollFraction(fraction), relayout(), destroy()

   MOUNT STRATEGY: the textarea driver mounts INSTANTLY (0ms, no spinner) every time Edit is
   clicked. If Monaco's eager, non-blocking CDN load (kicked off once below, at construction -
   effectively app boot) resolves WHILE the author hasn't typed yet, it silently swaps in behind
   the scenes. If they've already typed, they keep the textarea for that edit session - never a
   swap under a typing user - and the NEXT Edit click gets Monaco immediately, since the load
   promise is already settled by then. This means the fallback is exercised on the first edit of
   every cold session, not just when something is broken, so it can never rot silently. No badge
   communicates which editor is live - .docs-editor-source carries data-editor="monaco"|"textarea"
   for inspection, and a failed Monaco load gets exactly one console.warn (from MonacoLoaderService
   itself). */
angular.module('glidefastDocs').factory('MarkdownEditorService', [
  '$rootScope', '$timeout', 'DocsHighlightService', 'MonacoLoaderService', 'MonacoMarkdownService',
  function ($rootScope, $timeout, DocsHighlightService, MonacoLoaderService, MonacoMarkdownService) {
    'use strict';

    // Eager, non-blocking - see this file's header comment. Nothing here awaits it; mountEditor
    // below just checks MonacoLoaderService.getIfReady() whenever an author actually clicks Edit.
    MonacoLoaderService.loadMonaco();

    /* ============================= Textarea driver (the fallback) ============================= */
    // The ORIGINAL editor mechanics (formerly DocsUiService.setupEditorScrollSync/
    // paintEditorHighlight/matchHighlightWidth), unchanged in substance - just reshaped into the
    // driver contract above so the facade can treat this and Monaco identically.
    function createTextareaDriver(hostElement, initialText, callbacks) {
      var textarea = hostElement.querySelector('.docs-editor-textarea');
      var highlight = hostElement.querySelector('.docs-editor-highlight');

      // The textarea reserves space for its own scrollbar; the layer behind it does not. Left
      // alone, that few-pixel difference makes long lines wrap at DIFFERENT points in the two
      // layers, and the colours slide off the text. Measuring clientWidth (excludes the scrollbar)
      // and pinning the layer to it keeps both wrapping identically, whatever the platform's
      // scrollbar width is.
      function matchHighlightWidth() {
        highlight.style.width = textarea.clientWidth + 'px';
      }

      function paintHighlight() {
        highlight.innerHTML = DocsHighlightService.highlightMarkdown(textarea.value);
        matchHighlightWidth();
      }

      function onInput() {
        paintHighlight();
        callbacks.onChange(textarea.value);
      }

      // The highlight layer tracks the textarea's scroll EXACTLY (same box, same text) - unlike
      // the preview pane, which is different content and only tracks proportionally (that sync is
      // the facade's job, wired through getScrollFraction/setScrollFraction/onScroll below).
      function onTextareaScroll() {
        highlight.scrollTop = textarea.scrollTop;
        highlight.scrollLeft = textarea.scrollLeft;
        callbacks.onScroll();
      }

      // Escape leaves the editor from anywhere - the reflex people have with a focused textarea,
      // and the editor is the only thing Escape could plausibly mean while it's open. Bound on
      // document because the focused element is the textarea itself, and keydown bubbles up here
      // regardless of what else on the page currently has focus.
      function onDocumentKeydown(event) {
        if (event.key !== 'Escape') { return; }
        $rootScope.$applyAsync(function () { callbacks.onRequestExit(); });
      }

      textarea.value = initialText;
      paintHighlight();
      textarea.addEventListener('input', onInput);
      textarea.addEventListener('scroll', onTextareaScroll, { passive: true });
      document.addEventListener('keydown', onDocumentKeydown);

      return {
        name: 'textarea',
        getText: function () { return textarea.value; },
        setText: function (text) { textarea.value = text; paintHighlight(); },
        getSelection: function () { return { start: textarea.selectionStart, end: textarea.selectionEnd }; },
        setSelectionRange: function (start, end) { textarea.setSelectionRange(start, end); },
        // Goes through execCommand('insertText') rather than assigning textarea.value directly -
        // that's the whole reason Cmd/Ctrl+Z works here: a programmatic .value write CLEARS the
        // browser's native undo stack, so a toolbar click used to make everything typed before it
        // unundoable. execCommand is formally deprecated, but there is still no standard API that
        // edits a textarea while participating in native undo - contentEditable's alternatives
        // don't apply to <textarea>. It also fires a real `input` event, which is what drives
        // onInput above with no separate call needed here.
        replaceRange: function (start, end, text, selStart, selEnd) {
          textarea.focus();
          textarea.setSelectionRange(start, end);
          document.execCommand('insertText', false, text);
          textarea.setSelectionRange(selStart, selEnd);
        },
        focusEditor: function () { textarea.focus(); },
        applyTheme: function () {}, // the --ed-md-* custom properties do this work; nothing to push
        getScrollFraction: function () {
          var scrollable = textarea.scrollHeight - textarea.clientHeight;
          return scrollable > 0 ? textarea.scrollTop / scrollable : 0;
        },
        setScrollFraction: function (fraction) {
          var scrollable = textarea.scrollHeight - textarea.clientHeight;
          textarea.scrollTop = fraction * scrollable;
        },
        relayout: matchHighlightWidth,
        destroy: function () {
          textarea.removeEventListener('input', onInput);
          textarea.removeEventListener('scroll', onTextareaScroll);
          document.removeEventListener('keydown', onDocumentKeydown);
        },
      };
    }

    /* ============================= Monaco driver ============================= */
    function createMonacoDriver(hostElement, monaco, initialText, initialTheme, callbacks) {
      MonacoMarkdownService.registerLanguage(monaco);
      var model = monaco.editor.createModel(initialText, 'gfd-markdown');
      // Pinned to LF: createModel can normalise to CRLF depending on the source text, at which
      // point every character offset counts 2 per newline instead of 1 - silently drifting every
      // toolbar insertion, and writing CRLF into localStorage and DocsRenderer. Read back the same
      // way (EndOfLinePreference.LF in getText below) so this holds for the model's whole life.
      model.setEOL(monaco.editor.EndOfLineSequence.LF);

      var themeName = MonacoMarkdownService.defineTheme(monaco, hostElement, initialTheme);
      var editor = monaco.editor.create(hostElement, {
        model: model,
        theme: themeName,
        language: 'gfd-markdown',
        wordWrap: 'on',
        lineNumbers: 'on',
        minimap: { enabled: false },
        folding: false,
        glyphMargin: false,
        renderLineHighlight: 'none',
        scrollBeyondLastLine: false,
        automaticLayout: false, // relayout() below is called explicitly via a ResizeObserver instead
        fontFamily: getComputedStyle(hostElement).getPropertyValue('--mono').trim() || 'monospace',
        fontSize: 12.5,
        lineHeight: 20,
        padding: { top: 12, bottom: 12 },
        // This is a prose editor, not a code editor - every one of these is a live worker
        // dependency this app has no use for, and turning them off also removes three of the
        // four things inside Monaco that would otherwise want to swallow Escape.
        quickSuggestions: false,
        suggestOnTriggerCharacters: false,
        wordBasedSuggestions: 'off',
        parameterHints: { enabled: false },
        hover: { enabled: false },
        links: false,
        contextmenu: false,
        occurrencesHighlight: 'off',
        bracketPairColorization: { enabled: false },
      });

      function offsetsToRange(start, end) {
        var from = model.getPositionAt(start);
        var to = model.getPositionAt(end);
        return new monaco.Range(from.lineNumber, from.column, to.lineNumber, to.column);
      }

      var changeSubscription = model.onDidChangeContent(function () {
        callbacks.onChange(model.getValue(monaco.editor.EndOfLinePreference.LF));
      });
      var scrollSubscription = editor.onDidScrollChange(function () { callbacks.onScroll(); });
      // Escape leaves the editor - EXCEPT when one of Monaco's own widgets (find, suggest,
      // parameter hints - all render inside hostElement, since fixedOverflowWidgets is
      // deliberately left off) wants first refusal, e.g. closing the find widget rather than
      // torching the whole editor out from under a reader mid-search.
      //
      // This was originally an editor.addCommand(Escape, ..., '!findWidgetVisible && ...') command
      // - it turned out to SHADOW Monaco's own built-in find-widget-closes-on-Escape handling
      // entirely (confirmed live: with the command registered, Escape stopped closing an open find
      // widget at all, regardless of the when-clause), rather than just staying out of its way as
      // the when-clause suggested it would. Reverted to plain DOM event ordering instead, which is
      // a semantic this code can rely on directly rather than needing to guess at Monaco's internal
      // keybinding precedence: a CAPTURE-phase document listener runs before Monaco's own
      // widget-closing handling ever gets the event (capture fires target-ward, before the
      // bubble-phase handling on the widget's own input), so checking "is a widget open" here sees
      // its TRUE pre-keypress state and can cleanly step aside.
      //
      // Known gap: Monaco also gives Escape a job with NO widget visible in some states (e.g.
      // collapsing multiple cursors to one) - those aren't in the widget-open check below, so
      // Escape in that state exits the editor in one press rather than collapsing cursors first.
      // Suggestions/hover/parameter-hints are already off for this prose editor, so multi-cursor is
      // the only realistic case left, and it's rare enough here not to warrant deeper Monaco
      // internals-poking to guard against.
      function isMonacoWidgetOpen() {
        return !!hostElement.querySelector('.find-widget.visible, .suggest-widget.visible, .parameter-hints-widget.visible');
      }
      function onDocumentKeydown(event) {
        if (event.key !== 'Escape') { return; }
        if (hostElement.contains(document.activeElement) && isMonacoWidgetOpen()) { return; }
        $rootScope.$applyAsync(function () { callbacks.onRequestExit(); });
      }
      document.addEventListener('keydown', onDocumentKeydown, true);

      return {
        name: 'monaco',
        getText: function () { return model.getValue(monaco.editor.EndOfLinePreference.LF); },
        setText: function (text) { model.setValue(text); },
        getSelection: function () {
          var selection = editor.getSelection();
          return { start: model.getOffsetAt(selection.getStartPosition()), end: model.getOffsetAt(selection.getEndPosition()) };
        },
        setSelectionRange: function (start, end) {
          var range = offsetsToRange(start, end);
          editor.setSelection(new monaco.Selection(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn));
        },
        replaceRange: function (start, end, text, selStart, selEnd) {
          var range = offsetsToRange(start, end);
          editor.pushUndoStop();
          editor.executeEdits('toolbar', [{ range: range, text: text, forceMoveMarkers: true }]);
          editor.pushUndoStop();
          var selRange = offsetsToRange(selStart, selEnd);
          editor.setSelection(new monaco.Selection(selRange.startLineNumber, selRange.startColumn, selRange.endLineNumber, selRange.endColumn));
          editor.focus();
        },
        focusEditor: function () { editor.focus(); },
        applyTheme: function (theme) {
          // Re-read the custom properties before switching - they've just changed (this only runs
          // right after a theme toggle), and setTheme is global across every Monaco instance on
          // the page, so redefining the theme name in place picks up live instances immediately.
          var newThemeName = MonacoMarkdownService.defineTheme(monaco, hostElement, theme);
          monaco.editor.setTheme(newThemeName);
        },
        getScrollFraction: function () {
          var scrollable = editor.getScrollHeight() - editor.getLayoutInfo().height;
          return scrollable > 0 ? editor.getScrollTop() / scrollable : 0;
        },
        setScrollFraction: function (fraction) {
          var scrollable = editor.getScrollHeight() - editor.getLayoutInfo().height;
          editor.setScrollTop(fraction * scrollable);
        },
        relayout: function () { editor.layout(); },
        destroy: function () {
          changeSubscription.dispose();
          scrollSubscription.dispose();
          document.removeEventListener('keydown', onDocumentKeydown, true);
          editor.dispose();
          model.dispose();
        },
      };
    }

    /* ============================= The facade ============================= */
    var activeDriver = null;
    var hostEl = null;
    var mountOptions = null;
    var authorHasTyped = false;
    var mountToken = 0;
    var resizeObserver = null;
    var previewEl = null;

    // Same proportional (fraction-of-scrollable), guarded-against-feedback-loop sync this editor
    // has always used between its two panes - `drivingSide` is the guard: driving the OTHER side's
    // scrollTop fires ITS OWN scroll event, which would bounce straight back and fight whichever
    // pane the reader is actually dragging. Released on a plain timeout rather than
    // requestAnimationFrame deliberately - rAF can be suspended entirely in a backgrounded or
    // throttled tab, which would wedge the guard on forever. Operates on FRACTIONS, not raw
    // scrollTop, specifically so this same function serves both drivers identically - Monaco has
    // no single DOM node whose scrollTop means "the editor's scroll position" the way a textarea
    // does, only getScrollTop()/getScrollHeight()/layout height.
    var drivingSide = null;
    var releaseTimer = null;
    function syncScroll(side, getFraction, setOtherFraction) {
      if (drivingSide && drivingSide !== side) { return; }
      drivingSide = side;
      setOtherFraction(getFraction());
      if (releaseTimer) { clearTimeout(releaseTimer); }
      releaseTimer = setTimeout(function () { drivingSide = null; releaseTimer = null; }, 60);
    }
    function getPreviewFraction() {
      var scrollable = previewEl.scrollHeight - previewEl.clientHeight;
      return scrollable > 0 ? previewEl.scrollTop / scrollable : 0;
    }
    function setPreviewFraction(fraction) {
      var scrollable = previewEl.scrollHeight - previewEl.clientHeight;
      previewEl.scrollTop = fraction * scrollable;
    }
    function onPreviewScroll() { syncScroll('preview', getPreviewFraction, activeDriver.setScrollFraction); }
    function onEditorScroll() { syncScroll('editor', activeDriver.getScrollFraction, setPreviewFraction); }

    // Wraps the controller's own onTextChange: sets authorHasTyped (see this file's header
    // comment - once set, a pending Monaco upgrade for THIS session backs off) and routes the
    // controller's callback through $applyAsync, since both drivers call this from plain
    // addEventListener/onDidChangeContent handlers Angular doesn't know about on its own.
    function makeOnChange() {
      return function (text) {
        authorHasTyped = true;
        $rootScope.$applyAsync(function () {
          if (mountOptions.onTextChange) { mountOptions.onTextChange(text); }
        });
      };
    }

    function mountTextarea(initialText, callbacks) {
      hostEl.setAttribute('data-editor', 'textarea');
      activeDriver = createTextareaDriver(hostEl, initialText, callbacks);
      activeDriver.setSelectionRange(0, 0);
      activeDriver.focusEditor();
      activeDriver.setScrollFraction(0);
    }

    function mountMonaco(monaco, initialText, callbacks) {
      // Set BEFORE creating, not after - a host that's still display:none (as the textarea's
      // sibling starts out, see app.scss) measures 0 and Monaco lays itself out at zero size.
      hostEl.setAttribute('data-editor', 'monaco');
      var monacoHost = hostEl.querySelector('.docs-editor-monaco');
      activeDriver = createMonacoDriver(monacoHost, monaco, initialText, mountOptions.theme, callbacks);
      activeDriver.setSelectionRange(0, 0);
      activeDriver.focusEditor();
      activeDriver.setScrollFraction(0);
      activeDriver.relayout();
    }

    // Swaps the live textarea driver for Monaco IN PLACE, once the CDN load resolves - preserves
    // exactly where the author's caret/selection was, since both drivers speak the same character-
    // offset contract. Only ever called while authorHasTyped is still false (see mountEditor).
    function upgradeToMonaco(monaco, callbacks) {
      var oldDriver = activeDriver;
      var selection = oldDriver.getSelection();
      var text = oldDriver.getText();
      oldDriver.destroy();
      mountMonaco(monaco, text, callbacks);
      activeDriver.setSelectionRange(selection.start, selection.end);
      activeDriver.focusEditor();
    }

    // options: { onTextChange: function(text), onRequestExit: function(), theme: 'light'|'dark' }
    function mountEditor(initialText, options, attempt) {
      attempt = attempt || 0;
      mountOptions = options || {};
      authorHasTyped = false;
      mountToken++;
      var thisToken = mountToken;

      hostEl = document.querySelector('.docs-editor-source');
      if (!hostEl) {
        // The editor markup doesn't exist until ng-if mounts it this digest - retry with backoff,
        // same shape as DocsUiService.setupScrollSpy's own DOM-readiness wait.
        if (attempt < 8) { $timeout(function () { mountEditor(initialText, options, attempt + 1); }, 60); }
        return;
      }

      previewEl = document.querySelector('.docs-editor-preview');
      if (previewEl) { previewEl.addEventListener('scroll', onPreviewScroll, { passive: true }); }
      resizeObserver = new ResizeObserver(function () { if (activeDriver) { activeDriver.relayout(); } });
      resizeObserver.observe(hostEl);

      var callbacks = { onChange: makeOnChange(), onScroll: onEditorScroll, onRequestExit: mountOptions.onRequestExit || function () {} };

      var monaco = MonacoLoaderService.getIfReady();
      if (monaco) {
        mountMonaco(monaco, initialText, callbacks);
        return;
      }

      mountTextarea(initialText, callbacks);
      MonacoLoaderService.loadMonaco().then(function (monaco) {
        var staleSession = thisToken !== mountToken;
        var wrongDriver = !activeDriver || activeDriver.name !== 'textarea';
        if (staleSession || authorHasTyped || wrongDriver) { return; }
        upgradeToMonaco(monaco, callbacks);
      }, function () {
        // Load already warned via console.warn in MonacoLoaderService - nothing else to do here,
        // the textarea driver mounted above just stays.
      });
    }

    function unmountEditor() {
      mountToken++; // invalidates any in-flight upgrade tied to the session just closed
      if (activeDriver) { activeDriver.destroy(); activeDriver = null; }
      if (resizeObserver) { resizeObserver.disconnect(); resizeObserver = null; }
      if (previewEl) { previewEl.removeEventListener('scroll', onPreviewScroll); previewEl = null; }
      if (releaseTimer) { clearTimeout(releaseTimer); releaseTimer = null; }
      drivingSide = null;
      hostEl = null;
      mountOptions = null;
    }

    function getEditorText() {
      return activeDriver ? activeDriver.getText() : '';
    }

    function applyEditorTheme(theme) {
      if (mountOptions) { mountOptions.theme = theme; }
      if (activeDriver) { activeDriver.applyTheme(theme); }
    }

    /* ============================= Toolbar primitives ============================= */
    // Four primitives cover every button (see main.controller.js's vm.docsToolbar* one-liners) -
    // all written ONCE here, against getText/getSelection/replaceRange, so neither driver needs
    // its own copy and neither the caller nor these functions ever think in Monaco line/column
    // positions - replaceRange's own offset<->position translation is a driver-internal detail.

    function replaceSelectedLines(makeLine) {
      if (!activeDriver) { return; }
      var text = activeDriver.getText();
      var selection = activeDriver.getSelection();
      var lineStart = text.lastIndexOf('\n', selection.start - 1) + 1;
      var nextBreak = text.indexOf('\n', selection.end);
      var lineEnd = nextBreak === -1 ? text.length : nextBreak;
      var replaced = text.slice(lineStart, lineEnd).split('\n').map(makeLine).join('\n');
      var caret = lineStart + replaced.length;
      activeDriver.replaceRange(lineStart, lineEnd, replaced, caret, caret);
    }

    // Wraps the selection (or `placeholder`, if nothing is selected) in `before`/`after` and
    // leaves the inner text selected, so a placeholder like "bold text" can be typed straight over
    // immediately - used for Bold/Italic/Inline code/Link/Wikilink.
    function insertWrap(before, after, placeholder) {
      if (!activeDriver) { return; }
      var text = activeDriver.getText();
      var selection = activeDriver.getSelection();
      var body = text.slice(selection.start, selection.end) || placeholder;
      var bodyStart = selection.start + before.length;
      activeDriver.replaceRange(selection.start, selection.end, before + body + after, bodyStart, bodyStart + body.length);
    }

    // Same as insertWrap, but pads the insertion onto its OWN line(s) first - a fenced code block
    // or a table doesn't belong mid-paragraph. Used for Code block/Table.
    function insertBlock(before, after, placeholder) {
      if (!activeDriver) { return; }
      var text = activeDriver.getText();
      var selection = activeDriver.getSelection();
      var body = text.slice(selection.start, selection.end) || placeholder;
      var needsLeadingBreak = selection.start > 0 && text[selection.start - 1] !== '\n';
      var needsTrailingBreak = selection.end < text.length && text[selection.end] !== '\n';
      var replacement = (needsLeadingBreak ? '\n' : '') + before + body + after + (needsTrailingBreak ? '\n' : '');
      var bodyStart = selection.start + (needsLeadingBreak ? 1 : 0) + before.length;
      activeDriver.replaceRange(selection.start, selection.end, replacement, bodyStart, bodyStart + body.length);
    }

    // Prefixes EVERY line the selection touches, not just the line the caret sits on - free
    // multi-line support (a strict improvement over this editor's original single-line behaviour),
    // since the underlying primitive is already range-based. Used for H2/H3/Bullet list.
    function insertLinePrefix(prefix) {
      replaceSelectedLines(function (line) { return prefix + line; });
    }

    // Same line-range mechanics, numbering each touched line 1., 2., 3.... Used for Numbered list.
    function insertOrderedList() {
      replaceSelectedLines(function (line, index) { return (index + 1) + '. ' + line; });
    }

    return {
      mountEditor: mountEditor,
      unmountEditor: unmountEditor,
      getEditorText: getEditorText,
      applyEditorTheme: applyEditorTheme,
      insertWrap: insertWrap,
      insertBlock: insertBlock,
      insertLinePrefix: insertLinePrefix,
      insertOrderedList: insertOrderedList,
    };
  },
]);
