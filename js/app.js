"use strict";
(function(){

/* ============================ маршрути ============================ */
const ROUTES = [
  { slug:"vars",  id:"page-vars",  num:"01",
    nav:"Змінні, print і input", title:"Змінні, print і input — Python крок за кроком" },
  { slug:"cond",  id:"page-cond",  num:"02",
    nav:"Умови: if, elif, else", title:"Умови в Python — if, elif, else" },
  { slug:"loops", id:"page-loops", num:"03",
    nav:"Цикли: for і while",    title:"Цикли в Python — покроково" },
  { slug:"func",  id:"page-func",  num:"04",
    nav:"Функції",               title:"Функції в Python — def, return, стек викликів" },
  { slug:"coll",  id:"page-coll",  num:"05",
    nav:"Колекції",              title:"Колекції в Python — списки, словники, множини",
    kids:[
      { slug:"list", id:"page-list", num:"5.1",
        nav:"Списки",   title:"Списки в Python — індекси, зрізи, sorted, map, filter" },
      { slug:"dict", id:"page-dict", num:"5.2",
        nav:"Словники", title:"Словники в Python — ключ, значення і вбудовані функції" },
      { slug:"set",  id:"page-set",  num:"5.3",
        nav:"Множини",  title:"Множини в Python — набір без повторів" }
    ]}
];
/* плаский список — для «далі / назад» і для пошуку за slug */
const FLAT = ROUTES.reduce((a, r) => a.concat([r], r.kids || []), []);
/* старі посилання не мають ламатись */
const ALIAS = { dicts:"coll", sets:"set", lists:"list" };
const HOME_TITLE = "Python крок за кроком";
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

window.PageInit = {};           /* сюди реєструються скрипти окремих тем */
const started = {};             /* які теми вже ініціалізовані */

/* ============================ зупинка анімацій ============================ */
/* Сторінки не видаляються з DOM, а лише ховаються, тому їхні таймери треба
   гасити вручну. Інакше анімація крутиться на схованій сторінці, а таймери
   різних тем накладаються один на одний. */
const anims = [];               /* {el, stop, start} кожної анімованої вставки */
window.registerAnim = (a) => { anims.push(a); };

function stopPageAnims(){
  anims.forEach(a=>{ try{ a.stop(); }catch(err){ console.error("не зупинилась анімація", err); } });
  if(window.CollKit && window.CollKit.stopAllPlayers) window.CollKit.stopAllPlayers();
}
/* заводимо лише те, що лежить на щойно показаній сторінці */
function startPageAnims(){
  if(reduced) return;
  anims.forEach(a=>{
    if(!a.start || !a.el || !a.el.isConnected) return;
    if(a.el.closest(".page[hidden]")) return;
    try{ a.start(); }catch(err){ console.error("не запустилась анімація", err); }
  });
}

const $  = (s,r) => (r||document).querySelector(s);
const $$ = (s,r) => [...(r||document).querySelectorAll(s)];

const sidebar = $("#sidebar"), scrim = $("#scrim"), burger = $("#burger"),
      navList = $("#navList"), progBar = $("#progBar"), topbarTitle = $("#topbarTitle");

/* ============================ бічне меню ============================ */
navList.innerHTML = ROUTES.map(r => `
  <a class="nav-item${r.kids ? " has-kids" : ""}" href="#/${r.slug}" data-slug="${r.slug}">
    <span class="num">${r.num}</span><span class="t">${r.nav}</span>
  </a>
  <ul class="toc" data-toc="${r.slug}"></ul>` +
  (r.kids ? `<div class="subnav" data-sub="${r.slug}">` + r.kids.map(c => `
    <a class="nav-sub" href="#/${c.slug}" data-slug="${c.slug}">
      <span class="num">${c.num}</span><span class="t">${c.nav}</span>
    </a>
    <ul class="toc" data-toc="${c.slug}"></ul>`).join("") + `</div>` : "")
).join("");

function closeMenu(){
  sidebar.classList.remove("open");
  scrim.classList.remove("on");
  burger.setAttribute("aria-expanded","false");
}
burger.addEventListener("click", ()=>{
  const open = sidebar.classList.toggle("open");
  scrim.classList.toggle("on", open);
  burger.setAttribute("aria-expanded", open ? "true" : "false");
});
scrim.addEventListener("click", closeMenu);
document.addEventListener("keydown", e=>{ if(e.key==="Escape") closeMenu(); });

/* ============================ зміст теми ============================ */
function buildToc(route){
  const page = document.getElementById(route.id);
  const list = $(`[data-toc="${route.slug}"]`);
  const heads = $$("h2", page);
  heads.forEach((h,k)=>{ if(!h.id) h.id = route.slug + "-s" + k; });
  list.innerHTML = heads.map(h=>{
    const c = h.cloneNode(true);
    c.querySelectorAll(".badge").forEach(b=>b.remove());   /* бейдж «advanced» у зміст не тягнемо */
    return `<li><a href="#${h.id}" data-anchor="${h.id}">${c.textContent.trim()}</a></li>`;
  }).join("");
  list.addEventListener("click", e=>{
    const a = e.target.closest("[data-anchor]");
    if(!a) return;
    e.preventDefault();
    const el = document.getElementById(a.dataset.anchor);
    if(!el) return;
    closeMenu();
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 22,
                      behavior: reduced ? "auto" : "smooth" });
  });
}

