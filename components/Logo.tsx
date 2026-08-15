// Лого SEIR в стиле фильма: золотой контур со срезанным углом — отсылка
// к светящейся границе страны из пролога, внутри — импульс тока цветом
// --arc. Знак чисто векторный, анимируется CSS-классами (лоадер):
// .logo-animate рисует контур штрихом и гоняет импульс.

type Props = {
  size?: number; // высота знака, px
  withWord?: boolean; // подпись SEIR шрифтом Unbounded
  animate?: boolean; // лоадер: прорисовка контура + бег импульса
};

export default function Logo({ size = 22, withWord = true, animate = false }: Props) {
  return (
    <span className="inline-flex items-center gap-3">
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        aria-hidden
        className={animate ? "logo-animate" : undefined}
      >
        {/* контур-«граница»: скруглённая рамка со срезанным верхним углом */}
        <path
          className="logo-contour"
          d="M22 6 H48 Q58 6 58 16 V48 Q58 58 48 58 H16 Q6 58 6 48 V22 Z"
          fill="none"
          stroke="var(--gold)"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
          pathLength="100"
        />
        {/* импульс тока */}
        <polyline
          className="logo-pulse"
          points="14,37 25,37 31,21 39,47 45,31 50,31"
          fill="none"
          stroke="var(--arc)"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
          pathLength="100"
        />
      </svg>
      {withWord && (
        <span
          className="font-display font-semibold uppercase leading-none tracking-[0.44em] text-[var(--chrome-ink,var(--ink))]"
          style={{ fontSize: Math.round(size * 0.62) }}
        >
          SEIR
        </span>
      )}
    </span>
  );
}
