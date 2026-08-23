import { useEffect, useMemo, useState } from 'react';
import {
  AppLayout,
  Note,
  PlayerDailyPanel,
  PlayerFeaturedUsePanel,
  PlayerProfileHero,
  PlayerRankingPanel,
  PlayerRelationshipPanel,
  PlayerStatTiles,
} from '../components';
import { CONTROL, CONTROL_HOVER, CONTROL_ROW } from '../components/classes';
import { APP_TEXT } from '../config/messages';
import {
  allPlayerProfiles,
  playerPath,
  playerProfile,
} from '../data/playerProfiles';
import { listDatasets, loadDataset } from '../data/datasets';
import type { StatsDocument } from '../data/schema';
import type { VizTheme } from '../theme/palette';
import type { Route } from '../routes';
import { PlayerIconPlaceholder } from '../components/molecules';

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

  if (error) return <Note tone="error">{error}</Note>;
  if (!profile) {
    return (
      <AppLayout title="プレイヤー紹介" note="プレイヤーを選んでください">
        <div className="grid gap-xs sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((entry) => (
            <a key={entry.slug} href={playerPath(entry.name)} className={`${CONTROL} ${CONTROL_ROW} ${CONTROL_HOVER} min-w-0`}>
              <PlayerIconPlaceholder name={entry.name} accent={theme.accent} alt={`${entry.name} のアイコン`} />
              <span className="truncate">{entry.name}</span>
            </a>
          ))}
        </div>
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
    >
      <PlayerProfileHero profile={profile} theme={theme} />
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
