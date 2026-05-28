const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const Database = require('better-sqlite3')
const { google } = require('googleapis')
const fs = require('fs')

const userDataPath = app.getPath('userData')
const dbPath = path.join(userDataPath, 'dsne_accueil.db')
const tokenPath = path.join(userDataPath, 'oauth_token.json')

const SPREADSHEET_ID = '1VOkC7nMA4dkUneQ59711S9GdP3W176GmnqG93WIGI5A'
const SHEET_VISITES = 'VISITES'

let db
function initDB() {
  db = new Database(dbPath)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nom_complet TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS uid_cartes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uid TEXT UNIQUE NOT NULL,
      service TEXT NOT NULL,
      description TEXT,
      actif INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS visites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_visite TEXT UNIQUE NOT NULL,
      horodateur_entree TEXT NOT NULL,
      uid_carte TEXT,
      nom_complet TEXT NOT NULL,
      type_piece TEXT NOT NULL,
      numero_piece TEXT NOT NULL,
      telephone TEXT NOT NULL,
      organisation TEXT NOT NULL,
      service_destinataire TEXT NOT NULL,
      personne_a_visiter TEXT NOT NULL,
      motif_visite TEXT NOT NULL,
      motif_autre_detail TEXT DEFAULT 'N/A',
      visite_autorisee TEXT NOT NULL,
      motif_refus TEXT DEFAULT 'N/A',
      nom_autorisateur TEXT DEFAULT 'N/A',
      agent_accueil TEXT NOT NULL,
      statut TEXT NOT NULL DEFAULT 'Entre',
      horodateur_sortie TEXT DEFAULT '',
      carte_recuperee TEXT DEFAULT '',
      agent_sortie TEXT DEFAULT '',
      synced INTEGER DEFAULT 0
    );
    INSERT OR IGNORE INTO users (username, password, nom_complet)
    VALUES ('admin', 'dsne2026', 'Administrateur');
    INSERT OR IGNORE INTO uid_cartes (uid, service, description) VALUES
      ('DIR-001','DIR','Carte Direction 001'),
      ('DIR-002','DIR','Carte Direction 002'),
      ('ADM-001','ADM','Carte Administration 001'),
      ('ADM-002','ADM','Carte Administration 002'),
      ('COMP-001','COMP','Carte Comptabilite 001'),
      ('RH-001','RH','Carte Ressources Humaines 001'),
      ('PROG-001','PROG','Carte Programmes 001'),
      ('PROG-002','PROG','Carte Programmes 002');
  `)
}

let mainWindow
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100, height: 780, minWidth: 900, minHeight: 650,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: 'DSNE - Accueil (PROC-004)',
    show: false
  })
  mainWindow.loadFile(path.join(__dirname, 'login.html'))
  mainWindow.once('ready-to-show', () => mainWindow.show())
}

app.whenReady().then(() => { initDB(); createWindow() })
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })

// ── AUTH
ipcMain.handle('login', (_, { username, password }) => {
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password)
  if (user) return { ok: true, user: { id: user.id, username: user.username, nom_complet: user.nom_complet } }
  return { ok: false, message: 'Identifiants incorrects.' }
})

ipcMain.handle('logout', () => { mainWindow.loadFile(path.join(__dirname, 'login.html')); return { ok: true } })
ipcMain.handle('navigate', (_, page) => { mainWindow.loadFile(path.join(__dirname, page)) })

// ── UIDs
ipcMain.handle('get-uids', () => db.prepare('SELECT * FROM uid_cartes WHERE actif = 1 ORDER BY service, uid').all())
ipcMain.handle('get-all-uids', () => db.prepare('SELECT * FROM uid_cartes ORDER BY service, uid').all())
ipcMain.handle('add-uid', (_, { uid, service, description }) => {
  try { db.prepare('INSERT INTO uid_cartes (uid, service, description) VALUES (?,?,?)').run(uid, service, description); return { ok: true } }
  catch (e) { return { ok: false, message: 'UID deja existant.' } }
})
ipcMain.handle('toggle-uid', (_, { id, actif }) => { db.prepare('UPDATE uid_cartes SET actif = ? WHERE id = ?').run(actif, id); return { ok: true } })

// ── VISITES
function genIdVisite() {
  const now = new Date()
  const dd = String(now.getDate()).padStart(2,'0')
  const mm = String(now.getMonth()+1).padStart(2,'0')
  const yyyy = now.getFullYear()
  const prefix = `VIS-${dd}${mm}${yyyy}-`
  const count = db.prepare('SELECT COUNT(*) as n FROM visites WHERE id_visite LIKE ?').get(prefix+'%').n
  return prefix + String(count+1).padStart(3,'0')
}

ipcMain.handle('enregistrer-entree', (_, data) => {
  try {
    const idVisite = genIdVisite()
    const horodateur = new Date().toISOString()
    const statut = data.visite_autorisee.startsWith('Oui') ? 'Entre' : 'Refuse'
    db.prepare(`INSERT INTO visites (
      id_visite,horodateur_entree,uid_carte,nom_complet,type_piece,
      numero_piece,telephone,organisation,service_destinataire,
      personne_a_visiter,motif_visite,motif_autre_detail,
      visite_autorisee,motif_refus,nom_autorisateur,agent_accueil,statut
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      idVisite,horodateur,data.uid_carte,data.nom_complet,data.type_piece,
      data.numero_piece,data.telephone,data.organisation,data.service_destinataire,
      data.personne_a_visiter,data.motif_visite,data.motif_autre_detail||'N/A',
      data.visite_autorisee,data.motif_refus||'N/A',data.nom_autorisateur||'N/A',
      data.agent_accueil,statut
    )
    return { ok: true, id_visite: idVisite, statut }
  } catch(e) { return { ok: false, message: e.message } }
})

