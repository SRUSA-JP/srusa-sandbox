/**
 * 相関図データ（`data/srusa-relationship-*.json`）の型定義。
 *
 * 依存ゼロ。データの形だけを述べ、見せ方には一切触れない。
 * 表示に関する決定は config.ts と display.ts が持つ。
 */

/** グループの分類。表示上の扱いは config.ts の GROUP_TYPE_SETTINGS が決める。 */
export type GroupType = string;

export interface Person {
  id: string;
  /** ネットネーム。 */
  onlineName: string;
  /** 別名・表記揺れ。 */
  aliases?: string[];
  /** 所属を表すグループ名の配列（`Group.name` を参照する）。 */
  attributes: string[];
  nicknames: string[];
  /**
   * SRUSA に入った時期（`YYYY-MM` / `YYYY`）。分かっている人だけが持つ。
   *
   * 年表の人数推移はこの値だけから作る。分からない人を「入っていない」と
   * 数えると人数が実際より少なく出てしまうので、分かっている人数も一緒に出す。
   */
  joinedOn?: string;
  /**
   * アイコン画像の URL（任意）。
   * 指定があればノードに表示し、無ければ config の代替表示にする。
   */
  avatarUrl?: string;
}

export interface Group {
  id: string;
  /** `Person.attributes` から参照される表示名。 */
  name: string;
  type: GroupType;
  /** 上位グループ（研究室 → 大学など）。 */
  parentGroupId?: string;
}

export interface Relation {
  source: string;
  target: string;
  type: string;
  /** 関係の文脈（出会った場など）。 */
  context?: string;
  /** 確度が低い関係。 */
  uncertain?: boolean;
}

export interface ProjectMeta {
  name: string;
  defaultCenterPersonId: string;
  /** 人物名の出し方。display.ts の personLabel が解釈する。 */
  nameMode: string;
}

export interface ViewMeta {
  centerPersonId?: string;
  allowOverlappingRegions?: boolean;
  nestedGroups?: boolean;
  notes?: string[];
}

export interface RelationshipData {
  schemaVersion: string;
  project: ProjectMeta;
  people: Person[];
  groups: Group[];
  relations: Relation[];
  view?: ViewMeta;
}
