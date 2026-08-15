const { ipcMain } = require('electron');
const { exec } = require('node:child_process');

ipcMain.handle('run-bash-command', (_, { command, cwd }) => {
  return new Promise((resolve) => {
    exec(command, { cwd: cwd || process.env.HOME, shell: '/bin/bash' }, (error, stdout, stderr) => {
      resolve({ stdout: stdout || '', stderr: stderr || '' });
    });
  });
});
