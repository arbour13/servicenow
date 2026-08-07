['$timeout', function ($timeout) {
  'use strict';

  var TIP_DELAY_MS = 400;
  var tipDelay = null;
  var tip = {
    show: false,
    name: '',
    // R|A|C|I when the target is a RACI letter chip - colors the tip heading to match.
    nameTone: '',
    text: '',
    x: 0,
    y: 0
  };

  function raciToneFromElement(element) {
    if (!element || !element.classList) {
      return '';
    }
    var letters = ['R', 'A', 'C', 'I'];
    var index;
    for (index = 0; index < letters.length; index++) {
      if (element.classList.contains('rl-' + letters[index])) {
        return letters[index];
      }
    }
    return '';
  }

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
    tip.nameTone = element.getAttribute('data-tip-tone') || raciToneFromElement(element);
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
      tip.nameTone = '';
    }
  }

  function dismissTip() {
    if (tipDelay) {
      $timeout.cancel(tipDelay);
      tipDelay = null;
    }
    tip.show = false;
    tip.nameTone = '';
  }

  // Keyboard path for the same data-tip content (e.g. RACI column headers).
  function tipFocus($event) {
    var element = $event && $event.currentTarget;
    if (!element || !element.getAttribute || !element.getAttribute('data-tip')) {
      return;
    }
    if (tipDelay) {
      $timeout.cancel(tipDelay);
      tipDelay = null;
    }
    showTip(element);
  }

  function tipBlur() {
    dismissTip();
  }

  function readState() {
    return tip;
  }

  function bind(controller) {
    controller.tip = tip;
    controller.tipMouseOver = tipMouseOver;
    controller.tipMouseOut = tipMouseOut;
    controller.tipFocus = tipFocus;
    controller.tipBlur = tipBlur;
    controller.dismissTip = dismissTip;
  }

  return {
    TIP_DELAY_MS: TIP_DELAY_MS,
    tip: tip,
    readState: readState,
    tipMouseOver: tipMouseOver,
    tipMouseOut: tipMouseOut,
    tipFocus: tipFocus,
    tipBlur: tipBlur,
    dismissTip: dismissTip,
    bind: bind
  };
}]