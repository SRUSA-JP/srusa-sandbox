import type { Entry, PlayerRow } from './selectors';

export interface ServiceCostOptions {
  totalCost: number;
  basePercent: number;
  slope: number;
}

export interface ServiceCostRow {
  name: string;
  playtime_hours: number;
  share_percent: number;
  base_cost_yen: number;
  usage_cost_yen: number;
  cost_yen: number;
  yen_per_hour: number;
}

export interface ServiceCostSummary {
  totalCost: number;
  baseCost: number;
  usageCost: number;
  players: number;
  totalHours: number;
  averageCost: number;
  rows: ServiceCostRow[];
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function roundedYen(value: number): number {
  return Math.max(0, Math.round(Number.isFinite(value) ? value : 0));
}

function allocateYen(total: number, weights: number[]): number[] {
  if (weights.length === 0 || total <= 0) return weights.map(() => 0);
  const weightTotal = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0);
  const safeWeights = weightTotal > 0 ? weights.map((weight) => Math.max(0, weight)) : weights.map(() => 1);
  const safeTotal = weightTotal > 0 ? weightTotal : weights.length;
  const exact = safeWeights.map((weight) => (total * weight) / safeTotal);
  const floors = exact.map(Math.floor);
  let rest = total - floors.reduce((sum, value) => sum + value, 0);
  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);

  for (const item of order) {
    if (rest <= 0) break;
    floors[item.index] += 1;
    rest -= 1;
  }

  return floors;
}

export function serviceCostSummary(rows: PlayerRow[], options: ServiceCostOptions): ServiceCostSummary {
  const players = rows.filter((row) => row.playtime_hours > 0);
  const totalCost = roundedYen(options.totalCost);
  const basePercent = clamp(options.basePercent, 0, 100);
  const slope = clamp(options.slope, 0, 4);
  const baseCost = roundedYen((totalCost * basePercent) / 100);
  const usageCost = totalCost - baseCost;
  const totalHours = players.reduce((sum, row) => sum + row.playtime_hours, 0);
  const baseAllocations = allocateYen(baseCost, players.map(() => 1));
  const usageAllocations = allocateYen(
    usageCost,
    players.map((row) => Math.pow(row.playtime_hours, slope)),
  );

  const costRows = players
    .map((row, index) => {
      const base = baseAllocations[index] ?? 0;
      const usage = usageAllocations[index] ?? 0;
      const cost = base + usage;
      return {
        name: row.name,
        playtime_hours: row.playtime_hours,
        share_percent: totalCost > 0 ? (cost / totalCost) * 100 : 0,
        base_cost_yen: base,
        usage_cost_yen: usage,
        cost_yen: cost,
        yen_per_hour: row.playtime_hours > 0 ? cost / row.playtime_hours : 0,
      };
    })
    .sort((a, b) => b.cost_yen - a.cost_yen || b.playtime_hours - a.playtime_hours);

  return {
    totalCost,
    baseCost,
    usageCost,
    players: players.length,
    totalHours,
    averageCost: players.length > 0 ? totalCost / players.length : 0,
    rows: costRows,
  };
}

export function serviceCostChartRows(rows: ServiceCostRow[]): Entry[] {
  return rows.map((row) => ({
    key: row.name,
    label: row.name,
    value: row.cost_yen,
  }));
}
