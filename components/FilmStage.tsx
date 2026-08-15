"use client";

import { useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import Act from "@/components/Act";
import CatTag from "@/components/CatTag";
import Chrome, {
  type ChromeState,
  type NavigateAlign,
} from "@/components/Chrome";
import PhaseBar from "@/components/PhaseBar";
import { openLeadPanel, subscribeLeadPanel } from "@/components/leadBus";
import type {
  CatTagNode,
  OverlayNode,
  PhaseBarNode,
} from "@/components/overlayBridge";
import {
  PHASE_CARD_VH,
  SECTIONS,
  stageHeightVh,
  type Act as ActConfig,
  type ActId,
  type Axis,
  type Cta,
  type MediaAvailability,
  type Playback,
  type SectionId,
} from "@/content/film";

// Фазовая перебивка: проявляется в хвосте предыдущей сцены (d от -CARD_IN до 0),
// держится до d = CARD_HOLD, растворяется к d = 1, открывая сцену под собой.
const CARD_IN = 0.35;
const CARD_HOLD = 0.5;

// Blur почти не виден на полупрозрачном слое, а стоит дороже всего —
// ниже этого порога opacity фильтр не назначаем.
const BLUR_MIN_OPACITY = 0.15;

// Скролл дальше этого порога прячет подсказку «прокрутіть».
const SCROLL_HINT_PX = 60;

// Ленивая загрузка: preload переключается на auto при |d| < 1.5 (docs/build.md,
// шаг 5), окно ограничено с обеих сторон. За пределами RELEASE-порога буферы
// и декодер освобождаются (лимит одновременных медиаплееров на iOS).
const MEDIA_ON_FROM = -1.5;
const MEDIA_ON_TO = 1.5;
const MEDIA_RELEASE = 3;

// Скраббинг: сик только в видимой зоне, цель квантуется к сетке кадров,
// новый сик не выдаётся, пока идёт предыдущий (очереди сиков душат WebKit).
const SCRUB_RANGE = 1.0;
const FRAME_STEP = 1 / 30;

// Автоплей с гистерезисом: play при входе в вьюпорт, pause и сброс — при выходе.
const AUTOPLAY_IN = 0.55;
const AUTOPLAY_OUT = 0.8;
const PLAY_RETRY_MS = 1500;

// Тексты сцены уходят быстрее кадра и слегка съезжают вверх (build.md, шаг 4).
// У сцен с axisHold подпись живёт внутри пролёта и гаснет до кадра шва —
// иначе на стыке цепи горели бы оба заголовка сразу. visibility прячет
// невидимую копию из hit-testing: прозрачная CTA не должна ловить клики.
function applyCopy(el: HTMLElement, d: number, holdFrom: number, holdTo: number) {
  let opacity: number;
  let shift: number;
  if (holdTo > holdFrom) {
    opacity = clamp01(
      Math.min((d - holdFrom - 0.04) / 0.12, (holdTo - 0.14 - d) / 0.12),
    );
    shift = 0;
  } else {
    opacity = clamp01(1 - Math.abs(d) * 2.1);
    shift = d * -34;
  }
  el.style.opacity = String(opacity);
  el.style.visibility = opacity <= 0 ? "hidden" : "visible";
  el.style.transform = `translateY(${shift.toFixed(1)}px)`;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

// Оси движения из docs/build.md, шаг 2. Дублируются в пре-гидрационном скрипте
// app/(site)/page.tsx — правки синхронизировать.
function applyAxis(el: HTMLElement, axis: Axis, d: number) {
  let opacity = 0;
  let transform = "";
  let blur = 0;
  switch (axis) {
    case "fall":
      opacity = clamp01(1 - Math.abs(d) * 1.35);
      transform = `scale(${1 + d * 0.46})`;
      blur = (1 - opacity) * 7;
      break;
    case "lateral":
      opacity = clamp01(1 - Math.abs(d) * 1.1);
      transform = `translateX(${-d * 100}vw) scale(1.04)`;
      break;
    case "rise":
      opacity = clamp01(1 - Math.abs(d) * 1.35);
      transform = `translateY(${d * 26}vh) scale(${1 - d * 0.18})`;
      blur = (1 - opacity) * 5;
      break;
    case "still":
      opacity = clamp01(1 - Math.abs(d) * 1.9);
      transform = `scale(${1 + d * 0.06})`;
      break;
  }
  if (opacity <= 0) {
    el.style.opacity = "0";
    el.style.visibility = "hidden";
    el.style.filter = "";
    el.style.willChange = "";
    return;
  }
  el.style.opacity = String(opacity);
  el.style.visibility = "visible";
  el.style.transform = transform;
  el.style.filter =
    opacity >= BLUR_MIN_OPACITY && blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "";
  el.style.willChange = "transform, opacity, filter";
}

export default function FilmStage({
  film,
  media,
}: {
  film: ActConfig[];
  media?: MediaAvailability;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const chromeSetterRef = useRef<((state: ChromeState) => void) | null>(null);
  const uiRef = useRef<ChromeState>({ act: 0, light: false, scrolled: false });
  const [reducedMotion, setReducedMotion] = useState(false);
  const heightVh = stageHeightVh(film);

  // Оффсеты актов в vh и диапазон сегментов белого акта (для подложки --paper:
  // по film.md переходы внутри «Якості» уходят в белый, а не в тёмный фон).
  let offset = 0;
  let segIndex = 0;
  let whiteFrom = -1;
  let whiteTo = -1;
  const acts = film.map((act, index) => {
    const withCard = index > 0;
    const startVh = offset;
    const cardIndex = withCard ? segIndex : -1;
    segIndex += (withCard ? 1 : 0) + act.scenes.length;
    if (act.palette === "white") {
      whiteFrom = cardIndex !== -1 ? cardIndex : segIndex - act.scenes.length;
      whiteTo = segIndex;
    }
    offset +=
      (withCard ? PHASE_CARD_VH : 0) +
      act.scenes.reduce((sum, scene) => sum + scene.scrollVh, 0);
    return { act, startVh, withCard };
  });

  const registerChrome = (setter: ((state: ChromeState) => void) | null) => {
    chromeSetterRef.current = setter;
    // Chrome мог ремоунтнуться (переключение reduced-motion) — сразу отдаём
    // актуальное состояние, иначе диф-гард в applyScroll пропустит первый пуш.
    setter?.(uiRef.current);
  };

  const navigate = (target: ActId | SectionId, align: NavigateAlign = "card") => {
    const actTarget = acts.find(({ act }) => act.id === target);
    // Секции после фильма — обычные якоря в потоке документа
    if (!actTarget) {
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
    if (!wrap) return;
    // align "scene": мимо перебивки сразу к первой сцене акта
    const startVh =
      actTarget.startVh +
      (align === "scene" && actTarget.withCard ? PHASE_CARD_VH : 0);
    const top = startVh * (wrap.offsetHeight / heightVh);
    const lenis = lenisRef.current;
    if (lenis) lenis.scrollTo(top);
    else window.scrollTo({ top, behavior: "smooth" });
  };

  // CTA сцен: lead — открыть форму заявки, catalog — к ленте каталога
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
    if (reducedMotion) return;
    const wrap = wrapRef.current;
    const stage = stageRef.current;
    if (!wrap || !stage) return;

    // Порядок в DOM = порядок на таймлайне: каждый сегмент (сцена или перебивка)
    // занимает одну единицу глобального прогресса p; локальная дельта d = p - index.
    const segments = Array.from(
      stage.querySelectorAll<HTMLElement>("[data-seg]"),
    ).map((el) => {
      const sibling = el.nextElementSibling;
      return {
        el,
        // Текстовый слой — сиблинг сцены, не потомок (не наследует blur/scale)
        copy:
          sibling instanceof HTMLElement && sibling.hasAttribute("data-scene-copy")
            ? sibling
            : null,
        // Моно-строка перебивки: появляется с отставанием, когда чернота
        // уже почти непрозрачна — иначе просвечивает сквозь текст сцены
        cardLabel:
          el.dataset.seg === "card" ? el.querySelector<HTMLElement>("p") : null,
        video: el.querySelector<HTMLVideoElement>("video"),
        overlays: Array.from(
          el.querySelectorAll<HTMLElement>("[data-film-overlay]"),
        ) as OverlayNode[],
        kind: el.dataset.seg as "card" | "scene",
        axis: el.dataset.axis as Axis,
        playback: el.dataset.playback as Playback,
        duration: Number(el.dataset.duration),
        scrubFrom: Number(el.dataset.scrubFrom),
        scrubTo: Number(el.dataset.scrubTo),
        holdFrom: Number(el.dataset.holdFrom || 0),
        holdTo: Number(el.dataset.holdTo || 0),
        startVh: Number(el.dataset.startVh),
        lenVh: Number(el.dataset.lenVh),
        mediaActive: false,
        playing: false,
        retryAfter: 0,
        pendingTime: null as number | null,
        lastD: 0,
      };
    });
    const overlaySegments = segments.filter((seg) => seg.overlays.length > 0);
    const phaseBarNode = document.querySelector<PhaseBarNode>("[data-phase-bar]");
    const catTagNode = document.querySelector<CatTagNode>("[data-cat-tag]");

    // Диапазон сегментов шкалы фаз и cats каждого сегмента — из конфига
    let phaseFrom = -1;
    let phaseTo = -1;
    const segCats: (string[] | null)[] = [];
    {
      let index = 0;
      film.forEach((act, actIndex) => {
        if (actIndex > 0) {
          segCats.push(null);
          index += 1;
        }
        act.scenes.forEach((scene) => {
          if (scene.overlay === "phaseBar") {
            if (phaseFrom < 0) phaseFrom = index;
            phaseTo = index + 1;
          }
          segCats.push(scene.cats?.length ? scene.cats : null);
          index += 1;
        });
      });
    }
    const backdrop = stage.querySelector<HTMLElement>("[data-film-backdrop]");

    // Какой акт владеет каждым сегментом — для активной засечки ActRail.
    const actOfSegment: number[] = [];
    film.forEach((act, actIndex) => {
      if (actIndex > 0) actOfSegment.push(actIndex);
      act.scenes.forEach(() => actOfSegment.push(actIndex));
    });

    // Диапазон сегментов белого акта — как whiteFrom/whiteTo в рендере.
    let wFrom = -1;
    let wTo = -1;
    let cursor = 0;
    film.forEach((act, actIndex) => {
      const cardIndex = actIndex > 0 ? cursor : -1;
      cursor += (actIndex > 0 ? 1 : 0) + act.scenes.length;
      if (act.palette === "white") {
        wFrom = cardIndex !== -1 ? cardIndex : cursor - act.scenes.length;
        wTo = cursor;
      }
    });

    // Сигнал пре-гидрационному скрипту снять свой одноразовый scroll-слушатель.
    wrap.setAttribute("data-film-live", "1");

    // px в одном CSS vh: меряем по спейсеру, а не по innerHeight, чтобы не
    // расходиться с CSS при сворачивании адресной строки на мобильных.
    let vhUnit = wrap.offsetHeight / heightVh;
    const onResize = () => {
      vhUnit = wrap.offsetHeight / heightVh;
    };
    window.addEventListener("resize", onResize);

    let lastPosVh = -1;
    let lastP = 0;
    let lastSegAt = -1;
    const retryTimers: number[] = [];
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

    const applyScroll = () => {
      if (!vhUnit) return;
      const posVh = Math.max(0, window.scrollY) / vhUnit;
      if (posVh === lastPosVh) return;
      lastPosVh = posVh;

      let p = segments.length;
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        if (posVh < seg.startVh + seg.lenVh) {
          p = i + Math.max(0, posVh - seg.startVh) / seg.lenVh;
          break;
        }
      }
      lastP = p;

      // CAT-тег: cats активного сегмента, пуш только при смене сегмента
      const segAt = Math.min(Math.floor(p), segCats.length - 1);
      if (segAt !== lastSegAt) {
        lastSegAt = segAt;
        catTagNode?.filmCatsUpdate?.(segCats[segAt] ?? null);
      }

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const d = p - i;
        if (seg.kind === "card") {
          const opacity = clamp01(
            Math.min(1 + d / CARD_IN, (1 - d) / (1 - CARD_HOLD)),
          );
          seg.el.style.opacity = String(opacity);
          seg.el.style.visibility = opacity <= 0 ? "hidden" : "visible";
          if (seg.cardLabel) {
            seg.cardLabel.style.opacity = String(
              clamp01((opacity - 0.55) / 0.4),
            );
          }
        } else {
          // Окно удержания оси: внутри [holdFrom, holdTo] сцена стоит в покое,
          // осевые формулы применяются к выходу за окно (проезд акта II).
          const dAxis = d < seg.holdFrom ? d - seg.holdFrom : d > seg.holdTo ? d - seg.holdTo : 0;
          seg.lastD = d;
          applyAxis(seg.el, seg.axis, dAxis);
          if (seg.copy) applyCopy(seg.copy, d, seg.holdFrom, seg.holdTo);

          const video = seg.video;
          if (video) {
            // Загрузка актами, окно ограничено с обеих сторон; explicit load() —
            // iOS считает preload хинтом и без пинка не грузит ничего.
            if (!seg.mediaActive && d > MEDIA_ON_FROM && d < seg.holdTo + MEDIA_ON_TO) {
              seg.mediaActive = true;
              video.preload = "auto";
              if (video.readyState === 0) video.load();
            } else if (
              seg.mediaActive &&
              (d < MEDIA_ON_FROM - 1 || d > seg.holdTo + MEDIA_RELEASE)
            ) {
              // Далеко позади или впереди: освобождаем буферы и декодер
              seg.mediaActive = false;
              seg.playing = false;
              seg.pendingTime = null;
              video.pause();
              video.preload = "none";
              video.load();
            }

            if (seg.playback === "scrub") {
              // Кадр привязан к скроллу; пока метаданных нет — кадр пропускается.
              // Сик квантуется к сетке кадров и не выдаётся поверх текущего.
              if (
                video.readyState >= 1 &&
                d > seg.holdFrom - SCRUB_RANGE &&
                d < seg.holdTo + SCRUB_RANGE
              ) {
                const lp = clamp01((d - seg.scrubFrom) / (seg.scrubTo - seg.scrubFrom));
                let time = Math.round((lp * seg.duration) / FRAME_STEP) * FRAME_STEP;
                if (Number.isFinite(video.duration)) {
                  time = Math.min(time, Math.max(0, video.duration - FRAME_STEP));
                }
                if (Math.abs(video.currentTime - time) > FRAME_STEP / 2) {
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
              }
            } else if (seg.mediaActive) {
              // Автоплей: один прогон при входе сцены в вьюпорт, сброс при
              // выходе; отклонённый play() (iOS Low Power) ретраится с паузой.
              const distance = Math.abs(d);
              if (
                !seg.playing &&
                distance < AUTOPLAY_IN &&
                performance.now() >= seg.retryAfter
              ) {
                seg.playing = true;
                video.play().catch(() => {
                  seg.playing = false;
                  seg.retryAfter = performance.now() + PLAY_RETRY_MS;
                  // Будим цикл после паузы: иначе ранний выход по lastPosVh
                  // не даст ретраю случиться, пока скролл неподвижен
                  retryTimers.push(window.setTimeout(invalidate, PLAY_RETRY_MS + 50));
                });
              } else if (seg.playing && distance > AUTOPLAY_OUT) {
                seg.playing = false;
                video.pause();
                video.currentTime = 0;
              }
            }
          }
        }
      }

      if (backdrop && wFrom >= 0) {
        const white = clamp01(
          Math.min((p - (wFrom + 0.2)) / 0.3, (wTo + 0.5 - p) / 0.3),
        );
        backdrop.style.opacity = String(white);
      }

      // Состояние хрома: активный акт, инверсия в белом акте, подсказка скролла.
      // Пушится в Chrome через setter — сцены не перерисовываются.
      const next: ChromeState = {
        act: actOfSegment[segAt] ?? 0,
        light: wFrom >= 0 && p >= wFrom - 0.15 && p < wTo - 0.2,
        scrolled: window.scrollY > SCROLL_HINT_PX,
      };
      const prev = uiRef.current;
      if (
        next.act !== prev.act ||
        next.light !== prev.light ||
        next.scrolled !== prev.scrolled
      ) {
        uiRef.current = next;
        chromeSetterRef.current?.(next);
      }
    };

    // Сглаженная скорость скролла, px/s — для реакции линий тока
    let smoothVelocity = 0;
    let lastTime = -1;
    let lastScrollPx = window.scrollY;

    const updateOverlays = () => {
      for (const seg of overlaySegments) {
        // Сцена далеко от вьюпорта и скрыта — не трогаем её оверлеи
        if (Math.abs(seg.lastD) >= 1.1) continue;
        const progress = clamp01(
          (seg.lastD - seg.scrubFrom) / (seg.scrubTo - seg.scrubFrom),
        );
        for (const node of seg.overlays) {
          node.filmOverlayUpdate?.({
            d: seg.lastD,
            progress,
            p: lastP,
            velocity: smoothVelocity,
          });
        }
      }
      if (phaseBarNode?.filmPhaseUpdate && phaseFrom >= 0) {
        const opacity = clamp01(
          Math.min(lastP - (phaseFrom - 0.45), phaseTo + 0.45 - lastP) / 0.3,
        );
        const fill = clamp01((lastP - phaseFrom) / (phaseTo - phaseFrom));
        phaseBarNode.filmPhaseUpdate({ opacity, fill });
      }
    };

    const lenis = new Lenis();
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
      }
      lastTime = time;
      lastScrollPx = window.scrollY;
      applyScroll();
      // Оверлеи обновляются каждый кадр, вне раннего выхода applyScroll:
      // свечение линий должно затухать и при неподвижном скролле
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
      retryTimers.forEach((timer) => window.clearTimeout(timer));
      segments.forEach((seg, index) => {
        seg.video?.removeEventListener("loadeddata", invalidate);
        seg.video?.removeEventListener("loadedmetadata", invalidate);
        seg.video?.removeEventListener("seeked", seekedHandlers[index]);
        seg.video?.pause();
      });
    };
  }, [film, reducedMotion, heightVh]);

  // prefers-reduced-motion: обычная вертикальная страница, без спейсера,
  // sticky-стека и rAF-цикла. Полноценная версия, не заглушка.
  if (reducedMotion) {
    return (
      <div>
        <Chrome film={film} mode="vertical" onNavigate={navigate} />
        {acts.map(({ act, withCard }, index) => (
          <Act
            key={act.id}
            act={act}
            media={media}
            startVh={0}
            withCard={withCard}
            firstAct={index === 0}
            layout="vertical"
            onCta={onCta}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <div
        ref={wrapRef}
        data-film-total={heightVh}
        data-white-from={whiteFrom}
        data-white-to={whiteTo}
        style={{ height: `${heightVh}vh` }}
      >
        <div ref={stageRef} className="sticky top-0 h-screen overflow-hidden">
          <div
            data-film-backdrop=""
            suppressHydrationWarning
            className="pointer-events-none absolute inset-0"
            style={{ background: "var(--paper)", opacity: 0 }}
          />
          {acts.map(({ act, startVh, withCard }, index) => (
            <Act
              key={act.id}
              act={act}
              media={media}
              startVh={startVh}
              withCard={withCard}
              firstAct={index === 0}
              layout="film"
              onCta={onCta}
            />
          ))}
        </div>
      </div>
      <Chrome
        film={film}
        mode="film"
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
      <PhaseBar
        labels={film.flatMap((act) =>
          act.scenes.filter((scene) => scene.overlay === "phaseBar").map((scene) => scene.eyebrow),
        )}
      />
    </>
  );
}
