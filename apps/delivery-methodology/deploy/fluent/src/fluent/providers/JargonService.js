['$sce', function ($sce) {
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

  function jargonHtml(text, showJargon) {
    if (!text) {
      return $sce.trustAsHtml('');
    }
    var cacheKey = '0|' + text;
    if (showJargon) {
      cacheKey = '1|' + text;
    }
    if (jargonCache[cacheKey]) {
      return jargonCache[cacheKey];
    }
    var html = escapeHtml(text);
    var terms = Object.keys(glossary);
    if (showJargon && terms.length) {
      var pattern = new RegExp('\\b(' + terms.map(function (term) {
        return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }).join('|') + ')\\b', 'g');
      html = html.replace(pattern, function (match) {
        return '<span class="jargon-term" data-tip-name="' + escapeHtml(match) + '" data-tip="' + escapeHtml(glossary[match]) + '">' + escapeHtml(match) + '</span>';
      });
    }
    var trusted = $sce.trustAsHtml(html);
    jargonCache[cacheKey] = trusted;
    return trusted;
  }

  return {
    setGlossary: setGlossary,
    jargonHtml: jargonHtml
  };
}]