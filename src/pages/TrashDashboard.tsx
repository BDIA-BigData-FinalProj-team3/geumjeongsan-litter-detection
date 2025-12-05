import React, { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, Clock, MapPin, HelpCircle, User, LogOut, X, Video, Image as ImageIcon, Map, Search, ChevronDown, Plus } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import HamburgerMenuButton from '../components/HamburgerMenuButton';
import { useNavigate, useLocation } from 'react-router-dom';
import { useIncidentCount } from '../contexts/IncidentCountContext';
import { getActiveTrashIncidents, getCompletedTrashIncidents } from '../services/api';

interface TrashDashboardProps {
  onNavigate?: (screen: string) => void;
}

interface TrashDetail {
  id: number;
  accidentCode: string;
  cctvId: string;
  time: string;
  status: string;
  severity: string;
  type: string;
  handler: string;
  location?: string;
  detectionBasis?: string;
  responseTime?: string;
  duration?: string;
}

export default function TrashDashboard({ onNavigate }: TrashDashboardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { setTrashCount, addCompletedIncident, completedIncidents } = useIncidentCount();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<'active' | 'completed'>('active');
  const [showTooltip, setShowTooltip] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<TrashDetail | null>(null);
  const [searchCode, setSearchCode] = useState('');
  const [highlightedCode, setHighlightedCode] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState<number | null>(null);
  
  // 신규 기록 등록 모달
  const [showNewRecordModal, setShowNewRecordModal] = useState(false);
  const [newRecord, setNewRecord] = useState({
    cctvId: '',
    time: '',
    type: '',
    location: '',
    severity: 'medium',
    handler: '',
    detectionBasis: ''
  });
  
  // 데이터 상태 관리
  const [activeTrashIncidents, setActiveTrashIncidents] = useState<any[]>([]);
  const [completedTrashIncidents, setCompletedTrashIncidents] = useState<any[]>([]);

  // API에서 데이터 로드
  useEffect(() => {
    const loadTrashData = async () => {
      const [active, completed] = await Promise.all([
        getActiveTrashIncidents(),
        getCompletedTrashIncidents(),
      ]);
      const filteredActive = active.filter(t => !completedIncidents.has(t.cctvId));
      setActiveTrashIncidents(filteredActive);
      setCompletedTrashIncidents(completed);
    };
    
    loadTrashData();
  }, [completedIncidents]);

  // 초기 카운트 설정 및 activeTrashIncidents 변경 시 카운트 업데이트
  useEffect(() => {
    setTrashCount(activeTrashIncidents.length);
  }, [activeTrashIncidents, setTrashCount]);

  // 기존 completedTrashIncidents 초기값 제거 (API에서 로드하므로)
  const _ignoredCompletedData = [
    { id: 4, accidentCode: 'TRASH-004', cctvId: 'CCTV-002', time: '2025-11-25 13:00', responseTime: '2025-11-25 13:28', duration: '28분', status: '처리완료', severity: 'low', type: '음식물', handler: '환경 관리 직원', location: '등산로 2', detectionBasis: 'AI 자동 탐지: 음식물 쓰레기 투기 감지' },
    { id: 5, accidentCode: 'TRASH-005', cctvId: 'CCTV-004', time: '2025-11-25 12:00', responseTime: '2025-11-25 12:35', duration: '35분', status: '처리완료', severity: 'medium', type: '플라스틱', handler: '환경 관리 직원', location: '휴게소 1', detectionBasis: 'AI 자동 탐지: 플라스틱 쓰레기 투기 감지' },
    { id: 6, accidentCode: 'TRASH-006', cctvId: 'CCTV-003', time: '2025-11-25 11:00', responseTime: '2025-11-25 11:30', duration: '30분', status: '처리완료', severity: 'low', type: '일반쓰레기', handler: '환경 관리 직원', location: '등산로 3', detectionBasis: 'AI 자동 탐지: 쓰레기 투기 행위 감지' },
    { id: 19, accidentCode: 'TRASH-019', cctvId: 'CCTV-020', time: '2025-11-25 10:45', responseTime: '2025-11-25 11:10', duration: '25분', status: '처리완료', severity: 'medium', type: '대형쓰레기', handler: '환경 관리 직원', location: '등산로 8', detectionBasis: 'AI 자동 탐지: 대형 쓰레기 투기 감지' },
    { id: 20, accidentCode: 'TRASH-020', cctvId: 'CCTV-021', time: '2025-11-25 10:30', responseTime: '2025-11-25 10:55', duration: '25분', status: '처리완료', severity: 'high', type: '플라스틱', handler: '환경 관리 직원', location: '전망대 5', detectionBasis: 'AI 자동 탐지: 플라스틱 쓰레기 투기 감지' },
    { id: 21, accidentCode: 'TRASH-021', cctvId: 'CCTV-022', time: '2025-11-25 10:15', responseTime: '2025-11-25 10:40', duration: '25분', status: '처리완료', severity: 'low', type: '음식물', handler: '환경 관리 직원', location: '휴게소 5', detectionBasis: 'AI 자동 탐지: 음식물 쓰레기 투기 감지' },
    { id: 22, accidentCode: 'TRASH-022', cctvId: 'CCTV-023', time: '2025-11-25 10:00', responseTime: '2025-11-25 10:25', duration: '25분', status: '처리완료', severity: 'medium', type: '일반쓰레기', handler: '환경 관리 직원', location: '등산로 9', detectionBasis: 'AI 자동 탐지: 쓰레기 투기 행위 감지' },
    { id: 23, accidentCode: 'TRASH-023', cctvId: 'CCTV-024', time: '2025-11-25 09:45', responseTime: '2025-11-25 10:10', duration: '25분', status: '처리완료', severity: 'high', type: '대형쓰레기', handler: '환경 관리 직원', location: '등산로 10', detectionBasis: 'AI 자동 탐지: 대형 쓰레기 투기 감지' },
    { id: 24, accidentCode: 'TRASH-024', cctvId: 'CCTV-025', time: '2025-11-25 09:30', responseTime: '2025-11-25 09:55', duration: '25분', status: '처리완료', severity: 'medium', type: '플라스틱', handler: '환경 관리 직원', location: '전망대 6', detectionBasis: 'AI 자동 탐지: 플라스틱 쓰레기 투기 감지' },
    { id: 25, accidentCode: 'TRASH-025', cctvId: 'CCTV-026', time: '2025-11-25 09:15', responseTime: '2025-11-25 09:40', duration: '25분', status: '처리완료', severity: 'low', type: '음식물', handler: '환경 관리 직원', location: '휴게소 6', detectionBasis: 'AI 자동 탐지: 음식물 쓰레기 투기 감지' },
    { id: 26, accidentCode: 'TRASH-026', cctvId: 'CCTV-027', time: '2025-11-25 09:00', responseTime: '2025-11-25 09:25', duration: '25분', status: '처리완료', severity: 'medium', type: '일반쓰레기', handler: '환경 관리 직원', location: '등산로 11', detectionBasis: 'AI 자동 탐지: 쓰레기 투기 행위 감지' },
    { id: 27, accidentCode: 'TRASH-027', cctvId: 'CCTV-028', time: '2025-11-25 08:45', responseTime: '2025-11-25 09:10', duration: '25분', status: '처리완료', severity: 'high', type: '대형쓰레기', handler: '환경 관리 직원', location: '등산로 12', detectionBasis: 'AI 자동 탐지: 대형 쓰레기 투기 감지' },
    { id: 28, accidentCode: 'TRASH-028', cctvId: 'CCTV-029', time: '2025-11-25 08:30', responseTime: '2025-11-25 08:55', duration: '25분', status: '처리완료', severity: 'medium', type: '플라스틱', handler: '환경 관리 직원', location: '전망대 7', detectionBasis: 'AI 자동 탐지: 플라스틱 쓰레기 투기 감지' },
    { id: 29, accidentCode: 'TRASH-029', cctvId: 'CCTV-030', time: '2025-11-25 08:15', responseTime: '2025-11-25 08:40', duration: '25분', status: '처리완료', severity: 'low', type: '음식물', handler: '환경 관리 직원', location: '휴게소 7', detectionBasis: 'AI 자동 탐지: 음식물 쓰레기 투기 감지' },
    { id: 30, accidentCode: 'TRASH-030', cctvId: 'CCTV-031', time: '2025-11-25 08:00', responseTime: '2025-11-25 08:25', duration: '25분', status: '처리완료', severity: 'medium', type: '일반쓰레기', handler: '환경 관리 직원', location: '등산로 13', detectionBasis: 'AI 자동 탐지: 쓰레기 투기 행위 감지' },
    { id: 31, accidentCode: 'TRASH-031', cctvId: 'CCTV-032', time: '2025-11-25 07:45', responseTime: '2025-11-25 08:10', duration: '25분', status: '처리완료', severity: 'high', type: '대형쓰레기', handler: '환경 관리 직원', location: '등산로 14', detectionBasis: 'AI 자동 탐지: 대형 쓰레기 투기 감지' },
    { id: 32, accidentCode: 'TRASH-032', cctvId: 'CCTV-033', time: '2025-11-25 07:30', responseTime: '2025-11-25 07:55', duration: '25분', status: '처리완료', severity: 'medium', type: '플라스틱', handler: '환경 관리 직원', location: '전망대 8', detectionBasis: 'AI 자동 탐지: 플라스틱 쓰레기 투기 감지' },
    { id: 33, accidentCode: 'TRASH-033', cctvId: 'CCTV-034', time: '2025-11-25 07:15', responseTime: '2025-11-25 07:40', duration: '25분', status: '처리완료', severity: 'low', type: '음식물', handler: '환경 관리 직원', location: '휴게소 8', detectionBasis: 'AI 자동 탐지: 음식물 쓰레기 투기 감지' },
  ]; // 더미 데이터는 API에서 로드하므로 무시

  // 검색 코드가 있으면 필터링, 없으면 전체 표시
  const filteredTrashIncidents = highlightedCode 
    ? (viewMode === 'active' ? activeTrashIncidents : completedTrashIncidents).filter(t => 
        t.accidentCode.toUpperCase() === highlightedCode.toUpperCase()
      )
    : (viewMode === 'active' ? activeTrashIncidents : completedTrashIncidents);
  
  const trashIncidents = filteredTrashIncidents.length > 0 ? filteredTrashIncidents : (viewMode === 'active' ? activeTrashIncidents : completedTrashIncidents);

  const updateStatus = (id: number, newStatus: string) => {
    setActiveTrashIncidents(prev => prev.map(item => 
      item.id === id 
        ? { ...item, status: newStatus }
        : item
    ));
    setStatusDropdownOpen(null);
  };

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === activeTrashIncidents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(activeTrashIncidents.map(t => t.id));
    }
  };

  const handleBatchComplete = () => {
    const now = new Date();
    const responseTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const itemsToComplete = activeTrashIncidents.filter(t => selectedIds.includes(t.id)).map(t => ({
      ...t,
      status: '처리완료',
      responseTime,
      duration: '25분'
    }));
    
    // 처리완료된 사건의 CCTV ID를 전역 상태에 추가
    itemsToComplete.forEach(item => {
      addCompletedIncident(item.cctvId);
    });
    
    const newActiveTrashIncidents = activeTrashIncidents.filter(t => !selectedIds.includes(t.id));
    setCompletedTrashIncidents(prev => [...itemsToComplete, ...prev]);
    setActiveTrashIncidents(newActiveTrashIncidents);
    setTrashCount(newActiveTrashIncidents.length);
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
      const allTrash = [...activeTrashIncidents, ...completedTrashIncidents];
      const found = allTrash.find(t => t.accidentCode.toUpperCase() === upperCode);
      if (found) {
        // 해당 사고가 완료된 것인지 확인하여 viewMode 설정
        if (completedTrashIncidents.find(t => t.id === found.id)) {
          setViewMode('completed');
        } else {
          setViewMode('active');
        }
        // 상세정보는 열지 않고 행만 하이라이트
      }
    }
  }, [location.search, activeTrashIncidents, completedTrashIncidents]);

  const handleNewRecordSubmit = () => {
    // 필수 입력 체크
    if (!newRecord.cctvId || !newRecord.time || !newRecord.type) {
      alert('CCTV ID, 발생시간, 사고 종류는 필수 입력 항목입니다.');
      return;
    }

    // 새 기록 생성 (실제로는 백엔드 API 호출)
    const newIncident = {
      id: Date.now(),
      accidentCode: `${newRecord.type.toUpperCase()}-${String(Date.now()).slice(-4)}`,
      cctvId: newRecord.cctvId,
      time: newRecord.time,
      status: '대기중',
      severity: newRecord.severity,
      type: newRecord.type,
      handler: newRecord.handler || '미배정',
      location: newRecord.location,
      detectionBasis: newRecord.detectionBasis
    };

    setActiveTrashIncidents([newIncident, ...activeTrashIncidents]);
    
    // 모달 닫고 폼 초기화
    setShowNewRecordModal(false);
    setNewRecord({
      cctvId: '',
      time: '',
      type: '',
      location: '',
      severity: 'medium',
      handler: '',
      detectionBasis: ''
    });

    alert('신규 기록이 등록되었습니다.');
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
    const allTrash = [...activeTrashIncidents, ...completedTrashIncidents];
    const found = allTrash.find(t => t.accidentCode.toUpperCase() === upperCode);
    
    if (found) {
      setHighlightedCode(upperCode);
      // 상세정보는 열지 않고 행만 하이라이트
      if (completedTrashIncidents.find(t => t.id === found.id)) {
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
        setSelectedDetail(null);
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
        <Sidebar onNavigate={onNavigate || (() => {})} currentPath="trash-dashboard" />
      </div>
      <div className="flex-1 flex flex-col relative bg-white" style={{ marginLeft: sidebarOpen ? '317.56px' : '0px', transition: 'margin-left 0.3s' }}>
        {/* 상단바 */}
        <div className="shadow-md px-6 py-4 flex items-center justify-between border-b border-gray-200" style={{ backgroundColor: '#345eaa' }}>
          <div className="flex items-center gap-3">
            <HamburgerMenuButton onClick={() => setSidebarOpen(!sidebarOpen)} />
            <Trash2 className="w-6 h-6 text-gray-200" />
            <h1 className="text-gray-100">쓰레기 투기 현황</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-8 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 shadow-sm border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600">당일 발생</span>
                    <Trash2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="text-gray-900">12건</div>
                </div>

                <div className="bg-white p-6 shadow-sm border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600">대기중</span>
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                  </div>
                  <div className="text-gray-900">2건</div>
                </div>

                <div className="bg-white p-6 shadow-sm border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600">월 평균 처리 시간</span>
                    <Clock className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="text-gray-900">32분</div>
                </div>

                <div className="bg-white p-6 shadow-sm border border-gray-200 rounded-lg relative">
                  <div 
                    className="absolute top-2 right-2"
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                  >
                    <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center cursor-help">
                      <HelpCircle className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                    </div>
                    {showTooltip && (
                      <div className="absolute right-0 bottom-8 bg-gray-900 text-white text-xs px-3 py-2 whitespace-nowrap shadow-lg" style={{ borderRadius: '4px' }}>
                        당월 8건 발생 지역
                        <div className="absolute -bottom-1 right-2 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600">다발구간</span>
                    <MapPin className="w-5 h-5 text-purple-500" />
                  </div>
                  <div className="text-gray-900">공원중앙</div>
                </div>
              </div>

              {/* Trash Incidents List */}
              <div className="bg-white shadow-sm border border-gray-200" style={{ borderRadius: '0px' }}>
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <h2 className="text-gray-900">쓰레기 투기 목록</h2>
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
                      신규 기록 등록
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
                          <th className="px-6 py-3 text-center text-gray-600 w-16">
                            <input 
                              type="checkbox" 
                              checked={selectedIds.length === activeTrashIncidents.length && activeTrashIncidents.length > 0}
                              onChange={toggleSelectAll}
                              className="w-4 h-4 cursor-pointer"
                            />
                          </th>
                        )}
                        <th className="px-6 py-3 text-left text-gray-600">사고 코드</th>
                        <th className="px-6 py-3 text-left text-gray-600">CCTV ID</th>
                        <th className="px-6 py-3 text-left text-gray-600">발생시간</th>
                        {viewMode === 'completed' && (
                          <>
                            <th className="px-6 py-3 text-left text-gray-600">처리완료시각</th>
                            <th className="px-6 py-3 text-left text-gray-600">소요시간</th>
                          </>
                        )}
                        <th className="px-6 py-3 text-left text-gray-600">심각도</th>
                        {viewMode === 'active' && (
                          <th className="px-6 py-3 text-left text-gray-600">상태</th>
                        )}
                        <th className="px-6 py-3 text-left text-gray-600">처리자</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trashIncidents.map((incident) => {
                        const isHighlighted = highlightedCode && incident.accidentCode.toUpperCase() === highlightedCode.toUpperCase();
                        return (
                        <tr 
                          key={incident.id} 
                          className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${isHighlighted ? 'bg-yellow-100' : ''}`} 
                          onClick={() => setSelectedDetail(incident)}
                        >
                          {viewMode === 'active' && (
                            <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                              <input 
                                type="checkbox" 
                                checked={selectedIds.includes(incident.id)}
                                onChange={() => toggleSelection(incident.id)}
                                className="w-4 h-4 cursor-pointer"
                              />
                            </td>
                          )}
                          <td className="px-6 py-4 text-gray-900">{incident.accidentCode}</td>
                          <td className="px-6 py-4 text-gray-900">{incident.cctvId}</td>
                          <td className="px-6 py-4 text-gray-600">{incident.time}</td>
                          {viewMode === 'completed' && 'responseTime' in incident && (
                            <>
                              <td className="px-6 py-4 text-gray-600">{incident.responseTime}</td>
                              <td className="px-6 py-4 text-gray-600">{incident.duration}</td>
                            </>
                          )}
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 text-sm ${
                              incident.severity === 'high' 
                                ? 'bg-red-100 text-red-700' 
                                : incident.severity === 'medium'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-blue-100 text-blue-700'
                            }`} style={{ borderRadius: '0px' }}>
                              {incident.severity === 'high' ? '상' : incident.severity === 'medium' ? '중' : '하'}
                            </span>
                          </td>
                          {viewMode === 'active' && (
                            <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                              <div className="relative inline-block">
                                <button 
                                  onClick={() => setStatusDropdownOpen(statusDropdownOpen === incident.id ? null : incident.id)}
                                  className={`px-3 py-1.5 text-xs cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-2 ${
                                    incident.status === '대응중' 
                                      ? 'bg-green-100 text-green-700' 
                                      : incident.status === '대기중'
                                      ? 'bg-orange-100 text-orange-700'
                                      : 'bg-gray-100 text-gray-700'
                                  }`} 
                                  style={{ borderRadius: '0px', minWidth: '90px' }}
                                >
                                  <span>{incident.status}</span>
                                  <ChevronDown className="w-3.5 h-3.5 ml-auto" />
                                </button>
                                {statusDropdownOpen === incident.id && (
                                  <div className="absolute top-full left-0 mt-1 bg-white shadow-lg border border-gray-200 z-10 min-w-[100px]" style={{ borderRadius: '0px' }}>
                                    <button
                                      onClick={() => updateStatus(incident.id, '대기중')}
                                      className="w-full px-3 py-2 text-left text-sm hover:bg-orange-50 text-gray-700"
                                    >
                                      대기중
                                    </button>
                                    <button
                                      onClick={() => updateStatus(incident.id, '대응중')}
                                      className="w-full px-3 py-2 text-left text-sm hover:bg-green-50 text-gray-700"
                                    >
                                      대응중
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          )}
                          <td className="px-6 py-4 text-gray-600">{incident.handler}</td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
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
            <div className="flex items-center justify-between p-6 border-b border-gray-200" style={{ backgroundColor: '#345eaa' }}>
              <h2 className="text-xl font-semibold text-gray-100">상세정보</h2>
              <button onClick={() => setSelectedDetail(null)} className="text-gray-100 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* 모달 내용 */}
            <div className="flex p-6 gap-6">
              {/* 좌측 패널 */}
              <div className="flex-1 flex flex-col gap-4">
                {/* 지도 영역 */}
                <div className="bg-gray-100 border border-gray-300 flex items-center justify-center" style={{ height: '400px', borderRadius: '0px' }}>
                  <div className="text-center text-gray-500">
                    <Map className="w-12 h-12 mx-auto mb-2" />
                    <p>지도 및 해당 위치에 아이콘</p>
                  </div>
                </div>
                
                {/* 영상/이미지 영역 */}
                <div className="flex gap-4">
                  <div className="flex-1 bg-gray-100 border border-gray-300 flex items-center justify-center" style={{ height: '150px', borderRadius: '0px' }}>
                    <div className="text-center text-gray-500">
                      <Video className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm">영상</p>
                    </div>
                  </div>
                  <div className="flex-1 bg-gray-100 border border-gray-300 flex items-center justify-center" style={{ height: '150px', borderRadius: '0px' }}>
                    <div className="text-center text-gray-500">
                      <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm">이미지</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 우측 패널 */}
              <div className="flex-1 flex flex-col">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">상세정보 내용</h3>
                <div className="space-y-4 flex-1">
                  <div>
                    <label className="text-sm text-gray-600">사고 코드</label>
                    <p className="text-gray-900 mt-1">{selectedDetail.accidentCode}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">CCTV ID</label>
                    <p className="text-gray-900 mt-1">{selectedDetail.cctvId}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">유형</label>
                    <p className="text-gray-900 mt-1">{selectedDetail.type}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">발생시간</label>
                    <p className="text-gray-900 mt-1">{selectedDetail.time}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">심각도</label>
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
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">상태</label>
                    <p className="mt-1">
                      <span className={`px-2 py-1 text-xs ${
                        selectedDetail.status === '처리완료'
                          ? 'bg-green-100 text-green-700' 
                          : selectedDetail.status === '대응중'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-gray-100 text-gray-700'
                      }`} style={{ borderRadius: '0px' }}>
                        {selectedDetail.status}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">처리자</label>
                    <p className="text-gray-900 mt-1">{selectedDetail.handler}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">탐지근거</label>
                    <p className="text-gray-900 mt-1">{selectedDetail.detectionBasis || 'AI 자동 탐지'}</p>
                  </div>
                  {selectedDetail.location && (
                    <div>
                      <label className="text-sm text-gray-600">위치</label>
                      <p className="text-gray-900 mt-1">{selectedDetail.location}</p>
                    </div>
                  )}
                  {selectedDetail.responseTime && (
                    <div>
                      <label className="text-sm text-gray-600">처리완료시각</label>
                      <p className="text-gray-900 mt-1">{selectedDetail.responseTime}</p>
                    </div>
                  )}
                  {selectedDetail.duration && (
                    <div>
                      <label className="text-sm text-gray-600">소요시간</label>
                      <p className="text-gray-900 mt-1">{selectedDetail.duration}</p>
                    </div>
                  )}
                </div>

                {/* 하단 버튼 */}
                <div className="flex gap-3 mt-6">
                  <button className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors" style={{ borderRadius: '0px' }}>
                    수정
                  </button>
                  <button className="flex-1 px-4 py-2 bg-red-500 text-white hover:bg-red-600 transition-colors" style={{ borderRadius: '0px' }}>
                    오탐처리
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 신규 기록 등록 모달 */}
      {showNewRecordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl shadow-xl" style={{ borderRadius: '0px', maxHeight: '90vh', overflow: 'auto' }}>
            {/* 모달 헤더 */}
            <div className="bg-emerald-600 px-6 py-4 flex items-center justify-between sticky top-0">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-white" />
                <h2 className="text-white font-semibold">신규 기록 등록</h2>
              </div>
              <button
                onClick={() => {
                  setShowNewRecordModal(false);
                  setNewRecord({
                    cctvId: '',
                    time: '',
                    type: '',
                    location: '',
                    severity: 'medium',
                    handler: '',
                    detectionBasis: ''
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
                <div className="bg-gray-50 p-4 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">필수 입력 항목</h3>
                  
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      <span className="text-red-500">*</span> CCTV ID
                    </label>
                    <input
                      type="text"
                      value={newRecord.cctvId}
                      onChange={(e) => setNewRecord({...newRecord, cctvId: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      style={{ borderRadius: '0px' }}
                      placeholder="CCTV ID를 입력하세요"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      <span className="text-red-500">*</span> 발생시간
                    </label>
                    <input
                      type="datetime-local"
                      value={newRecord.time}
                      onChange={(e) => setNewRecord({...newRecord, time: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      style={{ borderRadius: '0px' }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      <span className="text-red-500">*</span> 사고 종류
                    </label>
                    <select
                      value={newRecord.type}
                      onChange={(e) => setNewRecord({...newRecord, type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      style={{ borderRadius: '0px' }}
                    >
                      <option value="">선택하세요</option>
                      <option value="응급">응급</option>
                      <option value="화재">화재</option>
                      <option value="쓰레기">쓰레기</option>
                      <option value="기타">기타</option>
                    </select>
                  </div>
                </div>

                {/* 선택 입력 항목 */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700">선택 입력 항목</h3>
                  
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">위치</label>
                    <input
                      type="text"
                      value={newRecord.location}
                      onChange={(e) => setNewRecord({...newRecord, location: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      style={{ borderRadius: '0px' }}
                      placeholder="위치를 입력하세요"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-2">심각도</label>
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
                    <label className="block text-sm text-gray-700 mb-2">처리자</label>
                    <input
                      type="text"
                      value={newRecord.handler}
                      onChange={(e) => setNewRecord({...newRecord, handler: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      style={{ borderRadius: '0px' }}
                      placeholder="처리자를 입력하세요"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-2">탐지 근거</label>
                    <textarea
                      value={newRecord.detectionBasis}
                      onChange={(e) => setNewRecord({...newRecord, detectionBasis: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      style={{ borderRadius: '0px' }}
                      rows={3}
                      placeholder="탐지 근거를 입력하세요"
                    />
                  </div>
                </div>
              </div>

              {/* 버튼 */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowNewRecordModal(false);
                    setNewRecord({
                      cctvId: '',
                      time: '',
                      type: '',
                      location: '',
                      severity: 'medium',
                      handler: '',
                      detectionBasis: ''
                    });
                  }}
                  className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                  style={{ borderRadius: '0px' }}
                >
                  취소
                </button>
                <button
                  onClick={handleNewRecordSubmit}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                  style={{ borderRadius: '0px' }}
                >
                  등록
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}