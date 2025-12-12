import React, { useState } from 'react';
import { Home, LayoutDashboard, Camera, UserX, TrendingUp, Clock, Trash2, Users, ChevronDown, ChevronUp, ChevronRight, HeartPulse, FileText, AlertTriangle, Flame, Mountain } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useIncidentCount } from '../contexts/IncidentCountContext';

const Logo = () => (
  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
    width="75.5px" height="75.5px" viewBox="10.611 20.231 75.5 75.5" enableBackground="new 10.611 20.231 75.5 75.5"
    xmlSpace="preserve">
    <g>
      <circle fill="#FFFFFF" cx="48.36" cy="57.981" r="37.75"/>
      <g>
        <path fill="#167061" d="M49.649,73.487l1.992-2.324l5.013,4.316C56.654,75.479,49.716,78.699,49.649,73.487z"/>
        <path fill="#167061" d="M38.942,73.42l5.379-4.881l7.853,7.172C52.174,75.711,40.374,75.731,38.942,73.42z"/>
        <path d="M55.737,61.826V73.77c-1.243,0.62-3.667,1.117-7.21,1.117c-9.758,0-16.16-6.277-16.16-16.906
          c0-10.504,6.65-16.844,16.844-16.844c4.227,0,7.024,0.809,9.261,1.803l1.306-4.414c-1.802-0.87-5.594-1.927-10.442-1.927
          c-14.047,0-22.624,9.137-22.687,21.631c0,6.526,2.238,12.12,5.843,15.6c4.103,3.916,9.323,5.532,15.663,5.532
          c5.656,0,10.442-1.43,12.866-2.3V61.826H55.737z"/>
        <path fill="#3F7747" d="M60.977,61.239c-1.494-3.462-4.977-6.768-9.662-8.719c-4.687-1.95-9.486-2.09-12.996-0.709
          c1.494,3.462,4.977,6.769,9.663,8.718C52.669,62.479,57.468,62.62,60.977,61.239z"/>
        <path fill="#3F7747" d="M55.778,62.041c3.599,1.125,8.376,0.64,12.91-1.642c4.533-2.281,7.77-5.83,9.011-9.391
          c-3.6-1.124-8.378-0.639-12.911,1.643C60.255,54.932,57.018,58.479,55.778,62.041z"/>
      </g>
    </g>
  </svg>
);

interface SidebarProps {
  onNavigate?: (screen: string) => void;
  currentPath?: string;
  onClose?: () => void;
}

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

// Reverse mapping from routes to old screen names
const reverseRouteMap: Record<string, string> = {
  '/map': 'main-map',
  '/dashboard': 'dashboard',
  '/statistics': 'statistics',
  '/all-incidents': 'all-incidents',
  '/emergency': 'emergency-dashboard',
  '/fire': 'fire-dashboard',
  '/rockfall': 'rockfall-dashboard',
  '/trash': 'trash-dashboard',
  '/cctv': 'cctv-management',
  '/emergency-records': 'emergency-records',
  '/monthly-report': 'report',
  '/trend': 'trend-analysis',
  '/trash-types': 'trash-type-analysis',
  '/settings': 'settings',
  '/login': 'login',
};

