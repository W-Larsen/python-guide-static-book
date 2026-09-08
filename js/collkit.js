/* ==========================================================================
   Спільний рушій віджетів для розділу «Колекції»
   ========================================================================== */
"use strict";
window.CollKit = (function(){

const esc = (s) => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

const KW = /\b(for|in|while|if|elif|else|not|and|or|True|False|None|del|lambda|return|def|import|from|is)\b/g;
const FN = /\b(print|len|range|sorted|sum|min|max|map|filter|any|all|enumerate|zip|list|set|dict|tuple|str|int|float|abs|round|reversed|type|append|insert|remove|pop|get|items|keys|values|add|discard|union|intersection|difference|symmetric_difference|issubset|issuperset|isdisjoint|update|copy|index|count|sort|split|join|fromkeys|Counter|key|reverse|default)\b/g;

/* підсвітка синтаксису: рядки й коментарі витягуються у плейсхолдери, щоб їх не чіпали інші правила */
function hl(line){
  let s = esc(line), cmt = null, inq = false, ci = -1;
  for(let k = 0; k < s.length; k++){
    const c = s[k];
    if(c === '"') inq = !inq;
    else if(c === "#" && !inq){ ci = k; break; }
  }
  if(ci >= 0){ cmt = s.slice(ci); s = s.slice(0, ci); }

  const lits = [];
  s = s.replace(/"[^"]*"/g, m => {
    lits.push(m);
    return "\u0001" + String.fromCharCode(64 + lits.length) + "\u0001";
  });
  s = s.replace(KW, '<span class="kw">$1</span>');
  s = s.replace(FN, '<span class="fn">$1</span>');
  s = s.replace(/\b(\d+)\b/g, '<span class="num">$1</span>');
  s = s.replace(/\u0001([A-Z])\u0001/g, (m, k) => `<span class="str">${lits[k.charCodeAt(0) - 65]}</span>`);
  return s + (cmt ? `<span class="cmt">${cmt}</span>` : "");
}

/* Рушій руху. Якщо motion.js чомусь не під'єднали, працюємо без анімацій —
   кадри від цього не ламаються, бо все й так намальоване в DOM. */
const MO = window.Motion || { reduced:true, snapshot:()=>null, flip:()=>{},
                              tween:(el,f,t)=>{ if(el) el.textContent = String(t); },
                              cancel:()=>{} };

/* Усі створені програвачі: потрібні, щоб зупиняти анімації при переході на іншу
   тему й перезаміряти висоти, коли зміняться шрифти або ширина вікна. */
const players = [];
function stopAllPlayers(){ players.forEach(p=>p.stop()); }
function relockAllPlayers(){ players.forEach(p=>p.relock()); }

/* Заміри висоти залежать від шрифту й ширини колонки. Веб-шрифт приїжджає вже
   після першого рендера, а ширина змінюється при ресайзі — тому перезаміряємо. */
if(document.fonts && document.fonts.ready) document.fonts.ready.then(relockAllPlayers);
let relockTimer = null;
window.addEventListener("resize", ()=>{
  clearTimeout(relockTimer);
  relockTimer = setTimeout(relockAllPlayers, 180);
});

/* ================= читання налаштувань ================= */
/* Число з поля, обмежене його ж min/max. Порожнє або нечислове значення дає
   fallback, а не 0: інакше очищене поле мовчки показувало б нуль, ніби так і
   задумано. Атрибути min/max браузер не застосовує до набраного вручну. */
function numCfg(root, sel, fallback){
  const el = root.querySelector(sel);
  if(!el) return fallback;
  const raw = String(el.value).trim();
  let n = raw === "" ? NaN : Number(raw);
  if(!Number.isFinite(n)) n = fallback;
  const lo = el.min === "" ? -Infinity : Number(el.min);
  const hi = el.max === "" ?  Infinity : Number(el.max);
  return Math.min(hi, Math.max(lo, n));
}

/* Активний режим перемикача. Якщо жодна кнопка не натиснута — беремо першу,
   щоб віджет не падав на .dataset неіснуючого елемента. */
