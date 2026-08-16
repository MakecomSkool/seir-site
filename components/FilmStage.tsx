"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Lenis from "lenis";
import CatCards from "@/components/CatCards";
import CatTag from "@/components/CatTag";
import Chrome, { type ChromeState } from "@/components/Chrome";
import PhaseBar from "@/components/PhaseBar";
import Segment from "@/components/Segment";
import TimedCopy, { CopyBlockView } from "@/components/TimedCopy";
import { FilmSound } from "@/components/soundEngine";
import { openLeadPanel, subscribeLeadPanel } from "@/components/leadBus";
import type {
  CatTagNode,
  OverlayNode,
  PhaseBarNode,
} from "@/components/overlayBridge";
import { PHASES } from "@/content/catalog";
import {
  CHROME,
  COPY,
  FILM_SECTIONS,
  IOS_AUTOPLAY_FALLBACK,
  MOBILE_BREAKPOINT,
  MOBILE_TEMPO,
  PALETTES,
  SECTIONS,
  SEGMENTS,
  TIMELINE,
  segmentSpans,
  stageHeightVh,
  totalDuration,
  totalScrollVh,
  type Cta,
  type FilmSectionId,
  type MediaAvailability,
  type SectionId,
  type Segment as SegmentConfig,
} from "@/content/film";

// Механика oneshot.md, раздел 6: один глобальный таймлайн, скролл скраббит
// время. Темп неравномерный — задан столбцом vh/с в конфиге сегментов
// (спидрамп фильма живёт в скролле, видео всегда linear). На границе
// сегментов жёсткая подмена элемента, БЕЗ наплывов и blur: оба видео в
// граничный момент показывают один и тот же кадр (цепь start/end кадров).

// Скролл дальше этого порога прячет подсказку «прокрутіть».
const SCROLL_HINT_PX = 60;

// Предзагрузка: текущий сегмент + два вперёд + один назад (oneshot.md 6.5).
// На десктопе окно шире (3 вперёд / 2 назад): быстрый скролл в обе стороны
// не должен влетать в непрогретый сегмент. На мобиле окно узкое — лимит
// одновременных декодеров у iOS.
const PRELOAD_BACK_DESKTOP = 2;
const PRELOAD_AHEAD_DESKTOP = 3;
const PRELOAD_BACK_MOBILE = 1;
const PRELOAD_AHEAD_MOBILE = 2;

// Сик квантуется к сетке кадров (24 fps футаж), новый сик не выдаётся,
// пока идёт предыдущий (очереди сиков душат WebKit).
const FRAME_STEP = 1 / 24;
// Стабильная плавность на любой скорости: чем быстрее скролл, тем крупнее
// шаг квантизации сика — меньше декодов на кадр, главный поток не давится.
// Пороги в px/s сглаженной скорости; на успокоении шаг возвращается к кадру.
// У телефона пороги ниже (вьюпорт меньше, декодер слабее) и есть третья
// ступень: на экстремальном свайпе видео обновляется 4 раза в секунду —
// читается как ускоренная перемотка, а не борьба с декодером.
const FAST_SCROLL_DESKTOP = 1500;
const VERY_FAST_SCROLL_DESKTOP = 3200;
const FAST_SCROLL_MOBILE = 500;
const VERY_FAST_SCROLL_MOBILE = 1600;
const EXTREME_SCROLL_MOBILE = 3200;
// Мобильный скраббинг: не чаще одного сика в 40 мс (~25 кадр/с) — глазом
// неотличимо от покадрового, а декодов 1080-кадров вдвое меньше
const MOBILE_SEEK_INTERVAL_MS = 40;

// Тексты: появление/уход на [fromT, toT] — только opacity + translateY.
const COPY_FADE_S = 0.5;
const COPY_SHIFT_PX = 16;

