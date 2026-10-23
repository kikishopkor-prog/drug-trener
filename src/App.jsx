import { useState, useEffect, useRef } from "react";
import { Home, Dumbbell, User, Plus, Check, Flame, Droplets, Moon, BookOpen, Library, Power, ListChecks, Link2, Paperclip, Undo2, Redo2, Highlighter, Footprints, Play, ChevronLeft, Users, ClipboardList, Trash2, Calendar, ChevronRight } from "lucide-react";

const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const today = () => fmt(new Date());
const shift = (s, n) => { const d = new Date(s + "T00:00:00"); d.setDate(d.getDate() + n); return fmt(d); };
const dayStr = (off) => shift(today(), off);
const ym = (s) => s.slice(0, 7);
const tok = (c) => c.token || c.id; // секретный код в персональной ссылке клиента
const exKey = (e) => e.libId || e.name.trim().toLowerCase(); // ключ упражнения для рабочих весов
const assign = (d, cid, e, w) => { const it = (((d.weights ||= {})[cid] ||= {})[exKey(e)] ||= { name: e.name, hist: [] }); if (it.hist.at(-1)?.w !== +w) it.hist.push({ date: today(), w: +w }); };
const linkOf = (c) => `${window.location.origin}${window.location.pathname}#c/${tok(c)}`;
const isMissed = (p, L) => !L.done?.[p.id] && (!!L.missed?.[p.id] || p.date < today());
const ONB = Object.fromEntries(["home", "habits", "ring", "calendar", "workouts", "workout", "memos", "measures", "progress", "achievements"].map((k) => [k, `/onb-${k}.webp`])); // скриншоты для приветствия и онбординга: public/onb-*.webp
const TRAINER_PHOTO = "/trainer.webp"; // фото на приветственном экране: public/trainer.webp
const pm = (m, n) => { const d = new Date(m + "-01T00:00:00"); d.setMonth(d.getMonth() - n); return fmt(d).slice(0, 7); };
const fileToUrl = (f) => new Promise((res) => { const r = new FileReader(); r.onload = () => { const im = new Image(); im.onload = () => { const k = Math.min(1, 700 / im.width), c = document.createElement("canvas"); c.width = im.width * k; c.height = im.height * k; c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL("image/jpeg", 0.75)); }; im.src = r.result; }; r.readAsDataURL(f); });

function achievements(me, L, plans) {
  const days = L.days || {};
  const has = (pred, s) => days[s] && pred(days[s]);
  const run = (pred) => { let best = 0; Object.keys(days).forEach((s) => { let c = 0; while (has(pred, shift(s, -c))) c++; best = Math.max(best, c); }); return best; };
  const wk = {}; Object.keys(days).forEach((s) => { if (days[s].steps >= 10000) { const k = shift(s, -((new Date(s + "T00:00:00").getDay() + 6) % 7)); wk[k] = (wk[k] || 0) + 1; } });
  const byM = {}; plans.forEach((p) => { (byM[ym(p.date)] ||= []).push(p); });
  const g = {}; (L.wlog || []).forEach((e) => { g[e.name] ||= {}; g[e.name][e.m] = Math.max(g[e.name][e.m] || 0, e.w); });

  return [
    { e: "👟", t: "Первый шаг", d: "Заполнить профиль и выполнить первую тренировку", ok: !!(me.name && me.age) && Object.keys(L.done || {}).length > 0 },
    { e: "💧", t: "Водная стихия", d: "Выполнить норму воды 7 дней подряд", ok: run((v) => v.water >= 2) >= 7 },
    { e: "⚡️", t: "Машина шагов", d: "Набрать целевое количество шагов 5 дней за неделю", ok: Object.values(wk).some((c) => c >= 5) },
    { e: "🌟", t: "Идеальная неделя", d: "Закрыть все привычки все 7 дней без пропусков", ok: run((v) => v.water >= 2 && v.steps >= 10000 && v.cal >= 2000 && v.sleep >= 8) >= 7 },
    { e: "🛡️", t: "Железный характер", d: "Завершить все запланированные силовые за месяц", ok: Object.values(byM).some((a) => a.every((p) => L.done?.[p.id])) },
    { e: "🏋️‍♀️", t: "Повелитель весов", d: "Увеличить рабочий вес в любом упражнении по сравнению с прошлым месяцем", ok: Object.values(g).some((mm) => { const k = Object.keys(mm).sort(); return k.some((m, i) => i && mm[m] > mm[k[i - 1]]); }) },
    { e: "🔥", t: "Преодоление", d: "Отметить сложность «Тяжело» (8–10) и дойти до конца тренировки", ok: !!L.hard },
    { e: "📸", t: "Хранитель истории", d: "Внести первые замеры тела", ok: Object.keys(L.measures || {}).length > 0 },
    { e: "✨", t: "Новая версия", d: "Вносить замеры 3 месяца подряд", ok: Object.keys(L.measures || {}).some((m) => [0, 1, 2].every((n) => L.measures?.[pm(m, n)])) },
  ];
}
const uid = () => Math.random().toString(36).slice(2, 9);

const DN = { 1: "Пн", 2: "Вт", 3: "Ср", 4: "Чт", 5: "Пт", 6: "Сб", 0: "Вс" };
const dateRu = (d) => new Date(d + "T00:00:00").toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "short" });
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const monLabel = (m) => cap(new Date(m + "-01T00:00:00").toLocaleDateString("ru-RU", { month: "long", year: "numeric" }).replace(/\s*г\.$/, ""));
const dayLong = (d) => cap(new Date(d + "T00:00:00").toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" }));
const nf = (x) => String(Math.round(x * 10) / 10).replace(".", ",");
const mnum = (v) => (v === "" || v == null || isNaN(+v) ? null : +v);
const delta = (a, b, u) => { const d = Math.round((a - b) * 10) / 10; return d === 0 ? "без изменений" : `${d > 0 ? "+" : "−"}${nf(Math.abs(d))} ${u}`; };
const MEASURE_FIELDS = [["weight", "Вес", "кг"], ["neck", "Шея", "см"], ["shoulders", "Плечи", "см"], ["chest", "Грудь", "см"], ["arm", "Рука", "см"], ["waist", "Талия", "см"], ["hips", "Бёдра", "см"], ["thigh", "Нога", "см"], ["calf", "Икра", "см"]];
const MEASURE_MEMO_ID = "how-to-measure"; // памятка, на которую ведёт ссылка «Как делать замеры?»

// Стартовые шаблоны программ — ЗАГОТОВКИ, замените на свои (можно менять, удалять и сохранять свои из конструктора).
// Дни: 1 = Пн … 6 = Сб, 0 = Вс. Упражнение: [название, комментарий]. Названия попадают в библиотеку упражнений — добавьте им видео один раз.
const TPL_SEED = [
  { id: "tpl-full3", name: "Фулбади · 3 дня", wk: {
    1: { title: "Фулбади A", ex: [["Приседания со штангой", "3×8–10"], ["Жим штанги лёжа", "3×8–10"], ["Тяга верхнего блока", "3×10–12"], ["Жим гантелей сидя", "3×10"], ["Планка", "3×40 сек"]] },
    3: { title: "Фулбади B", ex: [["Румынская тяга", "3×8–10"], ["Жим гантелей на наклонной", "3×10"], ["Тяга гантели в наклоне", "3×10–12 на каждую"], ["Выпады с гантелями", "3×10 на каждую"], ["Скручивания на пресс", "3×15"]] },
    5: { title: "Фулбади C", ex: [["Жим ногами", "3×10–12"], ["Отжимания", "3×максимум"], ["Тяга горизонтального блока", "3×10–12"], ["Разведение гантелей в стороны", "3×12–15"], ["Гиперэкстензия", "3×12–15"]] } } },
  { id: "tpl-ul4", name: "Верх / низ · 4 дня", wk: {
    1: { title: "Верх A", ex: [["Жим штанги лёжа", "4×6–8"], ["Тяга горизонтального блока", "3×8–10"], ["Жим гантелей сидя", "3×8–10"], ["Тяга верхнего блока", "3×10–12"], ["Сгибание рук с гантелями", "3×10–12"], ["Разгибание рук на блоке", "3×10–12"]] },
    2: { title: "Низ A", ex: [["Приседания со штангой", "4×6–8"], ["Румынская тяга", "3×8–10"], ["Жим ногами", "3×10–12"], ["Сгибание ног лёжа", "3×10–12"], ["Подъём на носки стоя", "4×12–15"], ["Планка", "3×40 сек"]] },
    4: { title: "Верх B", ex: [["Жим гантелей на наклонной", "4×8–10"], ["Тяга гантели в наклоне", "3×8–10 на каждую"], ["Сведение рук в бабочке", "3×12–15"], ["Тяга верхнего блока", "3×10–12"], ["Разведение гантелей в стороны", "3×12–15"], ["Сгибание рук с гантелями", "3×10–12"]] },
    5: { title: "Низ B", ex: [["Выпады с гантелями", "3×10 на каждую"], ["Ягодичный мостик", "4×10–12"], ["Жим ногами", "3×12–15"], ["Сгибание ног лёжа", "3×12"], ["Подъём на носки стоя", "4×15"], ["Скручивания на пресс", "3×15"]] } } },
  { id: "tpl-ppl3", name: "Push / Pull / Legs · 3 дня", wk: {
    1: { title: "Push", ex: [["Жим штанги лёжа", "4×6–8"], ["Жим гантелей на наклонной", "3×8–10"], ["Жим гантелей сидя", "3×8–10"], ["Разведение гантелей в стороны", "3×12–15"], ["Разгибание рук на блоке", "3×10–12"]] },
    3: { title: "Pull", ex: [["Тяга верхнего блока", "4×8–10"], ["Тяга горизонтального блока", "3×8–10"], ["Тяга гантели в наклоне", "3×10 на каждую"], ["Сгибание рук с гантелями", "3×10–12"], ["Гиперэкстензия", "3×12–15"]] },
    5: { title: "Legs", ex: [["Приседания со штангой", "4×6–8"], ["Румынская тяга", "3×8–10"], ["Жим ногами", "3×10–12"], ["Сгибание ног лёжа", "3×10–12"], ["Подъём на носки стоя", "4×12–15"], ["Планка", "3×40 сек"]] } } },
  { id: "tpl-new2", name: "Старт для новичка · 2 дня", wk: {
    2: { title: "Всё тело A", ex: [["Приседания с гантелью (гоблет)", "3×10–12"], ["Жим гантелей на наклонной", "3×10"], ["Тяга верхнего блока", "3×10–12"], ["Ягодичный мостик", "3×12–15"], ["Планка", "3×30 сек"]] },
    6: { title: "Всё тело B", ex: [["Жим ногами", "3×12"], ["Сведение рук в бабочке", "3×12–15"], ["Тяга горизонтального блока", "3×10–12"], ["Румынская тяга", "3×10 (лёгкий вес)"], ["Скручивания на пресс", "3×12–15"]] } } },
];

// Статьи-памятки (автор — тренер). Разметка: ## заголовок, ### подзаголовок, - список, > цитата, --- линия, **жирный**, [текст](ссылка), ![](картинка)
const ARTICLES = [
  { id: "art1", title: "Методичка по питанию", link: "", body: `![](https://imgproxy.gamma.app/resize/quality:80/resizing_type:fit/width:2000/https://cdn.gamma.app/itqnwdu9seijbm3/e7b80c4fd02a470fab63cbb59a215d06/original/KIM09425-redakt.jpg)
**Нет плохой еды и нет «плохих» нутриентов.**
Углеводы, жиры и белки не бывают «вредными» сами по себе — важно количество и контекст.
Не нужно демонизировать продукты.
Нужно менять пищевые привычки, а не полностью запрещать себе еду.
---
## Блок 1. Понимание питания и управление телом
### Еда и её роль в жизни человека
Еда — это необходимое условие для жизни. Любой человек должен регулярно питаться, а в идеале — ещё и вкусно. Организм постоянно нуждается в энергии, и без еды он не может нормально функционировать.
### Распространённые мифы о питании
Большинство людей уверены, что:
- нужно меньше есть
- мучное нельзя
- сладкое запрещено
- на ночь есть нельзя
- от жиров толстеют
- фастфуд нельзя
- читмил нужен раз в неделю
- воду во время еды нельзя
- белки и углеводы нельзя вместе
- сахар категорически нельзя
- жареное нельзя
Эти установки формируют страх еды и мешают выстроить здоровые отношения с питанием.
### Неосознанное питание
Люди часто питаются неосознанно:
- постоянно перекусывают,
- забывают есть,
- или наоборот — едят слишком много.
При этом калории от этого никуда не деваются, даже если человек не замечает, сколько он съел.
### Осознанное питание
Осознанное питание — это не магия и не диета.
**Есть можно всё, но не в любых количествах.**
Если нет контроля — тренировки и усилия могут не дать результата.
---
### Почему «похудеть быстро» не работает
Можно попробовать похудеть импульсивно, не вникая в процесс. Но такого подхода хватает ненадолго. Он не формирует долгосрочные отношения с телом.
Чтобы не просто похудеть, а похудеть навсегда, необходимо менять пищевые привычки.
## Привычки и социальное влияние
![](https://imgproxy.gamma.app/resize/quality:80/resizing_type:fit/width:2000/https://cdn.gamma.app/itqnwdu9seijbm3/df60a2a1efaa4c28af4fd70eeaeec463/original/KIM09412-redakt.jpg)
### Привычки и регуляция веса
Привычки играют ключевую роль в регуляции веса. Многие из них мы даже не осознаём:
- семейные застолья,
- встречи с друзьями,
- перекусы на работе.
Часто определённые места, действия и ситуации автоматически ассоциируются с едой.
### Социальное влияние и осознанный выбор
Важно задавать себе вопросы:
- Я действительно хочу эту еду?
- Или ем за компанию?
- Это голод или привычка?
Сознательный выбор — это умение замечать свои привычки и управлять ими.
## Стресс и вес
Стресс — это естественная реакция организма. Если стресс затягивается на дни, недели или месяцы, он становится губительным:
- у одних усиливается аппетит,
- у других он пропадает,
- снижается продуктивность,
- появляется переедание.
**Стресс негативно влияет на качество жизни.**
### Что на самом деле влияет на вес
Часто люди думают, что всему виной гормональный сбой, отёки, стресс.
> **На самом деле вес напрямую зависит от того, сколько вы едите и сколько тратите.** А количество еды определяется привычками.
## Энергобаланс и колебания веса
Энергобаланс — это соотношение потребляемой и расходуемой энергии.
- Энергии поступает больше — вес растёт
- Энергии поступает меньше — вес снижается
### Колебания веса
Колебания веса ±2 кг в неделю — это:
- вода
- соль
- гликоген
- объём пищи
- стресс
- цикл
Стресс задерживает воду из-за кортизола. Никогда человек не может набрать 2 кг жира за один день.
---
## Блок 2. Основы питания и энергии
### Калория и энергия
Калория — это единица измерения энергии. **Энергия — это топливо, а топливо — это еда.**
### БЖУ как основа питания
БЖУ — это органические молекулы, состоящие из атомов. Химические связи между атомами и есть та энергия, которую улавливает организм.
### Калорийность макронутриентов
- Углеводы — 4 ккал на 1 грамм
- Белки — 4 ккал на 1 грамм
- Жиры — 9 ккал на 1 грамм
### Макронутриенты и энергия клетки
- **Белки** состоят из цепочек аминокислот. Они необходимы для восстановления, роста и поддержания тканей организма.
- **Углеводы** состоят из простых сахаров (глюкоза, фруктоза и др.). Это основной источник энергии для организма.
- **Жиры** — это длинные молекулы жирных кислот, соединённые глицерином. Они необходимы для гормональной системы и здоровья.
### АТФ — энергия клетки
АТФ (аденозинтрифосфат) — универсальная форма энергии, которую организм использует для всех процессов.
### Термический эффект пищи
Часть энергии тратится на переваривание еды. **Это около 10% суточных энергозатрат.**
### Калорийная плотность и насыщение
На сытость влияет:
- объём пищи,
- клетчатка,
- белок.
Использование объёмных продуктов (овощи) помогает контролировать аппетит.
### Сытные группы продуктов
3 основные группы: **белки, углеводы, овощи (клетчатка).** Жиры также важны и не должны исключаться.
---
## Блок 3. Практика и система питания
### Зачем считать калории
Для похудения первостепенную роль играют калории.
> **Можно похудеть даже на пиве и мороженом, если укладываться в норму калорий.**
### Подсчёт как инструмент контроля
Подсчёт калорий — это чёткий контроль питания. **Главное условие — комфорт, а не жёсткость.**
### Что нужно для подсчёта
- электронные весы
- приложение
- учёт всего, что едите и пьёте
- сканирование штрих-кодов
- использование карт калорийности в заведениях
### Распределение расхода энергии
- **70%** — базовые потребности организма (энергия для существования)
- **15%** — повседневная активность (шаги, разговоры, жестикуляция)
- **10%** — термический эффект пищи (сколько нужно калорий, чтобы переварить пищу)
- **5%** — тренировки
### Расчёт нормы калорий
Используется формула Харриса–Бенедикта для расчёта базовых потребностей.
Для женщин:
**BMR = 447,593 + (9,247 × вес в кг) + (3,098 × рост в см) − (4,330 × возраст в годах)**
Для мужчин:
**BMR = 88,362 + (13,397 × вес в кг) + (4,799 × рост в см) − (5,677 × возраст в годах)**
### Основные правила подсчёта
- учитывать всё
- взвешивать в сыром виде
- планировать рацион
- восполнять норму белка
- соблюдать норму овощей
- снижать частоту общепита
### Приложения для подсчёта
- **Yazio**
- **FatSecret**
### Типичные ошибки
- не учитывают масло, соусы, напитки,
- записывают «примерно»,
- не учитывают мелкие перекусы.
### Метод тарелки
- **3 приёма пищи** (ваш КБЖУ, поделённый на 3 приёма пищи)
- половина тарелки — овощи,
- соблюдение пропорций,
- еда медленно,
- допускаются отклонения в 10% случаев.
### Продуктовая корзина по принципу 5–4–3–2–1
Простой и рабочий ориентир:
- **5 овощей и фруктов** — помидоры, шпинат, морковь, яблоки, бананы и т.д.
- **4 источника белка** — куриная грудка, яйца, говядина, рыба (тунец), творог и т.д.
- **3 источника сложных углеводов** — рис, макароны, картофель, гречка и т.д.
- **2 источника жиров** — оливковое масло, сливочное масло, авокадо и т.д.
- **1 любимое лакомство** — тёмный шоколад или небольшой десерт, без чувства вины.
### Структура питания и дневник
- 3 основных приёма пищи,
- до 3 перекусов,
- сбалансированная тарелка,
- еда для души после основного приёма,
- анализ ошибок и ощущений.
---
## Итог
**Питание — это не запреты, а система.**
Цель — не идеальный рацион, а устойчивые отношения с едой и телом.` },
  { id: "art2", title: "Методичка продуктов", link: "", body: `Чтобы питание было простым и понятным, важно понимать, из чего состоит еда. Все продукты состоят из белков, жиров и углеводов — и каждый из этих нутриентов нужен организму.
## Зачем знать продукты по БЖУ
- **Белки** помогают сохранять и строить мышцы
- **Жиры** поддерживают гормоны и общее здоровье
- **Углеводы** дают энергию для жизни и тренировок
Проблемы с весом чаще всего появляются не из-за конкретных продуктов, а из-за их количества и несбалансированного рациона.
### Что даёт понимание БЖУ
Когда ты знаешь, какие продукты относятся к белкам, жирам и углеводам:
- легче составлять приёмы пищи
- проще контролировать вес
- уходит страх перед едой
- питание становится осознанным, а не хаотичным
Ты начинаешь понимать, чего не хватает в рационе, а не просто «есть меньше».
### Важно помнить
Нет плохой еды. Нет плохих углеводов, жиров или белков. Важно количество и регулярность, а не полный запрет продуктов.
**Можно есть всё — но не в любых объёмах.**
---
### Зачем нужен этот список
- быстро ориентироваться при выборе еды
- составлять сбалансированные тарелки
- не усложнять питание
- постепенно прийти к подсчёту калорий, если будет такая цель
Это база, с которой начинается нормальное, адекватное питание.
## 1. Белки
### Мясо и птица
- Куриная грудка
- Говядина
- Говяжий фарш
- Спам (из курицы)
- Ветчина из свинины
- Куриные сосиски
- Готовые куриные грудки
### Рыба и морепродукты
- Лосось
- Креветки
- Кальмар
- Консервированный тунец
### Яйца и молочные
- Яйца
- Молоко
- Йогурт
- Сыр
### Растительные источники
- Тофу
- Чечевица
- Нут
## 2. Углеводы
### Крупы и зерновые
- Белый рис
- Овсянка
- Гречка
### Хлеб и мучные
- Цельнозерновой хлеб
- Цельнозерновые тортильи
- Макароны / спагетти твёрдых сортов
### Корнеплоды
- Картофель
### Фрукты
- Банан
- Яблоко
- Мандарин
- Груша
- и т.д.
## 3. Жиры
### Растительные
- Кунжутное масло
- Масло авокадо
- Оливковое масло
- Авокадо
### Орехи и семена
- Арахис
- Миндаль
### Животные жиры
- Сыр
- Сливочное масло
### Жирная рыба
- Лосось
- Скумбрия
## 4. Клетчатка
### Овощи
- Пекинская капуста
- Обычная капуста
- Шпинат
- Кимчи
- Огурец
- Помидор
- Морковь
- Лук
- Семена чиа
- Стручки гороха
- Брокколи
- Грибы (эноки, шиитаке, шампиньоны)
## Добавки и другое
- **Весы** — для точного контроля порций
- **Протеин** — дополнительный источник белка
- **Креатин** — для улучшения тренировок
- **EAA (аминокислоты)** — незаменимые аминокислоты
- **Комбуча (чайный гриб)** — полезный напиток
- **Дозатор для масла** — для контроля количества жиров
---
## Полезные ссылки
### Белки
- [Куриная грудка](https://link.coupang.com/a/dfvGvF)
- [Спам (из курицы)](https://link.coupang.com/a/dfvpJe)
- [Куриные сосиски](https://link.coupang.com/a/dfv5pV)
- [Готовые куриные грудки](https://link.coupang.com/a/dfv7ia)
- [Йогурт](https://link.coupang.com/a/dfvAlM)
### Углеводы
- Белый рис — [ссылка](https://link.coupang.com/a/dfvCeo)
- Овсянка — [ссылка](https://link.coupang.com/a/dfvBeX)
- Гречка — [ссылка](https://link.coupang.com/a/dfvFac)
- Цельнозерновой хлеб — [ссылка](https://link.coupang.com/a/dfv1Qd)
- Цельнозерновые тортильи — [ссылка](https://link.coupang.com/a/dfvZQL)
- Макароны / спагетти твёрдых сортов — [вариант 1](https://link.coupang.com/a/dfwkSN), [вариант 2](https://link.coupang.com/a/dfwl6p), [вариант 3](https://link.coupang.com/a/dfwm5D)
- Картофель — [ссылка](https://link.coupang.com/a/dfvm3E)
### Жиры
- Авокадо — [ссылка](https://link.coupang.com/a/dfvT1Y)
- Сыр — [ссылка](https://link.coupang.com/a/dfwiJO)
### Клетчатка
- Семена чиа — [ссылка](https://link.coupang.com/a/dfweHR)
- Стручки гороха — [ссылка](https://link.coupang.com/a/dfwaky)
- Брокколи — [ссылка](https://link.coupang.com/a/dfvubF)
### Добавки и другое
- Весы — [ссылка](https://link.coupang.com/a/cndWaL)
- Протеин — [ссылка](https://link.coupang.com/a/dfvJGG)
- Креатин — [ссылка](https://link.coupang.com/a/dfvLJC)
- EAA (аминокислоты) — [ссылка](https://link.coupang.com/a/dfvQs4)
- Комбуча (чайный гриб) — [ссылка](https://link.coupang.com/a/dfvRZd)
- Дозатор для масла — [ссылка](https://link.coupang.com/a/dfvPpp)` },
  { id: MEASURE_MEMO_ID, title: "Как делать замеры", link: "", body: `Замеры нужны, чтобы видеть реальный прогресс. Вес на весах — это не вся картина, а обхваты показывают, как на самом деле меняется тело.
## Правила для всех замеров
- Делай замеры раз в месяц, в один и тот же день и в одно и то же время.
- Лучше утром, после туалета, до еды и до тренировки.
- Используй мягкую сантиметровую ленту, не металлическую.
- Лента лежит ровно, параллельно полу, плотно прилегает, но не врезается в кожу.
- Стой расслабленно, не втягивай живот. Замеряй на спокойном выдохе.
- Каждый замер делай дважды. Если цифры отличаются, возьми среднее.
> Главное — одинаковые условия каждый месяц. Тогда цифры можно честно сравнивать.
## Вес
Взвешивайся утром после туалета, до еды, без одежды, на одних и тех же весах.
## Как измерять
### Шея
Чуть ниже кадыка. Смотри прямо, плечи опущены.
### Плечи
Вокруг самой широкой части плеч, по выступающим точкам дельт. Руки опущены вдоль тела.
### Грудь
На уровне сосков. Лента идёт ровно по спине под лопатками.
### Рука
Расслабленная рука вдоль тела, середина между плечом и локтем. Всегда измеряй одну и ту же руку.
### Талия
Самое узкое место между нижним ребром и тазовой костью, обычно на уровне пупка или чуть выше.
### Бёдра
Вокруг самой широкой части ягодиц, ноги вместе.
### Нога
Верхняя часть бедра, самая широкая часть, примерно на 10 см ниже паховой складки. Всегда измеряй одну и ту же ногу.
### Икра
Самая широкая часть голени. Стой, вес равномерно на обеих ногах.
## Куда вносить
Профиль → «Ежемесячные замеры». Заполни поля и нажми «Сохранить замеры». Если какой-то замер не получился, оставь поле пустым.` },
];

const seed = {
  session: { role: "trainer", clientId: null, onboarded: false },
  clients: [{ id: "c1", name: "Алекс", age: 29, inbody: { weight: 78.4, muscle: 35.2, fat: 16.8, bmi: 23.9 } }],
  plans: [{ id: "p1", clientId: "c1", date: today(), title: "Core & Strength", exercises: [
    { id: "e1", libId: "l1", name: "Жим штанги лёжа", url: "https://www.youtube.com/watch?v=rT7DgCr-3pg", comment: "3×8, контролируй негатив" },
    { id: "e2", libId: "l2", name: "Жим гантелей на наклонной", url: "", comment: "3×10" }] }],
  library: [
    { id: "l1", name: "Жим штанги лёжа", url: "https://www.youtube.com/watch?v=rT7DgCr-3pg", comment: "3×8, контролируй негатив" },
    { id: "l2", name: "Жим гантелей на наклонной", url: "", comment: "3×10" }],
  memos: ARTICLES,
  weights: {}, memosSeeded: ARTICLES.map((a) => a.id),
  logs: {}, // logs[clientId] = { days: {date:{water,steps,cal}}, done: {planId: date}, sets: {exId:{weight,rpe,ok}} }
};

function useLS(key, init) {
  const [v, setV] = useState(() => { try { return JSON.parse(localStorage.getItem(key)) || init; } catch { return init; } });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }, [key, v]);
  useEffect(() => { const f = (e) => { if (e.key === key && e.newValue) { try { setV(JSON.parse(e.newValue)); } catch {} } }; window.addEventListener("storage", f); return () => window.removeEventListener("storage", f); }, [key]);
  return [v, setV];
}

