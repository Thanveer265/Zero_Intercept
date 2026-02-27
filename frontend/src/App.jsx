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
    <div className="min-h-screen bg-surface pb-20">
      <main className="p-6">
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
      <Sidebar />
      <FloatingAssistant />
    </div>
  );
}
