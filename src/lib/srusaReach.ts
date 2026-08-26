/**
 * 相関図のデータから、SRUSA の広がりを数える。
 *
 * インカレサークルの「インカレ（複数の大学にまたがる）」らしさは、
 * 人の所属を数えれば分かる。分かるのはここまでで、サークルとしての
 * 成り立ちや活動はここからは出てこない（それは data/srusa-history に書く）。
 */
import type { RelationshipData } from '../map/schema';
import { groupTypeSetting } from '../map/config';

/** 学校にあたる分類。ここに入るものだけを「学校」として数える。 */
const SCHOOL_TYPES = new Set(['university', 'school', 'school_stage', 'education']);

export interface SrusaReach {
  /** 所属者のいる大学。 */
  universities: string[];
  /** 所属者のいる学校（大学・高校・塾などを含む）。 */
  schools: string[];
  /** 学校の所属が分かっている人数。 */
  known: number;
  /** 相関図に載っている人数。 */
  total: number;
  /** 学校を 2 つ以上またぐ人数。 */
  bridging: number;
}

export function srusaReach(data: RelationshipData): SrusaReach {
  const byName = new Map(data.groups.map((group) => [group.name, group]));
  const isSchool = (name: string) => {
    const group = byName.get(name);
    return group ? SCHOOL_TYPES.has(group.type) : false;
  };

  const schoolsOf = (attributes: string[]) => attributes.filter(isSchool);

  const used = new Set<string>();
  for (const person of data.people) {
    for (const name of schoolsOf(person.attributes)) used.add(name);
  }

  const universities = data.groups
    .filter((group) => group.type === 'university' && used.has(group.name))
    .sort((a, b) => groupTypeSetting(a.type).order - groupTypeSetting(b.type).order || a.name.localeCompare(b.name, 'ja'))
    .map((group) => group.name);

  const schools = data.groups
    .filter((group) => SCHOOL_TYPES.has(group.type) && used.has(group.name))
    .map((group) => group.name);

  const known = data.people.filter((person) => schoolsOf(person.attributes).length > 0).length;
  const bridging = data.people.filter(
    (person) => new Set(schoolsOf(person.attributes)).size >= 2,
  ).length;

  return { universities, schools, known, total: data.people.length, bridging };
}

/* ------------------------------------------------------------------ *
 * 人数の推移
 * ------------------------------------------------------------------ */

export interface MemberGrowthPoint {
  /** `YYYY-MM`。 */
  month: string;
  /** その月までに入った人の累計。 */
  members: number;
}

export interface MemberGrowth {
  points: MemberGrowthPoint[];
  /** 加入時期が分かっている人数。 */
  known: number;
  /** 相関図に載っている人数。 */
  total: number;
}

/** `YYYY-MM` / `YYYY` を `YYYY-MM` に揃える。読めない値は捨てる。 */
function toMonth(value: string): string | null {
  const matched = /^(\d{4})(?:-(\d{2}))?/.exec(value.trim());
  if (!matched) return null;
  return `${matched[1]}-${matched[2] ?? '01'}`;
}

function nextMonth(month: string): string {
  const [year, index] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, index, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * 加入時期から人数の推移を作る。
 *
 * 分かっている人だけを数える。分からない人を「まだ入っていない」と扱うと、
 * 実際より少ない人数の線になってしまう。そうならないよう、線と一緒に
 * 「分かっているのは何人ぶんか」も返して、画面でそのまま出す。
 *
 * 途中の月は、誰も入らなくても点を置く。飛ばすと横軸の間隔が月と合わなくなり、
 * 増え方が実際より急に見える。
 */
export function memberGrowth(data: RelationshipData): MemberGrowth {
  const months = data.people
    .map((person) => (person.joinedOn ? toMonth(person.joinedOn) : null))
    .filter((month): month is string => month !== null)
    .sort();

  const total = data.people.length;
  if (months.length === 0) return { points: [], known: 0, total };

  const joinedAt = new Map<string, number>();
  for (const month of months) joinedAt.set(month, (joinedAt.get(month) ?? 0) + 1);

  const points: MemberGrowthPoint[] = [];
  let running = 0;
  for (let month = months[0]; month <= months[months.length - 1]; month = nextMonth(month)) {
    running += joinedAt.get(month) ?? 0;
    points.push({ month, members: running });
  }

  return { points, known: months.length, total };
}
