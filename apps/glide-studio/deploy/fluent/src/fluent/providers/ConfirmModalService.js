[function () {
  'use strict';

  var svc = {
    confirm: { open: false, title: '', body: '', cancel: '', ok: '' },
  };
  var callback = null;

  svc.open = function (opts, onOk) {
    opts = opts || {};
    svc.confirm.title = opts.title || 'Are you sure?';
    svc.confirm.body = opts.body || '';
    svc.confirm.cancel = opts.cancel || 'Cancel';
    svc.confirm.ok = opts.ok || 'Confirm';
    callback = onOk;
    svc.confirm.open = true;
  };
  svc.close = function () {
    svc.confirm.open = false;
    callback = null;
  };
  svc.accept = function () {
    var cb = callback;
    svc.close();
    if (cb) { cb(); }
  };

  return svc;
}]