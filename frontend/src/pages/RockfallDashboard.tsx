import React, { useState, useEffect } from 'react';
import { Mountain, AlertTriangle, Clock, MapPin, HelpCircle, Search, ChevronDown, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import HamburgerMenuButton from '../components/HamburgerMenuButton';
import { useNavigate, useLocation } from 'react-router-dom';
import { getActiveRockfalls, getCompletedRockfalls } from '../services/api';

interface RockfallDashboardProps {
  onNavigate?: (screen: string) => void;
}

interface RockfallStats {
  todayCount: number;
  pendingCount: number;
  avgResponseTimeFormatted: string;
  hotspot: string;
}

interface HotspotResponse {
  address?: string;
  cctvCode?: string;
  incidentCount?: number;
}

export default function RockfallDashboard({ onNavigate }: RockfallDashboardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<'active' | 'completed'>('active');
  const [showTooltip, setShowTooltip] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchCode, setSearchCode] = useState('');
  const [highlightedCode, setHighlightedCode] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState<number | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{top: number, left: number} | null>(null);
  
  // 페이지네이션
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 10;
  
  // viewMode 변경 시 페이지 리셋
  useEffect(() => {
    setCurrentPage(0);
  }, [viewMode]);
  
  // 데이터 상태 관리
  const [activeRockfalls, setActiveRockfalls] = useState<any[]>([]);
  const [completedRockfalls, setCompletedRockfalls] = useState<any[]>([]);
  const [stats, setStats] = useState<RockfallStats>({
    todayCount: 0,
    pendingCount: 0,
    avgResponseTimeFormatted: '-',
    hotspot: '-'
  });
  const [hotspots, setHotspots] = useState<HotspotResponse[]>([]);

  // API에서 데이터 로드
  useEffect(() => {
    const loadRockfallData = async () => {
      try {
        const [active, completed] = await Promise.all([
          getActiveRockfalls(),
          getCompletedRockfalls(),
        ]);
        
        setActiveRockfalls(active);
        setCompletedRockfalls(completed);
        
        // Stats 계산
        const today = new Date().toISOString().split('T')[0];
        const todayCount = [...active, ...completed].filter(r => r.time && r.time.startsWith(today)).length;
        const pendingCount = active.filter(r => r.status === '대기중' || r.status === '대응중').length;
        
        // 평균 대응시간 계산 (completed에서)
        const completedWithDuration = completed.filter(r => r.duration);
        let avgResponseTime = 0;
        if (completedWithDuration.length > 0) {
          const totalMinutes = completedWithDuration.reduce((sum, r) => {
            const duration = r.duration || '0분';
            const minutes = parseInt(duration.replace('분', '')) || 0;
            return sum + minutes;
          }, 0);
          avgResponseTime = Math.round(totalMinutes / completedWithDuration.length);
        }
        
        // Hotspot 계산 (가장 많이 발생한 CCTV)
        const cctvCounts: Record<string, number> = {};
        [...active, ...completed].forEach(r => {
          if (r.cctvId) {
            cctvCounts[r.cctvId] = (cctvCounts[r.cctvId] || 0) + 1;
          }
        });
        const topCctv = Object.entries(cctvCounts).sort((a, b) => b[1] - a[1])[0];
        const hotspot = topCctv ? topCctv[0] : '-';
        
        setStats({
          todayCount,
          pendingCount,
          avgResponseTimeFormatted: avgResponseTime > 0 ? `${avgResponseTime}분` : '-',
          hotspot
        });
        
        // Hotspots 설정
        if (topCctv) {
          setHotspots([{
            cctvCode: topCctv[0],
            incidentCount: topCctv[1]
          }]);
        }
        
        console.log('✅ [Rockfall] All data loaded');
      } catch (error) {
        console.error('❌ [Rockfall] Failed to load data:', error);
      }
    };
    
    loadRockfallData();
  }, []);

  // 검색 코드가 있으면 필터링, 없으면 전체 표시
  const filteredRockfalls = highlightedCode 
    ? (viewMode === 'active' ? activeRockfalls : completedRockfalls).filter(r => 
        (r.cctvId && r.cctvId.toUpperCase().includes(highlightedCode.toUpperCase())) ||
        (r.id && r.id.toString() === highlightedCode)
      )
    : (viewMode === 'active' ? activeRockfalls : completedRockfalls);
  
  const rockfalls = filteredRockfalls.length > 0 ? filteredRockfalls : (viewMode === 'active' ? activeRockfalls : completedRockfalls);
  
  // 페이지네이션 적용
  const totalPages = Math.ceil(rockfalls.length / pageSize);
  const paginatedRockfalls = rockfalls.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  const toggleStatus = (id: number, newStatus: string) => {
    setActiveRockfalls(prev => prev.map(item => 
      item.id === id 
        ? { ...item, status: newStatus }
        : item
    ));
    setStatusDropdownOpen(null);
    setDropdownPosition(null);
  };

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === activeRockfalls.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(activeRockfalls.map(r => r.id));
    }
  };

  const handleBatchComplete = () => {
    const now = new Date();
    const responseTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const itemsToComplete = activeRockfalls.filter(r => selectedIds.includes(r.id)).map(r => ({
      ...r,
      status: '처리완료',
      responseTime,
      duration: '20분'
    }));
    
    setCompletedRockfalls(prev => [...itemsToComplete, ...prev]);
    setActiveRockfalls(prev => prev.filter(r => !selectedIds.includes(r.id)));
    setSelectedIds([]);
  };

  // URL 파라미터에서 검색 코드 확인
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    if (code) {
      setSearchCode(code);
      const upperCode = code.toUpperCase();
      setHighlightedCode(upperCode);
      // 해당 코드가 있는지 확인
      const allRockfalls = [...activeRockfalls, ...completedRockfalls];
      const found = allRockfalls.find(r => 
        (r.cctvId && r.cctvId.toUpperCase().includes(upperCode)) ||
        (r.id && r.id.toString() === upperCode)
      );
      if (found) {
        // 해당 사고가 완료된 것인지 확인하여 viewMode 설정
        if (completedRockfalls.find(r => r.id === found.id)) {
          setViewMode('completed');
        } else {
          setViewMode('active');
        }
      }
    }
  }, [location.search, activeRockfalls, completedRockfalls]);

  const handleSearch = (code: string) => {
    setSearchError(null);
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      setHighlightedCode(null);
      return;
    }
    
    const upperCode = trimmedCode.toUpperCase();
    
    // 현재 탭에서 검색
    const allRockfalls = [...activeRockfalls, ...completedRockfalls];
    const found = allRockfalls.find(r => 
      (r.cctvId && r.cctvId.toUpperCase().includes(upperCode)) ||
      (r.id && r.id.toString() === upperCode)
    );
    
    if (found) {
      setHighlightedCode(upperCode);
      if (completedRockfalls.find(r => r.id === found.id)) {
        setViewMode('completed');
      } else {
        setViewMode('active');
      }
    } else {
      // 다른 탭으로 이동
      if (upperCode.startsWith('EMG-')) {
        navigate(`/emergency?code=${upperCode}`);
      } else if (upperCode.startsWith('FIRE-')) {
        navigate(`/fire?code=${upperCode}`);
      } else if (upperCode.startsWith('TRASH-')) {
        navigate(`/trash?code=${upperCode}`);
      } else {
        // 검색 결과 없음
        setHighlightedCode(null);
        setSearchError('검색 결과가 없습니다.');
        setTimeout(() => setSearchError(null), 3000);
      }
    }
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar with smooth slide animation */}
      <div 
        className="fixed top-0 left-0 z-50 h-screen transition-transform duration-300 ease-in-out"
        style={{ 
          width: '317.56px', 
          backgroundColor: '#2B2847',
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)'
        }}
      >
        <Sidebar onNavigate={onNavigate || (() => {})} currentPath="rockfall-dashboard" />
      </div>
      <div className="flex-1 flex flex-col relative bg-white" style={{ marginLeft: sidebarOpen ? '317.56px' : '0px', transition: 'margin-left 0.3s' }}>
        {/* 상단바 */}
        <div className="shadow-md px-6 py-4 flex items-center justify-between border-b border-gray-200" style={{ backgroundColor: '#345eaa' }}>
          <div className="flex items-center gap-3">
            <HamburgerMenuButton onClick={() => setSidebarOpen(!sidebarOpen)} />
            <Mountain className="w-6 h-6 text-gray-200" />
            <h1 className="text-gray-100">낙석 상황 현황</h1>
          </div>
        </div>

        <div className="flex-1">
        <div className="p-6 bg-gray-50 min-h-screen">
          <div className="max-w-7xl mx-auto">
            {/* KPI Cards - 높이 줄임 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-white p-4 shadow-sm border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">당일 발생</span>
                  <Mountain className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-gray-900 text-xl font-semibold">{stats.todayCount}건</div>
              </div>

              <div className="bg-white p-4 shadow-sm border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">대기중</span>
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                </div>
                <div className="text-gray-900 text-xl font-semibold">{stats.pendingCount}건</div>
              </div>

              <div className="bg-white p-4 shadow-sm border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">월 평균 처리 시간</span>
                  <Clock className="w-4 h-4 text-blue-500" />
                </div>
                <div className="text-gray-900 text-xl font-semibold">{stats.avgResponseTimeFormatted}</div>
              </div>

              <div className="bg-white p-4 shadow-sm border border-gray-200 rounded-lg relative">
                <div 
                  className="absolute top-2 right-2"
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                >
                  <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center cursor-help">
                    <HelpCircle className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                  </div>
                  {showTooltip && hotspots.length > 0 && (
                    <div className="absolute right-0 bottom-8 bg-gray-900 text-white text-xs px-3 py-2 shadow-lg max-w-xs" style={{ borderRadius: '4px' }}>
                      <div className="whitespace-nowrap">
                        당월 {hotspots[0].incidentCount}건 발생 지역
                      </div>
                      <div className="absolute -bottom-1 right-2 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">다발구간</span>
                  <MapPin className="w-4 h-4 text-purple-500" />
                </div>
                <div className="text-gray-900 text-xl font-semibold">
                  {hotspots.length > 0 ? (hotspots[0].address || hotspots[0].cctvCode) : stats.hotspot}
                </div>
              </div>
            </div>

            {/* Rockfall List */}
            <div className="bg-white shadow-sm border border-gray-200" style={{ borderRadius: '0px' }}>
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h2 className="text-gray-900">낙석 감지 목록</h2>
                  <span className="text-sm text-gray-600">총 {rockfalls.length}건</span>
                  {viewMode === 'active' && selectedIds.length > 0 && (
                    <button
                      onClick={handleBatchComplete}
                      className="px-4 py-1.5 text-sm bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                      style={{ borderRadius: '0px' }}
                    >
                      일괄처리 ({selectedIds.length})
                    </button>
                  )}
                </div>
                
                {/* Search and Toggle Buttons */}
                <div className="flex items-center gap-2">
                  {/* 신규 기록 등록 버튼 */}
                  <button
                    onClick={() => {
                      // TODO: 신규 낙석 등록 모달 구현
                      alert('신규 낙석 등록 기능은 준비 중입니다.');
                    }}
                    className="px-3 py-1.5 bg-emerald-600 text-white text-sm hover:bg-emerald-700 transition-colors flex items-center gap-1.5"
                    style={{ borderRadius: '0px' }}
                  >
                    <Plus className="w-4 h-4" />
                    신규 낙석 등록
                  </button>

                  <div className="relative">
                    <input
                      type="text"
                      value={searchCode}
                      onChange={(e) => {
                        setSearchCode(e.target.value);
                        setSearchError(null);
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleSearch(searchCode);
                        }
                      }}
                      placeholder="CCTV ID 또는 ID 검색"
                      className={`px-3 py-1.5 pr-8 text-sm border focus:outline-none focus:ring-2 ${
                        searchError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-emerald-500'
                      }`}
                      style={{ borderRadius: '9999px', width: '180px' }}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSearch(searchCode);
                      }}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
                      style={{ borderRadius: '9999px' }}
                    >
                      <Search className="w-4 h-4 text-gray-500" />
                    </button>
                    {searchError && (
                      <div className="absolute top-full left-0 mt-1 text-xs text-red-600 whitespace-nowrap">
                        {searchError}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => { setViewMode('active'); setSelectedIds([]); }}
                    className={`px-4 py-1.5 text-sm transition-colors ${
                      viewMode === 'active'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    style={{ borderRadius: '9999px' }}
                  >
                    진행 중
                  </button>
                  <button
                    onClick={() => { setViewMode('completed'); setSelectedIds([]); }}
                    className={`px-4 py-1.5 text-sm transition-colors ${
                      viewMode === 'completed'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    style={{ borderRadius: '9999px' }}
                  >
                    처리완료
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto overflow-y-visible">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {viewMode === 'active' && (
                        <th className="px-6 py-3 text-center text-gray-600 text-sm w-16">
                          <input 
                            type="checkbox" 
                            checked={selectedIds.length === activeRockfalls.length && activeRockfalls.length > 0}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </th>
                      )}
                      <th className="px-6 py-3 text-left text-gray-600 text-sm">CCTV ID</th>
                      <th className="px-6 py-3 text-left text-gray-600 text-sm">발생시간</th>
                      {viewMode === 'completed' && (
                        <>
                          <th className="px-6 py-3 text-left text-gray-600 text-sm">대응시각</th>
                          <th className="px-6 py-3 text-left text-gray-600 text-sm">소요시간</th>
                        </>
                      )}
                      <th className="px-6 py-3 text-left text-gray-600 text-sm">규모</th>
                      <th className="px-6 py-3 text-left text-gray-600 text-sm">심각도</th>
                      {viewMode === 'active' && (
                        <th className="px-6 py-3 text-left text-gray-600 text-sm">상태</th>
                      )}
                      <th className="px-6 py-3 text-left text-gray-600 text-sm">처리자</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedRockfalls.map((rockfall) => {
                      const isHighlighted = highlightedCode && (
                        (rockfall.cctvId && rockfall.cctvId.toUpperCase().includes(highlightedCode.toUpperCase())) ||
                        (rockfall.id && rockfall.id.toString() === highlightedCode)
                      );
                      return (
                      <tr 
                        key={rockfall.id} 
                        className={`hover:bg-gray-50 ${isHighlighted ? 'bg-yellow-100' : ''}`}
                      >
                        {viewMode === 'active' && (
                          <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="checkbox" 
                              checked={selectedIds.includes(rockfall.id)}
                              onChange={() => toggleSelection(rockfall.id)}
                              className="w-4 h-4 cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="px-6 py-4 text-gray-900">{rockfall.cctvId}</td>
                        <td className="px-6 py-4 text-gray-600 text-sm">{rockfall.time}</td>
                        {viewMode === 'completed' && 'responseTime' in rockfall && (
                          <>
                            <td className="px-6 py-4 text-gray-600 text-sm">{rockfall.responseTime}</td>
                            <td className="px-6 py-4 text-gray-600">{rockfall.duration}</td>
                          </>
                        )}
                        <td className="px-6 py-4 text-gray-600">{rockfall.magnitude || '-'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs ${
                            rockfall.severity === 'high' || rockfall.severity === '상'
                              ? 'bg-red-100 text-red-700' 
                              : rockfall.severity === 'medium' || rockfall.severity === '중'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-blue-100 text-blue-700'
                          }`} style={{ borderRadius: '0px' }}>
                            {rockfall.severity === 'high' ? '상' : rockfall.severity === 'medium' ? '중' : rockfall.severity === 'low' ? '하' : rockfall.severity}
                          </span>
                        </td>
                        {viewMode === 'active' && (
                          <td className="px-6 py-4 overflow-visible" onClick={(e) => e.stopPropagation()}>
                            <div className="relative inline-block">
                              <button 
                                onClick={(e) => {
                                  if (statusDropdownOpen === rockfall.id) {
                                    setStatusDropdownOpen(null);
                                    setDropdownPosition(null);
                                  } else {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setDropdownPosition({
                                      top: rect.bottom + window.scrollY,
                                      left: rect.left + window.scrollX
                                    });
                                    setStatusDropdownOpen(rockfall.id);
                                  }
                                }}
                                className={`px-3 py-1.5 text-xs cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-2 ${
                                  rockfall.status === '대기중' 
                                    ? 'bg-orange-100 text-orange-700' 
                                    : rockfall.status === '대응중'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`} 
                                style={{ borderRadius: '0px', minWidth: '90px' }}
                              >
                                <span>{rockfall.status}</span>
                                <ChevronDown className="w-3.5 h-3.5 ml-auto" />
                              </button>
                              {statusDropdownOpen === rockfall.id && dropdownPosition && (
                                <div 
                                  className="fixed bg-white shadow-lg border border-gray-200 min-w-[100px]" 
                                  style={{ 
                                    borderRadius: '0px',
                                    top: `${dropdownPosition.top + 4}px`,
                                    left: `${dropdownPosition.left}px`,
                                    zIndex: 9999
                                  }}
                                >
                                  {rockfall.status !== '대기중' && (
                                  <button
                                      onClick={() => toggleStatus(rockfall.id, '대기중')}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-orange-50 text-gray-700"
                                  >
                                    대기중
                                  </button>
                                  )}
                                  {rockfall.status !== '대응중' && (
                                  <button
                                      onClick={() => toggleStatus(rockfall.id, '대응중')}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-green-50 text-gray-700"
                                  >
                                    대응중
                                  </button>
                                  )}
                                  {rockfall.status !== '처리완료' && (
                                    <button
                                      onClick={() => {
                                        const now = new Date();
                                        const responseTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                                        const itemToComplete = {
                                          ...rockfall,
                                          status: '처리완료',
                                          responseTime,
                                          duration: '20분'
                                        };
                                        setCompletedRockfalls(prev => [itemToComplete, ...prev]);
                                        setActiveRockfalls(prev => prev.filter(r => r.id !== rockfall.id));
                                        setStatusDropdownOpen(null);
                                        setDropdownPosition(null);
                                      }}
                                      className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 text-gray-700"
                                    >
                                      처리완료
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        )}
                        <td className="px-6 py-4 text-gray-600">{rockfall.handler || '-'}</td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* 페이지네이션 UI - 2페이지 이상일 때만 표시 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-end gap-4 px-6 py-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    {currentPage + 1} / {totalPages} 페이지
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(0)}
                      disabled={currentPage === 0}
                      className={`px-3 py-1 text-sm border ${
                        currentPage === 0
                          ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                      style={{ borderRadius: '0px' }}
                    >
                      처음
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                      disabled={currentPage === 0}
                      className={`px-3 py-1 text-sm border ${
                        currentPage === 0
                          ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                      style={{ borderRadius: '0px' }}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={currentPage === totalPages - 1}
                      className={`px-3 py-1 text-sm border ${
                        currentPage === totalPages - 1
                          ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                      style={{ borderRadius: '0px' }}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages - 1)}
                      disabled={currentPage === totalPages - 1}
                      className={`px-3 py-1 text-sm border ${
                        currentPage === totalPages - 1
                          ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                      style={{ borderRadius: '0px' }}
                    >
                      마지막
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
