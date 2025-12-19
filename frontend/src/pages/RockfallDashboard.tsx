import React, { useState, useEffect, useRef } from 'react';
import { Mountain, AlertTriangle, Clock, MapPin, HelpCircle, Search, ChevronDown, ChevronLeft, ChevronRight, Plus, X, ImageIcon, Video, Edit2 } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import HamburgerMenuButton from '../components/HamburgerMenuButton';
import IncidentDetailModal from '../components/IncidentDetailModal';
import AssigneeSelectModal from '../components/AssigneeSelectModal';
import { useNavigate, useLocation } from 'react-router-dom';
import { useRealtimeNotification } from '../contexts/RealtimeNotificationContext';
import { getActiveRockfalls, getCompletedRockfalls, getRockfallStats, getRockfallHotspots, createRockfall, updateRockfallStatus, getAllIncidentDetail, getRockfallDetail, updateRockfallDetail, type RockfallStatsResponse, type HotspotResponse } from '../services/api';
import { getCurrentUser } from '../services/auth';
import { localDateTimeToKstIso, nowKstDateTimeLocal } from '../utils/time';

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
  const { refreshKey } = useRealtimeNotification();
  
  // 반응형: 화면 크기 감지
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  
  // 화면 크기 변경 감지
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [viewMode, setViewMode] = useState<'active' | 'completed'>('active');
  const [showTooltip, setShowTooltip] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedDetail, setEditedDetail] = useState<any | null>(null);
  const [searchCode, setSearchCode] = useState('');
  const [searchQuery, setSearchQuery] = useState(''); // 통합 검색어 저장
  const [highlightedCode, setHighlightedCode] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState<number | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{top: number, left: number} | null>(null);
  const [assigneeModalOpen, setAssigneeModalOpen] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{ id: number; newStatus: string; dbStatus: string } | null>(null);
  const [pendingBatchStatusChange, setPendingBatchStatusChange] = useState<{ ids: number[]; newStatus: string; dbStatus: string } | null>(null);
  
  const handleDetailFieldChange = (field: string, value: string) => {
    setEditedDetail((prev: any) => ({
      ...(prev || selectedDetail || {}),
      [field]: value,
    }));
  };

  const handleDetailEditClick = () => {
    if (!selectedDetail) return;
    setIsEditing(true);
    setEditedDetail({ ...selectedDetail });
  };

  const handleDetailCancel = () => {
    setIsEditing(false);
    setEditedDetail(null);
  };

  const handleDetailSave = async () => {
    if (!selectedDetail || !editedDetail) return;
    try {
      await updateRockfallDetail(selectedDetail.id, {
        memo: (editedDetail as any).note || (editedDetail as any).memo,
        severity: editedDetail.severity,
        rockSizeClass: (editedDetail as any).rockSizeClass,
        affectedAssetType: (editedDetail as any).affectedAssetType,
        affectedAssetName: (editedDetail as any).affectedAssetName,
        damageDescription: (editedDetail as any).damageDescription,
      });

      setSelectedDetail(editedDetail);
      setIsEditing(false);
      setEditedDetail(null);

      // 목록 새로고침
      const [active, completed, statsData, hotspotsData] = await Promise.all([
        getActiveRockfalls(),
        getCompletedRockfalls(),
        getRockfallStats(),
        getRockfallHotspots(),
      ]);
      setActiveRockfalls(active);
      setCompletedRockfalls(completed);
      setStats(statsData);
      setHotspots(hotspotsData);
      alert('수정이 완료되었습니다.');
    } catch (error) {
      console.error('저장 실패:', error);
      alert('저장에 실패했습니다.');
    }
  };
  
  // 페이지네이션
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 8;
  
  // viewMode 변경 시 페이지 리셋
  useEffect(() => {
    setCurrentPage(0);
  }, [viewMode]);
  
  // 신규 낙석 사건 등록 모달
  const [showNewRecordModal, setShowNewRecordModal] = useState(false);
  const [newRecord, setNewRecord] = useState({
    time: '',
    location: '',
    severity: 'medium',
    memo: '',
    rockSizeClass: '',
    affectedAssetType: '',
    affectedAssetName: '',
    damageDescription: ''
  });
  
  // 데이터 상태 관리
  const [activeRockfalls, setActiveRockfalls] = useState<any[]>([]);
  const [completedRockfalls, setCompletedRockfalls] = useState<any[]>([]);
  const [stats, setStats] = useState<RockfallStatsResponse>({
    todayCount: 0,
    pendingCount: 0,
    avgResponseTime: 0,
    avgResponseTimeFormatted: '-'
  });
  const [hotspots, setHotspots] = useState<HotspotResponse[]>([]);

  // API에서 데이터 로드
  useEffect(() => {
    const loadRockfallData = async () => {
      try {
        const [active, completed, statsData, hotspotsData] = await Promise.all([
          getActiveRockfalls(),
          getCompletedRockfalls(),
          getRockfallStats(),
          getRockfallHotspots(),
        ]);
        
        setActiveRockfalls(active);
        setCompletedRockfalls(completed);
        setStats(statsData);
        setHotspots(hotspotsData);
        
        console.log('✅ [Rockfall] All data loaded');
      } catch (error) {
        console.error('❌ [Rockfall] Failed to load data:', error);
      }
    };
    
    loadRockfallData();
  }, [refreshKey]);

  // viewMode에 따라 필터링
  const rockfallsByStatus = viewMode === 'active' ? activeRockfalls : completedRockfalls;
  
  // 통합 검색 필터링
  const filteredRockfalls = searchQuery.trim()
    ? rockfallsByStatus.filter(rockfall => {
        const query = searchQuery.toLowerCase();
        return (
          rockfall.accidentCode?.toUpperCase().includes(searchQuery.toUpperCase()) ||
          rockfall.cctvId?.toLowerCase().includes(query) ||
          rockfall.location?.toLowerCase().includes(query) ||
          rockfall.handler?.toLowerCase().includes(query) ||
          rockfall.status?.toLowerCase().includes(query) ||
          rockfall.severity?.toLowerCase().includes(query)
        );
      })
    : rockfallsByStatus;
  
  const rockfalls = filteredRockfalls;
  
  // 페이지네이션 적용
  const totalPages = Math.ceil(rockfalls.length / pageSize);
  const paginatedRockfalls = rockfalls.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  // 공통(incident) 상세 캐시: 현재 페이지(10개)만 조회해서 테이블에 표시
  const incidentBaseByIdRef = useRef<Record<number, any>>({});
  const [incidentBaseById, setIncidentBaseById] = useState<Record<number, any>>({});

  useEffect(() => {
    const ids = paginatedRockfalls.map(r => r.id).filter(Boolean);
    const missing = ids.filter(id => !incidentBaseByIdRef.current[id]);
    if (missing.length === 0) return;

    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        missing.map(async (id) => {
          try {
            const base = await getAllIncidentDetail(id);
            return { id, base };
          } catch {
            return { id, base: null };
          }
        })
      );

      if (cancelled) return;

      for (const { id, base } of results) {
        if (base) incidentBaseByIdRef.current[id] = base;
      }
      setIncidentBaseById({ ...incidentBaseByIdRef.current });
    })();

    return () => { cancelled = true; };
  }, [paginatedRockfalls]);

  const toggleStatus = async (id: number, newStatus: string) => {
    try {
      // 상태 매핑 (화면 → DB)
      let dbStatus: string;
      dbStatus = newStatus === '처리완료' ? 'RESOLVED' 
               : newStatus === '대응중' ? 'IN_PROGRESS' 
               : 'PENDING';
      
      // 대응중/처리완료는 처리자(STAFF) 선택 모달을 띄움
      if (newStatus === '대응중' || newStatus === '처리완료') {
        setPendingStatusChange({ id, newStatus, dbStatus });
        setAssigneeModalOpen(true);
        setStatusDropdownOpen(null);
        setDropdownPosition(null);
        return;
      }
      
      await updateRockfallStatus(id, dbStatus);
      
      // 성공 시 로컬 state 업데이트
      setActiveRockfalls(prev => prev.map(item => 
        item.id === id 
          ? { ...item, status: newStatus }
          : item
      ));
      
      setStatusDropdownOpen(null);
      setDropdownPosition(null);
    } catch (error) {
      console.error('상태 업데이트 실패:', error);
      alert('상태 변경에 실패했습니다.');
    }
  };

  const confirmAssigneeAndUpdate = async (assignedToId: number) => {
    // 일괄처리인 경우
    if (pendingBatchStatusChange) {
      const { ids, newStatus, dbStatus } = pendingBatchStatusChange;
      try {
        // 모든 선택된 항목의 상태를 업데이트
        for (const id of ids) {
          await updateRockfallStatus(id, dbStatus, { assignedToId });
        }
        
        // 데이터 재로드
        const [active, completed] = await Promise.all([getActiveRockfalls(), getCompletedRockfalls()]);
        setActiveRockfalls(active);
        setCompletedRockfalls(completed);
        
        // 선택 초기화
        setSelectedIds([]);
        alert(`${ids.length}건이 일괄처리되었습니다.`);
      } catch (error) {
        console.error('일괄 상태 업데이트 실패:', error);
        alert('일괄 처리에 실패했습니다.');
      } finally {
        setAssigneeModalOpen(false);
        setPendingBatchStatusChange(null);
      }
      return;
    }
    
    // 개별처리인 경우
    if (!pendingStatusChange) return;
    const { id, newStatus, dbStatus } = pendingStatusChange;
    try {
      await updateRockfallStatus(id, dbStatus, { assignedToId });

      if (newStatus === '처리완료') {
        const [active, completed] = await Promise.all([getActiveRockfalls(), getCompletedRockfalls()]);
        setActiveRockfalls(active);
        setCompletedRockfalls(completed);
      } else {
        const active = await getActiveRockfalls();
        setActiveRockfalls(active);
      }
    } catch (error) {
      console.error('상태 업데이트 실패:', error);
      alert('상태 변경에 실패했습니다.');
    } finally {
      setAssigneeModalOpen(false);
      setPendingStatusChange(null);
    }
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
    if (selectedIds.length === 0) return;
    
    // 일괄처리: 처리자 선택 모달 띄우기
    setPendingBatchStatusChange({ 
      ids: selectedIds, 
      newStatus: '처리완료', 
      dbStatus: 'RESOLVED' 
    });
    setAssigneeModalOpen(true);
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

  const handleSearch = (query: string) => {
    setSearchError(null);
    const trimmedQuery = query.trim();
    setSearchQuery(trimmedQuery); // 검색어 저장
    setCurrentPage(0); // 첫 페이지로 리셋
    
    if (!trimmedQuery) {
      setHighlightedCode(null);
      return;
    }

    // 검색 결과 확인
    const currentRockfalls = viewMode === 'active' ? activeRockfalls : completedRockfalls;
    const lowerQuery = trimmedQuery.toLowerCase();
    const hasResults = currentRockfalls.some(rockfall => 
      rockfall.accidentCode?.toUpperCase().includes(trimmedQuery.toUpperCase()) ||
      rockfall.cctvId?.toLowerCase().includes(lowerQuery) ||
      rockfall.location?.toLowerCase().includes(lowerQuery) ||
      rockfall.handler?.toLowerCase().includes(lowerQuery) ||
      rockfall.status?.toLowerCase().includes(lowerQuery) ||
      rockfall.severity?.toLowerCase().includes(lowerQuery)
    );

    if (!hasResults) {
      // 다른 모드에서 결과가 있는지 확인
      const otherRockfalls = viewMode === 'active' ? completedRockfalls : activeRockfalls;
      const hasResultsInOther = otherRockfalls.some(rockfall => 
        rockfall.accidentCode?.toUpperCase().includes(trimmedQuery.toUpperCase()) ||
        rockfall.cctvId?.toLowerCase().includes(lowerQuery) ||
        rockfall.location?.toLowerCase().includes(lowerQuery) ||
        rockfall.handler?.toLowerCase().includes(lowerQuery) ||
        rockfall.status?.toLowerCase().includes(lowerQuery) ||
        rockfall.severity?.toLowerCase().includes(lowerQuery)
      );

      if (hasResultsInOther) {
        // 다른 모드로 전환
        setViewMode(viewMode === 'active' ? 'completed' : 'active');
      } else {
        setHighlightedCode(null);
      }
    } else {
      setHighlightedCode(null);
    }
  };

  return (
    <div className="flex h-screen">
      <AssigneeSelectModal
        open={assigneeModalOpen}
        incidentType="ROCKFALL"
        title="처리자 선택 (낙석)"
        onClose={() => {
          setAssigneeModalOpen(false);
          setPendingStatusChange(null);
          setPendingBatchStatusChange(null);
        }}
        onConfirm={(assignedToId) => confirmAssigneeAndUpdate(assignedToId)}
      />
      {/* Sidebar - 반응형 (모바일: 75vw, PC: 고정) */}
      <div 
        className="fixed top-0 left-0 z-50 h-screen transition-transform duration-300 ease-in-out"
        style={{ 
          width: isMobile ? '75vw' : '317.56px',
          backgroundColor: '#2B2847',
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)'
        }}
      >
        <Sidebar onNavigate={onNavigate || (() => {})} currentPath="rockfall-dashboard" />
      </div>
      
      {/* 모바일 오버레이 */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <div className="flex-1 flex flex-col relative bg-white" style={{ marginLeft: sidebarOpen && !isMobile ? '317.56px' : '0px', transition: 'margin-left 0.3s' }}>
        {/* 상단바 */}
        <div className="shadow-md px-3 py-2 flex items-center justify-between border-b border-gray-200" style={{ backgroundColor: 'var(--ecoguard-header-bg)' }}>
          <div className="flex items-center gap-3">
            <HamburgerMenuButton onClick={() => setSidebarOpen(!sidebarOpen)} />
            <Mountain className="w-6 h-6 text-gray-200" />
            <h1 className="text-gray-100">낙석 상황 현황</h1>
          </div>
        </div>

        <div className="flex-1">
        <div className="p-4 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            {/* KPI Cards - 높이 줄임 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2">
              <div className="bg-white py-2 px-4 shadow-sm border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">당일 발생</span>
                  <Mountain className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-gray-900 text-xl font-semibold">{stats.todayCount}건</div>
              </div>

              <div className="bg-white py-2 px-4 shadow-sm border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">대기중</span>
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                </div>
                <div className="text-gray-900 text-xl font-semibold">{stats.pendingCount}건</div>
              </div>

              <div className="bg-white py-2 px-4 shadow-sm border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">월 평균 처리 시간</span>
                  <Clock className="w-4 h-4 text-blue-500" />
                </div>
                <div className="text-gray-900 text-xl font-semibold">{stats.avgResponseTimeFormatted || '-'}</div>
              </div>

              <div className="bg-white py-2 px-4 shadow-sm border border-gray-200 rounded-lg relative">
                <div 
                  className="absolute right-2"
                  style={{ bottom: '4px' }}
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                >
                  <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center cursor-help">
                    <HelpCircle className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                  </div>
                  {showTooltip && hotspots.length > 0 && (
                    <div className="absolute right-0 bottom-8 bg-gray-900 text-white text-xs px-3 py-2 shadow-lg max-w-xs" style={{ borderRadius: '4px' }}>
                      <div className="whitespace-nowrap">
                        당월 {hotspots[0].incidentCount || hotspots[0].count || 0}건 발생 지역
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
                  {hotspots.length > 0 ? (hotspots[0].address || hotspots[0].cctvCode || hotspots[0].location || '-') : '-'}
                </div>
              </div>
            </div>

            {/* Rockfall List */}
            <div className="bg-white shadow-sm border border-gray-200" style={{ borderRadius: '0px' }}>
              <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between">
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
                      setNewRecord({
                        time: nowKstDateTimeLocal(),
                        location: '',
                        severity: 'medium',
                        memo: '',
                        rockSizeClass: '',
                        affectedAssetType: '',
                        affectedAssetName: '',
                        damageDescription: ''
                      });
                      setShowNewRecordModal(true);
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
                        const value = e.target.value;
                        setSearchCode(value);
                        setSearchError(null);
                        // 입력이 비워지면 검색도 초기화
                        if (!value.trim()) {
                          setSearchQuery('');
                          setCurrentPage(0);
                        }
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleSearch(searchCode);
                        }
                      }}
                      placeholder="유형, 사고코드, CCTV ID 등 검색"
                      className={`pl-3 pr-10 py-1.5 text-sm border focus:outline-none focus:ring-2 ${
                        searchError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-emerald-500'
                      }`}
                      style={{ borderRadius: '9999px', width: '240px' }}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleSearch(searchCode);
                      }}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 hover:bg-gray-100 rounded-full transition-colors"
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
                        <th className="px-3 py-2 text-center text-gray-600 text-sm w-16">
                          <input 
                            type="checkbox" 
                            checked={selectedIds.length === activeRockfalls.length && activeRockfalls.length > 0}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </th>
                      )}
                      <th className="px-3 py-2 text-left text-gray-600 text-sm">사고 코드</th>
                      <th className="px-3 py-2 text-left text-gray-600 text-sm" style={{ minWidth: '110px' }}>등록 방식</th>
                      <th className="px-3 py-2 text-left text-gray-600 text-sm">지역명/CCTV ID</th>
                      <th className="px-3 py-2 text-left text-gray-600 text-sm">발생시간</th>
                      {viewMode === 'completed' && (
                        <>
                          <th className="px-3 py-2 text-left text-gray-600 text-sm">처리완료시각</th>
                          <th className="px-3 py-2 text-left text-gray-600 text-sm">소요시간</th>
                        </>
                      )}
                      <th className="px-3 py-2 text-left text-gray-600 text-sm">심각도</th>
                      <th className="px-3 py-2 text-left text-gray-600 text-sm">암괴 규모</th>
                      {viewMode === 'active' && (
                        <th className="px-3 py-2 text-left text-gray-600 text-sm">상태</th>
                      )}
                      <th className="px-3 py-2 text-left text-gray-600 text-sm">처리자</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedRockfalls.length === 0 ? (
                      <tr>
                        <td 
                          colSpan={viewMode === 'active' ? 9 : 8} 
                          className="px-6 py-12 text-center"
                        >
                          <div className="flex flex-col items-center gap-3">
                            <Search className="w-12 h-12 text-gray-300" />
                            <p className="text-gray-500 text-lg font-medium">검색 결과가 없습니다</p>
                            <p className="text-gray-400 text-sm">다른 검색어로 시도해보세요</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedRockfalls.map((rockfall) => {
                      const base = incidentBaseById[rockfall.id];
                      const accidentCode = base?.accidentCode ?? `ROCK-${rockfall.id}`;
                      const detectionBasis = base?.detectionBasis ?? '-';
                      const locationText = base?.location ?? base?.locationDesc ?? '-';

                      const isHighlighted = highlightedCode && (
                        accidentCode.toUpperCase().includes(highlightedCode.toUpperCase()) ||
                        (rockfall.cctvId && rockfall.cctvId.toUpperCase().includes(highlightedCode.toUpperCase())) ||
                        (rockfall.id && rockfall.id.toString() === highlightedCode)
                      );

                      return (
                      <tr 
                        key={rockfall.id} 
                        className={`hover:bg-gray-50 cursor-pointer ${isHighlighted ? 'bg-yellow-100' : ''}`}
                        onClick={async () => {
                          try {
                            // 공통 상세 + 낙석 상세 merge (전체현황 상세 모달과 동일 패턴)
                            const [base, rockfallDetail] = await Promise.all([
                              getAllIncidentDetail(rockfall.id),
                              getRockfallDetail(rockfall.id),
                            ]);
                            if (base) {
                              setSelectedDetail({ ...(base as any), ...(rockfallDetail || {}) } as any);
                              setIsEditing(false);
                              setEditedDetail(null);
                            }
                          } catch (error) {
                            console.error('❌ [Rockfall] Failed to load detail:', error);
                            // 실패 시 목록 데이터 사용
                            setSelectedDetail(rockfall as any);
                            setIsEditing(false);
                            setEditedDetail(null);
                          }
                        }}
                      >
                        {viewMode === 'active' && (
                          <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="checkbox" 
                              checked={selectedIds.includes(rockfall.id)}
                              onChange={() => toggleSelection(rockfall.id)}
                              className="w-4 h-4 cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="px-3 py-2 text-gray-900">{accidentCode}</td>
                        <td className="px-3 py-2" style={{ minWidth: '130px', width: '130px' }}>
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-medium whitespace-nowrap ${
                            detectionBasis?.includes('AI') || detectionBasis?.includes('자동')
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          }`} style={{ borderRadius: '0px' }}>
                            {detectionBasis?.includes('AI') || detectionBasis?.includes('자동') ? 'AI 자동 탐지' : detectionBasis === '-' ? '-' : '수동 등록'}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="text-gray-900">{locationText}</div>
                          {rockfall.cctvId && rockfall.cctvId !== '수동등록' && (
                            <div className="text-xs text-gray-500">{rockfall.cctvId}</div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-600 text-sm">{rockfall.time}</td>
                        {viewMode === 'completed' && 'responseTime' in rockfall && (
                          <>
                            <td className="px-3 py-2 text-gray-600 text-sm">{rockfall.responseTime || '-'}</td>
                            <td className="px-3 py-2 text-gray-600">{rockfall.duration || '-'}</td>
                          </>
                        )}
                        <td className="px-3 py-2">
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
                        <td className="px-3 py-2 text-gray-600">{rockfall.magnitude || '-'}</td>
                        {viewMode === 'active' && (
                          <td className="px-3 py-2 overflow-visible" onClick={(e) => e.stopPropagation()}>
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
                        <td className="px-3 py-2 text-gray-600">{rockfall.handler || '-'}</td>
                      </tr>
                      );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* 페이지네이션 UI - 2페이지 이상일 때만 표시 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-end gap-4 px-3 py-2 border-t border-gray-200">
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

      {/* 상세정보 모달 - IncidentDetailModal 단일 사용 */}
      {selectedDetail && (
        <IncidentDetailModal
          type="rockfall"
          detail={selectedDetail as any}
          isEditing={isEditing}
          editedDetail={editedDetail as any}
          onClose={() => { setSelectedDetail(null); setIsEditing(false); setEditedDetail(null); }}
          onEditClick={handleDetailEditClick}
          onSave={handleDetailSave}
          onCancel={handleDetailCancel}
          onFieldChange={handleDetailFieldChange}
        />
      )}

      {/* 신규 낙석 등록 모달 */}
      {showNewRecordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl shadow-xl" style={{ borderRadius: '0px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="bg-emerald-600 px-3 py-2 flex items-center justify-between sticky top-0">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-white" />
                <h2 className="text-white font-semibold">신규 낙석 등록</h2>
              </div>
              <button
                onClick={() => {
                  setShowNewRecordModal(false);
                  setNewRecord({
                    time: '',
                    location: '',
                    severity: 'medium',
                    memo: '',
                    rockSizeClass: '',
                    affectedAssetType: '',
                    affectedAssetName: '',
                    damageDescription: ''
                  });
                }}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-sm text-gray-600 mb-6">
                <span className="text-red-500">*</span> 표시는 필수 입력 항목입니다.
              </p>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="text-red-500">*</span> 발생시간
                  </label>
                  <input
                    type="datetime-local"
                    value={newRecord.time}
                    onChange={e => setNewRecord({...newRecord, time: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    style={{ borderRadius: '0px' }}
                  />
                  <p className="text-xs text-gray-500 mt-1">발생 시간을 모르면 현재 시간을 선택하세요</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="text-red-500">*</span> 발생 위치
                  </label>
                  <input
                    type="text"
                    value={newRecord.location}
                    onChange={e => setNewRecord({...newRecord, location: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    style={{ borderRadius: '0px' }}
                    placeholder="발생 위치를 입력하세요"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="text-red-500">*</span> 심각도
                  </label>
                  <select
                    value={newRecord.severity}
                    onChange={e => setNewRecord({...newRecord, severity: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    style={{ borderRadius: '0px' }}
                  >
                    <option value="low">하</option>
                    <option value="medium">중</option>
                    <option value="high">상</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="text-red-500">*</span> 암괴 규모
                  </label>
                  <input
                    type="text"
                    value={newRecord.rockSizeClass}
                    onChange={e => setNewRecord({...newRecord, rockSizeClass: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    style={{ borderRadius: '0px' }}
                    placeholder="예: 대형/중형/소형, 1m급 등"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="text-red-500">*</span> 피해 대상 유형
                  </label>
                  <input
                    type="text"
                    value={newRecord.affectedAssetType}
                    onChange={e => setNewRecord({...newRecord, affectedAssetType: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    style={{ borderRadius: '0px' }}
                    placeholder="예: 등산로, 시설물, 차량, 인명, 기타"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">피해 대상 식별</label>
                  <input
                    type="text"
                    value={newRecord.affectedAssetName}
                    onChange={e => setNewRecord({...newRecord, affectedAssetName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    style={{ borderRadius: '0px' }}
                    placeholder="예: 북문 등산로 난간 A구간, 표지판 #3 등"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">피해 설명</label>
                  <textarea
                    value={newRecord.damageDescription}
                    onChange={e => setNewRecord({...newRecord, damageDescription: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    style={{ borderRadius: '0px' }}
                    rows={3}
                    placeholder="피해 상황을 입력하세요 (선택사항)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">메모</label>
                  <textarea
                    value={newRecord.memo}
                    onChange={e => setNewRecord({...newRecord, memo: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    style={{ borderRadius: '0px' }}
                    rows={3}
                    placeholder="메모를 입력하세요 (선택사항)"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 pt-0">
              <button
                onClick={async () => {
                  if (!newRecord.time || !newRecord.location || !newRecord.rockSizeClass || !newRecord.affectedAssetType) {
                    alert('필수 항목(발생시간, 발생위치, 암괴 규모, 피해 대상 유형)을 입력해주세요.');
                    return;
                  }
                  try {
                    // 로그인한 사용자 정보 가져오기
                    const currentUser = getCurrentUser();
                    const createdById = currentUser?.userId || 1; // 로그인한 사용자 ID, 없으면 기본값 1
                    
                    const result = await createRockfall({
                      detectedAt: localDateTimeToKstIso(newRecord.time),
                      locationDesc: newRecord.location,
                      severityLevel: newRecord.severity.toUpperCase(),
                      rockSizeClass: newRecord.rockSizeClass,
                      affectedAssetType: newRecord.affectedAssetType,
                      affectedAssetName: newRecord.affectedAssetName || undefined,
                      damageDescription: newRecord.damageDescription || undefined,
                      memo: newRecord.memo || undefined,
                      createdById: createdById,
                    });
                    alert(`신규 낙석 사건이 등록되었습니다. (사고코드: ${result.incidentCode})`);
                    setShowNewRecordModal(false);
                    setNewRecord({
                      time: '',
                      location: '',
                      severity: 'medium',
                      memo: '',
                      rockSizeClass: '',
                      affectedAssetType: '',
                      affectedAssetName: '',
                      damageDescription: ''
                    });
                    // 목록/통계 새로고침
                    const [active, completed, statsData, hotspotsData] = await Promise.all([
                      getActiveRockfalls(),
                      getCompletedRockfalls(),
                      getRockfallStats(),
                      getRockfallHotspots(),
                    ]);
                    setActiveRockfalls(active);
                    setCompletedRockfalls(completed);
                    setStats(statsData);
                    setHotspots(hotspotsData);
                  } catch (error) {
                    console.error('❌ [Rockfall] Failed to create:', error);
                    alert('낙석 사건 등록 중 오류가 발생했습니다. 다시 시도해주세요.');
                  }
                }}
                className="w-full px-3 py-2 bg-emerald-600 text-white text-lg font-semibold hover:bg-emerald-700 transition-colors"
                style={{ borderRadius: '0px' }}
              >
                등록
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
