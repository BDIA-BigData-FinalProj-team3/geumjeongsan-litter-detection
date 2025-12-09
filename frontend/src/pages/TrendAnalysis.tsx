import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import KPICard from '../components/KPICard';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TrendAnalysisProps {
  onNavigate: (screen: string) => void;
}

export default function TrendAnalysis({ onNavigate }: TrendAnalysisProps) {
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');

  // Different data for each period
  const dayData = [
    { time: '00:00', count: 5 },
    { time: '04:00', count: 2 },
    { time: '08:00', count: 12 },
    { time: '12:00', count: 18 },
    { time: '16:00', count: 22 },
    { time: '20:00', count: 15 },
  ];

  const weekData = [
    { day: '월', count: 65 },
    { day: '화', count: 72 },
    { day: '수', count: 58 },
    { day: '목', count: 81 },
    { day: '금', count: 69 },
    { day: '토', count: 45 },
    { day: '일', count: 38 },
  ];

  const monthData = [
    { month: '1월', count: 45 },
    { month: '2월', count: 52 },
    { month: '3월', count: 38 },
    { month: '4월', count: 67 },
    { month: '5월', count: 55 },
    { month: '6월', count: 73 },
    { month: '7월', count: 82 },
    { month: '8월', count: 69 },
    { month: '9월', count: 78 },
    { month: '10월', count: 91 },
    { month: '11월', count: 85 },
  ];

  const yearData = [
    { year: '2020', count: 520 },
    { year: '2021', count: 680 },
    { year: '2022', count: 745 },
    { year: '2023', count: 820 },
    { year: '2024', count: 890 },
    { year: '2025', count: 765 },
  ];

  const barDayData = [
    { category: '비닐', yesterday: 8, today: 12 },
    { category: '플라스틱', yesterday: 6, today: 9 },
    { category: '종이', yesterday: 4, today: 5 },
    { category: '캔', yesterday: 3, today: 6 },
    { category: '기타', yesterday: 2, today: 3 },
  ];

  const barWeekData = [
    { category: '비닐', lastWeek: 45, thisWeek: 52 },
    { category: '플라스틱', lastWeek: 32, thisWeek: 38 },
    { category: '종이', lastWeek: 28, thisWeek: 25 },
    { category: '캔', lastWeek: 18, thisWeek: 22 },
    { category: '기타', lastWeek: 12, thisWeek: 15 },
  ];

  const barMonthData = [
    { category: '비닐', lastMonth: 120, thisMonth: 95 },
    { category: '플라스틱', lastMonth: 85, thisMonth: 110 },
    { category: '종이', lastMonth: 65, thisMonth: 58 },
    { category: '캔', lastMonth: 45, thisMonth: 52 },
    { category: '기타', lastMonth: 30, thisMonth: 28 },
  ];

  const barYearData = [
    { category: '비닐', lastYear: 820, thisYear: 890 },
    { category: '플라스틱', lastYear: 680, thisYear: 745 },
    { category: '종이', lastYear: 520, thisYear: 580 },
    { category: '캔', lastYear: 420, thisYear: 465 },
    { category: '기타', lastYear: 280, thisYear: 305 },
  ];

  // Select data based on period
  const lineData = period === 'day' ? dayData : period === 'week' ? weekData : period === 'month' ? monthData : yearData;
  const barData = period === 'day' ? barDayData : period === 'week' ? barWeekData : period === 'month' ? barMonthData : barYearData;
  
  const lineXAxisKey = period === 'day' ? 'time' : period === 'week' ? 'day' : period === 'month' ? 'month' : 'year';
  const barKey1 = period === 'day' ? 'yesterday' : period === 'week' ? 'lastWeek' : period === 'month' ? 'lastMonth' : 'lastYear';
  const barKey2 = period === 'day' ? 'today' : period === 'week' ? 'thisWeek' : period === 'month' ? 'thisMonth' : 'thisYear';
  const barLabel1 = period === 'day' ? '어제' : period === 'week' ? '지난 주' : period === 'month' ? '전월' : '전년';
  const barLabel2 = period === 'day' ? '오늘' : period === 'week' ? '이번 주' : period === 'month' ? '금월' : '금년';
  const chartTitle = period === 'day' ? '전체 건수 (시간별)' : period === 'week' ? '전체 건수 (요일별)' : period === 'month' ? '전체 건수 (월별)' : '전체 건수 (연도별)';
  const barTitle = period === 'day' ? '어제 vs 오늘 투기량' : period === 'week' ? '지난 주 vs 이번 주 투기량' : period === 'month' ? '전월 vs 금월 투기량' : '전년 vs 금년 투기량';

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="flex-shrink-0" style={{ width: '317.56px', backgroundColor: '#2B2847' }}>
        <Sidebar onNavigate={onNavigate} currentPath="trend-analysis" />
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-8">
          <h1 className="mb-8 text-gray-900">발생 추세 분석</h1>

          {/* Period Selector */}
          <div className="flex gap-2 mb-8">
            {[
              { key: 'day', label: '일' },
              { key: 'week', label: '주' },
              { key: 'month', label: '월' },
              { key: 'year', label: '년' },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setPeriod(item.key as typeof period)}
                className={`px-6 py-2 shadow-md hover:shadow-lg transition-all ${
                  period === item.key ? 'bg-emerald-600 text-white' : 'bg-white text-gray-800'
                }`}
                style={{ borderRadius: '0px' }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <KPICard
              title="전월 대비 증감률"
              value="+12.5%"
              icon={TrendingUp}
              color="green"
            />
            <KPICard
              title="평균 일일 발생 건수"
              value="2.8건"
              icon={Activity}
              color="blue"
            />
            <KPICard
              title="최대 발생 일자"
              value="11월 15일"
              icon={TrendingDown}
              color="orange"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Line Chart */}
            <div className="bg-white shadow-md p-6" style={{ borderRadius: '0px' }}>
              <h3 className="mb-4 text-gray-900">{chartTitle}</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey={lineXAxisKey} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} name="발생 건수" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Bar Chart */}
            <div className="bg-white shadow-md p-6" style={{ borderRadius: '0px' }}>
              <h3 className="mb-4 text-gray-900">{barTitle}</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey={barKey1} fill="#94a3b8" name={barLabel1} />
                  <Bar dataKey={barKey2} fill="#10b981" name={barLabel2} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}