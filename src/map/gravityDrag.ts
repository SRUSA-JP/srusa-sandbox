/**
 * 「関連度ベースの重力アルゴリズム」（TODO.md 参照）のうち、
 * ドラッグ追従に使う純粋な計算部分。
 *
 * 描画・アニメーション（requestAnimationFrame や React の state）には触れない。
 * 掴んだノードから見て「誰が・どれだけ強くつられて動くか」だけを返す。
 */
import { GRAVITY_DRAG, GRAVITY_LAYOUT } from './config';
import type { GravityEdge } from './layout';

/** 1 本のエッジの引力 e(w)。0〜1 未満に飽和する。 */
export function gravityAttraction(weight: number): number {
  return weight / (weight + GRAVITY_DRAG.attractionSaturation);
}

/** 次数（エッジの本数）。ハブかどうかの判定に使う。 */
export function gravityDegree(edges: GravityEdge[]): Map<string, number> {
  const degree = new Map<string, number>();
  for (const edge of edges) {
    degree.set(edge.a, (degree.get(edge.a) ?? 0) + 1);
    degree.set(edge.b, (degree.get(edge.b) ?? 0) + 1);
  }
  return degree;
}

/** その次数のノードが持つ反発力。ハブほど強く周りを押し返す。 */
export function gravityNodeRepulsion(degree: number): number {
  return degree >= GRAVITY_LAYOUT.hubDegreeThreshold ? GRAVITY_LAYOUT.hubRepulsion : GRAVITY_LAYOUT.normalRepulsion;
}

function buildAdjacency(edges: GravityEdge[]): Map<string, Array<{ to: string; weight: number }>> {
  const adjacency = new Map<string, Array<{ to: string; weight: number }>>();
  const add = (from: string, to: string, weight: number) => {
    const list = adjacency.get(from) ?? [];
    list.push({ to, weight });
    adjacency.set(from, list);
  };
  for (const edge of edges) {
    add(edge.a, edge.b, edge.weight);
    add(edge.b, edge.a, edge.weight);
  }
  return adjacency;
}

export interface GravityFollower {
  id: string;
  /** 0〜1 未満（直接の隣接ノードだけブースト込みで最大 0.99）。 */
  attraction: number;
}

/**
 * 掴んだノードから、引力が伝わる相手を求める。
 *
 * 「掴んだノードを起点に幅優先探索（最大 3 ホップ）し、経路上の e(w) を
 * 掛け合わせて伝搬。複数経路がある場合は最大値を採用」は、e(w) が
 * 0〜1 の値であることを使うと、最短路探索（ダイクストラ法）の
 * 「足す代わりに掛ける、小さいほうの代わりに大きいほうを選ぶ」版と同じになる。
 * ノード数がごく少ない（相関図の人数ぶん）ので、優先度付きキューは使わず、
 * 素直に「まだ確定していない中でいちばん引力が強いノード」を毎回探す。
 */
export function gravityFollowers(edges: GravityEdge[], grabbedId: string): GravityFollower[] {
  const adjacency = buildAdjacency(edges);
  const best = new Map<string, number>([[grabbedId, 1]]);
  const hops = new Map<string, number>([[grabbedId, 0]]);
  const settled = new Set<string>();

  for (;;) {
    let currentId: string | null = null;
    let currentValue = -Infinity;
    for (const [id, value] of best) {
      if (settled.has(id)) continue;
      if (value > currentValue) {
        currentValue = value;
        currentId = id;
      }
    }
    if (currentId === null) break;
    settled.add(currentId);

    const currentHops = hops.get(currentId) ?? 0;
    if (currentHops >= GRAVITY_DRAG.maxHops) continue;

    for (const { to, weight } of adjacency.get(currentId) ?? []) {
      if (settled.has(to)) continue;
      const propagated = currentValue * gravityAttraction(weight);
      if (propagated < GRAVITY_DRAG.minAttraction) continue;
      if (propagated > (best.get(to) ?? 0)) {
        best.set(to, propagated);
        hops.set(to, currentHops + 1);
      }
    }
  }

  best.delete(grabbedId);

  /* 直接の隣接ノード（0 ホップ目）だけ、引力をさらに強める */
  for (const { to } of adjacency.get(grabbedId) ?? []) {
    const value = best.get(to);
    if (value === undefined) continue;
    best.set(to, Math.min(GRAVITY_DRAG.maxAttraction, value * GRAVITY_DRAG.directBoost));
  }

  return [...best.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, GRAVITY_DRAG.followCount)
    .map(([id, attraction]) => ({ id, attraction }));
}
