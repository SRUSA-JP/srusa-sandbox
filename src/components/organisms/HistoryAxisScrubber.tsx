import { useCallback, useEffect, useState } from 'react';
import { Button, RangeSlider } from '../atoms';
import { HISTORY_AXIS } from '../../config/history';
import { HISTORY_TEXT } from '../../config/messages';
import { historyAxisColors } from '../../lib/display';
import { entriesUntil, historyAxis, membersAt, positionOf } from '../../lib/historyAxis';
import type { HistoryEntry } from '../../data/history';
import type { MemberGrowth } from '../../lib/srusaReach';
import type { VizTheme } from '../../theme/palette';

export interface HistoryAxisScrubberProps {
  entries: HistoryEntry[];
  growth: MemberGrowth;
  /** 軸の右端。ふつうは「いま」。 */
  until: string;
  theme: VizTheme;
}

/**
 * 年表を横軸（時間）で見せ、つまみで進めていく。
 *
 * 縦に並べた一覧では「どのくらい間が空いたか」「人数がどう増えたか」が
 * 読めない。横軸に置いて、つまみを動かすと出来事とメンバーが順に出てくる。
 *
 * 人数は四角を積んで表す。数字だけだと増えた実感が出ないが、積み木が
 * 増えていくと「大きくなった」ことが形で分かる。
 */
export function HistoryAxisScrubber({ entries, growth, until, theme }: HistoryAxisScrubberProps) {
  const axis = historyAxis(entries, growth, until);
  const lastIndex = Math.max(0, axis.months.length - 1);
  const [index, setIndex] = useState(lastIndex);
  const [playing, setPlaying] = useState(false);
  const colors = historyAxisColors(theme);
  const text = HISTORY_TEXT.axis;

  /* 自動で進める。終わりまで行ったら止まる */
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setIndex((current) => {
        if (current >= lastIndex) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, HISTORY_AXIS.stepMs);
    return () => window.clearInterval(timer);
  }, [playing, lastIndex]);

  const restart = useCallback(() => {
    setIndex(0);
    setPlaying(true);
  }, []);

  if (axis.months.length < 2) return <p className="text-sm text-muted">{text.tooFew}</p>;

  const month = axis.months[Math.min(index, lastIndex)];
  const progress = lastIndex > 0 ? index / lastIndex : 1;
  const members = membersAt(growth, month);
  const shown = entriesUntil(entries, month);
  const undated = entries.filter((entry) => !entry.date).length;

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-wrap items-center gap-md">
        <Button
          label={playing ? text.pause : text.play}
          icon={playing ? 'reset' : 'next'}
          onClick={() => setPlaying((current) => !current)}
        />
        <Button label={text.reset} icon="previous" onClick={restart} />
        <span className="text-md font-bold text-heading tabular-nums">{text.at(month)}</span>
        <span className="text-sm text-muted tabular-nums">{text.members(members)}</span>
      </div>

      {/* 軸。進んだところまでを濃く塗る */}
      <div className="relative w-full">
        <div
          className="w-full rounded-sm"
          style={{ height: HISTORY_AXIS.trackHeight, backgroundColor: colors.track }}
        />
        <div
          className="absolute top-0 left-0 rounded-sm"
          style={{
            height: HISTORY_AXIS.trackHeight,
            width: `${progress * 100}%`,
            backgroundColor: colors.progress,
          }}
        />

        {/* 出来事の印。まだ来ていないものは薄いまま置いて、先があることを見せる */}
        {entries.map((entry) => {
          const at = positionOf(axis, entry.date);
          if (at === null) return null;
          const reached = shown.includes(entry);
          return (
            <span
              key={entry.id}
              className="absolute rounded-sm"
              style={{
                left: `calc(${at * 100}% - ${HISTORY_AXIS.markSize / 2}px)`,
                top: (HISTORY_AXIS.trackHeight - HISTORY_AXIS.markSize) / 2,
                width: HISTORY_AXIS.markSize,
                height: HISTORY_AXIS.markSize,
                backgroundColor: reached ? colors.mark : colors.markPending,
              }}
              title={`${entry.date} ${entry.title}`}
            />
          );
        })}
      </div>

      <div className="flex justify-between text-xs text-subtle tabular-nums">
        <span>{axis.months[0]}</span>
        <span>{axis.months[lastIndex]}</span>
      </div>

      <RangeSlider
        value={Math.min(index, lastIndex)}
        max={lastIndex}
        onChange={(next) => {
          setPlaying(false);
          setIndex(next);
        }}
        ariaLabel={text.sliderLabel}
        ariaValueText={text.at(month)}
      />

      {/* 人数を四角で積む。増えたことが形で分かるようにする */}
      <div
        className="flex flex-wrap"
        style={{ gap: HISTORY_AXIS.blockGap, maxWidth: HISTORY_AXIS.blocksPerRow * (HISTORY_AXIS.blockSize + HISTORY_AXIS.blockGap) }}
        aria-hidden
      >
        {Array.from({ length: members }, (_, position) => (
          <span
            key={position}
            className="rounded-xs"
            style={{
              width: HISTORY_AXIS.blockSize,
              height: HISTORY_AXIS.blockSize,
              backgroundColor: colors.block,
            }}
          />
        ))}
      </div>

      <ol className="flex flex-col gap-xs">
        {shown.map((entry) => (
          <li key={entry.id} className="flex flex-wrap items-baseline gap-md">
            <time className="text-sm text-muted tabular-nums" dateTime={entry.date}>
              {entry.date}
            </time>
            <span className="text-md">{entry.title}</span>
          </li>
        ))}
      </ol>

      {undated > 0 && <p className="text-sm text-subtle">{text.undatedCount(undated)}</p>}
    </div>
  );
}
