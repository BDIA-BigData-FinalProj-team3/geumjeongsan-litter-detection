import React, { useState, useEffect } from 'react';
import { Flame, AlertTriangle, Clock, Wind, MapPin, HelpCircle, User, LogOut, X, Video, Image as ImageIcon, Map, Edit2, Save, Search, ChevronDown, Plus } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import HamburgerMenuButton from '../components/HamburgerMenuButton';
import IncidentDetailModal from '../components/IncidentDetailModal';
import { useNavigate, useLocation } from 'react-router-dom';
import { useIncidentCount } from '../contexts/IncidentCountContext';
import { getActiveFires, getCompletedFires, getFireStats, getFireHotspots, createFire, updateFireStatus, getFireDetail, updateFireDetail, type FireStatsResponse, type HotspotResponse } from '../services/api';

interface FireDashboardProps {
  onNavigate?: (screen: string) => void;
}

interface FireDetail {
  id: number;
  accidentCode: string;
  cctvId: string;
  time: string;
  status: string;
  severity: string;
  windSpeed: string;
  handler: string;
  location?: string;
  detectionBasis?: string;
  responseTime?: string;
  duration?: string;
  transferHospital?: string;
}

export default function FireDashboard({ onNavigate }: FireDashboardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { setFireCount, addCompletedIncident, completedIncidents } = useIncidentCount();
  
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
  const [selectedDetail, setSelectedDetail] = useState<FireDetail | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedDetail, setEditedDetail] = useState<FireDetail | null>(null);
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
  
  // 신규 화재 사건 등록 모달
  const [showNewRecordModal, setShowNewRecordModal] = useState(false);
  const [canSendAlert, setCanSendAlert] = useState(false);
  const [newRecord, setNewRecord] = useState({
    time: '',
    location: '',
    severity: 'medium',
    memo: ''
  });
  
  // 데이터 상태 관리
  const [activeFires, setActiveFires] = useState<any[]>([]);
  const [completedFires, setCompletedFires] = useState<any[]>([]);
  const [stats, setStats] = useState<FireStatsResponse>({
    todayCount: 0,
    pendingCount: 0,
    avgResponseTime: 0,
    avgResponseTimeFormatted: '-'
  });
  const [hotspots, setHotspots] = useState<HotspotResponse[]>([]);

  // API에서 데이터 로드
  useEffect(() => {
    const loadFireData = async () => {
      const [active, completed, statsData, hotspotsData] = await Promise.all([
        getActiveFires(),
        getCompletedFires(),
        getFireStats(),
        getFireHotspots('this_month', 1),
      ]);
      
      // 프론트엔드에서 화재 타입만 필터링
      const filteredActive = active.filter(f => f.type === '화재');
      const filteredCompleted = completed.filter(f => f.type === '화재');
      
      const filteredActiveFinal = filteredActive.filter(f => !completedIncidents.has(f.cctvId));
      setActiveFires(filteredActiveFinal);
      setCompletedFires(filteredCompleted);
      setFireCount(filteredActiveFinal.length);
      setStats(statsData);
      setHotspots(hotspotsData);
    };
    
    loadFireData();
  }, [completedIncidents]);

  // 초기 카운트 설정 및 activeFires 변경 시 카운트 업데이트
  useEffect(() => {
    setFireCount(activeFires.length);
  }, [activeFires, setFireCount]);

  // 검색 코드가 있으면 필터링, 없으면 전체 표시
  const filteredFires = highlightedCode 
    ? (viewMode === 'active' ? activeFires : completedFires).filter(f => 
        f.accidentCode.toUpperCase() === highlightedCode.toUpperCase()
      )
    : (viewMode === 'active' ? activeFires : completedFires);
  
  const fires = filteredFires.length > 0 ? filteredFires : (viewMode === 'active' ? activeFires : completedFires);
  
  // 페이지네이션 적용
  const totalPages = Math.ceil(fires.length / pageSize);
  const paginatedFires = fires.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  const updateStatus = async (id: number, newStatus: string) => {
    try {
      // 상태 매핑 (화면 → DB)
      const dbStatus = newStatus === '진화완료' ? 'RESOLVED' 
                     : newStatus === '진화중' ? 'EXTINGUISHING' 
                     : newStatus === '대응중' ? 'IN_PROGRESS'
                     : 'PENDING';
      
      // 백엔드 API 호출
      await updateFireStatus(id, dbStatus);
      
      // 성공 시 로컬 state 업데이트
      if (newStatus === '진화완료') {
        // VIEW에서 최신 데이터를 다시 조회하여 정확한 responseTime과 duration 가져오기
        const [active, completed] = await Promise.all([
          getActiveFires(),
          getCompletedFires(),
        ]);
        
        // 프론트엔드에서 화재 타입만 필터링
        const filteredActive = active.filter(f => f.type === '화재');
        const filteredCompleted = completed.filter(f => f.type === '화재');
        
        const filteredActiveFinal = filteredActive.filter(f => !completedIncidents.has(f.cctvId));
        setActiveFires(filteredActiveFinal);
        setCompletedFires(filteredCompleted);
        setFireCount(filteredActiveFinal.length);
      } else {
        // 진행중 상태 변경 시에는 active 목록만 다시 조회
        const active = await getActiveFires();
        const filteredActive = active.filter(f => f.type === '화재');
        const filteredActiveFinal = filteredActive.filter(f => !completedIncidents.has(f.cctvId));
        setActiveFires(filteredActiveFinal);
        setFireCount(filteredActiveFinal.length);
      }
      
      setStatusDropdownOpen(null);
      setDropdownPosition(null);
    } catch (error) {
      console.error('상태 업데이트 실패:', error);
      alert('상태 변경에 실패했습니다.');
    }
  };

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === activeFires.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(activeFires.map(f => f.id));
    }
  };

  const handleBatchComplete = () => {
    const now = new Date();
    const responseTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const itemsToComplete = activeFires.filter(f => selectedIds.includes(f.id)).map(f => ({
      ...f,
      status: '진화완료',
      responseTime,
      duration: '30분'
    }));
    
    // 처리완료된 사건의 CCTV ID를 전역 상태에 추가
    itemsToComplete.forEach(item => {
      addCompletedIncident(item.cctvId);
    });
    
    const newActiveFires = activeFires.filter(f => !selectedIds.includes(f.id));
    setCompletedFires(prev => [...itemsToComplete, ...prev]);
    setActiveFires(newActiveFires);
    setFireCount(newActiveFires.length);
    setSelectedIds([]);
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setEditedDetail({ ...selectedDetail! });
  };

  const handleSave = async () => {
    if (!editedDetail || !selectedDetail) return;

    // 변경 사항 체크
    const hasChanges = 
      editedDetail.severity !== selectedDetail.severity ||
      editedDetail.note !== (selectedDetail as any).memo;
    
    if (!hasChanges) {
      alert('변경된 내용이 없습니다.');
      setIsEditing(false);
      return;
    }
    
    try {
      await updateFireDetail(editedDetail.id, {
        memo: editedDetail.note,
        severity: editedDetail.severity,
      });
      
      // 성공 시 데이터 재로드
      const [active, completed, statsData, hotspotsData] = await Promise.all([
        getActiveFires(),
        getCompletedFires(),
        getFireStats(),
        getFireHotspots('this_month', 1),
      ]);
      
      const filteredActive = active.filter(f => f.type === '화재');
      const filteredCompleted = completed.filter(f => f.type === '화재');
      const filteredActiveFinal = filteredActive.filter(f => !completedIncidents.has(f.cctvId));
      
      setActiveFires(filteredActiveFinal);
      setCompletedFires(filteredCompleted);
      setFireCount(filteredActiveFinal.length);
      setStats(statsData);
      setHotspots(hotspotsData);
      
      setIsEditing(false);
      setSelectedDetail(null);
      setEditedDetail(null);
      alert('수정이 완료되었습니다.');
    } catch (error) {
      console.error('저장 실패:', error);
      alert('저장에 실패했습니다.');
    }
    setEditedDetail(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedDetail(null);
  };

  const handleFieldChange = (field: keyof FireDetail, value: string) => {
    if (editedDetail) {
      setEditedDetail({ ...editedDetail, [field]: value });
    }
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
      const allFires = [...activeFires, ...completedFires];
      const found = allFires.find(f => f.accidentCode.toUpperCase() === upperCode);
      if (found) {
        // 해당 사고가 완료된 것인지 확인하여 viewMode 설정
        if (completedFires.find(f => f.id === found.id)) {
          setViewMode('completed');
        } else {
          setViewMode('active');
        }
        // 상세정보는 열지 않고 행만 하이라이트
      }
    }
  }, [location.search, activeFires, completedFires]);

  const handleNewRecordSubmit = async () => {
    // 필수 입력 체크
    if (!newRecord.time || !newRecord.location || !newRecord.severity) {
      alert('발생시간, 발생 위치, 심각도는 필수 입력 항목입니다.');
      return;
    }

    try {
      // Backend API 호출
      const result = await createFire({
        detectedAt: new Date(newRecord.time).toISOString(),
        locationDesc: newRecord.location,
        severityLevel: newRecord.severity.toUpperCase(),
        memo: newRecord.memo || undefined,
      });
      
      // 등록 성공
      alert(`신규 화재 사건이 등록되었습니다. (사고코드: ${result.incidentCode})`);
    setCanSendAlert(true);
    
      // 모달 닫기 및 데이터 새로고침
      setShowNewRecordModal(false);
      setNewRecord({
        time: '',
        location: '',
        severity: 'medium',
        memo: ''
      });
      
      // 목록 새로고침
      const loadFireData = async () => {
        const [active, completed, statsData, hotspotsData] = await Promise.all([
          getActiveFires(),
          getCompletedFires(),
          getFireStats(),
          getFireHotspots('this_month', 1),
        ]);
        
        // 프론트엔드에서 화재 타입만 필터링
        const filteredActive = active.filter(f => f.type === '화재');
        const filteredCompleted = completed.filter(f => f.type === '화재');
        
        const filteredActiveFinal = filteredActive.filter(f => !completedIncidents.has(f.cctvId));
        setActiveFires(filteredActiveFinal);
        setCompletedFires(filteredCompleted);
        setFireCount(filteredActiveFinal.length);
        setStats(statsData);
        setHotspots(hotspotsData);
      };
      loadFireData();
      
    } catch (error) {
      console.error('❌ [Fire] Failed to create:', error);
      alert('화재 사건 등록 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  const handleSearch = (code: string) => {
    setSearchError(null);
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      setHighlightedCode(null);
      setSelectedDetail(null);
      return;
    }
    
    const upperCode = trimmedCode.toUpperCase();
    
    // 현재 탭에서 검색
    const allFires = [...activeFires, ...completedFires];
    const found = allFires.find(f => f.accidentCode.toUpperCase() === upperCode);
    
    if (found) {
      setHighlightedCode(upperCode);
      // 상세정보는 열지 않고 행만 하이라이트
      if (completedFires.find(f => f.id === found.id)) {
        setViewMode('completed');
      } else {
        setViewMode('active');
      }
    } else {
      // 다른 탭으로 이동
      if (upperCode.startsWith('EMG-')) {
        navigate(`/emergency?code=${upperCode}`);
      } else if (upperCode.startsWith('TRASH-')) {
        navigate(`/trash?code=${upperCode}`);
      } else if (upperCode.startsWith('FIRE-')) {
        navigate(`/fire?code=${upperCode}`);
      } else {
        // 검색 결과 없음
        setHighlightedCode(null);
        setSelectedDetail(null);
        setSearchError('검색 결과가 없습니다.');
        setTimeout(() => setSearchError(null), 3000);
      }
    }
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar - 반응형 (모바일: 75vw, PC: 고정) */}
      <div 
        className="fixed top-0 left-0 z-50 h-screen transition-transform duration-300 ease-in-out"
        style={{ 
          width: isMobile ? '75vw' : '317.56px',
          backgroundColor: '#2B2847',
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)'
        }}
      >
        <Sidebar onNavigate={onNavigate || (() => {})} currentPath="fire-dashboard" />
      </div>
      
      {/* 모바일 오버레이 */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <div className="flex-1 flex flex-col relative bg-white" style={{ marginLeft: sidebarOpen && !isMobile ? '317.56px' : '0px', transition: 'margin-left 0.3s' }}>
        {/* 상단바 - 반응형 */}
        <div className="shadow-md flex items-center justify-between border-b border-gray-200" style={{ backgroundColor: 'var(--ecoguard-header-bg)', padding: isMobile ? '12px 16px' : '16px 24px' }}>
          <div className="flex items-center" style={{ gap: isMobile ? '8px' : '12px' }}>
            <HamburgerMenuButton onClick={() => setSidebarOpen(!sidebarOpen)} />
            <Flame className={isMobile ? 'w-5 h-5 text-gray-200' : 'w-6 h-6 text-gray-200'} />
            <h1 className="text-gray-100" style={{ fontSize: isMobile ? '16px' : '20px' }}>화재 상황 현황</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
        <div className="bg-gray-50 min-h-screen" style={{ padding: isMobile ? '16px' : '24px' }}>
          <div className="max-w-7xl mx-auto">
            {/* KPI Cards - 반응형 그리드 */}
            <div className={`grid gap-${isMobile ? '3' : '4'} mb-4`} style={{ gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              <div className="bg-white p-4 shadow-sm border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">당일 발생</span>
                  <Flame className="w-4 h-4 text-red-500" />
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

              <div className="bg-white p-4 shadow-sm border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">현재 풍속</span>
                  <Wind className="w-4 h-4 text-gray-500" />
                </div>
                <div className="text-gray-900 text-xl font-semibold">12km/h</div>
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
                  {hotspots.length > 0 ? (hotspots[0].address || hotspots[0].cctvCode) : '-'}
                </div>
              </div>
            </div>

            {/* Fire List */}
            <div className="bg-white shadow-sm border border-gray-200" style={{ borderRadius: '0px' }}>
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h2 className="text-gray-900">화재 사건 목록</h2>
                  <span className="text-sm text-gray-600">총 {fires.length}건</span>
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
                    onClick={() => setShowNewRecordModal(true)}
                    className="px-3 py-1.5 bg-emerald-600 text-white text-sm hover:bg-emerald-700 transition-colors flex items-center gap-1.5"
                    style={{ borderRadius: '0px' }}
                  >
                    <Plus className="w-4 h-4" />
                    신규 화재 사건 등록
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
                      placeholder="사고 코드 검색"
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
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {viewMode === 'active' && (
                        <th className="px-6 py-3 text-center text-gray-600 text-sm w-16">
                          <input 
                            type="checkbox" 
                            checked={selectedIds.length === activeFires.length && activeFires.length > 0}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </th>
                      )}
                      <th className="px-6 py-3 text-left text-gray-600 text-sm">사고 코드</th>
                      <th className="px-6 py-3 text-left text-gray-600 text-sm" style={{ minWidth: '130px', width: '130px' }}>탐지근거</th>
                      <th className="px-6 py-3 text-left text-gray-600 text-sm">지역명/CCTV ID</th>
                      <th className="px-6 py-3 text-left text-gray-600 text-sm">발생시간</th>
                      {viewMode === 'completed' && (
                        <>
                          <th className="px-6 py-3 text-left text-gray-600 text-sm">처리완료시각</th>
                          <th className="px-6 py-3 text-left text-gray-600 text-sm">소요시간</th>
                        </>
                      )}
                      <th className="px-6 py-3 text-left text-gray-600 text-sm">심각도</th>
                      <th className="px-6 py-3 text-left text-gray-600 text-sm">풍속</th>
                      {viewMode === 'active' && (
                        <th className="px-6 py-3 text-left text-gray-600 text-sm">상태</th>
                      )}
                      <th className="px-6 py-3 text-left text-gray-600 text-sm">처리자</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedFires.map((fire) => {
                      const isHighlighted = highlightedCode && fire.accidentCode.toUpperCase() === highlightedCode.toUpperCase();
                      return (
                      <tr 
                        key={fire.id} 
                        className={`hover:bg-gray-50 cursor-pointer ${isHighlighted ? 'bg-yellow-100' : ''}`} 
                        onClick={async () => { 
                          try {
                            const detail = await getFireDetail(fire.id);
                            if (detail) {
                              setSelectedDetail(detail as any);
                              setIsEditing(false);
                              setEditedDetail(null);
                            }
                          } catch (error) {
                            console.error('❌ [Fire] Failed to load detail:', error);
                            // 실패 시 목록 데이터 사용
                            setSelectedDetail(fire as any);
                            setIsEditing(false);
                            setEditedDetail(null);
                          }
                        }}
                      >
                        {viewMode === 'active' && (
                          <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="checkbox" 
                              checked={selectedIds.includes(fire.id)}
                              onChange={() => toggleSelection(fire.id)}
                              className="w-4 h-4 cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="px-6 py-4 text-gray-900">{fire.accidentCode}</td>
                        <td className="px-6 py-4" style={{ minWidth: '130px', width: '130px' }}>
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-medium whitespace-nowrap ${
                            fire.detectionBasis?.includes('AI') || fire.detectionBasis?.includes('자동')
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          }`} style={{ borderRadius: '0px' }}>
                            {fire.detectionBasis?.includes('AI') || fire.detectionBasis?.includes('자동') ? 'AI 자동 탐지' : '수동 등록'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-gray-900">{fire.location || '-'}</div>
                          <div className="text-xs text-gray-500">{fire.cctvId}</div>
                        </td>
                        <td className="px-6 py-4 text-gray-600 text-sm">{fire.time}</td>
                        {viewMode === 'completed' && (
                          <>
                            <td className="px-6 py-4 text-gray-600 text-sm">{fire.responseTime || '-'}</td>
                            <td className="px-6 py-4 text-gray-600">{fire.duration || '-'}</td>
                          </>
                        )}
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs ${
                            fire.severity === 'high' 
                              ? 'bg-red-100 text-red-700' 
                              : fire.severity === 'medium'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-blue-100 text-blue-700'
                          }`} style={{ borderRadius: '0px' }}>
                            {fire.severity === 'high' ? '상' : fire.severity === 'medium' ? '중' : '하'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{fire.windSpeed}</td>
                        {viewMode === 'active' && (
                          <td className="px-6 py-4 overflow-visible" onClick={(e) => e.stopPropagation()}>
                            <div className="relative inline-block">
                              <button 
                                onClick={(e) => {
                                  if (statusDropdownOpen === fire.id) {
                                    setStatusDropdownOpen(null);
                                    setDropdownPosition(null);
                                  } else {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setDropdownPosition({
                                      top: rect.bottom + window.scrollY,
                                      left: rect.left + window.scrollX
                                    });
                                    setStatusDropdownOpen(fire.id);
                                  }
                                }}
                                className={`px-3 py-1.5 text-xs cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-2 ${
                                  fire.status === '진화중' 
                                    ? 'bg-green-100 text-green-700' 
                                    : fire.status === '대기중'
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`} 
                                style={{ borderRadius: '0px', minWidth: '90px' }}
                              >
                                <span>{fire.status}</span>
                                <ChevronDown className="w-3.5 h-3.5 ml-auto" />
                              </button>
                              {statusDropdownOpen === fire.id && dropdownPosition && (
                                <div className="fixed bg-white shadow-lg border border-gray-200 min-w-[100px]" style={{ borderRadius: '0px', top: `${dropdownPosition.top + 4}px`, left: `${dropdownPosition.left}px`, zIndex: 9999 }}>
                                  {/* 상태 옵션에서 현재 상태 제외 */}
                                  {fire.status !== '대기중' && (
                                    <button
                                      onClick={() => updateStatus(fire.id, '대기중')}
                                      className="w-full px-3 py-2 text-left text-sm hover:bg-orange-50 text-gray-700"
                                    >
                                      대기중
                                    </button>
                                  )}
                                  {fire.status !== '진화중' && (
                                    <button
                                      onClick={() => updateStatus(fire.id, '진화중')}
                                      className="w-full px-3 py-2 text-left text-sm hover:bg-green-50 text-gray-700"
                                    >
                                      진화중
                                    </button>
                                  )}
                                  {fire.status !== '진화완료' && fire.status !== '처리완료' && (
                                    <button
                                      onClick={() => updateStatus(fire.id, '진화완료')}
                                      className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 text-gray-700"
                                    >
                                      진화완료
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        )}
                        <td className="px-6 py-4 text-gray-600">{fire.handler}</td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* 페이지네이션 - 2페이지 이상일 때만 표시 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-end gap-4 px-6 py-4 border-t border-gray-200 bg-white">
                  <div className="text-sm text-gray-600">
                    {currentPage + 1} / {totalPages} 페이지
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(0)}
                      disabled={currentPage === 0}
                      className={`px-3 py-1 text-sm border ${currentPage === 0 ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                      style={{ borderRadius: '0px' }}
                    >
                      처음
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                      disabled={currentPage === 0}
                      className={`px-3 py-1 text-sm border ${currentPage === 0 ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                      style={{ borderRadius: '0px' }}
                    >
                      &lt;
                    </button>
                    <button className="px-3 py-1 text-sm bg-emerald-600 text-white border-emerald-600" style={{ borderRadius: '0px' }}>
                      {currentPage + 1}
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                      disabled={currentPage === totalPages - 1}
                      className={`px-3 py-1 text-sm border ${currentPage === totalPages - 1 ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                      style={{ borderRadius: '0px' }}
                    >
                      &gt;
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages - 1)}
                      disabled={currentPage === totalPages - 1}
                      className={`px-3 py-1 text-sm border ${currentPage === totalPages - 1 ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
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

      {/* 상세정보 모달 */}
      {selectedDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedDetail(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200" style={{ backgroundColor: 'var(--ecoguard-header-bg)' }}>
              <h2 className="text-xl font-semibold text-gray-100">상세정보</h2>
              <button onClick={() => setSelectedDetail(null)} className="text-gray-100 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* 모달 내용 */}
            <div className="p-6">
              {/* 상세정보 패널 - 전체 너비 */}
              <div className="flex flex-col">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">상세정보 내용</h3>
                <div className="grid grid-cols-2 gap-x-8 gap-y-5 flex-1">
                  {/* 왼쪽 열 - 기본 정보 */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-gray-600">사고 코드</label>
                    {isEditing && editedDetail ? (
                      <input
                        type="text"
                        value={editedDetail.accidentCode}
                        onChange={(e) => handleFieldChange('accidentCode', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                        style={{ borderRadius: '0px' }}
                      />
                    ) : (
                      <p className="text-gray-900 mt-1">{selectedDetail.accidentCode}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">CCTV ID</label>
                    {isEditing && editedDetail ? (
                      <input
                        type="text"
                        value={editedDetail.cctvId}
                        onChange={(e) => handleFieldChange('cctvId', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                        style={{ borderRadius: '0px' }}
                      />
                    ) : (
                      <p className="text-gray-900 mt-1">{selectedDetail.cctvId}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">유형</label>
                    <p className="text-gray-900 mt-1">화재</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">발생시간</label>
                    {isEditing && editedDetail ? (
                      <input
                        type="text"
                        value={editedDetail.time}
                        onChange={(e) => handleFieldChange('time', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                        style={{ borderRadius: '0px' }}
                      />
                    ) : (
                      <p className="text-gray-900 mt-1">{selectedDetail.time}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">심각도</label>
                    {isEditing && editedDetail ? (
                      <select
                        value={editedDetail.severity}
                        onChange={(e) => handleFieldChange('severity', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                        style={{ borderRadius: '0px' }}
                      >
                        <option value="high">상</option>
                        <option value="medium">중</option>
                        <option value="low">하</option>
                      </select>
                    ) : (
                      <p className="mt-1">
                        <span className={`px-2 py-1 text-xs ${
                          selectedDetail.severity === 'high' 
                            ? 'bg-red-100 text-red-700' 
                            : selectedDetail.severity === 'medium'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-blue-100 text-blue-700'
                        }`} style={{ borderRadius: '0px' }}>
                          {selectedDetail.severity === 'high' ? '상' : selectedDetail.severity === 'medium' ? '중' : '하'}
                        </span>
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">상태</label>
                    {isEditing && editedDetail ? (
                      <select
                        value={editedDetail.status}
                        onChange={(e) => handleFieldChange('status', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                        style={{ borderRadius: '0px' }}
                      >
                        <option value="대기중">대기중</option>
                        <option value="진화중">진화중</option>
                        <option value="진화완료">진화완료</option>
                      </select>
                    ) : (
                      <p className="mt-1">
                        <span className={`px-2 py-1 text-xs ${
                          selectedDetail.status === '진화완료'
                            ? 'bg-green-100 text-green-700' 
                            : selectedDetail.status === '진화중'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-gray-100 text-gray-700'
                        }`} style={{ borderRadius: '0px' }}>
                          {selectedDetail.status}
                        </span>
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">처리자</label>
                    {isEditing && editedDetail ? (
                      <input
                        type="text"
                        value={editedDetail.handler}
                        onChange={(e) => handleFieldChange('handler', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                        style={{ borderRadius: '0px' }}
                      />
                    ) : (
                      <p className="text-gray-900 mt-1">{selectedDetail.handler}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">탐지근거</label>
                    {isEditing && editedDetail ? (
                      <input
                        type="text"
                        value={editedDetail.detectionBasis || ''}
                        onChange={(e) => handleFieldChange('detectionBasis', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                        style={{ borderRadius: '0px' }}
                      />
                    ) : (
                      <p className="text-gray-900 mt-1">{selectedDetail.detectionBasis || 'AI 자동 탐지'}</p>
                    )}
                  </div>
                  </div>
                  {/* 오른쪽 열 - 추가 정보 */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-gray-600">풍속</label>
                    {isEditing && editedDetail ? (
                      <input
                        type="text"
                        value={editedDetail.windSpeed}
                        onChange={(e) => handleFieldChange('windSpeed', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                        style={{ borderRadius: '0px' }}
                      />
                    ) : (
                      <p className="text-gray-900 mt-1">{selectedDetail.windSpeed}</p>
                    )}
                  </div>
                  {selectedDetail.location && (
                    <div>
                      <label className="text-sm text-gray-600">위치</label>
                      {isEditing && editedDetail ? (
                        <input
                          type="text"
                          value={editedDetail.location || ''}
                          onChange={(e) => handleFieldChange('location', e.target.value)}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                          style={{ borderRadius: '0px' }}
                        />
                      ) : (
                        <p className="text-gray-900 mt-1">{selectedDetail.location}</p>
                      )}
                    </div>
                  )}
                  {selectedDetail.responseTime && (
                    <div>
                      <label className="text-sm text-gray-600">처리완료시각</label>
                      {isEditing && editedDetail ? (
                        <input
                          type="text"
                          value={editedDetail.responseTime || ''}
                          onChange={(e) => handleFieldChange('responseTime', e.target.value)}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                          style={{ borderRadius: '0px' }}
                        />
                      ) : (
                        <p className="text-gray-900 mt-1">{selectedDetail.responseTime}</p>
                      )}
                    </div>
                  )}
                  {selectedDetail.duration && (
                    <div>
                      <label className="text-sm text-gray-600">소요시간</label>
                      {isEditing && editedDetail ? (
                        <input
                          type="text"
                          value={editedDetail.duration || ''}
                          onChange={(e) => handleFieldChange('duration', e.target.value)}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                          style={{ borderRadius: '0px' }}
                        />
                      ) : (
                        <p className="text-gray-900 mt-1">{selectedDetail.duration}</p>
                      )}
                    </div>
                  )}
                  {/* 이송병원 및 처리 기관 - 맨 밑에 추가 */}
                  <div>
                    <label className="text-sm text-gray-600">이송병원 및 처리 기관</label>
                    {isEditing && editedDetail ? (
                      <input
                        type="text"
                        value={editedDetail.transferHospital ?? ''}
                        onChange={(e) => handleFieldChange('transferHospital', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                        style={{ borderRadius: '0px' }}
                        placeholder="이송병원 및 처리 기관을 입력하세요"
                      />
                    ) : (
                      <p className="text-gray-900 mt-1">{selectedDetail.transferHospital || '-'}</p>
                    )}
                  </div>
                  </div>
                </div>

                {/* 하단 버튼 */}
                <div className="flex gap-3 mt-6">
                  {isEditing ? (
                    <>
                      <button 
                        onClick={handleSave}
                        className="flex-1 px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2" 
                        style={{ borderRadius: '0px' }}
                      >
                        <Save className="w-4 h-4" />
                        저장
                      </button>
                      <button 
                        onClick={handleCancel}
                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors" 
                        style={{ borderRadius: '0px' }}
                      >
                        취소
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={handleEditClick}
                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors flex items-center justify-center gap-2" 
                        style={{ borderRadius: '0px' }}
                      >
                        <Edit2 className="w-4 h-4" />
                        수정
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 상세정보 모달 */}
      {selectedDetail && (
        <>
          {/* AI 자동 탐지 vs 수동 등록 */}
          {(selectedDetail as any).detectionBasis?.includes('AI') || (selectedDetail as any).detectionBasis?.includes('자동') ? (
            /* AI 자동 탐지 - 새 컴포넌트 사용 */
            <IncidentDetailModal
              type="fire"
              detail={selectedDetail as any}
              isEditing={isEditing}
              editedDetail={editedDetail as any}
              onClose={() => { setSelectedDetail(null); setIsEditing(false); }}
              onEditClick={handleEditClick}
              onSave={handleSave}
              onCancel={handleCancel}
              onFieldChange={handleFieldChange}
              onFalsePositiveComplete={async () => {
                // 오탐 처리 후 데이터 다시 로드
                const [active, completed, statsData, hotspotsData] = await Promise.all([
                  getActiveFires(),
                  getCompletedFires(),
                  getFireStats(),
                  getFireHotspots('this_month', 1),
                ]);
                const filteredActive = active.filter(f => f.type === '화재');
                const filteredCompleted = completed.filter(f => f.type === '화재');
                const filteredActiveFinal = filteredActive.filter(f => !completedIncidents.has(f.cctvId));
                setActiveFires(filteredActiveFinal);
                setCompletedFires(filteredCompleted);
                setFireCount(filteredActiveFinal.length);
                setStats(statsData);
                setHotspots(hotspotsData);
              }}
            />
          ) : (
            /* 수동 등록 - 간단한 모달 */
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedDetail(null)}>
              <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 border-b border-gray-200" style={{ backgroundColor: 'var(--ecoguard-header-bg)' }}>
                  <h2 className="text-xl font-semibold text-gray-100">상세정보</h2>
                  <button onClick={() => { setSelectedDetail(null); setIsEditing(false); }} className="text-gray-100 hover:text-white transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="p-6">
                  {/* 상세정보 패널 - 전체 너비 */}
                  <div className="flex flex-col">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">상세정보 내용</h3>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-5 flex-1">
                      {/* 왼쪽 열 - 기본 정보 */}
                      <div className="space-y-4">
                        <div><label className="text-sm text-gray-600">사고 코드</label><p className="text-gray-900 mt-1">{selectedDetail.accidentCode}</p></div>
                        <div><label className="text-sm text-gray-600">발생시간</label><p className="text-gray-900 mt-1">{selectedDetail.time}</p></div>
                        <div><label className="text-sm text-gray-600">유형</label><p className="text-gray-900 mt-1">화재</p></div>
                        <div>
                          <label className="text-sm text-gray-600">심각도</label>
                          {isEditing && editedDetail ? (
                            <select value={editedDetail.severity} onChange={(e) => handleFieldChange('severity', e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900" style={{ borderRadius: '0px' }}>
                              <option value="상">상</option>
                              <option value="중">중</option>
                              <option value="하">하</option>
                            </select>
                          ) : (
                            <p className="mt-1"><span className={`px-2 py-1 text-xs ${selectedDetail.severity === '상' ? 'bg-red-100 text-red-700' : selectedDetail.severity === '중' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`} style={{ borderRadius: '0px' }}>{selectedDetail.severity}</span></p>
                          )}
                        </div>
                        <div><label className="text-sm text-gray-600">상태</label><p className="text-gray-900 mt-1">{selectedDetail.status}</p></div>
                        <div><label className="text-sm text-gray-600">처리자</label><p className="text-gray-900 mt-1">{selectedDetail.handler}</p></div>
                        <div><label className="text-sm text-gray-600">탐지근거</label><p className="text-gray-900 mt-1">수동 등록</p></div>
                      </div>
                      {/* 오른쪽 열 - 추가 정보 */}
                      <div className="space-y-4">
                        <div><label className="text-sm text-gray-600">위치</label><p className="text-gray-900 mt-1">{selectedDetail.location || '-'}</p></div>
                        <div>
                          <label className="text-sm text-gray-600">메모</label>
                          {isEditing && editedDetail ? (
                            <textarea value={(editedDetail as any).memo || ''} onChange={(e) => handleFieldChange('note', e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-300" style={{ borderRadius: '0px' }} rows={3} />
                          ) : (
                            <p className="text-gray-900 mt-1">{(selectedDetail as any).memo || '-'}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 하단 버튼 */}
                    <div className="flex justify-end gap-3 mt-4">
                      {isEditing ? (
                        <>
                          <button onClick={handleCancel} className="px-6 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors" style={{ borderRadius: '0px' }}>
                            취소
                          </button>
                          <button onClick={handleSave} className="px-6 py-2 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2" style={{ borderRadius: '0px' }}>
                            <Save className="w-4 h-4" />
                            저장
                          </button>
                        </>
                      ) : (
                        <button onClick={handleEditClick} className="px-6 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors flex items-center justify-center gap-2" style={{ borderRadius: '0px' }}>
                          <Edit2 className="w-4 h-4" />
                          수정
                        </button>
                      )}
                    </div>
                  </div>
                </div>
            </div>
          </div>
        )}
        </>
      )}

      {/* 신규 기록 등록 모달 */}
      {showNewRecordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl shadow-xl" style={{ borderRadius: '0px', maxHeight: '90vh', overflow: 'auto' }}>
            {/* 모달 헤더 */}
            <div className="bg-emerald-600 px-6 py-4 flex items-center justify-between sticky top-0">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-white" />
                <h2 className="text-white font-semibold">신규 화재 사건 등록</h2>
              </div>
              <button
                onClick={() => {
                  setShowNewRecordModal(false);
                  setCanSendAlert(false);
                  setNewRecord({
                    time: '',
                    location: '',
                    severity: 'medium',
                    memo: ''
                  });
                }}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 모달 내용 */}
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-6">
                <span className="text-red-500">*</span> 표시는 필수 입력 항목입니다.
              </p>

              <div className="space-y-5">
                {/* 필수 입력 항목 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="text-red-500">*</span> 발생시간
                  </label>
                  <input
                    type="datetime-local"
                    value={newRecord.time}
                    onChange={(e) => setNewRecord({...newRecord, time: e.target.value})}
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
                    onChange={(e) => setNewRecord({...newRecord, location: e.target.value})}
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
                    onChange={(e) => setNewRecord({...newRecord, severity: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    style={{ borderRadius: '0px' }}
                  >
                    <option value="low">하</option>
                    <option value="medium">중</option>
                    <option value="high">상</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">메모</label>
                  <textarea
                    value={newRecord.memo}
                    onChange={(e) => setNewRecord({...newRecord, memo: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    style={{ borderRadius: '0px' }}
                    rows={3}
                    placeholder="메모를 입력하세요 (선택사항)"
                  />
                </div>
              </div>

              {/* 버튼 - 크게 */}
              <div className="grid grid-cols-2 gap-4 mt-6">
                <button
                  onClick={handleNewRecordSubmit}
                  className="px-6 py-4 bg-emerald-600 text-white text-lg font-semibold hover:bg-emerald-700 transition-colors"
                  style={{ borderRadius: '0px' }}
                >
                  등록
                </button>
                <button
                  onClick={() => {
                    if (canSendAlert) {
                      alert('119 및 담당 직원에게 문자 신고가 발송되었습니다.');
                      setShowNewRecordModal(false);
                      setCanSendAlert(false);
                      setNewRecord({
                        time: '',
                        location: '',
                        severity: 'medium',
                        memo: ''
                      });
                    }
                  }}
                  disabled={!canSendAlert}
                  className={`px-6 py-4 text-white text-lg font-semibold transition-colors ${
                    canSendAlert 
                      ? 'bg-red-600 hover:bg-red-700 cursor-pointer' 
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                  style={{ borderRadius: '0px' }}
                >
                  문자 신고
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}