import Scene from "@/components/Scene";
import { PHASE_CARD_VH, type Act as ActConfig } from "@/content/film";

type Props = {
  act: ActConfig;
  startVh: number; // начало акта в vh от начала фильма, включая его перебивку
  withCard: boolean; // перед первым актом перебивки нет
  firstAct: boolean;
  layout: "film" | "vertical"; // vertical — версия для prefers-reduced-motion
};

function PhaseLabel({ label, light }: { label: string; light: boolean }) {
  return (
    <p
      className={`font-mono text-[11px] uppercase tracking-[0.3em] ${
        light ? "text-[#02030A]/60" : "text-[var(--dim)]"
      }`}
    >
      {label}
    </p>
  );
}

export default function Act({ act, startVh, withCard, firstAct, layout }: Props) {
  // Перебивка перед белым актом «Якість» белая, а не чёрная: это переход
  // в светлую часть (docs/build.md, шаг 3).
  const lightCard = act.palette === "white";
  const cardBackground = lightCard ? "var(--paper)" : "#000";

  if (layout === "vertical") {
    return (
      <>
        {withCard && (
          <div
            className="flex items-center justify-center"
            style={{ height: `${PHASE_CARD_VH}vh`, background: cardBackground }}
          >
            <PhaseLabel label={act.label} light={lightCard} />
          </div>
        )}
        {act.scenes.map((scene) => (
          <Scene
            key={scene.id}
            scene={scene}
            axis={act.axis}
            palette={act.palette}
            startVh={0}
            first={false}
            layout="vertical"
          />
        ))}
      </>
    );
  }

  let cursor = startVh + (withCard ? PHASE_CARD_VH : 0);

  return (
    <>
      {withCard && (
        // z-10: перебивка лежит поверх сцен, чтобы подъезжающая сцена следующего
        // акта проявлялась под перебивкой и открывалась на её уходе.
        <div
          data-seg="card"
          data-start-vh={startVh}
          data-len-vh={PHASE_CARD_VH}
          suppressHydrationWarning
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
          style={{ opacity: 0, background: cardBackground }}
        >
          <PhaseLabel label={act.label} light={lightCard} />
        </div>
      )}
      {act.scenes.map((scene, index) => {
        const sceneStartVh = cursor;
        cursor += scene.scrollVh;
        return (
          <Scene
            key={scene.id}
            scene={scene}
            axis={act.axis}
            palette={act.palette}
            startVh={sceneStartVh}
            first={firstAct && index === 0}
            layout="film"
          />
        );
      })}
    </>
  );
}
