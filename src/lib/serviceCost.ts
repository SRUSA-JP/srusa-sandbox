import type { Entry, PlayerRow } from './selectors';

export interface ServiceCostOptions {
  totalCost: number;
  basePercent: number;
  slope: number;
  roundingUnit: number;
  customCosts: Record<string, number>;
}

export interface ServiceCostRow {
  name: string;
  playtime_hours: number;
  share_percent: number;
  custom_cost_yen: number;
  base_cost_yen: number;
  usage_cost_yen: number;
  cost_yen: number;
  yen_per_hour: number;
}

export interface ServiceCostSummary {
  totalCost: number;
  customCost: number;
  customLimited: boolean;
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

function roundedToUnit(value: number, unit: number): number {
  return Math.max(0, Math.round(value / unit) * unit);
}

function allocateYen(total: number, weights: number[], roundingUnit: number): number[] {
  if (weights.length === 0 || total <= 0) return weights.map(() => 0);
  const unit = Math.max(1, Math.round(roundingUnit));
  const weightTotal = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0);
  const safeWeights = weightTotal > 0 ? weights.map((weight) => Math.max(0, weight)) : weights.map(() => 1);
  const safeTotal = weightTotal > 0 ? weightTotal : weights.length;
  const exact = safeWeights.map((weight) => (total * weight) / safeTotal);
  const rounded = exact.map((value) => roundedToUnit(value, unit));
  let rest = total - rounded.reduce((sum, value) => sum + value, 0);
  const order = exact
    .map((value, index) => ({ index, gap: Math.abs(value - rounded[index]) }))
    .sort((a, b) => b.gap - a.gap);
  let cursor = 0;

  while (rest !== 0 && order.length > 0) {
    const item = order[cursor % order.length];
    const amount = Math.min(unit, Math.abs(rest));
    const delta = rest > 0 ? amount : -amount;
    if (delta > 0 || rounded[item.index] >= amount) {
      rounded[item.index] += delta;
      rest -= delta;
    }
    cursor += 1;
  }

  return rounded;
}

export function serviceCostSummary(rows: PlayerRow[], options: ServiceCostOptions): ServiceCostSummary {
  const players = rows.filter((row) => row.playtime_hours > 0);
  const totalCost = roundedYen(options.totalCost);
  const basePercent = clamp(options.basePercent, 0, 100);
  const slope = clamp(options.slope, 0, 4);
  const roundingUnit = Math.max(1, Math.round(options.roundingUnit));
  const requestedCustomCosts = players.map((row) => roundedYen(options.customCosts[row.name] ?? 0));
  const requestedCustomTotal = requestedCustomCosts.reduce((sum, cost) => sum + cost, 0);
  const customLimited = requestedCustomTotal > totalCost;
  const effectiveCustomCosts = customLimited
    ? allocateYen(totalCost, requestedCustomCosts, roundingUnit)
    : requestedCustomCosts;
  const customCosts = Object.fromEntries(players.map((row, index) => [row.name, effectiveCustomCosts[index] ?? 0]));
  const customCost = effectiveCustomCosts.reduce((sum, cost) => sum + cost, 0);
  const sharedPlayers = players.filter((row) => !customCosts[row.name]);
  const sharedCost = totalCost - customCost;
  const baseCost = roundedYen((sharedCost * basePercent) / 100);
  const usageCost = sharedCost - baseCost;
  const totalHours = players.reduce((sum, row) => sum + row.playtime_hours, 0);
  const baseAllocations = allocateYen(baseCost, sharedPlayers.map(() => 1), roundingUnit);
  const usageAllocations = allocateYen(
    usageCost,
    sharedPlayers.map((row) => Math.pow(row.playtime_hours, slope)),
    roundingUnit,
  );
  const sharedIndexByName = new Map(sharedPlayers.map((row, index) => [row.name, index]));

  const costRows = players
    .map((row) => {
      const custom = customCosts[row.name] ?? 0;
      const index = sharedIndexByName.get(row.name);
      const base = index === undefined ? 0 : baseAllocations[index] ?? 0;
      const usage = index === undefined ? 0 : usageAllocations[index] ?? 0;
      const cost = custom || base + usage;
      return {
        name: row.name,
        playtime_hours: row.playtime_hours,
        share_percent: totalCost > 0 ? (cost / totalCost) * 100 : 0,
        custom_cost_yen: custom,
        base_cost_yen: base,
        usage_cost_yen: usage,
        cost_yen: cost,
        yen_per_hour: row.playtime_hours > 0 ? cost / row.playtime_hours : 0,
      };
    })
    .sort((a, b) => b.cost_yen - a.cost_yen || b.playtime_hours - a.playtime_hours);

  return {
    totalCost,
    customCost,
    customLimited,
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
