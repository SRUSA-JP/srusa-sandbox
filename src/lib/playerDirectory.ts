/**
 * 図鑑の絞り込みと数え上げ。
 *
 * 「誰を出すか」だけを決める純関数で、React にも色にも依存しない。
 * 同じ入力なら同じ出力を返し、入力の配列を変更しない。
 * 見せ方（札の文言・所属を何個まで出すか）は lib/display.ts と config が決める。
 */
import type { PlayerProfile } from '../data/playerProfiles';
import type { PlayStreak } from './playStreak';

/** 種類での絞り込み。 */
export type DirectoryKind = 'all' | 'minecraft' | 'relationship';

/** 図鑑の並び替え。 */
export type DirectorySort = 'name' | 'minecraft' | 'relationship' | 'playtime' | 'streak' | 'related';

/**
 * 所属で絞らないときの値。
 *
 * 所属名そのものと衝突しない記号にする。画面に出る文字ではないので
 * config/messages.ts ではなくここに置く。
 */
export const ANY_ATTRIBUTE = '*';

/**
 * Minecraft サーバーに参加している人か。
 *
 * 統計・日別ログ・スキンのどれかがあれば参加しているとみなす。
 * 相関図にしかいない人（サーバーに入っていない知り合い）と分けるための判定。
 */
export function playsMinecraft(profile: PlayerProfile): boolean {
  return Boolean(profile.stats ?? profile.dailyName ?? profile.skin);
}

/** その人の所属（相関図の attributes）。 */
export function profileAttributes(profile: PlayerProfile): string[] {
  return profile.record.relationship.attributes;
}

/** 所属ごとの人数。多い順、同数なら名前順。 */
export function attributeCounts(
  profiles: PlayerProfile[],
): Array<{ attribute: string; count: number }> {
  const counts = new Map<string, number>();
  for (const profile of profiles) {
    for (const attribute of profileAttributes(profile)) {
      counts.set(attribute, (counts.get(attribute) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([attribute, count]) => ({ attribute, count }))
    .sort((a, b) => b.count - a.count || a.attribute.localeCompare(b.attribute, 'ja'));
}

/** 絞り込み。並び順は入力のまま変えない。 */
export function filterProfiles(
  profiles: PlayerProfile[],
  { attribute, kind }: { attribute: string; kind: DirectoryKind },
): PlayerProfile[] {
  return profiles.filter((profile) => {
    if (attribute !== ANY_ATTRIBUTE && !profileAttributes(profile).includes(attribute)) return false;
    if (kind === 'minecraft') return playsMinecraft(profile);
    if (kind === 'relationship') return !playsMinecraft(profile);
    return true;
  });
}

function byName(a: PlayerProfile, b: PlayerProfile): number {
  return a.name.localeCompare(b.name, 'ja');
}

/** 相関図で直接つながっている人数。 */
export function relatedPeopleCount(profile: PlayerProfile): number {
  return new Set(profile.relatedPeople.map((person) => person.id)).size;
}

/** 図鑑の並び替え。入力の配列は変更しない。 */
export function sortProfiles(
  profiles: PlayerProfile[],
  sort: DirectorySort,
  streaks: Map<string, PlayStreak> = new Map(),
): PlayerProfile[] {
  return [...profiles].sort((a, b) => {
    if (sort === 'minecraft') {
      return Number(playsMinecraft(b)) - Number(playsMinecraft(a)) || byName(a, b);
    }
    if (sort === 'relationship') {
      return Number(!playsMinecraft(b)) - Number(!playsMinecraft(a)) || byName(a, b);
    }
    if (sort === 'playtime') {
      return (b.stats?.playtime.hours ?? 0) - (a.stats?.playtime.hours ?? 0) || byName(a, b);
    }
    if (sort === 'streak') {
      const aStreak = streaks.get(a.name);
      const bStreak = streaks.get(b.name);
      return (
        (bStreak?.current ?? 0) - (aStreak?.current ?? 0) ||
        (bStreak?.longest ?? 0) - (aStreak?.longest ?? 0) ||
        (bStreak?.totalDays ?? 0) - (aStreak?.totalDays ?? 0) ||
        byName(a, b)
      );
    }
    if (sort === 'related') {
      return relatedPeopleCount(b) - relatedPeopleCount(a) || byName(a, b);
    }
    return byName(a, b);
  });
}
