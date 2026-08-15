import { useEffect, useRef, useState } from "react";
import type { CatTagNode } from "@/components/overlayBridge";
import { CHROME } from "@/content/film";

// Моно-тег CAT-XX в правом нижнем углу: берёт cats активной сцены, показывает
// по одному с интервалом 2.5 с, fade 400 мс. Клик ведёт к каталогу.

const ROTATE_MS = 2500;

const sameCats = (a: string[] | null, b: string[] | null) =>
  a === b ||
  (!!a && !!b && a.length === b.length && a.every((value, i) => value === b[i]));

export default function CatTag({ onSelect }: { onSelect: () => void }) {
  const rootRef = useRef<HTMLButtonElement>(null);
  const [cats, setCats] = useState<string[] | null>(null);
  const [index, setIndex] = useState(0);

  // rAF-цикл FilmStage пушит cats активной сцены при её смене
  useEffect(() => {
    const node = rootRef.current as (HTMLButtonElement & CatTagNode) | null;
    if (!node) return;
    node.filmCatsUpdate = (next) => {
      setCats((prev) => (sameCats(prev, next) ? prev : next ? [...next] : null));
    };
    return () => {
      delete node.filmCatsUpdate;
    };
  }, []);

  useEffect(() => {
    setIndex(0);
    if (!cats || cats.length < 2) return;
    const timer = window.setInterval(
      () => setIndex((i) => (i + 1) % cats.length),
      ROTATE_MS,
    );
    return () => window.clearInterval(timer);
  }, [cats]);

  const tag = cats ? cats[index % cats.length] : null;

  return (
    <button
      ref={rootRef}
      data-cat-tag=""
      type="button"
      onClick={onSelect}
      aria-label={CHROME.catalog}
      className={`fixed bottom-5 right-6 z-40 cursor-pointer font-mono text-[11px] tracking-[0.2em] text-[var(--gold)] transition-opacity duration-500 ${
        tag ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      {tag && (
        <span key={tag} className="cat-tag-fade inline-block">
          {tag}
        </span>
      )}
    </button>
  );
}
