const STORAGE_KEY = 'dsne_logistique';

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return JSON.parse(saved);
  return {
    vehicules: [
      {id:1, model:'LANDCRUISER PICKUP',      plaque:'SE-001225', annee:'', statut:'Disponible',    obs:'Fonctionnelle'},
      {id:2, model:'LAND CRUISER PICKUP',      plaque:'IT-',       annee:'', statut:'Hors service',  obs:"En cas d'urgences seulement - ADM"},
      {id:3, model:'LANDCRUISER SIMPLE',       plaque:'IT-04379',  annee:'', statut:'Hors service',  obs:"En cas d'urgences seulement - DD"},
      {id:4, model:'LAND CRUISER',             plaque:'SE-01174',  annee:'', statut:'Disponible',    obs:'Fonctionnelle - PEV'},
      {id:5, model:'CHEVROLET PICKUP',         plaque:'IT-',       annee:'', statut:'En entretien',  obs:'En panne (garage)'},
      {id:6, model:'BUS NISSAN',               plaque:'SE-03701',  annee:'', statut:'Hors service',  obs:"Pas en état d'utiliser"},
      {id:7, model:'TOYOTA LANDCRUISER',       plaque:'OI-00405',  annee:'', statut:'Hors service',  obs:"Pas en état d'utiliser"},
      {id:8, model:'NISSAN FRONTIER PICKUP',   plaque:'SE-03049',  annee:'', statut:'Hors service',  obs:"Pas en état d'utiliser"},
      {id:9, model:'PICKUP WINGLE',            plaque:'SE-03098',  annee:'', statut:'Hors service',  obs:'Mauvais état'},
      {id:10,model:'TOYOTA LANDCRUISER',       plaque:'SE-02056',  annee:'', statut:'Hors service',  obs:'Mauvais état'},
      {id:11,model:'GROS CAMION INTERNATIONAL',plaque:'SE-04151',  annee:'', statut:'Hors service',  obs:"Pas en état d'utiliser"},
    ],
    chauffeurs: [
      {id:1,  nom:'Venix ANTOINE',       tel:'(vide)',               statut:'Chauffeur', obs:''},
      {id:2,  nom:'Emmanuel JOSEPH',     tel:'4235-4342',            statut:'Chauffeur', obs:''},
      {id:3,  nom:'Mike SANTILIUS',      tel:'4257-5356',            statut:'Chauffeur', obs:''},
      {id:4,  nom:'Gandhy BELTON',       tel:'3297-7605',            statut:'Chauffeur', obs:''},
      {id:5,  nom:'Claudin RUBE',        tel:'3226-4760',            statut:'Chauffeur', obs:''},
      {id:6,  nom:'Saint Fleur REGISTE', tel:'3393-9464',            statut:'Chauffeur', obs:''},
      {id:7,  nom:'Rodelin ALMONORD',    tel:'3703-5880',            statut:'Chauffeur', obs:''},
      {id:8,  nom:'Jacques Eddy JOSEPH', tel:'4006-5628',            statut:'Chauffeur', obs:''},
      {id:9,  nom:'Ducson HONORE',       tel:'3354-5413',            statut:'Chauffeur', obs:''},
      {id:10, nom:'Ednel ALEXIQUE',      tel:'3231-9835 / 4375-2328',statut:'Chauffeur', obs:''},
      {id:11, nom:'Jean Carly FRANCOIS', tel:'5597-0322',            statut:'Chauffeur', obs:''},
      {id:12, nom:'Harry JOSEPH',        tel:'3278-1568',            statut:'Chauffeur', obs:''},
    ],
    missions: [
      {id:1, date:'', actid:'', dest:'', plaque:'IT-', modele:'CHEVROLET PICKUP', chauffeur:'', lieux:'', km_dep:'', km_ret:'', km_parc:'', litres:'', htg:'', statut:'En cours', obs:'CHEVROLET PICKUP - En panne'}
    ],
    entretiens: [
      {id:1, date:'', plaque:'IT-', type:'Autre', garage:'Garage', cout:'', duree:'', obs:'CHEVROLET PICKUP - En panne'}
    ],
    nextId: { v:12, c:13, m:2, e:2 }
  };
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DB));
}

let DB = loadData();

/* ── HELPERS ── */
const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const fmtDate = s => { if(!s) return '—'; try { return new Date(s+' ').toLocaleDateString('fr-FR'); } catch(e) { return s; } };
const fmtNum  = n => { const v = parseFloat(n); return isNaN(v) ? '—' : v.toLocaleString('fr-FR'); };

function statusBadge(s) {
  const map = {
    'Disponible':   'badge-green',
    'En cours':     'badge-blue',
    'En mission':   'badge-blue',
    'Terminee':     'badge-gray',
    'Annulee':      'badge-red',
    'En entretien': 'badge-amber',
    'Hors service': 'badge-red',
    'Chauffeur':    'badge-green',
    'Inactif':      'badge-gray',
  };
  return '<span class="badge ' + (map[s]||'badge-gray') + '">' + esc(s) + '</span>';
}

function fleetClass(s) {
  const map = {'Disponible':'disponible','En mission':'mission','En entretien':'entretien','Hors service':'hors'};
  return map[s] || '';
}

/* ── NAV ── */
function nav(id, el) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('p-' + id).classList.add('active');
  if (el) el.classList.add('active');
  const renders = {
    tableau: renderTableau, flotte: renderFlotte,
    journal: renderJournal, entretien: renderEntretien,
    chauffeurs: renderChauffeurs,
    'inv-general': renderInvGen,
    'inv-activites': renderInvAct
  };
  if (renders[id]) renders[id]();
}

/* ── TABLEAU DE BORD ── */
function renderTableau() {
  document.getElementById('tableau-date').textContent =
    new Date().toLocaleDateString('fr-FR', {weekday:'long',day:'numeric',month:'long',year:'numeric'});

  const dispo   = DB.vehicules.filter(v => v.statut === 'Disponible').length;
  const mission = DB.vehicules.filter(v => v.statut === 'En mission').length;
  const entr    = DB.vehicules.filter(v => v.statut === 'En entretien').length;
  const hors    = DB.vehicules.filter(v => v.statut === 'Hors service').length;
  const totalM  = DB.missions.length;
  const enCours = DB.missions.filter(m => m.statut === 'En cours').length;
  const totalHtg = DB.missions.reduce((s,m) => s + (parseFloat(m.htg)||0), 0);
  const totalCout = DB.entretiens.reduce((s,e) => s + (parseFloat(e.cout)||0), 0);

  document.getElementById('tableau-kpis').innerHTML =
    kpiCard('Véhicules disponibles', dispo, 'sur ' + DB.vehicules.length + ' au total', 'green') +
    kpiCard('En mission', mission, '', 'blue') +
    kpiCard('En entretien', entr, '', 'amber') +
    kpiCard('Hors service', hors, '', 'red') +
    kpiCard('Total missions', totalM, enCours + ' en cours', 'gold') +
    kpiCard('Carburant total', fmtNum(totalHtg), 'HTG', '') +
    kpiCard('Coût entretiens', fmtNum(totalCout), 'HTG', 'amber');

  // Fleet status
  const fleetHtml = DB.vehicules.map(v =>
    '<div class="fleet-card ' + fleetClass(v.statut) + '">' +
    '<div class="fleet-plate">' + esc(v.plaque) + '</div>' +
    '<div class="fleet-model">' + esc(v.model) + '</div>' +
    '<div class="fleet-status">' + esc(v.statut) + '</div>' +
    (v.obs ? '<div class="fleet-obs">' + esc(v.obs) + '</div>' : '') +
    '</div>'
  ).join('');
  document.getElementById('tableau-fleet').innerHTML = '<div class="fleet-grid">' + fleetHtml + '</div>';

  // Recent missions
  const recentM = DB.missions.slice(-5).reverse();
  const mHtml = recentM.length
    ? '<div class="card"><table class="data-table"><thead><tr><th>Date</th><th>Destination</th><th>Statut</th></tr></thead><tbody>' +
      recentM.map(m => '<tr><td>' + esc(fmtDate(m.date)) + '</td><td>' + esc(m.dest||'—') + '</td><td>' + statusBadge(m.statut) + '</td></tr>').join('') +
      '</tbody></table></div>'
    : '<div style="color:var(--text3);font-style:italic;font-size:12px">Aucune mission enregistrée.</div>';
  document.getElementById('tableau-missions').innerHTML = mHtml;

  // Recent entretiens
  const recentE = DB.entretiens.slice(-4).reverse();
  const eHtml = recentE.length
    ? '<div class="card"><table class="data-table"><thead><tr><th>Véhicule</th><th>Type</th><th>Coût HTG</th></tr></thead><tbody>' +
      recentE.map(e => '<tr><td>' + esc(e.plaque) + '</td><td>' + esc(e.type) + '</td><td>' + esc(fmtNum(e.cout)) + '</td></tr>').join('') +
      '</tbody></table></div>'
    : '<div style="color:var(--text3);font-style:italic;font-size:12px">Aucun entretien enregistré.</div>';
  document.getElementById('tableau-entretien').innerHTML = eHtml;

  // Carburant summary
  const totalL = DB.missions.reduce((s,m) => s + (parseFloat(m.litres)||0), 0);
  document.getElementById('tableau-carbu').innerHTML =
    '<div class="card"><div class="card-body">' +
    '<div style="margin-bottom:12px"><div class="kpi-label">Total litres</div><div class="kpi-value" style="font-size:28px">' + fmtNum(totalL) + '</div></div>' +
    '<div><div class="kpi-label">Total HTG</div><div class="kpi-value" style="font-size:28px">' + fmtNum(totalHtg) + '</div></div>' +
    '</div></div>';
}

function kpiCard(label, value, sub, color) {
  return '<div class="kpi-card ' + color + '">' +
    '<div class="kpi-label">' + esc(label) + '</div>' +
    '<div class="kpi-value">' + esc(String(value)) + '</div>' +
    (sub ? '<div class="kpi-sub">' + esc(sub) + '</div>' : '') +
    '</div>';
}

/* ── FLOTTE ── */
function renderFlotte() {
  const grid = DB.vehicules.map(v =>
    '<div class="fleet-card ' + fleetClass(v.statut) + '" onclick="editVehicule(' + v.id + ')">' +
    '<div class="fleet-plate">' + esc(v.plaque) + '</div>' +
    '<div class="fleet-model">' + esc(v.model) + '</div>' +
    '<div class="fleet-status">' + esc(v.statut) + '</div>' +
    (v.obs ? '<div class="fleet-obs">' + esc(v.obs) + '</div>' : '') +
    '</div>'
  ).join('');
  document.getElementById('fleet-grid').innerHTML = grid;

  document.getElementById('fleet-tbody').innerHTML = DB.vehicules.map(v =>
    '<tr>' +
    '<td style="font-family:\'DM Mono\',monospace;font-size:11px;color:var(--text3)">' + v.id + '</td>' +
    '<td style="color:var(--text)">' + esc(v.model) + '</td>' +
    '<td style="font-family:\'DM Mono\',monospace">' + esc(v.plaque) + '</td>' +
    '<td>' + esc(v.annee||'—') + '</td>' +
    '<td>' + statusBadge(v.statut) + '</td>' +
    '<td style="font-size:11px;color:var(--text3)">' + esc(v.obs) + '</td>' +
    '<td><button class="btn btn-ghost" style="padding:4px 8px;font-size:11px" onclick="editVehicule(' + v.id + ')">Modifier</button></td>' +
    '</tr>'
  ).join('') || '<tr><td colspan="7" class="empty">Aucun véhicule.</td></tr>';
}

function editVehicule(id) {
  const v = DB.vehicules.find(x => x.id === id);
  if (!v) return;
  document.getElementById('vehicule-modal-title').textContent = 'Modifier le véhicule';
  document.getElementById('v-edit-id').value = id;
  document.getElementById('v-model').value  = v.model;
  document.getElementById('v-plaque').value = v.plaque;
  document.getElementById('v-annee').value  = v.annee;
  document.getElementById('v-statut').value = v.statut;
  document.getElementById('v-obs').value    = v.obs;
  openModal('modal-vehicule');
}

function saveVehicule() {
  const editId = parseInt(document.getElementById('v-edit-id').value);
  const obj = {
    model:  document.getElementById('v-model').value.trim(),
    plaque: document.getElementById('v-plaque').value.trim(),
    annee:  document.getElementById('v-annee').value.trim(),
    statut: document.getElementById('v-statut').value,
    obs:    document.getElementById('v-obs').value.trim(),
  };
  if (!obj.model || !obj.plaque) { alert('Modèle et plaque requis.'); return; }
  if (editId) {
    const v = DB.vehicules.find(x => x.id === editId);
    if (v) Object.assign(v, obj);
  } else {
    obj.id = DB.nextId.v++;
    DB.vehicules.push(obj);
  }
  saveData(); closeModal('modal-vehicule'); renderFlotte();
  document.getElementById('v-edit-id').value = '';
  document.getElementById('vehicule-modal-title').textContent = 'Nouveau véhicule';
}

/* ── JOURNAL ── */
let journalFilter = '';
function filterJournal(val) { journalFilter = val; renderJournal(); }

function renderJournal() {
  const filtered = journalFilter
    ? DB.missions.filter(m => m.statut === journalFilter)
    : DB.missions;

  const enCours  = DB.missions.filter(m => m.statut === 'En cours').length;
  const terminees= DB.missions.filter(m => m.statut === 'Terminee').length;
  const annulees = DB.missions.filter(m => m.statut === 'Annulee').length;
  const totalKm  = DB.missions.reduce((s,m) => s + (parseFloat(m.km_parc)||0), 0);

  document.getElementById('journal-kpis').innerHTML =
    kpiCard('En cours', enCours, '', 'blue') +
    kpiCard('Terminées', terminees, '', 'green') +
    kpiCard('Annulées', annulees, '', 'red') +
    kpiCard('KM parcourus', fmtNum(totalKm), 'total', 'gold');

  document.getElementById('journal-tbody').innerHTML = filtered.slice().reverse().map(m => {
    const km = m.km_dep && m.km_ret ? (parseFloat(m.km_ret) - parseFloat(m.km_dep)) : (m.km_parc||'—');
    return '<tr>' +
      '<td>' + esc(fmtDate(m.date)) + '</td>' +
      '<td style="font-family:\'DM Mono\',monospace;font-size:11px">' + esc(m.actid||'—') + '</td>' +
      '<td style="color:var(--text)">' + esc(m.dest||'—') + '</td>' +
      '<td style="font-family:\'DM Mono\',monospace">' + esc(m.plaque) + '</td>' +
      '<td>' + esc(m.chauffeur||'—') + '</td>' +
      '<td style="font-family:\'DM Mono\',monospace">' + esc(String(km)) + '</td>' +
      '<td>' + esc(m.litres||'—') + ' L</td>' +
      '<td>' + esc(fmtNum(m.htg)) + '</td>' +
      '<td>' + statusBadge(m.statut) + '</td>' +
      '<td><button class="btn btn-ghost" style="padding:4px 8px;font-size:11px" onclick="editMission(' + m.id + ')">Modifier</button></td>' +
      '</tr>';
  }).join('') || '<tr><td colspan="10" class="empty">Aucune mission enregistrée.</td></tr>';

  // Populate dropdowns
  populateMissionDropdowns();
}

