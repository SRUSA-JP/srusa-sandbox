/**
 * 読み物の節を、見に来た人向けと作り手向けに分ける。
 *
 * どの節がどちら向きかは content/ 側が `audience` で持つ。ページはこの関数を
 * 通すだけで、節の中身を知らないまま「上に出すもの」と
 * 「末尾にたたむもの」を選べる。
 */
import type { ProseSection } from './schema';

/** 見に来た人向けの節。本文としてそのまま並べる。 */
export function readerSections(sections: ProseSection[]): ProseSection[] {
  return sections.filter((section) => (section.audience ?? 'reader') === 'reader');
}

/** 作り手向けの節。ページ末尾の詳細にたたんで置く。 */
export function builderSections(sections: ProseSection[]): ProseSection[] {
  return sections.filter((section) => section.audience === 'builder');
}
