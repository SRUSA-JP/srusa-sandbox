/**
 * 相関図の調整つまみ（デバッグ用）。
 *
 * 配置や配線の具合は、値を少し変えて図を見比べないと決められない。
 * それを毎回コードを書き換えて作り直していると確かめる回数が稼げないので、
 * 画面から動かせるようにする。公開したあとの環境でも触れる。
 *
 * ## 決まりとの関係
 *
 * 値の定義場所は今までどおり map/config.ts の 1 か所だけ。ここが持つのは
 * 「どの値を画面から動かせるか」の一覧と、その読み書きの仕方だけで、
 * 既定値そのものは持たない（`defaultValue` は起動時に config から写す）。
 *
 * 動かすと config のオブジェクトを直接書き換える。読む側（layout.ts など）が
 * 何十か所もあるので、そこへ引数を通して回すより 1 か所で書き換えるほうが
 * 手が入る範囲が小さい。デバッグ用の仕掛けと割り切る。
 */
import { EDGE, FLOORPLAN, GRID, NODE, REGION } from '../map/config';

/** 画面から動かせる値 1 つぶん。 */
export interface TuningParameter {
  id: string;
  /** どのまとまりの値か（画面の見出しに使う）。 */
  group: string;
  label: string;
  /** 入れてよい範囲。外れた値は読み込むときに切り詰める。 */
  min: number;
  max: number;
  /** 整数だけを受けるか。回数や升目の数は小数にすると意味を成さない。 */
  integer: boolean;
  read: () => number;
  write: (value: number) => void;
}

/**
 * つまみの一覧。
 *
 * `as const` は型のうえの話で、実行時のオブジェクトは書き換えられる。
 * ここでは意図して書き換えるので、その旨が分かるように型を外して書く。
 */
function parameter(
  group: string,
  label: string,
  target: Record<string, unknown>,
  key: string,
  min: number,
  max: number,
  integer = false,
): TuningParameter {
  return {
    id: `${group}.${key}`,
    group,
    label,
    min,
    max,
    integer,
    read: () => target[key] as number,
    write: (value) => {
      target[key] = integer ? Math.round(value) : value;
    },
  };
}

const floorplan = FLOORPLAN as unknown as Record<string, unknown>;
const edge = EDGE as unknown as Record<string, unknown>;
const region = REGION as unknown as Record<string, unknown>;
const node = NODE as unknown as Record<string, unknown>;
const grid = GRID as unknown as Record<string, unknown>;

export const TUNING_PARAMETERS: TuningParameter[] = [
  /* 区画の組み方 */
  parameter('区画', '横に並べる人数の上限', floorplan, 'maxColumns', 1, 12, true),
  parameter('区画', '区画の縁の余白', floorplan, 'padding', 0, 4, true),
  parameter('区画', '区画のあいだの道', floorplan, 'channel', 0, 6, true),
  parameter('区画', '折り返す幅の下限', floorplan, 'minColumns', 2, 30, true),
  parameter('区画', '試す幅の刻み', floorplan, 'widthStep', 1, 10, true),
  parameter('区画', '試す幅の段数', floorplan, 'widthSteps', 0, 10, true),

  /* 並べ替えの効き方 */
  parameter('並べ替え', '細長さを嫌う強さ', floorplan, 'aspectWeight', 0, 8),
  parameter('並べ替え', '長い関係線を嫌う強さ', floorplan, 'longestWeight', 0, 16),
  parameter('並べ替え', '関係線の重み', floorplan, 'relationWeight', 1, 16),
  parameter('並べ替え', '区画の入れ替え回数', floorplan, 'swapPasses', 0, 40, true),
  parameter('並べ替え', '区画の中の入れ替え回数', floorplan, 'slotPasses', 0, 40, true),

  /* 配線 */
  parameter('配線', '折り返しの間隔', edge, 'channelGap', 2, 60),
  parameter('配線', '空き列を探す範囲', edge, 'channelSearch', 1, 200, true),
  parameter('配線', '線の太さ', edge, 'width', 0.5, 6),
  parameter('配線', '線の濃さ', edge, 'opacity', 0.05, 1),
  parameter('配線', '所属の線の細さ', edge, 'affiliationScale', 0.1, 2),
  parameter('配線', '所属の線の濃さ', edge, 'affiliationOpacity', 0.05, 1),
  parameter('配線', '被覆の太さ', edge, 'casingScale', 1, 8),
  parameter('配線', '被覆の濃さ', edge, 'casingOpacity', 0, 1),

  /* 囲いと人 */
  parameter('囲い', '縁の余白', region, 'padding', 0, 120),
  parameter('囲い', '入れ子ごとに詰める量', region, 'nestedPaddingStep', 0, 60),
  parameter('囲い', '枠線の太さ', region, 'strokeWidth', 0.5, 8),
  parameter('囲い', '塗りの濃さ', region, 'fillAlpha', 0, 1),
  parameter('人', 'アイコンの大きさ', node, 'size', 8, 96),
  parameter('人', '横の間隔', node, 'gapX', 40, 320, true),
  parameter('人', '縦の間隔', node, 'gapY', 30, 240, true),
  parameter('人', '整列の升目', grid, 'cell', 10, 200, true),
];

/** 起動時の値。「元に戻す」の行き先になる。 */
const DEFAULTS: Record<string, number> = Object.fromEntries(
  TUNING_PARAMETERS.map((entry) => [entry.id, entry.read()]),
);

export function defaultTuning(): Record<string, number> {
  return { ...DEFAULTS };
}

/** いまの値をまとめて読む。 */
export function readTuning(): Record<string, number> {
  return Object.fromEntries(TUNING_PARAMETERS.map((entry) => [entry.id, entry.read()]));
}

/**
 * 値をまとめて当てる。
 *
 * 知らない名前は捨て、範囲の外は切り詰める。持ち込んだ JSON が古くても
 * 画面が壊れないようにする（デバッグ用なので、拒むより通すほうがよい）。
 */
export function applyTuning(values: Record<string, unknown>): void {
  for (const entry of TUNING_PARAMETERS) {
    const value = values[entry.id];
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    entry.write(Math.min(Math.max(value, entry.min), entry.max));
  }
}

/** 起動時の値へ戻す。 */
export function resetTuning(): void {
  applyTuning(DEFAULTS);
}