function populateMissionDropdowns() {
  const plaques = DB.vehicules.filter(v => v.plaque).map(v =>
    '<option value="' + esc(v.plaque) + '">' + esc(v.plaque) + ' — ' + esc(v.model) + '</option>'
  ).join('');
  const chauffeurs = DB.chauffeurs.filter(c => c.statut !== 'Inactif').map(c =>
    '<option value="' + esc(c.nom) + '">' + esc(c.nom) + '</option>'
  ).join('');
  ['m-plaque','e-plaque'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '<option value="">-- Sélectionner --</option>' + plaques;
  });
  const mc = document.getElementById('m-chauffeur');
  if (mc) mc.innerHTML = '<option value="">-- Sélectionner --</option>' + chauffeurs;
}

function editMission(id) {
  const m = DB.missions.find(x => x.id === id);
  if (!m) return;
  populateMissionDropdowns();
  document.getElementById('m-edit-id').value     = id;
  document.getElementById('m-date').value        = m.date;
  document.getElementById('m-actid').value       = m.actid;
  document.getElementById('m-dest').value        = m.dest;
  document.getElementById('m-plaque').value      = m.plaque;
  document.getElementById('m-chauffeur').value   = m.chauffeur;
  document.getElementById('m-lieux').value       = m.lieux;
  document.getElementById('m-km-dep').value      = m.km_dep;
  document.getElementById('m-km-ret').value      = m.km_ret;
  document.getElementById('m-litres').value      = m.litres;
  document.getElementById('m-htg').value         = m.htg;
  document.getElementById('m-statut').value      = m.statut;
  document.getElementById('m-obs').value         = m.obs;
  openModal('modal-mission');
}

function saveMission() {
  const editId = parseInt(document.getElementById('m-edit-id').value);
  const kmDep = parseFloat(document.getElementById('m-km-dep').value)||0;
  const kmRet = parseFloat(document.getElementById('m-km-ret').value)||0;
  const plaque = document.getElementById('m-plaque').value;
  const v = DB.vehicules.find(x => x.plaque === plaque);
  const obj = {
    date:      document.getElementById('m-date').value,
    actid:     document.getElementById('m-actid').value.trim(),
    dest:      document.getElementById('m-dest').value.trim(),
    plaque:    plaque,
    modele:    v ? v.model : '',
    chauffeur: document.getElementById('m-chauffeur').value,
    lieux:     document.getElementById('m-lieux').value.trim(),
    km_dep:    kmDep || '',
    km_ret:    kmRet || '',
    km_parc:   kmDep && kmRet ? kmRet - kmDep : '',
    litres:    document.getElementById('m-litres').value,
    htg:       document.getElementById('m-htg').value,
    statut:    document.getElementById('m-statut').value,
    obs:       document.getElementById('m-obs').value.trim(),
  };
  if (editId) {
    const m = DB.missions.find(x => x.id === editId);
    if (m) Object.assign(m, obj);
  } else {
    obj.id = DB.nextId.m++;
    DB.missions.push(obj);
  }
  saveData(); closeModal('modal-mission'); renderJournal();
  document.getElementById('m-edit-id').value = '';
}

/* ── ENTRETIEN ── */
function renderEntretien() {
  const totalCout = DB.entretiens.reduce((s,e) => s + (parseFloat(e.cout)||0), 0);
  document.getElementById('entretien-kpis').innerHTML =
    kpiCard('Total interventions', DB.entretiens.length, '', 'gold') +
    kpiCard('Coût total HTG', fmtNum(totalCout), '', 'amber');

  document.getElementById('entretien-tbody').innerHTML = DB.entretiens.slice().reverse().map(e =>
    '<tr>' +
    '<td>' + esc(fmtDate(e.date)) + '</td>' +
    '<td style="font-family:\'DM Mono\',monospace">' + esc(e.plaque) + '</td>' +
    '<td>' + esc(e.type) + '</td>' +
    '<td>' + esc(e.garage||'—') + '</td>' +
    '<td style="font-family:\'DM Mono\',monospace">' + esc(fmtNum(e.cout)) + '</td>' +
    '<td>' + esc(e.duree||'—') + '</td>' +
    '<td style="font-size:11px;color:var(--text3)">' + esc(e.obs) + '</td>' +
    '<td><button class="btn btn-ghost" style="padding:4px 8px;font-size:11px" onclick="editEntretien(' + e.id + ')">Modifier</button></td>' +
    '</tr>'
  ).join('') || '<tr><td colspan="8" class="empty">Aucune intervention enregistrée.</td></tr>';

  populateMissionDropdowns();
}

function editEntretien(id) {
  const e = DB.entretiens.find(x => x.id === id);
  if (!e) return;
  populateMissionDropdowns();
  document.getElementById('e-edit-id').value  = id;
  document.getElementById('e-date').value     = e.date;
  document.getElementById('e-plaque').value   = e.plaque;
  document.getElementById('e-type').value     = e.type;
  document.getElementById('e-garage').value   = e.garage;
  document.getElementById('e-cout').value     = e.cout;
  document.getElementById('e-duree').value    = e.duree;
  document.getElementById('e-obs').value      = e.obs;
  openModal('modal-entretien');
}

function saveEntretien() {
  const editId = parseInt(document.getElementById('e-edit-id').value);
  const obj = {
    date:   document.getElementById('e-date').value,
    plaque: document.getElementById('e-plaque').value,
    type:   document.getElementById('e-type').value,
    garage: document.getElementById('e-garage').value.trim(),
    cout:   document.getElementById('e-cout').value,
    duree:  document.getElementById('e-duree').value,
    obs:    document.getElementById('e-obs').value.trim(),
  };
  if (editId) {
    const e = DB.entretiens.find(x => x.id === editId);
    if (e) Object.assign(e, obj);
  } else {
    obj.id = DB.nextId.e++;
    DB.entretiens.push(obj);
  }
  saveData(); closeModal('modal-entretien'); renderEntretien();
  document.getElementById('e-edit-id').value = '';
}

/* ── CHAUFFEURS ── */
function renderChauffeurs() {
  document.getElementById('chauffeurs-tbody').innerHTML = DB.chauffeurs.map(c =>
    '<tr>' +
    '<td style="font-family:\'DM Mono\',monospace;font-size:11px;color:var(--text3)">' + c.id + '</td>' +
    '<td style="color:var(--text)">' + esc(c.nom) + '</td>' +
    '<td style="font-family:\'DM Mono\',monospace">' + esc(c.tel) + '</td>' +
    '<td>' + statusBadge(c.statut) + '</td>' +
    '<td style="font-size:11px;color:var(--text3)">' + esc(c.obs) + '</td>' +
    '<td><button class="btn btn-ghost" style="padding:4px 8px;font-size:11px" onclick="editChauffeur(' + c.id + ')">Modifier</button></td>' +
    '</tr>'
  ).join('') || '<tr><td colspan="6" class="empty">Aucun chauffeur.</td></tr>';
}

function editChauffeur(id) {
  const c = DB.chauffeurs.find(x => x.id === id);
  if (!c) return;
  document.getElementById('c-edit-id').value = id;
  document.getElementById('c-nom').value     = c.nom;
  document.getElementById('c-tel').value     = c.tel;
  document.getElementById('c-statut').value  = c.statut;
  document.getElementById('c-obs').value     = c.obs;
  openModal('modal-chauffeur');
}

function saveChauffeur() {
  const editId = parseInt(document.getElementById('c-edit-id').value);
  const obj = {
    nom:    document.getElementById('c-nom').value.trim(),
    tel:    document.getElementById('c-tel').value.trim(),
    statut: document.getElementById('c-statut').value,
    obs:    document.getElementById('c-obs').value.trim(),
  };
  if (!obj.nom) { alert('Nom requis.'); return; }
  if (editId) {
    const c = DB.chauffeurs.find(x => x.id === editId);
    if (c) Object.assign(c, obj);
  } else {
    obj.id = DB.nextId.c++;
    DB.chauffeurs.push(obj);
  }
  saveData(); closeModal('modal-chauffeur'); renderChauffeurs();
  document.getElementById('c-edit-id').value = '';
}

/* ── MODAL ── */
function openModal(id) {
  populateMissionDropdowns();
  document.getElementById(id).classList.add('open');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}
document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', function(e) {
    if (e.target === m) m.classList.remove('open');
  });
});

/* ── SYNC (future: Apps Script) ── */
function syncAll() {
  alert('Synchronisation avec Google Sheets disponible prochainement via Apps Script.');
}

/* ── BOOT (handled in index.html DOMContentLoaded) ── */

/* ══════════════════════════════════════════
   INVENTAIRE
══════════════════════════════════════════ */

