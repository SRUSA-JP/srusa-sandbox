import { useId, type ReactNode } from 'react';
import { VIEWPORT_TEXT } from '../../config/messages';
import type { PanZoom } from '../../hooks/usePanZoom';
import { ViewportControls } from '../molecules/ViewportControls';

export interface ViewportFrameProps {
  panZoom: PanZoom;
  /** この図が何かの説明。読み上げのときに最初に読まれる。 */
  label: string;
  /** 図の左下に重ねて出す情報（座標・件数など）。 */
  status?: ReactNode;
  /** 操作の列の左に足すもの。 */
  actions?: ReactNode;
  /** 図の上に重ねる補助表示。 */
  overlay?: ReactNode;
  /** 表示枠の中に置く図そのもの。位置と拡大は呼び出し側が transform で当てる。 */
  children: ReactNode;
}

/**
 * 掴んで動かせる図の表示枠。
 *
 * ワールドマップ（画像）と相関図（SVG）で、枠・操作ボタン・説明の位置を
 * 揃えるための入れ物。中身が何かは知らず、`usePanZoom` が作った状態を
 * 受け取って形にするだけ。
 *
 * ボタンは枠の外側の兄弟として重ねる。枠の中に入れると、ボタンを押した指が
 * そのまま「掴んで動かす」と解釈されてしまうため。
 */
export function ViewportFrame({ panZoom, label, status, actions, overlay, children }: ViewportFrameProps) {
  const helpId = useId();

  /*
   * min-w-0 は必須。grid の子は既定で min-width:auto（＝中身の最小幅）になるため、
   * 図の実寸（相関図なら 1900px ほど）が枠を押し広げ、ウィンドウからはみ出す。
   * 表示枠は常に親の幅に収まり、はみ出しは枠の内側で吸収する。
   */
  return (
    <div className="grid min-w-0 gap-xs">
      <div className="relative min-w-0">
        <div
          {...panZoom.surfaceProps}
          role="group"
          aria-label={label}
          aria-describedby={helpId}
          className={`h-[var(--sr-layout-viewport-compact-height)] w-full touch-none select-none overflow-hidden rounded-md border-hairline border-divider bg-sunken sm:h-[var(--sr-layout-viewport-height)] ${
            panZoom.isPanning ? 'cursor-grabbing' : 'cursor-grab'
          }`}
        >
          {children}
        </div>

        {overlay}

        {/* 操作ボタン。図の右上に重ねる（地図の作法に合わせる） */}
        <div className="absolute top-md right-md flex items-center gap-xs">
          {actions}
          <ViewportControls panZoom={panZoom} />
        </div>

        {status && (
          <div className="pointer-events-none absolute bottom-md left-md rounded-md border-hairline border-divider bg-surface px-md py-xxs font-mono text-sm text-muted tabular-nums">
            {status}
          </div>
        )}
      </div>

      <p id={helpId} className="text-sm text-muted">
        {VIEWPORT_TEXT.help}
        <span className="sr-only">{VIEWPORT_TEXT.keyboardHelp}</span>
      </p>
    </div>
  );
}
