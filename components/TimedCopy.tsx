"use client";

import { useState } from "react";
import {
  CHROME,
  MOBILE_LIST_LIMIT,
  type CopyBlock,
  type Cta,
} from "@/content/film";

type Props = {
  blocks: CopyBlock[];
  layout: "film" | "vertical"; // vertical — версия для prefers-reduced-motion
  mobile?: boolean; // тексты в нижней трети в плашке с blur (oneshot.md, 9)
  onCta?: (cta: Cta) => void;
};

// Телефон и почта в списках становятся ссылками tel:/mailto:
function BodyItem({ item }: { item: string }) {
  const link = (href: string) => (
    <a href={href} className="pointer-events-auto underline-offset-4 hover:underline">
      {item}
    </a>
  );
  if (item.includes("@")) return link(`mailto:${item}`);
  if (/^\+[\d\s()-]+$/.test(item)) return link(`tel:${item.replace(/\s+/g, "")}`);
  return item;
}

// Список работ: на мобиле свёрнут до MOBILE_LIST_LIMIT позиций, раскрытие —
// аккордеон внутри плашки (страница не скроллится, растёт сама плашка,
// длинный хвост уходит во внутренний скролл).
function BodyList({
  items,
  dim,
  twoColumns,
  mobile,
}: {
  items: string[];
  dim: string;
  twoColumns: boolean;
  mobile: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const collapsible = mobile && items.length > MOBILE_LIST_LIMIT;
  const shown = collapsible && !expanded ? items.slice(0, MOBILE_LIST_LIMIT) : items;
  return (
    <>
      <ul
        className={`${mobile ? "mt-2 text-[12px] leading-[1.6]" : "mt-4 text-[13px] leading-[1.85]"} max-w-[620px] font-mono ${dim} ${
          twoColumns && !mobile ? "md:columns-2 md:gap-12" : ""
        } ${collapsible && expanded ? "max-h-[38vh] overflow-y-auto pr-2" : ""}`}
      >
        {shown.map((item) => (
          <li key={item} className="break-inside-avoid">
            <BodyItem item={item} />
          </li>
        ))}
      </ul>
      {collapsible && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={`pointer-events-auto mt-2 cursor-pointer font-mono text-[10px] uppercase tracking-[0.25em] underline-offset-4 hover:underline ${dim}`}
        >
          {expanded ? CHROME.collapse : `${CHROME.showAll} · ${items.length}`}
        </button>
      )}
    </>
  );
}

