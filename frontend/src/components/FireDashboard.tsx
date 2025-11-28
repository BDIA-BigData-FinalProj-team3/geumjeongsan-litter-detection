import { Flame, AlertTriangle, Clock, Wind, MapPin, HelpCircle, X } from 'lucide-react';
import Sidebar from './Sidebar';
import { useState, useEffect } from 'react';

interface FireDashboardProps {
  onNavigate?: (screen: string) => void;
}

interface Fire {
  id: number;
  cctvId: string;
  incidentTime: string;  // 백엔드 필드명과 일치
  status: string;
  severity: 'high' | 'medium' | 'low';
  windSpeed: string;
  handler: string;
  responseTime?: string;
  duration?: string;
}

export default function FireDashboard({ onNavigate }: FireDashboardProps) {
  const [viewMode, setViewMode] = useState<'active' | 'completed'>('active');
  const [showTooltip, setShowTooltip] = useState(false);
  const [activeFires, setActiveFires] = useState<Fire[]>([]);
  const [completedFires, setCompletedFires] = useState<Fire[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [todayCount, setTodayCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [avgResponseTime, setAvgResponseTime] = useState(0);
  const [currentWindSpeed, setCurrentWindSpeed] = useState('N/A');
  const [riskAreas, setRiskAreas] = useState<string[]>([]);

  const fetchFires = async () => {
    setLoading(true);
    setError(null);
    try {
      // 화재 대시보드 데이터 조회 (발생/처리완료 모두 포함)
      const response = await fetch('http://localhost:8080/api/fires/dashboard');
      if (response.ok) {
        const dashboardData = await response.json();
        setActiveFires(dashboardData.activeIncidents || []);
        setCompletedFires(dashboardData.resolvedIncidents || []);
        setTodayCount(dashboardData.todayCount || 0);
        setPendingCount(dashboardData.pendingCount || 0);
        setAvgResponseTime(dashboardData.avgResponseTime || 0);
        setCurrentWindSpeed(dashboardData.currentWindSpeed || 'N/A');
        setRiskAreas(dashboardData.riskAreas || []);
      } else {
        setError('화재 데이터를 불러오는데 실패했습니다.');
      }
    } catch (err) {
      setError('서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인해주세요.');
      console.error('API 호출 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFires();
  }, []);

  const fires = viewMode === 'active' ? activeFires : completedFires;

  return (
    <div className="flex h-screen">
      <Sidebar onNavigate={onNavigate || (() => {})} currentPath="fire-dashboard" />
      <div className="flex-1 overflow-y-auto">
        <div className="p-8 bg-gray-50 min-h-screen">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-gray-900 mb-8">화재 상황 현황</h1>

            {/* 에러 메시지 */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 flex items-center justify-between" style={{ borderRadius: '0px' }}>
                <span>{error}</span>
                <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* 로딩 표시 */}
            {loading && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 text-blue-700 text-center" style={{ borderRadius: '0px' }}>
                처리 중...
              </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
              <div className="bg-white p-6 shadow-sm border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">오늘 발생</span>
                  <Flame className="w-5 h-5 text-red-500" />
                </div>
                <div className="text-gray-900">{todayCount}건</div>
              </div>

              <div className="bg-white p-6 shadow-sm border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">대기중</span>
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                </div>
                <div className="text-gray-900">{pendingCount}건</div>
              </div>

              <div className="bg-white p-6 shadow-sm border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">평균 대응시간</span>
                  <Clock className="w-5 h-5 text-blue-500" />
                </div>
                <div className="text-gray-900">{avgResponseTime > 0 ? `${avgResponseTime.toFixed(1)}분` : '-'}</div>
              </div>

              <div className="bg-white p-6 shadow-sm border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">현재 풍속</span>
                  <Wind className="w-5 h-5 text-gray-500" />
                </div>
                <div className="text-gray-900">{currentWindSpeed}</div>
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
                      당월 발생 지역
                      <div className="absolute -bottom-1 right-2 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">위험지역</span>
                  <MapPin className="w-5 h-5 text-purple-500" />
                </div>
                <div className="text-gray-900">{riskAreas.length > 0 ? riskAreas[0] : '-'}</div>
              </div>
            </div>

            {/* Fire List */}
            <div className="bg-white shadow-sm border border-gray-200" style={{ borderRadius: '0px' }}>
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-gray-900">화재 사건 목록</h2>
                
                {/* Toggle Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode('active')}
                    className={`px-6 py-2 transition-colors ${
                      viewMode === 'active'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    style={{ borderRadius: '0px' }}
                  >
                    발생
                  </button>
                  <button
                    onClick={() => setViewMode('completed')}
                    className={`px-6 py-2 transition-colors ${
                      viewMode === 'completed'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    style={{ borderRadius: '0px' }}
                  >
                    처리완료
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-gray-600">CCTV ID</th>
                      <th className="px-6 py-3 text-left text-gray-600">발생시간</th>
                      {viewMode === 'completed' && (
                        <>
                          <th className="px-6 py-3 text-left text-gray-600">대응시각</th>
                          <th className="px-6 py-3 text-left text-gray-600">소요시간</th>
                        </>
                      )}
                      <th className="px-6 py-3 text-left text-gray-600">심각도</th>
                      <th className="px-6 py-3 text-left text-gray-600">풍속</th>
                      <th className="px-6 py-3 text-left text-gray-600">상태</th>
                      <th className="px-6 py-3 text-left text-gray-600">처리자</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fires.map((fire) => (
                      <tr key={fire.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-900">{fire.cctvId}</td>
                        <td className="px-6 py-4 text-gray-600">{fire.incidentTime || '-'}</td>
                        {viewMode === 'completed' && (
                          <>
                            <td className="px-6 py-4 text-gray-600">{fire.responseTime || '-'}</td>
                            <td className="px-6 py-4 text-gray-600">{fire.duration || '-'}</td>
                          </>
                        )}
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 text-sm ${
                            fire.severity === 'high' 
                              ? 'bg-red-100 text-red-700' 
                              : fire.severity === 'medium'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-blue-100 text-blue-700'
                          }`} style={{ borderRadius: '0px' }}>
                            {fire.severity === 'high' ? '상' : fire.severity === 'medium' ? '중' : '하'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{fire.windSpeed}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 text-sm ${
                            fire.status === '진화중' 
                              ? 'bg-green-100 text-green-700' 
                              : fire.status === '대기중'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-gray-100 text-gray-700'
                          }`} style={{ borderRadius: '0px' }}>
                            {fire.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{fire.handler}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}