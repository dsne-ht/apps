const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('dsne', {
  checkCode:      (data) => ipcRenderer.invoke('check-code', data),
  activate:       (data) => ipcRenderer.invoke('activate', data),
  login:          (data) => ipcRenderer.invoke('login', data),
  logout:         ()     => ipcRenderer.invoke('logout'),
  navigate:       (page) => ipcRenderer.invoke('navigate', page),
  logAction:      (data) => ipcRenderer.invoke('log-action', data),
  getAuditLog:    ()     => ipcRenderer.invoke('get-audit-log'),
});
