import { Home, LayoutDashboard, Camera, UserX, TrendingUp, Clock, Trash2, Settings, ChevronDown, ChevronRight, HeartPulse, FileText } from 'lucide-react';
import { useState } from 'react';

interface SidebarProps {
  onNavigate: (screen: string) => void;
  currentPath?: string;
}

export default function Sidebar({ onNavigate, currentPath = '' }: SidebarProps) {
  const [statsExpanded, setStatsExpanded] = useState(true);
  const [dashboardExpanded, setDashboardExpanded] = useState(true);

  const menuItems = [
    { path: 'main-map', label: 'Home', icon: Home, subItems: [] },
    { 
      path: null, 
      label: '상황별 현황', 
      icon: LayoutDashboard, 
      subItems: [
        { path: 'emergency-dashboard', label: '응급', badge: 3, badgeColor: 'bg-red-500' },
        { path: 'fire-dashboard', label: '화재', badge: 2, badgeColor: 'bg-red-500' },
        { path: 'rockfall-dashboard', label: '낙석', badge: 2, badgeColor: 'bg-yellow-500' },
        { path: 'trash-dashboard', label: '쓰레기', badge: 3, badgeColor: 'bg-green-500' },
      ] 
    },
    { path: 'cctv-management', label: 'CCTV 관리', icon: Camera, subItems: [] },
    { path: 'emergency-records', label: '응급환자 관리', icon: HeartPulse, subItems: [] },
    { path: 'dumper-detection', label: '쓰레기 투기자', icon: UserX, subItems: [] },
    {
      path: null,
      label: '통계·분석',
      icon: TrendingUp,
      subItems: [
        { path: 'trend-analysis', label: '발생 추세 분석' },
        { path: 'time-analysis', label: '시간대별 분석' },
        { path: 'trash-type-analysis', label: '쓰레기 종류별 분석' },
      ],
    },
    { path: 'report', label: '월간 보고서', icon: FileText, subItems: [] },
    { path: 'settings', label: '설정', icon: Settings, subItems: [] },
  ];

  return (
    <div className="w-64 bg-slate-900 text-white h-screen flex flex-col shadow-xl">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-600 flex items-center justify-center" style={{ borderRadius: '0px' }}>
            <span className="text-white">E</span>
          </div>
          <h2 className="text-white">EcoGuard</h2>
        </div>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 overflow-y-auto py-4">
        {menuItems.map((item, index) => {
          const isExpanded = item.label === '상황별 현황' ? dashboardExpanded : statsExpanded;
          const toggleExpanded = item.label === '상황별 현황' 
            ? () => setDashboardExpanded(!dashboardExpanded)
            : () => setStatsExpanded(!statsExpanded);

          return (
            <div key={index}>
              {item.subItems.length === 0 ? (
                <button
                  onClick={() => item.path && onNavigate(item.path)}
                  className={`w-full flex items-center gap-3 px-6 py-3 transition-colors ${
                    currentPath === item.path
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {item.icon && <item.icon className="w-5 h-5" />}
                  <span>{item.label}</span>
                </button>
              ) : (
                <div>
                  <button
                    onClick={toggleExpanded}
                    className="w-full flex items-center gap-3 px-6 py-3 text-slate-300 hover:bg-slate-800 transition-colors"
                  >
                    {item.icon && <item.icon className="w-5 h-5" />}
                    <span className="flex-1 text-left">{item.label}</span>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="bg-slate-950">
                      {item.subItems.map((subItem, subIndex) => (
                        <button
                          key={subIndex}
                          onClick={() => onNavigate(subItem.path)}
                          className={`w-full flex items-center justify-between px-6 py-2 pl-14 transition-colors ${
                            currentPath === subItem.path
                              ? 'bg-emerald-600 text-white'
                              : 'text-slate-400 hover:bg-slate-800'
                          }`}
                        >
                          <span className="text-sm">{subItem.label}</span>
                          {subItem.badge !== undefined && (
                            <span
                              className={`flex items-center justify-center w-6 h-6 text-xs ${subItem.badgeColor} text-white rounded-full`}
                            >
                              {subItem.badge}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}