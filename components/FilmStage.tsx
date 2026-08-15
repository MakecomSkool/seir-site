"use client";

import { useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import Act from "@/components/Act";
import Chrome, {
  type ChromeState,
  type NavigateAlign,
} from "@/components/Chrome";
import {
  PHASE_CARD_VH,
  stageHeightVh,
  type Act as ActConfig,
  type ActId,
  type Axis,
  type Cta,
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

// Тексты сцены уходят быстрее кадра и слегка съезжают вверх (build.md, шаг 4).
// visibility прячет невидимую копию из hit-testing: без этого прозрачная CTA
// продолжала бы ловить клики.
function applyCopy(el: HTMLElement, d: number) {
  const opacity = clamp01(1 - Math.abs(d) * 2.1);
  el.style.opacity = String(opacity);
  el.style.visibility = opacity <= 0 ? "hidden" : "visible";
  el.style.transform = `translateY(${(d * -34).toFixed(1)}px)`;
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

export default function FilmStage({ film }: { film: ActConfig[] }) {
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

  const navigate = (actId: ActId, align: NavigateAlign = "card") => {
    if (reducedMotion) {
      document.getElementById(actId)?.scrollIntoView({ block: "start" });
      return;
    }
    const wrap = wrapRef.current;
    const target = acts.find(({ act }) => act.id === actId);
    if (!wrap || !target) return;
    // align "scene": мимо перебивки сразу к первой сцене акта — для CTA,
    // ведущей к контактам эпилога.
    const startVh =
      target.startVh +
      (align === "scene" && target.withCard ? PHASE_CARD_VH : 0);
    const top = startVh * (wrap.offsetHeight / heightVh);
    const lenis = lenisRef.current;
    if (lenis) lenis.scrollTo(top);
    else window.scrollTo({ top, behavior: "smooth" });
  };

  // CTA сцен: lead — к контактам эпилога (LeadPanel появится на шаге 7),
  // catalog — к проезду по оборудованию (секция каталога появится на шаге 7).
  const onCta = (cta: Cta) => {
    if (cta.action === "lead") navigate(film[film.length - 1].id, "scene");
    else navigate("equipment");
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
        kind: el.dataset.seg as "card" | "scene",
        axis: el.dataset.axis as Axis,
        startVh: Number(el.dataset.startVh),
        lenVh: Number(el.dataset.lenVh),
      };
    });
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
          if (seg.copy) applyCopy(seg.copy, d);
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
      const segAt = Math.min(Math.floor(p), actOfSegment.length - 1);
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

    const lenis = new Lenis();
    lenisRef.current = lenis;
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
      lenisRef.current = null;
      lenis.destroy();
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
    </>
  );
}
