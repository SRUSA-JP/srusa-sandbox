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