const embed = (u) => {
  u = (u || "").trim();
  const y = u.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/|v\/))([\w-]{11})/);
  if (y) return `https://www.youtube.com/embed/${y[1]}`;
  const v = u.match(/vimeo\.com\/(?:.*\/)?(\d+)/);
  return v ? `https://player.vimeo.com/video/${v[1]}` : null;
};

/* ---------- UI primitives ---------- */
const Card = ({ className = "", ...p }) => <div className={`rounded-3xl bg-neutral-900 border border-white/5 p-4 ${className}`} {...p} />;
const Btn = ({ red = true, className = "", ...p }) => (
  <button className={`rounded-full px-5 py-3 text-sm font-semibold transition active:scale-95 ${red ? "bg-red-600 hover:bg-red-500 text-white" : "bg-neutral-800 text-neutral-200 hover:bg-neutral-700"} ${className}`} {...p} />
);
const Input = (p) => <input className="w-full rounded-2xl bg-neutral-800 px-4 py-3 text-sm text-white placeholder-neutral-500 outline-none focus:ring-2 focus:ring-red-600" {...p} />;
const InputS = ({ className = "", ...p }) => <input className={`w-full rounded-xl bg-neutral-900 px-3 py-2 text-xs text-white placeholder-neutral-500 outline-none focus:ring-2 focus:ring-red-600 ${className}`} {...p} />;
const H = ({ children }) => <h2 className="text-2xl font-extrabold tracking-tight text-white">{children}</h2>;

// Dot-matrix bar chart — signature visual from the reference
function DotBars({ data, rows = 10 }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end justify-between gap-[3px]">
      {data.map((v, i) => {
        const n = Math.round((v / max) * rows);
        return (
          <div key={i} className="flex flex-col-reverse gap-[3px]">
            {Array.from({ length: rows }).map((_, j) => <span key={j} className={`h-1.5 w-1.5 rounded-full ${j < n ? "bg-red-600" : "bg-neutral-800"}`} />)}
          </div>
        );
      })}
    </div>
  );
}

function Ring({ value, max, label }) {
  const r = 42, c = 2 * Math.PI * r, p = Math.min(value / max, 1);
  return (
    <div className="relative h-28 w-28">
      <svg viewBox="0 0 100 100" className="-rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#262626" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="#dc2626" strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p)} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold">{value}</span><span className="text-[10px] text-neutral-500">{label}</span>
      </div>
    </div>
  );
}

