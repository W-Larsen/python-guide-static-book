/* ==========================================================================
   Спільний рушій блок-схем

   Схема — це той самий кадр програвача, тільки намальований як карта доріг:
   ромб-умова, прямокутник-дія, стрілки з підписами True / False. Стани
   беруться з тих самих даних, що й решта кадру, тож схема просто ще один
   погляд на нього, а не окрема логіка.

   Тут лежать лише цеглинки — фігури, стрілки й полотно. Як саме їх скласти,
   вирішує сторінка: умови малюють драбину, цикли — петлю.

   Координати — не пікселі, а одиниці viewBox: SVG тягнеться на всю ширину
   блоку, тому пропорції лишаються, а розмір підлаштовується. Типова ширина
   збігається з шириною блоку .extra на десктопі, тож підписи виходять
   приблизно того ж кегля, що й у тексті.
   ========================================================================== */
"use strict";
window.FlowKit = (function(){

const esc = (s) => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

const FW = 680;                       /* типова ширина системи координат */
const rd = (v) => Math.round(v * 10) / 10;

/* якорі фігури: верх, низ, лівий і правий боки */
const A = {
  t:(n)=>[n.x, n.y - n.h/2], b:(n)=>[n.x, n.y + n.h/2],
  l:(n)=>[n.x - n.w/2, n.y], r:(n)=>[n.x + n.w/2, n.y]
};

/* ширина символу моношрифту й базова висота — за ними ділиться довгий підпис */
const CHW  = { cond:7.3, act:7.0, start:7.0, end:7.0 };
const BASH = { cond:50,  act:40,  start:34,  end:34  };

function wrapLabel(text, maxCh){
  const lines = [];
  String(text).split(" ").forEach(w=>{
    const cur = lines.length ? lines[lines.length-1] : null;
    if(cur === null || (cur + " " + w).length > maxCh) lines.push(w);
    else lines[lines.length-1] = cur + " " + w;
  });
  return lines.length ? lines : [""];
}

/* Ромб звужується догори й донизу, тому підпису в ньому потрібен більший
   запас по краях, ніж прямокутнику. */
function fnode(o){
  const kind = o.kind || "act";
  const lines = wrapLabel(o.label, Math.max(6, Math.floor((o.w - (kind==="cond"?66:28)) / CHW[kind])));
  return { kind, x:o.x, y:o.y, w:o.w, lines,
           h: BASH[kind] + (lines.length - 1) * 15,
           state: o.state || "pending", key:o.key, title: o.title || o.label };
}

function nodeSvg(n){
  const hw = n.w/2, hh = n.h/2;
  const shape = n.kind === "cond"
    ? `<path class="fn-shape" d="M${n.x} ${rd(n.y-hh)}L${rd(n.x+hw)} ${n.y}L${n.x} ${rd(n.y+hh)}L${rd(n.x-hw)} ${n.y}Z"/>`
    : `<rect class="fn-shape" x="${rd(n.x-hw)}" y="${rd(n.y-hh)}" width="${n.w}" height="${n.h}" rx="${n.kind==="act"?10:hh}"/>`;
  const y0 = n.y - (n.lines.length - 1) * 7.5 + 4.2;
  const txt = n.lines.map((t,k)=>`<text class="fn-t" x="${n.x}" y="${rd(y0 + k*15)}">${esc(t)}</text>`).join("");
  /* active — умовний знак «деталь зараз важлива»: за ним програвач робить
     вузол клікабельним і вміє перемотати саме до цього кадру */
  const live = n.state === "check" || n.state === "taken";
  return `<g class="fn fn-${n.kind} is-${n.state}${live?" active":""}"` +
         (n.key ? ` data-key="${esc(n.key)}"` : "") + `>` +
         `<title>${esc(n.title)}</title>${shape}${txt}</g>`;
}

/* Ламана зі скругленими кутами: радіус сам зменшується, якщо коліно коротке. */
function rpath(pts, r){
  let d = `M${rd(pts[0][0])} ${rd(pts[0][1])}`;
  for(let k = 1; k < pts.length - 1; k++){
    const [px,py] = pts[k-1], [cx,cy] = pts[k], [nx,ny] = pts[k+1];
    const d1 = Math.hypot(cx-px, cy-py) || 1, d2 = Math.hypot(nx-cx, ny-cy) || 1;
    const rr = Math.min(r, d1/2, d2/2);
    d += `L${rd(cx + (px-cx)/d1*rr)} ${rd(cy + (py-cy)/d1*rr)}` +
         `Q${rd(cx)} ${rd(cy)} ${rd(cx + (nx-cx)/d2*rr)} ${rd(cy + (ny-cy)/d2*rr)}`;
  }
  const last = pts[pts.length-1];
  return d + `L${rd(last[0])} ${rd(last[1])}`;
}

function headSvg(pts){
  const [x2,y2] = pts[pts.length-1], [x1,y1] = pts[pts.length-2];
  const a = Math.atan2(y2-y1, x2-x1), s = 7.5;
  const p = (d) => `${rd(x2 - s*Math.cos(a+d))},${rd(y2 - s*Math.sin(a+d))}`;
  return `<polygon class="fe-head" points="${rd(x2)},${rd(y2)} ${p(-0.42)} ${p(0.42)}"/>`;
}

/* Підписів у стрілки може бути й кілька: довга дорога через пів схеми
   потребує пояснення і біля розвилки, і там, де вона повертається. */
function edgeSvg(e){
  const labs = e.labels || (e.label ? [{text:e.label, x:e.lx, y:e.ly, la:e.la}] : []);
  const lab = labs.map(l=>
    `<text class="fe-lab" x="${rd(l.x)}" y="${rd(l.y)}" text-anchor="${l.la || "middle"}">${esc(l.text)}</text>`
  ).join("");
  return `<g class="fe is-${e.state || "idle"}">` +
         `<path class="fe-line" pathLength="100" d="${rpath(e.pts, 13)}"/>` +
         headSvg(e.pts) + lab + `</g>`;
}

/* Пройдена стрілка малюється поверх решти — інакше спільний стовбур збоку
   перекривав би саме ту дорогу, якою програма пішла. */
const EORD = { off:0, idle:1, on:2 };
function flowSvg(nodes, edges, h, label, width){
  const es = edges.slice().sort((a,b)=>(EORD[a.state]||0) - (EORD[b.state]||0));
  return `<svg class="flow" viewBox="0 0 ${width || FW} ${rd(h)}" role="img" aria-label="${esc(label)}">` +
         es.map(edgeSvg).join("") + nodes.map(nodeSvg).join("") + `</svg>`;
}

/* стан гілки → стан стрілки, що з неї виходить */
const eState = (st, want) => st === want ? "on"
  : (st === "pending" || st === "check") ? "idle" : "off";
/* стан гілки → стан прямокутника з її дією */
const aState = (st) => st === "taken" ? "taken"
  : (st === "false" || st === "skipped") ? "skipped" : "pending";
/* «if score >= 90» → «score >= 90 ?»: у ромбі лишається сам вираз */
const condText = (label) => String(label).trim().replace(/^(if|elif|while)\s+/, "") + " ?";

return { esc, FW, rd, A, fnode, nodeSvg, rpath, headSvg, edgeSvg, flowSvg,
         eState, aState, condText };
})();
