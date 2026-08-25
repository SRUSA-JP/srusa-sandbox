import { loadRelationshipData } from '../map/data';
import type { Person, Relation } from '../map/schema';
import { personLabel } from '../map/display';
import type { NamedPlayer, StatsDocument } from './schema';
import { toNamedPlayers } from './parse';
import {
  allPlayerRecords,
  closePlayerName,
  playerRecord,
  playerSlug,
  type PlayerDbRecord,
} from './playerDb';
import {
  playerDailyTimeline,
  playerDailyTotals,
  lastActivePlayerDailyRow,
  type PlayerDailyDocument,
  type PlayerDailyMetricKey,
} from './playerDaily';

export { playerPath, playerSlug } from './playerDb';

interface PlayerSkinAssetEntry {
  name: string;
  uuid: string;
  face_icon_path: string;
  skin_path: string;
}

export interface PlayerProfile {
  slug: string;
  name: string;
  record: PlayerDbRecord;
  stats?: NamedPlayer;
  dailyName?: string;
  relationship?: Person;
  relatedPeople: Person[];
  relations: Relation[];
  skin?: PlayerSkinAssetEntry;
}

function relationshipNames(person: Person): string[] {
  return [person.onlineName, person.id, ...(person.aliases ?? []), ...person.nicknames];
}

function matchesPerson(person: Person, name: string): boolean {
  return relationshipNames(person).some((candidate) => closePlayerName(candidate, name));
}

function findStatsPlayer(doc: StatsDocument | null, slug: string): NamedPlayer | undefined {
  if (!doc) return undefined;
  return toNamedPlayers(doc).find((player) => playerSlug(player.name) === slug || closePlayerName(player.name, slug));
}

function findStatsPlayerForRecord(doc: StatsDocument | null, record: PlayerDbRecord): NamedPlayer | undefined {
  if (!doc) return undefined;
  const preferred = record.sources.stats_name;
  return preferred
    ? toNamedPlayers(doc).find((player) => player.name === preferred)
    : findStatsPlayer(doc, record.slug);
}

function findRelationshipPerson(record: PlayerDbRecord): Person | undefined {
  const people = loadRelationshipData()?.data.people ?? [];
  if (record.sources.relationship_id) {
    return people.find((person) => person.id === record.sources.relationship_id);
  }
  return people.find((person) => matchesPerson(person, record.username));
}

function skinEntry(record: PlayerDbRecord): PlayerSkinAssetEntry | undefined {
  return record.ids.minecraft_uuid
    ? {
        name: record.username,
        uuid: record.ids.minecraft_uuid,
        face_icon_path: record.assets.icon_path ?? '',
        skin_path: record.assets.skin_path ?? '',
      }
    : undefined;
}

export function playerProfile(
  slug: string,
  statsDoc: StatsDocument | null,
): PlayerProfile | null {
  const record = playerRecord(slug);
  if (!record) return null;
  const stats = findStatsPlayerForRecord(statsDoc, record);
  const relationship = findRelationshipPerson(record);
  const dailyName = record.sources.daily_name ?? undefined;
  const name = record.username;

  const source = loadRelationshipData()?.data;
  const relationId = relationship?.id;
  const relations = relationId
    ? (source?.relations.filter((relation) => relation.source === relationId || relation.target === relationId) ?? [])
    : [];
  const relatedPeople = relations
    .map((relation) => source?.people.find((person) => person.id === (relation.source === relationId ? relation.target : relation.source)))
    .filter((person): person is Person => Boolean(person));

  return {
    slug: record.slug,
    name,
    record,
    stats,
    dailyName,
    relationship,
    relatedPeople,
    relations,
    skin: skinEntry(record),
  };
}

export function allPlayerProfiles(statsDoc: StatsDocument | null): PlayerProfile[] {
  return allPlayerRecords()
    .map((record) => playerProfile(record.slug, statsDoc))
    .filter((profile): profile is PlayerProfile => Boolean(profile))
    .sort((a, b) => a.name.localeCompare(b.name, 'ja'));
}

export function playerDailyProfileTotals(doc: PlayerDailyDocument, profile: PlayerProfile) {
  return profile.dailyName ? playerDailyTotals(doc, profile.dailyName) : null;
}

export function playerDailyProfileTimeline(
  doc: PlayerDailyDocument,
  profile: PlayerProfile,
  metric: PlayerDailyMetricKey,
) {
  return profile.dailyName
    ? playerDailyTimeline(doc, metric, [profile.dailyName])
    : { series: [], rows: [] };
}

export function playerLastActive(doc: PlayerDailyDocument, profile: PlayerProfile) {
  return profile.dailyName ? lastActivePlayerDailyRow(doc, profile.dailyName) : null;
}

export function relationshipLabel(profile: PlayerProfile): string | undefined {
  const source = loadRelationshipData()?.data;
  return profile.relationship && source ? personLabel(profile.relationship, source.project.nameMode) : undefined;
}
