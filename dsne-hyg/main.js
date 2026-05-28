const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');

let db;
let win;

function initDB() {
  const dbPath = path.join(app.getPath('userData'), 'dsne_hyg.db');
  db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      synced_at TEXT
    )
  `);
}

function createWindow() {
  win = new BrowserWindow({
    width: 900,
    height: 720,
    title: 'DSNE – Hygiene Publique',
    webPreferences: {
      preload: path.join(__dirname, 'src', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  win.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  initDB();
  createWindow();
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

ipcMain.handle('queue-save',        (e, data) => { const r = db.prepare('INSERT INTO queue (data) VALUES (?)').run(JSON.stringify(data)); return { id: r.lastInsertRowid }; });
ipcMain.handle('queue-pending',     ()        => db.prepare("SELECT * FROM queue WHERE status='pending' ORDER BY id").all());
ipcMain.handle('queue-mark-synced', (e, id)   => { db.prepare("UPDATE queue SET status='synced', synced_at=datetime('now') WHERE id=?").run(id); return true; });
ipcMain.handle('queue-count',       ()        => db.prepare("SELECT COUNT(*) as n FROM queue WHERE status='pending'").get().n);