function modeCfg(root, group){
  const sel = group ? `[data-mode][data-group="${group}"]` : "[data-mode]";
  const on = root.querySelector(`${sel}[aria-pressed="true"]`) || root.querySelector(sel);
  return on ? on.dataset.mode : "";
}

/* ================= оновлення вмісту на місці ================= */
/* Раніше блок .extra щокадру перемальовувався через innerHTML. Через це всі
   CSS-переходи (.cell, .bar, .kvrow, .selem, .hashslot) не працювали: елементи
   щоразу були новими, і браузеру не було від чого анімувати. Тут ми оновлюємо
   дерево на місці, поки його структура збігається, — і переходи оживають. */
function patchNode(oldN, newN){
  if(oldN.nodeType === 3 && newN.nodeType === 3){
    if(oldN.data !== newN.data) oldN.data = newN.data;
    return;
  }
  if(oldN.nodeType !== 1 || newN.nodeType !== 1 || oldN.tagName !== newN.tagName){
    oldN.replaceWith(newN);
    return;
  }
  for(const a of [...oldN.attributes])
    if(!newN.hasAttribute(a.name)) oldN.removeAttribute(a.name);
  for(const a of newN.attributes)
    if(oldN.getAttribute(a.name) !== a.value) oldN.setAttribute(a.name, a.value);
  patchChildren(oldN, [...newN.childNodes]);
}

function patchChildren(host, next){
  const cur = [...host.childNodes];
  if(cur.length !== next.length){ host.replaceChildren(...next); return; }
  for(let k = 0; k < cur.length; k++) patchNode(cur[k], next[k]);
}

function patchInto(host, html){
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  patchChildren(host, [...tmp.childNodes]);
}

/* ================= стала висота блоків ================= */
/* Блок, вміст якого змінюється з кадром, мусить мати висоту найвищого кадру —
   інакше під час анімації він росте й зсуває весь текст під віджетом.
   Усі варіанти вмісту міряються за один прохід: спершу вставляємо їх усі в
   невидимий probe, і лише потім читаємо висоти — це один reflow, а не N. */
function lockHeight(el, htmlList){
  if(!el || !htmlList.length) return;
  if(!el.offsetParent) return;                /* сторінка схована — міряти нічого */
  el.style.minHeight = "";                    /* щоб прочитати саме CSS-значення */
  const cs = getComputedStyle(el);
  const padT = parseFloat(cs.paddingTop),  padB = parseFloat(cs.paddingBottom);
  const padL = parseFloat(cs.paddingLeft), padR = parseFloat(cs.paddingRight);
  const floor = parseFloat(cs.minHeight) || 0;

  /* Абсолютні координати рахуються від padding-box, тому left:0/right:0 дали б
     пробі зайві padding-и в ширину — текст переносився б пізніше, ніж насправді,
     і заміряна висота вийшла б замалою. Тому ширину задаємо по content-box. */
  const probe = document.createElement("div");
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText = "position:absolute; visibility:hidden; pointer-events:none; top:0;" +
    `left:${padL}px; width:${Math.max(0, el.clientWidth - padL - padR)}px`;
  const kids = htmlList.map(html=>{
    const d = document.createElement("div");
    d.className = el.className;               /* той самий flex / шрифт / gap */
    d.style.cssText = "min-height:0; margin:0; padding:0; position:static";
    d.innerHTML = html;
    probe.appendChild(d);
    return d;
  });
  el.appendChild(probe);
  let max = 0;
  for(const d of kids) max = Math.max(max, d.getBoundingClientRect().height);
  probe.remove();
  el.style.minHeight = Math.ceil(Math.max(max + padT + padB, floor)) + "px";
}

/* ================= іконки керування ================= */
/* Вбудований SVG — без сторонніх залежностей і без зайвого запиту. */
const svg = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
const ICON = {
  reset: svg("M7 6h2.3v12H7zM19 6v12l-8.4-6z"),
  back:  svg("M15.4 5.5 16.9 7l-5 5 5 5-1.5 1.5L8.9 12z"),
  step:  svg("M8.6 5.5 7.1 7l5 5-5 5 1.5 1.5 6.5-6.5z"),
  play:  svg("M8 5v14l11-7z"),
  pause: svg("M7 5h3.4v14H7zM13.6 5H17v14h-3.4z")
};

