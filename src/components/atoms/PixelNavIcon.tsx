import type { IconName } from './Icon';

const PATTERNS: Record<IconName, readonly string[]> = {
  home: ['00100', '01110', '11111', '01110', '01010'],
  game: ['00000', '01110', '11111', '10101', '01010'],
  people: ['01010', '11111', '01010', '11111', '10101'],
  record: ['01110', '10001', '10101', '10011', '01110'],
  gallery: ['11111', '10001', '10101', '10011', '11111'],
  download: ['00100', '00100', '10101', '01110', '11111'],
  upload: ['00100', '01110', '10101', '00100', '11111'],
  table: ['11111', '10101', '11111', '10101', '11111'],
  chart: ['00001', '00101', '10101', '10101', '11111'],
  reset: ['01111', '01000', '01110', '00010', '11110'],
  'zoom-in': ['01110', '10101', '11111', '10101', '01111'],
  'zoom-out': ['01110', '10001', '11111', '10001', '01111'],
  fit: ['11011', '10001', '00000', '10001', '11011'],
  move: ['00100', '01110', '11111', '01110', '00100'],
  previous: ['00100', '01100', '11111', '01100', '00100'],
  next: ['00100', '00110', '11111', '00110', '00100'],
  light: ['10101', '01110', '11111', '01110', '10101'],
  dark: ['01110', '11100', '11110', '01111', '00110'],
};

export interface PixelNavIconProps {
  name: IconName;
}

/** スマートフォン下部ナビ用の小さなドット絵アイコン。 */
export function PixelNavIcon({ name }: PixelNavIconProps) {
  const pixels = PATTERNS[name] ?? PATTERNS.home;
  return (
    <span
      aria-hidden
      className="grid size-[var(--sr-layout-mobile-nav-icon-size)] shrink-0 grid-cols-5 grid-rows-5 gap-[var(--sr-border-hairline)]"
    >
      {pixels.flatMap((row, y) =>
        [...row].map((cell, x) => (
          <span key={`${x}-${y}`} className={cell === '1' ? 'bg-current' : 'bg-transparent'} />
        )),
      )}
    </span>
  );
}
