"use client";

import { useEffect, useState } from "react";
import ActRail from "@/components/ActRail";
import Logo from "@/components/Logo";
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
  progress: number; // 0..1 прогресс фильма — мобильная полоска пути
};

type Props = {
  sections: FilmSection[];
  mode: "film" | "vertical";
  // Мобильный хром (oneshot.md, раздел 9): шкала пути — полоска 3px без
  // подписей + бейдж текущего раздела сверху справа
  mobile?: boolean;
  onNavigate: (target: FilmSectionId | SectionId) => void;
  // rAF-цикл FilmStage пушит состояние сюда, не перерисовывая сцены.
  register?: (setter: ((state: ChromeState) => void) | null) => void;
};

export default function Chrome({
  sections,
  mode,
  mobile = false,
  onNavigate,
  register,
}: Props) {
  const [state, setState] = useState<ChromeState>({
    section: 0,
    light: false,
    scrolled: false,
    progress: 0,
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
          aria-label={CHROME.logo}
          className="cursor-pointer text-[var(--chrome-ink)] transition-colors duration-500"
        >
          <Logo size={24} />
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

      {mode === "film" && !mobile && (
        <ActRail sections={sections} active={state.section} onSelect={onNavigate} />
      )}

      {mode === "film" && mobile && (
        <>
          {/* Полоска пути 3px без подписей, заполняется прогрессом фильма */}
          <div
            aria-hidden
            className="fixed bottom-0 right-0 top-0 z-40 w-[3px] bg-[color-mix(in_srgb,var(--chrome-dim)_25%,transparent)]"
          >
            <div
              className="w-full bg-[var(--gold)]"
              style={{ height: `${(state.progress * 100).toFixed(1)}%` }}
            />
          </div>
          {/* Бейдж текущего раздела сверху справа */}
          <p className="chrome-shadow fixed right-4 top-16 z-40 rounded-full border border-[var(--chrome-dim)] px-3 py-1 font-mono text-[9px] uppercase tracking-[0.25em] text-[var(--chrome-ink)] transition-colors duration-500">
            {sections[state.section]?.title}
          </p>
        </>
      )}

      {/* Полупрозрачная подсказка скролла: появляется после лоадера
          (html.film-ready), гаснет после первых 60px скролла */}
      {mode === "film" && (
        <div
          data-scroll-hint=""
          className="chrome-shadow pointer-events-none fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 flex-col items-center gap-2"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-[var(--chrome-ink)]">
            {CHROME.scrollHint}
          </p>
          <span className="hint-line block h-6 w-px bg-[var(--chrome-ink)]" />
        </div>
      )}

      {/* Поверх всего: зерно остаётся в светлой части, виньетка выключается (CSS) */}
      <div aria-hidden className="grain pointer-events-none fixed inset-0 z-50" />
      <div aria-hidden className="vig pointer-events-none fixed inset-0 z-50" />
    </div>
  );
}
