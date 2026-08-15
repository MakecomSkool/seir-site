// SEIR — единый конфиг фильма. Сценарий: docs/film.md.
// Все тексты, тайминги, цвета и пути к видео правятся только здесь.

export type ActId =
  | "prologue"
  | "solutions"
  | "equipment"
  | "expertise"
  | "quality"
  | "epilogue";

export type Axis = "fall" | "lateral" | "rise" | "still";
export type Playback = "scrub" | "autoplay";
export type Palette = "cold" | "steel" | "black" | "dawn" | "white";
export type Overlay = "cityLights" | "flow" | "leds" | "phaseBar" | null;

export type Cta = { label: string; action: "lead" | "catalog" };

export type Scene = {
  id: string;
  videoSrc: string;
  posterSrc: string;
  duration: number; // секунды ролика
  scrollVh: number; // сколько скролла занимает сцена
  eyebrow: string;
  titleMain: string;
  titleAccent: string;
  body?: string[]; // списки работ
  services?: string[];
  cats?: string[]; // ['CAT-03', 'CAT-07']
  counter?: { from: string; to: string; caption: string }; // счётчик вида «0,00 с → 0,12 с»
  overlay?: Overlay;
  cta?: Cta;
};

export type Act = {
  id: ActId;
  label: string; // строка фазовой перебивки ПЕРЕД актом: «// ФАЗА 02 · ОБЛАДНАННЯ · CAT REGISTRY»
  axis: Axis;
  playback: Playback;
  palette: Palette;
  scenes: Scene[];
};

// Высота фазовой перебивки между актами.
export const PHASE_CARD_VH = 40;

// Ширина растворения на границе сегментов, vh: сегмент набирает opacity на подходе
// к своей стартовой границе и остаётся видимым, пока его не накроет следующий.
export const FADE_VH = 24;

// Метаданные сайта. layout.tsx берёт строки отсюда: тексты живут только в этом файле.
export const SITE_META = {
  title: "SEIR — Стратегічні Енерго-Індустріальні Рішення",
  description:
    "Постачання обладнання, ремонт і модернізація для енергетики та промисловості.",
};

// Градиенты-заглушки по палитрам актов. Останутся фоновой подложкой под видео.
export const PALETTES: Record<Palette, string> = {
  cold: "radial-gradient(120% 90% at 50% 115%, #123055 0%, #081527 45%, #02030A 100%)",
  steel: "linear-gradient(180deg, #0B1119 0%, #232B34 58%, #3A2A12 100%)",
  black: "radial-gradient(90% 70% at 50% 32%, #14181E 0%, #07090C 55%, #000000 100%)",
  dawn: "linear-gradient(180deg, #16273D 0%, #4A3A33 62%, #C97A3C 100%)",
  white: "linear-gradient(180deg, #FFFFFF 0%, #F2F4F7 60%, #DDE3EA 100%)",
};

