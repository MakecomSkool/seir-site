// SEIR — единый конфиг фильма. Сценарий: docs/oneshot.md.
// Один глобальный таймлайн: 21 видеосегмент V01a-V20, скролл скраббит время.
// Контур Украины и огни живут в самом видео (кадр K00b) — кодом не рисуются.
// Темп задаёт столбец vh/с таблицы раздела 6 oneshot.md: duration и scrollVh
// каждого сегмента, высота страницы считается из них автоматически.
// Все тексты, тайминги, цвета и пути к видео правятся только здесь.
// Украинские названия номенклатуры, работ, фаз и экспертизы импортируются
// из content/catalog.ts — единственного источника строк с сайта компании.
// Из английских промптов oneshot.md украинский текст не выводится никогда.

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

export type Palette = "cold" | "steel" | "black" | "dawn" | "white";

export type Cta = { label: string; action: "lead" | "catalog" };

// Видеосегмент таймлайна. Движение живёт в самом видео: никаких transform,
// blur и наплывов на фронте — на границе сегментов жёсткая подмена элемента,
// оба видео в граничный момент показывают один и тот же кадр (цепь start/end).
export type Segment = {
  id: string; // "v01".."v20"
  videoSrc: string;
  // Мобильная ветка (oneshot.md, раздел 9): собственные 9:16 версии через
  // reframe, НЕ кроп. Механика мобилки пока не собрана — поле заложено.
  mobileSrc: string;
  posterSrc: string;
  duration: number; // секунды видео
  scrollVh: number; // сколько скролла занимает сегмент (темп: vh = с × vh/с)
  palette: Palette; // градиент-подложка, пока файла нет
  cats?: string[]; // карточки CAT, проходящие на этом сегменте (V06-V08)
  // Стартовое смещение видео (с): сегмент скраббится от videoFrom до конца.
  // Только для ПЕРВОГО сегмента фильма — обрезка начала не рвёт цепь,
  // потому что перед ним ничего нет. Открытие с эффектного кадра.
  videoFrom?: number;
};

// iOS-страховка (oneshot.md, раздел 9): переключает мобильную версию со
// скраббинга на автоплей сегмента при входе в вьюпорт, если currentTime-
// скраббинг дёргается на реальном устройстве. Проверять на живом iPhone.
export const IOS_AUTOPLAY_FALLBACK = false;

// Мобильная ветка (oneshot.md, раздел 9): скролл «длиннее» на палец —
// таблица темпа умножается на 0.8; списки в плашке свёрнуты до 4 позиций.
export const MOBILE_TEMPO = 0.8;
export const MOBILE_LIST_LIMIT = 3;
export const MOBILE_BREAKPOINT = "(max-width: 819px)";

// Текстовый блок таймлайна: появляется на [fromT, toT] секундах глобального
// времени, только opacity + translateY. kind "phase" — титр фазы поверх
// движения («// ФАЗА 02 · …»), появляется на тихом заполнении проёма.
export type CopyKind = "copy" | "phase";
export type CopyBlock = {
  id: string;
  kind: CopyKind;
  fromT: number;
  toT: number;
  light?: boolean; // светлая часть: тёмный текст
  first?: boolean; // первый блок фильма: h1, видим до гидрации
  label?: string; // kind "phase": моно-строка титра
  eyebrow?: string;
  titleMain?: string;
  titleAccent?: string;
  body?: string[];
  services?: string[];
  counter?: { from: string; to: string; caption: string };
  cta?: Cta;
};

// Разделы фильма на таймлайне — шкала справа, навигация хрома.
export type FilmSectionId =
  | "prologue"
  | "solutions"
  | "equipment"
  | "expertise"
  | "quality"
  | "epilogue";

export type FilmSection = { id: FilmSectionId; title: string; fromT: number };

// Наличие медиафайлов сегмента: сервер проверяет public/video, public/poster
// и public/video/mobile; сегмент без файлов рендерит градиент-заглушку и не
// делает ни одного запроса. Формат один — mp4 (h264 all-intra).
export type SceneMediaAvailability = {
  mp4: boolean;
  poster: boolean;
  mobile: boolean; // 9:16 версия в public/video/mobile (reframe, раздел 9)
};
export type MediaAvailability = Record<string, SceneMediaAvailability>;

// Метаданные сайта. layout.tsx берёт строки отсюда: тексты живут только в этом файле.
export const SITE_META = {
  title: "SEIR — Стратегічні Енерго-Індустріальні Рішення",
  description:
    "Постачання обладнання, ремонт і модернізація для енергетики та промисловості.",
};

