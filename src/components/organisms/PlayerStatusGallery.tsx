import { useState } from 'react';
import { BASIS_OPTIONS } from '../../config';
import { RADAR } from '../../config/charts';
import { skinnedFontSize } from '../../config/skins';
import { radarLayout, radarPolygonPoints } from '../../lib/radar';
import { playerDataHighlightColors, playerDataHighlightLevel } from '../../config/colors';
import type { PlayerMetricId, PlayerStatus, PlayerStatusMetric, PlaystyleId } from '../../lib/statsExperience';
import type { RateBasis } from '../../lib/selectors';
import { playstyleAxisOrder, unitFor } from '../../lib/display';
import { formatCompact, formatDecimal, formatHours, formatInt } from '../../lib/format';
import { withAlpha, type VizTheme } from '../../theme/palette';
import { SECTION } from '../classes';
import { Picker } from '../atoms';
import { PlayerIconPlaceholder, SectionHeader } from '../molecules';

export interface PlayerStatusText {
  title: string;
  note: string;
  primary: string;
  rarest: string;
  level: (level: number) => string;
  skinAlt: (name: string) => string;
  selectPlayer: string;
  selectPlayerAlt: (name: string) => string;
  basis: string;
  styles: Record<PlaystyleId, string>;
  /** レーダーの軸に出す短い名前。 */
  stylesShort: Record<PlaystyleId, string>;
  descriptions: Record<PlaystyleId, string>;
  achievementTitles: Record<PlaystyleId | 'diamond' | 'fallen', string>;
  metrics: Record<PlayerMetricId, string>;
}

export interface PlayerStatusGalleryProps {
  players: PlayerStatus[];
  text: PlayerStatusText;
  theme: VizTheme;
  basis: RateBasis;
  onBasisChange: (basis: RateBasis) => void;
  selectedName?: string;
  onSelectedNameChange?: (name: string) => void;
  profileHref?: (name: string) => string;
}

/**
 * 軸に出す文字。
 *
 * 短い名前とその値を 1 つの文字列にする（幅の見積りと描画を同じ文字列で行うため）。
 * 順位ではなく値を出すのは、形の膨らみと数字が同じものを指すようにするため。
 */
function axisLabel(name: string, value: number): string {
  return `${name}:${value}`;
}

