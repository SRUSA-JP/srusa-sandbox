import { HOME_CONTENT, type HomeJump, type HomeUpdate } from '../../content/home';
import { TAG } from '../classes';
import { Icon } from '../atoms';
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
      <span className="flex min-w-0 items-center gap-xs">
        {jump.href && <Icon name="next" size={14} />}
        <span className="truncate text-md font-bold text-heading">{jump.title}</span>
      </span>
      <span className="text-sm leading-base text-muted">{jump.description}</span>
      {jump.href && <span className="w-fit rounded-sm bg-sunken px-xs py-xxs font-numeric text-xs text-subtle">{jump.href}</span>}
    </>
  );
  if (!jump.href) return <div className="grid min-w-0 gap-xxs">{content}</div>;
  return (
    <a href={jump.href} className="grid min-w-0 gap-xxs hover:bg-hover hover:text-tab-active">
      {content}
    </a>
  );
}

function JumpTree({ jumps, depth = 0 }: { jumps: HomeJump[]; depth?: number }) {
  return (
    <div className={depth === 0 ? 'grid gap-md sm:grid-cols-2 lg:grid-cols-4' : 'grid gap-xs'}>
      {jumps.map((jump) => (
        <JumpBranch key={`${jump.title}-${jump.href ?? depth}`} jump={jump} depth={depth} />
      ))}
    </div>
  );
}

function JumpBranch({ jump, depth }: { jump: HomeJump; depth: number }) {
  const branchClass =
    depth === 0
      ? 'min-w-0 border-hairline border-divider bg-surface p-md'
      : 'min-w-0 border-l-thick border-divider pl-md pt-xs';
  if (!jump.children) {
    return (
      <div className={`grid gap-xs ${branchClass}`}>
        <JumpLink jump={jump} />
      </div>
    );
  }
  return (
    <details className={`group grid gap-xs ${branchClass}`}>
      <summary className="grid cursor-pointer list-none gap-xxs marker:hidden">
        <span className="flex min-w-0 items-center justify-between gap-xs">
          <span className="truncate text-md font-bold text-heading">{jump.title}</span>
          <span className="shrink-0 rounded-sm bg-sunken px-xs py-xxs text-xs text-muted">
            {HOME_CONTENT.jumpCount(jump.children.length)}
          </span>
        </span>
        <span className="text-sm leading-base text-muted">{jump.description}</span>
      </summary>
      <div className="mt-sm grid gap-xs">
        <JumpTree jumps={jump.children} depth={depth + 1} />
      </div>
    </details>
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
            <article
              key={`${entry.date}-${entry.title}`}
              className={`grid min-w-0 gap-md border-hairline border-divider bg-surface p-lg ${
                index === 0 ? 'lg:row-span-2' : ''
              }`}
            >
              {entry.image && (
                <a href={entry.href} className="block hover:bg-hover">
                  <img
                    src={assetPath(entry.image.src)}
                    alt={entry.image.alt}
                    className="block aspect-video w-full border-hairline border-divider bg-sunken object-cover"
                    loading={index === 0 ? 'eager' : 'lazy'}
                  />
                </a>
              )}
              <div className="grid gap-xs">
                <div className="flex flex-wrap items-center gap-xs">
                  <span className={TAG}>{entry.date}</span>
                  <span className={TAG}>{entry.category}</span>
                </div>
                <h2 className="text-lg font-bold text-heading">
                  <a href={entry.href} className="hover:bg-hover hover:text-tab-active">
                    {entry.title}
                  </a>
                </h2>
                <p className="leading-base text-ink">{entry.summary}</p>
              </div>
              <details className="rounded-md border-hairline border-divider bg-sunken px-md py-sm text-sm text-muted">
                <summary className="cursor-pointer font-medium text-heading">{HOME_CONTENT.updateDetailsLabel}</summary>
                <ul className="mt-xs grid gap-xxs">
                  {entry.details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              </details>
            </article>
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
