import { PHASE_CARD_VH } from "@/content/film";

type Props = {
  label: string; // моно-строка из поля label акта
  light: boolean; // перебивка перед белым актом «Якість» белая: переход в светлую часть
  startVh?: number; // начало перебивки в vh от начала фильма (только film-режим)
  layout: "film" | "vertical"; // vertical — версия для prefers-reduced-motion
};

export default function PhaseCard({ label, light, startVh = 0, layout }: Props) {
  const background = light ? "var(--paper)" : "#000";
  const line = (
    <p
      className={`font-mono text-[11px] uppercase tracking-[0.3em] ${
        light ? "text-[var(--dim-dark)]" : "text-[var(--dim)]"
      }`}
    >
      {label}
    </p>
  );

  if (layout === "vertical") {
    return (
      <div
        className="flex items-center justify-center"
        style={{ height: `${PHASE_CARD_VH}vh`, background }}
      >
        {line}
      </div>
    );
  }

  return (
    // z-10: перебивка лежит поверх сцен, чтобы подъезжающая сцена следующего
    // акта проявлялась под ней и открывалась на её уходе. Появление и уход
    // только по opacity — пишет rAF-цикл FilmStage.
    <div
      data-seg="card"
      data-start-vh={startVh}
      data-len-vh={PHASE_CARD_VH}
      suppressHydrationWarning
      className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
      style={{ opacity: 0, background }}
    >
      {line}
    </div>
  );
}