/* ---------- Template editor ---------- */
function TemplateEditor({ db, set, init, onClose }) {
  const [name, setName] = useState(init?.name || "");
  const [wk, setWk] = useState(() => {
    const o = {};
    Object.entries(init?.wk || {}).forEach(([d, w]) => { o[d] = { title: w.title || "", exercises: w.exercises.map((e) => ({ ...e, id: uid() })) }; });
    return o;
  });
  const [dow, setDow] = useState(() => [1, 2, 3, 4, 5, 6, 0].find((i) => init?.wk?.[i]?.exercises?.length) ?? 1);
  const [custom, setCustom] = useState(""), [msg, setMsg] = useState(""), [sure, setSure] = useState(false);
  const cur = wk[dow] || { title: "", exercises: [] };
  const setCur = (v) => setWk({ ...wk, [dow]: { ...cur, ...v } });
  const upd = (id, patch) => setCur({ exercises: cur.exercises.map((x) => (x.id === id ? { ...x, ...patch } : x)) });
  const move = (i, dir) => { const a = [...cur.exercises], j = i + dir; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; setCur({ exercises: a }); };
  const addLib = (id) => { const l = (db.library || []).find((y) => y.id === id); if (l) setCur({ exercises: [...cur.exercises, { id: uid(), libId: l.id, name: l.name, url: l.url || "", comment: l.comment || "" }] }); };
  const addCustom = () => { const n = custom.trim(); if (!n) return; setCur({ exercises: [...cur.exercises, { id: uid(), libId: "", name: n, url: "", comment: "" }] }); setCustom(""); };
  const copyDay = (from) => { const w = wk[from]; if (!w) return; setCur({ title: w.title, exercises: w.exercises.map((e) => ({ ...e, id: uid() })) }); };
  const filled = [1, 2, 3, 4, 5, 6, 0].filter((i) => wk[i]?.exercises?.length);
  const save = () => {
    const n = name.trim(), out = {};
    filled.forEach((i) => { out[i] = { title: wk[i].title || "", exercises: wk[i].exercises.map((e) => ({ name: e.name, comment: e.comment || "", libId: e.libId || "", url: e.url || "" })) }; });
    if (!n) { setMsg("Введите название программы."); return; }
    if (!filled.length) { setMsg("Добавьте упражнения хотя бы в один день."); return; }
    set((d) => {
      d.templates ||= [];
      const i = d.templates.findIndex((t) => t.id === init?.id);
      const t = { id: i >= 0 ? d.templates[i].id : uid(), name: n, wk: out };
      if (i >= 0) d.templates[i] = t; else d.templates.push(t);
    });
    onClose();
  };
  return (
    <Card className="space-y-3">
      <button type="button" onClick={onClose} className="flex items-center text-sm text-neutral-400"><ChevronLeft size={18} />К списку программ</button>
      <H>{init ? "Редактирование программы" : "Новая программа"}</H>
      <Input placeholder="Название программы (например, Full body 3×)" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="flex justify-between">
        {[[1, "Пн"], [2, "Вт"], [3, "Ср"], [4, "Чт"], [5, "Пт"], [6, "Сб"], [0, "Вс"]].map(([i, l]) => (
          <button key={i} type="button" onClick={() => setDow(i)} className={`relative h-10 w-10 rounded-full text-sm ${dow === i ? "bg-red-600 text-white" : "bg-neutral-800 text-neutral-400"}`}>{l}
            {wk[i]?.exercises.length > 0 && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-white" />}</button>))}
      </div>
      <Input placeholder="Название тренировки (Pull & Back)" value={cur.title} onChange={(e) => setCur({ title: e.target.value })} />
      {cur.exercises.map((e, i) => (
        <div key={e.id} className="space-y-2 rounded-2xl bg-neutral-800 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="min-w-0 break-words text-sm font-semibold">{i + 1}. {e.name}</p>
            <div className="flex shrink-0 items-center gap-1 text-neutral-400">
              <button type="button" aria-label="Выше" disabled={i === 0} onClick={() => move(i, -1)} className="px-2 disabled:opacity-30">↑</button>
              <button type="button" aria-label="Ниже" disabled={i === cur.exercises.length - 1} onClick={() => move(i, 1)} className="px-2 disabled:opacity-30">↓</button>
              <button type="button" aria-label="Убрать упражнение" onClick={() => setCur({ exercises: cur.exercises.filter((x) => x.id !== e.id) })}><Trash2 size={16} className="text-neutral-500" /></button>
            </div>
          </div>
          <InputS placeholder="Подходы, повторы, техника" value={e.comment || ""} onChange={(ev) => upd(e.id, { comment: ev.target.value })} />
        </div>
      ))}
      {!cur.exercises.length && <p className="text-xs text-neutral-500">В этот день пока пусто — это день отдыха.</p>}
      <div className="space-y-2 rounded-2xl border border-dashed border-white/10 p-3">
        <select aria-label="Добавить из библиотеки" className="w-full rounded-2xl bg-neutral-800 px-4 py-3 text-sm text-neutral-300" value="" onChange={(e) => addLib(e.target.value)}>
          <option value="">+ Добавить из библиотеки…</option>
          {(db.library || []).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
        <div className="flex gap-2">
          <Input placeholder="Или своё упражнение" value={custom} onChange={(e) => setCustom(e.target.value)} />
          <Btn red={false} className="shrink-0" onClick={addCustom}>Добавить</Btn>
        </div>
      </div>
      {!cur.exercises.length && filled.filter((i) => i !== dow).length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500"><span>Скопировать из:</span>
          {filled.filter((i) => i !== dow).map((i) => <button key={i} type="button" onClick={() => copyDay(i)} className="rounded-full bg-neutral-800 px-3 py-1 text-neutral-300">{DN[i]}</button>)}
        </div>
      )}
      {msg && <p className="rounded-2xl bg-neutral-800 px-4 py-2 text-xs text-neutral-300">{msg}</p>}
      <p className="text-xs text-neutral-500">Веса клиентов в программу не входят — их вы назначаете в конструкторе для конкретного клиента.</p>
      <div className="flex gap-2"><Btn className="flex-1" onClick={save}>Сохранить программу</Btn><Btn red={false} onClick={onClose}>Отмена</Btn></div>
    </Card>
  );
}

/* ---------- Trainer panel ---------- */
function Trainer({ db, set }) {
  const [tab, setTab] = useState("clients");
  const [open, setOpen] = useState(null);
  const [form, setForm] = useState(null);
  const [plan, setPlan] = useState({ clientId: db.clients[0]?.id || "", date: today(), weeks: 4, wk: {} });
  const [ex, setEx] = useState({ name: "", url: "", comment: "", w: "", libId: "" });
  const [arm, setArm] = useState(null), [note, setNote] = useState(""), [tplName, setTplName] = useState(""), [edT, setEdT] = useState(null);

  const addClient = () => {
    if (!form.name) return;
    set((d) => { d.clients.push({ id: uid(), token: uid() + uid(), name: form.name, age: +form.age || 0, inbody: { weight: +form.weight || 0, muscle: +form.muscle || 0, fat: +form.fat || 0, bmi: +form.bmi || 0 } }); });
    setForm(null);
  };
  const [dow, setDow] = useState(1);
  const [copied, setCopied] = useState(false);
  const cur = plan.wk[dow] || { title: "", exercises: [] };
  const setCur = (v) => setPlan({ ...plan, wk: { ...plan.wk, [dow]: { ...cur, ...v } } });
  const savePlan = () => {
    const dates = [];
    for (let i = 0; i < plan.weeks * 7; i++) { const x = shift(plan.date, i), w = plan.wk[new Date(x + "T00:00:00").getDay()]; if (w?.exercises.length) dates.push([x, w]); }
    if (!plan.clientId || !dates.length) return;
    const ds = new Set(dates.map(([x]) => x));
    set((d) => {
      d.plans = d.plans.filter((p) => !(p.clientId === plan.clientId && ds.has(p.date) && !d.logs[plan.clientId]?.done?.[p.id]));
      dates.forEach(([date, w]) => d.plans.push({ id: uid(), clientId: plan.clientId, date, title: w.title || "Тренировка", exercises: w.exercises.map((e) => ({ ...e, id: uid() })) }));
      Object.values(plan.wk).forEach((w) => w.exercises.forEach((e) => { if (e.w) assign(d, plan.clientId, e, e.w); }));
    });
    setPlan({ ...plan, wk: {} });
    setTab("clients");
  };
  const flash = (m) => { setNote(m); setTimeout(() => setNote(""), 4500); };
  const armIt = (k) => { setArm(k); setTimeout(() => setArm((a) => (a === k ? null : a)), 4000); };
  const hasDraft = Object.values(plan.wk).some((w) => w.exercises.length);
  const firstDay = (wk) => [1, 2, 3, 4, 5, 6, 0].find((i) => wk[i]?.exercises?.length);
  const curW = (cid, e) => db.weights?.[cid]?.[exKey(e)]?.hist.at(-1)?.w ?? "";
  const loadWk = (wk, msg) => { setPlan((p) => ({ ...p, wk })); const f = firstDay(wk); if (f != null) setDow(f); flash(msg); };
  const updEx = (id, patch) => setCur({ exercises: cur.exercises.map((x) => (x.id === id ? { ...x, ...patch } : x)) });
  const applyTpl = (t) => {
    const wk = {};
    Object.entries(t.wk).forEach(([d, w]) => {
      wk[d] = { title: w.title || "", exercises: w.exercises.map((e) => {
        const l = (db.library || []).find((y) => y.id === e.libId);
        const x = { id: uid(), libId: e.libId || "", name: e.name, url: l?.url || e.url || "", comment: e.comment || l?.comment || "" };
        return { ...x, w: curW(plan.clientId, x) };
      }) };
    });
    loadWk(wk, `Загружено: «${t.name}». Измените под клиента и нажмите «Создать программу».`);
  };
  const tryTpl = (t) => { const k = "apply:" + t.id; if (hasDraft && arm !== k) { armIt(k); return; } setArm(null); applyTpl(t); };
  const delTpl = (t) => { const k = "del:" + t.id; if (arm !== k) { armIt(k); return; } setArm(null); set((d) => { d.templates = (d.templates || []).filter((x) => x.id !== t.id); }); };
  const loadClient = () => {
    const cid = plan.clientId, wk = {};
    db.plans.filter((p) => p.clientId === cid && p.date >= today()).sort((a, b) => a.date.localeCompare(b.date)).forEach((p) => {
      const dw = new Date(p.date + "T00:00:00").getDay(); if (wk[dw]) return;
      wk[dw] = { title: p.title, exercises: p.exercises.map((e) => ({ id: uid(), libId: e.libId || "", name: e.name, url: e.url || "", comment: e.comment || "", w: curW(cid, e) })) };
    });
    if (!Object.keys(wk).length) { flash("У этого клиента нет будущих тренировок."); return; }
    loadWk(wk, "Загружена текущая программа клиента. Измените и нажмите «Создать программу» — тренировки на эти даты заменятся.");
  };
  const saveTpl = () => {
    const name = tplName.trim(), wk = {};
    Object.entries(plan.wk).forEach(([d, w]) => { if (w.exercises.length) wk[d] = { title: w.title || "", exercises: w.exercises.map((e) => ({ name: e.name, comment: e.comment || "", libId: e.libId || "", url: e.url || "" })) }; });
    if (!name) { flash("Введите название шаблона."); return; }
    if (!Object.keys(wk).length) { flash("Сначала добавьте упражнения хотя бы в один день."); return; }
    set((d) => { d.templates ||= []; const i = d.templates.findIndex((t) => t.name.trim().toLowerCase() === name.toLowerCase()); const t = { id: i >= 0 ? d.templates[i].id : uid(), name, wk }; if (i >= 0) d.templates[i] = t; else d.templates.push(t); });
    setTplName(""); flash(`Шаблон «${name}» сохранён. Веса клиентов в шаблон не попадают.`);
  };
  const client = db.clients.find((c) => c.id === open);

  return (
    <div className="space-y-5">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {[["clients", "Клиенты", Users], ["builder", "Конструктор", ClipboardList], ["library", "Библиотека", Library], ["memos", "Памятки", BookOpen], ["access", "Доступ", Power]].map(([k, l, I]) => (
          <button key={k} onClick={() => { setTab(k); setOpen(null); }} className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm ${tab === k ? "bg-white text-black" : "bg-neutral-900 text-neutral-400"}`}><I size={16} />{l}</button>
        ))}
      </div>

      {tab === "clients" && !client && !form && (<>
        <div className="flex items-center justify-between"><H>Клиенты</H><Btn onClick={() => setForm({ name: "", age: "", weight: "", muscle: "", fat: "", bmi: "" })}><Plus size={16} className="mr-1 inline" />Добавить клиента</Btn></div>
        <div className="grid gap-3 sm:grid-cols-2">
          {db.clients.map((c) => (
            <Card key={c.id} onClick={() => setOpen(c.id)} className="cursor-pointer hover:border-red-600/50">
              <div className="flex items-center justify-between">
                <div><p className="text-lg font-bold">{c.name}</p><p className="text-sm text-neutral-500">{c.age} лет · {db.plans.filter((p) => p.clientId === c.id).length} тренировок{c.active === false && " · доступ закрыт"}</p></div>
                <ChevronRight className="text-neutral-600" />
              </div>
            </Card>
          ))}
        </div>
      </>)}

      {tab === "clients" && form && (
        <Card className="space-y-3">
          <H>Новый клиент</H>
          {[["name", "Имя"], ["age", "Возраст"], ["weight", "Вес, кг (InBody)"], ["muscle", "Мышечная масса, кг"], ["fat", "Жир, %"], ["bmi", "ИМТ"]].map(([k, l]) => (
            <Input key={k} placeholder={l} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
          ))}
          <div className="flex gap-2"><Btn onClick={addClient}>Сохранить</Btn><Btn red={false} onClick={() => setForm(null)}>Отмена</Btn></div>
        </Card>
      )}

      {tab === "clients" && client && (<>
        <button onClick={() => setOpen(null)} className="flex items-center text-sm text-neutral-400"><ChevronLeft size={18} />Назад</button>
        <H>{client.name}, {client.age}</H>
        <Card className="space-y-2">
          <p className="text-sm text-neutral-400">Персональная ссылка клиента</p>
          <p className="break-all text-xs text-neutral-300">{linkOf(client)}</p>
          <Btn onClick={() => { navigator.clipboard?.writeText(linkOf(client)); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>{copied ? "Скопировано" : "Скопировать ссылку"}</Btn>
        </Card>
        <Card>
          <p className="mb-3 text-sm text-neutral-400">Антропометрия InBody</p>
          <div className="grid grid-cols-2 gap-3">
            {[["Вес", client.inbody.weight, "кг"], ["Мышцы", client.inbody.muscle, "кг"], ["Жир", client.inbody.fat, "%"], ["ИМТ", client.inbody.bmi, ""]].map(([l, v, u]) => (
              <div key={l} className="rounded-2xl bg-neutral-800 p-3"><p className="text-xs text-neutral-500">{l}</p><p className="text-xl font-bold">{v} <span className="text-xs text-neutral-500">{u}</span></p></div>
            ))}
          </div>
        </Card>
        <ClientCalendar db={db} set={set} client={client} />
        <WeightsPanel db={db} set={set} client={client} />
        <Card className="space-y-3">
          <p className="font-semibold">Замеры клиента</p>
          <MeasureProgress L={db.logs[client.id]} />
          <MeasureHistory L={db.logs[client.id]} />
        </Card>
      </>)}

      {tab === "library" && <LibraryTab db={db} set={set} />}
      {tab === "memos" && <MemosTab db={db} set={set} />}
      {tab === "access" && <AccessTab db={db} set={set} />}
      {tab === "builder" && edT && <TemplateEditor key={edT.id || "new"} db={db} set={set} init={edT.id ? edT : null} onClose={() => setEdT(null)} />}
      {tab === "builder" && !edT && (
        <div className="space-y-5">
          <Card className="space-y-2">
            <div className="flex items-center justify-between gap-2"><p className="font-semibold">Готовые программы</p><Btn red={false} className="shrink-0 !px-4 !py-2" onClick={() => setEdT({})}><Plus size={14} className="mr-1 inline" />Новая</Btn></div>
            <p className="text-xs text-neutral-500">Выберите шаблон — он загрузится в конструктор ниже. Для каждого клиента его можно менять: упражнения, подходы, веса.</p>
            {(db.templates || []).map((t) => {
              const n = Object.values(t.wk).reduce((a, w) => a + w.exercises.length, 0), days = [1, 2, 3, 4, 5, 6, 0].filter((i) => t.wk[i]?.exercises?.length).map((i) => DN[i]).join(" · ");
              return (
                <div key={t.id} className="flex items-center gap-2 rounded-2xl bg-neutral-800 px-3 py-2">
                  <div className="min-w-0 flex-1"><p className="break-words font-medium leading-snug">{t.name}</p><p className="text-xs text-neutral-500">{days} · {n} упр.</p></div>
                  <button type="button" onClick={() => setEdT(t)} className="shrink-0 rounded-full px-2 py-1.5 text-xs text-neutral-300 underline underline-offset-4">Изменить</button>
                  <Btn className="shrink-0 !px-4 !py-2" onClick={() => tryTpl(t)}>{arm === "apply:" + t.id ? "Заменить черновик?" : "Загрузить"}</Btn>
                  <button type="button" onClick={() => delTpl(t)} aria-label="Удалить шаблон" className={`shrink-0 rounded-full px-2 py-1.5 text-xs ${arm === "del:" + t.id ? "bg-red-600 text-white" : "text-neutral-500"}`}>{arm === "del:" + t.id ? "Удалить?" : <Trash2 size={16} />}</button>
                </div>);
            })}
            {!(db.templates || []).length && <p className="text-sm text-neutral-500">Программ пока нет. Нажмите «Новая» или сохраните собранную ниже неделю как шаблон.</p>}
          </Card>
          <Card className="space-y-3">
            <H>Программа на неделю</H>
            <select className="w-full rounded-2xl bg-neutral-800 px-4 py-3 text-sm" value={plan.clientId} onChange={(e) => setPlan({ ...plan, clientId: e.target.value })}>
              {db.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button type="button" onClick={loadClient} className="text-sm text-red-500 underline underline-offset-4">Загрузить текущую программу клиента</button>
            {note && <p className="rounded-2xl bg-neutral-800 px-4 py-2 text-xs text-neutral-300">{note}</p>}
            <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-400">
              <span>Старт</span><input type="date" className="rounded-2xl bg-neutral-800 px-4 py-3 text-white [color-scheme:dark]" value={plan.date} onChange={(e) => setPlan({ ...plan, date: e.target.value })} />
              <span>на</span><input type="number" min="1" max="12" value={plan.weeks} onChange={(e) => setPlan({ ...plan, weeks: +e.target.value || 1 })} className="w-16 rounded-2xl bg-neutral-800 px-3 py-3 text-white" /><span>нед.</span>
            </div>
            <div className="flex justify-between">
              {[[1, "Пн"], [2, "Вт"], [3, "Ср"], [4, "Чт"], [5, "Пт"], [6, "Сб"], [0, "Вс"]].map(([i, l]) => (
                <button key={i} onClick={() => setDow(i)} className={`relative h-10 w-10 rounded-full text-sm ${dow === i ? "bg-red-600 text-white" : "bg-neutral-800 text-neutral-400"}`}>{l}
                  {plan.wk[i]?.exercises.length > 0 && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-white" />}</button>))}
            </div>
            <Input placeholder="Название тренировки (Pull & Back)" value={cur.title} onChange={(e) => setCur({ title: e.target.value })} />
            {cur.exercises.map((e) => (
              <div key={e.id} className="space-y-2 rounded-2xl bg-neutral-800 p-3">
                <div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold">{e.name}</p><button type="button" aria-label="Убрать упражнение" onClick={() => setCur({ exercises: cur.exercises.filter((x) => x.id !== e.id) })}><Trash2 size={16} className="text-neutral-500" /></button></div>
                <div className="flex gap-2">
                  <InputS placeholder="Подходы, техника" value={e.comment || ""} onChange={(ev) => updEx(e.id, { comment: ev.target.value })} />
                  <InputS className="!w-24 shrink-0" type="number" step="0.5" inputMode="decimal" placeholder="Вес, кг" value={e.w ?? ""} onChange={(ev) => updEx(e.id, { w: ev.target.value })} />
                </div>
              </div>
            ))}
            {!cur.exercises.length && <p className="text-xs text-neutral-500">В этот день пока пусто — это день отдыха.</p>}
            <div className="space-y-2 rounded-2xl border border-dashed border-white/10 p-3">
              <select className="w-full rounded-2xl bg-neutral-800 px-4 py-3 text-sm text-neutral-300" value={ex.libId} onChange={(e) => { const x = (db.library || []).find((y) => y.id === e.target.value); setEx(x ? { ...ex, libId: x.id, name: x.name, url: x.url, comment: x.comment } : { ...ex, libId: "" }); }}>
                <option value="">Выбрать из библиотеки…</option>
                {(db.library || []).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
              <Input placeholder="Упражнение" value={ex.name} onChange={(e) => setEx({ ...ex, name: e.target.value })} />
              <Input placeholder="Ссылка YouTube / Vimeo" value={ex.url} onChange={(e) => setEx({ ...ex, url: e.target.value })} />
              <Input placeholder="Комментарий (подходы, техника)" value={ex.comment} onChange={(e) => setEx({ ...ex, comment: e.target.value })} />
              <Input type="number" placeholder="Рабочий вес клиента, кг (необязательно)" value={ex.w} onChange={(e) => setEx({ ...ex, w: e.target.value })} />
              <Btn red={false} onClick={() => { if (ex.name) { setCur({ exercises: [...cur.exercises, { ...ex, id: uid() }] }); setEx({ name: "", url: "", comment: "", w: "", libId: "" }); } }}>Добавить упражнение в этот день</Btn>
            </div>
            <p className="text-xs text-neutral-500">Белая точка на дне — упражнения добавлены. Уже выполненные тренировки при пересоздании не удаляются.</p>
            <Btn onClick={savePlan} className="w-full">Создать программу</Btn>
            <div className="space-y-2 border-t border-white/5 pt-3">
              <Input placeholder="Название шаблона" value={tplName} onChange={(e) => setTplName(e.target.value)} />
              <Btn red={false} className="w-full" onClick={saveTpl}>Сохранить как шаблон</Btn>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ---------- Client cabinet ---------- */
function Login({ invalid }) {
  return (
    <div className="mx-auto max-w-sm space-y-4 pt-10">
      <h1 className="text-4xl font-extrabold leading-tight">{invalid ? "Ссылка не найдена" : "Вход по персональной ссылке"}</h1>
      <p className="text-neutral-400">{invalid ? "Проверь, что скопировал ссылку целиком, или попроси тренера прислать её ещё раз." : "Открой ссылку, которую прислал тренер, — она ведёт сразу в твой кабинет."}</p>
    </div>
  );
}

function Welcome({ set }) {
  return (
    <div className="mx-auto flex min-h-[85vh] max-w-sm flex-col">
      <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-neutral-900 bg-[radial-gradient(ellipse_at_50%_35%,rgba(220,38,38,0.45),transparent_65%)]">
        <img src={TRAINER_PHOTO} alt="Югай Антон" className="aspect-[4/5] w-full object-contain object-bottom" />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-neutral-950 via-neutral-950/60 to-transparent" />
        <div className="absolute bottom-4 left-5 right-5">
          <p className="text-3xl font-extrabold leading-tight">Югай Антон</p>
          <p className="text-sm font-medium text-red-500">Твой друг и тренер</p>
        </div>
      </div>
      <div className="space-y-4 py-6 text-[15px] leading-relaxed text-neutral-300">
        <p className="text-lg font-semibold text-white">Привет! Я Югай Антон — твой друг и тренер.</p>
        <p>За моими плечами — 9 лет стажа в спорте и постоянное погружение в биомеханику, физиологию и нутрициологию.</p>
        <p>Мой главный принцип — никакой «воды» и мифов, только тренировки по науке. Мы будем работать на результат без изнурительного голода и травм, опираясь на реальные данные вашего организма, цифры и системный подход.</p>
        <p className="font-semibold text-white">Готовы построить тело своей мечты осознанно? Давайте начнем! 🚀</p>
      </div>
      <div className="mb-6 rounded-3xl border border-white/5 bg-neutral-900 p-4">
        <p className="font-semibold text-white">Что тебя ждёт в приложении</p>
        <div className="-mx-1 mt-3 flex items-start snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2">
          {[["home", "Тренировка на сегодня"], ["habits", "Привычки каждый день"], ["achievements", "Достижения"]].map(([k, t]) => (
            <div key={k} className="w-56 shrink-0 snap-start space-y-1.5">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-950 p-1"><img src={ONB[k]} alt={t} className="w-full rounded-xl" /></div>
              <p className="text-center text-xs text-neutral-400">{t}</p>
            </div>))}
        </div>
        <p className="text-center text-[11px] text-neutral-600">Листай вбок →</p>
        <p className="mt-3 text-sm text-neutral-400">Дальше за пару минут покажу, как всем этим пользоваться — шаг за шагом.</p>
      </div>
      <div className="mt-auto pb-4"><Btn onClick={() => set((d) => { d.session.welcomed = true; })} className="w-full !py-4 text-base">Показать, как это работает</Btn></div>
    </div>
  );
}

function Onboarding({ set }) {
  const [i, setI] = useState(0);
  const steps = [
    { n: "1", t: "Заходи каждый день и отмечай привычки", img: "habits", p: "На главной — четыре привычки: вода, шаги, калории и сон.", tips: ["Выполнил цель — нажми кружок слева.", "Или нажимай «+» и добавляй понемногу в течение дня."] },
    { n: "2", t: "Тренируйся по графику и записывай вес и сложность", img: "workout", p: "Сегодняшняя тренировка — на главной, вся программа — во вкладке с гантелей.", tips: ["Впиши вес, с которым работал.", "Отметь сложность от 1 до 10.", "В конце нажми «Завершить тренировку»."] },
    { n: "3", t: "Раз в месяц вноси замеры", img: "measures", p: "Профиль → замеры: вес и обхваты. Приложение само покажет, что изменилось с начала занятий и с прошлого месяца.", tips: ["Не знаешь, как мерить? Нажми «Как делать замеры?» под формой."] },
  ];
  const st = steps[i], last = i === steps.length - 1;
  useEffect(() => { try { window.scrollTo(0, 0); } catch {} }, [i]);
  const done = () => set((d) => { d.session.onboarded = true; });
  return (
    <div className="mx-auto flex min-h-[85vh] max-w-sm flex-col">
      <div className="flex items-center justify-between pb-2 text-sm text-neutral-500">
        <span>Шаг {i + 1} из {steps.length}</span>
        {!last && <button type="button" onClick={done} className="underline underline-offset-4">Пропустить</button>}
      </div>
      <div className="mb-5 flex gap-1">{steps.map((_, j) => <span key={j} className={`h-1 flex-1 rounded-full ${j <= i ? "bg-red-600" : "bg-neutral-800"}`} />)}</div>
      <div className="flex-1 space-y-4">
        {st.img && <div className="overflow-hidden rounded-3xl border border-white/10 bg-neutral-900 p-2"><img key={st.img} src={ONB[st.img]} alt={st.t} className="mx-auto max-h-[36vh] w-full rounded-2xl object-contain" /></div>}
        <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-600 text-lg font-extrabold">{st.n}</span><h1 className="text-2xl font-extrabold leading-tight">{st.t}</h1></div>
        <p className="leading-relaxed text-neutral-300">{st.p}</p>
        {st.tabs && <div className="space-y-2">{st.tabs.map(([I, n, d]) => (
          <div key={n} className="flex items-center gap-3 rounded-2xl bg-neutral-900 p-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-600"><I size={20} /></span><p className="text-sm text-neutral-300"><b className="text-white">{n}</b> — {d}</p></div>))}</div>}
        {st.tips && <ul className="space-y-2">{st.tips.map((t) => <li key={t} className="flex gap-2 text-sm leading-relaxed text-neutral-400"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-red-600" />{t}</li>)}</ul>}
        {st.check && <ul className="space-y-2">{st.check.map((t) => <li key={t} className="flex items-start gap-3 rounded-2xl bg-neutral-900 p-3 text-sm text-neutral-200"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-600"><Check size={12} /></span>{t}</li>)}</ul>}
        {st.end && <p className="font-semibold text-white">{st.end}</p>}
      </div>
      <div className="sticky bottom-0 mt-6 flex gap-2 bg-gradient-to-t from-neutral-950 via-neutral-950 to-transparent pb-4 pt-6">
        {i > 0 && <Btn red={false} onClick={() => setI(i - 1)}>Назад</Btn>}
        <Btn onClick={() => (last ? done() : setI(i + 1))} className="flex-1">{last ? "Понятно, начинаем" : "Далее"}</Btn>
      </div>
    </div>
  );
}

const HABITS = [["water", "Вода", 2, 0.25, "л", Droplets], ["steps", "Шаги", 10000, 1000, "", Footprints], ["cal", "Калории", 2000, 250, "ккал", Flame], ["sleep", "Сон", 8, 0.5, "ч", Moon]];

function ClientApp({ db, set }) {
  const cid = db.session.clientId;
  const me = db.clients.find((c) => c.id === cid);
  const [tab, setTab] = useState("home");
  const [sel, setSel] = useState(today());
  const [run, setRun] = useState(null);
  const [memoOpen, setMemoOpen] = useState(null), [memoFrom, setMemoFrom] = useState(null);
  const L = db.logs[cid] || { days: {}, done: {}, sets: {} };
  const aw = (x) => db.weights?.[cid]?.[exKey(x)]?.hist.at(-1)?.w;
  // видео и комментарий упражнения из библиотеки подтягиваются актуальные
  const rx = (x) => { const l = x.libId && (db.library || []).find((y) => y.id === x.libId); return l ? { ...x, url: l.url || x.url, comment: x.comment || l.comment } : x; };
  const ensure = (d) => { d.logs[cid] ||= { days: {}, done: {}, sets: {} }; return d.logs[cid]; };
  const day = { water: 0, steps: 0, cal: 0, sleep: 0, ...(L.days[today()] || {}) };
  const bump = (k, inc, goal, toggle) => set((d) => { const l = ensure(d); const cur = l.days[today()] ||= { water: 0, steps: 0, cal: 0, sleep: 0 }, v = cur[k] || 0;
    cur[k] = toggle ? (v >= goal ? 0 : goal) : Math.min(goal, +(v + inc).toFixed(2)); });
  const active = (s) => { const v = L.days[s]; return (v && (v.water || v.steps || v.cal)) || Object.values(L.done).includes(s); };
  let streak = 0; for (let i = active(today()) ? 0 : 1; active(dayStr(-i)); i++) streak++;
  const plans = db.plans.filter((p) => p.clientId === cid).sort((a, b) => a.date.localeCompare(b.date));
  const week = Array.from({ length: 7 }, (_, i) => dayStr(i - 3));
  const todayPlan = plans.find((p) => p.date === today() && !L.done[p.id]);
  const mp = plans.filter((p) => ym(p.date) === ym(today()));
  const doneN = mp.filter((p) => L.done[p.id]).length;
  const missed = mp.filter((p) => isMissed(p, L)).length;
  const left = mp.length - doneN - missed;
  const dayPlans = plans.filter((p) => p.date === sel);

  if (run) {
    const p = plans.find((x) => x.id === run);
    return <Workout p={p} L={L} rx={rx} W={db.weights?.[cid] || {}} back={() => setRun(null)} set={set} ensure={ensure} />;
  }

  return (
    <div className="space-y-5 pb-24">
      {tab === "home" && (<>
        <div><p className="text-sm text-neutral-500">{new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}</p><H>Привет, {me.name}</H></div>
        {todayPlan && (
          <Card className="flex items-center justify-between"><div><p className="text-xs text-neutral-500">Сегодняшняя тренировка</p><p className="text-xl font-bold">{todayPlan.title}</p><p className="text-xs text-neutral-500">{todayPlan.exercises.length} упражнений</p></div>
            <button onClick={() => setRun(todayPlan.id)} className="rounded-full bg-red-600 p-4"><Play size={22} fill="white" /></button></Card>
        )}
        <Card>
          <p className="text-xs text-neutral-500">Силовые в этом месяце</p>
          <p className="text-3xl font-extrabold">{doneN} <span className="text-lg font-semibold text-neutral-400">из {mp.length} тренировок сделано</span></p>
          <div className="my-3 flex flex-wrap gap-1.5">{mp.map((p) => <span key={p.id} className={`h-2.5 w-2.5 rounded-full ${L.done[p.id] ? "bg-red-600" : isMissed(p, L) ? "border border-red-600" : "bg-neutral-700"}`} />)}</div>
          <p className="text-sm text-neutral-400">Пропущено: {missed} · Осталось: {left}</p>
        </Card>
        <Card>
          <div className="mb-3 flex items-center justify-between"><p className="flex items-center gap-2 font-semibold"><Calendar size={16} />Календарь тренировок</p><p className="flex items-center gap-1 text-sm text-red-500"><Flame size={16} />Серия: {streak} дн.</p></div>
          <MonthCal plans={plans} L={L} />
        </Card>
        <Card>
          <p className="mb-3 font-semibold">Привычки на сегодня</p>
          <div className="space-y-4">
            {HABITS.map(([k, l, goal, inc, u, I]) => (
              <div key={k}>
                <div className="flex items-center gap-3">
                  <button onClick={() => bump(k, inc, goal, true)} className={`flex h-7 w-7 items-center justify-center rounded-full border ${day[k] >= goal ? "border-red-600 bg-red-600" : "border-neutral-600"}`}>{day[k] >= goal && <Check size={16} />}</button>
                  <I size={18} className="text-red-500" />
                  <span className="flex-1">{l}</span>
                  <span className="text-sm text-neutral-400">{day[k]} / {goal} {u}</span>
                  <button onClick={() => bump(k, inc, goal)} className="rounded-full bg-neutral-800 p-1.5"><Plus size={14} /></button>
                </div>
                <div className="ml-10 mt-2 h-1.5 rounded-full bg-neutral-800"><div className="h-full rounded-full bg-red-600" style={{ width: `${(day[k] / goal) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <p className="mb-3 font-semibold">Привычки за 7 дней</p>
          <TriRing days={L.days} />
        </Card>
      </>)}

      {tab === "workouts" && (<>
        <H>Тренировки</H>
        <div className="flex items-center justify-between text-sm">
          <button onClick={() => setSel(shift(sel, -7))} aria-label="Предыдущая неделя"><ChevronLeft size={18} /></button>
          <span className="text-neutral-400">{new Date(sel + "T00:00:00").toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}</span>
          <button onClick={() => setSel(shift(sel, 7))} aria-label="Следующая неделя"><ChevronRight size={18} /></button>
        </div>
        <div className="flex justify-between">
          {Array.from({ length: 7 }, (_, i) => shift(sel, i - ((new Date(sel + "T00:00:00").getDay() + 6) % 7))).map((c, i) => {
            const ps = plans.filter((x) => x.date === c), dn = ps.length > 0 && ps.every((x) => L.done[x.id]);
            return (
              <button key={c} onClick={() => setSel(c)} className={`flex w-11 flex-col items-center rounded-2xl py-2 ${c === sel ? "bg-white text-black" : "text-neutral-400"}`}>
                <span className="text-[11px]">{["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"][i]}</span><span className="text-lg font-bold">{+c.slice(8)}</span>
                <span className={`mt-1 h-1.5 w-1.5 rounded-full ${dn ? "bg-red-600" : ps.length ? "border border-red-600" : "bg-neutral-700"}`} />
              </button>);
          })}
        </div>
        {!dayPlans.length && <Card className="text-neutral-500">В этот день тренировок нет — отдых.</Card>}
        {dayPlans.map((p) => (
          <Card key={p.id} className="space-y-3">
            <div className="flex items-center justify-between"><p className="text-lg font-bold">{p.title}</p>{L.done[p.id] ? <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-600"><Check size={16} /></span> : isMissed(p, L) && <span className="text-xs text-red-400">Пропущена</span>}</div>
            <div className="space-y-2">
              {p.exercises.map((x) => (
                <div key={x.id} className="flex items-start gap-3 rounded-2xl bg-neutral-800 px-4 py-3 text-sm">
                  <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${L.sets[x.id]?.ok ? "border-red-600 bg-red-600" : "border-neutral-600"}`}>{L.sets[x.id]?.ok && <Check size={12} />}</span>
                  <div><p className="font-medium">{x.name}</p>{rx(x).comment && <p className="text-xs text-neutral-500">{rx(x).comment}</p>}{aw(x) != null && <p className="text-xs text-red-400">Рабочий вес: {aw(x)} кг</p>}</div>
                </div>))}
            </div>
            {sel <= today() ? <Btn onClick={() => setRun(p.id)} className="w-full">{L.done[p.id] ? "Открыть снова" : "Начать тренировку"}</Btn> : <p className="text-xs text-neutral-500">Откроется в день тренировки.</p>}
          </Card>))}
      </>)}

      {tab === "info" && <Memos memos={db.memos || []} open={memoOpen} setOpen={setMemoOpen} backLabel={memoFrom ? "К замерам" : "Все памятки"} onBack={() => { setMemoOpen(null); if (memoFrom) { setTab(memoFrom); setMemoFrom(null); } }} />}

      {tab === "profile" && (<>
        <H>Профиль</H>
        <Card><p className="text-2xl font-bold">{me.name}</p><p className="text-neutral-500">{me.age} лет</p></Card>
        <Card><p className="mb-3 text-sm text-neutral-400">Показатели InBody</p>
          <div className="grid grid-cols-2 gap-3">
            {[["Вес", me.inbody.weight, "кг"], ["Мышцы", me.inbody.muscle, "кг"], ["Жир", me.inbody.fat, "%"], ["ИМТ", me.inbody.bmi, ""]].map(([l, v, u]) => (
              <div key={l} className="rounded-2xl bg-neutral-800 p-3"><p className="text-xs text-neutral-500">{l}</p><p className="text-xl font-bold">{v} <span className="text-xs text-neutral-500">{u}</span></p></div>
            ))}</div></Card>
        <Card className="space-y-3">
          <p className="text-sm text-neutral-400">Ежемесячные замеры · {monLabel(ym(today()))}</p>
          <MeasureForm L={L} onGuide={(db.memos || []).some((x) => x.id === MEASURE_MEMO_ID) ? () => { setMemoFrom("profile"); setMemoOpen(MEASURE_MEMO_ID); setTab("info"); } : null}
            save={(f) => set((d) => { const l = ensure(d); (l.measures ||= {})[ym(today())] = f; })} />
        </Card>
        <Card className="space-y-4">
          <p className="font-semibold">Твой прогресс</p>
          <MeasureProgress L={L} />
          <MeasureHistory L={L} />
        </Card>
        <Achievements list={achievements(me, L, plans)} />
        <Btn red={false} onClick={() => set((d) => { d.session.clientId = null; d.session.onboarded = false; d.session.welcomed = false; })}>Выйти</Btn>
      </>)}

      <nav className="fixed inset-x-0 bottom-4 mx-auto flex w-72 justify-around rounded-full border border-white/10 bg-neutral-900/95 p-2 backdrop-blur">
        {[["home", Home], ["workouts", Dumbbell], ["info", BookOpen], ["profile", User]].map(([k, I]) => (
          <button key={k} onClick={() => { setTab(k); setMemoFrom(null); if (k === "info") setMemoOpen(null); }} className={`rounded-full p-3 ${tab === k ? "bg-red-600 text-white" : "text-neutral-400"}`}><I size={20} /></button>
        ))}
      </nav>
    </div>
  );
}

function Workout({ p, L, W, rx, back, set, ensure }) {
  const [cur, setCur] = useState(0);
  const e = rx(p.exercises[cur]);
  const s = L.sets[e.id] || { weight: "", rpe: 0, ok: false };
  const upd = (patch) => set((d) => { const l = ensure(d); l.sets[e.id] = { ...s, ...patch }; });
  const src = e.url && embed(e.url);
  const aw = W[exKey(e)]?.hist.at(-1)?.w;
  const finish = () => { set((d) => { const l = ensure(d); l.done[p.id] = today(); l.wlog ||= []; p.exercises.forEach((x) => { const t = l.sets[x.id]; if (t?.weight) l.wlog.push({ name: x.name.trim().toLowerCase(), w: +t.weight, m: ym(today()) }); if (t?.rpe >= 8) l.hard = true; }); }); back(); };
  return (
    <div className="space-y-4">
      <button onClick={back} className="flex items-center text-sm text-neutral-400"><ChevronLeft size={18} />Назад</button>
      <H>{p.title}</H>
      <div className="aspect-video overflow-hidden rounded-3xl bg-neutral-900">
        {src ? <iframe title={e.name} src={src} className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
          : e.url ? <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-neutral-400"><span>Видео нельзя показать здесь</span><a href={e.url} target="_blank" rel="noreferrer" className="rounded-full bg-red-600 px-5 py-2 font-semibold text-white">Открыть видео</a></div>
          : <div className="flex h-full items-center justify-center text-sm text-neutral-600">Видео не добавлено</div>}
      </div>
      {src && <p className="text-center text-xs text-neutral-500">Видео не загружается? <a href={e.url} target="_blank" rel="noreferrer" className="text-red-500 underline">Открыть в браузере</a></p>}
      <Card className="space-y-3">
        <p className="text-lg font-bold">{e.name}</p>
        {e.comment && <p className="text-sm text-neutral-400">{e.comment}</p>}
        {aw != null && <p className="text-sm font-semibold text-red-400">Рабочий вес от тренера: {aw} кг</p>}
        <Input type="number" placeholder="Рабочий вес, кг" value={s.weight} onChange={(ev) => upd({ weight: ev.target.value })} />
        <div><p className="mb-2 text-xs text-neutral-500">Сложность (1–10, 8 и выше — «Тяжело»)</p>
          <div className="flex flex-wrap gap-2">{Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button key={n} onClick={() => upd({ rpe: n })} className={`h-9 w-9 rounded-full text-sm ${s.rpe === n ? "bg-red-600 text-white" : "bg-neutral-800 text-neutral-400"}`}>{n}</button>))}</div></div>
      </Card>
      <div className="space-y-2">
        {p.exercises.map((x, i) => (
          <div key={x.id} onClick={() => setCur(i)} className={`flex cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 text-sm ${i === cur ? "bg-neutral-800" : ""}`}>
            <button onClick={(ev) => { ev.stopPropagation(); set((d) => { const l = ensure(d); const o = l.sets[x.id] || { weight: "", rpe: 0, ok: false }; l.sets[x.id] = { ...o, ok: !o.ok }; }); }}
              className={`flex h-6 w-6 items-center justify-center rounded-full border ${L.sets[x.id]?.ok ? "border-red-600 bg-red-600" : "border-neutral-600"}`}>{L.sets[x.id]?.ok && <Check size={14} />}</button>
            {x.name}
          </div>
        ))}
      </div>
      <Btn onClick={finish} className="w-full">Завершить тренировку</Btn>
    </div>
  );
}

/* Кольцо делится на части по числу привычек (вода / шаги / калории / сон). В каждой части 7 сегментов = последние 7 дней, от старых к новым по часовой стрелке. */
function TriRing({ days }) {
  const N = HABITS.length, span = 360 / N, pad = 3, w = (span - 2 * pad) / 7;
  const pt = (a, r) => [100 + r * Math.cos((a * Math.PI) / 180), 100 + r * Math.sin((a * Math.PI) / 180)];
  const seg = (a1, a2) => { const [x1, y1] = pt(a1, 74), [x2, y2] = pt(a2, 74); return `M${x1} ${y1} A74 74 0 0 1 ${x2} ${y2}`; };
  const rows = HABITS.map(([k, l, goal, , , I]) => {
    const hits = Array.from({ length: 7 }, (_, j) => (days[dayStr(j - 6)]?.[k] || 0) >= goal);
    return { k, l, I, hits, n: hits.filter(Boolean).length };
  });
  const total = rows.reduce((t, r) => t + r.n, 0);
  return (
    <div className="flex items-center gap-4">
      <div className="relative h-44 w-44 shrink-0">
        <svg viewBox="0 0 200 200" role="img" aria-label={`Привычки за 7 дней: ${total} из ${N * 7}`}>
          {rows.map((r, h) => r.hits.map((on, j) => { const a = -90 + h * span + pad + j * w; return <path key={`${h}-${j}`} d={seg(a, a + w - 2)} fill="none" strokeWidth="12" stroke={on ? "#dc2626" : "#262626"} />; }))}
        </svg>
        {rows.map((r, h) => { const a = ((-90 + h * span + span / 2) * Math.PI) / 180; return <span key={r.k} className="absolute" style={{ left: `${50 + 25 * Math.cos(a)}%`, top: `${50 + 25 * Math.sin(a)}%`, transform: "translate(-50%,-50%)" }}><r.I size={16} className="text-red-500" /></span>; })}
        <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-2xl font-bold">{total}</span><span className="text-[10px] text-neutral-500">из {N * 7}</span></div>
      </div>
      <div className="flex-1 space-y-3">
        {rows.map((r) => (
          <div key={r.k} className="flex items-center gap-2 text-sm"><r.I size={16} className="text-red-500" /><span className="flex-1">{r.l}</span><span className="text-neutral-400">{r.n} / 7</span></div>
        ))}
        <p className="text-[11px] text-neutral-500">Красный сегмент — цель дня выполнена</p>
      </div>
    </div>
  );
}

/* ---------- Calendar, measures, achievements ---------- */
function MonthCal({ plans, L, onPick, sel, compact }) {
  const [off, setOff] = useState(0);
  const b = new Date(); b.setDate(1); b.setMonth(b.getMonth() + off);
  const y = b.getFullYear(), m = b.getMonth(), lead = (b.getDay() + 6) % 7, n = new Date(y, m + 1, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: n }, (_, i) => fmt(new Date(y, m, i + 1)))];
  const LBL = { done: "выполнена", miss: "пропущена", plan: "впереди" };
  const stOf = (c) => { const p = plans.find((x) => x.date === c); return !p ? null : L.done?.[p.id] ? "done" : isMissed(p, L) ? "miss" : "plan"; };
  const cnt = { done: 0, miss: 0, plan: 0 }; cells.forEach((c) => { const k = c && stOf(c); if (k) cnt[k]++; });
  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-sm">
        <button type="button" aria-label="Предыдущий месяц" onClick={() => setOff(off - 1)}><ChevronLeft size={18} /></button>
        <span className="font-semibold">{monLabel(fmt(b).slice(0, 7))}</span>
        <button type="button" aria-label="Следующий месяц" onClick={() => setOff(off + 1)}><ChevronRight size={18} /></button>
      </div>
      <div className={`grid grid-cols-7 text-center text-xs ${compact ? "gap-1" : "gap-1.5"}`}>
        {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => <span key={d} className="pb-1 text-neutral-600">{d}</span>)}
        {cells.map((c, i) => {
          if (!c) return <span key={i} />;
          const st = stOf(c), isToday = c === today();
          const cls = st === "done" ? "bg-emerald-600 text-white" : st === "miss" ? "border border-red-500 bg-red-950 text-red-300" : st === "plan" ? "border border-white/40 bg-neutral-800 text-white" : "text-neutral-500";
          const base = `flex ${compact ? "h-10" : "h-12"} flex-col items-center justify-center rounded-xl text-sm font-semibold leading-none ${cls} ${isToday ? "ring-2 ring-white ring-offset-2 ring-offset-neutral-900" : ""} ${sel === c ? "outline outline-2 outline-offset-1 outline-white" : ""}`;
          const inner = <><span>{+c.slice(8)}</span>{st && <span className="mt-1 h-3 text-[11px] leading-none">{st === "done" ? <Check size={12} strokeWidth={3} /> : st === "miss" ? "✕" : "•"}</span>}</>;
          return onPick && st ? <button key={i} type="button" aria-label={`${+c.slice(8)}: ${LBL[st]}`} onClick={() => onPick(c)} className={base}>{inner}</button> : <span key={i} className={base}>{inner}</span>;
        })}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        {[["done", "bg-emerald-600", "Выполнено"], ["miss", "border border-red-500 bg-red-950", "Пропущено"], ["plan", "border border-white/40 bg-neutral-800", "Впереди"]].map(([k, c, l]) => (
          <div key={k} className="flex min-w-0 items-center justify-center gap-1.5 rounded-xl bg-neutral-800 px-1.5 py-2 text-[11px]"><span className={`h-3 w-3 shrink-0 rounded ${c}`} /><span className="truncate text-neutral-300">{l}</span><b className="text-sm text-white">{cnt[k]}</b></div>))}
      </div>
    </div>
  );
}

function MeasureProgress({ L }) {
  const m = L?.measures || {}, ks = Object.keys(m).sort();
  if (!ks.length) return <p className="text-sm text-neutral-500">Замеров пока нет — прогресс появится после первого ввода.</p>;
  const last = ks.at(-1);
  const rows = MEASURE_FIELDS.map(([k, l, u]) => {
    const c = mnum(m[last][k]); if (c == null) return null;
    const ser = ks.filter((x) => mnum(m[x][k]) != null), first = ser[0], prev = ser.length > 1 ? ser.at(-2) : null, lines = [];
    if (first !== last) lines.push(`${delta(c, mnum(m[first][k]), u)} с начала занятий`);
    if (prev) lines.push(`${delta(c, mnum(m[prev][k]), u)} ${prev === pm(last, 1) ? "с прошлого месяца" : "с замера за " + monLabel(prev).toLowerCase()}`);
    return { k, l, u, c, lines };
  }).filter(Boolean);
  return (
    <div>
      <p className="mb-1 text-xs text-neutral-500">Последний замер: {monLabel(last)}{ks.length === 1 && ". Сравнение появится после следующего замера."}</p>
      {rows.map((r) => (
        <div key={r.k} className="border-b border-white/5 py-2.5 last:border-0">
          <div className="flex items-baseline justify-between"><span className="font-medium">{r.l}</span><span className="font-bold">{nf(r.c)} <span className="text-xs font-normal text-neutral-500">{r.u}</span></span></div>
          {r.lines.length > 0 && <p className="mt-0.5 text-xs text-neutral-400">{r.lines.join(" · ")}</p>}
        </div>))}
    </div>
  );
}

function MeasureHistory({ L }) {
  const m = L?.measures || {}, ks = Object.keys(m).sort().reverse(), [all, setAll] = useState(false);
  if (!ks.length) return null;
  const shown = all ? ks : ks.slice(0, 3);
  return (
    <div className="space-y-2">
      <p className="text-xs text-neutral-500">История по месяцам</p>
      {shown.map((k) => (
        <div key={k} className="rounded-2xl bg-neutral-800 p-3">
          <p className="mb-2 text-sm font-semibold">{monLabel(k)}</p>
          <div className="grid grid-cols-3 gap-x-3 gap-y-2 text-xs">
            {MEASURE_FIELDS.filter(([f]) => mnum(m[k][f]) != null).map(([f, l, u]) => <div key={f}><span className="text-neutral-500">{l}</span><p className="font-semibold text-white">{nf(mnum(m[k][f]))} <span className="font-normal text-neutral-500">{u}</span></p></div>)}
          </div>
        </div>))}
      {ks.length > 3 && <button type="button" onClick={() => setAll(!all)} className="text-sm text-red-500 underline underline-offset-4">{all ? "Свернуть" : `Показать все (${ks.length})`}</button>}
    </div>
  );
}

function MeasureForm({ L, save, onGuide }) {
  const cur = L.measures?.[ym(today())] || {};
  const [f, setF] = useState(() => Object.fromEntries(MEASURE_FIELDS.map(([k]) => [k, cur[k] ?? ""])));
  const [ok, setOk] = useState(false);
  const go = () => {
    const clean = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, mnum(v)]).filter(([, v]) => v != null && v > 0));
    if (!Object.keys(clean).length) return;
    save(clean); setOk(true); setTimeout(() => setOk(false), 2000);
  };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-x-2 gap-y-3">
        {MEASURE_FIELDS.map(([k, l, u]) => (
          <label key={k} className={`block ${k === "weight" ? "col-span-2" : ""}`}>
            <span className="mb-1 block text-xs text-neutral-500">{l}, {u}</span>
            <Input type="number" inputMode="decimal" step="0.1" min="0" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
          </label>))}
      </div>
      {onGuide && <button type="button" onClick={onGuide} className="text-sm text-red-500 underline underline-offset-4">Как делать замеры?</button>}
      <Btn onClick={go} className="w-full">{ok ? "Сохранено ✓" : "Сохранить замеры"}</Btn>
    </div>
  );
}

function Achievements({ list }) {
  const [tip, setTip] = useState(null);
  return (
    <Card>
      <p className="mb-3 font-semibold">Достижения: {list.filter((a) => a.ok).length} из {list.length}</p>
      <div className="grid grid-cols-3 gap-3">
        {list.map((a) => (
          <button key={a.t} title={a.d} onClick={() => setTip(a)} className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl p-2 text-center text-[11px] leading-tight ${a.ok ? "bg-gradient-to-br from-red-600 to-amber-500 text-white" : "bg-neutral-800 text-neutral-500 grayscale"}`}>
            <span className="text-3xl">{a.e}</span>{a.t}
          </button>))}
      </div>
      {tip && <p className="mt-3 text-sm text-neutral-400"><b className="text-white">{tip.t}.</b> {tip.d}</p>}
    </Card>
  );
}

const TA = "w-full rounded-2xl bg-neutral-800 px-4 py-3 text-sm text-white placeholder-neutral-500 outline-none focus:ring-2 focus:ring-red-600";

function LibraryTab({ db, set }) {
  const blank = { id: "", name: "", url: "", comment: "" };
  const [f, setF] = useState(blank);
  const save = () => { if (!f.name) return; set((d) => { d.library ||= []; if (f.id) { d.library[d.library.findIndex((x) => x.id === f.id)] = f; } else d.library.push({ ...f, id: uid() }); }); setF(blank); };
  return (
    <div className="space-y-4">
      <H>Библиотека упражнений</H>
      <Card className="space-y-2">
        <Input placeholder="Название упражнения" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <Input placeholder="Ссылка на видео (YouTube / Vimeo)" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} />
        <textarea rows={3} className={TA} placeholder="Комментарий: техника, подходы, ошибки" value={f.comment} onChange={(e) => setF({ ...f, comment: e.target.value })} />
        <div className="flex gap-2"><Btn onClick={save}>{f.id ? "Сохранить" : "Добавить в библиотеку"}</Btn>{f.id && <Btn red={false} onClick={() => setF(blank)}>Отмена</Btn>}</div>
      </Card>
      {(db.library || []).map((x) => (
        <Card key={x.id} className="flex items-start justify-between gap-3">
          <div><p className="font-semibold">{x.name}</p>{x.comment && <p className="text-sm text-neutral-400">{x.comment}</p>}{x.url && (embed(x.url) ? <p className="text-xs text-red-400">Видео распознано</p> : <p className="text-xs text-amber-400">Ссылка не распознана — проверьте адрес</p>)}</div>
          <div className="flex items-center gap-3"><button onClick={() => setF(x)} className="text-sm text-neutral-300">Изм.</button><button onClick={() => set((d) => { d.library = d.library.filter((y) => y.id !== x.id); })} aria-label="Удалить"><Trash2 size={18} className="text-neutral-500" /></button></div>
        </Card>))}
      <p className="text-xs text-neutral-500">Видео из библиотеки подтягивается в программы автоматически. Название и комментарий в уже созданных программах не меняются.</p>
    </div>
  );
}

const PROSE = "space-y-3 leading-relaxed text-neutral-300 [&_h1]:text-3xl [&_h1]:font-extrabold [&_h1]:text-white [&_h2]:pt-3 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-white [&_h3]:pt-1 [&_h3]:font-bold [&_h3]:text-white [&_b]:text-white [&_strong]:text-white [&_s]:line-through [&_strike]:line-through [&_pre]:whitespace-pre-wrap [&_pre]:rounded-xl [&_pre]:bg-neutral-900 [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-sm [&_ul]:list-disc [&_ul]:pl-5 [&_ul.dash]:list-['—_'] [&_ul.check]:list-['☐_'] [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_blockquote]:border-l-4 [&_blockquote]:border-red-600 [&_blockquote]:pl-4 [&_a]:font-medium [&_a]:text-red-500 [&_a]:underline [&_img]:my-2 [&_img]:max-w-full [&_img]:rounded-2xl [&_hr]:border-white/10";
const OK = new Set(["P", "BR", "H1", "H2", "H3", "B", "STRONG", "I", "EM", "U", "S", "STRIKE", "PRE", "CODE", "UL", "OL", "LI", "A", "BLOCKQUOTE", "IMG", "HR", "DIV", "SPAN"]);
const DROP = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "LINK", "META", "FORM", "INPUT", "BUTTON", "SVG", "MATH", "TEXTAREA", "SELECT"]);
// Очистка HTML памятки: оставляем только безопасные теги и атрибуты
const cleanStyle = (v) => v.split(";").map((x) => x.split(":").map((y) => y.trim())).filter(([k, val]) => (k === "color" || k === "background-color") && /^(#[0-9a-f]{3,8}|rgba?\([\d\s,.]+\)|transparent)$/i.test(val)).map(([k, val]) => `${k}:${val}`).join(";");
const sanitize = (html) => {
  const doc = new DOMParser().parseFromString(`<body>${html || ""}</body>`, "text/html");
  const walk = (n) => [...n.childNodes].forEach((c) => {
    if (c.nodeType !== 1) { if (c.nodeType !== 3) c.remove(); return; }
    if (DROP.has(c.tagName.toUpperCase())) { c.remove(); return; }
    walk(c);
    if (!OK.has(c.tagName)) { c.replaceWith(...c.childNodes); return; }
    [...c.attributes].forEach((a) => {
      const v = a.value.trim(), t = c.tagName;
      if (t === "SPAN" && a.name === "style") { const cs = cleanStyle(v); if (cs) c.setAttribute("style", cs); else c.removeAttribute("style"); return; }
      if (t === "UL" && a.name === "class" && /^(dash|check)$/.test(v)) return;
      const good = (t === "A" && a.name === "href" && /^(https?:|mailto:)/i.test(v)) || (t === "IMG" && a.name === "src" && /^(https:|data:image\/(png|jpe?g|webp|gif);)/i.test(v)) || (t === "IMG" && a.name === "alt");
      if (!good) c.removeAttribute(a.name);
    });
    if (c.tagName === "A") { c.setAttribute("target", "_blank"); c.setAttribute("rel", "noopener noreferrer"); }
  });
  walk(doc.body);
  return doc.body.innerHTML;
};
// Старые памятки хранятся в простой разметке — переводим в HTML для редактора и просмотра
const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inl = (t) => esc(t).replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
const mdToHtml = (text) => {
  let out = "", list = false;
  const close = () => { if (list) { out += "</ul>"; list = false; } };
  text.split("\n").forEach((raw) => {
    const l = raw.trim();
    if (l.startsWith("- ")) { if (!list) { out += "<ul>"; list = true; } out += `<li>${inl(l.slice(2))}</li>`; return; }
    close(); if (!l) return;
    const img = l.match(/^!\[[^\]]*\]\(([^)]+)\)$/);
    out += img ? `<img src="${img[1]}">` : l === "---" ? "<hr>" : l.startsWith("## ") ? `<h2>${inl(l.slice(3))}</h2>` : l.startsWith("### ") ? `<h3>${inl(l.slice(4))}</h3>` : l.startsWith("> ") ? `<blockquote>${inl(l.slice(2))}</blockquote>` : `<p>${inl(l)}</p>`;
  });
  close();
  return out;
};

/* ---------- Памятки: блочный редактор (как в Notion) и страница чтения ---------- */
const TEXTY = ["p", "h1", "h2", "h3", "bullet", "number", "todo", "quote", "callout"];
const BT = [
  ["p", "Текст", "Обычный абзац", "text paragraph текст абзац"],
  ["h1", "Название", "Крупный заголовок", "h1 title название"],
  ["h2", "Заголовок", "Раздел", "h2 heading заголовок"],
  ["h3", "Подзаголовок", "Подраздел", "h3 подзаголовок"],
  ["bullet", "Маркированный список", "• пункты", "list bullet список маркер"],
  ["number", "Нумерованный список", "1. 2. 3.", "number список нумер"],
  ["todo", "Чек-лист", "☐ задачи", "todo check чек"],
  ["quote", "Цитата", "Мысль с красной линией", "quote цитата"],
  ["callout", "Выделенный блок", "Важное в рамке", "callout важно выделенный"],
  ["divider", "Разделитель", "Горизонтальная линия", "divider line линия"],
  ["image", "Изображение", "Загрузить фото", "image photo фото картинка"],
];
const bid = () => Math.random().toString(36).slice(2, 9);
const nb = (type = "p", text = "") => ({ id: bid(), type, text });
const plain = (t) => (t || "").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
const readMin = (bl) => Math.max(1, Math.round(bl.map((b) => plain(b.text)).join(" ").split(/\s+/).filter(Boolean).length / 180));

// Старые памятки (простая разметка или HTML) превращаем в блоки
const mdToBlocks = (text) => {
  const out = [];
  (text || "").split("\n").forEach((raw) => {
    const l = raw.trim(); if (!l) return;
    const im = l.match(/^!\[[^\]]*\]\(([^)]+)\)$/);
    if (im) out.push({ id: bid(), type: "image", src: im[1], caption: "" });
    else if (l === "---") out.push(nb("divider"));
    else if (l.startsWith("### ")) out.push(nb("h3", l.slice(4)));
    else if (l.startsWith("## ")) out.push(nb("h2", l.slice(3)));
    else if (l.startsWith("# ")) out.push(nb("h1", l.slice(2)));
    else if (l.startsWith("> ")) out.push(nb("quote", l.slice(2)));
    else if (l.startsWith("- ")) out.push(nb("bullet", l.slice(2)));
    else out.push(nb("p", l));
  });
  return out.length ? out : [nb()];
};
const nodeMd = (n) => {
  if (n.nodeType === 3) return n.textContent;
  if (n.nodeType !== 1) return "";
  const t = n.tagName, inner = [...n.childNodes].map(nodeMd).join("");
  if (!inner.trim()) return inner;
  if (t === "B" || t === "STRONG") return `**${inner}**`;
  if (t === "I" || t === "EM") return `*${inner}*`;
  if (t === "A" && /^https?:/i.test(n.getAttribute("href") || "")) return `[${inner}](${n.getAttribute("href")})`;
  return inner;
};
const htmlToBlocks = (html) => {
  const doc = new DOMParser().parseFromString(`<body>${html || ""}</body>`, "text/html"), out = [];
  const push = (type, text) => { text = (text || "").replace(/\s+/g, " ").trim(); if (text) out.push(nb(type, text)); };
  const img = (n) => { const src = n.getAttribute("src") || ""; if (/^(https:|data:image)/i.test(src)) out.push({ id: bid(), type: "image", src, caption: "" }); };
  const walk = (el) => [...el.childNodes].forEach((n) => {
    if (n.nodeType === 3) { push("p", n.textContent); return; }
    if (n.nodeType !== 1) return;
    const t = n.tagName;
    if (t === "H1" || t === "H2" || t === "H3") push(t.toLowerCase(), nodeMd(n));
    else if (t === "UL" || t === "OL") [...n.children].forEach((li) => push(t === "OL" ? "number" : n.className === "check" ? "todo" : "bullet", nodeMd(li)));
    else if (t === "BLOCKQUOTE") push("quote", nodeMd(n));
    else if (t === "HR") out.push(nb("divider"));
    else if (t === "IMG") img(n);
    else if (t === "P" || t === "PRE") { push("p", nodeMd(n)); n.querySelectorAll("img").forEach(img); }
    else walk(n);
  });
  walk(doc.body);
  return out.length ? out : [nb()];
};
const memoBlocks = (m) => (m.blocks?.length ? m.blocks : m.html ? htmlToBlocks(m.html) : mdToBlocks(m.body || ""));

function Inline({ t }) {
  return (t || "").split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|\[[^\]]+\]\([^)]+\))/g).map((x, i) => {
    let m;
    if ((m = x.match(/^\*\*([^*]+)\*\*$/))) return <b key={i} className="font-bold text-white">{m[1]}</b>;
    if ((m = x.match(/^\*([^*]+)\*$/))) return <i key={i}>{m[1]}</i>;
    if ((m = x.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/))) return <a key={i} href={m[2]} target="_blank" rel="noreferrer noopener" className="font-medium text-red-500 underline decoration-red-500/40 underline-offset-4">{m[1]}</a>;
    return x;
  });
}

// Страница чтения: узкая колонка, крупный шрифт, большие интервалы — удобно с телефона
function Article({ m, progress }) {
  const blocks = memoBlocks(m);
  const [pr, setPr] = useState(0);
  useEffect(() => {
    if (!progress) return;
    const f = () => { const h = document.documentElement.scrollHeight - window.innerHeight; setPr(h > 0 ? Math.min(1, window.scrollY / h) : 0); };
    f(); window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);
  const els = []; let i = 0;
  while (i < blocks.length) {
    const b = blocks[i];
    if (b.type === "bullet" || b.type === "number" || b.type === "todo") {
      let j = i; const items = [];
      while (j < blocks.length && blocks[j].type === b.type) { items.push(blocks[j]); j++; }
      els.push(b.type === "number"
        ? <ol key={b.id} className="list-decimal space-y-2.5 pl-6 marker:font-semibold marker:text-red-500">{items.map((x) => <li key={x.id} className="whitespace-pre-wrap pl-1"><Inline t={x.text} /></li>)}</ol>
        : b.type === "bullet"
          ? <ul key={b.id} className="list-disc space-y-2.5 pl-6 marker:text-red-500">{items.map((x) => <li key={x.id} className="whitespace-pre-wrap pl-1"><Inline t={x.text} /></li>)}</ul>
          : <ul key={b.id} className="space-y-2.5">{items.map((x) => <li key={x.id} className="flex gap-3"><span className={`mt-[7px] flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${x.checked ? "border-red-600 bg-red-600" : "border-neutral-600"}`}>{x.checked && <Check size={13} />}</span><span className="whitespace-pre-wrap"><Inline t={x.text} /></span></li>)}</ul>);
      i = j; continue;
    }
    const k = b.id;
    if (b.type === "h1") els.push(<h2 key={k} className="pt-6 text-[28px] font-extrabold leading-tight tracking-tight text-white"><Inline t={b.text} /></h2>);
    else if (b.type === "h2") els.push(<h3 key={k} className="pt-5 text-[23px] font-bold leading-snug tracking-tight text-white"><Inline t={b.text} /></h3>);
    else if (b.type === "h3") els.push(<h4 key={k} className="pt-3 text-[19px] font-semibold leading-snug text-white"><Inline t={b.text} /></h4>);
    else if (b.type === "quote") els.push(<blockquote key={k} className="whitespace-pre-wrap border-l-4 border-red-600 py-1 pl-5 text-[19px] italic leading-relaxed text-neutral-200"><Inline t={b.text} /></blockquote>);
    else if (b.type === "callout") els.push(<div key={k} className="flex gap-3 rounded-2xl border border-red-600/30 bg-red-600/10 p-4"><span className="text-xl leading-7">💡</span><p className="whitespace-pre-wrap text-neutral-100"><Inline t={b.text} /></p></div>);
    else if (b.type === "divider") els.push(<hr key={k} className="my-3 border-white/10" />);
    else if (b.type === "image") { if (b.src) els.push(<figure key={k} className="space-y-2"><img src={b.src} alt={b.caption || ""} loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} className="w-full rounded-2xl" />{b.caption && <figcaption className="text-center text-sm text-neutral-500">{b.caption}</figcaption>}</figure>); }
    else if (b.text.trim()) els.push(<p key={k} className="whitespace-pre-wrap"><Inline t={b.text} /></p>);
    i++;
  }
  return (
    <>
      {progress && <div className="fixed inset-x-0 top-0 z-30 h-1"><div className="h-full bg-red-600 transition-[width]" style={{ width: `${pr * 100}%` }} /></div>}
      <article className="mx-auto max-w-[38rem] pb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-red-500">Памятка · {readMin(blocks)} мин чтения</p>
        <h1 className="mt-3 text-[32px] font-extrabold leading-[1.15] tracking-tight text-white">{m.title}</h1>
        <div className="mt-4 flex items-center gap-3 border-b border-white/10 pb-6">
          <img src={TRAINER_PHOTO} alt="" className="h-10 w-10 rounded-full bg-neutral-800 object-cover object-top" />
          <div className="text-sm leading-tight"><p className="font-semibold text-white">Югай Антон</p><p className="text-neutral-500">Твой друг и тренер</p></div>
        </div>
        <div className="mt-6 space-y-5 text-[17px] leading-[1.8] text-neutral-300">{els}</div>
      </article>
    </>
  );
}

function Grow({ inner, value, ...p }) {
  const r = useRef(null);
  useEffect(() => { const e = r.current; if (e) { e.style.height = "0px"; e.style.height = e.scrollHeight + "px"; } }, [value]);
  return <textarea ref={(e) => { r.current = e; inner && inner(e); }} rows={1} value={value} {...p} />;
}

const BCLS = {
  p: "text-base leading-7", h1: "text-3xl font-extrabold leading-tight", h2: "text-2xl font-bold leading-snug", h3: "text-xl font-semibold leading-snug",
  bullet: "text-base leading-7", number: "text-base leading-7", todo: "text-base leading-7",
  quote: "border-l-4 border-red-600 pl-4 text-base italic leading-7", callout: "text-base leading-7",
};

function BlockEditor({ value, onChange }) {
  const [blocks, setBlocks] = useState(() => (value && value.length ? value : [nb()]));
  const [menu, setMenu] = useState(null), [idx, setIdx] = useState(0), [dismiss, setDismiss] = useState(null), [active, setActive] = useState(null), [link, setLink] = useState(null);
  const bl = useRef(blocks); bl.current = blocks;
  const focus = useRef(null), last = useRef({ id: null, s: 0, e: 0 }), refs = useRef({}), fileEl = useRef(null), imgFor = useRef(null);
  const commit = (next, f) => { setBlocks(next); onChange(next); if (f) focus.current = f; };
  useEffect(() => {
    if (!focus.current) return;
    const { id, pos } = focus.current; focus.current = null;
    const el = refs.current[id]; if (!el) return;
    el.focus(); const p = pos == null ? el.value.length : pos; el.setSelectionRange(p, p);
  });
  const ix = (id) => blocks.findIndex((b) => b.id === id);
  const upd = (id, patch, f) => commit(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)), f);

  const sb = blocks.find((b) => b.id === last.current.id && TEXTY.includes(b.type) && /^\/\S*$/.test(b.text) && dismiss !== b.id);
  const cur = menu || (sb ? { id: sb.id, mode: "slash", q: sb.text.slice(1).toLowerCase() } : null);
  const list = cur ? BT.filter(([, l, , k]) => !cur.q || l.toLowerCase().includes(cur.q) || k.includes(cur.q)) : [];

  const addImage = async (file, id, replace) => {
    if (!file || !file.type.startsWith("image/")) return;
    const src = await fileToUrl(file), c = bl.current, i = c.findIndex((b) => b.id === id), next = [...c];
    if (replace && i >= 0) next[i] = { ...c[i], src };
    else next.splice(i < 0 ? c.length : i + 1, 0, { id: bid(), type: "image", src, caption: "" });
    commit(next);
  };
  const askImage = (id) => { imgFor.current = id; fileEl.current.click(); };

  const pick = (type) => {
    const { id, mode } = cur, i = ix(id), b = blocks[i], next = [...blocks];
    const n = type === "image" ? { id: bid(), type, src: "", caption: "" } : nb(type);
    const media = type === "divider" || type === "image";
    let f = null;
    if (mode === "convert" && !media && TEXTY.includes(b.type)) { next[i] = { ...b, type }; f = { id, pos: b.text.length }; }
    else {
      const at = mode === "slash" ? i : i + 1;
      if (mode === "slash") next.splice(i, 1);
      const add = media ? [n, nb()] : [n];
      next.splice(at, 0, ...add);
      f = { id: media ? add[1].id : n.id, pos: 0 };
    }
    commit(next, f); setMenu(null); setIdx(0); setDismiss(null);
    if (type === "image") askImage(n.id);
  };

  const onText = (b, v) => {
    if (b.type === "p") {
      const sh = [[/^# $/, "h1"], [/^## $/, "h2"], [/^### $/, "h3"], [/^[-*] $/, "bullet"], [/^1\. $/, "number"], [/^\[\] $/, "todo"], [/^> $/, "quote"]];
      for (const [re, t] of sh) if (re.test(v)) { upd(b.id, { type: t, text: "" }, { id: b.id, pos: 0 }); return; }
      if (v === "---") { const i = ix(b.id), next = [...blocks], p = nb(); next.splice(i, 1, nb("divider"), p); commit(next, { id: p.id, pos: 0 }); return; }
    }
    upd(b.id, { text: v }); setDismiss(null); setIdx(0);
  };
  const go = (i, d) => { for (let j = i + d; j >= 0 && j < blocks.length; j += d) if (TEXTY.includes(blocks[j].type)) { focus.current = { id: blocks[j].id, pos: d < 0 ? null : 0 }; setBlocks([...blocks]); return; } };

  const onKey = (e, b) => {
    const ta = e.target, s = ta.selectionStart, en = ta.selectionEnd, i = ix(b.id);
    if (cur && cur.id === b.id && list.length) {
      if (e.key === "ArrowDown") { e.preventDefault(); setIdx((idx + 1) % list.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setIdx((idx + list.length - 1) % list.length); return; }
      if (e.key === "Enter") { e.preventDefault(); pick(list[Math.min(idx, list.length - 1)][0]); return; }
      if (e.key === "Escape") { e.preventDefault(); setDismiss(b.id); setMenu(null); return; }
    }
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      const listy = ["bullet", "number", "todo"].includes(b.type);
      if (listy && !b.text) { upd(b.id, { type: "p" }, { id: b.id, pos: 0 }); return; }
      const n = nb(listy ? b.type : "p", b.text.slice(en)), next = [...blocks];
      next[i] = { ...b, text: b.text.slice(0, s) }; next.splice(i + 1, 0, n);
      commit(next, { id: n.id, pos: 0 }); return;
    }
    if (e.key === "Backspace" && s === 0 && en === 0) {
      if (b.type !== "p") { e.preventDefault(); upd(b.id, { type: "p" }, { id: b.id, pos: 0 }); return; }
      if (i > 0) {
        e.preventDefault();
        const p = blocks[i - 1], next = [...blocks];
        if (TEXTY.includes(p.type)) { next[i - 1] = { ...p, text: p.text + b.text }; next.splice(i, 1); commit(next, { id: p.id, pos: p.text.length }); }
        else { next.splice(i - 1, 1); commit(next, { id: b.id, pos: 0 }); }
      }
      return;
    }
    if (e.key === "ArrowUp" && s === 0 && en === 0 && !e.shiftKey) { e.preventDefault(); go(i, -1); }
    if (e.key === "ArrowDown" && s === b.text.length && en === s && !e.shiftKey) { e.preventDefault(); go(i, 1); }
  };

  const wrap = (a, z = a, url) => {
    const { id, s, e } = last.current, b = bl.current.find((x) => x.id === id);
    if (!b || !TEXTY.includes(b.type)) return;
    const sel = b.text.slice(s, e) || "текст", ins = url ? `[${sel}](${url})` : a + sel + z;
    commit(bl.current.map((x) => (x.id === id ? { ...x, text: b.text.slice(0, s) + ins + b.text.slice(e) } : x)), { id, pos: s + ins.length });
  };
  const move = (id, d) => { const i = ix(id), j = i + d; if (j < 0 || j >= blocks.length) return; const next = [...blocks]; [next[i], next[j]] = [next[j], next[i]]; commit(next); };
  const del = (id) => { const next = blocks.filter((b) => b.id !== id); commit(next.length ? next : [nb()]); };
  const TBn = "h-9 min-w-9 rounded-xl bg-neutral-800 px-3 text-sm text-neutral-200 active:bg-red-600";
  const pd = (e) => e.preventDefault();
  let num = 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5" onMouseDown={pd}>
        <button type="button" onClick={() => wrap("**")} className={TBn} aria-label="Жирный"><b>Ж</b></button>
        <button type="button" onClick={() => wrap("*")} className={TBn} aria-label="Курсив"><i>К</i></button>
        <button type="button" onClick={() => setLink("https://")} className={TBn}>Ссылка</button>
        <button type="button" onClick={() => { setMenu({ id: blocks[blocks.length - 1].id, mode: "insert" }); setIdx(0); }} className={`${TBn} ml-auto !bg-red-600 text-white`}>+ Блок</button>
      </div>
      {link !== null && (
        <div className="flex gap-2"><Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" /><Btn className="shrink-0 !px-4" onClick={() => { if (/^https?:\/\/\S+$/i.test(link)) { wrap("", "", link); setLink(null); } }}>ОК</Btn><Btn red={false} className="shrink-0 !px-4" onClick={() => setLink(null)}>×</Btn></div>
      )}
      <input ref={fileEl} type="file" accept="image/*" className="hidden" onChange={(e) => { const x = e.target.files[0]; e.target.value = ""; addImage(x, imgFor.current, true); }} />
      <div className="space-y-1 rounded-2xl bg-neutral-800/60 p-3 pb-6">
        {blocks.map((b, i) => {
          num = b.type === "number" ? (blocks[i - 1]?.type === "number" ? num + 1 : 1) : 0;
          const on = active === b.id;
          const ph = b.type === "p" ? (blocks.length === 1 ? "Начните писать или нажмите «/» для команд" : on ? "Введите «/» для команд" : "") : { h1: "Название", h2: "Заголовок", h3: "Подзаголовок", quote: "Цитата", callout: "Важная мысль" }[b.type] || "Элемент списка";
          const ta = TEXTY.includes(b.type) && (
            <Grow value={b.text} placeholder={ph} inner={(e) => { if (e) refs.current[b.id] = e; else delete refs.current[b.id]; }}
              onChange={(e) => onText(b, e.target.value)} onKeyDown={(e) => onKey(e, b)}
              onFocus={(e) => { setActive(b.id); last.current = { id: b.id, s: e.target.selectionStart, e: e.target.selectionEnd }; }}
              onSelect={(e) => { last.current = { id: b.id, s: e.target.selectionStart, e: e.target.selectionEnd }; }}
              onPaste={(e) => { const f = [...e.clipboardData.files].find((x) => x.type.startsWith("image/")); if (f) { e.preventDefault(); addImage(f, b.id, false); } }}
              className={`w-full min-w-0 flex-1 resize-none overflow-hidden bg-transparent text-white outline-none placeholder:text-neutral-600 ${BCLS[b.type]}`} />);
          let body = ta;
          if (b.type === "bullet") body = <div className="flex gap-2"><span className="w-5 shrink-0 text-center leading-7 text-red-500">•</span>{ta}</div>;
          if (b.type === "number") body = <div className="flex gap-2"><span className="w-5 shrink-0 text-right leading-7 text-red-500">{num}.</span>{ta}</div>;
          if (b.type === "todo") body = <div className="flex gap-2"><button type="button" onMouseDown={pd} onClick={() => upd(b.id, { checked: !b.checked })} aria-label="Отметить" className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${b.checked ? "border-red-600 bg-red-600" : "border-neutral-500"}`}>{b.checked && <Check size={13} />}</button>{ta}</div>;
          if (b.type === "callout") body = <div className="flex gap-2 rounded-2xl border border-red-600/30 bg-red-600/10 p-3"><span>💡</span>{ta}</div>;
          if (b.type === "divider") body = <hr className="my-3 border-white/20" />;
          if (b.type === "image") body = (
            <div className="space-y-2">
              {b.src ? <img src={b.src} alt="" className="w-full rounded-2xl" /> : <button type="button" onClick={() => askImage(b.id)} className="w-full rounded-2xl border border-dashed border-white/20 py-8 text-sm text-neutral-400">Загрузить фото</button>}
              {b.src && <div className="flex gap-2"><input value={b.caption || ""} onChange={(e) => upd(b.id, { caption: e.target.value })} placeholder="Подпись (необязательно)" className="min-w-0 flex-1 bg-transparent text-sm text-neutral-300 outline-none placeholder:text-neutral-600" /><button type="button" onClick={() => askImage(b.id)} className="text-xs text-neutral-400">Заменить</button></div>}
            </div>);
          return (
            <div key={b.id} className="relative flex items-start gap-1" onClick={() => setActive(b.id)}>
              <button type="button" aria-label="Тип блока" onMouseDown={pd} onClick={() => { setMenu(cur && cur.id === b.id && cur.mode === "convert" ? null : { id: b.id, mode: "convert" }); setIdx(0); }} className="mt-0.5 h-7 w-6 shrink-0 rounded-lg text-xs text-neutral-600 hover:bg-neutral-700 hover:text-white">⋮⋮</button>
              <div className="min-w-0 flex-1">{body}</div>
              {on && <div className="flex shrink-0 items-center" onMouseDown={pd}>
                <button type="button" aria-label="Вверх" onClick={() => move(b.id, -1)} className="h-7 w-7 rounded-lg text-neutral-400 hover:bg-neutral-700">↑</button>
                <button type="button" aria-label="Вниз" onClick={() => move(b.id, 1)} className="h-7 w-7 rounded-lg text-neutral-400 hover:bg-neutral-700">↓</button>
                <button type="button" aria-label="Удалить блок" onClick={() => del(b.id)} className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-700"><Trash2 size={14} /></button>
              </div>}
              {cur && cur.id === b.id && list.length > 0 && (
                <div className="absolute left-6 top-full z-30 mt-1 max-h-72 w-72 max-w-[85vw] overflow-auto rounded-2xl border border-white/10 bg-neutral-900 p-1 shadow-2xl" onMouseDown={pd}>
                  <p className="px-3 py-1 text-[11px] uppercase tracking-wider text-neutral-500">{cur.mode === "insert" ? "Добавить блок" : cur.mode === "convert" ? "Превратить в" : "Блоки"}</p>
                  {list.map(([t, l, h], j) => (
                    <button key={t} type="button" onMouseEnter={() => setIdx(j)} onClick={() => pick(t)} className={`flex w-full flex-col rounded-xl px-3 py-2 text-left ${j === Math.min(idx, list.length - 1) ? "bg-neutral-800" : ""}`}><span className="text-sm font-medium text-white">{l}</span><span className="text-xs text-neutral-500">{h}</span></button>))}
                </div>)}
            </div>);
        })}
      </div>
      <p className="text-xs text-neutral-500">«/» — меню блоков. Быстрые клавиши: «# », «## », «- », «1. », «[] », «&gt; », «---». Фото можно вставить из буфера обмена. Enter — новый абзац, Shift+Enter — перенос строки.</p>
    </div>
  );
}

function MemosTab({ db, set }) {
  const blank = { id: "", title: "", blocks: [nb()], link: "" };
  const [f, setF] = useState(blank), [ver, setVer] = useState(0), [prev, setPrev] = useState(false);
  const load = (v) => { setF(v); setVer((n) => n + 1); setPrev(false); };
  const clean = (bl) => bl.filter((b) => b.type === "divider" || b.type === "image" ? (b.type === "divider" || b.src) : b.text.trim());
  const save = () => {
    const blocks = clean(f.blocks);
    if (!f.title.trim() || !blocks.length) return;
    const m = { id: f.id, title: f.title.trim(), blocks, link: f.link || "" };
    set((d) => { d.memos ||= []; if (m.id) { const k = d.memos.findIndex((x) => x.id === m.id); if (k >= 0) d.memos[k] = m; else d.memos.push(m); } else d.memos.push({ ...m, id: uid() }); });
    load(blank);
  };
  return (
    <div className="space-y-4">
      <H>Памятки для клиентов</H>
      <Card className="space-y-3">
        <input placeholder="Название памятки" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className="w-full bg-transparent text-2xl font-extrabold text-white outline-none placeholder:text-neutral-600" />
        <div className={prev ? "hidden" : ""}><BlockEditor key={ver} value={f.blocks} onChange={(blocks) => setF((p) => ({ ...p, blocks }))} /></div>
        {prev && <div className="rounded-2xl bg-neutral-950 p-4"><Article m={{ title: f.title || "Без названия", blocks: clean(f.blocks) }} /></div>}
        <div className="flex flex-wrap gap-2">
          <Btn onClick={save}>{f.id ? "Сохранить" : "Опубликовать"}</Btn>
          <Btn red={false} onClick={() => setPrev(!prev)}>{prev ? "Вернуться к редактору" : "Как увидит клиент"}</Btn>
          {(f.id || f.title || clean(f.blocks).length > 0) && <Btn red={false} onClick={() => load(blank)}>Отмена</Btn>}
        </div>
      </Card>
      {(db.memos || []).map((x) => (
        <Card key={x.id} className="flex items-center justify-between gap-3">
          <div><p className="font-semibold">{x.title}</p><p className="text-xs text-neutral-500">{readMin(memoBlocks(x))} мин чтения</p></div>
          <div className="flex items-center gap-3">
            <button onClick={() => { load({ id: x.id, title: x.title, link: x.link || "", blocks: memoBlocks(x) }); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="text-sm text-neutral-300">Изм.</button>
            <button onClick={() => set((d) => { d.memos = d.memos.filter((y) => y.id !== x.id); })} aria-label="Удалить"><Trash2 size={18} className="text-neutral-500" /></button>
          </div>
        </Card>))}
    </div>
  );
}

function AccessTab({ db, set }) {
  const upd = (id, patch) => set((d) => { Object.assign(d.clients.find((y) => y.id === id), patch); });
  return (
    <div className="space-y-4">
      <H>Доступ клиентов</H>
      {db.clients.map((c) => {
        const on = c.active !== false, exp = c.paidUntil && c.paidUntil < today();
        return (
          <Card key={c.id} className="space-y-3">
            <div className="flex items-center justify-between">
              <div><p className="font-bold">{c.name}</p><p className="text-xs text-neutral-500">{on ? "Доступ открыт" : "Доступ закрыт"}{exp && <span className="ml-2 text-red-400">· срок оплаты истёк</span>}</p></div>
              <button role="switch" aria-checked={on} aria-label={`Доступ: ${c.name}`} onClick={() => upd(c.id, { active: !on })} className={`relative h-7 w-12 rounded-full transition ${on ? "bg-red-600" : "bg-neutral-700"}`}><span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-all ${on ? "left-[22px]" : "left-0.5"}`} /></button>
            </div>
            <label className="flex items-center gap-2 text-xs text-neutral-400">Оплачено до <input type="date" value={c.paidUntil || ""} onChange={(e) => upd(c.id, { paidUntil: e.target.value })} className="rounded-xl bg-neutral-800 px-3 py-2 text-white [color-scheme:dark]" /></label>
          </Card>);
      })}
    </div>
  );
}

