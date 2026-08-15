# SEIR. Генерация видеоряда через Higgsfield MCP

Этот файл — единственный и самодостаточный источник промптов и параметров
генерации. Заглядывать в film.md для генерации не нужно: все промпты кадров и
движения вшиты сюда.
Модель кадров: `cinematic_studio_2_5` (image, 16:9, 2k).
Модель видео: `cinematic_studio_video_v2`.

Параметры ВСЕХ видео, без исключений:
```json
{"model":"cinematic_studio_video_v2","aspect_ratio":"16:9",
 "mode":"pro","sound":"off","speedramp":"linear","genre":"auto","cfg_scale":0.35}
```
`speedramp: linear` — скраббинг по скроллу линейный, авторамп сломает его.
`cfg_scale: 0.35` — стартовый кадр закон, промпт описывает только движение.

Правило цепи: у скраббинг-актов (пролог, I, II, эпилог) последний кадр сцены =
первый кадр следующей. У автоплей-актов (III, IV) цепь не нужна, каждой сцене
хватает одного стартового кадра.

Правило пересъёмки: брак перегенерируется тем же промптом без изменений один
раз; если снова брак — промпт укорачивается (убирается второстепенная деталь),
но НЕ дополняется. Длинные промпты движения ломают стабильность.

Стилевой хвост кадров (добавлен во все промпты ниже):
cinematic industrial documentary, photorealistic, shot on ARRI Alexa,
deep blacks with lifted shadows, fine film grain, practical light only,
no text, no logos, no people, no glowing energy lines, no sparks,
clean empty space in the middle third for typography.

Именование скачанных файлов в raw/ — по конвенции encode.bat:
scrub_p0, scrub_i1, scrub_i2, scrub_i3, scrub_ii, scrub_ep — скраббинг
auto_iii1..4, auto_iv1..4 — автоплей

---

## ГОТОВЫЕ КАДРЫ (уже сгенерированы, повторно не генерить)

| Ключ | Что это | job_id |
|---|---|---|
| F_P0 | старт пролога, орбита | efea0f30-3b47-4d83-82aa-07b9c833fe7e |
| F_M01 | мост пролог→I.1, облака и подстанция внизу | ce98dbb3-b835-4d25-b833-ad3f6bc13862 |
| F_I1E | финал I.1, диагностика + дверь мастерской | 000c87db-d88a-43a1-a432-24c4902b83b5 |
| F_I2E | финал I.2, разобранный трансформатор + трал в воротах | 1d49337a-568b-4cfa-9b98-f13647b46ab0 |
| F_I3E | финал I.3, двор поставки, кран, дождь | 5b6ea1d0-0fa4-4c06-ae34-ee706898e8e7 |

URL кадра доступен через jobs_wait по job_id. Для передачи в видео как
start_image/end_image использовать media_import_url или прямую передачу URL,
как поддерживает инструмент generate_video.

Запасные кадры из первого батча (референс стиля, в цепи не участвуют):
7d8c91a4 (машинный зал), 8f5e698b (ЛЭП), 2babb4ac (подстанция),
8e882d1a (ряд КРУ), 18675038 (макро муфты).

---

## ЭТАП 1. ВИДЕО ЯДРА — 4 ролика, кадры все готовы

### V_P0 → raw/scrub_p0.mp4, duration 8
start_image: F_P0, end_image: F_M01
```
Extremely slow orbital drift, the atmospheric glow shifting along the limb,
city lights twinkling faintly. In the final two seconds the camera begins a slow
controlled descent toward the cloud layer below. One continuous take, no cuts,
no shake.
```

### V_I1 → raw/scrub_i1.mp4, duration 8
start_image: F_M01, end_image: F_I1E
```
The camera falls through the cloud gap and descends toward the substation yard,
levels out low over the gravel and moves slowly past the transformer toward the
diagnostic equipment, ending on a medium shot of the instrument cases and the
thermal camera with the warm workshop door behind. One continuous move, gradual
deceleration.
```

