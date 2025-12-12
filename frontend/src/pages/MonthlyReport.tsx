import React, { useState, useEffect } from 'react';
import { FileText, Download, Printer, Calendar, ChevronLeft, ChevronRight, Plus, Trash2, Search, MessageSquare, X } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import Sidebar from '../components/Sidebar';
import HamburgerMenuButton from '../components/HamburgerMenuButton';
import { getMonthlyStats, getMajorIncidents } from '../services/api';
import { getCurrentUser } from '../services/auth';

interface MonthlyReportProps {
  onNavigate: (screen: string) => void;
}

export default function MonthlyReport({ onNavigate }: MonthlyReportProps) {
  // 오늘 날짜 기준 발행일 문자열
  const today = new Date();
  const publishDateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  const [sidebarOpen, setSidebarOpen] = useState(true);
  // 현재 달의 1일로 초기화
  const [selectedMonth, setSelectedMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [showPreview, setShowPreview] = useState(true);
  const [operationAnalysis, setOperationAnalysis] = useState('');
  const [improvements, setImprovements] = useState('');
  const [conclusion, setConclusion] = useState('');
  const [majorIncidents, setMajorIncidents] = useState<any[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<any>(null);

  // AI 탐지 vs 신고 요약 (더미 데이터)
  const aiDetectionSummary = {
    aiTotal: 120,
    manualTotal: 30,
  } as const;
  const aiTotal = aiDetectionSummary.aiTotal;
  const manualTotal = aiDetectionSummary.manualTotal;
  const total = aiTotal + manualTotal;
  const aiPercent = total > 0 ? Math.round((aiTotal / total) * 100) : 0;
  const manualPercent = 100 - aiPercent;

  // AI 정확도 요약 (더미 데이터)
  const aiAccuracySummary = [
    { type: '화재', accuracy: 92, detected: 100, correct: 92 },
    { type: '응급', accuracy: 88, detected: 50, correct: 44 },
    { type: '쓰레기', accuracy: 85, detected: 200, correct: 170 },
  ];

  // 검색 관련 상태
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    incidentId: '',
    date: '',
    type: '',
    location: '',
    severity: '',
    status: ''
  });
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [targetIncidentId, setTargetIncidentId] = useState<number | null>(null);

  // 메모 관련 상태
  const [editingMemoId, setEditingMemoId] = useState<number | null>(null);
  const [memoText, setMemoText] = useState('');

  // 로그인 사용자 정보 (localStorage의 user 사용)
  const currentUser = getCurrentUser();
  const writerName = currentUser?.name ?? '관리자';
  const writerDept = currentUser?.dept ?? '환경관리과';
  const writerPhone = currentUser?.phone ?? '051-XXX-XXXX';

  // 현재 달(미래 월 선택 제한용)
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  // API에서 데이터 로드
  useEffect(() => {
    const loadReportData = async () => {
      const [stats, incidents] = await Promise.all([
        getMonthlyStats(),
        getMajorIncidents(),
      ]);
      setMonthlyStats(stats);
      setMajorIncidents(incidents);
    };
    
    loadReportData();
  }, []);

  const handlePreviousMonth = () => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    setSelectedMonth(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + 1);

    // 새로 이동하려는 달의 1일
    const nextMonthStart = new Date(newDate.getFullYear(), newDate.getMonth(), 1);

    // 현재 달 이후면 이동 막기
    if (nextMonthStart > currentMonthStart) {
      return;
    }

    setSelectedMonth(newDate);
  };

  // 다음 달 버튼 비활성화 여부
  const isNextDisabled = (() => {
    const nextMonthStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1);
    return nextMonthStart > currentMonthStart;
  })();

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    alert('월간 보고서가 PDF로 다운로드됩니다.');
  };

  const monthStr = `${selectedMonth.getFullYear()}년 ${selectedMonth.getMonth() + 1}월`;

  // monthlyStats는 위의 useEffect에서 로드됨
  if (!monthlyStats) {
    return <div>Loading...</div>;
  }

  const handleAddIncident = () => {
    const newIncident = {
      id: Date.now(),
      incidentId: '',
      date: new Date().toISOString().split('T')[0],
      type: '화재',
      location: '',
      severity: '중',
      status: '완료',
      responseTime: '',
      memo: '',
      origin: '신고' // 기본값: 사람이 수기로 등록한 사건
    };
    setMajorIncidents([...majorIncidents, newIncident]);
  };

  const handleRemoveIncident = (id: number) => {
    setMajorIncidents(majorIncidents.filter(incident => incident.id !== id));
  };

  const handleIncidentChange = (id: number, field: string, value: string) => {
    setMajorIncidents(majorIncidents.map(incident => 
      incident.id === id ? { ...incident, [field]: value } : incident
    ));
  };

  // 검색 모달 열기
  const handleOpenSearch = (incidentId: number) => {
    // 대상 행이 없으면 모달 열지 않음
    if (!incidentId) return;
    
    setTargetIncidentId(incidentId);
    const incident = majorIncidents.find(inc => inc.id === incidentId);
    if (incident) {
      setSearchFilters({
        incidentId: incident.incidentId || '',
        date: incident.date || '',
        type: incident.type || '',
        location: incident.location || '',
        severity: incident.severity || '',
        status: incident.status || ''
      });
    }
    setShowSearchModal(true);
  };

  // 검색 실행
  const handleSearch = () => {
    // 선택된 월의 시작일과 종료일 계산
    const monthStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
    const monthEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
    const monthStartStr = monthStart.toISOString().slice(0, 10);
    const monthEndStr = monthEnd.toISOString().slice(0, 10);

    // TODO: 실제 API 호출로 사건 검색
    // 지금은 더미 데이터
    const dummyResults = [
      { id: 1, incidentId: 'INC-001', date: '2025-01-15', type: '화재', location: '금정산 정상', severity: '상', status: '처리완료' },
      { id: 2, incidentId: 'INC-002', date: '2025-01-16', type: '쓰레기', location: '금정산 중턱', severity: '중', status: '대기중' },
      { id: 3, incidentId: 'INC-003', date: '2025-01-17', type: '응급', location: '금정산 하단', severity: '하', status: '처리완료' },
      { id: 4, incidentId: 'INC-004', date: '2025-01-18', type: '낙석', location: '금정산 상단', severity: '상', status: '진행중' },
      { id: 5, incidentId: 'INC-005', date: '2025-01-19', type: '화재', location: '금정산 하단', severity: '중', status: '처리완료' },
      { id: 6, incidentId: 'INC-006', date: '2025-01-20', type: '쓰레기', location: '금정산 정상', severity: '하', status: '대기중' },
    ].filter(item => {
      // 선택된 월의 날짜 범위 내에서만 검색
      if (item.date < monthStartStr || item.date > monthEndStr) return false;
      
      if (searchFilters.incidentId && !item.incidentId.includes(searchFilters.incidentId)) return false;
      if (searchFilters.date && item.date !== searchFilters.date) return false;
      if (searchFilters.type && item.type !== searchFilters.type) return false;
      if (searchFilters.location && !item.location.includes(searchFilters.location)) return false;
      if (searchFilters.severity && item.severity !== searchFilters.severity) return false;
      if (searchFilters.status && item.status !== searchFilters.status) return false;
      return true;
    });

    setSearchResults(dummyResults.slice(0, 5)); // 최대 5개
  };

  // 검색 결과 선택
  const handleSelectSearchResult = (result: any) => {
    if (!targetIncidentId) return;

    handleIncidentChange(targetIncidentId, 'incidentId', result.incidentId);
    handleIncidentChange(targetIncidentId, 'date', result.date);
    handleIncidentChange(targetIncidentId, 'type', result.type);
    handleIncidentChange(targetIncidentId, 'location', result.location);
    handleIncidentChange(targetIncidentId, 'severity', result.severity);
    handleIncidentChange(targetIncidentId, 'status', result.status);
    setShowSearchModal(false);
    setTargetIncidentId(null);
  };

  // 메모 열기
  const handleOpenMemo = (id: number) => {
    const incident = majorIncidents.find(inc => inc.id === id);
    setEditingMemoId(id);
    setMemoText(incident?.memo || '');
  };

  // 메모 저장
  const handleSaveMemo = (id: number) => {
    handleIncidentChange(id, 'memo', memoText);
    setEditingMemoId(null);
    setMemoText('');
  };

  // 메모 취소
  const handleCancelMemo = () => {
    setEditingMemoId(null);
    setMemoText('');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar with smooth slide animation */}
      <div 
        className="fixed top-0 left-0 z-50 h-screen transition-transform duration-300 ease-in-out screen-only"
        style={{ 
          width: '317.56px', 
          backgroundColor: '#2B2847',
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)'
        }}
      >
        <Sidebar onNavigate={onNavigate} currentPath="report" />
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden relative bg-gray-50" style={{ marginLeft: sidebarOpen ? '317.56px' : '0px', transition: 'margin-left 0.3s' }}>
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm screen-only" style={{ backgroundColor: '#345eaa' }}>
          <div className="flex items-center gap-3">
            <HamburgerMenuButton onClick={() => setSidebarOpen(!sidebarOpen)} />
            <FileText className="w-6 h-6 text-gray-200" />
            <h1 className="text-gray-100">월간 보고서</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-200">{publishDateStr}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* 상단 제어 패널 */}
          <div className="bg-white p-4 mb-6 shadow-sm border border-gray-200 screen-only" style={{ borderRadius: '0px' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handlePreviousMonth}
                    className="p-2 hover:bg-gray-100 transition-colors"
                    style={{ borderRadius: '0px' }}
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-700" />
                  </button>
                  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200" style={{ borderRadius: '9999px' }}>
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    <span className="text-gray-900 text-sm">{monthStr}</span>
                  </div>
                  {!isNextDisabled && (
                    <button 
                      onClick={handleNextMonth}
                      className="p-2 hover:bg-gray-100 transition-colors"
                      style={{ borderRadius: '0px' }}
                    >
                      <ChevronRight className="w-5 h-5 text-gray-700" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  className="px-4 py-1.5 text-sm bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-2"
                  style={{ borderRadius: '9999px' }}
                >
                  <Download className="w-4 h-4" />
                  PDF 저장
                </button>
                <button
                  onClick={handlePrint}
                  className="px-4 py-1.5 text-sm bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-2"
                  style={{ borderRadius: '9999px' }}
                >
                  <Printer className="w-4 h-4" />
                  인쇄
                </button>
              </div>
            </div>
          </div>

          {/* 보고서 미리보기 */}
          {showPreview && (
            <div className="bg-white shadow-lg border border-gray-300 max-w-5xl mx-auto" style={{ borderRadius: '0px' }}>
              {/* 보고서 헤더 */}
              <div className="border-b-4 border-emerald-600 p-8 bg-gray-50">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-3 mb-4 -translate-x-3">
                    <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
                      <circle cx="16" cy="16" r="14" fill="#10B981" opacity="0.1"/>
                      <path d="M16 8 L16 12 M16 12 L13 14 M16 12 L19 14 M13 14 L13 20 L10 22 M19 14 L19 20 L22 22 M16 12 L16 24" stroke="#10B981" strokeWidth="2" strokeLinecap="round"/>
                      <circle cx="16" cy="24" r="1.5" fill="#10B981"/>
                    </svg>
                    <h1 className="text-gray-900" style={{ fontSize: '28px', fontWeight: '700' }}>Geumjeong Sentinel</h1>
                  </div>
                  <h2 className="text-gray-800 mb-2" style={{ fontSize: '24px', fontWeight: '600' }}>월간 운영 보고서</h2>
                  <p className="text-gray-600" style={{ fontSize: '18px' }}>{monthStr}</p>
                </div>
                <div className="mt-6 pt-6 border-t border-gray-300 flex justify-between text-sm text-gray-600">
                  <div>
                    <p>발행일: {publishDateStr}</p>
                    <p>담당부서: {writerDept}</p>
                  </div>
                  <div className="text-right">
                    <p>작성자: {writerName}</p>
                    <p>연락처: {writerPhone}</p>
                  </div>
                </div>
              </div>

              {/* 보고서 본문 */}
              <div className="p-8">
                {/* 1. 월간 요약 */}
                <section className="mb-8">
                  <h3 className="text-gray-900 mb-4 pb-2 border-b-2 border-gray-300" style={{ fontSize: '20px', fontWeight: '600' }}>
                    1. 월간 요약
                  </h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* 화재 감지 */}
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-gray-600 mb-1">화재 감지</p>
                          <p className="text-gray-900 mb-2" style={{ fontSize: '16px', fontWeight: '600' }}>
                            처리완료 {monthlyStats.fire.resolved}/{monthlyStats.fire.total}건
                          </p>
                          <p className="text-xs text-gray-500">처리완료율</p>
                        </div>
                        <div className="relative" style={{ width: '100px', height: '100px' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[
                                  { name: '완료', value: monthlyStats.fire.resolved },
                                  { name: '미완료', value: monthlyStats.fire.pending }
                                ]}
                                cx="50%"
                                cy="50%"
                                innerRadius={30}
                                outerRadius={40}
                                dataKey="value"
                                startAngle={90}
                                endAngle={-270}
                              >
                                <Cell fill="#60a5fa" />
                                <Cell fill="#dbeafe" />
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-gray-900 font-bold text-sm">
                              {Math.round((monthlyStats.fire.resolved / monthlyStats.fire.total) * 100)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 쓰레기 투기 */}
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-gray-600 mb-1">쓰레기 투기</p>
                          <p className="text-gray-900 mb-2" style={{ fontSize: '16px', fontWeight: '600' }}>
                            처리완료 {monthlyStats.trash.resolved}/{monthlyStats.trash.total}건
                          </p>
                          <p className="text-xs text-gray-500">처리완료율</p>
                        </div>
                        <div className="relative" style={{ width: '100px', height: '100px' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[
                                  { name: '완료', value: monthlyStats.trash.resolved },
                                  { name: '미완료', value: monthlyStats.trash.pending }
                                ]}
                                cx="50%"
                                cy="50%"
                                innerRadius={30}
                                outerRadius={40}
                                dataKey="value"
                                startAngle={90}
                                endAngle={-270}
                              >
                                <Cell fill="#60a5fa" />
                                <Cell fill="#dbeafe" />
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-gray-900 font-bold text-sm">
                              {Math.round((monthlyStats.trash.resolved / monthlyStats.trash.total) * 100)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {/* 응급 상황 */}
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-gray-600 mb-1">응급 상황</p>
                          <p className="text-gray-900 mb-2" style={{ fontSize: '16px', fontWeight: '600' }}>
                            처리완료 {monthlyStats.emergency.resolved}/{monthlyStats.emergency.total}건
                          </p>
                          <p className="text-xs text-gray-500">처리완료율</p>
                        </div>
                        <div className="relative" style={{ width: '100px', height: '100px' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[
                                  { name: '완료', value: monthlyStats.emergency.resolved },
                                  { name: '미완료', value: monthlyStats.emergency.pending }
                                ]}
                                cx="50%"
                                cy="50%"
                                innerRadius={30}
                                outerRadius={40}
                                dataKey="value"
                                startAngle={90}
                                endAngle={-270}
                              >
                                <Cell fill="#60a5fa" />
                                <Cell fill="#dbeafe" />
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-gray-900 font-bold text-sm">
                              {Math.round((monthlyStats.emergency.resolved / monthlyStats.emergency.total) * 100)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* CCTV 운영률 */}
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-gray-600 mb-1">CCTV 운영률</p>
                          <p className="text-gray-900 mb-2" style={{ fontSize: '16px', fontWeight: '600' }}>
                            정상 {monthlyStats.cctv.operational}/{monthlyStats.cctv.total}대
                          </p>
                          <p className="text-xs text-gray-500">운영률</p>
                        </div>
                        <div className="relative" style={{ width: '100px', height: '100px' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[
                                  { name: '정상', value: monthlyStats.cctv.operational },
                                  { name: '점검', value: monthlyStats.cctv.maintenance }
                                ]}
                                cx="50%"
                                cy="50%"
                                innerRadius={30}
                                outerRadius={40}
                                dataKey="value"
                                startAngle={90}
                                endAngle={-270}
                              >
                                <Cell fill="#60a5fa" />
                                <Cell fill="#dbeafe" />
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-gray-900 font-bold text-sm">
                              {Math.round((monthlyStats.cctv.operational / monthlyStats.cctv.total) * 100)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* AI 탐지 요약 */}
                <section className="mb-8">
                  <h3
                    className="text-gray-900 mb-4 pb-2 border-b-2 border-gray-300"
                    style={{ fontSize: '20px', fontWeight: '600' }}
                  >
                    AI 탐지 요약
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    {/* 왼쪽: AI 탐지 vs 신고 비율 */}
                    <div className="bg-gray-50 p-4">
                      <p className="text-sm font-semibold text-gray-800 mb-2">
                        AI 탐지 vs 신고
                      </p>
                      <p className="text-sm text-gray-700 mb-1">
                        AI 탐지: {aiTotal}건
                      </p>
                      <p className="text-sm text-gray-700 mb-1">
                        신고: {manualTotal}건
                      </p>
                      <p className="text-sm text-gray-900 font-semibold mt-2">
                        총 발생: {total}건
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        이번 달 전체 사건 {total}건 중 AI 탐지는 {aiPercent}%, 신고는 {manualPercent}%입니다.
                      </p>
                      <p className="text-[11px] text-gray-500 mt-1">
                        ※ AI 탐지 건수는 모델이 자동으로 인지한 사건 수, 신고 건수는 관리자가 직접 등록한 사건 수를 의미합니다.
                      </p>
                    </div>

                    {/* 오른쪽: AI 탐지 정확도 */}
                    <div className="bg-gray-50 p-4">
                      <p className="text-sm font-semibold text-gray-800 mb-2">
                        AI 탐지 정확도
                      </p>
                      <div className="space-y-2">
                        {aiAccuracySummary.map((item) => (
                          <div key={item.type}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-700">{item.type}</span>
                              <span className="text-xs font-semibold text-emerald-700">
                                {item.accuracy}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 h-2">
                              <div
                                className="h-2 bg-emerald-500"
                                style={{ width: `${item.accuracy}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between mt-0.5 text-[11px] text-gray-500">
                              <span>탐지: {item.detected}건</span>
                              <span>정탐: {item.correct}건</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                {/* 2. 대응 성과 */}
                <section className="mb-8 avoid-break">
                  <h3 className="text-gray-900 mb-4 pb-2 border-b-2 border-gray-300" style={{ fontSize: '20px', fontWeight: '600' }}>
                    2. 대응 성과
                  </h3>
                  <div className="bg-gray-50 p-4 mb-4">
                    <table className="w-full">
                      <thead className="border-b-2 border-gray-300">
                        <tr>
                          <th className="text-left py-3 px-4 text-gray-700">구분</th>
                          <th className="text-center py-3 px-4 text-gray-700">총 발생</th>
                          <th className="text-center py-3 px-4 text-gray-700">처리완료</th>
                          <th className="text-center py-3 px-4 text-gray-700">대기중</th>
                          <th className="text-center py-3 px-4 text-gray-700">평균 대응시간</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-gray-200">
                          <td className="py-3 px-4 text-gray-900">화재</td>
                          <td className="py-3 px-4 text-center text-gray-900">{monthlyStats.fire.total}</td>
                          <td className="py-3 px-4 text-center text-green-600">{monthlyStats.fire.resolved}</td>
                          <td className="py-3 px-4 text-center text-orange-600">{monthlyStats.fire.pending}</td>
                          <td className="py-3 px-4 text-center text-gray-900">{monthlyStats.fire.avgResponseTime}</td>
                        </tr>
                        <tr className="border-b border-gray-200">
                          <td className="py-3 px-4 text-gray-900">쓰레기 투기</td>
                          <td className="py-3 px-4 text-center text-gray-900">{monthlyStats.trash.total}</td>
                          <td className="py-3 px-4 text-center text-green-600">{monthlyStats.trash.resolved}</td>
                          <td className="py-3 px-4 text-center text-orange-600">{monthlyStats.trash.pending}</td>
                          <td className="py-3 px-4 text-center text-gray-900">{monthlyStats.trash.avgResponseTime}</td>
                        </tr>
                        <tr className="bg-gray-100 font-semibold">
                          <td className="py-3 px-4 text-gray-900">응급</td>
                          <td className="py-3 px-4 text-center text-gray-900">{monthlyStats.emergency.total}</td>
                          <td className="py-3 px-4 text-center text-green-600">{monthlyStats.emergency.resolved}</td>
                          <td className="py-3 px-4 text-center text-orange-600">{monthlyStats.emergency.pending}</td>
                          <td className="py-3 px-4 text-center text-gray-900">{monthlyStats.emergency.avgResponseTime}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* 3. 주요 사건 목록 */}
                <section className="mb-8 avoid-break">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-gray-300">
                    <h3 className="text-gray-900" style={{ fontSize: '20px', fontWeight: '600' }}>
                      3. 주요 사건 목록
                    </h3>
                    <button
                      onClick={handleAddIncident}
                      className="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-1 text-sm"
                      style={{ borderRadius: '0px' }}
                    >
                      <Plus className="w-4 h-4" />
                      사건 추가
                    </button>
                  </div>
                  <div className="bg-gray-50 p-4">
                    <table className="w-full">
                      <thead className="border-b-2 border-gray-300">
                        <tr>
                          <th className="text-left py-3 px-4 text-gray-700">사건ID</th>
                          <th className="text-left py-3 px-4 text-gray-700">발생일시</th>
                          <th className="text-left py-3 px-4 text-gray-700">유형</th>
                          <th className="text-left py-3 px-4 text-gray-700">위치</th>
                          <th className="text-center py-3 px-4 text-gray-700">심각도</th>
                          <th className="text-center py-3 px-4 text-gray-700">대응시간</th>
                          <th className="text-center py-3 px-4 text-gray-700">상태</th>
                          <th className="text-center py-3 px-4 text-gray-700">발생경로</th>
                          <th className="text-center py-3 px-4 text-gray-700">메모</th>
                          <th className="text-center py-3 px-4 text-gray-700">삭제</th>
                        </tr>
                      </thead>
                      <tbody>
                        {majorIncidents.map((incident) => (
                          <tr key={incident.id} className="border-b border-gray-200">
                            {/* 사건ID */}
                            <td className="py-3 px-4">
                              <span className="print-only text-sm text-gray-900">
                                {incident.incidentId || ''}
                              </span>
                              <div className="screen-only flex items-center gap-2">
                                <input
                                  type="text"
                                  value={incident.incidentId || ''}
                                  onChange={(e) => handleIncidentChange(incident.id, 'incidentId', e.target.value)}
                                  placeholder="사건ID"
                                  className="flex-1 px-2 py-1 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm text-gray-900"
                                  style={{ borderRadius: '0px' }}
                                />
                                <button
                                  onClick={() => handleOpenSearch(incident.id)}
                                  className="p-1 text-gray-600 hover:text-emerald-600 transition-colors"
                                  title="검색"
                                >
                                  <Search className="w-4 h-4" />
                                </button>
                              </div>
                            </td>

                            {/* 발생일시 */}
                            <td className="py-3 px-4">
                              <span className="print-only text-sm text-gray-900">
                                {incident.date}
                              </span>
                              <input
                                type="date"
                                value={incident.date}
                                onChange={(e) => handleIncidentChange(incident.id, 'date', e.target.value)}
                                min={new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1).toISOString().slice(0, 10)}
                                max={new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).toISOString().slice(0, 10)}
                                className="screen-only w-full px-2 py-1 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm text-gray-900"
                                style={{ borderRadius: '0px' }}
                              />
                            </td>

                            {/* 유형 */}
                            <td className="py-3 px-4">
                              <span className="print-only text-sm text-gray-900">
                                {incident.type}
                              </span>
                              <select
                                value={incident.type}
                                onChange={(e) => handleIncidentChange(incident.id, 'type', e.target.value)}
                                className="screen-only w-full px-2 py-1 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm text-gray-900"
                                style={{ borderRadius: '0px' }}
                              >
                                <option value="">선택</option>
                                <option value="화재">화재</option>
                                <option value="응급">응급</option>
                                <option value="쓰레기">쓰레기</option>
                                <option value="낙석">낙석</option>
                              </select>
                            </td>

                            {/* 위치 */}
                            <td className="py-3 px-4">
                              <span className="print-only text-sm text-gray-900">
                                {incident.location}
                              </span>
                              <input
                                type="text"
                                value={incident.location}
                                onChange={(e) => handleIncidentChange(incident.id, 'location', e.target.value)}
                                placeholder="위치 입력"
                                className="screen-only w-full px-2 py-1 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm text-gray-900"
                                style={{ borderRadius: '0px' }}
                              />
                            </td>

                            {/* 심각도 */}
                            <td className="py-3 px-4">
                              <span className="print-only text-sm text-gray-900">
                                {incident.severity}
                              </span>
                              <select
                                value={incident.severity}
                                onChange={(e) => handleIncidentChange(incident.id, 'severity', e.target.value)}
                                className="screen-only w-full px-2 py-1 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm text-gray-900"
                                style={{ borderRadius: '0px' }}
                              >
                                <option value="상">상</option>
                                <option value="중">중</option>
                                <option value="하">하</option>
                              </select>
                            </td>

                            {/* 대응시간 */}
                            <td className="py-3 px-4">
                              <span className="print-only text-sm text-gray-900">
                                {incident.responseTime}
                              </span>
                              <input
                                type="text"
                                value={incident.responseTime}
                                onChange={(e) => handleIncidentChange(incident.id, 'responseTime', e.target.value)}
                                placeholder="대응시간 입력"
                                className="screen-only w-full px-2 py-1 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm text-gray-900"
                                style={{ borderRadius: '0px' }}
                              />
                            </td>

                            {/* 상태 */}
                            <td className="py-3 px-4">
                              <span className="print-only text-sm text-gray-900">
                                {incident.status}
                              </span>
                              <select
                                value={incident.status}
                                onChange={(e) => handleIncidentChange(incident.id, 'status', e.target.value)}
                                className="screen-only w-full px-2 py-1 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm text-gray-900"
                                style={{ borderRadius: '0px' }}
                              >
                                <option value="완료">완료</option>
                                <option value="진행중">진행중</option>
                                <option value="대기">대기</option>
                              </select>
                            </td>

                            {/* 발생경로 */}
                            <td className="py-3 px-4">
                              <span className="print-only text-sm text-gray-900">
                                {incident.origin || '신고'}
                              </span>
                              <select
                                value={incident.origin || '신고'}
                                onChange={(e) => handleIncidentChange(incident.id, 'origin', e.target.value)}
                                className="screen-only w-full px-2 py-1 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm text-gray-900"
                                style={{ borderRadius: '0px' }}
                              >
                                <option value="AI">AI</option>
                                <option value="신고">신고</option>
                                <option value="혼합">혼합</option>
                              </select>
                            </td>

                            {/* 메모 */}
                            <td className="py-3 px-4 text-center">
                              {/* 인쇄용: 메모 내용만 출력 */}
                              <span className="print-only text-xs text-gray-700">
                                {incident.memo || ''}
                              </span>

                              {/* 화면용: 메모 편집 UI */}
                              {editingMemoId === incident.id ? (
                                <div className="screen-only flex flex-col gap-1">
                                  <textarea
                                    value={memoText}
                                    onChange={(e) => setMemoText(e.target.value)}
                                    placeholder="메모 입력"
                                    className="w-full px-2 py-1 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs text-gray-900 resize-none print-plain"
                                    style={{ borderRadius: '0px' }}
                                    rows={2}
                                  />
                                  <div className="flex gap-1 justify-center">
                                    <button
                                      onClick={() => handleSaveMemo(incident.id)}
                                      className="px-2 py-0.5 text-xs bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                                      style={{ borderRadius: '0px' }}
                                    >
                                      저장
                                    </button>
                                    <button
                                      onClick={handleCancelMemo}
                                      className="px-2 py-0.5 text-xs bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                                      style={{ borderRadius: '0px' }}
                                    >
                                      취소
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleOpenMemo(incident.id)}
                                  className="screen-only p-1 text-gray-600 hover:text-emerald-600 transition-colors"
                                  title={incident.memo ? `메모: ${incident.memo}` : '메모 추가'}
                                >
                                  <MessageSquare
                                    className="w-4 h-4"
                                    style={{ color: incident.memo ? '#059669' : '#6B7280' }}
                                  />
                                </button>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => handleRemoveIncident(incident.id)}
                                className="p-1 text-red-600 hover:bg-red-50 transition-colors"
                                style={{ borderRadius: '0px' }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* 4. 운영 현황 분석 */}
                <section className="mb-8">
                  <h3 className="text-gray-900 mb-4 pb-2 border-b-2 border-gray-300" style={{ fontSize: '20px', fontWeight: '600' }}>
                    4. 운영 현황 분석
                  </h3>
                  <div className="bg-gray-50 p-4">
                    {/* 인쇄용 텍스트 */}
                    <p className="print-only text-sm text-gray-700 whitespace-pre-wrap">
                      {operationAnalysis}
                    </p>
                    {/* 화면용 textarea */}
                    <textarea
                      value={operationAnalysis}
                      onChange={(e) => setOperationAnalysis(e.target.value)}
                      placeholder="운영 현황 분석 내용을 입력하세요..."
                      className="screen-only w-full p-3 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-gray-700 resize-none print-plain"
                      style={{ borderRadius: '0px', minHeight: '150px' }}
                    />
                  </div>
                </section>

                {/* 5. 개선사항 및 건의사항 */}
                <section className="mb-8">
                  <h3 className="text-gray-900 mb-4 pb-2 border-b-2 border-gray-300" style={{ fontSize: '20px', fontWeight: '600' }}>
                    5. 개선사항 및 건의사항
                  </h3>
                  <div className="bg-gray-50 p-4">
                    {/* 인쇄용 텍스트 */}
                    <p className="print-only text-sm text-gray-700 whitespace-pre-wrap">
                      {improvements}
                    </p>
                    {/* 화면용 textarea */}
                    <textarea
                      value={improvements}
                      onChange={(e) => setImprovements(e.target.value)}
                      placeholder="개선사항 및 건의사항 내용을 입력하세요..."
                      className="screen-only w-full p-3 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-gray-700 resize-none print-plain"
                      style={{ borderRadius: '0px', minHeight: '150px' }}
                    />
                  </div>
                </section>

                {/* 결론 */}
                <section className="mb-4">
                  <div className="bg-emerald-50 border border-emerald-200 p-6">
                    <h4 className="text-gray-900 mb-3" style={{ fontSize: '18px', fontWeight: '600' }}>결론</h4>
                    {/* 인쇄용 텍스트 */}
                    <p className="print-only text-sm text-gray-700 whitespace-pre-wrap mb-1">
                      {conclusion}
                    </p>
                    {/* 화면용 textarea */}
                    <textarea
                      value={conclusion}
                      onChange={(e) => setConclusion(e.target.value)}
                      placeholder="결론 내용을 입력하세요..."
                      className="screen-only w-full p-3 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-gray-700 resize-none bg-white print-plain"
                      style={{ borderRadius: '0px', minHeight: '100px' }}
                    />
                  </div>
                </section>

                {/* 서명란 - 페이지 하단으로 */}
                <div className="signature-footer mt-8 pt-6 border-t-2 border-gray-300">
                  <div className="text-right">
                    <p className="text-sm text-gray-600 mb-1">{publishDateStr}</p>
                    <p className="text-sm text-gray-900">환경관리과장 [인]</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 검색 모달 */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto" style={{ borderRadius: '0px' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">사건 검색</h3>
              <button
                onClick={() => {
                  setShowSearchModal(false);
                  setTargetIncidentId(null);
                }}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 검색 필터 */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <input
                type="text"
                placeholder="사건ID"
                value={searchFilters.incidentId}
                onChange={(e) => setSearchFilters({ ...searchFilters, incidentId: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="px-3 py-2 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                style={{ borderRadius: '0px' }}
              />
              <input
                type="date"
                placeholder="발생일시"
                value={searchFilters.date}
                onChange={(e) => setSearchFilters({ ...searchFilters, date: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                min={new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1).toISOString().slice(0, 10)}
                max={new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).toISOString().slice(0, 10)}
                className="px-3 py-2 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                style={{ borderRadius: '0px' }}
              />
              <select
                value={searchFilters.type}
                onChange={(e) => setSearchFilters({ ...searchFilters, type: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="px-3 py-2 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                style={{ borderRadius: '0px' }}
              >
                <option value="">유형</option>
                <option value="화재">화재</option>
                <option value="쓰레기">쓰레기</option>
                <option value="응급">응급</option>
                <option value="낙석">낙석</option>
              </select>
              <input
                type="text"
                placeholder="위치"
                value={searchFilters.location}
                onChange={(e) => setSearchFilters({ ...searchFilters, location: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="px-3 py-2 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                style={{ borderRadius: '0px' }}
              />
              <select
                value={searchFilters.severity}
                onChange={(e) => setSearchFilters({ ...searchFilters, severity: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="px-3 py-2 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                style={{ borderRadius: '0px' }}
              >
                <option value="">심각도</option>
                <option value="상">상</option>
                <option value="중">중</option>
                <option value="하">하</option>
              </select>
              <select
                value={searchFilters.status}
                onChange={(e) => setSearchFilters({ ...searchFilters, status: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="px-3 py-2 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                style={{ borderRadius: '0px' }}
              >
                <option value="">상태</option>
                <option value="처리완료">처리완료</option>
                <option value="대기중">대기중</option>
                <option value="진행중">진행중</option>
              </select>
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={handleSearch}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                style={{ borderRadius: '0px' }}
              >
                검색
              </button>
              <button
                onClick={() => {
                  setSearchFilters({
                    incidentId: '',
                    date: '',
                    type: '',
                    location: '',
                    severity: '',
                    status: ''
                  });
                  setSearchResults([]);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                style={{ borderRadius: '0px' }}
              >
                필터 초기화
              </button>
            </div>

            {/* 검색 결과 */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {searchResults.length > 0 ? (
                searchResults.map((result, index) => (
                  <div
                    key={index}
                    onClick={() => handleSelectSearchResult(result)}
                    className="p-3 border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                    style={{ borderRadius: '0px' }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-sm text-gray-900">{result.incidentId}</div>
                        <div className="text-xs text-gray-600">{result.date} | {result.type} | {result.location}</div>
                      </div>
                      <div className="text-xs text-gray-500">{result.severity} | {result.status}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">검색 결과가 없습니다.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 인쇄 스타일 */}
      <style>{`
        /* 1. 다시 여백 0으로 설정 (헤더 숨김 시도) */
        @page {
          margin: 0;
          size: auto;
        }

        @media print {
          /* 2. 스크롤 방지 및 다중 페이지 흐름 필수 설정 */
          * {
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
          }

          html, body {
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          /* 3. 메인 컨텐츠 컨테이너 */
          .bg-white.shadow-lg {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            
            /* 상단 15mm 여백 확보 */
            padding: 15mm 10mm 10mm 10mm !important; 
            
            box-shadow: none !important;
            border: none !important;
            background: white !important;
          }

          /* 4. 불필요한 UI 및 사이드바 완전 제거 (강력한 선택자 사용) */
          .screen-only, button, nav, header, aside, .fixed, .z-50 {
            display: none !important;
            opacity: 0 !important;
            visibility: hidden !important;
            width: 0 !important;
            height: 0 !important;
            overflow: hidden !important;
          }

          /* 사이드바 특정 타겟팅 (너비 스타일로 잡아서 숨김) */
          div[style*="width: 317.56px"],
          div[style*="width:317.56px"] {
            display: none !important;
          }
          
          /* 5. 사이드바 여백 강제 제거 */
          .flex-1, div[style*="margin-left"] {
            margin: 0 !important;
            margin-left: 0 !important;
            padding: 0 !important;
          }
          
          /* 루트 컨테이너 높이 제한 해제 */
          .h-screen {
            height: auto !important;
            display: block !important;
          }

          /* 6. 인쇄 전용 요소 표시 */
          .print-only {
            display: inline !important;
          }

          /* 7. 섹션 처리 */
          section {
            margin-bottom: 20px !important;
            page-break-inside: avoid;
          }
          
          /* 8. 서명란 위치 */
          .signature-footer {
            margin-top: 60px !important;
            page-break-inside: avoid !important;
          }

          /* 9. 기타 스타일 */
          .print-plain {
            border: none !important;
            resize: none !important;
            padding: 0 !important;
          }
          
          .bg-white.shadow-lg > .border-b-4 {
            padding-top: 0 !important;
            padding-bottom: 10px !important;
            border-bottom-width: 2px !important;
          }
        }

        @media screen {
          .print-only {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}