/* Швидкості, які циклює кнопка. Множник до cfg.tick. */
const SPEEDS = [0.5, 1, 2];
const speedLabel = (s) => (s === 1 ? "1×" : s === 2 ? "2×" : "0.5×");

/* ================= програвач кроків ================= */
/* Один рушій на всі теми. Теми різняться лише підсвіткою синтаксису й
   швидкістю автопрокрутки — їх передає makePlayer через cfg. */
function createPlayerWith(root, spec, cfg){
  if(!root) return;
  root.innerHTML = `
    ${spec.config ? `<div class="w-config">${spec.config}</div>` : ""}
    <div class="panes">
      <div class="pane">
        <div class="pane-title">Код</div>
        <pre class="code" data-code></pre>
      </div>
      <div class="pane">
        <div class="pane-title">Змінні зараз</div>
        <div class="chips" data-chips></div>
        <div class="pane-title">Вивід</div>
        <div class="out" data-out></div>
      </div>
    </div>
    ${spec.extra ? `<div class="extra" data-extra></div>` : ""}
    ${spec.legend ? `<div class="legend">${spec.legend}</div>` : ""}
    <div class="note" data-note><span class="dot"></span><span data-notetext></span></div>
    <div class="controls">
      <button class="ctl ico" data-reset aria-label="На початок" title="На початок">${ICON.reset}</button>
      <button class="ctl ico" data-back aria-label="Крок назад" title="Крок назад">${ICON.back}</button>
      <button class="ctl play" data-play aria-label="Запустити" title="Запустити">${ICON.play}</button>
      <button class="ctl ico" data-step aria-label="Крок вперед" title="Крок вперед">${ICON.step}</button>
      <div class="timeline">
        <input type="range" min="0" max="1" value="0" data-scrub aria-label="Крок виконання">
        <div class="ticks" data-ticks aria-hidden="true"></div>
      </div>
      <span class="counter" data-counter></span>
      <button class="ctl speed" data-speed aria-label="Швидкість відтворення" title="Швидкість відтворення">1×</button>
    </div>`;

  const $ = (s) => root.querySelector(s);
  const codeEl=$("[data-code]"), chipsEl=$("[data-chips]"), outEl=$("[data-out]"),
        noteEl=$("[data-note]"), noteTx=$("[data-notetext]"), extraEl=$("[data-extra]"),
        playB=$("[data-play]"), backB=$("[data-back]"), stepB=$("[data-step]"),
        resetB=$("[data-reset]"), speedB=$("[data-speed]"),
        scrub=$("[data-scrub]"), ticksEl=$("[data-ticks]"), counter=$("[data-counter]");

  let frames=[], code=[], idx=0, raf=null, acc=0, last=0, prevChips=null;
  let speedI = 1, touched = false, quiet = false;
  /* «ключ деталі → кадри, де вона активна» і «рядок коду → перший його кадр»:
     обидва індекси роблять сцену клікабельною (див. §пряма маніпуляція) */
  let keyIdx = Object.create(null), lineIdx = Object.create(null);

  /* однакові будівники розмітки для рендера й для замірів висоти */
  const chipsOf = (f) => (f.vars||[]).map(v=>
      `<span class="chip ${v.cls||""}" data-key="${esc(v.name)}"><b>${esc(v.name)}</b> = ${esc(v.val)}</span>`).join("")
    || `<span class="chip" style="opacity:.5">поки порожньо</span>`;
  const outOf = (f) => {
    const out = f.out||[];
    return out.length
      ? out.map((l,k)=>`<div class="ln ${k===out.length-1?"last":""}">${esc(l)||" "}</div>`).join("")
      : `<div class="empty">консоль порожня</div>`;
  };
  const noteOf = (f) => `<span class="dot"></span><span>${esc(f.note||"")}</span>`;

  /* Висоту блоків, що змінюються з кадром, фіксуємо по найвищому кадру, щоб
     текст під віджетом не з'їзджав під час анімації. Консоль окремо: у неї
     буває до 30 рядків, тому це не min-height, а стала висота з прокруткою. */
  function lockAll(){
    const lines = Math.max(1, ...frames.map(f=>(f.out||[]).length));
    outEl.style.setProperty("--out-lines", String(Math.min(9, Math.max(3, lines))));
    noteEl.className = "note";                /* міряємо базовий вигляд */
    lockHeight(chipsEl, frames.map(chipsOf));
    lockHeight(noteEl,  frames.map(noteOf));
    if(extraEl) lockHeight(extraEl, frames.map(f=>spec.extra(f)));
  }

  /* ---------- індекси прямої маніпуляції ----------
     Розмітка кадрів усе одно будується для lockHeight, тож зайвої роботи
     тут нема: той самий прохід збирає, у яких кадрах кожна деталь активна.
     «Активна» — це клас now, hit або active у розмітці кадру. */
  const ACTIVE = /(^|\s)(now|hit|active)(\s|$)/;
  function buildIndex(){
    keyIdx = Object.create(null); lineIdx = Object.create(null);
    const box = document.createElement("div");
    frames.forEach((f,k)=>{
      if(lineIdx[f.line] === undefined) lineIdx[f.line] = k;
      /* чипи: змінна «активна» в усіх кадрах, де вона взагалі є */
      (f.vars||[]).forEach(v=>{ (keyIdx[v.name] = keyIdx[v.name] || []).push(k); });
      if(!spec.extra) return;
      box.innerHTML = spec.extra(f);
      box.querySelectorAll("[data-key]").forEach(el=>{
        if(!ACTIVE.test(el.className) && !ACTIVE.test(el.firstElementChild ? el.firstElementChild.className : "")) return;
        const key = el.dataset.key, list = keyIdx[key] = keyIdx[key] || [];
        if(list[list.length-1] !== k) list.push(k);
      });
    });
  }

  /* Клікабельні деталі не потрапляють в табуляцію окремо (навігація по кадрах
     покриває той самий сценарій) — їм лишається пояснення в title. */
  function markClickable(host){
    if(!host) return;
    host.querySelectorAll("[data-key]").forEach(el=>{
      if(!keyIdx[el.dataset.key]) return;      /* деталь ніде не активна — нема куди вести */
      el.classList.add("jump");
      el.title = "Перемотати до кадру, де ця деталь активна";
    });
  }

  function buildTicks(){
    /* засічки читаються, поки їх небагато; далі вони зливаються в сіру смугу */
    if(frames.length < 2 || frames.length > 40){ ticksEl.hidden = true; ticksEl.innerHTML = ""; return; }
    ticksEl.hidden = false;
    ticksEl.innerHTML = new Array(frames.length).fill("<i></i>").join("");
  }

  function rebuild(){
    const built = spec.build(spec.readCfg ? spec.readCfg(root) : {});
    code = built.code || []; frames = built.frames || [];
    codeEl.innerHTML = code.map((l,k)=>`<span class="cl" data-l="${k}">${cfg.hl(l)||"&nbsp;"}</span>`).join("");
    /* без кадрів render() впав би на f.line — глушимо керування, а не віджет */
    if(!frames.length){
      prevChips = null;
      keyIdx = Object.create(null); lineIdx = Object.create(null);
      noteTx.textContent = "Для цих налаштувань немає що показати.";
      counter.textContent = "0 / 0";
      ticksEl.hidden = true; ticksEl.innerHTML = "";
      [playB, backB, stepB, resetB, scrub].forEach(el=>{ el.disabled = true; });
      return;
    }
    [playB, scrub, speedB].forEach(el=>{ el.disabled = false; });
    idx = 0; prevChips = null; scrub.max = frames.length-1; scrub.value = 0;
    buildIndex();
    buildTicks();
    lockAll();
    render();
  }

  function render(){
    const f = frames[idx];
    /* знімок ДО оновлення DOM — далі FLIP програє різницю */
    const before = quiet ? null : MO.snapshot(root);

    codeEl.querySelectorAll(".cl").forEach(el=>{
      el.classList.toggle("active", Number(el.dataset.l)===f.line);
    });
    /* чипи оновлюються на місці, а не через innerHTML: інакше вони щокадру
       були б новими елементами і FLIP не мав би що з чим зіставляти */
    const chipHtml = chipsOf(f);
    if(chipHtml!==prevChips){
      patchInto(chipsEl, chipHtml);
      markClickable(chipsEl);
      prevChips = chipHtml;
    }
    outEl.innerHTML = outOf(f);
    outEl.scrollTop = outEl.scrollHeight;
    noteTx.textContent = f.note||"";
    noteEl.className = "note" + (f.kind?" "+f.kind:"");
    if(extraEl){ patchInto(extraEl, spec.extra(f)); markClickable(extraEl); }
    scrub.value = idx;
    counter.textContent = `${idx+1} / ${frames.length}`;
    backB.disabled = resetB.disabled = idx===0;
    stepB.disabled = idx===frames.length-1;

    MO.flip(root, before);
  }

  function go(n){ idx = Math.max(0, Math.min(frames.length-1, n)); render(); }
  /* Перезамір після зміни шрифту чи ширини вікна. Кадр той самий — рухати
     нічого не треба, інакше кожен ресайз давав би зайвий переїзд деталей. */
  function relock(){
    if(!frames.length) return;
    quiet = true;
    lockAll(); render();
    quiet = false;
  }

  /* ---------- відтворення ----------
     rAF замість setInterval: нема дрейфу таймера, є чесна пауза на схованій
     вкладці й правильна робота з регулятором швидкості. Крок між кадрами
     лишається дискретним — плавність дає FLIP, а не інтерполяція кадрів. */
  function setPlayIcon(on){
    playB.innerHTML = on ? ICON.pause : ICON.play;
    playB.title = on ? "Пауза" : "Запустити";
    playB.setAttribute("aria-label", playB.title);
  }
  function stop(){
    if(raf){ cancelAnimationFrame(raf); raf = null; }
    setPlayIcon(false);
  }
  function loop(t){
    if(!raf) return;
    if(document.hidden){ last = t; raf = requestAnimationFrame(loop); return; }
    acc += Math.min(400, t - last); last = t;
    const stepMs = cfg.tick / SPEEDS[speedI];
    while(acc >= stepMs){
      acc -= stepMs;
      if(idx >= frames.length-1){ stop(); return; }
      go(idx+1);
    }
    raf = requestAnimationFrame(loop);
  }
  function play(){
    if(!frames.length) return;
    if(raf){ stop(); return; }
    if(idx===frames.length-1) go(0);
    setPlayIcon(true);
    last = performance.now(); acc = 0;
    raf = requestAnimationFrame(loop);
  }
  /* ручна дія скасовує автостарт при прокрутці — віджет не має оживати сам
     після того, як людина його зупинила */
  const byHand = (fn) => (...a)=>{ touched = true; return fn(...a); };

  playB.onclick  = byHand(play);
  stepB.onclick  = byHand(()=>{ stop(); go(idx+1); });
  backB.onclick  = byHand(()=>{ stop(); go(idx-1); });
  resetB.onclick = byHand(()=>{ stop(); go(0); });
  scrub.oninput  = byHand(()=>{ stop(); go(Number(scrub.value)); });
  speedB.onclick = ()=>{
    speedI = (speedI + 1) % SPEEDS.length;
    speedB.textContent = speedLabel(SPEEDS[speedI]);
    acc = 0;                                   /* нова швидкість — з чистого аркуша */
  };

  /* ---------- пряма маніпуляція: клік по сцені = перемотка ---------- */
  const nextWith = (list) => {
    for(const n of list) if(n > idx) return n;
    return list[0];
  };
  root.addEventListener("click", e=>{
    if(!frames.length) return;
    const cl = e.target.closest(".cl");
    if(cl && codeEl.contains(cl)){
      const n = lineIdx[cl.dataset.l];
      if(n !== undefined){ touched = true; stop(); go(n); }
      return;
    }
    const kel = e.target.closest("[data-key]");
    if(!kel) return;
    if(!((extraEl && extraEl.contains(kel)) || chipsEl.contains(kel))) return;
    const list = keyIdx[kel.dataset.key];
    if(list && list.length){ touched = true; stop(); go(nextWith(list)); }
  });

  root.addEventListener("keydown", e=>{
    if(!frames.length) return;
    const t = e.target;
    const inField = t && (t.tagName==="INPUT" || t.tagName==="TEXTAREA" ||
                          t.tagName==="SELECT" || t.isContentEditable);
    if(inField) return;                        /* поля й повзунок мають власні клавіші */
    switch(e.key){
      case "ArrowRight": touched=true; stop(); go(idx+1); break;
      case "ArrowLeft":  touched=true; stop(); go(idx-1); break;
      case "Home":       touched=true; stop(); go(0); break;
      case "End":        touched=true; stop(); go(frames.length-1); break;
      case " ": case "Spacebar":
        if(t && t.tagName==="BUTTON") return;  /* пробіл на кнопці — це її натискання */
        touched=true; play(); break;
      default: return;
    }
    e.preventDefault();
  });

  root.querySelectorAll("[data-cfg]").forEach(inp=>{
    inp.addEventListener("input", ()=>{ touched = true; stop(); rebuild(); });
  });
  root.querySelectorAll("[data-mode]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const group = btn.dataset.group || "";
      root.querySelectorAll(`[data-mode][data-group="${group}"]`).forEach(b=>b.setAttribute("aria-pressed","false"));
      if(!group) root.querySelectorAll("[data-mode]:not([data-group])").forEach(b=>b.setAttribute("aria-pressed","false"));
      btn.setAttribute("aria-pressed","true");
      touched = true; stop(); rebuild();
    });
  });

  /* ---------- автостарт при прокрутці ----------
     Один раз, коли віджет уперше опинився в екрані більш ніж наполовину.
     Під prefers-reduced-motion не спрацьовує зовсім. */
  if(!MO.reduced && "IntersectionObserver" in window){
    const io = new IntersectionObserver(entries=>{
      entries.forEach(en=>{
        if(en.intersectionRatio < .55) return;
        io.disconnect();
        if(!touched && !raf && frames.length > 1) play();
      });
    }, { threshold:.55 });
    io.observe(root);
  }

  /* stop у реєстрі ще й гасить рух: на схованій сторінці анімації не мають
     доживати свій вік */
  players.push({ root, relock, stop: ()=>{ stop(); MO.cancel(root); } });
  rebuild();
}

