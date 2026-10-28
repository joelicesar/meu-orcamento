'use strict';
/* Meu Orçamento — app local (dados ficam só no aparelho). */

// ---------- Catálogo ----------
const DEFAULT_CATS = [
  // saídas (fixed = conta fixa; false = variável)
  {id:'financiamento',name:'Financiamento',ico:'🏦',color:'#0ea5e9',type:'out',fixed:true},
  {id:'carro',name:'Carro',ico:'🚗',color:'#64748b',type:'out',fixed:false},
  {id:'mercado',name:'Mercado e Feira',ico:'🛒',color:'#16a34a',type:'out',fixed:false},
  {id:'casa',name:'Compras de Casa',ico:'🏠',color:'#d97706',type:'out',fixed:false},
  {id:'contas',name:'Luz, Água, Internet',ico:'💡',color:'#eab308',type:'out',fixed:true},
  {id:'aluguel',name:'Aluguel e Condomínio',ico:'🔑',color:'#7c3aed',type:'out',fixed:true},
  {id:'educacao',name:'Educação',ico:'📚',color:'#2563eb',type:'out',fixed:true},
  {id:'assinaturas',name:'Assinaturas',ico:'📺',color:'#db2777',type:'out',fixed:true},
  {id:'pet',name:'PET',ico:'🐶',color:'#a16207',type:'out',fixed:true},
  {id:'doacoes',name:'Doações e Pacto',ico:'🤝',color:'#0d9488',type:'out',fixed:true},
  {id:'lazer',name:'Lanches e Lazer',ico:'🍔',color:'#f97316',type:'out',fixed:false},
  {id:'saude',name:'Saúde e Farmácia',ico:'💊',color:'#dc2626',type:'out',fixed:false},
  {id:'presentes',name:'Presentes',ico:'🎁',color:'#ec4899',type:'out',fixed:false},
  {id:'roupas',name:'Roupas',ico:'👕',color:'#8b5cf6',type:'out',fixed:false},
  {id:'filha',name:'Filha',ico:'🧒',color:'#f472b6',type:'out',fixed:false},
  {id:'trabalho',name:'Compras a trabalho',ico:'🧳',color:'#0891b2',type:'out',fixed:false,reimb:true},
  {id:'transporte',name:'Uber e Transporte',ico:'🚌',color:'#475569',type:'out',fixed:false},
  {id:'impostos',name:'Taxas e Impostos',ico:'🧾',color:'#b45309',type:'out',fixed:true},
  {id:'cartao_elen',name:'Cartão da família',ico:'💳',color:'#be185d',type:'out',fixed:true},
  {id:'juros',name:'Juros e Tarifas',ico:'⚠️',color:'#b91c1c',type:'out',fixed:false},
  {id:'outros',name:'Outros',ico:'📦',color:'#94a3b8',type:'out',fixed:false},
  // investimento
  {id:'investimentos',name:'Reserva de Investimento',ico:'📈',color:'#6d28d9',type:'inv',fixed:false},
  // entradas
  {id:'salario',name:'Salário',ico:'💼',color:'#15803d',type:'in'},
  {id:'relatorio_fixo',name:'Relatório Fixo',ico:'📄',color:'#16a34a',type:'in'},
  {id:'vale',name:'Vale Alimentação',ico:'🍽️',color:'#22c55e',type:'in'},
  {id:'rel_viagens',name:'Relatório de Viagens',ico:'✈️',color:'#0891b2',type:'in'},
  {id:'ferias',name:'Férias',ico:'🏖️',color:'#0ea5e9',type:'in'},
  {id:'decimo',name:'13º Salário',ico:'🎄',color:'#ca8a04',type:'in'},
  {id:'rendimentos',name:'Rendimentos',ico:'💹',color:'#7c3aed',type:'in'},
  {id:'reembolsos',name:'Reembolsos',ico:'↩️',color:'#14b8a6',type:'in'},
  {id:'outras_rec',name:'Outras Receitas',ico:'💰',color:'#65a30d',type:'in'},
];
const DEFAULT_PAYS = [
  {id:'debito',name:'Débito / Pix / Dinheiro',ico:'💵',kind:'conta'},
  {id:'bradesco',name:'Cartão Bradesco',ico:'💳',kind:'cartao'},
  {id:'santander',name:'Cartão Santander',ico:'💳',kind:'cartao'},
  {id:'mercadopago',name:'Mercado Pago',ico:'💳',kind:'cartao'},
];
const DEFAULT_BUDGET = {};
const TYPE_LABEL = {out:'Saída', in:'Entrada', inv:'Investir'};
const MONTHS = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

// ---------- Estado ----------
const KEY = 'meu-orcamento-v1';
let S;
function load(){
  try{ S = JSON.parse(localStorage.getItem(KEY)); }catch(e){ S = null; }
  if(S) S.pays.forEach(p=>{ if(!p.kind) p.kind = p.id==='debito'?'conta':'cartao'; });
  if(!S){
    S = {tx: (window.SEED_TX||[]).slice(), cats: DEFAULT_CATS.map(c=>({...c})), pays: DEFAULT_PAYS.map(p=>({...p})),
         budget: {}, opening: {month:new Date().toISOString().slice(0,7), balance:0}, theme:'auto'};
    save();
  }
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){ toast('Não foi possível salvar (armazenamento cheio?)'); } }
function migrate(){
  if(!S.mig) S.mig = {};
  if(!S.mig.trabalho){ if(!S.cats.some(c=>c.id==='trabalho')) S.cats.push({...DEFAULT_CATS.find(c=>c.id==='trabalho')}); S.mig.trabalho=1; }
  if(!S.rules) S.rules = {};
  save();
}
load();
migrate();

const ui = {tab:'home', ym: new Date().toISOString().slice(0,7), filter:'all', q:'', f:{}, back:'home'};

// ---------- Utilidades ----------
const $ = s=>document.querySelector(s);
const brl = v => (v<0?'-':'') + 'R$ ' + Math.abs(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const brl0 = v => (v<0?'-':'') + 'R$ ' + Math.abs(Math.round(v)).toLocaleString('pt-BR');
const pct = v => (isFinite(v)? (v*100).toFixed(0):'0') + '%';
const esc = s => String(s??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cat = id => S.cats.find(c=>c.id===id) || {id, name:id, ico:'❓', color:'#94a3b8', type:'out'};
const pay = id => S.pays.find(p=>p.id===id) || S.pays[0];
const ymLabel = ym => { const [y,m]=ym.split('-'); return MONTHS[+m-1]+' '+y; };
const shiftYm = (ym,d)=>{ let [y,m]=ym.split('-').map(Number); m+=d; while(m>12){m-=12;y++} while(m<1){m+=12;y--} return y+'-'+String(m).padStart(2,'0'); };
// Competência = mês em que a despesa pesa no orçamento. Compra no cartão cai no mês da fatura, não no da compra.
const cm = t => t.comp || t.date.slice(0,7);
const isCard = id => (S.pays.find(p=>p.id===id)||{}).kind==='cartao';
function defaultComp(date, payId){
  const p = S.pays.find(x=>x.id===payId)||{}, ym = date.slice(0,7), day = +date.slice(8,10);
  if(p.closing && p.due) return shiftYm(ym, (day>p.closing?1:0) + (p.due<=p.closing?1:0)); // fecha no dia X, vence no dia Y
  return shiftYm(ym, 1); // sem dias configurados: assume a fatura do mês seguinte
}
const parseMoney = v => { const a=parseFloat(String(v).replace(/\./g,'').replace(',','.')); return isNaN(a)? parseFloat(String(v).replace(',','.')) : a; };
const today = ()=> new Date().toISOString().slice(0,10);
const uid = ()=> Date.now().toString(36)+Math.random().toString(36).slice(2,6);
function fmtDay(d){
  const dt = new Date(d+'T12:00:00'); const t = today();
  if(d===t) return 'Hoje';
  const y = new Date(); y.setDate(y.getDate()-1);
  if(d===y.toISOString().slice(0,10)) return 'Ontem';
  return dt.toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'short'});
}
let toastT;
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('show'),2200); }

// ---------- Cálculos (equivalem às fórmulas da planilha) ----------
function monthTx(ym){ return S.tx.filter(t=>cm(t)===ym); }
function totals(ym){
  const tx = monthTx(ym); const r = {in:0,out:0,inv:0,byCat:{},fixed:0,variable:0,byPay:{}};
  for(const t of tx){
    if(t.type==='in'){ r.in+=t.amount; continue; }
    if(t.type==='inv'){ r.inv+=t.amount; r.byCat[t.cat]=(r.byCat[t.cat]||0)+t.amount; continue; }
    r.out+=t.amount; r.byCat[t.cat]=(r.byCat[t.cat]||0)+t.amount;
    if(cat(t.cat).fixed) r.fixed+=t.amount; else r.variable+=t.amount;
    r.byPay[t.pay]=(r.byPay[t.pay]||0)+t.amount;
  }
  r.surplus = r.in - r.out;               // SUP/DEF "sem reservas"
  r.net = r.in - r.out - r.inv;           // o que realmente sobra no caixa
  return r;
}
// Saldo que vem do mês anterior = saldo inicial + tudo que entrou − tudo que saiu antes deste mês
function openingBalance(ym){
  const o = S.opening; let b = 0;
  if(ym > o.month) b = o.balance;
  else return o.month===ym ? o.balance : 0;
  for(const t of S.tx){
    const m = cm(t);
    if(m < o.month || m >= ym) continue;
    b += t.type==='in' ? t.amount : -t.amount;
  }
  return b;
}
function yearsWithData(){ const ys = new Set(S.tx.map(t=>cm(t).slice(0,4))); ys.add(ui.ym.slice(0,4)); return [...ys].sort(); }

