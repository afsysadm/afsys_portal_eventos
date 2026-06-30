import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SiteProvider } from './context/SiteContext';
import { ToastProvider } from './context/ToastContext';
import { Aurora } from './components/Aurora';
import { HubPage } from './pages/HubPage';
import { EventPage } from './pages/EventPage';

export default function App() {
  return (
    <SiteProvider>
      <ToastProvider>
        <Aurora />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HubPage />} />
            <Route path="/evento/:slug" element={<EventPage />} />
            <Route path="*" element={<HubPage />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </SiteProvider>
  );
}
