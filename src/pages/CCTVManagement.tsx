import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import HamburgerMenuButton from '../components/HamburgerMenuButton';
import { X, ArrowLeft, Search, ChevronDown, ArrowUpDown, Maximize, Camera, Flame, Trash2, AlertCircle, Download } from 'lucide-react';
import { useIncidentCount } from '../contexts/IncidentCountContext';
import { cctvList, getCCTVLocation, getOffCCTVCodes, getCCTVByCode } from '../services/common';
import { getCCTVList } from '../services/api';

interface CCTVManagementProps {
  onNavigate: (screen: string) => void;
  initialSelectedCCTVId?: string | null;
}

interface CCTVData {
  id: string;
  location: string;
  installDate: string;
  model: string;
  type: string;
}

interface Event {
  id: string;
  time: string;
  type: 'fire' | 'emergency' | 'trash';
  confidence: string;
  location: string;
}

export default function CCTVManagement({ onNavigate, initialSelectedCCTVId }: CCTVManagementProps) {
  const { allNotifications } = useIncidentCount();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedCCTV, setSelectedCCTV] = useState<CCTVData | null>(null);
  const [showEvents, setShowEvents] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'id' | 'location' | 'status' | 'power'>('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [expandedGrid, setExpandedGrid] = useState(false);
  const [expandedStatusTable, setExpandedStatusTable] = useState(false);
  
  // Filter dropdowns
  const [showLocationFilter, setShowLocationFilter] = useState(false);
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [showPowerFilter, setShowPowerFilter] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedPowers, setSelectedPowers] = useState<string[]>([]);

  // Set initial selected CCTV if provided
  useEffect(() => {
    if (initialSelectedCCTVId) {
      const location = getCCTVLocation(initialSelectedCCTVId);
      setSelectedCCTV({
        id: initialSelectedCCTVId,
        location,
        installDate: '2024-01-15',
        model: 'HD-2000X',
        type: '고정',
      });
    }
  }, [initialSelectedCCTVId]);

  // Load CCTV list from backend
  const [backendCCTVs, setBackendCCTVs] = useState<any[]>([]);
  useEffect(() => {
    const loadCCTVs = async () => {
      const cctvs = await getCCTVList();
      setBackendCCTVs(cctvs);
    };
    loadCCTVs();
  }, []);

  // Generate CCTV thumbnails based on backend cctvList (extendable to 100)
  const cctvThumbnails = Array.from({ length: 100 }, (_, i) => {
    const id = `CCTV-${String(i + 1).padStart(3, '0')}`;
    const cctv = backendCCTVs.find(c => c.cctvCode === id) || getCCTVByCode(id);
    const hour = 14 - Math.floor(i / 20);
    const minute = 60 - ((i % 20) * 3);
    const time = `2025-11-21 ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    // 알림이 있는 CCTV는 detecting true
    const detecting = allNotifications.some(n => n.cctvId === id);
    return { id, time, detecting, power: cctv?.powerStatus || 'on' };
  });

  // 선택된 CCTV의 이벤트 목록 가져오기
  const getEventsForCCTV = (cctvId: string): Event[] => {
    return allNotifications
      .filter(notification => notification.cctvId === cctvId)
      .map(notification => ({
        id: notification.id,
        time: notification.time,
        type: notification.type,
        confidence: notification.confidence,
        location: notification.location
      }));
  };

  const events = selectedCCTV ? getEventsForCCTV(selectedCCTV.id) : [];

  // CCTV 현황 데이터 (backend cctvList 기반으로 생성)
  const cctvStatusDataRaw = Array.from({ length: 100 }, (_, i) => {
    const id = `CCTV-${String(i + 1).padStart(3, '0')}`;
    const cctv = backendCCTVs.find(c => c.cctvCode === id) || getCCTVByCode(id);
    const location = cctv ? cctv.locationDesc : getCCTVLocation(id);
    
    // 알림이 있는 CCTV 찾기
    const hasNotification = allNotifications.some(n => n.cctvId === id);
    const notificationType = allNotifications.find(n => n.cctvId === id)?.type;
    const detectedIncident = notificationType === 'fire' ? '화재' : notificationType === 'emergency' ? '응급' : notificationType === 'trash' ? '쓰레기' : '-';
    
    // cctvList에서 power 상태 가져오기, 없으면 기본값은 'on' (단, offCCTVs 목록에 있으면 'off')
    const offCCTVsList = getOffCCTVCodes();
    const power = cctv ? cctv.powerStatus : (offCCTVsList.includes(id) ? 'off' as const : 'on' as const);
    const status = power === 'off' ? '점검필요' : '정상';
    
    const hour = 14 - Math.floor(i / 20);
    const minute = 60 - ((i % 20) * 3);
    const lastDetection = hasNotification 
      ? allNotifications.find(n => n.cctvId === id)?.time || `2025-11-25 ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
      : `2025-11-25 ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    
    return { id, location, status, power, lastDetection, detectedIncident };
  });

  // Apply rule: if power is off, status must be '점검필요'
  const cctvStatusData = cctvStatusDataRaw.map(cctv => ({
    ...cctv,
    status: cctv.power === 'off' ? '점검필요' : cctv.status
  }));

  // Get unique locations
  const uniqueLocations = Array.from(new Set(cctvStatusData.map(c => c.location)));

  // Toggle location filter
  const toggleLocationFilter = (location: string) => {
    setSelectedLocations(prev => 
      prev.includes(location) 
        ? prev.filter(l => l !== location)
        : [...prev, location]
    );
  };

  // Toggle status filter
  const toggleStatusFilter = (status: string) => {
    setSelectedStatuses(prev => 
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  // Toggle power filter
  const togglePowerFilter = (power: string) => {
    setSelectedPowers(prev => 
      prev.includes(power)
        ? prev.filter(p => p !== power)
        : [...prev, power]
    );
  };

  // Filter and sort CCTV status data
  const getFilteredAndSortedCCTVData = () => {
    let filtered = cctvStatusData;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(cctv => 
        cctv.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Location filter
    if (selectedLocations.length > 0) {
      filtered = filtered.filter(cctv => selectedLocations.includes(cctv.location));
    }

    // Status filter
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter(cctv => selectedStatuses.includes(cctv.status));
    }

    // Power filter
    if (selectedPowers.length > 0) {
      filtered = filtered.filter(cctv => selectedPowers.includes(cctv.power));
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let aValue: string | number = '';
      let bValue: string | number = '';

      if (sortBy === 'id') {
        aValue = a.id;
        bValue = b.id;
      } else if (sortBy === 'location') {
        aValue = a.location;
        bValue = b.location;
      } else if (sortBy === 'status') {
        aValue = a.status;
        bValue = b.status;
      } else if (sortBy === 'power') {
        aValue = a.power;
        bValue = b.power;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return sorted;
  };

  const filteredAndSortedCCTVData = getFilteredAndSortedCCTVData();

  const handleSort = (column: 'id' | 'location' | 'status' | 'power') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const logData = [
    { id: 'CCTV-001', location: '등산로 1', status: '정상', lastDetection: '2025-11-21 14:23', connection: '연결됨' },
    { id: 'CCTV-003', location: '등산로 3', status: '점검필요', lastDetection: '2025-11-21 14:15', connection: '연결됨' },
    { id: 'CCTV-002', location: '등산로 2', status: '정상', lastDetection: '2025-11-21 14:05', connection: '연결됨' },
    { id: 'CCTV-005', location: '등산로 입구 1', status: '정상', lastDetection: '2025-11-21 13:45', connection: '연결됨' },
    { id: 'CCTV-001', location: '등산로 1', status: '정상', lastDetection: '2025-11-21 13:30', connection: '연결됨' },
    { id: 'CCTV-004', location: '등산로 4', status: '정상', lastDetection: '2025-11-21 13:15', connection: '연결됨' },
    { id: 'CCTV-006', location: '등산로 입구 2', status: '정상', lastDetection: '2025-11-21 12:50', connection: '연결됨' },
    { id: 'CCTV-003', location: '등산로 3', status: '점검필요', lastDetection: '2025-11-21 12:30', connection: '연결됨' },
    { id: 'CCTV-002', location: '등산로 2', status: '정상', lastDetection: '2025-11-21 12:10', connection: '연결됨' },
    { id: 'CCTV-005', location: '등산로 입구 1', status: '정상', lastDetection: '2025-11-21 11:45', connection: '연결됨' },
    { id: 'CCTV-001', location: '등산로 1', status: '정상', lastDetection: '2025-11-21 11:20', connection: '연결됨' },
    { id: 'CCTV-004', location: '등산로 4', status: '정상', lastDetection: '2025-11-21 10:55', connection: '연결됨' },
    { id: 'CCTV-003', location: '등산로 3', status: '점검필요', lastDetection: '2025-11-21 10:30', connection: '연결됨' },
    { id: 'CCTV-006', location: '등산로 입구 2', status: '정상', lastDetection: '2025-11-21 10:10', connection: '연결됨' },
    { id: 'CCTV-002', location: '등산로 2', status: '정상', lastDetection: '2025-11-21 09:45', connection: '연결됨' },
    { id: 'CCTV-005', location: '등산로 입구 1', status: '정상', lastDetection: '2025-11-21 09:20', connection: '연결됨' },
    { id: 'CCTV-001', location: '등산로 1', status: '정상', lastDetection: '2025-11-21 08:50', connection: '연결됨' },
    { id: 'CCTV-004', location: '등산로 4', status: '정상', lastDetection: '2025-11-21 08:25', connection: '연결됨' },
    { id: 'CCTV-003', location: '등산로 3', status: '점검필요', lastDetection: '2025-11-21 08:00', connection: '연결됨' },
    { id: 'CCTV-006', location: '등산로 입구 2', status: '정상', lastDetection: '2025-11-21 07:35', connection: '연결됨' },
    { id: 'CCTV-002', location: '등산로 2', status: '정상', lastDetection: '2025-11-21 07:10', connection: '연결됨' },
    { id: 'CCTV-005', location: '등산로 입구 1', status: '정상', lastDetection: '2025-11-21 06:45', connection: '연결됨' },
    { id: 'CCTV-001', location: '등산로 1', status: '정상', lastDetection: '2025-11-21 06:20', connection: '연결됨' },
    { id: 'CCTV-004', location: '등산로 4', status: '정상', lastDetection: '2025-11-21 05:55', connection: '연결됨' },
  ];

  // Filter log data based on selected CCTV
  const filteredLogData = selectedCCTV ? logData.filter(log => log.id === selectedCCTV.id) : logData;

  const handleCCTVClick = (cctvId: string) => {
    if (selectedCCTV) {
      // If already selected, just update selection
      setSelectedCCTV({
        id: cctvId,
        location: getCCTVLocation(cctvId),
        installDate: '2024-01-15',
        model: 'HD-2000X',
        type: '고정',
      });
    } else {
      setSelectedCCTV({
        id: cctvId,
        location: getCCTVLocation(cctvId),
        installDate: '2024-01-15',
        model: 'HD-2000X',
        type: '고정',
      });
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar with smooth slide animation */}
      <div 
        className="fixed top-0 left-0 z-50 h-screen transition-transform duration-300 ease-in-out"
        style={{ 
          width: '317.56px', 
          backgroundColor: '#2B2847',
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)'
        }}
      >
        <Sidebar onNavigate={onNavigate} currentPath="cctv-management" />
      </div>
      
      <div className="flex-1 flex flex-col relative bg-gray-50" style={{ marginLeft: sidebarOpen ? '317.56px' : '0px', transition: 'margin-left 0.3s' }}>
        {/* 상단바 */}
        <div className="shadow-md px-6 py-4 flex items-center justify-between border-b border-gray-200" style={{ backgroundColor: '#345eaa' }}>
          <div className="flex items-center gap-3">
            <HamburgerMenuButton onClick={() => setSidebarOpen(!sidebarOpen)} />
            <Camera className="w-6 h-6 text-gray-200" />
            <h1 className="text-gray-100">CCTV 관리</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className={`${selectedCCTV ? 'grid grid-cols-1 lg:grid-cols-2 gap-8' : ''} mb-8`}>
            {/* Left: CCTV Display Area */}
            <div className={selectedCCTV ? '' : 'mb-8'}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-900">실시간 CCTV</h3>
                {!selectedCCTV && (
                  <button
                    onClick={() => setExpandedGrid(!expandedGrid)}
                    className="px-3 py-1 text-xs bg-gray-800 text-white hover:bg-gray-900 transition-colors"
                    style={{ borderRadius: '0px' }}
                  >
                    {expandedGrid ? '축소' : '확장'}
                  </button>
                )}
              </div>
              
              {selectedCCTV ? (
                /* Selected CCTV - Large view with fullscreen button */
                <div className="space-y-4">
                  {/* Large CCTV Display */}
                  <div className="bg-white shadow-md" style={{ borderRadius: '0px' }}>
                    <div className="aspect-video bg-gray-800 flex items-center justify-center relative">
                      <span className="text-white">{selectedCCTV.id} - Live Feed</span>
                      {/* Power status indicator */}
                      <div className={`absolute top-4 right-4 w-4 h-4 rounded-full ${
                        cctvStatusData.find(c => c.id === selectedCCTV.id)?.power === 'on' ? 'bg-red-500' : 'bg-gray-400'
                      }`} style={{ border: '2px solid white' }}></div>
                    </div>
                    <div className="p-4">
                      <p className="text-gray-900">{selectedCCTV.id}</p>
                      <p className="text-sm text-gray-600">{selectedCCTV.location}</p>
                    </div>
                  </div>
                  
                  {/* Fullscreen Button */}
                  <button
                    onClick={() => setShowFullscreen(true)}
                    className="w-full px-4 py-3 bg-gray-800 text-white shadow-md hover:bg-gray-900 hover:shadow-lg transition-all flex items-center justify-center gap-2"
                    style={{ borderRadius: '0px' }}
                  >
                    <Maximize className="w-5 h-5" />
                    전체화면 모드
                  </button>
                </div>
              ) : (
                /* Grid view - all CCTVs */
                <div className={`grid grid-cols-4 gap-4 ${expandedGrid ? 'max-h-[700px]' : 'max-h-[360px]'} overflow-y-auto pr-2`}>
                  {cctvThumbnails.map((cctv) => (
                    <div
                      key={cctv.id}
                      onClick={() => handleCCTVClick(cctv.id)}
                      className="bg-white shadow-md hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
                      style={{ borderRadius: '0px' }}
                    >
                      <div className="aspect-video bg-gray-800 flex items-center justify-center relative">
                        <span className="text-white text-sm">{cctv.id}</span>
                        {/* Power status indicator */}
                        <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${
                          cctvStatusData.find(c => c.id === cctv.id)?.power === 'on' ? 'bg-red-500' : 'bg-gray-400'
                        }`} style={{ border: '1px solid white' }}></div>
                      </div>
                      <div className="p-3">
                        <p className="text-xs text-gray-600">발생시간: {cctv.time}</p>
                        <p className="text-sm text-gray-900">CCTV ID: {cctv.id}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Detail Panel (only when CCTV is selected) */}
            {selectedCCTV && (
              <div>
                {!showEvents ? (
                  <div className="bg-white shadow-md p-6 relative" style={{ borderRadius: '0px' }}>
                    <button
                      onClick={() => setSelectedCCTV(null)}
                      className="absolute top-4 right-4 text-gray-600 hover:text-gray-900"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <h3 className="mb-4 text-gray-900">CCTV 상세정보</h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600">CCTV ID</p>
                        <p className="text-gray-900">{selectedCCTV?.id}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">위치</p>
                        <p className="text-gray-900">{selectedCCTV?.location}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">설치 날짜</p>
                        <p className="text-gray-900">{selectedCCTV?.installDate}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">모델명</p>
                        <p className="text-gray-900">{selectedCCTV?.model}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">고정/회전 여부</p>
                        <p className="text-gray-900">{selectedCCTV?.type}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">기타 정보</p>
                        <p className="text-gray-900">정상 작동 중</p>
                      </div>
                    </div>

                    <button
                      onClick={() => setShowEvents(true)}
                      className="w-full mt-6 px-4 py-3 bg-emerald-600 text-white shadow-md hover:bg-emerald-700 hover:shadow-lg transition-all"
                      style={{ borderRadius: '0px' }}
                    >
                      이벤트 보기
                    </button>
                  </div>
                ) : (
                  <div className="bg-white shadow-md p-6 relative" style={{ borderRadius: '0px' }}>
                    <div className="absolute top-4 right-4 flex items-center gap-2">
                      <button
                        onClick={() => setShowEvents(false)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        <ArrowLeft className="w-6 h-6" />
                      </button>
                      <button
                        onClick={() => setSelectedCCTV(null)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                    <div className="mb-4">
                      <h3 className="text-gray-900">탐지 이벤트</h3>
                    </div>
                    {events.length > 0 ? (
                      <div className="space-y-4">
                        {events.map((event) => {
                          const eventIcon = event.type === 'fire' ? Flame : event.type === 'emergency' ? AlertCircle : Trash2;
                          const eventColor = event.type === 'fire' ? 'text-red-500' : event.type === 'emergency' ? 'text-purple-500' : 'text-green-500';
                          const eventBg = event.type === 'fire' ? 'bg-red-50' : event.type === 'emergency' ? 'bg-purple-50' : 'bg-green-50';
                          const eventLabel = event.type === 'fire' ? '화재' : event.type === 'emergency' ? '응급' : '쓰레기 투기';
                          const EventIcon = eventIcon;
                          
                          return (
                            <div
                              key={event.id}
                              onClick={() => setSelectedEvent(event)}
                              className={`${eventBg} p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer border-l-4 ${event.type === 'fire' ? 'border-red-500' : event.type === 'emergency' ? 'border-purple-500' : 'border-green-500'}`}
                              style={{ borderRadius: '0px' }}
                            >
                              <div className="flex gap-4 items-center">
                                <div className={`w-12 h-12 ${eventBg} flex items-center justify-center`} style={{ borderRadius: '0px' }}>
                                  <EventIcon className={`w-6 h-6 ${eventColor}`} />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-sm font-semibold ${eventColor}`}>{eventLabel}</span>
                                  </div>
                                  <p className="text-sm text-gray-600">탐지 시간: {event.time}</p>
                                  <p className="text-sm text-gray-600">위치: {event.location}</p>
                                  <p className="text-sm text-gray-900">정확도: {event.confidence}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-12">
                        <p className="text-gray-500 text-center">탐지 이벤트 없음</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CCTV 현황 Table - Hide when CCTV is expanded */}
          {!selectedCCTV && (
            <div className="bg-white shadow-md mb-8" style={{ borderRadius: '0px' }}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-900">CCTV 현황</h3>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setExpandedStatusTable(!expandedStatusTable)}
                      className="px-3 py-1 text-xs bg-gray-800 text-white hover:bg-gray-900 transition-colors"
                      style={{ borderRadius: '0px' }}
                    >
                      {expandedStatusTable ? '축소' : '확장'}
                    </button>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="CCTV ID 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-3 py-2 text-sm border border-gray-300 focus:border-emerald-500 outline-none"
                        style={{ borderRadius: '0px' }}
                      />
                    </div>
                  </div>
                </div>
                
                <div className={`overflow-x-auto ${expandedStatusTable ? 'max-h-[600px]' : 'max-h-[300px]'} overflow-y-auto`}>
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-gray-600">
                          <button 
                            onClick={() => handleSort('id')}
                            className="flex items-center gap-1 hover:text-gray-900"
                          >
                            CCTV ID
                            <ArrowUpDown className="w-3 h-3" />
                          </button>
                        </th>
                        <th className="text-left py-3 px-4 text-gray-600">
                          <div className="relative">
                            <button 
                              onClick={() => {
                                setShowLocationFilter(!showLocationFilter);
                                setShowStatusFilter(false);
                                setShowPowerFilter(false);
                              }}
                              className="flex items-center gap-1 hover:text-gray-900"
                            >
                              위치
                              <ChevronDown className="w-3 h-3" />
                            </button>
                            
                            {showLocationFilter && (
                              <div className="absolute top-full left-0 mt-2 bg-white shadow-xl border border-gray-200 z-20 min-w-[150px] max-h-[160px] overflow-y-auto" style={{ borderRadius: '0px' }}>
                                {uniqueLocations.map(location => (
                                  <label 
                                    key={location}
                                    className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedLocations.includes(location)}
                                      onChange={() => toggleLocationFilter(location)}
                                      className="cursor-pointer"
                                    />
                                    <span className="text-gray-900">{location}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        </th>
                        <th className="text-left py-3 px-4 text-gray-600">
                          <div className="relative">
                            <button 
                              onClick={() => {
                                setShowPowerFilter(!showPowerFilter);
                                setShowLocationFilter(false);
                                setShowStatusFilter(false);
                              }}
                              className="flex items-center gap-1 hover:text-gray-900"
                            >
                              전원 상태
                              <ChevronDown className="w-3 h-3" />
                            </button>
                            
                            {showPowerFilter && (
                              <div className="absolute top-full left-0 mt-2 bg-white shadow-xl border border-gray-200 z-20 min-w-[100px]" style={{ borderRadius: '0px' }}>
                                <label className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm">
                                  <input
                                    type="checkbox"
                                    checked={selectedPowers.includes('on')}
                                    onChange={() => togglePowerFilter('on')}
                                    className="cursor-pointer"
                                  />
                                  <span className="text-gray-900">on</span>
                                </label>
                                <label className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm">
                                  <input
                                    type="checkbox"
                                    checked={selectedPowers.includes('off')}
                                    onChange={() => togglePowerFilter('off')}
                                    className="cursor-pointer"
                                  />
                                  <span className="text-gray-900">off</span>
                                </label>
                              </div>
                            )}
                          </div>
                        </th>
                        <th className="text-left py-3 px-4 text-gray-600">최근 감지시간</th>
                        <th className="text-left py-3 px-4 text-gray-600">탐지 이벤트</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedCCTVData.length > 0 ? (
                        filteredAndSortedCCTVData.map((cctv) => (
                          <tr key={cctv.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 text-gray-900">{cctv.id}</td>
                            <td className="py-3 px-4 text-gray-900">{cctv.location}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 text-xs ${cctv.power === 'on' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {cctv.power}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-900">{cctv.lastDetection}</td>
                            <td className="py-3 px-4 text-gray-900">{cctv.detectedIncident}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-500">
                            검색 결과가 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
        </div>

      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedEvent(null)}>
          <div className="bg-white p-8 shadow-xl max-w-2xl w-full" style={{ borderRadius: '0px' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-gray-900">이벤트 상세</h3>
              <button onClick={() => setSelectedEvent(null)}>
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>
            <div className="aspect-video bg-gray-800 flex items-center justify-center mb-4" style={{ borderRadius: '0px' }}>
              <span className="text-white">비디오 플레이어</span>
            </div>
            <div className="space-y-2">
              <p className="text-gray-600">탐지 시간: {selectedEvent.time}</p>
              <p className="text-gray-600">유형: {selectedEvent.type === 'fire' ? '화재' : selectedEvent.type === 'emergency' ? '응급' : '쓰레기 투기'}</p>
              <p className="text-gray-600">위치: {selectedEvent.location}</p>
              <p className="text-gray-600">정확도: {selectedEvent.confidence}</p>
            </div>
            <button
              onClick={() => {
                // 이벤트 영상 다운로드 기능 (향후 구현)
                alert(`${selectedEvent.type === 'fire' ? '화재' : selectedEvent.type === 'emergency' ? '응급' : '쓰레기'} 이벤트 영상을 다운로드합니다.`);
              }}
              className="w-full mt-6 px-4 py-3 bg-emerald-600 text-white shadow-md hover:bg-emerald-700 hover:shadow-lg transition-all flex items-center justify-center gap-2"
              style={{ borderRadius: '0px' }}
            >
              <Download className="w-5 h-5" />
              다운로드
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen Modal */}
      {showFullscreen && selectedCCTV && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={() => setShowFullscreen(false)}
              className="p-2 bg-white bg-opacity-20 text-white hover:bg-opacity-30 transition-colors"
              style={{ borderRadius: '0px' }}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="w-full h-full bg-gray-900 flex items-center justify-center relative" style={{ borderRadius: '0px' }}>
              <span className="text-white text-xl">{selectedCCTV.id} - 전체화면 라이브 피드</span>
              {/* Detection indicator */}
              <div className={`absolute top-6 right-6 w-4 h-4 rounded-full ${
                cctvThumbnails.find(c => c.id === selectedCCTV.id)?.detecting ? 'bg-red-500' : 'bg-green-500'
              }`}></div>
            </div>
          </div>
          <div className="p-4 bg-gray-900 text-white">
            <p className="text-center">위치: {selectedCCTV.location} | 상태: 정상 작동 중</p>
          </div>
        </div>
      )}
    </div>
  );
}