// ---------- Gráficos (SVG simples, funcionam offline) ----------
function donut(parts, size=140){
  const total = parts.reduce((a,p)=>a+p.v,0); if(!total) return '';
  const r=size/2-12, c=2*Math.PI*r; let off=0;
  const segs = parts.map(p=>{ const len=p.v/total*c; const s=`<circle r="${r}" cx="${size/2}" cy="${size/2}" fill="none" stroke="${p.color}" stroke-width="22" stroke-dasharray="${len} ${c-len}" stroke-dashoffset="${-off}" transform="rotate(-90 ${size/2} ${size/2})"/>`; off+=len; return s; }).join('');
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="Gastos por categoria">${segs}<text x="50%" y="48%" text-anchor="middle" font-size="11" fill="var(--muted)">gasto</text><text x="50%" y="62%" text-anchor="middle" font-size="14" font-weight="800" fill="var(--ink)">${brl0(total)}</text></svg>`;
}
function bars(data){ // data: [{label,a,b}] a=entradas, b=saídas
  const W=340,H=170,pad=22,max=Math.max(1,...data.flatMap(d=>[d.a,d.b]));
  const bw=(W-pad)/data.length;
  const g = data.map((d,i)=>{
    const x=pad+i*bw, ha=d.a/max*(H-40), hb=d.b/max*(H-40), w=bw*.36;
    return `<rect x="${x+bw*.1}" y="${H-20-ha}" width="${w}" height="${ha}" rx="3" fill="var(--in)" opacity=".85"/>`+
           `<rect x="${x+bw*.1+w+2}" y="${H-20-hb}" width="${w}" height="${hb}" rx="3" fill="var(--out)" opacity=".9"/>`+
           `<text x="${x+bw/2}" y="${H-5}" text-anchor="middle" font-size="9" fill="var(--muted)">${d.label}</text>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Entradas e saídas por mês">${g}</svg>`;
}

// ---------- Telas ----------
function itemRow(t){
  const c=cat(t.cat), sign=t.type==='in'?'+':'−', cls=t.type;
  const p = t.type==='out' && t.pay!=='debito' ? ` · ${esc(pay(t.pay).name)}` : '';
  const x = (t.inst?` · parcela ${t.inst}`:'') + (t.comp && t.comp!==t.date.slice(0,7) ? ` · compra ${t.date.slice(8,10)}/${t.date.slice(5,7)}`:'')
    + (t.type==='out' && cat(t.cat).reimb ? (t.reimbId ? ` · reembolsado em ${t.reimbDate.slice(8)}/${t.reimbDate.slice(5,7)}` : ' · a receber') : '');
  return `<button class="item" data-act="edit" data-id="${t.id}">
    <span class="ico" style="background:${c.color}22">${c.ico}</span>
    <span class="t"><b>${esc(t.note||c.name)}</b><small class="muted">${esc(c.name)}${p}${x}</small></span>
    <span class="amt ${cls}">${sign} ${brl(t.amount)}</span></button>`;
}

function viewHome(){
  const ym=ui.ym, T=totals(ym), prev=openingBalance(ym);
  const spentPct = T.in ? (T.out+T.inv)/T.in : 0;
  const meterCls = spentPct>1?'bad':spentPct>.9?'warn':'ok';
  const cats = Object.entries(T.byCat).filter(([id])=>cat(id).type==='out').sort((a,b)=>b[1]-a[1]);
  const top = cats.slice(0,6), rest = cats.slice(6).reduce((a,[,v])=>a+v,0);
  const parts = top.map(([id,v])=>({v,color:cat(id).color,name:cat(id).name}));
  if(rest>0) parts.push({v:rest,color:'#94a3b8',name:'Demais'});
  // alertas de orçamento
  const alerts = Object.entries(S.budget).filter(([id,l])=>l>0 && (T.byCat[id]||0) > l*0.9).map(([id,l])=>({id,l,v:T.byCat[id]||0}));
  const cards = S.pays.filter(p=>p.kind==='cartao' && T.byPay[p.id]);
  const last = monthTx(ym).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
  const sobra = T.net;
  const pend = pendingReimb(), pendTot = pend.reduce((a,t)=>a+t.amount,0);
  const future = [1,2,3].map(k=>{ const m=shiftYm(ym,k); return {ym:m, v:monthTx(m).filter(t=>t.type==='out'&&isCard(t.pay)).reduce((a,t)=>a+t.amount,0)}; });
  return `
  <section class="hero">
    <small>${sobra>=0?'Sobra do mês':'Faltam no mês'}</small>
    <div class="big">${brl(sobra)}</div>
    <div class="row">
      <div class="pill"><small>Entradas</small><b>${brl0(T.in)}</b></div>
      <div class="pill"><small>Saídas</small><b>${brl0(T.out)}</b></div>
      <div class="pill"><small>Investido</small><b>${brl0(T.inv)}</b></div>
    </div>
    <div class="meter"><i style="width:${Math.min(100,spentPct*100)}%"></i></div>
    <small>${T.in? `Você usou ${pct(spentPct)} da renda do mês`:'Registre suas entradas para acompanhar'} · saldo anterior ${brl0(prev)}</small>
  </section>
  ${pend.length?`<button class="card" data-act="reimb-open" style="text-align:left;width:100%;border:1.5px solid var(--brand)"><div class="between"><div><h3 style="margin:0 0 4px">💼 Reembolsos a receber</h3><b style="font-size:1.4rem">${brl(pendTot)}</b> <span class="muted small">· ${pend.length} compra(s)</span></div><span class="tag" style="background:var(--brand);color:var(--brand-ink)">Registrar</span></div></button>`:''}
  ${T.in+T.out+T.inv===0 ? `<div class="card empty"><b>🌱</b>Nada lançado em ${ymLabel(ym)}.<br>Toque no <b style="display:inline;font-size:1rem">+</b> para começar.</div>`:''}
  ${alerts.length?`<section class="card"><h3>⚠ Atenção ao orçamento</h3>${alerts.map(a=>{const over=a.v>a.l;return `<div class="between small" style="padding:4px 0"><span>${cat(a.id).ico} ${esc(cat(a.id).name)}</span><b class="${over?'bad':'warn'}">${over?'estourou ':'quase '}${brl0(a.v)} / ${brl0(a.l)}</b></div>`}).join('')}</section>`:''}
  ${parts.length?`<button class="card" data-act="go-cats" style="text-align:left;width:100%"><div class="between"><h3 style="margin:0 0 10px">Para onde foi o dinheiro</h3><span class="muted small">Detalhar ›</span></div><div class="donutbox">${donut(parts)}<div class="legend">${parts.map(p=>`<div><i style="background:${p.color}"></i><span>${esc(p.name)}</span><b>${pct(p.v/T.out)}</b></div>`).join('')}</div></div></button>`:''}
  ${cards.length?`<section class="card"><div class="between"><h3>Faturas dos cartões</h3><span class="muted small">Ver lista ›</span></div>${cards.map(p=>`<button class="between" data-act="go-pay" data-id="${p.id}" style="padding:10px 0;width:100%;border-top:1px solid var(--line)"><span>${p.ico} ${esc(p.name)}</span><b>${brl(T.byPay[p.id])} ›</b></button>`).join('')}</section>`:''}
  ${future.some(f=>f.v>0)?`<button class="card" data-act="go-future" style="text-align:left;width:100%"><div class="between"><h3>Já comprometido nas próximas faturas</h3><span class="muted small">Ver lista ›</span></div>${future.map(f=>`<div class="between" style="padding:6px 0"><span style="text-transform:capitalize">${ymLabel(f.ym)}</span><b>${brl(f.v)}</b></div>`).join('')}</button>`:''}
  ${last.length?`<section class="card"><h3>Últimos lançamentos</h3><div class="list">${last.map(itemRow).join('')}</div><button class="btn ghost" style="margin-top:10px" data-tab-go="tx">Ver todos</button></section>`:''}`;
}

