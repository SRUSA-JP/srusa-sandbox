import { MAP_TEXT } from '../../config/messages';
import type { Person } from '../../map/schema';
import { CONTROL, CONTROL_HOVER, CONTROL_ROW } from '../classes';

export interface PersonProfileTooltipProps {
  person: Person;
  label: string;
  href: string;
  onClose: () => void;
}

/** 相関図の人物を押したときに出す吹き出し。 */
export function PersonProfileTooltip({ person, label, href, onClose }: PersonProfileTooltipProps) {
  const description = MAP_TEXT.tooltip.person(label, person.attributes);

  return (
    <div
      className="grid max-w-xs gap-sm rounded-md border-hairline border-divider bg-overlay px-md py-sm text-sm text-muted"
      role="dialog"
      aria-label={label}
    >
      <div className="grid gap-xxs">
        <strong className="text-md font-bold text-heading">{label}</strong>
        <span>{description}</span>
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
