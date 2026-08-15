import type { Act as ActConfig, ActId } from "@/content/film";

type Props = {
  film: ActConfig[];
  active: number; // индекс текущего акта
  onSelect: (actId: ActId) => void;
};

// Шкала актов: fixed справа по центру, засечка на акт, активная подсвечена --gold.
export default function ActRail({ film, active, onSelect }: Props) {
  return (
    <div className="fixed right-4 top-1/2 z-40 flex -translate-y-1/2 flex-col items-end">
      {film.map((act, index) => (
        // Кнопка шире засечки: тач-мишень ~48x24px при неизменном визуале
        <button
          key={act.id}
          type="button"
          aria-label={act.title}
          aria-current={index === active || undefined}
          onClick={() => onSelect(act.id)}
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
