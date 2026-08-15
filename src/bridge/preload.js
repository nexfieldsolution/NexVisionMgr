const { ipcRenderer } = require('electron');

module.exports = {
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow:    () => ipcRenderer.send('window-close'),
  onWindowState:  (callback) => ipcRenderer.on('window-state', (_, isMaximized) => callback(isMaximized)),

  readFile:          (filename) => ipcRenderer.invoke('read-file', filename),
  writeFile:         (filePath, content) => ipcRenderer.invoke('write-file', { filePath, content }),
  readDir:           (dirPath) => ipcRenderer.invoke('read-dir', dirPath),

  openProjectDialog: () => ipcRenderer.invoke('open-project-dialog'),
  newProjectDialog:  () => ipcRenderer.invoke('new-project-dialog'),

  runPythonScript:   (filePath, args) => ipcRenderer.invoke('run-python-script', { filePath, args }),
  killPythonScript:  () => ipcRenderer.invoke('kill-python-script'),
  onPythonOutput:    (callback) => ipcRenderer.on('python-output', (_, payload) => callback(payload)),
  onPythonExit:      (callback) => ipcRenderer.on('python-exit', (_, payload) => callback(payload)),

  copyFileTo:        (srcPath, destPath) => ipcRenderer.invoke('copy-file-to', { srcPath, destPath }),
  deleteFile:        (filePath) => ipcRenderer.invoke('delete-file', filePath),
  renameFile:        (oldPath, newPath) => ipcRenderer.invoke('rename-file', { oldPath, newPath }),

  selectVideoDialog: () => ipcRenderer.invoke('select-video-dialog'),
  detectCameras:     () => ipcRenderer.invoke('detect-cameras'),

  getRecentProjects:   () => ipcRenderer.invoke('get-recent-projects'),
  addRecentProject:    (p) => ipcRenderer.invoke('add-recent-project', p),
  clearRecentProjects: () => ipcRenderer.invoke('clear-recent-projects'),

  watchProjectDir:     (dirPath) => ipcRenderer.invoke('watch-project-dir', dirPath),
  onProjectDirChanged: (cb) => ipcRenderer.on('project-dir-changed', cb),

  runBashCommand: (command, cwd) => ipcRenderer.invoke('run-bash-command', { command, cwd }),
};