ipcMain.handle('enregistrer-sortie', (_, { id_visite, carte_recuperee, agent_sortie }) => {
  try {
    db.prepare(`UPDATE visites SET statut='Sorti', horodateur_sortie=?, carte_recuperee=?, agent_sortie=? WHERE id_visite=?`)
      .run(new Date().toISOString(), carte_recuperee, agent_sortie, id_visite)
    return { ok: true }
  } catch(e) { return { ok: false, message: e.message } }
})

ipcMain.handle('get-visites-actives', () =>
  db.prepare("SELECT * FROM visites WHERE statut='Entre' ORDER BY horodateur_entree DESC").all()
)
ipcMain.handle('get-visites-jour', () => {
  const today = new Date().toISOString().slice(0,10)
  return db.prepare("SELECT * FROM visites WHERE horodateur_entree LIKE ? ORDER BY horodateur_entree DESC").all(today+'%')
})
ipcMain.handle('get-stats-jour', () => {
  const today = new Date().toISOString().slice(0,10)
  const q = (statut) => db.prepare(`SELECT COUNT(*) as n FROM visites WHERE horodateur_entree LIKE ? AND statut=?`).get(today+'%', statut).n
  const total = db.prepare(`SELECT COUNT(*) as n FROM visites WHERE horodateur_entree LIKE ?`).get(today+'%').n
  return { total, entres: q('Entre'), refuses: q('Refuse'), sortis: q('Sorti') }
})

// ── SYNC
ipcMain.handle('sync-sheets', async () => {
  try {
    const unsynced = db.prepare('SELECT * FROM visites WHERE synced=0').all()
    if (unsynced.length === 0) return { ok: true, synced: 0 }
    if (!fs.existsSync(tokenPath)) return { ok: false, message: 'Non authentifie. Connecter Google.' }

    const token = JSON.parse(fs.readFileSync(tokenPath))
    const auth = new google.auth.OAuth2()
    auth.setCredentials(token)
    const sheets = google.sheets({ version: 'v4', auth })

    const rows = unsynced.map(v => [
      v.id_visite, v.horodateur_entree, v.uid_carte, v.nom_complet,
      v.type_piece, v.numero_piece, v.telephone, v.organisation,
      v.service_destinataire, v.personne_a_visiter, v.motif_visite,
      v.motif_autre_detail, v.visite_autorisee, v.motif_refus,
      v.nom_autorisateur, v.agent_accueil, v.statut,
      v.horodateur_sortie, v.carte_recuperee, v.agent_sortie
    ])

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_VISITES}!A:T`,
      valueInputOption: 'RAW',
      resource: { values: rows }
    })

    const ids = unsynced.map(v => v.id).join(',')
    db.prepare(`UPDATE visites SET synced=1 WHERE id IN (${ids})`).run()
    return { ok: true, synced: unsynced.length }
  } catch(e) { return { ok: false, message: e.message } }
})

ipcMain.handle('get-sync-status', () => {
  const n = db.prepare('SELECT COUNT(*) as n FROM visites WHERE synced=0').get().n
  return { pending: n }
})
