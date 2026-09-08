/* ==========================================================================
   Живі приклади в тексті.
   <span class="ilive" data-ilive="range" data-args="5">range(5)</span>
   дописує поруч смужку результату, яка заповнюється при появі в екрані
   і перезапускається при наведенні.
   ========================================================================== */
"use strict";
(function(){

const reduced = (window.Motion && window.Motion.reduced) ||
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const TICK = 240;

/* ---------- розбір аргументів ---------- */
const nums = (s) => String(s).split(",").map(x=>Number(x.trim()));

/* Послідовність для len / slice: з комою — список, без коми — рядок. */
function seqOf(s){
  return s.indexOf(",") >= 0 ? s.split(",").map(x=>x.trim()) : [...String(s)];
}

/* ---------- чотири типи ----------
   Кожен віддає {tokens, steps}: tokens — сталий набір клітинок (щоб CSS-переходи
   мали за що чіплятися), steps — класи для кожної клітинки в кожному кадрі.
   Порожній клас означає «ще не з'явилась». */

function specRange(args){
  const p = nums(args);
  let start = 0, stop = p[0], step = 1;
  if(p.length > 1){ start = p[0]; stop = p[1]; step = p.length > 2 ? p[2] : 1; }
  const vals = [];
  if(step > 0) for(let v = start; v < stop && vals.length < 20; v += step) vals.push(v);
  if(step < 0) for(let v = start; v > stop && vals.length < 20; v += step) vals.push(v);
  if(!vals.length) return { tokens:[{t:"порожньо"}], steps:[[{c:"dim"}]] };

  const tokens = vals.map(v=>({ t:String(v) }));
  const steps = vals.map((_,k)=> tokens.map((_,j)=>({ c: j < k ? "res" : j === k ? "on" : "" })));
  steps.push(tokens.map(()=>({ c:"res" })));
  return { tokens, steps };
}

function specSlice(args){
  const parts = String(args).split(":");
  const items = seqOf(parts[0]);
  const from = Math.max(0, Number(parts[1] || 0));
  const to   = Math.min(items.length, parts[2] === undefined || parts[2] === "" ? items.length : Number(parts[2]));
  const tokens = items.map(x=>({ t:String(x) }));

  const steps = [ tokens.map(()=>({ c:"dim" })) ];
  for(let k = from; k < to; k++)
    steps.push(tokens.map((_,j)=>({ c: j >= from && j <= k ? "res" : "dim" })));
  steps.push(tokens.map((_,j)=>({ c: j >= from && j < to ? "res" : "cut" })));
  return { tokens, steps };
}

function specTruthy(args){
  const raw = String(args).trim();
  /* «порожні» значення Python: 0, "", [], {}, None */
  const empty = raw === "0" || raw === "0.0" || raw === '""' || raw === "''" ||
                raw === "[]" || raw === "{}" || raw === "None" || raw === "";
  const ok = !empty;
  const tokens = [{ t: raw || '""' }, { sep:true, t:"→" }, { t: ok ? "True" : "False" }];
  return { tokens, steps:[
    [{c:"dim"}, {c:""}, {c:""}],
    [{c:"dim"}, {c:"dim"}, {c: ok ? "res" : "no"}]
  ]};
}

function specLen(args){
  const items = seqOf(String(args).replace(/^["'[]|["'\]]$/g, ""));
  const tokens = items.map(x=>({ t:String(x) }))
    .concat([{ sep:true, t:"→" }, { t:"0" }]);
  const n = items.length;
  const steps = [];
  for(let k = 0; k < n; k++){
    steps.push(tokens.map((_,j)=>
      j < n            ? { c: j <= k ? "res" : "dim" } :
      j === n          ? { c:"dim" } :
                         { c:"on", t:String(k + 1) }));
  }
  steps.push(tokens.map((_,j)=>
    j < n ? { c:"res" } : j === n ? { c:"dim" } : { c:"res", t:String(n) }));
  return { tokens, steps };
}

const TYPES = { range:specRange, slice:specSlice, truthy:specTruthy, len:specLen };

/* ---------- один приклад ---------- */
function attach(el){
  const make = TYPES[el.dataset.ilive];
  if(!make) return;
  let spec;
  try{ spec = make(el.dataset.args || ""); }
  catch(err){ console.error("живий приклад не побудувався", el.dataset.ilive, err); return; }
  if(!spec.steps.length) return;

  const out = document.createElement("span");
  out.className = "ilive-out";
  out.setAttribute("aria-hidden", "true");      /* це ілюстрація, текст поруч уже все каже */
  const cells = spec.tokens.map(tok=>{
    const s = document.createElement("span");
    s.className = tok.sep ? "isep" : "iv";
    s.textContent = tok.t;
    out.appendChild(s);
    return s;
  });
  el.after(out);

  let timer = null, k = -1;

  function draw(n){
    k = n;
    const row = spec.steps[n];
    cells.forEach((c, j)=>{
      const st = row[j] || { c:"" };
      if(st.t !== undefined && c.textContent !== st.t) c.textContent = st.t;
      if(spec.tokens[j].sep) c.style.opacity = st.c ? "" : "0";
      else c.className = "iv" + (st.c ? " " + st.c : "");
    });
  }

  function stop(){ clearTimeout(timer); timer = null; }
  function tick(){
    if(k >= spec.steps.length - 1){ stop(); return; }
    draw(k + 1);
    timer = setTimeout(tick, TICK);
  }
  function start(){
    if(reduced){ draw(spec.steps.length - 1); return; }
    if(timer) return;
    if(k >= spec.steps.length - 1) k = -1;     /* догралось — починаємо спочатку */
    timer = setTimeout(tick, 60);
  }
  function restart(){ if(reduced) return; stop(); k = -1; draw(0); start(); }

  draw(reduced ? spec.steps.length - 1 : 0);
  el.addEventListener("mouseenter", restart);
  el.addEventListener("click", restart);

  if(!reduced && "IntersectionObserver" in window){
    const io = new IntersectionObserver(entries=>{
      entries.forEach(en=>{ if(en.isIntersecting){ io.disconnect(); start(); } });
    }, { threshold:.6 });
    io.observe(el);
  }else if(!reduced){
    start();
  }

  /* роутер гасить анімації схованих сторінок — віддаємо йому важелі */
  if(window.registerAnim) window.registerAnim({ el, start, stop });
}

document.querySelectorAll(".ilive").forEach(attach);

})();