function ClientCalendar({ db, set, client }) {
  const L = db.logs[client.id] || {}, [sel, setSel] = useState(null);
  const plans = db.plans.filter((p) => p.clientId === client.id).sort((a, b) => a.date.localeCompare(b.date));
  const doneN = plans.filter((p) => L.done?.[p.id]).length, missN = plans.filter((p) => isMissed(p, L)).length, left = plans.length - doneN - missN;
  const dayPlans = sel ? plans.filter((p) => p.date === sel) : [];
  const mark = (p, st) => set((d) => {
    d.logs[client.id] ||= { days: {}, done: {}, sets: {} };
    const l = d.logs[client.id]; l.done ||= {}; l.missed ||= {};
    delete l.done[p.id]; delete l.missed[p.id];
    if (st === "done") l.done[p.id] = p.date;
    if (st === "missed") l.missed[p.id] = true;
  });
  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-1"><p className="font-semibold">Тренировки</p><p className="text-xs text-neutral-400">Выполнено {doneN} · пропущено {missN} · впереди {left}</p></div>
      {plans.length > 0 ? <MonthCal plans={plans} L={L} onPick={setSel} sel={sel} compact /> : <p className="text-sm text-neutral-500">Программы пока нет — создайте её в конструкторе.</p>}
      {sel && dayPlans.length > 0 && (
        <div className="space-y-3 rounded-2xl bg-neutral-800 p-3">
          <p className="text-xs text-neutral-400">{dayLong(sel)}</p>
          {dayPlans.map((p) => {
            const done = !!L.done?.[p.id], miss = !done && !!L.missed?.[p.id];
            return (
              <div key={p.id} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{p.title} <span className="text-xs font-normal text-neutral-500">{p.exercises.length} упр.</span></p>
                  <button type="button" aria-label="Удалить тренировку" onClick={() => { set((d) => { d.plans = d.plans.filter((x) => x.id !== p.id); }); setSel(null); }}><Trash2 size={16} className="text-neutral-500 hover:text-red-500" /></button>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => mark(p, done ? null : "done")} className={`flex-1 rounded-full py-2 text-sm ${done ? "bg-red-600 text-white" : "bg-neutral-700 text-neutral-200"}`}>Выполнил</button>
                  <button type="button" onClick={() => mark(p, miss ? null : "missed")} className={`flex-1 rounded-full py-2 text-sm ${miss ? "border border-red-600 text-red-400" : "bg-neutral-700 text-neutral-200"}`}>Пропустил</button>
                </div>
                {!done && !miss && p.date < today() && <p className="text-xs text-neutral-500">Не отмечена — считается пропущенной</p>}
              </div>);
          })}
        </div>
      )}
      {!sel && plans.length > 0 && <p className="text-xs text-neutral-500">Нажмите на день с тренировкой, чтобы отметить, выполнена она или пропущена.</p>}
    </Card>
  );
}

