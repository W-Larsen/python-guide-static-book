"use strict";
window.PageInit["set"] = function(){
const K = window.CollKit;
const { esc, createPlayer, numCfg, modeCfg, listStr, setStr, cells, row, selems, setrow, legendHtml } = K;
const $id = (s) => document.getElementById(s);

/* ================= 1. множина без повторів ================= */
createPlayer($id("set-w-build"), {
  build:()=>{
    const src = ["к", "о", "д", "о", "к"];
    const code = [
      `letters = ["к", "о", "д", "о", "к"]`,
      `unique = set()`,
      `for c in letters:`,
      `    unique.add(c)`,
      `print(unique)`,
      `print(len(unique))`
    ];
    const cur = [], frames = [], out = [];
    frames.push({line:0, vars:[], out:[], items:src, k:-1, set:[],
      note:`У списку п'ять елементів, але різних серед них лише три.`});
    frames.push({line:1, vars:[{name:"unique", val:"set()", cls:"j"}], out:[], items:src, k:-1, set:[],
      note:`Порожня множина створюється через set(). Фігурні дужки тут не годяться — {} це словник.`});
    src.forEach((c, k)=>{
      const dup = cur.includes(c);
      frames.push({line:2, vars:[{name:"c", val:`"${c}"`, cls:"i"}, {name:"unique", val:setStr(cur), cls:"j"}],
        out:[], items:src, k, set:[...cur],
        note:`Крок ${k + 1}: беремо "${c}" зі списку.`});
      if(!dup) cur.push(c);
      frames.push({line:3, vars:[{name:"c", val:`"${c}"`, cls:"i"}, {name:"unique", val:setStr(cur), cls:"j"}],
        out:[], items:src, k, set:[...cur], dup,
        note: dup
          ? `"${c}" у множині вже є — add() мовчки нічого не робить. Ні помилки, ні дубліката.`
          : `"${c}" ще не було — елемент додається.`});
    });
    out.push(setStr(cur));
    frames.push({line:4, vars:[{name:"unique", val:setStr(cur), cls:"j"}], out:[...out], items:src, k:src.length, set:[...cur],
      note:`У множині лишились тільки різні елементи. Порядок може відрізнятись від того, у якому їх додавали.`});
    out.push(String(cur.length));
    frames.push({line:5, vars:[{name:"unique", val:setStr(cur), cls:"j"}], out:[...out], items:src, k:src.length, set:[...cur], kind:"end",
      note:`Було 5 елементів, лишилось ${cur.length}.`});
    return {code, frames};
  },
  extra:(f)=>{
    const st = {}; if(f.k >= 0 && f.k < f.items.length) st[f.k] = f.dup ? "dup" : "now";
    for(let i = 0; i < f.k; i++) if(st[i] === undefined) st[i] = "done";
    return setrow("letters", selems(f.items, {state:st})) +
           setrow("unique", selems(f.set, {all:"in"}));
  },
  legend: legendHtml([["p","поточний елемент"],["r","повтор — ігнорується"],["g","у множині"]])
});

/* ================= 2. операції над множинами ================= */
const A = ["Оля", "Іван", "Ніна"], B = ["Іван", "Петро"];

function opBuild(mode, useMethods){
  const op = mode === "or" ? "|" : mode === "and" ? "&" : mode === "sub" ? "-" : "^";
  const meth = mode === "or" ? "union" : mode === "and" ? "intersection"
    : mode === "sub" ? "difference" : "symmetric_difference";
  const expr = useMethods ? `math.${meth}(art)` : `math ${op} art`;
  const code = [
    `math = {"Оля", "Іван", "Ніна"}`,
    `art = {"Іван", "Петро"}`,
    `print(${expr})`
  ];
  const all = [...A, ...B.filter(x=>!A.includes(x))];
  const res = [], frames = [], out = [];
  const title = mode === "or" ? `Об'єднання: хто ходить хоча б на один гурток.`
    : mode === "and" ? `Переріз: хто ходить одразу на обидва.`
    : mode === "sub" ? `Різниця: хто ходить на математику, але не на малювання.`
    : `Симетрична різниця: хто ходить рівно на один гурток — байдуже, який саме.`;

  frames.push({line:0, vars:[{name:"math", val:setStr(A), cls:"i"}], out:[], A, B, res:[], now:null,
    note:`Три людини ходять на математику.`});
  frames.push({line:1, vars:[{name:"math", val:setStr(A), cls:"i"}, {name:"art", val:setStr(B), cls:"j"}],
    out:[], A, B, res:[], now:null, note:`Двоє ходять на малювання. Іван — в обох списках.`});
  if(useMethods) frames.push({line:2, vars:[{name:"math", val:setStr(A), cls:"i"}, {name:"art", val:setStr(B), cls:"j"}],
    out:[], A, B, res:[], now:null,
    note:`Метод .${meth}() робить те саме, що оператор ${op}. Різниця одна: методу можна дати навіть список — ${meth}(["Петро"]) спрацює, а ось math ${op} ["Петро"] впаде з помилкою.`});

  all.forEach(x=>{
    const inA = A.includes(x), inB = B.includes(x);
    const take = mode === "or" ? true : mode === "and" ? (inA && inB)
      : mode === "sub" ? (inA && !inB) : (inA !== inB);
    if(take) res.push(x);
    frames.push({line:2, vars:[{name:"math", val:setStr(A), cls:"i"}, {name:"art", val:setStr(B), cls:"j"}],
      out:[], A, B, res:[...res], now:x,
      note:`${x}: ${inA ? "є в math" : "немає в math"}, ${inB ? "є в art" : "немає в art"} → ${take ? "потрапляє в результат" : "у результат не йде"}.`});
  });

  out.push(setStr(res));
  frames.push({line:2, vars:[{name:"math", val:setStr(A), cls:"i"}, {name:"art", val:setStr(B), cls:"j"}],
    out:[...out], A, B, res:[...res], now:null, kind:"end",
    note:`${title} Разом — ${res.length} ${res.length === 1 ? "людина" : "людей"}.`});
  return {code, frames};
}

const opExtra = (f)=>{
  const line = (label, arr) => setrow(label, arr.map(x=>
    `<span class="selem ${x === f.now ? "now" : ""}">${esc(x)}</span>`).join(""));
  const res = (f.res || []).length
    ? f.res.map(x=>`<span class="selem in">${esc(x)}</span>`).join("")
    : `<span class="kv-empty">поки порожньо</span>`;
  return line("math", f.A || []) + line("art", f.B || []) + setrow("=", res);
};

createPlayer($id("set-w-ops"), {
  config:`<span class="seg">
      <button data-mode="or" aria-pressed="true">math | art</button>
      <button data-mode="and" aria-pressed="false">math &amp; art</button>
      <button data-mode="sub" aria-pressed="false">math - art</button>
    </span>`,
  readCfg:(r)=>({mode:modeCfg(r)}),
  build:({mode})=>opBuild(mode, false),
  extra:opExtra
});

/* ================= 3. методи множин ================= */
createPlayer($id("set-w-methods"), {
  config:`<span class="seg">
      <button data-mode="or" aria-pressed="true">.union()</button>
      <button data-mode="and" aria-pressed="false">.intersection()</button>
      <button data-mode="sub" aria-pressed="false">.difference()</button>
      <button data-mode="sym" aria-pressed="false">.symmetric_difference()</button>
    </span>`,
  readCfg:(r)=>({mode:modeCfg(r)}),
  build:({mode})=>opBuild(mode, true),
  extra:opExtra
});

/* ================= 4. підмножини ================= */
createPlayer($id("set-w-sub"), {
  config:`<span class="seg">
      <button data-mode="sub" aria-pressed="true">a.issubset(b)</button>
      <button data-mode="sup" aria-pressed="false">a.issuperset(b)</button>
      <button data-mode="dis" aria-pressed="false">a.isdisjoint(b)</button>
    </span>`,
  readCfg:(r)=>({mode:modeCfg(r)}),
  build:({mode})=>{
    const a = ["Оля", "Іван"], b = ["Оля", "Іван", "Ніна"];
    const expr = mode === "sub" ? `a.issubset(b)` : mode === "sup" ? `a.issuperset(b)` : `a.isdisjoint(b)`;
    const alt = mode === "sub" ? `a <= b` : mode === "sup" ? `a >= b` : `not (a & b)`;
    const code = [`a = {"Оля", "Іван"}`, `b = {"Оля", "Іван", "Ніна"}`, `print(${expr})   # те саме, що ${alt}`];
    const scan = mode === "sup" ? b : a;      /* кого перевіряємо */
    const inside = mode === "sup" ? a : b;    /* де шукаємо */
    const frames = [], out = [], marks = [];
    const V = [{name:"a", val:setStr(a), cls:"i"}, {name:"b", val:setStr(b), cls:"j"}];

    frames.push({line:0, a, b, marks:[], cur:null, res:null, mode, vars:[V[0]], out:[],
      note:`Дві множини. Питання завжди про те, як вони вкладені одна в одну.`});
    frames.push({line:1, a, b, marks:[], cur:null, res:null, mode, vars:V, out:[],
      note: mode === "sub" ? `issubset питає: «чи КОЖЕН елемент a є всередині b?»`
        : mode === "sup" ? `issuperset питає: «чи КОЖЕН елемент b є всередині a?»`
        : `isdisjoint питає: «чи немає в них НІЧОГО спільного?»`});

    let res = mode === "dis" ? true : true, stopped = -1;
    for(let k = 0; k < scan.length; k++){
      const there = inside.includes(scan[k]);
      const bad = mode === "dis" ? there : !there;
      marks.push(there);
      frames.push({line:2, a, b, marks:[...marks], cur:scan[k], res: bad ? false : null, mode, vars:V, out:[],
        note:`"${scan[k]}" ${there ? "є" : "немає"} в ${mode === "sup" ? "a" : "b"} → ${
          bad ? (mode === "dis" ? `спільний елемент знайдено, відповідь уже False` : `цього досить, відповідь уже False`)
              : `поки все сходиться, перевіряємо далі`}.`});
      if(bad){ res = false; stopped = k; break; }
    }

    out.push(res ? "True" : "False");
    frames.push({line:2, a, b, marks:[...marks], cur:null, res, mode, kind:"end", vars:V, out:[...out],
      note: res
        ? (mode === "sub" ? `Усі елементи a знайшлись у b — a справді підмножина b.`
          : mode === "sup" ? `Кожен елемент b знайшовся в a — a справді надмножина b.`
          : `Спільного немає жодного — множини не перетинаються.`)
        : (mode === "dis" ? `Спільний елемент є, тому isdisjoint дає False.`
          : `Знайшовся елемент, якого немає з іншого боку — відповідь False.${stopped >= 0 && stopped < scan.length - 1 ? ` Решту Python уже не перевіряв.` : ""}`)});
    return {code, frames};
  },
  extra:(f)=>{
    const mark = (arr, isScan) => arr.map(x=>{
      let cls = "";
      if(x === f.cur) cls = "now";
      else if(isScan){
        const i = arr.indexOf(x);
        if(i < f.marks.length) cls = f.marks[i] ? "in" : "dup";
      }
      return `<span class="selem ${cls}">${esc(x)}</span>`;
    }).join("");
    const scanIsA = f.mode !== "sup";
    return setrow("a", mark(f.a, scanIsA)) + setrow("b", mark(f.b, !scanIsA)) +
      `<div class="accrow" style="margin-top:12px"><span class="acclab">відповідь:</span>` +
      `<span class="accbox ${f.res === null ? "wait" : (f.res ? "" : "stop")}">${f.res === null ? "поки невідомо" : (f.res ? "True" : "False")}</span></div>`;
  }
});

/* ================= 5. чому in у множині миттєвий ================= */
createPlayer($id("set-w-speed"), {
  config:`<label>шукаємо <input type="number" data-cfg id="set-q" value="65" step="1"></label>
    <span class="seg">
      <button data-mode="list" aria-pressed="true">у списку</button>
      <button data-mode="set" aria-pressed="false">у множині</button>
    </span>`,
  readCfg:(r)=>({
    target: numCfg(r,"#set-q",65),
    mode: modeCfg(r)
  }),
  build:({target, mode})=>{
    const nums = [10, 21, 32, 43, 54, 65, 76, 87];
    const SLOTS = 8;
    const isList = mode === "list";
    const code = isList
      ? [`nums = [10, 21, 32, 43, 54, 65, 76, 87]`, `print(${target} in nums)`]
      : [`s = {10, 21, 32, 43, 54, 65, 76, 87}`, `print(${target} in s)`];
    const frames = [], out = [];
    const V = [{name: isList ? "nums" : "s", val: isList ? listStr(nums) : setStr(nums), cls:"i"}];

    if(isList){
      frames.push({line:0, mode, nums, k:-1, steps:0, res:null, slot:-1, vars:V, out:[],
        note:`Вісім чисел у списку. Список не знає, де що лежить, — він тільки вміє йти по черзі.`});
      let found = -1;
      for(let k = 0; k < nums.length; k++){
        const hit = nums[k] === target;
        frames.push({line:1, mode, nums, k, steps:k + 1, res: hit ? true : null, slot:-1, vars:V, out:[],
          note:`Крок ${k + 1}: порівнюємо ${nums[k]} з ${target} → ${hit ? "збіг, можна зупинятись" : "не те, йдемо далі"}.`});
        if(hit){ found = k; break; }
      }
      const ok = found >= 0;
      out.push(ok ? "True" : "False");
      frames.push({line:1, mode, nums, k: ok ? found : nums.length, steps: ok ? found + 1 : nums.length, res:ok, slot:-1, kind:"end", vars:V, out:[...out],
        note: ok
          ? `Знайшли за ${found + 1} ${found === 0 ? "крок" : "кроки"}. Але якби ${target} лежало в кінці — довелось би пройти всі вісім. У списку на мільйон елементів це мільйон порівнянь.`
          : `Числа немає — і щоб це стверджувати, довелось перевірити ВСІ ${nums.length} елементів. Саме тому «x in список» повільний.`});
      return {code, frames};
    }

    const table = new Array(SLOTS).fill(null);
    nums.forEach(n=>{ table[n % SLOTS] = n; });
    const aim = ((target % SLOTS) + SLOTS) % SLOTS;
    const hitVal = table[aim];
    const ok = hitVal === target;

    frames.push({line:0, mode, table, aim:-1, steps:0, res:null, vars:V, out:[],
      note:`Ті самі вісім чисел, але множина одразу розклала їх по комірках: номер комірки вона порахувала з самого значення.`});
    frames.push({line:1, mode, table, aim:-1, steps:0, res:null, vars:V, out:[],
      note:`Замість перебору множина рахує хеш числа ${target} — і одразу знає, у якій комірці воно мало б лежати.`});
    frames.push({line:1, mode, table, aim, steps:1, res:null, vars:V, out:[],
      note:`Хеш каже: комірка №${aim}. Стрибаємо туди напряму — це один крок, скільки б елементів у множині не було.`});
    out.push(ok ? "True" : "False");
    frames.push({line:1, mode, table, aim, steps:1, res:ok, kind:"end", vars:V, out:[...out],
      note: ok
        ? `У комірці №${aim} справді лежить ${target} → True. Один крок замість перебору.`
        : hitVal === null
          ? `Комірка №${aim} порожня → такого числа в множині немає, False. І це теж один крок.`
          : `У комірці №${aim} лежить ${hitVal}, а не ${target} → False. Знову один крок: перевіряти решту не потрібно.`});
    return {code, frames};
  },
  extra:(f)=>{
    if(f.mode === "list"){
      const st = {};
      f.nums.forEach((v, k)=>{
        if(f.res === true && k === f.k) st[k] = "hit";
        else if(k < f.k) st[k] = "drop";
        else if(k === f.k) st[k] = "now";
        else st[k] = "dim";
      });
      if(f.k < 0) f.nums.forEach((v, k)=>{ st[k] = ""; });
      return row("nums", cells(f.nums, {state:st, noIndex:true}), "i") +
        `<div class="accrow"><span class="acclab">кроків:</span><span class="steps"><b>${f.steps}</b> порівнянь</span></div>`;
    }
    const slots = f.table.map((v, k)=>{
      const cls = k === f.aim ? (f.res === true ? "hit" : "aim") : (v === null ? "" : "full");
      return `<div class="cellw"><div class="hashslot ${cls}">${v === null ? "—" : v}</div><div class="ix">${k}</div></div>`;
    }).join("");
    return `<div class="vizrow"><span class="vizlab i">комірки</span><div class="lst">${slots}</div></div>` +
      `<div class="accrow"><span class="acclab">кроків:</span><span class="steps"><b>${f.steps}</b> — і так завжди</span></div>`;
  },
  legend: legendHtml([["p","куди дивимось"],["g","знайдено"],["r","уже перевірено даремно"]])
});

/* ================= 6. прибирання повторів ================= */
createPlayer($id("set-w-dedup"), {
  config:`<span class="seg">
      <button data-mode="set" aria-pressed="true">set(names)</button>
      <button data-mode="sorted" aria-pressed="false">sorted(set(names))</button>
      <button data-mode="keys" aria-pressed="false">dict.fromkeys(names)</button>
    </span>`,
  readCfg:(r)=>({mode:modeCfg(r)}),
  build:({mode})=>{
    const src = ["Оля", "Іван", "Оля", "Ніна", "Іван"];
    const first = `names = ["Оля", "Іван", "Оля", "Ніна", "Іван"]`;
    const code = mode === "set" ? [first, `res = list(set(names))`, `print(res)`]
      : mode === "sorted" ? [first, `res = sorted(set(names))`, `print(res)`]
      : [first, `res = list(dict.fromkeys(names))`, `print(res)`];
    const frames = [], out = [], got = [];
    const V = [{name:"names", val:listStr(src), cls:"i"}];

    frames.push({line:0, src, k:-1, got:[], mode, vars:V, out:[],
      note:`П'ять записів, різних імен серед них три.`});
    frames.push({line:1, src, k:-1, got:[], mode, vars:V, out:[],
      note: mode === "keys"
        ? `dict.fromkeys робить словник, де імена стають ключами. Ключі унікальні — повтори зникнуть; а порядок додавання словник зберігає.`
        : `set() проходить список і лишає кожне значення один раз.`});

    src.forEach((n, k)=>{
      const dup = got.includes(n);
      if(!dup) got.push(n);
      frames.push({line:1, src, k, got:[...got], mode, dup, vars:V, out:[],
        note: dup ? `"${n}" уже є — другого разу не додається.` : `"${n}" зустрівся вперше — потрапляє в результат.`});
    });

    let fin = [...got];
    if(mode === "sorted"){
      fin = [...got].sort((x, y)=>x.localeCompare(y, "uk"));
      frames.push({line:1, src, k:src.length, got:fin, mode, vars:V, out:[],
        note:`sorted() бере готову множину й вибудовує елементи за алфавітом — саме тому порядок тут передбачуваний.`});
    }
    out.push(listStr(fin));
    frames.push({line:2, src, k:src.length, got:fin, mode, kind:"end",
      vars:V.concat([{name:"res", val:listStr(fin), cls:"j"}]), out:[...out],
      note: mode === "set"
        ? `Повтори зникли — але порядок тут показаний умовно: справжня множина порядку не гарантує, і при кожному запуску він може бути іншим.`
        : mode === "sorted"
          ? `Без повторів і за алфавітом — найпередбачуваніший варіант.`
          : `Без повторів і в порядку першої появи. Саме цей спосіб беруть, коли порядок важливий.`});
    return {code, frames};
  },
  extra:(f)=>{
    const st = {}; if(f.k >= 0 && f.k < f.src.length) st[f.k] = f.dup ? "dup" : "now";
    for(let i = 0; i < f.k; i++) if(st[i] === undefined) st[i] = "done";
    return setrow("names", selems(f.src, {state:st})) +
           setrow("res", selems(f.got, {all:"in"}));
  }
});

/* ================= hero ================= */
(function(){
  const box = $id("set-heroBox");
  const line = $id("set-heroLine");
  const btn = $id("set-heroBtn");
  if(!box) return;
  const src = ["к", "о", "д", "о", "к"];
  let t = null;
  function draw(st, res){
    box.innerHTML = setrow("список", selems(src, {state:st})) +
                    setrow("set()", selems(res, {all:"in"}));
  }
  function run(){
    clearInterval(t);
    const res = [];
    draw({}, res);
    line.innerHTML = `у списку п'ять елементів`;
    let k = 0;
    t = setInterval(()=>{
      if(k >= src.length){
        clearInterval(t);
        line.innerHTML = `у множині лишилось <b>${res.length}</b> — кожне значення рівно раз`;
        return;
      }
      const st = {}, dup = res.includes(src[k]);
      for(let i = 0; i < k; i++) st[i] = "done";
      st[k] = dup ? "dup" : "now";
      if(!dup) res.push(src[k]);
      draw(st, res);
      line.innerHTML = dup
        ? `"${src[k]}" уже є — <b>повтор ігнорується</b>`
        : `"${src[k]}" додається в множину`;
      k++;
    }, 1000);
  }
  btn.onclick = run;
  draw({}, []);
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