function viewTx(){
  const f = ui.f||{}, active = f.cat||f.pay||f.future;
  let list = f.future ? [1,2,3].flatMap(k=>monthTx(shiftYm(ui.ym,k))).filter(t=>t.type==='out'&&isCard(t.pay)) : monthTx(ui.ym);
  if(f.cat) list = list.filter(t=>t.cat===f.cat);
  if(f.pay) list = list.filter(t=>t.pay===f.pay);
  if(ui.filter!=='all') list = list.filter(t=>t.type===ui.filter);
  const q = ui.q.trim().toLowerCase();
  if(q) list = list.filter(t=> (t.note||'').toLowerCase().includes(q) || cat(t.cat).name.toLowerCase().includes(q));
  list.sort(f.future ? (a,b)=>cm(a).localeCompare(cm(b)) || b.date.localeCompare(a.date) : (a,b)=>b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const key = t => f.future ? cm(t) : t.date;
  const groups = {}; list.forEach(t=>(groups[key(t)]=groups[key(t)]||[]).push(t));
  const F=[['all','Todos'],['out','Saídas'],['in','Entradas'],['inv','Investimentos']];
  const title = f.future ? 'Compras nas próximas faturas' : [f.cat&&cat(f.cat).name, f.pay&&('Fatura '+pay(f.pay).name)].filter(Boolean).join(' · ');
  const sum = list.reduce((a,t)=>a+(t.type==='in'?0:t.amount),0);
  return `
  ${active?`<div class="card-box"><button class="chip" data-act="back-f" style="margin-bottom:8px">‹ Voltar</button>
    <div class="between"><div><b>${esc(title)}</b><div class="small muted">${f.future?'próximos 3 meses':ymLabel(ui.ym)} · ${list.length} lançamento(s)</div></div><b style="font-size:1.2rem">${brl(sum)}</b></div>
    <button class="chip" data-act="clear-f" style="margin-top:8px">✕ Ver todos os lançamentos</button></div>`
   :`<button class="btn ghost" data-act="imp-open">📥 Importar fatura do cartão (PDF)</button>`}
  <input type="search" id="q" placeholder="🔍 Buscar lançamento ou categoria" value="${esc(ui.q)}">
  <div class="chips">${F.map(([k,l])=>`<button class="chip ${ui.filter===k?'on':''}" data-filter="${k}">${l}</button>`).join('')}</div>
  ${list.length? Object.entries(groups).map(([g,items])=>`<div class="daytitle">${f.future?`<span style="text-transform:capitalize">${ymLabel(g)}</span> · ${brl(items.reduce((a,t)=>a+t.amount,0))}`:fmtDay(g)}</div><div class="card"><div class="list">${items.map(itemRow).join('')}</div></div>`).join('')
   : `<div class="card empty"><b>🧾</b>Nenhum lançamento encontrado.</div>`}`;
}

function viewCats(){
  const T=totals(ui.ym), P=totals(shiftYm(ui.ym,-1));
  const rows=Object.entries(T.byCat).filter(([id])=>cat(id).type==='out').sort((a,b)=>b[1]-a[1]);
  const cnt={}; monthTx(ui.ym).forEach(t=>{ if(t.type==='out') cnt[t.cat]=(cnt[t.cat]||0)+1; });
  const parts=rows.slice(0,7).map(([id,v])=>({v,color:cat(id).color}));
  const rest=rows.slice(7).reduce((a,[,v])=>a+v,0); if(rest>0) parts.push({v:rest,color:'#94a3b8'});
  const max=rows.length?rows[0][1]:1;
  return `
  <button class="chip" data-act="go-home" style="align-self:flex-start">‹ Início</button>
  <section class="card"><h3>Gasto por categoria · ${ymLabel(ui.ym)}</h3>
    ${rows.length?`<div class="donutbox">${donut(parts)}<div class="legend"><div><span>Fixos</span><b>${brl0(T.fixed)}</b></div><div><span>Variáveis</span><b>${brl0(T.variable)}</b></div><div><span>Total</span><b>${brl0(T.out)}</b></div></div></div>`:'<div class="empty">Sem gastos neste mês.</div>'}
    <p class="small muted" style="margin:10px 0 0">Toque numa categoria para ver os lançamentos do mês.</p></section>
  ${rows.length?`<section class="card"><div class="list">${rows.map(([id,v])=>{
    const c=cat(id), p=P.byCat[id]||0, up=v>p;
    const delta = p ? `<span class="${up?'bad':'in'}">${up?'↑':'↓'} ${Math.abs(Math.round((v-p)/p*100))}% vs mês anterior</span>` : '<span class="muted">sem gasto no mês anterior</span>';
    const lim=S.budget[id];
    return `<button class="item" data-act="go-cat" data-id="${id}" style="display:block">
      <div class="between"><span><b>${c.ico} ${esc(c.name)}</b></span><span><b>${brl(v)}</b> <span class="muted small">${pct(T.out?v/T.out:0)} ›</span></span></div>
      <div class="meter" style="margin-top:6px"><i style="width:${v/max*100}%;background:${c.color}"></i></div>
      <div class="small muted" style="margin-top:4px">${cnt[id]||0} lançamento(s) · ${delta}${lim?` · limite ${brl0(lim)}`:''}</div></button>`;}).join('')}</div></section>`:''}`;
}

function viewBudget(){
  const T=totals(ui.ym);
  const outCats = S.cats.filter(c=>c.type==='out');
  const rows = outCats.map(c=>({c,l:S.budget[c.id]||0,v:T.byCat[c.id]||0})).filter(r=>r.l>0||r.v>0).sort((a,b)=>(b.l>0)-(a.l>0)||b.v-a.v);
  const totL = rows.reduce((a,r)=>a+r.l,0), totV = rows.filter(r=>r.l>0).reduce((a,r)=>a+r.v,0);
  const free = outCats.filter(c=>!S.budget[c.id] && !T.byCat[c.id]);
  return `
  <section class="card"><h3>Orçamento de ${ymLabel(ui.ym)}</h3>
    <div class="between"><div><b style="font-size:1.5rem">${brl0(totV)}</b> <span class="muted">de ${brl0(totL)}</span></div><b class="${totV>totL?'bad':'in'}">${totL?(totV>totL?'acima':'dentro'):''}</b></div>
    <div class="meter ${totV>totL?'bad':'ok'}" style="margin-top:8px"><i style="width:${totL?Math.min(100,totV/totL*100):0}%"></i></div>
    <p class="small muted" style="margin:8px 0 0">Toque em uma categoria para definir ou alterar o limite mensal.</p>
  </section>
  <section class="card"><div class="list">${rows.map(({c,l,v})=>{
      const p = l? v/l : 0, cls = !l?'':p>1?'bad':p>.85?'warn':'ok';
      return `<button class="item" data-act="limit" data-id="${c.id}" style="display:block"><div class="between"><span><b>${c.ico} ${esc(c.name)}</b></span><span class="small ${cls}"><b>${brl0(v)}</b>${l?` / ${brl0(l)}`:' · sem limite'}</span></div>
      ${l?`<div class="meter ${cls}" style="margin-top:8px"><i style="width:${Math.min(100,p*100)}%"></i></div><div class="small muted" style="margin-top:4px">${p>1?`Estourou em ${brl0(v-l)}`:`Restam ${brl0(l-v)}`}</div>`:''}</button>`;}).join('')}</div></section>
  ${free.length?`<section class="card"><h3>Criar limite para…</h3><div class="chips" style="flex-wrap:wrap">${free.map(c=>`<button class="chip" data-act="limit" data-id="${c.id}">${c.ico} ${esc(c.name)}</button>`).join('')}</div></section>`:''}`;
}

function viewStats(){
  const y = ui.ym.slice(0,4);
  const mons = Array.from({length:12},(_,i)=>y+'-'+String(i+1).padStart(2,'0'));
  const T = mons.map(totals);
  const filled = T.filter(t=>t.in||t.out||t.inv).length || 1;
  const Y = T.reduce((a,t)=>({in:a.in+t.in,out:a.out+t.out,inv:a.inv+t.inv,fixed:a.fixed+t.fixed,variable:a.variable+t.variable}),{in:0,out:0,inv:0,fixed:0,variable:0});
  const byCat = {}; T.forEach(t=>Object.entries(t.byCat).forEach(([k,v])=>byCat[k]=(byCat[k]||0)+v));
  const catRows = Object.entries(byCat).filter(([k])=>cat(k).type==='out').sort((a,b)=>b[1]-a[1]);
  const trend = (cur,prev,goodDown)=>{ if(!prev) return ''; const up=cur>prev; const good = goodDown? !up : up; return `<span class="${good?'in':'bad'}">${up?'↑':'↓'}</span>`; };
  const years = yearsWithData();
  const monthsRows = mons.map((m,i)=>({m,t:T[i]})).filter(x=>x.t.in||x.t.out||x.t.inv);
  return `
  <div class="chips">${years.map(yy=>`<button class="chip ${yy===y?'on':''}" data-year="${yy}">${yy}</button>`).join('')}</div>
  <div class="kpis">
    <div class="kpi"><small>Entradas no ano</small><b class="in">${brl0(Y.in)}</b><div class="hint">média ${brl0(Y.in/filled)}/mês</div></div>
    <div class="kpi"><small>Saídas no ano</small><b class="out">${brl0(Y.out)}</b><div class="hint">média ${brl0(Y.out/filled)}/mês</div></div>
    <div class="kpi"><small>Superávit / déficit</small><b class="${Y.in-Y.out>=0?'in':'bad'}">${pct(Y.in?(Y.in-Y.out)/Y.in:0)}</b><div class="hint">${brl0(Y.in-Y.out)} no ano</div></div>
    <div class="kpi"><small>Investido</small><b class="inv">${brl0(Y.inv)}</b><div class="hint">${pct(Y.in?Y.inv/Y.in:0)} da renda</div></div>
  </div>
  <section class="card"><h3>Entradas × saídas por mês</h3>${bars(mons.map((m,i)=>({label:MONTHS[i].slice(0,3),a:T[i].in,b:T[i].out+T[i].inv})))}
    <div class="small muted"><span class="in">■</span> entradas &nbsp; <span class="out">■</span> saídas + investimentos</div></section>
  <section class="card"><h3>Saúde financeira por mês</h3>
    <div class="scroll-x"><table><tr><th>Mês</th><th>Fixos</th><th>Variáveis</th><th>Invest.</th><th>Sobra</th></tr>
    ${monthsRows.map(({m,t},i)=>{const p=monthsRows[i-1]?.t;
      return `<tr><td>${MONTHS[+m.slice(5)-1].slice(0,3)}</td>
      <td>${pct(t.in?t.fixed/t.in:0)} ${p?trend(t.fixed,p.fixed,true):''}</td>
      <td>${pct(t.in?t.variable/t.in:0)} ${p?trend(t.variable,p.variable,true):''}</td>
      <td>${pct(t.in?t.inv/t.in:0)}</td>
      <td class="${t.net>=0?'in':'bad'}"><b>${pct(t.in?t.net/t.in:0)}</b></td></tr>`}).join('')}</table></div>
    <p class="small muted" style="margin:8px 0 0">% sobre a renda do mês. Gastos fixos e variáveis: veja em ⚙︎ quais categorias são fixas.</p></section>
  <section class="card"><h3>Gasto por categoria em ${y}</h3><div class="list">${catRows.map(([k,v])=>`
    <div class="item" style="display:block"><div class="between"><span>${cat(k).ico} ${esc(cat(k).name)}</span><span><b>${brl0(v)}</b> <span class="muted small">· média ${brl0(v/filled)}</span></span></div>
    <div class="meter" style="margin-top:6px"><i style="width:${v/catRows[0][1]*100}%;background:${cat(k).color}"></i></div></div>`).join('')||'<div class="empty">Sem dados neste ano.</div>'}</div></section>`;
}

const VIEWS = {home:viewHome, tx:viewTx, budget:viewBudget, stats:viewStats, settings:viewSettings, cats:viewCats};
function render(){
  $('#monthLabel').textContent = ymLabel(ui.ym);
  $('.monthnav').style.visibility = ui.tab==='settings' ? 'hidden' : 'visible';
  $('#view').innerHTML = VIEWS[ui.tab]();
  document.querySelectorAll('.tabbar button').forEach(b=>b.classList.toggle('on', b.dataset.tab===(ui.tab==='cats'?'home':ui.tab)));
  const q=$('#q'); if(q) q.oninput = e=>{ ui.q=e.target.value; const pos=e.target.selectionStart; render(); const n=$('#q'); n.focus(); n.setSelectionRange(pos,pos); };
  applyTheme();
}
function applyTheme(){ const r=document.documentElement; if(S.theme==='auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme',S.theme); }

// ---------- Bottom sheets ----------
function openSheet(html){
  const body = `<div class="grab"></div>${html}`, cur = $('#sheet-root .sheet');
  if(cur){ const y=cur.scrollTop; cur.innerHTML = body; cur.scrollTop=y; return; } // redesenho sem reanimar
  $('#sheet-root').innerHTML = `<div class="backdrop" data-act="close"></div><div class="sheet" role="dialog" aria-modal="true">${body}</div>`;
}
function closeSheet(){ $('#sheet-root').innerHTML=''; }

let draft;
function openTxForm(id){
  const t = id ? S.tx.find(x=>x.id===id) : null;
  draft = t ? {...t} : {id:null,type:'out',cat:null,amount:'',date: ui.ym===today().slice(0,7)?today():ui.ym+'-01',pay:(S.pays.find(p=>p.kind==='conta')||S.pays[0]).id,note:'',repeat:0,comp:null,inst:1,compManual:false};
  if(t) draft.compManual = !!t.comp;
  drawTxForm();
  if(!t) setTimeout(()=>$('#f-amount')?.focus(),250);
}
function drawTxForm(){
  const cats = S.cats.filter(c=>c.type===draft.type);
  if(!cats.find(c=>c.id===draft.cat)) draft.cat = null;
  const editing = !!draft.id;
  const card = draft.type==='out' && isCard(draft.pay);
  if(card && !draft.comp) draft.comp = defaultComp(draft.date, draft.pay);
  if(!card) { draft.comp = null; draft.inst = 1; }
  openSheet(`
  <div class="seg">${['out','in','inv'].map(k=>`<button class="${draft.type===k?'on':''}" data-ftype="${k}">${TYPE_LABEL[k]}</button>`).join('')}</div>
  <div class="amount-wrap"><span class="cur">R$</span><input id="f-amount" inputmode="decimal" placeholder="0,00" value="${draft.amount===''?'':String(draft.amount).replace('.',',')}" autocomplete="off"></div>
  <div class="catgrid">${cats.map(c=>`<button class="cat ${draft.cat===c.id?'on':''}" data-fcat="${c.id}"><i>${c.ico}</i>${esc(c.name)}</button>`).join('')}</div>
  ${draft.type==='out'&&cat(draft.cat).reimb?'<p class="small muted" style="margin:-6px 0 12px">💼 Fica em “Reembolsos a receber” no Início até você registrar a data do reembolso.</p>':''}
  ${draft.type==='out'?`<div class="field"><label>Pago com</label><div class="chips">${S.pays.map(p=>`<button class="chip ${draft.pay===p.id?'on':''}" data-fpay="${p.id}">${p.ico} ${esc(p.name)}</button>`).join('')}</div></div>`:''}
  ${card?`<div class="card-box">
    <div class="field"><label>Competência da cobrança (mês da fatura)</label>
      <div class="stepper"><button class="icon-btn" data-compstep="-1" aria-label="Mês anterior">‹</button><b>${ymLabel(draft.comp)}</b><button class="icon-btn" data-compstep="1" aria-label="Próximo mês">›</button></div>
      <small class="muted">A despesa só entra no orçamento deste mês${draft.compManual?'':' (sugerido pelo fechamento do cartão)'}.</small></div>
    ${editing?(draft.inst?`<p class="small muted" style="margin:0">Parcela ${draft.inst} de uma compra parcelada. Editar muda só esta parcela.</p>`:''):`<div class="field"><label>Parcelas</label>
      <select id="f-inst">${[1,...Array.from({length:23},(_,i)=>i+2)].map(n=>`<option value="${n}" ${draft.inst==n?'selected':''}>${n===1?'À vista (1x)':n+'x'}</option>`).join('')}</select>
      <small class="muted" id="inst-info"></small></div>`}</div>`:''}
  <div class="field"><label>${card?'Data da compra':'Data'}</label><input type="date" id="f-date" value="${draft.date}"></div>
  <div class="field"><label>Descrição (opcional)</label><input type="text" id="f-note" maxlength="80" placeholder="Ex.: Mercado da semana" value="${esc(draft.note)}"></div>
  ${editing||card?'':`<div class="field"><label>Repetir</label><select id="f-repeat">${[[0,'Não repetir'],[2,'Mais 2 meses'],[5,'Mais 5 meses'],[11,'Mais 11 meses (até 1 ano)']].map(([v,l])=>`<option value="${v}" ${draft.repeat==v?'selected':''}>${l}</option>`).join('')}</select></div>`}
  ${editing&&draft.grp?`<button class="btn ghost" style="margin-bottom:8px" data-act="del-grp">Excluir todas as parcelas desta compra</button>`:''}
  <div class="btns">${editing?`<button class="btn danger" data-act="del-tx">${draft.grp?'Excluir esta parcela':'Excluir'}</button>`:''}<button class="btn" data-act="save-tx">${editing?'Salvar alterações':'Salvar'}</button></div>`);
  updInstInfo();
}
function updInstInfo(){
  const el=$('#inst-info'), a=$('#f-amount'); if(!el||!a) return;
  const n=+($('#f-inst')?.value||1), v=parseMoney(a.value);
  el.textContent = n>1 && v>0 ? `Valor total da compra: ${n}x de ${brl(v/n)}` : (n>1?'Digite o valor TOTAL da compra; o app divide em parcelas.':'');
}
function readDraft(){
  const a=$('#f-amount'); if(a) draft.amount=a.value; const d=$('#f-date'); if(d) draft.date=d.value;
  const n=$('#f-note'); if(n) draft.note=n.value; const r=$('#f-repeat'); if(r) draft.repeat=+r.value; const q=$('#f-inst'); if(q) draft.inst=+q.value;
}
function saveTx(){
  readDraft();
  const val = parseMoney(draft.amount);
  if(!(val>0)) return toast('Digite um valor maior que zero');
  if(!draft.cat) return toast('Escolha uma categoria');
  if(!draft.date) return toast('Escolha a data');
  const base = {type:draft.type,cat:draft.cat,amount:Math.round(val*100)/100,pay:draft.type==='out'?draft.pay:'debito',note:draft.note.trim()};
  const card = draft.type==='out' && isCard(draft.pay);
  base.comp = card ? draft.comp : undefined;
  if(draft.id){ const i=S.tx.findIndex(x=>x.id===draft.id); S.tx[i]={...S.tx[i],...base,date:draft.date}; if(!card){ delete S.tx[i].inst; delete S.tx[i].grp; } }
  else if(card && draft.inst>1){
    const n=draft.inst, cents=Math.round(val*100), each=Math.floor(cents/n), extra=cents-each*n, grp=uid();
    for(let k=0;k<n;k++) S.tx.push({id:uid(),...base,amount:(each+(k===0?extra:0))/100,comp:shiftYm(draft.comp,k),date:draft.date,inst:(k+1)+'/'+n,grp});
  }
  else if(card){ S.tx.push({id:uid(),...base,date:draft.date}); }
  else{
    for(let k=0;k<=draft.repeat;k++){
      const [y,m,dd]=draft.date.split('-').map(Number); const ym=shiftYm(y+'-'+String(m).padStart(2,'0'),k);
      const last=new Date(+ym.slice(0,4),+ym.slice(5),0).getDate();
      S.tx.push({id:uid(),...base,date:ym+'-'+String(Math.min(dd,last)).padStart(2,'0')});
    }
  }
  save(); if(!card) ui.ym = draft.date.slice(0,7); closeSheet(); render();
  toast(card ? `Salvo na fatura de ${ymLabel(draft.comp)}${draft.inst>1&&!draft.id?' (em '+draft.inst+'x)':''} ✓` : draft.id?'Lançamento atualizado':'Lançamento salvo ✓');
}

function openLimit(id){
  const c=cat(id), cur=S.budget[id]||'';
  openSheet(`<h2>${c.ico} Limite mensal — ${esc(c.name)}</h2>
  <div class="amount-wrap"><span class="cur">R$</span><input id="f-limit" inputmode="decimal" placeholder="0,00" value="${cur?String(cur).replace('.',','):''}"></div>
  <div class="btns">${cur?`<button class="btn danger" data-act="rm-limit" data-id="${id}">Remover</button>`:''}<button class="btn" data-act="save-limit" data-id="${id}">Salvar</button></div>`);
  setTimeout(()=>$('#f-limit')?.focus(),250);
}

function openMonthPicker(){
  const y=ui.ym.slice(0,4);
  openSheet(`<div class="between" style="margin-bottom:10px"><button class="icon-btn" data-act="yprev">‹</button><h2 style="margin:0">${y}</h2><button class="icon-btn" data-act="ynext">›</button></div>
  <div class="months">${MONTHS.map((m,i)=>{const v=y+'-'+String(i+1).padStart(2,'0');return `<button class="${v===ui.ym?'on':''}" data-pick="${v}">${m.slice(0,3).replace(/^./,c=>c.toUpperCase())}</button>`}).join('')}</div>`);
}

// ---------- Aba Ajustes ----------
const EMOJIS = ['🛒','🏠','🚗','💡','🍔','💊','🎁','👕','📚','🐶','📺','🎮','✈️','💼','💰','📦','🏦','🔧','🧒','🎓','⚽','🛠️','🌳','☕'];
const COLORS = ['#16a34a','#0ea5e9','#2563eb','#7c3aed','#db2777','#dc2626','#f97316','#eab308','#0d9488','#64748b','#a16207','#94a3b8'];
const SECTIONS = [['out','Categorias de saída'],['in','Categorias de entrada'],['inv','Investimentos']];

function viewSettings(){
  const T=['auto','light','dark'], TL={auto:'Automático',light:'Claro',dark:'Escuro'};
  const n = id => S.tx.filter(t=>t.cat===id).length;
  const np = id => S.tx.filter(t=>t.pay===id).length;
  return `
  <h2 style="margin:4px 0 0">Ajustes</h2>
  <section class="card"><h3>Contas e cartões</h3>
    <div class="list">${S.pays.map(p=>`<button class="item" data-act="edit-pay" data-id="${p.id}">
      <span class="ico" style="background:var(--line)">${esc(p.ico)}</span>
      <span class="t"><b>${esc(p.name)}</b><small class="muted">${p.kind==='cartao'?'Cartão de crédito (gera fatura)':'Conta / dinheiro'} · ${np(p.id)} lançamentos</small></span><span class="muted">›</span></button>`).join('')}</div>
    <button class="btn ghost" style="margin-top:10px" data-act="add-pay">+ Adicionar conta ou cartão</button></section>
  ${SECTIONS.map(([type,title])=>`<section class="card"><h3>${title}</h3>
    <div class="list">${S.cats.filter(c=>c.type===type).map(c=>`<button class="item" data-act="edit-cat" data-id="${c.id}">
      <span class="ico" style="background:${c.color}22">${esc(c.ico)}</span>
      <span class="t"><b>${esc(c.name)}</b><small class="muted">${n(c.id)} lançamentos${S.budget[c.id]?' · limite '+brl0(S.budget[c.id]):''}</small></span>
      ${type==='out'?`<span class="tag" style="${c.fixed?'background:var(--brand);color:var(--brand-ink)':''}">${c.fixed?'Fixa':'Variável'}</span>`:''}<span class="muted">›</span></button>`).join('')||'<div class="empty">Nenhuma categoria.</div>'}</div>
    <button class="btn ghost" style="margin-top:10px" data-act="add-cat" data-type="${type}">+ Nova categoria</button>
    ${type==='out'?'<p class="small muted" style="margin:8px 0 0">Fixa = conta que se repete todo mês (aluguel, financiamento…). Entra no “Fixos” das Análises.</p>':''}</section>`).join('')}
  <section class="card"><h3>Saldo inicial</h3>
    <p class="small muted" style="margin:0 0 8px">O app soma mês a mês a partir deste ponto (igual ao “Saldo Anterior” da planilha).</p>
    <div class="field"><label>Mês de início</label><input type="month" id="f-open-m" value="${S.opening.month}"></div>
    <div class="field"><label>Saldo em conta no início desse mês (R$)</label><input id="f-open" inputmode="decimal" value="${String(S.opening.balance).replace('.',',')}"></div>
    <button class="btn ghost" data-act="save-open">Salvar saldo inicial</button></section>
  <section class="card"><h3>Aparência</h3><div class="chips">${T.map(t=>`<button class="chip ${S.theme===t?'on':''}" data-theme="${t}">${TL[t]}</button>`).join('')}</div></section>
  <section class="card"><h3>Seus dados</h3>
    <p class="small muted" style="margin:0 0 8px">Tudo fica salvo apenas neste aparelho. Faça backup de vez em quando.</p>
    <div class="btns"><button class="btn ghost" data-act="export">⬇ Backup</button><button class="btn ghost" data-act="import">⬆ Restaurar</button></div>
    <div class="btns"><button class="btn ghost" data-act="csv">📄 Exportar CSV (Excel)</button></div>
    <div class="btns"><button class="btn ghost" data-act="defaults">↺ Restaurar categorias padrão</button></div>
    <div class="btns"><button class="btn danger" data-act="reset">Apagar tudo</button></div>
    <input type="file" id="f-file" accept="application/json" hidden></section>`;
}

let cdraft;
function openCatForm(id,type){
  const c = id ? S.cats.find(x=>x.id===id) : null;
  cdraft = c ? {...c, isNew:false} : {id:'c_'+uid(),name:'',ico:'📦',color:COLORS[0],type,fixed:false,isNew:true};
  drawCatForm();
}
function drawCatForm(){
  const d=cdraft;
  openSheet(`<h2>${d.isNew?'Nova categoria':'Editar categoria'}</h2>
  <div class="field"><label>Nome</label><input type="text" id="c-name" maxlength="30" value="${esc(d.name)}" placeholder="Ex.: Academia"></div>
  <div class="field"><label>Ícone (toque ou digite um emoji)</label>
    <input type="text" id="c-ico" maxlength="4" value="${esc(d.ico)}" style="font-size:1.4rem;text-align:center;margin-bottom:8px">
    <div class="chips" style="flex-wrap:wrap">${EMOJIS.map(e=>`<button class="chip ${d.ico===e?'on':''}" data-cico="${e}">${e}</button>`).join('')}</div></div>
  <div class="field"><label>Cor</label><div class="chips" style="flex-wrap:wrap">${COLORS.map(c=>`<button class="chip" data-ccolor="${c}" style="background:${c};border-color:${d.color===c?'var(--ink)':'transparent'};width:38px;height:38px;padding:0" aria-label="cor"></button>`).join('')}</div></div>
  ${d.isNew?`<div class="field"><label>Tipo</label><div class="chips">${[['out','Saída'],['in','Entrada'],['inv','Investimento']].map(([k,l])=>`<button class="chip ${d.type===k?'on':''}" data-ctype="${k}">${l}</button>`).join('')}</div></div>`:''}
  ${d.type==='out'?`<div class="row-set"><span><b>Conta fixa</b><br><small class="muted">Repete todo mês (aluguel, financiamento…)</small></span><button class="switch ${d.fixed?'on':''}" data-cfixed="1" aria-label="Conta fixa"></button></div>
  <div class="row-set"><span><b>Reembolsável</b><br><small class="muted">Compras que você recebe de volta (ex.: trabalho)</small></span><button class="switch ${d.reimb?'on':''}" data-creimb="1" aria-label="Reembolsável"></button></div>
  <div class="field" style="margin-top:12px"><label>Limite mensal (opcional, R$)</label><input id="c-limit" inputmode="decimal" placeholder="Sem limite" value="${S.budget[d.id]?String(S.budget[d.id]).replace('.',','):''}"></div>`:''}
  <div class="btns">${d.isNew?'':'<button class="btn danger" data-act="del-cat">Excluir</button>'}<button class="btn" data-act="save-cat">Salvar</button></div>`);
}
function readCat(){ const n=$('#c-name'); if(n) cdraft.name=n.value; const i=$('#c-ico'); if(i) cdraft.ico=i.value.trim()||'📦'; }
function saveCat(){
  readCat(); const d=cdraft;
  if(!d.name.trim()) return toast('Dê um nome à categoria');
  if(S.cats.some(c=>c.id!==d.id && c.type===d.type && c.name.toLowerCase()===d.name.trim().toLowerCase())) return toast('Já existe uma categoria com esse nome');
  const rec = {id:d.id,name:d.name.trim(),ico:d.ico,color:d.color,type:d.type,fixed:d.type==='out'?!!d.fixed:false,reimb:d.type==='out'?!!d.reimb:false};
  const i = S.cats.findIndex(c=>c.id===d.id); if(i>=0) S.cats[i]=rec; else S.cats.push(rec);
  const l=$('#c-limit'); if(l){ const v=parseFloat(l.value.replace(/\./g,'').replace(',','.')); if(v>0) S.budget[d.id]=v; else delete S.budget[d.id]; }
  save(); closeSheet(); render(); toast('Categoria salva ✓');
}
function askMove(kind,id){ // kind: 'cat' | 'pay'
  const list = kind==='cat' ? S.cats : S.pays;
  const cur = list.find(x=>x.id===id);
  const used = S.tx.filter(t=>t[kind]===id).length;
  const others = list.filter(x=>x.id!==id && (kind==='pay' || x.type===cur.type));
  if(!others.length) return toast(kind==='cat'?'Crie outra categoria do mesmo tipo antes de excluir esta':'É preciso manter pelo menos uma conta');
  if(!used){ if(confirm(`Excluir “${cur.name}”?`)) doDelete(kind,id,null); return; }
  openSheet(`<h2>Excluir “${esc(cur.name)}”</h2>
  <p class="muted">Há ${used} lançamento(s) usando ${kind==='cat'?'esta categoria':'esta conta'}. Para onde movê-los?</p>
  <div class="field"><select id="f-move">${others.map(x=>`<option value="${x.id}">${esc(x.ico)} ${esc(x.name)}</option>`).join('')}</select></div>
  <div class="btns"><button class="btn ghost" data-act="close">Cancelar</button><button class="btn danger" data-act="do-move" data-kind="${kind}" data-id="${id}">Mover e excluir</button></div>`);
}
function doDelete(kind,id,to){
  if(to) S.tx.forEach(t=>{ if(t[kind]===id) t[kind]=to; });
  if(kind==='cat'){ S.cats=S.cats.filter(c=>c.id!==id); delete S.budget[id]; } else S.pays=S.pays.filter(p=>p.id!==id);
  save(); closeSheet(); render(); toast('Excluído');
}

let pdraft;
function openPayForm(id){
  const p = id ? S.pays.find(x=>x.id===id) : null;
  pdraft = p ? {...p,isNew:false} : {id:'p_'+uid(),name:'',ico:'💳',kind:'cartao',isNew:true};
  drawPayForm();
}
function drawPayForm(){
  const d=pdraft;
  openSheet(`<h2>${d.isNew?'Nova conta ou cartão':'Editar conta ou cartão'}</h2>
  <div class="field"><label>Nome</label><input type="text" id="p-name" maxlength="30" value="${esc(d.name)}" placeholder="Ex.: Cartão Nubank"></div>
  <div class="field"><label>Ícone</label><input type="text" id="p-ico" maxlength="4" value="${esc(d.ico)}" style="font-size:1.4rem;text-align:center;margin-bottom:8px">
    <div class="chips">${['💳','💵','🏦','📱','🪙','💰'].map(e=>`<button class="chip ${d.ico===e?'on':''}" data-pico="${e}">${e}</button>`).join('')}</div></div>
  <div class="field"><label>Tipo</label><div class="chips">${[['cartao','Cartão de crédito'],['conta','Conta / dinheiro']].map(([k,l])=>`<button class="chip ${d.kind===k?'on':''}" data-pkind="${k}">${l}</button>`).join('')}</div>
  <p class="small muted" style="margin:6px 0 0">Cartões aparecem em “Faturas dos cartões” no Início.</p></div>
  ${d.kind==='cartao'?`<div class="field"><label>Fechamento e vencimento da fatura</label>
    <div class="btns" style="margin:0"><input id="p-close" inputmode="numeric" maxlength="2" placeholder="Fecha dia" value="${d.closing||''}"><input id="p-due" inputmode="numeric" maxlength="2" placeholder="Vence dia" value="${d.due||''}"></div>
    <p class="small muted" style="margin:6px 0 0">Com isso o app sugere sozinho o mês da cobrança (você pode mudar em cada compra). Sem isso, ele sugere o mês seguinte.</p></div>`:''}
  <div class="btns">${d.isNew?'':'<button class="btn danger" data-act="del-pay">Excluir</button>'}<button class="btn" data-act="save-pay">Salvar</button></div>`);
}
function readPay(){ const c=$('#p-close'); if(c) pdraft.closing=parseInt(c.value)||''; const u=$('#p-due'); if(u) pdraft.due=parseInt(u.value)||''; const n=$('#p-name'); if(n) pdraft.name=n.value; const i=$('#p-ico'); if(i) pdraft.ico=i.value.trim()||'💳'; }
function savePay(){
  readPay(); const d=pdraft;
  if(!d.name.trim()) return toast('Dê um nome');
  const okDay = v => v>=1 && v<=31;
  if(d.kind==='cartao' && (d.closing||d.due) && !(okDay(d.closing)&&okDay(d.due))) return toast('Informe fechamento e vencimento (dias de 1 a 31)');
  const rec={id:d.id,name:d.name.trim(),ico:d.ico,kind:d.kind};
  if(d.kind==='cartao' && d.closing && d.due){ rec.closing=d.closing; rec.due=d.due; }
  const i=S.pays.findIndex(p=>p.id===d.id); if(i>=0) S.pays[i]=rec; else S.pays.push(rec);
  save(); closeSheet(); render(); toast('Salvo ✓');
}

function download(name, text, type){
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([text],{type})); a.download=name; document.body.appendChild(a); a.click(); a.remove();
}

