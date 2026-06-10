const { app, BrowserWindow, ipcMain } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')
const Database = require('better-sqlite3')
const { google } = require('googleapis')
const fs = require('fs')
const nodemailer = require('nodemailer')

const userDataPath = app.getPath('userData')
const dbPath = path.join(userDataPath, 'dsne_accueil.db')
const tokenPath = path.join(userDataPath, 'oauth_token.json')

const SPREADSHEET_ID = '1VOkC7nMA4dkUneQ59711S9GdP3W176GmnqG93WIGI5A'
const SHEET_VISITES = 'VISITES'
const SHEET_DOCUMENTS = 'DOCUMENTS'
const REPORT_EMAIL = 'sec.direction.dsne@gmail.com'

let db
function initDB() {
  db = new Database(dbPath)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      nom_complet TEXT NOT NULL,
      email TEXT,
      role TEXT DEFAULT 'reception',
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

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_document TEXT UNIQUE NOT NULL,
      horodateur TEXT NOT NULL,
      remis_par TEXT NOT NULL,
      id_visite_lie TEXT DEFAULT '',
      type_document TEXT NOT NULL,
      description TEXT NOT NULL,
      service_destinataire TEXT NOT NULL,
      agent_accueil TEXT NOT NULL,
      notes TEXT DEFAULT '',
      synced INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS rapports_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      date_rapport TEXT NOT NULL,
      envoye_at TEXT DEFAULT (datetime('now')),
      succes INTEGER DEFAULT 0
    );

    -- Réceptionnistes préchargées
    INSERT OR IGNORE INTO users (code, nom_complet, email, role) VALUES
      ('174839', 'Daisha Dorsainvil', 'sec.direction.dsne@gmail.com', 'admin'),
      ('145056', 'Geralda Michel', 'reception.dsne@gmail.com', 'reception'),
      ('582005', 'Renande Destiné', 'reception.dsne@gmail.com', 'reception'),
      ('789043', 'Vasna Pierre', 'reception.dsne@gmail.com', 'reception'),
      ('890340', 'Marie Liziane Garconville', 'reception.dsne@gmail.com', 'reception');

    -- UIDs par défaut
    INSERT OR IGNORE INTO uid_cartes (uid, service, description) VALUES
      ('DIR-001','DIR','Carte Direction 001'),
      ('DIR-002','DIR','Carte Direction 002'),
      ('ADM-001','ADM','Carte Administration 001'),
      ('ADM-002','ADM','Carte Administration 002'),
      ('COMP-001','COMP','Carte Comptabilité 001'),
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
      preload: path.join(__dirname, 'src', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: 'DSNE — Enregistrement Visiteurs',
    show: false
  })
  mainWindow.loadFile(path.join(__dirname, 'src', 'login.html'))
  mainWindow.once('ready-to-show', () => mainWindow.show())
}

app.whenReady().then(() => {
  autoUpdater.checkForUpdatesAndNotify();
  initDB()
  // Force insert users
  try {
    db.prepare("INSERT OR REPLACE INTO users (code, nom_complet, email, role) VALUES (?,?,?,?)").run('145056','Geralda Michel','reception.dsne@gmail.com','reception')
    db.prepare("INSERT OR REPLACE INTO users (code, nom_complet, email, role) VALUES (?,?,?,?)").run('582005','Renande Destine','reception.dsne@gmail.com','reception')
    db.prepare("INSERT OR REPLACE INTO users (code, nom_complet, email, role) VALUES (?,?,?,?)").run('789043','Vasna Pierre','reception.dsne@gmail.com','reception')
    db.prepare("INSERT OR REPLACE INTO users (code, nom_complet, email, role) VALUES (?,?,?,?)").run('890340','Marie Liziane Garconville','reception.dsne@gmail.com','reception')
  } catch(e) { console.error('Insert error:', e.message) }
  createWindow()
})
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })

// ── AUTH (code à 6 chiffres)
ipcMain.handle('login', (_, { code }) => {
  const user = db.prepare('SELECT * FROM users WHERE code = ?').get(code)
  if (user) return { ok: true, user: { id: user.id, code: user.code, nom_complet: user.nom_complet, role: user.role } }
  return { ok: false, message: 'Code incorrect. Veuillez réessayer.' }
})
ipcMain.handle('logout', () => { mainWindow.loadFile(path.join(__dirname, 'src', 'login.html')); return { ok: true } })
ipcMain.handle('navigate', (_, page) => { mainWindow.loadFile(path.join(__dirname, 'src', page)) })