export const FILM: Act[] = [
  {
    id: "prologue",
    label: "", // перед прологом перебивки нет
    axis: "fall",
    playback: "scrub",
    palette: "cold",
    scenes: [
      {
        id: "p0",
        videoSrc: "/video/scrub_p0.mp4",
        posterSrc: "/poster/scrub_p0.webp",
        duration: 8,
        scrollVh: 100,
        eyebrow: "Стратегічні Енерго-Індустріальні Рішення",
        titleMain: "За кожним вогнем",
        titleAccent: "стоїть обладнання",
        overlay: "cityLights",
        cta: { label: "Подивитись, як ми працюємо", action: "catalog" },
      },
    ],
  },
  {
    id: "solutions",
    label: "// ФАЗА 01 · НАШІ РІШЕННЯ · SERVICE INDEX",
    axis: "fall",
    playback: "scrub",
    palette: "steel",
    scenes: [
      {
        id: "i1",
        videoSrc: "/video/scrub_i1.mp4",
        posterSrc: "/poster/scrub_i1.webp",
        duration: 8,
        scrollVh: 100,
        eyebrow: "01",
        titleMain: "Технічне",
        titleAccent: "обслуговування",
        body: [
          "силові трансформатори",
          "розподільчі пристрої КРУ і КРУН",
          "кабельні системи",
          "турбінне обладнання",
          "допоміжні енергетичні системи",
          "релейний захист",
        ],
        services: [
          "діагностика та випробування",
          "пусконалагоджувальні роботи",
          "технічний аудит",
        ],
        cats: ["CAT-03", "CAT-07"],
      },
      {
        id: "i2",
        videoSrc: "/video/scrub_i2.mp4",
        posterSrc: "/poster/scrub_i2.webp",
        duration: 8,
        scrollVh: 100,
        eyebrow: "02",
        titleMain: "Модернізація",
        titleAccent: "та ремонт",
        body: [
          "капітальний ремонт",
          "реконструкція об'єктів",
          "модернізація систем та вузлів",
          "заміна обладнання",
          "підвищення енергоефективності",
          "оптимізація процесів",
        ],
        // Сильнейший аргумент, рендерится отдельным блоком крупнее (см. docs/film.md, I.2).
        services: ["Відновлення після аварій", "Усунення технічних несправностей"],
        counter: { from: "0,00 с", to: "0,12 с", caption: "час відновлення живлення" },
        cats: ["CAT-03", "CAT-05"],
        cta: { label: "Аварійне відновлення", action: "lead" },
      },
      {
        id: "i3",
        videoSrc: "/video/scrub_i3.mp4",
        posterSrc: "/poster/scrub_i3.webp",
        duration: 8,
        scrollVh: 100,
        eyebrow: "03",
        titleMain: "Постачання",
        titleAccent: "обладнання",
        // Полная номенклатура придёт из content/catalog.ts (docs/build.md, шаг 7):
        // текста девяти категорий в docs пока нет.
        services: ["Імпорт та підбір обладнання", "Логістика та супровід поставок"],
        cats: ["CAT-01", "CAT-02", "CAT-03", "CAT-04"],
      },
    ],
  },
  {
    id: "equipment",
    label: "// ФАЗА 02 · ОБЛАДНАННЯ · CAT REGISTRY",
    axis: "lateral",
    // CLAUDE.md: акт II скраббится (в docs/film.md §4 есть заметка про автоплей — не действует).
    playback: "scrub",
    palette: "black",
    scenes: [
      {
        // Один непрерывный проезд: три ролика по 8 с, сшитые мостами в один файл.
        id: "ii",
        videoSrc: "/video/scrub_ii.mp4",
        posterSrc: "/poster/scrub_ii.webp",
        duration: 24,
        scrollVh: 300,
        eyebrow: "",
        titleMain: "",
        titleAccent: "",
        cats: [
          "CAT-01",
          "CAT-02",
          "CAT-03",
          "CAT-04",
          "CAT-05",
          "CAT-06",
          "CAT-07",
          "CAT-08",
          "CAT-09",
        ],
      },
    ],
  },
  {
    id: "expertise",
    label: "// ФАЗА 03 · ЕКСПЕРТИЗА · OBJECT CLASSES",
    axis: "rise",
    playback: "autoplay",
    palette: "dawn",
    scenes: [
      {
        id: "iii1",
        videoSrc: "/video/auto_iii1.mp4",
        posterSrc: "/poster/auto_iii1.webp",
        duration: 6,
        scrollVh: 90,
        eyebrow: "01",
        titleMain: "Генерація",
        titleAccent: "енергії",
      },
      {
        id: "iii2",
        videoSrc: "/video/auto_iii2.mp4",
        posterSrc: "/poster/auto_iii2.webp",
        duration: 6,
        scrollVh: 90,
        eyebrow: "02",
        titleMain: "Підстанції",
        titleAccent: "та мережі",
      },
      {
        id: "iii3",
        videoSrc: "/video/auto_iii3.mp4",
        posterSrc: "/poster/auto_iii3.webp",
        duration: 6,
        scrollVh: 90,
        eyebrow: "03",
        titleMain: "Промислові",
        titleAccent: "об'єкти",
      },
      {
        id: "iii4",
        videoSrc: "/video/auto_iii4.mp4",
        posterSrc: "/poster/auto_iii4.webp",
        duration: 6,
        scrollVh: 90,
        eyebrow: "04",
        titleMain: "Інфраструктурні",
        titleAccent: "системи",
      },
    ],
  },
  {
    id: "quality",
    label: "// ФАЗА 04 · ЯКІСТЬ · CONTROL PROTOCOL",
    axis: "still",
    playback: "autoplay",
    palette: "white",
    scenes: [
      {
        id: "iv1",
        videoSrc: "/video/auto_iv1.mp4",
        posterSrc: "/poster/auto_iv1.webp",
        duration: 5,
        scrollVh: 80,
        eyebrow: "PHASE 01",
        titleMain: "Вхідний",
        titleAccent: "контроль",
        overlay: "phaseBar",
      },
      {
        id: "iv2",
        videoSrc: "/video/auto_iv2.mp4",
        posterSrc: "/poster/auto_iv2.webp",
        duration: 5,
        scrollVh: 80,
        eyebrow: "PHASE 02",
        titleMain: "Документальний",
        titleAccent: "супровід",
        overlay: "phaseBar",
      },
      {
        id: "iv3",
        videoSrc: "/video/auto_iv3.mp4",
        posterSrc: "/poster/auto_iv3.webp",
        duration: 5,
        scrollVh: 80,
        eyebrow: "PHASE 03",
        titleMain: "Відповідність",
        titleAccent: "стандартам",
        overlay: "phaseBar",
      },
      {
        id: "iv4",
        videoSrc: "/video/auto_iv4.mp4",
        posterSrc: "/poster/auto_iv4.webp",
        duration: 5,
        scrollVh: 80,
        eyebrow: "PHASE 04",
        titleMain: "Технічний",
        titleAccent: "контроль",
        overlay: "phaseBar",
      },
    ],
  },
  {
    id: "epilogue",
    label: "// ФАЗА 05 · ВЗАЄМОДІЯ · SYSTEM LINK",
    axis: "rise",
    playback: "scrub",
    palette: "cold",
    scenes: [
      {
        id: "ep",
        videoSrc: "/video/scrub_ep.mp4",
        posterSrc: "/poster/scrub_ep.webp",
        duration: 8,
        scrollVh: 120,
        eyebrow: "SYSTEM LINK ESTABLISHED",
        titleMain: "Взаємодія",
        titleAccent: "Очікуємо на вхідний запит",
        body: ["Київ, Прорізна 13", "+380 67 209 99 64", "info@seir.com.ua"],
        overlay: "cityLights",
        cta: { label: "Запит консультації", action: "lead" },
      },
    ],
  },
];

// Полная высота фильма: сумма scrollVh всех сцен плюс перебивка перед каждым актом, кроме первого.
export const totalScrollVh = (film: Act[] = FILM): number =>
  film.reduce(
    (sum, act, index) =>
      sum +
      (index > 0 ? PHASE_CARD_VH : 0) +
      act.scenes.reduce((s, scene) => s + scene.scrollVh, 0),
    0,
  );