const INVENTAIRE_GENERAL = [{"no": "1", "description": "Destructeur de document", "couleur": "noir", "codification": "ADM-Ch-001 à 006", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "2", "description": "ventillateur", "couleur": "blanc", "codification": "ADM-FT-001", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "3", "description": "Television Samsung", "couleur": "noir", "codification": "ADM-CL-001", "marque": "", "model": "", "serie": "", "financement": "Padess", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "4", "description": "canl+receiver", "couleur": "noir", "codification": "ADM-H-001", "marque": "Mercury", "model": "", "serie": "", "financement": "USAID", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "5", "description": "Satar Link", "couleur": "balnc", "codification": "ADM-CL-001002-003", "marque": "Mercury/Hon", "model": "", "serie": "", "financement": "USAID", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "6", "description": "Table en bois et en metal", "couleur": "marron", "codification": "ADM-REF-001", "marque": "Marbe", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "7", "description": "Calculatrice a ruban", "couleur": "Noir et gris", "codification": "ADM-PB-001", "marque": "Fellowes", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "14", "description": "Poubelle", "couleur": "crème", "codification": "ADM-Imp-001", "marque": "HP", "model": "", "serie": "CNB9G814M8", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "15", "description": "Panneaux d'installation des clefs", "couleur": "gris et amrron", "codification": "ADM-FT-014", "marque": "", "model": "", "serie": "", "financement": "CDS", "etat": "F", "qte": 2, "service": "Administration"}, {"no": "16", "description": "Bloc chequier", "couleur": "", "codification": "ADM-blo.ch-002", "marque": "", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 2, "service": "Administration"}, {"no": "17", "description": "Radio", "couleur": "noir", "codification": "ADM-Rd-001S", "marque": "", "model": "", "serie": "", "financement": "MSH/USAID", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "18", "description": "Griotine", "couleur": "gris et noir", "codification": "ADM-Ag-001", "marque": "Swingline", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "19", "description": "Risographe Gris", "couleur": "", "codification": "ADM-RZ-001", "marque": "", "model": "", "serie": "390UI", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "20", "description": "Cloche metalique", "couleur": "", "codification": "ADM-C-001", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "21", "description": "Radio Noire ancienne", "couleur": "", "codification": "ADM-Ra-001", "marque": "RCA", "model": "", "serie": "", "financement": "Mspp", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "22", "description": "Stetoscope Noire", "couleur": "", "codification": "ADM-Ste-001-002", "marque": "", "model": "81-131", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "23", "description": "Gallon bleu ciel", "couleur": "", "codification": "ADM-Gl-001", "marque": "", "model": "", "serie": "IKTMO26232EW", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "24", "description": "Sceau en Bois Payé Livré", "couleur": "", "codification": "ADM-sc-001", "marque": "", "model": "431K01", "serie": "E5500", "financement": "MSH/USAID", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "25", "description": "Boitier noire", "couleur": "", "codification": "ADM-PC-001", "marque": "HP", "model": "", "serie": "DUAO24116G", "financement": "PEPFAR", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "26", "description": "Retroprojecteur Gris/noire", "couleur": "", "codification": "ADM-Rp-001-002", "marque": "Dell/Focus", "model": "", "serie": "AZMB92101457/C62Y4M1", "financement": "PEPFAR", "etat": "F", "qte": 2, "service": "Administration"}, {"no": "27", "description": "Cartouche Toner", "couleur": "", "codification": "ADM-Cat-001-002", "marque": "", "model": "", "serie": "", "financement": "MSH/USAID", "etat": "F", "qte": 2, "service": "Administration"}, {"no": "28", "description": "Xerox Drum", "couleur": "", "codification": "ADM-XD-001", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "29", "description": "3 Boites de 5 Master", "couleur": "", "codification": "ADM-Mas-001-002-003", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 15, "service": "Administration"}, {"no": "30", "description": "Encre HP deja Utilisé", "couleur": "", "codification": "ADM-EN-001", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "31", "description": "Cable reseau Catégorie 5", "couleur": "", "codification": "ADM-cab-001", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "32", "description": "Multi prises Cremes", "couleur": "", "codification": "ADM-MP-001-002", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "33", "description": "Router Natcom bLanche 4G", "couleur": "", "codification": "ADM-Rt-001", "marque": "4GLTE", "model": "", "serie": "321265101105", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "34", "description": "Digital Video Recorder", "couleur": "", "codification": "ADM-DV-001", "marque": "", "model": "", "serie": "MNAHDR3116", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "35", "description": "Sceau en Bois Payé Livré", "couleur": "", "codification": "", "marque": "", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "36", "description": "Porte clef des vehicules", "couleur": "", "codification": "", "marque": "", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "37", "description": "projecteur EPSON", "couleur": "", "codification": "", "marque": "", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 3, "service": "Administration"}, {"no": "38", "description": "Enveloppe jaune", "couleur": "", "codification": "", "marque": "", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "39", "description": "Sacehet Glisseur pourPotre", "couleur": "", "codification": "", "marque": "", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "40", "description": "Classeur Metallique", "couleur": "", "codification": "", "marque": "HON ( ferme)", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "41", "description": "Classeur Metallique", "couleur": "", "codification": "", "marque": "mercury", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 2, "service": "Administration"}, {"no": "42", "description": "Classeur Metallique", "couleur": "", "codification": "", "marque": "Mercury", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "43", "description": "Climatiseur", "couleur": "", "codification": "", "marque": "", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "44", "description": "Agrapheuse", "couleur": "", "codification": "", "marque": "", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 2, "service": "Administration"}, {"no": "45", "description": "Water cooler", "couleur": "", "codification": "", "marque": "", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "46", "description": "Corbeille a document", "couleur": "", "codification": "", "marque": "", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "47", "description": "Certains document", "couleur": "", "codification": "", "marque": "", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "48", "description": "Pompe", "couleur": "", "codification": "", "marque": "", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "49", "description": "Enseigne d'Identification", "couleur": "", "codification": "", "marque": "", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 2, "service": "Administration"}, {"no": "2", "description": "Bureau metalique à7T", "couleur": "Marron et gris", "codification": "UAS-Br-001", "marque": "IEH", "model": "", "serie": "", "financement": "USAID", "etat": "F", "qte": 3, "service": "UAS"}, {"no": "3", "description": "Classeur metalique 4T", "couleur": "Gris", "codification": "UAS-Cl-001", "marque": "MERCURY", "model": "", "serie": "", "financement": "USAID", "etat": "F", "qte": 2, "service": "UAS"}, {"no": "4", "description": "Porte papier ( Personnel)", "couleur": "", "codification": "", "marque": "", "model": "", "serie": "9QMPSW1", "financement": "USAID", "etat": "F", "qte": 1, "service": "UAS"}, {"no": "5", "description": "Ventilateur ( Personnel)", "couleur": "Blanc", "codification": "UAS-V-001", "marque": "WESTPOINT", "model": "", "serie": "", "financement": "USAID", "etat": "F", "qte": 1, "service": "UAS"}, {"no": "2", "description": "Classeurs metaliques a 4T", "couleur": "Gris", "codification": "Compt-Cl-005", "marque": "MERCURY", "model": "", "serie": "", "financement": "USAID", "etat": "F", "qte": 5, "service": "Comptabilité"}, {"no": "3", "description": "Bureau  a 7T", "couleur": "gris et Marron", "codification": "Compt-Br-002", "marque": "IEH", "model": "", "serie": "", "financement": "USAID", "etat": "F", "qte": 3, "service": "Comptabilité"}, {"no": "4", "description": "Bureau gris et marron a 4T", "couleur": "gris et Marron", "codification": "Compt-Br-002", "marque": "IEH", "model": "", "serie": "", "financement": "USAID", "etat": "F", "qte": 2, "service": "Comptabilité"}, {"no": "5", "description": "Bureau  m en formica", "couleur": "marrron", "codification": "Compt-Br-002", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 3, "service": "Comptabilité"}, {"no": "6", "description": "Bureau  marron  3T", "couleur": "marron en En", "codification": "Compt-Br-001", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Comptabilité"}, {"no": "7", "description": "Ventilateurs gris, crème, noire", "couleur": "grisinnnrs gris, crème", "codification": "Compt-V-003", "marque": "LASCO", "model": "", "serie": "", "financement": "MSPP/ USAID", "etat": "F", "qte": 3, "service": "Comptabilité"}, {"no": "8", "description": "Dekstop", "couleur": "noire", "codification": "Compt-PC-002", "marque": "HP", "model": "", "serie": "MXL7091HX3", "financement": "MSPP", "etat": "F", "qte": 3, "service": "Comptabilité"}, {"no": "9", "description": "Perforateur", "couleur": "", "codification": "Compt-perfor-001", "marque": "", "model": "", "serie": "WQG35581", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Comptabilité"}, {"no": "10", "description": "Grillotine", "couleur": "", "codification": "Compt-gr-001", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Comptabilité"}, {"no": "11", "description": "Classeur 1/2 marron en bois 2T", "couleur": "marron en En", "codification": "Compt-Cl-001", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Comptabilité"}, {"no": "12", "description": "Agrapheuse", "couleur": "noir", "codification": "Compt-agrap-001", "marque": "", "model": "", "serie": "MXL4171NDT", "financement": "PEPFAR", "etat": "F", "qte": 4, "service": "Comptabilité"}, {"no": "13", "description": "Backup 5 Tous", "couleur": "", "codification": "Compt-Bc-001", "marque": "", "model": "", "serie": "43FKDF", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Comptabilité"}, {"no": "14", "description": "Imprimante noire", "couleur": "noire", "codification": "Compt-Imp-001", "marque": "HP", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Comptabilité"}, {"no": "15", "description": "Imprimante noire", "couleur": "noire", "codification": "Compt-Imp-002", "marque": "HP", "model": "", "serie": "CND9D7DCPG", "financement": "BRESIL", "etat": "F", "qte": 1, "service": "Comptabilité"}, {"no": "16", "description": "Dekstop noire", "couleur": "noire", "codification": "Compt-PC-001", "marque": "DELL ViSTRO", "model": "", "serie": "9QMQSW1", "financement": "BRESIL", "etat": "F", "qte": 1, "service": "Comptabilité"}, {"no": "17", "description": "Radio noire", "couleur": "noire", "codification": "Compt-RD-001", "marque": "", "model": "", "serie": "RCD109", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Comptabilité"}, {"no": "18", "description": "Fauteuil noire", "couleur": "noire", "codification": "Compt-Ft-004", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 9, "service": "Comptabilité"}, {"no": "19", "description": "Poubelle Crème plastique", "couleur": "Crème", "codification": "Compt-Pb-001", "marque": "", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Comptabilité"}, {"no": "20", "description": "Poubelle noire electrique", "couleur": "noire", "codification": "Compt-Pb-002", "marque": "", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Comptabilité"}, {"no": "21", "description": "Poubelle plastique noire", "couleur": "noire", "codification": "Compt-Pb-003", "marque": "", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Comptabilité"}, {"no": "22", "description": "Frigidaire", "couleur": "blanc", "codification": "Compt-Frig-001", "marque": "Wespointe", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Comptabilité"}, {"no": "23", "description": "Chaise bureau", "couleur": "noir", "codification": "Compt-ch.b.001", "marque": "", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Comptabilité"}, {"no": "24", "description": "Classeur Metallique", "couleur": "", "codification": "Compt-Cl-009", "marque": "", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 9, "service": "Comptabilité"}, {"no": "2", "description": "Bureau metalique noire a 7T", "couleur": "", "codification": "SES-Br-001", "marque": "IEH", "model": "", "serie": "", "financement": "USAID", "etat": "F", "qte": 1, "service": "SES"}, {"no": "3", "description": "Bureau metalique noire a 7T", "couleur": "", "codification": "SES-Br-002", "marque": "IEH", "model": "", "serie": "", "financement": "USAID", "etat": "F", "qte": 1, "service": "SES"}, {"no": "4", "description": "Bureau metalique noire a 7T", "couleur": "", "codification": "SES-Br-003", "marque": "IEH", "model": "", "serie": "", "financement": "USAID", "etat": "F", "qte": 1, "service": "SES"}, {"no": "5", "description": "Bureau metalique noire a 7T", "couleur": "", "codification": "SES-Br-004", "marque": "IEH", "model": "", "serie": "", "financement": "USAID", "etat": "F", "qte": 1, "service": "SES"}, {"no": "6", "description": "Bureau metalique noire a 7T", "couleur": "", "codification": "SES-Br-005", "marque": "IEH", "model": "", "serie": "", "financement": "USAID", "etat": "F", "qte": 1, "service": "SES"}, {"no": "7", "description": "Bureau metalique noire a 7T", "couleur": "", "codification": "SES-Br-006", "marque": "IEH", "model": "", "serie": "", "financement": "USAID", "etat": "F", "qte": 1, "service": "SES"}, {"no": "8", "description": "Bureau metalique noire a 4T", "couleur": "", "codification": "SES-Br-001", "marque": "MERCURY", "model": "", "serie": "", "financement": "USAID", "etat": "F", "qte": 1, "service": "SES"}, {"no": "9", "description": "Bureau metalique noire a 4T", "couleur": "", "codification": "SES-Br-002", "marque": "MERCURY", "model": "", "serie": "", "financement": "USAID", "etat": "F", "qte": 1, "service": "SES"}, {"no": "10", "description": "Bureau en formica a 3T", "couleur": "", "codification": "SES-Br-001", "marque": "MERCURY", "model": "", "serie": "", "financement": "CANADA", "etat": "F", "qte": 1, "service": "SES"}, {"no": "11", "description": "Bureau Metalique marron a 3T", "couleur": "", "codification": "SES-Br-002", "marque": "IEH", "model": "", "serie": "", "financement": "USAID", "etat": "F", "qte": 1, "service": "SES"}, {"no": "12", "description": "Bureau Metalique marron En Bois", "couleur": "", "codification": "SES-Br-001", "marque": "MERCURY", "model": "", "serie": "", "financement": "USAID", "etat": "F", "qte": 1, "service": "SES"}, {"no": "13", "description": "Bureau Metalique marron En Bois", "couleur": "", "codification": "SES-Br-002", "marque": "MERCURY", "model": "", "serie": "", "financement": "USAID", "etat": "F", "qte": 1, "service": "SES"}, {"no": "14", "description": "Classeur metalique 4T gris", "couleur": "", "codification": "SES-Cl-004", "marque": "MERCURY", "model": "", "serie": "", "financement": "USAID", "etat": "F", "qte": 1, "service": "SES"}, {"no": "15", "description": "Classeur metalique 4T gris", "couleur": "", "codification": "SES-Cl-003", "marque": "IEH", "model": "", "serie": "", "financement": "USAID", "etat": "F", "qte": 1, "service": "SES"}, {"no": "16", "description": "Harmoire metalique", "couleur": "", "codification": "SES-Ha-001", "marque": "MERCURY", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "SES"}, {"no": "17", "description": "Harmoire metalique", "couleur": "", "codification": "SES-Ha-002", "marque": "MERCURY", "model": "", "serie": "", "financement": "USAID", "etat": "F", "qte": 1, "service": "SES"}, {"no": "18", "description": "Imprimante Crème", "couleur": "", "codification": "SES-Imp-001", "marque": "HP", "model": "", "serie": "MFP4303FDW", "financement": "MSPP", "etat": "F", "qte": 1, "service": "SES"}, {"no": "19", "description": "Ventilateur blanc", "couleur": "", "codification": "SES-V-001", "marque": "WESTPOINT", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "SES"}, {"no": "20", "description": "Ventilateur blanc", "couleur": "", "codification": "SES-V-002", "marque": "WESTPOINT", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "SES"}, {"no": "21", "description": "Fauteuils noire et gris", "couleur": "", "codification": "SES-Ft-005", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "SES"}, {"no": "2", "description": "Chaises de bureau bouréés noire", "couleur": "", "codification": "Sec-Ch-002", "marque": "", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 2, "service": "Administration"}, {"no": "3", "description": "Ventilateurs noir", "couleur": "", "codification": "Sec-V-002", "marque": "Westpoint", "model": "", "serie": "", "financement": "OXFAM", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "4", "description": "Bureau metalique gris et Beige et marron", "couleur": "", "codification": "Sec-Br-002", "marque": "IEH", "model": "", "serie": "", "financement": "USAID", "etat": "F", "qte": 3, "service": "Administration"}, {"no": "5", "description": "Classeurs metaliques gris 4T", "couleur": "Gris", "codification": "Sec-cl-002", "marque": "IEH/ MERCURY", "model": "", "serie": "", "financement": "USAID/OXFAM", "etat": "F", "qte": 3, "service": "Administration"}, {"no": "6", "description": "Ordinateur complet", "couleur": "", "codification": "Sec-cl-001", "marque": "HP", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "7", "description": "Ordinateur complet", "couleur": "", "codification": "Sec-Et-001", "marque": "DELL", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "8", "description": "Imprimante blanc", "couleur": "", "codification": "Sec-Imp-001", "marque": "HP", "model": "", "serie": "QSC-40249", "financement": "MSPP", "etat": "F", "qte": 2, "service": "Administration"}, {"no": "9", "description": "Chaises de bureau bouréés noire", "couleur": "", "codification": "Sec-Imp-001", "marque": "", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "10", "description": "Chaise simple", "couleur": "", "codification": "Sec-PC-001", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "11", "description": "Miltiprise Noir", "couleur": "", "codification": "Sec-PC-001", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "12", "description": "Miltiprise Jaune Longue 10 matres", "couleur": "", "codification": "Sec-Wc-001", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "13", "description": "Poubelle plastique blanche", "couleur": "", "codification": "Sec-Pb-001", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "14", "description": "Reliure crème et gris", "couleur": "", "codification": "Sec- R-001", "marque": "", "model": "", "serie": "C150", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "15", "description": "Multiprises 8 T", "couleur": "", "codification": "Sec-MP-001", "marque": "Digicel", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "16", "description": "Milti Prise beige", "couleur": "", "codification": "Sec-Mlt-001", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "17", "description": "Corbeille petite noire", "couleur": "", "codification": "Sec-Cob-001", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "2", "description": "Bureau metallique gris et marron a 7T", "couleur": "", "codification": "SOS-Br-003", "marque": "IEH", "model": "", "serie": "", "financement": "USAID", "etat": "F", "qte": 3, "service": "Administration"}, {"no": "3", "description": "Bureau metallique crème a 4 T", "couleur": "", "codification": "SOS-Br-001", "marque": "", "model": "", "serie": "", "financement": "USAID", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "4", "description": "Bureau gris et formica crème 1 T", "couleur": "", "codification": "", "marque": "", "model": "", "serie": "", "financement": "CANADA", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "5", "description": "Bureau gris et marron 4T", "couleur": "", "codification": "SOS-Br-002", "marque": "IEH", "model": "", "serie": "", "financement": "Union Europ", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "6", "description": "Bureau gris et marron 4T avec formica", "couleur": "", "codification": "SOS-Br-001", "marque": "IEH", "model": "", "serie": "", "financement": "PEPFAR", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "7", "description": "Bufet gris et crème a 3 T", "couleur": "", "codification": "SOS-Br-001", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "8", "description": "Classeur metallique gris a 4 T", "couleur": "", "codification": "SOS-Cl-008", "marque": "MERCURY", "model": "", "serie": "", "financement": "USAID", "etat": "F", "qte": 8, "service": "Administration"}, {"no": "9", "description": "Classeur metallique gris a 4 T", "couleur": "", "codification": "SOS-Cl-002", "marque": "", "model": "", "serie": "", "financement": "Union Europ", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "10", "description": "Classeur metallique gris a 4 T", "couleur": "", "codification": "SOS-Cl-006", "marque": "HON", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 6, "service": "Administration"}, {"no": "11", "description": "Classeur 1/2 metallique gris a 2T", "couleur": "", "codification": "SOS-Cl-001", "marque": "HON", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 2, "service": "Administration"}, {"no": "12", "description": "Chaises bourrees noires", "couleur": "", "codification": "SOS-Ch-007", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 5, "service": "Administration"}, {"no": "13", "description": "Fauteuils noires", "couleur": "", "codification": "SOS-Ft-004", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 4, "service": "Administration"}, {"no": "14", "description": "Harmoire metallique gris 5 etages", "couleur": "", "codification": "SOS-Ha-001", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "15", "description": "Refrigerateur gris", "couleur": "", "codification": "SOS-Ref-001", "marque": "Westpoint", "model": "", "serie": "", "financement": "Union Europ", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "16", "description": "Back up APC", "couleur": "", "codification": "SOS-BC-001", "marque": "", "model": "", "serie": "", "financement": "USAID", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "17", "description": "Imprimante noire", "couleur": "", "codification": "SOS-Imp-001", "marque": "EPSON", "model": "", "serie": "VGNK295389", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "18", "description": "Imprimante noire", "couleur": "", "codification": "SOS-Imp-001", "marque": "HPJASER JET", "model": "", "serie": "0902-01", "financement": "USAID", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "19", "description": "ventilateur blanc", "couleur": "", "codification": "SOS-v-001", "marque": "LASKO", "model": "", "serie": "", "financement": "Union Europ", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "20", "description": "LAPTOP noire et gris", "couleur": "", "codification": "SOS-Lap-001", "marque": "DELL VOSTRO", "model": "", "serie": "9C3R5", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "21", "description": "LAPTOP noire", "couleur": "", "codification": "SOS-Lap-003", "marque": "DELL Latitude", "model": "", "serie": "SWBT8X1", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "22", "description": "Desktop noire", "couleur": "", "codification": "SOS-PC-001", "marque": "DELL VOSTRO", "model": "", "serie": "HZPZFX1", "financement": "USAID", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "23", "description": "Desktop noire", "couleur": "", "codification": "SOS-PC-001", "marque": "HP", "model": "", "serie": "MXL6290KZ5", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "24", "description": "Desktop noire", "couleur": "", "codification": "SOS-PC-001", "marque": "HP", "model": "", "serie": "MXL618179V", "financement": "OMAST/PSI", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "25", "description": "Classeur en bois 4 etages", "couleur": "", "codification": "SOS-Cl-001", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "2", "description": "Bureau  a 6T", "couleur": "Gris et marron", "codification": "SOS-Br-001", "marque": "", "model": "", "serie": "", "financement": "USAID/MSPP", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "3", "description": "Fauteuil", "couleur": "noir", "codification": "SOS-Ft-001", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "4", "description": "Classeur  Gris a 4 T", "couleur": "Gris", "codification": "SOS-Cl-002", "marque": "2 MERCURY/ 1 IEH", "model": "1 pas de marque", "serie": "", "financement": "2 USAID/MSPP", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "5", "description": "Ordinateur complet", "couleur": "noir", "codification": "SOS-ord-001", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "6", "description": "Chaise pliante", "couleur": "Blanche", "codification": "SOS-CHP-004", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 4, "service": "Administration"}, {"no": "7", "description": "TABLEAU MURALE", "couleur": "EN BOIS", "codification": "SOS-TABL-00", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "2", "description": "Water cooler", "couleur": "", "codification": "Recep-dir wat-001", "marque": "OFFICE STAR", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Réception / Compt / ADM"}, {"no": "3", "description": "chaise bourrees", "couleur": "", "codification": "recep dire- ch B-002", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 6, "service": "Réception / Compt / ADM"}, {"no": "4", "description": "Chaise miltiple", "couleur": "", "codification": "ch-M-001", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Réception / Compt / ADM"}, {"no": "5", "description": "chaise Simple", "couleur": "", "codification": "Recep ch.S--002", "marque": "CB", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Réception / Compt / ADM"}, {"no": "2", "description": "Water cooler", "couleur": "", "codification": "Cons-Tec-wt-cl-002", "marque": "IEH", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Conseiller Technique"}, {"no": "3", "description": "Imprimante", "couleur": "Blanche", "codification": "Cons-Tec-Imp-001", "marque": "HP", "model": "", "serie": "JPBDY01006", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Conseiller Technique"}, {"no": "4", "description": "Classeur gris", "couleur": "", "codification": "Cons-Tec-Cl-002", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Conseiller Technique"}, {"no": "5", "description": "Fauteuil rouge grena", "couleur": "", "codification": "Cons-Tec-Ft-001", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Conseiller Technique"}, {"no": "6", "description": "Bureau gris et Marron", "couleur": "", "codification": "Cons-Tec-Br-001", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Conseiller Technique"}, {"no": "7", "description": "Personnel computer", "couleur": "", "codification": "Cons-Tec-Pc-001", "marque": "Dell", "model": "", "serie": "", "financement": "USAID", "etat": "F", "qte": 1, "service": "Conseiller Technique"}, {"no": "8", "description": "Fauteuil noire", "couleur": "", "codification": "Cons-Tec-Ft-001", "marque": "", "model": "", "serie": "", "financement": "USAID", "etat": "F", "qte": 1, "service": "Conseiller Technique"}, {"no": "9", "description": "Classeur 1/2 3 T crème", "couleur": "", "codification": "Cons-Tec-Cl-001", "marque": "IEH", "model": "", "serie": "", "financement": "USAID", "etat": "F", "qte": 1, "service": "Conseiller Technique"}, {"no": "10", "description": "Classeur gris", "couleur": "", "codification": "Con-Tec-Cl-001", "marque": "MERCURY", "model": "", "serie": "", "financement": "USAID", "etat": "F", "qte": 1, "service": "Conseiller Technique"}, {"no": "11", "description": "Chaise simple", "couleur": "", "codification": "Con-ch-spl-001", "marque": "", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Conseiller Technique"}, {"no": "12", "description": "Pannier a Dossier", "couleur": "Noir", "codification": "Cons-tec- pn-001", "marque": "", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Conseiller Technique"}, {"no": "133", "description": "Porte outil", "couleur": "Noir", "codification": "Cons-Port out-001", "marque": "", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Conseiller Technique"}, {"no": "2", "description": "Bureau metal marron et crème", "couleur": "", "codification": "SRec-Br-001", "marque": "", "model": "", "serie": "", "financement": "USAID", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "3", "description": "Ventilateur blanc", "couleur": "", "codification": "SRec-V-001", "marque": "Lasko", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "4", "description": "Chaisses bourrees noires", "couleur": "", "codification": "SRec-Ch-006", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 4, "service": "Administration"}, {"no": "5", "description": "Television  Screen", "couleur": "", "codification": "Srec-TV-001", "marque": "Wespoint", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "6", "description": "Multiprises 8T en bois", "couleur": "Rouge", "codification": "Srec-MP-001", "marque": "Digicel", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "7", "description": "Recever canal sat", "couleur": "", "codification": "", "marque": "", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "8", "description": "Water cooler", "couleur": "noir et vert", "codification": "", "marque": "Wespoint", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "9", "description": "Petite table en fer", "couleur": "Bleu", "codification": "", "marque": "", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "10", "description": "Chaise simple", "couleur": "", "codification": "", "marque": "", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "11", "description": "Cassier a pistolet en bois", "couleur": "", "codification": "", "marque": "", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "2", "description": "Bureau gris et Marron", "couleur": "", "codification": "PH-Br-003", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 3, "service": "Administration"}, {"no": "3", "description": "Poubelle", "couleur": "", "codification": "PH-PB-002", "marque": "HP", "model": "", "serie": "JPBDY01006", "financement": "MSPP", "etat": "F", "qte": 2, "service": "Administration"}, {"no": "4", "description": "Classeur Metallique", "couleur": "", "codification": "PH-CL-011", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 11, "service": "Administration"}, {"no": "5", "description": "Ecran", "couleur": "", "codification": "PH-ECR-001", "marque": "Dell", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "6", "description": "Bureau gris et Marron", "couleur": "", "codification": "PH-BUR-001", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "7", "description": "Personnel computer", "couleur": "", "codification": "PH-PER COMP-001", "marque": "Dell", "model": "", "serie": "", "financement": "USAID", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "9", "description": "Fauteuil noire", "couleur": "", "codification": "PH-FT-001", "marque": "", "model": "", "serie": "", "financement": "USAID", "etat": "F", "qte": 3, "service": "Administration"}, {"no": "10", "description": "Classeur 1/2 3 T crème", "couleur": "", "codification": "PH-CL-001", "marque": "IEH", "model": "", "serie": "", "financement": "USAID", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "11", "description": "Classeur gris", "couleur": "", "codification": "Ing-Tec-Cl-001", "marque": "MERCURY", "model": "", "serie": "", "financement": "USAID", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "12", "description": "Bufet en bois", "couleur": "", "codification": "Ing-Tec-Bc-00", "marque": "FORZA", "model": "NT511ND", "serie": "", "financement": "USAID", "etat": "F", "qte": 2, "service": "Administration"}, {"no": "13", "description": "Star link", "couleur": "", "codification": "", "marque": "", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "14", "description": "Chaise bureau", "couleur": "", "codification": "", "marque": "", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 3, "service": "Administration"}, {"no": "15", "description": "Ordinateurcomplet", "couleur": "", "codification": "", "marque": "", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "16", "description": "Etager a 4 etage en bois", "couleur": "", "codification": "", "marque": "", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "2", "description": "Chaises de bureau bouréés noire", "couleur": "", "codification": "Sec-Ch-002", "marque": "", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Épidémiologie"}, {"no": "3", "description": "Chaises de bureau", "couleur": "", "codification": "Chb-epid-002", "marque": "Westpoint", "model": "", "serie": "", "financement": "OXFAM", "etat": "F", "qte": 7, "service": "Épidémiologie"}, {"no": "4", "description": "bufet metallique", "couleur": "", "codification": "epid- buf-001", "marque": "Mercure", "model": "", "serie": "", "financement": "USAID", "etat": "F", "qte": 2, "service": "Épidémiologie"}, {"no": "5", "description": "Bureau gri et marron à 7T", "couleur": "", "codification": "epid-bur-001", "marque": "IEH", "model": "", "serie": "", "financement": "USAID", "etat": "F", "qte": 8, "service": "Épidémiologie"}, {"no": "6", "description": "Bureau en bois marron", "couleur": "", "codification": "epid-bru-002", "marque": "IEH", "model": "", "serie": "", "financement": "USAID", "etat": "F", "qte": 2, "service": "Épidémiologie"}, {"no": "7", "description": "Classeurs metaliques gris 4T", "couleur": "", "codification": "epid-clss mt-001", "marque": "IEH/ MERCURY", "model": "", "serie": "", "financement": "USAID/OXFAM", "etat": "F", "qte": 12, "service": "Épidémiologie"}, {"no": "8", "description": "Etagere metallique a 4 etage", "couleur": "", "codification": "epid- etag-001", "marque": "IEH/ MERCURY", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Épidémiologie"}, {"no": "9", "description": "Etagere en bois marron", "couleur": "", "codification": "epid etag-002", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Épidémiologie"}, {"no": "10", "description": "Imprimante crème", "couleur": "", "codification": "epid-impr-001", "marque": "Canonn", "model": "", "serie": "QSC-40249", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Épidémiologie"}, {"no": "11", "description": "Imprimante gris et bleu", "couleur": "", "codification": "epid-imp-002", "marque": "HP", "model": "", "serie": "CN624DF4XD", "financement": "PADES", "etat": "F", "qte": 1, "service": "Épidémiologie"}, {"no": "12", "description": "Personnel computer noire", "couleur": "", "codification": "epid- compt.p-001", "marque": "DELL", "model": "", "serie": "CN-0R16JC72872", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Épidémiologie"}, {"no": "13", "description": "Personnel computer noire", "couleur": "", "codification": "epid-compt.p-002", "marque": "DELL /VOSTRO", "model": "", "serie": "37322533849", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Épidémiologie"}, {"no": "14", "description": "Ordinateur non complet", "couleur": "", "codification": "ordi-ncp.001", "marque": "T center/ ecr HP", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Épidémiologie"}, {"no": "15", "description": "Poubelle plastique Blanche", "couleur": "", "codification": "Epid-poub-001", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 2, "service": "Épidémiologie"}, {"no": "16", "description": "Backup noire", "couleur": "", "codification": "epid-bcup-001", "marque": "", "model": "", "serie": "C150", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Épidémiologie"}, {"no": "17", "description": "Giotine", "couleur": "", "codification": "Sec-Bc-001", "marque": "Forza", "model": "NT1011", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Épidémiologie"}, {"no": "18", "description": "Ventilateur blanc et Rouge", "couleur": "", "codification": "epid-gtine-001", "marque": "HP", "model": "", "serie": "CNDRPB178B", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Épidémiologie"}, {"no": "19", "description": "Classeur Crème", "couleur": "", "codification": "epid-V-001", "marque": "Whirlpool", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Épidémiologie"}, {"no": "20", "description": "Ventilateur blanc", "couleur": "", "codification": "epid-V-002", "marque": "Jocker", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Épidémiologie"}, {"no": "21", "description": "Boitier  Noire", "couleur": "", "codification": "epid-", "marque": "IEH Mercury", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Épidémiologie"}, {"no": "22", "description": "Ventilateur a pied", "couleur": "noir", "codification": "epid-V-002", "marque": "Lasko", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Épidémiologie"}, {"no": "2", "description": "Bureau noir et beige", "couleur": "", "codification": "", "marque": "", "model": "", "serie": "", "financement": "USAID/MSPP", "etat": "F", "qte": 1, "service": "Épidémiologie"}, {"no": "3", "description": "Fauteuil noire", "couleur": "", "codification": "", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Épidémiologie"}, {"no": "4", "description": "Classeur metallique Gris et marron", "couleur": "", "codification": "", "marque": "2 MERCURY/ 1 IEH", "model": "1 pas de marque", "serie": "", "financement": "2 USAID/MSPP", "etat": "F", "qte": 4, "service": "Épidémiologie"}, {"no": "5", "description": "Bureau gris et marron", "couleur": "", "codification": "", "marque": "", "model": "", "serie": "1-800-932-2278", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Épidémiologie"}, {"no": "6", "description": "Chateau blanc vide", "couleur": "", "codification": "", "marque": "", "model": "", "serie": "", "financement": "Union Europ", "etat": "F", "qte": 1, "service": "Épidémiologie"}, {"no": "7", "description": "Chateau blanc rempli lique", "couleur": "", "codification": "", "marque": "", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Épidémiologie"}, {"no": "8", "description": "drum blanc rempli", "couleur": "", "codification": "", "marque": "", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 2, "service": "Épidémiologie"}, {"no": "9", "description": "Invertaire Hybride", "couleur": "", "codification": "", "marque": "Luc solar", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Épidémiologie"}, {"no": "10", "description": "8 Batteries", "couleur": "", "codification": "", "marque": "", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 8, "service": "Épidémiologie"}, {"no": "11", "description": "Petite table en Fer", "couleur": "", "codification": "", "marque": "", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Épidémiologie"}, {"no": "2", "description": "Bureau gris et marron", "couleur": "", "codification": "", "marque": "IEH", "model": "", "serie": "", "financement": "USAID/MSPP", "etat": "F", "qte": 3, "service": "Épidémiologie"}, {"no": "3", "description": "Chaise simple", "couleur": "", "codification": "", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 3, "service": "Épidémiologie"}, {"no": "4", "description": "Classeur metallique Gris et marron", "couleur": "", "codification": "", "marque": "2 MERCURY/ 1 IEH", "model": "1 pas de marque", "serie": "", "financement": "2 USAID/MSPP", "etat": "F", "qte": 6, "service": "Épidémiologie"}, {"no": "5", "description": "Bureau  marron", "couleur": "", "codification": "", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Épidémiologie"}, {"no": "6", "description": "Coffre F.", "couleur": "noir", "codification": "", "marque": "", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Épidémiologie"}, {"no": "7", "description": "Armoir en bois a 6 portes", "couleur": "Marron", "codification": "", "marque": "", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Épidémiologie"}, {"no": "8", "description": "Water cooler", "couleur": "beige", "codification": "", "marque": "Wespoint", "model": "", "serie": "", "financement": "", "etat": "MÉ", "qte": 1, "service": "Épidémiologie"}, {"no": "2", "description": "Bureau gris et marron", "couleur": "", "codification": "", "marque": "", "model": "", "serie": "", "financement": "USAID/MSPP", "etat": "F", "qte": 2, "service": "Administration"}, {"no": "3", "description": "Fauteuil noire", "couleur": "", "codification": "", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 2, "service": "Administration"}, {"no": "4", "description": "Classeur metallique Gris", "couleur": "", "codification": "", "marque": "IEH", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "5", "description": "Ordinateur comlpet", "couleur": "", "codification": "", "marque": "", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "6", "description": "Imprimante", "couleur": "", "codification": "", "marque": "HP", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "7", "description": "Ventillateur", "couleur": "", "codification": "", "marque": "wespoint", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "8", "description": "Panier a Dossier vert", "couleur": "", "codification": "", "marque": "", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "2", "description": "Tables crème et gris pliante plastique", "couleur": "", "codification": "SS-Ta-008", "marque": "OFFICE STAR", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 8, "service": "Administration"}, {"no": "3", "description": "Tables en formica marron et noire", "couleur": "", "codification": "SS- Ta-002", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 2, "service": "Administration"}, {"no": "4", "description": "Table ronde en formica", "couleur": "", "codification": "SS- Ta-001", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "5", "description": "Speaker noire petit", "couleur": "", "codification": "SS-Spk-002", "marque": "CB", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 6, "service": "Administration"}, {"no": "6", "description": "Tv", "couleur": "", "codification": "SS-Trep-001", "marque": "Samsung", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 2, "service": "Administration"}, {"no": "7", "description": "Pots Fleurs", "couleur": "", "codification": "SS-Fl-002", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 2, "service": "Administration"}, {"no": "8", "description": "Bureau IEH", "couleur": "", "codification": "SS-bur-004", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 4, "service": "Administration"}, {"no": "9", "description": "Chaise Bourrées", "couleur": "", "codification": "SS-CHB.002", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "10", "description": "Air conditionné", "couleur": "", "codification": "SS-AIRC-002", "marque": "TGM", "model": "", "serie": "", "financement": "MSPP", "etat": "NF", "qte": 2, "service": "Administration"}, {"no": "11", "description": "Tableau de projection Gros", "couleur": "", "codification": "SS-TBPA-001", "marque": "EPSON", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "12", "description": "Projecteur", "couleur": "", "codification": "SS-PROJEC-001", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Administration"}, {"no": "13", "description": "Chaise pliante BLANCHE", "couleur": "", "codification": "SS.CH.P.075", "marque": "", "model": "", "serie": "", "financement": "MSPP/OPS", "etat": "F", "qte": 75, "service": "Administration"}, {"no": "2", "description": "Bureau blanc", "couleur": "", "codification": "SRH-Br-004", "marque": "IEH", "model": "", "serie": "", "financement": "USAID/MSPP", "etat": "F", "qte": 1, "service": "Ressources Humaines"}, {"no": "3", "description": "Bureau gris et marron", "couleur": "", "codification": "SRH-Br-002", "marque": "", "model": "", "serie": "", "financement": "USAID/MSPP", "etat": "F", "qte": 1, "service": "Ressources Humaines"}, {"no": "4", "description": "Classeur CRÈME", "couleur": "", "codification": "SRH-Cl-006", "marque": "MERCURY", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Ressources Humaines"}, {"no": "5", "description": "Classeur", "couleur": "", "codification": "SRH-Cl-004", "marque": "HON", "model": "", "serie": "", "financement": "USAID", "etat": "F", "qte": 4, "service": "Ressources Humaines"}, {"no": "6", "description": "Chaise simple", "couleur": "", "codification": "SRH-ch-003", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 3, "service": "Ressources Humaines"}, {"no": "7", "description": "Imprimante", "couleur": "", "codification": "SRH-Imp-001", "marque": "Cannon", "model": "", "serie": "WQG35553", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Ressources Humaines"}, {"no": "8", "description": "Imprimante", "couleur": "", "codification": "SRH-Imp-002", "marque": "HP137FNW", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Ressources Humaines"}, {"no": "9", "description": "Fauteuils noire", "couleur": "", "codification": "SRH-Ft-002", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 2, "service": "Ressources Humaines"}, {"no": "10", "description": "Ecran et clavier", "couleur": "", "codification": "SRH-ECr-001", "marque": "DELL", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Ressources Humaines"}, {"no": "11", "description": "Personnel Computer", "couleur": "gris", "codification": "SRH-Pc-001", "marque": "lenovo", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 2, "service": "Ressources Humaines"}, {"no": "12", "description": "Multiprises bleu et crème", "couleur": "", "codification": "SRH-MP-002", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 2, "service": "Ressources Humaines"}, {"no": "13", "description": "Ordinateur complet", "couleur": "", "codification": "SRH-dell-001", "marque": "DELL", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Ressources Humaines"}, {"no": "14", "description": "Poubelle petit", "couleur": "noir", "codification": "SRH-PB-001", "marque": "", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Ressources Humaines"}, {"no": "15", "description": "Agrapheuse", "couleur": "noir", "codification": "SRH-AGR-002", "marque": "", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 2, "service": "Ressources Humaines"}, {"no": "16", "description": "Panier a document", "couleur": "gris", "codification": "SRH PAN-001", "marque": "", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Ressources Humaines"}, {"no": "17", "description": "Chaise Bourrees", "couleur": "", "codification": "SRH-ch-002", "marque": "", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 2, "service": "Ressources Humaines"}, {"no": "18", "description": "Table pliante", "couleur": "", "codification": "SRH-TAB P-002", "marque": "", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 2, "service": "Ressources Humaines"}, {"no": "19", "description": "Chaise bureau", "couleur": "", "codification": "SRH- CHB-001", "marque": "", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Ressources Humaines"}, {"no": "20", "description": "Chaise pliante", "couleur": "", "codification": "SRH-CH.P-007", "marque": "", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 7, "service": "Ressources Humaines"}, {"no": "21", "description": "Laptop personnel", "couleur": "", "codification": "SRH-LAP PERS-002", "marque": "", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 2, "service": "Ressources Humaines"}, {"no": "22", "description": "Tableau", "couleur": "", "codification": "SRH-TABL-002", "marque": "", "model": "", "serie": "", "financement": "MSPP/DSNE", "etat": "F", "qte": 2, "service": "Ressources Humaines"}, {"no": "23", "description": "Imprimante", "couleur": "", "codification": "SRH-Imp-003", "marque": "Cannon", "model": "", "serie": "ADVC525IF", "financement": "", "etat": "F", "qte": 1, "service": "Ressources Humaines"}, {"no": "2", "description": "Bureau", "couleur": "noir et beige", "codification": "LOG-Br-001", "marque": "PHOENIX", "model": "", "serie": "", "financement": "USAID/MSPP", "etat": "F", "qte": 1, "service": "Ressources Humaines"}, {"no": "3", "description": "Bureau", "couleur": "gris et marron", "codification": "LOG-Br-002", "marque": "IEH", "model": "", "serie": "", "financement": "USAID/MSPP", "etat": "F", "qte": 1, "service": "Ressources Humaines"}, {"no": "4", "description": "Classeur 4 tirroirs", "couleur": "CRÈME", "codification": "LOG-Cl-001", "marque": "IEH", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Ressources Humaines"}, {"no": "5", "description": "Classeur 4 tirroirs", "couleur": "crème", "codification": "SRH-Cl-001", "marque": "", "model": "", "serie": "", "financement": "USAID", "etat": "F", "qte": 1, "service": "Ressources Humaines"}, {"no": "6", "description": "Chaise simple", "couleur": "NOIR", "codification": "LOG-ch-001", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Ressources Humaines"}, {"no": "7", "description": "Imprimante", "couleur": "BLANCHE", "codification": "LOG-Imp-001", "marque": "HPCF248A", "model": "", "serie": "", "financement": "MSPP/DSNE", "etat": "F", "qte": 1, "service": "Ressources Humaines"}, {"no": "8", "description": "Imprimante RIZO", "couleur": "BLANCHE", "codification": "LOG-Imp-001", "marque": "RIZO390UI", "model": "", "serie": "", "financement": "MSPP/DSNE", "etat": "F", "qte": 1, "service": "Ressources Humaines"}, {"no": "9", "description": "Fauteuils noire", "couleur": "NOIRE", "codification": "LOG-Ft-001", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Ressources Humaines"}, {"no": "10", "description": "Ecran et clavier", "couleur": "NOIR", "codification": "LOG-ECr-001", "marque": "DELL", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Ressources Humaines"}, {"no": "11", "description": "Personnel Computer", "couleur": "gris", "codification": "LOG-Pc-001", "marque": "HP", "model": "15-DY1031WM", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Ressources Humaines"}, {"no": "12", "description": "Television", "couleur": "NOIR", "codification": "LOG-TV-001", "marque": "HAIER", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Ressources Humaines"}, {"no": "13", "description": "DESCTOP complet", "couleur": "NOIR", "codification": "LOG-DESCT-001", "marque": "HP", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Ressources Humaines"}, {"no": "14", "description": "Poubelle petit", "couleur": "NOIR", "codification": "LOG-PB-001", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Ressources Humaines"}, {"no": "15", "description": "Agrapheuse", "couleur": "NOIR", "codification": "LOG-AGR-001", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Ressources Humaines"}, {"no": "16", "description": "Panier a document", "couleur": "NOIR", "codification": "LOG-PAN-002", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 2, "service": "Ressources Humaines"}, {"no": "17", "description": "Chaise Bourrees", "couleur": "NOIR", "codification": "LOG-ch-001", "marque": "", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Ressources Humaines"}, {"no": "18", "description": "Frigidaire", "couleur": "BLANCHE", "codification": "log-FRIG-001", "marque": "whirlpool", "model": "", "serie": "", "financement": "MSPP", "etat": "F", "qte": 1, "service": "Ressources Humaines"}, {"no": "19", "description": "Lampe solaire", "couleur": "", "codification": "log- lamp s-004", "marque": "vmn power", "model": "", "serie": "", "financement": "MSPP/DSNE", "etat": "F", "qte": 7, "service": "Ressources Humaines"}, {"no": "20", "description": "Chaise pliante", "couleur": "BLANCHE", "codification": "LOG-CH.P-003", "marque": "", "model": "", "serie": "", "financement": "MSPP/DSNE", "etat": "F", "qte": 3, "service": "Ressources Humaines"}, {"no": "21", "description": "imprimante", "couleur": "noir", "codification": "LOG-ch-001", "marque": "CANON", "model": "", "serie": "", "financement": "MSPP/DSNE", "etat": "F", "qte": 1, "service": "Ressources Humaines"}, {"no": "22", "description": "COFFREFORT", "couleur": "Beige et blen p.", "codification": "LOG.COFR P.001", "marque": "", "model": "", "serie": "", "financement": "USAID", "etat": "NF", "qte": 1, "service": "Ressources Humaines"}, {"no": "23", "description": "Ecran", "couleur": "noir", "codification": "Log-ecr-001", "marque": "LENOVO", "model": "", "serie": "", "financement": "USAID", "etat": "NF", "qte": 1, "service": "Ressources Humaines"}, {"no": "24", "description": "ECRAN", "couleur": "BLANC ET NOIR", "codification": "Log-ecr-001", "marque": "HP", "model": "", "serie": "", "financement": "USAID", "etat": "F", "qte": 1, "service": "Ressources Humaines"}, {"no": "25", "description": "Ventilateur", "couleur": "blanche", "codification": "LOG-VT-001", "marque": "EASY POWER", "model": "", "serie": "", "financement": "", "etat": "F", "qte": 1, "service": "Ressources Humaines"}];


