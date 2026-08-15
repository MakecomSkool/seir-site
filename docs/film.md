# SEIR. Фільм. Повна архітектура з нуля

Пять актов, пролог и эпилог. Каждый раздел сайта это отдельная история со своей оптикой, своим направлением движения и своим светом.

---

## 1. Композиция целиком

```
ПРОЛОГ    Україна вночі з орбіти            падение        холодный синий
   ↓
АКТ I     НАШІ РІШЕННЯ         3 сцены      падение        сталь и натрий
   →
АКТ II    ОБЛАДНАННЯ           1 проезд     горизонталь    чёрный ангар, конусы света
   ↑
АКТ III   ЕКСПЕРТИЗА           4 сцены      подъём         рассвет, воздух
   ·
АКТ IV    ЯКІСТЬ               4 сцены      статика, макро БЕЛЫЙ СВЕТ
   ↑
ЭПИЛОГ    ВЗАЄМОДІЯ            отъезд       обратно в орбиту, страна вся в огнях
```

Три приёма держат всю конструкцию.

**Приём 1. Каждый акт меняет направление движения.** Падение, потом проезд вбок, потом подъём, потом остановка. Зритель телом чувствует смену главы, ещё до того как прочитает заголовок. Это дешевле и сильнее любого разделителя.

**Приём 2. Акт «Якість» единственный светлый.** Четыре акта в темноте, а потом резко белая лаборатория с холодным светом. Контраст делает раздел про контроль качества самым запоминающимся на сайте, хотя обычно это самый скучный блок. И это правда работает на смысл: качество это то место, где включают свет и смотрят.

**Приём 3. Кольцо.** Начали на орбите в темноте, закончили на орбите, где страна уже вся в огнях. Финальный кадр это первый кадр, только результат.

**Фазовые перебивки между актами.** Между актами полсекунды чёрного и моно-строка в их же фирменной лексике:

```
// ФАЗА 02 · ОБЛАДНАННЯ · CAT REGISTRY
```

Никакого видео, чистый текст на чёрном, 40vh скролла. Дышит, режет ритм и стоит ноль.

---

## 2. Общие правила генерации

Модель кадров: Cinema Studio Image 2.5, 16:9, 2K.
Модель видео: Cinema Studio Video 2.

```json
{"model":"cinematic_studio_video_v2","aspect_ratio":"16:9",
 "mode":"pro","sound":"off","speedramp":"linear","genre":"auto","cfg_scale":0.35}
```

`speedramp: linear` обязателен там, где видео скраббится по скроллу: дефолтный `auto` подкладывает slowmo, и скролл становится резиновым. `cfg_scale: 0.35` не даёт модели переписывать стартовый кадр под текст.

**Стилевой хвост, добавляется в каждый промпт кадра:**
```
Cinematic industrial documentary, photorealistic, shot on ARRI Alexa, anamorphic,
deep blacks with lifted shadows, fine film grain, practical light only,
no text, no logos, no people, no glowing energy lines, no sparks,
clean empty space in the middle third for typography.
```

**Правило цепи.** Действует не везде, и это важно не перепутать:

| Где | Цепь кадров | Почему |
|---|---|---|
| Пролог → Акт I | обязательна | непрерывное падение, шов виден сразу |
| Внутри Акта I | обязательна | три сцены читаются как одно движение |
| Внутри Акта II | обязательна | один непрерывный проезд вдоль ангара |
| Внутри Акта III | **не нужна** | четыре отдельных портрета объектов, переход через уход в чёрный 400 мс |
| Внутри Акта IV | **не нужна** | четыре отдельные предметные сцены, переход через уход в белый 400 мс |
| Между актами | не нужна | там фазовая перебивка на чёрном, она и есть склейка |

Там, где цепь не нужна, сцене хватает одного стартового кадра: видео играет автоплеем, а не скраббится, и шов прячет заливка.

---

## ПРОЛОГ. Орбіта

**1 сцена, 8 с, скраббинг, 100vh**

Кадр P0:
```
View of Earth from low orbit at night. The curved limb of the planet crosses the
lower third, a thin luminous blue atmospheric glow along the horizon, black space
with faint stars above. Dark landmass of eastern Europe below with scattered warm
amber city lights, thin clouds catching starlight. Everything in focus, cool palette.
```

Анимация:
```
Extremely slow orbital drift, the atmospheric glow shifting along the limb. In the
final two seconds the camera begins a slow controlled descent toward the cloud layer.
One continuous take, no cuts, no shake.
```

**Фронт:** огни городов рисует канвас поверх видео, чтобы они загорались по скроллу от центра к краям, стаггер 90 мс. Заголовок `За кожним вогнем / стоїть обладнання`. Кнопка `Подивитись, як ми працюємо`.

Мост P0→I1: падение сквозь облака, внизу проступает освещённая подстанция.

