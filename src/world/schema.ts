/**
 * ワールドマップ（BlueMap の 2D 出力）の型。
 *
 * 実体は data/world-map.json で、scripts/build-world-map.ts が作る。
 * 画像 1 枚と「その画像がワールドのどこにあたるか」だけを持つ。
 */

/** 画像が覆っているワールドの範囲（ブロック座標）。 */
export interface WorldBounds {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
}

export interface WorldMap {
  /** BlueMap のマップ名（overworld / nether など）。 */
  id: string;
  /** 実際のディメンション。同じディメンションの別レンダーを束ねるために使う。 */
  dimension?: string;
  /** 画面に出す表示名。未指定なら id をそのまま使う。 */
  label?: string;
  /** public/ からの相対パス。 */
  image: string;
  bounds: WorldBounds;
  /** 画像の大きさ（画素）。 */
  pixels: { width: number; height: number };
  /** 1 画素が何ブロックにあたるか。 */
  blocksPerPixel: number;
  /** 画像の大きさ（バイト）。3D と比べてどれだけ軽いかを画面に出すのに使う。 */
  bytes: number;
}

export interface WorldMapDocument {
  /** どのツールのどの出力から作ったか。 */
  source: string;
  maps: WorldMap[];
}
