// SEIR — единый конфиг фильма. Сценарий: docs/film.md.
// Все тексты, тайминги, цвета и пути к видео правятся только здесь.
// Украинские названия номенклатуры, работ, фаз и экспертизы импортируются
// из content/catalog.ts — единственного источника строк с сайта компании.
// Из английских промптов film.md украинский текст не выводится никогда.

import {
  CATALOG,
  EXPERTISE,
  MAINTENANCE_ITEMS,
  MAINTENANCE_WORKS,
  PHASES,
  REPAIR_EMERGENCY,
  REPAIR_ITEMS,
  SUPPLY_EXTRA,
  SUPPLY_ITEMS,
} from "@/content/catalog";

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
export type Overlay =
  | "cityLights"
  | "flow"
  | "leds"
  | "phaseBar"
  | "ukraineMap"
  | null;

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
  // Окно скраббинга в единицах дельты d: видео проигрывается от w0 до w1.
  // По умолчанию [-0.5, 0.5] — пик сцены приходится на середину ролика.
  scrubWindow?: [number, number];
  // Окно удержания оси: пока d внутри окна, сцена стоит в покое (transform и
  // opacity в нуле), осевые формулы применяются к выходу за окно. По умолчанию
  // [0, 0] — обычное поведение. Нужен длинным сценам вроде проезда акта II.
  axisHold?: [number, number];
  // Огни городов: ignite — загораются по скроллу (пролог),
  // lit — уже горят и не гаснут (эпилог).
  lightsMode?: "ignite" | "lit";
  // Траектории проводов для FlowLayer, координаты 1600x900 по кадру.
  // Подогнать по финальным кадрам после генерации видео.
  flowPaths?: string[];
  overlay?: Overlay;
  cta?: Cta;
};

export type Act = {
  id: ActId;
  title: string; // человекочитаемое название акта: шкала актов, aria
  label: string; // строка фазовой перебивки ПЕРЕД актом: «// ФАЗА 02 · ОБЛАДНАННЯ · CAT REGISTRY»
  axis: Axis;
  playback: Playback;
  palette: Palette;
  scenes: Scene[];
};

// Высота фазовой перебивки между актами.
export const PHASE_CARD_VH = 40;

// Наличие медиафайлов сцены: сервер проверяет public/video и public/poster,
// сцена без файлов рендерит градиент-заглушку и не делает ни одного запроса.
export type SceneMediaAvailability = { mp4: boolean; webm: boolean; poster: boolean };
export type MediaAvailability = Record<string, SceneMediaAvailability>;

// Метаданные сайта. layout.tsx берёт строки отсюда: тексты живут только в этом файле.
export const SITE_META = {
  title: "SEIR — Стратегічні Енерго-Індустріальні Рішення",
  description:
    "Постачання обладнання, ремонт і модернізація для енергетики та промисловості.",
};

// Секции после фильма (docs/build.md, шаг 7)
export type SectionId = "about" | "catalog" | "contact";

export type NavItem = { label: string; target: ActId | SectionId };

// Хром: навигация, статусные строки. Тексты живут только здесь.
export const CHROME = {
  logo: "SEIR",
  nav: [
    { label: "Про компанію", target: "about" },
    { label: "Рішення", target: "solutions" },
    { label: "Обладнання", target: "equipment" },
    { label: "Експертиза", target: "expertise" },
    { label: "Якість", target: "quality" },
  ] satisfies NavItem[],
  // Пилюля открывает LeadPanel
  cta: "Запит консультації",
  // aria-подпись тега CAT; клик ведёт к ленте каталога
  catalog: "До каталогу обладнання",
  status: "Система активна // ISO 9001 compliant",
  scrollHint: "прокрутіть",
};

// Контакты — единый источник для сцены эпилога и секции «Взаємодія»
export const CONTACTS = {
  address: "Київ, Прорізна 13",
  phone: "+380 67 209 99 64",
  email: "info@seir.com.ua",
  status: "SYSTEM LINK ESTABLISHED",
  statusLine: "Очікуємо на вхідний запит",
};

// Секции после фильма. Текст «Про компанію» — дословно с сайта компании.
// Второй счётчик сайта «100% Гарантія якості» сознательно не переносим:
// цифра непроверяемая, остаётся один счётчик.
export const SECTIONS = {
  about: {
    id: "about" as SectionId,
    title: "Комплексні рішення для енергетики та промисловості",
    text:
      "Компанія Стратегічні Енерго-Індустріальні Рішення реалізує комплексні " +
      "рішення для об’єктів зі складними технічними вимогами, поєднуючи " +
      "досвід, технології та системний підхід. Забезпечуємо постачання " +
      "обладнання, виконання ремонтних робіт та модернізацію в енергетиці та " +
      "промисловості. Наша діяльність спрямована на стабільну, безпечну та " +
      "безперебійну роботу об’єктів, де надійність має вирішальне значення.",
    counter: { value: "15+", caption: "Років досвіду" },
  },
  catalog: {
    id: "catalog" as SectionId,
    title: "Обладнання",
  },
  contact: {
    id: "contact" as SectionId,
    title: "Взаємодія",
  },
};

