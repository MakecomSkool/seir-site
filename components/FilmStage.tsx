"use client";

import { useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import Act from "@/components/Act";
import {
  FADE_VH,
  PHASE_CARD_VH,
  totalScrollVh,
  type Act as ActConfig,
} from "@/content/film";

export default function FilmStage({ film }: { film: ActConfig[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const totalVh = totalScrollVh(film);

  let offset = 0;
  const acts = film.map((act, index) => {
    const withCard = index > 0;
    const startVh = offset;
    offset +=
      (withCard ? PHASE_CARD_VH : 0) +
      act.scenes.reduce((sum, scene) => sum + scene.scrollVh, 0);
    return { act, startVh, withCard };
  });

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const wrap = wrapRef.current;
    const stage = stageRef.current;
    if (!wrap || !stage) return;

    const segments = Array.from(
      stage.querySelectorAll<HTMLElement>("[data-start-vh]"),
    ).map((el) => ({ el, startVh: Number(el.dataset.startVh) }));
    const opacities = new Array<number>(segments.length).fill(0);

    // px в одном CSS vh: меряем по спейсеру, а не по innerHeight, чтобы не
    // расходиться с CSS при сворачивании адресной строки на мобильных.
    let vhUnit = wrap.offsetHeight / totalVh;
    const onResize = () => {
      vhUnit = wrap.offsetHeight / totalVh;
    };
    window.addEventListener("resize", onResize);

    const applyScroll = () => {
      if (!vhUnit) return;
      const posVh = Math.max(0, window.scrollY) / vhUnit;
      let top = 0;
      for (let i = 0; i < segments.length; i++) {
        const o = Math.min(1, Math.max(0, 1 + (posVh - segments[i].startVh) / FADE_VH));
        opacities[i] = o;
        if (o >= 1) top = i;
      }
      for (let i = 0; i < segments.length; i++) {
        // Слои ниже верхнего непрозрачного всё равно не видны — прячем, чтобы не красить весь стек.
        const hidden = opacities[i] === 0 || i < top;
        segments[i].el.style.opacity = String(opacities[i]);
        segments[i].el.style.visibility = hidden ? "hidden" : "visible";
      }
    };

    const lenis = new Lenis();
    let frame = 0;
    const update = (time: number) => {
      lenis.raf(time);
      applyScroll();
      frame = requestAnimationFrame(update);
    };
    applyScroll();
    frame = requestAnimationFrame(update);

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [film, reducedMotion, totalVh]);

  // prefers-reduced-motion: обычная вертикальная страница, без спейсера,
  // sticky-стека и rAF-цикла. Полноценная версия, не заглушка.
  if (reducedMotion) {
    return (
      <div>
        {acts.map(({ act, withCard }) => (
          <Act
            key={act.id}
            act={act}
            startVh={0}
            withCard={withCard}
            firstAct={false}
            layout="vertical"
          />
        ))}
      </div>
    );
  }

  return (
    <div ref={wrapRef} data-film-total={totalVh} style={{ height: `${totalVh}vh` }}>
      <div ref={stageRef} className="sticky top-0 h-screen overflow-hidden">
        {acts.map(({ act, startVh, withCard }, index) => (
          <Act
            key={act.id}
            act={act}
            startVh={startVh}
            withCard={withCard}
            firstAct={index === 0}
            layout="film"
          />
        ))}
      </div>
    </div>
  );
}
