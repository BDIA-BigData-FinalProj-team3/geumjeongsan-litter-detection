import { useState } from 'react';
import LoginScreen from './components/LoginScreen';
import MainMap from './components/MainMap';
import Dashboard from './components/Dashboard';
import CCTVManagement from './components/CCTVManagement';
import DumperDetection from './components/DumperDetection';
import TrendAnalysis from './components/TrendAnalysis';
import TimeAnalysis from './components/TimeAnalysis';
import TrashTypeAnalysis from './components/TrashTypeAnalysis';
import EmergencyDashboard from './components/EmergencyDashboard';
import FireDashboard from './components/FireDashboard';
import RockfallDashboard from './components/RockfallDashboard';
import TrashDashboard from './components/TrashDashboard';
import EmergencyRecords from './components/EmergencyRecords';
import MonthlyReport from './components/MonthlyReport';

type Screen = 'login' | 'main-map' | 'dashboard' | 'cctv-management' | 'dumper-detection' | 'trend-analysis' | 'time-analysis' | 'trash-type-analysis' | 'emergency-dashboard' | 'fire-dashboard' | 'rockfall-dashboard' | 'trash-dashboard' | 'emergency-records' | 'report';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [selectedCCTVId, setSelectedCCTVId] = useState<string | null>(null);

  const handleNavigate = (screen: Screen, cctvId?: string) => {
    if (cctvId) {
      setSelectedCCTVId(cctvId);
    } else {
      setSelectedCCTVId(null);
    }
    setCurrentScreen(screen);
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'login':
        return <LoginScreen onNavigate={handleNavigate} />;
      case 'main-map':
        return <MainMap onNavigate={handleNavigate} />;
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;
      case 'cctv-management':
        return <CCTVManagement onNavigate={handleNavigate} initialSelectedCCTVId={selectedCCTVId} />;
      case 'dumper-detection':
        return <DumperDetection onNavigate={handleNavigate} />;
      case 'trend-analysis':
        return <TrendAnalysis onNavigate={handleNavigate} />;
      case 'time-analysis':
        return <TimeAnalysis onNavigate={handleNavigate} />;
      case 'trash-type-analysis':
        return <TrashTypeAnalysis onNavigate={handleNavigate} />;
      case 'emergency-dashboard':
        return <EmergencyDashboard onNavigate={handleNavigate} />;
      case 'fire-dashboard':
        return <FireDashboard onNavigate={handleNavigate} />;
      case 'rockfall-dashboard':
        return <RockfallDashboard onNavigate={handleNavigate} />;
      case 'trash-dashboard':
        return <TrashDashboard onNavigate={handleNavigate} />;
      case 'emergency-records':
        return <EmergencyRecords onNavigate={handleNavigate} />;
      case 'report':
        return <MonthlyReport onNavigate={handleNavigate} />;
      default:
        return <LoginScreen onNavigate={handleNavigate} />;
    }
  };

  return <div className="w-full h-screen">{renderScreen()}</div>;
}