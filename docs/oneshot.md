# SEIR. Один кадр. Полный сценарий с нуля

Заменяет generation.md и generation-v2-seamless.md целиком.
Весь сайт — один непрерывный проход камеры без единой склейки-наплыва.
21 ключевой кадр, 20 видеосегментов, скролл скраббит единый таймлайн.

---

## 1. Три закона, на которых всё стоит

**Закон прохода.** Камера никогда не «переносится» в новую сцену. Она всегда
проходит СКВОЗЬ что-то физическое: облако, дверь, ворота, световой люк, окно,
темноту, белую дымку. Каждый переход это проём, и проём есть в кадре заранее.
Зритель видит, куда камера пойдёт, за несколько секунд до того, как она пошла.

**Закон времени суток.** За весь фильм проходят одни сутки, по кругу:
```
ніч (орбіта) → ніч (двори, цехи) → передсвітанок (дощ) → темрява (ангар,
поза часом) → світанок (політ над полями) → день (біла лабораторія) →
вечір (вікно) → ніч (орбіта у вогнях)
```
Свет мотивирует смену палитры сам, без цветокоррекции «по градиенту».

**Закон тихого стыка.** Реальные склейки видеосегментов ставятся ТОЛЬКО в
кадрах с минимумом информации: внутри облака, в тёмном проёме, в белой дымке,
в момент, когда проём заполняет кадр. В таком кадре микродрейф генерации
физически не виден. Ни одна склейка не стоит на детальном кадре.

Из этого следует отказ от старой механики: никаких opacity-наплывов, blur на
стыках, scale-осей. Движение живёт в самом видео. Фронт скраббит один таймлайн.

---

## 2. Карта пути (весь фильм одной строкой)

```
орбіта → крізь хмари → двір діагностики → крізь двері майстерні → ремонтний
бокс → крізь ворота під дощ → двір поставки → слідом за вантажем у темний
ангар → уздовж 9 конусів світла → вгору крізь світловий люк → світанок над
соняшниками → переліт: електростанція → підстанція → завод → інфраструктура →
вгору у білу хмару → крізь матовий люк у білу лабораторію → уздовж стендів до
макро муфти → від'їзд до вікна, за вікном уже вечір → крізь вікно у ніч →
підйом до орбіти, країна вся у вогнях
```

Разделы сайта ложатся на отрезки пути:
| Отрезок | Раздел | Кадры |
|---|---|---|
| орбита и спуск | пролог | K00-K02 |
| три двора | Наші рішення | K02-K05 |
| ангар | Обладнання CAT-01..09 | K05-K08 |
| полёт | Експертиза 01-04 | K09-K13 |
| лаборатория | Якість PHASE 01-04 | K15-K18 |
| окно и подъём | Взаємодія | K19-K20 |

