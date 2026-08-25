/**
 * 相関図ページの読み物。
 *
 * 出どころは srusa-portal の docs/relationships/index.md。
 */
import type { PageContent } from './schema';

export const RELATIONSHIPS_CONTENT: PageContent = {
  title: '相関図',
  lead: 'SRUSA 図鑑に載せる人たちのつながりと、所属（学校・研究室・部活・友人グループなど）を 1 枚にまとめた図です。',
  disclaimer: '試験的なコンテンツです。掲載の可否と公開範囲はまだ決まっていません。',
  sections: [
    {
      heading: '図の読み方',
      blocks: [
        {
          kind: 'list',
          items: [
            '点: 人物。1 人につき 1 つだけ描かれます',
            '囲み: グループ。その所属者を囲う領域として自動的に描かれます',
            '重なり: 複数のグループに属する人は、領域の重なりの中に入ります（研究室が M大学 の内側に入るのもこの結果です）',
            '線: 人物同士の直接の関係。破線は確度が低い関係です',
          ],
        },
        {
          kind: 'paragraph',
          text: '所属の組み合わせが同じ人はまとまって配置され、所属の重なりが大きいまとまり同士が隣り合うように並べています。領域が細長く伸びて交差するのを抑えるためです。',
        },
      ],
    },
    {
      heading: '操作',
      blocks: [
        {
          kind: 'table',
          table: {
            head: ['プルダウン', '内容'],
            rows: [
              [
                '中心人物',
                '強調する人物。関係のある人物も一緒に強調されます（図の点をクリックしても切り替わります）',
              ],
              ['強調するグループ', '選んだ領域を濃く塗り、所属していない人を淡く表示します'],
              ['関係線', 'すべて表示 / 中心人物のみ / 非表示'],
            ],
          },
        },
        { kind: 'paragraph', text: '下部の「グループ」一覧からも領域を強調できます。' },
      ],
    },
    {
      heading: 'データについての注意',
      blocks: [
        {
          kind: 'list',
          items: [
            '学校名、会社名、研究室名は頭文字だけの表記です',
            '「不明」は所属が確認できていない人、所属が空の人は情報が未入力であることを表します',
            '関係は把握できている分だけで、網羅的ではありません',
          ],
        },
      ],
    },
    {
      heading: '構成',
      blocks: [
        {
          kind: 'table',
          table: {
            head: ['項目', '内容'],
            rows: [
              [
                '実装',
                'React 19 + SVG（TypeScript / Vite / Tailwind CSS v4）。配置と描画の計算は src/map/、画面は src/pages/MapPage.tsx',
              ],
              ['データ', 'data/srusa-relationship-v0.2.json をビルド時に取り込み'],
            ],
          },
        },
      ],
    },
  ],
};