// ---------- Reembolsos (compras a trabalho etc.) ----------
const pendingReimb = () => S.tx.filter(t=>t.type==='out' && cat(t.cat).reimb && !t.reimbId).sort((a,b)=>a.date.localeCompare(b.date));
let rb;
function openReimb(){
  const list = pendingReimb(); if(!list.length) return toast('Nada a receber');
  rb = {sel:new Set(list.map(t=>t.id)), date:today()}; drawReimb();
}
function drawReimb(){
  const list = pendingReimb(), sel = list.filter(t=>rb.sel.has(t.id)), tot = sel.reduce((a,t)=>a+t.amount,0);
  openSheet(`<h2>💼 Registrar reembolso</h2>
  <p class="small muted" style="margin:0 0 10px">Marque as compras que você já recebeu de volta e informe a data. O app lança a entrada sozinho.</p>
  <div class="field"><label>Data em que foi reembolsado</label><input type="date" id="rb-date" value="${rb.date}"></div>
  <div class="between" style="margin-bottom:6px"><b>${sel.length} de ${list.length} selecionadas</b><button class="chip" data-act="rb-all">${sel.length===list.length?'Desmarcar todas':'Marcar todas'}</button></div>
  <div class="card" style="padding:4px 12px"><div class="list">${list.map(t=>`<label class="item" style="cursor:pointer"><input type="checkbox" data-rb-id="${t.id}" ${rb.sel.has(t.id)?'checked':''} style="width:20px;height:20px">
    <span class="t"><b>${esc(t.note||cat(t.cat).name)}</b><small class="muted">${t.date.slice(8)}/${t.date.slice(5,7)}/${t.date.slice(0,4)}${t.pay!=='debito'?' · '+esc(pay(t.pay).name):''}</small></span><span class="amt">${brl(t.amount)}</span></label>`).join('')}</div></div>
  <div class="between" style="margin:12px 0"><span class="muted">Entrada a lançar</span><b class="in" style="font-size:1.3rem">${brl(tot)}</b></div>
  <div class="btns"><button class="btn ghost" data-act="close">Cancelar</button><button class="btn" data-act="rb-go">Lançar entrada</button></div>`);
}
function reimbGo(){
  const d=$('#rb-date'); if(d) rb.date=d.value;
  const sel = pendingReimb().filter(t=>rb.sel.has(t.id));
  if(!sel.length) return toast('Marque pelo menos uma compra');
  if(!rb.date) return toast('Informe a data do reembolso');
  if(!S.cats.some(c=>c.id==='reembolsos')) S.cats.push({...DEFAULT_CATS.find(c=>c.id==='reembolsos')});
  const rid = uid(), total = Math.round(sel.reduce((a,t)=>a+t.amount*100,0))/100;
  S.tx.push({id:uid(),date:rb.date,type:'in',cat:'reembolsos',amount:total,pay:'debito',note:`Reembolso de ${sel.length} compra(s) a trabalho`,rid});
  sel.forEach(t=>{ t.reimbId=rid; t.reimbDate=rb.date; });
  save(); closeSheet(); ui.ym=rb.date.slice(0,7); render(); toast(`Entrada de ${brl(total)} lançada ✓`);
}

