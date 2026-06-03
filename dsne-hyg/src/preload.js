const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('dsne', {
  checkCode:       (data) => ipcRenderer.invoke('check-code', data),
  activate:        (data) => ipcRenderer.invoke('activate', data),
  login:           (data) => ipcRenderer.invoke('login', data),
  logout:          ()     => ipcRenderer.invoke('logout'),
  navigate:        (page) => ipcRenderer.invoke('navigate', page),
  queueSave:       (data) => ipcRenderer.invoke('queue-save', data),
  queuePending:    ()     => ipcRenderer.invoke('queue-pending'),
  queueAll:        ()     => ipcRenderer.invoke('queue-all'),
  queueMarkSynced: (id)   => ipcRenderer.invoke('queue-mark-synced', id),
  queueCount:      ()     => ipcRenderer.invoke('queue-count'),
  logAction:       (data) => ipcRenderer.invoke('log-action', data),
  getAuditLog:     ()     => ipcRenderer.invoke('get-audit-log'),
});