// ── UIDs
ipcMain.handle('get-uids', () => db.prepare('SELECT * FROM uid_cartes WHERE actif = 1 ORDER BY service, uid').all())
ipcMain.handle('get-all-uids', () => db.prepare('SELECT * FROM uid_cartes ORDER BY service, uid').all())
ipcMain.handle('add-uid', (_, { uid, service, description }) => {
  try { db.prepare('INSERT INTO uid_cartes (uid, service, description) VALUES (?,?,?)').run(uid, service, description); return { ok: true } }
  catch (e) { return { ok: false, message: 'UID déjà existant.' } }
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
    const statut = data.visite_autorisee.startsWith('Oui') ? 'Entre' : 'Refuse'
    db.prepare(`INSERT INTO visites (
      id_visite,horodateur_entree,uid_carte,nom_complet,type_piece,
      numero_piece,telephone,organisation,service_destinataire,
      personne_a_visiter,motif_visite,motif_autre_detail,
      visite_autorisee,motif_refus,nom_autorisateur,agent_accueil,statut
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      idVisite, new Date().toISOString(), data.uid_carte, data.nom_complet, data.type_piece,
      data.numero_piece, data.telephone, data.organisation, data.service_destinataire,
      data.personne_a_visiter, data.motif_visite, data.motif_autre_detail||'N/A',
      data.visite_autorisee, data.motif_refus||'N/A', data.nom_autorisateur||'N/A',
      data.agent_accueil, statut
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
ipcMain.handle('get-all-visites', () =>
  db.prepare("SELECT * FROM visites ORDER BY horodateur_entree DESC").all()
)
ipcMain.handle('get-stats-jour', () => {
  const today = new Date().toISOString().slice(0,10)
  const q = (s) => db.prepare(`SELECT COUNT(*) as n FROM visites WHERE horodateur_entree LIKE ? AND statut=?`).get(today+'%', s).n
  const total = db.prepare(`SELECT COUNT(*) as n FROM visites WHERE horodateur_entree LIKE ?`).get(today+'%').n
  return { total, entres: q('Entre'), refuses: q('Refuse'), sortis: q('Sorti') }
})

// ── DOCUMENTS
function genIdDocument() {
  const now = new Date()
  const dd = String(now.getDate()).padStart(2,'0')
  const mm = String(now.getMonth()+1).padStart(2,'0')
  const yyyy = now.getFullYear()
  const prefix = `DOC-${dd}${mm}${yyyy}-`
  const count = db.prepare('SELECT COUNT(*) as n FROM documents WHERE id_document LIKE ?').get(prefix+'%').n
  return prefix + String(count+1).padStart(3,'0')
}

ipcMain.handle('enregistrer-document', (_, data) => {
  try {
    const idDoc = genIdDocument()
    db.prepare(`INSERT INTO documents (
      id_document,horodateur,remis_par,id_visite_lie,type_document,
      description,service_destinataire,agent_accueil,notes
    ) VALUES (?,?,?,?,?,?,?,?,?)`).run(
      idDoc, new Date().toISOString(), data.remis_par, data.id_visite_lie||'',
      data.type_document, data.description, data.service_destinataire,
      data.agent_accueil, data.notes||''
    )
    return { ok: true, id_document: idDoc }
  } catch(e) { return { ok: false, message: e.message } }
})

ipcMain.handle('get-documents-jour', () => {
  const today = new Date().toISOString().slice(0,10)
  return db.prepare("SELECT * FROM documents WHERE horodateur LIKE ? ORDER BY horodateur DESC").all(today+'%')
})
ipcMain.handle('get-all-documents', () =>
  db.prepare("SELECT * FROM documents ORDER BY horodateur DESC").all()
)

// ── SYNC
ipcMain.handle('sync-sheets', async () => {
  try {
    if (!fs.existsSync(tokenPath)) return { ok: false, message: 'Non authentifié.' }
    const token = JSON.parse(fs.readFileSync(tokenPath))
    const auth = new google.auth.OAuth2()
    auth.setCredentials(token)
    const sheets = google.sheets({ version: 'v4', auth })

    // Sync visites
    const unsynced_v = db.prepare('SELECT * FROM visites WHERE synced=0').all()
    if (unsynced_v.length) {
      const rows = unsynced_v.map(v => [
        v.id_visite, v.horodateur_entree, v.uid_carte, v.nom_complet,
        v.type_piece, v.numero_piece, v.telephone, v.organisation,
        v.service_destinataire, v.personne_a_visiter, v.motif_visite,
        v.motif_autre_detail, v.visite_autorisee, v.motif_refus,
        v.nom_autorisateur, v.agent_accueil, v.statut,
        v.horodateur_sortie, v.carte_recuperee, v.agent_sortie
      ])
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID, range: `${SHEET_VISITES}!A:T`,
        valueInputOption: 'RAW', resource: { values: rows }
      })
      const ids = unsynced_v.map(v => v.id).join(',')
      db.prepare(`UPDATE visites SET synced=1 WHERE id IN (${ids})`).run()
    }

    // Sync documents
    const unsynced_d = db.prepare('SELECT * FROM documents WHERE synced=0').all()
    if (unsynced_d.length) {
      const rows = unsynced_d.map(d => [
        d.id_document, d.horodateur, d.remis_par, d.id_visite_lie,
        d.type_document, d.description, d.service_destinataire,
        d.agent_accueil, d.notes
      ])
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID, range: `${SHEET_DOCUMENTS}!A:I`,
        valueInputOption: 'RAW', resource: { values: rows }
      })
      const ids = unsynced_d.map(d => d.id).join(',')
      db.prepare(`UPDATE documents SET synced=1 WHERE id IN (${ids})`).run()
    }

    // Générer rapport si nécessaire
    await genererRapportSiNecessaire(auth)

    return { ok: true, synced_visites: unsynced_v.length, synced_documents: unsynced_d.length }
  } catch(e) { return { ok: false, message: e.message } }
})

ipcMain.handle('get-sync-status', () => {
  const nv = db.prepare('SELECT COUNT(*) as n FROM visites WHERE synced=0').get().n
  const nd = db.prepare('SELECT COUNT(*) as n FROM documents WHERE synced=0').get().n
  return { pending: nv + nd }
})

// ── RAPPORTS
async function genererRapportSiNecessaire(auth) {
  try {
    const today = new Date().toISOString().slice(0,10)
    const dayOfWeek = new Date().getDay() // 0=dimanche, 1=lundi

    // Rapport journalier — une fois par jour
    const dejEnvoye = db.prepare("SELECT id FROM rapports_log WHERE type='journalier' AND date_rapport=? AND succes=1").get(today)
    if (!dejEnvoye) {
      await envoyerRapport(auth, 'journalier', today)
    }

    // Rapport hebdomadaire — le lundi
    if (dayOfWeek === 1) {
      const dejEnvoyeHebdo = db.prepare("SELECT id FROM rapports_log WHERE type='hebdomadaire' AND date_rapport=? AND succes=1").get(today)
      if (!dejEnvoyeHebdo) {
        await envoyerRapport(auth, 'hebdomadaire', today)
      }
    }
  } catch(e) { console.error('Erreur rapport:', e.message) }
}

async function envoyerRapport(auth, type, date) {
  try {
    const gmail = google.gmail({ version: 'v1', auth })

    let visites, documents, sujet, corps

    if (type === 'journalier') {
      visites = db.prepare("SELECT * FROM visites WHERE horodateur_entree LIKE ?").all(date+'%')
      documents = db.prepare("SELECT * FROM documents WHERE horodateur LIKE ?").all(date+'%')
      sujet = `Rapport journalier DSNE Accueil — ${date}`
    } else {
      // Semaine dernière (lundi à dimanche)
      const lundi = new Date(); lundi.setDate(lundi.getDate() - 7)
      const lundiStr = lundi.toISOString().slice(0,10)
      visites = db.prepare("SELECT * FROM visites WHERE horodateur_entree >= ?").all(lundiStr+'T00:00:00')
      documents = db.prepare("SELECT * FROM documents WHERE horodateur >= ?").all(lundiStr+'T00:00:00')
      sujet = `Rapport hebdomadaire DSNE Accueil — semaine du ${lundiStr}`
    }

    const entres = visites.filter(v => v.statut !== 'Refuse').length
    const refuses = visites.filter(v => v.statut === 'Refuse').length
    const sortis = visites.filter(v => v.statut === 'Sorti').length

    corps = `
Rapport ${type} — Direction Sanitaire du Nord-Est
Module : Enregistrement des Visiteurs (PROC-004)
Période : ${date}

─── VISITES ───────────────────────────────
Total         : ${visites.length}
Autorisées    : ${entres}
Refusées      : ${refuses}
Sorties       : ${sortis}

─── DOCUMENTS REÇUS ──────────────────────
Total         : ${documents.length}

─── DÉTAIL DES VISITES ───────────────────
${visites.map(v => `• ${v.nom_complet} | ${v.service_destinataire.split(' — ')[0]} | ${v.statut} | ${new Date(v.horodateur_entree).toLocaleTimeString('fr-HT',{hour:'2-digit',minute:'2-digit'})}`).join('\n') || 'Aucune visite.'}

─── DÉTAIL DES DOCUMENTS ─────────────────
${documents.map(d => `• ${d.id_document} | ${d.remis_par} | ${d.type_document} | ${d.service_destinataire.split(' — ')[0]}`).join('\n') || 'Aucun document.'}

─────────────────────────────────────────
Ce rapport a été généré automatiquement par le système DSNE Accueil.
    `.trim()

    const message = [
      `To: ${REPORT_EMAIL}`,
      `Subject: =?UTF-8?B?${Buffer.from(sujet).toString('base64')}?=`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset=utf-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      Buffer.from(corps).toString('base64')
    ].join('\n')

    await gmail.users.messages.send({
      userId: 'me',
      resource: { raw: Buffer.from(message).toString('base64url') }
    })

    db.prepare("INSERT INTO rapports_log (type, date_rapport, succes) VALUES (?,?,1)").run(type, date)
  } catch(e) {
    db.prepare("INSERT INTO rapports_log (type, date_rapport, succes) VALUES (?,?,0)").run(type, date)
    console.error('Erreur envoi rapport:', e.message)
  }
}
