import { HOME_UPDATES_VISIBLE_LIMIT } from '../../config/dataRegistry';
import { HOME_CONTENT, type HomeJump, type HomeUpdate } from '../../content/home';
import { HomeJumpTree, HomeUpdateCard } from '../molecules';
import { SectionHeader } from '../molecules/SectionHeader';

export interface HomeUpdateBoardProps {
  updates: HomeUpdate[];
  jumps: HomeJump[];
}

const UPDATE_GRID = 'grid gap-lg lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]';

/**
 * ホーム画面の更新ログと主要ページへの入口。
 *
 * 更新ログは増え続けるので、直近（HOME_UPDATES_VISIBLE_LIMIT 件）だけを
 * 開かなくても見せ、それより前は折りたたんで置く。
 */
export function HomeUpdateBoard({ updates, jumps }: HomeUpdateBoardProps) {
  const visible = updates.slice(0, HOME_UPDATES_VISIBLE_LIMIT);
  const folded = updates.slice(HOME_UPDATES_VISIBLE_LIMIT);

  return (
    <div className="grid gap-section">
      <section>
        <SectionHeader title={HOME_CONTENT.updatesTitle} />
        <div className={UPDATE_GRID}>
          {visible.map((entry, index) => (
            <HomeUpdateCard key={`${entry.date}-${entry.title}`} entry={entry} featured={index === 0} />
          ))}
        </div>

        {folded.length > 0 && (
          <details className="mt-lg">
            <summary className="cursor-pointer text-sm font-medium text-heading">
              {HOME_CONTENT.moreUpdatesLabel(folded.length)}
            </summary>
            <div className={`mt-lg ${UPDATE_GRID}`}>
              {folded.map((entry) => (
                <HomeUpdateCard key={`${entry.date}-${entry.title}`} entry={entry} />
              ))}
            </div>
          </details>
        )}
      </section>

      <section>
        <SectionHeader title={HOME_CONTENT.jumpsTitle} />
        <HomeJumpTree jumps={jumps} />
      </section>
    </div>
  );
}
