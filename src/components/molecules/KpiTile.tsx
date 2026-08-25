export interface KpiTileProps {
  label: string;
  value: string;
  sub?: string;
  compact?: boolean;
}

/** 「数字そのものが主役」の指標はグラフにせずタイルで見せる。 */
export function KpiTile({ label, value, sub, compact = false }: KpiTileProps) {
  return (
    <div className="flex flex-col gap-xxs">
      <span className={compact ? 'text-xs text-muted' : 'text-sm text-muted'}>{label}</span>
      <strong className={`${compact ? 'text-lg' : 'text-display'} font-bold tracking-tight`}>{value}</strong>
      {sub && <span className={compact ? 'text-xs text-subtle' : 'text-sm text-subtle'}>{sub}</span>}
    </div>
  );
}
