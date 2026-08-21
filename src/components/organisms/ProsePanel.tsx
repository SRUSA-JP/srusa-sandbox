import { PROSE_WIDTH, SECTION, TABLE, TABLE_CELL, TABLE_HEAD_CELL, TAG } from '../classes';
import { SectionHeader } from '../molecules/SectionHeader';
import type { ProseBlock, ProseSection } from '../../content/schema';

export interface ProsePanelProps {
  sections: ProseSection[];
}

function Block({ block }: { block: ProseBlock }) {
  switch (block.kind) {
    case 'paragraph':
      return <p className={`${PROSE_WIDTH} leading-base break-words`}>{block.text}</p>;

    case 'list':
      return (
        <ul className={`${PROSE_WIDTH} grid list-disc gap-xs pl-xl leading-base break-words`}>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );

    case 'table':
      /* 列が多い表は画面幅で切れるので、この枠の中だけ横スクロールさせる */
      return (
        <div className="overflow-x-auto">
          <table className={TABLE}>
            <thead>
              <tr>
                {block.table.head.map((cell) => (
                  <th key={cell} className={`${TABLE_CELL} ${TABLE_HEAD_CELL} text-left`}>
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.table.rows.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell) => (
                    <td
                      key={cell}
                      className={`${TABLE_CELL} min-w-[var(--sr-layout-prose-cell-min-width)] text-left align-top leading-base`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'image':
      return (
        <figure className="grid gap-xs">
          {block.tag && <span className={TAG}>{block.tag}</span>}
          <img
            src={`${import.meta.env.BASE_URL}${block.src}`}
            alt={block.alt}
            loading="lazy"
            className="w-full rounded-md border-hairline border-divider"
          />
          {block.caption && (
            <figcaption className={`${PROSE_WIDTH} text-sm text-muted`}>{block.caption}</figcaption>
          )}
        </figure>
      );
  }
}

/**
 * ページの解説文。
 *
 * 文章そのものは src/content/ が持ち、ここは並べ方だけを決める。
 * グラフの節（ChartCard）と同じ見出し・同じ余白で並ぶようにして、
 * 図と説明が地続きに見えるようにする。
 */
export function ProsePanel({ sections }: ProsePanelProps) {
  return (
    <>
      {sections.map((section) => (
        <section key={section.heading} className={SECTION}>
          <SectionHeader title={section.heading} note={section.note} />
          <div className="grid gap-lg">
            {section.blocks.map((block, index) => (
              <Block key={index} block={block} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
