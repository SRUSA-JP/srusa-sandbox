import { playerPath } from '../../data/playerDb';
import { PlayerIconPlaceholder } from './PlayerIconPlaceholder';

export interface PlayerChipProps {
  /** ログや統計に出てくる名前。図鑑の記録はこの名前から引く。 */
  name: string;
  /** 名前の下に出す添え物（いた時間など）。 */
  detail?: string;
  /** アイコンの縁と服の色。 */
  accent: string;
}

/**
 * 顔と名前を並べた 1 人ぶん。
 *
 * 名前を出すところでは顔も一緒に出す。名前だけだと誰のことか分かりにくく、
 * 顔だけだと読み上げに乗らない。押すとその人の紹介へ行く。
 *
 * 顔は名前から引く（config/playerIcons.ts）。スキンがある人はその顔、
 * 無い人は名前から作った顔で、どちらも同じ名前なら必ず同じ絵になる。
 */
export function PlayerChip({ name, detail, accent }: PlayerChipProps) {
  return (
    <a
      className="flex items-center gap-sm rounded-md border-hairline border-divider px-sm py-xs no-underline transition-colors hover:bg-hover"
      href={playerPath(name)}
    >
      <PlayerIconPlaceholder name={name} accent={accent} alt="" />
      <span className="flex flex-col">
        <span className="text-md text-heading">{name}</span>
        {detail && <span className="text-xs text-muted tabular-nums">{detail}</span>}
      </span>
    </a>
  );
}
