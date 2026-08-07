const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow:    () => ipcRenderer.send('window-close'),
  onWindowState:  (callback) => ipcRenderer.on('window-state', (_, isMaximized) => callback(isMaximized)),
  readFile:          (filename) => ipcRenderer.invoke('read-file', filename),
  writeFile:         (filePath, content) => ipcRenderer.invoke('write-file', { filePath, content }),
  readDir:           (dirPath) => ipcRenderer.invoke('read-dir', dirPath),
  openProjectDialog: () => ipcRenderer.invoke('open-project-dialog'),
  newProjectDialog:  () => ipcRenderer.invoke('new-project-dialog'),
  createProjectFolder:(parentDir, projectName) => ipcRenderer.invoke('create-project-folder', { parentDir, projectName }),
  runPythonScript:   (filePath) => ipcRenderer.invoke('run-python-script', filePath),
});
