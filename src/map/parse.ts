/**
 * 相関図データの検証。
 *
 * 壊れたデータでも画面が落ちないように、致命的な問題は例外、
 * 部分的な不整合（参照切れなど）は `issues` として返して画面に出す。
 */
import { DATA_TEXT } from '../config/messages';
import type { Group, Person, Relation, RelationshipData } from './schema';

export class MapDataError extends Error {
  constructor(message: string, readonly field: string) {
    super(`${field}: ${message}`);
    this.name = 'MapDataError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireArray(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) throw new MapDataError(DATA_TEXT.notArray, field);
  return value;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string') throw new MapDataError(DATA_TEXT.notString, field);
  return value;
}

function stringArray(value: unknown, field: string): string[] {
  if (value === undefined) return [];
  return requireArray(value, field).map((entry, index) => requireString(entry, `${field}[${index}]`));
}

function parsePerson(raw: unknown, index: number): Person {
  const field = `people[${index}]`;
  if (!isRecord(raw)) throw new MapDataError(DATA_TEXT.notObject, field);
  return {
    id: requireString(raw.id, `${field}.id`),
    onlineName: requireString(raw.onlineName, `${field}.onlineName`),
    aliases: stringArray(raw.aliases, `${field}.aliases`),
    attributes: stringArray(raw.attributes, `${field}.attributes`),
    nicknames: stringArray(raw.nicknames, `${field}.nicknames`),
    joinedOn: raw.joinedOn === undefined ? undefined : requireString(raw.joinedOn, `${field}.joinedOn`),
    avatarUrl: raw.avatarUrl === undefined ? undefined : requireString(raw.avatarUrl, `${field}.avatarUrl`),
  };
}

function parseGroup(raw: unknown, index: number): Group {
  const field = `groups[${index}]`;
  if (!isRecord(raw)) throw new MapDataError(DATA_TEXT.notObject, field);
  return {
    id: requireString(raw.id, `${field}.id`),
    name: requireString(raw.name, `${field}.name`),
    type: requireString(raw.type, `${field}.type`),
    parentGroupId: raw.parentGroupId === undefined ? undefined : requireString(raw.parentGroupId, `${field}.parentGroupId`),
    connects: typeof raw.connects === 'boolean' ? raw.connects : undefined,
  };
}

function parseRelation(raw: unknown, index: number): Relation {
  const field = `relations[${index}]`;
  if (!isRecord(raw)) throw new MapDataError(DATA_TEXT.notObject, field);
  return {
    source: requireString(raw.source, `${field}.source`),
    target: requireString(raw.target, `${field}.target`),
    type: requireString(raw.type, `${field}.type`),
    context: raw.context === undefined ? undefined : requireString(raw.context, `${field}.context`),
    uncertain: raw.uncertain === true,
  };
}

export interface ParseResult {
  data: RelationshipData;
  /** 参照切れなど、表示は続けられる不整合。 */
  issues: string[];
}

export function parseRelationshipData(raw: unknown): ParseResult {
  if (!isRecord(raw)) throw new MapDataError(DATA_TEXT.notObject, '<root>');
  const project = isRecord(raw.project) ? raw.project : {};
  const view = isRecord(raw.view) ? raw.view : undefined;

  const people = requireArray(raw.people, 'people').map(parsePerson);
  const groups = requireArray(raw.groups, 'groups').map(parseGroup);
  const relations = requireArray(raw.relations, 'relations').map(parseRelation);

  const issues: string[] = [];
  const personIds = new Set(people.map((p) => p.id));
  const groupNames = new Set(groups.map((g) => g.name));
  const groupIds = new Set(groups.map((g) => g.id));

  if (personIds.size !== people.length) issues.push(DATA_TEXT.issue.duplicatePerson);
  if (groupIds.size !== groups.length) issues.push(DATA_TEXT.issue.duplicateGroup);

  for (const person of people) {
    for (const attribute of person.attributes) {
      if (!groupNames.has(attribute)) {
        issues.push(DATA_TEXT.issue.missingGroup(person.id, attribute));
      }
    }
  }
  for (const group of groups) {
    if (group.parentGroupId && !groupIds.has(group.parentGroupId)) {
      issues.push(DATA_TEXT.issue.missingParentGroup(group.id, group.parentGroupId));
    }
  }
  const known = relations.filter((relation) => {
    const ok = personIds.has(relation.source) && personIds.has(relation.target);
    if (!ok) issues.push(DATA_TEXT.issue.unknownPerson(relation.source, relation.target));
    return ok;
  });

  return {
    data: {
      schemaVersion: typeof raw.schemaVersion === 'string' ? raw.schemaVersion : '0',
      project: {
        name: typeof project.name === 'string' ? project.name : 'Relationship Map',
        defaultCenterPersonId:
          typeof project.defaultCenterPersonId === 'string' ? project.defaultCenterPersonId : (people[0]?.id ?? ''),
        nameMode: typeof project.nameMode === 'string' ? project.nameMode : 'online',
      },
      people,
      groups,
      relations: known,
      view: view
        ? {
            centerPersonId: typeof view.centerPersonId === 'string' ? view.centerPersonId : undefined,
            allowOverlappingRegions: view.allowOverlappingRegions === true,
            nestedGroups: view.nestedGroups === true,
            notes: stringArray(view.notes, 'view.notes'),
          }
        : undefined,
    },
    issues,
  };
}
