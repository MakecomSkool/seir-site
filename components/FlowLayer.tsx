import { useEffect, useRef } from "react";
import type { OverlayFrame, OverlayNode } from "@/components/overlayBridge";

// Линии тока: SVG-пути по траекториям проводов, импульсы бегут по мере
// прохождения сцены, а свечение и яркость реагируют на скорость скролла —
// ключевой эффект сайта (docs/build.md, шаг 6).

export default function FlowLayer({ paths }: { paths?: string[] }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !paths?.length) return;
    const pathEls = Array.from(svg.querySelectorAll<SVGPathElement>("path"));
    // Длины считаются лениво: при display:none (экраны <820px) геометрия
    // недоступна, посчитаем при первом видимом кадре
    let lengths: number[] | null = null;
    const measure = () => {
      try {
        lengths = pathEls.map((el) => {
          const length = el.getTotalLength();
          el.style.strokeDasharray = String(length * 0.08);
          return length;
        });
      } catch {
        lengths = null;
      }
    };

    let lastFilter = "";
    let lastOpacity = "";
    const lastOffsets = new Array<string>(pathEls.length).fill("");

    const node = svg as OverlayNode;
    node.filmOverlayUpdate = (frame: OverlayFrame) => {
      // Скрыт медиа-запросом (<820px) — не работаем
      if (svg.clientWidth === 0) return;
      if (!lengths) measure();
      if (!lengths) return;
      pathEls.forEach((el, index) => {
        const offset = (-frame.progress * lengths![index]).toFixed(1);
        if (offset !== lastOffsets[index]) {
          el.style.strokeDashoffset = offset;
          lastOffsets[index] = offset;
        }
      });
      // Скорость квантуется шагом 0.05: свечение заметно реагирует, но фильтр
      // не перерастеризуется каждый кадр
      const v = Math.round(Math.min(Math.abs(frame.velocity) / 3000, 1) * 20) / 20;
      const filter = `drop-shadow(0 0 ${(3 + v * 12).toFixed(1)}px var(--arc))`;
      if (filter !== lastFilter) {
        svg.style.filter = filter;
        lastFilter = filter;
      }
      const opacity = (0.55 + v * 0.45).toFixed(3);
      if (opacity !== lastOpacity) {
        svg.style.opacity = opacity;
        lastOpacity = opacity;
      }
    };

    return () => {
      delete node.filmOverlayUpdate;
    };
  }, [paths]);

  if (!paths?.length) return null;

  return (
    <svg
      ref={svgRef}
      data-film-overlay=""
      aria-hidden
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 h-full w-full mix-blend-screen"
      style={{ opacity: 0.55 }}
    >
      {paths.map((d) => (
        <path
          key={d}
          d={d}
          fill="none"
          stroke="var(--arc)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}
