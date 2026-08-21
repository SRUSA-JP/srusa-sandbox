/**
 * ワールドマップページの読み物。
 *
 * 出どころは srusa-portal の docs/minecraft/world-map.md。
 * 地図の実体（BlueMap の出力）は数百 MB あるためこのリポジトリには持たず、
 * レンダリング結果の画像と実測値だけを載せる。
 */
import type { PageContent } from './schema';

export const WORLD_MAP_CONTENT: PageContent = {
  title: 'ワールドマップ',
  lead: 'サーバーのワールドを BlueMap でブラウザから見られるようにする検討の記録です。',
  disclaimer:
    'まだ公開していません。手元でレンダリングして、ブラウザから操作できるところまで確認した段階です。地図の実体（317 MB）はこのリポジトリには含めていません。',
  sections: [
    {
      heading: 'レンダリング結果',
      blocks: [
        {
          kind: 'image',
          src: 'images/bluemap-overworld-flat.png',
          alt: 'BlueMap でレンダリングしたオーバーワールドを真上から見た図。中央から北側は白い雪原、東側は海、南側は緑の森林。',
          caption:
            '全体（真上から）。白い部分は積雪バイオーム（snowy_taiga）そのもので、描画の異常ではありません。黒い部分はレンダリング範囲の外です。',
        },
        {
          kind: 'image',
          src: 'images/bluemap-overworld-spawn.png',
          alt: 'スポーン拠点周辺を斜め上から見た図。桜の木、建物、街道、水場が見える。',
          caption: 'スポーン拠点（斜め視点）。',
        },
      ],
    },
    {
      heading: '実測値',
      blocks: [
        {
          kind: 'table',
          table: {
            head: ['項目', '値'],
            rows: [
              ['対象', 'オーバーワールド x/z ±1024 ブロック（実チャンク数 14,297）'],
              ['出力サイズ', '312 MB'],
              ['出力ファイル数', '3,026'],
              ['所要時間', '約 11 分（6 スレッド）'],
              ['1 チャンクあたり', '約 22 KB'],
            ],
          },
        },
        {
          kind: 'paragraph',
          text: 'ワールド全体（オーバーワールド、ネザー、ジ・エンド、ツワイライトフォレストで合計 125,329 チャンク）にそのまま当てはめると約 2.8 GB / 約 27,000 ファイルになります。GitHub Pages はサイト全体で 1 GB が上限のため、ワールド全体を静的書き出しして載せることはできません。範囲を絞るか、別の配信先を用意する必要があります。',
        },
      ],
    },
    {
      heading: '決めること',
      blocks: [
        {
          kind: 'table',
          table: {
            head: ['項目', '内容'],
            rows: [
              [
                '配信先',
                'TODO: 未決。候補は (a) 範囲を絞って同梱、(b) S3 + CloudFront などの外部ホスト、(c) サーバー同居で BlueMap 内蔵 webserver を常駐',
              ],
              ['公開範囲', 'TODO: 一般公開か、限定公開か。座標や建築物の位置が見えることの可否'],
              ['埋め込み方法', 'TODO: ページに埋め込むか、別タブへのリンクだけにするか'],
              ['更新頻度', 'TODO: レンダリングをいつ・どの範囲で行うか'],
              [
                '対象ワールド',
                'TODO: どのワールドを出すか。ネザーも試しレンダリング済み（±512 ブロックで 99 MB、約 5 分）',
              ],
            ],
          },
        },
      ],
    },
    {
      heading: '手元で用意する手順',
      note: 'レンダリング環境は srusa-portal リポジトリの bluemap/ にあります。',
      blocks: [
        {
          kind: 'list',
          items: [
            'Java 25 を用意する（BlueMap 5.23 の要件）',
            'ワールドデータを data/world/ に置く（level.dat と region/ があるディレクトリ）',
            'bluemap/render.sh を実行する。bluemap-cli.jar が無ければ自動で取得する',
            'bluemap/publish.sh overworld で書き出す',
          ],
        },
        {
          kind: 'paragraph',
          text: '静的配信できるのは bluemap/config/webapp.conf で client-decompression: true にしているためです。これが無いとタイルが gzip のまま渡ってブラウザ側で展開できず、地図が真っ黒になります。',
        },
        {
          kind: 'paragraph',
          text: 'Mod が追加したブロックを描画するには、bluemap/packs/ にクライアント版の mod jar を置きます。サーバーで動いている mod は 20 個で、うちブロックを追加する 12 個の jar が必要です。',
        },
      ],
    },
  ],
};