/* ── Inventaire Général ── */
let invGenFilter = {q:'', service:'', etat:''};
let invGenItems = JSON.parse(JSON.stringify(INVENTAIRE_GENERAL));
let invNextId = INVENTAIRE_GENERAL.length + 1;

function nav_inv_general() { renderInvGen(); }
function nav_inv_activites() { renderInvAct(); }

function filterInvGen(q, service, etat) {
  if (q !== '') invGenFilter.q = q;
  if (service !== '') invGenFilter.service = service;
  if (etat !== '') invGenFilter.etat = etat;
  if (q === '' && document.querySelector('#inv-service-filter') === null) {
    // called with empty q to reset
  }
  renderInvGen();
}

function renderInvGen() {
  const q = (invGenFilter.q || '').toLowerCase();
  const svc = document.getElementById('inv-service-filter') ? document.getElementById('inv-service-filter').value : '';
  const et  = document.getElementById('inv-etat-filter') ? document.getElementById('inv-etat-filter').value : '';

  const filtered = invGenItems.filter(function(i) {
    const matchQ   = !q   || i.description.toLowerCase().includes(q) || i.codification.toLowerCase().includes(q) || i.marque.toLowerCase().includes(q);
    const matchSvc = !svc || i.service === svc;
    const matchEt  = !et  || i.etat === et;
    return matchQ && matchSvc && matchEt;
  });

  const total = filtered.length;
  const fonctionnel = filtered.filter(function(i){ return i.etat === 'F'; }).length;
  const nf = filtered.filter(function(i){ return i.etat === 'NF'; }).length;
  const me = filtered.filter(function(i){ return i.etat === 'MÉ'; }).length;

  document.getElementById('inv-gen-kpis').innerHTML =
    kpiCard('Total biens', invGenItems.length, "dans l'inventaire", 'gold') +
    kpiCard('Fonctionnels', fonctionnel, '', 'green') +
    kpiCard('Non fonctionnels', nf, '', 'red') +
    kpiCard('Mauvais état', me, '', 'amber');

  document.getElementById('inv-gen-count').textContent = total + ' bien' + (total > 1 ? 's' : '');

  function etatBadge(e) {
    if (e === 'F')  return '<span class="badge badge-green">Fonctionnel</span>';
    if (e === 'NF') return '<span class="badge badge-red">Non fonctionnel</span>';
    if (e === 'MÉ') return '<span class="badge badge-amber">Mauvais état</span>';
    return '<span class="badge badge-gray">' + esc(e) + '</span>';
  }

  document.getElementById('inv-gen-tbody').innerHTML = filtered.map(function(item) {
    return '<tr>' +
      '<td style="font-family:DM Mono,monospace;font-size:10px;color:var(--text3)">' + esc(item.no) + '</td>' +
      '<td style="color:var(--text)">' + esc(item.description) + '</td>' +
      '<td style="font-size:11px">' + esc(item.couleur) + '</td>' +
      '<td style="font-family:DM Mono,monospace;font-size:10px">' + esc(item.codification) + '</td>' +
      '<td style="font-size:11px">' + esc(item.marque) + '</td>' +
      '<td style="font-size:11px">' + esc(item.financement) + '</td>' +
      '<td>' + etatBadge(item.etat) + '</td>' +
      '<td style="text-align:center;font-weight:600">' + esc(String(item.qte)) + '</td>' +
      '<td style="font-size:11px;color:var(--text3)">' + esc(item.service) + '</td>' +
      '<td><button class="btn btn-ghost" style="padding:3px 8px;font-size:10px" onclick="editInvGen(' + JSON.stringify(item.no) + ')">Modifier</button></td>' +
      '</tr>';
  }).join('') || '<tr><td colspan="10" class="empty">Aucun résultat.</td></tr>';
}

