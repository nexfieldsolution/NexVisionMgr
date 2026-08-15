const { contextBridge } = require('electron');
const api = require('./bridge/preload');
contextBridge.exposeInMainWorld('electronAPI', api);
