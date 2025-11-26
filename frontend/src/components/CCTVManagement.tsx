import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { X, ArrowLeft, Search, ChevronDown, ArrowUpDown, Maximize } from 'lucide-react';

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
  trashType: string;
  accuracy: string;
}

export default function CCTVManagement({ onNavigate, initialSelectedCCTVId }: CCTVManagementProps) {
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
      const location = getLocation(initialSelectedCCTVId);
      setSelectedCCTV({
        id: initialSelectedCCTVId,
        location,
        installDate: '2024-01-15',
        model: 'HD-2000X',
        type: '고정',
      });
    }
  }, [initialSelectedCCTVId]);

  const getLocation = (id: string) => {
    const idNum = parseInt(id.split('-')[1]);
    if (idNum <= 4) return `등산로 ${idNum}`;
    if (idNum <= 9) return `등산로 입구 ${idNum - 4}`;
    if (idNum <= 13) return `휴게소 ${idNum - 9}`;
    return `전망대 ${idNum - 13}`;
  };

  const cctvThumbnails = [
    { id: 'CCTV-001', time: '2025-11-21 14:23', detecting: true },
    { id: 'CCTV-002', time: '2025-11-21 14:20', detecting: false },
    { id: 'CCTV-003', time: '2025-11-21 14:18', detecting: true },
    { id: 'CCTV-004', time: '2025-11-21 14:15', detecting: false },
    { id: 'CCTV-005', time: '2025-11-21 14:12', detecting: true },
    { id: 'CCTV-006', time: '2025-11-21 14:10', detecting: false },
    { id: 'CCTV-007', time: '2025-11-21 14:08', detecting: false },
    { id: 'CCTV-008', time: '2025-11-21 14:05', detecting: true },
    { id: 'CCTV-009', time: '2025-11-21 14:03', detecting: false },
    { id: 'CCTV-010', time: '2025-11-21 14:00', detecting: false },
    { id: 'CCTV-011', time: '2025-11-21 13:58', detecting: true },
    { id: 'CCTV-012', time: '2025-11-21 13:55', detecting: false },
    { id: 'CCTV-013', time: '2025-11-21 13:53', detecting: false },
    { id: 'CCTV-014', time: '2025-11-21 13:50', detecting: true },
    { id: 'CCTV-015', time: '2025-11-21 13:48', detecting: false },
    { id: 'CCTV-016', time: '2025-11-21 13:45', detecting: false },
  ];

  const events: Event[] = [
    { id: '1', time: '2025-11-21 14:23', trashType: '비닐봉투', accuracy: '94%' },
    { id: '2', time: '2025-11-21 13:45', trashType: '플라스틱', accuracy: '89%' },
    { id: '3', time: '2025-11-21 12:30', trashType: '종이', accuracy: '91%' },
  ];

  // CCTV 현황 데이터 (중복 없이 각 CCTV ID별 상태) - 전원 상태가 off이면 상태는 무조건 점검필요
  const cctvStatusDataRaw = [
    { id: 'CCTV-001', location: '등산로 1', status: '정상', power: 'on' as const, lastDetection: '2025-11-21 14:23', detectedIncident: '쓰레기' },
    { id: 'CCTV-002', location: '등산로 2', status: '정상', power: 'on' as const, lastDetection: '2025-11-21 14:20', detectedIncident: '화재' },
    { id: 'CCTV-003', location: '등산로 3', status: '점검필요', power: 'on' as const, lastDetection: '2025-11-21 14:18', detectedIncident: '낙석' },
    { id: 'CCTV-004', location: '등산로 4', status: '정상', power: 'on' as const, lastDetection: '2025-11-21 14:15', detectedIncident: '쓰레기' },
    { id: 'CCTV-005', location: '등산로 입구 1', status: '정상', power: 'on' as const, lastDetection: '2025-11-21 14:12', detectedIncident: '화재' },
    { id: 'CCTV-006', location: '등산로 입구 2', status: '정상', power: 'off' as const, lastDetection: '2025-11-21 14:10', detectedIncident: '쓰레기' },
    { id: 'CCTV-007', location: '등산로 입구 3', status: '정상', power: 'on' as const, lastDetection: '2025-11-21 14:08', detectedIncident: '낙석' },
    { id: 'CCTV-008', location: '등산로 입구 4', status: '점검필요', power: 'on' as const, lastDetection: '2025-11-21 14:05', detectedIncident: '쓰레기' },
    { id: 'CCTV-009', location: '등산로 입구 5', status: '정상', power: 'on' as const, lastDetection: '2025-11-21 14:03', detectedIncident: '화재' },
    { id: 'CCTV-010', location: '휴게소 1', status: '정상', power: 'on' as const, lastDetection: '2025-11-21 14:00', detectedIncident: '낙석' },
    { id: 'CCTV-011', location: '휴게소 2', status: '정상', power: 'off' as const, lastDetection: '2025-11-21 13:58', detectedIncident: '쓰레기' },
    { id: 'CCTV-012', location: '휴게소 3', status: '정상', power: 'on' as const, lastDetection: '2025-11-21 13:55', detectedIncident: '화재' },
    { id: 'CCTV-013', location: '휴게소 4', status: '정상', power: 'on' as const, lastDetection: '2025-11-21 13:53', detectedIncident: '쓰레기' },
    { id: 'CCTV-014', location: '전망대 1', status: '정상', power: 'on' as const, lastDetection: '2025-11-21 13:50', detectedIncident: '낙석' },
    { id: 'CCTV-015', location: '전망대 2', status: '정상', power: 'off' as const, lastDetection: '2025-11-21 13:48', detectedIncident: '화재' },
    { id: 'CCTV-016', location: '전망대 3', status: '점검필요', power: 'on' as const, lastDetection: '2025-11-21 13:45', detectedIncident: '쓰레기' },
  ];

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
        location: getLocation(cctvId),
        installDate: '2024-01-15',
        model: 'HD-2000X',
        type: '고정',
      });
    } else {
      setSelectedCCTV({
        id: cctvId,
        location: getLocation(cctvId),
        installDate: '2024-01-15',
        model: 'HD-2000X',
        type: '고정',
      });
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar onNavigate={onNavigate} currentPath="cctv-management" />
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-8">
          <h1 className="mb-8 text-gray-900">CCTV 관리</h1>

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
                      {/* Detection indicator */}
                      <div className={`absolute top-4 right-4 w-3 h-3 rounded-full ${
                        cctvThumbnails.find(c => c.id === selectedCCTV.id)?.detecting ? 'bg-red-500' : 'bg-green-500'
                      }`}></div>
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
                        {/* Detection indicator */}
                        <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${
                          cctv.detecting ? 'bg-red-500' : 'bg-green-500'
                        }`}></div>
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
                    <button
                      onClick={() => setSelectedCCTV(null)}
                      className="absolute top-4 right-4 text-gray-600 hover:text-gray-900"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-gray-900">최근 탐지 이벤트</h3>
                      <button
                        onClick={() => setShowEvents(false)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="space-y-4">
                      {events.map((event) => (
                        <div
                          key={event.id}
                          onClick={() => setSelectedEvent(event)}
                          className="bg-gray-50 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                          style={{ borderRadius: '0px' }}
                        >
                          <div className="flex gap-4">
                            <div className="w-20 h-20 bg-gray-800 flex items-center justify-center" style={{ borderRadius: '0px' }}>
                              <span className="text-white text-xs">썸네일</span>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-gray-600">탐지 시간: {event.time}</p>
                              <p className="text-sm text-gray-900">쓰레기 종류: {event.trashType}</p>
                              <p className="text-sm text-gray-900">정확도: {event.accuracy}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
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
                                setShowStatusFilter(!showStatusFilter);
                                setShowLocationFilter(false);
                                setShowPowerFilter(false);
                              }}
                              className="flex items-center gap-1 hover:text-gray-900"
                            >
                              상태
                              <ChevronDown className="w-3 h-3" />
                            </button>
                            
                            {showStatusFilter && (
                              <div className="absolute top-full left-0 mt-2 bg-white shadow-xl border border-gray-200 z-20 min-w-[120px]" style={{ borderRadius: '0px' }}>
                                <label className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm">
                                  <input
                                    type="checkbox"
                                    checked={selectedStatuses.includes('정상')}
                                    onChange={() => toggleStatusFilter('정상')}
                                    className="cursor-pointer"
                                  />
                                  <span className="text-gray-900">정상</span>
                                </label>
                                <label className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm">
                                  <input
                                    type="checkbox"
                                    checked={selectedStatuses.includes('점검필요')}
                                    onChange={() => toggleStatusFilter('점검필요')}
                                    className="cursor-pointer"
                                  />
                                  <span className="text-gray-900">점검필요</span>
                                </label>
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
                        <th className="text-left py-3 px-4 text-gray-600">감지사고</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedCCTVData.length > 0 ? (
                        filteredAndSortedCCTVData.map((cctv) => (
                          <tr key={cctv.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 text-gray-900">{cctv.id}</td>
                            <td className="py-3 px-4 text-gray-900">{cctv.location}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 text-xs ${cctv.status === '정상' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                {cctv.status}
                              </span>
                            </td>
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
                          <td colSpan={6} className="py-8 text-center text-gray-500">
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
              <p className="text-gray-600">쓰레기 종류: {selectedEvent.trashType}</p>
              <p className="text-gray-600">정확도: {selectedEvent.accuracy}</p>
            </div>
            <button
              onClick={() => {
                setSelectedEvent(null);
                onNavigate('trash-detection');
              }}
              className="w-full mt-6 px-4 py-3 bg-emerald-600 text-white shadow-md hover:bg-emerald-700 hover:shadow-lg transition-all"
              style={{ borderRadius: '0px' }}
            >
              더보기
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