---

## АКТ I. НАШІ РІШЕННЯ

Три решения это три способа, которыми компания трогает объект: **посмотреть, починить, привезти.** Показываем их на одном и том же типе объекта, чтобы разница читалась как разница действия, а не декораций.

Направление: продолжается падение. 3 сцены по 100vh.

### I.1. Технічне обслуговування. 8 с

Кадр:
```
Distribution substation yard at night. A power transformer in the centre of frame
with diagnostic test equipment set up beside it: instrument cases on the gravel,
measurement cables running to the bushings, a thermal imaging camera on a tripod
aimed at the radiator fins, a work light on a stand casting a hard shadow.
Cool blue night with one warm sodium lamp.
```
Анимация:
```
Slow arc around the transformer, the test equipment and cables passing in the
foreground, ending on a medium shot of the instrument cases and the thermal camera.
Steady, deliberate, no shake.
```
**Фронт:** `Технічне обслуговування`. Список: силові трансформатори, розподільчі пристрої КРУ і КРУН, кабельні системи, турбінне обладнання, допоміжні енергетичні системи, релейний захист. Ниже строкой: діагностика та випробування, пусконалагоджувальні роботи, технічний аудит.
Теги `CAT-03`, `CAT-07`.

### I.2. Модернізація та ремонт. 8 с

Кадр:
```
Industrial repair bay at night. A large power transformer partially disassembled,
its cover removed and set aside, internal windings and core visible, an overhead
crane hook lowered above it, removed panels and tools laid out on the floor,
temporary work lights on stands, dust in the beams.
```
Анимация:
```
The camera moves forward past the removed cover and tools, rises slightly and looks
down into the open transformer where the core and windings are exposed. Slow, heavy,
mechanical. Ends looking straight down.
```
**Фронт:** `Модернізація та ремонт`. Список: капітальний ремонт, реконструкція об'єктів, модернізація систем та вузлів, заміна обладнання, підвищення енергоефективності, оптимізація процесів.
Отдельным блоком крупнее, это их сильнейший аргумент: **`Відновлення після аварій`** и `Усунення технічних несправностей`. Счётчик `0,00 с → 0,12 с`, подпись `час відновлення живлення`. CTA `Аварійне відновлення`.
Теги `CAT-03`, `CAT-05`.

### I.3. Постачання обладнання. 8 с

Кадр:
```
Night delivery yard at an industrial site. A new power transformer wrapped in
protective covering strapped on a heavy low-loader trailer, a mobile crane beside it
with its boom raised, wooden crates and reels of cable stacked on pallets nearby,
floodlights on masts, wet asphalt reflecting the light, light rain in the beams.
```
Анимация:
```
The camera travels slowly along the loaded trailer from the rear toward the front,
the crane boom passing overhead, ending on a wide shot of the yard with the crates
and cable reels in the foreground. Steady lateral move.
```
**Фронт:** `Постачання обладнання`. Полная номенклатура из их списка плюс отдельно: `Імпорт та підбір обладнання`, `Логістика та супровід поставок`.
Теги `CAT-01`, `CAT-02`, `CAT-03`, `CAT-04`.

**Перебивка:** `// ФАЗА 02 · ОБЛАДНАННЯ · CAT REGISTRY`

---

## АКТ II. ОБЛАДНАННЯ

Приём: **чёрный ангар и конусы света.** Камера едет вбок вдоль бесконечного тёмного пространства, и из темноты один за другим выходят девять объектов, каждый под своим конусом света. Ничего лишнего в кадре, только предмет и свет.

Это самый экономный акт: один непрерывный проезд закрывает все девять категорий, вместо девяти отдельных сцен.

Направление: **горизонталь.** Скролл вниз двигает сцену вбок. Смена оси после трёх падений работает как удар.

**Технически:** три ролика по 8 с, сшитые мостами, каждый показывает по три объекта. Скраббинг по скроллу, 300vh.

### II.1. CAT-01, 02, 03
Кадр:
```
Vast dark industrial hall, almost black. Three objects stand widely spaced in a row
receding to the right, each lit by a single narrow cone of light from above:
a large reel of high voltage cable, a set of cable joints and insulation kits laid
out on a low stand, and a power transformer. The floor is polished dark concrete
reflecting the cones. Everything else falls into black.
```
Анимация:
```
The camera tracks laterally to the right at a constant slow speed, passing the three
lit objects one after another, each entering frame from the right and leaving to the
left. Perfectly steady dolly, no shake, no zoom.
```

### II.2. CAT-04, 05, 06
```
Same vast dark hall. Three objects in a row under narrow light cones: a steam turbine
rotor on support blocks, a row of metal-clad switchgear cubicles, and a high voltage
circuit breaker with porcelain insulators. Polished dark floor, everything else black.
```
Анимация: та же, продолжение проезда.

