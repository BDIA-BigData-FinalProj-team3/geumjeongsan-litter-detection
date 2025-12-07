import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import HamburgerMenuButton from '../components/HamburgerMenuButton';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts';
import { getDailyStats, getAllMonthlyData, getAvgResponseTime, getCCTVSummary } from '../services/api';
import { cctvSummary } from '../services/common';
import DateRangePicker, { DateRangeState, formatDateRange } from '../components/DateRangePicker';

interface DashboardProps {
  onNavigate: (screen: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null); // 클릭한 구간
  
  // 기본 날짜 범위 상태
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [dateRange, setDateRange] = useState<DateRangeState>({
    unit: 'MONTH',
    startYear: currentYear,
    endYear: currentYear,
    monthStartYear: currentYear,
    monthStartMonth: 1,
    monthEndYear: currentYear,
    monthEndMonth: currentMonth,
    dayStart: new Date(currentYear, currentMonth - 1, 1),
    dayEnd: new Date(),
  });

  // 데이터 상태 관리
  const [dailyStats, setDailyStats] = useState<Array<{ label: string; value: string }>>([]);
  const [dailyStatsModel, setDailyStatsModel] = useState<Array<{ label: string; value: string }>>([]);
  const [allMonthlyData, setAllMonthlyData] = useState<Array<{ 
    year: number; 
    month: number; 
    monthLabel: string; 
    쓰레기: number; 
    화재: number; 
    응급: number; 
    기타: number; 
    쓰레기_모델: number;
    화재_모델: number;
    응급_모델: number;
    기타_모델: number;
    처리완료: number; 
    미완료: number; 
    cctvOn: number; 
    cctvOff: number;
  }>>([]);
  const [avgResponseTime, setAvgResponseTime] = useState<Array<{ type: string; time: number; change: number; isIncrease: boolean }>>([]);

  // API에서 데이터 로드
  useEffect(() => {
    const loadDashboardData = async () => {
      const [daily, monthly, responseTime] = await Promise.all([
        getDailyStats(),
        getAllMonthlyData(),
        getAvgResponseTime(),
      ]);
      setDailyStats(daily);
      
      // 모델 탐지 데이터 생성 (전체의 약 70-80%)
      const dailyModel = daily.map(stat => {
        // CCTV 관련 라벨은 제외 (가동, cctv 등 포함된 경우)
        if (stat.label.toLowerCase().includes('cctv') || stat.label.includes('가동')) {
          return stat; // CCTV 수는 동일
        }
        const totalValue = parseInt(stat.value);
        const modelValue = Math.floor(totalValue * (0.7 + Math.random() * 0.1)); // 70-80%
        return {
          label: stat.label,
          value: modelValue.toString()
        };
      });
      setDailyStatsModel(dailyModel);
      
      // 월별 데이터에 모델 탐지 추가
      const monthlyWithModel = monthly.map(m => ({
        ...m,
        쓰레기_모델: Math.floor(m.쓰레기 * (0.7 + Math.random() * 0.1)),
        화재_모델: Math.floor(m.화재 * (0.7 + Math.random() * 0.1)),
        응급_모델: Math.floor(m.응급 * (0.7 + Math.random() * 0.1)),
        기타_모델: Math.floor(m.기타 * (0.7 + Math.random() * 0.1)),
      }));
      setAllMonthlyData(monthlyWithModel);
      
      // "전체" 평균 대응시간 추가
      if (responseTime.length > 0) {
        const totalAvgTime = Math.round(responseTime.reduce((sum, item) => sum + item.time, 0) / responseTime.length);
        const totalChange = Math.round(responseTime.reduce((sum, item) => sum + item.change, 0) / responseTime.length);
        const totalIsIncrease = responseTime.filter(item => item.isIncrease).length > responseTime.length / 2;
        
        setAvgResponseTime([
          { type: '전체', time: totalAvgTime, change: Math.abs(totalChange), isIncrease: totalIsIncrease },
          ...responseTime
        ]);
      } else {
        setAvgResponseTime(responseTime);
      }
    };
    
    loadDashboardData();
  }, []);

