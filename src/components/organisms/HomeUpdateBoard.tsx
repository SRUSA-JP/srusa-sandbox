import { HOME_CONTENT, type HomeJump, type HomeUpdate } from '../../content/home';
import { HomeJumpTree, HomeUpdateCard } from '../molecules';
import { SectionHeader } from '../molecules/SectionHeader';

export interface HomeUpdateBoardProps {
  updates: HomeUpdate[];
  jumps: HomeJump[];
}

/** ホーム画面の更新ログと主要ページへの入口。 */
export function HomeUpdateBoard({ updates, jumps }: HomeUpdateBoardProps) {
  return (
    <div className="grid gap-section">
      <section>
        <SectionHeader title={HOME_CONTENT.updatesTitle} />
        <div className="grid gap-lg lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          {updates.map((entry, index) => (
            <HomeUpdateCard key={`${entry.date}-${entry.title}`} entry={entry} featured={index === 0} />
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title={HOME_CONTENT.jumpsTitle} />
        <HomeJumpTree jumps={jumps} />
      </section>
    </div>
  );
}