function PlaystyleRadar({
  player,
  text,
  accent,
  theme,
}: {
  player: PlayerStatus;
  text: PlayerStatusText;
  accent: string;
  theme: VizTheme;
}) {
  /* 軸はプレイヤーによらず同じ順番。強弱は形と、軸に添えた値で読ませる */
  const axisScores = playstyleAxisOrder(player.scores);
  /* 名前が枠からはみ出さない半径を先に決める。字数が増えれば多角形が小さくなる */
  const layout = radarLayout({
    labels: axisScores.map((score) => axisLabel(text.stylesShort[score.id], score.value)),
    size: RADAR.size,
    fontSize: skinnedFontSize(RADAR.fontSize),
    padding: RADAR.padding,
    gap: RADAR.labelGap,
  });
  const ariaLabel = axisScores
    .map((score) => `${text.styles[score.id]} ${score.value}`)
    .join(' / ');

  return (
    <div className="border-hairline border-divider bg-sunken p-xs" aria-label={ariaLabel}>
      {/*
        文字も SVG の座標で描くので、枠を広げると文字まで一緒に大きくなる。
        図の設計寸法で頭打ちにして、どの画面でも同じ大きさで読ませる。
      */}
      <svg
        viewBox={`0 0 ${layout.size} ${layout.size}`}
        role="img"
        className="mx-auto block aspect-square w-full max-w-[var(--sr-layout-playstyle-radar-size)]"
      >
        {RADAR.rings.map((ring) => (
          <polygon
            key={ring}
            points={radarPolygonPoints(layout, ring)}
            fill="none"
            stroke={theme.border}
            strokeWidth={RADAR.gridStrokeWidth}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {layout.axes.map((axis, index) => (
          <g key={axisScores[index].id}>
            <line
              x1={layout.center}
              y1={layout.center}
              x2={axis.vertex.x}
              y2={axis.vertex.y}
              stroke={theme.border}
              strokeWidth={RADAR.gridStrokeWidth}
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={axis.labelPoint.x}
              y={axis.labelPoint.y}
              textAnchor={axis.anchor}
              dominantBaseline="central"
              fill={theme.textSecondary}
              fontSize={layout.fontSize}
              fontWeight={RADAR.labelFontWeight}
            >
              {axis.label}
            </text>
          </g>
        ))}
        <polygon
          points={radarPolygonPoints(layout, axisScores.map((score) => score.value / 100))}
          fill={withAlpha(accent, RADAR.fillAlpha)}
          stroke={accent}
          strokeWidth={RADAR.shapeStrokeWidth}
          vectorEffect="non-scaling-stroke"
        />
        {layout.axes.map((axis, index) => {
          const ratio = axisScores[index].value / 100;
          return (
            <circle
              key={axisScores[index].id}
              cx={layout.center + (axis.vertex.x - layout.center) * ratio}
              cy={layout.center + (axis.vertex.y - layout.center) * ratio}
              r={RADAR.dotRadius}
              fill={accent}
            />
          );
        })}
      </svg>
    </div>
  );
}

const PLAYER_METRIC_UNITS: Record<PlayerMetricId, string> = {
  playtime: '',
  distance: ' km',
  deaths: ' 回',
  mobKills: ' 体',
  blocksMined: ' 個',
  advancements: ' 件',
};

function formatMetricValue(metric: PlayerStatusMetric, basis: RateBasis): string {
  switch (metric.id) {
    case 'playtime':
      return formatHours(metric.value);
    case 'distance':
      return `${formatCompact(metric.value)}${unitFor(PLAYER_METRIC_UNITS.distance, basis)}`;
    case 'blocksMined':
      return `${formatCompact(metric.value)}${unitFor(PLAYER_METRIC_UNITS.blocksMined, basis)}`;
    default:
      return `${basis === 'total' ? formatInt(metric.value) : formatDecimal(metric.value)}${unitFor(
        PLAYER_METRIC_UNITS[metric.id],
        basis,
      )}`;
  }
}

function PlayerStatTile({
  label,
  metric,
  accent,
  total,
  theme,
  basis,
}: {
  label: string;
  metric: PlayerStatusMetric;
  accent: string;
  total: number;
  theme: VizTheme;
  basis: RateBasis;
}) {
  const level = playerDataHighlightLevel({ rank: metric.rank, averageRatio: metric.averageRatio });
  const colors = playerDataHighlightColors(theme, level, accent);
  return (
    <div
      className="grid min-w-0 gap-xxs border-hairline p-xs"
      style={{ borderColor: colors.border, backgroundColor: colors.fill }}
    >
      <div className="flex min-w-0 items-start justify-between gap-xs">
        <p className="truncate text-xs font-bold leading-tight text-muted">{label}</p>
        <p className="shrink-0 font-mono text-xs font-bold leading-tight" style={{ color: colors.text }}>
          #{metric.rank}/{total}
        </p>
      </div>
      <p className="truncate font-mono text-md font-bold leading-tight text-heading">
        {formatMetricValue(metric, metric.id === 'playtime' ? 'total' : basis)}
      </p>
      <div className="h-[calc(var(--sr-border-thick)*2)] bg-surface" aria-hidden>
        <div className="h-full" style={{ width: `${metric.percentOfMax}%`, backgroundColor: colors.bar }} />
      </div>
      <p className="truncate text-xs leading-tight text-muted">AVG x{formatDecimal(metric.averageRatio)}</p>
    </div>
  );
}

function PlayerStatusCard({
  player,
  text,
  accent,
  theme,
  totalPlayers,
  basis,
  profileHref,
}: {
  player: PlayerStatus;
  text: PlayerStatusText;
  accent: string;
  theme: VizTheme;
  totalPlayers: number;
  basis: RateBasis;
  profileHref?: (name: string) => string;
}) {
  const href = profileHref?.(player.name);
  return (
    <article className="grid gap-lg border-thick border-divider bg-surface p-lg lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
      <div className="grid min-w-0 gap-md">
        <div className="flex min-w-0 items-start gap-md">
          <PlayerIconPlaceholder name={player.name} accent={accent} alt={text.skinAlt(player.name)} size="large" />
          <div className="min-w-0">
            <h3 className="truncate text-2xl font-bold leading-tight text-heading">
              {href ? <a href={href} className="hover:underline">{player.name}</a> : player.name}
            </h3>
            <p className="font-mono text-md font-bold text-muted">{text.achievementTitles[player.title]}</p>
            <p className="mt-xxs text-sm text-muted">{text.level(player.level)}</p>
          </div>
        </div>

        <div className="border-hairline border-divider bg-sunken p-md">
          <p className="text-xs font-bold text-muted">{text.primary}</p>
          <p className="font-mono text-lg font-bold leading-tight text-heading">{text.styles[player.primary]}</p>
          <p className="mt-xs text-sm leading-base text-muted">{text.descriptions[player.description]}</p>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(112px,1fr))] gap-xs">
          {player.metrics.map((metric) => (
            <PlayerStatTile
              key={metric.id}
              label={text.metrics[metric.id]}
              metric={metric}
              accent={accent}
              total={totalPlayers}
              theme={theme}
              basis={basis}
            />
          ))}
        </div>
      </div>

      <div className="grid min-w-0 gap-md sm:grid-cols-[minmax(var(--sr-layout-playstyle-radar-size),0.72fr)_minmax(0,1fr)]">
        <PlaystyleRadar player={player} text={text} accent={accent} theme={theme} />
        <div className="grid content-center gap-xs border-hairline border-divider bg-sunken p-xs">
          <div className="mb-xxs grid gap-xxs border-b-hairline border-divider pb-xs">
            <p className="text-xs font-bold text-muted">{text.rarest}</p>
            <p className="font-mono text-md font-bold leading-tight text-heading">
              {text.styles[player.rarest]} #{player.rarestRank}
            </p>
          </div>
            {player.scores.map((score) => (
              <div key={score.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-sm text-sm">
                <span className="truncate font-bold text-muted">{text.styles[score.id]}</span>
                <span className="font-mono font-bold text-heading">{score.value}</span>
                <span className="col-span-2 h-[calc(var(--sr-border-thick)*2)] bg-surface">
                  <span
                    className="block h-full"
                    style={{
                      width: `${score.value}%`,
                      backgroundColor: score.rank === 1 ? accent : withAlpha(accent, 0.52),
                    }}
                  />
                </span>
              </div>
            ))}
        </div>
      </div>
    </article>
  );
}

/** プレイヤーごとの遊び方をステータスカードとして比較する。 */
export function PlayerStatusGallery({
  players,
  text,
  theme,
  basis,
  onBasisChange,
  selectedName,
  onSelectedNameChange,
  profileHref,
}: PlayerStatusGalleryProps) {
  const [internalSelectedName, setInternalSelectedName] = useState(players[0]?.name ?? '');
  const activeName = selectedName ?? internalSelectedName;
  const selectPlayer = onSelectedNameChange ?? setInternalSelectedName;
  const selectedPlayer = players.find((player) => player.name === activeName) ?? players[0];
  const selectedIndex = Math.max(
    0,
    players.findIndex((player) => player.name === selectedPlayer?.name),
  );
  const selectedAccent = theme.categorical[selectedIndex % theme.categorical.length] ?? theme.accent;

  if (!selectedPlayer) return null;

  return (
    <section className={SECTION}>
      <SectionHeader
        title={text.title}
        note={text.note}
        actions={<Picker label={text.basis} value={basis} options={BASIS_OPTIONS} onChange={onBasisChange} />}
      />
      <PlayerStatusCard
        player={selectedPlayer}
        text={text}
        accent={selectedAccent}
        theme={theme}
        totalPlayers={players.length}
        basis={basis}
        profileHref={profileHref}
      />

      <div className="mt-lg">
        <p className="mb-sm text-sm font-bold text-muted">{text.selectPlayer}</p>
        <div className="flex gap-sm overflow-x-auto pb-sm" role="listbox" aria-label={text.selectPlayer}>
          {players.map((player, playerIndex) => {
            const accent = theme.categorical[playerIndex % theme.categorical.length] ?? theme.accent;
            const selected = player.name === selectedPlayer.name;
            return (
              <button
                key={player.name}
                type="button"
                className={`shrink-0 border-thick bg-surface p-xs ${
                  selected ? 'border-focus' : 'border-divider hover:bg-hover'
                }`}
                onClick={() => selectPlayer(player.name)}
                aria-label={text.selectPlayerAlt(player.name)}
                aria-selected={selected}
                role="option"
              >
                <PlayerIconPlaceholder name={player.name} accent={accent} alt={text.skinAlt(player.name)} />
                <span className="mt-xxs block max-w-[var(--sr-space-section)] truncate text-xs text-muted">
                  {player.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
