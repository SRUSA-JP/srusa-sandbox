/**
 * 相関図の表示設定。
 *
 * 寸法・間隔・分類ごとの見せ方は、この 1 ファイルだけが持つ。
 * 描画側（display.ts / 各コンポーネント）は必ずここを参照し、
 * 数値や分類名を直接書かない。ここを編集すれば全ての表示が変わる。
 *
 * 色そのものは持たない。色は theme/palette.ts が唯一の出どころで、
 * ここでは「何番目の色スロットを使うか」だけを決める。
 * 文字の大きさ・太さは theme/tokens.ts のトークンを使い、値を重複させない。
 */
import { FONT_SIZE, FONT_WEIGHT, LAYOUT } from '../theme/tokens';
import type { GroupType } from './schema';

/**
 * 人物ノード。
 *
 * アイコン画像（`Person.avatarUrl`）があればそれを、無ければ `fallback` の
 * 代替表示を出す。どちらでも大きさと位置は同じなので、後から画像を足しても
 * レイアウトは変わらない。
 */
export const NODE = {
  /** アイコンの直径。 */
  size: 34,
  /** 中心人物の倍率。 */
  centerScale: 1.35,
  /** ノード同士の間隔（ラベルの重なりを避ける最小幅）。 */
  gapX: 124,
  gapY: 72,
  labelFontSize: FONT_SIZE.xs,
  /** アイコン下端からラベルまでの距離。 */
  labelOffsetY: 14,
  /** 通常の人物のラベルの太さ。 */
  labelFontWeight: FONT_WEIGHT.normal,
  /** 中心人物のラベルの太さ。 */
  centerLabelFontWeight: FONT_WEIGHT.medium,
  /** 枠線の太さ。 */
  ringWidth: 1.5,
  /** 中心人物の枠線を太くする倍率。 */
  centerRingScale: 2,
  /** アイコン画像が無いときの代替表示。 */
  fallback: 'silhouette' as 'silhouette' | 'initial',
} as const;

/**
 * アイコン画像が無いときの代替表示。
 *
 * すべて半径に対する比率で持つので、ノードの大きさを変えても形は崩れない。
 */
export const AVATAR = {
  /** イニシャル表示の文字。半径に対する比率。 */
  initialFontScale: 1,
  initialFontWeight: FONT_WEIGHT.medium,
  /** 人型（頭と肩）の各部。 */
  silhouette: {
    /** 頭の半径。 */
    headRadius: 0.3,
    /** 頭の中心の高さ（上が負）。 */
    headOffsetY: -0.24,
    /** 肩幅（中心から片側まで）。 */
    shoulderWidth: 0.62,
    /** 肩の高さ（胴の垂直部分）。 */
    shoulderHeight: 0.34,
    /** 肩の丸みの縦横比。 */
    shoulderCurve: 0.9,
    /** 肩全体を下げる量。 */
    offsetY: 0.12,
  },
} as const;

/**
 * 所属が無く、特定の人物とだけ繋がっている人の配置。
 * 相手の近くに置くことで、図を横切る長い関係線を減らす。
 */
export const SATELLITE = {
  /** 他のノードから最低限空ける距離。 */
  minDistance: 104,
  /** 空き場所を探すときの半径の刻み。 */
  radiusStep: 46,
  /** 1 周あたりの試行方向の数。 */
  directions: 16,
  /** 探索する最大半径。 */
  maxRadius: 460,
} as const;

/** 同じ所属の組み合わせを持つ人のまとまり。 */
export const CLUSTER = {
  /** 1 クラスタあたりの最大列数。増やすと横長になる。 */
  maxColumns: 4,
  /** クラスタ同士の間隔。領域の余白より広く取る。 */
  gap: 88,
  /**
   * 並び順を決めるときに、関係の多さをどれだけ重視するか。
   * 0 なら所属の重なりだけ、大きくすると関係のあるクラスタを優先して隣に置く。
   */
  relationAffinity: 1.2,
  /** 関係の多さを 1.0 と見なす本数。 */
  relationSaturation: 2,
} as const;