export default function Sidebar({ onNavigate, currentPath, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { emergencyCount, fireCount, trashCount } = useIncidentCount();
  
  // Use currentPath prop if provided, otherwise derive from location
  const activePath = currentPath || reverseRouteMap[location.pathname] || '';
  const [statsExpanded, setStatsExpanded] = useState(true);
  const [overviewExpanded, setOverviewExpanded] = useState(true);

  const handleNavigate = (screen: string) => {
    const route = routeMap[screen] || screen;
    navigate(route);
    // Home 탭이 아닐 때만 사이드바 닫기
    if (onClose && screen !== 'main-map') {
      onClose();
    }
    // Also call onNavigate if provided for backward compatibility
    if (onNavigate) {
      onNavigate(screen);
    }
  };

  const menuItems = [
    { path: 'main-map', label: 'Home', icon: Home, subItems: [] },
    {
      path: 'all-incidents',
      label: '전체 현황',
      icon: LayoutDashboard,
      subItems: [
        { path: 'emergency-dashboard', label: '응급', badge: emergencyCount, badgeColor: '#99332E' },
        { path: 'fire-dashboard', label: '화재', badge: fireCount, badgeColor: '#FF5A5A' },
        { path: 'trash-dashboard', label: '쓰레기', badge: trashCount, badgeColor: '#576F93' },
        { path: 'rockfall-dashboard', label: '낙석', badge: 0, badgeColor: '#8E8665' },
      ],
    },
    { path: 'cctv-management', label: 'CCTV 관리', icon: Camera, subItems: [] },
    { path: 'statistics', label: '통계', icon: TrendingUp, subItems: [] },
    // { path: 'dumper-detection', label: '쓰레기 투기자', icon: UserX, subItems: [] },
    // {
    //   path: null,
    //   label: '통계·분석',
    //   icon: TrendingUp,
    //   subItems: [
    //     { path: 'trend-analysis', label: '발생 추세 분석' },
    //     { path: 'time-analysis', label: '시간대별 분석' },
    //     { path: 'trash-type-analysis', label: '쓰레기 종류별 분석' },
    //   ],
    // },
    { path: 'report', label: '월간 보고서', icon: FileText, subItems: [] },
    { path: 'settings', label: '알림 수신 직원', icon: Users, subItems: [] },
  ];

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#2B2847' }}>
      {/* Logo and Title */}
      <div className="p-6 border-b flex items-center gap-3" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <Logo style={{ width: '62px', height: '62px', flexShrink: 0 }} />
        <div className="flex flex-col">
          <span className="text-white" style={{ fontSize: '16pt', lineHeight: '1.3', WebkitTextStroke: '0.5pt white' }}>Geumjeong</span>
          <span className="text-white" style={{ fontSize: '16pt', lineHeight: '1.3', WebkitTextStroke: '0.5pt white' }}>Sentinel</span>
          <span className="text-gray-400" style={{ fontSize: '9pt', lineHeight: '1.3', marginTop: '4px', whiteSpace: 'nowrap' }}>금정산 국립공원 탐지현황 관리자 대시보드</span>
        </div>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 overflow-y-auto py-4">
        {menuItems.map((item, index) => {
          const isExpanded = item.label === '통계·분석' ? statsExpanded : item.label === '전체 현황' ? overviewExpanded : false;
          const toggleExpanded = item.label === '통계·분석' 
            ? () => setStatsExpanded(!statsExpanded)
            : item.label === '전체 현황'
            ? () => setOverviewExpanded(!overviewExpanded)
            : () => {};

          return (
            <div key={index}>
              {item.subItems.length === 0 ? (
                <button
                  onClick={() => item.path && handleNavigate(item.path)}
                  className={`w-full flex items-center gap-3 px-6 py-3 transition-colors ${
                    activePath === item.path
                      ? 'text-white'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                  style={activePath === item.path ? { backgroundColor: 'rgba(255,255,255,0.1)' } : {}}
                >
                  {item.icon && <item.icon className="w-5 h-5" />}
                  <span>{item.label}</span>
                </button>
              ) : (
                <div>
                  {/* 메뉴 텍스트와 화살표를 분리 */}
                  <div className="flex items-center">
                    {/* 메뉴 텍스트 - navigation만 */}
                    <button
                      onClick={() => {
                        if (item.path) {
                          handleNavigate(item.path);
                        }
                      }}
                      className={`flex-1 flex items-center gap-3 px-6 py-3 transition-colors ${
                        activePath === item.path
                          ? 'text-white'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                      style={activePath === item.path ? { backgroundColor: 'rgba(255,255,255,0.1)' } : {}}
                    >
                      {item.icon && <item.icon className="w-5 h-5" />}
                      <span className="flex-1 text-left">{item.label}</span>
                    </button>
                    
                    {/* 화살표 - 토글만 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpanded();
                      }}
                      className="px-3 py-3 text-slate-300 hover:bg-slate-800 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  
                  {/* 서브메뉴 - 애니메이션 추가 */}
                  <div 
                    className="overflow-hidden transition-all duration-300 ease-in-out"
                    style={{ 
                      maxHeight: isExpanded ? '500px' : '0',
                      opacity: isExpanded ? 1 : 0
                    }}
                  >
                    <div style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
                      {item.subItems.map((subItem, subIndex) => (
                        <button
                          key={subIndex}
                          onClick={() => handleNavigate(subItem.path)}
                          className={`w-full flex items-center justify-between px-6 py-3 pl-14 transition-colors ${
                            activePath === subItem.path
                              ? 'text-white'
                              : 'text-slate-400 hover:bg-slate-800'
                          }`}
                          style={activePath === subItem.path ? { backgroundColor: 'rgba(255,255,255,0.1)' } : {}}
                        >
                          <span className="flex-1 text-left" style={{ fontSize: 'inherit', lineHeight: 'inherit' }}>{subItem.label}</span>
                          <span
                            className="flex items-center justify-center text-xs text-white rounded-full flex-shrink-0"
                            style={{ 
                              width: '30px', 
                              height: '30px', 
                              backgroundColor: (subItem.badge !== undefined && subItem.badge > 0) ? subItem.badgeColor : 'transparent',
                              fontFamily: 'NanumSquareBold, NanumSquare, sans-serif',
                              fontWeight: 700,
                              marginLeft: '8px'
                            }}
                          >
                            {(subItem.badge !== undefined && subItem.badge > 0) ? subItem.badge : ''}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="border-t py-4" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <button
          onClick={() => handleNavigate('login')}
          className="w-full text-left px-6 py-3 text-slate-300 hover:text-white transition-colors"
          style={{
            fontFamily: 'NanumSquareBold, NanumSquare, sans-serif',
            fontSize: '15.57px',
            fontWeight: 'bold'
          }}
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}