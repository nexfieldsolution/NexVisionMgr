const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow:    () => ipcRenderer.send('window-close'),
  onWindowState:  (callback) => ipcRenderer.on('window-state', (_, isMaximized) => callback(isMaximized)),
  readFile:       (filename) => ipcRenderer.invoke('read-file', filename),
});