### V_I2 → raw/scrub_i2.mp4, duration 8
start_image: F_I1E, end_image: F_I2E
```
The camera moves forward through the warm doorway into the repair bay, passes
along the partially disassembled transformer with its windings exposed, and turns
toward the open gate where the loaded trailer stands outside in the rain. Slow,
heavy, mechanical move, ending almost static.
```

### V_I3 → raw/scrub_i3.mp4, duration 8
start_image: F_I2E, end_image: F_I3E
```
The camera moves out through the gate into the rain, travels slowly along the
loaded trailer from the rear toward the front, the crane boom passing overhead,
ending on a wide shot of the yard with crates and cable reels in the foreground.
Steady lateral move.
```

---

## ЭТАП 2. АКТ II — 4 кадра, потом 3 ролика в один файл scrub_ii

Кадры (генерить в этом порядке, каждый следующий держит ту же геометрию зала):

F_II0 — старт проезда:
```
Vast dark industrial hall, almost black. Three objects stand widely spaced in a
row receding to the right, each lit by a single narrow cone of light from above:
a large reel of high voltage cable, a set of cable joints and insulation kits on
a low stand, and a power transformer. Polished dark concrete floor reflecting
the cones, everything else falls into black.
```

F_II1 — конец первой трети (и старт второй):
```
Same vast dark hall, same perspective and floor. Three objects under narrow
light cones: a power transformer on the left edge leaving frame, a steam turbine
rotor on support blocks in the centre, and a row of metal-clad switchgear
cubicles entering from the right. Polished dark floor, everything else black.
```

F_II2 — конец второй трети (и старт третьей):
```
Same vast dark hall. Three objects under light cones: a high voltage circuit
breaker with porcelain insulators on the left, a rack of measuring and control
instruments with dials in the centre, and a group of large industrial valves
entering from the right. Polished dark floor, everything else black.
```

F_II3 — финал проезда:
```
Same vast dark hall. Under the last two light cones: a group of large industrial
valves and fittings, and an industrial pump coupled to a heat exchanger with
insulated pipework. Beyond them the cones end and the hall recedes into total
darkness. Polished dark floor.
```

Ролики (по 8 с, потом склеить встык в один raw/scrub_ii.mp4):
- V_II1: start F_II0, end F_II1
- V_II2: start F_II1, end F_II2
- V_II3: start F_II2, end F_II3

Промпт движения одинаковый для всех трёх:
```
The camera tracks laterally to the right at a constant slow speed, the lit
objects passing one after another, each entering frame from the right and
leaving to the left. Perfectly steady dolly, no shake, no zoom, no speed change.
```
Для V_II3 добавить в конец: `The move decelerates and stops on the last object.`

Склейка: ffmpeg concat demuxer, файлы одного кодека склеиваются без
перекодирования. Если на стыках виден скачок яркости — перегенерить кадр стыка.

---

## ЭТАП 3. АКТ III — 4 кадра, 4 ролика auto_iii1..4, по 6 с, цепь не нужна

Каждой сцене один стартовый кадр, end_image не передаётся.

F_III1 (кадр) → V_III1 (auto_iii1):
```
Aerial view of a large power plant at dawn, cooling towers releasing slow steam,
turbine hall roof, switchyard beside it, river and empty fields around, low mist,
pale orange horizon, cold blue sky above.
```
движение: `The camera rises and slowly orbits the plant, steam drifting. Smooth ascent.`

F_III2 → V_III2 (auto_iii2):
```
Aerial view of a distribution substation at dawn, rectangular fenced yard with
transformers and busbars, transmission lines leaving in three directions toward
the horizon, fields and a small town beyond, low ground mist.
```
движение: `The camera rises above the substation, the transmission lines opening out in three directions below. Smooth ascent, slight rotation.`

F_III3 → V_III3 (auto_iii3):
```
Aerial view of a large manufacturing plant at dawn, long production halls, pipe
racks and stacks, a substation and switchgear building on the edge of the site,
parking areas empty, cold morning light.
```
движение: `The camera rises and drifts over the plant, pipe racks and roofs passing below. Smooth ascent.`

