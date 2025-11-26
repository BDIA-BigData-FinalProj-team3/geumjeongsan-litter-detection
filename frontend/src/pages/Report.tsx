import { useNavigate } from 'react-router-dom';
import MonthlyReport from '../components/MonthlyReport';

export default function ReportPage() {
  const navigate = useNavigate();

  const handleNavigate = (screen: string) => {
    const routeMap: Record<string, string> = {
      'main-map': '/map',
      'login': '/',
      'dashboard': '/dashboard',
      'cctv-management': '/cctv',
      'dumper-detection': '/dumper',
      'trend-analysis': '/trend',
      'time-analysis': '/time',
      'trash-type-analysis': '/trash-type',
      'emergency-dashboard': '/emergency',
      'fire-dashboard': '/fire',
      'rockfall-dashboard': '/rockfall',
      'trash-dashboard': '/trash',
      'emergency-records': '/emergency-records',
      'report': '/report',
    };
    
    const route = routeMap[screen] || '/';
    navigate(route);
  };

  return <MonthlyReport onNavigate={handleNavigate} />;
}

