import { useMemo, useState } from 'react';
import { PLAYER_DAILY_DEFAULT_METRIC } from '../../config/dataRegistry';
import {
  loadPlayerDailyDocument,
  PLAYER_DAILY_CATEGORY_KEY,
  PLAYER_DAILY_METRICS,
  playerDailyMetricOption,
  type PlayerDailyMetricKey,
} from '../../data/playerDaily';
import {
  playerDailyProfileTimeline,
  playerDailyProfileTotals,
  playerLastActive,
  type PlayerProfile,
} from '../../data/playerProfiles';
import { joinNotes } from '../../lib/display';
import { formatCompact, formatDecimal, formatHours } from '../../lib/format';
import type { VizTheme } from '../../theme/palette';
import { Note, Picker } from '../atoms';
import { ChartCard } from './ChartCard';
import { TrendLineChart } from './TrendLineChart';

function periodLabel(from: string, to: string): string {
  return `${from.slice(5, 10)} -> ${to.slice(5, 10)}`;
}

export interface PlayerDailyPanelProps {
  profile: PlayerProfile;
  theme: VizTheme;
}

/** バックアップ差分から見たプレイヤー別の日別ログ。 */
export function PlayerDailyPanel({ profile, theme }: PlayerDailyPanelProps) {
  const doc = useMemo(() => loadPlayerDailyDocument(), []);
  const [metric, setMetric] = useState<PlayerDailyMetricKey>(PLAYER_DAILY_DEFAULT_METRIC);
  const totals = playerDailyProfileTotals(doc, profile);
  const last = playerLastActive(doc, profile);
  const option = playerDailyMetricOption(metric);
  const timeline = playerDailyProfileTimeline(doc, profile, metric);

  if (!totals) return <Note>このプレイヤーの日別ログはまだありません。</Note>;

  return (
    <ChartCard
      title="日別ログ"
      note={joinNotes(
        `バックアップ間の差分から、このプレイヤーだけの伸び方を表示します。更新 ${doc.generated_on}`,
        doc.playtime_source ? `プレイ時間はログの入退室から再計算しています（${doc.playtime_source}）。` : undefined,
        'バックアップは毎日は取っていないので、間が空いた区間はその日数ぶんの合計です（横軸に「n日分」と出ます）。',
        last ? ` 直近活動: ${periodLabel(last.from, last.to)}` : undefined,
      )}
      actions={<Picker label="指標" value={metric} options={PLAYER_DAILY_METRICS} onChange={setMetric} />}
    >
      <div className="grid gap-md lg:grid-cols-[minmax(180px,0.35fr)_minmax(0,1fr)]">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(112px,1fr))] gap-xs lg:grid-cols-1">
          {(['playtime_hours', 'distance_km', 'blocks_mined', 'mob_kills', 'items_used', 'chests_opened'] as const).map((key) => (
            <div key={key} className="border-hairline border-divider bg-sunken p-sm">
              <p className="truncate text-xs font-bold text-muted">{playerDailyMetricOption(key).label}</p>
              <p className="font-mono text-md font-bold text-heading">
                {key === 'playtime_hours'
                  ? formatHours(totals[key])
                  : key === 'distance_km'
                    ? `${formatDecimal(totals[key])} km`
                    : formatCompact(totals[key])}
              </p>
            </div>
          ))}
        </div>
        <TrendLineChart data={timeline} theme={theme} categoryKey={PLAYER_DAILY_CATEGORY_KEY} unit={option.unit} />
      </div>
    </ChartCard>
  );
}
