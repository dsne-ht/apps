const { app, BrowserWindow } = require('electron');
const path = require('path');

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: 'Bureau de Direction | DSNE',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    },
    show: false
  });

  win.loadFile(path.join(__dirname, 'index.html'));
  win.setMenuBarVisibility(false);
  win.once('ready-to-show', () => win.show());

  // Allow fetch requests to external URLs (Apps Script, etc.)
  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:"
        ]
      }
    });
  });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