function editInvGen(no) {
  const item = invGenItems.find(function(x){ return x.no === no; });
  if (!item) return;
  document.getElementById('inv-modal-title').textContent = 'Modifier le bien';
  document.getElementById('inv-edit-id').value  = no;
  document.getElementById('inv-desc').value     = item.description;
  document.getElementById('inv-couleur').value  = item.couleur;
  document.getElementById('inv-code').value     = item.codification;
  document.getElementById('inv-marque').value   = item.marque;
  document.getElementById('inv-model').value    = item.model;
  document.getElementById('inv-serie').value    = item.serie;
  document.getElementById('inv-fin').value      = item.financement;
  document.getElementById('inv-etat').value     = item.etat;
  document.getElementById('inv-qte').value      = item.qte;
  document.getElementById('inv-service').value  = item.service;
  openModal('modal-inv-add');
}

function saveInvGen() {
  const editNo = document.getElementById('inv-edit-id').value;
  const obj = {
    description:  document.getElementById('inv-desc').value.trim(),
    couleur:      document.getElementById('inv-couleur').value.trim(),
    codification: document.getElementById('inv-code').value.trim(),
    marque:       document.getElementById('inv-marque').value.trim(),
    model:        document.getElementById('inv-model').value.trim(),
    serie:        document.getElementById('inv-serie').value.trim(),
    financement:  document.getElementById('inv-fin').value,
    etat:         document.getElementById('inv-etat').value,
    qte:          parseInt(document.getElementById('inv-qte').value)||1,
    service:      document.getElementById('inv-service').value,
  };
  if (!obj.description) { alert('Description requise.'); return; }
  if (editNo) {
    const item = invGenItems.find(function(x){ return x.no === editNo; });
    if (item) Object.assign(item, obj);
  } else {
    obj.no = String(invNextId++);
    invGenItems.push(obj);
  }
  // Save to localStorage
  localStorage.setItem('dsne_inv_general', JSON.stringify(invGenItems));
  closeModal('modal-inv-add');
  document.getElementById('inv-edit-id').value = '';
  document.getElementById('inv-modal-title').textContent = 'Nouveau bien';
  renderInvGen();
}

