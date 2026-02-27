import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import FloatingAssistant from './components/FloatingAssistant';
import Dashboard from './pages/Dashboard';
import Operations from './pages/groups/Operations';
import Intelligence from './pages/groups/Intelligence';
import SimulationGroup from './pages/groups/SimulationGroup';
import Strategy from './pages/groups/Strategy';
import Reports from './pages/Reports';
import SettingsPage from './pages/Settings';

export default function App() {
  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <main className="flex-1 ml-[260px] p-6 transition-all duration-300">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/operations" element={<Operations />} />
          <Route path="/intelligence" element={<Intelligence />} />
          <Route path="/simulation" element={<SimulationGroup />} />
          <Route path="/strategy" element={<Strategy />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
      <FloatingAssistant />
    </div>
  );
}
