const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dsne', {
  checkCode: (data) => ipcRenderer.invoke('check-code', data),
  activate:  (data) => ipcRenderer.invoke('activate', data),
  login:     (data) => ipcRenderer.invoke('login', data),
  logout:    ()     => ipcRenderer.invoke('logout'),
});

contextBridge.exposeInMainWorld('dsneLog', {
  getRoot:     ()     => ipcRenderer.invoke('get-log-root'),
  saveFile:    (opts) => ipcRenderer.invoke('save-file', opts),
  showFile:    (p)    => ipcRenderer.invoke('show-file', p),
  openFolder:  (sub)  => ipcRenderer.invoke('open-folder', sub),
  pickFile:    ()     => ipcRenderer.invoke('pick-file'),
  copyScan:    (opts) => ipcRenderer.invoke('copy-scan', opts),
  readFileB64: (p)    => ipcRenderer.invoke('read-file-b64', p),
});

contextBridge.exposeInMainWorld('electronDocx', {
  buildRequisition:     (d,sig,entete,dateStr) => ipcRenderer.invoke('build-requisition',      {d,sig,entete,dateStr}),
  buildDeplacement:     (d,sig,entete,dateStr) => ipcRenderer.invoke('build-deplacement',      {d,sig,entete,dateStr}),
  buildEngagement:      (d,sig,entete,dateStr) => ipcRenderer.invoke('build-engagement',       {d,sig,entete,dateStr}),
  buildRestitution:     (d,sig,entete,dateStr) => ipcRenderer.invoke('build-restitution',      {d,sig,entete,dateStr}),
  buildAffectation:     (d,sig,entete,dateStr) => ipcRenderer.invoke('build-affectation',      {d,sig,entete,dateStr}),
  buildAccuse:          (acc,entete,dateStr)   => ipcRenderer.invoke('build-accuse',           {acc,entete,dateStr}),
  buildRequisitionMSPP: (d,entete,dateStr)     => ipcRenderer.invoke('build-requisition-mspp', {d,entete,dateStr}),
});