/**
 * 所属ごとのまとまりを作り直す緩和計算。
 *
 * 並べ替えだけでは、複数の所属を持つ人がどれか 1 か所にしか置けず、
 * その人の別の所属の領域が図を横切って伸びてしまう。そこで置いたあとに、
 * 所属の重心へ少しずつ引き寄せて、所属ごとの塊を締める。
 * 複数の所属を持つ人は、それぞれの重心に等しく引かれて塊と塊の間に落ち着く。
 */
export const GROUP_RELAX = {
  /** 繰り返す回数。多いほど締まるが、動きすぎると元の並びの意図が消える。 */
  iterations: 220,
  /** 所属の重心へ引き寄せる強さ。 */
  attraction: 0.12,
  /**
   * 関係線でつながっている人どうしを引き寄せる強さ。
   *
   * 所属より関係線を優先したいので、所属の引きより強めに取る。
   * 強くしすぎると、関係の多い人（ハブ）に引きずられて所属のまとまりが崩れる。
   */
  edgeAttraction: 0.22,
  /** 関係線でつながっている人どうしの、ちょうどよい距離。 */
  edgeDistance: 148,
  /** 近づきすぎた人どうしを離す強さ。 */
  repulsion: 0.62,
  /**
   * 人と人がこれ以上近づかない距離。
   * ノードの間隔より少し狭くして、塊の中では詰めて置けるようにする。
   */
  minDistance: 82,
} as const;

/**
 * 人のノードが重ならないようにする最後の調整。
 *
 * 置き方はいくつもあり（所属のまとまり・衛星・はみ出しの押し出し）、
 * どれか 1 つを直しても別の経路で重なりが残る。そこで最後にまとめて、
 * 重なっている組を必ず離す。
 */
export const SEPARATION = {
  /** 押し離す繰り返しの上限。これで解けない密集は諦めて図を広げる。 */
  passes: 120,
  /** アイコンとアイコンの間に必ず空ける距離。名前が読める分だけ取る。 */
  padding: 14,
} as const;

/** 図全体。 */
export const CANVAS = {
  padding: 72,
  /** 行を折り返す目安の幅。実際の幅は内容に合わせて決まる。 */
  targetWidth: 1180,
} as const;

/** グループを囲う領域。 */
export const REGION = {
  /** ノードの外側に取る余白。入れ子を見せるため分類ごとに縮める。 */
  padding: 34,
  /** 入れ子 1 段ごとに余白を詰める量。 */
  nestedPaddingStep: 12,
  /**
   * 囲いの曲がり具合。0 で直線の多角形、1 で滑らかな曲線。
   *
   * 直線で囲うと、囲いの辺が図を横切る「境界線」に見えてしまう。
   * 曲線にすると、同じ所属の人をふわりと包んだ形になり、重なりも読み取りやすい。
   */
  curveTension: 1,
  strokeWidth: 1.5,
  /** 塗りの不透明度。重なりを見せるため薄くする。 */
  fillAlpha: 0.1,
  /** 強調時の塗りの不透明度。 */
  highlightFillAlpha: 0.22,
  /** 非所属者が領域内に入ったとき、外側へ押し出す最大パス数。 */
  strictPasses: 5,
  /** 1 回あたりの押し出し距離。 */
  strictPushStep: 42,
  /** 1 人あたりの押し出し最大試行回数。 */
  strictMaxSteps: 16,
  /** 真上に重なったときの退避方向数。 */
  strictDirections: 12,
  labelFontSize: FONT_SIZE.sm,
  labelOffsetY: -8,
  labelFontWeight: FONT_WEIGHT.medium,
} as const;

/** 関係線。 */
export const EDGE = {
  width: 1.5,
  /**
   * 角の丸め（座標単位）。
   *
   * 路線図のように直角と 45 度だけで繋ぐので、角はそのままだと尖る。
   * ドット絵風の見た目に合わせて、0 にすればカクカクのままにできる。
   */
  elbow: 0,
  /** 確度が低い関係の破線パターン。 */
  uncertainDash: '5 4',
  opacity: 0.75,
  /** 中心人物に繋がる線の強調幅。 */
  highlightWidth: 2.5,
} as const;

/** 凡例。 */
export const LEGEND = {
  swatchSize: LAYOUT.swatchSize,
  fontSize: FONT_SIZE.sm,
} as const;