// Автопросмотр кнопкой Play: быстрее реального темпа таймлайна — полные
// 155 секунд ощущаются вялыми, 1.75× держит энергию, движение в кадре
// остаётся читаемым (лёгкая ускоренная перемотка)
const AUTOPLAY_SPEED = 1.75;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export default function FilmStage({ media }: { media?: MediaAvailability }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const chromeSetterRef = useRef<((state: ChromeState) => void) | null>(null);
  const uiRef = useRef<ChromeState>({
    section: 0,
    light: false,
    scrolled: false,
    progress: 0,
  });
  const [reducedMotion, setReducedMotion] = useState(false);
  // Мобильная ветка (oneshot.md, раздел 9): темп ×0.8 — скролл «длиннее»
  // на палец; тексты в плашке, шкала полоской, свои 9:16 файлы.
  const [mobileView, setMobileView] = useState(false);
  // Кнопка Play на первом экране: запускает плавный автопросмотр всего
  // фильма в реальном темпе; любой жест пользователя отменяет и прячет её
  const [playState, setPlayState] = useState<"idle" | "playing" | "gone">(
    "idle",
  );
  const playStateRef = useRef(playState);
  playStateRef.current = playState;
  const autoplayRef = useRef<{ start: () => void } | null>(null);
  // Звуковой слой: контекст создаётся после первого жеста, тумблер
  // в левой колонке хрома
  const soundRef = useRef<FilmSound | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const soundOnRef = useRef(soundOn);
  soundOnRef.current = soundOn;

  const activeSegments: SegmentConfig[] = useMemo(
    () =>
      mobileView
        ? SEGMENTS.map((s) => ({
            ...s,
            scrollVh: Math.round(s.scrollVh * MOBILE_TEMPO),
          }))
        : SEGMENTS,
    [mobileView],
  );
  const spans = useMemo(() => segmentSpans(activeSegments), [activeSegments]);
  const totalVh = totalScrollVh(activeSegments);
  const totalT = totalDuration(activeSegments);
  const heightVh = stageHeightVh(activeSegments);

  const registerChrome = (setter: ((state: ChromeState) => void) | null) => {
    chromeSetterRef.current = setter;
    // Chrome мог ремоунтнуться (переключение reduced-motion) — сразу отдаём
    // актуальное состояние, иначе диф-гард пропустит первый пуш.
    setter?.(uiRef.current);
  };

  // Обратный маппинг: время таймлайна → vh скролла (кусочно-линейный).
  const vhAtT = (t: number): number => {
    for (const span of spans) {
      if (t < span.tStart + span.duration || span === spans[spans.length - 1]) {
        return (
          span.vhStart +
          clamp01((t - span.tStart) / span.duration) * span.scrollVh
        );
      }
    }
    return totalVh;
  };

  const navigate = (target: FilmSectionId | SectionId) => {
    const filmSection = FILM_SECTIONS.find((s) => s.id === target);
    // Секции после фильма — обычные якоря в потоке документа
    if (!filmSection) {
      const el = document.getElementById(target);
      if (!el) return;
      const lenis = lenisRef.current;
      if (!reducedMotion && lenis) lenis.scrollTo(el);
      else
        el.scrollIntoView({
          behavior: reducedMotion ? "auto" : "smooth",
          block: "start",
        });
      return;
    }
    if (reducedMotion) {
      document.getElementById(target)?.scrollIntoView({ block: "start" });
      return;
    }
    const wrap = wrapRef.current;
    const stage = stageRef.current;
    if (!wrap || !stage) return;
    const vhUnit = (wrap.offsetHeight - stage.offsetHeight) / totalVh;
    const top = vhAtT(filmSection.fromT) * vhUnit;
    const lenis = lenisRef.current;
    if (lenis) lenis.scrollTo(top);
    else window.scrollTo({ top, behavior: "smooth" });
  };

  // CTA: lead — открыть форму заявки, catalog — к ленте каталога
  const onCta = (cta: Cta) => {
    if (cta.action === "lead") openLeadPanel();
    else navigate(SECTIONS.catalog.id);
  };

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const query = window.matchMedia(MOBILE_BREAKPOINT);
    const sync = () => setMobileView(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const wrap = wrapRef.current;
    const stage = stageRef.current;
    if (!wrap || !stage) return;

    const segments = Array.from(
      stage.querySelectorAll<HTMLElement>("[data-seg]"),
    ).map((el, index) => ({
      el,
      video: el.querySelector<HTMLVideoElement>("video"),
      span: spans[index],
      visible: index === 0,
      mediaActive: false,
      pendingTime: null as number | null,
      // Время последнего РЕАЛЬНО отрисованного кадра (rVFC): readyState и
      // currentTime врут для скрытых слоёв — декодер готов, но композитор
      // ещё не презентовал кадр, после свапа мелькает устаревшая картинка
      paintedTime: -1,
      rvfcId: 0,
    }));
    const copyEls = Array.from(
      document.querySelectorAll<HTMLElement>("[data-copy-block]"),
    ).map((el) => ({
      el,
      fromT: Number(el.dataset.fromT),
      toT: Number(el.dataset.toT),
      lastO: -1,
    }));
    const overlays = Array.from(
      stage.querySelectorAll<HTMLElement>("[data-film-overlay]"),
    ) as OverlayNode[];
    const phaseBarNode = document.querySelector<PhaseBarNode>("[data-phase-bar]");
    const catTagNode = document.querySelector<CatTagNode>("[data-cat-tag]");
    const segCats = spans.map((span) => (span.cats?.length ? span.cats : null));

    // Сигнал пре-гидрационному скрипту снять свой одноразовый scroll-слушатель.
    wrap.setAttribute("data-film-live", "1");

    // Звук: контекст можно создать только внутри жеста пользователя.
    // Одноразовые слушатели снимаются после первой разблокировки.
    const sound = new FilmSound();
    soundRef.current = sound;
    sound.setEnabled(soundOnRef.current);
    const gestureEvents = ["pointerdown", "touchstart", "keydown", "wheel"] as const;
    const onFirstGesture = () => {
      sound.unlock();
      gestureEvents.forEach((ev) => window.removeEventListener(ev, onFirstGesture));
    };
    gestureEvents.forEach((ev) =>
      window.addEventListener(ev, onFirstGesture, { passive: true }),
    );

    // px в одном vh скраббируемой дистанции: спейсер минус вьюпорт (последний
    // вьюпорт — покой на финальном кадре). Меряем по DOM, не по innerHeight,
    // чтобы не расходиться с CSS при сворачивании адресной строки на мобильных.
    let vhUnit = (wrap.offsetHeight - stage.offsetHeight) / totalVh;
    const onResize = () => {
      vhUnit = (wrap.offsetHeight - stage.offsetHeight) / totalVh;
    };
    window.addEventListener("resize", onResize);

    let lastPosVh = -1;
    // Отложенная подмена: реально видимый сегмент может отставать от
    // активного, пока целевой кадр не декодирован — иначе на быстром
    // скролле мелькают запаркованные кадры и постеры («вспышки»).
    // Стартуем с сегмента, который УЖЕ видим в DOM: при перезагрузке в
    // середине фильма его показал пре-гидрационный скрипт, и прогрев
    // не должен гасить единственный отрисованный слой до opacity 0.01.
    let shownIdx = segments.findIndex(
      (seg) =>
        seg.el.style.visibility === "visible" && seg.el.style.zIndex === "2",
    );
    if (shownIdx < 0)
      shownIdx = segments.findIndex(
        (seg) => seg.el.style.visibility === "visible",
      );
    if (shownIdx < 0) shownIdx = 0;
    // Нормализация слоёв: ремоунт эффекта (смена breakpoint) мог оставить
    // «сироту» прогрева на opacity 0.01 / z-index 2 — приводим все слои
    // к единственному видимому shownIdx
    segments.forEach((seg, i) => {
      seg.visible = i === shownIdx;
      seg.el.style.zIndex = "";
      seg.el.style.visibility = i === shownIdx ? "visible" : "hidden";
      seg.el.style.opacity = i === shownIdx ? "1" : "0";
    });
    let switchWaitAt = 0;
    let pendingSwitch = false;
    // Прогреваемый целевой сегмент: на время ожидания подмены держится на
    // почти нулевой непрозрачности — браузер обязан презентовать его кадры
    let warmIdx = -1;
    const hideTimers = new Map<number, number>();
    let lastCatsAt = -1;
    // Видео догрузилось при неподвижном скролле — ранний выход applyScroll
    // оставил бы его на нулевом кадре; сбрасываем кэш позиции.
    const invalidate = () => {
      lastPosVh = -1;
    };
    // Отложенный сик: пока браузер обрабатывает предыдущий, цель копится
    // в pendingTime и доотправляется по событию seeked.
    const flushPending = (seg: (typeof segments)[number]) => () => {
      const video = seg.video;
      if (!video || video.seeking || seg.pendingTime === null) return;
      const target = seg.pendingTime;
      seg.pendingTime = null;
      if (Math.abs(video.currentTime - target) > FRAME_STEP / 2) {
        video.currentTime = target;
      }
    };
    const seekedHandlers = segments.map(flushPending);
    segments.forEach((seg, index) => {
      seg.video?.addEventListener("loadeddata", invalidate);
      seg.video?.addEventListener("loadedmetadata", invalidate);
      seg.video?.addEventListener("seeked", seekedHandlers[index]);
    });

    // Подтверждение презентации кадра: rVFC срабатывает, когда кадр реально
    // ушёл в композицию — единственный честный сигнал для решения о подмене
    const hasRVFC =
      typeof HTMLVideoElement !== "undefined" &&
      "requestVideoFrameCallback" in HTMLVideoElement.prototype;
    if (hasRVFC) {
      segments.forEach((seg) => {
        const video = seg.video;
        if (!video) return;
        const onFrame = (
          _now: number,
          meta: VideoFrameCallbackMetadata,
        ) => {
          seg.paintedTime = meta.mediaTime;
          seg.rvfcId = video.requestVideoFrameCallback(onFrame);
        };
        seg.rvfcId = video.requestVideoFrameCallback(onFrame);
      });
    }

    // Квантованный сик с гейтом занятости. step — шаг квантизации: активный
    // сегмент на быстром скролле сикается крупнее (см. applyScroll),
    // парковка соседей всегда покадровая.
    const seekTo = (
      seg: (typeof segments)[number],
      rawTime: number,
      step: number = FRAME_STEP,
    ) => {
      const video = seg.video;
      if (!video || video.readyState < 1) return;
      let time = Math.round(rawTime / step) * step;
      if (Number.isFinite(video.duration)) {
        time = Math.min(time, Math.max(0, video.duration - FRAME_STEP));
      }
      time = Math.max(0, time);
      if (Math.abs(video.currentTime - time) > step / 2) {
        if (video.seeking) seg.pendingTime = time;
        else {
          seg.pendingTime = null;
          video.currentTime = time;
        }
      } else {
        // Цель уже достигнута (или сик к ней в полёте) — устаревшая
        // отложенная цель не должна досылаться по seeked
        seg.pendingTime = null;
      }
    };

    let lastT = 0;
    let lastActiveStep = FRAME_STEP;
    let lastSeekStamp = 0;

    const applyScroll = () => {
      if (!vhUnit) return;
      const posVh = Math.max(0, Math.min(totalVh, window.scrollY / vhUnit));
      if (posVh === lastPosVh) return;
      lastPosVh = posVh;

      // Скролл → время: кусочно-линейно по таблице темпа
      let active = segments.length - 1;
      let t = totalT;
      for (let i = 0; i < segments.length; i++) {
        const span = segments[i].span;
        if (posVh < span.vhStart + span.scrollVh) {
          active = i;
          t = span.tStart + ((posVh - span.vhStart) / span.scrollVh) * span.duration;
          break;
        }
      }
      lastT = t;

      // Шаг сика по скорости: на быстром скролле квантуем крупнее —
      // движение в кадре и так огромное, а декодов на кадр меньше
      const speed = Math.abs(smoothVelocity);
      const fastT = mobileView ? FAST_SCROLL_MOBILE : FAST_SCROLL_DESKTOP;
      const veryT = mobileView ? VERY_FAST_SCROLL_MOBILE : VERY_FAST_SCROLL_DESKTOP;
      const activeStep =
        mobileView && speed > EXTREME_SCROLL_MOBILE
          ? FRAME_STEP * 6
          : speed > veryT
            ? FRAME_STEP * 3
            : speed > fastT
              ? FRAME_STEP * 2
              : FRAME_STEP;
      lastActiveStep = activeStep;
      const preloadBack = mobileView ? PRELOAD_BACK_MOBILE : PRELOAD_BACK_DESKTOP;
      const preloadAhead = mobileView ? PRELOAD_AHEAD_MOBILE : PRELOAD_AHEAD_DESKTOP;

      // Предзагрузка окном вокруг активного; за окном — освобождаем буферы
      // и декодер (лимит медиаплееров на iOS)
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const video = seg.video;
        if (!video) continue;
        const inWindow = i >= active - preloadBack && i <= active + preloadAhead;
        // Гистерезис выгрузки: освобождаем только на 2 сегмента ЗА окном —
        // пролёт свайпом сквозь несколько сегментов не устраивает каскад
        // load()/выгрузок на каждом пересечении границы
        const outFar =
          i < active - preloadBack - 2 || i > active + preloadAhead + 2;
        if (inWindow && !seg.mediaActive) {
          seg.mediaActive = true;
          video.preload = "auto";
          // iOS считает preload хинтом и без пинка не грузит ничего
          if (video.readyState === 0) video.load();
        } else if (outFar && seg.mediaActive && !seg.visible) {
          // Видимый слой не выгружается никогда: ни показанный, ни
          // гаснущий после подмены (visible до таймера скрытия) — иначе
          // load() сбросит его на постер прямо под 140мс-фейдом нового
          seg.mediaActive = false;
          seg.pendingTime = null;
          video.preload = "none";
          video.load();
          // load() стирает отрисованный кадр элемента, но rVFC-отметка
          // осталась бы «свежей» (парковка ≈ цель на стыке) и пропустила
          // бы свап до первой реальной презентации — постер в кадре
          seg.paintedTime = -1;
        }
        if (!seg.mediaActive) continue;
        if (IOS_AUTOPLAY_FALLBACK && mobileView) {
          // iOS-страховка: вместо скраббинга — автоплей активного сегмента
          // при входе в вьюпорт (включается флагом после проверки на живом
          // iPhone, если currentTime-скраббинг дёргается)
          if (i === active) {
            if (video.paused) video.play().catch(() => {});
          } else if (!video.paused) {
            video.pause();
            seekTo(seg, i < active ? seg.span.duration : 0);
          }
        } else if (i === active) {
          // Мобильный гейт частоты: пропущенный проход доиграет следующий
          // rAF — цель пересчитывается каждый кадр, потерь позиции нет
          const now = performance.now();
          // Гейт обходится при неразрешённой подмене: цель должна получить
          // сик немедленно, иначе 250мс-предохранитель показывает неготовый
          // кадр («блымание» на сменах сегментов)
          const gated =
            mobileView &&
            active === shownIdx &&
            now - lastSeekStamp < MOBILE_SEEK_INTERVAL_MS;
          if (gated) {
            // не выдаём новый сик; форсим пересчёт на следующем rAF, чтобы
            // финальная позиция не осталась недосикнутой после остановки
            lastPosVh = -1;
          } else {
            lastSeekStamp = now;
            seg.pendingTime = null;
            // videoFrom: сегмент скраббится от смещения до конца — открытие
            // фильма с эффектного кадра (только первый сегмент)
            const from = seg.span.videoFrom ?? 0;
            const lp = (t - seg.span.tStart) / seg.span.duration;
            seekTo(seg, from + lp * (seg.span.duration - from), activeStep);
          }
        } else {
          // Соседи паркуются на своём граничном кадре: подмена на границе
          // мгновенно показывает совпадающий кадр, без ожидания сика
          seekTo(seg, i < active ? seg.span.duration : (seg.span.videoFrom ?? 0));
        }
      }

      // Отложенная подмена видимости: целевой сегмент уже получил сик выше;
      // показываем его, когда нужный кадр декодирован (последовательный
      // проход границы готов сразу — кадры совпадают), при прыжке ждём
      // 1-2 кадра, удерживая предыдущий сегмент. Предохранитель 250 мс:
      // медленная сеть не должна замораживать ленту на старом кадре.
      if (active !== shownIdx) {
        const target = segments[active];
        const tv = target.video;
        const from = target.span.videoFrom ?? 0;
        const wantTime =
          from +
          ((t - target.span.tStart) / target.span.duration) *
            (target.span.duration - from);
        if (!pendingSwitch) {
          pendingSwitch = true;
          switchWaitAt = performance.now();
        }
        // Цель ещё ВИДИМА — реверс у границы в окно фейда (палец с
        // syncTouch-сглаживанием осциллирует вокруг стыка постоянно).
        // Прогревать её нельзя: запись opacity 0.01 на видимый слой
        // дырявит непрозрачный стек, сквозь него блымает тёмная
        // подложка. Слой уже на экране с данными — подмена мгновенна.
        if (target.visible) {
          const own = hideTimers.get(active);
          if (own !== undefined) {
            window.clearTimeout(own);
            hideTimers.delete(active);
          }
          if (warmIdx >= 0 && warmIdx !== active && !hideTimers.has(warmIdx)) {
            const w = segments[warmIdx];
            w.visible = false;
            w.el.style.visibility = "hidden";
            w.el.style.opacity = "0";
            w.el.style.zIndex = "";
          }
          warmIdx = -1;
          const prev = segments[shownIdx];
          if (prev !== target && prev.visible) {
            prev.el.style.zIndex = "1";
            const prevIdx = shownIdx;
            const timer = window.setTimeout(() => {
              hideTimers.delete(prevIdx);
              if (shownIdx === prevIdx) return;
              const seg = segments[prevIdx];
              seg.visible = false;
              seg.el.style.visibility = "hidden";
              seg.el.style.opacity = "0";
              seg.el.style.zIndex = "";
            }, 560);
            const old = hideTimers.get(prevIdx);
            if (old !== undefined) window.clearTimeout(old);
            hideTimers.set(prevIdx, timer);
          }
          target.el.style.zIndex = "2";
          target.el.style.visibility = "visible";
          target.el.style.opacity = "1";
          shownIdx = active;
          pendingSwitch = false;
          sound.junction(smoothVelocity);
        } else {
        // Прогрев цели: слой на opacity 0.01 (глазу невидим — 1% поверх
        // полного старого неразличим) — композитор презентует его кадры,
        // rVFC начинает тикать, устаревшая картинка слоя заменяется
        // декодированной ещё ДО проявления
        if (warmIdx !== active) {
          if (warmIdx >= 0 && warmIdx !== shownIdx && !hideTimers.has(warmIdx)) {
            const w = segments[warmIdx];
            w.visible = false;
            w.el.style.visibility = "hidden";
            w.el.style.opacity = "0";
            w.el.style.zIndex = "";
          }
          warmIdx = active;
          // Бюджет предохранителя — на ЦЕЛЬ, не на всю серию подмен:
          // без перештамповки пролёт через несколько холодных сегментов
          // тратит 350мс на первом, и каждая следующая цель свапается
          // мгновенно по одному readyState — непрезентованным кадром
          switchWaitAt = performance.now();
          const own = hideTimers.get(active);
          if (own !== undefined) {
            window.clearTimeout(own);
            hideTimers.delete(active);
          }
          target.el.style.zIndex = "2";
          target.el.style.visibility = "visible";
          target.el.style.opacity = "0.01";
        }
        // Готовность — по ПРЕЗЕНТОВАННОМУ кадру (rVFC): показанная
        // картинка возле цели → свап, даже если параллельно летит новый
        // сик. При непрерывном скролле сик перевыдаётся каждый проход и
        // seeking почти всегда true — ждать его окончания значило бы
        // резолвить каждый стык 350мс-предохранителем («замер-скачок»).
        // Без rVFC (paintedTime всегда -1) — старая эвристика декодера.
        const paintedNear =
          target.paintedTime >= 0 &&
          Math.abs(target.paintedTime - wantTime) < 0.4;
        const frameReady =
          !tv ||
          (tv.readyState >= 2 &&
            (hasRVFC
              ? paintedNear
              : !tv.seeking &&
                Math.abs(tv.currentTime - wantTime) < 0.4));
        // Предохранитель от заморозки ленты — но свап на слой, не
        // отрисовавший НИ ОДНОГО кадра с момента load(), запрещён всегда:
        // такой слой показывает постер/пустоту, и это и есть «вспышка
        // фото поверх сцены». Пока холодный сегмент не отрисовался,
        // лента держит граничный кадр старого — читается как буферизация
        const stale = performance.now() - switchWaitAt > 350;
        if (
          frameReady ||
          (stale &&
            !!tv &&
            tv.readyState >= 2 &&
            (!hasRVFC || target.paintedTime >= 0))
        ) {
          // Кроссфейд БЕЗ провала яркости: новый сегмент наплывает ПОВЕРХ
          // (z-index выше), старый держит полную непрозрачность до конца
          // фейда — одновременное гашение обоих слоёв просвечивало бы
          // тёмную подложку («блымание»). Старый прячется по таймеру.
          const prev = segments[shownIdx];
          if (prev !== target && prev.visible) {
            prev.el.style.zIndex = "1";
            const prevIdx = shownIdx;
            const timer = window.setTimeout(() => {
              hideTimers.delete(prevIdx);
              if (shownIdx === prevIdx) return; // успел снова стать активным
              const seg = segments[prevIdx];
              seg.visible = false;
              seg.el.style.visibility = "hidden";
              seg.el.style.opacity = "0";
              seg.el.style.zIndex = "";
            }, 560);
            const old = hideTimers.get(prevIdx);
            if (old !== undefined) window.clearTimeout(old);
            hideTimers.set(prevIdx, timer);
          }
          target.el.style.zIndex = "2";
          target.el.style.visibility = "visible";
          target.el.style.opacity = "1";
          target.visible = true;
          shownIdx = active;
          pendingSwitch = false;
          warmIdx = -1;
          sound.junction(smoothVelocity);
        }
        // конец ветки холодной цели (прогрев + готовность)
        }
      } else {
        pendingSwitch = false;
        // Разворот до подмены: брошенный прогреваемый слой гасится
        if (warmIdx >= 0) {
          if (warmIdx !== shownIdx && !hideTimers.has(warmIdx)) {
            const w = segments[warmIdx];
            w.visible = false;
            w.el.style.visibility = "hidden";
            w.el.style.opacity = "0";
            w.el.style.zIndex = "";
          }
          warmIdx = -1;
        }
      }

      // CAT-тег: cats активного сегмента, пуш только при смене
      if (active !== lastCatsAt) {
        lastCatsAt = active;
        catTagNode?.filmCatsUpdate?.(segCats[active] ?? null);
      }

      // Тексты: появление на [fromT, toT], только opacity + translateY.
      // Формулы дублируются в пре-гидрационном скрипте page.tsx.
      for (const copy of copyEls) {
        const o = clamp01(
          Math.min((t - copy.fromT) / COPY_FADE_S, (copy.toT - t) / COPY_FADE_S),
        );
        if (o === copy.lastO) continue;
        copy.lastO = o;
        copy.el.style.opacity = o.toFixed(3);
        copy.el.style.visibility = o <= 0 ? "hidden" : "visible";
        copy.el.style.transform = `translateY(${((1 - o) * COPY_SHIFT_PX).toFixed(1)}px)`;
      }

      // Состояние хрома: раздел фильма, инверсия светлой части, подсказка.
      let sectionIndex = 0;
      for (let i = FILM_SECTIONS.length - 1; i >= 0; i--) {
        if (t >= FILM_SECTIONS[i].fromT) {
          sectionIndex = i;
          break;
        }
      }
      // Ручной скролл без нажатия Play прячет кнопку навсегда (мутация
      // ref до setState — защита от повторных вызовов из rAF до ре-рендера)
      if (playStateRef.current === "idle" && window.scrollY > SCROLL_HINT_PX) {
        playStateRef.current = "gone";
        setPlayState("gone");
      }

      const next: ChromeState = {
        section: sectionIndex,
        light:
          t >= TIMELINE.chromeLight.fromT && t < TIMELINE.chromeLight.toT,
        scrolled: window.scrollY > SCROLL_HINT_PX,
        // Прогресс фильма для мобильной полоски пути; шаг 0.005 —
        // чтобы не дёргать React каждый кадр
        progress: Math.round((t / totalT) * 200) / 200,
      };
      const prev = uiRef.current;
      if (
        next.section !== prev.section ||
        next.light !== prev.light ||
        next.scrolled !== prev.scrolled ||
        next.progress !== prev.progress
      ) {
        uiRef.current = next;
        chromeSetterRef.current?.(next);
      }
    };

    // Сглаженная скорость скролла, px/s — для оверлеев
    let smoothVelocity = 0;
    let lastTime = -1;
    let lastScrollPx = window.scrollY;

    // Возврат вкладки: браузер в фоне выгружает декодеры — сбрасываем
    // скорость (гигантская пауза не должна попасть в dt), пинаем окно
    // предзагрузки и форсим полный переапплай — иначе первые сики вязнут
    // и скролл «тупит», пока всё не прогреется само
    const onVisibility = () => {
      if (document.visibilityState !== "visible") {
        // Уход в фон при автопросмотре: rAF замирает, а часы Lenis нет —
        // после возврата твин прыгнул бы вперёд на всё скрытое время
        // (в холодные сегменты). Останавливаем на месте. Звук — на паузу.
        cancelAutoplay();
        sound.suspend();
        return;
      }
      sound.resume();
      lastTime = -1;
      smoothVelocity = 0;
      lastSeekStamp = 0;
      lastPosVh = -1;
      segments.forEach((seg) => {
        if (seg.mediaActive && seg.video && seg.video.readyState === 0) {
          seg.video.load();
          seg.paintedTime = -1;
        }
      });
    };
    document.addEventListener("visibilitychange", onVisibility);

    // Возврат на страницу из bfcache: фильм начинается сверху, кнопка
    // Play возвращается — страница ведёт себя как свежеоткрытая
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      window.scrollTo(0, 0);
      lenis.scrollTo(0, { immediate: true });
      lastPosVh = -1;
      playStateRef.current = "idle";
      setPlayState("idle");
    };
    window.addEventListener("pageshow", onPageShow);

    const updateOverlays = () => {
      for (const node of overlays) {
        node.filmOverlayUpdate?.({ t: lastT, velocity: smoothVelocity });
      }
      if (phaseBarNode?.filmPhaseUpdate) {
        const bar = TIMELINE.phaseBar;
        const opacity = clamp01(
          Math.min((lastT - (bar.fromT - 1)) / 0.8, (bar.toT + 1 - lastT) / 0.8),
        );
        const fill = clamp01((lastT - bar.fromT) / (bar.toT - bar.fromT));
        phaseBarNode.filmPhaseUpdate({ opacity, fill });
      }
    };

    // Мобильный тач: syncTouch пропускает палец через lerp-сглаживание —
    // нативные рывки momentum-скролла гасятся, приглушённый множитель и
    // короткая инерция не дают свайпу «улетать» сквозь пол-фильма
    const lenis = new Lenis(
      mobileView
        ? {
            syncTouch: true,
            // 0.14: страница догоняет палец быстро — сглаживание есть,
            // запаздывания («тупит») нет; 0.09 было слишком тяжёлым
            syncTouchLerp: 0.14,
            touchMultiplier: 1.0,
            // <1.7 (дефолт): резкий флик не возводится в степень —
            // инерция короче, свайп не улетает сквозь пол-фильма
            touchInertiaExponent: 1.35,
          }
        : {},
    );
    lenisRef.current = lenis;
    // Открытая панель заявки замораживает скролл фильма
    const unsubscribeLead = subscribeLeadPanel((open) => {
      if (open) lenis.stop();
      else lenis.start();
    });

    // Кнопка Play: скроллит фильм до конца в реальном темпе таймлайна
    // (остаток секунд = длительность прокрутки, easing linear — темп задаёт
    // таблица vh/с через кусочно-линейный маппинг). Любой жест пользователя
    // отменяет автопросмотр и передаёт управление руке.
    let autoplayActive = false;
    const cancelAutoplay = () => {
      if (!autoplayActive) return;
      autoplayActive = false;
      removeCancelListeners();
      // Остановка на месте: scrollTo текущей позиции с immediate обрывает
      // внутренний твин Lenis, инерции нет — рука подхватывает мгновенно
      lenis.scrollTo(window.scrollY, { immediate: true });
      playStateRef.current = "gone";
      setPlayState("gone");
    };
    const onUserGesture = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest?.("[data-play-button]")) return;
      cancelAutoplay();
    };
    const removeCancelListeners = () => {
      window.removeEventListener("wheel", onUserGesture);
      window.removeEventListener("touchstart", onUserGesture);
      window.removeEventListener("mousedown", onUserGesture);
      window.removeEventListener("keydown", onUserGesture);
    };
    autoplayRef.current = {
      start: () => {
        if (autoplayActive) return;
        autoplayActive = true;
        playStateRef.current = "playing";
        setPlayState("playing");
        window.addEventListener("wheel", onUserGesture, { passive: true });
        window.addEventListener("touchstart", onUserGesture, { passive: true });
        window.addEventListener("mousedown", onUserGesture);
        window.addEventListener("keydown", onUserGesture);
        const maxScroll = wrap.offsetHeight - stage.offsetHeight;
        lenis.scrollTo(maxScroll, {
          duration: Math.max(2, (totalT - lastT) / AUTOPLAY_SPEED),
          easing: (x: number) => x,
          onComplete: () => {
            if (!autoplayActive) return;
            autoplayActive = false;
            removeCancelListeners();
            playStateRef.current = "gone";
            setPlayState("gone");
          },
        });
      },
    };
    let frame = 0;
    const update = (time: number) => {
      lenis.raf(time);
      if (lastTime >= 0) {
        const dt = Math.max(0.001, (time - lastTime) / 1000);
        const instant = (window.scrollY - lastScrollPx) / dt;
        smoothVelocity += (instant - smoothVelocity) * Math.min(1, dt * 8);
        if (Math.abs(smoothVelocity) < 1) smoothVelocity = 0;
        // Скролл успокоился после быстрого прогона — дожимаем кадр точным
        // шагом, иначе покой остался бы на крупноквантованной позиции
        if (
          lastActiveStep > FRAME_STEP &&
          Math.abs(smoothVelocity) <=
            (mobileView ? FAST_SCROLL_MOBILE : FAST_SCROLL_DESKTOP)
        ) {
          lastActiveStep = FRAME_STEP;
          lastPosVh = -1;
        }
        // Неразрешённая подмена: перепроверяем готовность целевого кадра
        // каждый кадр, даже если скролл уже остановился
        if (pendingSwitch) lastPosVh = -1;
      }
      lastTime = time;
      lastScrollPx = window.scrollY;
      applyScroll();
      // Оверлеи обновляются каждый кадр, вне раннего выхода applyScroll
      updateOverlays();
      sound.update(lastT);
      frame = requestAnimationFrame(update);
    };
    applyScroll();
    updateOverlays();
    frame = requestAnimationFrame(update);

    return () => {
      unsubscribeLead();
      autoplayActive = false;
      removeCancelListeners();
      autoplayRef.current = null;
      wrap.removeAttribute("data-film-live");
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibility);
      gestureEvents.forEach((ev) =>
        window.removeEventListener(ev, onFirstGesture),
      );
      soundRef.current = null;
      sound.dispose();
      cancelAnimationFrame(frame);
      hideTimers.forEach((timer) => window.clearTimeout(timer));
      hideTimers.clear();
      lenisRef.current = null;
      lenis.destroy();
      segments.forEach((seg, index) => {
        seg.video?.removeEventListener("loadeddata", invalidate);
        seg.video?.removeEventListener("loadedmetadata", invalidate);
        seg.video?.removeEventListener("seeked", seekedHandlers[index]);
        if (hasRVFC && seg.rvfcId && seg.video) {
          seg.video.cancelVideoFrameCallback(seg.rvfcId);
        }
        seg.video?.pause();
      });
    };
  }, [reducedMotion, mobileView, spans, totalVh, totalT]);

  // prefers-reduced-motion: покадровая вертикальная версия — ключевые кадры
  // сегментов как постеры, тексты в потоке, обычный скролл. Полноценная
  // версия, не заглушка.
  if (reducedMotion) {
    const blocksOf = (index: number) => {
      const span = spans[index];
      const end = span.tStart + span.duration;
      return COPY.filter((b) => b.fromT >= span.tStart && b.fromT < end);
    };
    const sectionAt = (index: number) => {
      const span = spans[index];
      const end = span.tStart + span.duration;
      return FILM_SECTIONS.find((s) => s.fromT >= span.tStart && s.fromT < end)
        ?.id;
    };
    return (
      <div>
        <Chrome sections={FILM_SECTIONS} mode="vertical" onNavigate={navigate} />
        {spans.map((span, index) => {
          const blocks = blocksOf(index);
          const hasPoster = media?.[span.id] ? media[span.id].poster : true;
          return (
            <section key={span.id} id={sectionAt(index)}>
              <div
                className="relative h-[64vh]"
                style={{ background: PALETTES[span.palette] }}
              >
                {hasPoster && (
                  <img
                    src={span.posterSrc}
                    alt=""
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}
              </div>
              {blocks.map((block) => (
                <div
                  key={block.id}
                  className="py-14"
                  style={{
                    background: block.light ? "var(--paper)" : "var(--ground)",
                  }}
                >
                  <CopyBlockView block={block} onCta={onCta} />
                </div>
              ))}
            </section>
          );
        })}
      </div>
    );
  }

  return (
    <>
      <div
        ref={wrapRef}
        data-film-total={totalVh}
        data-light-from={TIMELINE.chromeLight.fromT}
        data-light-to={TIMELINE.chromeLight.toT}
        style={{ height: `${heightVh}vh` }}
      >
        <div ref={stageRef} className="sticky top-0 h-screen overflow-hidden">
          {spans.map((span, index) => (
            <Segment
              key={span.id}
              segment={span}
              index={index}
              avail={media?.[span.id]}
              mobile={mobileView}
            />
          ))}
          {/* Оверлеи фронта поверх видео; контур Украины и огни — в самом
              футаже (K00b), кодом не дублируются */}
          <CatCards />
          <TimedCopy blocks={COPY} layout="film" mobile={mobileView} onCta={onCta} />
        </div>
      </div>
      <Chrome
        sections={FILM_SECTIONS}
        mode="film"
        mobile={mobileView}
        onNavigate={navigate}
        register={registerChrome}
      />
      {/* Тумблер звука: под кнопкой «На початок» в левой колонке хрома.
          Клик — жест, поэтому заодно разблокирует аудиоконтекст */}
      <button
        type="button"
        aria-label={soundOn ? CHROME.soundOn : CHROME.soundOff}
        onClick={() => {
          const next = !soundOn;
          setSoundOn(next);
          soundRef.current?.setEnabled(next);
          if (next) soundRef.current?.unlock();
        }}
        className="chrome-shadow fixed left-4 top-24 z-40 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-[var(--chrome-dim)] text-[var(--chrome-ink)] opacity-60 transition-all duration-500 hover:opacity-100 md:left-6 md:top-[6.5rem]"
      >
        <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden>
          <path
            d="M3 6 L3 10 L6 10 L9 13 L9 3 L6 6 Z"
            fill="currentColor"
            stroke="none"
          />
          {soundOn ? (
            <path
              d="M11 6 Q12.6 8 11 10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          ) : (
            <path
              d="M11 6 L14 10 M14 6 L11 10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          )}
        </svg>
      </button>
      {/* Кнопка Play первого экрана: автопросмотр фильма в реальном темпе.
          Ручной скролл или любой жест во время проигрывания убирает её. */}
      {playState === "idle" && (
        <button
          type="button"
          data-play-button=""
          aria-label={CHROME.play}
          onClick={() => autoplayRef.current?.start()}
          className="fixed left-1/2 top-1/2 z-40 flex -translate-x-1/2 -translate-y-1/2 cursor-pointer flex-col items-center gap-3"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full border border-[rgba(238,242,247,0.35)] bg-[rgba(2,3,10,0.35)] backdrop-blur-sm transition-[border-color,transform] duration-300 hover:scale-105 hover:border-[var(--gold)]">
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
              <path d="M5.2 3.2 12.4 8 5.2 12.8Z" fill="var(--ink)" />
            </svg>
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-[var(--dim)]">
            {CHROME.play}
          </span>
        </button>
      )}
      {/* Клик по тегу ведёт к карточке показанного CAT-кода: лента
          доскролливается горизонтально, страница — к секции каталога */}
      <CatTag
        onSelect={(code) => {
          const card = document.getElementById(code);
          const ribbon = card?.parentElement;
          if (card && ribbon) {
            ribbon.scrollLeft = Math.max(
              0,
              card.offsetLeft - ribbon.clientWidth / 2 + card.clientWidth / 2,
            );
          }
          navigate(SECTIONS.catalog.id);
        }}
      />
      <PhaseBar labels={PHASES.map((phase) => phase.code)} mobile={mobileView} />
    </>
  );
}
