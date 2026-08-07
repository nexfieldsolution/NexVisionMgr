const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { spawn } = require('node:child_process');

if (!app.isPackaged) {
  try {
    require('electron-reload')(__dirname, {
      electron: require(path.join(__dirname, '..', 'node_modules', 'electron')),
    });
  } catch (e) {
    console.error('electron-reload error:', e);
  }
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    titleBarStyle: 'hidden',
    icon: path.join(__dirname, 'logo.png'),

    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
ipcMain.handle('read-file', async (_, filename) => {
  const filePath = path.isAbsolute(filename) ? filename : path.join(__dirname, filename);
  return await fs.readFile(filePath, 'utf-8');
});

ipcMain.handle('read-dir', async (_, dirPath) => {
  const targetDir = dirPath ? dirPath : path.join(__dirname, '..');
  try {
    const files = await fs.readdir(targetDir, { withFileTypes: true });
    const result = await Promise.all(
      files
        .filter(f => !f.name.startsWith('.') && f.name !== 'node_modules' && f.name !== 'out')
        .map(async f => {
          const fullPath = path.join(targetDir, f.name);
          let mtimeMs = 0;
          try {
            const stat = await fs.stat(fullPath);
            mtimeMs = stat.mtimeMs;
          } catch (e) {}
          return {
            name: f.name,
            isDirectory: f.isDirectory(),
            path: fullPath,
            mtimeMs: mtimeMs
          };
        })
    );
    return result;
  } catch (err) {
    console.error('readdir error:', err);
    return [];
  }
});

ipcMain.handle('open-project-dialog', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: '프로젝트 폴더 선택',
    buttonLabel: '폴더 선택',
    properties: ['openDirectory', 'createDirectory']
  });
  if (!canceled && filePaths.length > 0) {
    return filePaths[0];
  }
  return null;
});

ipcMain.handle('new-project-dialog', async () => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: '새 프로젝트 생성 위치 지정',
    buttonLabel: '프로젝트 생성',
    nameFieldLabel: '프로젝트 폴더 이름:',
    defaultPath: 'MyVisionProject'
  });
  if (!canceled && filePath) {
    try {
      await fs.mkdir(filePath, { recursive: true });
      // 기본 간단한 main.py 파일 생성
      await fs.writeFile(path.join(filePath, 'main.py'), 'print("Hello from main.py\\n")\n', 'utf-8');
      return { success: true, path: filePath };
    } catch (err) {
      console.error('new-project-dialog mkdir error:', err);
      return { success: false, error: err.message };
    }
  }
  return { success: false, canceled: true };
});

ipcMain.handle('write-file', async (_, { filePath, content }) => {
  try {
    await fs.writeFile(filePath, content, 'utf-8');
    return { success: true };
  } catch (err) {
    console.error('write-file error:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('copy-file-to', async (_, { srcPath, destPath }) => {
  try {
    await fs.copyFile(srcPath, destPath);
    return { success: true };
  } catch (err) {
    console.error('copy-file-to error:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('delete-file', async (_, filePath) => {
  try {
    await fs.unlink(filePath);
    return { success: true };
  } catch (err) {
    console.error('delete-file error:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('rename-file', async (_, { oldPath, newPath }) => {
  try {
    await fs.rename(oldPath, newPath);
    return { success: true };
  } catch (err) {
    console.error('rename-file error:', err);
    return { success: false, error: err.message };
  }
});

let currentPythonProc = null;

ipcMain.handle('run-python-script', async (event, payload) => {
  if (currentPythonProc) {
    try {
      currentPythonProc.kill('SIGKILL');
    } catch (e) {}
    currentPythonProc = null;
  }

  const filePath = typeof payload === 'string' ? payload : payload.filePath;
  const extraArgs = typeof payload === 'object' && payload.args ? payload.args : [];

  const pythonArgs = [filePath, ...extraArgs];
  currentPythonProc = spawn('python3', pythonArgs, { cwd: path.dirname(filePath) });

  currentPythonProc.stdout.on('data', (data) => {
    event.sender.send('python-output', { type: 'stdout', data: data.toString() });
  });

  currentPythonProc.stderr.on('data', (data) => {
    event.sender.send('python-output', { type: 'stderr', data: data.toString() });
  });

  currentPythonProc.on('close', (code) => {
    currentPythonProc = null;
    event.sender.send('python-exit', { code });
  });

  currentPythonProc.on('error', (err) => {
    currentPythonProc = null;
    event.sender.send('python-output', { type: 'stderr', data: `파이썬 실행 실패: ${err.message}\n` });
    event.sender.send('python-exit', { code: -1 });
  });

  return { started: true };
});

ipcMain.handle('kill-python-script', async () => {
  if (currentPythonProc) {
    try {
      currentPythonProc.kill('SIGKILL');
    } catch (e) {}
    currentPythonProc = null;
    return true;
  }
  return false;
});

ipcMain.handle('select-video-dialog', async () => {
  const win = BrowserWindow.getFocusedWindow();
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: '비전 입력 동영상 파일 선택',
    properties: ['openFile'],
    filters: [
      { name: '비디오 파일', extensions: ['mp4', 'avi', 'mkv', 'mov', 'webm', 'wmv'] },
      { name: '모든 파일', extensions: ['*'] }
    ]
  });
  if (!canceled && filePaths.length > 0) {
    return filePaths[0];
  }
  return null;
});

ipcMain.handle('detect-cameras', async () => {
  try {
    const files = await fs.readdir('/dev');
    const videoDevices = files
      .filter(name => /^video\d+$/.test(name))
      .sort((a, b) => parseInt(a.replace('video', '')) - parseInt(b.replace('video', '')))
      .map(name => {
        const devNum = name.replace('video', '');
        return {
          id: devNum,
          devicePath: `/dev/${name}`,
          label: `카메라 장치 ${devNum} (/dev/${name})`
        };
      });

    if (videoDevices.length === 0) {
      return [{ id: '0', devicePath: '/dev/video0', label: '기본 웹카메라 0 (Cam 0)' }];
    }
    return videoDevices;
  } catch (err) {
    return [{ id: '0', devicePath: '/dev/video0', label: '기본 웹카메라 0 (Cam 0)' }];
  }
});

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

app.whenReady().then(() => {
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
