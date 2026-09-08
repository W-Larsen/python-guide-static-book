"use strict";
window.PageInit["dict"] = function(){
const K = window.CollKit;
const { esc, createPlayer, numCfg, modeCfg, listStr, dictStr, cells, row, kv, legendHtml } = K;
const $id = (s) => document.getElementById(s);
const pairStr = (p) => `("${p.k}", ${p.v})`;

/* ================= 1. будуємо словник ================= */
createPlayer($id("dict-w-build"), {
  build:()=>{
    const code = [
      `ages = {}`,
      `ages["Оля"] = 16`,
      `ages["Іван"] = 15`,
      `ages["Оля"] = 17`,
      `print(ages)`
    ];
    const pairs = [], frames = [], out = [];
    const snap = () => pairs.map(p=>({...p}));

    frames.push({line:0, vars:[{name:"ages", val:"{}", cls:"i"}], out:[], pairs:[], mark:{},
      note:`Порожній словник. Фігурні дужки без нічого — це саме словник, а не множина.`});

    pairs.push({k:"Оля", v:16});
    frames.push({line:1, vars:[{name:"ages", val:dictStr(pairs), cls:"i"}], out:[], pairs:snap(), mark:{0:"now"},
      note:`Ключа "Оля" ще не було — з'являється нова пара «Оля → 16».`});

    pairs.push({k:"Іван", v:15});
    frames.push({line:2, vars:[{name:"ages", val:dictStr(pairs), cls:"i"}], out:[], pairs:snap(), mark:{1:"now"},
      note:`Так само додається другий ключ. Пари зберігаються в порядку додавання.`});

    pairs[0].v = 17;
    frames.push({line:3, vars:[{name:"ages", val:dictStr(pairs), cls:"i"}], out:[], pairs:snap(), mark:{0:"hit"},
      note:`А ось тут ключ "Оля" уже існував. Третьої пари не з'явилось — 16 замінилось на 17. У словнику ключ завжди один.`});

    out.push(dictStr(pairs));
    frames.push({line:4, vars:[{name:"ages", val:dictStr(pairs), cls:"i"}], out:[...out], pairs:snap(), mark:{}, kind:"end",
      note:`У словнику дві пари, хоч присвоєнь було три.`});

    return {code, frames};
  },
  extra:(f)=> kv(f.pairs, {state:f.mark, empty:"{} — словник поки порожній"})
});

/* ================= 2. доступ за ключем ================= */
createPlayer($id("dict-w-get"), {
  config:`<label>ключ <input type="text" data-cfg id="dict-gk" value="Ніна" spellcheck="false"></label>
    <span class="seg">
      <button data-mode="br" aria-pressed="true">ages[ключ]</button>
      <button data-mode="get" aria-pressed="false">ages.get(ключ)</button>
    </span>`,
  readCfg:(r)=>({
    /* ключ показується всередині рядкового літерала Python, тому лапки й
       слеш прибираємо — інакше в панелі коду виходив би зламаний Python */
    key: r.querySelector("#dict-gk").value.trim().replace(/["\\]/g, "") || "Ніна",
    mode: modeCfg(r)
  }),
  build:({key, mode})=>{
    const base = [{k:"Оля", v:16}, {k:"Іван", v:15}];
    const found = base.find(p=>p.k===key);
    const at = base.findIndex(p=>p.k===key);
    const V = [{name:"ages", val:dictStr(base), cls:"i"}];
    const frames = [], out = [];
    const first = `ages = {"Оля": 16, "Іван": 15}`;

    if(mode === "br"){
      const code = [first, `print(ages["${key}"])`, `print("програма дійшла до кінця")`];
      frames.push({line:0, vars:V, out:[], pairs:base, mark:{},
        note:`Словник із двома парами. Шукати будемо ключ "${key}".`});
      if(found){
        out.push(String(found.v));
        frames.push({line:1, vars:V, out:[...out], pairs:base, mark:{[at]:"hit"},
          note:`Ключ "${key}" знайдено — квадратні дужки повертають ${found.v}.`});
        out.push("програма дійшла до кінця");
        frames.push({line:2, vars:V, out:[...out], pairs:base, mark:{[at]:"hit"}, kind:"end",
          note:`Усе спокійно: програма доходить до останнього рядка.`});
      }else{
        out.push(`Traceback (most recent call last):`);
        out.push(`KeyError: '${key}'`);
        frames.push({line:1, vars:V, out:[...out], pairs:base, mark:{}, kind:"end",
          note:`Ключа "${key}" у словнику немає — програма падає з помилкою KeyError просто на цьому рядку.`});
        frames.push({line:2, vars:V, out:[...out], pairs:base, mark:{}, kind:"end",
          note:`Останній рядок так і не виконався: після помилки програма не продовжує роботу.`});
      }
      return {code, frames};
    }

    const code = [first, `print(ages.get("${key}"))`, `print(ages.get("${key}", 0))`,
                  `print("програма дійшла до кінця")`];
    frames.push({line:0, vars:V, out:[], pairs:base, mark:{},
      note:`Той самий словник, але діставати будемо через .get().`});
    out.push(found ? String(found.v) : "None");
    frames.push({line:1, vars:V, out:[...out], pairs:base, mark: found ? {[at]:"hit"} : {},
      note: found
        ? `Ключ є — .get() повертає те саме значення ${found.v}.`
        : `Ключа "${key}" немає, але помилки теж немає: .get() повертає None.`});
    out.push(found ? String(found.v) : "0");
    frames.push({line:2, vars:V, out:[...out], pairs:base, mark: found ? {[at]:"hit"} : {},
      note: found
        ? `Другий аргумент знадобився б лише за відсутності ключа. Тут він не потрібен.`
        : `Другим аргументом ми задали запасне значення — замість None отримуємо 0.`});
    out.push("програма дійшла до кінця");
    frames.push({line:3, vars:V, out:[...out], pairs:base, mark:{}, kind:"end",
      note:`Головне: з .get() програма живе далі в будь-якому випадку.`});
    return {code, frames};
  },
  extra:(f)=> kv(f.pairs, {state:f.mark})
});

/* ================= 3. перебір словника ================= */
createPlayer($id("dict-w-loop"), {
  config:`<span class="seg">
      <button data-mode="keys" aria-pressed="true">ключі</button>
      <button data-mode="values" aria-pressed="false">значення</button>
      <button data-mode="items" aria-pressed="false">пари</button>
    </span>`,
  readCfg:(r)=>({mode:modeCfg(r)}),
  build:({mode})=>{
    const base = [{k:"Оля", v:16}, {k:"Іван", v:15}, {k:"Ніна", v:14}];
    const first = `ages = {"Оля": 16, "Іван": 15, "Ніна": 14}`;
    const code = mode === "keys"
      ? [first, `for name in ages:`, `    print(name)`]
      : mode === "values"
        ? [first, `for age in ages.values():`, `    print(age)`]
        : [first, `for name, age in ages.items():`, `    print(name, "—", age)`];
    const frames = [], out = [];
    frames.push({line:0, vars:[{name:"ages", val:dictStr(base), cls:"i"}], out:[], pairs:base, mark:{},
      note: mode === "keys"
        ? `Звичайний for по словнику бере ключі — самі значення до змінної не потрапляють.`
        : mode === "values"
          ? `.values() віддає лише значення. Ключів у циклі не буде видно.`
          : `.items() віддає пару, тому й змінних циклу дві.`});
    base.forEach((p, k)=>{
      const vars = mode === "keys" ? [{name:"name", val:`"${p.k}"`, cls:"i"}]
                 : mode === "values" ? [{name:"age", val:String(p.v), cls:"j"}]
                 : [{name:"name", val:`"${p.k}"`, cls:"i"}, {name:"age", val:String(p.v), cls:"j"}];
      frames.push({line:1, vars, out:[...out], pairs:base, mark:{[k]:"now"},
        note:`Крок ${k + 1}: беремо пару «${p.k} → ${p.v}». ${mode === "keys" ? `У змінній лежить ключ "${p.k}".`
          : mode === "values" ? `У змінній лежить значення ${p.v}.` : `Ключ і значення розклались по двох змінних.`}`});
      out.push(mode === "keys" ? p.k : mode === "values" ? String(p.v) : `${p.k} — ${p.v}`);
      frames.push({line:2, vars, out:[...out], pairs:base, mark:{[k]:"hit"},
        note:`Друкуємо й повертаємось по наступну пару.`});
    });
    frames.push({line:1, vars:[], out:[...out], pairs:base, mark:{}, kind:"end",
      note:`Пари закінчились — цикл зупиняється.`});
    return {code, frames};
  },
  extra:(f)=> kv(f.pairs, {state:f.mark})
});

/* ================= 4. що годиться в ключі ================= */
(function(){
  const root = $id("dict-w-hash");
  if(!root) return;
  const VALUES = [
    {t:`5`, ok:true, why:`Число незмінне — надійний ключ.`},
    {t:`"Оля"`, ok:true, why:`Рядок змінити не можна, тому це найчастіший вид ключа.`},
    {t:`3.14`, ok:true, why:`Дробове число теж підходить, хоча ключі-дроби на практиці рідкість.`},
    {t:`True`, ok:true, why:`True і False — звичайні незмінні значення.`},
    {t:`(1, 2)`, ok:true, why:`Кортеж незмінний, тому пара координат цілком може бути ключем.`},
    {t:`[1, 2]`, ok:false, why:`Список можна змінити вже після того, як він став ключем — Python такого не дозволяє: TypeError: unhashable type: 'list'.`},
    {t:`{"a": 1}`, ok:false, why:`Словник теж змінюваний, тому ключем бути не може.`},
    {t:`{1, 2}`, ok:false, why:`Звичайна множина змінювана. Для таких випадків існує frozenset — незмінна версія множини.`}
  ];
  root.innerHTML =
    `<div class="hashgrid">${VALUES.map((v, k)=>
      `<button data-h="${k}" aria-pressed="${k === 0}">${esc(v.t)}</button>`).join("")}</div>
     <div class="sandbox" style="padding-top:0">
       <span class="mono-line">d[<b data-hx></b>] = "щось"</span>
       <span class="arrow">→</span>
       <span data-hres></span>
     </div>
     <div class="sandbox-note" data-hnote></div>`;
  const hx = root.querySelector("[data-hx]"), hres = root.querySelector("[data-hres]"),
        hnote = root.querySelector("[data-hnote]");
  function pick(k){
    const v = VALUES[k];
    root.querySelectorAll("[data-h]").forEach(b=>b.setAttribute("aria-pressed", String(Number(b.dataset.h) === k)));
    hx.textContent = v.t;
    hres.innerHTML = v.ok ? `<span class="verdict-ok">так, можна</span>` : `<span class="verdict-bad">TypeError</span>`;
    hnote.textContent = v.why;
  }
  root.querySelectorAll("[data-h]").forEach(b=>b.addEventListener("click", ()=>pick(Number(b.dataset.h))));
  pick(0);
})();

/* ================= 5. keys / values / items ================= */
createPlayer($id("dict-w-views"), {
  config:`<span class="seg">
      <button data-mode="keys" aria-pressed="true">.keys()</button>
      <button data-mode="values" aria-pressed="false">.values()</button>
      <button data-mode="items" aria-pressed="false">.items()</button>
    </span>`,
  readCfg:(r)=>({mode:modeCfg(r)}),
  build:({mode})=>{
    const base = [{k:"Оля", v:16}, {k:"Іван", v:15}, {k:"Ніна", v:17}];
    const first = `ages = {"Оля": 16, "Іван": 15, "Ніна": 17}`;
    const code = [first, `view = list(ages.${mode}())`, `print(view)`, `print(len(view))`];
    const frames = [], out = [], got = [];
    const V = [{name:"ages", val:dictStr(base), cls:"i"}];

    frames.push({line:0, pairs:base, mark:{}, got:[], mode, vars:V, out:[],
      note:`Три пари. Метод не копіює словник — він показує на нього під певним кутом.`});
    frames.push({line:1, pairs:base, mark:{}, got:[], mode, vars:V, out:[],
      note: mode === "keys" ? `.keys() показує лише ліву частину кожної пари.`
        : mode === "values" ? `.values() показує лише праву частину.`
        : `.items() показує пару цілком — у вигляді кортежу з двох елементів.`});

    base.forEach((p, k)=>{
      got.push(mode === "keys" ? p.k : mode === "values" ? p.v : pairStr(p));
      frames.push({line:1, pairs:base, mark:{[k]:"hit"}, got:[...got], mode,
        vars:V.concat([{name:"view", val:"[" + got.map(x=>typeof x === "string" && x[0] !== "(" ? `"${x}"` : String(x)).join(", ") + "]", cls:"j"}]),
        out:[], note:`Пара «${p.k} → ${p.v}» дає ${mode === "keys" ? `ключ "${p.k}"` : mode === "values" ? `значення ${p.v}` : `кортеж ${pairStr(p)}`}.`});
    });

    const shown = "[" + got.map(x=>typeof x === "string" && x[0] !== "(" ? `'${x}'` : String(x)).join(", ") + "]";
    out.push(shown);
    frames.push({line:2, pairs:base, mark:{}, got:[...got], mode, vars:V, out:[...out],
      note: mode === "items"
        ? `Кожен елемент — кортеж. Саме тому в циклі пишуть дві змінні: for name, age in ages.items().`
        : `Готовий список із ${got.length} елементів.`});
    out.push(String(got.length));
    frames.push({line:3, pairs:base, mark:{}, got:[...got], mode, kind:"end", vars:V, out:[...out],
      note:`Довжина завжди дорівнює кількості пар — усі три вікна показують той самий словник.`});
    return {code, frames};
  },
  extra:(f)=> kv(f.pairs, {state:f.mark}) +
    `<div style="margin-top:12px">${row("view", cells(f.got, {}), "j")}</div>`
});

/* ================= 6. сортування словника ================= */
createPlayer($id("dict-w-sort"), {
  config:`<span class="seg">
      <button data-mode="key" aria-pressed="true">sorted(ages)</button>
      <button data-mode="val" aria-pressed="false">за значенням</button>
      <button data-mode="valrev" aria-pressed="false">за значенням ↓</button>
    </span>`,
  readCfg:(r)=>({mode:modeCfg(r)}),
  build:({mode})=>{
    const base = [{k:"Оля", v:16}, {k:"Іван", v:15}, {k:"Ніна", v:17}];
    const first = `ages = {"Оля": 16, "Іван": 15, "Ніна": 17}`;
    const byKey = mode === "key";
    const code = byKey
      ? [first, `res = sorted(ages)`, `print(res)`]
      : [first, `res = sorted(ages.items(), key=lambda p: p[1]${mode === "valrev" ? ", reverse=True" : ""})`,
         `print(res)`, `print(dict(res))`];

    const better = byKey ? (a, b)=>a.k < b.k : mode === "val" ? (a, b)=>a.v < b.v : (a, b)=>a.v > b.v;
    let rest = base.map(p=>({...p})), res = [];
    const frames = [], out = [];
    const V = [{name:"ages", val:dictStr(base), cls:"i"}];

    frames.push({line:0, rest:rest.map(p=>({...p})), res:[], cmp:[], byKey, vars:V, out:[],
      note:`Сам словник не сортується. Сортують те, що з нього дістали, — а результат завжди список.`});
    frames.push({line:1, rest:rest.map(p=>({...p})), res:[], cmp:[], byKey, vars:V, out:[],
      note: byKey
        ? `sorted(ages) бере лише ключі — значення в цьому записі взагалі не беруть участі.`
        : `key=lambda p: p[1] каже: для кожної пари p мірка — це її друга частина, тобто вік.`});

    while(rest.length){
      if(rest.length === 1){
        res.push(rest[0]); rest = [];
        frames.push({line:1, rest:[], res:res.map(p=>({...p})), cmp:[], byKey, vars:V, out:[],
          note:`Лишилась одна пара — вона йде в кінець.`});
        break;
      }
      let best = 0;
      for(let k = 1; k < rest.length; k++){
        const win = better(rest[k], rest[best]);
        frames.push({line:1, rest:rest.map(p=>({...p})), res:res.map(p=>({...p})), cmp:[k, best], best, byKey, vars:V, out:[],
          note: byKey
            ? `Порівнюємо ключі "${rest[k].k}" і "${rest[best].k}" за алфавітом → ${win ? `раніше "${rest[k].k}"` : `раніше "${rest[best].k}"`}.`
            : `Порівнюємо ${rest[k].v} і ${rest[best].v} → ${win ? `кандидат тепер "${rest[k].k}"` : `кандидат лишається "${rest[best].k}"`}.`});
        if(win) best = k;
      }
      const taken = rest[best];
      rest = rest.filter((_, i)=>i !== best);
      res.push(taken);
      frames.push({line:1, rest:rest.map(p=>({...p})), res:res.map(p=>({...p})), cmp:[], byKey, vars:V, out:[],
        note:`Пара «${taken.k} → ${taken.v}» стає на своє місце в результаті.`});
    }

    if(byKey){
      out.push("[" + res.map(p=>`'${p.k}'`).join(", ") + "]");
      frames.push({line:2, rest:[], res:res.map(p=>({...p})), cmp:[], byKey, kind:"end",
        vars:V.concat([{name:"res", val:listStr(res.map(p=>p.k)), cls:"j"}]), out:[...out],
        note:`Це список ключів, а не словник. Значення в нього не потрапили взагалі.`});
    }else{
      out.push("[" + res.map(p=>`('${p.k}', ${p.v})`).join(", ") + "]");
      frames.push({line:2, rest:[], res:res.map(p=>({...p})), cmp:[], byKey,
        vars:V.concat([{name:"res", val:"[" + res.map(p=>pairStr(p)).join(", ") + "]", cls:"j"}]), out:[...out],
        note:`Результат — список кортежів, посортований ${mode === "valrev" ? "від старшого до молодшого" : "від молодшого до старшого"}.`});
      out.push(dictStr(res));
      frames.push({line:3, rest:[], res:res.map(p=>({...p})), cmp:[], byKey, kind:"end",
        vars:V.concat([{name:"res", val:"[" + res.map(p=>pairStr(p)).join(", ") + "]", cls:"j"}]), out:[...out],
        note:`dict(...) перетворює список пар назад у словник — і той зберігає новий порядок.`});
    }
    return {code, frames};
  },
  extra:(f)=>{
    const st = {};
    (f.cmp || []).forEach(i=>{ st[i] = i === f.best ? "now" : "hit"; });
    const left = kv(f.rest, {state:st, empty:"усі пари вже розставлені"});
    const right = f.byKey
      ? cells(f.res.map(p=>p.k), {})
      : kv(f.res, {empty:"результат поки порожній"});
    return row("лишилось", left, "i") + row("результат", right, "j");
  },
  legend: legendHtml([["p","поточний кандидат"],["g","з ким порівнюємо"]])
});

/* ================= 7. max / min / sum ================= */
createPlayer($id("dict-w-max"), {
  config:`<span class="seg">
      <button data-mode="naive" aria-pressed="true">max(ages)</button>
      <button data-mode="key" aria-pressed="false">max(ages, key=ages.get)</button>
      <button data-mode="sum" aria-pressed="false">sum(ages.values())</button>
    </span>`,
  readCfg:(r)=>({mode:modeCfg(r)}),
  build:({mode})=>{
    const base = [{k:"Оля", v:16}, {k:"Іван", v:15}, {k:"Ніна", v:17}];
    const first = `ages = {"Оля": 16, "Іван": 15, "Ніна": 17}`;
    const code = mode === "naive" ? [first, `print(max(ages))`]
      : mode === "key" ? [first, `print(max(ages, key=ages.get))`]
      : [first, `print(sum(ages.values()))`];
    const V = [{name:"ages", val:dictStr(base), cls:"i"}];
    const frames = [], out = [];

    frames.push({line:0, pairs:base, mark:{}, acc:null, mode, vars:V, out:[],
      note: mode === "naive"
        ? `Найпоширеніша пастка. max(ages) перебирає САМІ КЛЮЧІ — вік він не бачить взагалі.`
        : mode === "key"
          ? `key=ages.get каже: перебирай ключі, але для кожного питай його значення й порівнюй саме його.`
          : `.values() віддає самі числа — далі це вже звичайне додавання.`});

    let acc = mode === "sum" ? 0 : null, bestK = null;
    base.forEach((p, k)=>{
      let msg;
      if(mode === "sum"){
        const before = acc; acc += p.v;
        msg = `Беремо значення ${p.v}: ${before} + ${p.v} = ${acc}. Ключ "${p.k}" тут не потрібен.`;
      }else if(mode === "naive"){
        const cur = p.k;
        const win = bestK === null || cur > bestK;
        msg = bestK === null ? `Перший ключ "${cur}" стає поточним рекордом.`
          : `Порівнюємо рядки "${cur}" і "${bestK}" за алфавітом → ${win ? `новий рекорд "${cur}"` : `рекорд лишається "${bestK}"`}. Вік ${p.v} нікого не цікавить.`;
        if(win) bestK = cur;
        acc = bestK;
      }else{
        const win = bestK === null || p.v > base.find(x=>x.k === bestK).v;
        msg = bestK === null ? `Перший ключ "${p.k}" (${p.v}) стає поточним рекордом.`
          : `Мірка "${p.k}" — це ${p.v}; у рекордсмена "${bestK}" — ${base.find(x=>x.k === bestK).v} → ${win ? `новий рекорд "${p.k}"` : `рекорд лишається`}.`;
        if(win) bestK = p.k;
        acc = bestK;
      }
      frames.push({line:1, pairs:base, mark:{[k]:"now"}, acc, mode, vars:V, out:[], note:msg});
    });

    out.push(mode === "sum" ? String(acc) : String(acc));
    frames.push({line:1, pairs:base, mark: mode === "sum" ? {} : {[base.findIndex(p=>p.k === bestK)]:"hit"},
      acc, mode, kind:"end", vars:V, out:[...out],
      note: mode === "naive"
        ? `Відповідь "Оля" — і це найстарший КЛЮЧ за алфавітом, а не найстарша людина. Найстарша тут Ніна.`
        : mode === "key"
          ? `Відповідь "Ніна" — саме той ключ, у якого найбільше значення. Якщо потрібне число, а не ім'я, бери max(ages.values()).`
          : `Сума всіх значень — ${acc}.`});
    return {code, frames};
  },
  extra:(f)=> kv(f.pairs, {state:f.mark}) +
    `<div class="accrow" style="margin-top:12px"><span class="acclab">${f.mode === "sum" ? "сума" : "поточний рекорд"} =</span>` +
    `<span class="accbox ${f.acc === null ? "wait" : (f.mode === "naive" ? "stop" : "")}">${esc(f.acc === null ? "поки нічого" : String(f.acc))}</span></div>`
});

/* ================= 8. підрахунок ================= */
createPlayer($id("dict-w-count"), {
  build:()=>{
    const src = ["к", "о", "д", "о", "к", "о"];
    const code = [
      `letters = ["к", "о", "д", "о", "к", "о"]`,
      `counts = {}`,
      `for c in letters:`,
      `    counts[c] = counts.get(c, 0) + 1`,
      `print(counts)`,
      `print(max(counts, key=counts.get))`
    ];
    const pairs = [], frames = [], out = [];
    const snap = () => pairs.map(p=>({...p}));

    frames.push({line:0, src, k:-1, pairs:[], mark:{}, vars:[], out:[],
      note:`Шість букв, серед них є повтори. Треба порахувати кожну.`});
    frames.push({line:1, src, k:-1, pairs:[], mark:{}, vars:[{name:"counts", val:"{}", cls:"i"}], out:[],
      note:`Починаємо з порожнього словника: жодної букви ми ще не бачили.`});

    src.forEach((c, k)=>{
      const at = pairs.findIndex(p=>p.k === c);
      const had = at >= 0 ? pairs[at].v : 0;
      frames.push({line:2, src, k, pairs:snap(), mark: at >= 0 ? {[at]:"now"} : {},
        vars:[{name:"c", val:`"${c}"`, cls:"j"}, {name:"counts", val:dictStr(pairs), cls:"i"}], out:[],
        note:`Крок ${k + 1}: беремо "${c}".`});
      if(at >= 0) pairs[at].v += 1; else pairs.push({k:c, v:1});
      const now = pairs.findIndex(p=>p.k === c);
      frames.push({line:3, src, k, pairs:snap(), mark:{[now]:"hit"},
        vars:[{name:"c", val:`"${c}"`, cls:"j"}, {name:"counts", val:dictStr(pairs), cls:"i"}], out:[],
        note: at >= 0
          ? `.get("${c}", 0) повертає ${had} — стільки разів ця буква вже траплялась. Додаємо одиницю: ${had + 1}.`
          : `.get("${c}", 0) повертає 0, бо такого ключа ще немає. Саме заради цього нуля тут і потрібен .get(): без нього був би KeyError. Записуємо 1.`});
    });

    out.push(dictStr(pairs));
    frames.push({line:4, src, k:src.length, pairs:snap(), mark:{},
      vars:[{name:"counts", val:dictStr(pairs), cls:"i"}], out:[...out],
      note:`Шість букв перетворились на ${pairs.length} пари «буква → скільки разів».`});
    const top = pairs.reduce((a, b)=>b.v > a.v ? b : a);
    out.push(top.k);
    frames.push({line:5, src, k:src.length, pairs:snap(), mark:{[pairs.indexOf(top)]:"hit"}, kind:"end",
      vars:[{name:"counts", val:dictStr(pairs), cls:"i"}], out:[...out],
      note:`А max з key=counts.get одразу каже, яка буква найчастіша: "${top.k}", ${top.v} рази. Готовий інструмент для того самого — Counter із модуля collections.`});
    return {code, frames};
  },
  extra:(f)=>{
    const st = {}; if(f.k >= 0 && f.k < f.src.length) st[f.k] = "now";
    return row("letters", cells(f.src, {state:st, noIndex:true}), "j") +
           row("counts", kv(f.pairs, {state:f.mark, empty:"{} — поки жодної букви"}), "i");
  }
});

/* ================= 9. словниковий вираз ================= */
createPlayer($id("dict-w-comp"), {
  config:`<span class="seg">
      <button data-mode="double" aria-pressed="true">змінити значення</button>
      <button data-mode="filter" aria-pressed="false">відібрати пари</button>
      <button data-mode="swap" aria-pressed="false">поміняти місцями</button>
      <button data-mode="zip" aria-pressed="false">із двох списків</button>
    </span>`,
  readCfg:(r)=>({mode:modeCfg(r)}),
  build:({mode})=>{
    const base = [{k:"Оля", v:16}, {k:"Іван", v:15}, {k:"Ніна", v:17}];
    const first = `ages = {"Оля": 16, "Іван": 15, "Ніна": 17}`;
    const code = mode === "double"
      ? [first, `res = {k: v + 1 for k, v in ages.items()}`, `print(res)`]
      : mode === "filter"
        ? [first, `res = {k: v for k, v in ages.items() if v > 15}`, `print(res)`]
        : mode === "swap"
          ? [first, `res = {v: k for k, v in ages.items()}`, `print(res)`]
          : [`names = ["Оля", "Іван", "Ніна"]`, `ages = [16, 15, 17]`, `res = dict(zip(names, ages))`, `print(res)`];

    const line = mode === "zip" ? 2 : 1;
    const outLine = mode === "zip" ? 3 : 2;
    const frames = [], out = [], res = [];
    const V = mode === "zip"
      ? [{name:"names", val:listStr(base.map(p=>p.k)), cls:"i"}, {name:"ages", val:listStr(base.map(p=>p.v)), cls:"j"}]
      : [{name:"ages", val:dictStr(base), cls:"i"}];

    frames.push({line:0, pairs:base, mark:{}, res:[], mode, vars:V, out:[],
      note: mode === "zip"
        ? `Два окремі списки: імена й віки. Вони йдуть паралельно, але нічим не зв'язані.`
        : `Три пари. Словниковий вираз пройде їх усі й збере новий словник.`});
    if(mode === "zip") frames.push({line:1, pairs:base, mark:{}, res:[], mode, vars:V, out:[],
      note:`zip зшиває їх у пари, а dict() перетворює пари на словник.`});
    frames.push({line, pairs:base, mark:{}, res:[], mode, vars:V, out:[],
      note: mode === "double" ? `Ліворуч від for стоїть k: v + 1 — ключ лишається, значення міняється.`
        : mode === "filter" ? `Тут є if: пари, які його не пройдуть, у новий словник просто не потраплять.`
        : mode === "swap" ? `Тут ключ і значення записані навпаки: {v: k}. Обережно — якщо значення повторюються, частина пар зникне.`
        : `Пари складаються по позиціях: перший з першим, другий з другим.`});

    base.forEach((p, k)=>{
      let msg, added = null;
      if(mode === "double"){ added = {k:p.k, v:p.v + 1}; msg = `«${p.k} → ${p.v}» стає «${p.k} → ${p.v + 1}».`; }
      else if(mode === "filter"){
        if(p.v > 15){ added = {k:p.k, v:p.v}; msg = `${p.v} > 15 → пара проходить.`; }
        else msg = `${p.v} > 15 хибне → пара відсіюється.`;
      }
      else if(mode === "swap"){ added = {k:p.v, v:p.k}; msg = `Ключем стає число ${p.v}, значенням — ім'я "${p.k}".`; }
      else { added = {k:p.k, v:p.v}; msg = `Позиція ${k}: "${p.k}" ↔ ${p.v}.`; }
      if(added) res.push(added);
      frames.push({line, pairs:base, mark:{[k]: added ? "hit" : "drop"}, res:res.map(x=>({...x})), mode,
        vars:V.concat([{name:"res", val:dictStr(res), cls:"j"}]), out:[], note:msg});
    });

    out.push(dictStr(res));
    frames.push({line:outLine, pairs:base, mark:{}, res:res.map(x=>({...x})), mode, kind:"end",
      vars:V.concat([{name:"res", val:dictStr(res), cls:"j"}]), out:[...out],
      note: mode === "filter" ? `У новому словнику лишились тільки ті пари, що пройшли умову. Початковий ages не змінився.`
        : mode === "swap" ? `Тепер за віком можна знайти ім'я. Але якби двоє мали однаковий вік, у результаті лишився б лише останній із них.`
        : mode === "zip" ? `Два списки перетворились на один словник — і тепер вік знаходиться за іменем, а не за номером позиції.`
        : `Новий словник із тими самими ключами й зміненими значеннями.`});
    return {code, frames};
  },
  extra:(f)=>{
    const src = f.mode === "zip"
      ? row("names", cells(f.pairs.map(p=>p.k), {state:f.mark}), "i") +
        row("ages", cells(f.pairs.map(p=>p.v), {state:f.mark}), "j")
      : row("ages", kv(f.pairs, {state:f.mark}), "i");
    return src + row("res", kv(f.res, {empty:"{} — поки порожньо"}), "j");
  }
});

/* ================= hero ================= */
(function(){
  const box = $id("dict-heroKv");
  const line = $id("dict-heroLine");
  const btn = $id("dict-heroBtn");
  if(!box) return;
  const PAIRS = [{k:"Оля", v:16}, {k:"Іван", v:15}, {k:"Ніна", v:14}];
  const QUERIES = ["Оля", "Ніна", "Петро"];
  box.innerHTML = PAIRS.map(p=>
    `<div class="kvrow"><span class="k">"${p.k}"</span><span class="sep">:</span><span class="v">${p.v}</span></div>`).join("");
  const rows = [...box.children];
  let t = null;
  function run(){
    clearInterval(t);
    rows.forEach(r=>r.className = "kvrow");
    let k = 0;
    t = setInterval(()=>{
      rows.forEach(r=>r.className = "kvrow");
      if(k >= QUERIES.length){
        clearInterval(t);
        line.innerHTML = `у словнику шукають за ключем, а не за номером`;
        return;
      }
      const qq = QUERIES[k];
      const i = PAIRS.findIndex(p=>p.k === qq);
      if(i >= 0){
        rows[i].className = "kvrow hit";
        line.innerHTML = `ages["${qq}"] → <b>${PAIRS[i].v}</b>`;
      }else{
        line.innerHTML = `ages["${qq}"] → <b>KeyError</b> — такого ключа немає`;
      }
      k++;
    }, 1100);
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