/* ── Inventaire Activités ── */
function loadInvAct() {
  const saved = localStorage.getItem('dsne_inv_activites');
  return saved ? JSON.parse(saved) : [
    {id:1, nom:'Carburant (gasoil)', cat:'Carburant', unite:'litre', stock:0, min:50, source:'Achat direct'},
    {id:2, nom:'Rames de papier A4', cat:'Fournitures de bureau', unite:'rame', stock:0, min:5, source:'MSPP'},
    {id:3, nom:'Stylos bille', cat:'Fournitures de bureau', unite:'boîte', stock:0, min:2, source:'MSPP'},
    {id:4, nom:'Masques chirurgicaux', cat:'Matériel médical', unite:'boîte', stock:0, min:10, source:'MSPP'},
    {id:5, nom:'Formulaires SISNU', cat:'Imprimés / Formulaires', unite:'unité', stock:0, min:20, source:'MSPP'},
  ];
}

function loadReceptions() {
  const saved = localStorage.getItem('dsne_inv_receptions');
  return saved ? JSON.parse(saved) : [];
}

let invActItems = loadInvAct();
let receptions  = loadReceptions();
let invActNextId = invActItems.length + 1;
let recNextId    = receptions.length + 1;

function renderInvAct() {
  const totalItems = invActItems.length;
  const lowStock   = invActItems.filter(function(i){ return i.stock <= i.min; }).length;
  const totalRec   = receptions.length;

  document.getElementById('inv-act-kpis').innerHTML =
    kpiCard('Articles suivis', totalItems, '', 'gold') +
    kpiCard('Stock faible / épuisé', lowStock, 'en dessous du minimum', 'red') +
    kpiCard('Réceptions enregistrées', totalRec, '', 'green');

  document.getElementById('inv-act-tbody').innerHTML = invActItems.map(function(item) {
    const low = item.stock <= item.min;
    const lastRec = receptions.filter(function(r){ return r.articleId === item.id; }).slice(-1)[0];
    return '<tr>' +
      '<td style="color:var(--text)">' + esc(item.nom) + '</td>' +
      '<td style="font-size:11px">' + esc(item.cat) + '</td>' +
      '<td style="font-size:11px;color:var(--text3)">' + esc(item.unite) + '</td>' +
      '<td style="font-family:DM Mono,monospace;font-weight:600;color:' + (low ? 'var(--red)' : 'var(--green)') + '">' + item.stock + '</td>' +
      '<td style="font-family:DM Mono,monospace;font-size:11px;color:var(--text3)">' + item.min + '</td>' +
      '<td style="font-size:11px">' + esc(item.source) + '</td>' +
      '<td style="font-size:11px;color:var(--text3)">' + (lastRec ? esc(fmtDate(lastRec.date)) : '—') + '</td>' +
      '<td style="display:flex;gap:4px">' +
        '<button class="btn btn-ghost" style="padding:3px 8px;font-size:10px" onclick="editInvAct(' + item.id + ')">Modifier</button>' +
      '</td>' +
      '</tr>';
  }).join('') || '<tr><td colspan="8" class="empty">Aucun article. Cliquez sur "+ Ajouter un article".</td></tr>';

  // Receptions log
  document.getElementById('inv-reception-tbody').innerHTML = receptions.slice().reverse().map(function(r) {
    const item = invActItems.find(function(i){ return i.id === r.articleId; });
    return '<tr>' +
      '<td>' + esc(fmtDate(r.date)) + '</td>' +
      '<td style="color:var(--text)">' + esc(item ? item.nom : r.articleId) + '</td>' +
      '<td style="font-family:DM Mono,monospace;font-weight:600;color:var(--green)">+' + r.qte + '</td>' +
      '<td>' + esc(r.source) + '</td>' +
      '<td>' + esc(r.par) + '</td>' +
      '<td style="font-size:11px;color:var(--text3)">' + esc(r.notes) + '</td>' +
      '</tr>';
  }).join('') || '<tr><td colspan="6" class="empty">Aucune réception enregistrée.</td></tr>';

  // Populate reception article dropdown
  var recArt = document.getElementById('rec-article');
  if (recArt) {
    recArt.innerHTML = invActItems.map(function(i) {
      return '<option value="' + i.id + '">' + esc(i.nom) + ' (' + i.stock + ' ' + esc(i.unite) + ')</option>';
    }).join('');
  }
}

function editInvAct(id) {
  const item = invActItems.find(function(x){ return x.id === id; });
  if (!item) return;
  document.getElementById('act-edit-id').value = id;
  document.getElementById('act-nom').value     = item.nom;
  document.getElementById('act-cat').value     = item.cat;
  document.getElementById('act-unite').value   = item.unite;
  document.getElementById('act-stock').value   = item.stock;
  document.getElementById('act-min').value     = item.min;
  document.getElementById('act-source').value  = item.source;
  openModal('modal-inv-act-add');
}

function saveInvAct() {
  const editId = parseInt(document.getElementById('act-edit-id').value);
  const obj = {
    nom:    document.getElementById('act-nom').value.trim(),
    cat:    document.getElementById('act-cat').value,
    unite:  document.getElementById('act-unite').value.trim(),
    stock:  parseInt(document.getElementById('act-stock').value)||0,
    min:    parseInt(document.getElementById('act-min').value)||0,
    source: document.getElementById('act-source').value.trim(),
  };
  if (!obj.nom) { alert('Nom requis.'); return; }
  if (editId) {
    const item = invActItems.find(function(x){ return x.id === editId; });
    if (item) Object.assign(item, obj);
  } else {
    obj.id = invActNextId++;
    invActItems.push(obj);
  }
  localStorage.setItem('dsne_inv_activites', JSON.stringify(invActItems));
  closeModal('modal-inv-act-add');
  document.getElementById('act-edit-id').value = '';
  renderInvAct();
}

function saveReception() {
  const articleId = parseInt(document.getElementById('rec-article').value);
  const qte = parseInt(document.getElementById('rec-qte').value)||0;
  if (!articleId || !qte) { alert('Article et quantité requis.'); return; }
  const rec = {
    id:        recNextId++,
    date:      document.getElementById('rec-date').value,
    articleId: articleId,
    qte:       qte,
    source:    document.getElementById('rec-source').value.trim(),
    par:       document.getElementById('rec-par').value.trim(),
    notes:     document.getElementById('rec-notes').value.trim(),
  };
  receptions.push(rec);
  // Update stock
  const item = invActItems.find(function(x){ return x.id === articleId; });
  if (item) item.stock += qte;
  localStorage.setItem('dsne_inv_receptions', JSON.stringify(receptions));
  localStorage.setItem('dsne_inv_activites', JSON.stringify(invActItems));
  closeModal('modal-reception');
  renderInvAct();
}

// Load saved general inventory customizations
(function() {
  const saved = localStorage.getItem('dsne_inv_general');
  if (saved) invGenItems = JSON.parse(saved);
})();


/* ══════════════════════════════════════════════════════════
   INSTITUTIONS NORD-EST (shared dropdown list)
══════════════════════════════════════════════════════════ */
const INSTITUTIONS_NE = [
  "Hôpital Départemental de Fort-Liberté (HFL)",
  "CDAI Fort-Liberté",
  "CCS Dérac","CCS Meillac","CCS Mérande",
  "CS Ferrier","CS Acul Samedi","CS Perches","CS Vallières",
  "CMS Ouanaminthe (CMSO)",
  "CS Capotille","CMS Mont-Organisé (CMSMO)","CCS Lamine",
  "CS Acul des Pins","CS Gens de Nantes","CS Savane au Lait",
  "CCS Savane Longue","CS Dilaire","CS Rose Bonite",
  "CS Bois Poux","CS Carice","CS Corosse (Capotille)",
  "HCR Trou-du-Nord",
  "CS Terrier Rouge","CS Pilette","CS Jacquezyl",
  "CS NDL Grand Bassin","CS Leroux Cachiman","CS Roche Plate",
  "CCS Grosse Roche (TDN)","CS Caracol","CS Cahesse",
  "CS Sainte-Suzanne","CS Danda","CS Dupity",
  "CS Phaéton","CS Corosse (Trou-du-Nord)",
  "CS Mombin-Crochu","CS Bois de Laurence","CCS Grosse Roche (Hors UAS)"
];

function populateInstDropdowns() {
  ['tr-dest-inst','invd-inst','la-dest-inst'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = INSTITUTIONS_NE.map(i =>
      `<option value="${esc(i)}">${esc(i)}</option>`
    ).join('');
  });
  // Inventaire départemental filter
  const f = document.getElementById('invd-inst-filter');
  if (f) {
    f.innerHTML = '<option value="">Toutes institutions</option>' +
      INSTITUTIONS_NE.map(i => `<option value="${esc(i)}">${esc(i)}</option>`).join('');
  }
}

/* ── UID generator ── DSNE-LOG-JJMMAAAA-NNNN */
function genUID(prefix, list) {
  const d = new Date();
  const jj = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const aa = String(d.getFullYear()).slice(-2);
  const dayStr = jj + mm + aa;
  const sameDay = list.filter(x => x.uid && x.uid.includes(dayStr));
  const seq = String(sameDay.length + 1).padStart(4,'0');
  return `DSNE-${prefix}-${dayStr}-${seq}`;
}

/* ══════════════════════════════════════════════════════════
   INVENTAIRE DÉPARTEMENTAL
══════════════════════════════════════════════════════════ */
function loadInvD() {
  const s = localStorage.getItem('dsne_inv_depart');
  return s ? JSON.parse(s) : [];
}
function saveInvD_data(arr) { localStorage.setItem('dsne_inv_depart', JSON.stringify(arr)); }
let invDItems = loadInvD();

function renderInvD() {
  populateInstDropdowns();
  const q   = '';
  const ins = document.getElementById('invd-inst-filter') ? document.getElementById('invd-inst-filter').value : '';
  const et  = document.getElementById('invd-etat-filter') ? document.getElementById('invd-etat-filter').value : '';
  const filtered = invDItems.filter(i =>
    (!ins || i.institution === ins) &&
    (!et  || i.etat === et)
  );
  document.getElementById('invd-count').textContent = filtered.length + ' bien' + (filtered.length !== 1 ? 's' : '');
  document.getElementById('invd-kpis').innerHTML =
    kpiCard('Total biens', invDItems.length, 'dép. Nord-Est', 'purple') +
    kpiCard('Fonctionnels', invDItems.filter(i=>i.etat==='F').length, '', 'green') +
    kpiCard('Non fonctionnels', invDItems.filter(i=>i.etat==='NF').length, '', 'red') +
    kpiCard('Institutions couvertes', [...new Set(invDItems.map(i=>i.institution))].length, '', 'blue');
  document.getElementById('invd-tbody').innerHTML = filtered.map(item =>
    '<tr>' +
    `<td style="color:var(--g800)">${esc(item.desc)}</td>` +
    `<td style="font-size:11px">${esc(item.marque)}</td>` +
    `<td style="font-family:monospace;font-size:10px">${esc(item.code)}</td>` +
    `<td>${etatBadge(item.etat)}</td>` +
    `<td style="font-weight:600;text-align:center">${item.qte}</td>` +
    `<td style="font-size:12px;color:var(--c600)">${esc(item.institution)}</td>` +
    `<td style="display:flex;gap:4px">` +
    `<button class="btn btn-secondary btn-sm" onclick="editInvD('${item.id}')">Modifier</button>` +
    `<button class="btn btn-primary btn-sm" onclick="openTransfertModal('invd','${item.id}')">Transférer</button>` +
    `</td></tr>`
  ).join('') || '<tr><td colspan="7" class="empty">Aucun bien enregistré.</td></tr>';
}

function filterInvD(q, inst, etat) {
  renderInvD();
}

function editInvD(id) {
  populateInstDropdowns();
  const item = invDItems.find(x => x.id === id);
  if (!item) return;
  document.getElementById('invd-modal-title').textContent = 'Modifier le bien';
  document.getElementById('invd-edit-id').value   = id;
  document.getElementById('invd-desc').value      = item.desc;
  document.getElementById('invd-marque').value    = item.marque;
  document.getElementById('invd-code').value      = item.code;
  document.getElementById('invd-serie').value     = item.serie;
  document.getElementById('invd-fin').value       = item.fin;
  document.getElementById('invd-etat').value      = item.etat;
  document.getElementById('invd-qte').value       = item.qte;
  document.getElementById('invd-is-veh').value    = item.isVehicule ? '1' : '0';
  document.getElementById('invd-inst').value      = item.institution;
  openModal('modal-invd-add');
}

function saveInvD() {
  const editId = document.getElementById('invd-edit-id').value;
  const obj = {
    desc:        document.getElementById('invd-desc').value.trim(),
    marque:      document.getElementById('invd-marque').value.trim(),
    code:        document.getElementById('invd-code').value.trim(),
    serie:       document.getElementById('invd-serie').value.trim(),
    fin:         document.getElementById('invd-fin').value,
    etat:        document.getElementById('invd-etat').value,
    qte:         parseInt(document.getElementById('invd-qte').value)||1,
    isVehicule:  document.getElementById('invd-is-veh').value === '1',
    institution: document.getElementById('invd-inst').value,
  };
  if (!obj.desc) { alert('Description requise.'); return; }
  if (editId) {
    const item = invDItems.find(x => x.id === editId);
    if (item) Object.assign(item, obj);
  } else {
    obj.id = 'id-' + Date.now();
    invDItems.push(obj);
  }
  saveInvD_data(invDItems);
  closeModal('modal-invd-add');
  document.getElementById('invd-edit-id').value = '';
  document.getElementById('invd-modal-title').textContent = 'Nouveau bien — Inventaire Départemental';
  renderInvD();
  updateInvDXlsx();
}

function etatBadge(e) {
  if (e === 'F')  return '<span class="badge badge-green">Fonctionnel</span>';
  if (e === 'NF') return '<span class="badge badge-red">Non fonctionnel</span>';
  if (e === 'MÉ') return '<span class="badge badge-amber">Mauvais état</span>';
  return '<span class="badge badge-gray">' + esc(e) + '</span>';
}

/* ══════════════════════════════════════════════════════════
   TRANSFERTS
══════════════════════════════════════════════════════════ */
function loadTransferts() {
  const s = localStorage.getItem('dsne_transferts');
  return s ? JSON.parse(s) : [];
}
function saveTransferts_data(arr) { localStorage.setItem('dsne_transferts', JSON.stringify(arr)); }
let transferts = loadTransferts();

function openTransfertModal(source, itemId) {
  populateInstDropdowns();
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('tr-date').value   = today;
  document.getElementById('tr-item-id').value     = itemId;
  document.getElementById('tr-item-source').value = source; // 'hq' or 'invd'
  document.getElementById('tr-scan-path').value   = '';
  document.getElementById('tr-scan-name').textContent = 'Aucun fichier';
  document.getElementById('tr-obs').value = '';

  let item, isVeh = false, label = '';
  if (source === 'hq') {
    item = invGenItems.find(x => String(x.no) === String(itemId));
    label = item ? item.description : itemId;
  } else {
    item = invDItems.find(x => x.id === itemId);
    if (item) { label = item.desc; isVeh = !!item.isVehicule; }
  }
  document.getElementById('tr-is-vehicule').value = isVeh ? '1' : '0';
  document.getElementById('tr-item-info').textContent = 'Bien : ' + label;
  document.getElementById('tr-title').textContent = 'Transférer — ' + label;

  const note = document.getElementById('tr-vehicule-note');
  note.style.display = isVeh ? 'block' : 'none';

  toggleTransfertDest();
  openModal('modal-transfert');
}

