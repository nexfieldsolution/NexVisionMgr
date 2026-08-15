const { app, BrowserWindow } = require('electron');
const path = require('node:path');

if (!app.isPackaged) {
  try {
    require('electron-reload')(__dirname, {
      electron: require(path.join(__dirname, '..', 'node_modules', 'electron')),
    });
  } catch (e) {}
}

if (require('electron-squirrel-startup')) app.quit();

const { createWindow } = require('./main/window');
require('./main/file-ops');
require('./main/python-runner');
require('./main/bash-runner');
require('./main/dialogs');

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
