import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import './lib/i18n';
import { Home } from './pages/Home';
import { LegalPage } from './pages/LegalPage';
import { RoomPage } from './pages/RoomPage';
import './styles.css';

// Loaded on demand: it pulls in Firestore, which the rest of the app doesn't need.
const ContactPage = lazy(() => import('./pages/ContactPage'));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/r/:code" element={<RoomPage />} />
        <Route path="/about" element={<LegalPage page="about" />} />
        <Route path="/privacy" element={<LegalPage page="privacy" />} />
        <Route path="/terms" element={<LegalPage page="terms" />} />
        <Route
          path="/contact"
          element={
            <Suspense fallback={null}>
              <ContactPage />
            </Suspense>
          }
        />
        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
