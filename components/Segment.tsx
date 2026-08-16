import {
  PALETTES,
  type SceneMediaAvailability,
  type SegmentSpan,
} from "@/content/film";

type Props = {
  segment: SegmentSpan;
  index: number;
  // Наличие файлов проверяет сервер (app/(site)/page.tsx): без файла сегмент
  // остаётся градиентом и не делает ни одного сетевого запроса.
  // Без карты (undefined) считаем, что файлы есть.
  avail?: SceneMediaAvailability;
  // Мобильная ветка: собственные 9:16 файлы (reframe); при их отсутствии
  // мобилка падает на десктопный 16:9 файл (object-cover прикроет).
  mobile?: boolean;
};

// Чистый видеослой одного сегмента таймлайна. Движение живёт в самом видео:
// никаких transform и blur; на границе сегментов rAF-цикл делает жёсткую
// подмену visibility — оба видео в граничный момент показывают один кадр.
export default function Segment({ segment, index, avail, mobile = false }: Props) {
  const useMobileSrc = mobile && (avail ? avail.mobile : false);
  const hasVideo = useMobileSrc || (avail ? avail.mp4 : true);
  const hasPoster = avail ? avail.poster : true;
  const src = useMobileSrc ? segment.mobileSrc : segment.videoSrc;

  return (
    <div
      data-seg=""
      data-idx={index}
      data-t-start={segment.tStart}
      data-duration={segment.duration}
      data-vh-start={segment.vhStart}
      data-len-vh={segment.scrollVh}
      suppressHydrationWarning
      className="pointer-events-none absolute inset-0"
      // Первый сегмент виден до первого пересчёта; остальные включает
      // rAF-цикл (или пре-гидрационный скрипт при перезагрузке в середине).
      style={{
        background: PALETTES[segment.palette],
        visibility: index === 0 ? "visible" : "hidden",
        opacity: index === 0 ? 1 : 0,
        // Микро-кроссфейд подмены: на совпадающих кадрах цепи невидим,
        // микро-расхождения дублей и редкие неготовые кадры растворяет
        transition: "opacity 140ms linear",
      }}
    >
      {/* Видео поверх градиента-подложки; пока файла нет — остаётся градиент,
          <video> не рендерится вовсе. Скраббинг ведёт rAF-цикл FilmStage. */}
      {hasVideo && (
        // suppressHydrationWarning: пре-гидрационный скрипт может переключить
        // preload на auto до гидрации React
        // key: смена ветки src (десктоп ↔ мобильный reframe) пересоздаёт
        // элемент — иначе браузер не перечитает source
        <video
          key={useMobileSrc ? "m" : "d"}
          muted
          playsInline
          preload="none"
          suppressHydrationWarning
          poster={hasPoster ? segment.posterSrc : undefined}
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src={src} type="video/mp4" />
        </video>
      )}
    </div>
  );
}