/* ============================ навігація «далі / назад» ============================ */
function buildPager(route){
  const i = FLAT.indexOf(route);
  const prev = FLAT[i-1], next = FLAT[i+1];
  const wrap = $(".wrap", document.getElementById(route.id));
  if(!wrap) return;
  const box = document.createElement("div");
  box.className = "pager";
  box.innerHTML =
    (prev ? `<a class="prev" href="#/${prev.slug}"><span class="lbl">← попередня тема</span><span class="ttl">${prev.nav}</span></a>`
          : `<a class="prev" href="#/"><span class="lbl">← на початок</span><span class="ttl">Усі теми</span></a>`) +
    (next ? `<a class="next" href="#/${next.slug}"><span class="lbl">наступна тема →</span><span class="ttl">${next.nav}</span></a>`
          : `<a class="next" href="#/"><span class="lbl">це остання тема →</span><span class="ttl">Усі теми</span></a>`);
  wrap.appendChild(box);
}

/* ============================ роутер ============================ */
function slugFromHash(){
  let h = location.hash.replace(/^#\/?/, "").trim();
  if(ALIAS[h]) h = ALIAS[h];
  return FLAT.some(r=>r.slug===h) ? h : null;
}

let activeRoute = null;

function render(){
  const slug = slugFromHash();
  const route = FLAT.find(r=>r.slug===slug) || null;
  activeRoute = route;

  stopPageAnims();              /* спершу гасимо те, що анімувалось досі */

  $$(".page").forEach(p=>{ p.hidden = true; });
  document.getElementById(route ? route.id : "page-home").hidden = false;

  document.body.dataset.route = route ? "article" : "home";
  document.title = route ? route.title : HOME_TITLE;
  if(route) topbarTitle.textContent = route.nav;

  $$(".nav-item, .nav-sub").forEach(a=>
    a.classList.toggle("active", !!route && a.dataset.slug===route.slug));
  $$(".toc").forEach(u=>u.classList.toggle("open", !!route && u.dataset.toc===route.slug));
  $$(".subnav").forEach(d=>{
    const parent = ROUTES.find(r=>r.slug===d.dataset.sub);
    const on = !!route && !!parent &&
      (route.slug===parent.slug || (parent.kids||[]).some(c=>c.slug===route.slug));
    d.classList.toggle("open", on);
    const head = $(`.nav-item[data-slug="${d.dataset.sub}"]`);
    if(head) head.classList.toggle("trail", on && route.slug!==parent.slug);
  });

  if(route && !started[route.slug]){
    started[route.slug] = true;
    buildToc(route);
    buildPager(route);
    try { if(window.PageInit[route.slug]) window.PageInit[route.slug](); }
    catch(err){ console.error("Помилка теми " + route.slug, err); }
  }

  closeMenu();
  window.scrollTo(0, 0);
  homeAnim(!route);
  startPageAnims();
  updateProgress();
}

window.addEventListener("hashchange", render);

/* ============================ прогрес читання + підсвітка змісту ============================ */
function updateProgress(){
  if(!activeRoute){ progBar.style.width = "0%"; return; }
  const max = document.documentElement.scrollHeight - window.innerHeight;
  progBar.style.width = (max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0) + "%";

  const links = $$(`[data-toc="${activeRoute.slug}"] a`);
  if(!links.length) return;
  let current = links[0];
  for(const a of links){
    const el = document.getElementById(a.dataset.anchor);
    if(el && el.getBoundingClientRect().top <= 130) current = a; else break;
  }
  links.forEach(a=>a.classList.toggle("on", a===current));
}
let ticking = false;
window.addEventListener("scroll", ()=>{
  if(ticking) return;
  ticking = true;
  requestAnimationFrame(()=>{ updateProgress(); ticking = false; });
}, {passive:true});

/* ============================ анімації на головній ============================ */
function cycler(steps){
  let i = 0, timer = null;
  function tick(){
    steps[i].run();
    const wait = steps[i].d;
    i = (i + 1) % steps.length;
    timer = setTimeout(tick, wait);
  }
  return {
    start(){ if(timer || reduced) return; tick(); },
    /* i скидаємо, щоб повернення на головну починало показ з початку,
       а не з середини перерваного циклу */
    stop(){ clearTimeout(timer); timer = null; i = 0; },
    once(){ steps.forEach(s=>s.run()); }
  };
}

function restart(el, cls){
  el.classList.remove(cls);
  void el.getBoundingClientRect();
  el.classList.add(cls);
}

/* --- 1. змінні --- */
function vizVars(svg){
  const line  = $("[data-line]", svg);
  const boxA  = $('[data-box="a"]', svg), boxB = $('[data-box="b"]', svg);
  const valA  = $('[data-val="a"]', svg), valB = $('[data-val="b"]', svg);
  const ghost = $('[data-ghost="a"]', svg);
  const flow  = $("[data-flow]", svg), token = $("[data-token]", svg);

  const setBox = (box, cls) => box.setAttribute("class", "vz-box" + (cls ? " " + cls : ""));
  const setVal = (el, text, empty) => {
    el.textContent = text;
    el.setAttribute("class", "vz-val" + (empty ? " none" : ""));
    if(!empty) restart(el, "pop");
  };

  return cycler([
    { d:800, run(){
        line.textContent = "a = 2";
        setBox(boxA,"empty"); setBox(boxB,"empty");
        setVal(valA,"порожньо",true); setVal(valB,"порожньо",true);
        flow.classList.remove("on"); token.classList.remove("go");
        ghost.classList.remove("go");
      }},
    { d:1000, run(){ setBox(boxA,"hot"); setVal(valA,"2"); }},
    { d:600,  run(){ line.textContent = "b = a"; }},
    { d:950,  run(){ flow.classList.add("on"); restart(token,"go"); }},
    { d:1100, run(){ setBox(boxB,"cool"); setVal(valB,"2");
                     flow.classList.remove("on"); token.classList.remove("go"); }},
    { d:600,  run(){ line.textContent = "a = 10"; setBox(boxA,"hot"); }},
    { d:1100, run(){ ghost.textContent = "2"; restart(ghost,"go"); setVal(valA,"10"); }},
    { d:1900, run(){ line.textContent = "print(b) → 2"; setBox(boxB,"cool"); restart(valB,"pop"); }}
  ]);
}

/* --- 2. умови --- */
function vizCond(svg){
  const chip = $("[data-val]", svg);
  const CASES = [
    {v:95, ok:true}, {v:42, ok:false}, {v:90, ok:true}, {v:71, ok:false}
  ];
  let n = 0, cur = CASES[0];

  return cycler([
    { d:900, run(){
        cur = CASES[n % CASES.length]; n++;
        svg.classList.remove("t","f","checking");
        chip.textContent = "score = " + cur.v;
      }},
    { d:1200, run(){ svg.classList.add("checking"); }},
    { d:1900, run(){ svg.classList.remove("checking"); svg.classList.add(cur.ok ? "t" : "f"); }}
  ]);
}

/* --- 3. цикли --- */
function vizLoop(svg){
  const N = 8, cells = $("[data-cells]", svg), mark = $("[data-mark]", svg),
        line = $("[data-line]", svg);
  const NS = "http://www.w3.org/2000/svg";
  for(let k = 0; k < N; k++){
    const x = 12 + k * 38;
    const r = document.createElementNS(NS, "rect");
    r.setAttribute("class","vz-cell"); r.setAttribute("x",x); r.setAttribute("y",56);
    r.setAttribute("width",30); r.setAttribute("height",30); r.setAttribute("rx",8);
    const t = document.createElementNS(NS, "text");
    t.setAttribute("class","vz-cn"); t.setAttribute("x",x+15); t.setAttribute("y",75);
    t.textContent = k;
    cells.append(r, t);
  }
  const rects = $$(".vz-cell", cells), nums = $$(".vz-cn", cells);
  const paint = (k) => rects.forEach((r,j)=>{
    const cls = j === k ? "now" : (k >= 0 && j < k ? "done" : "");
    r.setAttribute("class","vz-cell" + (cls ? " " + cls : ""));
    nums[j].setAttribute("class","vz-cn" + (cls ? " " + cls : ""));
  });

  /* Маркер має transition:transform, тому просте скидання на початок
     проганяло б його назад через увесь рядок. Знімаємо перехід, ставимо
     нуль, форсуємо reflow — і лише потім вертаємо перехід. */
  function resetMark(){
    mark.classList.remove("on");
    mark.style.transition = "none";
    mark.style.transform = "translateX(0px)";
    void mark.getBoundingClientRect();
    mark.style.transition = "";
  }

  const steps = [{ d:700, run(){
      paint(-1); resetMark();
      line.innerHTML = 'i = <tspan class="hi">?</tspan> → цикл ще не почався';
    }}];
  for(let k = 0; k < N; k++){
    steps.push({ d:430, run(){
      paint(k);
      mark.classList.add("on");
      mark.style.transform = "translateX(" + (k * 38) + "px)";
      line.innerHTML = 'i = <tspan class="hi">' + k + '</tspan> → print(i)';
    }});
  }
  steps.push({ d:1700, run(){
    paint(N); resetMark();
    line.innerHTML = 'цикл завершено — тіло виконалось <tspan class="hi">8</tspan> разів';
  }});
  return cycler(steps);
}

/* --- 4. словники --- */
function vizDict(svg){
  const line = $("[data-line]", svg);
  const rows = [0,1,2].map(k=>$('[data-row="' + k + '"]', svg));
  const DATA = [["Оля",16], ["Іван",15], ["Ніна",14]];
  const Q = ["Оля", "Ніна", "Петро", "Іван"];
  let n = 0, cur = Q[0];

  return cycler([
    { d:850, run(){
        cur = Q[n % Q.length]; n++;
        rows.forEach(r=>r.removeAttribute("class"));
        line.setAttribute("class","vz-code");
        line.textContent = 'ages["' + cur + '"]';
      }},
    { d:1600, run(){
        const i = DATA.findIndex(d=>d[0]===cur);
        if(i >= 0){
          rows.forEach((r,k)=>r.setAttribute("class", k===i ? "hit" : "dim"));
          line.textContent = 'ages["' + cur + '"] → ' + DATA[i][1];
        }else{
          rows.forEach(r=>r.setAttribute("class","dim"));
          line.setAttribute("class","vz-code err");
          line.textContent = 'ages["' + cur + '"] → KeyError';
        }
      }}
  ]);
}

/* --- 5. функції --- */
function vizFunc(svg){
  const line = $("[data-line]", svg), note = $("[data-note]", svg), box = $('[data-box="f"]', svg);
  const pA = $('[data-pill="a"]', svg), tA = $('[data-pt="a"]', svg);
  const pR = $('[data-pill="r"]', svg), tR = $('[data-pt="r"]', svg);
  const w1 = $('[data-w="1"]', svg), h1 = $('[data-h="1"]', svg);
  const w2 = $('[data-w="2"]', svg), h2 = $('[data-h="2"]', svg);
  const dIn = $('[data-dot="in"]', svg), dOut = $('[data-dot="out"]', svg);
  const VALS = [4, 7, 9, 12];
  let n = 0, v = VALS[0];
  const set = (el, cls) => el.setAttribute("class", cls);

  return cycler([
    { d:700, run(){
        v = VALS[n % VALS.length]; n++;
        set(pA,"vz-fpill arg"); set(tA,"vz-fpt arg"); tA.textContent = "?";
        set(pR,"vz-fpill ret"); set(tR,"vz-fpt ret"); tR.textContent = "?";
        set(box,"vz-fbox");
        set(w1,"vz-fwire"); set(h1,"vz-fhead"); set(w2,"vz-fwire"); set(h2,"vz-fhead");
        set(dIn,"vz-fdot"); set(dOut,"vz-fdot back");
        line.textContent = "square(" + v + ")";
        note.textContent = "виклик функції";
      }},
    { d:800, run(){
        set(pA,"vz-fpill arg on"); set(tA,"vz-fpt arg on"); tA.textContent = v;
        note.textContent = "аргумент " + v + " готовий";
      }},
    { d:850, run(){
        set(w1,"vz-fwire on"); set(h1,"vz-fhead on"); restart(dIn,"go");
        note.textContent = "n = " + v + " — заходимо всередину";
      }},
    { d:800, run(){ set(box,"vz-fbox work"); note.textContent = "усередині: n * n"; }},
    { d:850, run(){
        set(box,"vz-fbox"); set(w2,"vz-fwire done"); set(h2,"vz-fhead done"); restart(dOut,"go");
        note.textContent = "return віддає результат";
      }},
    { d:2000, run(){
        set(pR,"vz-fpill ret on"); set(tR,"vz-fpt ret on"); tR.textContent = v * v;
        line.textContent = "square(" + v + ") → " + (v * v);
        note.textContent = "значення стало на місце виклику";
      }}
  ]);
}

const VIZ = {};
(function initViz(){
  const map = { vars: vizVars, cond: vizCond, loops: vizLoop, func: vizFunc, dicts: vizDict };
  $$("[data-viz]").forEach(card=>{
    const kind = card.dataset.viz;
    const svg = $("svg", card);
    if(!map[kind] || !svg) return;
    const anim = map[kind](svg);
    VIZ[kind] = anim;
    if(reduced) anim.once();
    card.addEventListener("mouseenter", ()=>anim.start());
  });
})();

function homeAnim(on){
  Object.values(VIZ).forEach(a => on && !document.hidden ? a.start() : a.stop());
}
document.addEventListener("visibilitychange", ()=>homeAnim(!activeRoute));

/* поява карток */
(function reveal(){
  const items = $$(".reveal");
  if(reduced){ items.forEach(el=>el.classList.add("in")); return; }
  items.forEach((el,k)=>{
    el.style.transitionDelay = (k * 90) + "ms";
    setTimeout(()=>el.classList.add("in"), 60);
  });
})();

/* ============================ відповіді на задачі ============================ */
document.addEventListener("click", e=>{
  const b = e.target.closest("[data-answer]");
  if(!b) return;
  const box = document.getElementById(b.dataset.answer);
  if(!box) return;
  const open = box.classList.toggle("show");
  b.textContent = open ? "Сховати відповідь" : "Показати відповідь";
});

/* ============================ старт ============================ */
/* скрипти окремих тем стоять нижче в документі — чекаємо, поки вони зареєструються */
if(document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", render, {once:true});
else
  render();

})();
