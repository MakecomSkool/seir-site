import { useEffect, useRef } from "react";
import type { OverlayFrame, OverlayNode } from "@/components/overlayBridge";
import { CATALOG } from "@/content/catalog";
import { segmentSpans, SEGMENTS } from "@/content/film";

// Карточки номенклатуры для проезда по ангару (V06-V08): каждый сегмент несёт
// свою часть каталога (поле cats в конфиге), окно сегмента на таймлайне
// делится на слоты по числу его карточек. Когда объект в центре кадра, его
// карточка выезжает слева и уходит до следующего. Счётчик сквозной 01..09.
// Всё через прямые записи стилей из rAF-моста, без React-состояния.

type Window = { fromT: number; toT: number; codes: string[]; offset: number };

function buildWindows(): Window[] {
  const windows: Window[] = [];
  let offset = 0;
  for (const span of segmentSpans(SEGMENTS)) {
    if (!span.cats?.length) continue;
    windows.push({
      fromT: span.tStart,
      toT: span.tStart + span.duration,
      codes: span.cats,
      offset,
    });
    offset += span.cats.length;
  }
  return windows;
}

// Окно видимости внутри слота: вход после того, как объект вошёл в кадр,
// уход до того, как его сменил следующий
const CARD_FROM = 0.1;
const CARD_TO = 0.9;
const CARD_RAMP = 0.12;
const SLIDE_PX = 26;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export default function CatCards() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const windows = buildWindows();
    const total = windows.reduce((sum, w) => sum + w.codes.length, 0);
    const cards = Array.from(
      root.querySelectorAll<HTMLElement>("[data-cat-card]"),
    );
    const counter = root.querySelector<HTMLElement>("[data-cat-counter]");
    let lastIdx = -1;
    let lastOpacity = -1;

    const hide = () => {
      if (lastIdx >= 0) {
        const prev = cards[lastIdx];
        prev.style.opacity = "0";
        prev.style.visibility = "hidden";
        lastIdx = -1;
      }
      if (lastOpacity !== 0 && counter) counter.style.opacity = "0";
      lastOpacity = 0;
    };

    const node = root as HTMLDivElement & OverlayNode;
    node.filmOverlayUpdate = (frame: OverlayFrame) => {
      const t = frame.t;
      const win = windows.find((w) => t >= w.fromT && t < w.toT);
      if (!win) {
        hide();
        return;
      }
      const slots = win.codes.length;
      const local01 = (t - win.fromT) / (win.toT - win.fromT);
      const slot = Math.min(slots - 1, Math.floor(local01 * slots));
      const local = local01 * slots - slot;
      const idx = win.offset + slot;
      const opacity = clamp01(
        Math.min((local - CARD_FROM) / CARD_RAMP, (CARD_TO - local) / CARD_RAMP),
      );
      if (idx !== lastIdx) {
        if (lastIdx >= 0) {
          const prev = cards[lastIdx];
          prev.style.opacity = "0";
          prev.style.visibility = "hidden";
        }
        lastIdx = idx;
        lastOpacity = -1;
        if (counter) {
          counter.textContent = `${String(idx + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
        }
      }
      if (opacity === lastOpacity) return;
      lastOpacity = opacity;
      const card = cards[idx];
      if (!card) return;
      // Вход слева по ходу проезда, уход дальше влево
      const shift = (1 - opacity) * SLIDE_PX * (local < 0.5 ? -1 : -1.6);
      card.style.opacity = opacity.toFixed(3);
      card.style.visibility = opacity <= 0 ? "hidden" : "visible";
      card.style.transform = `translateX(${shift.toFixed(1)}px)`;
      if (counter) counter.style.opacity = opacity.toFixed(3);
    };

    return () => {
      delete node.filmOverlayUpdate;
    };
  }, []);

  return (
    <div
      ref={rootRef}
      data-film-overlay=""
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-[16vh] z-10 px-6 md:px-[8vw]"
    >
      <div className="relative min-h-[150px] max-w-[420px]">
        {CATALOG.map((item) => (
          <article
            key={item.code}
            data-cat-card=""
            className="absolute inset-x-0 bottom-0"
            style={{ opacity: 0, visibility: "hidden" }}
          >
            <p className="font-mono text-[11px] tracking-[0.2em] text-[var(--gold)]">
              {item.code}
            </p>
            <h3 className="mt-2 font-display text-[clamp(17px,1.6vw,22px)] font-semibold uppercase leading-[1.15] tracking-[-0.02em] text-[var(--ink)]">
              {item.title}
            </h3>
            <p className="mt-2 max-w-[360px] font-mono text-[12px] leading-[1.7] text-[var(--dim)]">
              {item.lead}
            </p>
          </article>
        ))}
      </div>
      <p
        data-cat-counter=""
        className="mt-4 font-mono text-[11px] tracking-[0.3em] text-[var(--dim)]"
        style={{ opacity: 0 }}
      >
        01 / {String(CATALOG.length).padStart(2, "0")}
      </p>
    </div>
  );
}
