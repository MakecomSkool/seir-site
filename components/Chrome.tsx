"use client";

import { useEffect, useState } from "react";
import ActRail from "@/components/ActRail";
import { openLeadPanel } from "@/components/leadBus";
import {
  CHROME,
  type Act as ActConfig,
  type ActId,
  type SectionId,
} from "@/content/film";

export type ChromeState = {
  act: number; // индекс текущего акта
  light: boolean; // белый акт: инверсия цветов хрома
  scrolled: boolean; // скролл дальше 60px — прячем «прокрутіть»
};

export type NavigateAlign = "card" | "scene";

type Props = {
  film: ActConfig[];
  mode: "film" | "vertical";
  onNavigate: (target: ActId | SectionId, align?: NavigateAlign) => void;
  // rAF-цикл FilmStage пушит состояние сюда, не перерисовывая сцены.
  register?: (setter: ((state: ChromeState) => void) | null) => void;
};

export default function Chrome({ film, mode, onNavigate, register }: Props) {
  const [state, setState] = useState<ChromeState>({
    act: 0,
    light: false,
    scrolled: false,
  });

  useEffect(() => {
    register?.(setState);
    return () => register?.(null);
  }, [register]);

  // В вертикальной версии (prefers-reduced-motion) rAF-цикла нет — инверсию
  // хрома в белом акте отслеживает IntersectionObserver по середине вьюпорта.
  useEffect(() => {
    if (mode !== "vertical") return;
    const whiteAct = film.find((act) => act.palette === "white");
    if (!whiteAct) return;
    const section = document.getElementById(whiteAct.id);
    if (!section) return;
    const observer = new IntersectionObserver(
      ([entry]) => setState((s) => ({ ...s, light: entry.isIntersecting })),
      { rootMargin: "-45% 0px -45% 0px" },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [mode, film]);

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
          onClick={() => onNavigate(film[0].id)}
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
        <ActRail film={film} active={state.act} onSelect={onNavigate} />
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

      {/* Поверх всего: зерно остаётся в белом акте, виньетка выключается (CSS) */}
      <div aria-hidden className="grain pointer-events-none fixed inset-0 z-50" />
      <div aria-hidden className="vig pointer-events-none fixed inset-0 z-50" />
    </div>
  );
}
