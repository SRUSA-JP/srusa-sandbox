import { AppLayout, Note } from '../components';
import { GAME_PLACEHOLDER_TEXT } from '../config/messages';
import type { Route } from '../routes';

export interface GamePlaceholderPageProps {
  route: Route;
}

/**
 * まだ中身の無いゲームのページ。
 *
 * VALORANT・LOL・APEX はタブの場所だけ先に用意していて、統計もログも無い。
 * 無いものを埋めた画面を作らず、「まだ無い」とだけ言う。
 */
export function GamePlaceholderPage({ route }: GamePlaceholderPageProps) {
  const title = route.gameLabel ?? route.label;
  return (
    <AppLayout title={title} lead={GAME_PLACEHOLDER_TEXT.lead(title)}>
      <Note>{GAME_PLACEHOLDER_TEXT.note}</Note>
    </AppLayout>
  );
}
