/**
 * 画面に出る文言。
 *
 * 見出し・注記・ボタン名・空状態の文はここだけが持つ。コンポーネントは
 * この辞書を参照し、日本語の文字列を直接書かない。文言を直したいときは
 * このファイルだけを編集すれば、同じ言い回しが全画面で揃う。
 *
 * 値を含む文は関数にして、数値の整形は lib/format.ts に任せる。
 */
import { formatInt, formatMegabytes } from '../lib/format';
import { OTHER_ENTRY } from './labels';

/** 画面の外枠（サイト名・タブ・配色の切り替え）。 */
export const APP_TEXT = {
  /** ブラウザのタブと画面左上に出す名前。 */
  siteName: 'SRUSA Sandbox',
  /** ホーム画面に追加したときなど、短く出す名前。 */
  shortName: 'SRUSA',
  /** サイト名の下に出す説明。 */
  siteNote: 'SRUSA の試験用コンテンツを公開している場所です。Minecraft サーバーの統計と、メンバーの相関図があります。',
  /**
   * 検索結果やホーム画面に出る説明。
   * 画面に出る siteNote と役割が違う（こちらは中身を見ずに読まれる）ので別に持つ。
   */
  siteDescription:
    'SRUSA の試験用コンテンツを公開しているサイトです。Minecraft サーバーの統計と、メンバーの相関図を置いています。掲載内容と公開範囲は検討中です。',
  /** タブ全体の読み上げ名。 */
  navLabel: 'ページ',
  /** ページ全体にかかる注意書きの見出し。本文の下に出す。 */
  disclaimer: 'このページについて',
  /**
   * 配色を切り替えるボタンの説明。
   * 絵だけのボタンなので、いまの状態ではなく「押すとどうなるか」を書く。
   */
  theme: {
    toDark: '暗い配色に切り替える',
    toLight: '明るい配色に切り替える',
  },
} as const;

/**
 * 掴んで動かす・拡大縮小できる図（ワールドマップ・相関図）で共通の文言。
 *
 * 操作の説明は「押すとどうなるか」で書く。絵だけのボタンなので、
 * これが読み上げでの唯一の説明になる。
 */
export const VIEWPORT_TEXT = {
  zoomIn: '拡大する',
  zoomOut: '縮小する',
  fit: '全体が入る大きさに戻す',
  /** いまの拡大率。 */
  zoom: (percent: number) => `${formatInt(percent)}%`,
  /** 操作の仕方。図の下に小さく置く。 */
  help: '掴んで動かす / Ctrl（⌘）を押しながらホイールで拡大縮小 / ダブルクリックで拡大',
  /** キーボードだけで操作する人向けの説明。読み上げ用。 */
  keyboardHelp: '矢印キーで移動、+ と - で拡大縮小、0 で全体表示',
} as const;

/** グラフの中に出る共通の文言。 */
export const CHART_TEXT = {
  /**
   * 積み上げ棒グラフのツールチップに添える合計。
   * 積み上げの中に数字を書かない代わりに、ここで全体の大きさを読ませる。
   */
  stackTotal: '合計',
} as const;

