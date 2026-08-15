import CatCards from "@/components/CatCards";
import CityLights from "@/components/CityLights";
import FlowLayer from "@/components/FlowLayer";
import SceneCopy from "@/components/SceneCopy";
import UkraineMap from "@/components/UkraineMap";
import {
  PALETTES,
  type Axis,
  type Cta,
  type Palette,
  type Playback,
  type Scene as SceneConfig,
  type SceneMediaAvailability,
} from "@/content/film";

type Props = {
  scene: SceneConfig;
  // Наличие файлов проверяет сервер (app/(site)/page.tsx): без файла сцена
  // остаётся градиентом и не делает ни одного сетевого запроса.
  // Без карты (undefined) считаем, что файлы есть.
  avail?: SceneMediaAvailability;
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
  avail,
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
  const hasWebm = avail ? avail.webm : true;
  const hasMp4 = avail ? avail.mp4 : true;
  const hasVideo = hasWebm || hasMp4;
  const hasPoster = avail ? avail.poster : true;

  // prefers-reduced-motion: видео не грузится вообще, показывается постер
  if (layout === "vertical") {
    return (
      <div className="relative h-screen" style={{ background: PALETTES[palette] }}>
        {hasPoster && (
          <img
            src={scene.posterSrc}
            alt=""
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        {scene.overlay === "ukraineMap" && <UkraineMap staticLit />}
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
        {/* Видео поверх градиента-подложки; пока файла нет — остаётся градиент,
            <video> не рендерится вовсе. Скраббинг и автоплей ведёт rAF-цикл
            FilmStage; при ошибке декодирования кадр не рисуется и виден градиент. */}
        {hasVideo && (
          // suppressHydrationWarning: пре-гидрационный скрипт может переключить
          // preload на auto до гидрации React
          <video
            muted
            playsInline
            preload="none"
            suppressHydrationWarning
            poster={hasPoster ? scene.posterSrc : undefined}
            className="absolute inset-0 h-full w-full object-cover"
          >
            {hasWebm && (
              <source
                src={scene.videoSrc.replace(/\.mp4$/, ".webm")}
                type="video/webm"
              />
            )}
            {hasMp4 && <source src={scene.videoSrc} type="video/mp4" />}
          </video>
        )}
        {/* Оверлеи рисует фронт поверх видео — принципиально не в видео */}
        {scene.overlay === "cityLights" && (
          <CityLights lit={scene.lightsMode === "lit"} />
        )}
        {scene.overlay === "flow" && <FlowLayer paths={scene.flowPaths} />}
        {scene.overlay === "ukraineMap" && (
          <UkraineMap lit={scene.lightsMode === "lit"} />
        )}
        {scene.overlay === "catCards" && <CatCards />}
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