  // 기간 필터링 함수 (TODO: 백엔드 API 연결 시 전체 재작성 필요)
  const getFilteredData = () => {
    // 데이터가 로드되지 않았으면 기본값 반환
    if (!allMonthlyData || allMonthlyData.length === 0) {
      return {
        accidentRatio: [
          { name: '응급', value: 0, color: '#7C2D3B' },
          { name: '화재', value: 0, color: '#E87C7C' },
          { name: '쓰레기', value: 0, color: '#5B7C99' },
          { name: '기타', value: 0, color: '#4A5568' },
        ],
        accidentRatioModel: [
          { name: '응급', value: 0, color: '#7C2D3B' },
          { name: '화재', value: 0, color: '#E87C7C' },
          { name: '쓰레기', value: 0, color: '#5B7C99' },
          { name: '기타', value: 0, color: '#4A5568' },
        ],
        completionRatio: [
          { name: '처리 완료', value: 0, color: '#4A90A4' },
          { name: '미완료', value: 0, color: '#E5E7EB' },
        ],
        monthlyTrend: [],
        monthlyTrendModel: [],
        cctvOperationRate: [
          { status: 'ON', value: 0, color: '#3B82F6' },
          { status: 'OFF', value: 0, color: '#E5E7EB' },
        ],
      };
    }

    // dateRange를 기존 startDate/endDate 형식으로 변환 (임시 - Mock 데이터용)
    // TODO: 백엔드 연결 시 dateRange를 직접 API에 전달
    let startYear = dateRange.monthStartYear;
    let startMonth = dateRange.monthStartMonth;
    let endYear = dateRange.monthEndYear;
    let endMonth = dateRange.monthEndMonth;

    // 기본값 사용 (현재 전체 데이터 표시)
    if (dateRange.unit === 'YEAR') {
      // 연 단위는 임시로 전체 데이터 표시
      const currentMonth = allMonthlyData[allMonthlyData.length - 1];
      return {
        accidentRatio: [
          { name: '응급', value: currentMonth.응급, color: '#7C2D3B' },
          { name: '화재', value: currentMonth.화재, color: '#E87C7C' },
          { name: '쓰레기', value: currentMonth.쓰레기, color: '#5B7C99' },
          { name: '기타', value: currentMonth.기타, color: '#4A5568' },
        ],
        accidentRatioModel: [
          { name: '응급', value: currentMonth.응급_모델, color: '#7C2D3B' },
          { name: '화재', value: currentMonth.화재_모델, color: '#E87C7C' },
          { name: '쓰레기', value: currentMonth.쓰레기_모델, color: '#5B7C99' },
          { name: '기타', value: currentMonth.기타_모델, color: '#4A5568' },
        ],
        completionRatio: [
          { name: '처리 완료', value: currentMonth.처리완료, color: '#4A90A4' },
          { name: '미완료', value: currentMonth.미완료, color: '#E5E7EB' },
        ],
        monthlyTrend: allMonthlyData.map(d => ({
          month: d.monthLabel,
          전체: d.쓰레기 + d.화재 + d.응급 + d.기타,
          쓰레기: d.쓰레기,
          화재: d.화재,
          응급: d.응급,
        })),
        monthlyTrendModel: allMonthlyData.map(d => ({
          month: d.monthLabel,
          전체: d.쓰레기_모델 + d.화재_모델 + d.응급_모델 + d.기타_모델,
          쓰레기: d.쓰레기_모델,
          화재: d.화재_모델,
          응급: d.응급_모델,
        })),
        cctvOperationRate: [
          { status: 'ON', value: currentMonth.cctvOn, color: '#3B82F6' },
          { status: 'OFF', value: currentMonth.cctvOff, color: '#E5E7EB' },
        ],
      };
    }

    if (dateRange.unit === 'DAY') {
      // 일 단위는 임시로 전체 데이터 표시
      const currentMonth = allMonthlyData[allMonthlyData.length - 1];
      return {
        accidentRatio: [
          { name: '응급', value: currentMonth.응급, color: '#7C2D3B' },
          { name: '화재', value: currentMonth.화재, color: '#E87C7C' },
          { name: '쓰레기', value: currentMonth.쓰레기, color: '#5B7C99' },
          { name: '기타', value: currentMonth.기타, color: '#4A5568' },
        ],
        accidentRatioModel: [
          { name: '응급', value: currentMonth.응급_모델, color: '#7C2D3B' },
          { name: '화재', value: currentMonth.화재_모델, color: '#E87C7C' },
          { name: '쓰레기', value: currentMonth.쓰레기_모델, color: '#5B7C99' },
          { name: '기타', value: currentMonth.기타_모델, color: '#4A5568' },
        ],
        completionRatio: [
          { name: '처리 완료', value: currentMonth.처리완료, color: '#4A90A4' },
          { name: '미완료', value: currentMonth.미완료, color: '#E5E7EB' },
        ],
        monthlyTrend: allMonthlyData.map(d => ({
          month: d.monthLabel,
          전체: d.쓰레기 + d.화재 + d.응급 + d.기타,
          쓰레기: d.쓰레기,
          화재: d.화재,
          응급: d.응급,
        })),
        monthlyTrendModel: allMonthlyData.map(d => ({
          month: d.monthLabel,
          전체: d.쓰레기_모델 + d.화재_모델 + d.응급_모델 + d.기타_모델,
          쓰레기: d.쓰레기_모델,
          화재: d.화재_모델,
          응급: d.응급_모델,
        })),
        cctvOperationRate: [
          { status: 'ON', value: currentMonth.cctvOn, color: '#3B82F6' },
          { status: 'OFF', value: currentMonth.cctvOff, color: '#E5E7EB' },
        ],
      };
    }

    const filtered = allMonthlyData.filter(d => {
      if (d.year < startYear || d.year > endYear) return false;
      if (d.year === startYear && d.month < startMonth) return false;
      if (d.year === endYear && d.month > endMonth) return false;
      return true;
    });

    if (filtered.length === 0) {
      return {
        accidentRatio: [
          { name: '응급', value: 0, color: '#7C2D3B' },
          { name: '화재', value: 0, color: '#E87C7C' },
          { name: '쓰레기', value: 0, color: '#5B7C99' },
          { name: '기타', value: 0, color: '#4A5568' },
        ],
        accidentRatioModel: [
          { name: '응급', value: 0, color: '#7C2D3B' },
          { name: '화재', value: 0, color: '#E87C7C' },
          { name: '쓰레기', value: 0, color: '#5B7C99' },
          { name: '기타', value: 0, color: '#4A5568' },
        ],
        completionRatio: [
          { name: '처리 완료', value: 0, color: '#4A90A4' },
          { name: '미완료', value: 0, color: '#E5E7EB' },
        ],
        monthlyTrend: [],
        monthlyTrendModel: [],
        cctvOperationRate: [
          { status: 'ON', value: 0, color: '#3B82F6' },
          { status: 'OFF', value: 0, color: '#E5E7EB' },
        ],
      };
    }

    // 통합 데이터 계산
    const total응급 = filtered.reduce((sum, d) => sum + d.응급, 0);
    const total화재 = filtered.reduce((sum, d) => sum + d.화재, 0);
    const total쓰레기 = filtered.reduce((sum, d) => sum + d.쓰레기, 0);
    const total기타 = filtered.reduce((sum, d) => sum + d.기타, 0);
    const total응급_모델 = filtered.reduce((sum, d) => sum + d.응급_모델, 0);
    const total화재_모델 = filtered.reduce((sum, d) => sum + d.화재_모델, 0);
    const total쓰레기_모델 = filtered.reduce((sum, d) => sum + d.쓰레기_모델, 0);
    const total기타_모델 = filtered.reduce((sum, d) => sum + d.기타_모델, 0);
    const total처리완료 = filtered.reduce((sum, d) => sum + d.처리완료, 0);
    const total미완료 = filtered.reduce((sum, d) => sum + d.미완료, 0);
    const avgCctvOn = filtered.reduce((sum, d) => sum + d.cctvOn, 0) / filtered.length;
    const avgCctvOff = filtered.reduce((sum, d) => sum + d.cctvOff, 0) / filtered.length;

    return {
      accidentRatio: [
        { name: '응급', value: total응급, color: '#7C2D3B' },
        { name: '화재', value: total화재, color: '#E87C7C' },
        { name: '쓰레기', value: total쓰레기, color: '#5B7C99' },
        { name: '기타', value: total기타, color: '#4A5568' },
      ],
      accidentRatioModel: [
        { name: '응급', value: total응급_모델, color: '#7C2D3B' },
        { name: '화재', value: total화재_모델, color: '#E87C7C' },
        { name: '쓰레기', value: total쓰레기_모델, color: '#5B7C99' },
        { name: '기타', value: total기타_모델, color: '#4A5568' },
      ],
      completionRatio: [
        { name: '처리 완료', value: total처리완료, color: '#4A90A4' },
        { name: '미완료', value: total미완료, color: '#E5E7EB' },
      ],
      monthlyTrend: filtered.map(d => ({
        month: d.monthLabel,
        전체: d.쓰레기 + d.화재 + d.응급 + d.기타,
        쓰레기: d.쓰레기,
        화재: d.화재,
        응급: d.응급,
      })),
      monthlyTrendModel: filtered.map(d => ({
        month: d.monthLabel,
        전체: d.쓰레기_모델 + d.화재_모델 + d.응급_모델 + d.기타_모델,
        쓰레기: d.쓰레기_모델,
        화재: d.화재_모델,
        응급: d.응급_모델,
      })),
      cctvOperationRate: [
        { status: 'ON', value: Math.round(avgCctvOn * 10) / 10, color: '#3B82F6' },
        { status: 'OFF', value: Math.round(avgCctvOff * 10) / 10, color: '#E5E7EB' },
      ],
    };
  };

