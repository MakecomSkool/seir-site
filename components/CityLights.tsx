import { useEffect, useRef } from "react";
import type { OverlayFrame, OverlayNode } from "@/components/overlayBridge";

// Огни городов: канвас поверх видео, ~170 точек в нижней трети кадра.
// ignite: точка с задержкой delay загорается при on = clamp((p - delay*0.55)*3),
// где p — локальный прогресс сцены. lit: все точки горят и не гаснут (эпилог).

const POINT_COUNT = 170;
const CLUSTER_COUNT = 9;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

// Детерминированный PRNG: огни лежат одинаково при каждом визите
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Point = {
  x: number; // доли кадра
  y: number;
  r: number;
  alpha: number;
  delay: number;
  glow: boolean;
};

function buildPoints(): Point[] {
  const rnd = mulberry32(20260815);
  const points: Point[] = [];
  const clusters = Array.from({ length: CLUSTER_COUNT }, () => ({
    x: 0.08 + rnd() * 0.84,
    y: 0.68 + rnd() * 0.22,
    spread: 0.03 + rnd() * 0.06,
  }));
  while (points.length < POINT_COUNT) {
    const cluster = clusters[Math.floor(rnd() * clusters.length)];
    // сумма двух случайных — мягкое сгущение к центру кластера
    const dx = (rnd() + rnd() - 1) * cluster.spread * 2;
    const dy = (rnd() + rnd() - 1) * cluster.spread;
    const x = cluster.x + dx;
    const y = cluster.y + dy;
    if (x < 0.02 || x > 0.98 || y < 0.6 || y > 0.97) continue;
    // Загорание идёт от центра кадра к краям (film.md, фронт пролога):
    // задержка растёт с расстоянием до центра нижней трети, плюс джиттер
    const distance = Math.hypot((x - 0.5) / 0.5, (y - 0.8) / 0.2);
    points.push({
      x,
      y,
      r: 0.7 + rnd() * 1.7,
      alpha: 0.45 + rnd() * 0.55,
      delay: clamp01(distance * 0.55 + rnd() * 0.3),
      glow: rnd() < 0.16,
    });
  }
  return points;
}

export default function CityLights({ lit = false }: { lit?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const points = buildPoints();

    let width = 0;
    let height = 0;
    let lastProgress = -1;

    const draw = (progress: number) => {
      if (progress === lastProgress || width === 0) return;
      lastProgress = progress;
      ctx.clearRect(0, 0, width, height);
      for (const point of points) {
        const on = lit ? 1 : clamp01((progress - point.delay * 0.55) * 3);
        if (on <= 0.01) continue;
        const x = point.x * width;
        const y = point.y * height;
        if (point.glow) {
          const radius = point.r * 7;
          const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
          glow.addColorStop(0, `rgba(255, 194, 74, ${0.28 * on * point.alpha})`);
          glow.addColorStop(1, "rgba(255, 194, 74, 0)");
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = on * point.alpha;
        ctx.fillStyle = "#FFC24A";
        ctx.beginPath();
        ctx.arc(x, y, point.r, 0, Math.PI * 2);
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
      const progress = lastProgress < 0 ? (lit ? 1 : 0) : lastProgress;
      lastProgress = -1;
      draw(progress);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const node = canvas as OverlayNode;
    node.filmOverlayUpdate = (frame: OverlayFrame) => {
      // локальный прогресс сцены приходит из FilmStage — тот же, что у видео
      const progress = lit ? 1 : frame.progress;
      draw(Math.round(progress * 500) / 500);
    };

    return () => {
      observer.disconnect();
      delete node.filmOverlayUpdate;
    };
  }, [lit]);

  return (
    <canvas
      ref={canvasRef}
      data-film-overlay=""
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