function toggleTransfertDest() {
  const type = document.getElementById('tr-dest-type').value;
  document.getElementById('tr-dest-service-group').style.display = type === 'service' ? '' : 'none';
  document.getElementById('tr-dest-inst-group').style.display    = type === 'institution' ? '' : 'none';
}

async function pickScanTransfert() {
  if (!window.dsneLog) { alert('Disponible uniquement dans l\'app Electron.'); return; }
  const f = await window.dsneLog.pickFile();
  if (!f) return;
  document.getElementById('tr-scan-path').value = f.src;
  document.getElementById('tr-scan-name').textContent = f.name;
}

async function saveTransfert() {
  const itemId  = document.getElementById('tr-item-id').value;
  const source  = document.getElementById('tr-item-source').value;
  const isVeh   = document.getElementById('tr-is-vehicule').value === '1';
  const destType = document.getElementById('tr-dest-type').value;
  const destVal  = destType === 'service'
    ? document.getElementById('tr-dest-service').value
    : document.getElementById('tr-dest-inst').value;

  let fromLabel = '';
  if (source === 'hq') {
    const item = invGenItems.find(x => String(x.no) === String(itemId));
    fromLabel = item ? item.service : 'HQ';
  } else {
    const item = invDItems.find(x => x.id === itemId);
    fromLabel = item ? item.institution : '—';
  }

  const uid = genUID('TRF', transferts);
  const tr = {
    uid,
    date:      document.getElementById('tr-date').value,
    itemId, source, isVehicule: isVeh,
    fromLabel, destType, destVal,
    obs:       document.getElementById('tr-obs').value.trim(),
    scanPath:  document.getElementById('tr-scan-path').value,
    scanName:  document.getElementById('tr-scan-name').textContent,
    lettrePath: '',
  };

  // Copy scan if provided
  if (tr.scanPath && window.dsneLog) {
    const ext = tr.scanPath.split('.').pop();
    const res = await window.dsneLog.copyScan({
      src: tr.scanPath,
      destSubfolder: 'BonsLivraisonReception',
      destName: uid + '-bon.' + ext
    });
    if (res.ok) tr.scanPath = res.path;
  }

  transferts.push(tr);
  saveTransferts_data(transferts);

  // Update item location
  if (source === 'invd') {
    const item = invDItems.find(x => x.id === itemId);
    if (item && destType === 'institution') item.institution = destVal;
    else if (item && destType === 'service') item.institution = 'HQ — ' + destVal;
    saveInvD_data(invDItems);
  } else if (source === 'hq') {
    const item = invGenItems.find(x => String(x.no) === String(itemId));
    if (item && destType === 'service') item.service = destVal;
    localStorage.setItem('dsne_inv_general', JSON.stringify(invGenItems));
  }

  closeModal('modal-transfert');
  renderTransferts();
  updateTransfertsXlsx();
  toast('Transfert ' + uid + ' enregistré.', 'success');

  if (isVeh) {
    setTimeout(() => {
      if (confirm('Véhicule transféré. Générer la lettre d\'affectation maintenant?')) {
        prefillAffectation(tr);
        openModal('modal-lettre-affectation');
      }
    }, 300);
  }
}

function prefillAffectation(tr) {
  populateInstDropdowns();
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('la-date').value = tr.date || today;
  if (tr.destType === 'institution') {
    document.getElementById('la-dest-inst').value = tr.destVal;
  }
  // Try to prefill vehicle specs from fleet
  let veh = null;
  if (tr.source === 'hq') {
    veh = invGenItems.find(x => String(x.no) === String(tr.itemId));
    if (veh) {
      document.getElementById('la-marque').value = veh.marque || '';
      document.getElementById('la-serie').value  = veh.serie  || '';
    }
  } else {
    veh = invDItems.find(x => x.id === tr.itemId);
    if (veh) {
      document.getElementById('la-marque').value = veh.marque || '';
      document.getElementById('la-serie').value  = veh.serie  || '';
    }
  }
}

function renderTransferts() {
  document.getElementById('transferts-kpis').innerHTML =
    kpiCard('Total transferts', transferts.length, '', 'purple') +
    kpiCard('Véhicules', transferts.filter(t=>t.isVehicule).length, '', 'blue') +
    kpiCard('Avec scan', transferts.filter(t=>t.scanPath && !t.scanPath.includes('Aucun')).length, '', 'green');

  document.getElementById('transferts-tbody').innerHTML = transferts.slice().reverse().map(t =>
    '<tr>' +
    `<td style="font-family:monospace;font-size:10px;color:var(--c600)">${esc(t.uid)}</td>` +
    `<td>${esc(fmtDate(t.date))}</td>` +
    `<td style="color:var(--g800)">${esc(getItemLabel(t))}</td>` +
    `<td>${t.destType === 'institution' ? '<span class="badge badge-purple">Institution</span>' : '<span class="badge badge-gray">Interne</span>'}</td>` +
    `<td style="font-size:11px">${esc(t.fromLabel)}</td>` +
    `<td style="font-size:11px;color:var(--c600)">${esc(t.destVal)}</td>` +
    `<td>${t.isVehicule ? '<span class="badge badge-blue">Oui</span>' : '—'}</td>` +
    `<td>${t.lettrePath ? `<button class="btn btn-secondary btn-sm" onclick="window.dsneLog&&window.dsneLog.showFile('${t.lettrePath.replace(/'/g,"\\'")}')">📄 Voir</button>` : '—'}</td>` +
    `<td>${t.scanPath && t.scanPath !== '' && t.scanName !== 'Aucun fichier' ? `<button class="btn btn-secondary btn-sm" onclick="window.dsneLog&&window.dsneLog.showFile('${t.scanPath.replace(/'/g,"\\'")}')">🖼 Voir</button>` : '—'}</td>` +
    '</tr>'
  ).join('') || '<tr><td colspan="9" class="empty">Aucun transfert enregistré.</td></tr>';
}

function getItemLabel(t) {
  if (t.source === 'hq') {
    const item = invGenItems.find(x => String(x.no) === String(t.itemId));
    return item ? item.description : t.itemId;
  } else {
    const item = invDItems.find(x => x.id === t.itemId);
    return item ? item.desc : t.itemId;
  }
}

/* ══════════════════════════════════════════════════════════
   RÉQUISITIONS
══════════════════════════════════════════════════════════ */
function loadRequisitions() {
  const s = localStorage.getItem('dsne_requisitions');
  return s ? JSON.parse(s) : [];
}
function saveRequisitions_data(arr) { localStorage.setItem('dsne_requisitions', JSON.stringify(arr)); }
let requisitions = loadRequisitions();

function renderRequisitions() {
  const total    = requisitions.length;
  const attente  = requisitions.filter(r=>r.statut==='En attente').length;
  const approuv  = requisitions.filter(r=>r.statut==='Approuvée').length;
  const totalHTG = requisitions.reduce((s,r)=>s+(parseFloat(r.prix)||0)*(parseFloat(r.dureeN)||1),0);
  document.getElementById('req-kpis').innerHTML =
    kpiCard('Total réquisitions', total, '', 'purple') +
    kpiCard('En attente', attente, '', 'amber') +
    kpiCard('Approuvées', approuv, '', 'green') +
    kpiCard('Valeur totale HTG', fmtNum(totalHTG), '', 'blue');

  document.getElementById('req-tbody').innerHTML = requisitions.slice().reverse().map(r =>
    '<tr>' +
    `<td style="font-family:monospace;font-size:10px;color:var(--c600)">${esc(r.uid)}</td>` +
    `<td>${esc(fmtDate(r.date))}</td>` +
    `<td style="font-size:11px">${esc(r.demandeur)}</td>` +
    `<td style="font-size:11px">${esc(r.fournisseur)}</td>` +
    `<td style="color:var(--g800)">${esc(r.desc)}</td>` +
    `<td style="font-size:11px">${esc(r.duree)}</td>` +
    `<td style="font-family:monospace">${fmtNum(r.prix)}</td>` +
    `<td style="font-family:monospace;font-weight:600">${fmtNum(r.total)}</td>` +
    `<td>${statutBadgeReq(r.statut)}</td>` +
    `<td style="display:flex;gap:4px">
       <button class="btn btn-secondary btn-sm" onclick="editRequisition('${r.uid}')">Modifier</button>
       <button class="btn btn-primary btn-sm" onclick="genRequisitionDocxById('${r.uid}')">⬇ .docx</button>
     </td>` +
    '</tr>'
  ).join('') || '<tr><td colspan="10" class="empty">Aucune réquisition.</td></tr>';
}

function statutBadgeReq(s) {
  const map = {'En attente':'badge-amber','Approuvée':'badge-green','Rejetée':'badge-red','Exécutée':'badge-gray'};
  return `<span class="badge ${map[s]||'badge-gray'}">${esc(s)}</span>`;
}

function editRequisition(uid) {
  const r = requisitions.find(x => x.uid === uid);
  if (!r) return;
  document.getElementById('req-modal-title').textContent = 'Modifier réquisition ' + uid;
  document.getElementById('req-edit-id').value   = uid;
  document.getElementById('req-date').value      = r.date;
  document.getElementById('req-demandeur').value = r.demandeur;
  document.getElementById('req-fournisseur').value = r.fournisseur;
  document.getElementById('req-desc').value      = r.desc;
  document.getElementById('req-duree').value     = r.duree;
  document.getElementById('req-prix').value      = r.prix;
  document.getElementById('req-justif').value    = r.justif;
  document.getElementById('req-paiement').value  = r.paiement;
  document.getElementById('req-statut').value    = r.statut;
  openModal('modal-req-add');
}

function saveRequisition() {
  const editUid = document.getElementById('req-edit-id').value;
  const prix    = parseFloat(document.getElementById('req-prix').value)||0;
  const dureeRaw = document.getElementById('req-duree').value.trim();
  const dureeN  = parseFloat(dureeRaw) || 1;
  const obj = {
    date:        document.getElementById('req-date').value,
    demandeur:   document.getElementById('req-demandeur').value.trim(),
    fournisseur: document.getElementById('req-fournisseur').value.trim(),
    desc:        document.getElementById('req-desc').value.trim(),
    duree:       dureeRaw,
    dureeN,
    prix,
    total:       prix * dureeN,
    justif:      document.getElementById('req-justif').value.trim(),
    paiement:    document.getElementById('req-paiement').value,
    statut:      document.getElementById('req-statut').value,
  };
  if (!obj.desc) { alert('Description requise.'); return; }
  if (editUid) {
    const r = requisitions.find(x => x.uid === editUid);
    if (r) Object.assign(r, obj);
  } else {
    obj.uid = genUID('REQ', requisitions);
    requisitions.push(obj);
  }
  saveRequisitions_data(requisitions);
  closeModal('modal-req-add');
  document.getElementById('req-edit-id').value = '';
  document.getElementById('req-modal-title').textContent = 'Nouvelle réquisition';
  renderRequisitions();
  updateRequisitionsXlsx();
  toast('Réquisition enregistrée.', 'success');
}

/* ══════════════════════════════════════════════════════════
   COURRIER / LETTRES (log only — docx generated separately)
══════════════════════════════════════════════════════════ */
function loadCourrier() {
  const s = localStorage.getItem('dsne_courrier');
  return s ? JSON.parse(s) : [];
}
function saveCourrier_data(arr) { localStorage.setItem('dsne_courrier', JSON.stringify(arr)); }
let courrier = loadCourrier();

function logLettre(type, destinataire, objet, lettrePath) {
  const uid = genUID('LTR', courrier);
  courrier.push({
    uid,
    date: new Date().toISOString().split('T')[0],
    type, destinataire, objet, lettrePath
  });
  saveCourrier_data(courrier);
  renderCourrier();
  updateCourrierXlsx();
  return uid;
}

function renderCourrier() {
  document.getElementById('courrier-tbody').innerHTML = courrier.slice().reverse().map(l =>
    '<tr>' +
    `<td style="font-family:monospace;font-size:10px;color:var(--c600)">${esc(l.uid)}</td>` +
    `<td>${esc(fmtDate(l.date))}</td>` +
    `<td><span class="badge badge-purple">${esc(l.type)}</span></td>` +
    `<td style="color:var(--g800)">${esc(l.destinataire)}</td>` +
    `<td style="font-size:11px">${esc(l.objet)}</td>` +
    `<td>${l.lettrePath ? `<button class="btn btn-secondary btn-sm" onclick="window.dsneLog&&window.dsneLog.showFile('${l.lettrePath.replace(/'/g,"\\'")}')">📄 Voir</button>` : '—'}</td>` +
    '</tr>'
  ).join('') || '<tr><td colspan="6" class="empty">Aucune lettre générée.</td></tr>';
}

/* ══════════════════════════════════════════════════════════
   ACCUSÉS DE RÉCEPTION
══════════════════════════════════════════════════════════ */
function loadAccuses() {
  const s = localStorage.getItem('dsne_accuses');
  return s ? JSON.parse(s) : [];
}
function saveAccuses_data(arr) { localStorage.setItem('dsne_accuses', JSON.stringify(arr)); }
let accuses = loadAccuses();

let accuseDocRows = [];

function addAccuseDocRow() {
  accuseDocRows.push({ qte:'', doc:'', remarques:'' });
  renderAccuseDocRows();
}

function renderAccuseDocRows() {
  document.getElementById('ac-docs-list').innerHTML = accuseDocRows.map((row, i) =>
    `<div style="display:grid;grid-template-columns:60px 1fr 1fr auto;gap:6px;margin-bottom:6px;align-items:center">
      <input class="form-input" placeholder="Qté" value="${esc(row.qte)}" oninput="accuseDocRows[${i}].qte=this.value" style="padding:6px 8px">
      <input class="form-input" placeholder="Document" value="${esc(row.doc)}" oninput="accuseDocRows[${i}].doc=this.value" style="padding:6px 8px">
      <input class="form-input" placeholder="Remarques" value="${esc(row.remarques)}" oninput="accuseDocRows[${i}].remarques=this.value" style="padding:6px 8px">
      <button class="btn btn-secondary btn-sm" onclick="accuseDocRows.splice(${i},1);renderAccuseDocRows()">✕</button>
    </div>`
  ).join('');
}

function openAccuseModal() {
  accuseDocRows = [{ qte:'', doc:'', remarques:'' }];
  renderAccuseDocRows();
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('ac-date').value = today;
  openModal('modal-accuse-add');
}

async function saveAccuse() {
  const acc = {
    uid:         genUID('ARD', accuses),
    date:        document.getElementById('ac-date').value,
    nom:         document.getElementById('ac-nom').value.trim(),
    qualite:     document.getElementById('ac-qualite').value.trim(),
    institution: document.getElementById('ac-institution').value.trim(),
    mode:        document.getElementById('ac-mode').value,
    docs:        accuseDocRows.filter(r => r.doc.trim()),
    lettrePath:  '',
  };
  if (!acc.nom || !acc.docs.length) { alert('Nom et au moins un document requis.'); return; }

  accuses.push(acc);
  saveAccuses_data(accuses);
  closeModal('modal-accuse-add');
  renderAccuses();
  updateAccusesXlsx();
  toast('Accusé ' + acc.uid + ' enregistré.', 'success');

  // Generate docx
  if (window.dsneLog) {
    await genAccuseDocx(acc);
  }
}

