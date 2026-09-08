"use strict";
window.PageInit["func"] = function(){

const CK  = window.CollKit;
const esc = CK.esc;
const R   = (n) => Array.from({length:n}, (_,k)=>k);

/* Підсвітка: до набору CollKit додано слова, які живуть лише в цій темі
   (def уже є, а try / except / global — ні). */
const KW = /\b(def|return|if|elif|else|for|in|while|not|and|or|True|False|None|try|except|finally|raise|global|pass|import|from|is)\b/g;
const FN = /\b(print|len|int|str|float|input|range|round|abs|type|sorted|sum|ZeroDivisionError|ValueError|NameError|TypeError|UnboundLocalError)\b/g;

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

const createPlayer = CK.makePlayer({ hl, tick:660 });
const { numCfg, modeCfg } = CK;

/* Текст із поля налаштувань. Лапки вирізаємо: значення підставляється
   всередину рядкового літерала в коді, і чужа лапка розірвала б його. */
function txtCfg(root, sel, fallback, max){
  const el = root.querySelector(sel);
  if(!el) return fallback;
  const v = String(el.value).replace(/["\\]/g, "").trim().slice(0, max || 12);
  return v || fallback;
}

/* ================= спільні блоки візуалізації ================= */

/* чорна скринька: аргумент → функція → результат */
function boxViz(b){
  b = b || {};
  const arg = b.arg == null ? "?" : String(b.arg);
  const ret = b.ret == null ? "?" : String(b.ret);
  return `<div class="fnhero">` +
    `<span class="fnpill arg${b.arg == null ? "" : " on"}">${esc(arg)}</span>` +
    `<span class="fnwire${b.in ? " on" : ""}"></span>` +
    `<span class="fnbox${b.work ? " work" : ""}">${esc(b.name || "square(n)")}` +
      `<b>${esc(b.body || "")}</b></span>` +
    `<span class="fnwire${b.out ? " back" : ""}"></span>` +
    `<span class="fnpill ret${b.ret == null ? "" : " on"}">${esc(ret)}</span>` +
  `</div>`;
}

/* дві панелі: глобальна область і локальна область функції */
function scopeViz(list){
  return `<div class="scopes">` + (list || []).map(s =>
    `<div class="scope${s.local ? " local" : ""}${s.gone ? " gone" : ""}">` +
      `<div class="scope-t">${esc(s.t)}</div>` +
      `<div class="svars">` + ((s.vars && s.vars.length)
        ? s.vars.map(v => `<span class="svar ${v.cls || ""}">${esc(v.name)} = ${esc(v.val)}</span>`).join("")
        : `<span class="svar empty">${esc(s.empty || "порожньо")}</span>`) +
      `</div></div>`).join("") + `</div>`;
}

/* коробочки параметрів: значення зверху, ім'я параметра знизу */
function paramViz(list){
  if(!list || !list.length)
    return `<div class="lst"><div class="cellw"><div class="cell ghost">немає</div>` +
           `<div class="ix">параметрів</div></div></div>`;
  return `<div class="lst">` + list.map(p =>
    `<div class="cellw${p.cls === "now" ? " on" : ""}"><div class="cell ${p.cls || ""}">${esc(p.val)}</div>` +
    `<div class="ix">${esc(p.name)}</div></div>`).join("") + `</div>`;
}

/* ================= 1. def проти виклику ================= */
createPlayer(document.getElementById("func-w-def"), {
  config:`<label>викликів <input type="number" data-cfg id="func-df-n" value="2" min="1" max="4"></label>`,
  readCfg:(r)=>({ n: numCfg(r, "#func-df-n", 2) }),
  build:({n})=>{
    const code = [
      `def hello():`,
      `    print("Доброго ранку!")`,
      `    print("Гарного дня!")`,
      ``
    ].concat(R(n).map(()=>`hello()`));
    const callLine = (k) => 4 + k;
    const out = [], frames = [];

    frames.push({line:0, out:[], def:false,
      note:`Виконання на рядку def. Python зараз лише прочитає опис функції — і все.`});
    frames.push({line:0, out:[], def:true,
      note:`Функція збережена в пам'яті під іменем hello. Зверни увагу: консоль порожня, жоден рядок тіла не виконався.`});

    R(n).forEach(k=>{
      frames.push({line:callLine(k), out:[...out], def:true, run:true,
        note:`Виклик №${k+1}: hello(). Ось тепер виконання стрибає вгору, у тіло функції.`});
      out.push("Доброго ранку!");
      frames.push({line:1, out:[...out], def:true, run:true, note:`Перший рядок тіла.`});
      out.push("Гарного дня!");
      frames.push({line:2, out:[...out], def:true, run:true,
        note:`Другий рядок тіла. Тіло закінчилось.`});
      frames.push({line:callLine(k), out:[...out], def:true,
        note:`Функція завершилась — повертаємось у той самий рядок, звідки її викликали.`});
    });

    frames.push({line:callLine(n-1), out:[...out], def:true, kind:"end",
      note:`Готово. Тіло описано один раз, а спрацювало ${n} раз(ів) — це і є вся суть функції.`});
    return {code, frames};
  },
  extra:(f)=>`<div class="fnmem">` +
    `<div class="fnobj${f.def ? (f.run ? " run" : "") : " ghost"}">` +
      `<span class="nm">hello()</span>print("Доброго ранку!")<br>print("Гарного дня!")</div>` +
    `<div class="stackhint">${f.def ? (f.run ? "виконується просто зараз" : "лежить у пам'яті, чекає на виклик")
                                    : "ще не існує"}</div></div>`
});

/* ================= 2. аргументи й параметри ================= */
createPlayer(document.getElementById("func-w-args"), {
  config:`<span class="seg">
      <button data-mode="one" aria-pressed="true">Один параметр</button>
      <button data-mode="two" aria-pressed="false">Два параметри</button>
    </span>
    <label>ім'я <input type="text" data-cfg id="func-ag-name" value="Оля"></label>`,
  readCfg:(r)=>({ mode:modeCfg(r), name:txtCfg(r, "#func-ag-name", "Оля") }),
  build:({mode, name})=>{
    const two = mode === "two";
    const calls = two
      ? [[name, "Привіт"], ["Іван", "Вітаю"]]
      : [[name], ["Іван"]];
    const pnames = two ? ["name", "greeting"] : ["name"];
    const code = two
      ? [`def greet(name, greeting):`, `    print(greeting, name)`, ``,
         `greet("${name}", "Привіт")`, `greet("Іван", "Вітаю")`]
      : [`def greet(name):`, `    print("Привіт,", name)`, ``,
         `greet("${name}")`, `greet("Іван")`];
    const out = [], frames = [];

    frames.push({line:0, out:[], args:[], params:[],
      note:`У дужках при оголошенні стоять параметри: ${pnames.map(p=>`«${p}»`).join(" і ")}. Це поки що просто імена — значень у них немає.`});

    calls.forEach((a, k)=>{
      const line = 3 + k;
      frames.push({line, out:[...out], args:a, argSt:Object.fromEntries(a.map((_,i)=>[i,"now"])), params:[],
        note:`Виклик greet(${a.map(x=>`"${x}"`).join(", ")}). Значення в дужках — це аргументи.`});
      frames.push({line:0, out:[...out], args:a, argSt:{},
        params:pnames.map((p,i)=>({name:p, val:`"${a[i]}"`, cls:"now"})),
        vars:pnames.map((p,i)=>({name:p, val:`"${a[i]}"`, cls:"i"})),
        note:`Аргументи прив'язались до параметрів по порядку — ніби всередині виконалось ${pnames.map((p,i)=>`${p} = "${a[i]}"`).join(", ")}.`});
      out.push(two ? `${a[1]} ${a[0]}` : `Привіт, ${a[0]}`);
      frames.push({line:1, out:[...out], args:a, argSt:{},
        params:pnames.map((p,i)=>({name:p, val:`"${a[i]}"`, cls:""})),
        vars:pnames.map((p,i)=>({name:p, val:`"${a[i]}"`, cls:"i"})),
        note:`Тіло працює зі значеннями, які лежать у параметрах.`});
      frames.push({line, out:[...out], args:[], params:[],
        note:`Функція завершилась — параметри ${pnames.join(", ")} зникли разом із нею. Наступний виклик створить їх заново.`});
    });

    frames.push({line:4, out:[...out], args:[], params:[], kind:"end",
      note:`Одне тіло — різні дані. Саме заради цього функції й дають параметри.`});
    return {code, frames};
  },
  extra:(f)=>
    CK.row("аргументи", CK.cells(f.args || [], {noIndex:true, state:f.argSt || {}}), "i") +
    CK.row("параметри", paramViz(f.params))
});

/* ================= 3. return і None ================= */
createPlayer(document.getElementById("func-w-return"), {
  config:`<span class="seg">
      <button data-mode="ret" aria-pressed="true">із return</button>
      <button data-mode="pr" aria-pressed="false">із print</button>
    </span>
    <label>n <input type="number" data-cfg id="func-rt-n" value="4" min="0" max="12"></label>`,
  readCfg:(r)=>({ mode:modeCfg(r), n:numCfg(r, "#func-rt-n", 4) }),
  build:({mode, n})=>{
    const sq = n * n, sq2 = sq * sq;
    const isRet = mode === "ret";
    const body = isRet ? `return n * n` : `print(n * n)`;
    const code = [`def square(n):`, `    ${body}`, ``,
                  `x = square(${n})`, `print("Результат:", x)`]
                 .concat(isRet ? [`print(square(x))`] : []);
    const bx = (o) => Object.assign({name:"square(n)", body}, o);
    const out = [], frames = [];

    frames.push({line:0, out:[], box:bx({}),
      note:`Функція описана. Усередині коробки — одна дія, назовні поки нічого не заходило.`});
    frames.push({line:3, out:[], box:bx({arg:n, in:true}),
      note:`Виклик square(${n}). Аргумент ${n} заходить усередину й стає значенням параметра n.`});

    if(isRet){
      frames.push({line:1, out:[], vars:[{name:"n", val:n, cls:"i"}], box:bx({arg:n, in:true, work:true}),
        note:`return ${n} * ${n} → ${sq}. Це дві дії одразу: порахувати значення й негайно вийти з функції.`});
      frames.push({line:3, out:[], vars:[{name:"x", val:sq, cls:"j"}], box:bx({arg:n, out:true, ret:sq}),
        note:`Значення ${sq} підставилось прямо на місце виклику — рядок перетворився на x = ${sq}.`});
      out.push(`Результат: ${sq}`);
      frames.push({line:4, out:[...out], vars:[{name:"x", val:sq, cls:"j"}], box:bx({arg:n, out:true, ret:sq}),
        note:`Тепер результат — звичайне число в змінній. Його можна друкувати, додавати, порівнювати.`});
      frames.push({line:5, out:[...out], vars:[{name:"x", val:sq, cls:"j"}], box:bx({arg:sq, in:true}),
        note:`І ще раз, уже від самого x: square(${sq}). Результат однієї функції спокійно стає аргументом наступної.`});
      frames.push({line:1, out:[...out], vars:[{name:"n", val:sq, cls:"i"}, {name:"x", val:sq, cls:"j"}],
        box:bx({arg:sq, in:true, work:true}),
        note:`Усередині n тепер ${sq}. Стара n не зберігалась — при кожному виклику параметр створюється заново.`});
      out.push(String(sq2));
      frames.push({line:5, out:[...out], vars:[{name:"x", val:sq, cls:"j"}], box:bx({arg:sq, out:true, ret:sq2}), kind:"end",
        note:`Повернулось ${sq2}. Ось чому return важливіший за print: тільки повернуте значення живе далі в програмі.`});
    } else {
      out.push(String(sq));
      frames.push({line:1, out:[...out], vars:[{name:"n", val:n, cls:"i"}], box:bx({arg:n, in:true, work:true}),
        note:`print(${n} * ${n}) намалював ${sq} на екрані. Але це саме малюнок — назовні нічого не віддано.`});
      frames.push({line:3, out:[...out], vars:[{name:"x", val:"None", cls:"n"}], box:bx({arg:n, out:true, ret:"None"}),
        note:`Функція дійшла до кінця без return. Python мовчки дописує return None — саме None і потрапило в x.`});
      out.push(`Результат: None`);
      frames.push({line:4, out:[...out], vars:[{name:"x", val:"None", cls:"n"}], box:bx({arg:n, out:true, ret:"None"}), kind:"end",
        note:`Число ${sq} промайнуло на екрані й зникло безслідно. У змінній лежить None — «немає значення».`});
    }
    return {code, frames};
  },
  extra:(f)=>boxViz(f.box)
});

/* ================= 4. sep і end ================= */
createPlayer(document.getElementById("func-w-kwargs"), {
  config:`<span class="seg">
      <button data-mode="sep" aria-pressed="true">sep</button>
      <button data-mode="end" aria-pressed="false">end</button>
    </span>`,
  readCfg:(r)=>({ mode:modeCfg(r) }),
  build:({mode})=>{
    const tok = (t, cls) => ({t, cls});
    const sp  = (t, nl)  => ({t, sep:true, nl:!!nl});
    const frames = [];

    if(mode === "sep"){
      const code = [`print("коти", "собаки", "миші")`,
                    `print("коти", "собаки", "миші", sep=", ")`,
                    `print("коти", "собаки", "миші", sep="")`,
                    `print("коти", "собаки", "миші", sep=" | ")`];
      const words = ["коти", "собаки", "миші"];
      const SEPS = [
        {s:" ",   show:"␣",   txt:`Типове значення sep — пробіл. Його ніхто не писав, він стоїть за замовчуванням.`},
        {s:", ",  show:",␣", txt:`sep=", " — між значеннями кома з пробілом. Зручно для переліків.`},
        {s:"",    show:"∅",   txt:`sep="" — не вставляти нічого. Слова злипаються.`},
        {s:" | ", show:"␣|␣", txt:`Роздільником може бути будь-який рядок, не тільки розділовий знак.`}
      ];
      const out = [];
      frames.push({line:0, out:[], parts:words.map(w=>tok(w)),
        note:`print може отримати кілька значень через кому. Питання лише в тому, чим він їх склеїть.`});
      SEPS.forEach((cfg, k)=>{
        const parts = [];
        words.forEach((w, i)=>{ parts.push(tok(w, "now")); if(i < words.length-1) parts.push(sp(cfg.show)); });
        out.push(words.join(cfg.s));
        frames.push({line:k, out:[...out], parts, kind: k === SEPS.length-1 ? "end" : "",
          note: cfg.txt});
      });
      return {code, frames};
    }

    const code = [`print("Привіт")`, `print("Світ")`, ``,
                  `print("Привіт", end="")`, `print("Світ")`];
    const out = [];
    frames.push({line:0, out:[], parts:[tok("Привіт"), sp("⏎", true)],
      note:`Типове значення end — символ переходу на новий рядок. Тому кожен print починає новий рядок.`});
    out.push("Привіт");
    frames.push({line:0, out:[...out], parts:[tok("Привіт", "now"), sp("⏎", true)],
      note:`Надрукували «Привіт» і невидимо перейшли на новий рядок.`});
    out.push("Світ");
    frames.push({line:1, out:[...out], parts:[tok("Світ", "now"), sp("⏎", true)],
      note:`Другий print почав із чистого рядка — саме через той невидимий перехід.`});
    out.push("Привіт");
    frames.push({line:3, out:[...out], parts:[tok("Привіт", "now"), sp("∅")],
      note:`А тепер end="". Наприкінці не додається нічого, курсор лишається в тому самому рядку.`});
    out[out.length-1] = "ПривітСвіт";
    frames.push({line:4, out:[...out], parts:[tok("Привіт"), sp("∅"), tok("Світ", "now"), sp("⏎", true)], kind:"end",
      note:`Тому наступний print дописався впритул: вийшло «ПривітСвіт» одним рядком.`});
    return {code, frames};
  },
  legend:`<span><i class="p"></i>значення</span><span><i class="y"></i>що вставляє print</span>` +
         `<span>␣ — пробіл, ∅ — порожньо, ⏎ — новий рядок</span>`,
  extra:(f)=>`<div class="joinviz">` + (f.parts || []).map(x =>
      x.sep ? `<span class="jsep${x.nl ? " nl" : ""}">${esc(x.t)}</span>`
            : `<span class="jtok ${x.cls || ""}">${esc(x.t)}</span>`).join("") + `</div>`
});

/* ================= 5. стек викликів ================= */
createPlayer(document.getElementById("func-w-stack"), {
  build:()=>{
    const code = [
      `def a():`, `    print("a: почалась")`, `    b()`, `    print("a: завершилась")`, ``,
      `def b():`, `    print("b: почалась")`, `    c()`, `    print("b: завершилась")`, ``,
      `def c():`, `    print("c: почалась")`, `    print("c: завершилась")`, ``,
      `a()`
    ];
    const base = {n:"головний код", ret:"—", base:true};
    const out = [], frames = [];
    const snap = (arr) => arr.map(x=>Object.assign({}, x));
    let st = [base];

    frames.push({line:14, out:[], stack:snap(st),
      note:`Програма стартувала. На стеку лише головний код — з нього все й почнеться.`});

    st = [base, {n:"a()", ret:"поверне в рядок 15"}];
    frames.push({line:14, out:[], stack:snap(st),
      note:`Виклик a(). Python кладе на стек новий кадр і записує в нього, куди повертатись — у рядок 15.`});
    out.push("a: почалась");
    frames.push({line:1, out:[...out], stack:snap(st), note:`Працює тіло a().`});

    st = [base, {n:"a()", ret:"рядок 15"}, {n:"b()", ret:"поверне в рядок 3"}];
    frames.push({line:2, out:[...out], stack:snap(st), kind:"inner",
      note:`a() викликає b(). Кадр a() нікуди не подівся — він просто чекає під новим кадром.`});
    out.push("b: почалась");
    frames.push({line:6, out:[...out], stack:snap(st), kind:"inner", note:`Працює тіло b().`});

    st = [base, {n:"a()", ret:"рядок 15"}, {n:"b()", ret:"рядок 3"}, {n:"c()", ret:"поверне в рядок 8"}];
    frames.push({line:7, out:[...out], stack:snap(st), kind:"inner",
      note:`b() викликає c(). Стос уже з трьох кадрів — це і є «глибина» виклику.`});
    out.push("c: почалась");
    frames.push({line:11, out:[...out], stack:snap(st), kind:"inner", note:`Працює тіло c().`});
    out.push("c: завершилась");
    frames.push({line:12, out:[...out], stack:snap(st.slice(0,3).concat([{n:"c()", ret:"зараз зникне", leaving:true}])), kind:"inner",
      note:`Останній рядок c(). Далі її кадр знімається зі стека.`});

    st = [base, {n:"a()", ret:"рядок 15"}, {n:"b()", ret:"рядок 3"}];
    frames.push({line:7, out:[...out], stack:snap(st),
      note:`c() завершилась, кадр знято. Виконання повернулось рівно туди, звідки її викликали — у рядок 8.`});
    out.push("b: завершилась");
    frames.push({line:8, out:[...out], stack:snap(st.slice(0,2).concat([{n:"b()", ret:"зараз зникне", leaving:true}])),
      note:`b() дороблює свій останній рядок.`});

    st = [base, {n:"a()", ret:"рядок 15"}];
    frames.push({line:2, out:[...out], stack:snap(st),
      note:`Кадр b() знято. Ми знову в a(), у рядку 3 — саме там, де її колись перервали.`});
    out.push("a: завершилась");
    frames.push({line:3, out:[...out], stack:snap(st.slice(0,1).concat([{n:"a()", ret:"зараз зникне", leaving:true}])),
      note:`Останній рядок a().`});

    frames.push({line:14, out:[...out], stack:[base], kind:"end",
      note:`Стек порожній — лишився тільки головний код. Порядок виводу вийшов «сходинками»: спершу вглиб, потім назад.`});
    return {code, frames};
  },
  legend:`<span><i class="p"></i>кадр, який виконується зараз</span>` +
         `<span><i class="r"></i>кадр, що зараз зникне</span>` +
         `<span>нові кадри лягають зверху</span>`,
  extra:(f)=>{
    const st = f.stack || [];
    return `<div class="stack">` + st.map((s, k) =>
      `<div class="frame${s.base ? " base" : ""}${s.leaving ? " leaving" : (k === st.length-1 && !s.base ? " top" : "")}">` +
      `<span class="fnm">${esc(s.n)}</span><span class="ret">${esc(s.ret)}</span></div>`).join("") +
      `</div><div class="stackhint">кадрів на стеку: ${st.length}</div>`;
  }
});

/* ================= 6. локальна й глобальна області ================= */
createPlayer(document.getElementById("func-w-scope"), {
  config:`<span class="seg">
      <button data-mode="local" aria-pressed="true">Локальна зникає</button>
      <button data-mode="read" aria-pressed="false">Читання глобальної</button>
      <button data-mode="same" aria-pressed="false">Однакові імена</button>
    </span>`,
  readCfg:(r)=>({ mode:modeCfg(r) }),
  build:({mode})=>{
    const G = (vars, extra) => Object.assign({t:"глобальна область", vars:vars}, extra || {});
    const L = (t, vars, extra) => Object.assign({t:t, vars:vars, local:true}, extra || {});
    const out = [], frames = [];

    if(mode === "local"){
      const code = [`def spam():`, `    eggs = "локальна"`, `    print(eggs)`, ``, `spam()`, `print(eggs)`];
      frames.push({line:4, out:[], scopes:[G([])],
        note:`Викликаємо spam(). Локальної області ще немає — вона народжується разом із викликом.`});
      frames.push({line:1, out:[], vars:[{name:"eggs", val:'"локальна"', cls:"i"}],
        scopes:[G([]), L("локальна область spam()", [{name:"eggs", val:'"локальна"', cls:"now"}])],
        note:`Присвоєння всередині функції створило локальну змінну eggs. Вона живе тільки тут.`});
      out.push("локальна");
      frames.push({line:2, out:[...out], vars:[{name:"eggs", val:'"локальна"', cls:"i"}],
        scopes:[G([]), L("локальна область spam()", [{name:"eggs", val:'"локальна"', cls:"hit"}])],
        note:`Усередині функції змінна чудово читається.`});
      frames.push({line:4, out:[...out],
        scopes:[G([]), L("локальна область spam()", [{name:"eggs", val:"знищено", cls:"err"}], {gone:true})],
        note:`Функція завершилась — уся її локальна область стерта. Змінної eggs більше не існує.`});
      frames.push({line:5, out:[...out], kind:"end",
        scopes:[G([], {empty:"тут eggs ніколи не було"})],
        note:`NameError: name 'eggs' is not defined. Глобальний код ніколи не бачив цієї змінної.`});
      return {code, frames};
    }

    if(mode === "read"){
      const code = [`def spam():`, `    print(eggs)`, ``, `eggs = "глобальна"`, `spam()`];
      frames.push({line:3, out:[], scopes:[G([{name:"eggs", val:'"глобальна"', cls:"now"}])],
        note:`Змінна створена поза всіма функціями, тому вона глобальна.`});
      frames.push({line:4, out:[], scopes:[G([{name:"eggs", val:'"глобальна"', cls:""}]),
        L("локальна область spam()", [], {empty:"своїх змінних немає"})],
        note:`Виклик spam(). Локальна область створена, але поки порожня.`});
      out.push("глобальна");
      frames.push({line:1, out:[...out], vars:[{name:"eggs", val:'"глобальна"', cls:"n"}],
        scopes:[G([{name:"eggs", val:'"глобальна"', cls:"hit"}]),
        L("локальна область spam()", [], {empty:"своїх змінних немає"})],
        note:`Своєї eggs у функції немає — Python виходить назовні й знаходить глобальну. Читати глобальні змінні можна.`});
      frames.push({line:4, out:[...out], kind:"end", scopes:[G([{name:"eggs", val:'"глобальна"', cls:""}])],
        note:`Глобальна змінна лишилась незмінною: ми її лише прочитали.`});
      return {code, frames};
    }

    const code = [`def spam():`, `    eggs = "spam local"`, `    print(eggs)`, ``,
                  `def bacon():`, `    eggs = "bacon local"`, `    spam()`, `    print(eggs)`, ``,
                  `eggs = "global"`, `bacon()`, `print(eggs)`];
    const g = (cls) => G([{name:"eggs", val:'"global"', cls:cls || ""}]);
    frames.push({line:9, out:[], scopes:[g("now")],
      note:`Три різні змінні матимуть однакове ім'я eggs. Це не конфлікт — це три різні коробки в різних областях.`});
    frames.push({line:5, out:[], vars:[{name:"eggs", val:'"bacon local"', cls:"i"}],
      scopes:[g(), L("локальна область bacon()", [{name:"eggs", val:'"bacon local"', cls:"now"}])],
      note:`bacon() створила свою власну eggs. Глобальної вона не торкнулась.`});
    frames.push({line:1, out:[], vars:[{name:"eggs", val:'"spam local"', cls:"i"}],
      scopes:[g(), L("локальна область spam()", [{name:"eggs", val:'"spam local"', cls:"now"}])],
      note:`bacon() викликала spam(), і та створила ще одну свою eggs. Область bacon() зараз недосяжна — функції не бачать локальних змінних одна одної.`});
    out.push("spam local");
    frames.push({line:2, out:[...out], vars:[{name:"eggs", val:'"spam local"', cls:"i"}],
      scopes:[g(), L("локальна область spam()", [{name:"eggs", val:'"spam local"', cls:"hit"}])],
      note:`spam() друкує свою — «spam local».`});
    out.push("bacon local");
    frames.push({line:7, out:[...out], vars:[{name:"eggs", val:'"bacon local"', cls:"i"}],
      scopes:[g(), L("локальна область bacon()", [{name:"eggs", val:'"bacon local"', cls:"hit"}])],
      note:`spam() завершилась, її область стерта. bacon() бачить свою eggs у цілості — «bacon local».`});
    out.push("global");
    frames.push({line:11, out:[...out], kind:"end", scopes:[g("hit")],
      note:`І глобальна eggs теж ціла: жодна функція її не чіпала. Три коробки, одне ім'я, жодного конфлікту.`});
    return {code, frames};
  },
  extra:(f)=>scopeViz(f.scopes)
});

/* ================= 7. global і UnboundLocalError ================= */
createPlayer(document.getElementById("func-w-global"), {
  config:`<span class="seg">
      <button data-mode="no" aria-pressed="true">Без global</button>
      <button data-mode="yes" aria-pressed="false">Із global</button>
      <button data-mode="err" aria-pressed="false">Помилка</button>
    </span>`,
  readCfg:(r)=>({ mode:modeCfg(r) }),
  build:({mode})=>{
    const G = (vars, extra) => Object.assign({t:"глобальна область", vars:vars}, extra || {});
    const L = (vars, extra) => Object.assign({t:"локальна область change()", vars:vars, local:true}, extra || {});
    const out = [], frames = [];

    if(mode === "no"){
      const code = [`def change():`, `    counter = 99`, ``, `counter = 1`, `change()`, `print(counter)`];
      frames.push({line:3, out:[], scopes:[G([{name:"counter", val:"1", cls:"now"}])],
        note:`Глобальна counter дорівнює 1.`});
      frames.push({line:1, out:[], vars:[{name:"counter", val:99, cls:"i"}],
        scopes:[G([{name:"counter", val:"1", cls:""}]), L([{name:"counter", val:"99", cls:"now"}])],
        note:`Присвоєння у функції завжди створює локальну змінну — навіть якщо зовні вже є така сама за іменем. Тепер їх дві.`});
      frames.push({line:4, out:[],
        scopes:[G([{name:"counter", val:"1", cls:""}]), L([{name:"counter", val:"99", cls:"err"}], {gone:true})],
        note:`Функція завершилась — локальна counter зникла разом із нею, так і не вплинувши ні на що.`});
      out.push("1");
      frames.push({line:5, out:[...out], kind:"end", scopes:[G([{name:"counter", val:"1", cls:"hit"}])],
        note:`Друкується 1. Глобальна змінна лишилась недоторканою.`});
      return {code, frames};
    }

    if(mode === "yes"){
      const code = [`def change():`, `    global counter`, `    counter = 99`, ``,
                    `counter = 1`, `change()`, `print(counter)`];
      frames.push({line:4, out:[], scopes:[G([{name:"counter", val:"1", cls:"now"}])],
        note:`Знову починаємо з глобальної counter = 1.`});
      frames.push({line:1, out:[],
        scopes:[G([{name:"counter", val:"1", cls:""}]), L([], {empty:"своїх змінних не буде"})],
        note:`Рядок global counter каже: «у цій функції counter — це та сама зовнішня змінна, не створюй локальну».`});
      frames.push({line:2, out:[], vars:[{name:"counter", val:99, cls:"n"}],
        scopes:[G([{name:"counter", val:"99", cls:"now"}]), L([], {empty:"своїх змінних немає"})],
        note:`Присвоєння пішло прямо в глобальну область. Локальної counter так і не з'явилось.`});
      out.push("99");
      frames.push({line:6, out:[...out], kind:"end", scopes:[G([{name:"counter", val:"99", cls:"hit"}])],
        note:`Друкується 99 — функція справді змінила зовнішній світ. Саме тому global треба використовувати обережно.`});
      return {code, frames};
    }

    const code = [`def change():`, `    print(counter)`, `    counter = 99`, ``, `counter = 1`, `change()`];
    frames.push({line:4, out:[], scopes:[G([{name:"counter", val:"1", cls:"now"}])],
      note:`Глобальна counter = 1. Здавалося б, функція нижче спокійно її прочитає.`});
    frames.push({line:5, out:[],
      scopes:[G([{name:"counter", val:"1", cls:""}]), L([{name:"counter", val:"ще порожня", cls:"empty"}])],
      note:`Перед запуском тіла Python переглядає його цілком і бачить присвоєння в рядку 3. Отже, counter тут локальна — на всій довжині функції, з першого рядка.`});
    frames.push({line:1, out:[], kind:"end",
      scopes:[G([{name:"counter", val:"1", cls:""}]), L([{name:"counter", val:"ще порожня", cls:"err"}])],
      note:`UnboundLocalError: local variable 'counter' referenced before assignment. Читаємо локальну змінну, в яку ще нічого не поклали. Порятунок — або рядок global counter, або інше ім'я.`});
    return {code, frames};
  },
  extra:(f)=>scopeViz(f.scopes)
});

/* ================= 8. try / except ================= */
createPlayer(document.getElementById("func-w-try"), {
  config:`<label>дільник <input type="number" data-cfg id="func-tr-x" value="4" min="-6" max="12"></label>`,
  readCfg:(r)=>({ x:numCfg(r, "#func-tr-x", 4) }),
  build:({x})=>{
    const code = [
      `def divide(x):`,
      `    try:`,
      `        return 42 / x`,
      `    except ZeroDivisionError:`,
      `        print("Помилка: ділення на нуль")`,
      ``,
      `print(divide(${x}))`,
      `print(divide(0))`,
      `print("програма живе далі")`
    ];
    const out = [], frames = [];
    const tv = (t, e) => ({try:t, exc:e});

    /* один прохід функції; повертає рядки, які лягли у вивід */
    function call(arg, line){
      frames.push({line, out:[...out], vars:[{name:"x", val:arg, cls:"i"}], tv:tv("idle", "idle"),
        note:`Виклик divide(${arg}).`});
      frames.push({line:1, out:[...out], vars:[{name:"x", val:arg, cls:"i"}], tv:tv("run", "idle"),
        note:`Заходимо в блок try. Python пробує виконати те, що всередині.`});
      if(arg === 0){
        frames.push({line:2, out:[...out], vars:[{name:"x", val:arg, cls:"i"}], tv:tv("boom", "idle"),
          note:`42 / 0 — помилка ZeroDivisionError. Без try програма зараз би впала й нічого далі не виконалось би.`});
        out.push("Помилка: ділення на нуль");
        frames.push({line:4, out:[...out], vars:[{name:"x", val:arg, cls:"i"}], tv:tv("boom", "ok"),
          note:`Але тип помилки збігся з except — керування перескочило сюди. Падіння не сталося.`});
        out.push("None");
        frames.push({line, out:[...out], vars:[], tv:tv("boom", "ok"),
          note:`Блок except відпрацював, до return справа не дійшла — тому divide(0) повернула None.`});
        return;
      }
      const res = Math.round((42 / arg) * 100) / 100;
      frames.push({line:2, out:[...out], vars:[{name:"x", val:arg, cls:"i"}], tv:tv("ok", "idle"),
        note:`42 / ${arg} = ${res}. Помилки не сталося, тож блок except просто пропускається.`});
      out.push(String(res));
      frames.push({line, out:[...out], vars:[], tv:tv("ok", "idle"),
        note:`Функція повернула ${res} — звичайний нормальний результат.`});
    }

    frames.push({line:0, out:[], tv:tv("idle", "idle"),
      note:`Функція описана: у try — те, що може впасти, у except — план Б.`});
    call(x, 6);
    call(0, 7);
    out.push("програма живе далі");
    frames.push({line:8, out:[...out], kind:"end", tv:tv("idle", "idle"),
      note:`Найголовніше: після перехопленої помилки програма не зупинилась, а спокійно дійшла до останнього рядка.`});
    return {code, frames};
  },
  legend:`<span><i class="y"></i>виконується</span><span><i class="g"></i>минуло без помилки</span>` +
         `<span><i class="r"></i>тут сталася помилка</span>`,
  extra:(f)=>{
    const t = f.tv || {};
    return `<div class="tryviz">` +
      `<div class="tryblk ${t.try || "idle"}"><span class="tag">try</span><span>return 42 / x</span></div>` +
      `<div class="tryblk ${t.exc || "idle"}"><span class="tag">except</span><span>ZeroDivisionError → повідомлення</span></div>` +
      `</div>`;
  }
});

/* ================= hero ================= */
(function(){
  const id  = (s) => document.getElementById(s);
  const arg = id("func-heroArg"), ret = id("func-heroRet"), box = id("func-heroBox"),
        w1  = id("func-heroW1"),  w2  = id("func-heroW2"),
        line = id("func-heroLine"), btn = id("func-heroBtn");
  const VALS = [4, 7, 9, 12];
  let n = 0, timers = [];
  const clear = () => { timers.forEach(clearTimeout); timers = []; };
  const at = (ms, fn) => { timers.push(setTimeout(fn, ms)); };

  function run(){
    clear();
    const v = VALS[n % VALS.length]; n++;
    arg.textContent = "?"; arg.className = "fnpill arg";
    ret.textContent = "?"; ret.className = "fnpill ret";
    box.className = "fnbox"; w1.className = "fnwire"; w2.className = "fnwire";
    line.textContent = "функція описана й чекає на виклик";

    at(420,  ()=>{ arg.textContent = v; arg.className = "fnpill arg on";
                   line.innerHTML = `виклик <b>square(${v})</b>`; });
    at(1050, ()=>{ w1.className = "fnwire on";
                   line.innerHTML = `аргумент <b>${v}</b> заходить у параметр <b>n</b>`; });
    at(1700, ()=>{ box.className = "fnbox work";
                   line.innerHTML = `усередині коробки: <b>n * n</b> — це ${v} × ${v}`; });
    at(2450, ()=>{ box.className = "fnbox"; w2.className = "fnwire back"; });
    at(2850, ()=>{ ret.textContent = v * v; ret.className = "fnpill ret on";
                   line.innerHTML = `<b>square(${v})</b> повертає <b>${v * v}</b>`; });
    at(4500, run);
  }

  /* кнопка програє той самий приклад ще раз, а не наступний */
  btn.onclick = ()=>{ n = Math.max(0, n - 1); run(); };
  window.registerAnim({
    el: btn,
    stop(){ clear(); },
    start(){ clear(); at(600, run); }
  });
})();

};