// Секции после фильма (docs/build.md, шаг 7)
export type SectionId = "about" | "catalog" | "contact";

export type NavItem = { label: string; target: FilmSectionId | SectionId };

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
  // Пилюля открывает LeadPanel; короткая форма — мобильная шапка
  cta: "Запит консультації",
  ctaShort: "Запит",
  backToTop: "На початок",
  // Кнопка автопросмотра на первом экране
  play: "дивитись фільм",
  // Тумблер звукового слоя (aria)
  soundOn: "Звук увімкнено",
  soundOff: "Звук вимкнено",
  // aria-подпись тега CAT; клик ведёт к ленте каталога
  catalog: "До каталогу обладнання",
  scrollHint: "прокрутіть",
  // Мобильная плашка: раскрытие свёрнутых списков (аккордеон внутри плашки)
  showAll: "Показати всі",
  collapse: "Згорнути",
};

// Контакты — единый источник для финала фильма и секции «Взаємодія»
export const CONTACTS = {
  address: "Київ, Прорізна 13",
  phone: "+380 67 209 99 64",
  email: "info@seir.com.ua",
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

// Градиенты-заглушки по палитрам. Остаются фоновой подложкой под видео.
export const PALETTES: Record<Palette, string> = {
  cold: "radial-gradient(120% 90% at 50% 115%, #123055 0%, #081527 45%, #02030A 100%)",
  steel: "linear-gradient(180deg, #0B1119 0%, #232B34 58%, #3A2A12 100%)",
  black: "radial-gradient(90% 70% at 50% 32%, #14181E 0%, #07090C 55%, #000000 100%)",
  dawn: "linear-gradient(180deg, #16273D 0%, #4A3A33 62%, #C97A3C 100%)",
  white: "linear-gradient(180deg, #FFFFFF 0%, #F2F4F7 60%, #DDE3EA 100%)",
};

// Хелпер: имена файлов по конвенции encode.bat (raw/scrub_*.mp4 → all-intra).
const seg = (
  id: string,
  duration: number,
  scrollVh: number,
  palette: Palette,
  cats?: string[],
  videoFrom?: number,
): Segment => ({
  id,
  videoSrc: `/video/scrub_${id}.mp4`,
  mobileSrc: `/video/mobile/m_scrub_${id}.mp4`,
  posterSrc: `/poster/scrub_${id}.webp`,
  duration,
  scrollVh,
  palette,
  ...(cats ? { cats } : {}),
  ...(videoFrom ? { videoFrom } : {}),
});

// Таблица темпа из oneshot.md, раздел 6: длительность с × vh/с = vh.
// Спидрамп всего фильма живёт в скролле, видео всегда linear.
export const SEGMENTS: Segment[] = [
  // videoFrom 2.0: фильм открывается кадром, где лимб с огнями занимает
  // нижнюю половину и контур входит в кадр — не чёрным космосом
  seg("v01a", 8, 80, "cold", undefined, 2.0), //  0-8  орбита → контур (K00b) 10 vh/с
  // Ключевой момент фильма: спуск к контуру, ему нужен воздух — темп 9
  seg("v01b", 8, 72, "cold"), //  8-16   спуск от контура к пейзажу     9
  seg("v02", 8, 80, "cold"), // 16-24   падение сквозь облако          10
  seg("v03", 8, 112, "steel"), // 24-32  двор → бокс           14
  seg("v04", 8, 112, "steel"), // 32-40  бокс → дождь          14
  seg("v05", 8, 96, "black"), // 40-48  двор → порог ангара    12
  seg("v06", 8, 120, "black", CATALOG.slice(0, 4).map((c) => c.code)), // 48-56
  seg("v07", 8, 120, "black", CATALOG.slice(4, 7).map((c) => c.code)), // 56-64
  seg("v08", 8, 120, "black", CATALOG.slice(7, 9).map((c) => c.code)), // 64-72
  seg("v09", 8, 80, "dawn"), // 72-80  подъём сквозь люк       10
  seg("v10", 8, 96, "dawn"), // 80-88  электростанция          12
  seg("v11", 8, 96, "dawn"), // 88-96  подстанция              12
  seg("v12", 8, 96, "dawn"), // 96-104  завод                   12
  seg("v13", 8, 96, "dawn"), // 104-112 инфраструктура          12
  seg("v14", 6, 48, "white"), // 112-118 белая хмара            8
  seg("v15", 6, 48, "white"), // 118-124 вход в лабораторию     8
  seg("v16", 5, 70, "white"), // 124-129 стол документации     14
  seg("v17", 5, 70, "white"), // 129-134 испытательная зона    14
  seg("v18", 5, 70, "white"), // 134-139 макро муфты           14
  seg("v19", 6, 60, "white"), // 139-145 отъезд к окну         10
  seg("v20", 10, 80, "cold"), // 145-155 финальный подъём       8
];

// Производные таймлайна. Меняются только через SEGMENTS.
export const totalScrollVh = (segments: Segment[] = SEGMENTS): number =>
  segments.reduce((sum, s) => sum + s.scrollVh, 0);

export const totalDuration = (segments: Segment[] = SEGMENTS): number =>
  segments.reduce((sum, s) => sum + s.duration, 0);

// Старты сегментов: время (с) и скролл (vh) от начала фильма.
export type SegmentSpan = Segment & { tStart: number; vhStart: number };
export const segmentSpans = (segments: Segment[] = SEGMENTS): SegmentSpan[] => {
  let t = 0;
  let vh = 0;
  return segments.map((s) => {
    const span = { ...s, tStart: t, vhStart: vh };
    t += s.duration;
    vh += s.scrollVh;
    return span;
  });
};

// Разделы фильма на таймлайне (oneshot.md, раздел 2).
export const FILM_SECTIONS: FilmSection[] = [
  { id: "prologue", title: "Орбіта", fromT: 0 },
  { id: "solutions", title: "Наші рішення", fromT: 24 },
  { id: "equipment", title: "Обладнання", fromT: 40 },
  { id: "expertise", title: "Експертиза", fromT: 72 },
  { id: "quality", title: "Якість", fromT: 112 },
  { id: "epilogue", title: "Взаємодія", fromT: 139 },
];

// Звуковой слой фильма: эмбиенты по разделам таймлайна (переливаются
// на границах), гул трансформатора поверх ангара, вжухи пролётов на
// сменах сегментов с громкостью от скорости скролла. Движок:
// components/soundEngine.ts. Пути и тайминги правятся только здесь.
export type SoundBed = {
  id: string;
  src: string;
  fromT: number;
  toT: number;
  gain: number;
};
export const SOUND = {
  masterGain: 0.55,
  // Секунды таймлайна на переливание слоёв (скат центрируется на границе)
  crossfadeT: 3,
  beds: [
    { id: "orbit", src: "/audio/amb_orbit.mp3", fromT: -3, toT: 24, gain: 0.9 },
    { id: "steel", src: "/audio/amb_steel.mp3", fromT: 24, toT: 40, gain: 0.6 },
    { id: "hangar", src: "/audio/amb_hangar.mp3", fromT: 40, toT: 72, gain: 0.85 },
    { id: "dawn", src: "/audio/amb_dawn.mp3", fromT: 72, toT: 112, gain: 0.75 },
    { id: "bright", src: "/audio/amb_bright.mp3", fromT: 112, toT: 139, gain: 0.65 },
    { id: "orbitEnd", src: "/audio/amb_orbit.mp3", fromT: 139, toT: 158, gain: 0.9 },
  ] as SoundBed[],
  // Конкретика поверх эмбиентов: дождь двора поставки (V04-V05), работа
  // механизмов в мастерских, гул трансформатора в ангаре
  extras: [
    { id: "rain", src: "/audio/amb_rain.mp3", fromT: 25, toT: 41, gain: 0.55 },
    // Техника выезжает: дизель, кран, лебёдка, сигнал заднего хода
    { id: "veh", src: "/audio/amb_vehicles.mp3", fromT: 25, toT: 41, gain: 0.34 },
    { id: "mech", src: "/audio/amb_machines.mp3", fromT: 24, toT: 40, gain: 0.28 },
    { id: "hum", src: "/audio/hum_transformer.mp3", fromT: 43, toT: 70, gain: 0.32 },
  ] as SoundBed[],
  // Музыкальная партитура (Suno, один трек, нарезанный по границам
  // актов): каждый кусок — луп со своим окном таймлайна, кроссфейды
  // движка попадают в смену акта и в скрабе, и в автопросмотре.
  // Украинский вокал трека — часть озвучки (хуки), диктор поверх.
  music: [
    { id: "m1", src: "/audio/music_s1.mp3", fromT: -3, toT: 24, gain: 0.45 },
    { id: "m2", src: "/audio/music_s2.mp3", fromT: 24, toT: 40, gain: 0.45 },
    { id: "m3", src: "/audio/music_s3.mp3", fromT: 40, toT: 72, gain: 0.45 },
    { id: "m4", src: "/audio/music_s4.mp3", fromT: 72, toT: 112, gain: 0.45 },
    { id: "m5", src: "/audio/music_s5.mp3", fromT: 112, toT: 139, gain: 0.45 },
    { id: "m6", src: "/audio/music_s6.mp3", fromT: 139, toT: 158, gain: 0.45 },
  ] as SoundBed[],
  // Вжухи пролётов на сменах сегментов (громкость и питч от скорости)
  whooshes: [
    "/audio/whoosh_a.mp3",
    "/audio/whoosh_b.mp3",
    "/audio/whoosh_c.mp3",
  ] as string[],
  whooshGain: 0.5,
  whooshCooldownMs: 450,
  // Голос: реплика на КАЖДУЮ карточку таймлайна, fromT = появление
  // карточки. Длительность каждой реплики проверена против бюджета
  // (расстояние до следующей / 1.75) — обрезки исключены. Сортировка
  // по fromT обязательна. Тексты — формулировки сайта, диктор v3.
  voice: [
    { id: "vo_prologue", src: "/audio/vo_prologue.mp3", fromT: 0.5 },
    { id: "vo_maintenance", src: "/audio/vo_maintenance.mp3", fromT: 25 },
    { id: "vo_repair", src: "/audio/vo_repair.mp3", fromT: 33 },
    { id: "vo_equipment", src: "/audio/vo_equipment.mp3", fromT: 41 },
    { id: "vo_gen", src: "/audio/vo_gen.mp3", fromT: 81 },
    { id: "vo_grid", src: "/audio/vo_grid.mp3", fromT: 89 },
    { id: "vo_industry", src: "/audio/vo_industry.mp3", fromT: 97 },
    { id: "vo_infra", src: "/audio/vo_infra.mp3", fromT: 105 },
    { id: "vo_q1", src: "/audio/vo_q1.mp3", fromT: 119 },
    { id: "vo_docs", src: "/audio/vo_docs.mp3", fromT: 125 },
    { id: "vo_standards2", src: "/audio/vo_standards2.mp3", fromT: 129.8 },
    { id: "vo_control2", src: "/audio/vo_control2.mp3", fromT: 134.8 },
    { id: "vo_epilogue", src: "/audio/vo_epilogue.mp3", fromT: 147 },
  ] as { id: string; src: string; fromT: number }[],
  // Дакинг фона под голосом
  voiceDuck: 0.4,
};

// Титры фаз идут поверх движения, в моменты тихого заполнения проёма
// (облако, тёмные ворота, шахта люка, белая хмара, поворот к окну).
// Тексты разделов — на медленных сегментах таблицы темпа.
export const COPY: CopyBlock[] = [
  {
    id: "hero",
    kind: "copy",
    // Отрицательный fromT: фейд-ин завершён до нулевой позиции — заголовок
    // «За кожним вогнем…» стоит уже на первом кадре, до всякого скролла
    fromT: -0.5,
    toT: 7.0,
    first: true,
    eyebrow: "Стратегічні Енерго-Індустріальні Рішення",
    titleMain: "За кожним вогнем",
    titleAccent: "стоїть обладнання",
    cta: { label: "Подивитись, як ми працюємо", action: "catalog" },
  },
  {
    id: "phase01",
    kind: "phase",
    fromT: 16.4,
    toT: 19.4,
    label: "// ФАЗА 01 · НАШІ РІШЕННЯ",
  },
  {
    id: "maintenance",
    kind: "copy",
    fromT: 24.8,
    toT: 31.2,
    eyebrow: "01",
    titleMain: "Технічне",
    titleAccent: "обслуговування",
    body: MAINTENANCE_ITEMS,
    services: MAINTENANCE_WORKS,
  },
  {
    id: "repair",
    kind: "copy",
    fromT: 32.8,
    toT: 39.2,
    eyebrow: "02",
    titleMain: "Модернізація",
    titleAccent: "та ремонт",
    body: REPAIR_ITEMS,
    services: REPAIR_EMERGENCY,
    counter: { from: "0,00 с", to: "0,12 с", caption: "час відновлення живлення" },
    cta: { label: "Аварійне відновлення", action: "lead" },
  },
  {
    id: "supply",
    kind: "copy",
    fromT: 40.6,
    toT: 45.6,
    eyebrow: "03",
    titleMain: "Постачання",
    titleAccent: "обладнання",
    body: SUPPLY_ITEMS,
    services: SUPPLY_EXTRA,
  },
  {
    id: "phase02",
    kind: "phase",
    fromT: 46.2,
    toT: 49.4,
    label: "// ФАЗА 02 · ОБЛАДНАННЯ",
  },
  // 40-64: проезд по ангару — тексты рисует карточный слой CAT (CatCards)
  {
    id: "phase03",
    kind: "phase",
    fromT: 72.4,
    toT: 75.8,
    label: "// ФАЗА 03 · ЕКСПЕРТИЗА",
  },
  {
    id: "exp1",
    kind: "copy",
    fromT: 80.8,
    toT: 87.2,
    eyebrow: EXPERTISE[0].num,
    titleMain: "Генерація",
    titleAccent: "енергії",
    body: EXPERTISE[0].points,
  },
  {
    id: "exp2",
    kind: "copy",
    fromT: 88.8,
    toT: 95.2,
    eyebrow: EXPERTISE[1].num,
    titleMain: "Підстанції",
    titleAccent: "та мережі",
    body: EXPERTISE[1].points,
  },
  {
    id: "exp3",
    kind: "copy",
    fromT: 96.8,
    toT: 103.2,
    eyebrow: EXPERTISE[2].num,
    titleMain: "Промислові",
    titleAccent: "об’єкти",
    body: EXPERTISE[2].points,
  },
  {
    id: "exp4",
    kind: "copy",
    fromT: 104.8,
    toT: 111.2,
    eyebrow: EXPERTISE[3].num,
    titleMain: "Інфраструктурні",
    titleAccent: "системи",
    body: EXPERTISE[3].points,
  },
  {
    id: "phase04",
    kind: "phase",
    // По замеру V14: белое заполняет кадр с ~116.5 (яркость 164→208),
    // титр ложится на белое и гаснет, когда из дымки проступает лаборатория
    fromT: 116.3,
    toT: 119.2,
    light: true,
    label: "// ФАЗА 04 · ЯКІСТЬ",
  },
  // Названия фаз — с сайта компании (PHASES), а не из oneshot.md
  {
    id: "q1",
    kind: "copy",
    fromT: 118.8,
    toT: 123.4,
    light: true,
    eyebrow: PHASES[0].code,
    titleMain: "Контроль",
    titleAccent: "якості",
    body: PHASES[0].points,
  },
  {
    id: "q2",
    kind: "copy",
    fromT: 124.6,
    toT: 128.5,
    light: true,
    eyebrow: PHASES[1].code,
    titleMain: "Документальний",
    titleAccent: "супровід",
    body: PHASES[1].points,
  },
  {
    id: "q3",
    kind: "copy",
    fromT: 129.6,
    toT: 133.5,
    light: true,
    eyebrow: PHASES[2].code,
    titleMain: "Відповідність",
    titleAccent: "стандартам",
    body: PHASES[2].points,
  },
  {
    id: "q4",
    kind: "copy",
    fromT: 134.6,
    toT: 138.5,
    light: true,
    eyebrow: PHASES[3].code,
    titleMain: "Технічний",
    titleAccent: "контроль",
    body: PHASES[3].points,
  },
  {
    id: "phase05",
    kind: "phase",
    fromT: 139.6,
    toT: 142.8,
    label: "// ФАЗА 05 · ВЗАЄМОДІЯ",
  },
  {
    id: "contact",
    kind: "copy",
    // toT за пределом фильма: контакты остаются видимыми на финальном кадре,
    // пока sticky-сцена не уедет под секции
    fromT: 146.5,
    toT: 999,
    titleMain: "Взаємодія",
    titleAccent: CONTACTS.statusLine,
    body: [CONTACTS.address, CONTACTS.phone, CONTACTS.email],
    cta: { label: "Запит консультації", action: "lead" },
  },
];

// Тайминги оверлеев и хрома на глобальном таймлайне.
export const TIMELINE = {
  // Шкала PHASE 01..04: лаборатория, V15-V18.
  phaseBar: { fromT: 118, toT: 139 },
  // Инверсия хрома в светлой части: с белого заполнения V14 (замер 116.5)
  // до поворота к тёмному окну в V19.
  chromeLight: { fromT: 116.5, toT: 140.5 },
};

// Высота скролл-спейсера: весь таймлайн плюс один вьюпорт покоя на финальном
// кадре. Скраббируемая дистанция = высота спейсера минус вьюпорт.
export const stageHeightVh = (segments: Segment[] = SEGMENTS): number =>
  totalScrollVh(segments) + 100;
