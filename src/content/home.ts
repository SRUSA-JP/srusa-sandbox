export interface HomeJump {
  title: string;
  description: string;
  href?: string;
  children?: HomeJump[];
}

export interface HomeUpdate {
  date: string;
  category: string;
  title: string;
  href: string;
  summary: string;
  image?: {
    src: string;
    alt: string;
  };
  details: string[];
}

export const HOME_CONTENT = {
  title: 'SRUSA Sandbox',
  lead: '最近入った更新とページ目次から、見たい記録へ直接移動できます。',
  updatesTitle: '更新ログ',
  jumpsTitle: 'ページ目次',
  updateDetailsLabel: '要点を表示',
  /** 折りたたんだ古い更新を開くラベル。件数は呼び出し側が渡す。 */
  moreUpdatesLabel: (count: number) => `それ以前の更新（${count}件）を表示`,
  jumpCount: (count: number) => `${count}件`,
} as const;

export const HOME_UPDATES: HomeUpdate[] = [
  {
    date: '2026-09-16',
    category: 'ギャラリー',
    title: '動画にサムネイルと再生ボタンを追加',
    href: '#/gallery',
    summary: '動画は最初にサムネイルと再生ボタンだけを見せ、押してから読み込むようにしました。読み込めない場合でも面と再生ボタンは必ず表示されます。APEX カスタム・VALORANT カスタムは実際の動画が届くまでのプレースホルダーを置いています。',
    details: [
      '動画カードの表示を、サムネイル＋再生ボタン→押して再生の 2 段階にした',
      'サムネイルが読み込めなくても、面と再生ボタンは残るようにした',
      'APEX カスタム・VALORANT カスタムのプレースホルダーを追加（動画が届き次第、実データに差し替え）',
    ],
  },
  {
    date: '2026-09-16',
    category: 'ギャラリー',
    title: 'ギャラリーのタグを色分け',
    href: '#/gallery',
    summary: 'ゲーム・登場人物・シーンのタグの地の色を分け、見分けやすくしました。押して絞り込む操作は今までどおりです。',
    details: [
      'タグの地の色をゲーム / 登場人物 / シーンの種類ごとに分けた',
      '絞り込んでも種類ごとの色は変わらない',
    ],
  },
  {
    date: '2026-09-16',
    category: '年表',
    title: 'SRUSA という名前の由来の時期が判明',
    href: '#/history',
    summary: '名前の由来が決まったのは創設と同じ時期（2020-04）と分かったので、年表に反映しました。',
    details: [
      '「SRUSA という名前の由来」の年月を 2020-04（創設と同時期）に更新',
      'どの語の頭文字かは引き続き未確定のまま',
    ],
  },
  {
    date: '2026-09-16',
    category: 'ギャラリー',
    title: 'ギャラリーの並びを件数に合わせて調整',
    href: '#/gallery',
    summary: '件数が少ないときに右側が大きく空くのを直し、カードが中央に寄って並ぶようにしました。件数が増えれば自動で折り返して並びます。',
    details: [
      '段組み（columns）から、余った列を潰す grid レイアウトに変更',
      'カードの幅は上限・下限を決め、余った横幅の中央に配置',
    ],
  },
  {
    date: '2026-09-16',
    category: '年表',
    title: 'SRUSA という名前の由来に推定案を追記',
    href: '#/history',
    summary: 'SRUSA の略称が何の頭文字かはまだ未確定ですが、語呂が近い案を推定として年表に追記しました。',
    details: [
      '「Science-oriented Remote University Students Association」という語呂案を追記',
      '厳密な略称の裏付けとなる資料は無いため、あくまで推定と明記',
    ],
  },
  {
    date: '2026-09-16',
    category: '年表',
    title: 'オフラインカスタム・APEX カスタムの年月が判明',
    href: '#/history',
    summary: '配信アーカイブから、オフラインカスタムと APEX カスタムそれぞれ 1 回ぶんの開催日が分かりました。',
    details: [
      'オフラインカスタム（2026-03-27 開催ぶん）の年月を追記。参加者は引き続き未記入',
      'APEX カスタム（2023-03-05 開催ぶん）の年月を追記。参加者は引き続き未記入',
      'それぞれもう 1 回ぶんは、年月・参加者とも未記入のまま年表に残している',
    ],
  },
  {
    date: '2026-09-16',
    category: 'ギャラリー',
    title: 'ギャラリーを展示形式に作り直し',
    href: '#/gallery',
    summary: '選んでから見る画面をやめ、カード一枚一枚が画像・動画をそのまま見せる展示ギャラリーにしました。絞り込みは折りたたんで、開けば細かく設定できます。',
    details: [
      '選択中の名シーンを見せる別枠をやめ、一覧のカードが画像・動画を直接表示',
      '見せられるものが無いダミーデータを削除',
      '題名・説明の文章を減らし、画像・動画そのもので分かるようにした',
      'ゲーム・登場人物・シーン・タグの絞り込みと並び替えを 1 つの折りたたみにまとめ、初期表示を短くした',
      'Minecraft のスクリーンショット 2 件は表示をオフにした',
    ],
  },
  {
    date: '2026-09-03',
    category: 'ワールドマップ',
    title: '旧ワールド（before_srusa）のマップを追加',
    href: '#/minecraft/world-map',
    summary: '現行サーバーより前の旧ワールドを、別ディメンションとして 2D 地図とスポーン周辺 3D で見られるようにしました。',
    image: {
      src: 'world-map/before_srusa_overworld.png',
      alt: '旧ワールドのオーバーワールド地図',
    },
    details: [
      '旧オーバーワールドを overworld-before として、現行マップとは別に追加',
      '旧ワールドのスポーン周辺 3D マップを追加',
      'BlueMap 5.x のタイル形式変更と、Vite が .gz に付ける Content-Encoding による二重展開の不具合を修正',
    ],
  },
  {
    date: '2026-09-03',
    category: 'ワールドマップ',
    title: '限定 3D ビューアでマップを切り替え可能に',
    href: '#/minecraft/world-map',
    summary: 'スポーン周辺・黄昏の森など、狭い範囲だけ描いた 3D マップを、ビューア内で切り替えられるようにしました。',
    details: [
      '黄昏の森スポーン周辺（16 チャンク）の 3D マップを追加',
      '3D ビューアにマップの切替を追加',
      'BlueMap 5.x で dimension が抜けて読み込めない不具合と、自アプリが二重に表示される不具合を修正',
    ],
  },
  {
    date: '2026-09-03',
    category: 'ホーム / ナビ',
    title: 'ホームを刷新し、スマホは下部タブに',
    href: '#/',
    summary: 'ホームに更新ログとページ目次を追加し、スマートフォンではヘッダーに代えて下部タブで画面を切り替えられるようにしました。ボドゲのポイント集計も追加しています。',
    details: [
      'ホームに更新ログ・ページ目次を追加（このログもここ）',
      'スマートフォンは下部タブ、それ以外は今までどおりヘッダーで画面を切り替え',
      '相関図に、所属を辿った関係樹の表示を追加',
      'ボドゲ（ポイント集計・記録シート）を追加',
    ],
  },
  {
    date: '2026-08-31',
    category: 'ワールドマップ',
    title: 'スポーン周辺 3D をスマホで見やすく',
    href: '#/minecraft/world-map',
    summary: 'スマートフォン表示の高さを広げ、3D マップに全画面切替を追加しました。',
    image: {
      src: 'images/bluemap-overworld-spawn.png',
      alt: 'スポーン周辺を表示した 3D マップ',
    },
    details: ['3D 表示をワールドマップの既定表示に変更', 'スマホ向けの縦幅を拡張', '全画面 / 終了ボタンを追加'],
  },
  {
    date: '2026-08-31',
    category: 'ワールドマップ',
    title: '地図の履歴切替を追加',
    href: '#/minecraft/world-map',
    summary: '過去分がある 2D ワールドマップは、最新表示と日付指定を切り替えられるようになりました。',
    image: {
      src: 'world-map/overworld-current.png',
      alt: 'オーバーワールドの 2D マップ',
    },
    details: ['最新は各ディメンションの最新地図を表示', '日付指定時は存在する地図だけに絞り込み', 'ディメンション切替と併用可能'],
  },
  {
    date: '2026-08-30',
    category: 'Minecraft 統計',
    title: '2026/08/30 データに更新',
    href: '#/minecraft',
    summary: '統計、日別ログ、活動カレンダー、アイテム使用ランキングを 2026/08/30 のデータへ更新しました。',
    image: {
      src: 'world-map/overworld.png',
      alt: 'Minecraft ワールドマップ',
    },
    details: ['統計 JSON を追加', '活動カレンダー用ログを追加', 'ライブ更新コマンドと手順を整備'],
  },
  {
    date: '2026-08-30',
    category: 'Minecraft 統計',
    title: 'サーバー維持費の試算を追加',
    href: '#/minecraft',
    summary: 'プレイ時間を使った傾斜配分、丸め単位、プレイヤー別のカスタム額を試せるようにしました。',
    details: ['総額・基本割・傾斜係数を変更可能', '配分結果を表と横棒グラフで表示', 'CSV 出力に対応'],
  },
  {
    date: '2026-08-25',
    category: 'メンバー',
    title: 'SRUSA 図鑑を追加',
    href: '#/zukan',
    summary: '相関図や Minecraft に出てくるメンバーをカードで探し、個別ページへ移動できるようにしました。',
    details: ['相関図から図鑑へ移動可能', '所属・種類で絞り込み', 'プレイヤーページに連続プレイ日数を表示'],
  },
];

