const { app, BrowserWindow, ipcMain } = require('electron');
const https = require('https');
const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');

let db;
let win;
const NOTIF_URL = 'NOTIF_SCRIPT_URL_ICI';
const APP_NAME = 'Hygiène Publique';

const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'dsne_hyg.db');
const tokenPath = path.join(userDataPath, 'oauth_token.json');
const SPREADSHEET_ID = '1VOkC7nMA4dkUneQ59711S9GdP3W176GmnqG93WIGI5A';
const SHEET_COMPTES = 'DEMANDES_COMPTES_HYG';

function initDB() {
  db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nom_complet TEXT NOT NULL,
      role TEXT DEFAULT 'uas',
      statut TEXT DEFAULT 'en_attente',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      timestamp TEXT DEFAULT (datetime('now'))
    );
    INSERT OR IGNORE INTO users (username, password, nom_complet, statut, role)
    VALUES ('admin', 'dsne2026', 'Administrateur', 'approuve', 'admin');
    CREATE TABLE IF NOT EXISTS queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      synced_at TEXT
    );
  `);
}

function getStartPage() {
  const approved = db.prepare("SELECT COUNT(*) as n FROM users WHERE statut='approuve'").get().n;
  const pending  = db.prepare("SELECT COUNT(*) as n FROM users WHERE statut='en_attente'").get().n;
  if (approved > 0) return 'login.html';
  if (pending  > 0) return 'pending.html';
  return 'register.html';
}

function createWindow(page) {
  win = new BrowserWindow({
    width: 960, height: 760, minWidth: 800, minHeight: 600,
    title: 'DSNE - Enregistrement Hygiène Publique',
    webPreferences: {
      preload: path.join(__dirname, 'src', 'preload.js'),
      contextIsolation: true, nodeIntegration: false
    },
    show: false
  });
  win.loadFile(path.join(__dirname, 'src', page));
  win.setMenuBarVisibility(false);
  win.once('ready-to-show', () => win.show());
  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({ responseHeaders: { ...details.responseHeaders, 'Content-Security-Policy': ["default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data:"] } })
  })
}

app.whenReady().then(() => { initDB(); createWindow(getStartPage()); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

ipcMain.handle('login', (_, { username, password }) => {
  const user = db.prepare("SELECT * FROM users WHERE username=? AND password=? AND statut='approuve'").get(username, password);
  if (user) return { ok: true, user: { id: user.id, username: user.username, nom_complet: user.nom_complet } };
  const pending = db.prepare("SELECT * FROM users WHERE username=?").get(username);
  if (pending && pending.statut === 'en_attente') return { ok: false, pending: true, message: "Compte en attente d'approbation." };
  return { ok: false, message: 'Identifiants incorrects.' };
});

ipcMain.handle('register', async (_, { username, password, nom_complet, email }) => {
  try {
    db.prepare("INSERT INTO users (username,password,nom_complet,statut) VALUES (?,?,?,'en_attente')").run(username, password, nom_complet);
    await syncDemandeCompte({ username, nom_complet, app_name: APP_NAME, email: email || '', created_at: new Date().toISOString() });
    return { ok: true };
  } catch(e) {
    if (e.message.includes('UNIQUE')) return { ok: false, message: "Ce nom d'utilisateur existe déjà." };
    return { ok: false, message: e.message };
  }
});

ipcMain.handle('sync-approval', async () => {
  // Vérification d'approbation — nécessite configuration OAuth
  return { ok: true, approved: false };
});

ipcMain.handle('logout', () => { win.loadFile(path.join(__dirname, 'src', 'login.html')); return { ok: true }; });
ipcMain.handle('navigate', (_, page) => { win.loadFile(path.join(__dirname, 'src', page)); });

ipcMain.handle('log-action', (_, { user, action, details }) => {
  db.prepare('INSERT INTO audit_log (user, action, details) VALUES (?,?,?)').run(user, action, details || '')
  return { ok: true }
})
ipcMain.handle('get-audit-log', () => {
  return db.prepare('SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT 500').all()
})

ipcMain.handle('queue-save',        (_, data) => { const r = db.prepare('INSERT INTO queue (data) VALUES (?)').run(JSON.stringify(data)); return { id: r.lastInsertRowid }; });
ipcMain.handle('queue-pending',     ()        => db.prepare("SELECT * FROM queue WHERE status='pending' ORDER BY id DESC").all());
ipcMain.handle('queue-all',         ()        => db.prepare("SELECT * FROM queue ORDER BY id DESC").all());
ipcMain.handle('queue-mark-synced', (_, id)   => { db.prepare("UPDATE queue SET status='synced', synced_at=datetime('now') WHERE id=?").run(id); return true; });
ipcMain.handle('queue-count',       ()        => db.prepare("SELECT COUNT(*) as n FROM queue WHERE status='pending'").get().n);

async function syncDemandeCompte(data) {
  try {
    if (!NOTIF_URL || NOTIF_URL === 'NOTIF_SCRIPT_URL_ICI') {
      console.log('NOTIF_URL non configuré — notification ignorée');
      return;
    }
    const payload = JSON.stringify(data);
    const url = new URL(NOTIF_URL);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    };
    await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => resolve(body));
      });
      req.on('error', reject);
      req.write(payload);
      req.end();
    });
    console.log('Notification envoyée pour:', data.nom_complet);
  } catch(e) {
    console.error('Notification échouée:', e.message);
  }
}
