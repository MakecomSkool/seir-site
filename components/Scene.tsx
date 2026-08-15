import SceneCopy from "@/components/SceneCopy";
import {
  PALETTES,
  type Axis,
  type Cta,
  type Palette,
  type Playback,
  type Scene as SceneConfig,
} from "@/content/film";

type Props = {
  scene: SceneConfig;
  axis: Axis;
  palette: Palette;
  playback: Playback;
  startVh: number; // начало сцены в vh от начала фильма
  first: boolean; // единственная сцена, видимая до первого пересчёта прогресса
  layout: "film" | "vertical"; // vertical — версия для prefers-reduced-motion
  onCta?: (cta: Cta) => void;
};

export default function Scene({
  scene,
  axis,
  palette,
  playback,
  startVh,
  first,
  layout,
  onCta,
}: Props) {
  const light = palette === "white";
  const [scrubFrom, scrubTo] = scene.scrubWindow ?? [-0.5, 0.5];
  const [holdFrom, holdTo] = scene.axisHold ?? [0, 0];

  // prefers-reduced-motion: видео не грузится вообще, показывается постер
  if (layout === "vertical") {
    return (
      <div className="relative h-screen" style={{ background: PALETTES[palette] }}>
        <img
          src={scene.posterSrc}
          alt=""
          loading="lazy"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
          className="absolute inset-0 h-full w-full object-cover"
        />
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
        data-playback={playback}
        data-duration={scene.duration}
        data-scrub-from={scrubFrom}
        data-scrub-to={scrubTo}
        data-hold-from={holdFrom}
        data-hold-to={holdTo}
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
        {/* Видео поверх градиента-подложки; пока файла нет — остаётся градиент.
            Скраббинг и автоплей ведёт rAF-цикл FilmStage. */}
        <video
          muted
          playsInline
          preload="none"
          poster={scene.posterSrc}
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source
            src={scene.videoSrc.replace(/\.mp4$/, ".webm")}
            type="video/webm"
          />
          <source src={scene.videoSrc} type="video/mp4" />
        </video>
      </div>
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
