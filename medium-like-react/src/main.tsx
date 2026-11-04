import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App';

// EditorJS themes its own components, but the rest of the UI uses
// the styles.css ported from the Barba version. We import them at
// the entry so they cascade into every page.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