/** 統計ビューア。 */
export const STATS_TEXT = {
  title: 'Minecraft サーバー統計',

  /**
   * 見出しの下に出す、ひと目で分かる規模と日付。
   * バージョンや取得元のような詳細は footer へ回す。
   */
  source: (params: { generatedOn: string; players: number }) =>
    `${params.generatedOn} 時点 / プレイヤー ${formatInt(params.players)} 人`,

  /** 取り込んだファイルの表示名。 */
  importedFile: (name: string) => `${name}（読み込み）`,

  action: {
    dataset: 'データセット',
    importJson: 'JSON を読み込む',
    exportSummary: 'サマリを書き出す',
  },

  error: {
    load: (message: string) => `読み込みエラー: ${message}`,
    totalsMismatch: (fields: string[]) =>
      `totals とプレイヤー合計が一致しません: ${fields.join(', ')}`,
  },

  empty: {
    noDataset:
      'data/minecraft-stats-*.json が見つかりません。右上の「JSON を読み込む」からファイルを指定してください。',
    loading: '読み込み中…',
    noPlayers: '条件に合うプレイヤーがいません。',
    noBreakdown: '該当するデータがありません。',
    noSnapshots: '表示できるスナップショットがありません。',
  },

  /** 全グラフ共通の絞り込み。 */
  filter: {
    title: '絞り込み',
    metricPicker: '絞り込む指標',
    min: '下限',
    max: '上限',
    minLabel: (metric: string) => `${metric}の下限`,
    maxLabel: (metric: string) => `${metric}の上限`,
    clear: '解除',
    note: (shown: number, total: number) =>
      shown === total
        ? `${formatInt(total)} 人すべてを表示しています。指標の範囲を狭めると全グラフに反映されます。`
        : `${formatInt(total)} 人中 ${formatInt(shown)} 人を表示しています。以降のグラフはすべてこの範囲で計算されます。`,
  },

  /** 指標タイル。 */
  kpi: {
    players: 'プレイヤー数',
    playersValue: (count: number) => `${formatInt(count)} 人`,
    playersSub: (total: number) => `全 ${formatInt(total)} 人中`,
    playtime: '合計プレイ時間',
    distance: '合計移動距離',
    deaths: '合計死亡回数',
    deathsValue: (count: number) => `${formatInt(count)} 回`,
  },

  /** グラフ上のプルダウン。 */
  picker: {
    metric: '指標',
    basis: '値の基準',
    breakdown: '集計対象',
    player: 'プレイヤー',
    allPlayers: '対象全員の合計',
    series: '比較軸',
    xAxis: '横軸',
    yAxis: '縦軸',
    trendScope: '表示単位',
  },

  /** 各グラフの見出しと注記。 */
  card: {
    ranking: {
      title: 'プレイヤー比較（横棒グラフ）',
      note: '選んだ指標でプレイヤーを降順に並べます。',
    },
    breakdown: {
      title: '内訳（横棒グラフ）',
      note: (limit: number) => `上位${limit}件を表示し、残りは「${OTHER_ENTRY.label}」に畳んでいます。`,
      /** 換算の分母になった合計プレイ時間。 */
      basisHours: (note: string, hours: string) => `${note}（合計 ${hours} 時間）`,
      valueColumn: '件数',
    },
    series: {
      title: '系列比較（積み上げ・グループ棒グラフ）',
      note: 'プレイヤーごとに複数系列を比較します。',
    },
    trend: {
      title: '日付ごとの推移（折れ線グラフ）',
      note: (days: number) => `${formatInt(days)} 日分のスナップショットを日付順につないでいます。`,
      singleSnapshot:
        'データが1日分しかないため、点が1つだけ表示されます。data/ に別の日付の minecraft-stats-YYYYMMDD.json を追加すると線になります。',
      perPlayer: (limit: number) => `最新日の上位${limit}人までを表示します。`,
      dateColumn: '日付',
    },
    scatter: {
      title: '2指標の関係（散布図）',
      note: '横軸・縦軸の指標をそれぞれ選べます。同じ指標を選ぶと対角線になります。',
      bothAxes: (note: string) => `両軸とも${note}`,
    },
  },

  /** 換算後の分母の説明。グラフの注記に使う。 */
  basisNote: {
    subject: { each: '各プレイヤー', target: '対象', audience: '対象者' },
    perHour: (subject: string) => `${subject}のプレイ時間で割った、1時間あたりの値です。`,
    perDay: (subject: string) =>
      `${subject}のプレイ時間を24時間で1日と数え、1日あたりに換算した値です。カレンダー上の経過日数ではありません。`,
  },

  footer: {
    /** サーバーの構成と、読んでいるファイル。 */
    dataset: (params: { version: string; loader: string; difficulty: string; file: string }) =>
      `${params.version}・${params.loader}・難易度 ${params.difficulty} / ${params.file}`,
    source: (path: string, via: string, instance: string) => `取得元: ${path}（${via} / ${instance}）`,
  },

  /** 読み書きするファイルの名前。 */
  file: {
    /** 同梱データセットの置き場所（見出しの出典に出す）。 */
    dataset: (id: string) => `data/minecraft-stats-${id}.json`,
    summary: (date: string) => `players-${date}.json`,
    ranking: (metric: string, basis: string) => `ranking-${metric}-${basis}.csv`,
    breakdown: (breakdown: string, basis: string) => `breakdown-${breakdown}-${basis}.csv`,
    series: (series: string, basis: string) => `series-${series}-${basis}.csv`,
    trend: (metric: string, basis: string) => `trend-${metric}-${basis}.csv`,
    scatter: (x: string, y: string, basis: string) => `scatter-${x}-${y}-${basis}.csv`,
  },
} as const;

