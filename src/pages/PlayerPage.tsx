import { useEffect, useMemo, useState } from 'react';
import {
  AppLayout,
  Note,
  PlayerCalendarPanel,
  PlayerDailyPanel,
  PlayerDirectory,
  PlayerFeaturedUsePanel,
  PlayerProfileHero,
  PlayerRankingPanel,
  PlayerRelationshipPanel,
  PlayerStatTiles,
} from '../components';
import { CONTROL, CONTROL_HOVER, CONTROL_ROW } from '../components/classes';
import { APP_TEXT, ZUKAN_TEXT } from '../config/messages';
import { allPlayerProfiles, playerProfile } from '../data/playerProfiles';
import { listDatasets, loadDataset } from '../data/datasets';
import { playLog } from '../data/playLog';
import { playStreakOf, playStreakRanking } from '../lib/playStreak';
import { playerDayEntries } from '../lib/playerCalendar';
import { PLAY_STREAK_WINDOW_DAYS } from '../config/dataRegistry';
import type { StatsDocument } from '../data/schema';
import type { VizTheme } from '../theme/palette';
import { ZUKAN_PATH, type Route } from '../routes';

export interface PlayerPageProps {
  theme: VizTheme;
  route: Route;
}

export function PlayerPage({ theme, route }: PlayerPageProps) {
  const [doc, setDoc] = useState<StatsDocument | null>(null);
  const [error, setError] = useState('');
  const dataset = useMemo(() => listDatasets()[0], []);

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

  const slug = route.params?.player ?? '';
  const profile = useMemo(() => playerProfile(slug, doc), [slug, doc]);
  const profiles = useMemo(() => allPlayerProfiles(doc), [doc]);
  /* 連続プレイ日数はログ由来なので、統計データの読み込みを待たずに出せる */
  const streak = useMemo(
    () => (profile ? playStreakOf(playLog(), profile.name, PLAY_STREAK_WINDOW_DAYS) : null),
    [profile],
  );
  const calendarEntries = useMemo(
    () => (profile ? playerDayEntries(playLog(), profile.name) : []),
    [profile],
  );
  /* 見つからなかったときは図鑑をそのまま出すので、そちら用の一覧も用意しておく */
  const streaks = useMemo(
    () => new Map(playStreakRanking(playLog(), PLAY_STREAK_WINDOW_DAYS).map((entry) => [entry.name, entry.streak])),
    [],
  );

  if (error) return <Note tone="error">{error}</Note>;
  if (!profile) {
    return (
      <AppLayout
        title={ZUKAN_TEXT.title}
        note={ZUKAN_TEXT.count(profiles.length, profiles.length)}
        messages={<Note tone="error">{ZUKAN_TEXT.notFound}</Note>}
      >
        <PlayerDirectory
          profiles={profiles}
          colorKeys={profiles.map((entry) => entry.name)}
          streaks={streaks}
          theme={theme}
        />
      </AppLayout>
    );
  }

  const player = profile.stats;
  const statsGeneratedOn = doc?.generated_on ?? dataset?.label ?? '';

  return (
    <AppLayout
      title={`${profile.name} の紹介`}
      note={dataset ? `統計 ${dataset.label} / ${APP_TEXT.siteName}` : undefined}
      lead="Minecraft の統計、日別ログ、相関図上の所属をまとめたプレイヤー別ページです。"
      actions={
        <a href={ZUKAN_PATH} className={`${CONTROL} ${CONTROL_ROW} ${CONTROL_HOVER}`}>
          {ZUKAN_TEXT.back}
        </a>
      }
    >
      <PlayerProfileHero profile={profile} theme={theme} />
      {streak && <PlayerCalendarPanel streak={streak} entries={calendarEntries} theme={theme} />}
      {player ? (
        <>
          <PlayerStatTiles player={player} theme={theme} generatedOn={statsGeneratedOn} />
          <PlayerFeaturedUsePanel player={player} theme={theme} />
        </>
      ) : (
        <Note>統計データにはまだ対応するプレイヤーがありません。</Note>
      )}

      <PlayerDailyPanel profile={profile} theme={theme} />

      {player && doc && (
        <PlayerRankingPanel doc={doc} player={player} theme={theme} generatedOn={statsGeneratedOn} />
      )}

      <PlayerRelationshipPanel profile={profile} />
    </AppLayout>
  );
}
