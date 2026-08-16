"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Lenis from "lenis";
import CatCards from "@/components/CatCards";
import CatTag from "@/components/CatTag";
import Chrome, { type ChromeState } from "@/components/Chrome";
import PhaseBar from "@/components/PhaseBar";
import Segment from "@/components/Segment";
import TimedCopy, { CopyBlockView } from "@/components/TimedCopy";
import { openLeadPanel, subscribeLeadPanel } from "@/components/leadBus";
import type {
  CatTagNode,
  OverlayNode,
  PhaseBarNode,
} from "@/components/overlayBridge";
import { PHASES } from "@/content/catalog";
import {
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
const FAST_SCROLL_MOBILE = 800;
const VERY_FAST_SCROLL_MOBILE = 1800;
const EXTREME_SCROLL_MOBILE = 3200;

// Тексты: появление/уход на [fromT, toT] — только opacity + translateY.
const COPY_FADE_S = 0.5;
const COPY_SHIFT_PX = 16;

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

    // px в одном vh скраббируемой дистанции: спейсер минус вьюпорт (последний
    // вьюпорт — покой на финальном кадре). Меряем по DOM, не по innerHeight,
    // чтобы не расходиться с CSS при сворачивании адресной строки на мобильных.
    let vhUnit = (wrap.offsetHeight - stage.offsetHeight) / totalVh;
    const onResize = () => {
      vhUnit = (wrap.offsetHeight - stage.offsetHeight) / totalVh;
    };
    window.addEventListener("resize", onResize);

    let lastPosVh = -1;
    let lastActive = -1;
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

      // Жёсткая подмена сегментов на общем кадре: видимость без переходов
      if (active !== lastActive) {
        segments.forEach((seg, i) => {
          const on = i === active;
          if (on !== seg.visible) {
            seg.visible = on;
            seg.el.style.visibility = on ? "visible" : "hidden";
            seg.el.style.opacity = on ? "1" : "0";
          }
        });
        lastActive = active;
      }

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
        } else if (outFar && seg.mediaActive) {
          seg.mediaActive = false;
          seg.pendingTime = null;
          video.preload = "none";
          video.load();
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
          seg.pendingTime = null;
          seekTo(seg, t - seg.span.tStart, activeStep);
        } else {
          // Соседи паркуются на своём граничном кадре: подмена на границе
          // мгновенно показывает совпадающий кадр, без ожидания сика
          seekTo(seg, i < active ? seg.span.duration : 0);
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
            syncTouchLerp: 0.09,
            touchMultiplier: 0.9,
            // <1.7 (дефолт): резкий флик не возводится в степень —
            // инерция короче, свайп не улетает сквозь пол-фильма
            touchInertiaExponent: 1.2,
          }
        : {},
    );
    lenisRef.current = lenis;
    // Открытая панель заявки замораживает скролл фильма
    const unsubscribeLead = subscribeLeadPanel((open) => {
      if (open) lenis.stop();
      else lenis.start();
    });
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
      }
      lastTime = time;
      lastScrollPx = window.scrollY;
      applyScroll();
      // Оверлеи обновляются каждый кадр, вне раннего выхода applyScroll
      updateOverlays();
      frame = requestAnimationFrame(update);
    };
    applyScroll();
    updateOverlays();
    frame = requestAnimationFrame(update);

    return () => {
      unsubscribeLead();
      wrap.removeAttribute("data-film-live");
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(frame);
      lenisRef.current = null;
      lenis.destroy();
      segments.forEach((seg, index) => {
        seg.video?.removeEventListener("loadeddata", invalidate);
        seg.video?.removeEventListener("loadedmetadata", invalidate);
        seg.video?.removeEventListener("seeked", seekedHandlers[index]);
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
