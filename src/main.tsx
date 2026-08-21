import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { setActiveSkin } from './config/skins';
import { routeFromHash, skinForRoute } from './routes';
import { applyDesignTokens } from './theme/cssVariables';
import { buildTheme, resolveMode, storedPreference } from './theme/useThemeMode';
import './styles/index.css';

/*
 * 最初の描画より前に、色と寸法のカスタムプロパティを流し込む。
 * React に任せると 1 フレームだけ既定の見た目が見えてしまうため。
 */
const skin = skinForRoute(routeFromHash(window.location.hash));
setActiveSkin(skin);
applyDesignTokens(buildTheme(resolveMode(storedPreference()), skin), skin);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