/* Віддає createPlayer, налаштований під конкретну тему. */
function makePlayer(opts){
  const cfg = { hl: (opts && opts.hl) || hl, tick: (opts && opts.tick) || 700 };
  return (root, spec) => createPlayerWith(root, spec, cfg);
}
const createPlayer = makePlayer();

/* ================= як показувати значення ================= */
const q      = (x) => typeof x === "string" ? `"${x}"` : String(x);
const listStr = (a) => "[" + a.map(q).join(", ") + "]";
const dictStr = (p) => p.length ? "{" + p.map(x=>`${q(x.k)}: ${q(x.v)}`).join(", ") + "}" : "{}";
const setStr  = (a) => a.length ? "{" + a.map(q).join(", ") + "}" : "set()";

/* ================= блоки візуалізації ================= */
/* Кожен рухомий блок несе data-key: за ним рушій руху впізнає деталь у
   наступному кадрі й довозить її на нове місце, замість перемалювати.
   Ключ комірки — індекс (типово) або саме значення, якщо список
   перебудовується чи сортується: opts.keyBy = "value". */
function cells(arr, opts){
  opts = opts || {};
  const st = opts.state || {};
  const byVal = opts.keyBy === "value";
  if(!arr.length) return `<div class="lst"><div class="cellw"><div class="cell ghost">[ ]</div>` +
    (opts.noIndex ? "" : `<div class="ix">порожньо</div>`) + `</div></div>`;
  return `<div class="lst">` + arr.map((v,k)=>{
    const cls = st[k] || "";
    const on = (cls==="now"||cls==="hit") ? " on" : "";
    const ix = opts.noIndex ? "" : `<div class="ix">${k}</div>`;
    const key = esc(byVal ? String(v) : k);
    return `<div class="cellw${on}" data-key="${key}"><div class="cell ${cls}">${esc(q(v))}</div>${ix}</div>`;
  }).join("") + `</div>`;
}

