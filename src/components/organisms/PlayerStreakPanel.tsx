import { PLAY_STREAK_WINDOW_DAYS } from '../../config/dataRegistry';
import { playStreakMarkColors } from '../../config/colors';
import { STREAK_TEXT } from '../../config/messages';
import { playStreakSummary } from '../../lib/display';
import type { PlayStreak } from '../../lib/playStreak';
import type { VizTheme } from '../../theme/palette';
import { ICON } from '../../theme/tokens';
import { SECTION } from '../classes';
import { Note, Swatch } from '../atoms';
import { SectionHeader } from '../molecules';

export interface PlayerStreakPanelProps {
  streak: PlayStreak;
  theme: VizTheme;
}

/**
 * 連続プレイ日数。
 *
 * 数字だけだと「毎日きているのか、週末だけなのか」が分からないので、
 * 直近の日ごとの印を帯にして添える。いま続いている連なりだけを強調色にし、
 * ログインした日と休んだ日は濃さで分ける。
 */
export function PlayerStreakPanel({ streak, theme }: PlayerStreakPanelProps) {
  const accent = theme.categorical[0] ?? theme.accent;
  const colors = playStreakMarkColors(theme, accent);
  const summary = playStreakSummary(streak);

  return (
    <section className={SECTION}>
      <SectionHeader title={STREAK_TEXT.title} note={STREAK_TEXT.note} />

      {summary.hasRecord ? (
        <div className="grid gap-md border-thick border-divider bg-surface p-lg">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(112px,1fr))] gap-xs">
            {summary.tiles.map((tile) => (
              <div key={tile.label} className="grid min-w-0 gap-xxs border-hairline border-divider bg-sunken p-xs">
                <p className="truncate text-xs font-bold leading-tight text-muted">{tile.label}</p>
                <p className="truncate font-mono text-md font-bold leading-tight text-heading">{tile.value}</p>
              </div>
            ))}
          </div>

          <div className="grid min-w-0 gap-xs">
            <div className="flex flex-wrap items-baseline justify-between gap-xs">
              <p className="text-xs font-bold text-muted">{STREAK_TEXT.recent(PLAY_STREAK_WINDOW_DAYS)}</p>
              <p className="font-mono text-xs font-bold" style={{ color: streak.active ? colors.current : undefined }}>
                {summary.state}
              </p>
            </div>
            {/* 1 マス＝1 日。狭い画面では折り返して、はみ出させない */}
            <div className="flex min-w-0 flex-wrap gap-xxs">
              {streak.marks.map((mark) => (
                <span
                  key={mark.date}
                  title={STREAK_TEXT.markAlt(mark.date, mark.played)}
                  aria-label={STREAK_TEXT.markAlt(mark.date, mark.played)}
                  role="img"
                  className="flex border-hairline"
                  style={{ borderColor: colors.border }}
                >
                  <Swatch
                    size={ICON.streakMark}
                    background={
                      mark.inCurrentStreak ? colors.current : mark.played ? colors.played : colors.missed
                    }
                  />
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <Note>{STREAK_TEXT.empty}</Note>
      )}
    </section>
  );
}
