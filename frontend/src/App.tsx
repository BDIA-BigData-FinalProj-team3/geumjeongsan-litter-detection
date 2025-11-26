import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import MainMapPage from './pages/MainMap';
import Dashboard from './pages/Dashboard';
import EmergencyPage from './pages/Emergency';
import FirePage from './pages/Fire';
import RockfallPage from './pages/Rockfall';
import TrashPage from './pages/Trash';
import CCTVPage from './pages/CCTV';
import EmergencyRecordsPage from './pages/EmergencyRecords';
import ReportPage from './pages/Report';
import DumperPage from './pages/Dumper';
import TrendPage from './pages/Trend';
import TimePage from './pages/Time';
import TrashTypePage from './pages/TrashType';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/map" element={<MainMapPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/emergency" element={<EmergencyPage />} />
        <Route path="/fire" element={<FirePage />} />
        <Route path="/rockfall" element={<RockfallPage />} />
        <Route path="/trash" element={<TrashPage />} />
        <Route path="/cctv" element={<CCTVPage />} />
        <Route path="/emergency-records" element={<EmergencyRecordsPage />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="/dumper" element={<DumperPage />} />
        <Route path="/trend" element={<TrendPage />} />
        <Route path="/time" element={<TimePage />} />
        <Route path="/trash-type" element={<TrashTypePage />} />
      </Routes>
    </BrowserRouter>
  );
}