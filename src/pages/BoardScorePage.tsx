import { useEffect, useMemo, useRef, useState } from 'react';
import { AppLayout, Button, ChartCard, DataTable, Note, PlayerIconPlaceholder } from '../components';
import { CONTROL_HOVER, FIELD, FIELD_INPUT, FIELD_INPUT_FULL, SECTION, TABLE, TABLE_CELL, TABLE_HEAD_CELL } from '../components/classes';
import { activeMemberParticipants } from '../data/participants';
import { downloadJson, readFileAsText } from '../lib/export';
import { formatInt } from '../lib/format';
import type { VizTheme } from '../theme/palette';

interface BoardParticipant {
  id: string;
  personId: string | null;
  playerSlug: string | null;
  name: string;
  source: 'active-member' | 'custom' | 'imported';
}

interface BoardRound {
  id: string;
  label: string;
}

interface BoardScoreEntry {
  roundId: string;
  participantId: string;
  score: number;
}

interface BoardScoreDocument {
  schemaVersion: 2;
  title: string;
  participants: BoardParticipant[];
  rounds: BoardRound[];
  scores: BoardScoreEntry[];
  updatedAt: string;
}

interface RankedParticipant extends BoardParticipant {
  total: number;
  rank: number;
}

interface LegacyBoardPlayer {
  id?: string;
  name?: string;
}

interface LegacyBoardRound {
  id?: string;
  label?: string;
  scores?: Record<string, unknown>;
}

interface BoardScorePageProps {
  theme: VizTheme;
}

const STORAGE_KEY = 'srusa-board-score-v2';
const LEGACY_STORAGE_KEY = 'srusa-board-score-v1';
const FILE_SCHEMA_VERSION = 2;