Титры фаз («// ФАЗА 02 · ОБЛАДНАННЯ · CAT REGISTRY») появляются поверх
движения в моменты проходов, на чёрном/белом заполнении проёма.

---

## 3. Глобальные модификаторы (во все промпты кадров)

Хвост стиля тёмных сцен:
```
cinematic industrial documentary, photorealistic, shot on ARRI Alexa, deep
blacks with lifted shadows, fine film grain, practical light only, no text,
no logos, no people, no glowing energy lines, no sparks, clean empty space in
the middle third for typography, full frame edge to edge, no letterbox, no
black bars, no border, no timecode, no frame counter, no film stock markings,
no camera overlay
```
Хвост светлых сцен (K14-K18):
```
clean clinical industrial photography, bright cold white light, high key,
white and pale grey surfaces, crisp detail, fine film grain, no text, no
logos, no people, full frame edge to edge, no letterbox, no black bars, no
border, no timecode, no frame counter, no film stock markings, no camera
overlay
```
Новизна (везде, кроме K03):
```
all equipment is new, clean and modern, freshly painted, no rust, no dirt
```
K03 (ремонт) вместо неё:
```
the disassembled transformer shows honest wear; every tool, light and the new
transformer outside are new and clean
```
Украина (все наружные сцены):
```
Ukrainian landscape: vast steppe, sunflower fields, a wide calm river, poplar
trees along a road
```

---

## 4. Кадры K00-K20

✅ = уже сгенерирован, job_id действителен, не перегенерировать.

**K00 ✅ Орбіта, ніч.** job efea0f30. Контур Украины и огни рисует фронт
(UkraineMap.tsx), видео даёт лимб, атмосферу, звёзды.

**K01 ✅ Усередині хмар, розрив, унизу двір.** job ce98dbb3.
Тихий стык №1: кадр почти целиком облако.

**K02 ✅ Двір діагностики.** job 000c87db. Тепловизор у трансформатора,
за ним ТЁПЛАЯ ОТКРЫТАЯ ДВЕРЬ мастерской — проём следующего прохода.

**K03 ✅ Ремонтний бокс.** job 1d49337a. Разобранный трансформатор, в
ВОРОТАХ виден трал с новым — проём следующего прохода.

**K04 ✅ Двір поставки.** job 5b6ea1d0. Кран, ящики, дождь, передрассветный
свет. Взгляд в сторону ТЁМНЫХ ВОРОТ склада — проём.

**K05. Поріг ангара.** Тихий стык №2: кадр наполовину тёмный проём.
```
Inside a vast dark warehouse just past its open gate, looking along the wall:
behind through the gate the rainy pre-dawn yard with the floodlit trailer,
ahead in the darkness the first narrow cone of light from above illuminating
a large new reel of high voltage cable on a stand, and deeper along the wall a
second cone over a stand with cable joints and insulation kits, polished dark
concrete reflecting the cones, everything else black. + тёмный хвост + новизна
```

**K06. Ангар, стик 1.** Конус с кабельной арматурой и муфтами уходит влево,
в центре силовой трансформатор под конусом, справа входит турбинный ротор.
```
Vast dark industrial hall. Under narrow light cones from above, in a row: on
the left edge leaving frame a stand with cable joints and insulation kits, in
the centre a new power transformer, on the right entering frame a steam
turbine rotor on support blocks. Polished dark floor, all else black.
+ тёмный хвост + новизна
```

**K07. Ангар, стик 2.** Порядок строго по каталогу: КРУ (05) уходит влево,
выключатель (06) в центре, КВПиА (07) входит справа.
```
Same vast dark hall, same floor. Under light cones: leaving frame left a row
of new metal-clad switchgear cubicles, in the centre a high voltage circuit
breaker with porcelain insulators, entering right a rack of measuring and
control instruments with dials. All else black. + тёмный хвост + новизна
```

**K08. Ангар, фінал.** Арматура и насос с теплообменником, дальше конусы
кончаются, над последним конусом угадывается СВІТЛОВИЙ ЛЮК — проём вверх.
```
Same vast dark hall. Under the last two cones: a group of large new industrial
valves, and an industrial pump coupled to a heat exchanger with insulated
pipework. Beyond them darkness; faintly above the last cone a closed skylight
with a thin rim of pale dawn light. + тёмный хвост + новизна
```

**K09. Над дахом ангара, світанок.** Тихий стык №3 на подъёме: миг в тёмной
шахте люка.
```
Aerial view at dawn just above a large warehouse roof with an open skylight
below, ahead a vast Ukrainian landscape: sunflower fields toward a pale orange
horizon, a wide calm river, and in the far distance a large power plant with
cooling towers releasing slow steam, low mist. + тёмный хвост + Украина + новизна
```

**K10. Електростанція.**
```
Aerial view beside a large modern power plant, cooling towers with slow
steam, turbine hall roof, switchyard beside it, the wide river behind,
sunflower fields around, soft pale morning light, thin warm glow at the
horizon, low mist. + тёмный хвост + Украина + новизна
```

**K11. Підстанція.**
```
Aerial view above a new distribution substation, rectangular fenced yard
with transformers and busbars, transmission lines leaving in three
directions across sunflower fields toward the horizon, a small town beyond,
soft pale morning light, thin warm glow at the horizon, low mist.
+ тёмный хвост + Украина + новизна
```

**K12. Завод.**
```
Aerial view of a large modern manufacturing plant, long production halls,
pipe racks, a substation at the site edge, poplar trees along the access
road, fields around, soft pale morning light, thin warm glow at the horizon,
low mist. + тёмный хвост + Украина + новизна
```

**K13. Інфраструктура, широко.**
```
Very wide aerial view: a pumping station with pipelines, a heating plant
with insulated pipes running away, a road and a rail line crossing, a
telecom mast, a small town, the river and sunflower fields stretching to
the horizon, soft pale morning light, thin warm glow at the horizon, low
mist. + тёмный хвост + Украина + новизна
```

**K14. Біла хмара.** Тихий стык №4, главный: кадр почти чистый белый.
```
Inside a thin bright morning cloud, the frame almost entirely soft white haze,
only a faint suggestion of sky gradient at the top. High key, minimal detail.
+ светлый хвост
```

**K15. Лабораторія, вхід згори.**
```
Bright white inspection laboratory seen from just below a frosted skylight:
white benches, on the nearest a newly delivered electrical component beside a
micrometer and caliper, cold even white light, pale grey floor. + светлый
хвост + новизна
```

**K16. Стіл документації.**
```
Same bright laboratory. A white table with technical drawings and document
folders spread out, a stamp and a pen, a closed laptop at the edge, no
readable text, shallow depth of field. + светлый хвост
```

**K17. Випробувальна зона.**
```
Same bright laboratory, the high voltage test area: a test object connected to
laboratory apparatus, insulating stands and shielded cables, control desk with
dials out of focus behind, white walls, cold even light. + светлый хвост + новизна
```

**K18. Макро муфти.**
```
Extreme macro on a clean white bench in the same laboratory: a cable joint
cross-section beside test probes and a digital measuring device, copper
strands and insulation layers crisply visible, very shallow depth of field,
cold white light. + светлый хвост
```

**K19. Вікно у вечір.** За окном уже сумерки: день прошёл.
```
Inside the bright laboratory looking toward a large window: outside deep blue
evening falling into night, a city beginning to glow far below, the room
lights faintly reflected in the glass. + светлый хвост
```

**K20. Орбіта у вогнях.** Композиция K00, огней на порядок больше.
```
View of Earth from low orbit at night, curved limb across the lower third,
thin luminous blue atmospheric glow, faint stars. The dark landmass below is
densely covered with bright warm amber city lights, thin clouds catching the
glow. + тёмный хвост
```

---

## 5. Видеосегменты V01-V20

Параметры всех: cinematic_studio_video_v2, 16:9, mode pro, sound off,
speedramp linear, cfg_scale 0.35. Длительность 8 c, где не указано иное.
✅ = сгенерирован (этап 1), остаётся.

| V | start→end | Движение |
|---|---|---|
| V01 ✅ | K00→K01 | орбитальный дрейф, в конце начало спуска |
| V02 ✅ | K01→K02 | падение сквозь разрыв облака, приземление у диагностики |
| V03 ✅ | K02→K03 | сквозь тёплую дверь в ремонтный бокс |
| V04 ✅ | K03→K04 | сквозь ворота под дождь, вдоль трала |
| V05 | K04→K05 | `The camera follows the forklift tracks from the rainy yard through the dark gate into the warehouse, the rain sounds left behind, arriving at the first light cone with the cable reel. Steady slow move into darkness.` |
| V06 | K05→K06 | `The camera tracks laterally right at constant slow speed past the light cones, the reel and joint kits leaving frame, the transformer arriving at centre, the turbine rotor entering. Perfectly steady dolly, no zoom.` |
| V07 | K06→K07 | `The camera tracks laterally right at constant slow speed, the transformer and turbine rotor leaving frame, the switchgear cubicles passing, the circuit breaker arriving at centre, the instrument rack entering from the right. Perfectly steady dolly, no zoom, no speed change.` |
| V08 | K07→K08 | `The camera tracks laterally right at constant slow speed, the breaker and instrument rack leaving frame, the group of industrial valves passing, the pump with heat exchanger arriving under the last cone. The dolly decelerates smoothly and stops.` |
| V09 | K08→K09 | `From the last cone the camera rises straight up into darkness, a skylight opens above, the frame passes through the dark shaft and emerges above the roof into pale dawn over sunflower fields. One continuous ascent.` |
| V10 | K09→K10 | `The camera flies forward over sunflower fields and the river toward the power plant, descending slightly as it arrives beside the cooling towers. Smooth continuous flight.` |
| V11 | K10→K11 | `The camera rises from the plant and flies over fields to the substation, the transmission lines converging below as it arrives. Smooth flight.` |
| V12 | K11→K12 | `The camera follows one transmission line over sunflower fields toward the manufacturing plant, arriving over its halls at sunrise. Smooth flight.` |
| V13 | K12→K13 | `The camera rises from the plant, the landscape opening very wide: pipelines, road, rail, the river. Smooth ascent, ending high and wide.` |
| V14 | K13→K14, 6 c | `The camera climbs steeply into a thin bright morning cloud, the landscape dissolving below, the frame filling with soft white haze. Continuous climb into white.` |
| V15 | K14→K15, 6 c | `Out of the white haze a frosted skylight resolves and the camera descends through it into a bright white laboratory, settling toward the inspection bench. Continuous descent out of white.` |
| V16 | K15→K16, 5 c | `Slow lateral dolly from the inspection bench to the documentation table.` |
| V17 | K16→K17, 5 c | `Slow lateral dolly from the table to the high voltage test area.` |
| V18 | K17→K18, 5 c | `The camera moves to a macro bench and pushes slowly into the extreme close-up of the cut cable joint, ending almost static.` |
| V19 | K18→K19, 6 c | `The camera pulls back from the macro, revealing the laboratory, and turns toward the large window where evening has fallen outside. Continuous move.` |
| V20 | K19→K20, 10 c | `The camera moves through the window into the night and rises fast away from the lit city, the ground falling away, ending high above with the curve of the horizon and the densely lit landscape. One continuous ascent.` |

ПРЕФЛАЙТ V20: до запуска проверить get_cost/валидацию duration 10 у
cinematic_studio_video_v2. Если максимум 8 с — план Б: разбить на V20a
(K19→K19b, 6 с, `through the window and up, the city shrinking below`) и V20b
(K19b→K20, 8 с, `continuous ascent to orbit`), где K19b — новый кадр:
```
High night aerial above a glowing city, the lit street grid shrinking below,
dark countryside around, thin clouds beginning to pass the frame, the horizon
very slightly curved. + тёмный хвост
```
Тихий стык V20a/V20b — в облачной прослойке K19b.

Тихие стыки (реальные склейки сегментов): внутри K01 (облако), K05 (тёмный
проём), шахта люка внутри V09, K14 (белое). Остальные границы сегментов
склеиваются общим кадром в движении: это тоже стыки, но камера в них не
останавливается, поэтому требование к ним — совпадение кадра, оно
обеспечено цепью start/end.

---

## 6. Механика фронта (замена прежней)

1. Один глобальный таймлайн, но маппинг времени на скролл НЕ равномерный:
   темп задаётся столбцом vh/с. Это и есть спидрамп всего фильма — он живёт
   в скролле, а не в видео (в видео speedramp всегда linear, иначе скраббинг
   становится резиновым). Правило: транзиты быстрые (8-10 vh/с), сегменты
   с текстом медленные (12-16 vh/с), чтобы списки успевали читаться.

| V | с | vh/с | vh | почему |
|---|---|---|---|---|
| V01 | 8 | 10 | 80 | транзит, заголовок короткий |
| V02 | 8 | 10 | 80 | транзит |
| V03 | 8 | 14 | 112 | списки «Технічне обслуговування» |
| V04 | 8 | 14 | 112 | списки «Модернізація», счётчик аварии |
| V05 | 8 | 12 | 96 | списки «Постачання» + вход в ангар |
| V06 | 8 | 15 | 120 | карточки CAT-01..04 |
| V07 | 8 | 15 | 120 | карточки CAT-05..07 |
| V08 | 8 | 15 | 120 | карточки CAT-08..09, остановка |
| V09 | 8 | 10 | 80 | подъём, титр фазы |
| V10 | 8 | 12 | 96 | карточка Експертиза 01 |
| V11 | 8 | 12 | 96 | Експертиза 02 |
| V12 | 8 | 12 | 96 | Експертиза 03 |
| V13 | 8 | 12 | 96 | Експертиза 04 |
| V14 | 6 | 8 | 48 | белое, титр фазы |
| V15 | 6 | 8 | 48 | вход в лабораторию |
| V16 | 5 | 14 | 70 | PHASE 01→02 |
| V17 | 5 | 14 | 70 | PHASE 02→03 |
| V18 | 5 | 14 | 70 | PHASE 03→04 |
| V19 | 6 | 10 | 60 | отъезд к окну, титр фазы |
| V20 | 10 | 8 | 80 | финальный подъём, контакты |
| **Σ** | **147** | | **~1750vh** | |

Столбцы «с» и «vh» живут в конфиге сегмента (duration, scrollVh),
пересчёт высоты страницы автоматический.
2. Каждый сегмент — свой <video>, скраббится на своём отрезке таймлайна.
   На границе отрезков жёсткая подмена элемента (visibility), БЕЗ наплыва:
   оба видео в граничный момент показывают один и тот же кадр, наплыв не
   нужен и вреден.
3. Оси fall/lateral/rise/still УДАЛЯЮТСЯ: движение живёт в видео. Никаких
   transform и blur на сценах. Это упрощает FilmStage.
4. Тексты разделов появляются на своих отрезках времени (конфиг: fromT, toT
   в секундах таймлайна), появление/уход только opacity+translateY, как
   сейчас.
5. Предзагрузка: текущий сегмент + два вперёд + один назад. Один формат —
   mp4, h264 all-intra, crf 23, денойз hqdn3d=2:1.5:3:2.5 до масштабирования
   (encode.bat = build.md §9). webm убран: vp9 при -g 1 тяжелее h264.
6. prefers-reduced-motion: покадровая версия — 21 ключевой кадр как постеры,
   обычный скролл.
7. UkraineMap.tsx (контур + огни) поверх V01 и V20.

---

## 7. Бюджет оставшегося

| | Кадры (2 кр) | Видео (12 кр; V20 10с — проверить preflight) |
|---|---|---|
| K05-K20 новые | 15 → 30 кр | |
| V05-V20 | | 16 → ~196 кр |
| Дубли ~40% | ~12 кр | ~96 кр |
| **Итого** | | **~334 кр** |

Ядро (K00-K04, V01-V04) выживает целиком.

## 8. Порядок

Батчами по отрезку пути, каждый: кадры → показать на утверждение → видео →
скачать → encode → смотреть шов → дальше.
1. K05-K08 (ангар) + K09 — 5 кадров
2. V05-V09 — 5 видео
3. K10-K14 (полёт + белое) — 5 кадров, затем V10-V15
4. K15-K19 (лаборатория) — 5 кадров, затем V16-V19
5. K20 + V20 — финал


---

## 9. Мобильная версия: отдельный вертикальный фильм, не кроп

Мобилка получает собственные 9:16 версии всех сегментов через Higgsfield
`reframe` (модель перестраивает композицию под вертикаль, а не режет края).
CSS-кроп и letterbox запрещены.

### Порядок производства
1. Reframe запускается ПОСЛЕ утверждения десктопного сегмента, батчами теми
   же отрезками пути. Перед первым запуском сделать get_cost префлайт
   reframe и записать цену в отчёт.
2. Файлы: raw/m_<имя>.mp4 → encode.bat кодирует мобильную ветку в
   public/video/mobile/ с scale=720:-2 (all-intra, тот же денойз).

### Риск швов и его гашение
Reframe достраивает верх и низ кадра, и достроенные зоны соседних сегментов
на границе могут не совпасть (центральная 16:9 полоса совпадает всегда, цепь
кадров общая). Гасится тремя мерами:
- тихие стыки (облако, тёмный проём, белое) нечувствительны к этому по
  построению — на них расхождение невидимо;
- на мобиле текст сцен живёт в нижней трети в плашке с blur(12px) — плашка
  постоянно закрывает нижнюю достроенную зону;
- если конкретный шов всё же виден в верхней зоне, у этой пары сегментов
  reframe перезапускается на СТЫКОВОЙ кадр отдельно (reframe картинки стоит
  дешевле) и оба сегмента реframe-ятся от общего вертикального кадра.

### UI-отличия мобилки
- тексты и списки: нижняя треть, тёмная/светлая плашка по палитре отрезка;
  списки услуг сворачиваются до 4 позиций с «показати всі» (раскрытие без
  скролла страницы, аккордеон внутри плашки);
- шкала пути справа: полоска 3px без подписей + бейдж текущего раздела
  сверху справа;
- CatTag остаётся, PhaseBar в акте качества упрощается до точек;
- таблица темпа умножается на 0.8 (мобильный скролл «длиннее» на палец):
  итог ~1400vh;
- канвас-слои (огни, зерно) в половинной плотности; контур Украины остаётся,
  он лёгкий;
- iOS-страховка: флаг в конфиге, переключающий мобилку со скраббинга на
  автоплей сегмента при входе в вьюпорт, если currentTime-скраббинг дёргается
  на реальном устройстве. Проверять на живом iPhone, не в эмуляторе.
