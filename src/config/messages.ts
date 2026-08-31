/**
 * 画面に出る文言。
 *
 * 見出し・注記・ボタン名・空状態の文はここだけが持つ。コンポーネントは
 * この辞書を参照し、日本語の文字列を直接書かない。文言を直したいときは
 * このファイルだけを編集すれば、同じ言い回しが全画面で揃う。
 *
 * 値を含む文は関数にして、数値の整形は lib/format.ts に任せる。
 */
import { formatDecimal, formatInt, formatMegabytes } from '../lib/format';
import { OTHER_ENTRY } from './labels';

/** 画面の外枠（サイト名・タブ・配色の切り替え）。 */
export const APP_TEXT = {
  /** ブラウザのタブと画面左上に出す名前。 */
  siteName: 'SRUSA Sandbox',
  /** サイトロゴ画像の説明。 */
  logoAlt: 'SRUSA Sandbox ロゴ',
  /** ロゴリンクの読み上げ。 */
  homeLink: 'ホームへ移動',
  /** ホーム画面に追加したときなど、短く出す名前。 */
  shortName: 'SRUSA',
  /**
   * 検索結果やホーム画面に出る説明。
   * 画面に出る文言と役割が違う（こちらは中身を見ずに読まれる）ので別に持つ。
   */
  siteDescription:
    'SRUSA の試験用コンテンツを公開しているサイトです。Minecraft サーバーの統計・ワールドマップ・活動カレンダー、相関図、メンバー、年表、ギャラリーを置いています。掲載内容と公開範囲は検討中です。',
  /** タブ全体の読み上げ名。 */
  navLabel: 'ページ',
  /** スマートフォン下部タブの読み上げ名。 */
  mobileNavLabel: 'スマートフォンのページ切替',
  /** 下の段（まとまりの中の切り替え）の読み上げ。 */
  sectionNavLabel: 'このまとまりの中の画面',
  /** ゲーム一覧の読み上げ。 */
  gameNavLabel: 'ゲーム',
  /** ゲーム内コンテンツ一覧の読み上げ。 */
  gameContentNavLabel: 'ゲーム内の画面',
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
  /** フロントエンドだけでかける簡易ロック。 */
  auth: {
    title: 'ログイン',
    passwordLabel: 'パスワード',
    passwordHint: 'パスワードは #minecraft のピン留めに掲載しています。',
    showPassword: '表示',
    hidePassword: '隠す',
    submit: 'ログイン',
    error: 'パスワードが違います。',
  },
} as const;

/**
 * ページの末尾にたたんで置く、作り手向けの詳細の文言。
 *
 * 生成ログ・出典・検証結果・JSON の読み書きのように、
 * 見に来た人の目当てではないものの見出しをここに集める。
 * 主役（画像・グラフ）を上に出すための置き場所なので、
 * ここに入れた文言は画面の上部では使わない。
 */
