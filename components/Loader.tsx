"use client";

import { useEffect, useState } from "react";
import Logo from "@/components/Logo";

// Экран загрузки: анимированное лого на фоне --ground, пока в фоне греются
// шрифты и видео первых сегментов. Уходит fade-ом; после ухода html получает
// класс film-ready — по нему проявляется полупрозрачная подсказка скролла.

const MIN_SHOW_MS = 900; // короче — лого мигнёт и будет выглядеть сбоем
const MAX_WAIT_MS = 6000; // сеть медленная: показываем фильм, догрузится сам
const FADE_MS = 700;

export default function Loader() {
  const [closing, setClosing] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const startedAt = performance.now();

    const firstVideosReady = () => {
      const videos = Array.from(
        document.querySelectorAll<HTMLVideoElement>("[data-seg] video"),
      ).slice(0, 2);
      // Файлов нет (заглушки-градиенты) — ждать нечего
      if (videos.length === 0) return true;
      return videos.every((video) => video.readyState >= 3);
    };

    const finish = () => {
      if (cancelled) return;
      setClosing(true);
      document.documentElement.classList.add("film-ready");
      window.setTimeout(() => {
        if (!cancelled) setDone(true);
      }, FADE_MS);
    };

    // Перезагрузка в середине фильма: контент уже под скроллом, лоадер
    // только мешает — уходим сразу после минимальной выдержки
    const midFilm = window.scrollY > 100;

    const tick = () => {
      if (cancelled) return;
      const elapsed = performance.now() - startedAt;
      const ready =
        midFilm || (document.fonts?.status === "loaded" && firstVideosReady());
      if ((ready && elapsed >= MIN_SHOW_MS) || elapsed >= MAX_WAIT_MS) {
        finish();
        return;
      }
      window.setTimeout(tick, 150);
    };

    // Пинаем прогрев первых видео, не дожидаясь rAF-цикла
    document.fonts?.ready.catch(() => {});
    Array.from(
      document.querySelectorAll<HTMLVideoElement>("[data-seg] video"),
    )
      .slice(0, 2)
      .forEach((video) => {
        if (video.preload !== "auto") {
          video.preload = "auto";
          if (video.readyState === 0) video.load();
        }
      });
    tick();

    return () => {
      cancelled = true;
    };
  }, []);

  if (done) return null;

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6"
      style={{
        background: "var(--ground)",
        opacity: closing ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease`,
        pointerEvents: closing ? "none" : "auto",
      }}
    >
      <Logo size={72} withWord={false} animate />
      <span className="font-display font-semibold uppercase tracking-[0.44em] text-[13px] text-[var(--ink)]">
        SEIR
      </span>
    </div>
  );
}
