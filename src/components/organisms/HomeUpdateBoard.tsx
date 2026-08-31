import { HOME_CONTENT, type HomeJump, type HomeUpdate } from '../../content/home';
import { TAG } from '../classes';
import { SectionHeader } from '../molecules/SectionHeader';

export interface HomeUpdateBoardProps {
  updates: HomeUpdate[];
  jumps: HomeJump[];
}

function assetPath(path: string) {
  return `${import.meta.env.BASE_URL}${path}`;
}

function JumpLink({ jump }: { jump: HomeJump }) {
  const content = (
    <>
      <span className="text-md font-bold text-heading">{jump.title}</span>
      <span className="text-sm leading-base text-muted">{jump.description}</span>
    </>
  );
  if (!jump.href) return <div className="grid min-w-0 gap-xxs">{content}</div>;
  return (
    <a href={jump.href} className="grid min-w-0 gap-xxs hover:text-tab-active">
      {content}
    </a>
  );
}

function JumpTree({ jumps, depth = 0 }: { jumps: HomeJump[]; depth?: number }) {
  return (
    <div className={depth === 0 ? 'grid gap-md sm:grid-cols-2 lg:grid-cols-4' : 'grid gap-xs'}>
      {jumps.map((jump) => (
        <div
          key={`${jump.title}-${jump.href ?? depth}`}
          className={
            depth === 0
              ? 'grid min-w-0 gap-md border-hairline border-divider bg-surface p-md'
              : 'grid min-w-0 gap-xs border-l-thick border-divider pl-md'
          }
        >
          <JumpLink jump={jump} />
          {jump.children && <JumpTree jumps={jump.children} depth={depth + 1} />}
        </div>
      ))}
    </div>
  );
}

/** ホーム画面の更新ログと主要ページへの入口。 */
export function HomeUpdateBoard({ updates, jumps }: HomeUpdateBoardProps) {
  return (
    <div className="grid gap-section">
      <section>
        <SectionHeader title={HOME_CONTENT.updatesTitle} />
        <div className="grid gap-lg lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          {updates.map((entry, index) => (
            <a
              key={`${entry.date}-${entry.title}`}
              href={entry.href}
              className={`grid min-w-0 gap-md border-hairline border-divider bg-surface p-lg hover:bg-hover ${
                index === 0 ? 'lg:row-span-2' : ''
              }`}
            >
              {entry.image && (
                <img
                  src={assetPath(entry.image.src)}
                  alt={entry.image.alt}
                  className="block aspect-video w-full border-hairline border-divider bg-sunken object-cover"
                  loading={index === 0 ? 'eager' : 'lazy'}
                />
              )}
              <div className="grid gap-xs">
                <div className="flex flex-wrap items-center gap-xs">
                  <span className={TAG}>{entry.date}</span>
                  <span className={TAG}>{entry.category}</span>
                </div>
                <h2 className="text-lg font-bold text-heading">{entry.title}</h2>
                <p className="leading-base text-ink">{entry.summary}</p>
              </div>
              <ul className="grid gap-xxs text-sm text-muted">
                {entry.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            </a>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title={HOME_CONTENT.jumpsTitle} />
        <JumpTree jumps={jumps} />
      </section>
    </div>
  );
}