### II.3. CAT-07, 08, 09
```
Same vast dark hall. Three objects under light cones: a rack of measuring and control
instruments with dials and terminals, a group of large industrial valves and fittings,
and an industrial pump coupled to a heat exchanger with insulated pipework.
Polished dark floor, everything else black.
```
Анимация: проезд замедляется и останавливается на последнем объекте.

**Фронт:** когда объект выходит в центр кадра, слева всплывает карточка: `CAT-05`, название, три строки из их описания. Уходит, когда объект покидает кадр. Внизу справа полоса прогресса каталога `05 / 09`.

**Перебивка:** `// ФАЗА 03 · ЕКСПЕРТИЗА · OBJECT CLASSES`

---

## АКТ III. ЕКСПЕРТИЗА

Четыре направления это четыре типа объектов. Показываем их сверху, на рассвете, как портреты.

Направление: **подъём.** Камера всё время идёт вверх и наружу, после тесного тёмного ангара это глоток воздуха. 4 сцены по 90vh, каждая 6 с.

### III.1. Генерація енергії
```
Aerial view of a large power plant at dawn, cooling towers releasing slow steam,
turbine hall roof, switchyard beside it, river and empty fields around, low mist,
pale orange horizon, cold blue sky above.
```
`The camera rises and slowly orbits the plant, steam drifting. Smooth ascent.`

### III.2. Підстанції та мережі
```
Aerial view of a distribution substation at dawn, rectangular fenced yard with
transformers and busbars, transmission lines leaving in three directions toward the
horizon, fields and a small town beyond, low ground mist.
```
`The camera rises above the substation, the transmission lines opening out in three directions below. Smooth ascent, slight rotation.`

### III.3. Промислові об'єкти
```
Aerial view of a large manufacturing plant at dawn, long production halls, pipe racks
and stacks, a substation and switchgear building on the edge of the site, parking
areas empty, cold morning light.
```
`The camera rises and drifts over the plant, pipe racks and roofs passing below. Smooth ascent.`

### III.4. Інфраструктурні системи
```
Aerial view at dawn of infrastructure spread across a landscape: a pumping station
with pipelines, a heating plant with insulated pipes running away from it, a road
and a rail line crossing, a telecom mast, a small town beyond. Cold morning light.
```
`The camera rises higher, the whole landscape opening below with the pipelines and lines running across it. Smooth ascent, ending very wide.`

**Фронт:** номер и название направления моно-шрифтом, три строки описания, теги CAT. Карточки появляются, когда объект проходит центр кадра.

**Перебивка:** `// ФАЗА 04 · ЯКІСТЬ · CONTROL PROTOCOL`

---

## АКТ IV. ЯКІСТЬ

Здесь включают свет. Единственный светлый акт на всём сайте, холодный белый, стерильный. После четырёх тёмных актов это как войти в операционную.

Направление: **остановка.** Камера почти не двигается, работает оптика: макро, малая глубина резкости, точные предметы. 4 сцены по 80vh, каждая 5 с.

Стилевой хвост для этого акта другой, замени в промптах:
```
Clean clinical industrial photography, bright cold white light, high key,
white and pale grey surfaces, shallow depth of field, crisp detail, fine film grain,
no text, no logos, no people.
```

### IV.1. PHASE 01. Вхідний контроль
```
Bright white inspection area. A newly delivered electrical component sits on a clean
steel bench, its packaging opened beside it, a micrometer and a caliper laid out next
to it, a checklist clipboard face down. Cold white light from above, shallow depth of
field on the instruments.
```
`Very slow push in toward the measuring instruments on the bench. Almost static.`

### IV.2. PHASE 02. Документальний супровід
```
Bright white office table seen from above at a slight angle. Technical drawings and
document folders spread out, a rubber stamp and a pen resting on top, a laptop closed
at the edge of frame. Cold white light, shallow depth of field, no readable text.
```
`Very slow lateral drift across the table, papers passing under the lens. Almost static.`

### IV.3. PHASE 03. Відповідність стандартам
```
Bright high voltage test laboratory. A test object stands connected to laboratory
apparatus, insulating stands and shielded cables around it, control desk with dials
in the background out of focus, white walls, cold even light.
```
`Very slow push in toward the test object. Almost static, clinical.`

### IV.4. PHASE 04. Технічний контроль
```
Extreme macro on a clean white bench: a cable joint cross-section next to test probes
and a digital measuring device, copper strands and insulation layers crisply visible,
very shallow depth of field, cold white light, white background falling to pale grey.
```
`Extremely slow push in toward the cut cable, the copper strands coming into focus. Almost static.`

**Фронт:** `PHASE 01 … 04` крупно моно, под ним три строки из их текста. Внизу горизонтальная шкала фаз, заполняется по мере прохождения акта. Здесь же строка `ISO 9001 COMPLIANT`, и в белом акте она наконец выглядит уместно, а не как декор.