export const TECHNICAL_TEXT = {
  stats: {
    title: 'データの詳細',
    note: '出どころ・検証結果・JSON の読み書き・実装の構成',
    source: '出どころ',
    validation: '検証結果',
    validationOk: '合計値の食い違いはありません。',
    io: 'JSON の読み込みと書き出し',
    ioNote: '手元の統計 JSON を読み込んで表示したり、いま見ている一覧を書き出したりできます。',
  },
  worldMap: {
    title: '地図の詳細',
    note: (count: number) => `生成ログ ${formatInt(count)} 件・作り方・決めること`,
  },
  relationships: {
    title: 'データの詳細',
    note: '不整合・配置の書き出しと読み込み・実装の構成',
    issues: '読み込み時の不整合',
    noIssues: '読み込み時の不整合はありません。',
    io: '配置の書き出しと読み込み',
    ioNote: '画面で動かした配置を JSON に書き出し、あとで同じ並びに戻せます。',
  },
  clips: {
    title: 'URL を指定して表示',
    note: '動画・画像の URL を直接開く',
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
    blocksMined: '採掘ブロック',
    mobKills: 'mob 撃破数',
    diamonds: 'ダイヤ鉱石',
  },

  experience: {
    hero: {
      server: 'SRUSA',
      title: 'STATS',
      season: 'Season 2026',
      inventory: 'INV',
      display: '表示',
    },
    overview: 'SERVER OVERVIEW',
    discovery: {
      title: 'SERVER DISCOVERY',
      note: '集計値の中から、その日いちばん目立っている記録を自動で拾っています。',
      display: '表示',
      anomaly: 'ANOMALY FOUND',
      /** 誰の記録かを見分けるアイコンの読み上げ。名前は隣に文字でも出る。 */
      iconAlt: (name: string) => `${name} のアイコン`,
      kinds: {
        playtime: 'LONGEST LOGIN',
        blocksMined: 'DEEP DIGGER',
        distance: 'FARTHEST TRAVEL',
        deaths: 'MOST DEATHS',
        mobKills: 'MOB HUNTER',
        diamonds: 'DIAMOND KING',
        outlier: 'ANOMALY FOUND',
      },
    },
    playstyle: {
      title: 'PLAYER STATUS',
      note: '複数の統計を組み合わせて、プレイヤーごとの遊び方をスコア化しています。',
      level: (level: number) => `Lv. ${formatInt(level)}`,
      skinAlt: (name: string) => `${name} の Minecraft スキン`,
      selectPlayer: 'プレイヤー切替',
      selectPlayerAlt: (name: string) => `${name} のステータスを見る`,
      basis: '評価基準',
      primary: 'PRIMARY STYLE',
      rarest: 'RAREST STAT',
      metrics: {
        playtime: 'PLAY',
        distance: 'TRAVEL',
        deaths: 'DEATHS',
        mobKills: 'KILLS',
        blocksMined: 'MINED',
        advancements: 'ADV',
      },
      /**
       * レーダーの軸に出す短い名前。
       *
       * 軸の名前は図の外側に置くので、長いと多角形がその分だけ小さくなる
       * （lib/radar.ts が収まる半径を計算する）。4〜5 文字に収めること。
       * 正式な名前は styles にあり、図の隣の一覧はそちらを使う。
       */
      stylesShort: {
        miner: 'MINE',
        builder: 'BUILD',
        explorer: 'EXPL',
        fighter: 'FIGHT',
        farmer: 'FARM',
        fisher: 'FISH',
        trader: 'TRADE',
      },
      styles: {
        miner: 'MINER',
        builder: 'BUILDER',
        explorer: 'EXPLORER',
        fighter: 'FIGHTER',
        farmer: 'FARMER',
        fisher: 'FISHER',
        trader: 'TRADER',
      },
      descriptions: {
        miner: '地下にこもって資源を掘り抜く採掘職人タイプ',
        builder: 'クラフトと設置で拠点を育てる建築担当タイプ',
        explorer: '遠くまで足跡を残して世界を広げる冒険者タイプ',
        fighter: '危険地帯でも前に出る戦闘担当タイプ',
        farmer: '食料・動物・釣り場を整える暮らし担当タイプ',
        fisher: '水辺の記録だけ妙に濃い釣り人タイプ',
        trader: '村人経済を回して装備と物資を整える商人タイプ',
      },
    },
    daily: {
      title: 'PLAYER DAILY LOG',
      note: 'バックアップ間の差分から、プレイヤーごとの伸び方を日付別に見ます。バックアップは毎日は取っていないので、間が空いた区間はその日数ぶんの合計です（横軸に「n日分」と出ます）。',
      player: 'プレイヤー',
      metric: '指標',
      lastActive: '直近活動',
      total: '期間合計',
      empty: 'この期間の活動はありません',
      playerList: 'プレイヤー一覧',
    },
    achievement: {
      title: 'ACHIEVEMENT BOARD',
      note: '上位記録をゲーム内実績のように並べています。',
      titles: {
        miner: 'THE MINER',
        builder: 'THE BUILDER',
        explorer: 'THE WANDERER',
        fighter: 'MOB HUNTER',
        farmer: 'FARM MASTER',
        fisher: 'RIVER KEEPER',
        trader: 'EMERALD BROKER',
        diamond: 'DIAMOND KING',
        fallen: 'THE FALLEN',
      },
    },
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
    trendMode: '値の出し方',
    pointDisplay: '点の表示',
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
      /** 累計をそのまま出すときの断り。1 点が数日ぶんを含むことを明示する。 */
      cumulativeNote:
        'スナップショット時点の累計です。点と点の間が数日空いているときは、その間の増加がまとめて次の点に乗ります。',
      /** 1日あたりの概算のときの説明。実測ではないことを必ず添える。 */
      dailyAverageNote:
        'スナップショット間の増加を、その間の日数で割って 1 日ずつに広げた概算です。実際にその日どれだけ動いたかの記録ではありません。',
      /** 概算に切り替えると、プレイ時間での換算は使わない。 */
      dailyAverageBasis: '値の基準（1時間あたりなど）は使いません。カレンダーの日数で割った値です。',
      /** 概算にできるスナップショットが足りないとき。 */
      needsTwoSnapshots:
        '増分を計算できるスナップショットが 2 日分ありません。data/ に別の日付の minecraft-stats-YYYYMMDD.json を追加してください。',
    },
    scatter: {
      title: '2指標の関係（散布図）',
      note: '横軸・縦軸の指標をそれぞれ選べます。同じ指標を選ぶと対角線になります。',
      bothAxes: (note: string) => `両軸とも${note}`,
    },
    economy: {
      title: 'SRUSA鉱物指数',
      note:
        'ダイヤとエメラルドを資産バスケットとして見ます。所有ベースでは装備・ツール・エンダーチェスト・所有者別バックパック内の在庫も換算します。',
      total: '総資産',
      rate: 'DI/EM レート',
      index: '指数',
      diamond: 'ダイヤ',
      emerald: 'エメラルド',
      ranking: '資産ランキング',
      rankingMode: '表示',
      rankingModes: {
        total: '合計と内訳',
        diamond: 'ダイヤの内訳',
        emerald: 'エメラルドの内訳',
      },
      /** 合計と内訳のとき。ダイヤとエメラルドの積み上げ。 */
      rankingNote: 'ダイヤとエメラルドを同じ 1 単位として積み上げた、プレイヤー別の資産量です。',
      /** 1 資産だけを見るとき。装備・ツールなどの分類に分けた積み上げ。 */
      categoryNote: (asset: string, categories: string) =>
        `${asset}の資産量を${categories}に分けた内訳です。`,
      /** 装備やツールを含むときだけ足す注記。 */
      craftedNote: '装備とツールは、素材何個分かに換算した値で数えます。',
      /** 表と CSV の列。 */
      totalColumn: '合計',
      /** 換算後の資産量の単位。ダイヤとエメラルドを同じ 1 単位として数える。 */
      unit: '個',
      source: '算出元',
      noRate: '算出なし',
      base: (base: number) => `最初のスナップショットを ${formatInt(base)} として指数化`,
      rateValue: (rate: string) => `1 DI = ${rate} EM`,
      rateNote: '選択中の算出元から見た簡易レート',
    },
    serviceCost: {
      title: 'サーバー維持費の傾斜',
      note:
        'プレイ時間が 0 時間より大きい人を対象に、基本割とプレイ時間に応じた従量分で維持費を分けます。',
      totalCost: '総額',
      totalCostLabel: '維持費の総額',
      basePercent: '基本割%',
      basePercentLabel: '均等に分ける割合',
      slope: '傾斜',
      slopeLabel: 'プレイ時間への傾斜係数',
      roundingUnit: '丸め',
      roundingUnitLabel: '四捨五入する単位',
      customPlayer: 'カスタム対象',
      customCost: 'カスタム額',
      customCostLabel: (name: string) => `${name} のカスタム請求額`,
      clearCustom: '解除',
      customLimited: 'カスタム額の合計が総額を超えたため、カスタム対象者の中で総額に収まるよう按分しています。',
      participants: '対象人数',
      totalHours: '対象プレイ時間',
      customTotal: 'カスタム',
      baseCost: '基本割',
      usageCost: '従量分',
      averageCost: '平均',
      yen: ' 円',
      yenPerHour: ' 円/h',
      shareColumn: '割合',
      customColumn: 'カスタム',
      baseColumn: '基本割',
      usageColumn: '従量分',
      costColumn: '負担額',
      yenPerHourColumn: '円/h',
      noPlayers: 'プレイ時間がある対象者がいません。',
      basis: (basePercent: number, slope: number, roundingUnit: number) =>
        `基本割 ${formatInt(basePercent)}% / 従量分は プレイ時間^${formatDecimal(slope)} で配分 / ${formatInt(roundingUnit)} 円単位で四捨五入。`,
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
    economyRanking: (mode: string) => `economy-ranking-${mode}.csv`,
    serviceCost: 'minecraft-service-cost.csv',
    scatter: (x: string, y: string, basis: string) => `scatter-${x}-${y}-${basis}.csv`,
  },
} as const;

