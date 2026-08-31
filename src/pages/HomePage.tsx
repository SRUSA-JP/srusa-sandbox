import { AppLayout, HomeUpdateBoard } from '../components';
import { HOME_CONTENT, HOME_JUMPS, HOME_UPDATES } from '../content/home';

/** サイト全体の入口。最近の更新から各画面へ飛べるようにする。 */
export function HomePage() {
  return (
    <AppLayout title={HOME_CONTENT.title} lead={HOME_CONTENT.lead}>
      <HomeUpdateBoard updates={HOME_UPDATES} jumps={HOME_JUMPS} />
    </AppLayout>
  );
}
