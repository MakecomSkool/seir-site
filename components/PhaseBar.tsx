import { useEffect, useRef } from "react";
import type { PhaseBarNode } from "@/components/overlayBridge";

// Горизонтальная шкала фаз белого акта: PHASE 01..04, заполняется по мере
// прохождения акта. Показана только внутри акта, цвета тёмные по светлому.

// mobile: шкала упрощается до точек (oneshot.md, раздел 9)
export default function PhaseBar({
  labels,
  mobile = false,
}: {
  labels: string[];
  mobile?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = rootRef.current as (HTMLDivElement & PhaseBarNode) | null;
    if (!node) return;
    const labelEls = Array.from(node.querySelectorAll<HTMLElement>("[data-phase-label]"));
    let lastOpacity = "";
    let lastFill = -1;
    let lastActive = -2;

    node.filmPhaseUpdate = ({ opacity, fill }) => {
      const o = opacity.toFixed(3);
      if (o !== lastOpacity) {
        node.style.opacity = o;
        node.style.visibility = opacity <= 0 ? "hidden" : "visible";
        lastOpacity = o;
      }
      const f = Math.round(fill * 1000) / 1000;
      if (f !== lastFill && fillRef.current) {
        fillRef.current.style.width = `${(f * 100).toFixed(1)}%`;
        lastFill = f;
      }
      const active = fill <= 0 ? -1 : Math.min(labelEls.length - 1, Math.floor(fill * labelEls.length));
      if (active !== lastActive) {
        labelEls.forEach((el, i) => el.toggleAttribute("data-active", i <= active));
        lastActive = active;
      }
    };

    return () => {
      delete node.filmPhaseUpdate;
    };
  }, [labels]);

  if (!labels.length) return null;

  if (mobile) {
    return (
      <div
        ref={rootRef}
        data-phase-bar=""
        aria-hidden
        className="pointer-events-none fixed bottom-4 left-1/2 z-40 -translate-x-1/2"
        style={{ opacity: 0, visibility: "hidden" }}
      >
        <div className="flex gap-3">
          {labels.map((label) => (
            <span
              key={label}
              data-phase-label=""
              className="block h-1.5 w-1.5 rounded-full bg-[rgba(2,3,10,0.25)] transition-colors duration-500 data-active:bg-[var(--gold-dark)]"
            />
          ))}
        </div>
        {/* скрытый fill: единый filmPhaseUpdate пишет ширину, точкам она не нужна */}
        <div ref={fillRef} className="hidden" style={{ width: "0%" }} />
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      data-phase-bar=""
      aria-hidden
      className="pointer-events-none fixed bottom-5 left-1/2 z-40 w-[min(520px,56vw)] -translate-x-1/2"
      style={{ opacity: 0, visibility: "hidden" }}
    >
      <div className="flex justify-between">
        {labels.map((label) => (
          <span
            key={label}
            data-phase-label=""
            className="font-mono text-[9px] uppercase tracking-[0.25em] text-[var(--dim-dark)] transition-colors duration-500 data-active:text-[#02030A]"
          >
            {label}
          </span>
        ))}
      </div>
      <div className="mt-2 h-px w-full bg-[rgba(2,3,10,0.18)]">
        <div
          ref={fillRef}
          className="h-px bg-[var(--gold-dark)]"
          style={{ width: "0%" }}
        />
      </div>
    </div>
  );
}
