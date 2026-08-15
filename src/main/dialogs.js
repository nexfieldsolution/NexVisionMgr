const { ipcMain, dialog, BrowserWindow, app } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');

const recentProjectsFile = path.join(app.getPath('userData'), 'recent-projects.json');

async function loadRecentProjects() {
  try {
    const data = await fs.readFile(recentProjectsFile, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveRecentProjects(list) {
  await fs.writeFile(recentProjectsFile, JSON.stringify(list), 'utf-8');
}

ipcMain.handle('get-recent-projects', async () => {
  return await loadRecentProjects();
});

ipcMain.handle('add-recent-project', async (_, projectPath) => {
  let list = await loadRecentProjects();
  list = [projectPath, ...list.filter(p => p !== projectPath)].slice(0, 10);
  await saveRecentProjects(list);
  return list;
});

ipcMain.handle('clear-recent-projects', async () => {
  await saveRecentProjects([]);
});

ipcMain.handle('open-project-dialog', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: '프로젝트 폴더 선택',
    buttonLabel: '폴더 선택',
    properties: ['openDirectory', 'createDirectory']
  });
  return (!canceled && filePaths.length > 0) ? filePaths[0] : null;
});

ipcMain.handle('new-project-dialog', async () => {
  const win = BrowserWindow.getFocusedWindow();
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: '새 프로젝트 생성 위치 지정',
    buttonLabel: '프로젝트 생성',
    nameFieldLabel: '프로젝트 폴더 이름:',
    defaultPath: 'MyVisionProject'
  });
  if (!canceled && filePath) {
    try {
      await fs.mkdir(filePath, { recursive: true });
      await fs.writeFile(path.join(filePath, 'main.py'), 'print("Hello from main.py\\n")\n', 'utf-8');
      return { success: true, path: filePath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
  return { success: false, canceled: true };
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
  return (!canceled && filePaths.length > 0) ? filePaths[0] : null;
});

ipcMain.handle('detect-cameras', async () => {
  try {
    const files = await fs.readdir('/dev');
    const videoDevices = files
      .filter(name => /^video\d+$/.test(name))
      .sort((a, b) => parseInt(a.replace('video', '')) - parseInt(b.replace('video', '')))
      .map(name => {
        const devNum = name.replace('video', '');
        return { id: devNum, devicePath: `/dev/${name}`, label: `카메라 장치 ${devNum} (/dev/${name})` };
      });
    if (videoDevices.length === 0) {
      return [{ id: '0', devicePath: '/dev/video0', label: '기본 웹카메라 0 (Cam 0)' }];
    }
    return videoDevices;
  } catch (err) {
    return [{ id: '0', devicePath: '/dev/video0', label: '기본 웹카메라 0 (Cam 0)' }];
  }
});
