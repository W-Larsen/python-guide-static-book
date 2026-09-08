"use strict";
window.PageInit["vars"] = function(){
const R = (n) => Array.from({length:n}, (_,k)=>k);
const esc = (s) => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

/* дуже проста підсвітка синтаксису */
function hl(line){
  let s = esc(line);
  const lits = [];
  s = s.replace(/"[^"]*"/g, m => { lits.push(m); return "\u0001" + String.fromCharCode(65 + lits.length - 1) + "\u0001"; });
  s = s.replace(/\b(for|in|while|elif|if|break|continue|else|not|and|or|True|False|int|str|float|type)\b/g, '<span class="kw">$1</span>');
  s = s.replace(/\b(print|input|range|len|end|sep)\b/g, '<span class="fn">$1</span>');
  s = s.replace(/\b(\d+)\b/g, '<span class="num">$1</span>');
  s = s.replace(/\u0001([A-Z])\u0001/g, (m,k) => `<span class="lit">${lits[k.charCodeAt(0)-65]}</span>`);
  return s;
}

/* ================= player ================= */
const createPlayer = window.CollKit.makePlayer({ hl, tick:620 });
const { numCfg, modeCfg } = window.CollKit;

/* ================= рендер коробок ================= */
function drawBoxes(list, hint){
  if(!list) return "";
  const html = `<div class="boxes">${list.map(b=>`
    <div class="boxwrap ${b.appear?"appear":""}">
      ${b.copy!=null?`<div class="copy">${esc(b.copy)}</div>`:""}
      <div class="box ${b.val==null?"empty":""} ${b.active?"active":""} ${b.reading?"reading":""} ${b.changed?"changed":""}">
        ${b.ghost!=null?`<span class="ghost">${esc(b.ghost)}</span>`:""}
        <span class="val ${b.val==null?"none":""}">${b.val==null?"порожня":esc(b.val)}</span>
      </div>
      <div class="boxname">${esc(b.name)}</div>
      ${b.type?`<div class="boxtype">${esc(b.type)}</div>`:""}
    </div>`).join("")}</div>`;
  return html + (hint?`<div class="boxhint">${esc(hint)}</div>`:"");
}
const typeOf = (v) => typeof v === "string" ? "str" : (Number.isInteger(v) ? "int" : "float");
const show = (v) => typeof v === "string" ? `"${v}"` : String(v);

/* ================= 1. присвоєння і перезапис ================= */
createPlayer(document.getElementById("vars-w-assign"), {
  build:()=>{
    const code=[`name = "Оля"`,`age = 15`,`age = 16`,`print(name, "має", age)`];
    const frames=[], out=[];
    const B=(o)=>Object.assign({name:"", val:null, type:""}, o);
    frames.push({line:0, vars:[], out:[], boxes:[], hint:"Поки що жодної коробки не існує.",
      note:"Порожня пам'ять. Кожне присвоєння створюватиме нову коробку."});
    frames.push({line:0, vars:[{name:"name",val:'"Оля"',cls:"i"}], out:[],
      boxes:[B({name:"name", val:'"Оля"', type:"str", appear:true, active:true, changed:true})],
      hint:"Коробка створюється в момент першого присвоєння.",
      note:'Створюємо коробку name і кладемо в неї рядок "Оля".'});
    frames.push({line:1, vars:[{name:"name",val:'"Оля"',cls:"i"},{name:"age",val:15,cls:"j"}], out:[],
      boxes:[B({name:"name", val:'"Оля"', type:"str"}), B({name:"age", val:"15", type:"int", appear:true, active:true, changed:true})],
      hint:"Друга коробка. Імена різні, тож вони не заважають одна одній.",
      note:"Друга коробка: age = 15."});
    frames.push({line:2, vars:[{name:"name",val:'"Оля"',cls:"i"},{name:"age",val:16,cls:"j"}], out:[],
      boxes:[B({name:"name", val:'"Оля"', type:"str"}), B({name:"age", val:"16", type:"int", active:true, changed:true, ghost:"15"})],
      hint:"П'ятнадцять випадає з коробки й зникає — повернути його вже неможливо.",
      note:"Нове значення витісняє старе. Коробка та сама, вміст інший."});
    out.push("Оля має 16");
    frames.push({line:3, vars:[{name:"name",val:'"Оля"',cls:"i"},{name:"age",val:16,cls:"j"}], out:[...out],
      boxes:[B({name:"name", val:'"Оля"', type:"str", reading:true, copy:"Оля"}), B({name:"age", val:"16", type:"int", reading:true, copy:"16"})],
      kind:"inner",
      hint:"Назовні пішли копії. У коробках усе лишилось на місці.",
      note:"print дістає копію вмісту й друкує. Пам'ять при цьому не змінюється."});
    frames.push({line:3, vars:[{name:"name",val:'"Оля"',cls:"i"},{name:"age",val:16,cls:"j"}], out:[...out],
      boxes:[B({name:"name", val:'"Оля"', type:"str"}), B({name:"age", val:"16", type:"int"})],
      kind:"end", hint:"Коробки повні — читання їх не спорожнює.",
      note:"Програма завершена, обидві змінні на місці."});
    return {code, frames};
  },
  extra:(f)=>drawBoxes(f.boxes, f.hint)
});

/* ================= 2. b = a ================= */
createPlayer(document.getElementById("vars-w-copy"), {
  build:()=>{
    const code=[`a = 5`,`b = a`,`a = 9`,`print(a, b)`];
    const F=(a,b,opts={})=>[
      {name:"a", val:a==null?null:String(a), type:a==null?"":"int", ...(opts.a||{})},
      {name:"b", val:b==null?null:String(b), type:b==null?"":"int", ...(opts.b||{})}
    ];
    const frames=[];
    frames.push({line:0, vars:[{name:"a",val:5,cls:"i"}], out:[],
      boxes:F(5,null,{a:{appear:true, active:true, changed:true}}),
      hint:"Коробка b поки не існує — показана пунктиром.",
      note:"Кладемо 5 у коробку a."});
    frames.push({line:1, vars:[{name:"a",val:5,cls:"i"},{name:"b",val:5,cls:"j"}], out:[],
      boxes:F(5,5,{a:{reading:true, copy:"5"}, b:{appear:true, changed:true, active:true}}),
      kind:"inner",
      hint:"З коробки a вийшла копія п'ятірки й лягла в b. Сама п'ятірка з a нікуди не поділась.",
      note:"b = a — копіюємо вміст, а не зв'язуємо коробки."});
    frames.push({line:2, vars:[{name:"a",val:9,cls:"i"},{name:"b",val:5,cls:"j"}], out:[],
      boxes:F(9,5,{a:{active:true, changed:true, ghost:"5"}}),
      hint:"Змінилась лише коробка a. b про це навіть не знає.",
      note:"Записуємо в a дев'ятку. Що станеться з b?"});
    frames.push({line:3, vars:[{name:"a",val:9,cls:"i"},{name:"b",val:5,cls:"j"}], out:["9 5"],
      boxes:F(9,5,{a:{reading:true, copy:"9"}, b:{reading:true, copy:"5"}}), kind:"end",
      hint:"Дев'ять і п'ять. Коробки незалежні.",
      note:"b досі зберігає стару копію — 5."});
    return {code, frames};
  },
  extra:(f)=>drawBoxes(f.boxes, f.hint)
});

/* ================= 3. обмін значень ================= */
createPlayer(document.getElementById("vars-w-swap"), {
  config:`<span class="seg">
      <button data-mode="ok" aria-pressed="true">Через temp</button>
      <button data-mode="bad" aria-pressed="false">Навпростець</button>
    </span>`,
  readCfg:(r)=>({mode:modeCfg(r)}),
  build:({mode})=>{
    const B=(x,y,t,opts={})=>{
      const arr=[
        {name:"x", val:x==null?null:String(x), type:x==null?"":"int", ...(opts.x||{})},
        {name:"y", val:y==null?null:String(y), type:y==null?"":"int", ...(opts.y||{})}
      ];
      if(mode==="ok") arr.push({name:"temp", val:t==null?null:String(t), type:t==null?"":"int", ...(opts.t||{})});
      return arr;
    };
    const V=(x,y)=>[{name:"x",val:x,cls:"i"},{name:"y",val:y,cls:"j"}];
    const frames=[];
    if(mode==="ok"){
      const code=[`x = 1`,`y = 2`,`temp = x`,`x = y`,`y = temp`,`print(x, y)`];
      frames.push({line:1, vars:V(1,2), out:[], boxes:B(1,2,null,{x:{appear:true},y:{appear:true}}),
        hint:"Стартові значення. Мета — щоб у x стало 2, а в y — 1.",
        note:"Дві коробки з числами. Третя, temp, поки порожня."});
      frames.push({line:2, vars:V(1,2), out:[], boxes:B(1,2,1,{x:{reading:true, copy:"1"}, t:{appear:true, changed:true, active:true}}),
        kind:"inner",
        hint:"Копія одинички відкладена вбік. Тепер її можна не боятись втратити.",
        note:"Зберігаємо копію x у тимчасовій коробці temp."});
      frames.push({line:3, vars:V(2,2), out:[], boxes:B(2,2,1,{x:{changed:true, active:true, ghost:"1"}, y:{reading:true, copy:"2"}}),
        hint:"Одиничка в x затерта — але вона є в temp.",
        note:"Кладемо в x вміст y."});
      frames.push({line:4, vars:V(2,1), out:[], boxes:B(2,1,1,{y:{changed:true, active:true, ghost:"2"}, t:{reading:true, copy:"1"}}),
        hint:"Дістаємо одиничку з temp і кладемо в y.",
        note:"Повертаємо збережене значення в y. Обмін завершено."});
      frames.push({line:5, vars:V(2,1), out:["2 1"], boxes:B(2,1,1), kind:"end",
        hint:"Значення помінялись місцями. temp зробив свою роботу.",
        note:"Виводимо результат: 2 1."});
      return {code, frames};
    }
    const code=[`x = 1`,`y = 2`,`x = y`,`y = x`,`print(x, y)`];
    frames.push({line:1, vars:V(1,2), out:[], boxes:B(1,2,null,{x:{appear:true},y:{appear:true}}),
      hint:"Ті самі стартові значення.",
      note:"Спробуємо обмін без третьої коробки."});
    frames.push({line:2, vars:V(2,2), out:[], boxes:B(2,2,null,{x:{changed:true, active:true, ghost:"1"}, y:{reading:true, copy:"2"}}),
      hint:"Одиничка щойно зникла назавжди — її копії ніде немає.",
      note:"x = y. Двійка перезаписала одиничку в коробці x."});
    frames.push({line:3, vars:V(2,2), out:[], boxes:B(2,2,null,{y:{changed:true, active:true, ghost:"2"}, x:{reading:true, copy:"2"}}),
      hint:"У обох коробках тепер двійка.",
      note:"y = x. Але в x уже лежить двійка, тому в y приїжджає вона ж."});
    frames.push({line:4, vars:V(2,2), out:["2 2"], boxes:B(2,2,null), kind:"end",
      hint:"Обмін не вийшов: одне зі значень втрачене.",
      note:"Результат 2 2 замість 2 1. Ось навіщо потрібна temp."});
    return {code, frames};
  },
  extra:(f)=>drawBoxes(f.boxes, f.hint)
});

/* ================= 4. імена змінних ================= */
(function(){
  const root = document.getElementById("vars-w-names");
  root.innerHTML = `
    <div class="sandbox">
      <input type="text" id="vars-nm-in" value="user_age" spellcheck="false">
      <span class="arrow">→</span>
      <span id="vars-nm-res"></span>
    </div>
    <div class="sandbox-note" id="vars-nm-note"></div>`;
  const inp=root.querySelector("#vars-nm-in"), res=root.querySelector("#vars-nm-res"), note=root.querySelector("#vars-nm-note");
  const reserved = ["if","else","elif","for","while","in","print","input","and","or","not","True","False","import","def","return","class","break","continue","int","str","list"];
  function upd(){
    const v = inp.value.trim();
    let ok=true, why="";
    if(!v){ ok=false; why="Ім'я не може бути порожнім."; }
    else if(/^\d/.test(v)){ ok=false; why="Ім'я не може починатися з цифри."; }
    else if(/\s/.test(v)){ ok=false; why="Пробіли заборонені — використовуй нижнє підкреслення: user_age."; }
    else if(/-/.test(v)){ ok=false; why="Дефіс Python сприйме як мінус. Заміни на підкреслення."; }
    else if(!/^[A-Za-zА-Яа-яЇїІіЄєҐґ_][A-Za-zА-Яа-яЇїІіЄєҐґ0-9_]*$/.test(v)){ ok=false; why="Дозволені лише літери, цифри й нижнє підкреслення."; }
    else if(reserved.includes(v)){ ok=false; why=`«${v}» — службове слово Python, зайняти його не можна.`; }
    else if(v.length<=2){ ok=true; why="Технічно можна, але за таким іменем неясно, що всередині. Краще довше."; }
    else why="Годиться: зрозуміло, що лежить у коробці.";
    res.innerHTML = ok ? `<span class="verdict-ok">так, можна</span>` : `<span class="verdict-bad">так не можна</span>`;
    note.textContent = why;
  }
  inp.addEventListener("input", upd);
  upd();
})();

/* ================= 5. print ================= */
createPlayer(document.getElementById("vars-w-print"), {
  build:()=>{
    const code=[
      `print("Привіт", "світе")`,
      `print("Привіт" + "світе")`,
      `print("Привіт", "світе", sep="-")`,
      `print(2 + 3)`,
      `print("2 + 3")`,
      `print("А", end=" ")`,
      `print("Б")`
    ];
    const notes=[
      "Кома між значеннями сама додає пробіл. Це найзручніший спосіб виводити кілька речей.",
      "Плюс склеює рядки впритул, без пробілу. Часта причина злиплого тексту.",
      "sep задає власний роздільник замість пробілу.",
      "Без лапок Python бачить приклад і рахує його: виводиться 5.",
      "У лапках це просто текст. Python не рахує те, що всередині лапок.",
      "end замінює перехід на новий рядок. Наступний print продовжить цей самий рядок.",
      "Тому «А» і «Б» опинились поруч, а не одне під одним."
    ];
    const results=["Привіт світе","Привітсвіте","Привіт-світе","5","2 + 3","А ","Б"];
    const out=[], frames=[];
    frames.push({line:0, vars:[], out:[], note:"Сім рядків виводу з дрібними, але важливими відмінностями."});
    results.forEach((r,k)=>{
      if(k===6) out[out.length-1] = out[out.length-1] + r;
      else out.push(r);
      frames.push({line:k, vars:[], out:[...out], note:notes[k], kind:k===6?"end":""});
    });
    return {code, frames};
  }
});

/* ================= 6. типи ================= */
createPlayer(document.getElementById("vars-w-types"), {
  config:`<span class="seg">
      <button data-mode="num" aria-pressed="true">Числа</button>
      <button data-mode="str" aria-pressed="false">Рядки</button>
      <button data-mode="mix" aria-pressed="false">Мішанина</button>
    </span>`,
  readCfg:(r)=>({mode:modeCfg(r)}),
  build:({mode})=>{
    const cfg = {
      num:{a:2, b:3, av:"2", bv:"3", at:"int", bt:"int", res:"5",
        note:"Два числа. Плюс для чисел означає додавання: 2 + 3 = 5."},
      str:{a:'"2"', b:'"3"', av:'"2"', bv:'"3"', at:"str", bt:"str", res:"23",
        note:"Ті самі цифри, але в лапках. Для рядків плюс означає склеювання: виходить 23."},
      mix:{a:'"2"', b:3, av:'"2"', bv:"3", at:"str", bt:"int", res:null,
        note:"Рядок і число. Python не вгадуватиме, чого ти хотів, і зупиняє програму з помилкою."}
    }[mode];
    const code=[`a = ${cfg.a}`,`b = ${cfg.b}`,`print(a + b)`];
    const boxes=(o={})=>[
      {name:"a", val:cfg.av, type:cfg.at, ...(o.a||{})},
      {name:"b", val:cfg.bv, type:cfg.bt, ...(o.b||{})}
    ];
    const frames=[];
    frames.push({line:0, vars:[], out:[], boxes:[{name:"a", val:cfg.av, type:cfg.at, appear:true, changed:true, active:true},{name:"b", val:null, type:""}],
      hint:"Під коробкою підписано тип вмісту.",
      note:`У коробку a кладемо ${cfg.at==="str"?"рядок":"число"} ${cfg.av}.`});
    frames.push({line:1, vars:[], out:[], boxes:boxes({b:{appear:true, changed:true, active:true}}),
      hint:"Лапки — це не частина значення, а позначка «це текст».",
      note:`У коробку b кладемо ${cfg.bt==="str"?"рядок":"число"} ${cfg.bv}.`});
    if(cfg.res){
      frames.push({line:2, vars:[], out:[cfg.res], boxes:boxes({a:{reading:true, copy:cfg.av}, b:{reading:true, copy:cfg.bv}}),
        kind:"end", hint:cfg.at==="str"?"Плюс склеїв два рядки в один.":"Плюс додав два числа.",
        note:cfg.note});
    } else {
      frames.push({line:2, vars:[], out:['TypeError: can only concatenate str (not "int") to str'],
        boxes:boxes({a:{reading:true, copy:cfg.av}, b:{reading:true, copy:cfg.bv}}), kind:"end",
        hint:'Виправлення: int(a) + b дасть 5, а a + str(b) дасть "23".',
        note:cfg.note});
    }
    return {code, frames};
  },
  extra:(f)=>drawBoxes(f.boxes, f.hint)
});

/* ================= 7. input ================= */
createPlayer(document.getElementById("vars-w-input"), {
  config:`<span class="seg">
      <button data-mode="int" aria-pressed="true">З int()</button>
      <button data-mode="raw" aria-pressed="false">Без int()</button>
    </span>
    <label>вводять ім'я <input type="text" data-cfg id="vars-in-n" value="Оля" spellcheck="false"></label>
    <label>вводять вік <input type="text" data-cfg id="vars-in-a" value="16" spellcheck="false"></label>`,
  readCfg:(r)=>({
    mode:modeCfg(r),
    n:r.querySelector("#vars-in-n").value || "Оля",
    a:r.querySelector("#vars-in-a").value || "16"
  }),
  build:({mode,n,a})=>{
    const conv = mode==="int";
    const code=[
      `name = input("Як тебе звати? ")`,
      conv ? `age = int(input("Скільки тобі років? "))` : `age = input("Скільки тобі років? ")`,
      `print("Привіт,", name)`,
      `print("Через рік тобі буде", age + 1)`
    ];
    const numeric = /^-?\d+$/.test(a.trim());
    const out=[], frames=[];
    const bx=(o)=>o;
    frames.push({line:0, vars:[], out:['Як тебе звати? ▮'], boxes:[{name:"name", val:null},{name:"age", val:null}],
      hint:"Обидві коробки поки порожні.",
      note:"Текст у дужках друкується як підказка, і програма завмирає. Вона нічого не робить, поки не натиснуть Enter."});
    out.push(`Як тебе звати? ${n}`);
    frames.push({line:0, vars:[{name:"name",val:`"${n}"`,cls:"i"}], out:[...out],
      boxes:[{name:"name", val:`"${n}"`, type:"str", appear:true, changed:true, active:true},{name:"age", val:null}],
      hint:"Набране лягло в коробку — обов'язково як рядок.",
      note:`Користувач ввів ${n} і натиснув Enter. Значення потрапляє в коробку name.`});
    frames.push({line:1, vars:[{name:"name",val:`"${n}"`,cls:"i"}], out:[...out, 'Скільки тобі років? ▮'],
      boxes:[{name:"name", val:`"${n}"`, type:"str"},{name:"age", val:null, active:true}],
      note:"Друга зупинка. Знову чекаємо на введення."});
    out.push(`Скільки тобі років? ${a}`);
    frames.push({line:1, vars:[{name:"name",val:`"${n}"`,cls:"i"},{name:"age",val:`"${a}"`,cls:"j"}], out:[...out],
      boxes:[{name:"name", val:`"${n}"`, type:"str"},{name:"age", val:`"${a}"`, type:"str", appear:true, changed:true, active:true}],
      hint:"Зверни увагу на лапки й підпис str — це ще не число.",
      note:`Ввели ${a}. У коробку падає рядок "${a}", навіть якщо там самі цифри.`});
    if(conv){
      if(numeric){
        frames.push({line:1, vars:[{name:"name",val:`"${n}"`,cls:"i"},{name:"age",val:Number(a),cls:"j"}], out:[...out],
          boxes:[{name:"name", val:`"${n}"`, type:"str"},{name:"age", val:String(Number(a)), type:"int", changed:true, active:true, ghost:`"${a}"`}],
          kind:"inner", hint:"Лапки зникли, тип змінився на int. Тепер з цим можна рахувати.",
          note:"int() бере рядок і повертає число. Саме воно й лягає в коробку."});
      } else {
        frames.push({line:1, vars:[], out:[...out, `ValueError: invalid literal for int() with base 10: '${a}'`],
          boxes:[{name:"name", val:`"${n}"`, type:"str"},{name:"age", val:null, active:true}],
          kind:"end", hint:"Спробуй ввести у поле вік звичайне число.",
          note:`У рядку "${a}" немає цілого числа, тож int() не впорався і програма зупинилась.`});
        return {code, frames};
      }
    }
    out.push(`Привіт, ${n}`);
    frames.push({line:2, vars:[], out:[...out],
      boxes:[{name:"name", val:`"${n}"`, type:"str", reading:true, copy:n},{name:"age", val:conv?String(Number(a)):`"${a}"`, type:conv?"int":"str"}],
      note:"Друкуємо привітання. Кома між значеннями сама додала пробіл."});
    if(conv){
      out.push(`Через рік тобі буде ${Number(a)+1}`);
      frames.push({line:3, vars:[], out:[...out],
        boxes:[{name:"name", val:`"${n}"`, type:"str"},{name:"age", val:String(Number(a)), type:"int", reading:true, copy:String(Number(a))}],
        kind:"end", hint:"Арифметика працює, бо в коробці справжнє число.",
        note:`age + 1 дає ${Number(a)+1}.`});
    } else {
      out.push(`TypeError: can only concatenate str (not "int") to str`);
      frames.push({line:3, vars:[], out:[...out],
        boxes:[{name:"name", val:`"${n}"`, type:"str"},{name:"age", val:`"${a}"`, type:"str", reading:true, copy:`"${a}"`}],
        kind:"end", hint:'Лікується одним словом: age = int(input(...)).',
        note:'Помилка. У коробці лежить рядок, а до рядка не можна додати число 1.'});
    }
    return {code, frames};
  },
  extra:(f)=>drawBoxes(f.boxes, f.hint)
});

/* ================= hero ================= */
(function(){
  const box = document.getElementById("vars-heroBox");
  const line = document.getElementById("vars-heroLine");
  const btn = document.getElementById("vars-heroBtn");
  const steps=[
    {b:[{name:"age", val:null}], t:'Спочатку коробки немає — лише порожнє місце в пам\'яті.'},
    {b:[{name:"age", val:"15", type:"int", appear:true, changed:true, active:true}], t:'age = 15 — кладемо значення всередину й підписуємо коробку.'},
    {b:[{name:"age", val:"15", type:"int", reading:true, copy:"15"}], t:'print(age) — назовні йде копія. У коробці все лишається.'},
    {b:[{name:"age", val:"16", type:"int", changed:true, active:true, ghost:"15"}], t:'age = 16 — нове значення витісняє старе назавжди.'},
    {b:[{name:"age", val:"16", type:"int"}], t:'Одна коробка, одне ім\'я, вміст можна міняти скільки завгодно.'}
  ];
  let t=null;
  function run(){
    clearInterval(t);
    let k=0;
    const tick=()=>{
      if(k>=steps.length){ clearInterval(t); return; }
      box.innerHTML = drawBoxes(steps[k].b);
      line.textContent = steps[k].t;
      k++;
    };
    tick();
    t=setInterval(tick, 1700);
  }
  btn.onclick = run;
  box.innerHTML = drawBoxes(steps[0].b);
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
