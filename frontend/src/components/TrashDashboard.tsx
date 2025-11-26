import { Trash2, AlertTriangle, Clock, MapPin, HelpCircle } from 'lucide-react';
import Sidebar from './Sidebar';
import { useState } from 'react';

interface TrashDashboardProps {
  onNavigate?: (screen: string) => void;
}

export default function TrashDashboard({ onNavigate }: TrashDashboardProps) {
  const [viewMode, setViewMode] = useState<'active' | 'completed'>('active');
  const [showTooltip, setShowTooltip] = useState(false);

  const activeTrashIncidents = [
    { id: 1, cctvId: 'CCTV-005', time: '2025-11-25 14:25', status: '대기중', severity: 'high', type: '대형쓰레기', handler: '환경 관리 직원' },
    { id: 2, cctvId: 'CCTV-001', time: '2025-11-25 14:10', status: '대응중', severity: 'medium', type: '일반쓰레기', handler: '환경 관리 직원' },
    { id: 3, cctvId: 'CCTV-007', time: '2025-11-25 13:55', status: '대기중', severity: 'medium', type: '플라스틱', handler: '환경 관리 직원' },
  ];

  const completedTrashIncidents = [
    { id: 4, cctvId: 'CCTV-002', time: '2025-11-25 13:00', responseTime: '2025-11-25 13:28', duration: '28분', status: '처리완료', severity: 'low', type: '음식물', handler: '환경 관리 직원' },
    { id: 5, cctvId: 'CCTV-004', time: '2025-11-25 12:00', responseTime: '2025-11-25 12:35', duration: '35분', status: '처리완료', severity: 'medium', type: '플라��틱', handler: '환경 관리 직원' },
    { id: 6, cctvId: 'CCTV-003', time: '2025-11-25 11:00', responseTime: '2025-11-25 11:30', duration: '30분', status: '처리완료', severity: 'low', type: '일반쓰레기', handler: '환경 관리 직원' },
  ];

  const trashIncidents = viewMode === 'active' ? activeTrashIncidents : completedTrashIncidents;

  return (
    <div className="flex h-screen">
      <Sidebar onNavigate={onNavigate || (() => {})} currentPath="trash-dashboard" />
      <div className="flex-1 overflow-y-auto">
        <div className="p-8 bg-gray-50 min-h-screen">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-gray-900 mb-8">쓰레기 투기 현황</h1>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 shadow-sm border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">당일 발생</span>
                  <Trash2 className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-gray-900">12건</div>
              </div>

              <div className="bg-white p-6 shadow-sm border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">대기중</span>
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                </div>
                <div className="text-gray-900">2건</div>
              </div>

              <div className="bg-white p-6 shadow-sm border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">평균 대응시간</span>
                  <Clock className="w-5 h-5 text-blue-500" />
                </div>
                <div className="text-gray-900">32분</div>
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
                      당월 8건 발생 지역
                      <div className="absolute -bottom-1 right-2 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">위험지역</span>
                  <MapPin className="w-5 h-5 text-purple-500" />
                </div>
                <div className="text-gray-900">공원중앙</div>
              </div>
            </div>

            {/* Trash Incidents List */}
            <div className="bg-white shadow-sm border border-gray-200" style={{ borderRadius: '0px' }}>
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-gray-900">쓰레기 투기 목록</h2>
                
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
                      <th className="px-6 py-3 text-left text-gray-600">상태</th>
                      <th className="px-6 py-3 text-left text-gray-600">처리자</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trashIncidents.map((incident) => (
                      <tr key={incident.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-900">{incident.cctvId}</td>
                        <td className="px-6 py-4 text-gray-600">{incident.time}</td>
                        {viewMode === 'completed' && 'responseTime' in incident && (
                          <>
                            <td className="px-6 py-4 text-gray-600">{incident.responseTime}</td>
                            <td className="px-6 py-4 text-gray-600">{incident.duration}</td>
                          </>
                        )}
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 text-sm ${
                            incident.severity === 'high' 
                              ? 'bg-red-100 text-red-700' 
                              : incident.severity === 'medium'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-blue-100 text-blue-700'
                          }`} style={{ borderRadius: '0px' }}>
                            {incident.severity === 'high' ? '상' : incident.severity === 'medium' ? '중' : '하'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 text-sm ${
                            incident.status === '대응중' 
                              ? 'bg-green-100 text-green-700' 
                              : incident.status === '대기중'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-gray-100 text-gray-700'
                          }`} style={{ borderRadius: '0px' }}>
                            {incident.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{incident.handler}</td>
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