/* рядок «підпис + вміст» */
function row(label, html, cls){
  return `<div class="vizrow"><span class="vizlab ${cls||""}">${esc(label)}</span>` +
         `<div style="flex:1;min-width:0">${html}</div></div>`;
}

/* пари ключ-значення */
function kv(pairs, opts){
  opts = opts || {};
  const st = opts.state || {};
  if(!pairs.length) return `<div class="kv"><div class="kv-empty">${esc(opts.empty || "{} — поки порожньо")}</div></div>`;
  return `<div class="kv">` + pairs.map((p,k)=>
    `<div class="kvrow ${st[k]||""}" data-key="${esc(String(p.k))}">` +
    `<span class="k">${esc(q(p.k))}</span><span class="sep">:</span>` +
    `<span class="v">${esc(q(p.v))}</span></div>`).join("") + `</div>`;
}

/* елементи множини */
function selems(arr, opts){
  opts = opts || {};
  const st = opts.state || {};
  if(!arr.length) return `<span class="kv-empty">${esc(opts.empty || "set() — поки порожньо")}</span>`;
  return arr.map((v,k)=>
    `<span class="selem ${st[k]||opts.all||""}" data-key="${esc(String(v))}">${esc(String(v))}</span>`).join("");
}
function setrow(label, html){
  return `<div class="setrow"><span class="setlabel">${esc(label)}</span>${html}</div>`;
}

