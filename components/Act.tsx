import {
  PALETTES,
  PHASE_CARD_VH,
  type Act as ActConfig,
  type Scene,
} from "@/content/film";

type Props = {
  act: ActConfig;
  startVh: number; // начало акта в vh от начала фильма, включая его перебивку
  withCard: boolean; // перед первым актом перебивки нет
  firstAct: boolean;
  layout: "film" | "vertical"; // vertical — версия для prefers-reduced-motion
};

function PhaseLabel({ label }: { label: string }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--dim)]">
      {label}
    </p>
  );
}

// Временная маркировка заглушки, уйдёт вместе с градиентами при появлении видео.
function SceneMarker({ scene, light }: { scene: Scene; light: boolean }) {
  return (
    <p
      className={`absolute bottom-6 left-6 font-mono text-[10px] uppercase tracking-[0.2em] ${
        light ? "text-black/45" : "text-white/45"
      }`}
    >
      {scene.id} · {scene.titleMain} {scene.titleAccent}
    </p>
  );
}

export default function Act({ act, startVh, withCard, firstAct, layout }: Props) {
  const light = act.palette === "white";

  if (layout === "vertical") {
    return (
      <>
        {withCard && (
          <div
            className="flex items-center justify-center bg-black"
            style={{ height: `${PHASE_CARD_VH}vh` }}
          >
            <PhaseLabel label={act.label} />
          </div>
        )}
        {act.scenes.map((scene) => (
          <div
            key={scene.id}
            className="relative h-screen"
            style={{ background: PALETTES[act.palette] }}
          >
            <SceneMarker scene={scene} light={light} />
          </div>
        ))}
      </>
    );
  }

  let cursor = startVh + (withCard ? PHASE_CARD_VH : 0);

  return (
    <>
      {withCard && (
        <div
          data-start-vh={startVh}
          data-len-vh={PHASE_CARD_VH}
          suppressHydrationWarning
          className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black"
          style={{ opacity: 0 }}
        >
          <PhaseLabel label={act.label} />
        </div>
      )}
      {act.scenes.map((scene, index) => {
        const sceneStartVh = cursor;
        cursor += scene.scrollVh;
        return (
          <div
            key={scene.id}
            data-start-vh={sceneStartVh}
            data-len-vh={scene.scrollVh}
            suppressHydrationWarning
            className="pointer-events-none absolute inset-0"
            style={{
              background: PALETTES[act.palette],
              opacity: firstAct && index === 0 ? 1 : 0,
            }}
          >
            <SceneMarker scene={scene} light={light} />
          </div>
        );
      })}
    </>
  );
}
