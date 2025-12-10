import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Activity, Clock, MapPin, HelpCircle, User, LogOut, AlertTriangle, X, Video, Image as ImageIcon, Map, Edit2, Save, Search, ChevronDown, Plus, ChevronLeft, ChevronRight, Flame, HeartPulse, Trash2 } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import HamburgerMenuButton from '../components/HamburgerMenuButton';
import IncidentDetailModal from '../components/IncidentDetailModal';
import { useNavigate, useLocation } from 'react-router-dom';
import { useIncidentCount } from '../contexts/IncidentCountContext';
import { getAllIncidentsStats, getAllIncidentsList, getAllIncidentDetail, createEmergency, createFire, createTrash, updateEmergencyStatus, updateFireStatus, updateTrashStatus, updateEmergencyDetail, updateFireDetail, updateTrashDetail } from '../services/api';

interface AllIncidentsDashboardProps {
  onNavigate?: (screen: string) => void;
}

// 통합 사건 타입
interface AllIncidentDetail {
  id: number;
  accidentCode: string;
  type: string; // '화재', '응급', '쓰레기'
  cctvId: string;
  time: string;
  status: string;
  severity: string;
  handler: string;
  location?: string;
  detectionBasis?: string;
  responseTime?: string;
  duration?: string;
}

export default function AllIncidentsDashboard({ onNavigate }: AllIncidentsDashboardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { addCompletedIncident } = useIncidentCount();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<'active' | 'completed'>('active');
  const [showTooltip, setShowTooltip] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<AllIncidentDetail | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedDetail, setEditedDetail] = useState<AllIncidentDetail | null>(null);
  const [searchCode, setSearchCode] = useState('');
  const [highlightedCode, setHighlightedCode] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState<number | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{top: number, left: number} | null>(null);
  
  // 신규 유형 선택 모달
  const [showTypeSelectModal, setShowTypeSelectModal] = useState(false);
  
  // 각 유형별 신규 등록 모달
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showFireModal, setShowFireModal] = useState(false);
  const [showTrashModal, setShowTrashModal] = useState(false);
  
  // 응급 신규 등록 상태
  const [showPatientInfo, setShowPatientInfo] = useState(false);
  const [showRescueInfo, setShowRescueInfo] = useState(false);
  const [canSendAlert, setCanSendAlert] = useState(false);
  const [emergencyRecord, setEmergencyRecord] = useState({
    time: '',
    location: '',
    severity: 'medium',
    memo: '',
    patientName: '',
    patientAge: '',
    patientGender: '',
    rescueTeam: '',
    transferHospital: ''
  });
  
  // 화재 신규 등록 상태
  const [canSendFireAlert, setCanSendFireAlert] = useState(false);
  const [fireRecord, setFireRecord] = useState({
    time: '',
    location: '',
    severity: 'medium',
    memo: ''
  });
  
  // 쓰레기 신규 등록 상태
  const [trashRecord, setTrashRecord] = useState({
    time: '',
    location: '',
    severity: 'medium',
    memo: '',
    trashType: '',
    amount: ''
  });
  
  // 페이지네이션
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 10;
  
  // viewMode 변경 시 페이지 리셋
  useEffect(() => {
    setCurrentPage(0);
  }, [viewMode]);
  
  // 데이터 상태 관리
  const [activeIncidents, setActiveIncidents] = useState<AllIncidentDetail[]>([]);
  const [completedIncidentsList, setCompletedIncidentsList] = useState<AllIncidentDetail[]>([]);
  const [stats, setStats] = useState({
    todayCount: 0,
    pendingCount: 0,
    avgResponseTime: 0,
    avgResponseTimeFormatted: '0분',
    hotspotLocation: '해당 없음'
  });

  // API에서 데이터 로드
  useEffect(() => {
    const loadAllIncidentsData = async () => {
      try {
        // 상단 통계 로드
        const statsData = await getAllIncidentsStats();
        setStats(statsData);

        // 진행중/처리완료 목록 로드
        const activeData = await getAllIncidentsList('active');
        const completedData = await getAllIncidentsList('completed');
        
        setActiveIncidents(activeData);
        setCompletedIncidentsList(completedData);
        
        console.log('✅ [AllIncidents] All data loaded');
      } catch (error) {
        console.error('❌ [AllIncidents] Failed to load data:', error);
      }
    };

    loadAllIncidentsData();
  }, []);  // 최초 로드만

  // viewMode 변경 시에도 데이터 새로고침 (옵션)
  useEffect(() => {
    const reloadList = async () => {
      if (viewMode === 'active') {
        const activeData = await getAllIncidentsList('active');
        setActiveIncidents(activeData);
      } else {
        const completedData = await getAllIncidentsList('completed');
        setCompletedIncidentsList(completedData);
      }
    };
    reloadList();
  }, [viewMode]);

  const incidents = viewMode === 'active' ? activeIncidents : completedIncidentsList;

  const filteredIncidents = highlightedCode 
    ? incidents.filter(e => e.accidentCode.toUpperCase() === highlightedCode.toUpperCase())
    : incidents;
  
  // 페이지네이션 적용
  const totalPages = Math.ceil(filteredIncidents.length / pageSize);
  const paginatedIncidents = filteredIncidents.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === activeIncidents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(activeIncidents.map(e => e.id));
    }
  };

  const updateStatus = async (id: number, newStatus: string, incidentType: string) => {
    try {
      // 상태 매핑 (화면 → DB)
      let dbStatus: string;
      if (incidentType === '화재') {
        dbStatus = newStatus === '진화완료' ? 'RESOLVED' 
                 : newStatus === '진화중' ? 'EXTINGUISHING' 
                 : 'PENDING';
      } else if (incidentType === '응급') {
        dbStatus = newStatus === '처리완료' ? 'RESOLVED' 
                 : newStatus === '대응중' ? 'IN_PROGRESS' 
                 : 'PENDING';
      } else {
        dbStatus = newStatus === '처리완료' ? 'RESOLVED' 
                 : newStatus === '대응중' ? 'IN_PROGRESS' 
                 : 'PENDING';
      }
      
      // 타입별 API 호출
      if (incidentType === '화재') {
        await updateFireStatus(id, dbStatus);
      } else if (incidentType === '응급') {
        await updateEmergencyStatus(id, dbStatus);
      } else {
        await updateTrashStatus(id, dbStatus);
      }
      
      // 성공 시 로컬 state 업데이트
      if (newStatus === '처리완료' || newStatus === '진화완료') {
        const now = new Date();
        const responseTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        const itemToComplete = activeIncidents.find(item => item.id === id);
        if (itemToComplete) {
          const completedItem = {
            ...itemToComplete,
            status: newStatus,
            responseTime,
            duration: '10분'
          };
          
          addCompletedIncident(itemToComplete.cctvId);
          setCompletedIncidentsList(prev => [completedItem, ...prev]);
          setActiveIncidents(prev => prev.filter(item => item.id !== id));
        }
      } else {
        // 일반 상태 변경
        setActiveIncidents(prev => prev.map(item => 
          item.id === id 
            ? { ...item, status: newStatus }
            : item
        ));
      }
      
      setStatusDropdownOpen(null);
      setDropdownPosition(null);
    } catch (error) {
      console.error('상태 업데이트 실패:', error);
      alert('상태 변경에 실패했습니다.');
    }
  };

  const handleBatchComplete = () => {
    const now = new Date();
    const responseTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const itemsToComplete = activeIncidents.filter(e => selectedIds.includes(e.id)).map(e => ({
      ...e,
      status: '처리완료',
      responseTime,
      duration: '10분'
    }));
    
    itemsToComplete.forEach(item => {
      addCompletedIncident(item.cctvId);
    });
    
    const newActiveIncidents = activeIncidents.filter(e => !selectedIds.includes(e.id));
    setCompletedIncidentsList(prev => [...itemsToComplete, ...prev]);
    setActiveIncidents(newActiveIncidents);
    setSelectedIds([]);
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setEditedDetail({ ...selectedDetail! });
  };

  const handleSave = async () => {
    if (!editedDetail) return;
    
    try {
      // 사건 유형에 따라 적절한 API 호출
      if (editedDetail.type === '응급') {
        await updateEmergencyDetail(editedDetail.id, {
          memo: editedDetail.note,
          severity: editedDetail.severity,
          patientName: editedDetail.patientName,
          patientGender: editedDetail.gender,
          transferHospital: editedDetail.transferHospital,
        });
      } else if (editedDetail.type === '화재') {
        await updateFireDetail(editedDetail.id, {
          memo: editedDetail.note,
          severity: editedDetail.severity,
        });
      } else if (editedDetail.type === '쓰레기') {
        await updateTrashDetail(editedDetail.id, {
          memo: editedDetail.note,
          severity: editedDetail.severity,
          trashType: editedDetail.trashType,
          amount: editedDetail.amount,
        });
      }
      
      // 성공 시 데이터 재로드
      const statsData = await getAllIncidentsStats();
      setStats(statsData);
      
      const allData = await getAllIncidentsList();
      const activeData = allData.filter(i => i.status === '대기중' || i.status === '대응중' || i.status === '진화중');
      const completedData = allData.filter(i => i.status === '처리완료' || i.status === '이송완료');
      
      setActiveIncidents(activeData);
      setCompletedIncidentsList(completedData);
      
      setIsEditing(false);
      setSelectedDetail(null);
      setEditedDetail(null);
      alert('수정이 완료되었습니다.');
    } catch (error) {
      console.error('저장 실패:', error);
      alert('저장에 실패했습니다.');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedDetail(null);
  };

  const handleFieldChange = (field: keyof AllIncidentDetail, value: string) => {
    if (editedDetail) {
      setEditedDetail({ ...editedDetail, [field]: value });
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
    const allIncidents = [...activeIncidents, ...completedIncidentsList];
    const found = allIncidents.find(e => e.accidentCode.toUpperCase() === upperCode);
    
    if (found) {
      setHighlightedCode(upperCode);
      if (completedIncidentsList.find(e => e.id === found.id)) {
        setViewMode('completed');
      } else {
        setViewMode('active');
      }
    } else {
      setHighlightedCode(null);
      setSelectedDetail(null);
      setSearchError('검색 결과가 없습니다.');
      setTimeout(() => setSearchError(null), 3000);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case '화재': return <Flame className="w-4 h-4" />;
      case '응급': return <HeartPulse className="w-4 h-4" />;
      case '쓰레기': return <Trash2 className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case '화재': return 'bg-red-100 text-red-700';
      case '응급': return 'bg-orange-100 text-orange-700';
      case '쓰레기': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div 
        className="fixed top-0 left-0 z-50 h-screen transition-transform duration-300 ease-in-out"
        style={{ 
          width: '317.56px', 
          backgroundColor: '#2B2847',
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)'
        }}
      >
        <Sidebar onNavigate={onNavigate || (() => {})} currentPath="all-incidents" />
      </div>
      
      <div className="flex-1 flex flex-col relative bg-white" style={{ marginLeft: sidebarOpen ? '317.56px' : '0px', transition: 'margin-left 0.3s' }}>
        {/* 상단바 */}
        <div className="shadow-md px-6 py-4 flex items-center justify-between border-b border-gray-200" style={{ backgroundColor: '#345eaa' }}>
          <div className="flex items-center gap-3">
            <HamburgerMenuButton onClick={() => setSidebarOpen(!sidebarOpen)} />
            <LayoutDashboard className="w-6 h-6 text-gray-200" />
            <h1 className="text-gray-100">전체 현황</h1>
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
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  </div>
                  <div className="text-gray-900 text-xl font-semibold">{stats.todayCount}건</div>
                </div>

                <div className="bg-white p-4 shadow-sm border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">대기중</span>
                    <Activity className="w-4 h-4 text-orange-500" />
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
                    {showTooltip && (
                      <div className="absolute right-0 bottom-8 bg-gray-900 text-white text-xs px-3 py-2 shadow-lg max-w-xs" style={{ borderRadius: '4px' }}>
                        <div className="whitespace-nowrap">
                          당월 최다 발생 지역
                        </div>
                        <div className="absolute -bottom-1 right-2 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">다발구간</span>
                    <MapPin className="w-4 h-4 text-purple-500" />
                  </div>
                  <div className="text-gray-900 text-xl font-semibold">{stats.hotspotLocation}</div>
                </div>
              </div>

              {/* 전체 사건 목록 */}
              <div className="bg-white shadow-sm border border-gray-200" style={{ borderRadius: '0px' }}>
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <h2 className="text-gray-900">전체 사건 목록</h2>
                    <span className="text-sm text-gray-600">총 {filteredIncidents.length}건</span>
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
                    {viewMode === 'active' && (
                      <button
                        onClick={() => setShowTypeSelectModal(true)}
                        className="px-3 py-1.5 bg-emerald-600 text-white text-sm hover:bg-emerald-700 transition-colors flex items-center gap-1.5"
                        style={{ borderRadius: '0px' }}
                      >
                        <Plus className="w-4 h-4" />
                        신규 사건 등록
                      </button>
                    )}

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
                        style={{ borderRadius: '9999px', width: '200px' }}
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
                  <table className="w-full" style={{ tableLayout: 'fixed' }}>
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {viewMode === 'active' && (
                          <th className="px-6 py-3 text-center text-gray-600 text-sm w-16">
                            <input 
                              type="checkbox" 
                              checked={selectedIds.length === activeIncidents.length && activeIncidents.length > 0}
                              onChange={toggleSelectAll}
                              className="w-4 h-4 cursor-pointer"
                            />
                          </th>
                        )}
                        <th className="px-6 py-3 text-left text-gray-600 text-sm" style={{ minWidth: '150px', width: '150px' }}>유형</th>
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
                        {viewMode === 'active' && (
                          <th className="px-6 py-3 text-left text-gray-600 text-sm">심각도</th>
                        )}
                        {viewMode === 'active' && (
                          <th className="px-6 py-3 text-left text-gray-600 text-sm">상태</th>
                        )}
                        <th className="px-6 py-3 text-left text-gray-600 text-sm">처리자</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {paginatedIncidents.map((incident) => {
                        const isHighlighted = highlightedCode && incident.accidentCode.toUpperCase() === highlightedCode.toUpperCase();
                        return (
                        <tr 
                          key={incident.id} 
                          className={`hover:bg-gray-50 cursor-pointer ${isHighlighted ? 'bg-yellow-100' : ''}`} 
                          onClick={async () => { 
                            try {
                              const detail = await getAllIncidentDetail(incident.id);
                              if (detail) {
                                setSelectedDetail(detail as any);
                                setIsEditing(false);
                                setEditedDetail(null);
                              }
                            } catch (error) {
                              console.error('❌ [AllIncidents] Failed to load detail:', error);
                              // 실패 시 목록 데이터 사용
                              setSelectedDetail(incident as any);
                              setIsEditing(false);
                              setEditedDetail(null);
                            }
                          }}
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
                          <td className="px-6 py-4" style={{ minWidth: '150px', width: '150px' }}>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold whitespace-nowrap ${getTypeColor(incident.type)}`} style={{ borderRadius: '0px' }}>
                              {getTypeIcon(incident.type)}
                              {incident.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-900">{incident.accidentCode}</td>
                          <td className="px-6 py-4" style={{ minWidth: '130px', width: '130px' }}>
                            <span className={`inline-flex items-center px-2 py-1 text-xs font-medium whitespace-nowrap ${
                              incident.detectionBasis?.includes('AI') || incident.detectionBasis?.includes('자동')
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-700'
                            }`} style={{ borderRadius: '0px' }}>
                              {incident.detectionBasis?.includes('AI') || incident.detectionBasis?.includes('자동') ? 'AI 자동 탐지' : '수동 등록'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-gray-900">{incident.location}</div>
                            <div className="text-xs text-gray-500">{incident.cctvId}</div>
                          </td>
                          <td className="px-6 py-4 text-gray-600 text-sm">{incident.time}</td>
                          {viewMode === 'completed' && (
                            <>
                              <td className="px-6 py-4 text-gray-600 text-sm">{incident.responseTime || '-'}</td>
                              <td className="px-6 py-4 text-gray-600">{incident.duration || '-'}</td>
                            </>
                          )}
                          {viewMode === 'active' && (
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 text-xs ${
                                incident.severity === '상' 
                                  ? 'bg-red-100 text-red-700' 
                                  : incident.severity === '중'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`} style={{ borderRadius: '0px' }}>
                                {incident.severity}
                              </span>
                            </td>
                          )}
                          {viewMode === 'active' && (
                            <td className="px-6 py-4 overflow-visible" onClick={(e) => e.stopPropagation()}>
                              <div className="relative inline-block">
                                <button 
                                  onClick={(e) => {
                                    if (statusDropdownOpen === incident.id) {
                                      setStatusDropdownOpen(null);
                                      setDropdownPosition(null);
                                    } else {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      setDropdownPosition({
                                        top: rect.bottom + window.scrollY,
                                        left: rect.left + window.scrollX
                                      });
                                      setStatusDropdownOpen(incident.id);
                                    }
                                  }}
                                  className={`px-3 py-1.5 text-xs cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-2 ${
                                    incident.status === '대기중' 
                                      ? 'bg-orange-100 text-orange-700' 
                                      : incident.status === '대응중' || incident.status === '진화중' || incident.status === '처리중'
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-gray-100 text-gray-700'
                                  }`} 
                                  style={{ borderRadius: '0px', minWidth: '90px' }}
                                >
                                  <span>{incident.status}</span>
                                  <ChevronDown className="w-3.5 h-3.5 ml-auto" />
                                </button>
                                {statusDropdownOpen === incident.id && dropdownPosition && (
                                  <div 
                                    className="fixed bg-white shadow-lg border border-gray-200 min-w-[100px]" 
                                    style={{ 
                                      borderRadius: '0px',
                                      top: `${dropdownPosition.top + 4}px`,
                                      left: `${dropdownPosition.left}px`,
                                      zIndex: 9999
                                    }}
                                  >
                                    <button
                                      onClick={() => updateStatus(incident.id, '대기중', incident.type)}
                                      className="w-full px-3 py-2 text-left text-sm hover:bg-orange-50 text-gray-700"
                                    >
                                      대기중
                                    </button>
                                    <button
                                      onClick={() => updateStatus(incident.id, 
                                        incident.type === '화재' ? '진화중' : 
                                        incident.type === '응급' ? '대응중' : '처리중',
                                        incident.type
                                      )}
                                      className="w-full px-3 py-2 text-left text-sm hover:bg-green-50 text-gray-700"
                                    >
                                      {incident.type === '화재' ? '진화중' : 
                                       incident.type === '응급' ? '대응중' : '처리중'}
                                    </button>
                                    <button
                                      onClick={() => updateStatus(incident.id, 
                                        incident.type === '화재' ? '진화완료' : '처리완료',
                                        incident.type
                                      )}
                                      className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 text-gray-700"
                                    >
                                      {incident.type === '화재' ? '진화완료' : '처리완료'}
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

      {/* 유형 선택 모달 */}
      {showTypeSelectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowTypeSelectModal(false)}>
          <div className="bg-white w-full max-w-md shadow-xl p-6" style={{ borderRadius: '0px' }} onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">신규 사건 유형 선택</h2>
            <p className="text-sm text-gray-600 mb-6">등록할 사건의 유형을 선택하세요</p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowTypeSelectModal(false);
                  setShowEmergencyModal(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-orange-100 hover:bg-orange-200 transition-colors"
                style={{ borderRadius: '0px' }}
              >
                <HeartPulse className="w-5 h-5 text-orange-700" />
                <span className="font-semibold text-orange-700">응급</span>
              </button>
              <button
                onClick={() => {
                  setShowTypeSelectModal(false);
                  setShowFireModal(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-red-100 hover:bg-red-200 transition-colors"
                style={{ borderRadius: '0px' }}
              >
                <Flame className="w-5 h-5 text-red-700" />
                <span className="font-semibold text-red-700">화재</span>
              </button>
              <button
                onClick={() => {
                  setShowTypeSelectModal(false);
                  setShowTrashModal(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-green-100 hover:bg-green-200 transition-colors"
                style={{ borderRadius: '0px' }}
              >
                <Trash2 className="w-5 h-5 text-green-700" />
                <span className="font-semibold text-green-700">쓰레기</span>
              </button>
            </div>
            <button
              onClick={() => setShowTypeSelectModal(false)}
              className="w-full mt-4 px-4 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
              style={{ borderRadius: '0px' }}
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 응급 신규 등록 모달 */}
      {showEmergencyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl shadow-xl" style={{ borderRadius: '0px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="bg-emerald-600 px-6 py-4 flex items-center justify-between sticky top-0">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-white" />
                <h2 className="text-white font-semibold">신규 응급 사건 등록</h2>
              </div>
              <button
                onClick={() => {
                  setShowEmergencyModal(false);
                  setShowPatientInfo(false);
                  setShowRescueInfo(false);
                  setCanSendAlert(false);
                  setEmergencyRecord({
                    time: '',
                    location: '',
                    severity: 'medium',
                    memo: '',
                    patientName: '',
                    patientAge: '',
                    patientGender: '',
                    rescueTeam: '',
                    transferHospital: ''
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
                    value={emergencyRecord.time}
                    onChange={(e) => setEmergencyRecord({...emergencyRecord, time: e.target.value})}
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
                    value={emergencyRecord.location}
                    onChange={(e) => setEmergencyRecord({...emergencyRecord, location: e.target.value})}
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
                    value={emergencyRecord.severity}
                    onChange={(e) => setEmergencyRecord({...emergencyRecord, severity: e.target.value})}
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
                    value={emergencyRecord.memo}
                    onChange={(e) => setEmergencyRecord({...emergencyRecord, memo: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    style={{ borderRadius: '0px' }}
                    rows={3}
                    placeholder="메모를 입력하세요 (선택사항)"
                  />
                </div>
                <div className="border border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowPatientInfo(!showPatientInfo)}
                    className="w-full px-4 py-3 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-700">환자 정보</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showPatientInfo ? 'rotate-180' : ''}`} />
                  </button>
                  {showPatientInfo && (
                    <div className="p-4 space-y-4 bg-gray-50">
                      <div>
                        <label className="block text-sm text-gray-700 mb-2">환자 이름</label>
                        <input
                          type="text"
                          value={emergencyRecord.patientName}
                          onChange={(e) => setEmergencyRecord({...emergencyRecord, patientName: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          style={{ borderRadius: '0px' }}
                          placeholder="환자 이름"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-2">환자 나이</label>
                        <input
                          type="number"
                          value={emergencyRecord.patientAge}
                          onChange={(e) => setEmergencyRecord({...emergencyRecord, patientAge: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          style={{ borderRadius: '0px' }}
                          placeholder="환자 나이"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-2">환자 성별</label>
                        <select
                          value={emergencyRecord.patientGender}
                          onChange={(e) => setEmergencyRecord({...emergencyRecord, patientGender: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          style={{ borderRadius: '0px' }}
                        >
                          <option value="">선택하세요</option>
                          <option value="남성">남성</option>
                          <option value="여성">여성</option>
                          <option value="미상">미상</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
                <div className="border border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowRescueInfo(!showRescueInfo)}
                    className="w-full px-4 py-3 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-700">투입 구조팀 및 이송 병원</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showRescueInfo ? 'rotate-180' : ''}`} />
                  </button>
                  {showRescueInfo && (
                    <div className="p-4 space-y-4 bg-gray-50">
                      <div>
                        <label className="block text-sm text-gray-700 mb-2">투입 구조팀</label>
                        <input
                          type="text"
                          value={emergencyRecord.rescueTeam}
                          onChange={(e) => setEmergencyRecord({...emergencyRecord, rescueTeam: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          style={{ borderRadius: '0px' }}
                          placeholder="투입 구조팀"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-2">이송 병원 또는 인계 기관</label>
                        <input
                          type="text"
                          value={emergencyRecord.transferHospital}
                          onChange={(e) => setEmergencyRecord({...emergencyRecord, transferHospital: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          style={{ borderRadius: '0px' }}
                          placeholder="이송 병원 또는 인계 기관"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-6">
                <button
                  onClick={async () => {
                    if (!emergencyRecord.time || !emergencyRecord.location) {
                      alert('필수 항목(발생시간, 발생위치)을 입력해주세요.');
                      return;
                    }
                    try {
                      const result = await createEmergency({
                        detectedAt: new Date(emergencyRecord.time).toISOString(),
                        locationDesc: emergencyRecord.location,
                        severityLevel: emergencyRecord.severity.toUpperCase(),
                        memo: emergencyRecord.memo || undefined,
                        patientName: emergencyRecord.patientName || undefined,
                        patientAge: emergencyRecord.patientAge || undefined,
                        patientGender: emergencyRecord.patientGender || undefined,
                        responseTeam: emergencyRecord.rescueTeam || undefined,
                        transferDest: emergencyRecord.transferHospital || undefined,
                      });
                      alert(`신규 응급 사건이 등록되었습니다. (사고코드: ${result.incidentCode})`);
                      setCanSendAlert(true);
                      setShowEmergencyModal(false);
                      setShowPatientInfo(false);
                      setShowRescueInfo(false);
                      setEmergencyRecord({
                        time: '',
                        location: '',
                        severity: 'medium',
                        memo: '',
                        patientName: '',
                        patientAge: '',
                        patientGender: '',
                        rescueTeam: '',
                        transferHospital: ''
                      });
                      // 목록 새로고침
                      const [activeData, statsData] = await Promise.all([
                        getAllIncidentsList('active'),
                        getAllIncidentsStats()
                      ]);
                      setActiveIncidents(activeData);
                      setStats(statsData);
                    } catch (error: any) {
                      console.error('❌ [Emergency] Failed to create:', error);
                      const errorMsg = error?.message || '응급 사건 등록 중 오류가 발생했습니다.';
                      alert(`오류: ${errorMsg}\n\n디버그: time="${emergencyRecord.time}", location="${emergencyRecord.location}", severity="${emergencyRecord.severity}"`);
                    }
                  }}
                  className="px-6 py-4 bg-emerald-600 text-white text-lg font-semibold hover:bg-emerald-700 transition-colors"
                  style={{ borderRadius: '0px' }}
                >
                  등록
                </button>
                <button
                  onClick={() => {
                    if (canSendAlert) {
                      alert('119 및 담당 직원에게 문자 신고가 발송되었습니다.');
                      setShowEmergencyModal(false);
                      setShowPatientInfo(false);
                      setShowRescueInfo(false);
                      setCanSendAlert(false);
                      setEmergencyRecord({
                        time: '',
                        location: '',
                        severity: 'medium',
                        memo: '',
                        patientName: '',
                        patientAge: '',
                        patientGender: '',
                        rescueTeam: '',
                        transferHospital: ''
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

      {/* 화재 신규 등록 모달 */}
      {showFireModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl shadow-xl" style={{ borderRadius: '0px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="bg-emerald-600 px-6 py-4 flex items-center justify-between sticky top-0">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-white" />
                <h2 className="text-white font-semibold">신규 화재 사건 등록</h2>
              </div>
              <button
                onClick={() => {
                  setShowFireModal(false);
                  setCanSendFireAlert(false);
                  setFireRecord({
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
                    value={fireRecord.time}
                    onChange={(e) => setFireRecord({...fireRecord, time: e.target.value})}
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
                    value={fireRecord.location}
                    onChange={(e) => setFireRecord({...fireRecord, location: e.target.value})}
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
                    value={fireRecord.severity}
                    onChange={(e) => setFireRecord({...fireRecord, severity: e.target.value})}
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
                    value={fireRecord.memo}
                    onChange={(e) => setFireRecord({...fireRecord, memo: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    style={{ borderRadius: '0px' }}
                    rows={3}
                    placeholder="메모를 입력하세요 (선택사항)"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-6">
                <button
                  onClick={async () => {
                    if (!fireRecord.time || !fireRecord.location) {
                      alert('필수 항목(발생시간, 발생위치)을 입력해주세요.');
                      return;
                    }
                    try {
                      const result = await createFire({
                        detectedAt: new Date(fireRecord.time).toISOString(),
                        locationDesc: fireRecord.location,
                        severityLevel: fireRecord.severity.toUpperCase(),
                        memo: fireRecord.memo || undefined,
                      });
                      alert(`신규 화재 사건이 등록되었습니다. (사고코드: ${result.incidentCode})`);
                      setCanSendFireAlert(true);
                      setShowFireModal(false);
                      setFireRecord({
                        time: '',
                        location: '',
                        severity: 'medium',
                        memo: ''
                      });
                      // 목록 새로고침
                      const [activeData, statsData] = await Promise.all([
                        getAllIncidentsList('active'),
                        getAllIncidentsStats()
                      ]);
                      setActiveIncidents(activeData);
                      setStats(statsData);
                    } catch (error) {
                      console.error('❌ [Fire] Failed to create:', error);
                      alert('화재 사건 등록 중 오류가 발생했습니다. 다시 시도해주세요.');
                    }
                  }}
                  className="px-6 py-4 bg-emerald-600 text-white text-lg font-semibold hover:bg-emerald-700 transition-colors"
                  style={{ borderRadius: '0px' }}
                >
                  등록
                </button>
                <button
                  onClick={() => {
                    if (canSendFireAlert) {
                      alert('119 및 담당 직원에게 문자 신고가 발송되었습니다.');
                      setShowFireModal(false);
                      setCanSendFireAlert(false);
                      setFireRecord({
                        time: '',
                        location: '',
                        severity: 'medium',
                        memo: ''
                      });
                    }
                  }}
                  disabled={!canSendFireAlert}
                  className={`px-6 py-4 text-white text-lg font-semibold transition-colors ${
                    canSendFireAlert 
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

      {/* 쓰레기 신규 등록 모달 */}
      {showTrashModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl shadow-xl" style={{ borderRadius: '0px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="bg-emerald-600 px-6 py-4 flex items-center justify-between sticky top-0">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-white" />
                <h2 className="text-white font-semibold">신규 쓰레기 투기 등록</h2>
              </div>
              <button
                onClick={() => {
                  setShowTrashModal(false);
                  setTrashRecord({
                    time: '',
                    location: '',
                    severity: 'medium',
                    memo: '',
                    trashType: '',
                    amount: ''
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
                    value={trashRecord.time}
                    onChange={(e) => setTrashRecord({...trashRecord, time: e.target.value})}
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
                    value={trashRecord.location}
                    onChange={(e) => setTrashRecord({...trashRecord, location: e.target.value})}
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
                    value={trashRecord.severity}
                    onChange={(e) => setTrashRecord({...trashRecord, severity: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    style={{ borderRadius: '0px' }}
                  >
                    <option value="low">하</option>
                    <option value="medium">중</option>
                    <option value="high">상</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">쓰레기 종류</label>
                  <input
                    type="text"
                    value={trashRecord.trashType}
                    onChange={(e) => setTrashRecord({...trashRecord, trashType: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    style={{ borderRadius: '0px' }}
                    placeholder="예: 일반쓰레기, 플라스틱, 음식물 등"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">양</label>
                  <input
                    type="text"
                    value={trashRecord.amount}
                    onChange={(e) => setTrashRecord({...trashRecord, amount: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    style={{ borderRadius: '0px' }}
                    placeholder="예: 소량, 중량, 대량"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">메모</label>
                  <textarea
                    value={trashRecord.memo}
                    onChange={(e) => setTrashRecord({...trashRecord, memo: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    style={{ borderRadius: '0px' }}
                    rows={3}
                    placeholder="메모를 입력하세요 (선택사항)"
                  />
                </div>
              </div>
              <div className="mt-6">
                <button
                  onClick={async () => {
                    if (!trashRecord.time || !trashRecord.location) {
                      alert('필수 항목(발생시간, 발생위치)을 입력해주세요.');
                      return;
                    }
                    try {
                      const result = await createTrash({
                        detectedAt: new Date(trashRecord.time).toISOString(),
                        locationDesc: trashRecord.location,
                        severityLevel: trashRecord.severity.toUpperCase(),
                        memo: trashRecord.memo || undefined,
                        trashType: trashRecord.trashType || undefined,
                        amount: trashRecord.amount || undefined,
                      });
                      alert(`신규 쓰레기 투기 사건이 등록되었습니다. (사고코드: ${result.incidentCode})`);
                      setShowTrashModal(false);
                      setTrashRecord({
                        time: '',
                        location: '',
                        severity: 'medium',
                        memo: '',
                        trashType: '',
                        amount: ''
                      });
                      // 목록 새로고침
                      const [activeData, statsData] = await Promise.all([
                        getAllIncidentsList('active'),
                        getAllIncidentsStats()
                      ]);
                      setActiveIncidents(activeData);
                      setStats(statsData);
                    } catch (error) {
                      console.error('❌ [Trash] Failed to create:', error);
                      alert('쓰레기 투기 사건 등록 중 오류가 발생했습니다. 다시 시도해주세요.');
                    }
                  }}
                  className="w-full px-6 py-4 bg-emerald-600 text-white text-lg font-semibold hover:bg-emerald-700 transition-colors"
                  style={{ borderRadius: '0px' }}
                >
                  등록
                </button>
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
              type={selectedDetail.type === '화재' ? 'fire' : selectedDetail.type === '쓰레기' ? 'trash' : 'emergency'}
              detail={selectedDetail as any}
              isEditing={false}
              editedDetail={null}
              onClose={() => setSelectedDetail(null)}
              onEditClick={() => {}}
              onSave={() => {}}
              onCancel={() => {}}
              onFieldChange={(field, value) => {}}
            />
          ) : (
            /* 수동 등록 - 간단한 모달 */
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedDetail(null)}>
              <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 border-b border-gray-200" style={{ backgroundColor: '#345eaa' }}>
                  <h2 className="text-xl font-semibold text-gray-100">상세정보</h2>
                  <button onClick={() => setSelectedDetail(null)} className="text-gray-100 hover:text-white transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="flex p-6 gap-6">
                  {/* 왼쪽 패널 - 이미지/영상 */}
                  <div className="flex-1 space-y-4">
                    <div className="bg-gray-100 border border-gray-300 flex items-center justify-center" style={{ aspectRatio: '16/9', borderRadius: '0px' }}>
                      <div className="text-center text-gray-500">
                        <ImageIcon className="w-10 h-10 mx-auto mb-2" />
                        <p className="text-sm">이미지</p>
                      </div>
                    </div>
                    <div className="bg-gray-100 border border-gray-300 flex items-center justify-center" style={{ aspectRatio: '16/9', borderRadius: '0px' }}>
                      <div className="text-center text-gray-500">
                        <Video className="w-10 h-10 mx-auto mb-2" />
                        <p className="text-sm">영상</p>
                      </div>
                    </div>
                  </div>

                  {/* 우측 패널 - 상세정보 */}
                  <div className="flex-1 flex flex-col">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">상세정보 내용</h3>
                    <div className="flex gap-4 flex-1">
                      {/* 왼쪽 열 - 기본 정보 */}
                      <div className="flex-1 space-y-4">
                        <div><label className="text-sm text-gray-600">사고 코드</label><p className="text-gray-900 mt-1">{selectedDetail.accidentCode}</p></div>
                        <div><label className="text-sm text-gray-600">발생시간</label><p className="text-gray-900 mt-1">{selectedDetail.time}</p></div>
                        <div><label className="text-sm text-gray-600">유형</label><p className="text-gray-900 mt-1">{selectedDetail.type}</p></div>
                        <div><label className="text-sm text-gray-600">심각도</label><p className="mt-1"><span className={`px-2 py-1 text-xs ${selectedDetail.severity === '상' ? 'bg-red-100 text-red-700' : selectedDetail.severity === '중' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`} style={{ borderRadius: '0px' }}>{selectedDetail.severity}</span></p></div>
                        <div><label className="text-sm text-gray-600">상태</label><p className="text-gray-900 mt-1">{selectedDetail.status}</p></div>
                        <div><label className="text-sm text-gray-600">처리자</label><p className="text-gray-900 mt-1">{selectedDetail.handler}</p></div>
                        <div><label className="text-sm text-gray-600">탐지근거</label><p className="text-gray-900 mt-1">수동 등록</p></div>
                      </div>
                      {/* 오른쪽 열 - 추가 정보 */}
                      <div className="flex-1 space-y-4">
                        <div><label className="text-sm text-gray-600">위치</label><p className="text-gray-900 mt-1">{selectedDetail.location || '-'}</p></div>
                        {selectedDetail.responseTime && (
                          <div><label className="text-sm text-gray-600">처리완료시각</label><p className="text-gray-900 mt-1">{selectedDetail.responseTime}</p></div>
                        )}
                        {selectedDetail.duration && (
                          <div><label className="text-sm text-gray-600">소요시간</label><p className="text-gray-900 mt-1">{selectedDetail.duration}</p></div>
                        )}
                        <div><label className="text-sm text-gray-600">메모</label><p className="text-gray-900 mt-1">{(selectedDetail as any).memo || '-'}</p></div>
                        {selectedDetail.type === '응급' && (
                          <>
                            <div><label className="text-sm text-gray-600">환자명</label><p className="text-gray-900 mt-1">{(selectedDetail as any).patientName || '미상'}</p></div>
                            <div><label className="text-sm text-gray-600">성별</label><p className="text-gray-900 mt-1">{(selectedDetail as any).patientGender || '미상'}</p></div>
                            <div><label className="text-sm text-gray-600">이송병원 및 처리 기관</label><p className="text-gray-900 mt-1">{(selectedDetail as any).transferHospital || '-'}</p></div>
                          </>
                        )}
                        {selectedDetail.type === '쓰레기' && (
                          <>
                            <div><label className="text-sm text-gray-600">쓰레기 종류</label><p className="text-gray-900 mt-1">{(selectedDetail as any).trashType || '-'}</p></div>
                            <div><label className="text-sm text-gray-600">양</label><p className="text-gray-900 mt-1">{(selectedDetail as any).amount || '-'}</p></div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* 하단 버튼 */}
                    <div className="flex justify-end gap-3 mt-4">
                      <button className="px-6 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors flex items-center justify-center gap-2" style={{ borderRadius: '0px' }}>
                        <Edit2 className="w-4 h-4" />
                        수정
                      </button>
                    </div>
                  </div>
                </div>
            </div>
          </div>
          )}
        </>
      )}
    </div>
  );
}
