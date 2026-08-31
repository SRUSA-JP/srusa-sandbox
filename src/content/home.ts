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
  lead: '最近入った更新を入口に、Minecraft 統計・ワールドマップ・活動カレンダー・メンバー図鑑へ移動できます。',
  updatesTitle: '更新ログ',
  jumpsTitle: 'ジャンプ',
} as const;

export const HOME_UPDATES: HomeUpdate[] = [
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
