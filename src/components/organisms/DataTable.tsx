import { useMemo, useState } from 'react';
import { TABLE_TEXT } from '../../config/messages';
import { TABLE, TABLE_CELL, TABLE_HEAD_CELL } from '../classes';
import { Button } from '../atoms';
import { downloadCsv, type Row } from '../../lib/export';
import { formatValue } from '../../lib/display';

export interface Column {
  key: string;
  label: string;
  /** 既定: 数値なら右寄せ。 */
  align?: 'left' | 'right';
}

export interface DataTableProps {
  rows: Row[];
  columns?: Column[];
  csvName?: string;
  /** 既定の並び替えキー。 */
  initialSort?: string;
}

/** セルの寄せ方。見出しと本体で同じ指定を使う。 */
const ALIGN = { left: 'text-left', right: 'text-right' } as const;

/** 数値を並べる表なので、セルの中では折り返さない。 */
const CELL = `${TABLE_CELL} whitespace-nowrap`;

function formatCell(value: Row[string]): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return formatValue(value);
  return value;
}

/** 並び替え・CSV 出力に対応した素の表。どのグラフの裏側でも使える。 */
export function DataTable({ rows, columns, csvName = TABLE_TEXT.defaultCsvName, initialSort }: DataTableProps) {
  const cols: Column[] = useMemo(
    () =>
      columns ??
      Object.keys(rows[0] ?? {}).map((key) => ({
        key,
        label: key,
        align: typeof rows[0]?.[key] === 'number' ? ('right' as const) : ('left' as const),
      })),
    [columns, rows],
  );
  const [sort, setSort] = useState<{ key: string; desc: boolean } | null>(
    initialSort ? { key: initialSort, desc: true } : null,
  );

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const factor = sort.desc ? -1 : 1;
    return [...rows].sort((a, b) => {
      const x = a[sort.key];
      const y = b[sort.key];
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * factor;
      return String(x ?? '').localeCompare(String(y ?? ''), 'ja') * factor;
    });
  }, [rows, sort]);

  return (
    <div>
      <div className="mb-md flex justify-end">
        <Button
          label={TABLE_TEXT.exportCsv}
          icon="download"
          onClick={() => downloadCsv(csvName, sorted, cols.map((c) => c.key))}
        />
      </div>
      <div className="max-h-[var(--sr-layout-table-max-height)] overflow-auto overscroll-contain">
        <table className={`${TABLE} [font-variant-numeric:tabular-nums]`}>
          <thead>
            <tr>
              {cols.map((col) => (
                <th
                  key={col.key}
                  /* 縦スクロールしても列の意味が分かるよう、見出し行は貼り付ける */
                  className={`${CELL} ${TABLE_HEAD_CELL} ${ALIGN[col.align ?? 'right']} sticky top-0 cursor-pointer select-none`}
                  onClick={() => setSort((s) => ({ key: col.key, desc: s?.key === col.key ? !s.desc : true }))}
                >
                  {col.label}
                  {sort?.key === col.key
                    ? sort.desc
                      ? TABLE_TEXT.sortMark.desc
                      : TABLE_TEXT.sortMark.asc
                    : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, index) => (
              <tr key={String(row[cols[0].key] ?? index)} className="hover:bg-table-row-hover">
                {cols.map((col) => (
                  <td key={col.key} className={`${CELL} ${ALIGN[col.align ?? 'right']}`}>
                    {formatCell(row[col.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