function WeightsPanel({ db, set, client }) {
  const [vals, setVals] = useState({}), [asg, setAsg] = useState(false), [all, setAll] = useState(false), [openD, setOpenD] = useState(null);
  const L = db.logs[client.id] || {}, W = db.weights?.[client.id] || {};
  const mine = db.plans.filter((p) => p.clientId === client.id).sort((a, b) => a.date.localeCompare(b.date));
  const ex = {}; mine.forEach((p) => p.exercises.forEach((e) => { ex[exKey(e)] = e; }));
  const keys = Object.keys(ex);
  if (!keys.length) return null;
  // вес, назначенный на дату тренировки: последнее назначение не позже этого дня
  const assignedOn = (k, date) => { let r = null; (W[k]?.hist || []).forEach((h) => { if (h.date <= date) r = h.w; }); return r; };
  const sessions = (k, i, hist) => { const st = hist[i].date, en = hist[i + 1]?.date; return mine.filter((p) => p.exercises.some((x) => exKey(x) === k)).filter((p) => { const dd = L.done?.[p.id]; return dd && dd >= st && (!en || dd < en); }).length; };
  const rpeAvg = (p) => { const r = p.exercises.map((x) => +(L.sets?.[x.id]?.rpe || 0)).filter(Boolean); return r.length ? r.reduce((a, b) => a + b, 0) / r.length : null; };
  const days = mine.filter((p) => p.date <= today()).reverse(), shown = all ? days : days.slice(0, 6);
  const op = openD === null ? days[0]?.id : openD;
  const GR = "grid grid-cols-[1fr_3.5rem_3.25rem_2.5rem] items-center gap-x-1.5";
  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">Рабочие веса и прогресс</p>
        <button type="button" onClick={() => setAsg(!asg)} className="rounded-full bg-neutral-800 px-3 py-1.5 text-xs text-neutral-200">{asg ? "Скрыть" : "Назначить вес"}</button>
      </div>
      {asg && (
        <div className="space-y-2 rounded-2xl border border-white/5 p-3">
          <p className="text-xs text-neutral-500">Новый вес действует со дня назначения и попадает в историю.</p>
          {keys.map((k) => {
            const cur = (W[k]?.hist || []).at(-1)?.w;
            return (
              <div key={k} className="flex items-center gap-2">
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{ex[k].name}</p><p className="text-xs text-red-400">{cur != null ? `${nf(cur)} кг` : "не назначен"}</p></div>
                <InputS className="!w-20 shrink-0" type="number" step="0.5" inputMode="decimal" placeholder="кг" value={vals[k] ?? ""} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} />
                <Btn className="shrink-0 !px-3 !py-2" onClick={() => { if (!vals[k]) return; set((d) => { assign(d, client.id, ex[k], vals[k]); }); setVals({ ...vals, [k]: "" }); }}>ОК</Btn>
              </div>);
          })}
          <details className="pt-1">
            <summary className="cursor-pointer text-xs text-neutral-400">История назначений</summary>
            {keys.filter((k) => (W[k]?.hist || []).length).map((k) => (
              <div key={k} className="mt-2 text-xs">
                <p className="font-medium text-neutral-200">{ex[k].name}</p>
                {W[k].hist.map((h, i) => <div key={i} className="flex justify-between text-neutral-400"><span>{h.date}</span><span className="font-semibold text-white">{nf(h.w)} кг</span><span>{sessions(k, i, W[k].hist)} трен.</span></div>)}
              </div>))}
          </details>
        </div>
      )}
      <p className="text-xs text-neutral-500">По дням тренировок: что назначено, какой вес сделал клиент и какую сложность отметил.</p>
      {!days.length && <p className="text-sm text-neutral-500">Прошедших тренировок пока нет.</p>}
      {shown.map((p) => {
        const st = L.done?.[p.id] ? "done" : isMissed(p, L) ? "miss" : "none", avg = rpeAvg(p), isOpen = op === p.id;
        return (
          <div key={p.id} className="rounded-2xl bg-neutral-800">
            <button type="button" onClick={() => setOpenD(isOpen ? "" : p.id)} className="flex w-full items-center gap-3 p-3 text-left">
              <ChevronRight size={16} className={`shrink-0 text-neutral-500 transition ${isOpen ? "rotate-90" : ""}`} />
              <div className="min-w-0 flex-1"><p className="truncate font-semibold">{p.title}</p><p className="text-xs text-neutral-500">{dateRu(p.date)}{avg != null && ` · сложность ср. ${nf(avg)}/10`}</p></div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] ${st === "done" ? "bg-red-600 text-white" : st === "miss" ? "border border-red-600/60 text-red-400" : "bg-neutral-700 text-neutral-400"}`}>{st === "done" ? "Выполнена" : st === "miss" ? "Пропущена" : "Не отмечена"}</span>
            </button>
            {isOpen && (
              <div className="px-3 pb-3">
                <div className={`${GR} pb-1 text-[10px] text-neutral-500`}><span>Упражнение</span><span className="text-right">Назначено</span><span className="text-right">Сделал</span><span className="text-right">Сложн.</span></div>
                {p.exercises.map((x) => {
                  const s = L.sets?.[x.id] || {}, as = assignedOn(exKey(x), p.date), dw = mnum(s.weight);
                  return (
                    <div key={x.id} className={`${GR} border-t border-white/5 py-2 text-sm`}>
                      <span className="flex min-w-0 items-center gap-1.5"><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.ok ? "bg-red-600" : "bg-neutral-600"}`} /><span className="break-words">{x.name}</span></span>
                      <span className="text-right text-neutral-300">{as != null ? nf(as) : "—"}</span>
                      <span className="text-right font-semibold text-white">{dw != null ? <>{as != null && dw > as ? "▲ " : as != null && dw < as ? "▼ " : ""}{nf(dw)}</> : "—"}</span>
                      <span className="text-right text-neutral-300">{s.rpe ? s.rpe : "—"}</span>
                    </div>);
                })}
                <p className="pt-2 text-[11px] text-neutral-500">Вес в кг, сложность 1–10. Красная точка — клиент отметил упражнение выполненным. ▲ / ▼ — сделал больше / меньше назначенного.</p>
              </div>)}
          </div>);
      })}
      {days.length > 6 && <button type="button" onClick={() => setAll(!all)} className="text-sm text-red-500 underline underline-offset-4">{all ? "Свернуть" : `Показать все (${days.length})`}</button>}
    </Card>
  );
}

