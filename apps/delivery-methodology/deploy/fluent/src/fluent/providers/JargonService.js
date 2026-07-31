[
  '$sce', 'RaciGridService',
  function ($sce, RaciGridService) {
  'use strict';

  var glossary = {};
  var jargonCache = {};

  function escapeHtml(text) {
    var value = '';
    if (text != null) {
      value = String(text);
    }
    return value
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function setGlossary(map) {
    glossary = map || {};
    jargonCache = {};
  }

  // Standalone RACI letters in prose ("Exactly one A per task", "shown together as R A") render as
  // the same coloured mono letters the grid uses (.rl-*). Two of the four letters are English
  // words, so each has a guard: A and I never chip at a sentence start ("A strong methodology…"),
  // and I additionally needs letter-referring context before it (an/one/the/each/and/or, or an
  // adjacent bare RACI letter) so the pronoun can never chip. R and C aren't words - they chip
  // anywhere they stand alone. Leading context is a whitelist (start/whitespace/paren) so letters
  // fused to an entity never chip - escaped "Q&amp;A" ends in ";A", which is rejected.
  var RACI_LETTER = /(^|[\s(])([RACI])(?=[\s).,:;!?"']|$)/g;

  function isSentenceStart(prefix) {
    var trimmed = prefix.replace(/\s+$/, '');

    if (!trimmed) {
      return true;
    }

    return /[.!?]$/.test(trimmed);
  }

  function hasLetterContextForI(prefix) {
    if (/\b(an|one|the|each|and|or)\s+$/i.test(prefix)) {
      return true;
    }

    return /\b[RAC]\s+$/.test(prefix);
  }

  function chipRaciLetters(html) {
    return html.split(/(<[^>]*>)/).map(function (segment) {
      if (segment.charAt(0) === '<') {
        return segment;
      }

      return segment.replace(RACI_LETTER, function (match, lead, letter, offset, whole) {
        var prefix = whole.slice(0, offset) + lead;

        if ((letter === 'A' || letter === 'I') && isSentenceStart(prefix)) {
          return match;
        }

        if (letter === 'I' && !hasLetterContextForI(prefix)) {
          return match;
        }

        var name = RaciGridService.NAMES[letter] || letter;
        var desc = RaciGridService.DESCS[letter] || '';
        return lead
          + '<span class="rl-prose rl-' + letter + '" data-tip-name="' + escapeHtml(name)
          + '" data-tip="' + escapeHtml(desc) + '">' + letter + '</span>';
      });
    }).join('');
  }

  function jargonHtml(text) {
    if (!text) {
      return $sce.trustAsHtml('');
    }
    if (jargonCache[text]) {
      return jargonCache[text];
    }
    var html = escapeHtml(text);
    var terms = Object.keys(glossary);
    if (terms.length) {
      var pattern = new RegExp('\\b(' + terms.map(function (term) {
        return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }).join('|') + ')\\b', 'g');
      html = html.replace(pattern, function (match) {
        return '<span class="jargon-term" data-tip-name="' + escapeHtml(match) + '" data-tip="' + escapeHtml(glossary[match]) + '">' + escapeHtml(match) + '</span>';
      });
    }
    html = chipRaciLetters(html);

    var trusted = $sce.trustAsHtml(html);
    jargonCache[text] = trusted;
    return trusted;
  }

  return {
    setGlossary: setGlossary,
    jargonHtml: jargonHtml
  };
}]