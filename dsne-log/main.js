const { app, BrowserWindow } = require('electron');
const path = require('path');

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1200, height: 820, minWidth: 960, minHeight: 640,
    title: 'DSNE — Logistique',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    },
    show: false
  });
  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  win.setMenuBarVisibility(false);
  win.once('ready-to-show', () => win.show());
  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data:"]
      }
    });
  });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
