import { useEffect, useMemo, useState } from 'react';
import { AppLayout, Note, Picker, PlayerDirectory } from '../components';
import { PLAY_STREAK_WINDOW_DAYS } from '../config/dataRegistry';
import { ZUKAN_TEXT } from '../config/messages';
import { allPlayerProfiles } from '../data/playerProfiles';
import { listDatasets, loadDataset } from '../data/datasets';
import { playLog } from '../data/playLog';
import { playStreakRanking } from '../lib/playStreak';
import { ANY_ATTRIBUTE, attributeCounts, filterProfiles, type DirectoryKind } from '../lib/playerDirectory';
import type { StatsDocument } from '../data/schema';
import type { VizTheme } from '../theme/palette';

export interface ZukanPageProps {
  theme: VizTheme;
}

/**
 * SRUSA 図鑑。
 *
 * 相関図と Minecraft の両方に散らばっている人を 1 か所に集めて、
 * ひとりずつの紹介ページ（#/players/…）への入口にする。
 * 誰を出すかの判定は lib/playerDirectory.ts、並べ方は PlayerDirectory が持つ。
 */
export function ZukanPage({ theme }: ZukanPageProps) {
  const [doc, setDoc] = useState<StatsDocument | null>(null);
  const [error, setError] = useState('');
  const [attribute, setAttribute] = useState(ANY_ATTRIBUTE);
  const [kind, setKind] = useState<DirectoryKind>('all');
  const dataset = useMemo(() => listDatasets()[0], []);

  /* 統計は「統計あり」の札にしか使わないので、読み込みを待たずに一覧を出す */
  useEffect(() => {
    if (!dataset) return;
    let cancelled = false;
    loadDataset(dataset.id)
      .then((next) => {
        if (!cancelled) setDoc(next);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [dataset]);

  const profiles = useMemo(() => allPlayerProfiles(doc), [doc]);
  const shown = useMemo(() => filterProfiles(profiles, { attribute, kind }), [profiles, attribute, kind]);
  const streaks = useMemo(
    () => new Map(playStreakRanking(playLog(), PLAY_STREAK_WINDOW_DAYS).map((entry) => [entry.name, entry.streak])),
    [],
  );

  const attributeOptions = useMemo(
    () => [
      { value: ANY_ATTRIBUTE, label: ZUKAN_TEXT.filter.any },
      ...attributeCounts(profiles).map((entry) => ({
        value: entry.attribute,
        label: `${entry.attribute}（${entry.count}）`,
      })),
    ],
    [profiles],
  );

  const kindOptions: Array<{ value: DirectoryKind; label: string }> = [
    { value: 'all', label: ZUKAN_TEXT.kind.all },
    { value: 'minecraft', label: ZUKAN_TEXT.kind.minecraft },
    { value: 'relationship', label: ZUKAN_TEXT.kind.relationship },
  ];

  return (
    <AppLayout
      title={ZUKAN_TEXT.title}
      note={ZUKAN_TEXT.count(shown.length, profiles.length)}
      lead={ZUKAN_TEXT.lead}
      messages={error ? <Note tone="error">{error}</Note> : undefined}
      actions={
        <>
          <Picker
            showLabel
            label={ZUKAN_TEXT.filter.attribute}
            value={attribute}
            options={attributeOptions}
            onChange={setAttribute}
          />
          <Picker
            showLabel
            label={ZUKAN_TEXT.filter.kind}
            value={kind}
            options={kindOptions}
            onChange={setKind}
          />
        </>
      }
      footer={<span>{ZUKAN_TEXT.note}</span>}
    >
      <PlayerDirectory
        profiles={shown}
        colorKeys={profiles.map((profile) => profile.name)}
        streaks={streaks}
        theme={theme}
      />
    </AppLayout>
  );
}
