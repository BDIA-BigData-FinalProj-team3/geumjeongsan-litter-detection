import { HeartPulse, Activity, Clock, MapPin, HelpCircle, User, LogOut, AlertTriangle, X, Video, Image as ImageIcon, Map, Edit2, Save, Search, ChevronDown } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import HamburgerMenuButton from '../components/HamburgerMenuButton';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useIncidentCount } from '../contexts/IncidentCountContext';
import { getActiveEmergencies, getCompletedEmergencies } from '../services/api';

interface EmergencyDashboardProps {
  onNavigate?: (screen: string) => void;
}

interface EmergencyDetail {
  id: number;
  accidentCode: string;
  type: string;
  cctvId: string;
  time: string;
  status: string;
  severity: string;
  handler: string;
  location?: string;
  detectionBasis?: string;
  responseTime?: string;
  duration?: string;
  patientName?: string;
  gender?: string;
  transferHospital?: string;
}

export default function EmergencyDashboard({ onNavigate }: EmergencyDashboardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { setEmergencyCount, addCompletedIncident, completedIncidents } = useIncidentCount();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<'active' | 'completed'>('active');
  const [showTooltip, setShowTooltip] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<EmergencyDetail | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedDetail, setEditedDetail] = useState<EmergencyDetail | null>(null);
  const [searchCode, setSearchCode] = useState('');
  const [highlightedCode, setHighlightedCode] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState<number | null>(null);
  
  // 데이터 상태 관리
  const [activeEmergencies, setActiveEmergencies] = useState<any[]>([]);
  const [completedEmergencies, setCompletedEmergencies] = useState<any[]>([]);

  // API에서 데이터 로드
  useEffect(() => {
    const loadEmergencyData = async () => {
      const [active, completed] = await Promise.all([
        getActiveEmergencies(),
        getCompletedEmergencies(),
      ]);
      const filteredActive = active.filter(e => !completedIncidents.has(e.cctvId));
      setActiveEmergencies(filteredActive);
      setCompletedEmergencies(completed);
    };
    
    loadEmergencyData();
  }, [completedIncidents]);

  // 초기 카운트 설정 및 activeEmergencies 변경 시 카운트 업데이트
  useEffect(() => {
    setEmergencyCount(activeEmergencies.length);
  }, [activeEmergencies, setEmergencyCount]);

  // 검색 코드가 있으면 필터링, 없으면 전체 표시
  const filteredEmergencies = highlightedCode 
    ? (viewMode === 'active' ? activeEmergencies : completedEmergencies).filter(e => 
        e.accidentCode.toUpperCase() === highlightedCode.toUpperCase()
      )
    : (viewMode === 'active' ? activeEmergencies : completedEmergencies);
  
  const emergencies = filteredEmergencies.length > 0 ? filteredEmergencies : (viewMode === 'active' ? activeEmergencies : completedEmergencies);

  const updateStatus = (id: number, newStatus: string) => {
    setActiveEmergencies(prev => prev.map(item => 
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
    if (selectedIds.length === activeEmergencies.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(activeEmergencies.map(e => e.id));
    }
  };

  const handleBatchComplete = () => {
    const now = new Date();
    const responseTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const itemsToComplete = activeEmergencies.filter(e => selectedIds.includes(e.id)).map(e => ({
      ...e,
      status: '처리완료',
      responseTime,
      duration: '10분'
    }));
    
    // 처리완료된 사건의 CCTV ID를 전역 상태에 추가
    itemsToComplete.forEach(item => {
      addCompletedIncident(item.cctvId);
    });
    
    const newActiveEmergencies = activeEmergencies.filter(e => !selectedIds.includes(e.id));
    setCompletedEmergencies(prev => [...itemsToComplete, ...prev]);
    setActiveEmergencies(newActiveEmergencies);
    setEmergencyCount(newActiveEmergencies.length);
    setSelectedIds([]);
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setEditedDetail({ ...selectedDetail! });
  };

  const handleSave = () => {
    if (!editedDetail) return;
    
    // activeEmergencies 또는 completedEmergencies 업데이트
    if (viewMode === 'active') {
      setActiveEmergencies(prev => prev.map(e => 
        e.id === editedDetail.id ? editedDetail : e
      ));
    } else {
      setCompletedEmergencies(prev => prev.map(e => 
        e.id === editedDetail.id ? editedDetail : e
      ));
    }
    
    setSelectedDetail(editedDetail);
    setIsEditing(false);
    setEditedDetail(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedDetail(null);
  };

  const handleFieldChange = (field: keyof EmergencyDetail, value: string) => {
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
      const allEmergencies = [...activeEmergencies, ...completedEmergencies];
      const found = allEmergencies.find(e => e.accidentCode.toUpperCase() === upperCode);
      if (found) {
        // 해당 사고가 완료된 것인지 확인하여 viewMode 설정
        if (completedEmergencies.find(e => e.id === found.id)) {
          setViewMode('completed');
        } else {
          setViewMode('active');
        }
        // 상세정보는 열지 않고 행만 하이라이트
      }
    }
  }, [location.search, activeEmergencies, completedEmergencies]);

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
    const allEmergencies = [...activeEmergencies, ...completedEmergencies];
    const found = allEmergencies.find(e => e.accidentCode.toUpperCase() === upperCode);
    
    if (found) {
      setHighlightedCode(upperCode);
      // 상세정보는 열지 않고 행만 하이라이트
      if (completedEmergencies.find(e => e.id === found.id)) {
        setViewMode('completed');
      } else {
        setViewMode('active');
      }
    } else {
      // 다른 탭으로 이동
      if (upperCode.startsWith('FIRE-')) {
        navigate(`/fire?code=${upperCode}`);
      } else if (upperCode.startsWith('TRASH-')) {
        navigate(`/trash?code=${upperCode}`);
      } else if (upperCode.startsWith('EMG-')) {
        navigate(`/emergency?code=${upperCode}`);
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
        <Sidebar onNavigate={onNavigate || (() => {})} currentPath="emergency-dashboard" />
      </div>
      <div className="flex-1 flex flex-col relative bg-white" style={{ marginLeft: sidebarOpen ? '317.56px' : '0px', transition: 'margin-left 0.3s' }}>
        {/* 상단바 */}
        <div className="shadow-md px-6 py-4 flex items-center justify-between border-b border-gray-200" style={{ backgroundColor: '#345eaa' }}>
          <div className="flex items-center gap-3">
            <HamburgerMenuButton onClick={() => setSidebarOpen(!sidebarOpen)} />
            <HeartPulse className="w-6 h-6 text-gray-200" />
            <h1 className="text-gray-100">응급 상황 현황</h1>
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
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <div className="text-gray-900">3건</div>
              </div>

              <div className="bg-white p-6 shadow-sm border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">대기중</span>
                  <Activity className="w-5 h-5 text-orange-500" />
                </div>
                <div className="text-gray-900">1건</div>
              </div>

              <div className="bg-white p-6 shadow-sm border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">월 평균 처리 시간</span>
                  <Clock className="w-5 h-5 text-blue-500" />
                </div>
                <div className="text-gray-900">8.5분</div>
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
                      당월 6건 발생 지역
                      <div className="absolute -bottom-1 right-2 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">다발구간</span>
                  <MapPin className="w-5 h-5 text-purple-500" />
                </div>
                <div className="text-gray-900">등산로 2</div>
              </div>
            </div>

            {/* Emergency List */}
            <div className="bg-white shadow-sm border border-gray-200" style={{ borderRadius: '0px' }}>
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h2 className="text-gray-900">응급 사건 목록</h2>
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
                            checked={selectedIds.length === activeEmergencies.length && activeEmergencies.length > 0}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </th>
                      )}
                      <th className="px-6 py-3 text-left text-gray-600 text-sm">사고 코드</th>
                      <th className="px-6 py-3 text-left text-gray-600 text-sm">유형</th>
                      <th className="px-6 py-3 text-left text-gray-600 text-sm">CCTV ID</th>
                      <th className="px-6 py-3 text-left text-gray-600 text-sm">발생시간</th>
                      {viewMode === 'completed' && (
                        <>
                          <th className="px-6 py-3 text-left text-gray-600 text-sm">처리완료시각</th>
                          <th className="px-6 py-3 text-left text-gray-600 text-sm">소요시간</th>
                        </>
                      )}
                      <th className="px-6 py-3 text-left text-gray-600 text-sm">심각도</th>
                      {viewMode === 'active' && (
                        <th className="px-6 py-3 text-left text-gray-600 text-sm">상태</th>
                      )}
                      <th className="px-6 py-3 text-left text-gray-600 text-sm">처리자</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {emergencies.map((emergency) => {
                      const isHighlighted = highlightedCode && emergency.accidentCode.toUpperCase() === highlightedCode.toUpperCase();
                      return (
                      <tr 
                        key={emergency.id} 
                        className={`hover:bg-gray-50 cursor-pointer ${isHighlighted ? 'bg-yellow-100' : ''}`} 
                        onClick={() => { setSelectedDetail(emergency); setIsEditing(false); setEditedDetail(null); }}
                      >
                        {viewMode === 'active' && (
                          <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="checkbox" 
                              checked={selectedIds.includes(emergency.id)}
                              onChange={() => toggleSelection(emergency.id)}
                              className="w-4 h-4 cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="px-6 py-4 text-gray-900">{emergency.accidentCode}</td>
                        <td className="px-6 py-4 text-gray-900">{emergency.type}</td>
                        <td className="px-6 py-4 text-gray-600">{emergency.cctvId}</td>
                        <td className="px-6 py-4 text-gray-600 text-sm">{emergency.time}</td>
                        {viewMode === 'completed' && 'responseTime' in emergency && (
                          <>
                            <td className="px-6 py-4 text-gray-600 text-sm">{emergency.responseTime}</td>
                            <td className="px-6 py-4 text-gray-600">{emergency.duration}</td>
                          </>
                        )}
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs ${
                            emergency.severity === 'high' 
                              ? 'bg-red-100 text-red-700' 
                              : emergency.severity === 'medium'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-blue-100 text-blue-700'
                          }`} style={{ borderRadius: '0px' }}>
                            {emergency.severity === 'high' ? '상' : emergency.severity === 'medium' ? '중' : '하'}
                          </span>
                        </td>
                        {viewMode === 'active' && (
                          <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                            <div className="relative inline-block">
                              <button 
                                onClick={() => setStatusDropdownOpen(statusDropdownOpen === emergency.id ? null : emergency.id)}
                                className={`px-3 py-1.5 text-xs cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-2 ${
                                  emergency.status === '대기중' 
                                    ? 'bg-orange-100 text-orange-700' 
                                    : emergency.status === '대응중'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`} 
                                style={{ borderRadius: '0px', minWidth: '90px' }}
                              >
                                <span>{emergency.status}</span>
                                <ChevronDown className="w-3.5 h-3.5 ml-auto" />
                              </button>
                              {statusDropdownOpen === emergency.id && (
                                <div className="absolute top-full left-0 mt-1 bg-white shadow-lg border border-gray-200 z-10 min-w-[100px]" style={{ borderRadius: '0px' }}>
                                  <button
                                    onClick={() => updateStatus(emergency.id, '대기중')}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-orange-50 text-gray-700"
                                  >
                                    대기중
                                  </button>
                                  <button
                                    onClick={() => updateStatus(emergency.id, '대응중')}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-green-50 text-gray-700"
                                  >
                                    대응중
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        )}
                        <td className="px-6 py-4 text-gray-600">{emergency.handler}</td>
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
                    {isEditing && editedDetail ? (
                      <input
                        type="text"
                        value={editedDetail.type}
                        onChange={(e) => handleFieldChange('type', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                        style={{ borderRadius: '0px' }}
                      />
                    ) : (
                      <p className="text-gray-900 mt-1">{selectedDetail.type}</p>
                    )}
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
                        <option value="대응중">대응중</option>
                        <option value="처리완료">처리완료</option>
                      </select>
                    ) : (
                      <p className="mt-1">
                        <span className={`px-2 py-1 text-xs ${
                          selectedDetail.status === '대응중' || selectedDetail.status === '처리완료'
                            ? 'bg-green-100 text-green-700' 
                            : selectedDetail.status === '대기중'
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
                  {/* 환자명 및 성별 - 맨 밑에 추가 */}
                  <div>
                    <label className="text-sm text-gray-600">환자명</label>
                    {isEditing && editedDetail ? (
                      <input
                        type="text"
                        value={editedDetail.patientName ?? ''}
                        onChange={(e) => handleFieldChange('patientName', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                        style={{ borderRadius: '0px' }}
                        placeholder="미상"
                      />
                    ) : (
                      <p className="text-gray-900 mt-1">{selectedDetail.patientName || '미상'}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">성별</label>
                    {isEditing && editedDetail ? (
                      <select
                        value={editedDetail.gender || '미상'}
                        onChange={(e) => handleFieldChange('gender', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                        style={{ borderRadius: '0px' }}
                      >
                        <option value="미상">미상</option>
                        <option value="남성">남성</option>
                        <option value="여성">여성</option>
                      </select>
                    ) : (
                      <p className="text-gray-900 mt-1">{selectedDetail.gender || '미상'}</p>
                    )}
                  </div>
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
                      <button className="flex-1 px-4 py-2 bg-red-500 text-white hover:bg-red-600 transition-colors" style={{ borderRadius: '0px' }}>
                        오탐처리
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}