import PhaseCard from "@/components/PhaseCard";
import Scene from "@/components/Scene";
import { PHASE_CARD_VH, type Act as ActConfig, type Cta } from "@/content/film";

type Props = {
  act: ActConfig;
  startVh: number; // начало акта в vh от начала фильма, включая его перебивку
  withCard: boolean; // перед первым актом перебивки нет
  firstAct: boolean;
  layout: "film" | "vertical"; // vertical — версия для prefers-reduced-motion
  onCta?: (cta: Cta) => void;
};

export default function Act({ act, startVh, withCard, firstAct, layout, onCta }: Props) {
  // Перебивка перед белым актом «Якість» белая, а не чёрная: это переход
  // в светлую часть (docs/build.md, шаг 3).
  const lightCard = act.palette === "white";

  if (layout === "vertical") {
    return (
      <section id={act.id}>
        {withCard && (
          <PhaseCard label={act.label} light={lightCard} layout="vertical" />
        )}
        {act.scenes.map((scene, index) => (
          <Scene
            key={scene.id}
            scene={scene}
            axis={act.axis}
            palette={act.palette}
            startVh={0}
            first={firstAct && index === 0}
            layout="vertical"
            onCta={onCta}
          />
        ))}
      </section>
    );
  }

  let cursor = startVh + (withCard ? PHASE_CARD_VH : 0);

  return (
    <>
      {withCard && (
        <PhaseCard
          label={act.label}
          light={lightCard}
          startVh={startVh}
          layout="film"
        />
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
            onCta={onCta}
          />
        );
      })}
    </>
  );
}
