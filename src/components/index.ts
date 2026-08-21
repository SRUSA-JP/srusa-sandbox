/**
 * 画面を組み立てる部品。アトミックデザインの層で分けている。
 *
 * - atoms:     これ以上分けられない部品（ボタン・プルダウン・入力欄・色の四角）
 * - molecules: atoms を組み合わせた小さなまとまり（見出し・指標タイル・ツールチップ）
 * - organisms: それだけで意味を持つ塊（グラフ・表・絞り込み・相関図）
 * - templates: 画面の骨格（何を出すかは知らず、並べ方だけを決める）
 *
 * 画面そのものは pages/ にある。
 */
export * from './atoms';
export * from './molecules';
export * from './organisms';
export * from './templates';
