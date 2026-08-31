import { useEffect, useMemo, useRef, useState } from 'react';
import { AppLayout, Button, ChartCard, DataTable, Note } from '../components';
import { CONTROL_HOVER, FIELD, FIELD_INPUT, FIELD_INPUT_FULL, SECTION, TABLE, TABLE_CELL, TABLE_HEAD_CELL } from '../components/classes';
import { downloadJson, readFileAsText } from '../lib/export';
import { formatInt } from '../lib/format';

interface BoardPlayer {
  id: string;
  name: string;
}

interface BoardRound {
  id: string;
  label: string;
  scores: Record<string, number>;
}

interface BoardScoreDocument {
  schemaVersion: 1;
  title: string;
  players: BoardPlayer[];
  rounds: BoardRound[];
  updatedAt: string;
}

interface RankedPlayer extends BoardPlayer {
  total: number;
  rank: number;
}

const STORAGE_KEY = 'srusa-board-score-v1';
const FILE_SCHEMA_VERSION = 1;

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
  const players = [
    { id: uid('player'), name: 'プレイヤー1' },
    { id: uid('player'), name: 'プレイヤー2' },
    { id: uid('player'), name: 'プレイヤー3' },
  ];
  return {
    schemaVersion: FILE_SCHEMA_VERSION,
    title: 'ボードゲーム',
    players,
    rounds: [
      {
        id: uid('round'),
        label: '1回戦',
        scores: Object.fromEntries(players.map((player) => [player.id, 0])),
      },
    ],
    updatedAt: now(),
  };
}

function sanitizeFilePart(value: string): string {
  return value.trim().replace(/[^\w\u3040-\u30ff\u3400-\u9fff-]+/g, '-').replace(/^-+|-+$/g, '') || 'board-score';
}

function normalizeDocument(value: unknown): BoardScoreDocument {
  if (!value || typeof value !== 'object') throw new Error('JSON の形が違います。');
  const source = value as Partial<BoardScoreDocument>;
  if (source.schemaVersion !== FILE_SCHEMA_VERSION) throw new Error('対応していないスキーマバージョンです。');
  if (typeof source.title !== 'string') throw new Error('ゲーム名が見つかりません。');
  if (!Array.isArray(source.players)) throw new Error('プレイヤー一覧が見つかりません。');
  if (!Array.isArray(source.rounds)) throw new Error('得点ログが見つかりません。');

  const players = source.players.map((player, index) => {
    if (!player || typeof player !== 'object') throw new Error('プレイヤー一覧の形が違います。');
    const record = player as Partial<BoardPlayer>;
    return {
      id: typeof record.id === 'string' && record.id ? record.id : uid('player'),
      name: typeof record.name === 'string' ? record.name : `プレイヤー${index + 1}`,
    };
  });
  const playerIds = new Set(players.map((player) => player.id));

  const rounds = source.rounds.map((round, index) => {
    if (!round || typeof round !== 'object') throw new Error('得点ログの形が違います。');
    const record = round as Partial<BoardRound>;
    const scores: Record<string, number> = {};
    const rawScores = record.scores && typeof record.scores === 'object' ? record.scores : {};
    for (const [playerId, value] of Object.entries(rawScores)) {
      if (playerIds.has(playerId) && typeof value === 'number' && Number.isFinite(value)) {
        scores[playerId] = value;
      }
    }
    return {
      id: typeof record.id === 'string' && record.id ? record.id : uid('round'),
      label: typeof record.label === 'string' ? record.label : `${index + 1}回戦`,
      scores,
    };
  });

  return {
    schemaVersion: FILE_SCHEMA_VERSION,
    title: source.title,
    players,
    rounds,
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : now(),
  };
}

