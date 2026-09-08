"use strict";
window.PageInit["list"] = function(){
const K = window.CollKit;
const { esc, createPlayer, numCfg, modeCfg, listStr, cells, row, conveyor, bars, legendHtml } = K;
const $id = (s) => document.getElementById(s);

/* ================= 1. індекси ================= */
createPlayer($id("list-w-index"), {
  config:`<label>індекс <input type="number" data-cfg id="list-ix" value="2" min="-8" max="8" step="1"></label>`,
  readCfg:(r)=>({ i: numCfg(r,"#list-ix",2) }),
  build:({i})=>{
    const nums = [10, 20, 30, 40];
    const code = [
      `nums = [10, 20, 30, 40]`,
      `print(nums[${i}])`,
      `print("програма дійшла до кінця")`
    ];
    const real = i < 0 ? nums.length + i : i;
    const ok = real >= 0 && real < nums.length;
    const V = [{name:"nums", val:listStr(nums), cls:"i"}];
    const frames = [], out = [];

    frames.push({line:0, nums, mark:{}, vars:V, out:[],
      note:`Чотири комірки. Індекси йдуть від 0 до ${nums.length - 1}, а з від'ємного боку — від ${-nums.length} до -1.`});

    frames.push({line:1, nums, mark: ok ? {[real]:"now"} : {}, vars:V, out:[],
      note: i < 0
        ? `Індекс від'ємний. Python рахує його від кінця: ${nums.length} + (${i}) = ${real}.${ok ? ` Дивимось у комірку №${real}.` : ""}`
        : `Шукаємо комірку №${i}. Нумерація починається з нуля, тому це ${i + 1}-й елемент за рахунком.`});

    if(ok){
      out.push(String(nums[real]));
      frames.push({line:1, nums, mark:{[real]:"hit"}, vars:V, out:[...out],
        note:`У комірці №${real} лежить ${nums[real]} — це і виводиться.`});
      out.push("програма дійшла до кінця");
      frames.push({line:2, nums, mark:{[real]:"hit"}, vars:V, out:[...out], kind:"end",
        note:`Усе спокійно: програма доходить до останнього рядка.`});
    }else{
      out.push(`Traceback (most recent call last):`);
      out.push(`IndexError: list index out of range`);
      frames.push({line:1, nums, mark:{}, vars:V, out:[...out], kind:"end",
        note:`Комірки №${i} не існує: у списку всього ${nums.length} елементів, тобто індекси від ${-nums.length} до ${nums.length - 1}. Програма падає з IndexError.`});
      frames.push({line:2, nums, mark:{}, vars:V, out:[...out], kind:"end",
        note:`Останній рядок так і не виконався — після помилки програма не продовжує роботу.`});
    }
    return {code, frames};
  },
  extra:(f)=> row("nums", cells(f.nums, {state:f.mark}), "i")
});

/* ================= 2. зрізи ================= */
function slicePlan(n, a, b, s){
  const idx = [];
  if(s > 0){
    let start = a === null ? 0 : (a < 0 ? Math.max(n + a, 0) : Math.min(a, n));
    let stop  = b === null ? n : (b < 0 ? Math.max(n + b, 0) : Math.min(b, n));
    for(let i = start; i < stop; i += s) idx.push(i);
  }else{
    let start = a === null ? n - 1 : (a < 0 ? Math.max(n + a, -1) : Math.min(a, n - 1));
    let stop  = b === null ? -1 : (b < 0 ? Math.max(n + b, -1) : Math.min(b, n - 1));
    for(let i = start; i > stop; i += s) idx.push(i);
  }
  return idx;
}
createPlayer($id("list-w-slice"), {
  config:`<label>від <input type="text" data-cfg id="list-sa" value="1" size="3" spellcheck="false"></label>
    <label>до <input type="text" data-cfg id="list-sb" value="4" size="3" spellcheck="false"></label>
    <label>крок <input type="text" data-cfg id="list-sc" value="" size="3" spellcheck="false" placeholder="1"></label>
    <span class="counter">порожнє поле — «без межі»</span>`,
  readCfg:(r)=>({
    a: r.querySelector("#list-sa").value.trim(),
    b: r.querySelector("#list-sb").value.trim(),
    c: r.querySelector("#list-sc").value.trim()
  }),
  build:({a, b, c})=>{
    const nums = [10, 20, 30, 40, 50, 60];
    const expr = `nums[${a}:${b}${c === "" ? "" : ":" + c}]`;
    const code = [`nums = [10, 20, 30, 40, 50, 60]`, `part = ${expr}`, `print(part)`, `print(nums)`];
    const V = [{name:"nums", val:listStr(nums), cls:"i"}];

    /* Тут поля текстові (порожнє = «без межі»), тому їх треба перевіряти самим.
       Раніше «abc» тихо ставало нулем: у коді було nums[abc:4], а рахувалось
       nums[0:4] — тобто віджет показував одне, а робив інше. */
    const isInt = (s) => /^[+-]?\d+$/.test(s);
    const badField = [["від", a], ["до", b], ["крок", c]].find(([, v]) => v !== "" && !isInt(v));
    if(badField) return {code, frames:[{line:1, nums, mark:{}, got:[], vars:V, kind:"end",
      out:["TypeError: slice indices must be integers or None, not str"],
      note:`У полі «${badField[0]}» стоїть «${badField[1]}», а це не ціле число. Межі зрізу бувають лише цілими числами або порожніми.`}]};

    const na = a === "" ? null : Number(a);
    const nb = b === "" ? null : Number(b);
    const nc = c === "" ? 1 : Number(c);
    if(nc === 0) return {code, frames:[{line:1, nums, mark:{}, got:[], vars:V, kind:"end",
      out:["ValueError: slice step cannot be zero"],
      note:`Крок нуль — це нескінченне тупцювання на місці, тому Python одразу зупиняє програму.`}]};

    const plan = slicePlan(nums.length, na, nb, nc);
    const frames = [], out = [], got = [];

    frames.push({line:0, nums, mark:{}, got:[], vars:V, out:[],
      note:`Шість комірок. Зріз побудує з них новий список, а сам nums лишиться недоторканим.`});
    frames.push({line:1, nums, mark:{}, got:[], vars:V, out:[],
      note: nc > 0
        ? `Ідемо зліва направо з кроком ${nc}: беремо з індексу ${na === null ? 0 : na} і зупиняємось перед ${nb === null ? "кінцем" : nb} — праву межу не включаємо.`
        : `Крок від'ємний — ідемо справа наліво.`});

    if(!plan.length){
      frames.push({line:1, nums, mark:{}, got:[], vars:V.concat([{name:"part", val:"[]", cls:"j"}]), out:[],
        note:`Жодна комірка не підходить під ці межі — зріз порожній. Помилки не буде: зріз, на відміну від індексу, ніколи не падає.`});
    }
    plan.forEach((p, k)=>{
      got.push(nums[p]);
      const mark = {}; plan.slice(0, k).forEach(x=>mark[x] = "pick"); mark[p] = "now";
      frames.push({line:1, nums, mark, got:[...got],
        vars:V.concat([{name:"part", val:listStr(got), cls:"j"}]), out:[],
        note:`Беремо комірку №${p} → ${nums[p]}. У новому списку це буде елемент №${k}.`});
    });

    const markAll = {}; plan.forEach(x=>markAll[x] = "pick");
    out.push(listStr(got));
    frames.push({line:2, nums, mark:markAll, got:[...got],
      vars:V.concat([{name:"part", val:listStr(got), cls:"j"}]), out:[...out],
      note:`Зріз повернув ${got.length === 0 ? "порожній список" : `${got.length} елемент(и)`} — це вже окремий список.`});
    out.push(listStr(nums));
    frames.push({line:3, nums, mark:markAll, got:[...got], kind:"end",
      vars:V.concat([{name:"part", val:listStr(got), cls:"j"}]), out:[...out],
      note:`А сам nums не змінився: зріз лише читає, нічого не виймаючи.`});
    return {code, frames};
  },
  extra:(f)=> row("nums", cells(f.nums, {state:f.mark}), "i") +
              row("part", cells(f.got, {}), "j"),
  legend: legendHtml([["p","поточна комірка"],["g","потрапила в зріз"]])
});

/* ================= 3. зміна списку ================= */
createPlayer($id("list-w-mut"), {
  build:()=>{
    const code = [
      `nums = [10, 20, 30]`,
      `nums.append(40)`,
      `nums.insert(1, 15)`,
      `nums[0] = 99`,
      `nums.remove(30)`,
      `last = nums.pop()`,
      `print(nums, last)`
    ];
    let a = [10, 20, 30];
    const frames = [], out = [];
    const V = (extra) => [{name:"nums", val:listStr(a), cls:"i"}].concat(extra || []);

    frames.push({line:0, a:[...a], mark:{}, vars:V(), out:[],
      note:`Три елементи, індекси 0, 1, 2.`});

    a = [...a, 40];
    frames.push({line:1, a:[...a], mark:{3:"pick"}, vars:V(), out:[],
      note:`append() завжди додає в кінець. Новий елемент отримав індекс 3 — на єдину вільну позицію.`});

    a = [10, 15, 20, 30, 40];
    frames.push({line:2, a:[...a], mark:{1:"pick"}, vars:V(), out:[],
      note:`insert(1, 15) вставляє на позицію 1, а все, що там було, зсувається вправо: 20 було індексом 1, тепер стало 2.`});

    a = [99, 15, 20, 30, 40];
    frames.push({line:3, a:[...a], mark:{0:"pick"}, vars:V(), out:[],
      note:`Присвоєння за індексом переписує комірку на місці. Довжина не змінилась — просто в нульовій комірці інше число.`});

    frames.push({line:4, a:[...a], mark:{3:"drop"}, vars:V(), out:[],
      note:`remove(30) шукає не індекс, а саме значення 30 — і знаходить його в комірці №3.`});
    a = [99, 15, 20, 40];
    frames.push({line:4, a:[...a], mark:{}, vars:V(), out:[],
      note:`Пара прибрана, список стиснувся: 40 було індексом 4, тепер стало 3. Індекси після видалення завжди перераховуються.`});

    frames.push({line:5, a:[...a], mark:{3:"drop"}, vars:V(), out:[],
      note:`pop() без аргументів бере останній елемент.`});
    const last = a[a.length - 1];
    a = a.slice(0, -1);
    frames.push({line:5, a:[...a], mark:{}, vars:V([{name:"last", val:String(last), cls:"j"}]), out:[],
      note:`І, на відміну від remove(), не просто прибирає, а й повертає значення — тому його можна покласти у змінну.`});

    out.push(`${listStr(a)} ${last}`);
    frames.push({line:6, a:[...a], mark:{}, kind:"end",
      vars:V([{name:"last", val:String(last), cls:"j"}]), out:[...out],
      note:`Список змінювався весь час на місці — жодної копії ми не створювали.`});
    return {code, frames};
  },
  extra:(f)=> row("nums", cells(f.a, {state:f.mark}), "i"),
  legend: legendHtml([["g","щойно додано або змінено"],["r","зараз прибирається"]])
});

/* ================= 4. копія чи те саме ================= */
createPlayer($id("list-w-alias"), {
  config:`<span class="seg">
      <button data-mode="alias" aria-pressed="true">b = a</button>
      <button data-mode="copy" aria-pressed="false">b = a[:]</button>
    </span>`,
  readCfg:(r)=>({mode:modeCfg(r)}),
  build:({mode})=>{
    const alias = mode === "alias";
    const code = [
      `a = [1, 2, 3]`,
      alias ? `b = a` : `b = a[:]`,
      `b.append(4)`,
      `print(a)`,
      `print(b)`
    ];
    let A = [1, 2, 3], B = null;
    const frames = [], out = [];
    const V = () => [{name:"a", val:listStr(A), cls:"i"}].concat(B ? [{name:"b", val:listStr(B), cls:"j"}] : []);

    frames.push({line:0, A:[...A], B:null, alias, mark:{}, vars:V(), out:[],
      note:`Список створено. Ім'я a вказує на нього.`});

    B = alias ? A : [...A];
    frames.push({line:1, A:[...A], B:[...B], alias, mark:{}, vars:V(), out:[],
      note: alias
        ? `b = a не копіює нічого. Тепер два імені вказують на ОДИН список — у пам'яті він так само один.`
        : `a[:] — це зріз «увесь список», а зріз завжди будує НОВИЙ список. Тепер їх у пам'яті справді два.`});

    if(alias){ A = [...A, 4]; B = A; } else { B = [...B, 4]; }
    frames.push({line:2, A:[...A], B:[...B], alias, mark:{3:"pick"}, vars:V(), out:[],
      note: alias
        ? `Додаємо через ім'я b — але змінюється той самий єдиний список. «Другого» просто не існує.`
        : `Додаємо в b. На a це ніяк не впливає: це різні списки.`});

    out.push(listStr(A));
    frames.push({line:3, A:[...A], B:[...B], alias, mark:{}, vars:V(), out:[...out],
      note: alias
        ? `Ось і сюрприз: ми не чіпали a, а в ньому чотири елементи.`
        : `У a так і лишились три елементи.`});
    out.push(listStr(B));
    frames.push({line:4, A:[...A], B:[...B], alias, mark:{}, kind:"end", vars:V(), out:[...out],
      note: alias
        ? `Обидва друки однакові, бо це один список під двома іменами. Потрібна справжня копія — пиши a[:], list(a) або a.copy().`
        : `Списки різні — саме тому копію треба просити явно.`});
    return {code, frames};
  },
  extra:(f)=>{
    if(!f.B) return row("a", cells(f.A, {state:f.mark}), "i");
    if(f.alias) return row("a і b", cells(f.A, {state:f.mark}), "i") +
      `<div class="vizrow"><span class="vizlab"></span><div class="steps">обидва імені вказують на цей самий список</div></div>`;
    return row("a", cells(f.A, {}), "i") + row("b", cells(f.B, {state:f.mark}), "j");
  }
});

/* ================= 5. sorted / sort ================= */
createPlayer($id("list-w-sort"), {
  config:`<span class="seg">
      <button data-mode="plain" aria-pressed="true">sorted(nums)</button>
      <button data-mode="rev" aria-pressed="false">reverse=True</button>
      <button data-mode="keylen" aria-pressed="false">key=len</button>
      <button data-mode="inplace" aria-pressed="false">nums.sort()</button>
    </span>`,
  readCfg:(r)=>({mode:modeCfg(r)}),
  build:({mode})=>{
    const words = mode === "keylen";
    const src = words ? ["код", "Python", "як", "цикли"] : [30, 10, 40, 20];
    const size = (x) => words ? String(x).length : x;
    const better = (x, y) => mode === "rev" ? size(x) > size(y) : size(x) < size(y);
    const nameOf = words ? "words" : "nums";

    const code = mode === "plain"
      ? [`nums = [30, 10, 40, 20]`, `res = sorted(nums)`, `print(res)`, `print(nums)   # оригінал цілий`]
      : mode === "rev"
        ? [`nums = [30, 10, 40, 20]`, `res = sorted(nums, reverse=True)`, `print(res)`]
        : mode === "keylen"
          ? [`words = ["код", "Python", "як", "цикли"]`, `res = sorted(words, key=len)`, `print(res)`, `print(words)   # оригінал цілий`]
          : [`nums = [30, 10, 40, 20]`, `x = nums.sort()`, `print(nums)`, `print(x)   # а тут сюрприз`];

    const frames = [], out = [];
    let rest = [...src], res = [];
    const V = () => [{name:nameOf, val:listStr(mode === "inplace" && res.length === src.length ? res : src), cls:"i"}];

    frames.push({line:0, rest:[...rest], res:[], cmp:[], words, vars:V(), out:[],
      note: words
        ? `Чотири слова. Висота стовпчика — це мірка, за якою будемо порівнювати: довжина слова.`
        : `Чотири числа. Висота стовпчика — саме число.`});
    frames.push({line:1, rest:[...rest], res:[], cmp:[], words, vars:V(), out:[],
      note: words
        ? `key=len каже: міряй кожне слово функцією len і порівнюй мірки. Самі слова при цьому не змінюються.`
        : mode === "rev"
          ? `reverse=True перевертає правило порівняння: тепер першим має стояти найбільше.`
          : `Сортування шукає найменший елемент і ставить його першим, потім повторює з рештою.`});

    while(rest.length){
      if(rest.length === 1){
        res.push(rest[0]); rest = [];
        frames.push({line:1, rest:[], res:[...res], cmp:[], words, vars:V(), out:[],
          note:`Лишився один елемент — він просто йде в кінець.`});
        break;
      }
      let best = 0;
      for(let k = 1; k < rest.length; k++){
        const win = better(rest[k], rest[best]);
        frames.push({line:1, rest:[...rest], res:[...res], cmp:[k, best], best, words, vars:V(), out:[],
          note: words
            ? `Порівнюємо "${rest[k]}" (${size(rest[k])} букв) і "${rest[best]}" (${size(rest[best])}) → ${win ? `коротше "${rest[k]}"` : `лишається "${rest[best]}"`}.`
            : `Порівнюємо ${rest[k]} і ${rest[best]} → ${win ? `тепер кандидат ${rest[k]}` : `кандидат лишається ${rest[best]}`}.`});
        if(win) best = k;
      }
      const taken = rest[best];
      rest = rest.filter((_, i) => i !== best);
      res.push(taken);
      frames.push({line:1, rest:[...rest], res:[...res], cmp:[], words, vars:V(), out:[],
        note:`${words ? `"${taken}"` : taken} — ${mode === "rev" ? "найбільший" : "найменший"} серед тих, що лишились. Переносимо його в результат.`});
    }

    if(mode === "inplace"){
      out.push(listStr(res));
      frames.push({line:2, rest:[], res:[...res], cmp:[], words,
        vars:[{name:"nums", val:listStr(res), cls:"i"}, {name:"x", val:"None", cls:"n"}], out:[...out],
        note:`.sort() переписав сам nums — окремого нового списку не з'явилось.`});
      out.push("None");
      frames.push({line:3, rest:[], res:[...res], cmp:[], words, kind:"end",
        vars:[{name:"nums", val:listStr(res), cls:"i"}, {name:"x", val:"None", cls:"n"}], out:[...out],
        note:`А в x лежить None: .sort() нічого не повертає. Ось чому x = nums.sort() — класична пастка.`});
    }else{
      out.push(listStr(res));
      frames.push({line:2, rest:[], res:[...res], cmp:[], words,
        vars:V().concat([{name:"res", val:listStr(res), cls:"j"}]), out:[...out],
        note:`Готово. sorted() повернув НОВИЙ список.`});
      if(mode !== "rev"){
        out.push(listStr(src));
        frames.push({line:3, rest:[], res:[...res], cmp:[], words, kind:"end",
          vars:V().concat([{name:"res", val:listStr(res), cls:"j"}]), out:[...out],
          note:`А оригінал лишився в початковому порядку — sorted() його не чіпає.`});
      }else{
        frames[frames.length - 1].kind = "end";
      }
    }
    return {code, frames};
  },
  extra:(f)=>{
    const mk = (arr, done) => arr.map((v, k)=>({
      label: v, top: f.words ? String(v).length : v,
      size: f.words ? String(v).length : v,
      cls: done ? "done" : (f.cmp && f.cmp.indexOf(k) >= 0 ? (k === f.best ? "now" : "cmp") : "")
    }));
    const mx = Math.max(...(f.words ? ["код", "Python", "як", "цикли"].map(w=>w.length) : [30, 10, 40, 20]));
    return row("лишилось", bars(mk(f.rest, false), mx), "") +
           row("результат", bars(mk(f.res, true), mx), "j");
  },
  legend: legendHtml([["y","порівнюємо"],["p","поточний кандидат"],["g","вже на місці"]])
});

/* ================= 6. map ================= */
createPlayer($id("list-w-map"), {
  config:`<span class="seg">
      <button data-mode="x2" aria-pressed="true">x * 2</button>
      <button data-mode="sq" aria-pressed="false">x ** 2</button>
      <button data-mode="str" aria-pressed="false">str(x)</button>
    </span>`,
  readCfg:(r)=>({mode:modeCfg(r)}),
  build:({mode})=>{
    const nums = [3, 7, 12, 5];
    const f = mode === "x2" ? (x)=>x * 2 : mode === "sq" ? (x)=>x * x : (x)=>`"${x}"`;
    const label = mode === "x2" ? "x * 2" : mode === "sq" ? "x ** 2" : "str(x)";
    const call = mode === "str" ? `map(str, nums)` : `map(lambda x: ${label}, nums)`;
    const code = [`nums = [3, 7, 12, 5]`, `res = list(${call})`, `print(res)`, `print(len(nums), len(res))`];
    const frames = [], out = [], res = [];
    const V = () => [{name:"nums", val:listStr(nums), cls:"i"}];

    frames.push({line:0, nums, res:[], k:-1, label, vars:V(), out:[],
      note:`Чотири числа. map пройде їх зліва направо.`});
    frames.push({line:1, nums, res:[], k:-1, label, vars:V(), out:[],
      note:`map(f, nums) читається як «застосуй f до кожного». Сам по собі map ще нічого не рахує — рахувати змусить list().`});

    nums.forEach((v, k)=>{
      res.push(f(v));
      frames.push({line:1, nums, res:[...res], k, label,
        vars:V().concat([{name:"x", val:String(v), cls:"j"}]), out:[],
        note:`Елемент №${k}: ${v} → ${label.replace(/x/g, String(v))} = ${res[k]}. Результат лягає на ту саму позицію №${k}.`});
    });

    out.push("[" + res.join(", ") + "]");
    frames.push({line:2, nums, res:[...res], k:nums.length, label, vars:V(), out:[...out],
      note:`Новий список готовий. Початковий nums при цьому не змінився — map нічого не переписує.`});
    out.push(`${nums.length} ${res.length}`);
    frames.push({line:3, nums, res:[...res], k:nums.length, label, kind:"end", vars:V(), out:[...out],
      note:`Довжини однакові — і це головна риса map: скільки елементів увійшло, стільки й вийшло.`});
    return {code, frames};
  },
  extra:(f)=>{
    const rows = f.nums.map((v, k)=>({
      n:k, src:String(v),
      out: k < f.res.length ? String(f.res[k]) : "?",
      outCls: k < f.res.length ? "res" : "wait",
      cls: k === f.k ? "on" : (k > f.k ? "off" : "")
    }));
    return `<div class="convtitle">кожен елемент проходить через <b>${esc(f.label)}</b> і лягає на своє ж місце</div>` +
           conveyor(rows, {a:"nums", c:"res"});
  }
});

/* ================= 7. filter ================= */
createPlayer($id("list-w-filter"), {
  config:`<span class="seg">
      <button data-mode="gt" aria-pressed="true">x &gt; 10</button>
      <button data-mode="even" aria-pressed="false">x % 2 == 0</button>
    </span>`,
  readCfg:(r)=>({mode:modeCfg(r)}),
  build:({mode})=>{
    const nums = [3, 12, 7, 20, 5];
    const test = mode === "gt" ? (x)=>x > 10 : (x)=>x % 2 === 0;
    const label = mode === "gt" ? "x > 10" : "x % 2 == 0";
    const code = [`nums = [3, 12, 7, 20, 5]`, `res = list(filter(lambda x: ${label}, nums))`,
                  `print(res)`, `print(len(nums), len(res))`];
    const frames = [], out = [], res = [], verdict = [];
    const V = () => [{name:"nums", val:listStr(nums), cls:"i"}];

    frames.push({line:0, nums, res:[], verdict:[], k:-1, label, vars:V(), out:[],
      note:`П'ять чисел. filter — це сито: воно нічого не змінює, лише вирішує, кого пропустити.`});
    frames.push({line:1, nums, res:[], verdict:[], k:-1, label, vars:V(), out:[],
      note:`Функція всередині filter має відповідати True або False на кожен елемент.`});

    nums.forEach((v, k)=>{
      const ok = test(v);
      verdict.push(ok);
      if(ok) res.push(v);
      frames.push({line:1, nums, res:[...res], verdict:[...verdict], k, label,
        vars:V().concat([{name:"x", val:String(v), cls:"j"}]), out:[],
        note:`Елемент №${k}: ${label.replace(/x/g, String(v))} → ${ok ? "True, проходить далі" : "False, відсіюється"}.`});
    });

    out.push(listStr(res));
    frames.push({line:2, nums, res:[...res], verdict:[...verdict], k:nums.length, label, vars:V(), out:[...out],
      note:`Ті, хто пройшов, лишились у тому самому порядку — filter порядку не міняє.`});
    out.push(`${nums.length} ${res.length}`);
    frames.push({line:3, nums, res:[...res], verdict:[...verdict], k:nums.length, label, kind:"end", vars:V(), out:[...out],
      note:`Було ${nums.length}, лишилось ${res.length}. Ось і різниця: map міняє самі елементи, filter — їхню кількість.`});
    return {code, frames};
  },
  extra:(f)=>{
    const rows = f.nums.map((v, k)=>{
      const decided = k < f.verdict.length;
      return {
        n:k, src:String(v),
        out: decided ? (f.verdict[k] ? "залишити" : "відсіяти") : "?",
        outCls: decided ? (f.verdict[k] ? "res" : "no") : "wait",
        cls: k === f.k ? "on" : (k > f.k ? "off" : "")
      };
    });
    return `<div class="convtitle">кожен елемент перевіряється умовою <b>${esc(f.label)}</b></div>` +
      conveyor(rows, {a:"nums", c:"вердикт"}) +
      `<div style="margin-top:12px">${row("res", cells(f.res, {}), "j")}</div>`;
  }
});

/* ================= 8. списковий вираз ================= */
createPlayer($id("list-w-comp"), {
  config:`<span class="seg">
      <button data-mode="map" aria-pressed="true">як map</button>
      <button data-mode="filter" aria-pressed="false">як filter</button>
      <button data-mode="both" aria-pressed="false">обидва</button>
    </span>`,
  readCfg:(r)=>({mode:modeCfg(r)}),
  build:({mode})=>{
    const nums = [3, 12, 7, 20, 5];
    const hasIf = mode !== "map";
    const hasExpr = mode !== "filter";
    const expr = `[${hasExpr ? "x * 2" : "x"} for x in nums${hasIf ? " if x > 10" : ""}]`;
    const long = mode === "map" ? `list(map(lambda x: x * 2, nums))`
      : mode === "filter" ? `list(filter(lambda x: x > 10, nums))`
      : `list(map(lambda x: x * 2, filter(lambda x: x > 10, nums)))`;
    const code = [`nums = [3, 12, 7, 20, 5]`, `res = ${expr}`, `# те саме довше:`, `# ${long}`, `print(res)`];
    const frames = [], out = [], res = [], marks = [];
    const V = () => [{name:"nums", val:listStr(nums), cls:"i"}];

    frames.push({line:0, nums, res:[], marks:[], k:-1, hasIf, hasExpr, vars:V(), out:[],
      note:`Читати вираз треба з середини: спершу for, потім if, і аж потім те, що стоїть на початку.`});
    frames.push({line:1, nums, res:[], marks:[], k:-1, hasIf, hasExpr, vars:V(), out:[],
      note: mode === "map" ? `Тут if немає — значить, у результат піде кожен елемент, просто перетворений.`
        : mode === "filter" ? `Тут на початку стоїть просто x — значить, елементи не змінюються, лише відбираються.`
        : `Тут працюють обидві частини: спершу відбір за if, потім перетворення того, що пройшло.`});

    nums.forEach((v, k)=>{
      const pass = hasIf ? v > 10 : true;
      marks.push(pass ? (hasExpr ? v * 2 : v) : null);
      if(pass) res.push(hasExpr ? v * 2 : v);
      frames.push({line:1, nums, res:[...res], marks:[...marks], k, hasIf, hasExpr,
        vars:V().concat([{name:"x", val:String(v), cls:"j"}]), out:[],
        note: !pass ? `x = ${v}: умова x > 10 хибна — елемент навіть не доходить до перетворення.`
          : hasExpr ? `x = ${v}${hasIf ? ": умова істинна" : ""} → у результат кладемо ${v} * 2 = ${v * 2}.`
          : `x = ${v}: умова істинна → у результат іде сам ${v}, без змін.`});
    });

    out.push(listStr(res));
    frames.push({line:4, nums, res:[...res], marks:[...marks], k:nums.length, hasIf, hasExpr, kind:"end",
      vars:V().concat([{name:"res", val:listStr(res), cls:"j"}]), out:[...out],
      note:`Один рядок зробив те саме, що ${mode === "both" ? "map і filter разом" : mode === "map" ? "map" : "filter"} — і читається помітно легше.`});
    return {code, frames};
  },
  extra:(f)=>{
    const rows = f.nums.map((v, k)=>{
      const decided = k < f.marks.length;
      const val = decided ? f.marks[k] : undefined;
      return {
        n:k, src:String(v),
        out: !decided ? "?" : (val === null ? "if не пройшов" : String(val)),
        outCls: !decided ? "wait" : (val === null ? "no" : "res"),
        cls: k === f.k ? "on" : (k > f.k ? "off" : "")
      };
    });
    return `<div class="convtitle">${f.hasIf ? "спершу умова <b>if x > 10</b>" : "умови немає — проходять усі"}${f.hasExpr ? ", потім вираз <b>x * 2</b>" : ", вираз просто повертає сам x"}</div>` +
      conveyor(rows, {a:"nums", c:"що піде в res"}) +
      `<div style="margin-top:12px">${row("res", cells(f.res, {}), "j")}</div>`;
  }
});

/* ================= 9. sum / min / max / len ================= */
createPlayer($id("list-w-agg"), {
  config:`<span class="seg">
      <button data-mode="sum" aria-pressed="true">sum</button>
      <button data-mode="min" aria-pressed="false">min</button>
      <button data-mode="max" aria-pressed="false">max</button>
      <button data-mode="len" aria-pressed="false">len</button>
    </span>`,
  readCfg:(r)=>({mode:modeCfg(r)}),
  build:({mode})=>{
    const nums = [12, 5, 20, 8];
    const head = `nums = [12, 5, 20, 8]`;
    const code = mode === "sum"
      ? [head, `total = 0`, `for x in nums:`, `    total = total + x`, `print(total)   # те саме, що sum(nums)`]
      : mode === "len"
        ? [head, `n = 0`, `for x in nums:`, `    n = n + 1`, `print(n)   # те саме, що len(nums)`]
        : [head, `best = nums[0]`, `for x in nums:`, `    if x ${mode === "min" ? "<" : ">"} best:`,
           `        best = x`, `print(best)   # те саме, що ${mode}(nums)`];

    const accName = mode === "sum" ? "total" : mode === "len" ? "n" : "best";
    const lastLine = mode === "sum" || mode === "len" ? 4 : 5;
    let acc = mode === "sum" ? 0 : mode === "len" ? 0 : nums[0];
    const frames = [], out = [];
    const V = () => [{name:"nums", val:listStr(nums), cls:"i"}, {name:accName, val:String(acc), cls:"j"}];

    frames.push({line:0, nums, k:-1, acc, accName, mode, vars:[{name:"nums", val:listStr(nums), cls:"i"}], out:[],
      note:`Вбудована функція ${mode}() всередині робить рівно те, що показано в коді — звичайний цикл із накопичувачем.`});
    frames.push({line:1, nums, k:-1, acc, accName, mode, vars:V(), out:[],
      note: mode === "sum" ? `Починаємо з нуля: до порожньої суми додавати ще нічого.`
        : mode === "len" ? `Лічильник починається з нуля.`
        : `За початкове найкраще беремо перший елемент — інакше нема з чим порівнювати. Саме тому ${mode}([]) падає з ValueError.`});

    nums.forEach((v, k)=>{
      frames.push({line:2, nums, k, acc, accName, mode,
        vars:V().concat([{name:"x", val:String(v), cls:"i"}]), out:[],
        note:`Крок ${k + 1}: беремо ${v}.`});
      let msg;
      if(mode === "sum"){ acc += v; msg = `${acc - v} + ${v} = ${acc}.`; }
      else if(mode === "len"){ acc += 1; msg = `Значення нас не цікавить — важливий лише факт, що елемент був. Лічильник: ${acc}.`; }
      else {
        const win = mode === "min" ? v < acc : v > acc;
        msg = win ? `${v} ${mode === "min" ? "менше" : "більше"} за ${acc} — новий рекорд.`
                  : `${v} не ${mode === "min" ? "менше" : "більше"} за ${acc} — рекорд лишається.`;
        if(win) acc = v;
      }
      frames.push({line:3, nums, k, acc, accName, mode, hit:true,
        vars:V().concat([{name:"x", val:String(v), cls:"i"}]), out:[], note:msg});
    });

    out.push(String(acc));
    frames.push({line:lastLine, nums, k:nums.length, acc, accName, mode, kind:"end", vars:V(), out:[...out],
      note:`Увесь список згорнувся в одне число: ${acc}. Саме це й повертає ${mode}(nums) — тільки одним словом.`});
    return {code, frames};
  },
  extra:(f)=>{
    const st = {}; if(f.k >= 0 && f.k < f.nums.length) st[f.k] = f.hit ? "hit" : "now";
    return row("nums", cells(f.nums, {state:st}), "i") +
      `<div class="accrow"><span class="acclab">${esc(f.accName)} =</span>` +
      `<span class="accbox">${esc(String(f.acc))}</span></div>`;
  }
});

/* ================= 10. any / all ================= */
createPlayer($id("list-w-anyall"), {
  config:`<span class="seg">
      <button data-mode="any" aria-pressed="true">any</button>
      <button data-mode="all" aria-pressed="false">all</button>
    </span>`,
  readCfg:(r)=>({mode:modeCfg(r)}),
  build:({mode})=>{
    const nums = [7, 12, 3, 20];
    const isAny = mode === "any";
    const code = [`nums = [7, 12, 3, 20]`, `print(${mode}(x > 10 for x in nums))`];
    const frames = [], out = [], marks = [];
    const V = [{name:"nums", val:listStr(nums), cls:"i"}];

    frames.push({line:0, nums, marks:[], k:-1, res:null, isAny, vars:V, out:[],
      note: isAny
        ? `any питає: «чи знайдеться хоч один, для якого умова істинна?»`
        : `all питає: «чи для ВСІХ умова істинна?»`});

    let res = isAny ? false : true, stoppedAt = -1;
    for(let k = 0; k < nums.length; k++){
      const ok = nums[k] > 10;
      marks.push(ok);
      const finish = isAny ? ok : !ok;
      frames.push({line:1, nums, marks:[...marks], k, res:finish ? (isAny ? true : false) : null, isAny,
        vars:V.concat([{name:"x", val:String(nums[k]), cls:"j"}]), out:[],
        note:`${nums[k]} > 10 → ${ok ? "True" : "False"}. ${
          finish
            ? (isAny ? `Цього досить: хоча б один знайшовся, відповідь уже True.`
                     : `Цього досить: знайшовся той, для кого умова хибна, відповідь уже False.`)
            : (isAny ? `Ще не знайшли — дивимось далі.` : `Поки що все підходить — перевіряємо далі.`)}`});
      if(finish){ res = isAny; stoppedAt = k; break; }
    }

    out.push(res ? "True" : "False");
    frames.push({line:1, nums, marks:[...marks], k:stoppedAt, res, isAny, kind:"end", done:true, vars:V, out:[...out],
      note: stoppedAt >= 0 && stoppedAt < nums.length - 1
        ? `Відповідь ${res ? "True" : "False"}. Зверни увагу: елементи після №${stoppedAt} Python навіть не дивився — ${mode} зупиняється, щойно відповідь стає зрозумілою.`
        : `Відповідь ${res ? "True" : "False"} — довелось перевірити весь список.`});
    return {code, frames};
  },
  extra:(f)=>{
    const st = {};
    f.nums.forEach((v, k)=>{
      if(k < f.marks.length) st[k] = f.marks[k] ? "hit" : "drop";
      else st[k] = "dim";
      if(k === f.k && !f.done) st[k] = f.marks[k] ? "hit" : "warn";
    });
    return row("nums", cells(f.nums, {state:st}), "i") +
      `<div class="accrow"><span class="acclab">${f.isAny ? "any" : "all"}(...) =</span>` +
      `<span class="accbox ${f.res === null ? "wait" : (f.res ? "" : "stop")}">${f.res === null ? "поки невідомо" : (f.res ? "True" : "False")}</span>` +
      `<span class="steps">перевірено: <b>${f.marks.length}</b> з ${f.nums.length}</span></div>`;
  },
  legend: legendHtml([["g","умова істинна"],["r","умова хибна"],["p","ще не перевіряли"]])
});

/* ================= 11. enumerate / zip ================= */
createPlayer($id("list-w-zip"), {
  config:`<span class="seg">
      <button data-mode="enum" aria-pressed="true">enumerate</button>
      <button data-mode="zip" aria-pressed="false">zip</button>
    </span>`,
  readCfg:(r)=>({mode:modeCfg(r)}),
  build:({mode})=>{
    const names = ["Оля", "Іван", "Ніна"];
    const ages = [16, 15];
    const isEnum = mode === "enum";
    const code = isEnum
      ? [`names = ["Оля", "Іван", "Ніна"]`, `for i, name in enumerate(names, 1):`, `    print(i, name)`]
      : [`names = ["Оля", "Іван", "Ніна"]`, `ages = [16, 15]`, `for name, age in zip(names, ages):`,
         `    print(name, age)`, `print("Ніна лишилась без пари")`];
    const frames = [], out = [];
    const V = isEnum ? [{name:"names", val:listStr(names), cls:"i"}]
      : [{name:"names", val:listStr(names), cls:"i"}, {name:"ages", val:listStr(ages), cls:"j"}];
    const loopLine = isEnum ? 1 : 2, bodyLine = isEnum ? 2 : 3;

    frames.push({line:0, names, ages, k:-1, isEnum, vars:V, out:[],
      note: isEnum
        ? `enumerate віддає одразу пару: номер і сам елемент. Другий аргумент 1 каже почати нумерацію з одиниці.`
        : `Два списки різної довжини — три імені й два віки.`});
    if(!isEnum) frames.push({line:1, names, ages, k:-1, isEnum, vars:V, out:[],
      note:`zip зшиває їх у пари: перший з першим, другий з другим.`});

    const n = isEnum ? names.length : Math.min(names.length, ages.length);
    for(let k = 0; k < n; k++){
      const vv = isEnum
        ? [{name:"i", val:String(k + 1), cls:"n"}, {name:"name", val:`"${names[k]}"`, cls:"i"}]
        : [{name:"name", val:`"${names[k]}"`, cls:"i"}, {name:"age", val:String(ages[k]), cls:"j"}];
      frames.push({line:loopLine, names, ages, k, isEnum, vars:V.concat(vv), out:[...out],
        note: isEnum
          ? `Крок ${k + 1}: у i лягає ${k + 1}, у name — "${names[k]}". Окремий лічильник не потрібен.`
          : `Пара ${k + 1}: "${names[k]}" ↔ ${ages[k]}. Обидві змінні заповнились одночасно.`});
      out.push(isEnum ? `${k + 1} ${names[k]}` : `${names[k]} ${ages[k]}`);
      frames.push({line:bodyLine, names, ages, k, isEnum, hit:true, vars:V.concat(vv), out:[...out],
        note:`Друкуємо й повертаємось по наступн${isEnum ? "ий елемент" : "у пару"}.`});
    }

    if(isEnum){
      frames.push({line:loopLine, names, ages, k:names.length, isEnum, kind:"end", vars:V, out:[...out],
        note:`Елементи закінчились. Порівняй із for i in range(len(names)) — enumerate робить те саме, але без зайвої арифметики.`});
    }else{
      frames.push({line:loopLine, names, ages, k:n, isEnum, vars:V, out:[...out],
        note:`Віки закінчились — і zip зупиняється. "Ніна" лишилась без пари й у цикл просто не потрапила.`});
      out.push("Ніна лишилась без пари");
      frames.push({line:4, names, ages, k:n, isEnum, kind:"end", vars:V, out:[...out],
        note:`Жодної помилки при цьому не було. Тому перед zip варто перевіряти довжини, якщо втрата даних для тебе критична.`});
    }
    return {code, frames};
  },
  extra:(f)=>{
    if(f.isEnum){
      const st = {}; if(f.k >= 0 && f.k < f.names.length) st[f.k] = f.hit ? "hit" : "now";
      return row("names", cells(f.names, {state:st}), "i") +
        `<div class="accrow"><span class="acclab">i =</span><span class="accbox ${f.k >= 0 && f.k < f.names.length ? "" : "wait"}">${f.k >= 0 && f.k < f.names.length ? f.k + 1 : "—"}</span>` +
        `<span class="steps">нумерація почалась з 1</span></div>`;
    }
    const s1 = {}, s2 = {};
    f.names.forEach((v, k)=>{ if(k >= f.ages.length) s1[k] = "dim"; });
    if(f.k >= 0 && f.k < f.ages.length){ s1[f.k] = f.hit ? "hit" : "now"; s2[f.k] = f.hit ? "hit" : "now"; }
    return row("names", cells(f.names, {state:s1}), "i") +
           row("ages", cells(f.ages, {state:s2}), "j") +
           `<div class="steps" style="padding-left:88px">пар буде стільки, скільки в коротшому списку — ${Math.min(f.names.length, f.ages.length)}</div>`;
  }
});

/* ================= hero ================= */
(function(){
  const box = document.getElementById("list-heroBox");
  const line = document.getElementById("list-heroLine");
  const btn = document.getElementById("list-heroBtn");
  if(!box) return;
  const nums = [10, 20, 30, 40];
  /* Тільки невід'ємні індекси: від'ємні вводяться нижче, у розділі
     «Пронумеровані комірки», де їх одразу й пояснюють. 3 і 7 показують межу —
     останній індекс чотирьох комірок дорівнює 3, а не 4. */
  const Q = [0, 2, 3, 7];
  let t = null;
  function draw(mark){ box.innerHTML = cells(nums, {state:mark}); }
  function run(){
    clearInterval(t);
    draw({});
    let k = 0;
    t = setInterval(()=>{
      if(k >= Q.length){
        clearInterval(t); draw({});
        line.innerHTML = `у списку шукають за <b>номером комірки</b>, а не за іменем`;
        return;
      }
      const i = Q[k];
      if(i < nums.length){
        draw({[i]:"hit"});
        line.innerHTML = `nums[${i}] → <b>${nums[i]}</b>`;
      }else{
        draw({});
        line.innerHTML = `nums[${i}] → <b>IndexError</b> — такої комірки немає`;
      }
      k++;
    }, 1200);
  }
  btn.onclick = run;
  draw({});
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
