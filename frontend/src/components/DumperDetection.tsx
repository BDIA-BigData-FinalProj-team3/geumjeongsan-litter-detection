import { useState } from 'react';
import Sidebar from './Sidebar';
import { X, Maximize, Search, ChevronDown } from 'lucide-react';

interface DumperDetectionProps {
  onNavigate: (screen: string) => void;
}

interface Detection {
  id: string;
  time: string;
  cctvId: string;
  accuracy: string;
  trashType: string;
  location: string;
}

interface LogEntry {
  id: string;
  cctvId: string;
  location: string;
  lastDetection: string;
  trashType: string;
  accuracy: string;
}

export default function DumperDetection({ onNavigate }: DumperDetectionProps) {
  // Date range filters
  const [startYear, setStartYear] = useState('2025');
  const [startMonth, setStartMonth] = useState('11');
  const [startDay, setStartDay] = useState('01');
  const [endYear, setEndYear] = useState('2025');
  const [endMonth, setEndMonth] = useState('11');
  const [endDay, setEndDay] = useState('21');
  
  const [selectedLocation, setSelectedLocation] = useState('전체');
  const [selectedCCTVId, setSelectedCCTVId] = useState('전체');
  const [selectedTrashType, setSelectedTrashType] = useState('전체');

  const [selectedDetection, setSelectedDetection] = useState<Detection | null>(null);
  const [showPathModal, setShowPathModal] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [expandedGrid, setExpandedGrid] = useState(false);
  
  // Log filters
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logTrashTypeFilter, setLogTrashTypeFilter] = useState('전체');
  const [logLocationFilter, setLogLocationFilter] = useState('전체');
  const [showTrashTypeFilter, setShowTrashTypeFilter] = useState(false);
  const [showLogLocationFilter, setShowLogLocationFilter] = useState(false);

  // Location to CCTV ID mapping
  const locationCCTVMap: { [key: string]: string[] } = {
    '등산로 1': ['CCTV-001', 'CCTV-002', 'CCTV-003', 'CCTV-004'],
    '등산로 2': ['CCTV-005', 'CCTV-006', 'CCTV-007', 'CCTV-008', 'CCTV-009'],
    '등산로 3': ['CCTV-010', 'CCTV-011', 'CCTV-012', 'CCTV-013', 'CCTV-014', 'CCTV-015'],
    '등산로 입구': ['CCTV-016', 'CCTV-017', 'CCTV-018', 'CCTV-019', 'CCTV-020', 'CCTV-021', 'CCTV-022'],
    '휴게소': ['CCTV-023', 'CCTV-024', 'CCTV-025', 'CCTV-026', 'CCTV-027', 'CCTV-028'],
    '전망대': ['CCTV-029', 'CCTV-030', 'CCTV-031', 'CCTV-032', 'CCTV-033', 'CCTV-034', 'CCTV-035', 'CCTV-036'],
  };

  // All CCTV IDs
  const allCCTVs = Object.values(locationCCTVMap).flat();

  // Get CCTV IDs based on selected location
  const availableCCTVs = selectedLocation === '전체' ? allCCTVs : locationCCTVMap[selectedLocation] || [];

  // Generate days based on month
  const getDaysInMonth = (year: number, month: number) => {
    const days = new Date(year, month, 0).getDate();
    return Array.from({ length: days }, (_, i) => i + 1);
  };

  const startDaysInMonth = getDaysInMonth(parseInt(startYear), parseInt(startMonth));
  const endDaysInMonth = getDaysInMonth(parseInt(endYear), parseInt(endMonth));

  // Generate mock detections for the date range
  const generateDetections = (): Detection[] => {
    const allDetections: Detection[] = [];
    
    // Generate detections for each day in range
    const baseDetections = [
      { id: '1', cctvId: 'CCTV-001', accuracy: '94%', trashType: '비닐봉투', location: '등산로 1', hour: 14, minute: 23 },
      { id: '2', cctvId: 'CCTV-002', accuracy: '89%', trashType: '플라스틱', location: '등산로 1', hour: 13, minute: 45 },
      { id: '3', cctvId: 'CCTV-005', accuracy: '91%', trashType: '종이', location: '등산로 2', hour: 12, minute: 30 },
      { id: '4', cctvId: 'CCTV-010', accuracy: '87%', trashType: '캔', location: '등산로 3', hour: 11, minute: 15 },
      { id: '5', cctvId: 'CCTV-016', accuracy: '92%', trashType: '비닐봉투', location: '등산로 입구', hour: 10, minute: 20 },
      { id: '6', cctvId: 'CCTV-023', accuracy: '88%', trashType: '플라스틱', location: '휴게소', hour: 9, minute: 45 },
      { id: '7', cctvId: 'CCTV-003', accuracy: '90%', trashType: '종이', location: '등산로 1', hour: 15, minute: 10 },
      { id: '8', cctvId: 'CCTV-007', accuracy: '86%', trashType: '캔', location: '등산로 2', hour: 16, minute: 30 },
      { id: '9', cctvId: 'CCTV-012', accuracy: '93%', trashType: '비닐봉투', location: '등산로 3', hour: 8, minute: 15 },
      { id: '10', cctvId: 'CCTV-018', accuracy: '91%', trashType: '플라스틱', location: '등산로 입구', hour: 14, minute: 50 },
      { id: '11', cctvId: 'CCTV-025', accuracy: '89%', trashType: '종이', location: '휴게소', hour: 11, minute: 40 },
      { id: '12', cctvId: 'CCTV-004', accuracy: '95%', trashType: '캔', location: '등산로 1', hour: 13, minute: 20 },
      { id: '13', cctvId: 'CCTV-008', accuracy: '87%', trashType: '비닐봉투', location: '등산로 2', hour: 10, minute: 5 },
      { id: '14', cctvId: 'CCTV-014', accuracy: '92%', trashType: '플라스틱', location: '등산로 3', hour: 15, minute: 35 },
      { id: '15', cctvId: 'CCTV-020', accuracy: '90%', trashType: '종이', location: '등산로 입구', hour: 12, minute: 55 },
      { id: '16', cctvId: 'CCTV-027', accuracy: '88%', trashType: '캔', location: '휴게소', hour: 9, minute: 25 },
    ];

    // Parse date range
    const startDate = new Date(`${startYear}-${startMonth}-${startDay}`);
    const endDate = new Date(`${endYear}-${endMonth}-${endDay}`);
    
    // Generate detections for each day in the date range
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const year = currentDate.getFullYear();
      const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
      const day = currentDate.getDate().toString().padStart(2, '0');
      
      baseDetections.forEach((det, idx) => {
        allDetections.push({
          ...det,
          id: `${year}${month}${day}-${idx}`,
          time: `${year}-${month}-${day} ${det.hour.toString().padStart(2, '0')}:${det.minute.toString().padStart(2, '0')}`,
        });
      });
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    let filtered = allDetections;

    // Filter by location
    if (selectedLocation !== '전체') {
      filtered = filtered.filter(d => d.location === selectedLocation);
    }

    // Filter by CCTV ID
    if (selectedCCTVId !== '전체') {
      filtered = filtered.filter(d => d.cctvId === selectedCCTVId);
    }

    // Filter by trash type
    if (selectedTrashType !== '전체') {
      filtered = filtered.filter(d => d.trashType === selectedTrashType);
    }

    return filtered.slice(0, 32); // Limit to 4x4 grid plus some extras
  };

  const detections = generateDetections();

  // Generate log data with trash types and accuracy
  const generateLogData = (): LogEntry[] => {
    const allLogs: LogEntry[] = [];
    
    // Base log entries to generate
    const baseLogTemplates = [
      { cctvId: 'CCTV-001', location: '등산로 1', trashType: '비닐봉투', accuracy: '94%', hour: 14, minute: 23 },
      { cctvId: 'CCTV-003', location: '등산로 3', trashType: '플라스틱', accuracy: '89%', hour: 14, minute: 15 },
      { cctvId: 'CCTV-002', location: '등산로 2', trashType: '종이', accuracy: '91%', hour: 14, minute: 5 },
      { cctvId: 'CCTV-005', location: '등산로 입구 1', trashType: '캔', accuracy: '87%', hour: 13, minute: 45 },
      { cctvId: 'CCTV-001', location: '등산로 1', trashType: '비닐봉투', accuracy: '92%', hour: 13, minute: 30 },
      { cctvId: 'CCTV-004', location: '등산로 4', trashType: '플라스틱', accuracy: '88%', hour: 13, minute: 15 },
      { cctvId: 'CCTV-006', location: '등산로 입구 2', trashType: '종이', accuracy: '90%', hour: 12, minute: 50 },
      { cctvId: 'CCTV-003', location: '등산로 3', trashType: '캔', accuracy: '86%', hour: 12, minute: 30 },
      { cctvId: 'CCTV-002', location: '등산로 2', trashType: '비닐봉투', accuracy: '93%', hour: 12, minute: 10 },
      { cctvId: 'CCTV-005', location: '등산로 입구 1', trashType: '플라스틱', accuracy: '91%', hour: 11, minute: 45 },
    ];

    // Parse date range
    const startDate = new Date(`${startYear}-${startMonth}-${startDay}`);
    const endDate = new Date(`${endYear}-${endMonth}-${endDay}`);
    
    // Generate logs for each day in the date range
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const year = currentDate.getFullYear();
      const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
      const day = currentDate.getDate().toString().padStart(2, '0');
      
      baseLogTemplates.forEach((log, idx) => {
        allLogs.push({
          id: `${year}${month}${day}-${idx}`,
          cctvId: log.cctvId,
          location: log.location,
          lastDetection: `${year}-${month}-${day} ${log.hour.toString().padStart(2, '0')}:${log.minute.toString().padStart(2, '0')}`,
          trashType: log.trashType,
          accuracy: log.accuracy,
        });
      });
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    let filtered = allLogs;

    // Filter by search query
    if (logSearchQuery) {
      filtered = filtered.filter(log => 
        log.cctvId.toLowerCase().includes(logSearchQuery.toLowerCase())
      );
    }

    // Filter by trash type
    if (logTrashTypeFilter !== '전체') {
      filtered = filtered.filter(log => log.trashType === logTrashTypeFilter);
    }

    // Filter by location
    if (logLocationFilter !== '전체') {
      filtered = filtered.filter(log => log.location.includes(logLocationFilter));
    }

    return filtered;
  };

  const logData = generateLogData();

  const handleLocationChange = (location: string) => {
    setSelectedLocation(location);
    // Only reset CCTV ID if the newly selected location doesn't contain the current CCTV ID
    if (location !== '전체' && selectedCCTVId !== '전체') {
      const cctvList = locationCCTVMap[location] || [];
      if (!cctvList.includes(selectedCCTVId)) {
        setSelectedCCTVId('전체');
      }
    }
  };

  // Determine grid columns based on state
  const gridCols = selectedDetection 
    ? 'grid-cols-2'  // 2 columns when detection is selected
    : expandedGrid 
      ? 'grid-cols-4'  // 4 columns when expanded
      : 'grid-cols-4'; // Default to 4 columns

  // Determine max height based on state
  const maxHeight = selectedDetection 
    ? 'max-h-[700px]'
    : expandedGrid 
      ? 'max-h-[700px]'
      : 'max-h-[400px]'; // Smaller height for 4x2 initial view

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar onNavigate={onNavigate} currentPath="dumper-detection" />
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-8">
          <h1 className="mb-8 text-gray-900">쓰레기 투기자</h1>

          {/* Filter Bar */}
          <div className="bg-white shadow-md p-4 mb-8" style={{ borderRadius: '0px' }}>
            {/* Date Range Row */}
            <div className="mb-2">
              <p className="text-xs text-gray-500 mb-2">시작 연 월 일 ~ 종료 연 월 일</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div>
                  <select 
                    value={startYear}
                    onChange={(e) => setStartYear(e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 focus:border-emerald-500 outline-none" 
                    style={{ borderRadius: '0px' }}
                  >
                    <option value="2021">2021</option>
                    <option value="2022">2022</option>
                    <option value="2023">2023</option>
                    <option value="2024">2024</option>
                    <option value="2025">2025</option>
                  </select>
                </div>

                <div>
                  <select 
                    value={startMonth}
                    onChange={(e) => setStartMonth(e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 focus:border-emerald-500 outline-none" 
                    style={{ borderRadius: '0px' }}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <option key={m} value={m.toString().padStart(2, '0')}>
                        {m}월
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <select 
                    value={startDay}
                    onChange={(e) => setStartDay(e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 focus:border-emerald-500 outline-none" 
                    style={{ borderRadius: '0px' }}
                  >
                    {startDaysInMonth.map(d => (
                      <option key={d} value={d.toString().padStart(2, '0')}>
                        {d}일
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <select 
                    value={endYear}
                    onChange={(e) => setEndYear(e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 focus:border-emerald-500 outline-none" 
                    style={{ borderRadius: '0px' }}
                  >
                    <option value="2021">2021</option>
                    <option value="2022">2022</option>
                    <option value="2023">2023</option>
                    <option value="2024">2024</option>
                    <option value="2025">2025</option>
                  </select>
                </div>

                <div>
                  <select 
                    value={endMonth}
                    onChange={(e) => setEndMonth(e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 focus:border-emerald-500 outline-none" 
                    style={{ borderRadius: '0px' }}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <option key={m} value={m.toString().padStart(2, '0')}>
                        {m}월
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <select 
                    value={endDay}
                    onChange={(e) => setEndDay(e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 focus:border-emerald-500 outline-none" 
                    style={{ borderRadius: '0px' }}
                  >
                    {endDaysInMonth.map(d => (
                      <option key={d} value={d.toString().padStart(2, '0')}>
                        {d}일
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Other Filters Row */}
            <div>
              <p className="text-xs text-gray-500 mb-2">CCTV 위치, CCTV ID, 쓰레기 종류</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <select 
                    value={selectedLocation}
                    onChange={(e) => handleLocationChange(e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 focus:border-emerald-500 outline-none" 
                    style={{ borderRadius: '0px' }}
                  >
                    <option>전체</option>
                    <option>등산로 1</option>
                    <option>등산로 2</option>
                    <option>등산로 3</option>
                    <option>등산로 입구</option>
                    <option>휴게소</option>
                    <option>전망대</option>
                  </select>
                </div>

                <div>
                  <select 
                    value={selectedCCTVId}
                    onChange={(e) => setSelectedCCTVId(e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 focus:border-emerald-500 outline-none" 
                    style={{ borderRadius: '0px' }}
                  >
                    <option>전체</option>
                    {availableCCTVs.map(cctvId => (
                      <option key={cctvId} value={cctvId}>{cctvId}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <select 
                    value={selectedTrashType}
                    onChange={(e) => setSelectedTrashType(e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 focus:border-emerald-500 outline-none" 
                    style={{ borderRadius: '0px' }}
                  >
                    <option>전체</option>
                    <option>비닐봉투</option>
                    <option>플라스틱</option>
                    <option>종이</option>
                    <option>캔</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className={`${selectedDetection ? 'grid grid-cols-1 lg:grid-cols-2 gap-8' : ''} mb-8`}>
            {/* Detection Grid */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-900">탐지 목록</h3>
                {!selectedDetection && (
                  <button
                    onClick={() => setExpandedGrid(!expandedGrid)}
                    className="px-3 py-1 text-xs bg-gray-800 text-white hover:bg-gray-900 transition-colors"
                    style={{ borderRadius: '0px' }}
                  >
                    {expandedGrid ? '축소' : '확장'}
                  </button>
                )}
              </div>
              {detections.length > 0 ? (
                <div className={`grid ${gridCols} gap-4 ${maxHeight} overflow-y-auto pr-2`}>
                  {detections.map((detection) => (
                    <div
                      key={detection.id}
                      onClick={() => setSelectedDetection(detection)}
                      className={`bg-white shadow-md hover:shadow-lg transition-shadow cursor-pointer overflow-hidden ${
                        selectedDetection?.id === detection.id ? 'ring-2 ring-emerald-600' : ''
                      }`}
                      style={{ borderRadius: '0px' }}
                    >
                      <div className="aspect-video bg-gray-800 flex items-center justify-center">
                        <span className="text-white text-sm">썸네일</span>
                      </div>
                      <div className="p-3">
                        <p className="text-xs text-gray-600">{detection.time}</p>
                        <p className="text-sm text-gray-900">{detection.cctvId}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white shadow-md p-12 text-center" style={{ borderRadius: '0px' }}>
                  <p className="text-gray-500">선택한 필터에 해당하는 탐지 결과가 없습니다.</p>
                </div>
              )}
            </div>

            {/* Video Preview - Only shown when detection selected */}
            {selectedDetection && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-900">비디오 미리보기</h3>
                  <button
                    onClick={() => setSelectedDetection(null)}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="bg-white shadow-md p-6" style={{ borderRadius: '0px' }}>
                  <div className="aspect-video bg-gray-800 flex items-center justify-center mb-2" style={{ borderRadius: '0px' }}>
                    <span className="text-white">비디오 플레이어</span>
                  </div>
                  
                  {/* Fullscreen button right below video */}
                  <div className="flex justify-end mb-4">
                    <button
                      onClick={() => setShowFullscreen(true)}
                      className="px-3 py-1 text-xs bg-gray-800 text-white hover:bg-gray-900 transition-colors flex items-center gap-1"
                      style={{ borderRadius: '0px' }}
                    >
                      <Maximize className="w-3 h-3" />
                      전체화면
                    </button>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div>
                      <p className="text-sm text-gray-600">발생시간</p>
                      <p className="text-gray-900">{selectedDetection.time}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">CCTV ID</p>
                      <p className="text-gray-900">{selectedDetection.cctvId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">위치</p>
                      <p className="text-gray-900">{selectedDetection.location}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">정확도</p>
                      <p className="text-gray-900">{selectedDetection.accuracy}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">쓰레기 종류</p>
                      <p className="text-gray-900">{selectedDetection.trashType}</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      className="flex-1 px-4 py-3 bg-emerald-600 text-white shadow-md hover:bg-emerald-700 hover:shadow-lg transition-all"
                      style={{ borderRadius: '0px' }}
                    >
                      다운로드
                    </button>
                    <button
                      onClick={() => setShowPathModal(true)}
                      className="flex-1 px-4 py-3 bg-blue-600 text-white shadow-md hover:bg-blue-700 hover:shadow-lg transition-all"
                      style={{ borderRadius: '0px' }}
                    >
                      경로보기
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Log Table - Only shown when no detection is selected */}
          {!selectedDetection && (
            <div className="bg-white shadow-md" style={{ borderRadius: '0px' }}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-900">탐지 로그</h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="CCTV ID 검색..."
                      value={logSearchQuery}
                      onChange={(e) => setLogSearchQuery(e.target.value)}
                      className="pl-10 pr-3 py-2 text-sm border border-gray-300 focus:border-emerald-500 outline-none"
                      style={{ borderRadius: '0px' }}
                    />
                  </div>
                </div>
                <div className="overflow-x-auto min-h-[280px]">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-gray-600">CCTV ID</th>
                        <th className="text-left py-3 px-4 text-gray-600">
                          <div className="relative inline-block">
                            <button 
                              onClick={() => setShowLogLocationFilter(!showLogLocationFilter)}
                              className="flex items-center gap-1 hover:text-gray-900"
                            >
                              위치
                              <ChevronDown className="w-3 h-3" />
                            </button>
                            
                            {showLogLocationFilter && (
                              <div className="absolute top-full left-0 mt-2 bg-white shadow-xl border border-gray-200 z-20 min-w-[120px]" style={{ borderRadius: '0px' }}>
                                <button
                                  onClick={() => {
                                    setLogLocationFilter('전체');
                                    setShowLogLocationFilter(false);
                                  }}
                                  className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-900"
                                >
                                  전체
                                </button>
                                <button
                                  onClick={() => {
                                    setLogLocationFilter('등산로 1');
                                    setShowLogLocationFilter(false);
                                  }}
                                  className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-900"
                                >
                                  등산로 1
                                </button>
                                <button
                                  onClick={() => {
                                    setLogLocationFilter('등산로 2');
                                    setShowLogLocationFilter(false);
                                  }}
                                  className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-900"
                                >
                                  등산로 2
                                </button>
                                <button
                                  onClick={() => {
                                    setLogLocationFilter('등산로 3');
                                    setShowLogLocationFilter(false);
                                  }}
                                  className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-900"
                                >
                                  등산로 3
                                </button>
                                <button
                                  onClick={() => {
                                    setLogLocationFilter('등산로 입구');
                                    setShowLogLocationFilter(false);
                                  }}
                                  className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-900"
                                >
                                  등산로 입구
                                </button>
                                <button
                                  onClick={() => {
                                    setLogLocationFilter('휴게소');
                                    setShowLogLocationFilter(false);
                                  }}
                                  className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-900"
                                >
                                  휴게소
                                </button>
                                <button
                                  onClick={() => {
                                    setLogLocationFilter('전망대');
                                    setShowLogLocationFilter(false);
                                  }}
                                  className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-900"
                                >
                                  전망대
                                </button>
                              </div>
                            )}
                          </div>
                        </th>
                        <th className="text-left py-3 px-4 text-gray-600">
                          <div className="relative inline-block">
                            <button 
                              onClick={() => setShowTrashTypeFilter(!showTrashTypeFilter)}
                              className="flex items-center gap-1 hover:text-gray-900"
                            >
                              쓰레기 종류
                              <ChevronDown className="w-3 h-3" />
                            </button>
                            
                            {showTrashTypeFilter && (
                              <div className="absolute top-full left-0 mt-2 bg-white shadow-xl border border-gray-200 z-20 min-w-[120px]" style={{ borderRadius: '0px' }}>
                                <button
                                  onClick={() => {
                                    setLogTrashTypeFilter('전체');
                                    setShowTrashTypeFilter(false);
                                  }}
                                  className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-900"
                                >
                                  전체
                                </button>
                                <button
                                  onClick={() => {
                                    setLogTrashTypeFilter('비닐봉투');
                                    setShowTrashTypeFilter(false);
                                  }}
                                  className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-900"
                                >
                                  비닐봉투
                                </button>
                                <button
                                  onClick={() => {
                                    setLogTrashTypeFilter('플라스틱');
                                    setShowTrashTypeFilter(false);
                                  }}
                                  className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-900"
                                >
                                  플라스틱
                                </button>
                                <button
                                  onClick={() => {
                                    setLogTrashTypeFilter('종이');
                                    setShowTrashTypeFilter(false);
                                  }}
                                  className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-900"
                                >
                                  종이
                                </button>
                                <button
                                  onClick={() => {
                                    setLogTrashTypeFilter('캔');
                                    setShowTrashTypeFilter(false);
                                  }}
                                  className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-900"
                                >
                                  캔
                                </button>
                              </div>
                            )}
                          </div>
                        </th>
                        <th className="text-left py-3 px-4 text-gray-600">정확도</th>
                        <th className="text-left py-3 px-4 text-gray-600">최근 감지시간</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logData.length > 0 ? (
                        <>
                          {logData.map((row) => (
                            <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4 text-gray-900">{row.cctvId}</td>
                              <td className="py-3 px-4 text-gray-900">{row.location}</td>
                              <td className="py-3 px-4 text-gray-900">{row.trashType}</td>
                              <td className="py-3 px-4 text-gray-900">{row.accuracy}</td>
                              <td className="py-3 px-4 text-gray-900">{row.lastDetection}</td>
                            </tr>
                          ))}
                          {/* Add empty rows to ensure minimum 5 rows */}
                          {Array.from({ length: Math.max(0, 5 - logData.length) }).map((_, index) => (
                            <tr key={`empty-${index}`} className="border-b border-gray-100">
                              <td className="py-3 px-4">&nbsp;</td>
                              <td className="py-3 px-4">&nbsp;</td>
                              <td className="py-3 px-4">&nbsp;</td>
                              <td className="py-3 px-4">&nbsp;</td>
                              <td className="py-3 px-4">&nbsp;</td>
                            </tr>
                          ))}
                        </>
                      ) : (
                        <>
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-gray-500">
                              검색 결과가 없습니다.
                            </td>
                          </tr>
                          {/* Add empty rows to ensure minimum 5 rows */}
                          {Array.from({ length: 4 }).map((_, index) => (
                            <tr key={`empty-${index}`} className="border-b border-gray-100">
                              <td className="py-3 px-4">&nbsp;</td>
                              <td className="py-3 px-4">&nbsp;</td>
                              <td className="py-3 px-4">&nbsp;</td>
                              <td className="py-3 px-4">&nbsp;</td>
                              <td className="py-3 px-4">&nbsp;</td>
                            </tr>
                          ))}
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Path Modal */}
      {showPathModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowPathModal(false)}>
          <div className="bg-white p-8 shadow-xl max-w-4xl w-full" style={{ borderRadius: '0px' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-gray-900">투기자 이동 경로</h3>
              <button onClick={() => setShowPathModal(false)}>
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>
            <div className="h-96 bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 relative" style={{ borderRadius: '0px' }}>
              {/* Map Grid */}
              <div className="absolute inset-0 opacity-30">
                <div className="absolute top-1/4 left-0 right-0 h-px bg-gray-400"></div>
                <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-400"></div>
                <div className="absolute top-3/4 left-0 right-0 h-px bg-gray-400"></div>
                <div className="absolute left-1/4 top-0 bottom-0 w-px bg-gray-400"></div>
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-400"></div>
                <div className="absolute left-3/4 top-0 bottom-0 w-px bg-gray-400"></div>
              </div>

              {/* Path markers */}
              <div className="absolute w-3 h-3 bg-emerald-500 rounded-full" style={{ top: '30%', left: '25%' }}></div>
              <div className="absolute w-3 h-3 bg-emerald-500 rounded-full" style={{ top: '50%', left: '45%' }}></div>
              <div className="absolute w-3 h-3 bg-red-500 rounded-full" style={{ top: '60%', left: '65%' }}></div>

              {/* Path line */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <path
                  d="M 25% 30% L 45% 50% L 65% 60%"
                  stroke="#10b981"
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray="5,5"
                />
              </svg>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              <p>• 녹색 점: 이동 경로</p>
              <p>• 빨간 점: 투기 발생 지점</p>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Modal */}
      {showFullscreen && selectedDetection && (
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
              <span className="text-white text-xl">전체화면 비디오 플레이어</span>
            </div>
          </div>
          <div className="p-4 bg-gray-900 text-white">
            <p className="text-center">
              {selectedDetection.cctvId} | 위치: {selectedDetection.location} | 시간: {selectedDetection.time}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}