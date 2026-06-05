const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs   = require('fs');
const Database = require('better-sqlite3');

let db;


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
  const dbPath = path.join(app.getPath('userData'), 'dsne_log.db');
  db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      nom_complet TEXT NOT NULL,
      role TEXT DEFAULT 'logistique',
      email TEXT DEFAULT '',
      password TEXT DEFAULT '',
      activated INTEGER DEFAULT 0
    );
  `);
  const seed = db.prepare("INSERT OR IGNORE INTO users (code, nom_complet, role) VALUES (?, ?, ?)");
  seed.run('174839', 'Daisha Dorsainvil', 'admin');
  seed.run('629384', 'Elin Beauvin', 'logistique');
}

let win;
let LOG_ROOT; // Documents/DSNE-Logistique

/* ── FOLDER STRUCTURE ── */
const FOLDERS = [
  '',
  'Requisitions',
  'Courrier/Lettres-Deplacement',
  'Courrier/Lettres-Engagement',
  'Courrier/Lettres-Restitution',
  'Courrier/Lettres-Affectation',
  'Accuses-Reception',
  'Transferts',
  'Inventaire',
  'BonsLivraisonReception',
];

function initFolders() {
  const docs = app.getPath('documents');
  LOG_ROOT = path.join(docs, 'DSNE-Logistique');
  FOLDERS.forEach(f => {
    const p = path.join(LOG_ROOT, f);
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
  });
}

/* ── WINDOW ── */
function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 860, minWidth: 960, minHeight: 640,
    title: 'DSNE — Logistique',
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
autoBackupDB(path.join(app.getPath('userData'), 'dsne_log.db'), 'dsne-log');
  initFolders();
  createWindow();
  autoUpdater.checkForUpdatesAndNotify();
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

/* ── IPC: GET ROOT PATH ── */
ipcMain.handle('get-log-root', () => LOG_ROOT);

/* ── IPC: SAVE FILE ── */
// subfolder: e.g. 'Requisitions', 'Courrier/Lettres-Affectation'
// filename: e.g. 'REQ-020626-0001.xlsx'
// data: Buffer or base64 string
ipcMain.handle('save-file', async (_, { subfolder, filename, data, encoding }) => {
  try {
    const dir  = path.join(LOG_ROOT, subfolder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const fpath = path.join(dir, filename);
    const buf   = encoding === 'base64' ? Buffer.from(data, 'base64') : Buffer.from(data);
    fs.writeFileSync(fpath, buf);
    return { ok: true, path: fpath };
  } catch(e) {
    return { ok: false, error: e.message };
  }
});

/* ── IPC: OPEN FILE IN EXPLORER ── */
ipcMain.handle('show-file', async (_, fpath) => {
  shell.showItemInFolder(fpath);
  return true;
});

/* ── IPC: OPEN FOLDER ── */
ipcMain.handle('open-folder', async (_, subfolder) => {
  const dir = subfolder ? path.join(LOG_ROOT, subfolder) : LOG_ROOT;
  shell.openPath(dir);
  return true;
});

/* ── IPC: PICK FILE (scanned bon upload) ── */
ipcMain.handle('pick-file', async () => {
  const result = await dialog.showOpenDialog(win, {
    title: 'Sélectionner le scan du bon',
    filters: [
      { name: 'Images / PDF', extensions: ['pdf','png','jpg','jpeg'] }
    ],
    properties: ['openFile']
  });
  if (result.canceled || !result.filePaths.length) return null;
  const src  = result.filePaths[0];
  const ext  = path.extname(src);
  return { src, ext, name: path.basename(src) };
});

/* ── IPC: COPY SCAN TO FOLDER ── */
ipcMain.handle('copy-scan', async (_, { src, destSubfolder, destName }) => {
  try {
    const dir  = path.join(LOG_ROOT, destSubfolder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const dest = path.join(dir, destName);
    fs.copyFileSync(src, dest);
    return { ok: true, path: dest };
  } catch(e) {
    return { ok: false, error: e.message };
  }
});

/* ── IPC: READ XLSX (for progressive append) ── */
ipcMain.handle('read-file-b64', async (_, fpath) => {
  try {
    if (!fs.existsSync(fpath)) return null;
    return fs.readFileSync(fpath).toString('base64');
  } catch(e) { return null; }
});

/* ── IPC: BUILD DOCX ── */
let docxLib = null;
function getDocx() {
  if (!docxLib) docxLib = require('docx');
  return docxLib;
}

function makeEnTete(lines, D) {
  const { Paragraph, TextRun, AlignmentType } = getDocx();
  return [
    ...lines.map(l => new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: l, bold: true, size: 24, font: 'Times New Roman' })]
    })),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Fort-Liberté, le ' + D, size: 22, font: 'Times New Roman' })] }),
    new Paragraph({ children: [] }),
  ];
}

function makeSignataires(sig) {
  const { Paragraph, TextRun } = getDocx();
  return [
    new Paragraph({ children: [] }),
    new Paragraph({ children: [] }),
    new Paragraph({ children: [new TextRun({ text: sig.trim(), size: 20, font: 'Times New Roman' })] }),
  ];
}

function makePara(text, bold=false, size=22) {
  const { Paragraph, TextRun, AlignmentType } = getDocx();
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 120 },
    children: [new TextRun({ text, bold, size, font: 'Times New Roman' })]
  });
}

function makeVehSpecs(d) {
  const fields = [
    ['MARQUE', d.marque], ['SÉRIE', d.serie], ['MOTEUR', d.moteur||''],
    ['MODÈLE', d.model||d.modele||''], ['PUISSANCE', d.puissance||''],
    ['COULEUR', d.couleur], ['PLAQUE', d.plaque],
    ['ANNÉE', d.annee||''], ['ÉTAT', d.etat||''],
  ].filter(f => f[1]);
  const { Paragraph, TextRun } = getDocx();
  return fields.map(([k,v]) => new Paragraph({
    spacing: { after: 60 },
    children: [
      new TextRun({ text: k.padEnd(14,' ') + ': ', bold: true, size: 20, font: 'Courier New' }),
      new TextRun({ text: v, size: 20, font: 'Times New Roman' }),
    ]
  }));
}

async function toBase64(doc) {
  const { Packer } = getDocx();
  const buf = await Packer.toBuffer(doc);
  return buf.toString('base64');
}

ipcMain.handle('build-requisition', async (_, { d, sig, entete, dateStr }) => {
  const { Document, Paragraph, TextRun, Table, TableRow, TableCell, BorderStyle,
          AlignmentType, WidthType, ShadingType, VerticalAlign } = getDocx();
  const b = { style: BorderStyle.SINGLE, size: 8, color: '000000' };
  const bords = { top:b, bottom:b, left:b, right:b };
  const cell = (txt, w, bold=false) => new TableCell({
    borders: bords,
    width: { size: w, type: WidthType.DXA },
    margins: { top:80, bottom:80, left:100, right:100 },
    shading: bold ? { fill:'DDDDDD', type: ShadingType.CLEAR } : undefined,
    children: [new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: txt, bold, size: 18, font: 'Times New Roman' })] })]
  });
  const total = (d.prix * (parseFloat(d.duree)||1)).toLocaleString('fr-FR');
  const doc = new Document({ sections: [{ children: [
    ...makeEnTete(entete, dateStr),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'RÉQUISITION', bold:true, size:28, font:'Times New Roman' })] }),
    new Paragraph({ children:[] }),
    makePara(d.justif || 'Le service logistique de la DSNE requiert le service suivant :'),
    new Paragraph({ children:[] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing:{after:120},
      children:[new TextRun({text:'Informations générales de la réquisition',bold:true,size:22,font:'Times New Roman'})] }),
    new Table({ rows: [
      new TableRow({ children: [
        cell('Demandeur',1800,true), cell('Fournisseur',1800,true),
        cell('Description du service',2200,true), cell('Qté/Durée',900,true),
        cell('Prix/déplacement',1200,true), cell('Prix Total',1200,true), cell('Date',900,true)
      ]}),
      new TableRow({ children: [
        cell(d.demandeur,1800), cell(d.fournisseur,1800),
        cell(d.desc,2200), cell(d.duree,900),
        cell(d.prix.toLocaleString('fr-FR')+' HTG',1200),
        cell(total+' HTG',1200), cell(dateStr,900)
      ]})
    ]}),
    new Paragraph({ children:[] }),
    makePara('Modalité de paiement', true),
    makePara('Mode de paiement : ' + d.paiement),
    new Paragraph({ children:[] }),
    ...makeSignataires(sig),
  ]}]});
  return await toBase64(doc);
});

ipcMain.handle('build-deplacement', async (_, { d, sig, entete, dateStr }) => {
  const { Document, Paragraph, TextRun, AlignmentType } = getDocx();
  const usage = d.usage === 'fonction'
    ? 'Véhicule de fonction : usage professionnel et personnel autorisé.'
    : 'Véhicule de service : le véhicule est strictement réservé à un usage professionnel uniquement.';
  const doc = new Document({ sections: [{ children: [
    ...makeEnTete(entete, dateStr),
    makePara('De    : Elin Beauvin', true),
    makePara('         Chef Service Logistique DSNE'),
    new Paragraph({children:[]}),
    makePara('À     : ' + d.destNom, true),
    makePara('         ' + d.destTitre),
    new Paragraph({children:[]}),
    makePara('Objet : Mise à disposition d\'un véhicule de fonction / de service', true),
    new Paragraph({children:[]}),
    makePara('Monsieur / Madame,'),
    new Paragraph({children:[]}),
    makePara('Le service logistique de la DSNE a le plaisir de vous informer, dans le cadre de votre fonction, de la mise à votre disposition du véhicule répondant aux spécifications suivantes :'),
    new Paragraph({children:[]}),
    ...makeVehSpecs(d),
    new Paragraph({children:[]}),
    makePara('Conditions d\'utilisation :', true),
    makePara(usage),
    new Paragraph({children:[]}),
    makePara('Obligations du bénéficiaire :', true),
    makePara('Le bénéficiaire s\'engage à : 1- Maintenir le véhicule dans un état de propreté constant. 2- Veiller au bon état de fonctionnement et effectuer les vérifications d\'usage. 3- Informer immédiatement la DSNE en cas de sinistre, de vol ou panne. 4- Présenter le véhicule aux responsables de la DSNE à toute demande.'),
    new Paragraph({children:[]}),
    makePara('Restitution :', true),
    makePara('Le véhicule devra être restitué immédiatement en cas de rupture ou suspension de contrat, ou à la demande motivée de la DSNE.'),
    ...makeSignataires(sig),
  ]}]});
  return await toBase64(doc);
});

ipcMain.handle('build-engagement', async (_, { d, sig, entete, dateStr }) => {
  const { Document, Paragraph, TextRun } = getDocx();
  const doc = new Document({ sections: [{ children: [
    ...makeEnTete(entete, dateStr),
    makePara('De    : Elin Beauvin', true),
    makePara('         Chef Service Logistique et Technique (DSNE)'),
    new Paragraph({children:[]}),
    makePara('À l\'attention de : Direction et Administration DSNE', true),
    new Paragraph({children:[]}),
    makePara('Objet : ' + d.objet, true),
    new Paragraph({children:[]}),
    makePara('Madame, Monsieur,'),
    new Paragraph({children:[]}),
    makePara('Pour donner suite à nos récents échanges, le service logistique confirme par la présente son engagement formel à solliciter le prestataire ' + d.prestataire + ' afin d\'assurer les prestations suivantes :'),
    new Paragraph({children:[]}),
    makePara(d.details),
    new Paragraph({children:[]}),
    makePara('Le service logistique réaffirme sa volonté de soutenir les objectifs de la DSNE. Nous sollicitons votre signature pour validation de cet engagement.'),
    new Paragraph({children:[]}),
    makePara('Veuillez agréer, Madame, Monsieur, l\'expression de nos salutations distinguées.'),
    ...makeSignataires(sig),
  ]}]});
  return await toBase64(doc);
});

ipcMain.handle('build-restitution', async (_, { d, sig, entete, dateStr }) => {
  const { Document, Paragraph } = getDocx();
  const doc = new Document({ sections: [{ children: [
    ...makeEnTete(entete, dateStr),
    makePara('De    : Elin Beauvin', true),
    makePara('         Chef Service Logistique et Technique DSNE'),
    new Paragraph({children:[]}),
    makePara('À     : ' + d.nom, true),
    makePara('         ' + d.titre),
    new Paragraph({children:[]}),
    makePara('Objet : Accusé de réception et remerciement suite à la restitution du matériel roulant', true),
    new Paragraph({children:[]}),
    makePara(d.nom.split(' ')[0] === 'Mme' ? 'Mme ' + d.nom + ',' : 'M. / Mme ' + d.nom + ','),
    new Paragraph({children:[]}),
    makePara('Par la présente, le service logistique de la DSNE accuse réception du véhicule que vous aviez à votre disposition dans le cadre de votre fonction, dont les spécifications sont les suivantes :'),
    new Paragraph({children:[]}),
    ...makeVehSpecs(d),
    new Paragraph({children:[]}),
    makePara('Nous tenons à vous remercier pour le soin apporté au véhicule durant sa période d\'utilisation, ainsi que la diligence avec laquelle vous avez procédé à sa restitution le ' + (d.dateRest ? new Date(d.dateRest+'T00:00:00').toLocaleDateString('fr-FR') : '—') + '. Cette restitution met fin à votre responsabilité civile et pénale quant à l\'usage de ce véhicule.'),
    new Paragraph({children:[]}),
    makePara('Accessoires rendus : ' + (d.accessoires||'—')),
    new Paragraph({children:[]}),
    makePara('Veuillez agréer, l\'expression de nos salutations distinguées.'),
    ...makeSignataires(sig),
  ]}]});
  return await toBase64(doc);
});

ipcMain.handle('build-affectation', async (_, { d, sig, entete, dateStr }) => {
  const { Document, Paragraph } = getDocx();
  const doc = new Document({ sections: [{ children: [
    ...makeEnTete(entete, dateStr),
    makePara('De    : Elin Beauvin', true),
    makePara('         Chef Service Logistique et Technique DSNE'),
    new Paragraph({children:[]}),
    makePara('À     : ' + (d.resp||d.destInst), true),
    makePara('         ' + (d.respTitre||'')),
    makePara('         ' + d.destInst),
    new Paragraph({children:[]}),
    makePara('Objet : Lettre d\'affectation de véhicule', true),
    new Paragraph({children:[]}),
    makePara('Madame, Monsieur,'),
    new Paragraph({children:[]}),
    makePara('Dans le cadre de ' + (d.motif||'ses activités opérationnelles') + ', la Direction Sanitaire du Nord-Est procède par la présente à l\'affectation du véhicule suivant à ' + d.destInst + ' :'),
    new Paragraph({children:[]}),
    ...makeVehSpecs(d),
    new Paragraph({children:[]}),
    makePara('Ce véhicule est affecté à l\'institution susmentionnée pour usage dans le cadre de ses activités sanitaires. L\'institution bénéficiaire assume l\'entière responsabilité de la conservation et du bon usage de ce bien à compter de la date de la présente.'),
    new Paragraph({children:[]}),
    makePara('Veuillez agréer, Madame, Monsieur, l\'expression de nos salutations distinguées.'),
    ...makeSignataires(sig),
  ]}]});
  return await toBase64(doc);
});

ipcMain.handle('build-accuse', async (_, { acc, entete, dateStr }) => {
  const { Document, Paragraph, TextRun, Table, TableRow, TableCell,
          BorderStyle, AlignmentType, WidthType, ShadingType } = getDocx();
  const b = { style: BorderStyle.SINGLE, size: 6, color:'000000' };
  const bords = {top:b,bottom:b,left:b,right:b};
  const hcell = (txt,w) => new TableCell({ borders:bords, width:{size:w,type:WidthType.DXA},
    shading:{fill:'DDDDDD',type:ShadingType.CLEAR},
    margins:{top:80,bottom:80,left:100,right:100},
    children:[new Paragraph({alignment:AlignmentType.CENTER,
      children:[new TextRun({text:txt,bold:true,size:18,font:'Times New Roman'})]})]});
  const dcell = (txt,w) => new TableCell({ borders:bords, width:{size:w,type:WidthType.DXA},
    margins:{top:80,bottom:80,left:100,right:100},
    children:[new Paragraph({children:[new TextRun({text:txt,size:18,font:'Times New Roman'})]})]});

  const docRows = (acc.docs||[]).map((row,i) =>
    new TableRow({ children:[
      dcell(String(i+1),500), dcell(dateStr,1200),
      dcell(String(row.qte||''),500), dcell(row.doc||'',3200), dcell(row.remarques||'',1600)
    ]})
  );
  while (docRows.length < 8) docRows.push(new TableRow({ children:[
    dcell('',500), dcell('',1200), dcell('',500), dcell('',3200), dcell('',1600)
  ]}));

  const doc = new Document({ sections: [{ children: [
    ...makeEnTete(entete, dateStr),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing:{after:160},
      children:[new TextRun({text:'ACCUSÉ DE RÉCEPTION DES DOCUMENTS',bold:true,size:26,font:'Times New Roman'})] }),
    new Paragraph({ spacing:{after:120},
      children:[new TextRun({text:'Je soussigné(e) ' + (acc.nom||'……………………') + ', agissant en qualité de ' + (acc.qualite||'……………………') + ' au sein de ' + (acc.institution||'……………………') + ', accuse réception des documents suivants :',size:20,font:'Times New Roman'})] }),
    new Paragraph({ children:[] }),
    new Table({ rows:[
      new TableRow({ children:[
        hcell('No',500), hcell('Date',1200), hcell('Qté',500), hcell('Document',3200), hcell('Remarques',1600)
      ]}),
      ...docRows
    ]}),
    new Paragraph({ children:[] }),
    new Paragraph({ spacing:{after:120},
      children:[new TextRun({text:'Ces documents ont été remis par ' + (acc.nom||'……………………') + ' — Mode de remise : ' + (acc.mode||'—'),size:20,font:'Times New Roman'})] }),
    new Paragraph({ children:[] }),
    new Paragraph({ children:[
      new TextRun({text:'Signature du déposant',size:20,font:'Times New Roman'}),
      new TextRun({text:'                                                        ',size:20}),
      new TextRun({text:'Signature du recevant',size:20,font:'Times New Roman'}),
    ]}),
    new Paragraph({ spacing:{before:200},
      children:[new TextRun({text:'Réf. : ' + acc.uid, size:18, font:'Times New Roman', color:'888888'})] }),
  ]}]});
  return await toBase64(doc);
});

ipcMain.handle('build-requisition-mspp', async (_, { d, entete, dateStr }) => {
  const { Document, Paragraph, TextRun, Table, TableRow, TableCell,
          BorderStyle, AlignmentType, WidthType, ShadingType, VerticalAlign } = getDocx();
  const b  = { style: BorderStyle.SINGLE, size: 8, color: '000000' };
  const bx = { top: b, bottom: b, left: b, right: b };
  const hcell = (txt, w) => new TableCell({
    borders: bx, width: { size: w, type: WidthType.DXA },
    shading: { fill: 'DDDDDD', type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: txt, bold: true, size: 20, font: 'Times New Roman' })] })]
  });
  const dcell = (txt, w, center=false) => new TableCell({
    borders: bx, width: { size: w, type: WidthType.DXA },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({
      alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new TextRun({ text: String(txt||''), size: 20, font: 'Times New Roman' })] })]
  });
  // Empty rows to pad to at least 15 lines
  const itemRows = [...(d.items || [])];
  while (itemRows.length < 15) itemRows.push({ qte: '', designation: '', observation: '' });

  const doc = new Document({ sections: [{ properties: {}, children: [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 },
      children: [new TextRun({ text: 'REPUBLIQUE D\'HAÏTI', bold: true, size: 24, font: 'Times New Roman' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 },
      children: [new TextRun({ text: 'MINISTERE DE LA SANTE PUBLIQUE ET DE LA POPULATION', bold: true, size: 22, font: 'Times New Roman' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
      children: [new TextRun({ text: 'MSPP/DSNE', bold: true, size: 22, font: 'Times New Roman' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 },
      children: [new TextRun({ text: 'REQUISITION', bold: true, underline: {}, size: 28, font: 'Times New Roman' })] }),
    // Ref + Date
    new Paragraph({ spacing: { after: 80 },
      children: [new TextRun({ text: 'No de référence : ' + (d.uid||''), bold: true, size: 22, font: 'Times New Roman' })] }),
    new Paragraph({ spacing: { after: 240 },
      children: [new TextRun({ text: 'Date : ' + dateStr, bold: true, size: 22, font: 'Times New Roman' })] }),
    // Section 1
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 },
      children: [new TextRun({ text: '1- Information sur le Requérant', bold: true, underline: {}, size: 22, font: 'Times New Roman' })] }),
    new Paragraph({ spacing: { after: 120 },
      children: [new TextRun({ text: 'Nom / Prénom : ', bold: true, size: 22, font: 'Times New Roman' }),
                 new TextRun({ text: d.nom, size: 22, font: 'Times New Roman' })] }),
    new Paragraph({ spacing: { after: 120 },
      children: [new TextRun({ text: 'Programme / Service : ', bold: true, size: 22, font: 'Times New Roman' }),
                 new TextRun({ text: d.service, size: 22, font: 'Times New Roman' })] }),
    new Paragraph({ spacing: { after: 120 },
      children: [new TextRun({ text: 'Poste Occupé : ', bold: true, size: 22, font: 'Times New Roman' }),
                 new TextRun({ text: d.poste, size: 22, font: 'Times New Roman' })] }),
    new Paragraph({ spacing: { after: 80 },
      children: [new TextRun({ text: 'Signature : _______________________________', size: 22, font: 'Times New Roman' })] }),
    new Paragraph({ children: [] }),
    // Section 2
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 },
      children: [new TextRun({ text: '2- Liste des produits/ Matériels/ Fournitures de bureau demandées par le service', bold: true, underline: {}, size: 22, font: 'Times New Roman' })] }),
    new Table({ width: { size: 9000, type: WidthType.DXA }, rows: [
      new TableRow({ tableHeader: true, children: [
        hcell('Quantité', 1200),
        hcell('Désignation des produits/ Matériels/ Fournitures de bureau', 5800),
        hcell('Observation', 2000),
      ]}),
      ...itemRows.map(item => new TableRow({ children: [
        dcell(item.qte||'', 1200, true),
        dcell(item.designation||'', 5800),
        dcell(item.observation||'', 2000),
      ]})),
    ]}),
    new Paragraph({ children: [] }),
    new Paragraph({ spacing: { after: 80 },
      children: [new TextRun({ text: 'Signature du responsable : _______________________________', size: 20, font: 'Times New Roman' })] }),
  ]}]});
  return await toBase64(doc);
});



/* ── AUTH IPC ── */
ipcMain.handle('check-code', (_, { code }) => {
  const user = db.prepare("SELECT * FROM users WHERE code = ?").get(code);
  if (!user) return { ok: false, message: 'Code invalide.' };
  return { ok: true, activated: user.activated === 1, nom_complet: user.nom_complet };
});

ipcMain.handle('activate', async (_, { code, email, password }) => {
  const user = db.prepare("SELECT * FROM users WHERE code = ?").get(code);
  if (!user) return { ok: false, message: 'Code invalide.' };
  if (user.activated) return { ok: false, message: 'Compte déjà activé.' };
  db.prepare("UPDATE users SET email = ?, password = ?, activated = 1 WHERE code = ?").run(email, password, code);
  return { ok: true, user: { code: user.code, nom_complet: user.nom_complet, role: user.role } };
});

ipcMain.handle('login', (_, { code, password }) => {
  const user = db.prepare("SELECT * FROM users WHERE code = ? AND password = ? AND activated = 1").get(code, password);
  if (user) return { ok: true, user: { code: user.code, nom_complet: user.nom_complet, role: user.role } };
  const exists = db.prepare("SELECT * FROM users WHERE code = ?").get(code);
  if (!exists) return { ok: false, message: 'Code invalide.' };
  if (!exists.activated) return { ok: false, message: 'Compte non activé.' };
  return { ok: false, message: 'Mot de passe incorrect.' };
});

ipcMain.handle('logout', () => {
  win.loadFile(path.join(__dirname, 'src', 'login.html'));
  return { ok: true };
});
