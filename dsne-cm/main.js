const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');

let db;
let win;

function initDB() {
  const dbPath = path.join(app.getPath('userData'), 'dsne_cm.db');
  db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nom_complet TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      synced_at TEXT
    );
    INSERT OR IGNORE INTO users (username, password, nom_complet)
    VALUES ('admin', 'dsne2026', 'Administrateur');
  `);
}

function createWindow() {
  win = new BrowserWindow({
    width: 960,
    height: 760,
    minWidth: 800,
    minHeight: 600,
    title: 'DSNE — Clinique Mobile',
    webPreferences: {
      preload: path.join(__dirname, 'src', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    show: false
  });
  win.loadFile(path.join(__dirname, 'src', 'login.html'));
  win.setMenuBarVisibility(false);
  win.once('ready-to-show', () => win.show());
}

app.whenReady().then(() => { initDB(); createWindow(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// AUTH
ipcMain.handle('login', (_, { username, password }) => {
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password);
  if (user) return { ok: true, user: { id: user.id, username: user.username, nom_complet: user.nom_complet } };
  return { ok: false, message: 'Identifiants incorrects.' };
});
ipcMain.handle('logout', () => {
  win.loadFile(path.join(__dirname, 'src', 'login.html'));
  return { ok: true };
});

// QUEUE
ipcMain.handle('queue-save',        (_, data) => { const r = db.prepare('INSERT INTO queue (data) VALUES (?)').run(JSON.stringify(data)); return { id: r.lastInsertRowid }; });
ipcMain.handle('queue-pending',     ()        => db.prepare("SELECT * FROM queue WHERE status='pending' ORDER BY id DESC").all());
ipcMain.handle('queue-all',         ()        => db.prepare("SELECT * FROM queue ORDER BY id DESC").all());
ipcMain.handle('queue-mark-synced', (_, id)   => { db.prepare("UPDATE queue SET status='synced', synced_at=datetime('now') WHERE id=?").run(id); return true; });
ipcMain.handle('queue-count',       ()        => db.prepare("SELECT COUNT(*) as n FROM queue WHERE status='pending'").get().n);
