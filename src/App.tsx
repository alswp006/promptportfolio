import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import MarketHome from './pages/MarketHome';
import PromptDetail from './pages/PromptDetail';
import SellPrompt from './pages/SellPrompt';
import Dashboard from './pages/Dashboard';
import Library from './pages/Library';
import { FloatingTabBar, type TabItem } from './components/FloatingTabBar';
import { ensureSeeded } from './lib/seed';

const TABS: TabItem[] = [
  { label: '마켓', path: '/' },
  { label: '라이브러리', path: '/library' },
  { label: '판매', path: '/sell' },
  { label: '정산', path: '/dashboard' },
];

const TAB_PATHS = new Set(TABS.map((t) => t.path));

export default function App() {
  // 마운트 최상단에서 시드 1회 — ensureSeeded는 동기적으로 pp.prompts를 채운다(idempotent).
  useEffect(() => {
    ensureSeeded();
  }, []);

  const location = useLocation();
  const showTabBar = TAB_PATHS.has(location.pathname);

  return (
    <>
      <Routes>
        <Route path="/" element={<MarketHome />} />
        <Route path="/prompt/:id" element={<PromptDetail />} />
        <Route path="/sell" element={<SellPrompt />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/library" element={<Library />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {showTabBar ? <FloatingTabBar items={TABS} /> : null}
    </>
  );
}