  const filteredData = getFilteredData();
  const accidentRatio = filteredData.accidentRatio;
  const accidentRatioModel = filteredData.accidentRatioModel;
  const completionRatio = filteredData.completionRatio;
  const monthlyTrend = filteredData.monthlyTrend;
  const monthlyTrendModel = filteredData.monthlyTrendModel || filteredData.monthlyTrend;
  const cctvOperationRate = filteredData.cctvOperationRate;

  // 전월 대비 증가율 계산 함수 (선택된 구간 기준)
  const calculateMonthOverMonthChange = (type: '전체' | '쓰레기' | '화재' | '응급', data: any[]) => {
    if (data.length < 2) return { change: 0, isIncrease: false };
    
    let currentIndex = data.length - 1;
    
    // 선택된 구간이 있으면 해당 구간 기준으로 계산
    if (selectedPeriod) {
      const foundIndex = data.findIndex(d => d.month === selectedPeriod);
      if (foundIndex > 0) {
        currentIndex = foundIndex;
      }
    }
    
    if (currentIndex === 0) return { change: 0, isIncrease: false };
    
    const currentMonth = data[currentIndex];
    const previousMonth = data[currentIndex - 1];
    
    const currentValue = currentMonth[type];
    const previousValue = previousMonth[type];
    
    if (previousValue === 0) return { change: 0, isIncrease: currentValue > 0 };
    
    const changePercent = Math.round(((currentValue - previousValue) / previousValue) * 100);
    return { change: Math.abs(changePercent), isIncrease: changePercent > 0 };
  };

