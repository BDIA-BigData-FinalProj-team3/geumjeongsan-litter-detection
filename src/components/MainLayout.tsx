import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { SidebarProvider, useSidebarContext } from '../contexts/SidebarContext';

function MainLayoutContent() {
  const location = useLocation();
  const { sidebarOpen, setSidebarOpen } = useSidebarContext();

  // Map route paths to sidebar path format
  const getCurrentPath = () => {
    const pathMap: Record<string, string> = {
      '/map': 'main-map',
      '/dashboard': 'dashboard',
      '/emergency': 'emergency-dashboard',
      '/fire': 'fire-dashboard',
      '/rockfall': 'rockfall-dashboard',
      '/trash': 'trash-dashboard',
      '/cctv': 'cctv-management',
      '/emergency-records': 'emergency-records',
      '/monthly-report': 'report',
      '/trend': 'trend-analysis',
      '/trash-types': 'trash-type-analysis',
    };
    // Remove leading slash and get the path
    const path = location.pathname;
    return pathMap[path] || path.replace('/', '') || '';
  };

  return (
    <div className="h-screen flex relative bg-white">
      {/* Sidebar - Desktop: Always visible, Mobile: Toggle */}
      <div className="hidden md:block fixed top-0 left-0 z-50 h-screen" style={{ width: '317.56px', backgroundColor: '#2B2847' }}>
        <Sidebar currentPath={getCurrentPath()} />
      </div>

      {/* Sidebar - Mobile: Overlay with smooth slide animation */}
      <div 
        className="md:hidden fixed top-0 z-50 h-screen transition-transform duration-300 ease-in-out"
        style={{ 
          width: '317.56px', 
          backgroundColor: '#2B2847',
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          left: 0
        }}
      >
        <Sidebar 
          currentPath={getCurrentPath()} 
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main Content Area */}
      <div 
        className="flex-1 overflow-auto md:ml-[317.56px]"
      >
        <div className="w-full h-full">
          <Outlet />
        </div>
      </div>

    </div>
  );
}

export default function MainLayout() {
  return (
    <SidebarProvider>
      <MainLayoutContent />
    </SidebarProvider>
  );
}

