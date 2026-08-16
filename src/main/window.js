const { BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    titleBarStyle: 'hidden',
    icon: path.join(__dirname, '..', 'asset', 'logo.png'),
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      sandbox: false,
    },
  });
  mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));

  mainWindow.on('maximize',   () => mainWindow.webContents.send('window-state', true))
  mainWindow.on('unmaximize', () => mainWindow.webContents.send('window-state', false))
}

ipcMain.on('window-close', () => BrowserWindow.getFocusedWindow()?.close());
ipcMain.on('window-minimize', () => BrowserWindow.getFocusedWindow()?.minimize());
ipcMain.on('window-maximize', () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win?.isMaximized()) {
    win.unmaximize();
    win.webContents.send('window-state', false);
  } else {
    win?.maximize();
    win?.webContents.send('window-state', true);
  }
});

module.exports = { createWindow };
