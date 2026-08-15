# SEIR. План сборки

Windows, cmd.exe. Один шаг это одна сессия Claude Code. После каждого шага
проверяешь критерий и коммитишь.

---

## 0. Инициализация

```cmd
cd C:\projects
npx create-next-app@latest seir --typescript --tailwind --app --no-src-dir --import-alias "@/*"
cd seir
npm i gsap lenis
mkdir docs public\video public\poster content components raw
git init
git add . && git commit -m "init"
```

Кладёшь `CLAUDE.md` в корень, `film.md` и `build.md` в `docs\`. Коммитишь.
Запускаешь `claude`.

---

## 1. Конфиг и каркас

```
Прочитай CLAUDE.md и docs/film.md полностью, прежде чем что-либо писать.

Задача сессии: только конфиг и каркас. Видео, оверлеи и анимации не трогаем.

1. content/film.ts:
   - тип Act: id, label, axis ('fall'|'lateral'|'rise'|'still'),
     playback ('scrub'|'autoplay'), palette ('cold'|'steel'|'black'|'dawn'|'white'),
     scenes: Scene[]
   - тип Scene: id, videoSrc, posterSrc, duration, scrollVh, eyebrow, titleMain,
     titleAccent, body (string[] опционально), services (string[] опционально),
     cats (string[] опционально), overlay, cta
   - массив FILM из шести актов. Все данные, тексты, длительности и scrollVh
     бери из docs/film.md дословно, ничего не придумывай.

2. app/(site)/page.tsx рендерит <FilmStage film={FILM} />.

3. components/FilmStage.tsx и Act.tsx в минимальном виде: контейнер общей высотой,
   посчитанной из суммы scrollVh всех сцен плюс 40vh на каждую фазовую перебивку.
   Каждая сцена пока div с градиентом-заглушкой по palette своего акта, чтобы уже
   было видно смену палитры от синего через чёрное к белому.

4. Смена сцен пока простейшая: opacity по позиции скролла. Механику осей делаем
   на следующем шаге.

Критерий: npm run dev, общая высота около 1500vh, при скролле проходят все
четырнадцать заглушек и пять перебивок, палитра плывёт по актам.
```

---

## 2. Оси движения

```
Реализуй механику осей в Act.tsx и Scene.tsx.

FilmStage считает глобальный прогресс и передаёт каждой сцене локальную дельту
d = p - sceneIndex. Scene применяет преобразование в зависимости от axis своего акта:

fall:     opacity = clamp(1 - |d| * 1.35)
          transform = scale(1 + d * 0.46)
          filter = blur((1 - opacity) * 7)px

lateral:  opacity = clamp(1 - |d| * 1.1)
          transform = translateX(-d * 100vw) scale(1.04)
          без блюра, движение должно читаться как ровный проезд

rise:     opacity = clamp(1 - |d| * 1.35)
          transform = translateY(d * 26vh) scale(1 - d * 0.18)
          filter = blur((1 - opacity) * 5)px

still:    opacity = clamp(1 - |d| * 1.9)
          transform = scale(1 + d * 0.06)
          без блюра, движение почти незаметно

Пиши напрямую в style внутри одного requestAnimationFrame, без отдельных твинов
на каждое свойство.

Критерий: падение, проезд вбок, подъём и остановка ощущаются как четыре разных
движения. 60 fps при быстрой прокрутке.
```

---

## 3. Фазовые перебивки и хром

```
1. PhaseCard.tsx: между актами, 40vh, чёрный фон, по центру моно-строка из
   поля label акта. Появление и уход только по opacity. В акте IV перебивка
   перед ним белая, а не чёрная, это переход в светлую часть.

2. Навигация: fixed сверху, прозрачная, логотип SEIR слева (letter-spacing .44em),
   пункты Про компанію / Рішення / Обладнання / Експертиза / Якість,
   справа outline-пилюля «Запит консультації». Всё 11px uppercase, spacing .3em.
   В акте IV цвета инвертируются на тёмные по светлому.

3. ActRail.tsx: fixed справа по центру, шесть засечек по числу актов, активная
   подсвечена --gold. Клик скроллит к началу акта.

