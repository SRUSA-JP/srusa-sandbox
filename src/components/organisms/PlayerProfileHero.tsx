import { playerIconImage } from '../../config/playerIcons';
import { playerSkinPath } from '../../data/playerDb';
import { relationshipLabel, type PlayerProfile } from '../../data/playerProfiles';
import type { VizTheme } from '../../theme/palette';
import { SECTION } from '../classes';
import { PlayerIconPlaceholder } from '../molecules';

export interface PlayerProfileHeroProps {
  profile: PlayerProfile;
  theme: VizTheme;
}

/** プレイヤー紹介ページの先頭に置くプロフィール概要。 */
export function PlayerProfileHero({ profile, theme }: PlayerProfileHeroProps) {
  const accent = theme.categorical[0] ?? theme.accent;
  const skin = playerSkinPath(profile.name);
  const icon = playerIconImage(profile.name);
  const relationName = relationshipLabel(profile);

  return (
    <section className={`${SECTION} grid gap-lg border-thick border-divider bg-surface p-lg lg:grid-cols-[minmax(0,0.78fr)_minmax(220px,0.42fr)]`}>
      <div className="flex min-w-0 flex-wrap items-start gap-lg">
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
      </div>

      <div className="grid min-w-0 gap-sm sm:grid-cols-[auto_minmax(0,1fr)] lg:grid-cols-1">
        {skin ? (
          <img
            src={`${import.meta.env.BASE_URL}${skin}`}
            alt={`${profile.name} の Minecraft スキン`}
            className="h-48 w-full border-thick border-divider bg-sunken object-contain [image-rendering:pixelated]"
          />
        ) : icon ? (
          <img
            src={`${import.meta.env.BASE_URL}${icon}`}
            alt={`${profile.name} の Minecraft アイコン`}
            className="aspect-square h-40 border-thick border-divider bg-sunken object-cover [image-rendering:pixelated]"
          />
        ) : (
          <div className="grid h-40 place-items-center border-thick border-divider bg-sunken text-sm text-muted">NO SKIN</div>
        )}
      </div>
    </section>
  );
}
