const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('dsne', {
  login:          (data) => ipcRenderer.invoke('login', data),
  register:       (data) => ipcRenderer.invoke('register', data),
  syncApproval:   ()     => ipcRenderer.invoke('sync-approval'),
  logout:         ()     => ipcRenderer.invoke('logout'),
  navigate:       (page) => ipcRenderer.invoke('navigate', page),
  queueSave:       (data) => ipcRenderer.invoke('queue-save', data),
  queuePending:    ()     => ipcRenderer.invoke('queue-pending'),
  queueAll:        ()     => ipcRenderer.invoke('queue-all'),
  queueMarkSynced: (id)   => ipcRenderer.invoke('queue-mark-synced', id),
  queueCount:      ()     => ipcRenderer.invoke('queue-count'),
});
