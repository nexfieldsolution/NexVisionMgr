const { ipcMain } = require('electron');
const pty = require('node-pty');
const os = require('os');

const ptys = new Map();

ipcMain.handle('pty-create', (event, { cwd }) => {
  const id = Date.now();
  const shell = process.env.SHELL || '/bin/bash';
  const p = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: cwd || os.homedir(),
    env: process.env,
  });
  ptys.set(id, p);
  p.onData((data) => event.sender.send('pty-data', { id, data }));
  p.onExit(() => { ptys.delete(id); event.sender.send('pty-exit', { id }); });
  return id;
});

ipcMain.on('pty-write',  (_, { id, data })       => ptys.get(id)?.write(data));
ipcMain.on('pty-resize', (_, { id, cols, rows })  => ptys.get(id)?.resize(cols, rows));
ipcMain.on('pty-kill',   (_, { id })              => { ptys.get(id)?.kill(); ptys.delete(id); });
