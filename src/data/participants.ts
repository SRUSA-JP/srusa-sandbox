import { loadRelationshipData } from '../map/data';
import type { Person } from '../map/schema';
import { allPlayerRecords, closePlayerName, type PlayerDbRecord } from './playerDb';

export const ACTIVE_MEMBER_ATTRIBUTE = 'アクティブメンバー';

export interface ParticipantIdentity {
  /** JSON や DB に移すときの安定した参加者 ID。 */
  participantId: string;
  /** 相関図の人物 ID。相関図にいない自由入力の人は null。 */
  personId: string | null;
  /** player-db の slug。Minecraft 名やアイコンを引けない人は null。 */
  playerSlug: string | null;
  /** 画面・CSV に出す名前。 */
  name: string;
}

function recordForPerson(person: Person, records: PlayerDbRecord[]): PlayerDbRecord | undefined {
  return (
    records.find((record) => record.sources.relationship_id === person.id) ??
    records.find((record) => closePlayerName(record.username, person.onlineName)) ??
    records.find((record) => person.aliases?.some((alias) => closePlayerName(record.username, alias)))
  );
}

export function activeMemberParticipants(): ParticipantIdentity[] {
  const source = loadRelationshipData()?.data;
  if (!source) return [];

  const records = allPlayerRecords();
  return source.people
    .filter((person) => person.attributes.includes(ACTIVE_MEMBER_ATTRIBUTE))
    .map((person) => {
      const record = recordForPerson(person, records);
      return {
        participantId: `person:${person.id}`,
        personId: person.id,
        playerSlug: record?.slug ?? null,
        name: record?.username ?? person.onlineName,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'ja'));
}
