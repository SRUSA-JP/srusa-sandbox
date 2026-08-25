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
