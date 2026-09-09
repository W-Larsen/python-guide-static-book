"use strict";
window.PageInit["cond"] = function(){
const esc = (s) => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

/* дуже проста підсвітка синтаксису */
function hl(line){
  let s = esc(line);
  s = s.replace(/(&quot;|")([^"]*)("|&quot;)/g, '<span class="str">"$2"</span>');
  s = s.replace(/\b(for|in|while|elif|if|break|continue|else|not|and|or|True|False)\b/g, '<span class="kw">$1</span>');
  s = s.replace(/\b(print|range|len|end)\b/g, '<span class="fn">$1</span>');
  s = s.replace(/\b(\d+)\b/g, '<span class="num">$1</span>');
  return s;
}

/* ================= player ================= */
const createPlayer = window.CollKit.makePlayer({ hl, tick:620 });
const { numCfg, modeCfg } = window.CollKit;

/* ==========================================================================
   Блок-схеми

   Фігури, стрілки й полотно живуть у спільному FlowKit — ним же малює схеми
   сторінка циклів. Тут лишається тільки розкладка: як саме ромби й дії
   стоять у ланцюжку if / elif / else.
   ========================================================================== */
const { A, fnode, flowSvg, eState, aState, condText } = window.FlowKit;

/* ---------- ланцюжок if / elif / else ----------
   Ромби стоять стовпчиком ліворуч, дії — праворуч. False веде вниз до
   наступної перевірки, True — убік до дії. Усі дії зливаються в спільний
   стовбур справа, який приводить до спільного продовження.
   opts.tail — рядок без відступу після всього ланцюжка: він стоїть уже на
   спільній дорозі, тому до нього приходять геть усі гілки. */
function chainFlow(brs, opts){
  opts = opts || {};
  const SX = 120, CW = 215, AX = 448, AW = 310, JX = 642, Y0 = 100, PITCH = 90;
  const conds = brs.filter(b=>!b.isElse);
  const els   = brs.filter(b=>b.isElse)[0] || null;
  const done  = opts.endState === "taken";

  const start = fnode({kind:"start", x:SX, y:22, w:190, label:opts.start || "старт"});
  const cn = conds.map((b,k)=>fnode({kind:"cond", x:SX, y:Y0 + k*PITCH, w:CW,
    label:condText(b.label), state:b.state, key:"c"+k, title:b.label}));
  const an = conds.map((b,k)=>fnode({kind:"act", x:AX, y:Y0 + k*PITCH, w:AW,
    label:b.act, state:aState(b.state), key:"a"+k}));
  const elseY = Y0 + conds.length * PITCH;
  const en = els ? fnode({kind:"act", x:AX, y:elseY, w:AW, label:els.act,
    state:aState(els.state), key:"ae"}) : null;

  /* точка, де всі дороги знову сходяться */
  const meetY = (en ? elseY : Y0 + (conds.length-1)*PITCH) + 86;
  const tail = opts.tail
    ? fnode({kind:"act", x:SX, y:meetY, w:230, label:opts.tail,
             state:done ? "taken" : "pending", key:"tail"})
    : null;
  const meet = tail || fnode({kind:"end", x:SX, y:meetY, w:190,
    label:opts.end || "кінець", state:done ? "taken" : "pending"});
  const end = tail
    ? fnode({kind:"end", x:SX, y:meetY + 68, w:190, label:opts.end || "кінець",
             state:done ? "taken" : "pending"})
    : null;

  const edges = [{pts:[A.b(start), A.t(cn[0])], state:"on"}];
  cn.forEach((c,k)=>{
    edges.push({pts:[A.r(c), A.l(an[k])], state:eState(conds[k].state, "taken"),
      label:"True", lx:(c.x + c.w/2 + an[k].x - an[k].w/2) / 2, ly:c.y - 8});
    if(k < cn.length - 1)
      edges.push({pts:[A.b(c), A.t(cn[k+1])], state:eState(conds[k].state, "false"),
        label:"False", la:"start", lx:SX + 11, ly:c.y + c.h/2 + 19});
  });
  const lastC = cn[cn.length-1], lastS = conds[conds.length-1].state;
  edges.push(en
    ? {pts:[A.b(lastC), [SX, elseY], A.l(en)], state:eState(lastS, "false"),
       label:"False", la:"start", lx:SX + 11, ly:lastC.y + lastC.h/2 + 19}
    : {pts:[A.b(lastC), A.t(meet)], state:eState(lastS, "false"),
       label:"False", la:"start", lx:SX + 11, ly:lastC.y + lastC.h/2 + 19});

  const join = (n, st) => ({pts:[A.r(n), [JX, n.y], [JX, meetY], A.r(meet)], state:st});
  an.forEach((a,k)=>edges.push(join(a, eState(conds[k].state, "taken"))));
  if(en) edges.push(join(en, eState(els.state, "taken")));
  if(end) edges.push({pts:[A.b(tail), A.t(end)], state:done ? "on" : "idle"});

  const last = end || meet;
  const nodes = [start].concat(cn, an, en ? [en] : [], [meet], end ? [end] : []);
  return flowSvg(nodes, edges, last.y + last.h/2 + 16, "Блок-схема ланцюжка умов");
}

/* ---------- кілька незалежних if ----------
   Кожна перевірка — окрема розвилка: обидві дороги повертаються на спільну
   вертикаль, і програма йде до наступного if у будь-якому разі. */
function seqFlow(brs, opts){
  opts = opts || {};
  const SX = 120, CW = 215, AX = 448, AW = 310, Y0 = 100, PITCH = 118;

  const start = fnode({kind:"start", x:SX, y:22, w:190, label:opts.start || "старт"});
  const cn = brs.map((b,k)=>fnode({kind:"cond", x:SX, y:Y0 + k*PITCH, w:CW,
    label:condText(b.label), state:b.state, key:"c"+k, title:b.label}));
  const an = brs.map((b,k)=>fnode({kind:"act", x:AX, y:Y0 + k*PITCH, w:AW,
    label:b.act, state:aState(b.state), key:"a"+k}));
  const end = fnode({kind:"end", x:SX, y:Y0 + (brs.length-1)*PITCH + 96, w:190,
    label:opts.end || "кінець", state:opts.endState || "pending"});

  const edges = [{pts:[A.b(start), A.t(cn[0])], state:"on"}];
  cn.forEach((c,k)=>{
    /* поворот повернення стоїть нижче за підпис False, інакше вони злипаються */
    const st = brs[k].state, next = cn[k+1] || end, jy = c.y + c.h/2 + 44;
    edges.push({pts:[A.r(c), A.l(an[k])], state:eState(st, "taken"),
      label:"True", lx:(c.x + c.w/2 + an[k].x - an[k].w/2) / 2, ly:c.y - 8});
    edges.push({pts:[A.b(c), A.t(next)], state:eState(st, "false"),
      label:"False", la:"start", lx:SX + 11, ly:c.y + c.h/2 + 19});
    edges.push({pts:[A.b(an[k]), [an[k].x, jy], [SX + 7, jy]], state:eState(st, "taken")});
  });

  return flowSvg([start].concat(cn, an, [end]), edges, end.y + end.h/2 + 16,
    "Блок-схема трьох незалежних умов");
}

/* ---------- вкладені умови ----------
   brs: [зовнішній if, внутрішній if, внутрішній else, зовнішній else] */
function nestedFlow(brs, opts){
  opts = opts || {};
  const SX = 150, CW = 215, AX = 480, AW = 290, JX = 650;
  const OY = 100, IY = 190, TY = 272, EY = 356;

  const start = fnode({kind:"start", x:SX, y:22, w:190, label:opts.start || "старт"});
  const oc = fnode({kind:"cond", x:SX, y:OY, w:CW, label:condText(brs[0].label),
    state:brs[0].state, key:"co", title:brs[0].label});
  const ob = fnode({kind:"act", x:AX, y:OY, w:AW, label:brs[3].act, state:aState(brs[3].state), key:"ao"});
  const ic = fnode({kind:"cond", x:SX, y:IY, w:CW, label:condText(brs[1].label),
    state:brs[1].state, key:"ci", title:brs[1].label});
  const ib = fnode({kind:"act", x:AX, y:IY, w:AW, label:brs[2].act, state:aState(brs[2].state), key:"ai"});
  const tb = fnode({kind:"act", x:SX, y:TY, w:270, label:brs[1].act, state:aState(brs[1].state), key:"at"});
  const end = fnode({kind:"end", x:SX, y:EY, w:190, label:opts.end || "кінець",
    state:opts.endState || "pending"});

  const edges = [
    {pts:[A.b(start), A.t(oc)], state:"on"},
    {pts:[A.r(oc), A.l(ob)], state:eState(brs[0].state, "false"),
      label:"False", lx:(oc.x + oc.w/2 + ob.x - ob.w/2)/2, ly:OY - 8},
    {pts:[A.b(oc), A.t(ic)], state:eState(brs[0].state, "taken"),
      label:"True", la:"start", lx:SX + 11, ly:(oc.y + oc.h/2 + ic.y - ic.h/2)/2 + 4},
    {pts:[A.r(ic), A.l(ib)], state:eState(brs[1].state, "false"),
      label:"False", lx:(ic.x + ic.w/2 + ib.x - ib.w/2)/2, ly:IY - 8},
    {pts:[A.b(ic), A.t(tb)], state:eState(brs[1].state, "taken"),
      label:"True", la:"start", lx:SX + 11, ly:(ic.y + ic.h/2 + tb.y - tb.h/2)/2 + 4},
    {pts:[A.b(tb), A.t(end)], state:eState(brs[1].state, "taken")},
    {pts:[A.r(ob), [JX, OY], [JX, EY], A.r(end)], state:eState(brs[3].state, "taken")},
    {pts:[A.r(ib), [JX, IY], [JX, EY], A.r(end)], state:eState(brs[2].state, "taken")}
  ];

  return flowSvg([start, oc, ob, ic, ib, tb, end], edges, end.y + end.h/2 + 16,
    "Блок-схема вкладених умов");
}

/* Схема під кодом. Овал старту повторює значення змінних, щоб схему можна
   було читати окремо від коду, а кінець засвічується лише на останньому кадрі. */
const flowOf = (draw, opts) => (f) => {
  const o = Object.assign({
    start: (f.vars || []).map(v=>`${v.name} = ${v.val}`).join(", ") || "старт",
    endState: f.kind === "end" ? "taken" : "pending"
  }, opts);
  return `<div class="flowbox">${draw(f.branches, o)}</div>`;
};

/* ланцюжок if / elif / else */
function chain({code, setupLine, vars, branches, elseBr, tail}){
  const out=[], frames=[];
  const states = branches.map(()=> "pending");
  let elseState = elseBr ? "pending" : null;
  const snap = () => {
    const arr = branches.map((b,k)=>({label:b.label, act:`print("${b.msg}")`, state:states[k]}));
    if(elseBr) arr.push({label:"else", act:`print("${elseBr.msg}")`, state:elseState, isElse:true});
    return arr;
  };
  frames.push({line:setupLine, vars, out:[], branches:snap(),
    note:`Готуємо дані. Далі Python читатиме умови згори вниз.`});
  let taken=false;
  for(let k=0;k<branches.length;k++){
    const b=branches[k];
    states[k]="check";
    frames.push({line:b.line, vars, out:[...out], branches:snap(),
      note:`Перевірка: ${b.expl} → ${b.cond ? "True" : "False"}.`});
    if(b.cond){
      states[k]="taken";
      for(let m=k+1;m<branches.length;m++) states[m]="skipped";
      if(elseBr) elseState="skipped";
      out.push(b.msg);
      frames.push({line:b.body, vars, out:[...out], branches:snap(), kind:"inner",
        note:`Умова справдилась — виконуємо цю гілку. Решта ланцюжка пропускається повністю.`});
      taken=true; break;
    }
    states[k]="false";
  }
  if(!taken){
    if(elseBr){
      elseState="check";
      frames.push({line:elseBr.line, vars, out:[...out], branches:snap(),
        note:`Жодна умова не справдилась. else спрацьовує без перевірки — він ловить усе інше.`});
      elseState="taken";
      out.push(elseBr.msg);
      frames.push({line:elseBr.body, vars, out:[...out], branches:snap(), kind:"inner",
        note:`Виконуємо гілку else.`});
    } else {
      frames.push({line:branches[0].line, vars, out:[...out], branches:snap(),
        note:`Умова хибна, а else немає — тіло просто пропускається. Помилки не буде.`});
    }
  }
  if(tail){
    out.push(tail.msg);
    frames.push({line:tail.line, vars, out:[...out], branches:snap(), kind:"end",
      note:`Цей рядок без відступу, тому він не належить жодній гілці — виконується завжди.`});
  } else {
    frames.push({line:0, vars, out:[...out], branches:snap(), kind:"end", note:`Програма завершена.`});
  }
  return {code, frames};
}

/* ================= 1. пісочниця з порівняннями ================= */
(function(){
  const root = document.getElementById("cond-w-sandbox");
  root.innerHTML = `
    <div class="sandbox">
      <input type="number" id="cond-sb-a" value="7">
      <select id="cond-sb-op">
        <option value="==">==</option><option value="!=">!=</option>
        <option value="&gt;" selected>&gt;</option><option value="&lt;">&lt;</option>
        <option value="&gt;=">&gt;=</option><option value="&lt;=">&lt;=</option>
      </select>
      <input type="number" id="cond-sb-b" value="10">
      <span class="arrow">→</span>
      <span class="bool" id="cond-sb-res">False</span>
    </div>
    <div class="sandbox-note" id="cond-sb-note"></div>`;
  const a=root.querySelector("#cond-sb-a"), b=root.querySelector("#cond-sb-b"),
        op=root.querySelector("#cond-sb-op"), res=root.querySelector("#cond-sb-res"), note=root.querySelector("#cond-sb-note");
  const names={"==":"дорівнює","!=":"не дорівнює",">":"більше","<":"менше",">=":"більше або дорівнює","<=":"менше або дорівнює"};
  function upd(){
    const x=Number(a.value)||0, y=Number(b.value)||0, o=op.value;
    const v = o==="=="?x===y : o==="!="?x!==y : o===">"?x>y : o==="<"?x<y : o===">="?x>=y : x<=y;
    res.textContent = v ? "True" : "False";
    res.className = "bool " + (v?"t":"f");
    note.innerHTML = `Питання до Python: «${x} ${names[o]} ${y}?» Відповідь — <b>${v?"так":"ні"}</b>. Саме це значення й отримує <code>if</code>.`;
  }
  [a,b,op].forEach(el=>el.addEventListener("input", upd));
  upd();
})();

/* ================= 2. тільки if ================= */
createPlayer(document.getElementById("cond-w-if"), {
  config:`<label>temp <input type="number" data-cfg id="cond-if-t" value="25" min="-20" max="45"></label>`,
  readCfg:(r)=>({t:numCfg(r,"#cond-if-t",25)}),
  build:({t})=>chain({
    code:[`temp = ${t}`,`if temp > 20:`,`    print("Тепло, беремо футболку")`,``,`print("Гарного дня!")`],
    setupLine:0,
    vars:[{name:"temp",val:t,cls:"i"}],
    branches:[{line:1, body:2, label:"if temp > 20", expl:`${t} > 20`, cond:t>20, msg:"Тепло, беремо футболку"}],
    tail:{line:4, msg:"Гарного дня!"}
  }),
  extra:flowOf(chainFlow, {tail:`print("Гарного дня!")`})
});

/* ================= 3. if / else ================= */
createPlayer(document.getElementById("cond-w-ifelse"), {
  config:`<label>age <input type="number" data-cfg id="cond-ie-a" value="16" min="0" max="99"></label>`,
  readCfg:(r)=>({a:numCfg(r,"#cond-ie-a",16)}),
  build:({a})=>chain({
    code:[`age = ${a}`,`if age >= 18:`,`    print("Можна голосувати")`,`else:`,`    print("Ще зарано")`],
    setupLine:0,
    vars:[{name:"age",val:a,cls:"i"}],
    branches:[{line:1, body:2, label:"if age >= 18", expl:`${a} >= 18`, cond:a>=18, msg:"Можна голосувати"}],
    elseBr:{line:3, body:4, msg:"Ще зарано"}
  }),
  extra:flowOf(chainFlow)
});

/* ================= 4. ланцюжок elif ================= */
createPlayer(document.getElementById("cond-w-elif"), {
  config:`<label>score <input type="number" data-cfg id="cond-el-s" value="85" min="0" max="100"></label>`,
  readCfg:(r)=>({s:numCfg(r,"#cond-el-s",85)}),
  build:({s})=>chain({
    code:[`score = ${s}`,
      `if score >= 90:`,`    print("Відмінно")`,
      `elif score >= 75:`,`    print("Добре")`,
      `elif score >= 60:`,`    print("Задовільно")`,
      `else:`,`    print("Треба підтягнути")`],
    setupLine:0,
    vars:[{name:"score",val:s,cls:"i"}],
    branches:[
      {line:1, body:2, label:"if score >= 90", expl:`${s} >= 90`, cond:s>=90, msg:"Відмінно"},
      {line:3, body:4, label:"elif score >= 75", expl:`${s} >= 75`, cond:s>=75, msg:"Добре"},
      {line:5, body:6, label:"elif score >= 60", expl:`${s} >= 60`, cond:s>=60, msg:"Задовільно"}
    ],
    elseBr:{line:7, body:8, msg:"Треба підтягнути"}
  }),
  extra:flowOf(chainFlow)
});

/* ================= 5. elif проти кількох if ================= */
createPlayer(document.getElementById("cond-w-vs"), {
  config:`<span class="seg">
      <button data-mode="elif" aria-pressed="true">Ланцюжок elif</button>
      <button data-mode="ifs" aria-pressed="false">Три окремі if</button>
    </span>
    <label>score <input type="number" data-cfg id="cond-vs-s" value="95" min="0" max="100"></label>`,
  readCfg:(r)=>({
    mode:modeCfg(r),
    s:numCfg(r,"#cond-vs-s",95)
  }),
  build:({mode,s})=>{
    const defs=[
      {label:"score >= 90", cond:s>=90, msg:"Відмінно"},
      {label:"score >= 75", cond:s>=75, msg:"Добре"},
      {label:"score >= 60", cond:s>=60, msg:"Задовільно"}
    ];
    if(mode==="elif"){
      return chain({
        code:[`score = ${s}`,`if score >= 90:`,`    print("Відмінно")`,
          `elif score >= 75:`,`    print("Добре")`,`elif score >= 60:`,`    print("Задовільно")`],
        setupLine:0,
        vars:[{name:"score",val:s,cls:"i"}],
        branches:defs.map((d,k)=>({line:1+k*2, body:2+k*2,
          label:(k?"elif ":"if ")+d.label, expl:`${s} >= ${[90,75,60][k]}`, cond:d.cond, msg:d.msg}))
      });
    }
    const code=[`score = ${s}`,`if score >= 90:`,`    print("Відмінно")`,
      `if score >= 75:`,`    print("Добре")`,`if score >= 60:`,`    print("Задовільно")`];
    const out=[], frames=[];
    const states=["pending","pending","pending"];
    const snap=()=>defs.map((d,k)=>({label:"if "+d.label, act:`print("${d.msg}")`, state:states[k]}));
    const vars=[{name:"score",val:s,cls:"i"}];
    frames.push({line:0, vars, out:[], branches:snap(), seq:true, note:`Три незалежні умови. Кожна буде перевірена окремо.`});
    defs.forEach((d,k)=>{
      states[k]="check";
      frames.push({line:1+k*2, vars, out:[...out], branches:snap(), seq:true,
        note:`Перевірка №${k+1}: ${s} >= ${[90,75,60][k]} → ${d.cond?"True":"False"}. Попередній if на це ніяк не впливає.`});
      if(d.cond){
        states[k]="taken"; out.push(d.msg);
        frames.push({line:2+k*2, vars, out:[...out], branches:snap(), seq:true, kind:"inner",
          note:`Друкуємо «${d.msg}». Але програма піде перевіряти наступний if далі.`});
      } else states[k]="false";
    });
    frames.push({line:0, vars, out:[...out], branches:snap(), seq:true, kind:"end",
      note: out.length>1
        ? `Ось і проблема: надруковано ${out.length} рядки замість одного. Оцінка має бути одна.`
        : `Тут результат збігся з ланцюжком, але лише випадково — спробуй бал 95.`});
    return {code, frames};
  },
  /* дві схеми поруч показують те, чого не видно в коді: одна розвилка з
     кількома виходами проти трьох розвилок поспіль */
  extra:(f)=>flowOf(f.seq ? seqFlow : chainFlow)(f)
});

/* ================= 6. and / or / not ================= */
createPlayer(document.getElementById("cond-w-logic"), {
  config:`<span class="seg">
      <button data-mode="and" aria-pressed="true">and</button>
      <button data-mode="or" aria-pressed="false">or</button>
    </span>
    <span class="switchrow">
      <label class="switch"><input type="checkbox" data-cfg id="cond-lg-a" checked> є квиток</label>
      <label class="switch"><input type="checkbox" data-cfg id="cond-lg-b"> є паспорт</label>
    </span>`,
  readCfg:(r)=>({
    mode:modeCfg(r),
    a:r.querySelector("#cond-lg-a").checked,
    b:r.querySelector("#cond-lg-b").checked
  }),
  build:({mode,a,b})=>{
    const py=(v)=>v?"True":"False";
    const code=[`ticket = ${py(a)}`,`passport = ${py(b)}`,
      `if ticket ${mode} passport:`,`    print("Проходьте")`,`else:`,`    print("Стоп")`];
    const vars=[{name:"ticket",val:py(a),cls:"i"},{name:"passport",val:py(b),cls:"j"}];
    const res = mode==="and" ? (a&&b) : (a||b);
    const shortCircuit = (mode==="and" && !a) || (mode==="or" && a);
    const out=[], frames=[];
    frames.push({line:0, vars, out:[], row:-1, note:`Дві змінні зі значеннями True/False. Такі значення називають булевими.`});
    frames.push({line:2, vars, out:[], row:rowOf(a,b),
      note:`Дивимось ліву частину: ticket = ${py(a)}.`});
    frames.push({line:2, vars, out:[], row:rowOf(a,b),
      note: shortCircuit
        ? (mode==="and"
            ? `Ліва частина False, а and вимагає обидві — праву Python навіть не перевіряє. Результат уже відомий: False.`
            : `Ліва частина True, а or достатньо однієї — праву Python не перевіряє. Результат: True.`)
        : `Ліва частина не вирішує все, тому дивимось праву: passport = ${py(b)}.`});
    frames.push({line:2, vars, out:[], row:rowOf(a,b),
      note:`${py(a)} ${mode} ${py(b)} → ${py(res)}.`});
    out.push(res ? "Проходьте" : "Стоп");
    frames.push({line: res?3:5, vars, out:[...out], row:rowOf(a,b), kind: res?"inner":"end",
      note: res ? `Умова істинна — виконується тіло if.` : `Умова хибна — працює else.`});
    return {code, frames};
  },
  extra:(f)=>{
    const mode = document.querySelector('#cond-w-logic [data-mode][aria-pressed="true"]').dataset.mode;
    const rows=[[false,false],[false,true],[true,false],[true,true]];
    return `<table class="tt"><tr><th>ticket</th><th>passport</th><th>результат ${mode}</th></tr>` +
      rows.map(([x,y],k)=>{
        const v = mode==="and" ? (x&&y) : (x||y);
        return `<tr class="${k===f.row?"now":""}"><td>${x?"True":"False"}</td><td>${y?"True":"False"}</td><td>${v?"True":"False"}</td></tr>`;
      }).join("") + `</table>`;
  }
});
function rowOf(a,b){ return (a?2:0)+(b?1:0); }

/* ================= 7. вкладені умови ================= */
createPlayer(document.getElementById("cond-w-nested"), {
  config:`<label>age <input type="number" data-cfg id="cond-nt-a" value="16" min="0" max="99"></label>
    <label>money <input type="number" data-cfg id="cond-nt-m" value="200" min="0" max="999"></label>`,
  readCfg:(r)=>({
    a:numCfg(r,"#cond-nt-a",16),
    m:numCfg(r,"#cond-nt-m",200)
  }),
  build:({a,m})=>{
    const code=[`age = ${a}`,`money = ${m}`,
      `if age >= 16:`,
      `    if money >= 150:`,
      `        print("Купуємо квиток")`,
      `    else:`,
      `        print("Вік підходить, а грошей бракує")`,
      `else:`,
      `    print("На цей сеанс замалий вік")`];
    const vars=[{name:"age",val:a,cls:"i"},{name:"money",val:m,cls:"j"}];
    const out=[], frames=[];
    const outer = a>=16, inner = m>=150;
    const st = {o:"pending", i1:"pending", i2:"pending", e:"pending"};
    const snap=()=>[
      {label:"if age >= 16",       act:`print("Купуємо квиток")`,                 state:st.o},
      {label:"if money >= 150",    act:`print("Купуємо квиток")`,                 state:st.i1},
      {label:"else",               act:`print("Вік підходить, а грошей бракує")`, state:st.i2},
      {label:"else",               act:`print("На цей сеанс замалий вік")`,       state:st.e}
    ];
    frames.push({line:1, vars, out:[], branches:snap(), note:`Маємо дві змінні. Спершу перевіряється лише зовнішня умова.`});
    st.o="check";
    frames.push({line:2, vars, out:[], branches:snap(),
      note:`Зовнішня умова: ${a} >= 16 → ${outer?"True":"False"}.`});
    if(!outer){
      st.o="false"; st.i1="skipped"; st.i2="skipped"; st.e="taken";
      out.push("На цей сеанс замалий вік");
      frames.push({line:7, vars, out:[], branches:snap(),
        note:`Зовнішня умова хибна — увесь вкладений блок пропускається. Про гроші ніхто навіть не питає.`});
      frames.push({line:8, vars, out:[...out], branches:snap(), kind:"end", note:`Працює зовнішній else.`});
      return {code, frames};
    }
    st.o="taken"; st.e="skipped"; st.i1="check";
    frames.push({line:3, vars, out:[], branches:snap(), kind:"inner",
      note:`Зайшли всередину. Тільки тепер перевіряється друга умова: ${m} >= 150 → ${inner?"True":"False"}.`});
    if(inner){
      st.i1="taken"; st.i2="skipped";
      out.push("Купуємо квиток");
      frames.push({line:4, vars, out:[...out], branches:snap(), kind:"inner",
        note:`Обидві умови справдились — це єдиний шлях до цього рядка.`});
    } else {
      st.i1="false"; st.i2="taken";
      out.push("Вік підходить, а грошей бракує");
      frames.push({line:5, vars, out:[], branches:snap(),
        note:`Внутрішня умова хибна. Цей else має такий самий відступ, як внутрішній if, тому належить саме йому.`});
      frames.push({line:6, vars, out:[...out], branches:snap(), kind:"inner", note:`Виконуємо внутрішній else.`});
    }
    frames.push({line:0, vars, out:[...out], branches:snap(), kind:"end",
      note:`Зовнішній else так і не спрацював — його гілку взагалі не розглядали.`});
    return {code, frames};
  },
  extra:flowOf(nestedFlow)
});

/* ================= hero ================= */
/* Та сама схема, що й у віджетах, але без коду: бал змінюється з кожним
   показом, тож видно обидві дороги. */
(function(){
  const box  = document.getElementById("cond-heroFlow");
  const line = document.getElementById("cond-heroLine");
  const btn  = document.getElementById("cond-heroBtn");
  const CASES = [95, 42, 90, 71];
  let n = 0, score = CASES[0], t = null, auto = null;

  function draw(s1, s2, endState){
    box.innerHTML = chainFlow(
      [{label:"if score >= 90", act:`print("Відмінно")`, state:s1},
       {label:"else", act:`print("Ще підтягнемось")`, state:s2, isElse:true}],
      {start:`score = ${score}`, endState});
  }
  function run(){
    clearTimeout(t);
    score = CASES[n % CASES.length]; n++;
    draw("pending","pending");
    line.textContent = "Python підходить до розвилки";
    t = setTimeout(()=>{
      draw("check","pending");
      line.textContent = `${score} >= 90 ?`;
      t = setTimeout(()=>{
        const ok = score >= 90;
        draw(ok ? "taken" : "false", ok ? "skipped" : "taken");
        line.innerHTML = ok
          ? `<b>True</b> — програма звертає в гілку if`
          : `<b>False</b> — гілка if пропускається, працює else`;
        t = setTimeout(()=>{
          draw(ok ? "taken" : "false", ok ? "skipped" : "taken", "taken");
          line.innerHTML = `дороги знову сходяться: виконалась рівно <b>одна</b> гілка`;
        }, 1100);
      }, 1100);
    }, 900);
  }
  btn.onclick = run;
  draw("pending","pending");
  /* запуск і зупинку веде роутер — див. registerAnim */
  window.registerAnim({
    el: btn,
    stop(){ clearTimeout(t); t=null; clearTimeout(auto); auto=null; },
    start(){ clearTimeout(auto); auto = setTimeout(run, 700); }
  });
})();

};
