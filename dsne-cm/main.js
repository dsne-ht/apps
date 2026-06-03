const { app, BrowserWindow, ipcMain } = require('electron');
const https = require('https');
const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');

let db;
let win;

// ── CONFIGURATION ──
const SHEET_URL = 'https://script.google.com/macros/s/AKfycbzTAOg78o7iWchNoqxsqR81vS6pxGGq5cEsbfyJd5u5agA9rOKfRgR_bg3hmzb81yIP/exec';
const APP_NAME  = 'Clinique Mobile';

const userDataPath = app.getPath('userData');
const dbPath       = path.join(userDataPath, 'dsne_cm.db');

// ── DATABASE ──
function initDB() {
  db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nom_complet TEXT NOT NULL,
      email TEXT DEFAULT '',
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
    CREATE TABLE IF NOT EXISTS queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      synced_at TEXT
    );
    INSERT OR IGNORE INTO users (username, password, nom_complet, statut, role)
    VALUES ('admin', 'dsne2026', 'Administrateur', 'approuve', 'admin');
  `);
}

function getStartPage() {
  const approved = db.prepare("SELECT COUNT(*) as n FROM users WHERE statut='approuve'").get().n;
  const pending  = db.prepare("SELECT COUNT(*) as n FROM users WHERE statut='en_attente'").get().n;
  if (approved > 1) return 'login.html';   // >1 because admin always exists
  if (pending  > 0) return 'pending.html';
  return 'register.html';
}

// ── WINDOW ──
function createWindow(page) {
  win = new BrowserWindow({
    width: 960, height: 760, minWidth: 800, minHeight: 600,
    title: 'DSNE — Enregistrement Clinique Mobile',
    webPreferences: {
      preload: path.join(__dirname, 'src', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    show: false
  });
  win.loadFile(path.join(__dirname, 'src', page));
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

app.whenReady().then(() => {
  initDB();
  createWindow(getStartPage());
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// ── IPC HANDLERS ──

ipcMain.handle('login', (_, { username, password }) => {
  const user = db.prepare(
    "SELECT * FROM users WHERE username=? AND password=? AND statut='approuve'"
  ).get(username, password);

  if (user) {
    db.prepare('INSERT INTO audit_log (user, action) VALUES (?,?)').run(user.username, 'login');
    return { ok: true, user: { id: user.id, username: user.username, nom_complet: user.nom_complet, role: user.role } };
  }

  const pending = db.prepare("SELECT * FROM users WHERE username=?").get(username);
  if (pending) {
    if (pending.statut === 'en_attente') return { ok: false, pending: true, message: "Compte en attente d'approbation." };
    if (pending.password !== password) return { ok: false, message: 'Mot de passe incorrect.' };
  }
  return { ok: false, message: 'Identifiants incorrects.' };
});

ipcMain.handle('register', async (_, { username, password, nom_complet, email }) => {
  try {
    db.prepare(
      "INSERT INTO users (username, password, nom_complet, email, statut) VALUES (?,?,?,?,'en_attente')"
    ).run(username, password, nom_complet, email || '');

    // Notify via Apps Script (logs to Google Sheet)
    await notifySheetNewAccount({ username, nom_complet, email: email || '', app_name: APP_NAME, created_at: new Date().toISOString() });

    return { ok: true };
  } catch (e) {
    if (e.message.includes('UNIQUE')) return { ok: false, message: "Ce nom d'utilisateur existe déjà." };
    return { ok: false, message: e.message };
  }
});

ipcMain.handle('sync-approval', async () => {
  // Check Google Sheet for approved accounts and update local DB
  try {
    const pendingUsers = db.prepare("SELECT * FROM users WHERE statut='en_attente'").all();
    if (pendingUsers.length === 0) return { ok: true, approved: false };

    // Ask the sheet which accounts are approved
    const response = await httpsPost(SHEET_URL, {
      action: 'check-approvals',
      usernames: pendingUsers.map(u => u.username)
    });

    if (response.approved && response.approved.length > 0) {
      const stmt = db.prepare("UPDATE users SET statut='approuve' WHERE username=?");
      response.approved.forEach(username => stmt.run(username));
      return { ok: true, approved: true, count: response.approved.length };
    }

    return { ok: true, approved: false };
  } catch (e) {
    console.error('sync-approval error:', e.message);
    return { ok: true, approved: false };
  }
});

ipcMain.handle('logout', () => {
  win.loadFile(path.join(__dirname, 'src', 'login.html'));
  return { ok: true };
});

ipcMain.handle('navigate', (_, page) => {
  win.loadFile(path.join(__dirname, 'src', page));
});

ipcMain.handle('log-action', (_, { user, action, details }) => {
  db.prepare('INSERT INTO audit_log (user, action, details) VALUES (?,?,?)').run(user, action, details || '');
  return { ok: true };
});

ipcMain.handle('get-audit-log', () => {
  return db.prepare('SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT 500').all();
});

ipcMain.handle('queue-save',        (_, data) => {
  const r = db.prepare('INSERT INTO queue (data) VALUES (?)').run(JSON.stringify(data));
  return { id: r.lastInsertRowid };
});
ipcMain.handle('queue-pending',     () => db.prepare("SELECT * FROM queue WHERE status='pending' ORDER BY id DESC").all());
ipcMain.handle('queue-all',         () => db.prepare('SELECT * FROM queue ORDER BY id DESC').all());
ipcMain.handle('queue-mark-synced', (_, id) => {
  db.prepare("UPDATE queue SET status='synced', synced_at=datetime('now') WHERE id=?").run(id);
  return true;
});
ipcMain.handle('queue-count', () => db.prepare("SELECT COUNT(*) as n FROM queue WHERE status='pending'").get().n);

// ── HELPERS ──

function httpsPost(url, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const urlObj  = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path:     urlObj.pathname + urlObj.search,
      method:   'POST',
      headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { resolve({ ok: false, raw: body }); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function notifySheetNewAccount(data) {
  try {
    await httpsPost(SHEET_URL, { action: 'new-account', ...data });
    console.log('Account notification sent for:', data.nom_complet);
  } catch (e) {
    console.error('Notification failed (offline?):', e.message);
    // Non-fatal — account is still saved locally
  }
}
