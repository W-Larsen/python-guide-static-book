"use strict";
window.PageInit["cond"] = function(){
const R = (n) => Array.from({length:n}, (_,k)=>k);
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

/* ================= гілки ================= */
function ladder(branches){
  if(!branches) return "";
  return `<div class="ladder">${branches.map(b=>{
    const verdict = b.state==="false" ? "False"
      : b.state==="taken" ? (b.label==="else" ? "виконується" : "True")
      : b.state==="check" ? "перевіряємо…"
      : b.state==="skipped" ? "не перевіряється" : "";
    return `<div class="br ${b.state}"><span>${esc(b.label)}</span><span class="verdict">${verdict}</span></div>`;
  }).join("")}</div>`;
}

/* ланцюжок if / elif / else */
function chain({code, setupLine, vars, branches, elseBr, tail}){
  const out=[], frames=[];
  const states = branches.map(()=> "pending");
  let elseState = elseBr ? "pending" : null;
  const snap = () => {
    const arr = branches.map((b,k)=>({label:b.label, state:states[k]}));
    if(elseBr) arr.push({label:"else", state:elseState});
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
  extra:(f)=>ladder(f.branches)
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
  extra:(f)=>ladder(f.branches)
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
  extra:(f)=>ladder(f.branches)
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
    const snap=()=>defs.map((d,k)=>({label:"if "+d.label, state:states[k]}));
    const vars=[{name:"score",val:s,cls:"i"}];
    frames.push({line:0, vars, out:[], branches:snap(), note:`Три незалежні умови. Кожна буде перевірена окремо.`});
    defs.forEach((d,k)=>{
      states[k]="check";
      frames.push({line:1+k*2, vars, out:[...out], branches:snap(),
        note:`Перевірка №${k+1}: ${s} >= ${[90,75,60][k]} → ${d.cond?"True":"False"}. Попередній if на це ніяк не впливає.`});
      if(d.cond){
        states[k]="taken"; out.push(d.msg);
        frames.push({line:2+k*2, vars, out:[...out], branches:snap(), kind:"inner",
          note:`Друкуємо «${d.msg}». Але програма піде перевіряти наступний if далі.`});
      } else states[k]="false";
    });
    frames.push({line:0, vars, out:[...out], branches:snap(), kind:"end",
      note: out.length>1
        ? `Ось і проблема: надруковано ${out.length} рядки замість одного. Оцінка має бути одна.`
        : `Тут результат збігся з ланцюжком, але лише випадково — спробуй бал 95.`});
    return {code, frames};
  },
  extra:(f)=>ladder(f.branches)
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
      {label:"if age >= 16", state:st.o},
      {label:"    if money >= 150", state:st.i1},
      {label:"    else", state:st.i2},
      {label:"else", state:st.e}
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
  extra:(f)=>ladder(f.branches)
});

/* ================= hero ================= */
(function(){
  const box = document.getElementById("cond-heroLadder");
  const val = document.getElementById("cond-heroValue");
  const line = document.getElementById("cond-heroLine");
  const btn = document.getElementById("cond-heroBtn");
  const defs=[{label:"if score >= 90", n:90},{label:"elif score >= 75", n:75},{label:"elif score >= 60", n:60}];
  const score = 82;
  let t=null;
  function draw(states){
    box.innerHTML = defs.map((d,k)=>{
      const s=states[k];
      const v = s==="false"?"False" : s==="taken"?"True" : s==="check"?"перевіряємо…" : s==="skipped"?"не перевіряється":"";
      return `<div class="br ${s}"><span>${d.label}</span><span class="verdict">${v}</span></div>`;
    }).join("");
  }
  function run(){
    clearInterval(t);
    val.textContent = `score = ${score}`;
    const states=["pending","pending","pending"];
    draw(states); line.textContent = "Python читає умови згори вниз";
    let k=0, phase=0;
    t=setInterval(()=>{
      if(k>=defs.length){ clearInterval(t); return; }
      if(phase===0){ states[k]="check"; line.textContent=`${score} >= ${defs[k].n} ?`; draw(states); phase=1; return; }
      const ok = score>=defs[k].n;
      if(ok){
        states[k]="taken";
        for(let m=k+1;m<defs.length;m++) states[m]="skipped";
        line.innerHTML = `перша істинна умова — решта <b>пропускається</b>`;
        draw(states); clearInterval(t); return;
      }
      states[k]="false"; line.textContent = `${score} >= ${defs[k].n} → False, йдемо далі`;
      draw(states); k++; phase=0;
    }, 900);
  }
  btn.onclick = run;
  draw(["pending","pending","pending"]);
  let auto = null;
  /* запуск і зупинку веде роутер — див. registerAnim */
  window.registerAnim({
    el: btn,
    stop(){ clearInterval(t); t=null; clearTimeout(auto); auto=null; },
    start(){ clearTimeout(auto); auto = setTimeout(run, 700); }
  });
})();

};
