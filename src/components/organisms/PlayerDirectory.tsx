import { figureColors } from '../../config/colors';
import { ZUKAN_TEXT } from '../../config/messages';
import { playerPath, relationshipLabel, type PlayerProfile } from '../../data/playerProfiles';
import { playerCardContent } from '../../lib/display';
import { profileAttributes } from '../../lib/playerDirectory';
import type { PlayStreak } from '../../lib/playStreak';
import type { VizTheme } from '../../theme/palette';
import { TAG } from '../classes';
import { Note } from '../atoms';
import { PlayerIconPlaceholder } from '../molecules';

export interface PlayerDirectoryProps {
  /** 出す人。絞り込みはページ側で済ませておく。 */
  profiles: PlayerProfile[];
  /**
   * 色を決めるための、絞り込む前の全員の名前。
   *
   * 絞り込んだあとの並びから色を採ると、条件を変えるたびに同じ人の色が
   * 変わってしまう。登録順を渡して固定する。
   */
  colorKeys: string[];
  /** 連続プレイ日数。ログに記録がある人だけ入っている。 */
  streaks: Map<string, PlayStreak>;
  theme: VizTheme;
}

/**
 * 図鑑の中身。人を 1 枚ずつのカードにして並べる。
 *
 * カードは丸ごと紹介ページへのリンクにする（名前だけを押させると、
 * 狭い画面で狙いにくいため）。名前は相関図のデータにある表記のまま出す。
 */
export function PlayerDirectory({ profiles, colorKeys, streaks, theme }: PlayerDirectoryProps) {
  const colorOf = figureColors(theme).series(colorKeys);

  if (profiles.length === 0) return <Note>{ZUKAN_TEXT.empty}</Note>;

  return (
    <div className="grid gap-xs grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
      {profiles.map((profile) => {
        const accent = colorOf(profile.name);
        const relationName = relationshipLabel(profile);
        const card = playerCardContent({
          attributes: profileAttributes(profile),
          hasStats: Boolean(profile.stats),
          hasDaily: Boolean(profile.dailyName),
          streak: streaks.get(profile.name) ?? null,
        });

        return (
          <a
            key={profile.slug}
            href={playerPath(profile.name)}
            aria-label={ZUKAN_TEXT.open(profile.name)}
            className="grid min-w-0 content-start gap-sm border-thick bg-surface p-md hover:bg-hover"
            style={{ borderColor: accent }}
          >
            <div className="flex min-w-0 items-center gap-sm">
              <PlayerIconPlaceholder name={profile.name} accent={accent} alt={`${profile.name} のアイコン`} />
              <div className="min-w-0">
                <span className="block truncate text-md font-bold text-heading">{profile.name}</span>
                {/* 表記が違うときだけ添える（同じなら同じ名前が 2 回並ぶだけ） */}
                {relationName && relationName !== profile.name && (
                  <span className="block truncate text-xs text-muted">{relationName}</span>
                )}
              </div>
            </div>

            {card.attributes.length > 0 && (
              <div className="flex min-w-0 flex-wrap gap-xxs">
                {card.attributes.map((attribute) => (
                  <span key={attribute} className={TAG}>
                    {attribute}
                  </span>
                ))}
                {card.overflow && <span className={TAG}>{card.overflow}</span>}
              </div>
            )}

            {card.badges.length > 0 && (
              <div className="flex min-w-0 flex-wrap gap-xxs">
                {card.badges.map((badge) => (
                  <span key={badge} className="text-xs font-bold" style={{ color: accent }}>
                    {badge}
                  </span>
                ))}
              </div>
            )}
          </a>
        );
      })}
    </div>
  );
}
