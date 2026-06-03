const { app, BrowserWindow, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const Database = require('better-sqlite3');
const https = require('https');

const APP_NAME  = 'Clinique Mobile';
const SHEET_URL = 'https://script.google.com/macros/s/AKfycbzTAOg78o7iWchNoqxsqR81vS6pxGGq5cEsbfyJd5u5agA9rOKfRgR_bg3hmzb81yIP/exec';
const ADMIN_EMAIL = 'sec.direction.dsne@gmail.com';

let db, win;

function initDB() {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'dsne_cm.db');
  db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      nom_complet TEXT NOT NULL,
      email TEXT DEFAULT '',
      password TEXT DEFAULT '',
      role TEXT DEFAULT 'uas',
      activated INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user TEXT,
      action TEXT,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      synced_at TEXT
    );
  `);

  // Seed accounts — INSERT OR IGNORE so existing data is preserved
  const seedUsers = [
    { code: '174839', nom_complet: 'Daisha Dorsainvil', role: 'admin' },
    { code: '263751', nom_complet: 'John Y. Milien',    role: 'uas'   },
    { code: '391847', nom_complet: 'Dieulin Toussaint', role: 'uas'   },
    { code: '517293', nom_complet: 'Jodlyn Etienne',    role: 'uas'   },
  ];
  const stmt = db.prepare(
    "INSERT OR IGNORE INTO users (code, nom_complet, role) VALUES (?, ?, ?)"
  );
  seedUsers.forEach(u => stmt.run(u.code, u.nom_complet, u.role));
}

function getStartPage() {
  // Always start at login
  return 'login.html';
}

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
}

app.whenReady().then(() => { initDB(); createWindow(getStartPage()); autoUpdater.checkForUpdatesAndNotify(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// ── CHECK CODE ──
// Returns: { ok, exists, activated, nom_complet }
ipcMain.handle('check-code', (_, { code }) => {
  const user = db.prepare("SELECT * FROM users WHERE code = ?").get(code);
  if (!user) return { ok: false, message: 'Code invalide.' };
  return { ok: true, activated: user.activated === 1, nom_complet: user.nom_complet };
});

// ── ACTIVATE (first login — set email + password) ──
ipcMain.handle('activate', async (_, { code, email, password }) => {
  const user = db.prepare("SELECT * FROM users WHERE code = ?").get(code);
  if (!user) return { ok: false, message: 'Code invalide.' };
  if (user.activated) return { ok: false, message: 'Compte déjà activé.' };

  db.prepare("UPDATE users SET email = ?, password = ?, activated = 1 WHERE code = ?")
    .run(email, password, code);

  // Notify admin
  try {
    await httpsPost(SHEET_URL, {
      action: 'new-account',
      username: code,
      nom_complet: user.nom_complet,
      email: email,
      app_name: APP_NAME,
      created_at: new Date().toISOString()
    });
  } catch(e) {
    console.error('Notification error:', e.message);
  }

  return { ok: true, user: { code: user.code, nom_complet: user.nom_complet, role: user.role } };
});

// ── LOGIN ──
ipcMain.handle('login', (_, { code, password }) => {
  const user = db.prepare("SELECT * FROM users WHERE code = ? AND password = ? AND activated = 1").get(code, password);
  if (user) {
    db.prepare('INSERT INTO audit_log (user, action) VALUES (?,?)').run(user.nom_complet, 'login');
    return { ok: true, user: { id: user.id, code: user.code, nom_complet: user.nom_complet, role: user.role } };
  }
  const exists = db.prepare("SELECT * FROM users WHERE code = ?").get(code);
  if (!exists) return { ok: false, message: 'Code invalide.' };
  if (!exists.activated) return { ok: false, message: 'Compte non activé. Entrez votre code pour configurer votre mot de passe.' };
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

// ── QUEUE ──
ipcMain.handle('queue-save', (_, data) => {
  const r = db.prepare("INSERT INTO queue (data) VALUES (?)").run(JSON.stringify(data));
  return { id: r.lastInsertRowid };
});
ipcMain.handle('queue-pending', () => db.prepare("SELECT * FROM queue WHERE status='pending' ORDER BY id DESC").all());
ipcMain.handle('queue-all',     () => db.prepare("SELECT * FROM queue ORDER BY id DESC").all());
ipcMain.handle('queue-mark-synced', (_, id) => {
  db.prepare("UPDATE queue SET status='synced', synced_at=datetime('now') WHERE id=?").run(id);
  return true;
});
ipcMain.handle('queue-count', () => db.prepare("SELECT COUNT(*) as n FROM queue WHERE status='pending'").get().n);

// ── AUDIT LOG ──
ipcMain.handle('log-action', (_, { user, action, details }) => {
  db.prepare('INSERT INTO audit_log (user, action, details) VALUES (?,?,?)').run(user, action, details || '');
});
ipcMain.handle('get-audit-log', () => db.prepare("SELECT * FROM audit_log ORDER BY id DESC LIMIT 100").all());

// ── HTTP HELPERS ──
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const follow = (u) => {
      const urlObj = new URL(u);
      const options = { hostname: urlObj.hostname, path: urlObj.pathname + urlObj.search, method: 'GET' };
      const req = https.request(options, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return follow(res.headers.location);
        }
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(body)); }
          catch (e) { resolve({ ok: false, raw: body }); }
        });
      });
      req.on('error', reject);
      req.end();
    };
    follow(url);
  });
}

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
