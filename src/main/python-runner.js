const { ipcMain } = require('electron');
const path = require('node:path');
const { spawn } = require('node:child_process');

let currentPythonProc = null;

ipcMain.handle('run-python-script', async (event, payload) => {
  if (currentPythonProc) {
    try { currentPythonProc.kill('SIGKILL'); } catch (e) {}
    currentPythonProc = null;
  }

  const filePath = typeof payload === 'string' ? payload : payload.filePath;
  const extraArgs = typeof payload === 'object' && payload.args ? payload.args : [];

  currentPythonProc = spawn('python3', [filePath, ...extraArgs], { cwd: path.dirname(filePath) });

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
    try { currentPythonProc.kill('SIGKILL'); } catch (e) {}
    currentPythonProc = null;
    return true;
  }
  return false;
});