function uid(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function now(): string {
  return new Date().toISOString();
}

function starterDocument(): BoardScoreDocument {
  const activeMembers = activeMemberParticipants();
  const participants =
    activeMembers.length > 0
      ? activeMembers.map((member) => ({
          id: member.participantId,
          personId: member.personId,
          playerSlug: member.playerSlug,
          name: member.name,
          source: 'active-member' as const,
        }))
      : [
          { id: uid('participant'), personId: null, playerSlug: null, name: 'プレイヤー1', source: 'custom' as const },
          { id: uid('participant'), personId: null, playerSlug: null, name: 'プレイヤー2', source: 'custom' as const },
          { id: uid('participant'), personId: null, playerSlug: null, name: 'プレイヤー3', source: 'custom' as const },
        ];
  return {
    schemaVersion: FILE_SCHEMA_VERSION,
    title: 'ボードゲーム',
    participants,
    rounds: [{ id: uid('round'), label: '1回戦' }],
    scores: [],
    updatedAt: now(),
  };
}

function sanitizeFilePart(value: string): string {
  return value.trim().replace(/[^\w\u3040-\u30ff\u3400-\u9fff-]+/g, '-').replace(/^-+|-+$/g, '') || 'board-score';
}

function migrateLegacyDocument(source: Record<string, unknown>): BoardScoreDocument {
  if (!Array.isArray(source.players)) throw new Error('プレイヤー一覧が見つかりません。');
  if (!Array.isArray(source.rounds)) throw new Error('得点ログが見つかりません。');

  const participants = source.players.map((player, index) => {
    const record = (player && typeof player === 'object' ? player : {}) as LegacyBoardPlayer;
    return {
      id: typeof record.id === 'string' && record.id ? record.id : uid('participant'),
      personId: null,
      playerSlug: null,
      name: typeof record.name === 'string' ? record.name : `プレイヤー${index + 1}`,
      source: 'imported' as const,
    };
  });
  const participantIds = new Set(participants.map((participant) => participant.id));
  const rounds: BoardRound[] = [];
  const scores: BoardScoreEntry[] = [];

  source.rounds.forEach((round, index) => {
    const record = (round && typeof round === 'object' ? round : {}) as LegacyBoardRound;
    const roundId = typeof record.id === 'string' && record.id ? record.id : uid('round');
    rounds.push({ id: roundId, label: typeof record.label === 'string' ? record.label : `${index + 1}回戦` });
    const rawScores = record.scores && typeof record.scores === 'object' ? record.scores : {};
    for (const [participantId, score] of Object.entries(rawScores)) {
      if (participantIds.has(participantId) && typeof score === 'number' && Number.isFinite(score)) {
        scores.push({ roundId, participantId, score });
      }
    }
  });

  return {
    schemaVersion: FILE_SCHEMA_VERSION,
    title: typeof source.title === 'string' ? source.title : 'ボードゲーム',
    participants,
    rounds,
    scores,
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : now(),
  };
}

function normalizeDocument(value: unknown): BoardScoreDocument {
  if (!value || typeof value !== 'object') throw new Error('JSON の形が違います。');
  const source = value as Partial<BoardScoreDocument> & Record<string, unknown>;
  const schemaVersion: unknown = source.schemaVersion;
  if (schemaVersion === 1) return migrateLegacyDocument(source);
  if (schemaVersion !== FILE_SCHEMA_VERSION) throw new Error('対応していないスキーマバージョンです。');
  if (typeof source.title !== 'string') throw new Error('ゲーム名が見つかりません。');
  if (!Array.isArray(source.participants)) throw new Error('参加者一覧が見つかりません。');
  if (!Array.isArray(source.rounds)) throw new Error('得点ログが見つかりません。');
  if (!Array.isArray(source.scores)) throw new Error('得点明細が見つかりません。');

  const participants = source.participants.map((participant, index) => {
    if (!participant || typeof participant !== 'object') throw new Error('参加者一覧の形が違います。');
    const record = participant as Partial<BoardParticipant>;
    return {
      id: typeof record.id === 'string' && record.id ? record.id : uid('participant'),
      personId: typeof record.personId === 'string' ? record.personId : null,
      playerSlug: typeof record.playerSlug === 'string' ? record.playerSlug : null,
      name: typeof record.name === 'string' ? record.name : `プレイヤー${index + 1}`,
      source:
        record.source === 'active-member' || record.source === 'custom' || record.source === 'imported'
          ? record.source
          : 'imported',
    };
  });
  const participantIds = new Set(participants.map((participant) => participant.id));

  const rounds = source.rounds.map((round, index) => {
    if (!round || typeof round !== 'object') throw new Error('得点ログの形が違います。');
    const record = round as Partial<BoardRound>;
    return {
      id: typeof record.id === 'string' && record.id ? record.id : uid('round'),
      label: typeof record.label === 'string' ? record.label : `${index + 1}回戦`,
    };
  });
  const roundIds = new Set(rounds.map((round) => round.id));
  const scores = source.scores.flatMap((score) => {
    if (!score || typeof score !== 'object') throw new Error('得点明細の形が違います。');
    const record = score as Partial<BoardScoreEntry>;
    if (
      typeof record.roundId === 'string' &&
      typeof record.participantId === 'string' &&
      roundIds.has(record.roundId) &&
      participantIds.has(record.participantId) &&
      typeof record.score === 'number' &&
      Number.isFinite(record.score)
    ) {
      return [{ roundId: record.roundId, participantId: record.participantId, score: record.score }];
    }
    return [];
  });

  return {
    schemaVersion: FILE_SCHEMA_VERSION,
    title: source.title,
    participants,
    rounds,
    scores,
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : now(),
  };
}

function loadInitialDocument(): BoardScoreDocument {
  if (typeof window === 'undefined') return starterDocument();
  const saved = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!saved) return starterDocument();
  try {
    return normalizeDocument(JSON.parse(saved));
  } catch {
    return starterDocument();
  }
}

function withUpdatedAt(doc: BoardScoreDocument): BoardScoreDocument {
  return { ...doc, updatedAt: now() };
}

function displayName(participant: BoardParticipant): string {
  return participant.name.trim() || '無名';
}

function scoreValue(doc: BoardScoreDocument, roundId: string, participantId: string): number | undefined {
  return doc.scores.find((score) => score.roundId === roundId && score.participantId === participantId)?.score;
}

function participantTotal(doc: BoardScoreDocument, participantId: string): number {
  return doc.scores
    .filter((score) => score.participantId === participantId)
    .reduce((sum, score) => sum + score.score, 0);
}

function roundTotal(doc: BoardScoreDocument, roundId: string): number {
  return doc.scores
    .filter((score) => score.roundId === roundId)
    .reduce((sum, score) => sum + score.score, 0);
}

function sourceLabel(participant: BoardParticipant): string {
  if (participant.source === 'active-member') return 'アクティブ';
  if (participant.source === 'imported') return '読込';
  return '手入力';
}

