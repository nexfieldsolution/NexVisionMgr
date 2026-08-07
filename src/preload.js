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
  runPythonScript:   (filePath, args) => ipcRenderer.invoke('run-python-script', { filePath, args }),
  killPythonScript:  () => ipcRenderer.invoke('kill-python-script'),
  copyFileTo:        (srcPath, destPath) => ipcRenderer.invoke('copy-file-to', { srcPath, destPath }),
  deleteFile:        (filePath) => ipcRenderer.invoke('delete-file', filePath),
  renameFile:        (oldPath, newPath) => ipcRenderer.invoke('rename-file', { oldPath, newPath }),
  onPythonOutput:    (callback) => ipcRenderer.on('python-output', (_, payload) => callback(payload)),
  onPythonExit:      (callback) => ipcRenderer.on('python-exit', (_, payload) => callback(payload)),
  selectVideoDialog: () => ipcRenderer.invoke('select-video-dialog'),
  detectCameras:     () => ipcRenderer.invoke('detect-cameras'),
});
