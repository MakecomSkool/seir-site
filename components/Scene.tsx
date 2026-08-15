import SceneCopy from "@/components/SceneCopy";
import {
  PALETTES,
  type Axis,
  type Cta,
  type Palette,
  type Scene as SceneConfig,
} from "@/content/film";

type Props = {
  scene: SceneConfig;
  axis: Axis;
  palette: Palette;
  startVh: number; // начало сцены в vh от начала фильма
  first: boolean; // единственная сцена, видимая до первого пересчёта прогресса
  layout: "film" | "vertical"; // vertical — версия для prefers-reduced-motion
  onCta?: (cta: Cta) => void;
};

export default function Scene({
  scene,
  axis,
  palette,
  startVh,
  first,
  layout,
  onCta,
}: Props) {
  const light = palette === "white";

  if (layout === "vertical") {
    return (
      <div className="relative h-screen" style={{ background: PALETTES[palette] }}>
        <SceneCopy
          scene={scene}
          light={light}
          layout="vertical"
          first={first}
          onCta={onCta}
        />
      </div>
    );
  }

  // Текст — слой-сиблинг, а не потомок: axis-преобразования и blur кадра
  // на него не действуют. rAF находит его через nextElementSibling.
  return (
    <>
      <div
        data-seg="scene"
        data-axis={axis}
        data-start-vh={startVh}
        data-len-vh={scene.scrollVh}
        suppressHydrationWarning
        className="pointer-events-none absolute inset-0"
        // will-change не задаём статически: rAF-цикл вешает его только на видимые слои
        style={{
          background: PALETTES[palette],
          opacity: first ? 1 : 0,
        }}
      />
      <SceneCopy
        scene={scene}
        light={light}
        layout="film"
        first={first}
        onCta={onCta}
      />
    </>
  );
}
