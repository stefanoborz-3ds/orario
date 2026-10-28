/* ---- Impostazioni ---- */
const STORAGE_PREFIX = 'orario3ds:';      // cambialo se usi più orari sullo stesso sito
const START = 6 * 60, END = 23 * 60;      // 6:00 – 23:00
const PPM = 1;                            // pixel per minuto (1 = 60px/ora, vedi --ph nel CSS)
const SNAP = 10;                          // i blocchi si agganciano ogni 10 minuti
const DAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì'];

const COL = {Italiano:'#f4b6a8',Informatica:'#a9d4f5',Inglese:'#f7e08c',Telecomunicazioni:'#c9b8f0',Tedesco:'#f5c58a',
  Storia:'#d4c1a0',Matematica:'#9fdcb4',Motoria:'#f2a8cf',Religione:'#d9d9d9','Sistemi e reti':'#8fd6d6',TPSIT:'#b9e08a',Pausa:'#e3e6ea'};
const PAL = Object.values(COL);

/* ---- Orario di partenza (da 7:50, ore da 50 minuti) ---- */
const SLOTS = [[470,520],[520,570],[570,620],[620,630],[630,680],[680,730],[730,780],[780,830],[830,880],[880,930],[930,980]];
const BASE_RAW = [
  ['Italiano','Informatica','Inglese','Italiano','Informatica'],
  ['','','Telecomunicazioni','Storia',''],
  ['','','Tedesco','Inglese','Inglese'],
  ['INTERVALLO','INTERVALLO','INTERVALLO','INTERVALLO','INTERVALLO'],
  ['Matematica','Matematica','Tedesco','Matematica','Religione'],
  ['Informatica','Motoria','Italiano','','Sistemi e reti'],
  ['Telecomunicazioni','','Storia','','Sistemi e reti'],
  ['Pausa Pranzo','','','','Pausa Pranzo'],
  ['Sistemi e reti','','','','TPSIT'],
  ['TPSIT','','','','Matematica'],
  ['','','','','']
];

/* ---- Utilità ---- */
let uid = 0;
const nid = () => 'b' + Date.now().toString(36) + (uid++);
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const snap = m => Math.round(m / SNAP) * SNAP;
const fmt = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
const parse = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
function mk(tag, cls, txt) { const n = document.createElement(tag); if (cls) n.className = cls; if (txt) n.textContent = txt; return n; }

function base() {
  const out = [];
  for (let d = 0; d < 5; d++) {
    let last = null;
    BASE_RAW.forEach((row, s) => {
      const t = row[d];
      if (!t) { last = null; return; }
      const [a, b] = SLOTS[s];
      if (last && last.text === t && last.start + last.dur === a) { last.dur += b - a; return; }
      last = { id: nid(), text: t, note: '', color: COL[t] || COL.Pausa, day: d, start: a, dur: b - a };
      out.push(last);
    });
  }
  return out;
}

/* ---- Salvataggio (per settimana, nel browser) ---- */
const rd = k => { try { return JSON.parse(localStorage.getItem(STORAGE_PREFIX + k)); } catch (e) { return null; } };
const wr = (k, v) => { try { localStorage.setItem(STORAGE_PREFIX + k, JSON.stringify(v)); } catch (e) {} };
const mondayOf = d => { d = new Date(d); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; };
const iso = d => d.toISOString().slice(0, 10);
let mon = mondayOf(new Date()), blocks = [];

function load() {
  const k = iso(mon);
  let b = rd(k);
  if (!b) {
    let prev = null;
    try {
      const keys = Object.keys(localStorage).filter(x => x.startsWith(STORAGE_PREFIX + '2'))
        .map(x => x.slice(STORAGE_PREFIX.length)).filter(x => x < k).sort();
      if (keys.length) prev = rd(keys[keys.length - 1]);
    } catch (e) {}
    b = (prev || base()).map(x => ({ ...x, id: nid() }));
  }
  blocks = b;
}
const save = () => wr(iso(mon), blocks);