function Memos({ memos, open, setOpen, onBack, backLabel }) {
  const [q, setQ] = useState("");
  const m = memos.find((x) => x.id === open);
  useEffect(() => { window.scrollTo(0, 0); }, [open]);
  if (m) return (
    <div className="pb-28">
      <button onClick={onBack} className="mb-5 flex items-center text-sm text-neutral-400"><ChevronLeft size={18} />{backLabel}</button>
      <Article m={m} progress />
      {m.link && <div className="mx-auto max-w-[38rem]"><a href={m.link} target="_blank" rel="noreferrer noopener" className="inline-block rounded-full bg-red-600 px-5 py-3 text-sm font-semibold">Открыть ресурс</a></div>}
    </div>);
  const shown = memos.filter((x) => !q.trim() || x.title.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="space-y-4 pb-24">
      <div className="relative overflow-hidden rounded-3xl border border-red-600/30 bg-neutral-900 bg-[radial-gradient(ellipse_at_85%_0%,rgba(220,38,38,0.45),transparent_60%)] p-6">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600"><BookOpen size={24} /></span>
        <h2 className="mt-4 text-3xl font-extrabold tracking-tight">Памятки</h2>
        <p className="mt-2 leading-relaxed text-neutral-200">Это мои памятки, которые помогут тебе добиться своих целей в тренировках <b className="text-white">раз и навсегда</b>.</p>
        <p className="mt-3 text-sm text-neutral-400">Читай по одной, возвращайся, когда нужно, — всё просто и без мифов.</p>
      </div>
      {memos.length > 3 && <Input placeholder="Поиск по памяткам" value={q} onChange={(e) => setQ(e.target.value)} />}
      {!memos.length && <p className="text-neutral-500">Тренер скоро добавит сюда материалы.</p>}
      {shown.map((x) => {
        const bl = memoBlocks(x), first = bl.find((b) => b.type === "p" && b.text.trim());
        return (
          <Card key={x.id} onClick={() => setOpen(x.id)} className="cursor-pointer space-y-2 hover:border-red-600/50">
            <div className="flex items-start justify-between gap-3"><p className="text-lg font-bold leading-snug">{x.title}</p><ChevronRight className="mt-1 shrink-0 text-neutral-600" /></div>
            {first && <p className="line-clamp-2 text-sm text-neutral-400">{plain(first.text)}</p>}
            <p className="text-xs text-red-500">{readMin(bl)} мин чтения</p>
          </Card>);
      })}
    </div>
  );
}

