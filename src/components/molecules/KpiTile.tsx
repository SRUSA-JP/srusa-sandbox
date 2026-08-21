export interface KpiTileProps {
  label: string;
  value: string;
  sub?: string;
}

/** 「数字そのものが主役」の指標はグラフにせずタイルで見せる。 */
export function KpiTile({ label, value, sub }: KpiTileProps) {
  return (
    <div className="flex flex-col gap-xxs">
      <span className="text-sm text-muted">{label}</span>
      <strong className="text-display font-bold tracking-tight">{value}</strong>
      {sub && <span className="text-sm text-subtle">{sub}</span>}
    </div>
  );
}