---

## ЭПИЛОГ. Взаємодія

**1 сцена, 8 с, 120vh**

Кадр (мост из белой лаборатории наружу):
```
Looking out through a large window from a bright interior into the night, the room
lights reflected faintly in the glass, a city glowing far below and beyond it dark
countryside, the horizon curving very slightly.
```
Анимация:
```
The camera moves toward the window and continues straight through it, rising fast
away from the city, the ground falling away below, ending high above with the curve
of the horizon and the lit landscape far below. One continuous ascent.
```

Финальный кадр смыкается с прологом: та же орбита, но страна уже вся в огнях, и огни не гаснут.

**Фронт:** контакты (Київ, Прорізна 13, +380 67 209 99 64, info@seir.com.ua), форма заявки выезжает справа, строка `SYSTEM LINK ESTABLISHED / Очікуємо на вхідний запит`.

---

## 3. Сводка по производству

| Акт | Сцен | Видео | Кадров | Что за кадры |
|---|---|---|---|---|
| Пролог | 1 | 1 | 2 | старт P0 + мост в Акт I |
| I. Наші рішення | 3 | 3 | 3 | старт берётся из моста, нужны три конечных |
| II. Обладнання | 1 проезд | 3 | 4 | старт + три конечных |
| III. Експертиза | 4 | 4 | 4 | по одному стартовому на сцену |
| IV. Якість | 4 | 4 | 4 | по одному стартовому на сцену |
| Эпилог | 1 | 1 | 2 | старт из белой лаборатории + финальная орбита |
| **Итого** | **14** | **16** | **19** | |

Общая длина скролла погружения: около **1500vh** плюс страница с контентом.

---

## 4. Бюджет

| Этап | Штук | Цена | Итого |
|---|---|---|---|
| Кадры | 19 | 2 | 38 |
| Перегенерация кадров, ~40% | 8 | 2 | 16 |
| Видео | 16 | 12 | 192 |
| Дубли видео, ~50% | 8 | 12 | 96 |
| **Итого** | | | **~342 кредита** |

Апскейл и reframe в 9:16 считаем после утверждения.

**Вес сайта.** 16 роликов это проблема. Решение: скраббинг по скроллу оставляем только там, где он нужен драматургически, это пролог, акт I и эпилог. Акты II, III, IV играют автоплеем при входе сцены в вьюпорт. Автоплейные ролики кодируются обычным GOP и весят втрое меньше all-intra.

```
скраббинг (all-intra, 3-4 МБ):   5 роликов  ≈ 18 МБ
автоплей (обычный GOP, 1-1,5 МБ): 11 роликов ≈ 15 МБ
итого                                        ≈ 33 МБ
```

При ленивой загрузке по актам первый экран остаётся под 1,2 МБ.

---

## 5. Если дорого, режем так

**Ядро (можно запускать отдельно, ~130 кредитов):** пролог, акт I целиком, эпилог. Это 5 видео и полноценный сайт: вход, три решения, контакты. Всё остальное пока обычными секциями с текстом.

**Первое расширение:** акт II Обладнання. Даёт больше всего на вложенный кредит, потому что один проезд закрывает девять категорий.

**Второе расширение:** акт IV Якість. Белый акт сильнее всего меняет впечатление от сайта, потому что ломает монотонность.

**Последним:** акт III Експертиза. Четыре аэросъёмки красивы, но по смыслу дублируют то, что уже показано в актах I и II.

---

## 6. Конфиг

`content/film.ts` вместо прежнего `scenes.ts`:

```ts
type Act = {
  id: 'prologue'|'solutions'|'equipment'|'expertise'|'quality'|'epilogue';
  label: string;              // «// ФАЗА 02 · ОБЛАДНАННЯ · CAT REGISTRY»
  axis: 'fall'|'lateral'|'rise'|'still';
  playback: 'scrub'|'autoplay';
  palette: 'cold'|'steel'|'black'|'dawn'|'white';
  scenes: Scene[];
};

type Scene = {
  id: string;
  videoSrc: string; posterSrc: string;
  duration: number; scrollVh: number;
  eyebrow: string; titleMain: string; titleAccent: string;
  body?: string[];            // списки работ
  services?: string[];
  cats?: string[];            // ['CAT-03','CAT-07']
  overlay?: 'cityLights'|'flow'|'leds'|'phaseBar'|null;
  cta?: { label: string; action: 'lead'|'catalog' };
};
```

Ось `axis` управляет тем, как сцена движется при скролле:
`fall` это scale плюс opacity как в прототипе, `lateral` это translateX, `rise` это обратный scale с движением вверх, `still` только opacity и лёгкий макро-наезд.

Одно поле `axis` в конфиге, и весь ритм фильма правится без единой строчки в компонентах.
