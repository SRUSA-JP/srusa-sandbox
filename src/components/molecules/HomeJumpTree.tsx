import { HOME_CONTENT, type HomeJump } from '../../content/home';
import { Icon } from '../atoms';

export interface HomeJumpTreeProps {
  jumps: HomeJump[];
  depth?: number;
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

function HomeJumpBranch({ jump, depth }: { jump: HomeJump; depth: number }) {
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
        <HomeJumpTree jumps={jump.children} depth={depth + 1} />
      </div>
    </details>
  );
}

export function HomeJumpTree({ jumps, depth = 0 }: HomeJumpTreeProps) {
  return (
    <div className={depth === 0 ? 'grid gap-md sm:grid-cols-2 lg:grid-cols-4' : 'grid gap-xs'}>
      {jumps.map((jump) => (
        <HomeJumpBranch key={`${jump.title}-${jump.href ?? depth}`} jump={jump} depth={depth} />
      ))}
    </div>
  );
}