/**
 * グループの分類ごとの見せ方。
 *
 * - `label`: 凡例に出す分類名
 * - `colorSlot`: カテゴリ配色の何番目を使うか（config/colors.ts の枠を循環）
 * - `depth`: 入れ子の深さ。大きいほど内側に描き、余白を詰める
 * - `order`: 描画順の基準。小さいほど先（＝下）に描く
 * - `binds`: 配置のときに所属者を引き寄せてまとまりを作るか
 */
export interface GroupTypeSetting {
  label: string;
  colorSlot: number;
  depth: number;
  order: number;
  /**
   * その所属が「場所」かどうか。
   *
   * 大学・高校・塾・部活は同じ場所に居る人の集まりなので、図の上でも
   * まとめて置く。一方「アクティブメンバー」「ネット友」のような札は、
   * 別々の場所に居る人に横断的に付く。これを引き寄せると学校や大学の
   * まとまりを引き裂いて、領域が図を横切ってしまうので、配置には効かせない。
   * 領域そのものは描くので、凡例から強調して確かめることはできる。
   */
  binds: boolean;
}

export const GROUP_TYPE_SETTINGS: Record<GroupType, GroupTypeSetting> = {
  university: { label: '大学', colorSlot: 0, depth: 0, order: 10, binds: true },
  lab: { label: '研究室', colorSlot: 3, depth: 1, order: 60, binds: true },
  school: { label: '高校', colorSlot: 1, depth: 0, order: 20, binds: true },
  school_stage: { label: '学校段階', colorSlot: 2, depth: 0, order: 30, binds: true },
  education: { label: '塾', colorSlot: 4, depth: 0, order: 40, binds: true },
  company: { label: '会社', colorSlot: 5, depth: 0, order: 50, binds: true },
  club: { label: '部活', colorSlot: 6, depth: 1, order: 70, binds: true },
  friend_group: { label: '友人グループ', colorSlot: 7, depth: 1, order: 80, binds: true },
  activity: { label: '活動', colorSlot: 5, depth: 1, order: 90, binds: false },
  relationship_context: { label: '関係の文脈', colorSlot: 6, depth: 1, order: 100, binds: false },
  unknown: { label: '不明', colorSlot: 2, depth: 0, order: 110, binds: true },
};

/** 定義にない分類が来たときの既定値。データが増えても落ちないようにする。 */
export const FALLBACK_GROUP_TYPE: GroupTypeSetting = {
  label: 'その他',
  colorSlot: 2,
  depth: 0,
  order: 120,
  binds: false,
};

/** 分類ごとの設定を引く唯一の入口。設定表を直接参照しない。 */
export function groupTypeSetting(type: GroupType): GroupTypeSetting {
  return GROUP_TYPE_SETTINGS[type] ?? FALLBACK_GROUP_TYPE;
}

/** 所属が 1 つも無い人の扱い。 */
export const UNASSIGNED = {
  /** 図の中で使う仮のグループ ID と表示名。 */
  groupId: '__unassigned__',
  label: '所属情報なし',
  type: 'unknown' as GroupType,
  /** 領域として囲うか。 */
  showRegion: false,
} as const;

/** データの不整合をページ上部に出すときの表示件数。残りは件数だけ知らせる。 */
export const ISSUE_PREVIEW_COUNT = 3;

/** 関係線の表示切り替え。 */
export const EDGE_MODES = [
  { value: 'all', label: 'すべて表示' },
  { value: 'center', label: '中心人物のみ' },
  { value: 'none', label: '非表示' },
] as const;

export type EdgeMode = (typeof EDGE_MODES)[number]['value'];

/** 相関図の配置アルゴリズム。 */
export const LAYOUT_MODES = [
  { value: 'cluster', label: '所属クラスタ' },
  { value: 'clusterHybrid', label: '所属ハイブリッド' },
  { value: 'community', label: '関係コミュニティ' },
  { value: 'stress', label: '距離ストレス' },
  { value: 'attributeRadial', label: '所属リング' },
  { value: 'corePeriphery', label: 'コア周辺' },
  { value: 'force', label: '力学' },
  { value: 'radial', label: '放射状' },
  { value: 'layered', label: '階層' },
  { value: 'circular', label: '円形' },
] as const;

export type LayoutMode = (typeof LAYOUT_MODES)[number]['value'];