/* ---- Disposizione dei blocchi sovrapposti ---- */
function layout(list) {
  list = [...list].sort((a, b) => a.start - b.start);
  const res = []; let cl = [], ends = [], cend = 0;
  const flush = () => { cl.forEach(c => c.n = ends.length); res.push(...cl); cl = []; ends = []; cend = 0; };
  list.forEach(b => {
    if (cl.length && b.start >= cend) flush();
    let i = ends.findIndex(e => e <= b.start);
    if (i < 0) i = ends.length;
    ends[i] = b.start + b.dur; cend = Math.max(cend, ends[i]);
    cl.push({ b, lane: i });
  });
  flush();
  return res;
}

/* ---- Disegno ---- */
function render() {
  const e = new Date(mon); e.setDate(e.getDate() + 4);
  const f = d => d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  $('wk').textContent = f(mon) + ' – ' + f(e);
  const cal = $('cal'); cal.innerHTML = '';
  const todayIso = iso(new Date());
  cal.append(mk('div', 'hd'));
  DAYS.forEach((d, i) => {
    const x = new Date(mon); x.setDate(x.getDate() + i);
    cal.append(mk('div', 'hd' + (iso(x) === todayIso ? ' oggi' : ''), d + ' ' + x.getDate()));
  });
  const gut = mk('div', 'gut');
  for (let h = START / 60; h <= END / 60; h++) {
    const s = mk('span', '', h + ':00'); s.style.top = (h * 60 - START) * PPM + 'px'; gut.append(s);
  }
  cal.append(gut);
  DAYS.forEach((_, d) => {
    const col = mk('div', 'col'); col.dataset.day = d;
    layout(blocks.filter(b => b.day === d)).forEach(({ b, lane, n }) => {
      const el = blk(b);
      el.style.top = (b.start - START) * PPM + 'px';
      el.style.height = b.dur * PPM + 'px';
      el.style.left = 'calc(' + (lane / n * 100) + '% + 1px)';
      el.style.width = 'calc(' + (100 / n) + '% - 2px)';
      if (b.dur <= 10) el.classList.add('xs'); else if (b.dur < 40) el.classList.add('sm');
      const rz = mk('div', 'rz'); el.append(rz); bindResize(rz, b, el);
      col.append(el);
    });
    cal.append(col);
  });
  const tray = $('tray'); tray.innerHTML = '';
  blocks.filter(b => b.day < 0).forEach(b => tray.append(blk(b, true)));
}
function blk(b, tray) {
  const n = mk('div', 'b'); n.style.background = b.color; n.dataset.id = b.id;
  n.append(mk('span', '', b.text));
  const small = b.note || (tray ? (b.dur + ' min') : (b.dur >= 40 ? fmt(b.start) + '–' + fmt(b.start + b.dur) : ''));
  if (small) n.append(mk('small', '', small));
  n.addEventListener('pointerdown', ev => down(ev, b, n, tray));
  return n;
}