// ---------- Importar fatura do cartão (PDF) ----------
const NUM = '-?\\d{1,3}(?:\\.\\d{3})*,\\d{2}';
const toNum = s => parseFloat(s.replace(/\./g,'').replace(',','.'));
const normMerchant = d => d.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+\d{1,2}\/\d{1,2}$/,'').replace(/[^A-Z*]+/g,' ').replace(/\s+/g,' ').trim();

// Lê o texto da fatura (Bradesco "extrato em aberto" ou fatura fechada) e devolve os lançamentos.
function parseFatura(text){
  text = text.replace(/\s+/g,' ');
  const sd = text.match(/Data:\s*(\d{2})\/(\d{2})\/(\d{4})/), now = new Date();
  const stmt = sd ? {m:+sd[2],y:+sd[3]} : {m:now.getMonth()+1,y:now.getFullYear()};
  const tm = text.match(new RegExp('Total da Fatura em Real[\\s.]*R\\$\\s*('+NUM+')'));
  const re = new RegExp('(\\d{2})/(\\d{2}) (.+?) 0,00 R\\$ 0,00 ('+NUM+')','g');
  const tail1 = new RegExp('\\s+BRL(\\s+'+NUM+')?$'), tail2 = new RegExp('\\s+'+NUM+'$');
  const rows=[], ignored=[], seen={}; let m;
  while((m=re.exec(text))){
    let desc = m[3].replace(tail1,'').replace(tail2,'').trim(), amount = toNum(m[4]);
    if(!desc || desc.length>80) continue;
    if(/SALDO ANTERIOR|PAGTO|PAGAMENTO/i.test(desc) || amount<=0){ ignored.push(`${m[1]}/${m[2]} ${desc} (${brl(amount)})`); continue; }
    const day=+m[1], mon=+m[2], year = mon>stmt.m ? stmt.y-1 : stmt.y;
    const date = `${year}-${String(mon).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const im = desc.match(/^(.*?)\s+(\d{1,2})\/(\d{1,2})$/); let title=desc, inst=null, k=0, n=0;
    if(im && +im[3]>=2 && +im[2]>=1 && +im[2]<=+im[3]){ title=im[1]; k=+im[2]; n=+im[3]; inst=k+'/'+n; }
    const mk = normMerchant(title);
    const base = `${mk}|${date}|${amount}|${inst||''}`; seen[base]=(seen[base]||0)+1;
    rows.push({id:rows.length, date, title, amount, inst, k, n, mk, key:'I|'+base+'|'+seen[base]});
  }
  return {rows, ignored, total: tm?toNum(tm[1]):null, stmtDate: sd?`${sd[3]}-${sd[2]}-${sd[1]}`:null};
}
function loadScript(src){ return new Promise((ok,err)=>{ const s=document.createElement('script'); s.src=src; s.onload=ok; s.onerror=()=>err(new Error('Não consegui carregar o leitor de PDF. Conecte à internet uma vez e tente de novo.')); document.head.appendChild(s); }); }
async function pdfText(file){
  if(!window.pdfjsLib){ await loadScript('lib/pdf.min.js'); pdfjsLib.GlobalWorkerOptions.workerSrc='lib/pdf.worker.min.js'; }
  const doc = await pdfjsLib.getDocument({data: await file.arrayBuffer()}).promise, out=[];
  for(let p=1;p<=doc.numPages;p++){ const tc = await (await doc.getPage(p)).getTextContent(); out.push(tc.items.map(i=>i.str).join(' ')); }
  return out.join(' ');
}

let imp;
function openImport(){
  const cards = S.pays.filter(p=>p.kind==='cartao'); if(!cards.length) return toast('Cadastre um cartão em Ajustes primeiro');
  imp = {pay:(cards.find(p=>/bradesco/i.test(p.name))||cards[0]).id, rows:null};
  drawImportStart();
}
function drawImportStart(msg){
  const cards = S.pays.filter(p=>p.kind==='cartao');
  openSheet(`<h2>📥 Importar fatura do cartão</h2>
  <p class="small muted" style="margin:0 0 12px">Escolha o PDF da fatura (ou do extrato em aberto) baixado no app do banco. O arquivo é lido no próprio aparelho e não é enviado a lugar nenhum.</p>
  <div class="field"><label>Cartão</label><div class="chips">${cards.map(p=>`<button class="chip ${imp.pay===p.id?'on':''}" data-act="imp-card" data-id="${p.id}">${esc(p.ico)} ${esc(p.name)}</button>`).join('')}</div></div>
  ${msg?`<p class="bad small">${esc(msg)}</p>`:''}
  <label class="btn" for="f-pdf" style="display:block;text-align:center">Escolher o PDF da fatura</label>
  <input type="file" id="f-pdf" accept="application/pdf,.pdf" hidden>`);
}
async function importFile(file){
  openSheet(`<h2>Lendo a fatura…</h2><p class="muted">Isso leva alguns segundos.</p>`);
  try{
    const r = parseFatura(await pdfText(file));
    if(!r.rows.length) return drawImportStart('Não encontrei lançamentos neste PDF. Ele é uma fatura do Bradesco em PDF?');
    const known = new Set(S.tx.map(t=>t.imp).filter(Boolean));
    r.rows.forEach(w=>{
      w.cat = (S.rules||{})[w.mk] && S.cats.some(c=>c.id===S.rules[w.mk]&&c.type==='out') ? S.rules[w.mk] : '';
      w.future = false; w.dup = '';
      if(known.has(w.key)) w.dup='já importado';
      else if(w.inst && S.tx.some(t=>t.imp && t.imp.startsWith(`F|${w.mk}|${w.inst}|${w.amount}`))) w.dup='parcela já prevista';
      else if(S.tx.some(t=>!t.imp && t.pay===imp.pay && t.amount===w.amount && t.date===w.date)) w.dup='possível duplicado';
      w.include = !w.dup;
      if(w.inst && w.k<w.n && !w.dup) w.future = true;
    });
    Object.assign(imp,{rows:r.rows, ignored:r.ignored, total:r.total, only:false, comp: defaultComp(r.stmtDate||today(), imp.pay), fatDate:r.stmtDate});
    drawImportReview();
  }catch(e){ drawImportStart(e.message||'Não foi possível ler o PDF.'); }
}
function catOpts(sel){
  return S.cats.filter(c=>c.type==='out').map(c=>`<option value="${c.id}" ${sel===c.id?'selected':''}>${c.ico} ${esc(c.name)}${c.reimb?' (reembolsável)':''}</option>`).join('');
}
function drawImportReview(){
  const d=imp, sel=d.rows.filter(r=>r.include), miss=sel.filter(r=>!r.cat).length, sum=sel.reduce((a,r)=>a+r.amount,0);
  const all=d.rows.reduce((a,r)=>a+r.amount,0), ok = d.total!=null && Math.abs(all-d.total)<0.015;
  const view = d.only ? d.rows.filter(r=>r.include&&!r.cat) : d.rows;
  openSheet(`<h2>Conferir e classificar</h2>
  <div class="card-box"><div class="field" style="margin:0"><label>Competência da cobrança (mês da fatura)</label>
    <div class="stepper" style="margin:0"><button class="icon-btn" data-act="imp-comp" data-step="-1">‹</button><b>${ymLabel(d.comp)}</b><button class="icon-btn" data-act="imp-comp" data-step="1">›</button></div></div></div>
  <p class="small ${ok||d.total==null?'muted':'warn'}" style="margin:0 0 8px">${d.rows.length} lançamentos lidos · ${brl(all)} ${d.total!=null?(ok?'· ✓ confere com o total da fatura':`· atenção: o total da fatura é ${brl(d.total)}`):''}</p>
  ${d.ignored.length?`<p class="small muted" style="margin:0 0 8px">Ignorado (não é compra): ${esc(d.ignored.join('; '))}</p>`:''}
  <div class="chips" style="margin-bottom:6px"><button class="chip ${d.only?'on':''}" data-act="imp-only">Só os sem categoria (${miss})</button><button class="chip" data-act="imp-allcheck">${sel.length===d.rows.length?'Desmarcar todos':'Marcar todos'}</button></div>
  <div class="card" style="padding:4px 12px"><div class="list">${view.map(r=>`<div class="imp-row ${r.include&&!r.cat?'need':''} ${r.include?'':'off'}">
    <input type="checkbox" data-imp-inc="${r.id}" ${r.include?'checked':''} aria-label="Importar">
    <div class="t"><div class="between"><b>${esc(r.title)}${r.inst?` <span class="tag">${r.inst}</span>`:''}</b><b>${brl(r.amount)}</b></div>
      <small class="muted">${r.date.slice(8)}/${r.date.slice(5,7)}${r.dup?` · <span class="warn">${r.dup}</span>`:''}</small>
      <select class="imp-cat" data-imp-cat="${r.id}"><option value="">Escolher categoria…</option>${catOpts(r.cat)}</select>
      ${r.inst&&r.k<r.n?`<label class="small muted" style="display:block;margin-top:4px"><input type="checkbox" data-imp-fut="${r.id}" ${r.future?'checked':''}> também lançar as ${r.n-r.k} parcela(s) restante(s) nas próximas faturas</label>`:''}</div></div>`).join('')||'<div class="empty">Tudo classificado 🎉</div>'}</div></div>
  <div class="between" style="margin:12px 0"><span class="muted">${sel.length} selecionados</span><b>${brl(sum)}</b></div>
  <div class="btns"><button class="btn ghost" data-act="close">Cancelar</button><button class="btn" data-act="imp-go" ${miss?'style="opacity:.55"':''}>${miss?`Faltam ${miss} categorias`:`Importar ${sel.length}`}</button></div>`);
}
function importGo(){
  const d=imp, sel=d.rows.filter(r=>r.include);
  if(!sel.length) return toast('Nenhum lançamento selecionado');
  if(sel.some(r=>!r.cat)){ d.only=true; drawImportReview(); return toast('Classifique todos os lançamentos marcados'); }
  S.rules = S.rules||{}; let n=0;
  for(const r of sel){
    S.rules[r.mk] = r.cat;
    const grp = r.future ? uid() : undefined;
    const mk = (extra)=>({id:uid(),date:r.date,type:'out',cat:r.cat,amount:r.amount,pay:d.pay,note:r.title,...extra});
    S.tx.push(mk({comp:d.comp, inst:r.inst||undefined, grp, imp:r.key})); n++;
    if(r.future) for(let j=r.k+1;j<=r.n;j++){ S.tx.push(mk({comp:shiftYm(d.comp,j-r.k), inst:j+'/'+r.n, grp, imp:`F|${r.mk}|${j}/${r.n}|${r.amount}`})); n++; }
  }
  save(); closeSheet(); ui.tab='tx'; ui.ym=d.comp; render(); toast(`${n} lançamentos importados na fatura de ${ymLabel(d.comp)} ✓`);
}

// ---------- Eventos ----------
document.addEventListener('click', e=>{
  const el = e.target.closest('[data-act],[data-tab],[data-tab-go],[data-filter],[data-year],[data-ftype],[data-fcat],[data-fpay],[data-compstep],[data-pick],[data-theme],[data-cico],[data-ccolor],[data-ctype],[data-cfixed],[data-creimb],[data-pico],[data-pkind]');
  if(!el) return; const d = el.dataset;
  if(d.tab){ ui.f={}; ui.tab=d.tab; render(); window.scrollTo(0,0); return; }
  if(d.tabGo){ ui.f={}; ui.tab=d.tabGo; render(); window.scrollTo(0,0); return; }
  if(d.filter){ ui.filter=d.filter; render(); return; }
  if(d.year){ ui.ym = d.year+'-'+ui.ym.slice(5); render(); return; }
  if(d.ftype){ readDraft(); draft.type=d.ftype; draft.cat=null; drawTxForm(); return; }
  if(d.fcat){ readDraft(); draft.cat=d.fcat; drawTxForm(); return; }
  if(d.fpay){ readDraft(); draft.pay=d.fpay; draft.comp = isCard(d.fpay) ? defaultComp(draft.date,d.fpay) : null; draft.compManual=false; drawTxForm(); return; }
  if(d.compstep){ readDraft(); draft.comp=shiftYm(draft.comp,+d.compstep); draft.compManual=true; drawTxForm(); return; }
  if(d.pick){ ui.ym=d.pick; closeSheet(); render(); return; }
  if(d.theme){ S.theme=d.theme; save(); applyTheme(); render(); return; }
  if(d.cico){ readCat(); cdraft.ico=d.cico; drawCatForm(); return; }
  if(d.ccolor){ readCat(); cdraft.color=d.ccolor; drawCatForm(); return; }
  if(d.ctype){ readCat(); cdraft.type=d.ctype; drawCatForm(); return; }
  if(d.creimb){ readCat(); cdraft.reimb=!cdraft.reimb; drawCatForm(); return; }
  if(d.cfixed){ readCat(); cdraft.fixed=!cdraft.fixed; drawCatForm(); return; }
  if(d.pico){ readPay(); pdraft.ico=d.pico; drawPayForm(); return; }
  if(d.pkind){ readPay(); pdraft.kind=d.pkind; drawPayForm(); return; }
  switch(d.act){
    case 'prev': ui.ym=shiftYm(ui.ym,-1); render(); break;
    case 'next': ui.ym=shiftYm(ui.ym,1); render(); break;
    case 'pickmonth': openMonthPicker(); break;
    case 'yprev': ui.ym=(+ui.ym.slice(0,4)-1)+ui.ym.slice(4); openMonthPicker(); render(); break;
    case 'ynext': ui.ym=(+ui.ym.slice(0,4)+1)+ui.ym.slice(4); openMonthPicker(); render(); break;
    case 'add': openTxForm(); break;
    case 'edit': openTxForm(d.id); break;
    case 'save-tx': saveTx(); break;
    case 'go-cats': ui.tab='cats'; render(); window.scrollTo(0,0); break;
    case 'go-home': ui.tab='home'; render(); window.scrollTo(0,0); break;
    case 'go-cat': ui.f={cat:d.id}; ui.back='cats'; ui.filter='all'; ui.q=''; ui.tab='tx'; render(); window.scrollTo(0,0); break;
    case 'go-pay': ui.f={pay:d.id}; ui.back='home'; ui.filter='all'; ui.q=''; ui.tab='tx'; render(); window.scrollTo(0,0); break;
    case 'go-future': ui.f={future:true}; ui.back='home'; ui.filter='all'; ui.q=''; ui.tab='tx'; render(); window.scrollTo(0,0); break;
    case 'back-f': ui.f={}; ui.tab=ui.back||'home'; render(); window.scrollTo(0,0); break;
    case 'clear-f': ui.f={}; render(); break;
    case 'reimb-open': openReimb(); break;
    case 'rb-all': { const l=pendingReimb(); rb.date=$('#rb-date').value||rb.date; rb.sel = rb.sel.size===l.length ? new Set() : new Set(l.map(t=>t.id)); drawReimb(); break; }
    case 'rb-go': reimbGo(); break;
    case 'imp-open': openImport(); break;
    case 'imp-card': imp.pay=d.id; drawImportStart(); break;
    case 'imp-comp': imp.comp=shiftYm(imp.comp,+d.step); drawImportReview(); break;
    case 'imp-only': imp.only=!imp.only; drawImportReview(); break;
    case 'imp-allcheck': { const on = imp.rows.some(r=>!r.include); imp.rows.forEach(r=>{ if(!r.dup||on===false) r.include=on; }); drawImportReview(); break; }
    case 'imp-go': importGo(); break;
    case 'del-grp': { const n=S.tx.filter(x=>x.grp===draft.grp).length; if(confirm(`Excluir as ${n} parcelas desta compra?`)){ S.tx=S.tx.filter(x=>x.grp!==draft.grp); save(); closeSheet(); render(); toast('Parcelas excluídas'); } break; }
    case 'del-tx': if(confirm('Excluir este lançamento?')){ const dt=S.tx.find(x=>x.id===draft.id); if(dt&&dt.rid) S.tx.forEach(x=>{ if(x.reimbId===dt.rid){ delete x.reimbId; delete x.reimbDate; } }); S.tx=S.tx.filter(x=>x.id!==draft.id); save(); closeSheet(); render(); toast('Excluído'); } break;
    case 'limit': openLimit(d.id); break;
    case 'save-limit': { const v=parseFloat(($('#f-limit').value||'').replace(/\./g,'').replace(',','.')); if(!(v>0)) return toast('Digite um valor válido'); S.budget[d.id]=v; save(); closeSheet(); render(); toast('Limite salvo ✓'); break; }
    case 'rm-limit': delete S.budget[d.id]; save(); closeSheet(); render(); break;
    case 'settings': ui.tab='settings'; render(); window.scrollTo(0,0); break;
    case 'add-cat': openCatForm(null,d.type); break;
    case 'edit-cat': openCatForm(d.id); break;
    case 'save-cat': saveCat(); break;
    case 'del-cat': askMove('cat',cdraft.id); break;
    case 'add-pay': openPayForm(); break;
    case 'edit-pay': openPayForm(d.id); break;
    case 'save-pay': savePay(); break;
    case 'del-pay': askMove('pay',pdraft.id); break;
    case 'do-move': doDelete(d.kind,d.id,$('#f-move').value); break;
    case 'defaults': if(confirm('Recriar as categorias padrão que estiverem faltando? Suas categorias e lançamentos atuais são mantidos.')){ DEFAULT_CATS.forEach(c=>{ if(!S.cats.some(x=>x.id===c.id)) S.cats.push({...c}); }); save(); render(); toast('Categorias padrão restauradas'); } break;
    case 'save-open': { const v=parseFloat($('#f-open').value.replace(/\./g,'').replace(',','.')); const m=$('#f-open-m').value; if(isNaN(v)||!m) return toast('Valor inválido'); S.opening={month:m,balance:v}; save(); render(); toast('Saldo inicial atualizado ✓'); break; }
    case 'export': download('meu-orcamento-backup-'+today()+'.json', JSON.stringify(S,null,1), 'application/json'); break;
    case 'import': $('#f-file').click(); break;
    case 'csv': {
      const rows=[['Data da compra','Competência','Tipo','Categoria','Descrição','Pago com','Parcela','Valor']].concat(S.tx.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(t=>[t.date,cm(t),TYPE_LABEL[t.type],cat(t.cat).name,t.note||'',t.type==='out'?pay(t.pay).name:'',t.inst||'',String(t.amount).replace('.',',')]));
      download('lancamentos.csv','﻿'+rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(';')).join('\n'),'text/csv'); break; }
    case 'reset': if(confirm('Apagar TODOS os dados deste aparelho? Isso não pode ser desfeito.')){ localStorage.removeItem(KEY); load(); S.tx=[]; save(); closeSheet(); render(); toast('Dados apagados'); } break;
    case 'close': closeSheet(); break;
  }
});
document.addEventListener('input', e=>{ if(e.target.id==='f-amount') updInstInfo(); });
document.addEventListener('change', e=>{
  const t=e.target;
  if(t.id==='f-pdf'){ const f=t.files[0]; if(f) importFile(f); return; }
  if(t.id==='rb-date'){ rb.date=t.value; return; }
  if(t.dataset.rbId){ rb.date=$('#rb-date').value||rb.date; t.checked ? rb.sel.add(t.dataset.rbId) : rb.sel.delete(t.dataset.rbId); drawReimb(); return; }
  if(t.dataset.impInc!==undefined){ imp.rows[+t.dataset.impInc].include=t.checked; drawImportReview(); return; }
  if(t.dataset.impFut!==undefined){ imp.rows[+t.dataset.impFut].future=t.checked; return; }
  if(t.dataset.impCat!==undefined){
    const r=imp.rows[+t.dataset.impCat]; r.cat=t.value;
    if(t.value) imp.rows.forEach(o=>{ if(o.mk===r.mk && !o.cat) o.cat=t.value; }); // mesmo estabelecimento: aplica junto
    drawImportReview(); return;
  }
  if(e.target.id==='f-inst'){ readDraft(); updInstInfo(); return; }
  if(e.target.id==='f-date'){ readDraft(); if(draft.type==='out' && isCard(draft.pay) && !draft.compManual) draft.comp=defaultComp(draft.date,draft.pay); drawTxForm(); return; }
  if(e.target.id!=='f-file') return;
  const f=e.target.files[0]; if(!f) return;
  const r=new FileReader(); r.onload=()=>{ try{ const j=JSON.parse(r.result); if(!Array.isArray(j.tx)||!j.cats) throw 0; S=j; migrate(); closeSheet(); render(); toast('Backup restaurado ✓'); }catch(_){ toast('Arquivo de backup inválido'); } }; r.readAsText(f);
});

// ---------- Início ----------
render();
if('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(()=>{});
