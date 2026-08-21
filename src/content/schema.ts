/**
 * 読み物（ページの解説文）の型。
 *
 * 元は MkDocs の Markdown だった文章を、画面から切り離して持つための形。
 * 見出し・段落・箇条書き・表・画像だけに絞り、装飾は持たない
 * （見せ方は components/organisms/ProsePanel.tsx が決める）。
 */

export interface ProseTable {
  head: string[];
  /** 1 行 = head と同じ列数。 */
  rows: string[][];
}

export type ProseBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'table'; table: ProseTable }
  | {
      kind: 'image';
      src: string;
      alt: string;
      caption?: string;
      /**
       * 画像の上に出す札（「スクリーンショット」など）。
       *
       * 操作できる図と、撮っただけの画像が同じページに並ぶので、
       * どちらなのかを画像自身に持たせて取り違えを防ぐ。
       */
      tag?: string;
    };

export interface ProseSection {
  /** 節の見出し。 */
  heading: string;
  /** 見出しの下に出す短い注記。 */
  note?: string;
  blocks: ProseBlock[];
}

/** 1 ページ分の読み物。 */
export interface PageContent {
  /** ページの見出し。 */
  title: string;
  /** 見出しの下に出す説明。 */
  lead: string;
  /** ページ全体にかかる但し書き（試験的なコンテンツである、など）。 */
  disclaimer?: string;
  sections: ProseSection[];
}