/* ---- Trascinamento ---- */
let D = null;
function down(ev, b, n, tray) {
  if (ev.button > 0) return;
  const r = n.getBoundingClientRect();
  D = { b, n, x: ev.clientX, y: ev.clientY, oy: tray ? 10 : ev.clientY - r.top, on: false, g: null };
  n.setPointerCapture(ev.pointerId);
  n.onpointermove = move; n.onpointerup = up; n.onpointercancel = up;
}
const hit = (x, y) => { const t = document.elementFromPoint(x, y); return t ? (t.closest('.col') || t.closest('#tray')) : null; };
function move(ev) {
  if (!D) return;
  if (!D.on) {
    if (Math.hypot(ev.clientX - D.x, ev.clientY - D.y) < 6) return;
    D.on = true; D.n.classList.add('drag');
    D.g = D.n.cloneNode(true); D.g.className = 'b ghost';
    D.g.style.height = clamp(D.b.dur * PPM, 24, 80) + 'px';
    D.g.style.position = 'fixed';
    document.body.append(D.g);
  }
  D.g.style.left = (ev.clientX - 70) + 'px';
  D.g.style.top = (ev.clientY - Math.min(D.oy, 24)) + 'px';
  document.querySelectorAll('.over').forEach(x => x.classList.remove('over'));
  const t = hit(ev.clientX, ev.clientY); if (t) t.classList.add('over');
}
function up(ev) {
  if (!D) return;
  const d = D; D = null;
  d.n.onpointermove = d.n.onpointerup = d.n.onpointercancel = null;
  document.querySelectorAll('.over').forEach(x => x.classList.remove('over'));
  if (!d.on) { edit(d.b); return; }          // tocco semplice = modifica
  d.g.remove();
  const t = hit(ev.clientX, ev.clientY);
  if (t) {
    if (t.id === 'tray') { d.b.day = -1; }
    else {
      const r = t.getBoundingClientRect();
      const y = ev.clientY - r.top - Math.min(d.oy, 24);
      d.b.day = +t.dataset.day;
      d.b.start = clamp(snap(y / PPM + START), START, END - d.b.dur);
    }
    save();
  }
  render();
}
function bindResize(rz, b, el) {
  rz.addEventListener('pointerdown', ev => {
    ev.stopPropagation();
    const y0 = ev.clientY, d0 = b.dur;
    rz.setPointerCapture(ev.pointerId);
    rz.onpointermove = e => {
      b.dur = clamp(snap(d0 + (e.clientY - y0) / PPM), SNAP, END - b.start);
      el.style.height = b.dur * PPM + 'px';
    };
    rz.onpointerup = rz.onpointercancel = () => { rz.onpointermove = rz.onpointerup = rz.onpointercancel = null; save(); render(); };
  });
}

/* ---- Finestra di modifica ---- */
let cur = null, curCol = PAL[0];
const dlg = $('dlg');
PAL.forEach(c => { const i = mk('i'); i.style.background = c; i.onclick = () => { curCol = c; mark(); }; $('sw').append(i); });
const mark = () => [...$('sw').children].forEach((i, k) => i.classList.toggle('on', PAL[k] === curCol));
$('dd').append(new Option('Libero (non posizionato)', -1));
DAYS.forEach((d, i) => $('dd').append(new Option(d, i)));

function edit(b) {
  cur = b; curCol = b.color; mark();
  $('dt').value = b.text; $('dn').value = b.note || '';
  $('dd').value = b.day; $('ds').value = fmt(b.start); $('de').value = fmt(b.start + b.dur);
  $('del').style.visibility = blocks.includes(b) ? 'visible' : 'hidden';
  dlg.showModal();
}
$('ok').onclick = () => {
  if (!$('dt').value.trim()) { $('dt').focus(); return; }
  let s = clamp(parse($('ds').value || '08:00'), START, END - SNAP);
  let e = clamp(parse($('de').value || '09:00'), s + SNAP, END);
  Object.assign(cur, { text: $('dt').value.trim(), note: $('dn').value.trim(), color: curCol, day: +$('dd').value, start: s, dur: e - s });
  if (!blocks.includes(cur)) blocks.push(cur);
  save(); render(); dlg.close();
};
$('cx').onclick = () => dlg.close();
$('del').onclick = () => { blocks = blocks.filter(x => x !== cur); save(); render(); dlg.close(); };
$('add').onclick = () => edit({ id: nid(), text: '', note: '', color: PAL[0], day: -1, start: 480, dur: 60 });

/* ---- Navigazione tra settimane ---- */
const go = n => { mon.setDate(mon.getDate() + n); load(); render(); };
$('prev').onclick = () => go(-7);
$('next').onclick = () => go(7);
$('today').onclick = () => { mon = mondayOf(new Date()); load(); render(); };
$('reset').onclick = () => { if (confirm('Ripristinare l’orario base per questa settimana?')) { blocks = base(); save(); render(); } };

load(); render();
$('wrap').scrollTop = (450 - START) * PPM;   // parte da circa le 7:30
