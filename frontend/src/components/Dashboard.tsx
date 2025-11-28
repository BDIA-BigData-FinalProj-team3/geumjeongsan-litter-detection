import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import KPICard from './KPICard';
import { Flame, AlertTriangle, Mountain, Trash2, Camera, Clock, TrendingUp } from 'lucide-react';
import BACKEND_URL from '@/config/api';

interface DashboardProps {
  onNavigate: (screen: string) => void;
}

interface DashboardStats {
  totalIncidents: number;
  activeIncidents: number;
  resolvedIncidents: number;
  fireCount: number;
  emergencyCount: number;
  rockfallCount: number;
  trashCount: number;
  pendingCount: number;
  inProgressCount: number;
  resolvedCount: number;
  totalCctv: number;
  activeCctv: number;
  inactiveCctv: number;
  avgResponseTime: number;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${BACKEND_URL}/api/dashboard/stats`);
        if (response.ok) {
          const data: DashboardStats = await response.json();
          setStats(data);
        } else {
          setError('대시보드 데이터를 불러오는데 실패했습니다.');
        }
      } catch (err) {
        setError('서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인해주세요.');
        console.error('API 호출 실패:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar onNavigate={onNavigate} currentPath="dashboard" />
        <div className="flex-1 overflow-y-auto">
          <div className="p-8">
            <h1 className="mb-8 text-gray-900">대시보드</h1>
            <div className="bg-white shadow-md p-12 text-center" style={{ borderRadius: '0px' }}>
              <p className="text-gray-400">데이터를 불러오는 중...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar onNavigate={onNavigate} currentPath="dashboard" />
        <div className="flex-1 overflow-y-auto">
          <div className="p-8">
            <h1 className="mb-8 text-gray-900">대시보드</h1>
            <div className="bg-white shadow-md p-12 text-center" style={{ borderRadius: '0px' }}>
              <p className="text-red-500">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar onNavigate={onNavigate} currentPath="dashboard" />
        <div className="flex-1 overflow-y-auto">
          <div className="p-8">
            <h1 className="mb-8 text-gray-900">대시보드</h1>
            <div className="bg-white shadow-md p-12 text-center" style={{ borderRadius: '0px' }}>
              <p className="text-gray-400">대시보드 내용이 비어있습니다.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar onNavigate={onNavigate} currentPath="dashboard" />
      <div className="flex-1 overflow-y-auto">
        <div className="p-8">
          <h1 className="mb-8 text-gray-900">대시보드</h1>
          
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <KPICard
              title="전체 사건"
              value={stats.totalIncidents.toString()}
              icon={<AlertTriangle className="w-6 h-6" />}
              trend={null}
            />
            <KPICard
              title="활성 사건"
              value={stats.activeIncidents.toString()}
              icon={<AlertTriangle className="w-6 h-6 text-orange-500" />}
              trend={null}
            />
            <KPICard
              title="처리완료"
              value={stats.resolvedIncidents.toString()}
              icon={<AlertTriangle className="w-6 h-6 text-green-500" />}
              trend={null}
            />
            <KPICard
              title="평균 대응시간"
              value={stats.avgResponseTime > 0 ? `${stats.avgResponseTime.toFixed(1)}분` : '0분'}
              icon={<Clock className="w-6 h-6 text-blue-500" />}
              trend={null}
            />
          </div>

          {/* 유형별 통계 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 shadow-sm border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">화재</span>
                <Flame className="w-5 h-5 text-red-500" />
              </div>
              <div className="text-gray-900 text-2xl font-semibold">{stats.fireCount}건</div>
            </div>

            <div className="bg-white p-6 shadow-sm border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">응급환자</span>
                <AlertTriangle className="w-5 h-5 text-blue-500" />
              </div>
              <div className="text-gray-900 text-2xl font-semibold">{stats.emergencyCount}건</div>
            </div>

            <div className="bg-white p-6 shadow-sm border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">낙석</span>
                <Mountain className="w-5 h-5 text-amber-800" />
              </div>
              <div className="text-gray-900 text-2xl font-semibold">{stats.rockfallCount}건</div>
            </div>

            <div className="bg-white p-6 shadow-sm border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">쓰레기</span>
                <Trash2 className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-gray-900 text-2xl font-semibold">{stats.trashCount}건</div>
            </div>
          </div>

          {/* CCTV 통계 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 shadow-sm border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">전체 CCTV</span>
                <Camera className="w-5 h-5 text-gray-500" />
              </div>
              <div className="text-gray-900 text-2xl font-semibold">{stats.totalCctv}대</div>
            </div>

            <div className="bg-white p-6 shadow-sm border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">정상 운영</span>
                <Camera className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-gray-900 text-2xl font-semibold">{stats.activeCctv}대</div>
            </div>

            <div className="bg-white p-6 shadow-sm border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">점검 필요</span>
                <Camera className="w-5 h-5 text-orange-500" />
              </div>
              <div className="text-gray-900 text-2xl font-semibold">{stats.inactiveCctv}대</div>
            </div>
          </div>

          {/* 상태별 통계 */}
          <div className="bg-white p-6 shadow-sm border border-gray-200 rounded-lg">
            <h2 className="text-gray-900 mb-4">상태별 현황</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-orange-50 rounded-lg">
                <div className="text-gray-600 mb-1">대기중</div>
                <div className="text-gray-900 text-xl font-semibold">{stats.pendingCount}건</div>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-gray-600 mb-1">대응중</div>
                <div className="text-gray-900 text-xl font-semibold">{stats.inProgressCount}건</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-gray-600 mb-1">처리완료</div>
                <div className="text-gray-900 text-xl font-semibold">{stats.resolvedCount}건</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
