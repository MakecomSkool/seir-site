import {
  PALETTES,
  type Axis,
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
};

// Временная маркировка заглушки, уйдёт вместе с градиентами при появлении видео.
function SceneMarker({ scene, light }: { scene: SceneConfig; light: boolean }) {
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

export default function Scene({ scene, axis, palette, startVh, first, layout }: Props) {
  const light = palette === "white";

  if (layout === "vertical") {
    return (
      <div className="relative h-screen" style={{ background: PALETTES[palette] }}>
        <SceneMarker scene={scene} light={light} />
      </div>
    );
  }

  return (
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
    >
      <SceneMarker scene={scene} light={light} />
    </div>
  );
}
