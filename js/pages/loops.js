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
    frames.push({line:0, vars:[], out:[], note:seq.length
      ? `range дає числа: ${seq.join(", ")}. Цикл візьме їх по черзі.`
      : `range порожній — тіло циклу не виконається жодного разу.`});
    seq.forEach(v=>{
      frames.push({line:0, vars:[{name:"i",val:v,cls:"i"}], out:[...out], note:`Змінна i отримує значення ${v}. Заходимо в тіло циклу.`});
      out.push(String(v));
      frames.push({line:1, vars:[{name:"i",val:v,cls:"i"}], out:[...out], note:`print(i) друкує ${v}. Тіло закінчилось — вертаємось нагору по наступне число.`});
    });
    frames.push({line:0, vars:[], out:[...out], kind:"end",
      note:`Числа закінчились. Цикл завершено, тіло виконалось ${seq.length} раз(ів).`});
    return {code, frames};
  }
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
    frames.push({line:0, vars:[{name:"n",val:n,cls:"n"}], out:[], note:`Заводимо змінну n = 10.`});
    let guard=0;
    while(guard++<20){
      const ok = n>0;
      frames.push({line:1, vars:[{name:"n",val:n,cls:"n"}], out:[...out], kind: ok?"":"end",
        note:`Перевірка умови: ${n} > 0 → ${ok?"True, заходимо в тіло":"False, цикл зупиняється"}.`});
      if(!ok) break;
      out.push(String(n));
      frames.push({line:2, vars:[{name:"n",val:n,cls:"n"}], out:[...out], note:`Друкуємо n.`});
      const prev=n; n-=3;
      frames.push({line:3, vars:[{name:"n",val:n,cls:"n"}], out:[...out],
        note:`Змінюємо n: ${prev} − 3 = ${n}. Саме цей рядок рятує нас від нескінченного циклу. Вертаємось до перевірки.`});
    }
    return {code, frames};
  }
});

/* ================= 4. break / continue ================= */
createPlayer(document.getElementById("loops-w-flow"), {
  config:`<span class="seg">
      <button data-mode="break" aria-pressed="true">break</button>
      <button data-mode="continue" aria-pressed="false">continue</button>
    </span>`,
  readCfg:(r)=>({mode:modeCfg(r)}),
  build:({mode})=>{
    const out=[], frames=[];
    if(mode==="break"){
      const code=[`for i in range(10):`,`    if i == 5:`,`        break`,`    print(i)`];
      for(let i=0;i<10;i++){
        frames.push({line:0, vars:[{name:"i",val:i,cls:"i"}], out:[...out], note:`i = ${i}`});
        const hit = i===5;
        frames.push({line:1, vars:[{name:"i",val:i,cls:"i"}], out:[...out],
          note:`Перевірка: ${i} == 5 → ${hit?"True":"False"}.`});
        if(hit){
          frames.push({line:2, vars:[{name:"i",val:i,cls:"i"}], out:[...out], kind:"end",
            note:`break — вихід із циклу негайно. Числа 5, 6, 7, 8, 9 навіть не розглядатимуться.`});
          break;
        }
        out.push(String(i));
        frames.push({line:3, vars:[{name:"i",val:i,cls:"i"}], out:[...out], note:`Друкуємо ${i}.`});
      }
      return {code, frames};
    }
    const code=[`for i in range(6):`,`    if i % 2 == 0:`,`        continue`,`    print(i)`];
    for(let i=0;i<6;i++){
      frames.push({line:0, vars:[{name:"i",val:i,cls:"i"}], out:[...out], note:`i = ${i}`});
      const even = i%2===0;
      frames.push({line:1, vars:[{name:"i",val:i,cls:"i"}], out:[...out],
        note:`Перевірка: ${i} парне? → ${even?"True":"False"}.`});
      if(even){
        frames.push({line:2, vars:[{name:"i",val:i,cls:"i"}], out:[...out],
          note:`continue — решту тіла пропускаємо, одразу беремо наступне i. Цикл не переривається.`});
        continue;
      }
      out.push(String(i));
      frames.push({line:3, vars:[{name:"i",val:i,cls:"i"}], out:[...out], note:`Друкуємо ${i}.`});
    }
    frames.push({line:0, vars:[], out:[...out], kind:"end", note:`Цикл завершено: надруковані лише непарні числа.`});
    return {code, frames};
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
    const snap = (i,j)=>({a, rows, i, j, done:new Set(grid.done), mode});

    frames.push({line:0, vars:[], out:[], grid:snap(-1,-1),
      note:`Старт. Зовнішній цикл дасть ${a} кроків, і на кожному з них внутрішній пройде свій шлях повністю.`});

    R(a).forEach(ri=>{
      const iVal = mode==="mult" ? ri+1 : ri;
      const inner = rows[ri];
      frames.push({line:0, vars:[vI(iVal)], out:[...out], grid:snap(ri,-1),
        note:`Зовнішній цикл: i = ${iVal}. Це початок нового рядка — заходимо у внутрішній цикл.`});
      if(inner===0){
        frames.push({line:1, vars:[vI(iVal)], out:[...out], grid:snap(ri,-1), kind:"inner",
          note:`Внутрішній діапазон порожній — тіло не виконається.`});
      }
      R(inner).forEach(rj=>{
        const jVal = mode==="mult" ? rj+1 : rj;
        frames.push({line:1, vars:[vI(iVal), vJ(jVal)], out:[...out], grid:snap(ri,rj), kind:"inner",
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
          note: mode==="tri"
            ? `Друкуємо зірочку без переходу на новий рядок (end=""). Виконань тіла: ${total}.`
            : `Тіло виконано з парою i = ${iVal}, j = ${jVal}. Всього виконань: ${total}.`});
      });
      if(mode==="tri"){
        out.push("");
        frames.push({line:3, vars:[vI(iVal)], out:[...out], grid:snap(ri,-1),
          note:`Внутрішній цикл закінчився. print() без аргументів переводить рядок — і це вже рівень зовнішнього циклу.`});
      } else {
        frames.push({line:0, vars:[vI(iVal)], out:[...out], grid:snap(ri,-1),
          note:`Внутрішній цикл вичерпався. Тільки тепер зовнішній робить наступний крок.`});
      }
    });

    frames.push({line:0, vars:[], out:[...out], grid:snap(-1,-1), kind:"end",
      note: mode==="tri"
        ? `Готово. Довжина рядка залежала від i, тому вийшли сходинки.`
        : `Готово. Тіло виконалось ${total} разів: ${a} × ${b}.`});
    if(mode==="tri" && out[out.length-1]==="") out.pop();
    return {code, frames};
  },
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
    return html + `</div>`;
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