function Blocked() {
  return (
    <div className="mx-auto max-w-sm space-y-4 pt-10">
      <h1 className="text-4xl font-extrabold leading-tight">Доступ приостановлен</h1>
      <p className="text-neutral-400">Напиши тренеру, чтобы продлить доступ, — и всё откроется снова.</p>
    </div>
  );
}

/* ---------- Root ---------- */
// Пароль тренера хранится как SHA-256 хэш. Свой хэш получите в консоли браузера:
// crypto.subtle.digest("SHA-256", new TextEncoder().encode("ВАШ_ПАРОЛЬ")).then(b => console.log([...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("")))
const ADMIN_HASH = "e2186dbdb1bb4193608605e84f33208765b5693b55edd4f730a719a100eeea6f"; // сейчас пароль: change-me
const sha256 = async (t) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)))].map((b) => b.toString(16).padStart(2, "0")).join("");

// ВРЕМЕННО: переключатель Клиент / Тренер для разработки, вход в админку без пароля.
// Перед публикацией поставьте false — тогда админка откроется только по /#admin и паролю.
const DEV_SWITCHER = false;

function AdminLogin({ onOk }) {
  const [p, setP] = useState(""), [err, setErr] = useState(false);
  const go = async () => { (await sha256(p)) === ADMIN_HASH ? onOk() : setErr(true); };
  return (
    <div className="mx-auto max-w-sm space-y-4 pt-10">
      <h1 className="text-4xl font-extrabold leading-tight">Вход для тренера</h1>
      <Input type="password" placeholder="Пароль" value={p} onChange={(e) => { setP(e.target.value); setErr(false); }} onKeyDown={(e) => e.key === "Enter" && go()} />
      {err && <p className="text-sm text-red-500">Неверный пароль.</p>}
      <Btn onClick={go} className="w-full">Войти</Btn>
    </div>
  );
}