  const totalChange = calculateMonthOverMonthChange('전체', monthlyTrend);
  const trashChange = calculateMonthOverMonthChange('쓰레기', monthlyTrend);
  const fireChange = calculateMonthOverMonthChange('화재', monthlyTrend);
  const emergencyChange = calculateMonthOverMonthChange('응급', monthlyTrend);
  
  const totalChangeModel = calculateMonthOverMonthChange('전체', monthlyTrendModel);
  const trashChangeModel = calculateMonthOverMonthChange('쓰레기', monthlyTrendModel);
  const fireChangeModel = calculateMonthOverMonthChange('화재', monthlyTrendModel);
  const emergencyChangeModel = calculateMonthOverMonthChange('응급', monthlyTrendModel);

  // 처리 완료율 계산
  const completionPercentage = completionRatio[0].value + completionRatio[1].value > 0
    ? Math.round((completionRatio[0].value / (completionRatio[0].value + completionRatio[1].value)) * 100)
    : 0;

  // CCTV 가동률 계산
  const cctvPercentage = cctvOperationRate[0].value + cctvOperationRate[1].value > 0
    ? Math.round((cctvOperationRate[0].value / (cctvOperationRate[0].value + cctvOperationRate[1].value)) * 100)
    : 0;

  const handleDateApply = (newRange: DateRangeState) => {
    setDateRange(newRange);
    setShowDatePicker(false);
  };

