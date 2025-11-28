import { useState, useEffect } from 'react';
import { Menu, User, LogOut, ChevronDown, Flame, Trash2, Camera, Wrench, X, Plus, Minus, Download, Bell, AlertCircle, Move, MessageSquare, Eye } from 'lucide-react';
import Sidebar from './Sidebar';
import mapImage from 'figma:asset/e2eee362b605222576aa0e01e59c017ebe22e4e9.png';

interface MainMapProps {
  onNavigate: (screen: string) => void;
}

interface CCTVMarker {
  id: string;
  x: number;
  y: number;
  location: string;
  status: '정상' | '점검필요';
  incidents: {
    fire?: number;
    rockfall?: number;
    trash?: number;
  };
}

interface CCTVPopup {
  cctv: CCTVMarker;
  x: number;
  y: number;
}

interface DetectionPopup {
  marker: CCTVMarker;
  incidents: Array<{
    type: 'fire' | 'rockfall' | 'trash';
    time: string;
    confidence: string;
  }>;
}

const RockIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M3 20 L8 10 L12 14 L16 6 L21 20 Z" />
  </svg>
);

const SeismicWaveIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2 12 L6 8 L10 16 L14 4 L18 14 L22 12" />
  </svg>
);

export default function MainMap({ onNavigate }: MainMapProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState<'detections' | 'cctv'>('detections');
  const [showAllDetections, setShowAllDetections] = useState(true);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'fire' | 'rockfall' | 'trash'>('all');
  const [selectedCCTV, setSelectedCCTV] = useState<CCTVPopup | null>(null);
  const [selectedDetection, setSelectedDetection] = useState<DetectionPopup | null>(null);
  const [zoomLevel, setZoomLevel] = useState(12);
  const [showHelicopters, setShowHelicopters] = useState(false);
  const [showRockfallSensors, setShowRockfallSensors] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationTab, setNotificationTab] = useState<'fire' | 'rockfall' | 'trash'>('fire');
  const [selectedNotification, setSelectedNotification] = useState<{
    cctvId: string;
    type: 'fire' | 'rockfall' | 'trash';
    location: string;
    time: string;
    confidence: string;
  } | null>(null);
  const [highlightedCCTV, setHighlightedCCTV] = useState<string | null>(null);
  const [videoDetailPopup, setVideoDetailPopup] = useState<{
    cctvId: string;
    location: string;
    time: string;
    confidence: string;
  } | null>(null);

  const [fireNotifications, setFireNotifications] = useState([
    { id: '1', cctvId: 'CCTV-001', location: '등산로 1', time: '2025-11-25 10:15:00', confidence: '95%', timeAgo: '2분 전' },
    { id: '2', cctvId: 'CCTV-007', location: '등산로 2', time: '2025-11-25 10:00:00', confidence: '92%', timeAgo: '15분 전' },
    { id: '3', cctvId: 'CCTV-013', location: '공원중앙', time: '2025-11-25 09:15:00', confidence: '89%', timeAgo: '1시간 전' },
  ]);

  const [rockfallNotifications, setRockfallNotifications] = useState([
    { id: '1', cctvId: 'CCTV-008', location: '등산로 3', time: '2025-11-25 10:10:00', confidence: '88%', timeAgo: '5분 전' },
    { id: '2', cctvId: 'CCTV-018', location: '등산로 2', time: '2025-11-25 10:03:00', confidence: '91%', timeAgo: '12분 전' },
    { id: '3', cctvId: 'CCTV-002', location: '등산로 1', time: '2025-11-25 09:45:00', confidence: '86%', timeAgo: '30분 전' },
  ]);

  const [trashNotifications, setTrashNotifications] = useState([
    { id: '1', cctvId: 'CCTV-003', location: '등산로 3', time: '2025-11-25 10:12:00', confidence: '82%', timeAgo: '3분 전' },
    { id: '2', cctvId: 'CCTV-009', location: '등산로 1', time: '2025-11-25 10:07:00', confidence: '85%', timeAgo: '8분 전' },
    { id: '3', cctvId: 'CCTV-015', location: '등산로 2', time: '2025-11-25 09:55:00', confidence: '80%', timeAgo: '20분 전' },
  ]);

  const [removedCCTVs, setRemovedCCTVs] = useState<Set<string>>(new Set());
  const [mapData, setMapData] = useState<{
    cctvMarkers: Array<{
      id: string;
      cctvCode: string;
      name: string;
      location: string;
      status: string;
      longitude: number | null;
      latitude: number | null;
      incidentCount: number;
      incidents: { fire?: number; rockfall?: number; trash?: number; emergency?: number };
    }>;
    incidentMarkers: Array<{
      id: number;
      cctvId: string;
      incidentType: string;
      severity: string;
      status: string;
      time: string;
      longitude: number | null;
      latitude: number | null;
    }>;
    helicopterSpots: Array<{ id: number; name: string; longitude: number | null; latitude: number | null }>;
    rockfallSensorSpots: Array<{ id: number; name: string; longitude: number | null; latitude: number | null }>;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  // 지도 범위 (PostGIS에서 확인한 실제 범위)
  const MAP_BOUNDS = {
    minLon: 129.0375,
    maxLon: 129.098,
    minLat: 35.231,
    maxLat: 35.303,
  };

  // 경도/위도를 퍼센트 좌표로 변환
  const longitudeToX = (lon: number | null): number => {
    if (lon === null) return 50;
    return ((lon - MAP_BOUNDS.minLon) / (MAP_BOUNDS.maxLon - MAP_BOUNDS.minLon)) * 100;
  };

  const latitudeToY = (lat: number | null): number => {
    if (lat === null) return 50;
    // 위도는 위에서 아래로 갈수록 증가하므로 반대로 계산
    return ((MAP_BOUNDS.maxLat - lat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * 100;
  };

  // 지도 데이터 가져오기
  useEffect(() => {
    const fetchMapData = async () => {
      setLoading(true);
      try {
        const response = await fetch('http://localhost:8080/api/map/data');
        if (response.ok) {
          const data = await response.json();
          setMapData(data);
        } else {
          console.error('지도 데이터를 불러오는데 실패했습니다.');
        }
      } catch (err) {
        console.error('API 호출 실패:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMapData();
  }, []);

  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [popupPositions, setPopupPositions] = useState({
    notification: { x: window.innerWidth / 2 - 250, y: window.innerHeight / 2 - 200 },
    detection: { x: window.innerWidth / 2 - 250, y: window.innerHeight / 2 - 200 },
    cctv: { x: window.innerWidth / 2 - 200, y: window.innerHeight / 2 - 150 },
  });

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragging) return;
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    setPopupPositions(prev => ({ ...prev, [dragging]: { x: newX, y: newY } }));
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, dragOffset]);

  const startDrag = (popupType: string, e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setDragging(popupType);
  };

  // API 데이터를 UI 형식으로 변환
  const cctvMarkers: CCTVMarker[] = mapData?.cctvMarkers.map(cctv => ({
    id: cctv.id,
    x: longitudeToX(cctv.longitude),
    y: latitudeToY(cctv.latitude),
    location: cctv.location,
    status: cctv.status === '정상' ? '정상' as const : '점검필요' as const,
    incidents: {
      fire: cctv.incidents.fire || undefined,
      rockfall: cctv.incidents.rockfall || undefined,
      trash: cctv.incidents.trash || undefined,
    },
  })) || [];

  const helicopterLocations = mapData?.helicopterSpots.map(heli => ({
    id: `H-${heli.id.toString().padStart(3, '0')}`,
    x: longitudeToX(heli.longitude),
    y: latitudeToY(heli.latitude),
  })) || [];

  const rockfallSensors = mapData?.rockfallSensorSpots.map(sensor => ({
    id: `RS-${sensor.id.toString().padStart(3, '0')}`,
    x: longitudeToX(sensor.longitude),
    y: latitudeToY(sensor.latitude),
  })) || [];

  const getPriorityIncident = (incidents: CCTVMarker['incidents']) => {
    if (incidents.fire) return { type: 'fire' as const, count: incidents.fire };
    if (incidents.rockfall) return { type: 'rockfall' as const, count: incidents.rockfall };
    if (incidents.trash) return { type: 'trash' as const, count: incidents.trash };
    return null;
  };

  const getFilteredMarkers = () => {
    if (!showAllDetections || !mapData) return [];
    if (selectedFilter === 'all') return cctvMarkers.filter(m => m.incidents.fire || m.incidents.rockfall || m.incidents.trash);
    return cctvMarkers.filter(marker => {
      if (selectedFilter === 'fire') return marker.incidents.fire;
      if (selectedFilter === 'rockfall') return marker.incidents.rockfall;
      if (selectedFilter === 'trash') return marker.incidents.trash;
      return false;
    });
  };

  const handleFilterSelect = (filter: 'all' | 'fire' | 'rockfall' | 'trash') => {
    setSelectedFilter(filter);
    setShowFilterDropdown(false);
    if (!showAllDetections) setShowAllDetections(true);
  };

  const handleMarkerClick = (marker: CCTVMarker, event: React.MouseEvent) => {
    if (activeView === 'cctv') {
      const rect = event.currentTarget.getBoundingClientRect();
      setSelectedCCTV({ cctv: marker, x: rect.left + rect.width / 2, y: rect.top });
    } else if (activeView === 'detections') {
      const incidents: Array<{ type: 'fire' | 'rockfall' | 'trash'; time: string; confidence: string; }> = [];
      if (marker.incidents.fire) {
        for (let i = 0; i < marker.incidents.fire; i++) {
          incidents.push({ type: 'fire', time: `2025-11-25 ${10 + i}:${15 + i * 5}:00`, confidence: `${95 - i * 2}%` });
        }
      }
      if (marker.incidents.rockfall) {
        for (let i = 0; i < marker.incidents.rockfall; i++) {
          incidents.push({ type: 'rockfall', time: `2025-11-25 ${12 + i}:${20 + i * 5}:00`, confidence: `${88 - i * 2}%` });
        }
      }
      if (marker.incidents.trash) {
        for (let i = 0; i < marker.incidents.trash; i++) {
          incidents.push({ type: 'trash', time: `2025-11-25 ${14 + i}:${30 + i * 5}:00`, confidence: `${82 - i * 2}%` });
        }
      }
      setSelectedDetection({ marker: marker, incidents: incidents });
    }
  };

  const getIncidentLabel = (type: 'fire' | 'rockfall' | 'trash') => {
    if (type === 'fire') return '화재';
    if (type === 'rockfall') return '낙석';
    return '쓰레기 투기';
  };

  const getIncidentColor = (type: 'fire' | 'rockfall' | 'trash') => {
    if (type === 'fire') return 'bg-red-100 text-red-700';
    if (type === 'rockfall') return 'bg-yellow-100 text-yellow-700';
    return 'bg-green-100 text-green-700';
  };

  return (
    <div className="h-screen flex flex-col relative bg-white">
      {sidebarOpen && (
        <div className="fixed top-0 left-0 z-50 h-screen bg-slate-900" style={{ width: '256px' }}>
          <div className="p-6 border-b border-slate-700 flex items-center gap-3">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="14" fill="#10B981" opacity="0.1"/>
              <path d="M16 8 L16 12 M16 12 L13 14 M16 12 L19 14 M13 14 L13 20 L10 22 M19 14 L19 20 L22 22 M16 12 L16 24" stroke="#10B981" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="16" cy="24" r="1.5" fill="#10B981"/>
            </svg>
            <span className="text-white font-medium">Geumjeong Sentinel AI</span>
          </div>
          <Sidebar onNavigate={(screen) => { setSidebarOpen(false); onNavigate(screen); }} currentPath="main-map" />
        </div>
      )}

      <div className="bg-white shadow-md px-6 py-4 flex items-center justify-between z-10 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14" fill="#10B981" opacity="0.1"/>
            <path d="M16 8 L16 12 M16 12 L13 14 M16 12 L19 14 M13 14 L13 20 L10 22 M19 14 L19 20 L22 22 M16 12 L16 24" stroke="#10B981" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="16" cy="24" r="1.5" fill="#10B981"/>
          </svg>
          {!sidebarOpen && <h1 className="text-gray-900">Geumjeong Sentinel AI</h1>}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-gray-600" />
            <span className="text-sm text-gray-700">홍길동님 환영합니다</span>
          </div>
          <button onClick={() => onNavigate('login')} className="px-3 py-1 text-sm text-white bg-gray-700 hover:bg-gray-800 transition-colors flex items-center gap-1" style={{ borderRadius: '0px' }}>
            <LogOut className="w-4 h-4" />
            로그아웃
          </button>
        </div>
      </div>

      <div className="bg-white px-6 py-4 flex items-center gap-4 shadow-sm z-10 border-b border-gray-100 transition-all duration-300" style={{ marginLeft: sidebarOpen ? '256px' : '0px' }}>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-100 transition-colors" style={{ borderRadius: '0px' }}>
          <Menu className="w-6 h-6 text-gray-700" />
        </button>

        <div className="flex items-center gap-2">
          <button onClick={() => { setShowAllDetections(!showAllDetections); setActiveView('detections'); }} className={`px-4 py-2 shadow-md hover:shadow-lg transition-all ${activeView === 'detections' && showAllDetections ? 'bg-emerald-600 text-white' : 'bg-white text-gray-800 border border-gray-200'}`} style={{ borderRadius: '0px' }}>
            전체탐지
          </button>
          
          <div className="relative">
            <button onClick={() => setShowFilterDropdown(!showFilterDropdown)} className="p-2 bg-white border border-gray-200 shadow-md hover:shadow-lg transition-all" style={{ borderRadius: '0px' }}>
              <ChevronDown className="w-4 h-4 text-gray-700" />
            </button>
            
            {showFilterDropdown && (
              <div className="absolute top-full left-0 mt-2 bg-white shadow-xl border border-gray-200 z-20 min-w-[150px]" style={{ borderRadius: '0px' }}>
                <button onClick={() => handleFilterSelect('all')} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-sm text-gray-900">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-red-400 via-yellow-400 to-green-400"></div>
                  전체
                </button>
                <button onClick={() => handleFilterSelect('fire')} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-sm text-gray-900">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  화재
                </button>
                <button onClick={() => handleFilterSelect('rockfall')} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-sm text-gray-900">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  낙석
                </button>
                <button onClick={() => handleFilterSelect('trash')} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-sm text-gray-900">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  쓰레기
                </button>
              </div>
            )}
          </div>
        </div>

        <button onClick={() => { setActiveView('cctv'); setShowAllDetections(false); }} className={`px-4 py-2 shadow-md hover:shadow-lg transition-all ${activeView === 'cctv' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-800 border border-gray-200'}`} style={{ borderRadius: '0px' }}>
          실시간 CCTV
        </button>

        <button onClick={() => setShowHelicopters(!showHelicopters)} className={`px-4 py-2 shadow-md hover:shadow-lg transition-all ${showHelicopters ? 'bg-emerald-600 text-white' : 'bg-white text-gray-800 border border-gray-200'}`} style={{ borderRadius: '0px' }}>
          헬기 착륙 위치
        </button>

        <button onClick={() => setShowRockfallSensors(!showRockfallSensors)} className={`px-4 py-2 shadow-md hover:shadow-lg transition-all ${showRockfallSensors ? 'bg-emerald-600 text-white' : 'bg-white text-gray-800 border border-gray-200'}`} style={{ borderRadius: '0px' }}>
          낙석 센서
        </button>

        <div className="flex-1"></div>

        <div className="relative">
          <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 hover:bg-gray-100 transition-colors" style={{ borderRadius: '0px' }}>
            <Bell className="w-6 h-6 text-gray-700" />
            <AlertCircle className="w-4 h-4 text-red-500 fill-red-500 absolute top-0 right-0" />
          </button>
        </div>
      </div>

      {/* 알림 드롭다운을 최상위 레벨로 분리 */}
      {showNotifications && (
        <div className="fixed top-32 right-6 bg-white shadow-2xl border border-gray-200" style={{ borderRadius: '0px', width: '350px', zIndex: 9999 }}>
          <div className="flex border-b border-gray-200">
            <button onClick={() => setNotificationTab('fire')} className={`flex-1 px-4 py-3 text-sm transition-colors ${notificationTab === 'fire' ? 'bg-red-50 text-red-700 border-b-2 border-red-500' : 'text-gray-600 hover:bg-gray-50'}`} style={{ borderRadius: '0px' }}>
              화재
            </button>
            <button onClick={() => setNotificationTab('rockfall')} className={`flex-1 px-4 py-3 text-sm transition-colors ${notificationTab === 'rockfall' ? 'bg-yellow-50 text-yellow-700 border-b-2 border-yellow-500' : 'text-gray-600 hover:bg-gray-50'}`} style={{ borderRadius: '0px' }}>
              낙석
            </button>
            <button onClick={() => setNotificationTab('trash')} className={`flex-1 px-4 py-3 text-sm transition-colors ${notificationTab === 'trash' ? 'bg-green-50 text-green-700 border-b-2 border-green-500' : 'text-gray-600 hover:bg-gray-50'}`} style={{ borderRadius: '0px' }}>
              쓰레기
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notificationTab === 'fire' && (
              <div className="p-4 space-y-3">
                {fireNotifications.map((notification) => (
                  <div key={notification.id} className="bg-red-50 border border-red-200 p-3" style={{ borderRadius: '0px' }}>
                    <div className="flex items-start justify-between mb-2">
                      <button onClick={() => { setSelectedNotification({ cctvId: notification.cctvId, type: 'fire', location: notification.location, time: notification.time, confidence: notification.confidence }); setHighlightedCCTV(notification.cctvId); }} className="flex items-center gap-2 hover:opacity-80">
                        <Flame className="w-4 h-4 text-red-600" />
                        <span className="text-sm font-medium text-red-900">{notification.cctvId}</span>
                      </button>
                      <span className="text-xs text-red-600">{notification.timeAgo}</span>
                    </div>
                    <button onClick={() => { setSelectedNotification({ cctvId: notification.cctvId, type: 'fire', location: notification.location, time: notification.time, confidence: notification.confidence }); setHighlightedCCTV(notification.cctvId); }} className="text-left w-full">
                      <p className="text-xs text-red-700">{notification.location}에서 화재 감지</p>
                      <p className="text-xs text-red-600 mt-1">신뢰도: {notification.confidence}</p>
                    </button>
                    <button onClick={() => { setFireNotifications(prev => prev.filter(n => n.id !== notification.id)); setRemovedCCTVs(prev => new Set(prev).add(notification.cctvId)); }} className="mt-2 w-full px-2 py-1 bg-red-600 text-white text-xs hover:bg-red-700 transition-colors" style={{ borderRadius: '0px' }}>
                      처리완료
                    </button>
                  </div>
                ))}
              </div>
            )}

            {notificationTab === 'rockfall' && (
              <div className="p-4 space-y-3">
                {rockfallNotifications.map((notification) => (
                  <div key={notification.id} className="bg-yellow-50 border border-yellow-200 p-3" style={{ borderRadius: '0px' }}>
                    <div className="flex items-start justify-between mb-2">
                      <button onClick={() => { setSelectedNotification({ cctvId: notification.cctvId, type: 'rockfall', location: notification.location, time: notification.time, confidence: notification.confidence }); setHighlightedCCTV(notification.cctvId); }} className="flex items-center gap-2 hover:opacity-80">
                        <RockIcon className="w-4 h-4 text-yellow-600" />
                        <span className="text-sm font-medium text-yellow-900">{notification.cctvId}</span>
                      </button>
                      <span className="text-xs text-yellow-600">{notification.timeAgo}</span>
                    </div>
                    <button onClick={() => { setSelectedNotification({ cctvId: notification.cctvId, type: 'rockfall', location: notification.location, time: notification.time, confidence: notification.confidence }); setHighlightedCCTV(notification.cctvId); }} className="text-left w-full">
                      <p className="text-xs text-yellow-700">{notification.location}에서 낙석 감지</p>
                      <p className="text-xs text-yellow-600 mt-1">신뢰도: {notification.confidence}</p>
                    </button>
                    <button onClick={() => { setRockfallNotifications(prev => prev.filter(n => n.id !== notification.id)); setRemovedCCTVs(prev => new Set(prev).add(notification.cctvId)); }} className="mt-2 w-full px-2 py-1 bg-yellow-600 text-white text-xs hover:bg-yellow-700 transition-colors" style={{ borderRadius: '0px' }}>
                      처리완료
                    </button>
                  </div>
                ))}
              </div>
            )}

            {notificationTab === 'trash' && (
              <div className="p-4 space-y-3">
                {trashNotifications.map((notification) => (
                  <div key={notification.id} className="bg-green-50 border border-green-200 p-3" style={{ borderRadius: '0px' }}>
                    <div className="flex items-start justify-between mb-2">
                      <button onClick={() => { setSelectedNotification({ cctvId: notification.cctvId, type: 'trash', location: notification.location, time: notification.time, confidence: notification.confidence }); setHighlightedCCTV(notification.cctvId); }} className="flex items-center gap-2 hover:opacity-80">
                        <Trash2 className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-900">{notification.cctvId}</span>
                      </button>
                      <span className="text-xs text-green-600">{notification.timeAgo}</span>
                    </div>
                    <button onClick={() => { setSelectedNotification({ cctvId: notification.cctvId, type: 'trash', location: notification.location, time: notification.time, confidence: notification.confidence }); setHighlightedCCTV(notification.cctvId); }} className="text-left w-full">
                      <p className="text-xs text-green-700">{notification.location}에서 쓰레기 투기 감지</p>
                      <p className="text-xs text-green-600 mt-1">신뢰도: {notification.confidence}</p>
                    </button>
                    <button onClick={() => { setTrashNotifications(prev => prev.filter(n => n.id !== notification.id)); setRemovedCCTVs(prev => new Set(prev).add(notification.cctvId)); }} className="mt-2 w-full px-2 py-1 bg-green-600 text-white text-xs hover:bg-green-700 transition-colors" style={{ borderRadius: '0px' }}>
                      처리완료
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 relative bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300" style={{ marginLeft: sidebarOpen ? '256px' : '0px', transition: 'margin-left 0.3s' }}>
        {/* 지도 배경 이미지 */}
        <div className="absolute inset-0" style={{ 
          backgroundImage: `url(${mapImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}>
          {/* 지역명 라벨 */}
          <div className="absolute" style={{ left: '10%', top: '10%' }}>
            <span className="text-sm text-gray-700 font-semibold drop-shadow-md">북문</span>
          </div>
          <div className="absolute" style={{ left: '15%', top: '20%' }}>
            <span className="text-sm text-gray-700 font-semibold drop-shadow-md">등산로 1</span>
          </div>
          <div className="absolute" style={{ left: '60%', top: '25%' }}>
            <span className="text-sm text-gray-700 font-semibold drop-shadow-md">등산로 2</span>
          </div>
          <div className="absolute" style={{ left: '45%', top: '45%' }}>
            <span className="text-sm text-gray-700 font-semibold drop-shadow-md">공원중앙</span>
          </div>
          <div className="absolute" style={{ left: '20%', top: '55%' }}>
            <span className="text-sm text-gray-700 font-semibold drop-shadow-md">등산로 3</span>
          </div>
          <div className="absolute" style={{ left: '75%', top: '75%' }}>
            <span className="text-sm text-gray-700 font-semibold drop-shadow-md">남문</span>
          </div>
        </div>

        {/* 전체탐지 모드 마커 */}
        {activeView === 'detections' && getFilteredMarkers().map((marker) => {
          if (removedCCTVs.has(marker.id)) return null;
          const priority = getPriorityIncident(marker.incidents);
          if (!priority) return null;
          const iconColor = priority.type === 'fire' ? '#EF4444' : priority.type === 'rockfall' ? '#EAB308' : '#10B981';
          const bgColor = priority.type === 'fire' ? '#EF4444' : priority.type === 'rockfall' ? '#EAB308' : '#10B981';
          const isHighlighted = highlightedCCTV === marker.id;
          
          return (
            <div 
              key={marker.id}
              onClick={(e) => handleMarkerClick(marker, e)}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-all ${isHighlighted ? 'scale-150 animate-pulse' : ''}`}
              style={{ left: `${marker.x}%`, top: `${marker.y}%`, zIndex: isHighlighted ? 20 : 10 }}
            >
              <div className="relative">
                <div 
                  className="w-8 h-8 rounded-full shadow-lg flex items-center justify-center"
                  style={{ backgroundColor: bgColor }}
                >
                  {priority.type === 'fire' && <Flame className="w-4 h-4 text-white" />}
                  {priority.type === 'rockfall' && <RockIcon className="w-4 h-4 text-white" />}
                  {priority.type === 'trash' && <Trash2 className="w-4 h-4 text-white" />}
                </div>
              </div>
            </div>
          );
        })}

        {/* 실시간 CCTV 모드 마커 */}
        {activeView === 'cctv' && cctvMarkers.map((marker) => {
          const isMaintenanceNeeded = marker.status === '점검필요';
          const bgColor = isMaintenanceNeeded ? '#FF8C00' : '#363636';
          
          return (
            <div 
              key={marker.id}
              onClick={(e) => handleMarkerClick(marker, e)}
              className="absolute transform -translate-x-1/2 -translate-y-full cursor-pointer hover:scale-110 transition-transform"
              style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
            >
              {/* 맵마커 핀 */}
              <div className="relative">
                <div 
                  className="w-8 h-8 rounded-full shadow-lg flex items-center justify-center"
                  style={{ backgroundColor: bgColor }}
                >
                  {isMaintenanceNeeded ? (
                    <Wrench className="w-4 h-4 text-white" />
                  ) : (
                    <Camera className="w-4 h-4 text-white" />
                  )}
                </div>
                {/* 맵마커 꼬리 */}
                <div 
                  className="absolute left-1/2 transform -translate-x-1/2"
                  style={{
                    width: '0',
                    height: '0',
                    borderLeft: '6px solid transparent',
                    borderRight: '6px solid transparent',
                    borderTop: `10px solid ${bgColor}`,
                  }}
                />
              </div>
            </div>
          );
        })}

        {showHelicopters && helicopterLocations.map((heli) => (
          <div 
            key={heli.id} 
            className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform"
            style={{ left: `${heli.x}%`, top: `${heli.y}%` }}
          >
            <div className="w-10 h-10 rounded-full shadow-lg flex items-center justify-center bg-red-500 border-2 border-white">
              <span className="text-white" style={{ fontSize: '16px', fontWeight: 'bold', lineHeight: '1' }}>H</span>
            </div>
          </div>
        ))}

        {showRockfallSensors && rockfallSensors.map((sensor) => (
          <div 
            key={sensor.id} 
            className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform"
            style={{ left: `${sensor.x}%`, top: `${sensor.y}%` }}
          >
            <div className="w-10 h-10 rounded-full shadow-lg flex items-center justify-center bg-amber-800 border-2 border-white">
              <SeismicWaveIcon className="w-5 h-5 text-white" />
            </div>
          </div>
        ))}

        <div className="absolute bottom-6 right-6 flex flex-col gap-1 shadow-lg">
          <button onClick={() => setZoomLevel(prev => Math.min(prev + 1, 18))} className="w-10 h-10 bg-white hover:bg-gray-50 flex items-center justify-center transition-colors" style={{ borderRadius: '0px' }}>
            <Plus className="w-5 h-5 text-gray-700" />
          </button>
          <div className="w-10 h-10 bg-white flex items-center justify-center text-sm text-gray-700" style={{ borderRadius: '0px' }}>
            {zoomLevel}
          </div>
          <button onClick={() => setZoomLevel(prev => Math.max(prev - 1, 8))} className="w-10 h-10 bg-white hover:bg-gray-50 flex items-center justify-center transition-colors" style={{ borderRadius: '0px' }}>
            <Minus className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      </div>

      {selectedCCTV && (
        <div 
          className="fixed bg-white shadow-2xl border-2 border-gray-300 z-50"
          style={{ 
            borderRadius: '0px', 
            left: `${popupPositions.cctv.x}px`, 
            top: `${popupPositions.cctv.y}px`,
            width: '400px'
          }}
        >
          <div 
            className="bg-emerald-600 px-4 py-3 flex items-center justify-between cursor-move"
            style={{ borderRadius: '0px' }}
            onMouseDown={(e) => startDrag('cctv', e)}
          >
            <div className="flex items-center gap-2">
              <Move className="w-4 h-4 text-white" />
              <h3 className="text-white">CCTV 상세 정보</h3>
            </div>
            <button onClick={() => setSelectedCCTV(null)} className="text-white hover:text-gray-200">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4">
            <div className="h-48 bg-gray-200 flex items-center justify-center mb-4" style={{ borderRadius: '0px' }}>
              <Camera className="w-12 h-12 text-gray-400" />
            </div>
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
              <div>
                <p className="text-xs text-gray-500">CCTV ID</p>
                <p className="text-sm text-gray-900">{selectedCCTV.cctv.id}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">상태</p>
                <span className={`inline-block px-2 py-1 text-xs ${selectedCCTV.cctv.status === '정상' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`} style={{ borderRadius: '0px' }}>
                  {selectedCCTV.cctv.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedDetection && (
        <div 
          className="fixed bg-white shadow-2xl border-2 border-gray-300 z-50"
          style={{ 
            borderRadius: '0px', 
            left: `${popupPositions.detection.x}px`, 
            top: `${popupPositions.detection.y}px`,
            width: '500px',
            maxHeight: '600px'
          }}
        >
          <div 
            className="bg-emerald-600 px-4 py-3 flex items-center justify-between cursor-move"
            style={{ borderRadius: '0px' }}
            onMouseDown={(e) => startDrag('detection', e)}
          >
            <div className="flex items-center gap-2">
              <Move className="w-4 h-4 text-white" />
              <h3 className="text-white">탐지 상세 정보</h3>
            </div>
            <button onClick={() => setSelectedDetection(null)} className="text-white hover:text-gray-200">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 max-h-[calc(600px-60px)] overflow-y-auto">
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-1">CCTV ID</p>
              <p className="text-gray-900">{selectedDetection.marker.id}</p>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-1">위치</p>
              <p className="text-gray-900">{selectedDetection.marker.location}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-2">탐지된 사고 ({selectedDetection.incidents.length}건)</p>
              <div className="space-y-2">
                {selectedDetection.incidents.map((incident, index) => (
                  <div key={index} className="p-3 border border-gray-200" style={{ borderRadius: '0px' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs ${getIncidentColor(incident.type)} flex items-center gap-1`} style={{ borderRadius: '0px' }}>
                          {incident.type === 'fire' && <Flame className="w-3 h-3" />}
                          {incident.type === 'rockfall' && <RockIcon className="w-3 h-3" />}
                          {incident.type === 'trash' && <Trash2 className="w-3 h-3" />}
                          {getIncidentLabel(incident.type)}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">{incident.time}</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-700">신뢰도</span>
                      <span className="text-sm text-emerald-600">{incident.confidence}</span>
                    </div>
                    {incident.type === 'fire' && (
                      <button
                        onClick={() => setVideoDetailPopup({
                          cctvId: selectedDetection.marker.id,
                          location: selectedDetection.marker.location,
                          time: incident.time,
                          confidence: incident.confidence
                        })}
                        className="w-full mt-2 px-4 py-2 bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                        style={{ borderRadius: '0px' }}
                      >
                        <Eye className="w-4 h-4" />
                        자세히보기
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedNotification && (
        <div 
          className="fixed bg-white shadow-2xl border-2 border-gray-300"
          style={{ 
            borderRadius: '0px', 
            left: `${popupPositions.notification.x}px`, 
            top: `${popupPositions.notification.y}px`,
            width: '500px',
            zIndex: 300
          }}
        >
          <div 
            className="bg-emerald-600 px-4 py-3 flex items-center justify-between cursor-move"
            style={{ borderRadius: '0px' }}
            onMouseDown={(e) => startDrag('notification', e)}
          >
            <div className="flex items-center gap-2">
              <Move className="w-4 h-4 text-white" />
              <h3 className="text-white">알림 상세 정보</h3>
            </div>
            <button onClick={() => { setSelectedNotification(null); setHighlightedCCTV(null); }} className="text-white hover:text-gray-200">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4">
            <div className="mb-3">
              <p className="text-sm text-gray-500 mb-1">CCTV ID</p>
              <p className="text-gray-900">{selectedNotification.cctvId}</p>
            </div>
            <div className="mb-3">
              <p className="text-sm text-gray-500 mb-1">위치</p>
              <p className="text-gray-900">{selectedNotification.location}</p>
            </div>
            <div className="mb-3">
              <p className="text-sm text-gray-500 mb-1">탐지 유형</p>
              <span className={`inline-block px-2 py-1 text-xs ${getIncidentColor(selectedNotification.type)}`} style={{ borderRadius: '0px' }}>
                {getIncidentLabel(selectedNotification.type)}
              </span>
            </div>
            <div className="mb-3">
              <p className="text-sm text-gray-500 mb-1">발생 시간</p>
              <p className="text-gray-900">{selectedNotification.time}</p>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-1">신뢰도</p>
              <p className="text-emerald-600">{selectedNotification.confidence}</p>
            </div>
            <div className="h-48 bg-gray-200 flex items-center justify-center mb-3" style={{ borderRadius: '0px' }}>
              <Camera className="w-12 h-12 text-gray-400" />
            </div>
            <div className="flex gap-2">
              <button className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2" style={{ borderRadius: '0px' }}>
                <MessageSquare className="w-4 h-4" />
                문자신고
              </button>
              <button className="flex-1 px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2" style={{ borderRadius: '0px' }}>
                <Download className="w-4 h-4" />
                다운로드
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 화재 영상 상세 팝업 */}
      {videoDetailPopup && (
        <div 
          className="fixed bg-white shadow-2xl border-2 border-red-500"
          style={{ 
            borderRadius: '0px', 
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '600px',
            zIndex: 400
          }}
        >
          <div 
            className="bg-red-600 px-4 py-3 flex items-center justify-between"
            style={{ borderRadius: '0px' }}
          >
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-white" />
              <h3 className="text-white">화재 영상 상세보기</h3>
            </div>
            <button onClick={() => setVideoDetailPopup(null)} className="text-white hover:text-gray-200">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6">
            <div className="mb-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">CCTV ID</p>
                  <p className="text-gray-900">{videoDetailPopup.cctvId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">위치</p>
                  <p className="text-gray-900">{videoDetailPopup.location}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">발생시간</p>
                  <p className="text-gray-900">{videoDetailPopup.time}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">신뢰도</p>
                  <p className="text-red-600">{videoDetailPopup.confidence}</p>
                </div>
              </div>
            </div>

            {/* 영상 영역 */}
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-2">감지 영상</p>
              <div className="h-80 bg-gray-900 flex items-center justify-center relative" style={{ borderRadius: '0px' }}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Flame className="w-16 h-16 text-red-500 mx-auto mb-2 animate-pulse" />
                    <p className="text-white text-sm">화재 탐지 영상</p>
                    <p className="text-gray-400 text-xs mt-1">{videoDetailPopup.cctvId} - {videoDetailPopup.time}</p>
                  </div>
                </div>
                <div className="absolute top-2 right-2 px-2 py-1 bg-red-600 text-white text-xs" style={{ borderRadius: '0px' }}>
                  LIVE
                </div>
              </div>
            </div>

            {/* 버튼 영역 */}
            <div className="flex gap-3">
              <button 
                onClick={() => alert('문자신고 기능이 실행됩니다.')}
                className="flex-1 px-4 py-3 bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2" 
                style={{ borderRadius: '0px' }}
              >
                <MessageSquare className="w-5 h-5" />
                문자신고
              </button>
              <button 
                onClick={() => alert('영상 다운로드가 시작됩니다.')}
                className="flex-1 px-4 py-3 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2" 
                style={{ borderRadius: '0px' }}
              >
                <Download className="w-5 h-5" />
                다운로드
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}