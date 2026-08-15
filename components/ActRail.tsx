import type { FilmSection, FilmSectionId } from "@/content/film";

type Props = {
  sections: FilmSection[];
  active: number; // индекс текущего раздела фильма
  onSelect: (id: FilmSectionId) => void;
};

// Шкала разделов фильма: fixed справа по центру, засечка на раздел,
// активная подсвечена --gold.
export default function ActRail({ sections, active, onSelect }: Props) {
  return (
    <div className="fixed right-4 top-1/2 z-40 flex -translate-y-1/2 flex-col items-end">
      {sections.map((section, index) => (
        // Кнопка шире засечки: тач-мишень ~48x24px при неизменном визуале
        <button
          key={section.id}
          type="button"
          aria-label={section.title}
          aria-current={index === active || undefined}
          onClick={() => onSelect(section.id)}
          className="group flex h-6 w-12 cursor-pointer items-center justify-end pr-2"
        >
          <span
            className={`block h-px transition-all duration-500 ${
              index === active
                ? "w-7 bg-[var(--gold)]"
                : "w-4 bg-[var(--chrome-dim)] group-hover:bg-[var(--chrome-ink)]"
            }`}
          />
        </button>
      ))}
    </div>
  );
}
