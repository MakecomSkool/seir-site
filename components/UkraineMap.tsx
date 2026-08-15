import { useEffect, useRef } from "react";
import type { OverlayFrame, OverlayNode } from "@/components/overlayBridge";
import {
  CITIES,
  insideUkraine,
  project,
  UKRAINE_PATH,
  VIEW_H,
  VIEW_W,
} from "@/components/ukraineGeo";

// Точный контур Украины (Крым в составе) поверх видео орбиты: генеративный
// кадр остаётся атмосферным фоном, география рисуется фронтом. Контур — SVG,
// огни городов — канвас в той же наклонённой плоскости. В прологе проявляется
// с прогрессом сцены (Київ загорается первым, дальше по убыванию размера);
// в эпилоге контур виден с первого кадра, огней сразу много и они ярче.

const RANDOM_POINTS = 120;
// Загорание: старт каскада и растяжка задержек по прогрессу сцены — при живом
// скролле пролога даёт стаггер порядка сотни миллисекунд на город.
// Контур при этом виден с первого кадра: прячет карту только фейд самой сцены.
const IGNITE_START = 0.02;
const IGNITE_SPREAD = 0.55;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Dot = {
  x: number; // координаты viewBox
  y: number;
  r: number;
  alpha: number;
  delay: number; // 0..1, порядок загорания
  glow: boolean;
};

function buildDots(mobile: boolean): Dot[] {
  const sorted = [...CITIES].sort((a, b) => b.weight - a.weight);
  const top = sorted[0].weight;
  const dots: Dot[] = sorted.map((city, index) => {
    const [x, y] = project(city.lng, city.lat);
    return {
      x,
      y,
      r: 1.7 + Math.sqrt(city.weight / top) * 3.6,
      alpha: 0.95,
      delay: (index / (sorted.length - 1)) * 0.5,
      // на мобиле glow только у крупнейших
      glow: mobile ? index < 6 : true,
    };
  });
  // мелкая россыпь внутри контура; детерминированная (mulberry32)
  const rnd = mulberry32(19910824);
  const randomCount = mobile ? RANDOM_POINTS / 2 : RANDOM_POINTS;
  let guard = 0;
  while (dots.length < sorted.length + randomCount && guard++ < 20000) {
    const x = rnd() * VIEW_W;
    const y = rnd() * VIEW_H;
    if (!insideUkraine(x, y)) continue;
    dots.push({
      x,
      y,
      r: 0.7 + rnd() * 1.2,
      alpha: 0.4 + rnd() * 0.45,
      delay: 0.3 + rnd() * 0.7,
      glow: false,
    });
  }
  return dots;
}

type Props = {
  lit?: boolean; // эпилог: огни уже горят и ярче
  staticLit?: boolean; // prefers-reduced-motion: статично, всё горит
};

export default function UkraineMap({ lit = false, staticLit = false }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let mobile = window.matchMedia("(max-width: 819px)").matches;
    let dots = buildDots(mobile);
    let width = 0;
    let height = 0;
    let lastDrawn = -1;
    const bright = lit || staticLit ? 1.25 : 1;

    const draw = (progress: number) => {
      if (progress === lastDrawn || width === 0) return;
      lastDrawn = progress;
      ctx.clearRect(0, 0, width, height);
      const scale = width / VIEW_W;
      for (const dot of dots) {
        const on =
          lit || staticLit
            ? 1
            : clamp01((progress - IGNITE_START - dot.delay * IGNITE_SPREAD) * 3);
        if (on <= 0.01) continue;
        const x = dot.x * scale;
        const y = dot.y * scale;
        const r = dot.r * scale * (lit ? 1.15 : 1);
        const alpha = Math.min(1, dot.alpha * on * bright);
        if (dot.glow && r > 1.5) {
          const radius = r * 5;
          const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
          glow.addColorStop(0, `rgba(255, 194, 74, ${0.3 * alpha})`);
          glow.addColorStop(1, "rgba(255, 194, 74, 0)");
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#FFC24A";
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    };

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const nextMobile = window.matchMedia("(max-width: 819px)").matches;
      if (nextMobile !== mobile) {
        mobile = nextMobile;
        dots = buildDots(mobile);
      }
      const progress = lastDrawn < 0 ? (lit || staticLit ? 1 : 0) : lastDrawn;
      lastDrawn = -1;
      draw(progress);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    if (staticLit) {
      draw(1);
      return () => observer.disconnect();
    }

    const node = root as HTMLDivElement & OverlayNode;
    node.filmOverlayUpdate = (frame: OverlayFrame) => {
      // карта видна всегда — появлением и уходом управляет фейд самой сцены;
      // по прогрессу движутся только огни
      draw(lit ? 1 : Math.round(frame.progress * 500) / 500);
    };

    return () => {
      observer.disconnect();
      delete node.filmOverlayUpdate;
    };
  }, [lit, staticLit]);

  return (
    // Плоскость карты: нижняя треть кадра, наклон «на планету».
    // overlay-keep-mobile: в отличие от прочих канвасов, на мобиле не прячется —
    // только вдвое меньше точек и упрощённый glow.
    <div
      ref={rootRef}
      data-film-overlay=""
      aria-hidden
      // Сильный наклон кладёт плоскость на материк в нижней половине кадра;
      // изгиб лимба в видео добивает иллюзию «на планете»
      className="overlay-keep-mobile pointer-events-none absolute inset-x-0 bottom-[3%] mx-auto w-[min(52vw,820px)] max-[819px]:w-[88vw]"
      style={{
        aspectRatio: `${VIEW_W} / ${VIEW_H}`,
        transform: "perspective(1100px) rotateX(52deg)",
        transformOrigin: "50% 100%",
      }}
    >
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="ua-contour absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* лёгкая заливка суши, чтобы страна читалась как форма, а не нить */}
        <path d={UKRAINE_PATH} fill="rgba(155, 220, 255, 0.05)" stroke="none" />
        <path
          d={UKRAINE_PATH}
          fill="none"
          stroke="var(--arc)"
          strokeOpacity={0.9}
          strokeWidth="1.4"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
        />
      </svg>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
