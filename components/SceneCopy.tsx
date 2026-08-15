import type { Cta, Scene as SceneConfig } from "@/content/film";

type Props = {
  scene: SceneConfig;
  light: boolean; // белый акт: тёмный текст
  layout: "film" | "vertical"; // vertical — версия для prefers-reduced-motion
  first?: boolean; // первая сцена фильма: видима до гидрации, заголовок — h1
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

// Тексты сцены: eyebrow, заголовок в две строки, списки работ, счётчик, кнопка.
// В film-режиме это слой-сиблинг сцены: axis-преобразования и blur кадра его
// не трогают. Появление пишет rAF-цикл FilmStage: opacity = clamp(1 - |d|*2.1),
// translateY = d * -34px — текст уходит быстрее кадра и не мигает на границах.
export default function SceneCopy({ scene, light, layout, first = false, onCta }: Props) {
  const hasCopy =
    scene.eyebrow ||
    scene.titleMain ||
    scene.titleAccent ||
    scene.body?.length ||
    scene.services?.length ||
    scene.counter ||
    scene.cta;
  // Сцене проезда (акт II) тексты рисует карточный слой CAT (шаг 6)
  if (!hasCopy) return null;

  const ink = light ? "text-[#02030A]" : "text-[var(--ink)]";
  const dim = light ? "text-[var(--dim-dark)]" : "text-[var(--dim)]";
  const gold = light ? "text-[var(--gold-dark)]" : "text-[var(--gold)]";
  // Длинные списки работ (акт I) — две колонки на десктопе, одна на мобиле
  const twoColumns = (scene.body?.length ?? 0) >= 6;
  const emphasizedServices = Boolean(scene.counter); // I.2: отдельным блоком крупнее
  const Heading = first ? "h1" : "h2";

  return (
    <div
      data-scene-copy=""
      suppressHydrationWarning
      className="pointer-events-none absolute inset-0 z-10 flex items-center"
      style={layout === "film" ? { opacity: first ? 1 : 0 } : undefined}
    >
      <div className="w-full px-6 md:px-[8vw]">
        <div className="max-w-[860px]">
          {scene.eyebrow && (
            <p className={`font-mono text-[10px] uppercase tracking-[0.3em] ${gold}`}>
              {scene.eyebrow}
            </p>
          )}

          {(scene.titleMain || scene.titleAccent) && (
            <Heading
              className={`mt-3 font-display font-semibold uppercase leading-[1.08] tracking-[-0.03em] [overflow-wrap:anywhere] ${ink}`}
              style={{ fontSize: "clamp(24px, 4.1vw, 58px)" }}
            >
              {scene.titleMain}
              {scene.titleAccent && (
                <>
                  <br />
                  <span className={dim}>{scene.titleAccent}</span>
                </>
              )}
            </Heading>
          )}

          {scene.body?.length ? (
            <ul
              className={`mt-6 max-w-[620px] font-mono text-[12px] leading-[1.9] ${dim} ${
                twoColumns ? "md:columns-2 md:gap-12" : ""
              }`}
            >
              {scene.body.map((item) => (
                <li key={item} className="break-inside-avoid">
                  <BodyItem item={item} />
                </li>
              ))}
            </ul>
          ) : null}

          {scene.services?.length ? (
            emphasizedServices ? (
              <div className="mt-6">
                {scene.services.map((service) => (
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
                {scene.services.join(" · ")}
              </p>
            )
          ) : null}

          {scene.counter && (
            <div className="mt-4 flex items-baseline gap-4">
              <p className={`font-mono text-[22px] ${gold}`}>
                {scene.counter.from} → {scene.counter.to}
              </p>
              <p className={`font-mono text-[10px] uppercase tracking-[0.2em] ${dim}`}>
                {scene.counter.caption}
              </p>
            </div>
          )}

          {scene.cta && (
            <button
              type="button"
              onClick={onCta && (() => onCta(scene.cta!))}
              className={`pointer-events-auto mt-7 cursor-pointer rounded-full border px-6 py-3 text-[11px] uppercase tracking-[0.3em] backdrop-blur transition-colors duration-500 ${
                light
                  ? "border-[var(--dim-dark)] text-[#02030A] hover:border-[#02030A]"
                  : "border-[var(--dim)] text-[var(--ink)] hover:border-[var(--ink)]"
              }`}
            >
              {scene.cta.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