  const handleDateReset = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    setDateRange({
      unit: 'MONTH',
      startYear: currentYear,
      endYear: currentYear,
      monthStartYear: currentYear,
      monthStartMonth: 1,
      monthEndYear: currentYear,
      monthEndMonth: currentMonth,
      dayStart: new Date(currentYear, currentMonth - 1, 1),
      dayEnd: new Date(),
    });
    setShowDatePicker(false);
  };

  // 외부 클릭 시 날짜 선택기 닫기
  const datePickerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
    };
    if (showDatePicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDatePicker]);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div 
        className="fixed top-0 left-0 z-50 h-screen transition-transform duration-300 ease-in-out"
        style={{ 
          width: '317.56px', 
          backgroundColor: '#2B2847',
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)'
        }}
      >
        <Sidebar onNavigate={onNavigate} currentPath="dashboard" />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto relative bg-gray-50" style={{ marginLeft: sidebarOpen ? '317.56px' : '0px', transition: 'margin-left 0.3s' }}>
        {/* Header */}
        <div className="shadow-md px-6 py-4 flex items-center justify-between border-b border-gray-200" style={{ backgroundColor: '#345eaa' }}>
          <div className="flex items-center gap-3">
            <HamburgerMenuButton onClick={() => setSidebarOpen(!sidebarOpen)} />
            <h1 className="text-gray-100">통계</h1>
          </div>
        </div>

        <div className="p-3" style={{ backgroundColor: '#F3F4F6', height: 'calc(100vh - 60px)', overflowY: 'auto' }}>
          {/* 당일 전체 사고 현황 */}
          <div className="mb-2">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-base font-semibold text-gray-900">당일 전체 사고 현황</h2>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {dailyStats.map((stat, index) => {
                const modelStat = dailyStatsModel[index];
                // CCTV 관련 라벨은 제외 (가동, cctv 등 포함된 경우)
                const isCCTV = stat.label.toLowerCase().includes('cctv') || stat.label.includes('가동');
                
                return (
                  <div key={index} className="bg-white p-3 shadow-sm" style={{ borderRadius: '8px' }}>
                    <div className="text-xs text-gray-700 mb-2">{stat.label}</div>
                    {isCCTV ? (
                      /* CCTV는 단일 값만 표시 */
                      <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                    ) : (
                      /* 사고 건수는 총 | AI 탐지 형태로 표시 */
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <div className="text-xs text-gray-500 mb-1">총</div>
                          <div className="text-xl font-bold text-gray-900">{stat.value}</div>
                        </div>
                        <div className="h-12 w-px bg-gray-300"></div>
                        <div className="flex-1">
                          <div className="text-xs text-emerald-600 mb-1">AI 탐지</div>
                          <div className="text-xl font-bold text-emerald-600">{modelStat.value}</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 월별 전체 사고 현황 */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-gray-900">
                  월별 전체 사고 현황
                </h2>
                <div className="relative" ref={datePickerRef}>
                  <button 
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className="px-3 py-1.5 text-xs bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 ml-2"
                    style={{ borderRadius: '4px' }}
                  >
                    {formatDateRange(dateRange)} ▼
                  </button>
                  {showDatePicker && (
                    <div className="absolute top-full left-0 mt-2 bg-white border border-gray-300 shadow-lg p-3 z-10" style={{ borderRadius: '8px', width: '400px', maxWidth: '90vw' }}>
                      <DateRangePicker
                        initialState={dateRange}
                        onApply={handleDateApply}
                        onReset={handleDateReset}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              {/* 사고 비율 - 총 | AI 탐지 */}
              <div className="bg-white p-4 shadow-sm" style={{ borderRadius: '8px' }}>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">사고 비율</h3>
                <div className="flex items-center gap-4">
                  {/* 왼쪽: 전체 */}
                  <div className="flex-1">
                    <div className="text-xs text-gray-600 mb-2 text-center">총</div>
                    <div className="relative" style={{ width: '100%', height: '140px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={accidentRatio}
                            cx="50%"
                            cy="50%"
                            innerRadius={30}
                            outerRadius={55}
                            dataKey="value"
                            startAngle={90}
                            endAngle={450}
                            label={({ percent }) => percent > 0 ? `${(percent * 100).toFixed(0)}%` : ''}
                            labelLine={false}
                          >
                            {accidentRatio.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} stroke="white" strokeWidth={2} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: number) => [`${value}건`, '']}
                            contentStyle={{ borderRadius: '4px', fontSize: '12px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-2 space-y-0.5">
                      {accidentRatio.map((item, index) => (
                        <div key={index} className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                          <span className="text-xs text-gray-700">{item.name}: {item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* 구분선 */}
                  <div className="w-px h-full bg-gray-300"></div>
                  
                  {/* 오른쪽: AI 탐지 */}
                  <div className="flex-1">
                    <div className="text-xs text-emerald-600 mb-2 text-center">AI 탐지</div>
                    <div className="relative" style={{ width: '100%', height: '140px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={accidentRatioModel}
                            cx="50%"
                            cy="50%"
                            innerRadius={30}
                            outerRadius={55}
                            dataKey="value"
                            startAngle={90}
                            endAngle={450}
                            label={({ percent }) => percent > 0 ? `${(percent * 100).toFixed(0)}%` : ''}
                            labelLine={false}
                          >
                            {accidentRatioModel.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} stroke="white" strokeWidth={2} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: number) => [`${value}건`, '']}
                            contentStyle={{ borderRadius: '4px', fontSize: '12px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-2 space-y-0.5">
                      {accidentRatioModel.map((item, index) => (
                        <div key={index} className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                          <span className="text-xs text-emerald-700">{item.name}: {item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 처리 완료 비율 */}
              <div className="bg-white p-4 shadow-sm" style={{ borderRadius: '8px' }}>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">처리 완료 비율</h3>
                <div className="flex items-center justify-between">
                  <div className="relative" style={{ width: '160px', height: '160px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={completionRatio}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={75}
                          dataKey="value"
                          startAngle={90}
                          endAngle={450}
                        >
                          {completionRatio.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="white" strokeWidth={2} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => [`${value}건`, '']}
                          contentStyle={{ borderRadius: '4px', fontSize: '12px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-3xl font-bold" style={{ color: '#4A90A4' }}>{completionPercentage}%</div>
                    </div>
                  </div>
                  <div className="flex-1 pl-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#4A90A4' }}></div>
                        <span className="text-xs text-gray-700">처리 완료 : {completionRatio[0].value}건</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#E5E7EB' }}></div>
                        <span className="text-xs text-gray-700">미완료 : {completionRatio[1].value}건</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 월별 사고 건수 추이 - 총 | AI 탐지 */}
              <div className="bg-white p-4 shadow-sm" style={{ borderRadius: '8px' }}>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">사고 건수 추이</h3>
                <div className="flex items-start gap-4">
                  {/* 왼쪽: 전체 */}
                  <div className="flex-1">
                    <div className="text-xs text-gray-600 mb-2 text-center">총</div>
                    <div onClick={(e: any) => {
                      if (e?.activeLabel) {
                        setSelectedPeriod(e.activeLabel === selectedPeriod ? null : e.activeLabel);
                      }
                    }}>
                      <ResponsiveContainer width="100%" height={110}>
                        <LineChart data={monthlyTrend} margin={{ top: 5, right: 5, left: -25, bottom: 5 }} onClick={(e: any) => {
                          if (e?.activeLabel) {
                            setSelectedPeriod(e.activeLabel === selectedPeriod ? null : e.activeLabel);
                          }
                        }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                          <XAxis dataKey="month" tick={{ fontSize: 9 }} stroke="#9CA3AF" />
                          <YAxis tick={{ fontSize: 9 }} stroke="#9CA3AF" />
                          <Tooltip contentStyle={{ fontSize: '11px' }} />
                          <Line type="monotone" dataKey="전체" stroke="#4B5563" strokeWidth={2} dot={{ r: 2, fill: '#4B5563' }} activeDot={{ r: 4, fill: '#4B5563', stroke: '#fff', strokeWidth: 2 }} />
                          <Line type="monotone" dataKey="쓰레기" stroke="#5B7C99" strokeWidth={1.5} dot={{ r: 2, fill: '#5B7C99' }} activeDot={{ r: 4 }} />
                          <Line type="monotone" dataKey="화재" stroke="#DC2626" strokeWidth={1.5} dot={{ r: 2, fill: '#DC2626' }} activeDot={{ r: 4 }} />
                          <Line type="monotone" dataKey="응급" stroke="#7C2D3B" strokeWidth={1.5} dot={{ r: 2, fill: '#7C2D3B' }} activeDot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-2 space-y-0.5">
                      <p className="text-[9px] text-gray-500 mb-1">{selectedPeriod || monthlyTrend[monthlyTrend.length - 1]?.month || '최근'} 기준</p>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2" style={{ backgroundColor: '#4B5563' }}></div>
                        <span className="text-[10px] text-gray-600" style={{ color: totalChange.isIncrease ? '#DC2626' : '#2563EB' }}>
                          전체: {totalChange.isIncrease ? '▲' : '▼'}{totalChange.change}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2" style={{ backgroundColor: '#5B7C99' }}></div>
                        <span className="text-[10px] text-gray-600" style={{ color: trashChange.isIncrease ? '#DC2626' : '#2563EB' }}>
                          쓰레기: {trashChange.isIncrease ? '▲' : '▼'}{trashChange.change}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2" style={{ backgroundColor: '#DC2626' }}></div>
                        <span className="text-[10px] text-gray-600" style={{ color: fireChange.isIncrease ? '#DC2626' : '#2563EB' }}>
                          화재: {fireChange.isIncrease ? '▲' : '▼'}{fireChange.change}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2" style={{ backgroundColor: '#7C2D3B' }}></div>
                        <span className="text-[10px] text-gray-600" style={{ color: emergencyChange.isIncrease ? '#DC2626' : '#2563EB' }}>
                          응급: {emergencyChange.isIncrease ? '▲' : '▼'}{emergencyChange.change}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 구분선 */}
                  <div className="w-px h-full bg-gray-300" style={{ minHeight: '180px' }}></div>

                  {/* 오른쪽: AI 탐지 */}
                  <div className="flex-1">
                    <div className="text-xs text-emerald-600 mb-2 text-center">AI 탐지</div>
                    <div onClick={(e: any) => {
                      if (e?.activeLabel) {
                        setSelectedPeriod(e.activeLabel === selectedPeriod ? null : e.activeLabel);
                      }
                    }}>
                      <ResponsiveContainer width="100%" height={110}>
                        <LineChart data={monthlyTrendModel} margin={{ top: 5, right: 5, left: -25, bottom: 5 }} onClick={(e: any) => {
                          if (e?.activeLabel) {
                            setSelectedPeriod(e.activeLabel === selectedPeriod ? null : e.activeLabel);
                          }
                        }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                          <XAxis dataKey="month" tick={{ fontSize: 9 }} stroke="#9CA3AF" />
                          <YAxis tick={{ fontSize: 9 }} stroke="#9CA3AF" />
                          <Tooltip contentStyle={{ fontSize: '11px' }} />
                          <Line type="monotone" dataKey="전체" stroke="#059669" strokeWidth={2} dot={{ r: 2, fill: '#059669' }} activeDot={{ r: 4, fill: '#059669', stroke: '#fff', strokeWidth: 2 }} />
                          <Line type="monotone" dataKey="쓰레기" stroke="#5B7C99" strokeWidth={1.5} dot={{ r: 2, fill: '#5B7C99' }} activeDot={{ r: 4 }} />
                          <Line type="monotone" dataKey="화재" stroke="#DC2626" strokeWidth={1.5} dot={{ r: 2, fill: '#DC2626' }} activeDot={{ r: 4 }} />
                          <Line type="monotone" dataKey="응급" stroke="#7C2D3B" strokeWidth={1.5} dot={{ r: 2, fill: '#7C2D3B' }} activeDot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-2 space-y-0.5">
                      <p className="text-[9px] text-emerald-600 mb-1">{selectedPeriod || monthlyTrendModel[monthlyTrendModel.length - 1]?.month || '최근'} 기준</p>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2" style={{ backgroundColor: '#059669' }}></div>
                        <span className="text-[10px] text-emerald-700" style={{ color: totalChangeModel.isIncrease ? '#DC2626' : '#2563EB' }}>
                          전체: {totalChangeModel.isIncrease ? '▲' : '▼'}{totalChangeModel.change}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2" style={{ backgroundColor: '#5B7C99' }}></div>
                        <span className="text-[10px] text-emerald-700" style={{ color: trashChangeModel.isIncrease ? '#DC2626' : '#2563EB' }}>
                          쓰레기: {trashChangeModel.isIncrease ? '▲' : '▼'}{trashChangeModel.change}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2" style={{ backgroundColor: '#DC2626' }}></div>
                        <span className="text-[10px] text-emerald-700" style={{ color: fireChangeModel.isIncrease ? '#DC2626' : '#2563EB' }}>
                          화재: {fireChangeModel.isIncrease ? '▲' : '▼'}{fireChangeModel.change}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2" style={{ backgroundColor: '#7C2D3B' }}></div>
                        <span className="text-[10px] text-emerald-700" style={{ color: emergencyChangeModel.isIncrease ? '#DC2626' : '#2563EB' }}>
                          응급: {emergencyChangeModel.isIncrease ? '▲' : '▼'}{emergencyChangeModel.change}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 하단 섹션 */}
          <div className="grid grid-cols-3 gap-3 mb-3">
            {/* AI 모델 정확도 */}
            <div className="bg-white p-4 shadow-sm" style={{ borderRadius: '8px' }}>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold text-gray-900">AI 모델 정확도</h3>
              </div>
              <div className="space-y-3">
                {[
                  { type: '화재', detected: 120, correct: 110, color: '#DC2626' },
                  { type: '응급', detected: 85, correct: 75, color: '#7C2D3B' },
                  { type: '쓰레기', detected: 200, correct: 175, color: '#5B7C99' }
                ].map((item, index) => {
                  const accuracy = Math.round((item.correct / item.detected) * 100);
                  return (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-700">{item.type}</span>
                        <span className="text-xs font-semibold" style={{ color: item.color }}>{accuracy}%</span>
                      </div>
                      <div className="w-full bg-gray-200 h-2" style={{ borderRadius: '0px' }}>
                        <div
                          className="h-2 transition-all duration-300"
                          style={{ width: `${accuracy}%`, backgroundColor: item.color, borderRadius: '0px' }}
                        ></div>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-[9px] text-gray-500">탐지: {item.detected}건</span>
                        <span className="text-[9px] text-gray-500">정확: {item.correct}건</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CCTV 가동률 */}
            <div className="bg-white p-4 shadow-sm" style={{ borderRadius: '8px' }}>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold text-gray-900">CCTV 가동률</h3>
              </div>
              <div className="flex items-center justify-center gap-6" style={{ height: '140px' }}>
                <div className="relative" style={{ width: '130px', height: '130px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={cctvOperationRate}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={60}
                          dataKey="value"
                          startAngle={90}
                          endAngle={450}
                        >
                          {cctvOperationRate.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="white" strokeWidth={2} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-3xl font-bold" style={{ color: '#4A90A4' }}>{cctvPercentage}%</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-700 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3B82F6' }}></div>
                      <span>ON : {cctvOperationRate[0].value}대</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#E5E7EB' }}></div>
                      <span>OFF : {cctvOperationRate[1].value}대</span>
                    </div>
                  </div>
              </div>
            </div>

            {/* 평균 대응시간 */}
            <div className="bg-white p-4 shadow-sm" style={{ borderRadius: '8px' }}>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold text-gray-900">평균 대응시간</h3>
              </div>
              <div className="flex items-center justify-center gap-4" style={{ height: '140px' }}>
                {avgResponseTime.map((item, index) => {
                  // 가장 긴 시간 찾기
                  const maxTime = Math.max(...avgResponseTime.map(i => i.time));
                  const isLongest = item.time === maxTime && item.type !== '전체';
                  const circleColor = item.type === '전체' ? '#4B5563' : (isLongest ? '#EF4444' : '#3B82F6');
                  
                  return (
                    <div key={index} className="flex flex-col items-center">
                      <div className="relative" style={{ width: '80px', height: '80px' }}>
                        <svg className="w-full h-full" viewBox="0 0 100 100">
                          <circle
                            cx="50"
                            cy="50"
                            r="35"
                            fill="none"
                            stroke="#E5E7EB"
                            strokeWidth="8"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="35"
                            fill="none"
                            stroke={circleColor}
                            strokeWidth="8"
                            strokeDasharray={`${(item.time / 60) * 219.8} 219.8`}
                            transform="rotate(-90 50 50)"
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-lg font-bold text-gray-900">{item.time}분</div>
                        </div>
                      </div>
                      <div className="mt-1 text-xs font-medium text-gray-900">{item.type}</div>
                      {item.change !== undefined && (
                        <div className="text-[10px] flex items-center gap-0.5" style={{ color: item.isIncrease ? '#EF4444' : '#3B82F6' }}>
                          <span>전월대비 {item.change}%</span>
                          {item.isIncrease ? '▲' : '▼'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
