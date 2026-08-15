const { ipcMain, BrowserWindow } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');

let currentDirWatcher = null;
let watchDebounceTimer = null;

ipcMain.handle('watch-project-dir', async (event, dirPath) => {
  if (currentDirWatcher) { currentDirWatcher.close(); currentDirWatcher = null; }
  if (!dirPath) return;
  const win = BrowserWindow.fromWebContents(event.sender);
  currentDirWatcher = fsSync.watch(dirPath, { persistent: false }, () => {
    clearTimeout(watchDebounceTimer);
    watchDebounceTimer = setTimeout(() => {
      if (win && !win.isDestroyed()) win.webContents.send('project-dir-changed');
    }, 200);
  });
});

ipcMain.handle('read-file', async (_, filename) => {
  const filePath = path.isAbsolute(filename) ? filename : path.join(__dirname, '..', filename);
  return await fs.readFile(filePath, 'utf-8');
});

ipcMain.handle('read-dir', async (_, dirPath) => {
  const targetDir = dirPath ? dirPath : path.join(__dirname, '../..');
  try {
    const files = await fs.readdir(targetDir, { withFileTypes: true });
    const result = await Promise.all(
      files
        .filter(f => !f.name.startsWith('.') && f.name !== 'node_modules' && f.name !== 'out')
        .map(async f => {
          const fullPath = path.join(targetDir, f.name);
          let mtimeMs = 0;
          try { const stat = await fs.stat(fullPath); mtimeMs = stat.mtimeMs; } catch (e) {}
          return { name: f.name, isDirectory: f.isDirectory(), path: fullPath, mtimeMs };
        })
    );
    return result;
  } catch (err) {
    console.error('readdir error:', err);
    return [];
  }
});

ipcMain.handle('write-file', async (_, { filePath, content }) => {
  try {
    await fs.writeFile(filePath, content, 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('copy-file-to', async (_, { srcPath, destPath }) => {
  try {
    await fs.copyFile(srcPath, destPath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('delete-file', async (_, filePath) => {
  try {
    await fs.unlink(filePath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('rename-file', async (_, { oldPath, newPath }) => {
  try {
    await fs.rename(oldPath, newPath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