/** ワールドマップ（BlueMap の 2D 出力）。 */
export const WORLD_MAP_TEXT = {
  /** 地図データがまだ無いとき。 */
  noData:
    '地図データ（data/world-map.json）がありません。BlueMap でレンダリングしてから `npm run build:world-map` を実行してください。',
  partialData: (count: number) => `読み込めない地図データ ${formatInt(count)} 件を除外して表示しています。`,

  card: {
    title: '2D マップ',
    note: '真上から見た地図です。掴んで動かすと移動、拡大すると 1 画素が 1 ブロックとして見えます。',
    /** 読み上げと、画像が出ないときの説明。 */
    alt: (world: string) => `${world}を真上から見た地図`,
    imageError: (path: string) => `画像を読み込めません: ${path}`,
  },

  picker: {
    mapSettings: '2D マップ設定',
    dimension: 'ディメンション',
    allDimensions: 'すべて',
    snapshot: '履歴',
    map: '日付',
    latestMaps: '最新',
    tooltips: 'ツールチップ',
    log: 'ログ',
  },

  log: {
    title: '生成ログ',
    dimension: 'DIM',
    area: '範囲',
    bounds: '座標',
    pixels: 'PNG',
    size: 'SIZE',
    updated: '更新',
  },

  /** 地図の規模。見出しの下に出す。 */
  dateSummary: (date: string, count: number) => `${date} の地図 ${formatInt(count)} 件を表示`,
  latestSummary: (count: number) => `各ディメンションの最新地図 ${formatInt(count)} 件を表示`,
  mapSelectionSummary: (shown: number, total: number) =>
    `${formatInt(shown)} ワールドを表示（保存済み地図 ${formatInt(total)} 件）`,
  summary: (
    world: string,
    width: number,
    height: number,
    bytes: number,
    bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
  ) =>
    `${world} / ${formatInt(width)} × ${formatInt(height)} ブロック（${formatMegabytes(bytes)}） / X ${formatInt(bounds.minX)}..${formatInt(bounds.maxX)} / Z ${formatInt(bounds.minZ)}..${formatInt(bounds.maxZ)}`,

  /** 指している場所の座標。 */
  pointer: (x: number, z: number) => `X ${formatInt(x)} / Z ${formatInt(z)}`,
  /** クリックして選んだ場所の座標。 */
  selected: (x: number, z: number) => `選択 X ${formatInt(x)} / Z ${formatInt(z)}`,
  /** 指していないときに出す、画面の中心の座標。 */
  center: (x: number, z: number) => `中心 X ${formatInt(x)} / Z ${formatInt(z)}`,
  tooltip: {
    title: '座標',
    current: (x: number, z: number) => `X ${formatInt(x)} / Z ${formatInt(z)}`,
  },

  /**
   * 対になるワールドの座標（Minecraft の 1:8 換算）。
   *
   * 換算が成り立つのはオーバーワールドとネザーのあいだだけなので、
   * ジ・エンドと黄昏の森では出さない。
   */
  paired: {
    nether: (x: number, z: number) => `ネザー X ${formatInt(x)} / Z ${formatInt(z)}`,
    overworld: (x: number, z: number) => `通常世界 X ${formatInt(x)} / Z ${formatInt(z)}`,
  },

  threeD: {
    title: 'スポーン周辺 3D',
    note: 'スポーン地点の周辺だけを BlueMap の 3D ビューアで表示します。',
    fullscreen: '全画面',
    exitFullscreen: '全画面を終了',
    wide: '広く見る',
    normal: '通常表示',
    loading: 'スポーン周辺 3D の生成物を確認しています。',
    missing:
      'スポーン周辺 3D の生成物がありません。../srusa-portal/bluemap/web から public/bluemap-spawn/ へ同期すると表示できます。',
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
    layout: '配置',
    tooltips: 'ツールチップ',
    tooltipOn: '表示',
    tooltipOff: '非表示',
    /** 関係線の見せ方（配線・レッドストーン）。 */
    edgeStyle: '線の種類',
    /** 所属を囲う曲線の表示切り替え。消すと人と関係線だけになる。 */
    regions: '所属の囲い',
    regionOn: '表示',
    regionOff: '非表示',
    /** 所属から導いた線の表示切り替え。同じ所属の人がグループの色で繋がる。 */
    affiliationEdges: '所属の線',
    affiliationOn: '表示',
    affiliationOff: '非表示',
    noHighlight: '強調しない',
    /** グループのプルダウンに出す 1 件分の説明。 */
    groupOption: (name: string, type: string, members: number) =>
      `${name}（${type}・${formatInt(members)}人）`,
    edges: '関係線',
    displaySettings: '表示設定',
  },

  /** 掴んで動かした配置を元に戻すボタン。 */
  resetPositions: '配置を戻す',

  /** 配置の持ち出しと持ち込み。作り手向けなのでページ末尾の詳細に置く。 */
  action: {
    exportLayout: '配置を書き出す',
    importLayout: '配置を読み込む',
  },

  card: {
    map: {
      title: '相関図',
      note: [
        '所属の組み合わせが同じ人をまとめて配置し、各グループをその所属者を囲う領域として描いています。',
        '複数の所属は領域の重なりで表れます。',
        '人を掴んで動かすと配置を変えられます（領域と関係線も追従します）。押すと紹介へのリンクを出します。',
      ].join(''),
      center: (name: string) => `中心人物: ${name}`,
      ariaLabel: 'SRUSA の相関図',
    },
    legend: {
      title: 'グループ',
      note: 'クリックするとその領域を強調し、所属していない人を淡く表示します。',
    },
  },

  /** 調整つまみ（デバッグ用）。 */
  tuning: {
    title: '調整（デバッグ用）',
    note: '配置と配線の値をその場で変えて確かめられます。ここで変えた値は保存されません。持ち出したいときは JSON に書き出してください。',
    export: '値を書き出す',
    import: '値を読み込む',
    reset: '元に戻す',
    fileName: () => `srusa-relationship-tuning-${new Date().toISOString().slice(0, 10)}.json`,
    imported: '読み込みました。',
    notObject: 'JSON のオブジェクトではありません',
    importFailed: (reason: string) => `読み込めませんでした: ${reason}`,
    /** 読み上げ用。どのまとまりの何の値かが分かる形にする。 */
    fieldLabel: (group: string, label: string) => `${group}の${label}`,
  },

  /** 図の中に出す説明（ツールチップ）。 */
  tooltip: {
    group: (name: string, members: number) => `${name}: ${formatInt(members)} 人`,
    person: (name: string, attributes: string[]) =>
      attributes.length > 0 ? `${name}（${attributes.join('・')}）` : name,
    profileLink: '紹介を見る',
    close: '閉じる',
    relation: (from: string, to: string, context?: string, uncertain?: boolean) =>
      `${from} ↔ ${to}${context ? `（${context}）` : ''}${uncertain ? ' ※確度が低い関係' : ''}`,
    /** 所属から導いた線。親（線の集まる人）とその所属者を結ぶ。 */
    affiliation: (hub: string, member: string, group: string) => `${hub} ─ ${member}（${group}）`,
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

/**
 * 連続プレイ日数。プレイヤー紹介ページに出す。
 *
 * 数え方の元はサーバーログの日別記録で、「その日サーバーに入ったか」だけを見る。
 * 何時間遊んだかは見ないので、少し覗いた日も 1 日として数える。
 */
export const STREAK_TEXT = {
  title: '連続プレイ日数',
  note: 'サーバーのログから、その日ログインしたかどうかで数えています。',
  current: '現在の連続',
  /** 途切れている人には「現在」と出さない（最後に続いた長さなので）。 */
  lastRun: '最後の連続',
  longest: '最長の連続',
  totalDays: '遊んだ日数',
  lastPlayed: '最後にログイン',
  days: (count: number) => `${count} 日`,
  /** 一度もログインの記録が無い人。 */
  empty: 'ログインの記録がまだありません。',
  /** 帯の 1 マスの読み上げ。 */
  markAlt: (date: string, played: boolean) => `${date} ${played ? 'ログインあり' : 'ログインなし'}`,
  /** カレンダーの見出し。 */
  calendarTitle: 'ログイン日カレンダー',
  calendarNote: '来た日を暦で表しています。濃い升目がログインした日です。',
} as const;

/**
 * メンバー。人をまとめて並べ、ひとりずつの紹介ページへ渡す入口。
 *
 * 名前は相関図のデータにある表記のまま出す。頭文字だけの人はそのまま頭文字で出し、
 * ここで本名に近づける言い換えをしないこと（相関図の匿名化を弱めないため）。
 */
export const ZUKAN_TEXT = {
  title: 'メンバー',
  note: '相関図と Minecraft のデータにいる人をまとめた名簿です。',
  lead: '名前を選ぶと、その人の紹介ページへ移ります。所属や、Minecraft に参加しているかで絞り込めます。',
  /** 絞り込みのプルダウン。 */
  filter: {
    attribute: '所属',
    kind: '種類',
    sort: '並び替え',
    /** 絞り込まないときの選択肢。 */
    any: 'すべて',
  },
  /** 種類での絞り込み。 */
  kind: {
    all: 'すべての人',
    minecraft: 'Minecraft に参加',
    relationship: '相関図のみ',
  },
  /** 並び替え。 */
  sort: {
    name: '名前順',
    minecraft: 'Minecraft 参加を先',
    relationship: '相関図のみを先',
    playtime: 'プレイ時間が長い順',
    streak: '連続ログインが長い順',
    related: 'つながりが多い人順',
  },
  /** 見出しの下に出す人数。 */
  count: (shown: number, total: number) => `${total} 人中 ${shown} 人`,
  /** 絞り込んだ結果が空のとき。 */
  empty: '条件に合う人がいません。絞り込みを緩めてください。',
  /** カードに付ける札。 */
  badge: {
    stats: '統計あり',
    daily: '日別ログ',
    streak: (days: number) => `継続 ${days} 日`,
  },
  /** 所属が多すぎて省いたとき。 */
  moreAttributes: (count: number) => `ほか ${count}`,
  /** カード全体の読み上げ。 */
  open: (name: string) => `${name} の紹介ページを開く`,
  /** 他のページからメンバーへ飛ぶボタン。 */
  link: 'メンバーを見る',
  /** 紹介ページからメンバーへ戻るボタン。 */
  back: 'メンバーへ戻る',
  /** 知らない名前で紹介ページを開いたとき。 */
  notFound: 'その名前の人は見つかりませんでした。下の一覧から選び直せます。',
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

/**
 * Minecraft の活動カレンダーの文言。
 *
 * この画面が扱えるのは日別ログに残っている日だけ。サーバーがいつ建ったか、
 * その日に何があったかはログからは分からないので、そう読めてしまう
 * 言い方（「はじまりの日」など）は使わない。
 */
export const CALENDAR_TEXT = {
  title: '活動カレンダー',
  lead: 'サーバーのログに残っている日を暦に並べています。色が濃い日ほど多くの人が入っていて、枠の中の顔はその日いた人です。日を押すと詳しく出ます。',
  note: (from: string, to: string) => `${from} 〜 ${to} の記録から作っています。`,

  /** 記録の限界。ここは推測で埋めない。 */
  disclaimer:
    'ここに出るのは、日別ログに残っている日だけです。サーバーがいつ建ったか、記録より前に何があったかは、このデータからは分かりません。',

  /** 日ごとの並びの見出し。 */
  daysTitle: '日ごとの記録',
  /** 出来事だけを拾った一覧の見出し。暦の枠には入りきらないため別に出す。 */
  marksTitle: '記録に残っている出来事',

  /** 週の見出し（日曜はじまり）。 */
  weekdays: ['日', '月', '火', '水', '木', '金', '土'] as const,
  month: (year: number, month: number) => `${year}年 ${month}月`,

  kpi: {
    span: '記録のある日数',
    spanUnit: '日',
    people: '記録に出た人数',
    peopleUnit: '人',
    joins: 'サーバーに入った回数',
    joinsUnit: '回',
    deaths: '亡くなった回数',
    deathsUnit: '回',
  },

  day: {
    people: (count: number) => `${formatInt(count)} 人`,
    joins: (count: number) => `入室 ${formatInt(count)}`,
    deaths: (count: number) => `死亡 ${formatInt(count)}`,
    firstSeen: (time: string) => `最初の入室 ${time}`,
    /** 暦の枠を指したときに出す説明。 */
    tooltip: (date: string, people: number, joins: number, deaths: number, names: string[]) =>
      `${date}: ${formatInt(people)} 人 / 入室 ${formatInt(joins)} / 死亡 ${formatInt(deaths)}${
        names.length > 0 ? ` （${names.join('・')}）` : ''
      }`,
    /** 誰も入らなかった日。 */
    empty: (date: string) => `${date}: 記録なし`,
    /** 枠に収まらなかった人数。 */
    more: (count: number) => `ほか ${formatInt(count)} 人`,
  },

  /** 日を押したときに出す、その日いた人の一覧。 */
  players: {
    title: (date: string) => `${date} にいた人`,
    /** 押す前の案内。 */
    hint: '日を押すと、その日サーバーにいた人が出ます。',
    /** 記録の無い日を押したとき。 */
    empty: (date: string) => `${date} は誰も入っていません。`,
    close: '閉じる',
    /**
     * 最初と最後のあいだの幅。
     *
     * ログにあるのは「最初に見た時刻」と「最後に見た時刻」だけなので、
     * この差は途中で抜けていた時間も含む。プレイ時間とは呼ばない。
     */
    span: (minutes: number) =>
      minutes >= 60 ? `${Math.floor(minutes / 60)} 時間 ${minutes % 60} 分` : `${minutes} 分`,
    spanLabel: '最初と最後のあいだ',
    spanUnknown: '時刻が読めません',
    range: (from: string, to: string) => `${from} 〜 ${to}`,
    joins: (count: number) => `入室 ${formatInt(count)}`,
    deaths: (count: number) => `死亡 ${formatInt(count)}`,
    /** 幅の意味の断り。 */
    note: 'ログにあるのは最初と最後に見かけた時刻だけなので、この幅には途中で抜けていた時間も入ります。',
  },

  /** その日の出来事。数と名前は呼び出し側が渡す。 */
  mark: {
    first: '記録が残っているいちばん古い日',
    newcomer: (names: string[]) => `${names.join('・')} がはじめて記録に出た日`,
    peopleRecord: (count: number) => `ここまででいちばん多い ${formatInt(count)} 人が集まった日`,
    deathRecord: (count: number) => `ここまででいちばん多い ${formatInt(count)} 回の死亡があった日`,
  },
} as const;

/**
 * SRUSA の年表（サークルそのもの）の文言。
 *
 * Minecraft のログからは「サークルがいつ始まったか」は出てこない。
 * 分かっていないことは分かっていないと書く。それらしい文で埋めない。
 */
export const HISTORY_TEXT = {
  title: 'SRUSA 年表',
  lead: 'SRUSA というインカレサークルそのものの年表です。Minecraft サーバーの日ごとの記録は「活動カレンダー」にあります。',

  reach: {
    title: 'いま分かっていること',
    note: '相関図に載っている人の所属から数えた数です。サークルの成り立ちや活動そのものは、ここからは分かりません。',
    universities: '出てくる大学',
    universitiesUnit: '校',
    known: '学校が分かっている人',
    knownUnit: '人',
    bridging: '学校を 2 つ以上またぐ人',
    bridgingUnit: '人',
    universityList: (names: string[]) => names.join('・'),
  },

  growth: {
    title: '人数の推移',
    note: (known: number, total: number) =>
      `加入時期が分かっている ${formatInt(known)} 人ぶんだけの線です（相関図に載っているのは ${formatInt(total)} 人）。`,
    /** 点が足りなくて線にならないときに出す。 */
    tooFew: (known: number, total: number) =>
      `加入時期が分かっているのは ${formatInt(known)} 人 / ${formatInt(total)} 人で、まだ 1 つの時期にしか点が立ちません。data/srusa-relationship-*.json の人物に joinedOn（YYYY-MM）を足すと、そのぶんが自動で線になります。`,
    seriesLabel: '人数',
    unit: '人',
  },

  axis: {
    title: '時系列で見る',
    note: 'つまみを右へ動かすと、その時点までの出来事とメンバーの数が出てきます。',
    /** つまみの読み上げ。 */
    sliderLabel: '見る時点',
    play: '進める',
    pause: '止める',
    reset: '最初へ',
    /** いま見ている時点。 */
    at: (month: string) => `${month} 時点`,
    members: (count: number) => `メンバー ${formatInt(count)} 人`,
    /** 時期が分かっていない出来事は軸に乗らないので、その数を添える。 */
    undatedCount: (count: number) => `時期が分かっていない出来事が ${formatInt(count)} 件あり、この軸には出ません。`,
    /** 軸に乗せられる出来事がまだ足りないとき。 */
    tooFew: '時期の分かっている出来事がまだ 1 件しかないので、軸になりません。data/srusa-history-v0.1.json に日付を入れると伸びます。',
  },

  timeline: {
    title: '年表',
    empty: 'まだ確かめられた出来事がありません。下の「これから埋めること」にあるものが分かったら、data/srusa-history-v0.1.json に足してください。',
  },

  todo: {
    title: 'これから埋めること',
    note: '開催したことは分かっていても、年月や参加者がまだ分かっていないものです。推測で書かず、そのまま出しています。分かった時点で data/srusa-history-v0.1.json の status を confirmed にすると、上の年表へ移ります。',
    badge: '未記入',
  },

  entry: {
    /** 「2021-03 ごろ」のように、はっきりしない時期をそう見せる。 */
    approximate: (date: string) => `${date} ごろ`,
    /** 同じ催しを何回やったか。 */
    count: (times: number) => `${formatInt(times)} 回`,
    /** 参加した人。 */
    participants: (names: string[]) => `参加: ${names.join('・')}`,
  },

  /** 日付が入っていない項目の表示。 */
  undated: '時期が不明',
} as const;

/**
 * まだ中身の無いゲームのページ（VALORANT・LOL・APEX）の文言。
 *
 * 「準備中」という事実だけを言う。それらしい統計や説明をでっち上げない。
 */
export const GAME_PLACEHOLDER_TEXT = {
  lead: (game: string) => `${game} のページはまだありません。`,
  note: 'ここにはまだ中身がありません。データが揃ったら、Minecraft の統計や活動カレンダーと同じ形で追加します。',
} as const;