export default function App() {
  const [db, setDb] = useLS("fitcoach-db", seed);
  const set = (fn) => setDb((d) => { const c = structuredClone(d); fn(c); return c; });
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => { const f = () => setHash(window.location.hash); window.addEventListener("hashchange", f); return () => window.removeEventListener("hashchange", f); }, []);
  const adminPage = hash === "#admin"; // тренер заходит по адресу вашсайт/#admin, клиентам ссылка не показывается
  const isAdmin = DEV_SWITCHER || db.session.admin === true;
  useEffect(() => {
    if (db.tplSeeded) return;
    set((d) => {
      d.library ||= []; d.templates ||= [];
      const byName = new Map(d.library.map((x) => [x.name.trim().toLowerCase(), x.id]));
      const idOf = (name) => { const k = name.trim().toLowerCase(); if (!byName.has(k)) { const id = "t_" + uid(); d.library.push({ id, name, url: "", comment: "" }); byName.set(k, id); } return byName.get(k); };
      TPL_SEED.forEach((t) => {
        if (d.templates.some((x) => x.id === t.id)) return;
        const wk = {};
        Object.entries(t.wk).forEach(([dw, w]) => { wk[dw] = { title: w.title, exercises: w.ex.map(([name, comment]) => ({ name, comment, libId: idOf(name) })) }; });
        d.templates.push({ id: t.id, name: t.name, wk });
      });
      d.tplSeeded = true;
    });
  }, []);
  useEffect(() => {
    if (!ARTICLES.some((a) => !(db.memosSeeded || []).includes(a.id))) return;
    set((d) => { d.memos = (d.memos || []).filter((m) => !(m.id === "m1" && (m.body || "").startsWith("Здесь будет"))); ARTICLES.forEach((a) => { if (!(d.memosSeeded ||= []).includes(a.id)) { d.memosSeeded.push(a.id); if (!d.memos.some((m) => m.id === a.id)) d.memos.push(a); } }); });
  }, []);
  useEffect(() => { if (DEV_SWITCHER && !db.session.clientId && db.clients[0]) set((d) => { d.session.clientId = d.clients[0].id; }); }, [db.session.clientId, db.clients.length]);
  const replay = () => set((d) => { d.session.onboarded = false; d.session.welcomed = false; });
  const { clientId, onboarded } = db.session;
  const lm = hash.match(/^#c\/(.+)$/), linked = lm && db.clients.find((c) => tok(c) === lm[1]);
  useEffect(() => { if (linked && db.session.clientId !== linked.id) set((d) => { d.session.clientId = linked.id; d.session.onboarded = false; d.session.welcomed = false; }); }, [linked?.id]);
  useEffect(() => {
    document.title = "Твой Друг Тренер";
    [["icon", "/favicon.png"], ["apple-touch-icon", "/apple-touch-icon.png"]].forEach(([rel, href]) => { let l = document.querySelector(`link[rel='${rel}']`); if (!l) { l = document.createElement("link"); l.rel = rel; document.head.appendChild(l); } l.href = href; });
  }, []);
  return (
    <div className="min-h-screen bg-neutral-950 font-sans text-white antialiased" style={{ fontFamily: "Inter, -apple-system, 'SF Pro Display', system-ui, sans-serif" }}>
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/5 bg-neutral-950/90 px-4 py-3 backdrop-blur">
        <span className="flex items-center gap-2 font-extrabold"><img src="/icon-192.png" alt="" className="h-8 w-8 rounded-full object-cover" />Твой Друг Тренер</span>
        {adminPage && isAdmin && !DEV_SWITCHER && <Btn red={false} className="!py-1.5" onClick={() => { set((d) => { d.session.admin = false; }); window.location.hash = ""; }}>Выйти</Btn>}
      </header>
      {DEV_SWITCHER && (
        <div className="flex flex-wrap items-center justify-center gap-2 border-b border-white/5 bg-neutral-900/60 px-4 py-2 text-xs">
          <div className="flex rounded-full bg-neutral-900 p-1">
            {[["", "Клиент"], ["#admin", "Тренер"]].map(([h, l]) => (
              <button key={l} onClick={() => { window.location.hash = h; }} className={`rounded-full px-3 py-1.5 ${(adminPage ? "#admin" : "") === h ? "bg-red-600 text-white" : "text-neutral-400"}`}>{l}</button>))}
          </div>
          {!adminPage && (<>
            <select value={db.session.clientId || ""} onChange={(e) => set((d) => { d.session.clientId = e.target.value; })} className="rounded-full bg-neutral-900 px-3 py-1.5 text-neutral-200">
              {db.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button onClick={replay} className="rounded-full bg-neutral-900 px-3 py-1.5 text-neutral-200">Показать приветствие и онбординг заново</button>
          </>)}
        </div>
      )}
      <main className="mx-auto max-w-2xl p-4">
        {adminPage ? (isAdmin ? <Trainer db={db} set={set} /> : <AdminLogin onOk={() => set((d) => { d.session.admin = true; })} />)
          : !clientId ? <Login invalid={!!lm && !linked} /> : db.clients.find((c) => c.id === clientId)?.active === false ? <Blocked /> : !db.session.welcomed ? <Welcome set={set} /> : !onboarded ? <Onboarding set={set} /> : <ClientApp db={db} set={set} />}
      </main>
    </div>
  );
}
