import { useRef } from 'react';
import { Button, NumberField } from '../atoms';
import { SectionHeader } from '../molecules';
import { MAP_TEXT } from '../../config/messages';
import { TUNING_PARAMETERS, type TuningParameter } from '../../config/tuning';

export interface TuningPanelProps {
  /** いまの値。呼び出し側が config から読んだものを渡す。 */
  values: Record<string, number>;
  onChange: (id: string, value: number) => void;
  onReset: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  /** 読み込みの結果。うまくいったか、なぜ駄目だったか。 */
  message?: string;
}

/**
 * 配置と配線の値を、その場で変えるための板（デバッグ用）。
 *
 * 図の見え方は値を少し変えて見比べないと決められないので、公開した先でも
 * 触れるようにしている。何を動かせるかは config/tuning.ts が決め、
 * ここは並べて入力を受けるだけ。
 */
export function TuningPanel({ values, onChange, onReset, onExport, onImport, message }: TuningPanelProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const text = MAP_TEXT.tuning;

  /* 同じまとまりの値を並べて出す */
  const groups = new Map<string, TuningParameter[]>();
  for (const entry of TUNING_PARAMETERS) {
    groups.set(entry.group, [...(groups.get(entry.group) ?? []), entry]);
  }

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-wrap items-center gap-md">
        <Button label={text.export} icon="download" onClick={onExport} />
        <Button label={text.import} icon="upload" onClick={() => fileRef.current?.click()} />
        <Button label={text.reset} icon="reset" onClick={onReset} />
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onImport(file);
            event.target.value = '';
          }}
        />
      </div>

      {message && <p className="text-sm text-muted">{message}</p>}

      {[...groups].map(([group, entries]) => (
        <section key={group} className="flex flex-col gap-sm">
          <SectionHeader title={group} />
          <div className="flex flex-wrap gap-md">
            {entries.map((entry) => (
              <NumberField
                key={entry.id}
                label={entry.label}
                ariaLabel={text.fieldLabel(entry.group, entry.label)}
                value={values[entry.id] ?? entry.read()}
                onChange={(value) => onChange(entry.id, value)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