/** ワールドマップ（BlueMap の 2D 出力）。 */
export const WORLD_MAP_TEXT = {
  /** 地図データがまだ無いとき。 */
  noData:
    '地図データ（data/world-map.json）がありません。BlueMap でレンダリングしてから `npm run build:world-map` を実行してください。',

  card: {
    title: '2D マップ',
    note: '真上から見た地図です。掴んで動かすと移動、拡大すると 1 画素が 1 ブロックとして見えます。',
    /** 読み上げと、画像が出ないときの説明。 */
    alt: (world: string) => `${world}を真上から見た地図`,
  },

  /** 地図の規模。見出しの下に出す。 */
  summary: (world: string, width: number, height: number, bytes: number) =>
    `${world} / ${formatInt(width)} × ${formatInt(height)} ブロック（${formatMegabytes(bytes)}）`,

  /** 指している場所の座標。 */
  pointer: (x: number, z: number) => `X ${formatInt(x)} / Z ${formatInt(z)}`,
  /** 指していないときに出す、画面の中心の座標。 */
  center: (x: number, z: number) => `中心 X ${formatInt(x)} / Z ${formatInt(z)}`,

  /**
   * 3D の見た目を写真で見せる節。
   * 地図そのものと取り違えられないよう、必ずスクリーンショットだと明記する。
   */
  screenshot: {
    /** 各画像に付ける札。 */
    tag: 'スクリーンショット',
    /** 何を写したものかの説明。 */
    note: '下の 2 枚は操作できません。BlueMap の 3D 表示を撮った画像です。',
  },
} as const;

/** 相関図。 */
export const MAP_TEXT = {
  /** データが読めなかったとき。 */
  noData: 'data/srusa-relationship-*.json が見つかりません。データを置いてからビルドし直してください。',

  summary: (people: number, groups: number, relations: number, version: string) =>
    `${formatInt(people)} 人 / ${formatInt(groups)} グループ / ${formatInt(relations)} 関係（データ ${version}）`,

  issues: (shown: string[], rest: number) =>
    `データの不整合: ${shown.join(' ')}${rest > 0 ? ` ほか ${formatInt(rest)} 件` : ''}`,

  picker: {
    center: '中心人物',
    group: '強調するグループ',
    noHighlight: '強調しない',
    /** グループのプルダウンに出す 1 件分の説明。 */
    groupOption: (name: string, type: string, members: number) =>
      `${name}（${type}・${formatInt(members)}人）`,
    edges: '関係線',
  },

  /** 掴んで動かした配置を元に戻すボタン。 */
  resetPositions: '配置を戻す',

  card: {
    map: {
      title: '相関図',
      note: [
        '所属の組み合わせが同じ人をまとめて配置し、各グループをその所属者を囲う領域として描いています。',
        '複数の所属は領域の重なりで表れます。',
        '人を掴んで動かすと配置を変えられます（領域と関係線も追従します）。押すとその人が中心になります。',
      ].join(''),
      center: (name: string) => `中心人物: ${name}`,
      ariaLabel: 'SRUSA の相関図',
    },
    legend: {
      title: 'グループ',
      note: 'クリックするとその領域を強調し、所属していない人を淡く表示します。',
    },
  },

  /** 図の中に出す説明（ツールチップ）。 */
  tooltip: {
    group: (name: string, members: number) => `${name}: ${formatInt(members)} 人`,
    person: (name: string, attributes: string[]) =>
      attributes.length > 0 ? `${name}（${attributes.join('・')}）` : name,
    relation: (from: string, to: string, context?: string, uncertain?: boolean) =>
      `${from} ↔ ${to}${context ? `（${context}）` : ''}${uncertain ? ' ※確度が低い関係' : ''}`,
  },
} as const;

/**
 * データを読むときの知らせ。
 *
 * ここで作られた文はそのまま画面のエラー表示に出るので、
 * 開発者向けの言い回しにしない。
 */
export const DATA_TEXT = {
  /** 値の形が期待と違うとき。どの項目かは呼び出し側が添える。 */
  notObject: 'オブジェクトではありません',
  notArray: '配列ではありません',
  notString: '文字列ではありません',
  notNumber: '数値ではありません',
  notStringField: (field: string) => `${field} が文字列ではありません`,
  brokenJson: (reason: string) => `JSON として解釈できません: ${reason}`,
  datasetNotFound: (id: string) => `データセットが見つかりません: ${id}`,

  /** 相関図のデータの不整合。読み込みは続け、ページ上部に並べて知らせる。 */
  issue: {
    duplicatePerson: '人物 ID が重複しています。',
    duplicateGroup: 'グループ ID が重複しています。',
    missingGroup: (personId: string, attribute: string) =>
      `${personId} の所属「${attribute}」に対応するグループがありません。`,
    missingParentGroup: (groupId: string, parentId: string) =>
      `${groupId} の上位グループ「${parentId}」がありません。`,
    unknownPerson: (source: string, target: string) =>
      `関係 ${source} → ${target} に未登録の人物が含まれます。`,
  },
} as const;

/** 表（DataTable）。統計ビューアと相関図で共用する。 */
export const TABLE_TEXT = {
  exportCsv: 'CSV を書き出す',
  /** 並び替えの向きを示す記号。 */
  sortMark: { asc: ' ▴', desc: ' ▾' },
  /** 既定の書き出し名。 */
  defaultCsvName: 'export.csv',
  /** グラフと表の切り替えボタン。押すと切り替わる先を出す。 */
  toggle: { toChart: 'グラフ', toTable: '表' },
} as const;
