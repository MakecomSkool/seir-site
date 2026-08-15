"use client";

import { useEffect, useState } from "react";
import ActRail from "@/components/ActRail";
import { openLeadPanel } from "@/components/leadBus";
import {
  CHROME,
  type FilmSection,
  type FilmSectionId,
  type SectionId,
} from "@/content/film";

export type ChromeState = {
  section: number; // индекс текущего раздела фильма
  light: boolean; // светлая часть: инверсия цветов хрома
  scrolled: boolean; // скролл дальше 60px — прячем «прокрутіть»
};

type Props = {
  sections: FilmSection[];
  mode: "film" | "vertical";
  onNavigate: (target: FilmSectionId | SectionId) => void;
  // rAF-цикл FilmStage пушит состояние сюда, не перерисовывая сцены.
  register?: (setter: ((state: ChromeState) => void) | null) => void;
};

export default function Chrome({ sections, mode, onNavigate, register }: Props) {
  const [state, setState] = useState<ChromeState>({
    section: 0,
    light: false,
    scrolled: false,
  });

  useEffect(() => {
    register?.(setState);
    return () => register?.(null);
  }, [register]);

  // В вертикальной версии (prefers-reduced-motion) rAF-цикла нет — инверсию
  // хрома в светлой части отслеживает IntersectionObserver по якорю «Якість».
  useEffect(() => {
    if (mode !== "vertical") return;
    const anchor = document.getElementById("quality");
    if (!anchor) return;
    const observer = new IntersectionObserver(
      ([entry]) => setState((s) => ({ ...s, light: entry.isIntersecting })),
      { rootMargin: "-45% 0px -45% 0px" },
    );
    observer.observe(anchor);
    return () => observer.disconnect();
  }, [mode]);

  return (
    // suppressHydrationWarning: до гидрации классы chrome-light/chrome-scrolled
    // может успеть выставить пре-гидрационный скрипт page.tsx.
    <div
      suppressHydrationWarning
      className={`chrome ${state.light ? "chrome-light" : ""} ${
        state.scrolled ? "chrome-scrolled" : ""
      }`}
    >
      {/* Навигация: прозрачная, без подложки */}
      <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between px-6 py-5 md:px-10">
        <button
          type="button"
          onClick={() => onNavigate(sections[0].id)}
          className="cursor-pointer text-[11px] uppercase tracking-[0.44em] text-[var(--chrome-ink)] transition-colors duration-500"
        >
          {CHROME.logo}
        </button>
        <nav className="hidden items-center gap-7 md:flex">
          {CHROME.nav.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => onNavigate(item.target)}
              className="cursor-pointer text-[11px] uppercase tracking-[0.3em] text-[var(--chrome-dim)] transition-colors duration-500 hover:text-[var(--chrome-ink)]"
            >
              {item.label}
            </button>
          ))}
        </nav>
        <button
          type="button"
          onClick={openLeadPanel}
          className="cursor-pointer rounded-full border border-[var(--chrome-dim)] px-5 py-2 text-[11px] uppercase tracking-[0.3em] text-[var(--chrome-ink)] transition-colors duration-500 hover:border-[var(--chrome-ink)]"
        >
          {CHROME.cta}
        </button>
      </header>

      {mode === "film" && (
        <ActRail sections={sections} active={state.section} onSelect={onNavigate} />
      )}

      <p className="chrome-shadow fixed bottom-5 left-6 z-40 font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--chrome-dim)] transition-colors duration-500">
        {CHROME.status}
      </p>

      {mode === "film" && (
        <p
          data-scroll-hint=""
          className="chrome-shadow pointer-events-none fixed bottom-5 right-6 z-40 font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--chrome-dim)]"
        >
          {CHROME.scrollHint}
        </p>
      )}

      {/* Поверх всего: зерно остаётся в светлой части, виньетка выключается (CSS) */}
      <div aria-hidden className="grain pointer-events-none fixed inset-0 z-50" />
      <div aria-hidden className="vig pointer-events-none fixed inset-0 z-50" />
    </div>
  );
}
