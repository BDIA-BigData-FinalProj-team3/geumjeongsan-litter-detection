import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import KPICard from '../components/KPICard';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getIncidentStats } from '../services/api';
import { useRealtimeNotification } from '../contexts/RealtimeNotificationContext';

interface TrendAnalysisProps {
  onNavigate: (screen: string) => void;
}

interface ChartDataPoint {
  label: string;
  count: number;
}

export default function TrendAnalysis({ onNavigate }: TrendAnalysisProps) {
  const { refreshKey } = useRealtimeNotification();
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [lineData, setLineData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  
  // KPI 상태
  const [changeRate, setChangeRate] = useState<string>('0%');
  const [avgDaily, setAvgDaily] = useState<string>('0건');
  const [maxDate, setMaxDate] = useState<string>('-');

  // ✅ DB에서 데이터 로드
  useEffect(() => {
    const loadTrendData = async () => {
      setLoading(true);
      try {
        const today = new Date();
        let from: string, to: string, unit: 'DAY' | 'MONTH' | 'YEAR';
        
        // 기간별 날짜 범위 설정
        if (period === 'day') {
          // 최근 24시간 (시간별)
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          from = yesterday.toISOString().split('T')[0];
          to = today.toISOString().split('T')[0];
          unit = 'DAY';
        } else if (period === 'week') {
          // 최근 7일 (일별)
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          from = weekAgo.toISOString().split('T')[0];
          to = today.toISOString().split('T')[0];
          unit = 'DAY';
        } else if (period === 'month') {
          // 올해 1월부터 현재 월까지 (월별)
          from = `${today.getFullYear()}-01-01`;
          to = today.toISOString().split('T')[0];
          unit = 'MONTH';
        } else {
          // 최근 6년 (연도별)
          const sixYearsAgo = new Date(today);
          sixYearsAgo.setFullYear(sixYearsAgo.getFullYear() - 5);
          from = `${sixYearsAgo.getFullYear()}-01-01`;
          to = today.toISOString().split('T')[0];
          unit = 'YEAR';
        }

        console.log(`📊 [TrendAnalysis] Loading ${period} data: ${from} ~ ${to} (unit: ${unit})`);
        
        const stats = await getIncidentStats(unit, from, to);
        
        if (!stats || !stats.trend || stats.trend.length === 0) {
          console.warn('⚠️ [TrendAnalysis] No data received');
          setLineData([]);
          return;
        }

        // ✅ 차트 데이터 변환
        const chartData: ChartDataPoint[] = stats.trend.map((point: any) => {
          let label = '';
          const date = new Date(point.period);
          
          if (period === 'day') {
            // 시간별 (00:00 형식) - 실제로는 일별 데이터를 받아서 하루만 표시
            label = `${date.getMonth() + 1}/${date.getDate()}`;
          } else if (period === 'week') {
            // 요일별
            const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
            label = dayNames[date.getDay()];
          } else if (period === 'month') {
            // 월별
            label = `${date.getMonth() + 1}월`;
          } else {
            // 연도별
            label = `${date.getFullYear()}`;
          }
          
          return {
            label,
            count: point.total || 0
          };
        });

        setLineData(chartData);

        // ✅ KPI 계산
        if (chartData.length > 0) {
          // 1. 증감률 계산
          if (chartData.length >= 2) {
            const current = chartData[chartData.length - 1].count;
            const previous = chartData[chartData.length - 2].count;
            if (previous > 0) {
              const rate = ((current - previous) / previous * 100).toFixed(1);
              setChangeRate(parseFloat(rate) >= 0 ? `+${rate}%` : `${rate}%`);
            } else {
              setChangeRate(current > 0 ? '+100%' : '0%');
            }
          }

          // 2. 평균 일일 발생 건수
          const total = chartData.reduce((sum, d) => sum + d.count, 0);
          const avg = (total / chartData.length).toFixed(1);
          setAvgDaily(`${avg}건`);

          // 3. 최대 발생 일자
          const maxPoint = chartData.reduce((max, d) => d.count > max.count ? d : max, chartData[0]);
          setMaxDate(maxPoint.label);
        }

        console.log('✅ [TrendAnalysis] Data loaded:', chartData.length, 'points');
      } catch (error) {
        console.error('❌ [TrendAnalysis] Failed to load data:', error);
        setLineData([]);
      } finally {
        setLoading(false);
      }
    };

    loadTrendData();
  }, [period, refreshKey]);

  // ⚠️ 바 차트는 쓰레기 종류별 데이터가 필요하므로 임시로 더미 데이터 유지
  // TODO: 백엔드에 쓰레기 종류별 통계 API 개발 후 DB 기반으로 변경
  const barData = period === 'day' 
    ? [
        { category: '비닐', yesterday: 8, today: 12 },
        { category: '플라스틱', yesterday: 6, today: 9 },
        { category: '종이', yesterday: 4, today: 5 },
        { category: '캔', yesterday: 3, today: 6 },
        { category: '기타', yesterday: 2, today: 3 },
      ]
    : period === 'week'
    ? [
        { category: '비닐', lastWeek: 45, thisWeek: 52 },
        { category: '플라스틱', lastWeek: 32, thisWeek: 38 },
        { category: '종이', lastWeek: 28, thisWeek: 25 },
        { category: '캔', lastWeek: 18, thisWeek: 22 },
        { category: '기타', lastWeek: 12, thisWeek: 15 },
      ]
    : period === 'month'
    ? [
        { category: '비닐', lastMonth: 120, thisMonth: 95 },
        { category: '플라스틱', lastMonth: 85, thisMonth: 110 },
        { category: '종이', lastMonth: 65, thisMonth: 58 },
        { category: '캔', lastMonth: 45, thisMonth: 52 },
        { category: '기타', lastMonth: 30, thisMonth: 28 },
      ]
    : [
        { category: '비닐', lastYear: 820, thisYear: 890 },
        { category: '플라스틱', lastYear: 680, thisYear: 745 },
        { category: '종이', lastYear: 520, thisYear: 580 },
        { category: '캔', lastYear: 420, thisYear: 465 },
        { category: '기타', lastYear: 280, thisYear: 305 },
      ];
  
  const lineXAxisKey = 'label';
  const barKey1 = period === 'day' ? 'yesterday' : period === 'week' ? 'lastWeek' : period === 'month' ? 'lastMonth' : 'lastYear';
  const barKey2 = period === 'day' ? 'today' : period === 'week' ? 'thisWeek' : period === 'month' ? 'thisMonth' : 'thisYear';
  const barLabel1 = period === 'day' ? '어제' : period === 'week' ? '지난 주' : period === 'month' ? '전월' : '전년';
  const barLabel2 = period === 'day' ? '오늘' : period === 'week' ? '이번 주' : period === 'month' ? '금월' : '금년';
  const chartTitle = period === 'day' ? '전체 건수 (일별)' : period === 'week' ? '전체 건수 (요일별)' : period === 'month' ? '전체 건수 (월별)' : '전체 건수 (연도별)';
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

          {/* KPI Cards - ✅ DB 기반 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <KPICard
              title="전기간 대비 증감률"
              value={loading ? '로딩 중...' : changeRate}
              icon={changeRate.startsWith('+') ? TrendingUp : TrendingDown}
              color={changeRate.startsWith('+') ? 'green' : 'red'}
            />
            <KPICard
              title="평균 발생 건수"
              value={loading ? '로딩 중...' : avgDaily}
              icon={Activity}
              color="blue"
            />
            <KPICard
              title="최대 발생 일자"
              value={loading ? '로딩 중...' : maxDate}
              icon={TrendingDown}
              color="orange"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Line Chart - ✅ DB 기반 */}
            <div className="bg-white shadow-md p-6" style={{ borderRadius: '0px' }}>
              <h3 className="mb-4 text-gray-900">{chartTitle}</h3>
              {loading ? (
                <div className="flex items-center justify-center h-[300px] text-gray-500">
                  데이터 로딩 중...
                </div>
              ) : lineData.length === 0 ? (
                <div className="flex items-center justify-center h-[300px] text-gray-500">
                  데이터가 없습니다
                </div>
              ) : (
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
              )}
            </div>

            {/* Bar Chart - ⚠️ 임시 더미 데이터 (추후 쓰레기 종류별 API 개발 필요) */}
            <div className="bg-white shadow-md p-6" style={{ borderRadius: '0px' }}>
              <h3 className="mb-4 text-gray-900">{barTitle}</h3>
              <div className="text-xs text-yellow-600 mb-2">
                ⚠️ 쓰레기 종류별 데이터는 추후 API 개발 예정
              </div>
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
