"use client";

import { useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import Act from "@/components/Act";
import {
  PHASE_CARD_VH,
  stageHeightVh,
  type Act as ActConfig,
  type Axis,
} from "@/content/film";

// Фазовая перебивка: проявляется в хвосте предыдущей сцены (d от -CARD_IN до 0),
// держится до d = CARD_HOLD, растворяется к d = 1, открывая сцену под собой.
const CARD_IN = 0.35;
const CARD_HOLD = 0.5;

// Blur почти не виден на полупрозрачном слое, а стоит дороже всего —
// ниже этого порога opacity фильтр не назначаем.
const BLUR_MIN_OPACITY = 0.15;

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

export default function FilmStage({ film }: { film: ActConfig[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
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
    ).map((el) => ({
      el,
      kind: el.dataset.seg as "card" | "scene",
      axis: el.dataset.axis as Axis,
      startVh: Number(el.dataset.startVh),
      lenVh: Number(el.dataset.lenVh),
    }));
    const backdrop = stage.querySelector<HTMLElement>("[data-film-backdrop]");

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

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const d = p - i;
        if (seg.kind === "card") {
          const opacity = clamp01(
            Math.min(1 + d / CARD_IN, (1 - d) / (1 - CARD_HOLD)),
          );
          seg.el.style.opacity = String(opacity);
          seg.el.style.visibility = opacity <= 0 ? "hidden" : "visible";
        } else {
          applyAxis(seg.el, seg.axis, d);
        }
      }

      if (backdrop && whiteFrom >= 0) {
        const white = clamp01(
          Math.min((p - (whiteFrom + 0.2)) / 0.3, (whiteTo + 0.5 - p) / 0.3),
        );
        backdrop.style.opacity = String(white);
      }
    };

    const lenis = new Lenis();
    let frame = 0;
    const update = (time: number) => {
      lenis.raf(time);
      applyScroll();
      frame = requestAnimationFrame(update);
    };
    applyScroll();
    frame = requestAnimationFrame(update);

    return () => {
      wrap.removeAttribute("data-film-live");
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [film, reducedMotion, heightVh, whiteFrom, whiteTo]);

  // prefers-reduced-motion: обычная вертикальная страница, без спейсера,
  // sticky-стека и rAF-цикла. Полноценная версия, не заглушка.
  if (reducedMotion) {
    return (
      <div>
        {acts.map(({ act, withCard }) => (
          <Act
            key={act.id}
            act={act}
            startVh={0}
            withCard={withCard}
            firstAct={false}
            layout="vertical"
          />
        ))}
      </div>
    );
  }

  return (
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
          className="pointer-events-none absolute inset-0"
          style={{ background: "var(--paper)", opacity: 0 }}
        />
        {acts.map(({ act, startVh, withCard }, index) => (
          <Act
            key={act.id}
            act={act}
            startVh={startVh}
            withCard={withCard}
            firstAct={index === 0}
            layout="film"
          />
        ))}
      </div>
    </div>
  );
}
