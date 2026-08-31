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
        <div className="grid gap-xs sm:grid-cols-2 lg:grid-cols-3">
          {jumps.map((jump) => (
            <a
              key={jump.href}
              href={jump.href}
              className="grid min-w-0 gap-xs border-hairline border-divider bg-surface p-md hover:bg-hover"
            >
              <span className="text-md font-bold text-heading">{jump.title}</span>
              <span className="text-sm leading-base text-muted">{jump.description}</span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
