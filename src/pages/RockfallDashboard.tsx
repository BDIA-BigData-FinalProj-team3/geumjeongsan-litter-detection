import { Mountain, AlertTriangle, Clock, MapPin, HelpCircle, User, LogOut } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import HamburgerMenuButton from '../components/HamburgerMenuButton';
import { useState, useEffect } from 'react';
import { getActiveRockfalls, getCompletedRockfalls } from '../services/api';

interface RockfallDashboardProps {
  onNavigate?: (screen: string) => void;
}

export default function RockfallDashboard({ onNavigate }: RockfallDashboardProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<'active' | 'completed'>('active');
  const [showTooltip, setShowTooltip] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [activeRockfalls, setActiveRockfalls] = useState([
    { id: 1, cctvId: 'CCTV-003', time: '2025-11-25 14:00', status: '대응중', severity: 'high', magnitude: '3.2', handler: '산림 관리 직원' },
    { id: 2, cctvId: 'CCTV-007', time: '2025-11-25 13:40', status: '대기중', severity: 'medium', magnitude: '2.9', handler: '산림 관리 직원' },
  ]);

  const [completedRockfalls, setCompletedRockfalls] = useState([
    { id: 3, cctvId: 'CCTV-002', time: '2025-11-25 13:00', responseTime: '2025-11-25 13:15', duration: '15분', status: '처리완료', severity: 'low', magnitude: '1.8', handler: '산림 관리 직원' },
    { id: 4, cctvId: 'CCTV-004', time: '2025-11-25 11:30', responseTime: '2025-11-25 11:55', duration: '25분', status: '처리완료', severity: 'medium', magnitude: '2.1', handler: '산림 관리 직원' },
    { id: 5, cctvId: 'CCTV-005', time: '2025-11-25 09:30', responseTime: '2025-11-25 09:50', duration: '20분', status: '처리완료', severity: 'low', magnitude: '1.5', handler: '산림 관리 직원' },
  ]);

  const rockfalls = viewMode === 'active' ? activeRockfalls : completedRockfalls;

  const toggleStatus = (id: number) => {
    setActiveRockfalls(prev => prev.map(item => 
      item.id === id 
        ? { ...item, status: item.status === '대응중' ? '대기중' : '대응중' }
        : item
    ));
  };

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === activeRockfalls.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(activeRockfalls.map(r => r.id));
    }
  };

  const handleBatchComplete = () => {
    const now = new Date();
    const responseTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const itemsToComplete = activeRockfalls.filter(r => selectedIds.includes(r.id)).map(r => ({
      ...r,
      status: '처리완료',
      responseTime,
      duration: '20분'
    }));
    
    setCompletedRockfalls(prev => [...itemsToComplete, ...prev]);
    setActiveRockfalls(prev => prev.filter(r => !selectedIds.includes(r.id)));
    setSelectedIds([]);
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar with smooth slide animation */}
      <div 
        className="fixed top-0 left-0 z-50 h-screen transition-transform duration-300 ease-in-out"
        style={{ 
          width: '317.56px', 
          backgroundColor: '#2B2847',
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)'
        }}
      >
        <Sidebar onNavigate={onNavigate || (() => {})} currentPath="rockfall-dashboard" />
      </div>
      <div className="flex-1 flex flex-col relative bg-white" style={{ marginLeft: sidebarOpen ? '317.56px' : '0px', transition: 'margin-left 0.3s' }}>
        {/* 상단바 */}
        <div className="shadow-md px-6 py-4 flex items-center justify-between border-b border-gray-200" style={{ backgroundColor: '#345eaa' }}>
          <div className="flex items-center gap-3">
            <HamburgerMenuButton onClick={() => setSidebarOpen(!sidebarOpen)} />
            <AlertTriangle className="w-6 h-6 text-gray-200" />
            <h1 className="text-gray-100">낙석 상황 현황</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-8 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 shadow-sm border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600">당일 발생</span>
                    <Mountain className="w-5 h-5 text-amber-800" />
                  </div>
                  <div className="text-gray-900">3건</div>
                </div>

                <div className="bg-white p-6 shadow-sm border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600">대기중</span>
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                  </div>
                  <div className="text-gray-900">1건</div>
                </div>

                <div className="bg-white p-6 shadow-sm border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600">평균 대응시간</span>
                    <Clock className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="text-gray-900">20분</div>
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
                        당월 4건 발생 지역
                        <div className="absolute -bottom-1 right-2 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600">위험지역</span>
                    <MapPin className="w-5 h-5 text-purple-500" />
                  </div>
                  <div className="text-gray-900">등산로 3</div>
                </div>
              </div>

              {/* Rockfall List */}
              <div className="bg-white shadow-sm border border-gray-200" style={{ borderRadius: '0px' }}>
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <h2 className="text-gray-900">낙석 감지 목록</h2>
                    {viewMode === 'active' && selectedIds.length > 0 && (
                      <button
                        onClick={handleBatchComplete}
                        className="px-4 py-1.5 text-sm bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                        style={{ borderRadius: '0px' }}
                      >
                        일괄처리 ({selectedIds.length})
                      </button>
                    )}
                  </div>
                  
                  {/* Toggle Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setViewMode('active'); setSelectedIds([]); }}
                      className={`px-4 py-1.5 text-sm transition-colors ${
                        viewMode === 'active'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      style={{ borderRadius: '9999px' }}
                    >
                      진행 중
                    </button>
                    <button
                      onClick={() => { setViewMode('completed'); setSelectedIds([]); }}
                      className={`px-4 py-1.5 text-sm transition-colors ${
                        viewMode === 'completed'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      style={{ borderRadius: '9999px' }}
                    >
                      처리완료
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {viewMode === 'active' && (
                          <th className="px-6 py-3 text-center text-gray-600 w-16">
                            <input 
                              type="checkbox" 
                              checked={selectedIds.length === activeRockfalls.length && activeRockfalls.length > 0}
                              onChange={toggleSelectAll}
                              className="w-4 h-4 cursor-pointer"
                            />
                          </th>
                        )}
                        <th className="px-6 py-3 text-left text-gray-600">CCTV ID</th>
                        <th className="px-6 py-3 text-left text-gray-600">발생시간</th>
                        {viewMode === 'completed' && (
                          <>
                            <th className="px-6 py-3 text-left text-gray-600">대응시각</th>
                            <th className="px-6 py-3 text-left text-gray-600">소요시간</th>
                          </>
                        )}
                        <th className="px-6 py-3 text-left text-gray-600">규모</th>
                        <th className="px-6 py-3 text-left text-gray-600">심각도</th>
                        {viewMode === 'active' && (
                          <th className="px-6 py-3 text-left text-gray-600">상태</th>
                        )}
                        <th className="px-6 py-3 text-left text-gray-600">처리자</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rockfalls.map((rockfall) => (
                        <tr key={rockfall.id} className="border-b border-gray-100 hover:bg-gray-50">
                          {viewMode === 'active' && (
                            <td className="px-6 py-4 text-center">
                              <input 
                                type="checkbox" 
                                checked={selectedIds.includes(rockfall.id)}
                                onChange={() => toggleSelection(rockfall.id)}
                                className="w-4 h-4 cursor-pointer"
                              />
                            </td>
                          )}
                          <td className="px-6 py-4 text-gray-900">{rockfall.cctvId}</td>
                          <td className="px-6 py-4 text-gray-600">{rockfall.time}</td>
                          {viewMode === 'completed' && 'responseTime' in rockfall && (
                            <>
                              <td className="px-6 py-4 text-gray-600">{rockfall.responseTime}</td>
                              <td className="px-6 py-4 text-gray-600">{rockfall.duration}</td>
                            </>
                          )}
                          <td className="px-6 py-4 text-gray-600">{rockfall.magnitude}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 text-sm ${
                              rockfall.severity === 'high' 
                                ? 'bg-red-100 text-red-700' 
                                : rockfall.severity === 'medium'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-blue-100 text-blue-700'
                            }`} style={{ borderRadius: '0px' }}>
                              {rockfall.severity === 'high' ? '상' : rockfall.severity === 'medium' ? '중' : '하'}
                            </span>
                          </td>
                          {viewMode === 'active' && (
                            <td className="px-6 py-4">
                              <button 
                                onClick={() => toggleStatus(rockfall.id)}
                                className={`px-3 py-1 text-sm cursor-pointer hover:opacity-80 transition-opacity ${
                                  rockfall.status === '대응중' 
                                    ? 'bg-green-100 text-green-700' 
                                    : rockfall.status === '대기중'
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`} 
                                style={{ borderRadius: '0px' }}
                              >
                                {rockfall.status}
                              </button>
                            </td>
                          )}
                          <td className="px-6 py-4 text-gray-600">{rockfall.handler}</td>
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
    </div>
  );
}