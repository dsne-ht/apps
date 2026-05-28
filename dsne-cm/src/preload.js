const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dsne', {
  queueSave:       (data) => ipcRenderer.invoke('queue-save', data),
  queuePending:    ()     => ipcRenderer.invoke('queue-pending'),
  queueMarkSynced: (id)   => ipcRenderer.invoke('queue-mark-synced', id),
  queueCount:      ()     => ipcRenderer.invoke('queue-count'),
});
