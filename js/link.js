/* ==========================================================================
   Зв'язок тексту й віджета.
   <b class="lk" data-lk="i">i</b> у прозі підсвічує всі [data-key="i"]
   в найближчому наступному віджеті — щоб було видно, про що саме мова.
   ========================================================================== */
"use strict";
(function(){

/* Найближчий наступний .widget у межах тієї самої теми. Межа — section.page:
   підсвічувати щось на іншій сторінці змісту не має. */
function widgetFor(el){
  const page = el.closest("section.page") || document;
  const list = page.querySelectorAll(".widget");
  for(const w of list)
    if(el.compareDocumentPosition(w) & Node.DOCUMENT_POSITION_FOLLOWING) return w;
  return null;
}

function targets(el){
  const key = el.dataset.lk;
  const w = key ? widgetFor(el) : null;
  if(!w) return [];
  return [...w.querySelectorAll("[data-key]")].filter(t=>t.dataset.key === key);
}

/* Клас, а не inline-стиль: віджет перемальовується щокадру, і клас усе одно
   злетить на наступному кадрі — це нормально, підсвітка живе рівно стільки,
   скільки триває наведення. */
function set(el, on){
  targets(el).forEach(t=>t.classList.toggle("lk-on", on));
}

const enter = e => { const b = e.target.closest && e.target.closest(".lk"); if(b) set(b, true); };
const leave = e => { const b = e.target.closest && e.target.closest(".lk"); if(b) set(b, false); };

document.addEventListener("mouseover", enter);
document.addEventListener("mouseout",  leave);
document.addEventListener("focusin",   enter);
document.addEventListener("focusout",  leave);

/* без tabindex у розмітці елемент не отримає фокус із клавіатури */
document.querySelectorAll(".lk").forEach(el=>{
  if(!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "0");
});

})();
