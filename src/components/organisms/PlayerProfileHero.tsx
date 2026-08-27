import { relationshipLabel, type PlayerProfile } from '../../data/playerProfiles';
import type { VizTheme } from '../../theme/palette';
import { SECTION } from '../classes';
import { PlayerIconPlaceholder } from '../molecules';

export interface PlayerProfileHeroProps {
  profile: PlayerProfile;
  theme: VizTheme;
}

/**
 * プレイヤー紹介ページの先頭に置くプロフィール概要。
 *
 * 顔（PlayerIconPlaceholder）だけを出す。Minecraft のスキン画像は
 * 前後・腕・脚を並べた展開図（平らなテクスチャシート）で、顔の絵ではないので
 * ここでは使わない。
 */
export function PlayerProfileHero({ profile, theme }: PlayerProfileHeroProps) {
  const accent = theme.categorical[0] ?? theme.accent;
  const relationName = relationshipLabel(profile);

  return (
    <section className={`${SECTION} flex min-w-0 flex-wrap items-start gap-lg border-thick border-divider bg-surface p-lg`}>
      <PlayerIconPlaceholder name={profile.name} accent={accent} alt={`${profile.name} のアイコン`} size="large" />
      <div className="min-w-0">
        <p className="text-xs font-bold text-muted">PLAYER PROFILE</p>
        <h2 className="break-words text-2xl font-bold leading-tight text-heading">{profile.name}</h2>
        <div className="mt-sm flex flex-wrap gap-xs text-sm text-muted">
          {relationName && <span className="border-hairline border-divider bg-sunken px-xs py-xxs">相関図: {relationName}</span>}
          {profile.skin && <span className="border-hairline border-divider bg-sunken px-xs py-xxs">UUID: {profile.skin.uuid.slice(0, 8)}</span>}
          {profile.dailyName && <span className="border-hairline border-divider bg-sunken px-xs py-xxs">日別ログあり</span>}
        </div>
        {profile.relationship && (
          <div className="mt-md flex flex-wrap gap-xs">
            {profile.relationship.attributes.map((attribute) => (
              <span key={attribute} className="border-hairline border-divider bg-sunken px-sm py-xs text-sm font-bold text-muted">
                {attribute}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
