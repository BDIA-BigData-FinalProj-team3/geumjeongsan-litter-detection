import { createBrowserRouter, Navigate, useNavigate } from 'react-router-dom';
import LoginScreen from './pages/LoginScreen';
import MainMap from './pages/MainMap';
import Dashboard from './pages/Dashboard';
import AllIncidentsDashboard from './pages/AllIncidentsDashboard';
import EmergencyDashboard from './pages/EmergencyDashboard';
import FireDashboard from './pages/FireDashboard';
import RockfallDashboard from './pages/RockfallDashboard';
import TrashDashboard from './pages/TrashDashboard';
import EmergencyRecords from './pages/EmergencyRecords';
import CCTVManagement from './pages/CCTVManagement';
import MonthlyReport from './pages/MonthlyReport';
import TrendAnalysis from './pages/TrendAnalysis';
import TrashTypeAnalysis from './pages/TrashTypeAnalysis';
import Settings from './pages/Settings';
import MainLayout from './components/MainLayout';
import TestPage from './pages/TestPage';
import React from 'react';

// Route mapping from old screen names to new routes
const routeMap: Record<string, string> = {
  'main-map': '/map',
  'dashboard': '/dashboard',
  'statistics': '/statistics',
  'all-incidents': '/all-incidents',
  'emergency-dashboard': '/emergency',
  'fire-dashboard': '/fire',
  'rockfall-dashboard': '/rockfall',
  'trash-dashboard': '/trash',
  'cctv-management': '/cctv',
  'emergency-records': '/emergency-records',
  'report': '/monthly-report',
  'trend-analysis': '/trend',
  'trash-type-analysis': '/trash-types',
  'settings': '/settings',
  'login': '/login',
};

// Route component wrappers
const MainMapRoute = () => {
  const navigate = useNavigate();
  const handleNavigate = (screen: string) => {
    const route = routeMap[screen] || screen;
    navigate(route);
  };
  return <MainMap onNavigate={handleNavigate} />;
};

const DashboardRoute = () => {
  const navigate = useNavigate();
  const handleNavigate = (screen: string) => {
    const route = routeMap[screen] || screen;
    navigate(route);
  };
  return <Dashboard onNavigate={handleNavigate} />;
};

const StatisticsRoute = () => {
  const navigate = useNavigate();
  const handleNavigate = (screen: string) => {
    const route = routeMap[screen] || screen;
    navigate(route);
  };
  return <Dashboard onNavigate={handleNavigate} />;
};

const AllIncidentsDashboardRoute = () => {
  const navigate = useNavigate();
  const handleNavigate = (screen: string) => {
    const route = routeMap[screen] || screen;
    navigate(route);
  };
  return <AllIncidentsDashboard onNavigate={handleNavigate} />;
};

const EmergencyDashboardRoute = () => {
  const navigate = useNavigate();
  const handleNavigate = (screen: string) => {
    const route = routeMap[screen] || screen;
    navigate(route);
  };
  return <EmergencyDashboard onNavigate={handleNavigate} />;
};

const FireDashboardRoute = () => {
  const navigate = useNavigate();
  const handleNavigate = (screen: string) => {
    const route = routeMap[screen] || screen;
    navigate(route);
  };
  return <FireDashboard onNavigate={handleNavigate} />;
};

const RockfallDashboardRoute = () => {
  const navigate = useNavigate();
  const handleNavigate = (screen: string) => {
    const route = routeMap[screen] || screen;
    navigate(route);
  };
  return <RockfallDashboard onNavigate={handleNavigate} />;
};

const TrashDashboardRoute = () => {
  const navigate = useNavigate();
  const handleNavigate = (screen: string) => {
    const route = routeMap[screen] || screen;
    navigate(route);
  };
  return <TrashDashboard onNavigate={handleNavigate} />;
};

const EmergencyRecordsRoute = () => {
  const navigate = useNavigate();
  const handleNavigate = (screen: string) => {
    const route = routeMap[screen] || screen;
    navigate(route);
  };
  return <EmergencyRecords onNavigate={handleNavigate} />;
};

const CCTVManagementRoute = () => {
  const navigate = useNavigate();
  const handleNavigate = (screen: string) => {
    const route = routeMap[screen] || screen;
    navigate(route);
  };
  return <CCTVManagement onNavigate={handleNavigate} />;
};

const MonthlyReportRoute = () => {
  const navigate = useNavigate();
  const handleNavigate = (screen: string) => {
    const route = routeMap[screen] || screen;
    navigate(route);
  };
  return <MonthlyReport onNavigate={handleNavigate} />;
};

const TrendAnalysisRoute = () => {
  const navigate = useNavigate();
  const handleNavigate = (screen: string) => {
    const route = routeMap[screen] || screen;
    navigate(route);
  };
  return <TrendAnalysis onNavigate={handleNavigate} />;
};

const TrashTypeAnalysisRoute = () => {
  const navigate = useNavigate();
  const handleNavigate = (screen: string) => {
    const route = routeMap[screen] || screen;
    navigate(route);
  };
  return <TrashTypeAnalysis onNavigate={handleNavigate} />;
};

const SettingsRoute = () => {
  const navigate = useNavigate();
  const handleNavigate = (screen: string) => {
    const route = routeMap[screen] || screen;
    navigate(route);
  };
  return <Settings onNavigate={handleNavigate} />;
};

// LoginScreen wrapper
const LoginScreenWrapper = () => {
  const navigate = useNavigate();
  const handleNavigate = (screen: string) => {
    const route = routeMap[screen] || screen;
    navigate(route);
  };
  return <LoginScreen onNavigate={handleNavigate} />;
};

export const router = createBrowserRouter([
  {
    path: '/test',
    element: <TestPage />,
  },
  {
    path: '/login',
    element: <LoginScreenWrapper />,
  },
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        path: 'map',
        element: <MainMapRoute />,
      },
      {
        path: 'dashboard',
        element: <DashboardRoute />,
      },
      {
        path: 'statistics',
        element: <StatisticsRoute />,
      },
      {
        path: 'all-incidents',
        element: <AllIncidentsDashboardRoute />,
      },
      {
        path: 'emergency',
        element: <EmergencyDashboardRoute />,
      },
      {
        path: 'fire',
        element: <FireDashboardRoute />,
      },
      {
        path: 'rockfall',
        element: <RockfallDashboardRoute />,
      },
      {
        path: 'trash',
        element: <TrashDashboardRoute />,
      },
      {
        path: 'emergency-records',
        element: <EmergencyRecordsRoute />,
      },
      {
        path: 'cctv',
        element: <CCTVManagementRoute />,
      },
      {
        path: 'monthly-report',
        element: <MonthlyReportRoute />,
      },
      {
        path: 'trend',
        element: <TrendAnalysisRoute />,
      },
      {
        path: 'trash-types',
        element: <TrashTypeAnalysisRoute />,
      },
      {
        path: 'settings',
        element: <SettingsRoute />,
      },
    ],
  },
]);

