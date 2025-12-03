import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import HamburgerMenuButton from '../components/HamburgerMenuButton';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { getDailyStats, getAllMonthlyData, getAvgResponseTime, getCCTVSummary } from '../services/api';
import { cctvSummary } from '../services/common';

interface DashboardProps {
  onNavigate: (screen: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isPeriodSelected, setIsPeriodSelected] = useState(false);

  // 데이터 상태 관리
  const [dailyStats, setDailyStats] = useState<Array<{ label: string; value: string }>>([]);
  const [allMonthlyData, setAllMonthlyData] = useState<Array<{ year: number; month: number; monthLabel: string; 쓰레기: number; 화재: number; 응급: number; 기타: number; 처리완료: number; 미완료: number; cctvOn: number; cctvOff: number }>>([]);
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
      setAllMonthlyData(monthly);
      setAvgResponseTime(responseTime);
    };
    
    loadDashboardData();
  }, []);

  // 기간 필터링 함수
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
        completionRatio: [
          { name: '처리 완료', value: 0, color: '#4A90A4' },
          { name: '미완료', value: 0, color: '#E5E7EB' },
        ],
        monthlyTrend: [],
        cctvOperationRate: [
          { status: 'ON', value: 0, color: '#3B82F6' },
          { status: 'OFF', value: 0, color: '#E5E7EB' },
        ],
      };
    }

    if (!isPeriodSelected || !startDate || !endDate) {
      // 기본값: 현재 월 (12월)
      const currentMonth = allMonthlyData[allMonthlyData.length - 1];
      return {
        accidentRatio: [
          { name: '응급', value: currentMonth.응급, color: '#7C2D3B' },
          { name: '화재', value: currentMonth.화재, color: '#E87C7C' },
          { name: '쓰레기', value: currentMonth.쓰레기, color: '#5B7C99' },
          { name: '기타', value: currentMonth.기타, color: '#4A5568' },
        ],
        completionRatio: [
          { name: '처리 완료', value: currentMonth.처리완료, color: '#4A90A4' },
          { name: '미완료', value: currentMonth.미완료, color: '#E5E7EB' },
        ],
        monthlyTrend: allMonthlyData.map(d => ({
          month: d.monthLabel,
          쓰레기: d.쓰레기,
          화재: d.화재,
          응급: d.응급,
        })),
        cctvOperationRate: [
          { status: 'ON', value: currentMonth.cctvOn, color: '#3B82F6' },
          { status: 'OFF', value: currentMonth.cctvOff, color: '#E5E7EB' },
        ],
      };
    }

    const [startYear, startMonth] = startDate.split('-').map(Number);
    const [endYear, endMonth] = endDate.split('-').map(Number);

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
        completionRatio: [
          { name: '처리 완료', value: 0, color: '#4A90A4' },
          { name: '미완료', value: 0, color: '#E5E7EB' },
        ],
        monthlyTrend: [],
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
      completionRatio: [
        { name: '처리 완료', value: total처리완료, color: '#4A90A4' },
        { name: '미완료', value: total미완료, color: '#E5E7EB' },
      ],
      monthlyTrend: filtered.map(d => ({
        month: d.monthLabel,
        쓰레기: d.쓰레기,
        화재: d.화재,
        응급: d.응급,
      })),
      cctvOperationRate: [
        { status: 'ON', value: Math.round(avgCctvOn * 10) / 10, color: '#3B82F6' },
        { status: 'OFF', value: Math.round(avgCctvOff * 10) / 10, color: '#E5E7EB' },
      ],
    };
  };

  const filteredData = getFilteredData();
  const accidentRatio = filteredData.accidentRatio;
  const completionRatio = filteredData.completionRatio;
  const monthlyTrend = filteredData.monthlyTrend;
  const cctvOperationRate = filteredData.cctvOperationRate;

  // 전월 대비 증가율 계산 함수
  const calculateMonthOverMonthChange = (type: '쓰레기' | '화재' | '응급') => {
    if (monthlyTrend.length < 2) return { change: 0, isIncrease: false };
    
    const currentMonth = monthlyTrend[monthlyTrend.length - 1];
    const previousMonth = monthlyTrend[monthlyTrend.length - 2];
    
    const currentValue = currentMonth[type];
    const previousValue = previousMonth[type];
    
    if (previousValue === 0) return { change: 0, isIncrease: currentValue > 0 };
    
    const changePercent = Math.round(((currentValue - previousValue) / previousValue) * 100);
    return { change: Math.abs(changePercent), isIncrease: changePercent > 0 };
  };

  const trashChange = calculateMonthOverMonthChange('쓰레기');
  const fireChange = calculateMonthOverMonthChange('화재');
  const emergencyChange = calculateMonthOverMonthChange('응급');

  // 처리 완료율 계산
  const completionPercentage = completionRatio[0].value + completionRatio[1].value > 0
    ? Math.round((completionRatio[0].value / (completionRatio[0].value + completionRatio[1].value)) * 100)
    : 0;

  // CCTV 가동률 계산
  const cctvPercentage = cctvOperationRate[0].value + cctvOperationRate[1].value > 0
    ? Math.round((cctvOperationRate[0].value / (cctvOperationRate[0].value + cctvOperationRate[1].value)) * 100)
    : 0;

  const handleDateApply = () => {
    if (startDate && endDate) {
      setIsPeriodSelected(true);
      setShowDatePicker(false);
    }
  };

  const handleDateReset = () => {
    setStartDate('');
    setEndDate('');
    setIsPeriodSelected(false);
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
            <h1 className="text-gray-100">전체 현황</h1>
          </div>
        </div>

        <div className="p-4" style={{ backgroundColor: '#F3F4F6' }}>
          {/* 당일 전체 사고 현황 */}
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-base font-semibold text-gray-900">당일 전체 사고 현황</h2>
              <Search className="w-4 h-4 text-gray-600" />
            </div>
            <div className="grid grid-cols-4 gap-3">
              {dailyStats.map((stat, index) => (
                <div key={index} className="bg-white p-3 shadow-sm" style={{ borderRadius: '8px' }}>
                  <div className="text-xs text-gray-700 mb-2">{stat.label}</div>
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 당월 전체 사고 현황 */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-gray-900">
                  {isPeriodSelected ? '선택 기간 전체 사고 현황' : '당월 전체 사고 현황'}
                </h2>
                <Search className="w-4 h-4 text-gray-600" />
                <div className="relative" ref={datePickerRef}>
                  <button 
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className="px-3 py-1.5 text-xs bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 ml-2"
                    style={{ borderRadius: '4px' }}
                  >
                    기간(월) 선택
                  </button>
                  {showDatePicker && (
                    <div className="absolute top-full right-0 mt-2 bg-white border border-gray-300 shadow-lg p-4 z-10" style={{ borderRadius: '8px', minWidth: '300px' }}>
                      <div className="mb-3">
                        <label className="block text-xs text-gray-700 mb-1">시작 기간</label>
                        <input
                          type="month"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300"
                          style={{ borderRadius: '4px' }}
                        />
                      </div>
                      <div className="mb-3">
                        <label className="block text-xs text-gray-700 mb-1">종료 기간</label>
                        <input
                          type="month"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300"
                          style={{ borderRadius: '4px' }}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleDateApply}
                          className="flex-1 px-3 py-1.5 text-xs bg-blue-600 text-white hover:bg-blue-700"
                          style={{ borderRadius: '4px' }}
                        >
                          적용
                        </button>
                        <button
                          onClick={handleDateReset}
                          className="flex-1 px-3 py-1.5 text-xs bg-gray-200 text-gray-700 hover:bg-gray-300"
                          style={{ borderRadius: '4px' }}
                        >
                          초기화
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              {/* 사고 비율 */}
              <div className="bg-white p-4 shadow-sm" style={{ borderRadius: '8px' }}>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">사고 비율</h3>
                <div className="flex items-center justify-between">
                  <div className="relative" style={{ width: '160px', height: '160px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={accidentRatio}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={75}
                          dataKey="value"
                          startAngle={90}
                          endAngle={450}
                          label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
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
                  <div className="flex-1 pl-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#7C2D3B' }}></div>
                        <span className="text-xs text-gray-800">응급 : {accidentRatio[0].value}건</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#E87C7C' }}></div>
                        <span className="text-xs text-gray-800">화재 : {accidentRatio[1].value}건</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#5B7C99' }}></div>
                        <span className="text-xs text-gray-800">쓰레기 : {accidentRatio[2].value}건</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#4A5568' }}></div>
                        <span className="text-xs text-gray-800">기타 : {accidentRatio[3].value}건</span>
                      </div>
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

              {/* 월별 사고 건수 추이 */}
              <div className="bg-white p-4 shadow-sm" style={{ borderRadius: '8px' }}>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">월별 사고 건수 추이</h3>
                  <Search className="w-4 h-4 text-gray-600" />
                </div>
                <ResponsiveContainer width="100%" height={130}>
                  <LineChart data={monthlyTrend} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#9CA3AF" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#9CA3AF" />
                    <Tooltip />
                    <Line type="monotone" dataKey="쓰레기" stroke="#5B7C99" strokeWidth={1.5} dot={{ r: 2.5, fill: '#5B7C99' }} />
                    <Line type="monotone" dataKey="화재" stroke="#DC2626" strokeWidth={1.5} dot={{ r: 2.5, fill: '#DC2626' }} />
                    <Line type="monotone" dataKey="응급" stroke="#7C2D3B" strokeWidth={1.5} dot={{ r: 2.5, fill: '#7C2D3B' }} />
                  </LineChart>
                </ResponsiveContainer>
                <div className="mt-2 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5" style={{ backgroundColor: '#5B7C99' }}></div>
                    <span className="text-[10px] text-gray-600">
                      쓰레기 전월 대비 {trashChange.change}% {trashChange.isIncrease ? '증가' : '감소'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5" style={{ backgroundColor: '#DC2626' }}></div>
                    <span className="text-[10px] text-gray-600">
                      화재 전월 대비 {fireChange.change}% {fireChange.isIncrease ? '증가' : '감소'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5" style={{ backgroundColor: '#7C2D3B' }}></div>
                    <span className="text-[10px] text-gray-600">
                      응급 전월 대비 {emergencyChange.change}% {emergencyChange.isIncrease ? '증가' : '감소'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 하단 섹션 */}
          <div className="grid grid-cols-2 gap-3">
            {/* 월 평균 CCTV 가동률 */}
            <div className="bg-white p-4 shadow-sm" style={{ borderRadius: '8px' }}>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold text-gray-900">월 평균 CCTV 가동률</h3>
                <Search className="w-4 h-4 text-gray-600" />
              </div>
              <div className="flex items-center justify-center gap-8" style={{ height: '150px' }}>
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

            {/* 월 평균 대응 시간 */}
            <div className="bg-white p-4 shadow-sm" style={{ borderRadius: '8px' }}>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold text-gray-900">월 평균 대응 시간</h3>
                <Search className="w-4 h-4 text-gray-600" />
              </div>
              <div className="flex items-center justify-center gap-6" style={{ height: '150px' }}>
                {avgResponseTime.map((item, index) => (
                  <div key={index} className="flex flex-col items-center">
                    <div className="relative" style={{ width: '100px', height: '100px' }}>
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
                          stroke={item.isIncrease ? '#EF8B8B' : '#64A4D6'}
                          strokeWidth="8"
                          strokeDasharray={`${(item.time / 60) * 219.8} 219.8`}
                          transform="rotate(-90 50 50)"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-2xl font-bold text-gray-900">{item.time}분</div>
                      </div>
                    </div>
                    <div className="mt-2 text-sm font-medium text-gray-900">{item.type}</div>
                    <div className="text-xs flex items-center gap-1" style={{ color: item.isIncrease ? '#EF4444' : '#3B82F6' }}>
                      <span className="font-semibold">전월 대비 {Math.abs(item.change)}%</span>
                      {item.isIncrease ? (
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M8 4 L12 10 L4 10 Z" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M8 12 L12 6 L4 6 Z" />
                        </svg>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