4. Внизу слева «Система активна // ISO 9001 compliant», моно 9px.
   Внизу справа «прокрутіть», исчезает после 60px скролла.

5. Поверх всего .grain и .vig, pointer-events none. В акте IV виньетка выключена.

Критерий: хром не мешает читать кадр, при входе в акт IV инверсия происходит
плавно, а не рывком.
```

---

## 4. Тексты сцен

```
SceneCopy.tsx: заголовки, списки работ и кнопки.

Появление: opacity = clamp(1 - |d| * 2.1), translateY = d * -34.

Структура: eyebrow (моно 10px, --gold), titleMain и titleAccent
(Unbounded 600 uppercase, clamp(24px,4.1vw,58px), line-height 1.08,
titleAccent цветом --dim), опционально body как список работ моно 12px,
опционально кнопка (outline-пилюля с backdrop-blur).

В акте I списки работ длинные, поэтому там body рендерится в две колонки на
десктопе и в одну на мобиле.

Критерий: текст читается поверх любого кадра, не мигает на границах сцен,
длинные списки акта I помещаются в экран без скролла внутри блока.
```

---

## 5. Видео

```
Замени градиенты-заглушки на video.

Каждая сцена: <video muted playsInline preload="none" poster={posterSrc}>
с одним source — mp4 (h264 all-intra; webm убран решением по батчу 2:
vp9 при -g 1 тяжелее h264).

playback === 'scrub': локальный прогресс lp = clamp(d + 0.5, 0, 1),
video.currentTime = lp * duration, обновление в requestAnimationFrame.
Если readyState < 2, кадр пропускается.

playback === 'autoplay': play() при входе сцены в вьюпорт, pause() и
currentTime = 0 при выходе. Никакого скраббинга.

Загрузка: preload переключается на 'auto', когда до сцены остаётся меньше одной
сцены скролла. Не грузить весь фильм сразу, грузить актами.

Критерий: перемотка плавная в обе стороны, нет чёрных вспышек между сценами,
первый экран грузится меньше 1,5 с.
```

---

## 6. Оверлеи

```
CityLights (пролог и эпилог): канвас, ~170 точек в нижней трети кадра, каждая
с задержкой d от 0 до 1, загорается при on = clamp((p - d*0.55)*3). В эпилоге
порядок обратный: точки уже горят и не гаснут.

FlowLayer: SVG path по траектории проводов, stroke-dasharray = len*0.08,
stroke-dashoffset привязан к прогрессу сцены. Реакция на скорость скролла:
  const v = Math.min(Math.abs(velocity) / 3000, 1);
  filter = drop-shadow(0 0 ${3 + v*12}px var(--arc));
  opacity = 0.55 + v*0.45;
mix-blend-mode: screen.

CatTag: моно-тег в правом нижнем углу, берёт cats активной сцены, показывает
по одному с интервалом 2.5 с, fade 400 мс. Клик скроллит к карточке каталога.

PhaseBar (акт IV): горизонтальная шкала PHASE 01..04 внизу, заполняется по мере
прохождения акта.

Все канвасы отключаются при prefers-reduced-motion и на ширине меньше 820px.

Критерий: линия заметно реагирует на скорость скролла, это ключевой эффект сайта.
```

---

## 7. Страница после фильма

```
После эпилога обычные секции на фоне --ground:

1. Про компанію: абзац с сайта и счётчик «15+ років досвіду».
2. Обладнання: горизонтальная лента из девяти карточек CAT-01..09.
   Данные в content/catalog.ts. Номер каталога моно крупно, название,
   три строки описания. Сюда ведут клики по CatTag.
3. Взаємодія: Київ, Прорізна 13, +380 67 209 99 64, info@seir.com.ua,
   строка «SYSTEM LINK ESTABLISHED / Очікуємо на вхідний запит»,
   кнопка открывает LeadPanel.

LeadPanel: выезжает справа. Поля: тип объекта (селект), задача (textarea),
телефон. Валидация по blur, ошибка под полем говорит, что делать.