// Один текстовый блок: eyebrow, заголовок в две строки, списки, счётчик, CTA.
// kind "phase" — центрированная моно-строка титра поверх движения.
export function CopyBlockView({
  block,
  mobile = false,
  onCta,
}: {
  block: CopyBlock;
  mobile?: boolean;
  onCta?: (cta: Cta) => void;
}) {
  const light = Boolean(block.light);
  const ink = light ? "text-[#02030A]" : "text-[var(--ink)]";
  const dim = light ? "text-[var(--dim-dark)]" : "text-[var(--dim)]";
  const gold = light ? "text-[var(--gold-dark)]" : "text-[var(--gold)]";

  if (block.kind === "phase") {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p
          className={`font-mono text-[11px] uppercase tracking-[0.3em] ${dim} ${light ? "" : "copy-dark"}`}
        >
          {block.label}
        </p>
      </div>
    );
  }

  // Длинные списки работ — две колонки на десктопе, одна на мобиле
  const twoColumns = (block.body?.length ?? 0) >= 6;
  const emphasizedServices = Boolean(block.counter); // аварийный блок крупнее
  const Heading = block.first ? "h1" : "h2";

  const inner = (
    <div className={`${mobile ? "" : "max-w-[860px]"} ${light ? "" : "copy-dark"}`}>
      {block.eyebrow && (
        <p
          className={`font-mono uppercase tracking-[0.3em] ${gold} ${
            mobile ? "text-[10px]" : "text-[11px]"
          }`}
        >
          {block.eyebrow}
        </p>
      )}

      {(block.titleMain || block.titleAccent) && (
        <Heading
          className={`${mobile ? "mt-2" : "mt-3"} font-display font-semibold uppercase leading-[1.08] tracking-[-0.03em] [overflow-wrap:anywhere] ${ink}`}
          style={{ fontSize: mobile ? "clamp(17px, 5vw, 22px)" : "clamp(24px, 4.1vw, 58px)" }}
        >
          {block.titleMain}
          {block.titleAccent && (
            <>
              <br />
              <span className={dim}>{block.titleAccent}</span>
            </>
          )}
        </Heading>
      )}

      {block.body?.length ? (
        <BodyList items={block.body} dim={dim} twoColumns={twoColumns} mobile={mobile} />
      ) : null}

      {block.services?.length ? (
        emphasizedServices ? (
          <div className={mobile ? "mt-2" : "mt-5"}>
            {block.services.map((service) => (
              <p
                key={service}
                className={`font-sans uppercase tracking-[0.08em] ${ink} ${
                  mobile ? "text-[11px]" : "text-[15px]"
                }`}
              >
                {service}
              </p>
            ))}
          </div>
        ) : mobile ? null : (
          <p className={`mt-4 font-mono text-[13px] leading-[1.85] ${dim}`}>
            {block.services.join(" · ")}
          </p>
        )
      ) : null}

      {block.counter && (
        <div className={`flex items-baseline gap-3 ${mobile ? "mt-2" : "mt-4"}`}>
          <p className={`font-mono ${mobile ? "text-[15px]" : "text-[22px]"} ${gold}`}>
            {block.counter.from} → {block.counter.to}
          </p>
          <p className={`font-mono text-[10px] uppercase tracking-[0.2em] ${dim}`}>
            {block.counter.caption}
          </p>
        </div>
      )}

      {block.cta && (
        <button
          type="button"
          onClick={onCta && (() => onCta(block.cta!))}
          className={`pointer-events-auto cursor-pointer rounded-full border uppercase tracking-[0.3em] backdrop-blur transition-colors duration-500 ${
            mobile ? "mt-2.5 px-4 py-1.5 text-[10px]" : "mt-6 px-6 py-3 text-[11px]"
          } ${
            light
              ? "border-[var(--dim-dark)] text-[#02030A] hover:border-[#02030A]"
              : "border-[var(--dim)] text-[var(--ink)] hover:border-[var(--ink)]"
          }`}
        >
          {block.cta.label}
        </button>
      )}
    </div>
  );

  if (mobile) {
    // Нижняя треть, плашка с blur(12px): постоянно закрывает нижнюю
    // достроенную reframe-зону кадра (oneshot.md, раздел 9)
    return (
      <div className="flex h-full w-full items-end px-4 pb-[9vh]">
        <div
          className="w-full rounded-xl p-4"
          style={{
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            background: light ? "rgba(242, 244, 247, 0.72)" : "rgba(2, 3, 10, 0.55)",
          }}
        >
          {inner}
        </div>
      </div>
    );
  }

  return <div className="flex h-full w-full items-center px-6 md:px-[8vw]">{inner}</div>;
}

// Все блоки таймлайна стопкой поверх видео. Появление на [fromT, toT] пишет
// rAF-цикл FilmStage прямыми записями стилей: только opacity + translateY.
// Формулы дублируются в пре-гидрационном скрипте page.tsx — синхронизировать.
export default function TimedCopy({ blocks, layout, mobile = false, onCta }: Props) {
  if (layout === "vertical") return null; // vertical собирает FilmStage сам
  return (
    <>
      {blocks.map((block) => (
        <div
          key={block.id}
          data-copy-block=""
          data-from-t={block.fromT}
          data-to-t={block.toT}
          suppressHydrationWarning
          className="pointer-events-none absolute inset-0 z-10"
          style={{ opacity: block.first ? 1 : 0, visibility: block.first ? "visible" : "hidden" }}
        >
          <CopyBlockView block={block} mobile={mobile} onCta={onCta} />
        </div>
      ))}
    </>
  );
}
