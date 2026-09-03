/**
 * ワールドマップページの読み物。
 *
 * ページの主役はスポーン周辺 3D と操作できる 2D 地図。
 * 細かい生成ログや作り直し手順は、ページ下部の詳細にたたむ。
 */
import type { PageContent } from './schema';

export const WORLD_MAP_CONTENT: PageContent = {
  title: 'ワールドマップ',
  lead: 'サーバーのワールドを BlueMap でレンダリングしたものです。スポーン周辺 3D を先に表示し、その下で 2D の全ワールド地図を動かせます。',
  disclaimer:
    'レンダリングした時点のワールドです。自動では更新しません。載せているのはオーバーワールドの一部（x/z ±1024 ブロックの範囲）だけで、公開範囲はまだ検討中です。',
  sections: [
    {
      heading: '2D だけを載せている理由',
      audience: 'builder',
      blocks: [
        {
          kind: 'paragraph',
          text: 'BlueMap は 1 つのマップにつき 2 種類のタイルを出力します。3D のモデル（hires）と、真上から見た PNG（lowres）です。同じ範囲でも大きさが 100 倍以上違うため、ブラウザに載せられるのは 2D の側だけです。',
        },
        {
          kind: 'table',
          table: {
            head: ['出力', '中身', 'ファイル数', 'サイズ'],
            rows: [
              ['tiles/0（3D）', '3D モデル。回して眺められる', '2,943', '308 MB'],
              ['tiles/1〜3（2D）', '真上から見た PNG。3 段階の縮尺', '56', '3.0 MB'],
              ['このページの地図', '2D の最も細かい段を 1 枚に貼り合わせたもの', '1', '1.2 MB'],
            ],
          },
        },
        {
          kind: 'table',
          table: {
            head: ['項目', '値'],
            rows: [
              ['対象', 'オーバーワールド x/z ±1024 ブロック（実チャンク数 14,297）'],
              ['地図の範囲', '1,727 × 2,049 ブロック（描画されたチャンクのある範囲だけ）'],
              ['縮尺', '1 画素 = 1 ブロック'],
              ['レンダリング時間', '約 11 分（6 スレッド）'],
            ],
          },
        },
        {
          kind: 'paragraph',
          text: '3D をワールド全体（オーバーワールド、ネザー、ジ・エンド、ツワイライトフォレストで合計 125,329 チャンク）に広げると約 2.8 GB・約 27,000 ファイルになります。GitHub Pages はサイト全体で 1 GB が上限で、Netlify でも 1 ファイルずつ配信すると重すぎます。2D なら同じ範囲が 1 枚 1.2 MB に収まり、写真 1 枚と変わりません。',
        },
      ],
    },
    {
      heading: '決めること',
      audience: 'builder',
      blocks: [
        {
          kind: 'table',
          table: {
            head: ['項目', '内容'],
            rows: [
              [
                '3D の配信先',
                'TODO: 未決。候補は (a) S3 + CloudFront などの外部ホスト、(b) サーバー同居で BlueMap 内蔵 webserver を常駐、(c) 3D は載せずスクリーンショットのみ',
              ],
              ['公開範囲', 'TODO: 一般公開か、限定公開か。座標や建築物の位置が見えることの可否'],
              ['対象ワールド', 'TODO: ネザーも試しレンダリング済み（±512 ブロックで 99 MB）。2D なら追加は数 MB で済む'],
              ['更新頻度', 'TODO: レンダリングをいつ・どの範囲で行うか。いまは手動'],
              ['目印', 'TODO: 拠点や施設の位置を地図に載せるか。載せる場合は座標の公開範囲と合わせて決める'],
            ],
          },
        },
      ],
    },
    {
      heading: '手元で作り直す手順',
      audience: 'builder',
      note: 'レンダリング環境は srusa-portal リポジトリの bluemap/ にあります。',
      blocks: [
        {
          kind: 'list',
          items: [
            'Java 25 を用意する（BlueMap 5.23 の要件）',
            'ワールドデータを srusa-portal の data/world/ に置く（level.dat と region/ があるディレクトリ）',
            'srusa-portal で bluemap/render.sh を実行する。bluemap-cli.jar が無ければ自動で取得する',
            'このリポジトリで npm run build:world-map を実行する。2D タイルを 1 枚に貼り合わせて public/world-map/ に置き、data/world-map.json を更新する',
          ],
        },
        {
          kind: 'paragraph',
          text: 'Mod が追加したブロックを描画するには、bluemap/packs/ にクライアント版の mod jar を置きます。サーバーで動いている mod は 20 個で、うちブロックを追加する 12 個の jar が必要です。',
        },
      ],
    },
  ],
};