Критерий: контраст текста не ниже 4.5:1, секция работает без JS-анимаций.
```

---

## 8. Мобилка и производительность

```
- Ширина меньше 820px: видео из public/video/mobile/ (9:16), заголовки в нижнюю
  треть в плашке с backdrop-filter blur(12px), ActRail без подписей, канвасы off.
- Ось lateral на мобиле заменяется на fall: горизонтальный проезд на узком экране
  не читается.
- Флаг в film.ts, который переключает мобилку со скраббинга на автоплей целиком,
  на случай если iOS дёргается.
- content-visibility: auto на секциях после фильма.
- Шрифты сабсетить до кириллицы и латиницы, font-display: swap.
- prefers-reduced-motion: видео не грузится, показываются постеры, сцены
  сменяются обычным скроллом с fade.

Критерий: Lighthouse Performance не ниже 85 на мобиле, CLS ноль.
```

---

## 9. Кодирование видео

`encode.bat` в корень. Сырые файлы из Higgsfield кладёшь в `raw\`.
Имя файла решает способ кодирования: файлы, которые скраббятся, называй
`scrub_*.mp4`, остальные `auto_*.mp4`.

```bat
@echo off
if not exist public\video mkdir public\video
if not exist public\poster mkdir public\poster

for %%f in (raw\scrub_*.mp4) do (
  echo all-intra %%~nf
  ffmpeg -y -v error -i "%%f" -c:v libx264 -preset slow -crf 23 -g 1 -keyint_min 1 ^
    -sc_threshold 0 -pix_fmt yuv420p -an -movflags +faststart ^
    -vf "hqdn3d=2:1.5:3:2.5,scale=1600:-2" "public\video\%%~nf.mp4"
  ffmpeg -y -v error -i "%%f" -vframes 1 -q:v 3 -vf scale=1200:-2 "public\poster\%%~nf.webp"
)

for %%f in (raw\auto_*.mp4) do (
  echo standard %%~nf
  ffmpeg -y -v error -i "%%f" -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p ^
    -an -movflags +faststart -vf "hqdn3d=2:1.5:3:2.5,scale=1600:-2" ^
    "public\video\%%~nf.mp4"
  ffmpeg -y -v error -i "%%f" -vframes 1 -q:v 3 -vf scale=1200:-2 "public\poster\%%~nf.webp"
)

if not exist public\video\mobile mkdir public\video\mobile
for %%f in (raw\m_scrub_*.mp4) do (
  echo mobile %%~nf
  ffmpeg -y -v error -i "%%f" -c:v libx264 -preset slow -crf 23 -g 1 -keyint_min 1 ^
    -sc_threshold 0 -pix_fmt yuv420p -an -movflags +faststart ^
    -vf "hqdn3d=2:1.5:3:2.5,scale=720:-2" "public\video\mobile\%%~nf.mp4"
)
echo Done.
```

Мобильная ветка (oneshot.md, раздел 9): вертикальные 9:16 исходники кладутся
в `raw\m_scrub_<имя>.mp4`, кодируются в `public\video\mobile\` тем же
all-intra crf 23 с денойзом, ширина 720.

`-g 1 -keyint_min 1 -sc_threshold 0` делает каждый кадр ключевым. Без этого
скраббинг будет дёргаться, и никакой код это не починит. Автоплейным роликам
это не нужно, поэтому они весят втрое меньше.

---

## 10. Правила ведения сессий

- Один шаг за сессию. Два шага сразу, и он начнёт переписывать работающее.
- После каждого зелёного шага коммит. Иначе откатываться некуда.
- Если полез ставить библиотеку, останови и напомни правило из CLAUDE.md.
- Когда механика поедет, правь только `content/film.ts`. Если правка требует
  лезть в компоненты, значит конфиг спроектирован неверно, и чинить надо конфиг.

---

## 11. Деплой

```cmd
npm run build
npx vercel --prod
```

Видео около 33 МБ, помещается в репозиторий. Если вырастет за 100 МБ, выносим
на Cloudflare R2 и меняем пути в `film.ts`.
