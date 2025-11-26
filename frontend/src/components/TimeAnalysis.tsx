import { useState } from 'react';
import Sidebar from './Sidebar';
import KPICard from './KPICard';
import { Clock, Sun, Moon } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TimeAnalysisProps {
  onNavigate: (screen: string) => void;
}

export default function TimeAnalysis({ onNavigate }: TimeAnalysisProps) {
  const [filter, setFilter] = useState<'today' | 'week' | 'month' | 'year'>('today');

  // Different data for each filter
  const todayData = [
    { time: '00:00', count: 1 },
    { time: '02:00', count: 0 },
    { time: '04:00', count: 2 },
    { time: '06:00', count: 5 },
    { time: '08:00', count: 12 },
    { time: '10:00', count: 18 },
    { time: '12:00', count: 15 },
    { time: '14:00', count: 22 },
    { time: '16:00', count: 19 },
    { time: '18:00', count: 14 },
    { time: '20:00', count: 9 },
    { time: '22:00', count: 4 },
  ];

  const weekData = [
    { day: '월요일', count: 65 },
    { day: '화요일', count: 72 },
    { day: '수요일', count: 58 },
    { day: '목요일', count: 81 },
    { day: '금요일', count: 69 },
    { day: '토요일', count: 45 },
    { day: '일요일', count: 38 },
  ];

  const monthData = [
    { week: '1주차', count: 145 },
    { week: '2주차', count: 168 },
    { week: '3주차', count: 132 },
    { week: '4주차', count: 189 },
  ];

  const yearData = [
    { month: '1월', count: 420 },
    { month: '2월', count: 385 },
    { month: '3월', count: 465 },
    { month: '4월', count: 520 },
    { month: '5월', count: 580 },
    { month: '6월', count: 615 },
    { month: '7월', count: 690 },
    { month: '8월', count: 655 },
    { month: '9월', count: 598 },
    { month: '10월', count: 632 },
    { month: '11월', count: 588 },
    { month: '12월', count: 545 },
  ];

  // Select data based on filter
  const timeData = filter === 'today' ? todayData : filter === 'week' ? weekData : filter === 'month' ? monthData : yearData;
  const xAxisKey = filter === 'today' ? 'time' : filter === 'week' ? 'day' : filter === 'month' ? 'week' : 'month';
  const chartTitle = filter === 'today' ? '시간대별 총합 그래프 (금일)' : filter === 'week' ? '요일별 총합 그래프 (금주)' : filter === 'month' ? '주차별 총합 그래프 (금월)' : filter === 'year' ? '월별 총합 그래프 (금년)' : '시간대별 총합 그래프';

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar onNavigate={onNavigate} currentPath="time-analysis" />
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-8">
          <h1 className="mb-8 text-gray-900">시간대별 분석</h1>

          {/* Filter Buttons */}
          <div className="flex gap-2 mb-8">
            {[
              { key: 'today', label: '금일' },
              { key: 'week', label: '금주' },
              { key: 'month', label: '금월' },
              { key: 'year', label: '금년' },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setFilter(item.key as typeof filter)}
                className={`px-6 py-2 shadow-md hover:shadow-lg transition-all ${
                  filter === item.key ? 'bg-emerald-600 text-white' : 'bg-white text-gray-800'
                }`}
                style={{ borderRadius: '0px' }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <KPICard
              title="가장 많이 발생한 시간대"
              value="14:00 - 16:00"
              icon={Sun}
              color="orange"
            />
            <KPICard
              title="가장 적게 발생한 시간대"
              value="04:00 - 06:00"
              icon={Moon}
              color="blue"
            />
          </div>

          {/* Time Chart */}
          <div className="bg-white shadow-md p-6" style={{ borderRadius: '0px' }}>
            <h3 className="mb-4 text-gray-900">{chartTitle}</h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={timeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={xAxisKey} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} name="발생 건수" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}