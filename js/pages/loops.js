"use strict";
window.PageInit["loops"] = function(){
const R = (n) => Array.from({length:n}, (_,k)=>k);
const esc = (s) => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

/* дуже проста підсвітка синтаксису */
function hl(line){
  let s = esc(line);
  s = s.replace(/(&quot;|")([^"]*)("|&quot;)/g, '<span class="str">"$2"</span>');
  s = s.replace(/\b(for|in|while|if|break|continue|else|not|and|or|True|False)\b/g, '<span class="kw">$1</span>');
  s = s.replace(/\b(print|range|len|end)\b/g, '<span class="fn">$1</span>');
  s = s.replace(/\b(\d+)\b/g, '<span class="num">$1</span>');
  return s;
}

/* ================= player ================= */
const createPlayer = window.CollKit.makePlayer({ hl, tick:620 });
const { numCfg, modeCfg } = window.CollKit;
const { A, fnode, flowSvg, eState, condText } = window.FlowKit;

/* ==========================================================================
   Блок-схеми циклів

   Фігури ті самі, що й у темі «Умови»: ромб-перевірка, прямокутник-дія,
   овали початку й кінця. Нова тут лише одна дорога — та, що веде назад.
   Після тіла стрілка повертається до того самого ромба, і саме ця петля
   робить цикл циклом. У тексті програми її не видно взагалі: там просто
   закінчується відступ.

   Координати — одиниці viewBox (див. js/flow.js), не пікселі. Вертикаль SPX
   тримає головну дорогу згори вниз, BX — зворотна дорога ліворуч, EX —
   вихід із циклу праворуч.
   ========================================================================== */
const SPX = 300, BX = 110, EX = 610;
const CW = 250, AW = 280;

/* Підпис «True» стоїть праворуч від вертикалі між ромбом і першою дією. */
const trueLab = (cond, next) => ({ label:"True", la:"start", lx:SPX + 11,
  ly:(cond.y + cond.h/2 + next.y - next.h/2) / 2 + 4 });
/* «False» — біля правого кута ромба, звідки починається вихід. */
const falseLab = (cond) => ({ label:"False", la:"start", lx:cond.x + cond.w/2 + 14,
  ly:cond.y - 9 });

/* ---------- один цикл ----------
   acts — рядки тіла згори вниз, cur — індекс того, що виконується зараз;
   усі рядки вище нього в цьому ж проході вже пройдені. */
function loopFlow(o){
  const cur = o.cur == null ? -1 : o.cur;
  const start = fnode({kind:"start", x:SPX, y:22, w:CW, label:o.start});
  const cond  = fnode({kind:"cond", x:SPX, y:112, w:CW, label:o.cond,
                       state:o.condState, key:"c"});
  const an = o.acts.map((label,k)=>fnode({kind:"act", x:SPX, y:205 + k*80, w:AW,
    label, state: k <= cur ? "taken" : "pending", key:"a"+k}));
  const last = an[an.length-1];
  const backY = last.y + last.h/2 + 44;
  const end = fnode({kind:"end", x:SPX, y:backY + 66, w:CW,
    label:o.end || "кінець", state:o.endState || "pending"});

  const edges = [
    {pts:[A.b(start), A.t(cond)], state:"on"},
    Object.assign({pts:[A.r(cond), [EX, cond.y], [EX, end.y], A.r(end)],
      state:eState(o.condState, "false")}, falseLab(cond)),
    Object.assign({pts:[A.b(cond), A.t(an[0])], state:eState(o.condState, "taken")},
      trueLab(cond, an[0]))
  ];
  for(let k = 1; k < an.length; k++)
    edges.push({pts:[A.b(an[k-1]), A.t(an[k])], state: cur >= k ? "on" : "idle"});
  edges.push({pts:[A.b(last), [SPX, backY], [BX, backY], [BX, cond.y], A.l(cond)],
    state:o.back ? "on" : "idle",
    label:"назад до перевірки", lx:(SPX + BX) / 2, ly:backY - 10});

  return flowSvg([start, cond].concat(an, [end]), edges, end.y + end.h/2 + 16,
    "Блок-схема циклу");
}

/* ---------- цикл із break або continue ----------
   До петлі додається другий ромб — умова всередині тіла. Різниця двох слів
   тут стає геометричною: break виводить стрілку геть зі схеми, continue
   вертає її на ту саму дорогу назад, тільки повз решту тіла. */
function ctlFlow(o){
  const st = o.state;
  /* break має власну смугу праворуч; continue окремої не має навмисне —
     він вистрибує на ту саму дорогу назад, просто раніше за решту тіла */
  const JX = 520;
  const start = fnode({kind:"start", x:SPX, y:22, w:CW, label:o.start});
  const cond  = fnode({kind:"cond", x:SPX, y:112, w:CW, label:o.cond,
                       state:st.loop, key:"c"});
  const take  = fnode({kind:"act", x:SPX, y:205, w:AW, label:o.take,
                       state:st.take || "pending", key:"a0"});
  const ifc   = fnode({kind:"cond", x:SPX, y:300, w:CW, label:o.ifLabel,
                       state:st.ifs, key:"c2"});
  const body  = fnode({kind:"act", x:SPX, y:395, w:AW, label:o.body,
                       state:st.body || "pending", key:"a1"});
  const backY = body.y + body.h/2 + 44;
  const end   = fnode({kind:"end", x:SPX, y:backY + 66, w:CW, label:"кінець",
                       state:st.end || "pending"});
  const brk = o.mode === "break";

  const edges = [
    {pts:[A.b(start), A.t(cond)], state:"on"},
    Object.assign({pts:[A.r(cond), [EX, cond.y], [EX, end.y], A.r(end)],
      state:eState(st.loop, "false")}, falseLab(cond)),
    Object.assign({pts:[A.b(cond), A.t(take)], state:eState(st.loop, "taken")},
      trueLab(cond, take)),
    {pts:[A.b(take), A.t(ifc)], state: st.take === "taken" ? "on" : "idle"},
    Object.assign({pts:[A.b(ifc), A.t(body)], state:eState(st.ifs, "false")},
      trueLab(ifc, body), {label:"False"}),
    {pts:[A.b(body), [SPX, backY], [BX, backY], [BX, cond.y], A.l(cond)],
      state:st.back ? "on" : "idle",
      label:"назад до перевірки", lx:(SPX + BX) / 2, ly:backY - 10},
    /* break іде повз усе до кінця, continue — на дорогу назад */
    brk
      ? {pts:[A.r(ifc), [JX, ifc.y], [JX, end.y], A.r(end)], state:eState(st.ifs, "taken"),
         label:"True — break", la:"start", lx:JX + 9, ly:(ifc.y + end.y) / 2}
      : {pts:[A.l(ifc), [BX, ifc.y], [BX, cond.y], A.l(cond)], state:eState(st.ifs, "taken"),
         label:"True — continue", la:"start", lx:BX + 9, ly:(take.y + ifc.y) / 2}
  ];

  return flowSvg([start, cond, take, ifc, body, end], edges, end.y + end.h/2 + 16,
    "Блок-схема циклу з " + o.mode);
}

/* ---------- цикл у циклі ----------
   Схема стоїть поруч із сіткою, тому має власну, вужчу систему координат.
   Доріг назад тут дві, і головне на схемі — що вони різної довжини: коротка
   вертає до внутрішньої перевірки, довга обходить усе знизу й повертає аж
   до зовнішньої. Поки коротка петля не вичерпається, до довгої черга не
   дійде.
   opts.tail — рядок на рівні зовнішнього циклу (як print() у трикутнику):
   він стоїть уже на дорозі назад, після виходу з внутрішнього циклу. */
const NW = 420;                       /* ширина вужчої системи координат */
function nestFlow(o){
  const st = o.state;
  const X = 200, NCW = 185, NAW = 190;
  /* смуги: коротка петля ліворуч, довга — праворуч і низом, вихід — скраю */
  const LIN = 82, LOUT = 42, RIN = 340, ROUT = 393, TOPY = 47;

  const start = fnode({kind:"start", x:X, y:18, w:NCW, label:o.start});
  const cOut = fnode({kind:"cond", x:X, y:85,  w:NCW, label:o.outer, state:st.outer, key:"co"});
  const aOut = fnode({kind:"act",  x:X, y:158, w:NAW, label:o.outerTake,
                      state:st.outerTake || "pending", key:"ao"});
  const cIn  = fnode({kind:"cond", x:X, y:232, w:NCW, label:o.inner, state:st.inner, key:"ci"});
  const aIn  = fnode({kind:"act",  x:X, y:305, w:NAW, label:o.innerTake,
                      state:st.innerTake || "pending", key:"ai"});
  const body = fnode({kind:"act",  x:X, y:372, w:NAW, label:o.body,
                      state:st.body || "pending", key:"ab"});
  const inBackY = body.y + body.h/2 + 25;
  const tail = o.tail
    ? fnode({kind:"act", x:X, y:455, w:NAW, label:o.tail, state:st.tail || "pending", key:"at"})
    : null;
  const retY = tail ? tail.y + tail.h/2 + 30 : inBackY + 26;
  const end = fnode({kind:"end", x:X, y:retY + 52, w:NCW, label:"кінець",
                     state:st.end || "pending"});
  /* спільний хвіст довгої петлі: низом ліворуч, угору й у верх ромба —
     там, де в нього вже входить стрілка від старту */
  const upToOuter = [[LOUT, retY], [LOUT, TOPY], [X, TOPY], A.t(cOut)];

  const edges = [
    {pts:[A.b(start), A.t(cOut)], state:"on"},
    /* вихід із зовнішнього циклу — крайня права смуга, повз обидві петлі */
    {pts:[A.r(cOut), [ROUT, cOut.y], [ROUT, end.y], A.r(end)], state:eState(st.outer, "false"),
      label:"False", la:"start", lx:cOut.x + cOut.w/2 + 12, ly:cOut.y - 9},
    {pts:[A.b(cOut), A.t(aOut)], state:eState(st.outer, "taken"),
      label:"True", la:"start", lx:X + 10, ly:(cOut.y + cOut.h/2 + aOut.y - aOut.h/2)/2 + 4},
    {pts:[A.b(aOut), A.t(cIn)], state: st.outerTake === "taken" ? "on" : "idle"},
    {pts:[A.b(cIn), A.t(aIn)], state:eState(st.inner, "taken"),
      label:"True", la:"start", lx:X + 10, ly:(cIn.y + cIn.h/2 + aIn.y - aIn.h/2)/2 + 4},
    {pts:[A.b(aIn), A.t(body)], state: st.innerTake === "taken" ? "on" : "idle"},
    /* коротка петля: назад до внутрішньої перевірки */
    {pts:[A.b(body), [X, inBackY], [LIN, inBackY], [LIN, cIn.y], A.l(cIn)],
      state:st.backIn ? "on" : "idle",
      label:"наступний j", lx:(X + LIN) / 2, ly:inBackY - 9}
  ];
  /* довга петля: внутрішній цикл вичерпався — аж тепер крок зовнішнього */
  const fLab = {text:"False", la:"start", x:cIn.x + cIn.w/2 + 10, y:cIn.y - 9};
  edges.push(tail
    ? {pts:[A.r(cIn), [RIN, cIn.y], [RIN, tail.y], A.r(tail)],
       state:eState(st.inner, "false"), labels:[fLab]}
    /* без хвоста та сама стрілка йде до самої зовнішньої перевірки, тому
       підписів у неї два: чому вона почалась і куди веде */
    : {pts:[A.r(cIn), [RIN, cIn.y], [RIN, retY]].concat(upToOuter),
       state:eState(st.inner, "false"),
       labels:[fLab, {text:"наступний i", x:(X + LOUT) / 2, y:retY - 9}]});
  if(tail) edges.push({pts:[A.b(tail), [X, retY]].concat(upToOuter),
    state:st.tail === "taken" ? "on" : "idle",
    label:"наступний i", lx:(X + LOUT) / 2, ly:retY - 9});

  const nodes = [start, cOut, aOut, cIn, aIn, body].concat(tail ? [tail] : [], [end]);
  return flowSvg(nodes, edges, end.y + end.h/2 + 14, "Блок-схема вкладених циклів", NW);
}

/* Схема під кодом. Овал старту повторює те, що цикл збирається перебирати,
   щоб схему можна було читати окремо від коду. */
const flowbox = (svg) => `<div class="flowbox">${svg}</div>`;

/* ================= 1. for + range ================= */
createPlayer(document.getElementById("loops-w-range"), {
  config:`
    <label>старт <input type="number" data-cfg id="loops-rg-start" value="0" min="-10" max="20"></label>
    <label>стоп <input type="number" data-cfg id="loops-rg-stop" value="5" min="-10" max="30"></label>
    <label>крок <input type="number" data-cfg id="loops-rg-step" value="1" min="-5" max="5"></label>`,
  readCfg:(r)=>({
    start:numCfg(r,"#loops-rg-start",0),
    stop: numCfg(r,"#loops-rg-stop",5),
    step: numCfg(r,"#loops-rg-step",1)
  }),
  build:({start,stop,step})=>{
    if(step===0) step=1;
    const args = (start===0&&step===1) ? `${stop}` : (step===1 ? `${start}, ${stop}` : `${start}, ${stop}, ${step}`);
    const code = [`for i in range(${args}):`, `    print(i)`];
    const seq=[]; 
    for(let v=start; step>0 ? v<stop : v>stop; v+=step){ seq.push(v); if(seq.length>30) break; }
    const out=[], frames=[];
    /* стан схеми для кадру: src потрібен, щоб овал старту знав свій range */
    const fl = (o)=>Object.assign({src:`range(${args})`, cond:"pending", cur:-1}, o);
    frames.push({line:0, vars:[], out:[], flow:fl({}), note:seq.length
      ? `range дає числа: ${seq.join(", ")}. Цикл візьме їх по черзі.`
      : `range порожній — тіло циклу не виконається жодного разу.`});
    seq.forEach(v=>{
      frames.push({line:0, vars:[{name:"i",val:v,cls:"i"}], out:[...out], flow:fl({cond:"taken", cur:0}),
        note:`Змінна i отримує значення ${v}. Заходимо в тіло циклу.`});
      out.push(String(v));
      frames.push({line:1, vars:[{name:"i",val:v,cls:"i"}], out:[...out], flow:fl({cond:"taken", cur:1, back:true}),
        note:`print(i) друкує ${v}. Тіло закінчилось — вертаємось нагору по наступне число.`});
    });
    frames.push({line:0, vars:[], out:[...out], kind:"end", flow:fl({cond:"false", end:"taken"}),
      note:`Числа закінчились. Цикл завершено, тіло виконалось ${seq.length} раз(ів).`});
    return {code, frames};
  },
  /* Схема показує те, чого в двох рядках коду не видно: перевірку «чи є ще
     число» і дорогу назад після кожного проходу тіла. */
  extra:(f)=>flowbox(loopFlow({
    start:f.flow.src, cond:"є ще число?", condState:f.flow.cond,
    acts:["i = наступне число", "print(i)"],
    cur:f.flow.cur, back:f.flow.back, endState:f.flow.end
  }))
});

/* ================= 2. список ================= */
createPlayer(document.getElementById("loops-w-list"), {
  config:`<span class="seg">
      <button data-mode="list" aria-pressed="true">Список</button>
      <button data-mode="str" aria-pressed="false">Рядок</button>
    </span>`,
  readCfg:(r)=>({mode:modeCfg(r)}),
  build:({mode})=>{
    const isList = mode==="list";
    const items = isList ? ["яблуко","банан","слива"] : ["к","о","д"];
    const code = isList
      ? [`fruits = ["яблуко", "банан", "слива"]`, `for fruit in fruits:`, `    print("Я їм", fruit)`]
      : [`word = "код"`, `for c in word:`, `    print(c, "—", len(word))`];
    const varName = isList ? "fruit" : "c";
    const bodyLine = 2, headLine = 1;
    const out=[], frames=[];
    frames.push({line:0, vars:[], out:[], items, k:-1, note: isList
      ? `Створюємо список із трьох елементів.` : `Рядок теж складається з елементів — окремих символів.`});
    items.forEach((it,k)=>{
      frames.push({line:headLine, vars:[{name:varName,val:`"${it}"`,cls:"i"}], out:[...out], items, k,
        note:`Беремо елемент №${k} — "${it}". Змінна ${varName} тепер зберігає сам елемент, а не його номер.`});
      out.push(isList ? `Я їм ${it}` : `${it} — 3`);
      frames.push({line:bodyLine, vars:[{name:varName,val:`"${it}"`,cls:"i"}], out:[...out], items, k,
        note:`Друкуємо результат для "${it}".`});
    });
    frames.push({line:headLine, vars:[], out:[...out], items, k:items.length, kind:"end",
      note:`Елементи закінчились — цикл зупиняється.`});
    return {code, frames};
  },
  extra:(f)=>`<div class="listviz">${(f.items||[]).map((it,k)=>
    `<span class="item ${k===f.k?"now":""} ${k<f.k?"done":""}">${esc(it)}</span>`).join("")}</div>`
});

/* ================= 3. while ================= */
createPlayer(document.getElementById("loops-w-while"), {
  build:()=>{
    const code = [`n = 10`, `while n > 0:`, `    print(n)`, `    n = n - 3`];
    const out=[], frames=[];
    let n=10;
    frames.push({line:0, vars:[{name:"n",val:n,cls:"n"}], out:[], flow:{cond:"pending", cur:-1},
      note:`Заводимо змінну n = 10.`});
    let guard=0;
    while(guard++<20){
      const ok = n>0;
      frames.push({line:1, vars:[{name:"n",val:n,cls:"n"}], out:[...out], kind: ok?"":"end",
        flow: ok ? {cond:"check", cur:-1} : {cond:"false", cur:-1, end:"taken"},
        note:`Перевірка умови: ${n} > 0 → ${ok?"True, заходимо в тіло":"False, цикл зупиняється"}.`});
      if(!ok) break;
      out.push(String(n));
      frames.push({line:2, vars:[{name:"n",val:n,cls:"n"}], out:[...out], flow:{cond:"taken", cur:0},
        note:`Друкуємо n.`});
      const prev=n; n-=3;
      frames.push({line:3, vars:[{name:"n",val:n,cls:"n"}], out:[...out], flow:{cond:"taken", cur:1, back:true},
        note:`Змінюємо n: ${prev} − 3 = ${n}. Саме цей рядок рятує нас від нескінченного циклу. Вертаємось до перевірки.`});
    }
    return {code, frames};
  },
  /* У while ромб перевіряється перед кожним заходом у тіло — на схемі це
     той самий ромб, до якого щоразу приводить дорога назад. */
  extra:(f)=>flowbox(loopFlow({
    start:"n = 10", cond:condText("n > 0"), condState:f.flow.cond,
    acts:["print(n)", "n = n - 3"],
    cur:f.flow.cur, back:f.flow.back, endState:f.flow.end
  }))
});

/* ================= 4. break / continue ================= */
createPlayer(document.getElementById("loops-w-flow"), {
  config:`<span class="seg">
      <button data-mode="break" aria-pressed="true">break</button>
      <button data-mode="continue" aria-pressed="false">continue</button>
    </span>`,
  readCfg:(r)=>({mode:modeCfg(r)}),
  /* break і continue ведуть по різних дорогах після ромба, тому схеми не
     однакової висоти — рахуємо обидві, щоб перемикач не сіпав розмір. */
  sizeVariants:()=>[{mode:"break"},{mode:"continue"}],
  build:({mode})=>{
    const out=[], frames=[];
    /* базовий стан схеми: цикл уже зайшов у тіло, решта — залежно від кадру */
    const fl = (o)=>Object.assign({mode, loop:"taken", take:"taken", ifs:"pending"}, o);
    if(mode==="break"){
      const code=[`for i in range(10):`,`    if i == 5:`,`        break`,`    print(i)`];
      for(let i=0;i<10;i++){
        frames.push({line:0, vars:[{name:"i",val:i,cls:"i"}], out:[...out], flow:fl({}), note:`i = ${i}`});
        const hit = i===5;
        frames.push({line:1, vars:[{name:"i",val:i,cls:"i"}], out:[...out], flow:fl({ifs:"check"}),
          note:`Перевірка: ${i} == 5 → ${hit?"True":"False"}.`});
        if(hit){
          frames.push({line:2, vars:[{name:"i",val:i,cls:"i"}], out:[...out], kind:"end",
            flow:fl({ifs:"taken", end:"taken"}),
            note:`break — вихід із циклу негайно. Числа 5, 6, 7, 8, 9 навіть не розглядатимуться.`});
          break;
        }
        out.push(String(i));
        frames.push({line:3, vars:[{name:"i",val:i,cls:"i"}], out:[...out],
          flow:fl({ifs:"false", body:"taken", back:true}), note:`Друкуємо ${i}.`});
      }
      return {code, frames};
    }
    const code=[`for i in range(6):`,`    if i % 2 == 0:`,`        continue`,`    print(i)`];
    for(let i=0;i<6;i++){
      frames.push({line:0, vars:[{name:"i",val:i,cls:"i"}], out:[...out], flow:fl({}), note:`i = ${i}`});
      const even = i%2===0;
      frames.push({line:1, vars:[{name:"i",val:i,cls:"i"}], out:[...out], flow:fl({ifs:"check"}),
        note:`Перевірка: ${i} парне? → ${even?"True":"False"}.`});
      if(even){
        frames.push({line:2, vars:[{name:"i",val:i,cls:"i"}], out:[...out], flow:fl({ifs:"taken"}),
          note:`continue — решту тіла пропускаємо, одразу беремо наступне i. Цикл не переривається.`});
        continue;
      }
      out.push(String(i));
      frames.push({line:3, vars:[{name:"i",val:i,cls:"i"}], out:[...out],
        flow:fl({ifs:"false", body:"taken", back:true}), note:`Друкуємо ${i}.`});
    }
    frames.push({line:0, vars:[], out:[...out], kind:"end",
      flow:fl({loop:"false", take:"pending", end:"taken"}),
      note:`Цикл завершено: надруковані лише непарні числа.`});
    return {code, frames};
  },
  /* Обидва слова живуть в одному й тому самому місці схеми — після ромба
     всередині тіла. Різниця лише в тому, куди від нього веде стрілка. */
  extra:(f)=>{
    const brk = f.flow.mode === "break";
    return flowbox(ctlFlow({
      mode:f.flow.mode,
      start: brk ? "range(10)" : "range(6)",
      cond:"є ще число?",
      take:"i = наступне число",
      ifLabel: brk ? "i == 5 ?" : "i % 2 == 0 ?",
      body:"print(i)",
      state:f.flow
    }));
  }
});

/* ================= 5. вкладені цикли ================= */
createPlayer(document.getElementById("loops-w-nested"), {
  config:`<span class="seg">
      <button data-mode="rect" aria-pressed="true">Прямокутник</button>
      <button data-mode="tri" aria-pressed="false">Трикутник</button>
      <button data-mode="mult" aria-pressed="false">Таблиця множення</button>
    </span>
    <label>зовнішній <input type="number" data-cfg id="loops-ns-out" value="3" min="1" max="5"></label>
    <label>внутрішній <input type="number" data-cfg id="loops-ns-in" value="4" min="1" max="5"></label>`,
  readCfg:(r)=>({
    mode:modeCfg(r),
    a:numCfg(r,"#loops-ns-out",3),
    b:numCfg(r,"#loops-ns-in",4)
  }),
  /* Трикутник і множення додають/забирають вузол (tail), тому висота схеми
     різниться між режимами. Рахуємо всі три при поточних a/b, щоб перемикач
     форми не сіпав розмір — тільки зміна a чи b перебудовує заново. */
  sizeVariants:({a,b})=>["rect","tri","mult"].map(mode=>({mode,a,b})),
  build:({mode,a,b})=>{
    const out=[], frames=[];
    const vI=(i)=>({name:"i",val:i,cls:"i"});
    const vJ=(j)=>({name:"j",val:j,cls:"j"});
    let code, rows, total=0;

    if(mode==="rect"){
      code=[`for i in range(${a}):`,`    for j in range(${b}):`,`        print(i, j)`];
      rows = R(a).map(()=>b);
    } else if(mode==="tri"){
      code=[`for i in range(${a}):`,`    for j in range(i + 1):`,`        print("*", end="")`,`    print()`];
      rows = R(a).map(i=>i+1);
    } else {
      code=[`for i in range(1, ${a+1}):`,`    for j in range(1, ${b+1}):`,`        print(i, "*", j, "=", i * j)`];
      rows = R(a).map(()=>b);
    }

    const grid = {a, rows, i:-1, j:-1, done:new Set(), mode};
    const snap = (i,j)=>({a, b, rows, i, j, done:new Set(grid.done), mode});
    /* стан схеми: src — те, що перебирає зовнішній цикл, body — рядок тіла */
    const fl = (o)=>Object.assign({
      src: mode==="mult" ? `range(1, ${a+1})` : `range(${a})`,
      body: code[2].trim(), tri: mode==="tri",
      outer:"pending", inner:"pending"
    }, o);
    const inLoop = {outer:"taken", outerTake:"taken"};

    frames.push({line:0, vars:[], out:[], grid:snap(-1,-1), flow:fl({}),
      note:`Старт. Зовнішній цикл дасть ${a} кроків, і на кожному з них внутрішній пройде свій шлях повністю.`});

    R(a).forEach(ri=>{
      const iVal = mode==="mult" ? ri+1 : ri;
      const inner = rows[ri];
      frames.push({line:0, vars:[vI(iVal)], out:[...out], grid:snap(ri,-1), flow:fl(inLoop),
        note:`Зовнішній цикл: i = ${iVal}. Це початок нового рядка — заходимо у внутрішній цикл.`});
      if(inner===0){
        frames.push({line:1, vars:[vI(iVal)], out:[...out], grid:snap(ri,-1), kind:"inner",
          flow:fl(Object.assign({inner:"false"}, inLoop)),
          note:`Внутрішній діапазон порожній — тіло не виконається.`});
      }
      R(inner).forEach(rj=>{
        const jVal = mode==="mult" ? rj+1 : rj;
        frames.push({line:1, vars:[vI(iVal), vJ(jVal)], out:[...out], grid:snap(ri,rj), kind:"inner",
          flow:fl(Object.assign({inner:"taken", innerTake:"taken"}, inLoop)),
          note: rj===0
            ? `Внутрішній цикл стартує заново: j = ${jVal}. Зверни увагу — j завжди починається спочатку, i при цьому не змінюється.`
            : `Внутрішній цикл: j = ${jVal}. i досі ${iVal} і чекає.`});
        total++;
        if(mode==="rect") out.push(`${iVal} ${jVal}`);
        else if(mode==="mult") out.push(`${iVal} * ${jVal} = ${iVal*jVal}`);
        else {
          if(rj===0) out.push("*"); else out[out.length-1] += "*";
        }
        grid.done.add(ri+"-"+rj);
        frames.push({line:2, vars:[vI(iVal), vJ(jVal)], out:[...out], grid:snap(ri,rj), kind:"inner",
          flow:fl(Object.assign({inner:"taken", innerTake:"taken", bodyState:"taken", backIn:true}, inLoop)),
          note: mode==="tri"
            ? `Друкуємо зірочку без переходу на новий рядок (end=""). Виконань тіла: ${total}.`
            : `Тіло виконано з парою i = ${iVal}, j = ${jVal}. Всього виконань: ${total}.`});
      });
      if(mode==="tri"){
        out.push("");
        frames.push({line:3, vars:[vI(iVal)], out:[...out], grid:snap(ri,-1),
          flow:fl(Object.assign({inner:"false", tailState:"taken"}, inLoop)),
          note:`Внутрішній цикл закінчився. print() без аргументів переводить рядок — і це вже рівень зовнішнього циклу.`});
      } else {
        frames.push({line:0, vars:[vI(iVal)], out:[...out], grid:snap(ri,-1),
          flow:fl(Object.assign({inner:"false"}, inLoop)),
          note:`Внутрішній цикл вичерпався. Тільки тепер зовнішній робить наступний крок.`});
      }
    });

    frames.push({line:0, vars:[], out:[...out], grid:snap(-1,-1), kind:"end",
      flow:fl({outer:"false", end:"taken"}),
      note: mode==="tri"
        ? `Готово. Довжина рядка залежала від i, тому вийшли сходинки.`
        : `Готово. Тіло виконалось ${total} разів: ${a} × ${b}.`});
    if(mode==="tri" && out[out.length-1]==="") out.pop();
    return {code, frames};
  },
  /* Сітка показує, у якому порядку заповнюються клітинки, схема поруч — чому
     саме в такому: у неї дві дороги назад, і коротка завжди має пріоритет. */
  extra:(f)=>{
    const g=f.grid; if(!g) return "";
    let html = `<div class="grid" style="grid-template-columns:repeat(${Math.max(...g.rows)+1}, 34px)">`;
    for(let r=0;r<g.a;r++){
      html += `<div class="gaxis" style="color:${r===g.i?"var(--i)":""}">i=${g.mode==="mult"?r+1:r}</div>`;
      for(let c=0;c<Math.max(...g.rows);c++){
        if(c>=g.rows[r]){ html += `<div style="width:34px"></div>`; continue; }
        const now = r===g.i && c===g.j;
        const done = g.done.has(r+"-"+c) && !now;
        const label = g.mode==="tri" ? "*" : (g.mode==="mult" ? (r+1)*(c+1) : `${g.mode==="mult"?r+1:r},${c}`);
        html += `<div class="gc ${now?"now":""} ${done?"done":""} ${r===g.i?"row-now":""}">${label}</div>`;
      }
    }
    html += `</div>`;
    const s = f.flow;
    /* Трикутник рахує стовпці лише через i (до a), прямокутник і множення —
       через j (до b), тож сітка сама по собі вужча чи ширша залежно від
       режиму. Без цього резерву звільнене місце діставалось схемі — вона
       ширшала й через це «роздувалась» при самому лише перемиканні форми. */
    const reserveCols = Math.max(g.a, g.b) + 1;
    const reserveW = reserveCols*34 + (reserveCols-1)*6;
    return `<div class="vizsplit"><div style="min-width:${reserveW}px">${html}</div>` + flowbox(nestFlow({
      start:s.src,
      outer:"є ще i ?", outerTake:"i = наступне значення",
      inner:"є ще j ?", innerTake:"j = наступне значення",
      body:s.body,
      tail: s.tri ? `print()` : null,
      state:{ outer:s.outer, outerTake:s.outerTake, inner:s.inner, innerTake:s.innerTake,
              body:s.bodyState, backIn:s.backIn, tail:s.tailState, end:s.end }
    })) + `</div>`;
  }
});

/* ================= hero ================= */
(function(){
  const row = document.getElementById("loops-heroRow");
  const line = document.getElementById("loops-heroLine");
  const btn = document.getElementById("loops-heroBtn");
  const N = 8;
  row.innerHTML = R(N).map(k=>`<div class="cellbox" data-k="${k}">${k}</div>`).join("");
  const cells = [...row.children];
  let t=null;
  function run(){
    clearInterval(t);
    cells.forEach(c=>c.className="cellbox");
    let k=0;
    t = setInterval(()=>{
      cells.forEach(c=>c.classList.remove("now"));
      if(k>=N){
        clearInterval(t);
        line.innerHTML = `цикл завершено — тіло виконалось <b>8</b> разів`;
        return;
      }
      cells[k].classList.add("on","now");
      line.innerHTML = `i = <b>${k}</b> → print(i)`;
      k++;
    }, 380);
  }
  btn.onclick = run;
  let auto = null;
  /* запуск і зупинку веде роутер: сторінки лишаються в DOM, тому анімацію
     схованої теми треба гасити, а при повторному заході — заводити знову */
  window.registerAnim({
    el: btn,
    stop(){ clearInterval(t); t=null; clearTimeout(auto); auto=null; },
    start(){ clearTimeout(auto); auto = setTimeout(run, 600); }
  });
})();

};
