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

ipcMain.handle('run-python-script', async (_, filePath) => {
  return new Promise((resolve) => {
    const pythonProc = spawn('python3', [filePath], { cwd: path.dirname(filePath) });
    let stdout = '';
    let stderr = '';

    pythonProc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProc.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });

    pythonProc.on('error', (err) => {
      resolve({ code: -1, stdout: '', stderr: `파이썬 실행 실패: ${err.message}\npython3가 설치되어 있는지 확인하세요.` });
    });
  });
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