function loadInitialDocument(): BoardScoreDocument {
  if (typeof window === 'undefined') return starterDocument();
  const saved = window.localStorage.getItem(STORAGE_KEY);
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

function displayName(player: BoardPlayer): string {
  return player.name.trim() || '無名';
}

export function BoardScorePage() {
  const [doc, setDoc] = useState(loadInitialDocument);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newRoundLabel, setNewRoundLabel] = useState('');
  const [message, setMessage] = useState('');
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
  }, [doc]);

  const ranked = useMemo<RankedPlayer[]>(() => {
    const totals = doc.players.map((player) => ({
      ...player,
      total: doc.rounds.reduce((sum, round) => sum + (round.scores[player.id] ?? 0), 0),
      rank: 0,
    }));
    return totals
      .sort((a, b) => b.total - a.total || displayName(a).localeCompare(displayName(b), 'ja'))
      .map((player, index, rows) => ({
        ...player,
        rank: index > 0 && player.total === rows[index - 1].total ? rows[index - 1].rank : index + 1,
      }));
  }, [doc.players, doc.rounds]);

  const tableRows = ranked.map((player) => ({
    rank: player.rank,
    name: displayName(player),
    total: player.total,
    rounds: doc.rounds.length,
  }));

  const addPlayer = () => {
    const player = { id: uid('player'), name: newPlayerName.trim() || `プレイヤー${doc.players.length + 1}` };
    setDoc((current) =>
      withUpdatedAt({
        ...current,
        players: [...current.players, player],
        rounds: current.rounds.map((round) => ({ ...round, scores: { ...round.scores, [player.id]: 0 } })),
      }),
    );
    setNewPlayerName('');
    setMessage('');
  };

  const removePlayer = (playerId: string) => {
    setDoc((current) =>
      withUpdatedAt({
        ...current,
        players: current.players.filter((player) => player.id !== playerId),
        rounds: current.rounds.map((round) => {
          const scores = { ...round.scores };
          delete scores[playerId];
          return { ...round, scores };
        }),
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
            scores: Object.fromEntries(current.players.map((player) => [player.id, 0])),
          },
        ],
      }),
    );
    setNewRoundLabel('');
    setMessage('');
  };

  const removeRound = (roundId: string) => {
    setDoc((current) => withUpdatedAt({ ...current, rounds: current.rounds.filter((round) => round.id !== roundId) }));
  };

  const updateScore = (roundId: string, playerId: string, raw: string) => {
    setDoc((current) =>
      withUpdatedAt({
        ...current,
        rounds: current.rounds.map((round) => {
          if (round.id !== roundId) return round;
          const scores = { ...round.scores };
          if (raw.trim() === '') {
            delete scores[playerId];
          } else {
            const value = Number(raw);
            if (Number.isFinite(value)) scores[playerId] = value;
          }
          return { ...round, scores };
        }),
      }),
    );
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
            <Button label="新規に戻す" onClick={() => setDoc(starterDocument())} />
          </div>
        </div>
      </section>

      <ChartCard title={`${doc.title || '無題'} の合計`} note={`記録済み ${formatInt(doc.rounds.length)} 回`}>
        {ranked.length > 0 ? (
          <div className="grid gap-sm">
            {ranked.map((player) => (
              <div key={player.id} className="grid grid-cols-[3em_minmax(0,1fr)_auto] items-center gap-md">
                <span className="font-mono text-md tabular-nums text-muted">#{player.rank}</span>
                <span className="truncate font-medium text-heading">{displayName(player)}</span>
                <span className="font-mono text-lg tabular-nums text-heading">{formatInt(player.total)}</span>
              </div>
            ))}
          </div>
        ) : (
          <Note>プレイヤーを追加すると集計が始まります。</Note>
        )}
      </ChartCard>

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
          {doc.players.map((player) => (
            <div key={player.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-md">
              <input
                className={FIELD_INPUT_FULL}
                value={player.name}
                onChange={(event) =>
                  setDoc((current) =>
                    withUpdatedAt({
                      ...current,
                      players: current.players.map((entry) =>
                        entry.id === player.id ? { ...entry, name: event.currentTarget.value } : entry,
                      ),
                    }),
                  )
                }
              />
              <button type="button" className={`${FIELD_INPUT} ${CONTROL_HOVER}`} onClick={() => removePlayer(player.id)}>
                削除
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className={SECTION}>
        <h2 className="mb-md text-lg text-heading">得点ログ</h2>
        <div className="mb-md flex flex-wrap items-end gap-md">
          <label className="flex min-w-[var(--sr-layout-inline-form-min-width)] flex-1 flex-col gap-xs text-md text-muted">
            回の名前
            <input className={FIELD_INPUT_FULL} value={newRoundLabel} onChange={(event) => setNewRoundLabel(event.currentTarget.value)} />
          </label>
          <Button label="回を追加" onClick={addRound} disabled={doc.players.length === 0} />
        </div>

        {doc.rounds.length > 0 ? (
          <div className="overflow-auto overscroll-contain">
            <table className={`${TABLE} min-w-[var(--sr-layout-map-min-width)]`}>
              <thead>
                <tr>
                  <th className={`${TABLE_CELL} ${TABLE_HEAD_CELL} sticky left-0 top-0 z-20 bg-table-head text-left`}>回</th>
                  {doc.players.map((player) => (
                    <th key={player.id} className={`${TABLE_CELL} ${TABLE_HEAD_CELL} sticky top-0 text-right`}>
                      {displayName(player)}
                    </th>
                  ))}
                  <th className={`${TABLE_CELL} ${TABLE_HEAD_CELL} sticky top-0 text-right`}>操作</th>
                </tr>
              </thead>
              <tbody>
                {doc.rounds.map((round) => (
                  <tr key={round.id} className="hover:bg-table-row-hover">
                    <td className={`${TABLE_CELL} sticky left-0 bg-page`}>
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
                    </td>
                    {doc.players.map((player) => (
                      <td key={player.id} className={`${TABLE_CELL} text-right`}>
                        <label className={FIELD}>
                          <span className="sr-only">{`${round.label} ${displayName(player)} の得点`}</span>
                          <input
                            type="number"
                            inputMode="decimal"
                            className={FIELD_INPUT}
                            value={round.scores[player.id] ?? ''}
                            onChange={(event) => updateScore(round.id, player.id, event.currentTarget.value)}
                          />
                        </label>
                      </td>
                    ))}
                    <td className={`${TABLE_CELL} text-right`}>
                      <button type="button" className={`${FIELD_INPUT} ${CONTROL_HOVER}`} onClick={() => removeRound(round.id)}>
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Note>回を追加すると得点入力欄が出ます。</Note>
        )}
      </section>

      <ChartCard title="順位表" note="CSV は確認用、JSON は再開用です。">
        <DataTable
          rows={tableRows}
          columns={[
            { key: 'rank', label: '順位', align: 'right' },
            { key: 'name', label: '名前', align: 'left' },
            { key: 'total', label: '合計', align: 'right' },
            { key: 'rounds', label: '回数', align: 'right' },
          ]}
          csvName={`${sanitizeFilePart(doc.title)}-score-ranking.csv`}
          initialSort="total"
        />
      </ChartCard>
    </AppLayout>
  );
}
