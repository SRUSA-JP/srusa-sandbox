import { useMemo, useState } from 'react';
import {
  CLIP_TEXT,
  clipFilterGroups,
  clipKeywords,
  sortClips,
  type ClipEntry,
  type ClipSortKey,
} from '../../config/clips';
import { ACTIONS, CONTROL, CONTROL_HOVER } from '../classes';
import { Note, Picker } from '../atoms';
import { ClipCard, SectionHeader } from '../molecules';

interface ClipFilters {
  map: string;
  agent: string;
  keyword: string;
}

export interface ClipGalleryProps {
  clips: ClipEntry[];
  selectedClip?: ClipEntry;
  onSelect: (clip: ClipEntry) => void;
}

const ALL = 'all';

const SORT_OPTIONS: Array<{ value: ClipSortKey; label: string }> = [
  { value: 'score', label: CLIP_TEXT.sorts.score },
  { value: 'title', label: CLIP_TEXT.sorts.title },
  { value: 'views', label: CLIP_TEXT.sorts.views },
];

/** Pinterest 風のクリップ一覧。フィルタとカード配置をまとめる。 */
export function ClipGallery({ clips, selectedClip, onSelect }: ClipGalleryProps) {
  const [filters, setFilters] = useState<ClipFilters>({ map: ALL, agent: ALL, keyword: ALL });
  const [sortKey, setSortKey] = useState<ClipSortKey>('score');
  const filterGroups = useMemo(() => clipFilterGroups(clips), [clips]);

  const filteredClips = useMemo(() => {
    const matched = clips.filter((clip) => {
      if (filters.map !== ALL && clip.map !== filters.map) return false;
      if (filters.agent !== ALL && clip.agent !== filters.agent) return false;
      if (filters.keyword !== ALL && !clipKeywords(clip).includes(filters.keyword)) return false;
      return true;
    });
    return sortClips(matched, sortKey);
  }, [clips, filters, sortKey]);

  return (
    <section className="mb-section">
      <SectionHeader
        title={CLIP_TEXT.gallery}
        note={CLIP_TEXT.result(filteredClips.length, clips.length)}
        actions={<Picker showLabel label={CLIP_TEXT.sort} value={sortKey} options={SORT_OPTIONS} onChange={setSortKey} />}
      />

      <div className="mb-lg grid gap-sm rounded-md border-hairline border-divider bg-surface p-md">
        {filterGroups.map((group) => {
          const activeValue = group.id === 'map' || group.id === 'agent' ? filters[group.id] : filters.keyword;
          return (
            <div key={group.id} className="grid gap-xs sm:grid-cols-[7rem_1fr] sm:items-start">
              <div className="pt-xs text-sm font-medium text-muted">{group.label}</div>
              <div className={ACTIONS}>
                <button
                  type="button"
                  className={filterButtonClass(activeValue === ALL)}
                  onClick={() => {
                    if (group.id === 'map' || group.id === 'agent') {
                      setFilters((current) => ({ ...current, [group.id]: ALL }));
                    } else {
                      setFilters((current) => ({ ...current, keyword: ALL }));
                    }
                  }}
                >
                  {CLIP_TEXT.filters.all} ({clips.length})
                </button>
                {group.options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={filterButtonClass(activeValue === option.value)}
                    onClick={() => {
                      if (group.id === 'map' || group.id === 'agent') {
                        setFilters((current) => ({ ...current, [group.id]: option.value }));
                      } else {
                        setFilters((current) => ({ ...current, keyword: option.value }));
                      }
                    }}
                  >
                    {option.label} ({option.count})
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {filteredClips.length > 0 ? (
        <div className="columns-1 gap-md sm:columns-2 xl:columns-3">
          {filteredClips.map((clip) => (
            <ClipCard
              key={clip.id}
              clip={clip}
              active={clip.id === selectedClip?.id}
              onSelect={onSelect}
              onFilter={(type, value) => {
                if (type === 'keyword') setFilters((current) => ({ ...current, keyword: value }));
                if (type === 'map') setFilters((current) => ({ ...current, map: value }));
                if (type === 'agent') setFilters((current) => ({ ...current, agent: value }));
              }}
            />
          ))}
        </div>
      ) : (
        <Note>{CLIP_TEXT.noMatch}</Note>
      )}
    </section>
  );
}

function filterButtonClass(active: boolean): string {
  return active
    ? `${CONTROL} border-tab-marker bg-tab-active-bg font-medium text-tab-active`
    : `${CONTROL} ${CONTROL_HOVER}`;
}
