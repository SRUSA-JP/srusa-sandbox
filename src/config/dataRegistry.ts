export const FEATURED_ITEM_RANKING_DEFAULT_ID = 'minecraft:lava_bucket';
export const FEATURED_ITEM_RANKING_LIMIT = 5;
export const FEATURED_ITEM_LEADER_LIMIT = 1;
export const FEATURED_ITEM_SUMMARY_LIMIT = 3;
export const FEATURED_ITEM_RECENT_LIMIT = 2;

export const PLAYER_DAILY_DEFAULT_METRIC = 'playtime_hours';
export const PLAYER_DAILY_RANKING_LIMIT = 8;
export const PLAYER_RANKING_DEFAULT_BREAKDOWN = 'mined';

export const DISCOVERY_DEFAULT_DISPLAY_MODE = 'featured';
export const MINECRAFT_HERO_DEFAULT_DISPLAY_MODE = 'overview';
export const RELATIONSHIP_MAP_DEFAULT_EDGE_MODE = 'all';

export const EVENT_RANKING_DEFAULT_EVENT_ID = 'mahjong';
export const EVENT_RANKING_DEFAULT_METRIC = 'points';
export const EVENT_RANKING_CHART_LIMIT = 8;
export const EVENT_RANKING_HIGHLIGHT_LIMIT = 3;

/**
 * 連続プレイ日数の帯に並べる日数。
 *
 * 3 週間ぶんあれば「先週は毎日いたが今週は空いている」といった波が見える。
 * これより長くすると、狭い画面で 1 マスが潰れて読めなくなる。
 */
export const PLAY_STREAK_WINDOW_DAYS = 21;

/**
 * 図鑑のカード 1 枚に出す所属の数。
 *
 * 4 つを超える人がいるので、多い人だけカードが縦に伸びて並びが崩れないように
 * 上限を決め、あふれたぶんは「ほか n」とまとめる。
 */
export const ZUKAN_ATTRIBUTE_LIMIT = 3;

/** 図鑑カードで、所属数の上限があっても優先して見せるタグ。 */
export const ZUKAN_PRIORITY_ATTRIBUTES = ['アクティブメンバー'];

/**
 * 活動カレンダーの 1 枠の濃さ。
 *
 * いちばん人が多かった日を上限、記録のある日の下限をこの値にする。
 * 下限を 0 にすると「1 人だけ来た日」が「誰も来なかった日」と同じ見た目になる。
 */
export const CALENDAR_DAY = {
  minAlpha: 0.18,
  maxAlpha: 0.9,
} as const;

/**
 * 活動カレンダーの 1 枠に並べる顔アイコンの上限。
 *
 * 枠は狭いので、人数が多い日でも枠を伸ばさずに済むよう、
 * ここを超えたぶんは「ほか n 人」にまとめる。
 */
export const CALENDAR_DAY_AVATAR_LIMIT = 3;

/**
 * ホームの更新ログで、開かなくても見える件数。
 *
 * 更新は増え続けるので、全部並べるとホームが更新ログだけで埋まってしまう。
 * 直近だけを見せ、それより前は開いて見る形にする。
 */
export const HOME_UPDATES_VISIBLE_LIMIT = 3;
