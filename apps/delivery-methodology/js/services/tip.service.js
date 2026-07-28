/* Delegated tooltip engine for data-tip and jargon-term elements. */
angular.module('deliveryMethodology').factory('TipService', ['$timeout', function ($timeout) {
  'use strict';

  var TIP_DELAY_MS = 400;
  var tipDelay = null;
  var tip = {
    show: false,
    name: '',
    text: '',
    x: 0,
    y: 0
  };

  function positionTipNear(element) {
    var tipElement = document.getElementById('dm-tip');
    if (!tipElement) {
      return;
    }
    var rect = element.getBoundingClientRect();
    var tipRect = tipElement.getBoundingClientRect();
    var pad = 10;
    var x = rect.left + rect.width / 2 - tipRect.width / 2;
    var y = rect.top - tipRect.height - pad;
    if (y < 8) {
      y = rect.bottom + pad;
    }
    if (x < 8) {
      x = 8;
    }
    if (x + tipRect.width > window.innerWidth - 8) {
      x = window.innerWidth - tipRect.width - 8;
    }
    tip.x = x;
    tip.y = y;
  }

  function showTip(element) {
    tip.name = element.getAttribute('data-tip-name') || '';
    tip.text = element.getAttribute('data-tip') || '';
    tip.show = true;
    $timeout(function () {
      positionTipNear(element);
    }, 0);
  }

  function tipMouseOver($event) {
    var element = $event.target.closest && $event.target.closest('[data-tip]');
    if (!element) {
      return;
    }
    if (tipDelay) {
      $timeout.cancel(tipDelay);
      tipDelay = null;
    }
    if (element.classList.contains('jargon-term')) {
      showTip(element);
    } else {
      tipDelay = $timeout(function () {
        showTip(element);
      }, TIP_DELAY_MS);
    }
  }

  function tipMouseOut($event) {
    var element = $event.target.closest && $event.target.closest('[data-tip]');
    if (element) {
      if (tipDelay) {
        $timeout.cancel(tipDelay);
        tipDelay = null;
      }
      tip.show = false;
    }
  }

  function dismissTip() {
    if (tipDelay) {
      $timeout.cancel(tipDelay);
      tipDelay = null;
    }
    tip.show = false;
  }

  function readState() {
    return tip;
  }

  return {
    TIP_DELAY_MS: TIP_DELAY_MS,
    tip: tip,
    readState: readState,
    tipMouseOver: tipMouseOver,
    tipMouseOut: tipMouseOut,
    dismissTip: dismissTip
  };
}]);
