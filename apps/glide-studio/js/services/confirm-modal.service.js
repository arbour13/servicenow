/* Generic confirmation modal (title/body/Cancel-Ok, with a callback run on Ok). open(opts, onOk)
   is generic enough that any destructive action in this app can reuse it. Focus management (save on
   open, move to Cancel - the safe default - once rendered, restore on close however it happens) is
   the gsModal directive's job (see the consuming modal-overlay markup), not this service's. */
angular.module('glideStudio').factory('ConfirmModalService', [function () {
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
}]);