export function BoardScorePage({ theme }: BoardScorePageProps) {
  const [doc, setDoc] = useState(loadInitialDocument);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newRoundLabel, setNewRoundLabel] = useState('');
  const [message, setMessage] = useState('');
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
  }, [doc]);

  const ranked = useMemo<RankedParticipant[]>(() => {
    const totals = doc.participants.map((participant) => ({
      ...participant,
      total: doc.scores
        .filter((score) => score.participantId === participant.id)
        .reduce((sum, score) => sum + score.score, 0),
      rank: 0,
    }));
    return totals
      .sort((a, b) => b.total - a.total || displayName(a).localeCompare(displayName(b), 'ja'))
      .map((participant, index, rows) => ({
        ...participant,
        rank: index > 0 && participant.total === rows[index - 1].total ? rows[index - 1].rank : index + 1,
      }));
  }, [doc.participants, doc.scores]);

  const tableRows = ranked.map((participant) => ({
    rank: participant.rank,
    name: displayName(participant),
    total: participant.total,
    rounds: doc.rounds.length,
    source: sourceLabel(participant),
  }));
  const rankByParticipant = new Map(ranked.map((participant) => [participant.id, participant.rank]));
  const totalCells = doc.participants.length * doc.rounds.length;
  const filledCells = doc.scores.length;
  const blankCells = Math.max(0, totalCells - filledCells);
  const leader = ranked[0];

  const addPlayer = () => {
    const participant = {
      id: uid('participant'),
      personId: null,
      playerSlug: null,
      name: newPlayerName.trim() || `プレイヤー${doc.participants.length + 1}`,
      source: 'custom' as const,
    };
    setDoc((current) =>
      withUpdatedAt({
        ...current,
        participants: [...current.participants, participant],
      }),
    );
    setNewPlayerName('');
    setMessage('');
  };

  const removePlayer = (participantId: string) => {
    setDoc((current) =>
      withUpdatedAt({
        ...current,
        participants: current.participants.filter((participant) => participant.id !== participantId),
        scores: current.scores.filter((score) => score.participantId !== participantId),
      }),
    );
  };

  const addRound = () => {
    const label = newRoundLabel.trim() || `${doc.rounds.length + 1}回戦`;
    setDoc((current) =>
      withUpdatedAt({
        ...current,
        rounds: [
          ...current.rounds,
          {
            id: uid('round'),
            label,
          },
        ],
      }),
    );
    setNewRoundLabel('');
    setMessage('');
  };

  const removeRound = (roundId: string) => {
    setDoc((current) =>
      withUpdatedAt({
        ...current,
        rounds: current.rounds.filter((round) => round.id !== roundId),
        scores: current.scores.filter((score) => score.roundId !== roundId),
      }),
    );
  };

  const updateScore = (roundId: string, participantId: string, raw: string) => {
    setDoc((current) =>
      withUpdatedAt({
        ...current,
        scores:
          raw.trim() === ''
            ? current.scores.filter((score) => score.roundId !== roundId || score.participantId !== participantId)
            : (() => {
                const value = Number(raw);
                if (!Number.isFinite(value)) return current.scores;
                const next = current.scores.filter((score) => score.roundId !== roundId || score.participantId !== participantId);
                return [...next, { roundId, participantId, score: value }];
              })(),
      }),
    );
  };

  const resetToActiveMembers = () => {
    setDoc(starterDocument());
    setNewPlayerName('');
    setNewRoundLabel('');
    setMessage('');
  };

  const exportJson = () => {
    downloadJson(`${sanitizeFilePart(doc.title)}-score.json`, withUpdatedAt(doc));
  };

  const importJson = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      setDoc(withUpdatedAt(normalizeDocument(JSON.parse(text))));
      setMessage(`${file.name} を読み込みました。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      if (importRef.current) importRef.current.value = '';
    }
  };

  return (
    <AppLayout
      title="ポイント集計"
      note={`ゲーム名・プレイヤー・得点ログを JSON で持ち運び / 最終更新 ${new Date(doc.updatedAt).toLocaleString('ja-JP')}`}
      lead="ボードゲーム、麻雀、ミニゲームなどの得点を途中からでも記録できます。DB は使わず、このブラウザの自動保存と JSON の読み込み・書き出しで状態を復元します。"
      actions={
        <>
          <Button label="JSON を読み込む" icon="upload" onClick={() => importRef.current?.click()} />
          <Button label="JSON を書き出す" icon="download" onClick={exportJson} />
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => void importJson(event.currentTarget.files?.[0])}
          />
        </>
      }
      messages={message && <Note tone={message.includes('読み込みました') ? 'muted' : 'error'}>{message}</Note>}
    >
      <section className={SECTION}>
        <div className="grid gap-md md:grid-cols-[minmax(0,1fr)_auto]">
          <label className="flex min-w-0 flex-col gap-xs text-md text-muted">
            ゲーム名
            <input
              className={FIELD_INPUT_FULL}
              value={doc.title}
              onChange={(event) => setDoc((current) => withUpdatedAt({ ...current, title: event.currentTarget.value }))}
            />
          </label>
          <div className="flex items-end">
            <Button label="新規に戻す" onClick={resetToActiveMembers} />
          </div>
        </div>
      </section>

      <section className={SECTION}>
        <div className="mb-md grid gap-md lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <h2 className="text-lg text-heading">記録シート</h2>
            <p className="mt-xxs text-sm text-muted">
              行は回や得点カテゴリ、列は参加者です。空欄は未入力として扱い、合計には含めません。
            </p>
          </div>
          <div className="grid gap-xs text-sm text-muted sm:grid-cols-3 lg:min-w-[calc(var(--sr-layout-sidebar-width)+var(--sr-space-xxl))]">
            <div className="border-l-thick border-divider pl-sm">
              <span className="block text-xs">入力済み</span>
              <span className="font-mono text-lg tabular-nums text-heading">{formatInt(filledCells)}</span>
            </div>
            <div className="border-l-thick border-divider pl-sm">
              <span className="block text-xs">未入力</span>
              <span className="font-mono text-lg tabular-nums text-heading">{formatInt(blankCells)}</span>
            </div>
            <div className="border-l-thick border-divider pl-sm">
              <span className="block text-xs">先頭</span>
              <span className="truncate text-lg text-heading">{leader ? displayName(leader) : '-'}</span>
            </div>
          </div>
        </div>

        <div className="mb-md flex flex-wrap items-end gap-md">
          <label className="flex min-w-[var(--sr-layout-inline-form-min-width)] flex-1 flex-col gap-xs text-md text-muted">
            行の名前
            <input className={FIELD_INPUT_FULL} value={newRoundLabel} onChange={(event) => setNewRoundLabel(event.currentTarget.value)} />
          </label>
          <Button label="行を追加" onClick={addRound} disabled={doc.participants.length === 0} />
        </div>

        {doc.rounds.length > 0 ? (
          <div className="overflow-auto overscroll-contain border-hairline border-divider">
            <table className={`${TABLE} min-w-[var(--sr-layout-map-min-width)]`}>
              <caption className="sr-only">{`${doc.title || '無題'} のボードゲーム得点記録表`}</caption>
              <thead>
                <tr>
                  <th className={`${TABLE_CELL} ${TABLE_HEAD_CELL} sticky left-0 top-0 z-20 bg-table-head text-left`} scope="col">
                    項目
                  </th>
                  {doc.participants.map((player, index) => (
                    <th key={player.id} className={`${TABLE_CELL} ${TABLE_HEAD_CELL} sticky top-0 text-right`} scope="col">
                      <span className="inline-flex items-center justify-end gap-xs">
                        <PlayerIconPlaceholder
                          name={displayName(player)}
                          accent={theme.categorical[index % theme.categorical.length] ?? theme.accent}
                          alt=""
                          size="tiny"
                        />
                        <span>{displayName(player)}</span>
                        <span className="font-mono text-xs tabular-nums text-subtle">#{rankByParticipant.get(player.id) ?? '-'}</span>
                      </span>
                    </th>
                  ))}
                  <th className={`${TABLE_CELL} ${TABLE_HEAD_CELL} sticky top-0 text-right`} scope="col">
                    行合計
                  </th>
                  <th className={`${TABLE_CELL} ${TABLE_HEAD_CELL} sticky top-0 text-right`} scope="col">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {doc.rounds.map((round) => (
                  <tr key={round.id} className="hover:bg-table-row-hover">
                    <th className={`${TABLE_CELL} sticky left-0 bg-page text-left`} scope="row">
                      <input
                        className={FIELD_INPUT_FULL}
                        value={round.label}
                        onChange={(event) =>
                          setDoc((current) =>
                            withUpdatedAt({
                              ...current,
                              rounds: current.rounds.map((entry) =>
                                entry.id === round.id ? { ...entry, label: event.currentTarget.value } : entry,
                              ),
                            }),
                          )
                        }
                      />
                    </th>
                    {doc.participants.map((player) => (
                      <td key={player.id} className={`${TABLE_CELL} text-right`}>
                        <label className={FIELD}>
                          <span className="sr-only">{`${round.label} ${displayName(player)} の得点`}</span>
                          <input
                            type="number"
                            inputMode="decimal"
                            className={FIELD_INPUT}
                            value={scoreValue(doc, round.id, player.id) ?? ''}
                            onChange={(event) => updateScore(round.id, player.id, event.currentTarget.value)}
                          />
                        </label>
                      </td>
                    ))}
                    <td className={`${TABLE_CELL} text-right font-mono tabular-nums text-heading`}>
                      {formatInt(roundTotal(doc, round.id))}
                    </td>
                    <td className={`${TABLE_CELL} text-right`}>
                      <button type="button" className={`${FIELD_INPUT} ${CONTROL_HOVER}`} onClick={() => removeRound(round.id)}>
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th className={`${TABLE_CELL} sticky left-0 bg-table-head text-left text-muted`} scope="row">
                    合計
                  </th>
                  {doc.participants.map((player) => (
                    <td key={player.id} className={`${TABLE_CELL} bg-table-head text-right font-mono tabular-nums text-heading`}>
                      {formatInt(participantTotal(doc, player.id))}
                    </td>
                  ))}
                  <td className={`${TABLE_CELL} bg-table-head text-right font-mono tabular-nums text-heading`}>
                    {formatInt(doc.scores.reduce((sum, score) => sum + score.score, 0))}
                  </td>
                  <td className={`${TABLE_CELL} bg-table-head`} />
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <Note>行を追加すると得点入力欄が出ます。</Note>
        )}
      </section>

      <section className={SECTION}>
        <h2 className="mb-md text-lg text-heading">プレイヤー</h2>
        <div className="mb-md flex flex-wrap items-end gap-md">
          <label className="flex min-w-[var(--sr-layout-inline-form-min-width)] flex-1 flex-col gap-xs text-md text-muted">
            追加する名前
            <input className={FIELD_INPUT_FULL} value={newPlayerName} onChange={(event) => setNewPlayerName(event.currentTarget.value)} />
          </label>
          <Button label="追加" onClick={addPlayer} />
        </div>
        <div className="grid gap-sm md:grid-cols-2">
          {doc.participants.map((player, index) => (
            <div key={player.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-md">
              <PlayerIconPlaceholder
                name={displayName(player)}
                accent={theme.categorical[index % theme.categorical.length] ?? theme.accent}
                alt={`${displayName(player)} のアイコン`}
              />
              <label className="min-w-0">
                <span className="sr-only">{`${displayName(player)} の名前`}</span>
                <input
                  className={FIELD_INPUT_FULL}
                  value={player.name}
                  onChange={(event) =>
                    setDoc((current) =>
                      withUpdatedAt({
                        ...current,
                        participants: current.participants.map((entry) =>
                          entry.id === player.id ? { ...entry, name: event.currentTarget.value } : entry,
                        ),
                      }),
                    )
                  }
                />
                <span className="mt-xxs block text-xs text-subtle">{sourceLabel(player)}</span>
              </label>
              <button type="button" className={`${FIELD_INPUT} ${CONTROL_HOVER}`} onClick={() => removePlayer(player.id)}>
                削除
              </button>
            </div>
          ))}
        </div>
      </section>

      <ChartCard title="順位表" note="CSV は確認用、JSON は再開用です。">
        <DataTable
          rows={tableRows}
          columns={[
            { key: 'rank', label: '順位', align: 'right' },
            { key: 'name', label: '名前', align: 'left' },
            { key: 'total', label: '合計', align: 'right' },
            { key: 'rounds', label: '回数', align: 'right' },
            { key: 'source', label: '紐づけ', align: 'left' },
          ]}
          csvName={`${sanitizeFilePart(doc.title)}-score-ranking.csv`}
          initialSort="total"
        />
      </ChartCard>
    </AppLayout>
  );
}
