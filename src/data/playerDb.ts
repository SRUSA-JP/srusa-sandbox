import { currentPlayerDbJson } from './current';

export interface PlayerDbAssets {
  icon_path: string | null;
  skin_path: string | null;
  icon_override_path: string | null;
  skin_override_path: string | null;
}

export interface PlayerDbSources {
  stats_name: string | null;
  daily_name: string | null;
  relationship_id: string | null;
  skin_name: string | null;
}

export interface PlayerDbRecord {
  username: string;
  slug: string;
  aliases: string[];
  sources: PlayerDbSources;
  ids: {
    minecraft_uuid: string | null;
  };
  assets: PlayerDbAssets;
  relationship: {
    attributes: string[];
    related_ids: string[];
  };
  data_updated_on: {
    stats: string | null;
    daily: string | null;
    skins: string | null;
    relationship: string | null;
  };
}

export interface PlayerDbDocument {
  schema_version: 'player-db-v1';
  generated_on: string;
  primary_key: 'username';
  sources: Record<string, string>;
  players: Record<string, PlayerDbRecord>;
}

const doc = currentPlayerDbJson as PlayerDbDocument;

export function loadPlayerDb(): PlayerDbDocument {
  return doc;
}

export function playerSlug(name: string): string {
  return encodeURIComponent(name.trim().toLowerCase());
}

export function playerPath(name: string): string {
  return `#/players/${playerSlug(name)}`;
}

export function comparablePlayerName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function closePlayerName(a: string, b: string): boolean {
  const left = comparablePlayerName(a);
  const right = comparablePlayerName(b);
  if (!left || !right) return false;
  if (left === right) return true;
  return left.length >= 4 && right.length >= 4 && (left.includes(right) || right.includes(left));
}

function recordNames(record: PlayerDbRecord): string[] {
  return [
    record.username,
    record.slug,
    ...record.aliases,
    record.sources.stats_name,
    record.sources.daily_name,
    record.sources.relationship_id,
    record.sources.skin_name,
  ].filter((value): value is string => Boolean(value));
}

export function allPlayerRecords(): PlayerDbRecord[] {
  return Object.values(doc.players).sort((a, b) => a.username.localeCompare(b.username, 'ja'));
}

export function playerRecord(nameOrSlug: string): PlayerDbRecord | undefined {
  const slug = playerSlug(decodeURIComponent(nameOrSlug));
  return (
    doc.players[decodeURIComponent(nameOrSlug)] ??
    allPlayerRecords().find((record) => record.slug === slug) ??
    allPlayerRecords().find((record) => recordNames(record).some((name) => closePlayerName(name, nameOrSlug)))
  );
}

export function playerIconPath(nameOrSlug: string): string | undefined {
  const record = playerRecord(nameOrSlug);
  return record?.assets.icon_override_path ?? record?.assets.icon_path ?? undefined;
}

export function playerSkinPath(nameOrSlug: string): string | undefined {
  const record = playerRecord(nameOrSlug);
  return record?.assets.skin_override_path ?? record?.assets.skin_path ?? undefined;
}
