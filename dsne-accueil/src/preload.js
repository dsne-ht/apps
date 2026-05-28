const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  login: (data) => ipcRenderer.invoke('login', data),
  logout: () => ipcRenderer.invoke('logout'),
  navigate: (page) => ipcRenderer.invoke('navigate', page),
  getUids: () => ipcRenderer.invoke('get-uids'),
  getAllUids: () => ipcRenderer.invoke('get-all-uids'),
  addUid: (data) => ipcRenderer.invoke('add-uid', data),
  toggleUid: (data) => ipcRenderer.invoke('toggle-uid', data),
  enregistrerEntree: (data) => ipcRenderer.invoke('enregistrer-entree', data),
  enregistrerSortie: (data) => ipcRenderer.invoke('enregistrer-sortie', data),
  getVisitesActives: () => ipcRenderer.invoke('get-visites-actives'),
  getVisitesJour: () => ipcRenderer.invoke('get-visites-jour'),
  getStatsJour: () => ipcRenderer.invoke('get-stats-jour'),
  syncSheets: () => ipcRenderer.invoke('sync-sheets'),
  getSyncStatus: () => ipcRenderer.invoke('get-sync-status'),
})
