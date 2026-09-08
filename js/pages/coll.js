"use strict";
window.PageInit["coll"] = function(){
const K = window.CollKit;
const { esc, createPlayer, numCfg, modeCfg, listStr, dictStr, setStr, cells, row, kv, selems, setrow } = K;

const NAMES = ["Оля", "Іван", "Оля", "Ніна"];

/* ================= 1. ті самі дані у трьох контейнерах ================= */
createPlayer(document.getElementById("coll-w-three"), {
  config:`<span class="seg">
      <button data-mode="list" aria-pressed="true">список</button>
      <button data-mode="dict" aria-pressed="false">словник</button>
      <button data-mode="set" aria-pressed="false">множина</button>
    </span>`,
  readCfg:(r)=>({mode:modeCfg(r)}),
  build:({mode})=>{
    const src = `["Оля", "Іван", "Оля", "Ніна"]`;
    const code = mode==="list"
      ? [`names = []`, `for n in ${src}:`, `    names.append(n)`, `print(names)`, `print(len(names))`]
      : mode==="dict"
        ? [`counts = {}`, `for n in ${src}:`, `    counts[n] = counts.get(n, 0) + 1`, `print(counts)`, `print(len(counts))`]
        : [`unique = set()`, `for n in ${src}:`, `    unique.add(n)`, `print(unique)`, `print(len(unique))`];

    const name = mode==="list" ? "names" : mode==="dict" ? "counts" : "unique";
    const frames = [], out = [];
    const lst = [], pairs = [], st = [];
    const snapshot = () => mode==="list" ? [...lst] : mode==="dict" ? pairs.map(p=>({...p})) : [...st];
    const valStr = () => mode==="list" ? listStr(lst) : mode==="dict" ? dictStr(pairs) : setStr(st);

    frames.push({line:0, mode, src:NAMES, k:-1, data:snapshot(),
      vars:[{name, val:valStr(), cls:"i"}], out:[],
      note: mode==="list" ? `Порожній список — квадратні дужки.`
        : mode==="dict" ? `Порожній словник — фігурні дужки без нічого.`
        : `Порожня множина — тільки через set(), бо {} уже зайняте словником.`});

    NAMES.forEach((n, k)=>{
      frames.push({line:1, mode, src:NAMES, k, data:snapshot(),
        vars:[{name:"n", val:`"${n}"`, cls:"j"}, {name, val:valStr(), cls:"i"}], out:[],
        note:`Крок ${k+1}: беремо "${n}" з початкових даних.`});

      let msg;
      if(mode==="list"){
        lst.push(n);
        msg = `Список кладе "${n}" у кінець — навіть якщо таке ім'я вже було. Повтори тут дозволені.`;
      }else if(mode==="dict"){
        const ex = pairs.find(p=>p.k===n);
        if(ex){ ex.v += 1; msg = `Ключ "${n}" уже є — нової пари не буде, лічильник стає ${ex.v}.`; }
        else { pairs.push({k:n, v:1}); msg = `Ключа "${n}" ще не було — з'являється нова пара «${n} → 1».`; }
      }else{
        if(st.includes(n)) msg = `"${n}" у множині вже є — add() мовчки нічого не робить.`;
        else { st.push(n); msg = `"${n}" ще не було — елемент додається.`; }
      }
      frames.push({line:2, mode, src:NAMES, k, hitK:true, data:snapshot(),
        vars:[{name:"n", val:`"${n}"`, cls:"j"}, {name, val:valStr(), cls:"i"}], out:[], note:msg});
    });

    out.push(valStr());
    frames.push({line:3, mode, src:NAMES, k:NAMES.length, data:snapshot(),
      vars:[{name, val:valStr(), cls:"i"}], out:[...out],
      note: mode==="list" ? `Чотири імені лишились чотирма: список зберіг і порядок, і повтор.`
        : mode==="dict" ? `Повтор не зник — він перетворився на число 2 біля ключа "Оля".`
        : `Повтор просто зник: у множині кожне ім'я рівно одне.`});

    const n = mode==="list" ? lst.length : mode==="dict" ? pairs.length : st.length;
    out.push(String(n));
    frames.push({line:4, mode, src:NAMES, k:NAMES.length, data:snapshot(), kind:"end",
      vars:[{name, val:valStr(), cls:"i"}], out:[...out],
      note:`Було 4 записи → лишилось ${n}. ${mode==="list" ? `Список нічого не втрачає.`
        : mode==="dict" ? `Словник тримає 3 різних ключі, а кількість повторів сховав у значення.`
        : `Множина тримає лише 3 різних значення.`}`});

    return {code, frames};
  },
  extra:(f)=>{
    const st = {}; if(f.k >= 0 && f.k < f.src.length) st[f.k] = f.hitK ? "hit" : "now";
    const source = row("дані", cells(f.src, {state:st, noIndex:true}), "");
    let res;
    if(f.mode==="list") res = row("names", cells(f.data, {}), "i");
    else if(f.mode==="dict") res = row("counts", kv(f.data, {empty:"{} — поки порожньо"}), "i");
    else res = row("unique", `<div class="setrow">${selems(f.data, {all:"in"})}</div>`, "i");
    return source + res;
  }
});

/* ================= 2. який контейнер обрати ================= */
(function(){
  const root = document.getElementById("coll-w-pick");
  if(!root) return;
  const Q = [
    {id:"label", t:`Чи є в кожного значення своя мітка — ім'я, дата, id?`,
     yes:"так, значення підписані", no:"ні, просто набір значень"},
    {id:"dup",   t:`Чи можуть значення повторюватись, і чи це важливо?`,
     yes:"так, повтори мають лишитись", no:"ні, потрібні лише різні"},
    {id:"order", t:`Чи важливий порядок?`,
     yes:"так, порядок має значення", no:"ні, порядок байдужий"}
  ];
  const ans = {label:false, dup:true, order:true};

  root.innerHTML = Q.map(qq=>`
    <div class="sandbox" style="padding-bottom:10px">
      <span style="flex:1 1 220px; font-size:.93rem">${qq.t}</span>
      <span class="seg">
        <button data-q="${qq.id}" data-v="1" aria-pressed="${ans[qq.id]}">${qq.yes}</button>
        <button data-q="${qq.id}" data-v="0" aria-pressed="${!ans[qq.id]}">${qq.no}</button>
      </span>
    </div>`).join("") +
    `<div class="note" data-verdict style="border-top:1px solid var(--rule-soft)">
       <span class="dot"></span><span data-vtext></span></div>
     <div class="sandbox" style="padding-top:14px" data-vcode></div>`;

  const vEl = root.querySelector("[data-verdict]"),
        vText = root.querySelector("[data-vtext]"),
        vCode = root.querySelector("[data-vcode]");

  function decide(){
    if(ans.label) return {
      kind:"dict", cls:"",
      t:`Бери словник. Значення підписані міткою — саме для цього dict і придуманий: шукати за ключем, а не за номером.`,
      c:`ages = {"Оля": 16, "Іван": 15}`};
    if(!ans.dup && !ans.order) return {
      kind:"set", cls:"inner",
      t:`Бери множину. Повтори не потрібні, порядок теж — set прибере дублікати сам і відповідатиме на «чи є таке?» миттєво.`,
      c:`tags = {"python", "код"}`};
    if(!ans.dup && ans.order) return {
      kind:"set", cls:"inner",
      t:`Тут множина не підійде: вона не тримає порядку. Прибери повтори зі збереженням порядку — list(dict.fromkeys(x)) — і працюй далі зі списком.`,
      c:`names = list(dict.fromkeys(raw))`};
    return {
      kind:"list", cls:"end",
      t:`Бери список. Потрібні або повтори, або порядок — а це рівно те, що list гарантує.`,
      c:`nums = [10, 20, 20, 30]`};
  }

  function paint(){
    root.querySelectorAll("[data-q]").forEach(b=>
      b.setAttribute("aria-pressed", String(ans[b.dataset.q] === (b.dataset.v === "1"))));
    const d = decide();
    vEl.className = "note " + d.cls;
    vText.textContent = d.t;
    vCode.innerHTML = `<span class="mono-line">${K.hl(d.c)}</span>`;
  }
  root.querySelectorAll("[data-q]").forEach(b=>b.addEventListener("click", ()=>{
    ans[b.dataset.q] = b.dataset.v === "1";
    paint();
  }));
  paint();
})();

/* ================= hero ================= */
(function(){
  const box = document.getElementById("coll-heroBox");
  const line = document.getElementById("coll-heroLine");
  const seg = document.getElementById("coll-heroSeg");
  if(!box) return;
  const VIEWS = [
    {html: cells(NAMES, {noIndex:false}),
     t:`<b>список</b> — порядок і повтори збережені, шукаємо за номером`},
    {html: kv([{k:"Оля", v:2}, {k:"Іван", v:1}, {k:"Ніна", v:1}]),
     t:`<b>словник</b> — кожне ім'я стало ключем, повтор перетворився на число`},
    {html: `<div class="setrow">${selems(["Оля", "Іван", "Ніна"], {all:"in"})}</div>`,
     t:`<b>множина</b> — тільки різні значення, без порядку`}
  ];
  /* без автопрокрутки: контейнер перемикає читач.
     Усі три вигляди лежать один поверх одного, тому висота блока стала —
     текст нижче не зсувається при перемиканні. */
  box.innerHTML  = VIEWS.map((v, k)=>`<div class="hv" data-hv="${k}">${v.html}</div>`).join("");
  line.innerHTML = VIEWS.map((v, k)=>`<div class="hv" data-hv="${k}">${v.t}</div>`).join("");
  function show(k){
    seg.querySelectorAll("[data-view]").forEach(b=>
      b.setAttribute("aria-pressed", String(Number(b.dataset.view) === k)));
    [box, line].forEach(host=>host.querySelectorAll("[data-hv]").forEach(d=>
      d.classList.toggle("on", Number(d.dataset.hv) === k)));
  }
  seg.querySelectorAll("[data-view]").forEach(b=>
    b.addEventListener("click", ()=>show(Number(b.dataset.view))));
  show(0);
})();

};