F_III4 → V_III4 (auto_iii4):
```
Aerial view at dawn of infrastructure spread across a landscape: a pumping
station with pipelines, a heating plant with insulated pipes running away from
it, a road and a rail line crossing, a telecom mast, a small town beyond. Cold
morning light.
```
движение: `The camera rises higher, the whole landscape opening below with the pipelines and lines running across it. Smooth ascent, ending very wide.`

## ЭТАП 4. АКТ IV — 4 кадра, 4 ролика auto_iv1..4, по 5 с, цепь не нужна

ВНИМАНИЕ: у этого акта другой стилевой хвост, тёмный хвост из шапки НЕ
использовать. Ко всем четырём промптам ниже добавляется:
```
Clean clinical industrial photography, bright cold white light, high key,
white and pale grey surfaces, shallow depth of field, crisp detail, fine film
grain, no text, no logos, no people.
```

F_IV1 → V_IV1 (auto_iv1):
```
Bright white inspection area. A newly delivered electrical component sits on a
clean steel bench, its packaging opened beside it, a micrometer and a caliper
laid out next to it, a checklist clipboard face down. Cold white light from
above, shallow depth of field on the instruments.
```
движение: `Very slow push in toward the measuring instruments on the bench. Almost static.`

F_IV2 → V_IV2 (auto_iv2):
```
Bright white office table seen from above at a slight angle. Technical drawings
and document folders spread out, a rubber stamp and a pen resting on top, a
laptop closed at the edge of frame. Cold white light, shallow depth of field,
no readable text.
```
движение: `Very slow lateral drift across the table, papers passing under the lens. Almost static.`

F_IV3 → V_IV3 (auto_iv3):
```
Bright high voltage test laboratory. A test object stands connected to
laboratory apparatus, insulating stands and shielded cables around it, control
desk with dials in the background out of focus, white walls, cold even light.
```
движение: `Very slow push in toward the test object. Almost static, clinical.`

F_IV4 → V_IV4 (auto_iv4):
```
Extreme macro on a clean white bench: a cable joint cross-section next to test
probes and a digital measuring device, copper strands and insulation layers
crisply visible, very shallow depth of field, cold white light, white background
falling to pale grey.
```
движение: `Extremely slow push in toward the cut cable, the copper strands coming into focus. Almost static.`

## ЭТАП 5. ЭПИЛОГ — 2 кадра, 1 ролик scrub_ep, 8 с

F_EP0 — из светлого интерьера к окну (стилевой хвост тёмный, из шапки):
```
Looking out through a large window from a bright interior into the night, the
room lights reflected faintly in the glass, a city glowing far below and beyond
it dark countryside, the horizon curving very slightly.
```

F_EP1 — финальная орбита, композиция как у F_P0, но огней заметно больше:
```
View of Earth from low orbit at night, the curved limb across the lower third,
thin luminous blue atmospheric glow, black space with faint stars. The dark
landmass below is now densely covered with bright warm amber city lights,
visibly more than before, thin clouds catching the glow.
```

V_EP → raw/scrub_ep.mp4: start_image F_EP0, end_image F_EP1, duration 8:
```
The camera moves toward the window and continues straight through it, rising
fast away from the city, the ground falling away below, ending high above with
the curve of the horizon and the lit landscape far below. One continuous ascent.
```

---

## ПОРЯДОК И БЮДЖЕТ

| Этап | Кадров | Видео | Кредиты |
|---|---|---|---|
| 1. Ядро | 0 (готовы) | 4×12 | 48 |
| 2. Акт II | 4×2 | 3×12 | 44 |
| 3. Акт III | 4×2 | 4×12 | 56 |
| 4. Акт IV | 4×2 | 4×12 | 56 |
| 5. Эпилог | 2×2 | 1×12 | 16 |
| Резерв на дубли | | | ~80 |
| **Итого** | | | **~300** |

Каждый этап: сгенерить кадры → ПОКАЗАТЬ пользователю → ждать утверждения →
только потом видео. Видео без утверждённых кадров не запускать.
После каждого этапа: скачать в raw/ под конвенционными именами → encode.bat →
проверить сцену в браузере → следующий этап.
