import { MAP_TEXT } from '../../config/messages';
import type { Person } from '../../map/schema';
import { CONTROL, CONTROL_HOVER, CONTROL_ROW } from '../classes';

export interface PersonProfileTooltipProps {
  person: Person;
  label: string;
  href: string;
  onClose: () => void;
  attributeBadges?: Array<{ label: string; color: string }>;
  relatedNames?: string[];
  relatedRest?: number;
}

/**
 * 相関図の人物を押したときに出す吹き出し。
 *
 * 幅は `--sr-layout-*` の変数で指定する。`max-w-xs` のような
 * Tailwind の名前付きの幅は使えない（余白の名前と衝突して数 px になる）。
 */
export function PersonProfileTooltip({
  person,
  label,
  href,
  onClose,
  attributeBadges = [],
  relatedNames = [],
  relatedRest = 0,
}: PersonProfileTooltipProps) {
  const related = MAP_TEXT.tooltip.relatedPeople(relatedNames, relatedRest);

  return (
    <div
      className="grid max-w-[var(--sr-layout-person-tooltip-max-width)] gap-sm rounded-md border-hairline border-divider bg-overlay px-md py-sm text-sm text-muted"
      role="dialog"
      aria-label={label}
    >
      <div className="grid gap-xxs">
        <strong className="text-md font-bold text-heading">{label}</strong>
        {attributeBadges.length > 0 ? (
          <span className="flex flex-wrap gap-xxs">
            {attributeBadges.map((badge) => (
              <span
                key={badge.label}
                className="rounded-pill border-hairline border-divider bg-sunken px-xs py-xxs text-xs font-medium"
                style={{ color: badge.color }}
              >
                {badge.label}
              </span>
            ))}
          </span>
        ) : (
          <span>{MAP_TEXT.tooltip.person(label, person.attributes)}</span>
        )}
        {related && <span>{related}</span>}
      </div>

      <div className="flex flex-wrap items-center gap-xs">
        <a className={`${CONTROL} ${CONTROL_ROW} ${CONTROL_HOVER}`} href={href}>
          {MAP_TEXT.tooltip.profileLink}
        </a>
        <button type="button" className={`${CONTROL} ${CONTROL_ROW} ${CONTROL_HOVER}`} onClick={onClose}>
          {MAP_TEXT.tooltip.close}
        </button>
      </div>
    </div>
  );
}
