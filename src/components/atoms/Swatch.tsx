export interface SwatchProps {
  /** 一辺の長さ（px）。 */
  size: number;
  background: string;
  /** 角丸（px）。省略すると四角のまま。 */
  radius?: number;
  borderColor?: string;
  /** 見た目の指定を CSS 側に持たせたいときのクラス名。 */
  className?: string;
}

/** 色を示す小さな四角。凡例とツールチップで共用する。 */
export function Swatch({ size, background, radius, borderColor, className }: SwatchProps) {
  return (
    <span
      aria-hidden
      className={className}
      style={{
        width: size,
        height: size,
        background,
        borderRadius: radius,
        borderColor,
        flex: '0 0 auto',
      }}
    />
  );
}
