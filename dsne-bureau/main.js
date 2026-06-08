const { app, BrowserWindow, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const https = require('https');

let db, win;


/* ── AUTO BACKUP ── */
function autoBackupDB(dbPath, appName) {
  try {
    const docs = app.getPath('documents');
    const backupDir = path.join(docs, 'DSNE-Backups', appName);
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    const today = new Date().toISOString().slice(0,10); // YYYY-MM-DD
    const dest = path.join(backupDir, appName + '_' + today + '.db');

    // Only backup once per day
    if (!fs.existsSync(dest) && fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, dest);
      console.log('DB backup created:', dest);
    }

    // Keep only last 5 backups
    const files = fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.db'))
      .sort()
      .reverse();
    if (files.length > 5) {
      files.slice(5).forEach(f => {
        try { fs.unlinkSync(path.join(backupDir, f)); } catch(e) {}
      });
    }
  } catch(e) {
    console.error('Backup failed (non-fatal):', e.message);
  }
}

function initDB() {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'dsne_bureau.db');
  db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      nom_complet TEXT NOT NULL,
      email TEXT DEFAULT '',
      password TEXT DEFAULT '',
      role TEXT DEFAULT 'admin',
      activated INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  db.prepare("INSERT OR IGNORE INTO users (code, nom_complet, role) VALUES (?, ?, ?)")
    .run('174839', 'Daisha Dorsainvil', 'admin');
  db.prepare("INSERT OR IGNORE INTO users (code, nom_complet, role) VALUES (?, ?, ?)")
    .run('678079', 'Pierre Décius', 'adm');
  db.prepare("INSERT OR IGNORE INTO users (code, nom_complet, role) VALUES (?, ?, ?)")
    .run('560037', 'Voldking Jean Prospere', 'comp');
  db.prepare("INSERT OR IGNORE INTO users (code, nom_complet, role) VALUES (?, ?, ?)")
    .run('174838', 'Vue Test', 'test');
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 860, minWidth: 1024, minHeight: 700,
    title: 'Bureau de Direction | DSNE',
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
  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:"]
      }
    });
  });
}

app.whenReady().then(() => {
  initDB();
autoBackupDB(path.join(app.getPath('userData'), 'dsne_bureau.db'), 'dsne-bureau');
  createWindow();
  autoUpdater.checkForUpdatesAndNotify();
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// ── CHECK CODE ──
ipcMain.handle('check-code', (_, { code }) => {
  const user = db.prepare("SELECT * FROM users WHERE code = ?").get(code);
  if (!user) return { ok: false, message: 'Code invalide.' };
  if (user.role === 'test') {
    return { ok: true, autoLogin: true, user: { code: user.code, nom_complet: user.nom_complet, role: user.role } };
  }
  return { ok: true, activated: user.activated === 1, nom_complet: user.nom_complet };
});

// ── ACTIVATE ──
ipcMain.handle('activate', async (_, { code, email, password }) => {
  const user = db.prepare("SELECT * FROM users WHERE code = ?").get(code);
  if (!user) return { ok: false, message: 'Code invalide.' };
  if (user.activated) return { ok: false, message: 'Compte déjà activé.' };
  db.prepare("UPDATE users SET email = ?, password = ?, activated = 1 WHERE code = ?").run(email, password, code);
  return { ok: true, user: { code: user.code, nom_complet: user.nom_complet, role: user.role } };
});

// ── LOGIN ──
ipcMain.handle('login', (_, { code, password }) => {
  const user = db.prepare("SELECT * FROM users WHERE code = ? AND password = ? AND activated = 1").get(code, password);
  if (user) return { ok: true, user: { id: user.id, code: user.code, nom_complet: user.nom_complet, role: user.role } };
  const exists = db.prepare("SELECT * FROM users WHERE code = ?").get(code);
  if (!exists) return { ok: false, message: 'Code invalide.' };
  if (!exists.activated) return { ok: false, message: 'Compte non activé. Entrez votre code pour le configurer.' };
  return { ok: false, message: 'Mot de passe incorrect.' };
});

// ── LOGOUT ──
ipcMain.handle('logout', () => {
  win.loadFile(path.join(__dirname, 'src', 'login.html'));
  return { ok: true };
});

// ── NAVIGATE ──
ipcMain.handle('navigate', (_, page) => {
  win.loadFile(path.join(__dirname, 'src', page));
});
