import type { CopyBlock, Cta } from "@/content/film";

type Props = {
  blocks: CopyBlock[];
  layout: "film" | "vertical"; // vertical — версия для prefers-reduced-motion
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

// Один текстовый блок: eyebrow, заголовок в две строки, списки, счётчик, CTA.
// kind "phase" — центрированная моно-строка титра поверх движения.
export function CopyBlockView({
  block,
  onCta,
}: {
  block: CopyBlock;
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
          className={`font-mono text-[11px] uppercase tracking-[0.3em] ${dim}`}
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

  return (
    <div className="flex h-full w-full items-center px-6 md:px-[8vw]">
      <div className="max-w-[860px]">
        {block.eyebrow && (
          <p className={`font-mono text-[10px] uppercase tracking-[0.3em] ${gold}`}>
            {block.eyebrow}
          </p>
        )}

        {(block.titleMain || block.titleAccent) && (
          <Heading
            className={`mt-3 font-display font-semibold uppercase leading-[1.08] tracking-[-0.03em] [overflow-wrap:anywhere] ${ink}`}
            style={{ fontSize: "clamp(24px, 4.1vw, 58px)" }}
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
          <ul
            className={`mt-6 max-w-[620px] font-mono text-[12px] leading-[1.9] ${dim} ${
              twoColumns ? "md:columns-2 md:gap-12" : ""
            }`}
          >
            {block.body.map((item) => (
              <li key={item} className="break-inside-avoid">
                <BodyItem item={item} />
              </li>
            ))}
          </ul>
        ) : null}

        {block.services?.length ? (
          emphasizedServices ? (
            <div className="mt-6">
              {block.services.map((service) => (
                <p
                  key={service}
                  className={`font-sans text-[15px] uppercase tracking-[0.08em] ${ink}`}
                >
                  {service}
                </p>
              ))}
            </div>
          ) : (
            <p className={`mt-5 font-mono text-[12px] leading-[1.9] ${dim}`}>
              {block.services.join(" · ")}
            </p>
          )
        ) : null}

        {block.counter && (
          <div className="mt-4 flex items-baseline gap-4">
            <p className={`font-mono text-[22px] ${gold}`}>
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
            className={`pointer-events-auto mt-7 cursor-pointer rounded-full border px-6 py-3 text-[11px] uppercase tracking-[0.3em] backdrop-blur transition-colors duration-500 ${
              light
                ? "border-[var(--dim-dark)] text-[#02030A] hover:border-[#02030A]"
                : "border-[var(--dim)] text-[var(--ink)] hover:border-[var(--ink)]"
            }`}
          >
            {block.cta.label}
          </button>
        )}
      </div>
    </div>
  );
}

// Все блоки таймлайна стопкой поверх видео. Появление на [fromT, toT] пишет
// rAF-цикл FilmStage прямыми записями стилей: только opacity + translateY.
// Формулы дублируются в пре-гидрационном скрипте page.tsx — синхронизировать.
export default function TimedCopy({ blocks, layout, onCta }: Props) {
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
          <CopyBlockView block={block} onCta={onCta} />
        </div>
      ))}
    </>
  );
}
