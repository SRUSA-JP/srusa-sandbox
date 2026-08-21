/**
 * ワールドマップの表示設定。
 *
 * 地図に出す目印と、その寸法だけを持つ。地図そのもの（画像と範囲）は
 * data/world-map.json、色は theme/palette.ts が持つ。
 */
import { FONT_SIZE } from '../theme/tokens';

/** 地図に置く目印。座標はワールドのブロック座標。 */
export interface WorldMark {
  /** 名前を引くための ID（config/labels.ts の WORLD_MARK_LABELS）。 */
  id: string;
  x: number;
  z: number;
}

export const WORLD_MAP = {
  /**
   * 目印の寸法（px）。
   *
   * 拡大しても画面上の大きさが変わらないよう、描画側で拡大率で割る。
   * ブロック単位で持つと、引いたときに見えなくなってしまう。
   */
  markSize: 20,
  markStrokeWidth: 2,
  /**
   * 縁取りの太さ（本体に対する倍率）。
   *
   * 地図の色は雪の白から海の紺まで幅があり、1 色では必ずどこかで沈む。
   * 本体と反対の色で一回り太く描いてから重ねることで、どこでも読めるようにする。
   */
  markHaloScale: 3,
  markLabelFontSize: FONT_SIZE.xs,
  /** 目印の中心から名前までの距離（px）。 */
  markLabelOffset: 16,
  /** 出す目印。いまは原点（初期スポーン地点）だけ。 */
  marks: [{ id: 'spawn', x: 0, z: 0 }] as WorldMark[],
} as const;
