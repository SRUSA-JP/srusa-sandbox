import { playerPath, type PlayerProfile } from '../../data/playerProfiles';
import { CONTROL, CONTROL_HOVER, CONTROL_ROW, SECTION } from '../classes';
import { Note } from '../atoms';

export interface PlayerRelationshipPanelProps {
  profile: PlayerProfile;
}

/** プレイヤーと相関図データの接続を表示するパネル。 */
export function PlayerRelationshipPanel({ profile }: PlayerRelationshipPanelProps) {
  if (!profile.relationship) return <Note>相関図データにはまだ対応する人物がありません。</Note>;
  return (
    <section className={SECTION}>
      <h2 className="mb-sm text-lg font-bold text-heading">相関図でのつながり</h2>
      <div className="grid gap-sm border-thick border-divider bg-surface p-md">
        <div className="flex flex-wrap gap-xs">
          {profile.relationship.attributes.map((attribute) => (
            <span key={attribute} className="border-hairline border-divider bg-sunken px-sm py-xs text-sm text-muted">
              {attribute}
            </span>
          ))}
        </div>
        {profile.relatedPeople.length > 0 ? (
          <div className="grid gap-xs sm:grid-cols-2">
            {profile.relatedPeople.map((person) => (
              <a
                key={person.id}
                href={playerPath(person.onlineName)}
                className={`${CONTROL} ${CONTROL_ROW} ${CONTROL_HOVER} min-w-0 justify-between`}
              >
                <span className="truncate">{person.onlineName}</span>
                <span className="shrink-0 text-xs text-muted">{person.attributes.slice(0, 2).join(' / ')}</span>
              </a>
            ))}
          </div>
        ) : (
          <Note>直接の関係線はまだありません。</Note>
        )}
      </div>
    </section>
  );
}