export const HOME_JUMPS: HomeJump[] = [
  {
    title: 'ゲーム',
    description: 'Minecraft、ボドゲ、その他ゲームの記録を見る',
    children: [
      {
        title: 'Minecraft',
        href: '#/minecraft',
        description: '統計、ワールドマップ、活動カレンダー',
        children: [
          { title: '統計', href: '#/minecraft', description: 'プレイ時間、移動距離、採掘、戦闘、維持費試算を見る' },
          { title: 'ワールドマップ', href: '#/minecraft/world-map', description: 'スポーン周辺 3D と 2D マップの履歴を見る' },
          { title: '活動カレンダー', href: '#/minecraft/calendar', description: '日ごとのログイン状況とプレイヤー別の活動を見る' },
        ],
      },
      {
        title: 'ボドゲ',
        href: '#/board-games/score',
        description: 'ポイント集計と記録シートを使う',
      },
      { title: 'VALORANT', href: '#/valorant', description: 'VALORANT の入口' },
      { title: 'LOL', href: '#/lol', description: 'LOL の入口' },
      { title: 'APEX', href: '#/apex', description: 'APEX の入口' },
    ],
  },
  {
    title: '人',
    description: 'メンバーと相関図を行き来する',
    children: [
      { title: 'メンバー', href: '#/zukan', description: 'SRUSA 図鑑とプレイヤー紹介ページへ移動する' },
      { title: '相関図', href: '#/relationships', description: '人物どうしの関係、所属、クラスタ配置を見る' },
    ],
  },
  {
    title: '記録',
    description: '年表とイベント記録を見る',
    children: [
      { title: '年表', href: '#/history', description: 'SRUSA の流れを見る' },
      { title: 'イベント', href: '#/events', description: 'イベントランキングを見る' },
    ],
  },
  {
    title: 'ギャラリー',
    href: '#/gallery',
    description: '動画や画像のクリップを見る',
  },
];
