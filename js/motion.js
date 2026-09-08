/* ==========================================================================
   Рушій руху: FLIP-переїзди для [data-key] і числовий твін.
   Один модуль на весь сайт — щоб рух скрізь був однаковий за тривалістю
   й кривою, і щоб його можна було вимкнути одним місцем.
   ========================================================================== */
"use strict";
window.Motion = (function(){

const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
/* Тривалості й криві живуть у CSS-токенах; тут їх дзеркало для WAAPI. */
const DUR  = 260;
const EASE = "cubic-bezier(.32,.72,.28,1)";
const BACK = "cubic-bezier(.24,1.2,.4,1)";

/* Чи вміє браузер Web Animations API. Без нього рух просто не грає —
   вміст від цього не ламається, бо всі кадри й так намальовані в DOM. */
const CAN = typeof Element !== "undefined" && !!Element.prototype.animate;

const live = new Set();          /* активні анімації — щоб їх можна було скасувати */

/* Ключ у межах одного знімка. Один і той самий data-key трапляється кілька
   разів (два ряди комірок з індексами 0,1,2…), тому до нього дописується
   порядковий номер входження. Порядок контейнерів між кадрами сталий,
   тож така пара — стабільна тотожність елемента. */
const SEP = String.fromCharCode(1);   /* роздільник, якого не буває в ключах */
function idsOf(root){
  const seen = Object.create(null);
  const out = [];
  root.querySelectorAll("[data-key]").forEach(el=>{
    const k = el.dataset.key;
    seen[k] = (seen[k] || 0) + 1;
    out.push([k + SEP + seen[k], el]);
  });
  return out;
}

/* Прямокутники всіх [data-key] до оновлення DOM. */
function snapshot(root){
  const m = new Map();
  if(!root || api.reduced || !CAN) return m;
  idsOf(root).forEach(([id, el])=>{ m.set(id, el.getBoundingClientRect()); });
  return m;
}

function play(el, frames, dur, ease){
  const a = el.animate(frames, {duration:dur, easing:ease, fill:"none"});
  live.add(a);
  const drop = ()=>live.delete(a);
  a.finished.then(drop, drop);
  return a;
}

/* Після оновлення DOM порівнюємо нові прямокутники зі знімком і програємо
   різницю. Нові ключі отримують появу, зниклі ігноруються — їх уже нема. */
function flip(root, before, opts){
  if(!root || !before || api.reduced || !CAN) return;
  const o = opts || {};
  const dur = o.duration || DUR;

  idsOf(root).forEach(([id, el])=>{
    const now = el.getBoundingClientRect();
    if(!now.width && !now.height) return;      /* схований елемент — нема що рухати */

    const was = before.get(id);
    if(!was){
      if(before.size) play(el, [{opacity:0, transform:"scale(.86)"},
                                {opacity:1, transform:"none"}], dur, BACK);
      return;
    }
    const dx = was.left - now.left, dy = was.top - now.top;
    const sx = now.width  ? was.width  / now.width  : 1;
    const sy = now.height ? was.height / now.height : 1;
    if(Math.abs(dx) < .5 && Math.abs(dy) < .5 &&
       Math.abs(sx - 1) < .01 && Math.abs(sy - 1) < .01) return;

    /* Власний transform елемента (наприклад .cell.now підстрибує на 4px)
       лишається кінцевим станом — інакше після анімації був би стрибок. */
    const own = getComputedStyle(el).transform;
    const tail = (own && own !== "none") ? " " + own : "";
    play(el, [
      { transformOrigin:"top left",
        transform:`translate(${dx}px,${dy}px) scale(${sx},${sy})` + tail },
      { transformOrigin:"top left", transform: own && own !== "none" ? own : "none" }
    ], dur, o.easing || EASE);
  });
}

/* Числовий твін для лічильників. */
function tween(el, from, to, opts){
  if(!el) return;
  const o = opts || {};
  const fmt = o.format || (v => String(Math.round(v)));
  if(api.reduced || !CAN){ el.textContent = fmt(to); return; }
  const dur = o.duration || DUR, t0 = performance.now();
  (function step(t){
    const p = Math.min(1, (t - t0) / dur);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(from + (to - from) * e);
    if(p < 1) requestAnimationFrame(step);
  })(t0);
}

/* Зупинити рух у межах root — при переході на іншу тему анімації не мають
   доживати на схованій сторінці. Без аргументу гасить усе. */
function cancel(root){
  live.forEach(a=>{
    const t = a.effect && a.effect.target;
    if(!root || (t && root.contains(t))){
      try{ a.cancel(); }catch(err){ /* уже завершилась */ }
      live.delete(a);
    }
  });
}

const api = { reduced: mq.matches, snapshot, flip, tween, cancel };
if(mq.addEventListener) mq.addEventListener("change", e=>{ api.reduced = e.matches; });
else if(mq.addListener) mq.addListener(e=>{ api.reduced = e.matches; });

return api;
})();
