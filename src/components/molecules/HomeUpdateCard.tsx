import { HOME_CONTENT, type HomeUpdate } from '../../content/home';
import { TAG } from '../classes';

export interface HomeUpdateCardProps {
  entry: HomeUpdate;
  featured?: boolean;
}

function assetPath(path: string) {
  return `${import.meta.env.BASE_URL}${path}`;
}

export function HomeUpdateCard({ entry, featured = false }: HomeUpdateCardProps) {
  return (
    <article className={`grid min-w-0 gap-md border-hairline border-divider bg-surface p-lg ${featured ? 'lg:row-span-2' : ''}`}>
      {entry.image && (
        <a href={entry.href} className="block hover:bg-hover">
          <img
            src={assetPath(entry.image.src)}
            alt={entry.image.alt}
            className="block aspect-video w-full border-hairline border-divider bg-sunken object-cover"
            loading={featured ? 'eager' : 'lazy'}
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
  );
}