// Форма заявки (LeadPanel). Валидация по blur, ошибка говорит, что делать.
export const LEAD = {
  title: "Запит консультації",
  fields: {
    object: {
      label: "Тип об’єкта",
      placeholder: "Оберіть тип об’єкта",
      options: [
        "Електростанція",
        "Підстанція та мережі",
        "Промислове підприємство",
        "Інфраструктурний об’єкт",
        "Інше",
      ],
      error: "Оберіть тип об’єкта зі списку — запит потрапить до профільного інженера",
    },
    task: {
      label: "Задача",
      placeholder: "Коротко опишіть задачу: обладнання, ремонт, аварія…",
      error: "Опишіть задачу хоча б кількома словами — це прискорить відповідь",
    },
    phone: {
      label: "Телефон",
      placeholder: "+380 67 000 00 00",
      error: "Вкажіть номер у форматі +380… — ми передзвонимо",
    },
  },
  submit: "Надіслати запит",
  note: "Запит сформує лист на info@seir.com.ua",
  sent: "Лист сформовано у вашій поштовій програмі — натисніть у ній «Надіслати»",
  close: "Закрити",
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
    title: "Орбіта",
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
        // Фильм открывается первым кадром; сцена непрозрачна весь пролёт
        // (axisHold) — зум к карте и спуск в конце ролика играют на виду,
        // а не на тающем слое. Ролик доигрывает под растущей перебивкой.
        scrubWindow: [0, 0.9],
        axisHold: [0, 1],
        eyebrow: "Стратегічні Енерго-Індустріальні Рішення",
        titleMain: "За кожним вогнем",
        titleAccent: "стоїть обладнання",
        // Точный контур Украины с огнями городов рисует фронт: генеративное
        // видео не содержит узнаваемой географии и остаётся атмосферным фоном
        overlay: "ukraineMap",
        cta: { label: "Подивитись, як ми працюємо", action: "catalog" },
      },
    ],
  },
  {
    id: "solutions",
    title: "Наші рішення",
    label: "// ФАЗА 01 · НАШІ РІШЕННЯ · SERVICE INDEX",
    axis: "fall",
    playback: "scrub",
    palette: "steel",
    scenes: [
      // Сцены цепи: окно [0, 1] — видео играет ровно по своему пролёту, кадр
      // шва приходится точно на границу сегментов. axisHold [0, 1] держит
      // сцену непрозрачной весь пролёт: движение делает камера в самом видео,
      // переходы растворяются в совпадающих кадрах швов.
      {
        id: "i1",
        videoSrc: "/video/scrub_i1.mp4",
        posterSrc: "/poster/scrub_i1.webp",
        duration: 8,
        scrollVh: 100,
        scrubWindow: [0, 1],
        axisHold: [0, 1],
        eyebrow: "01",
        titleMain: "Технічне",
        titleAccent: "обслуговування",
        body: MAINTENANCE_ITEMS,
        services: MAINTENANCE_WORKS,
        cats: ["CAT-03", "CAT-07"],
        // overlay "flow" вернётся на шаге 5: траектория линии тока ляжет
        // по проводам реального кадра
      },
      {
        id: "i2",
        videoSrc: "/video/scrub_i2.mp4",
        posterSrc: "/poster/scrub_i2.webp",
        duration: 8,
        scrollVh: 100,
        scrubWindow: [0, 1],
        axisHold: [0, 1],
        eyebrow: "02",
        titleMain: "Модернізація",
        titleAccent: "та ремонт",
        body: REPAIR_ITEMS,
        // Сильнейший аргумент, рендерится отдельным блоком крупнее (см. docs/film.md, I.2).
        services: REPAIR_EMERGENCY,
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
        scrubWindow: [0, 1],
        axisHold: [0, 1],
        eyebrow: "03",
        titleMain: "Постачання",
        titleAccent: "обладнання",
        body: SUPPLY_ITEMS,
        services: SUPPLY_EXTRA,
        cats: ["CAT-01", "CAT-02", "CAT-03", "CAT-04"],
      },
    ],
  },
  {
    id: "equipment",
    title: "Обладнання",
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
        // Ровный проезд: время ролика линейно по всем 300vh собственного хода
        // сцены, от открытия из перебивки до прихода следующей. Кадр при этом
        // стоит на месте (axisHold) — вбок едет камера в самом видео, а въезд
        // и выезд по оси lateral происходят через соседние перебивки.
        scrubWindow: [0, 1],
        axisHold: [0, 1],
        eyebrow: "",
        titleMain: "",
        titleAccent: "",
        cats: CATALOG.map((item) => item.code),
      },
    ],
  },
  {
    id: "expertise",
    title: "Експертиза",
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
        eyebrow: EXPERTISE[0].num,
        titleMain: "Генерація",
        titleAccent: "енергії",
        body: EXPERTISE[0].points,
      },
      {
        id: "iii2",
        videoSrc: "/video/auto_iii2.mp4",
        posterSrc: "/poster/auto_iii2.webp",
        duration: 6,
        scrollVh: 90,
        eyebrow: EXPERTISE[1].num,
        titleMain: "Підстанції",
        titleAccent: "та мережі",
        body: EXPERTISE[1].points,
        // overlay "flow" вернётся на шаге 5: линия тока пройдёт по проводам
        // ЛЭП реального кадра
      },
      {
        id: "iii3",
        videoSrc: "/video/auto_iii3.mp4",
        posterSrc: "/poster/auto_iii3.webp",
        duration: 6,
        scrollVh: 90,
        eyebrow: EXPERTISE[2].num,
        titleMain: "Промислові",
        titleAccent: "об’єкти",
        body: EXPERTISE[2].points,
      },
      {
        id: "iii4",
        videoSrc: "/video/auto_iii4.mp4",
        posterSrc: "/poster/auto_iii4.webp",
        duration: 6,
        scrollVh: 90,
        eyebrow: EXPERTISE[3].num,
        titleMain: "Інфраструктурні",
        titleAccent: "системи",
        body: EXPERTISE[3].points,
      },
    ],
  },
  {
    id: "quality",
    title: "Якість",
    label: "// ФАЗА 04 · ЯКІСТЬ · CONTROL PROTOCOL",
    axis: "still",
    playback: "autoplay",
    palette: "white",
    scenes: [
      // Названия фаз — с сайта компании (PHASES), а не из film.md:
      // IV.1 у них «Контроль якості», а не «Вхідний контроль»
      {
        id: "iv1",
        videoSrc: "/video/auto_iv1.mp4",
        posterSrc: "/poster/auto_iv1.webp",
        duration: 5,
        scrollVh: 80,
        eyebrow: PHASES[0].code,
        titleMain: "Контроль",
        titleAccent: "якості",
        body: PHASES[0].points,
        overlay: "phaseBar",
      },
      {
        id: "iv2",
        videoSrc: "/video/auto_iv2.mp4",
        posterSrc: "/poster/auto_iv2.webp",
        duration: 5,
        scrollVh: 80,
        eyebrow: PHASES[1].code,
        titleMain: "Документальний",
        titleAccent: "супровід",
        body: PHASES[1].points,
        overlay: "phaseBar",
      },
      {
        id: "iv3",
        videoSrc: "/video/auto_iv3.mp4",
        posterSrc: "/poster/auto_iv3.webp",
        duration: 5,
        scrollVh: 80,
        eyebrow: PHASES[2].code,
        titleMain: "Відповідність",
        titleAccent: "стандартам",
        body: PHASES[2].points,
        overlay: "phaseBar",
      },
      {
        id: "iv4",
        videoSrc: "/video/auto_iv4.mp4",
        posterSrc: "/poster/auto_iv4.webp",
        duration: 5,
        scrollVh: 80,
        eyebrow: PHASES[3].code,
        titleMain: "Технічний",
        titleAccent: "контроль",
        body: PHASES[3].points,
        overlay: "phaseBar",
      },
    ],
  },
  {
    id: "epilogue",
    title: "Взаємодія",
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
        // Взлёт играет, пока растворяется перебивка «ФАЗА 05» (d от -0.5 до 0);
        // на дне фильма — финальный кадр, орбита в огнях, дальше секции.
        scrubWindow: [-0.5, 0],
        eyebrow: CONTACTS.status,
        titleMain: "Взаємодія",
        titleAccent: CONTACTS.statusLine,
        body: [CONTACTS.address, CONTACTS.phone, CONTACTS.email],
        // Кольцо фильма: тот же контур, но огни горят сразу и ярче
        overlay: "ukraineMap",
        lightsMode: "lit",
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

// Высота скролл-спейсера: фильм должен остановиться, когда последняя сцена встаёт
// в пик (d = 0), поэтому её собственный выездной ход в высоту не входит — вместо
// него один вьюпорт. Когда после фильма появятся обычные секции, эпилог сам
// уедет вверх вместе со sticky-сценой.
export const stageHeightVh = (film: Act[] = FILM): number => {
  const lastAct = film[film.length - 1];
  const lastScene = lastAct?.scenes[lastAct.scenes.length - 1];
  return totalScrollVh(film) - (lastScene?.scrollVh ?? 0) + 100;
};
