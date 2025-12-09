import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import KPICard from '../components/KPICard';
import { Trophy, TrendingUp, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TrashTypeAnalysisProps {
  onNavigate: (screen: string) => void;
}

export default function TrashTypeAnalysis({ onNavigate }: TrashTypeAnalysisProps) {
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month' | 'year'>('month');

  // Different data for each view mode
  const dayData = [
    { hour: '06시', vinyl: 2, plastic: 1, paper: 1, can: 0, other: 0 },
    { hour: '09시', vinyl: 4, plastic: 3, paper: 2, can: 1, other: 1 },
    { hour: '12시', vinyl: 5, plastic: 4, paper: 3, can: 2, other: 1 },
    { hour: '15시', vinyl: 6, plastic: 5, paper: 3, can: 2, other: 2 },
    { hour: '18시', vinyl: 4, plastic: 3, paper: 2, can: 1, other: 1 },
    { hour: '21시', vinyl: 2, plastic: 2, paper: 1, can: 1, other: 0 },
  ];

  const weekData = [
    { day: '월', vinyl: 18, plastic: 12, paper: 10, can: 6, other: 4 },
    { day: '화', vinyl: 22, plastic: 15, paper: 12, can: 8, other: 5 },
    { day: '수', vinyl: 16, plastic: 13, paper: 9, can: 7, other: 3 },
    { day: '목', vinyl: 25, plastic: 18, paper: 14, can: 9, other: 6 },
    { day: '금', vinyl: 20, plastic: 16, paper: 11, can: 8, other: 5 },
    { day: '토', vinyl: 14, plastic: 10, paper: 8, can: 5, other: 3 },
    { day: '일', vinyl: 12, plastic: 9, paper: 6, can: 4, other: 2 },
  ];

  const monthData = [
    { month: '1월', vinyl: 45, plastic: 32, paper: 28, can: 15, other: 10 },
    { month: '2월', vinyl: 52, plastic: 38, paper: 25, can: 18, other: 12 },
    { month: '3월', vinyl: 38, plastic: 42, paper: 30, can: 20, other: 8 },
    { month: '4월', vinyl: 67, plastic: 45, paper: 35, can: 22, other: 15 },
    { month: '5월', vinyl: 55, plastic: 48, paper: 32, can: 25, other: 11 },
    { month: '6월', vinyl: 73, plastic: 52, paper: 38, can: 28, other: 14 },
  ];

  const yearData = [
    { year: '2020', vinyl: 380, plastic: 320, paper: 280, can: 180, other: 120 },
    { year: '2021', vinyl: 450, plastic: 380, paper: 310, can: 220, other: 140 },
    { year: '2022', vinyl: 520, plastic: 420, paper: 350, can: 250, other: 165 },
    { year: '2023', vinyl: 580, plastic: 465, paper: 385, can: 280, other: 190 },
    { year: '2024', vinyl: 640, plastic: 510, paper: 420, can: 310, other: 215 },
    { year: '2025', vinyl: 560, plastic: 490, paper: 390, can: 295, other: 200 },
  ];

  // Select data based on view mode
  const trashData = viewMode === 'day' ? dayData : viewMode === 'week' ? weekData : viewMode === 'month' ? monthData : yearData;
  const xAxisKey = viewMode === 'day' ? 'hour' : viewMode === 'week' ? 'day' : viewMode === 'month' ? 'month' : 'year';
  const chartTitle = viewMode === 'day' ? '쓰레기 종류별 발생량 (시간별)' : viewMode === 'week' ? '쓰레기 종류별 발생량 (요일별)' : viewMode === 'month' ? '쓰레기 종류별 발생량 (월별)' : '쓰레기 종류별 발생량 (연도별)';
  const periodPrefix = viewMode === 'day' ? '전일' : viewMode === 'week' ? '전주' : viewMode === 'month' ? '전월' : '전년';

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="flex-shrink-0" style={{ width: '317.56px', backgroundColor: '#2B2847' }}>
        <Sidebar onNavigate={onNavigate} currentPath="trash-type-analysis" />
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-8">
          <h1 className="mb-8 text-gray-900">쓰레기 종류별 분석</h1>

          {/* View Mode Selector */}
          <div className="flex gap-2 mb-8">
            {[
              { key: 'day', label: '일' },
              { key: 'week', label: '주' },
              { key: 'month', label: '월' },
              { key: 'year', label: '년' },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setViewMode(item.key as typeof viewMode)}
                className={`px-6 py-2 shadow-md hover:shadow-lg transition-all ${
                  viewMode === item.key ? 'bg-emerald-600 text-white' : 'bg-white text-gray-800'
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
              title="가장 많이 발생한 종류 TOP 1"
              value="비닐봉투"
              icon={Trophy}
              color="orange"
            />
            <KPICard
              title={`${periodPrefix} 대비 증가한 종류`}
              value="플라스틱 (+8%)"
              icon={TrendingUp}
              color="red"
            />
            <KPICard
              title={`${periodPrefix} 대비 감소한 종류`}
              value="종이 (-5%)"
              icon={TrendingDown}
              color="green"
            />
          </div>

          {/* Stacked Bar Chart */}
          <div className="bg-white shadow-md p-6" style={{ borderRadius: '0px' }}>
            <h3 className="mb-4 text-gray-900">{chartTitle}</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={trashData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={xAxisKey} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="vinyl" stackId="a" fill="#ef4444" name="비닐" />
                <Bar dataKey="plastic" stackId="a" fill="#3b82f6" name="플라스틱" />
                <Bar dataKey="paper" stackId="a" fill="#10b981" name="종이" />
                <Bar dataKey="can" stackId="a" fill="#f59e0b" name="캔" />
                <Bar dataKey="other" stackId="a" fill="#6b7280" name="기타" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Summary Table */}
          <div className="mt-8 bg-white shadow-md p-6" style={{ borderRadius: '0px' }}>
            <h3 className="mb-4 text-gray-900">종류별 상세 통계</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-gray-600">쓰레기 종류</th>
                    <th className="text-left py-3 px-4 text-gray-600">총 발생량</th>
                    <th className="text-left py-3 px-4 text-gray-600">평균 발생량</th>
                    <th className="text-left py-3 px-4 text-gray-600">전월 대비</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900">비닐봉투</td>
                    <td className="py-3 px-4 text-gray-900">330건</td>
                    <td className="py-3 px-4 text-gray-900">55건</td>
                    <td className="py-3 px-4 text-green-600">+12%</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900">플라스틱</td>
                    <td className="py-3 px-4 text-gray-900">257건</td>
                    <td className="py-3 px-4 text-gray-900">42.8건</td>
                    <td className="py-3 px-4 text-green-600">+8%</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900">종이</td>
                    <td className="py-3 px-4 text-gray-900">188건</td>
                    <td className="py-3 px-4 text-gray-900">31.3건</td>
                    <td className="py-3 px-4 text-red-600">-5%</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900">캔</td>
                    <td className="py-3 px-4 text-gray-900">128건</td>
                    <td className="py-3 px-4 text-gray-900">21.3건</td>
                    <td className="py-3 px-4 text-green-600">+3%</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900">기타</td>
                    <td className="py-3 px-4 text-gray-900">70건</td>
                    <td className="py-3 px-4 text-gray-900">11.7건</td>
                    <td className="py-3 px-4 text-red-600">-2%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}