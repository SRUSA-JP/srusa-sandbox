import { playerIconImage } from '../../config/playerIcons';
import { playerIconPixels } from '../../lib/playerIcon';
import { withAlpha } from '../../theme/palette';

export interface PlayerIconPlaceholderProps {
  /** 見た目を固定生成するためのプレイヤー名。 */
  name: string;
  /** 枠線と服に使う、そのカードの強調色。 */
  accent: string;
  /** 読み上げ用の説明。 */
  alt: string;
  /** 表示サイズ。tiny は活動カレンダーの枠のような、ごく小さい並びで使う。 */
  size?: 'normal' | 'large' | 'tiny';
}

/** プレイヤー名から固定生成する Minecraft 風の仮アイコン。 */
export function PlayerIconPlaceholder({ name, accent, alt, size = 'normal' }: PlayerIconPlaceholderProps) {
  const image = playerIconImage(name);
  const pixels = playerIconPixels(name, accent);
  const sizeClass =
    size === 'large'
      ? 'size-[calc(var(--sr-space-section)+var(--sr-space-xxl))]'
      : size === 'tiny'
        ? 'size-[var(--sr-layout-swatch-size)]'
        : 'size-[var(--sr-space-section)]';
  /* 極小サイズでは太い枠が絵を食ってしまうので、枠は細いほうに落とす */
  const borderClass = size === 'tiny' ? 'border-hairline' : 'border-thick';

  return (
    <div
      className={`grid ${sizeClass} place-items-center overflow-hidden ${borderClass} font-bold text-heading`}
      style={{ borderColor: accent, backgroundColor: withAlpha(accent, 0.16) }}
      role="img"
      aria-label={alt}
    >
      {image ? (
        <img
          src={`${import.meta.env.BASE_URL}${image}`}
          alt=""
          className="h-full w-full object-cover"
          draggable={false}
          aria-hidden
        />
      ) : (
        <div className="grid h-full w-full grid-cols-8 grid-rows-8" aria-hidden>
          {pixels.map((color, index) => (
            <span key={`${name}-${index}`} style={{ backgroundColor: color }} />
          ))}
        </div>
      )}
    </div>
  );
}
