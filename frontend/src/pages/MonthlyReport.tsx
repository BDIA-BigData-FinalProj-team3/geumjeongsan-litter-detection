import React, { useState, useEffect } from 'react';
import { FileText, Download, Printer, Calendar, ChevronLeft, ChevronRight, Plus, Trash2, Search, MessageSquare, X } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import Sidebar from '../components/Sidebar';
import HamburgerMenuButton from '../components/HamburgerMenuButton';
import { getMonthlyStats, getMajorIncidents, getAvailableReportMonths, getIncidentsList } from '../services/api';
import { getCurrentUser } from '../services/auth';
import { mockMonthlyStats } from '../services/mock';
import { useRealtimeNotification } from '../contexts/RealtimeNotificationContext';
import { formatKstDate, nowKstDate } from '../utils/time';
import {
  safePct,
  labelIncidentType,
  labelIncidentStatus,
  labelSeverity,
  labelSourceType,
  normalizeIncidentType,
  normalizeIncidentStatus,
  normalizeSeverity,
  normalizeSourceType,
  normalizeDateToInput,
} from '../utils/incidentMapper';

interface MonthlyReportProps {
  onNavigate: (screen: string) => void;
}

export default function MonthlyReport({ onNavigate }: MonthlyReportProps) {
  const { refreshKey } = useRealtimeNotification();
  // 오늘 날짜 기준 발행일 문자열
  const today = new Date();
  const publishDateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
  
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

  // 현재 달의 1일로 초기화
  const [selectedMonth, setSelectedMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  // 년/월 분리 선택을 위한 state
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonthNum, setSelectedMonthNum] = useState(today.getMonth() + 1); // 1-12
  const [showPreview, setShowPreview] = useState(true);
  const [operationAnalysis, setOperationAnalysis] = useState('');
  const [improvements, setImprovements] = useState('');
  const [conclusion, setConclusion] = useState('');
  const [majorIncidents, setMajorIncidents] = useState<any[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<any>(mockMonthlyStats);

  // AI 탐지 vs 신고 요약 (백엔드에서 받은 데이터 사용)

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
  const [isAddingIncident, setIsAddingIncident] = useState(false);

  // 메모 관련 상태
  const [editingMemoId, setEditingMemoId] = useState<number | null>(null);
  const [memoText, setMemoText] = useState('');

  // 가능한 월 목록 상태
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);

  // 로그인 사용자 정보 state
  const [writerName, setWriterName] = useState('관리자');
  const [writerDept, setWriterDept] = useState('환경관리과');
  const [writerPhone, setWriterPhone] = useState('010-0000-0000');

  // 사용자 정보 로드
  useEffect(() => {
    const currentUser = getCurrentUser();
    console.log('🔍 [MonthlyReport] getCurrentUser() result:', currentUser);
    
    if (currentUser) {
      console.log('✅ [MonthlyReport] User data found:', {
        name: currentUser.name,
        dept: currentUser.dept,
        phone: currentUser.phone,
      });
      
      setWriterName(currentUser.name || '관리자');
      setWriterDept(currentUser.dept || '환경관리과');
      setWriterPhone(currentUser.phone || '010-0000-0000');
    } else {
      console.warn('⚠️ [MonthlyReport] No user data in localStorage');
    }
  }, []); // 컴포넌트 마운트 시 1회 실행

  // 현재 달(미래 월 선택 제한용)
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  // API에서 데이터 로드 (월 변경 시 재로딩)
  useEffect(() => {
    const loadReportData = async () => {
      // 선택된 월을 YYYY-MM 형식으로 변환
      const year = selectedMonth.getFullYear();
      const month = String(selectedMonth.getMonth() + 1).padStart(2, '0');
      const monthStr = `${year}-${month}`;

      const stats = await getMonthlyStats(monthStr);
      setMonthlyStats(stats);

      // 주요사건 목록은 기본적으로 비어있게 하고, 사건추가 버튼으로만 추가
      setMajorIncidents([]);
    };
    
    loadReportData();
  }, [selectedMonth, refreshKey]);

  // 최초 1회: 가능한 월 목록 로드
  useEffect(() => {
    const loadMonths = async () => {
      const months = await getAvailableReportMonths();
      setAvailableMonths(months);

      // 선택된 월이 목록에 없으면: 가장 최신 월로 맞춤(보통 months[0]이 최신)
      if (months.length > 0) {
        const currentYm = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`;
        if (!months.includes(currentYm)) {
          const [y, m] = months[0].split('-').map(Number);
          setSelectedMonth(new Date(y, m - 1, 1));
        }
      }
    };
    loadMonths();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 최초 1회만 실행

  // 현재 선택된 월의 YYYY-MM 형식
  const currentMonthStr = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`;

  // 사용 가능한 년도 목록 추출
  const availableYears: number[] = availableMonths.length > 0
    ? (() => {
        const years = availableMonths.map(ym => Number(ym.slice(0, 4)));
        const uniqueYears = Array.from(new Set<number>(years));
        return uniqueYears.sort((a, b) => b - a); // 최신순
      })()
    : [selectedYear];

  // 선택된 년도에서 가능한 월 목록
  const availableMonthsInYear = availableMonths.length > 0
    ? availableMonths
        .filter(ym => ym.startsWith(String(selectedYear)))
        .map(ym => Number(ym.slice(5, 7)))
    : [];

  // 현재 날짜 기준으로 미래 월 필터링
  const isFutureMonth = (year: number, month: number): boolean => {
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    if (year > currentYear) return true;
    if (year === currentYear && month > currentMonth) return true;
    return false;
  };

  // 년도 목록: 최신 5개만 (2025, 2024, 2023, 2022, 2021)
  const displayYears = availableYears.length > 0
    ? availableYears.slice(0, 5) // 최신 5개만
    : [selectedYear];

  // 월 목록: 현재 월 기준 역순으로 정렬 (12, 11, 10, 9, 8, ... 1)
  const allMonths = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]; // 역순

  // availableMonths 기준으로 이전/다음 월 가능 여부 계산
  const currentMonthIndex = availableMonths.indexOf(currentMonthStr);
  const canGoPrevious = availableMonths.length > 0
    ? currentMonthIndex < availableMonths.length - 1  // availableMonths 기준으로 더 오래된 월이 있으면
    : true; // availableMonths 없으면 항상 true (과거로는 무제한 이동 가능)
  const canGoNext = availableMonths.length > 0
    ? currentMonthIndex > 0  // availableMonths 기준으로 더 최신 월이 있으면
    : false; // availableMonths 없으면 isNextDisabled 로직 사용

  const handlePreviousMonth = () => {
    if (availableMonths.length > 0) {
      const currentIndex = availableMonths.indexOf(currentMonthStr);
      if (currentIndex < availableMonths.length - 1) {
        // 더 오래된 월로 이동
        const [y, m] = availableMonths[currentIndex + 1].split('-').map(Number);
        setSelectedYear(y);
        setSelectedMonthNum(m);
      }
    } else {
      // availableMonths가 없으면 기존 로직
      if (selectedMonthNum === 1) {
        // 1월이면 전년 12월로
        setSelectedYear(selectedYear - 1);
        setSelectedMonthNum(12);
      } else {
        setSelectedMonthNum(selectedMonthNum - 1);
      }
    }
  };

  const handleNextMonth = () => {
    if (availableMonths.length > 0) {
      const currentIndex = availableMonths.indexOf(currentMonthStr);
      if (currentIndex > 0) {
        // 더 최신 월로 이동
        const [y, m] = availableMonths[currentIndex - 1].split('-').map(Number);
        setSelectedYear(y);
        setSelectedMonthNum(m);
      }
    } else {
      // availableMonths가 없으면 기존 로직
      if (selectedMonthNum === 12) {
        // 12월이면 다음년 1월로
        const nextYear = selectedYear + 1;
        const nextMonthStart = new Date(nextYear, 0, 1);
        if (nextMonthStart > currentMonthStart) {
          return; // 미래 월은 선택 불가
        }
        setSelectedYear(nextYear);
        setSelectedMonthNum(1);
      } else {
        setSelectedMonthNum(selectedMonthNum + 1);
      }
    }
  };

  // 다음 달 버튼 비활성화 여부 (기존 로직 + availableMonths 체크)
  const isNextDisabled = (() => {
    if (availableMonths.length > 0) {
      return !canGoNext; // availableMonths 기준으로 더 최신 월이 없으면 비활성화
    }
    // availableMonths가 없으면 기존 로직 사용
    const nextMonthStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1);
    return nextMonthStart > currentMonthStart;
  })();

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // PDF 저장 = 브라우저 인쇄 창을 띄워서 "PDF로 저장"을 선택하게 함
    const prevTitle = document.title;
    // ✅ 브라우저 "머리글/바닥글"이 켜져있을 때 상단 중앙에 title이 찍히는 걸 최소화하기 위해 빈 값 사용
    // (머리글/바닥글 자체는 사용자가 인쇄창에서 꺼야 완전히 사라짐)
    document.title = '';

    // 렌더링 안정화(일부 브라우저에서 title 반영 타이밍)
    setTimeout(() => {
      window.print();
    }, 0);

    // 인쇄 다이얼로그 닫힌 후 타이틀 복구
    const restore = () => {
      document.title = prevTitle;
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
  };

  const monthStr = `${selectedMonth.getFullYear()}년 ${selectedMonth.getMonth() + 1}월`;

  // 낙석 데이터가 없을 때도 UI가 안 깨지게 기본값
  const rockfallStats = monthlyStats.rockfall ?? {
    total: 0,
    resolved: 0,
    pending: 0,
    avgResponseTime: '-',
  };

  // AI 탐지 vs 신고 통계 (백엔드에서 받은 데이터)
  const aiDetection = monthlyStats.aiDetection ?? {
    aiTotal: 0,
    manualTotal: 0,
  };
  const aiTotal = aiDetection.aiTotal ?? 0;
  const manualTotal = aiDetection.manualTotal ?? 0;
  const total = aiTotal + manualTotal;
  const aiPercent = total > 0 ? Math.round((aiTotal / total) * 100) : 0;
  const manualPercent = 100 - aiPercent;

  const handleAddIncident = () => {
    setIsAddingIncident(true);

    // 추가 모드에서는 특정 행을 타겟팅하지 않음
    setTargetIncidentId(null);

    // 필터 비우고 결과 바로 표시
    const blank = { incidentId: '', date: '', type: '', location: '', severity: '', status: '' };
    setSearchFilters(blank);
    handleSearch(blank);

    setShowSearchModal(true);
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
  const handleSearch = async (filters = searchFilters) => {
    // 선택된 월의 시작일과 종료일 계산
    const monthStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
    const monthEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
    // KST 기준 YYYY-MM-DD (UTC 변환으로 인한 날짜 밀림 방지)
    const monthStartStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(monthStart);
    const monthEndStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(monthEnd);

    try {
      // ✅ 실제 DB에서 전체 사건 목록 가져오기
      const list = await getIncidentsList();

      const hasFilters = filters.incidentId || filters.date || filters.type || filters.location || filters.severity || filters.status;
      const qIncident = (filters.incidentId || '').trim().toLowerCase();
      const qLoc = (filters.location || '').trim().toLowerCase();

      const results = (Array.isArray(list) ? list : [])
        .map((x: any) => {
          // 백엔드 필드명 매핑 (IncidentListView 기준)
          const rawType = x.incidentType;
          const rawStatus = x.status;
          const rawSeverity = x.severityLevel;
          const rawDate = x.detectedAt;
          
          // 날짜를 YYYY-MM-DD 형식으로 변환
          let date = '';
          if (rawDate) {
            try {
              const d = new Date(rawDate);
              date = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
            } catch (e) {
              console.warn('Date parsing error:', rawDate, e);
            }
          }

          const incidentIdStr = String(x.incidentCode || x.incidentId || '');
          const cctvIdStr = String(x.cctvCode || x.cctvId || '');
          const locationStr = String(x.locationDesc || '');

          return {
            incidentId: incidentIdStr,
            date,
            type: normalizeIncidentType(rawType),
            location: locationStr,
            cctvId: cctvIdStr,
            severity: normalizeSeverity(rawSeverity),
            status: normalizeIncidentStatus(rawStatus),
          };
        })
        // ✅ 선택된 월 범위 내 사건만 필터링
        .filter((item: any) => {
          if (!item.date) return false;
          return item.date >= monthStartStr && item.date <= monthEndStr;
        })
        // ✅ OR 조건 검색: 하나라도 필터 조건에 해당되면 표시
        .filter((item: any) => {
          if (!hasFilters) return true; // 필터가 없으면 전체 표시

          const matchesIncidentId =
            !qIncident ||
            String(item.incidentId || '').toLowerCase().includes(qIncident);

          const matchesDate =
            !filters.date || item.date === filters.date;

          const matchesType =
            !filters.type ||
            normalizeIncidentType(item.type) === normalizeIncidentType(filters.type);

          // ✅ 위치 또는 CCTV ID 둘 중 하나만 매칭되어도 통과
          const matchesLocationOrCctv =
            !qLoc ||
            String(item.location || '').toLowerCase().includes(qLoc) ||
            String(item.cctvId || '').toLowerCase().includes(qLoc);

          const matchesSeverity =
            !filters.severity ||
            normalizeSeverity(item.severity) === normalizeSeverity(filters.severity);

          const matchesStatus =
            !filters.status ||
            normalizeIncidentStatus(item.status) === normalizeIncidentStatus(filters.status);

          // 하나라도 매칭되면 통과
          return (
            matchesIncidentId ||
            matchesDate ||
            matchesType ||
            matchesLocationOrCctv ||
            matchesSeverity ||
            matchesStatus
          );
        });

      setSearchResults(results);
    } catch (error) {
      console.error('❌ [MonthlyReport] Failed to search incidents:', error);
      setSearchResults([]);
    }
  };

  // 검색 결과 선택
  const handleSelectSearchResult = (result: any) => {
    if (isAddingIncident) {
      // 추가 모드: 새 행 생성해서 push
      const newIncident = {
        id: Date.now(),
        incidentId: result.incidentId,
        date: result.date,
        type: normalizeIncidentType(result.type),
        location: result.location,
        severity: normalizeSeverity(result.severity),
        status: normalizeIncidentStatus(result.status),
        responseTime: '',
        memo: '',
        origin: 'MANUAL',
      };

      setMajorIncidents((prev) => [...prev, newIncident]);

      setShowSearchModal(false);
      setIsAddingIncident(false);
      return;
    }

    // (기존) 특정 행(돋보기 검색)에서 선택했을 때는 그 행에 채우기
    if (!targetIncidentId) return;

    handleIncidentChange(targetIncidentId, 'incidentId', result.incidentId);
    handleIncidentChange(targetIncidentId, 'date', result.date);
    handleIncidentChange(targetIncidentId, 'type', normalizeIncidentType(result.type));
    handleIncidentChange(targetIncidentId, 'location', result.location);
    handleIncidentChange(targetIncidentId, 'severity', normalizeSeverity(result.severity));
    handleIncidentChange(targetIncidentId, 'status', normalizeIncidentStatus(result.status));

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
      {/* Sidebar - 반응형 (모바일: 75vw, PC: 고정) */}
      <div 
        className="fixed top-0 left-0 z-50 h-screen transition-transform duration-300 ease-in-out"
        style={{ 
          width: isMobile ? '75vw' : '317.56px',
          backgroundColor: '#2B2847',
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)'
        }}
      >
        <Sidebar onNavigate={onNavigate} currentPath="report" />
      </div>
      
      {/* 모바일 오버레이 */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <div className="flex-1 flex flex-col overflow-hidden relative bg-gray-50" style={{ marginLeft: sidebarOpen && !isMobile ? '317.56px' : '0px', transition: 'margin-left 0.3s' }}>
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm screen-only" style={{ backgroundColor: 'var(--ecoguard-header-bg)' }}>
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
                    disabled={!canGoPrevious}
                    className="p-2 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ borderRadius: '0px' }}
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-700" />
                  </button>
                  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200" style={{ borderRadius: '9999px' }}>
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    {/* 년 선택 */}
                    <select
                      className="bg-transparent text-gray-900 text-sm outline-none cursor-pointer"
                      value={selectedYear}
                      onChange={(e) => {
                        const year = Number(e.target.value);
                        setSelectedYear(year);
                        // 년도 변경 시 해당 년도에서 사용 가능한 첫 번째 월로 자동 설정
                        const monthsInYear = availableMonths
                          .filter(ym => ym.startsWith(String(year)))
                          .map(ym => Number(ym.slice(5, 7)));
                        if (monthsInYear.length > 0 && !monthsInYear.includes(selectedMonthNum)) {
                          setSelectedMonthNum(monthsInYear[0]);
                        }
                      }}
                    >
                      {displayYears.map(year => (
                        <option key={year} value={year}>{year}년</option>
                      ))}
                    </select>
                    {/* 월 선택 */}
                    <select
                      className="bg-transparent text-gray-900 text-sm outline-none cursor-pointer disabled:opacity-50"
                      value={selectedMonthNum}
                      onChange={(e) => setSelectedMonthNum(Number(e.target.value))}
                    >
                      {allMonths.map(m => {
                        const monthStr = `${selectedYear}-${String(m).padStart(2, '0')}`;
                        const hasData = availableMonths.length === 0 || 
                          availableMonths.includes(monthStr);
                        const isFuture = isFutureMonth(selectedYear, m);
                        const isAvailable = hasData && !isFuture;
                        
                        return (
                          <option 
                            key={m} 
                            value={m}
                            disabled={!isAvailable}
                            style={{ color: isAvailable ? 'inherit' : '#9CA3AF' }}
                          >
                            {m}월
                          </option>
                        );
                      })}
                    </select>
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
              {/* 보고서 헤더(표지): 화면에서는 보이되, PDF(인쇄)에서는 1페이지를 차지하므로 숨김 */}
              <div className="border-b-4 border-emerald-600 p-8 bg-gray-50 screen-only report-cover">
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
                <div className="mt-6 pt-6 border-t border-gray-300 flex justify-end text-gray-600">
                  <div className="flex items-center gap-4 text-base">
                    <span>발행일: {publishDateStr}</span>
                    <span>{writerDept}</span>
                    <span>{writerName}</span>
                  </div>
                </div>
                
                {/* 결재라인 */}
                <div className="mt-6 flex justify-end">
                  <table
                    className="text-sm text-gray-900"
                    style={{
                      borderCollapse: 'collapse',
                      width: '360px',
                      tableLayout: 'fixed',
                      border: '1px solid #9CA3AF',
                    }}
                  >
                    <tbody>
                      <tr>
                        <td
                          style={{
                            width: '48px',
                            textAlign: 'center',
                            verticalAlign: 'middle',
                            borderRight: '1px solid #9CA3AF',
                            fontWeight: 600,
                            padding: '6px 2px',
                          }}
                        >
                          결
                        </td>
                        <td style={{ textAlign: 'center', borderRight: '1px solid #9CA3AF', borderBottom: '1px solid #9CA3AF', padding: '8px 6px', fontWeight: 600 }}>
                          담당 과장
                        </td>
                        <td style={{ textAlign: 'center', borderBottom: '1px solid #9CA3AF', padding: '8px 6px', fontWeight: 600 }}>
                          담당 소장
                        </td>
                      </tr>
                      <tr>
                        <td
                          style={{
                            width: '48px',
                            textAlign: 'center',
                            verticalAlign: 'middle',
                            borderRight: '1px solid #9CA3AF',
                            fontWeight: 600,
                            padding: '6px 2px',
                          }}
                        >
                          재
                        </td>
                        <td style={{ height: '80px', borderRight: '1px solid #9CA3AF', verticalAlign: 'top', padding: '4px' }}>
                          {/* 사인 영역 */}
                        </td>
                        <td style={{ height: '80px', verticalAlign: 'top', padding: '4px' }}>
                          {/* 사인 영역 */}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 보고서 본문 */}
              <div className="p-8">
                {/* 1. 월간 요약 */}
                <section className="mb-8">
                  <h3 className="text-gray-900 mb-4 pb-2 border-b-2 border-gray-300" style={{ fontSize: '20px', fontWeight: '600' }}>
                    1. 월간 요약
                  </h3>
                  {/* 첫 줄: 전체사건, CCTV 운영률 */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* 전체사건 */}
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-gray-600 mb-1">전체사건</p>
                          <p className="text-gray-900 mb-2" style={{ fontSize: '16px', fontWeight: '600' }}>
                            처리완료 {monthlyStats.fire.resolved + monthlyStats.trash.resolved + monthlyStats.emergency.resolved + rockfallStats.resolved}/{monthlyStats.fire.total + monthlyStats.trash.total + monthlyStats.emergency.total + rockfallStats.total}건
                          </p>
                          <p className="text-xs text-gray-500">처리완료율</p>
                        </div>
                        <div className="relative" style={{ width: '100px', height: '100px' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[
                                  { name: '완료', value: monthlyStats.fire.resolved + monthlyStats.trash.resolved + monthlyStats.emergency.resolved + rockfallStats.resolved },
                                  { name: '미완료', value: monthlyStats.fire.pending + monthlyStats.trash.pending + monthlyStats.emergency.pending + rockfallStats.pending }
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
                              {safePct(
                                monthlyStats.fire.resolved + monthlyStats.trash.resolved + monthlyStats.emergency.resolved + rockfallStats.resolved,
                                monthlyStats.fire.total + monthlyStats.trash.total + monthlyStats.emergency.total + rockfallStats.total
                              )}%
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

                  {/* 두 번째 줄: 산불 사건, 응급상황 */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* 산불 사건 */}
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-gray-600 mb-1">산불 사건</p>
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
                              {safePct(monthlyStats.fire.resolved, monthlyStats.fire.total)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 응급 상황 */}
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-gray-600 mb-1">응급상황</p>
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
                              {safePct(monthlyStats.emergency.resolved, monthlyStats.emergency.total)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 세 번째 줄: 쓰레기투기, 낙석사건 */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* 쓰레기 투기 */}
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-gray-600 mb-1">쓰레기투기</p>
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
                              {safePct(monthlyStats.trash.resolved, monthlyStats.trash.total)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 낙석 사건 */}
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-gray-600 mb-1">낙석사건</p>
                          <p className="text-gray-900 mb-2" style={{ fontSize: '16px', fontWeight: '600' }}>
                            처리완료 {rockfallStats.resolved}/{rockfallStats.total}건
                          </p>
                          <p className="text-xs text-gray-500">처리완료율</p>
                        </div>
                        <div className="relative" style={{ width: '100px', height: '100px' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[
                                  { name: '완료', value: rockfallStats.resolved },
                                  { name: '미완료', value: rockfallStats.pending },
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
                              {safePct(rockfallStats.resolved, rockfallStats.total)}%
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
                        <tr className="border-b border-gray-200">
                          <td className="py-3 px-4 text-gray-900">낙석</td>
                          <td className="py-3 px-4 text-center text-gray-900">{rockfallStats.total}</td>
                          <td className="py-3 px-4 text-center text-green-600">{rockfallStats.resolved}</td>
                          <td className="py-3 px-4 text-center text-orange-600">{rockfallStats.pending}</td>
                          <td className="py-3 px-4 text-center text-gray-900">{rockfallStats.avgResponseTime}</td>
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
                                min={formatKstDate(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1))}
                                max={formatKstDate(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0))}
                                className="screen-only w-full px-2 py-1 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm text-gray-900"
                                style={{ borderRadius: '0px' }}
                              />
                            </td>

                            {/* 유형 */}
                            <td className="py-3 px-4">
                              <span className="print-only text-sm text-gray-900">
                                {labelIncidentType(incident.type)}
                              </span>
                              <select
                                value={incident.type}
                                onChange={(e) => handleIncidentChange(incident.id, 'type', e.target.value)}
                                className="screen-only w-full px-2 py-1 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm text-gray-900"
                                style={{ borderRadius: '0px' }}
                              >
                                <option value="FIRE">화재</option>
                                <option value="TRASH">쓰레기</option>
                                <option value="EMERGENCY">응급</option>
                                <option value="ROCKFALL">낙석</option>
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
                                {labelSeverity(incident.severity)}
                              </span>
                              <select
                                value={incident.severity}
                                onChange={(e) => handleIncidentChange(incident.id, 'severity', e.target.value)}
                                className="screen-only w-full px-2 py-1 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm text-gray-900"
                                style={{ borderRadius: '0px' }}
                              >
                                <option value="HIGH">상</option>
                                <option value="MEDIUM">중</option>
                                <option value="LOW">하</option>
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
                                {labelIncidentStatus(incident.status)}
                              </span>
                              <select
                                value={incident.status}
                                onChange={(e) => handleIncidentChange(incident.id, 'status', e.target.value)}
                                className="screen-only w-full px-2 py-1 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm text-gray-900"
                                style={{ borderRadius: '0px' }}
                              >
                                <option value="RESOLVED">처리완료</option>
                                <option value="IN_PROGRESS">진행중</option>
                                <option value="PENDING">대기중</option>
                              </select>
                            </td>

                            {/* 발생경로 */}
                            <td className="py-3 px-4">
                              <span className="print-only text-sm text-gray-900">
                                {labelSourceType(incident.origin || 'MANUAL')}
                              </span>
                              <select
                                value={incident.origin || 'MANUAL'}
                                onChange={(e) => handleIncidentChange(incident.id, 'origin', e.target.value)}
                                className="screen-only w-full px-2 py-1 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm text-gray-900"
                                style={{ borderRadius: '0px' }}
                              >
                                <option value="AUTO">AI</option>
                                <option value="MANUAL">신고</option>
                                <option value="MIXED">혼합</option>
                              </select>
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

              </div>
              {/* ✅ 인쇄용 페이지 번호(브라우저 머리글/바닥글 대신) */}
              <div className="print-only print-page-footer" />
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
                  setIsAddingIncident(false);
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
                onChange={(e) => {
                  const next = { ...searchFilters, incidentId: e.target.value };
                  setSearchFilters(next);
                  handleSearch(next);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="px-3 py-2 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                style={{ borderRadius: '0px' }}
              />
              <input
                type="date"
                placeholder="발생일시"
                value={searchFilters.date}
                onChange={(e) => {
                  const next = { ...searchFilters, date: e.target.value };
                  setSearchFilters(next);
                  handleSearch(next);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                min={formatKstDate(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1))}
                max={formatKstDate(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0))}
                className="px-3 py-2 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                style={{ borderRadius: '0px' }}
              />
              <select
                value={searchFilters.type}
                onChange={(e) => {
                  const next = { ...searchFilters, type: e.target.value };
                  setSearchFilters(next);
                  handleSearch(next);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="px-3 py-2 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                style={{ borderRadius: '0px' }}
              >
                <option value="">유형</option>
                <option value="FIRE">화재</option>
                <option value="TRASH">쓰레기</option>
                <option value="EMERGENCY">응급</option>
                <option value="ROCKFALL">낙석</option>
              </select>
              <input
                type="text"
                placeholder="위치"
                value={searchFilters.location}
                onChange={(e) => {
                  const next = { ...searchFilters, location: e.target.value };
                  setSearchFilters(next);
                  handleSearch(next);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="px-3 py-2 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                style={{ borderRadius: '0px' }}
              />
              <select
                value={searchFilters.severity}
                onChange={(e) => {
                  const next = { ...searchFilters, severity: e.target.value };
                  setSearchFilters(next);
                  handleSearch(next);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="px-3 py-2 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                style={{ borderRadius: '0px' }}
              >
                <option value="">심각도</option>
                <option value="HIGH">상</option>
                <option value="MEDIUM">중</option>
                <option value="LOW">하</option>
              </select>
              <select
                value={searchFilters.status}
                onChange={(e) => {
                  const next = { ...searchFilters, status: e.target.value };
                  setSearchFilters(next);
                  handleSearch(next);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="px-3 py-2 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                style={{ borderRadius: '0px' }}
              >
                <option value="">상태</option>
                <option value="RESOLVED">처리완료</option>
                <option value="PENDING">대기중</option>
                <option value="IN_PROGRESS">진행중</option>
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
                onClick={async () => {
                  const blank = {
                    incidentId: '',
                    date: '',
                    type: '',
                    location: '',
                    severity: '',
                    status: ''
                  };
                  setSearchFilters(blank);
                  await handleSearch(blank);
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
                        <div className="text-xs text-gray-600">
                          {result.date} | {labelIncidentType(result.type)} | {result.location}{result.cctvId ? `/${result.cctvId}` : ''}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {labelSeverity(result.severity)} | {labelIncidentStatus(result.status)}
                      </div>
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
        /* 1. A4 고정 (PDF 저장 안정화) */
        @page {
          size: A4 portrait;
          margin: 20mm 15mm;
        }

        @media print {
          /* (선택) 배경색/색상 인쇄 유지 */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* 2. 스크롤 방지 및 다중 페이지 흐름 필수 설정 */
          * {
            overflow: visible !important;
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
            /* A4(210mm) - 좌우 여백(15mm*2) = 180mm */
            width: 180mm !important;
            max-width: 180mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
            
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

          /* ✅ 표지(헤더/결재라인) 페이지 제거 */
          .report-cover {
            display: none !important;
          }

          /* 7. 섹션 처리 */
          section {
            margin-bottom: 20px !important;
            /* ✅ 섹션 전체가 통째로 다음 페이지로 밀리면서 큰 공백이 생기는 걸 방지 */
            break-inside: auto !important;
            page-break-inside: auto !important;
          }

          /* 기존에 설정한 avoid-break만 보호 */
          .avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          /* ✅ PDF에서만 월간 요약 2열 그리드가 1열로 무너지는 케이스 방지 */
          .grid.grid-cols-2 {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 16px !important;
          }
          .grid.grid-cols-2 > div {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          /* ✅ 인쇄용 페이지 번호 */
          .print-page-footer {
            display: block !important;
            position: fixed;
            left: 0;
            right: 0;
            bottom: 6mm;
            padding-right: 10mm;
            text-align: right;
            font-size: 11px;
            color: #6B7280;
          }
          .print-page-footer::after {
            content: counter(page) " / " counter(pages);
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