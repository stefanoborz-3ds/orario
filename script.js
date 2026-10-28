const STORAGE_PREFIX='orario3ds:';
const DAYS=['Lunedì','Martedì','Mercoledì','Giovedì','Venerdì'];
/* Righe dell'orario dalle 6 alle 23: puoi cambiarle o aggiungerne. Le righe con "s" sono basse (intervallo). */
const SLOTS=['6:00-7:00','7:00-7:50','7:50-8:40','8:40-9:30','9:30-10:20','10:20-10:30','10:30-11:20','11:20-12:10','12:10-13:00','13:00-13:50','13:50-14:40','14:40-15:30','15:30-16:20','16:20-17:00','17:00-18:00','18:00-19:00','19:00-20:00','20:00-21:00','21:00-22:00','22:00-23:00'];
const SMALL=[5];
const COL={Italiano:'#f4b6a8',Informatica:'#a9d4f5',Inglese:'#f7e08c',Telecomunicazioni:'#c9b8f0',Tedesco:'#f5c58a',Storia:'#d4c1a0',Matematica:'#9fdcb4',Motoria:'#f2a8cf',Religione:'#d9d9d9','Sistemi e reti':'#8fd6d6',TPSIT:'#b9e08a',Pausa:'#e6e4dc'};
const PAL=Object.values(COL);
const OFF=2; // le lezioni iniziano alla riga 7:50
const BASE_RAW=[
['Italiano','Informatica','Inglese','Italiano','Informatica'],
['','','Telecomunicazioni','Storia',''],
['','','Tedesco','Inglese','Inglese'],
['INTERVALLO','','','',''],
['Matematica','Matematica','Tedesco','Matematica','Religione'],
['Informatica','Motoria','Italiano','','Sistemi e reti'],
['Telecomunicazioni','','Storia','','Sistemi e reti'],
['Pausa Pranzo','','','','Pausa Pranzo'],
['Sistemi e reti','','','','TPSIT'],
['TPSIT','','','','Matematica']];
let uid=0;const nid=()=>'b'+Date.now().toString(36)+(uid++);
function base(){const o=[];BASE_RAW.forEach((r,s)=>r.forEach((t,d)=>{if(t)o.push({id:nid(),text:t,note:'',color:COL[t]||COL.Pausa,day:d,slot:s+OFF})}));return o}
const ld=k=>{try{return JSON.parse(localStorage.getItem(STORAGE_PREFIX+k))}catch(e){return null}};
const sv=(k,v)=>{try{localStorage.setItem(STORAGE_PREFIX+k,JSON.stringify(v))}catch(e){}};
const mondayOf=d=>{d=new Date(d);d.setHours(12,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return d};
const iso=d=>d.toISOString().slice(0,10);
let mon=mondayOf(new Date()),blocks=[];
function load(){
  const k=iso(mon);let b=ld(k);
  if(!b){
    let prev=null;
    try{const keys=Object.keys(localStorage).filter(x=>x.startsWith(STORAGE_PREFIX+'2')).map(x=>x.slice(STORAGE_PREFIX.length)).filter(x=>x<k).sort();
      if(keys.length)prev=ld(keys[keys.length-1]);}catch(e){}
    b=(prev||base()).map(x=>({...x,id:nid()}));
  }
  blocks=b;
}
const save=()=>sv(iso(mon),blocks);
function el(t,c,x){const n=document.createElement(t);n.className=c;if(x)n.textContent=x;return n}
function render(){
  const e=new Date(mon);e.setDate(e.getDate()+4);
  const f=d=>d.toLocaleDateString('it-IT',{day:'numeric',month:'short'});
  document.getElementById('wk').textContent=f(mon)+' – '+f(e);
  const g=document.getElementById('grid');g.innerHTML='';
  g.append(el('div','h',''));
  DAYS.forEach((d,i)=>{const x=new Date(mon);x.setDate(x.getDate()+i);g.append(el('div','h',d+' '+x.getDate()))});
  SLOTS.forEach((t,s)=>{
    g.append(el('div','t',t));
    DAYS.forEach((_,d)=>{
      const c=el('div','c'+(SMALL.includes(s)?' s':''));c.dataset.day=d;c.dataset.slot=s;
      blocks.filter(b=>b.day==d&&b.slot==s).forEach(b=>c.append(blk(b)));
      g.append(c);
    });
  });
  const tr=document.getElementById('tray');tr.innerHTML='';
  blocks.filter(b=>b.day<0).forEach(b=>tr.append(blk(b)));
}
function blk(b){
  const n=el('div','b');n.style.background=b.color;n.dataset.id=b.id;
  n.append(el('span','',b.text));if(b.note)n.append(el('small','',b.note));
  n.addEventListener('pointerdown',ev=>down(ev,b,n));
  n.addEventListener('dblclick',()=>edit(b));
  return n;
}
let D=null;
function down(ev,b,n){
  if(ev.button>0)return;
  D={b,n,x:ev.clientX,y:ev.clientY,on:false,g:null};
  n.setPointerCapture(ev.pointerId);
  n.onpointermove=move;n.onpointerup=up;n.onpointercancel=up;
}
function target(x,y){const t=document.elementFromPoint(x,y);if(!t)return null;return t.closest('.c')||t.closest('.tray')}
function move(ev){
  if(!D)return;
  if(!D.on){if(Math.hypot(ev.clientX-D.x,ev.clientY-D.y)<6)return;
    D.on=true;D.n.classList.add('drag');
    D.g=D.n.cloneNode(true);D.g.classList.add('ghost');D.g.classList.remove('drag');document.body.append(D.g);}
  D.g.style.left=(ev.clientX-65)+'px';D.g.style.top=(ev.clientY-20)+'px';
  document.querySelectorAll('.over').forEach(x=>x.classList.remove('over'));
  const t=target(ev.clientX,ev.clientY);if(t)t.classList.add('over');
}
function up(ev){
  if(!D)return;
  const d=D;D=null;d.n.onpointermove=d.n.onpointerup=d.n.onpointercancel=null;
  document.querySelectorAll('.over').forEach(x=>x.classList.remove('over'));
  if(!d.on)return;
  d.g.remove();
  const t=target(ev.clientX,ev.clientY);
  if(t){
    if(t.classList.contains('tray')){d.b.day=-1;d.b.slot=-1}
    else{
      const day=+t.dataset.day,slot=+t.dataset.slot;
      const o=blocks.find(x=>x!==d.b&&x.day==day&&x.slot==slot);
      if(o){o.day=d.b.day;o.slot=d.b.slot}
      d.b.day=day;d.b.slot=slot;
    }
    save();
  }
  render();
}
let cur=null,curCol=PAL[0];
const $=id=>document.getElementById(id);
PAL.forEach(c=>{const i=document.createElement('i');i.style.background=c;i.onclick=()=>{curCol=c;mark()};$('sw').append(i)});
function mark(){[...$('sw').children].forEach((i,k)=>i.classList.toggle('on',PAL[k]===curCol))}
function edit(b){
  cur=b;$('dt').value=b.text;$('dn').value=b.note||'';curCol=b.color;mark();
  $('del').style.display=blocks.includes(b)?'':'none';
  $('dlg').showModal();
}
$('ok').onclick=()=>{
  if(!$('dt').value.trim())return;
  cur.text=$('dt').value.trim();cur.note=$('dn').value.trim();cur.color=curCol;
  if(!blocks.includes(cur))blocks.push(cur);
  save();render();$('dlg').close();
};
$('cx').onclick=()=>$('dlg').close();
$('del').onclick=()=>{blocks=blocks.filter(x=>x!==cur);save();render();$('dlg').close()};
$('add').onclick=()=>edit({id:nid(),text:'',note:'',color:PAL[0],day:-1,slot:-1});
$('prev').onclick=()=>{mon.setDate(mon.getDate()-7);load();render()};
$('next').onclick=()=>{mon.setDate(mon.getDate()+7);load();render()};
$('today').onclick=()=>{mon=mondayOf(new Date());load();render()};
$('reset').onclick=()=>{if(confirm('Ripristinare l’orario base per questa settimana?')){blocks=base();save();render()}};
load();render();