/* конвеєр: джерело → функція → результат */
function conveyor(rows, head){
  const h = head || {a:"елемент", b:"", c:"результат"};
  return `<div class="conv">` +
    `<div class="convrow"><span class="convhead">${esc(h.n||"№")}</span>` +
    `<span class="convhead">${esc(h.a)}</span><span class="convhead"></span>` +
    `<span class="convhead">${esc(h.c)}</span></div>` +
    rows.map(r=>
      `<div class="convrow ${r.cls||""}"><span class="convf">${esc(r.n)}</span>` +
      `<span class="convcell ${r.srcCls||"src"}">${esc(r.src)}</span>` +
      `<span class="convf">${r.arrow||"→"}</span>` +
      `<span class="convcell ${r.outCls||"wait"}">${esc(r.out)}</span></div>`).join("") +
    `</div>`;
}

/* стовпчики для сортування; кожен елемент: {label, size, cls} */
function bars(items, maxSize){
  const mx = maxSize || Math.max(1, ...items.map(b=>b.size));
  if(!items.length) return `<div class="bars"><span class="kv-empty">поки порожньо</span></div>`;
  return `<div class="bars">` + items.map(b=>
    `<div class="barw" data-key="${esc(String(b.key != null ? b.key : b.label))}">` +
    `<div class="bar ${b.cls||""}" style="height:${Math.round(24 + 76 * b.size / mx)}px">${esc(String(b.top||""))}</div>` +
    `<span class="barlab">${esc(String(b.label))}</span></div>`).join("") + `</div>`;
}

const legendHtml = (parts) => parts.map(p=>`<span><i class="${p[0]}"></i>${p[1]}</span>`).join("");

return { esc, hl, createPlayer, makePlayer, stopAllPlayers, relockAllPlayers,
         numCfg, modeCfg, q, listStr, dictStr, setStr,
         cells, row, kv, selems, setrow, conveyor, bars, legendHtml };
})();