function renderAccuses() {
  document.getElementById('accuses-kpis').innerHTML =
    kpiCard('Total accusés', accuses.length, '', 'purple') +
    kpiCard('Ce mois', accuses.filter(a => {
      const m = new Date().toISOString().slice(0,7);
      return a.date && a.date.startsWith(m);
    }).length, '', 'blue');

  document.getElementById('accuses-tbody').innerHTML = accuses.slice().reverse().map(a =>
    '<tr>' +
    `<td style="font-family:monospace;font-size:10px;color:var(--c600)">${esc(a.uid)}</td>` +
    `<td>${esc(fmtDate(a.date))}</td>` +
    `<td style="color:var(--g800)">${esc(a.nom)}</td>` +
    `<td style="font-size:11px">${esc(a.qualite)}</td>` +
    `<td style="font-size:11px">${esc(a.institution)}</td>` +
    `<td style="font-size:11px">${a.docs.map(d => esc(d.doc)).join(', ')}</td>` +
    `<td><span class="badge badge-gray">${esc(a.mode)}</span></td>` +
    `<td>${a.lettrePath ? `<button class="btn btn-secondary btn-sm" onclick="window.dsneLog&&window.dsneLog.showFile('${a.lettrePath.replace(/'/g,"\\'")}')">📄 Voir</button>` : '—'}</td>` +
    '</tr>'
  ).join('') || '<tr><td colspan="8" class="empty">Aucun accusé enregistré.</td></tr>';
}

/* ══════════════════════════════════════════════════════════
   DOCX GENERATION (uses docx npm via dynamic import in Electron)
   In browser preview: shows alert. In Electron: writes file.
══════════════════════════════════════════════════════════ */

const SIGNATAIRES = `
Elin BEAUVIN                    Decius PIERRE                    Dr Jean Clervain DORSAINVIL
Chef Service Logistique         ADM Départemental                Directeur Départemental`;

function enteteLines() {
  return [
    'REPUBLIQUE D\'HAÏTI',
    'MINISTERE DE LA SANTE PUBLIQUE ET DE LA POPULATION',
    'DIRECTION SANITAIRE NORD-EST · DSNE',
  ];
}

function fmtDateLong(d) {
  if (!d) d = new Date().toISOString().split('T')[0];
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' });
}

/* All docx generation calls window.dsneLog.saveFile with base64 encoded content.
   The actual docx is built using the `docx` npm package loaded via require() in a
   sandboxed script tag injected at runtime in Electron. For browser preview we skip. */

async function buildAndSaveDocx(subfolder, filename, builderFn) {
  if (!window.dsneLog) {
    alert('Génération .docx disponible uniquement dans l\'app Electron Desktop.\n\nFichier prévu : ' + filename);
    return null;
  }
  try {
    const b64 = await builderFn();
    const res = await window.dsneLog.saveFile({ subfolder, filename, data: b64, encoding: 'base64' });
    if (res.ok) {
      toast('Fichier sauvegardé : ' + filename, 'success');
      await window.dsneLog.showFile(res.path);
      return res.path;
    } else {
      toast('Erreur sauvegarde : ' + res.error, 'error');
      return null;
    }
  } catch(e) {
    toast('Erreur génération : ' + e.message, 'error');
    return null;
  }
}

/* ── Réquisition docx ── */
async function genRequisitionDocxById(uid) {
  const r = requisitions.find(x => x.uid === uid);
  if (r) {
    document.getElementById('req-date').value        = r.date;
    document.getElementById('req-demandeur').value   = r.demandeur;
    document.getElementById('req-fournisseur').value = r.fournisseur;
    document.getElementById('req-desc').value        = r.desc;
    document.getElementById('req-duree').value       = r.duree;
    document.getElementById('req-prix').value        = r.prix;
    document.getElementById('req-justif').value      = r.justif;
    document.getElementById('req-paiement').value    = r.paiement;
    document.getElementById('req-statut').value      = r.statut;
  }
  await genRequisitionDocx();
}

async function genRequisitionDocx() {
  const data = {
    date:        document.getElementById('req-date').value,
    demandeur:   document.getElementById('req-demandeur').value.trim(),
    fournisseur: document.getElementById('req-fournisseur').value.trim(),
    desc:        document.getElementById('req-desc').value.trim(),
    duree:       document.getElementById('req-duree').value.trim(),
    prix:        parseFloat(document.getElementById('req-prix').value)||0,
    justif:      document.getElementById('req-justif').value.trim(),
    paiement:    document.getElementById('req-paiement').value,
  };
  data.total = data.prix * (parseFloat(data.duree)||1);
  const filename = 'REQ-' + (data.date||'').replace(/-/g,'').slice(2) + '-' + data.fournisseur.slice(0,8).replace(/\s/g,'') + '.docx';
  await buildAndSaveDocx('Requisitions', filename, () => buildRequisitionDocxB64(data));
}

async function buildRequisitionDocxB64(d) {
  return await window.electronDocx.buildRequisition(d, SIGNATAIRES, enteteLines(), fmtDateLong(d.date));
}

/* ── Lettre Déplacement ── */
async function genLettreDeplacement() {
  const d = {
    date:      document.getElementById('ld-date').value,
    destNom:   document.getElementById('ld-dest-nom').value.trim(),
    destTitre: document.getElementById('ld-dest-titre').value.trim(),
    marque:    document.getElementById('ld-marque').value.trim(),
    serie:     document.getElementById('ld-serie').value.trim(),
    moteur:    document.getElementById('ld-moteur').value.trim(),
    model:     document.getElementById('ld-model').value.trim(),
    puissance: document.getElementById('ld-puissance').value.trim(),
    couleur:   document.getElementById('ld-couleur').value.trim(),
    plaque:    document.getElementById('ld-plaque').value.trim(),
    annee:     document.getElementById('ld-annee').value.trim(),
    etat:      document.getElementById('ld-etat').value.trim(),
    usage:     document.getElementById('ld-usage').value,
  };
  const filename = 'DEPL-' + (d.date||'').replace(/-/g,'').slice(2) + '-' + d.destNom.split(' ').pop() + '.docx';
  const path = await buildAndSaveDocx('Courrier/Lettres-Deplacement', filename,
    () => window.electronDocx.buildDeplacement(d, SIGNATAIRES, enteteLines(), fmtDateLong(d.date)));
  if (path) {
    logLettre('Déplacement', d.destNom, 'Mise à disposition ' + d.marque + ' ' + d.plaque, path);
    closeModal('modal-lettre-deplacement');
  }
}

/* ── Lettre Engagement ── */
async function genLettreEngagement() {
  const d = {
    date:        document.getElementById('le-date').value,
    prestataire: document.getElementById('le-prestataire').value.trim(),
    objet:       document.getElementById('le-objet').value.trim(),
    details:     document.getElementById('le-details').value.trim(),
  };
  const filename = 'ENG-' + (d.date||'').replace(/-/g,'').slice(2) + '-' + d.prestataire.split(' ').pop() + '.docx';
  const path = await buildAndSaveDocx('Courrier/Lettres-Engagement', filename,
    () => window.electronDocx.buildEngagement(d, SIGNATAIRES, enteteLines(), fmtDateLong(d.date)));
  if (path) {
    logLettre('Engagement', d.prestataire, d.objet, path);
    closeModal('modal-lettre-engagement');
  }
}

/* ── Lettre Restitution ── */
async function genLettreRestitution() {
  const d = {
    date:       document.getElementById('lr-date').value,
    nom:        document.getElementById('lr-nom').value.trim(),
    titre:      document.getElementById('lr-titre').value.trim(),
    marque:     document.getElementById('lr-marque').value.trim(),
    serie:      document.getElementById('lr-serie').value.trim(),
    moteur:     document.getElementById('lr-moteur').value.trim(),
    model:      document.getElementById('lr-model').value.trim(),
    puissance:  document.getElementById('lr-puissance').value.trim(),
    couleur:    document.getElementById('lr-couleur').value.trim(),
    plaque:     document.getElementById('lr-plaque').value.trim(),
    dateRest:   document.getElementById('lr-date-rest').value,
    etat:       document.getElementById('lr-etat').value.trim(),
    accessoires:document.getElementById('lr-accessoires').value.trim(),
  };
  const filename = 'REST-' + (d.date||'').replace(/-/g,'').slice(2) + '-' + d.nom.split(' ').pop() + '.docx';
  const path = await buildAndSaveDocx('Courrier/Lettres-Restitution', filename,
    () => window.electronDocx.buildRestitution(d, SIGNATAIRES, enteteLines(), fmtDateLong(d.date)));
  if (path) {
    logLettre('Restitution', d.nom, 'Restitution ' + d.marque + ' ' + d.plaque, path);
    closeModal('modal-lettre-restitution');
  }
}

/* ── Lettre Affectation ── */
async function genLettreAffectation() {
  populateInstDropdowns();
  const d = {
    date:       document.getElementById('la-date').value,
    destInst:   document.getElementById('la-dest-inst').value,
    resp:       document.getElementById('la-resp').value.trim(),
    respTitre:  document.getElementById('la-resp-titre').value.trim(),
    marque:     document.getElementById('la-marque').value.trim(),
    serie:      document.getElementById('la-serie').value.trim(),
    model:      document.getElementById('la-model').value.trim(),
    moteur:     document.getElementById('la-moteur').value.trim(),
    puissance:  document.getElementById('la-puissance').value.trim(),
    couleur:    document.getElementById('la-couleur').value.trim(),
    plaque:     document.getElementById('la-plaque').value.trim(),
    annee:      document.getElementById('la-annee').value.trim(),
    etat:       document.getElementById('la-etat').value.trim(),
    motif:      document.getElementById('la-motif').value.trim(),
  };
  const filename = 'AFF-' + (d.date||'').replace(/-/g,'').slice(2) + '-' + d.destInst.split(' ').pop().replace(/[()]/g,'') + '.docx';
  const path = await buildAndSaveDocx('Courrier/Lettres-Affectation', filename,
    () => window.electronDocx.buildAffectation(d, SIGNATAIRES, enteteLines(), fmtDateLong(d.date)));
  if (path) {
    logLettre('Affectation', d.destInst, 'Affectation ' + d.marque + ' ' + d.plaque, path);
    // Update transfert lettrePath if last transfert matches
    const lastTr = transferts[transferts.length - 1];
    if (lastTr && lastTr.isVehicule && !lastTr.lettrePath) {
      lastTr.lettrePath = path;
      saveTransferts_data(transferts);
      renderTransferts();
    }
    closeModal('modal-lettre-affectation');
  }
}

/* ── Accusé de réception docx ── */
async function genAccuseDocx(acc) {
  const filename = acc.uid + '.docx';
  const path = await buildAndSaveDocx('Accuses-Reception', filename,
    () => window.electronDocx.buildAccuse(acc, enteteLines(), fmtDateLong(acc.date)));
  if (path) {
    const a = accuses.find(x => x.uid === acc.uid);
    if (a) { a.lettrePath = path; saveAccuses_data(accuses); renderAccuses(); }
  }
}

/* ══════════════════════════════════════════════════════════
   EXCEL EXPORT (progressive local .xlsx)
   Called after every save. Uses ExcelJS via Electron IPC.
══════════════════════════════════════════════════════════ */

async function updateRequisitionsXlsx() {
  if (!window.dsneLog) return;
  try {
    await window.dsneLog.saveFile({
      subfolder: 'Inventaire',
      filename:  'Requisitions.json',
      data:      JSON.stringify(requisitions, null, 2),
      encoding:  'utf8'
    });
  } catch(e) {}
  if (window.electronXlsx) {
    await window.electronXlsx.updateRequisitions(requisitions);
  }
}

async function updateTransfertsXlsx() {
  if (!window.dsneLog) return;
  if (window.electronXlsx) {
    const rows = transferts.map(t => ({
      uid: t.uid, date: t.date, bien: getItemLabel(t),
      de: t.fromLabel, vers: t.destVal, type: t.destType,
      vehicule: t.isVehicule ? 'Oui' : 'Non', obs: t.obs
    }));
    await window.electronXlsx.updateSheet('Transferts', rows);
  }
}

async function updateInvDXlsx() {
  if (!window.dsneLog) return;
  if (window.electronXlsx) {
    await window.electronXlsx.updateSheet('InvDepartemental', invDItems);
  }
}

async function updateCourrierXlsx() {
  if (!window.dsneLog) return;
  if (window.electronXlsx) {
    await window.electronXlsx.updateSheet('Courrier', courrier);
  }
}

async function updateAccusesXlsx() {
  if (!window.dsneLog) return;
  if (window.electronXlsx) {
    const rows = accuses.map(a => ({
      uid: a.uid, date: a.date, nom: a.nom, qualite: a.qualite,
      institution: a.institution, mode: a.mode,
      documents: a.docs.map(d => d.doc).join(' | ')
    }));
    await window.electronXlsx.updateSheet('AccusesReception', rows);
  }
}

/* ══════════════════════════════════════════════════════════
   INVENTAIRE GÉNÉRAL — patch render to add Transférer button
══════════════════════════════════════════════════════════ */
const _origRenderInvGen = typeof renderInvGen !== 'undefined' ? renderInvGen : null;
function renderInvGen() {
  if (_origRenderInvGen) _origRenderInvGen();
  // Patch tbody rows to add Transférer button
  const tbody = document.getElementById('inv-gen-tbody');
  if (!tbody) return;
  // Re-render with transfer button
  const q   = '';
  const svc = document.getElementById('inv-service-filter') ? document.getElementById('inv-service-filter').value : '';
  const et  = document.getElementById('inv-etat-filter') ? document.getElementById('inv-etat-filter').value : '';
  const filtered = invGenItems.filter(function(i) {
    const matchQ   = !q   || i.description.toLowerCase().includes(q);
    const matchSvc = !svc || i.service === svc;
    const matchEt  = !et  || i.etat === et;
    return matchQ && matchSvc && matchEt;
  });
  tbody.innerHTML = filtered.map(function(item) {
    return '<tr>' +
      '<td style="font-family:monospace;font-size:10px;color:var(--g400)">' + esc(item.no) + '</td>' +
      '<td style="color:var(--g800)">' + esc(item.description) + '</td>' +
      '<td style="font-size:11px">' + esc(item.couleur) + '</td>' +
      '<td style="font-family:monospace;font-size:10px">' + esc(item.codification) + '</td>' +
      '<td style="font-size:11px">' + esc(item.marque) + '</td>' +
      '<td style="font-size:11px">' + esc(item.financement) + '</td>' +
      '<td>' + etatBadge(item.etat) + '</td>' +
      '<td style="text-align:center;font-weight:600">' + esc(String(item.qte)) + '</td>' +
      '<td style="font-size:11px;color:var(--g400)">' + esc(item.service) + '</td>' +
      '<td style="display:flex;gap:4px">' +
        '<button class="btn btn-secondary btn-sm" style="padding:3px 8px;font-size:10px" onclick="editInvGen(\'' + String(item.no).replace(/'/g,"\\'") + '\')">Modifier</button>' +
        '<button class="btn btn-primary btn-sm" style="padding:3px 8px;font-size:10px" onclick="openTransfertModal(\'hq\',\'' + String(item.no).replace(/'/g,"\\'") + '\')">Transférer</button>' +
      '</td>' +
      '</tr>';
  }).join('') || '<tr><td colspan="10" class="empty">Aucun résultat.</td></tr>';
}

/* ── Init new modules on boot ── */
document.addEventListener('DOMContentLoaded', function() {
  populateInstDropdowns();
  // Pre-fill today's date on letter modals
  const today = new Date().toISOString().split('T')[0];
  ['ld-date','le-date','lr-date','lr-date-rest','la-date','req-date','ac-date'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = today;
  });
});
