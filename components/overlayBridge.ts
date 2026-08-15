// Мост между rAF-циклом FilmStage и оверлеями. Оверлей вешает свою функцию
// обновления прямо на DOM-узел с атрибутом data-film-overlay; FilmStage находит
// узлы при монтаже и зовёт их каждый кадр. Никаких ре-рендеров React.

export type OverlayFrame = {
  t: number; // глобальное время таймлайна, секунды
  velocity: number; // сглаженная скорость скролла, px/s
};

export type OverlayNode = Element & {
  filmOverlayUpdate?: (frame: OverlayFrame) => void;
};

// Отдельные сигнатуры для оверлеев уровня фильма
export type PhaseBarNode = Element & {
  filmPhaseUpdate?: (state: { opacity: number; fill: number }) => void;
};

export type CatTagNode = Element & {
  filmCatsUpdate?: (cats: string[] | null) => void;
};
