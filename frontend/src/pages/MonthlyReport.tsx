import { useState, useEffect } from 'react';
import { FileText, Download, Printer, Calendar, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import Sidebar from '../components/Sidebar';
import HamburgerMenuButton from '../components/HamburgerMenuButton';
import { getMonthlyStats, getMajorIncidents } from '../services/api';

interface MonthlyReportProps {
  onNavigate: (screen: string) => void;
}

export default function MonthlyReport({ onNavigate }: MonthlyReportProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date(2025, 10, 1)); // 2025년 11월
  const [showPreview, setShowPreview] = useState(true);
  const [operationAnalysis, setOperationAnalysis] = useState('');
  const [improvements, setImprovements] = useState('');
  const [conclusion, setConclusion] = useState('');
  const [majorIncidents, setMajorIncidents] = useState<any[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<any>(null);

  // API에서 데이터 로드
  useEffect(() => {
    const loadReportData = async () => {
      const [stats, incidents] = await Promise.all([
        getMonthlyStats(),
        getMajorIncidents(),
      ]);
      setMonthlyStats(stats);
      setMajorIncidents(incidents);
    };
    
    loadReportData();
  }, []);

  const handlePreviousMonth = () => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    setSelectedMonth(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    setSelectedMonth(newDate);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    alert('월간 보고서가 PDF로 다운로드됩니다.');
  };

  const monthStr = `${selectedMonth.getFullYear()}년 ${selectedMonth.getMonth() + 1}월`;

  // monthlyStats는 위의 useEffect에서 로드됨
  if (!monthlyStats) {
    return <div>Loading...</div>;
  }

  const handleAddIncident = () => {
    const newIncident = {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      type: '화재',
      location: '',
      severity: '중',
      status: '완료',
      responseTime: ''
    };
    setMajorIncidents([...majorIncidents, newIncident]);
  };

  const handleRemoveIncident = (id: number) => {
    setMajorIncidents(majorIncidents.filter(incident => incident.id !== id));
  };

  const handleIncidentChange = (id: number, field: string, value: string) => {
    setMajorIncidents(majorIncidents.map(incident => 
      incident.id === id ? { ...incident, [field]: value } : incident
    ));
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar with smooth slide animation */}
      <div 
        className="fixed top-0 left-0 z-50 h-screen transition-transform duration-300 ease-in-out"
        style={{ 
          width: '317.56px', 
          backgroundColor: '#2B2847',
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)'
        }}
      >
        <Sidebar onNavigate={onNavigate} currentPath="report" />
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden relative bg-gray-50" style={{ marginLeft: sidebarOpen ? '317.56px' : '0px', transition: 'margin-left 0.3s' }}>
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm" style={{ backgroundColor: '#345eaa' }}>
          <div className="flex items-center gap-3">
            <HamburgerMenuButton onClick={() => setSidebarOpen(!sidebarOpen)} />
            <FileText className="w-6 h-6 text-gray-200" />
            <h1 className="text-gray-100">월간 보고서</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-200">2025년 11월 25일</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* 상단 제어 패널 */}
          <div className="bg-white p-4 mb-6 shadow-sm border border-gray-200" style={{ borderRadius: '0px' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handlePreviousMonth}
                    className="p-2 hover:bg-gray-100 transition-colors"
                    style={{ borderRadius: '0px' }}
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-700" />
                  </button>
                  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200" style={{ borderRadius: '9999px' }}>
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    <span className="text-gray-900 text-sm">{monthStr}</span>
                  </div>
                  <button 
                    onClick={handleNextMonth}
                    className="p-2 hover:bg-gray-100 transition-colors"
                    style={{ borderRadius: '0px' }}
                  >
                    <ChevronRight className="w-5 h-5 text-gray-700" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  className="px-4 py-1.5 text-sm bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-2"
                  style={{ borderRadius: '9999px' }}
                >
                  <Download className="w-4 h-4" />
                  PDF 저장
                </button>
                <button
                  onClick={handlePrint}
                  className="px-4 py-1.5 text-sm bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-2"
                  style={{ borderRadius: '9999px' }}
                >
                  <Printer className="w-4 h-4" />
                  인쇄
                </button>
              </div>
            </div>
          </div>

          {/* 보고서 미리보기 */}
          {showPreview && (
            <div className="bg-white shadow-lg border border-gray-300 max-w-5xl mx-auto" style={{ borderRadius: '0px' }}>
              {/* 보고서 헤더 */}
              <div className="border-b-4 border-emerald-600 p-8 bg-gray-50">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
                      <circle cx="16" cy="16" r="14" fill="#10B981" opacity="0.1"/>
                      <path d="M16 8 L16 12 M16 12 L13 14 M16 12 L19 14 M13 14 L13 20 L10 22 M19 14 L19 20 L22 22 M16 12 L16 24" stroke="#10B981" strokeWidth="2" strokeLinecap="round"/>
                      <circle cx="16" cy="24" r="1.5" fill="#10B981"/>
                    </svg>
                    <h1 className="text-gray-900" style={{ fontSize: '28px', fontWeight: '700' }}>Geumjeong Sentinel AI</h1>
                  </div>
                  <h2 className="text-gray-800 mb-2" style={{ fontSize: '24px', fontWeight: '600' }}>월간 운영 보고서</h2>
                  <p className="text-gray-600" style={{ fontSize: '18px' }}>{monthStr}</p>
                </div>
                <div className="mt-6 pt-6 border-t border-gray-300 flex justify-between text-sm text-gray-600">
                  <div>
                    <p>발행일: 2025년 11월 25일</p>
                    <p>담당부서: 환경관리과</p>
                  </div>
                  <div className="text-right">
                    <p>작성자: 관리자</p>
                    <p>연락처: 051-XXX-XXXX</p>
                  </div>
                </div>
              </div>

              {/* 보고서 본문 */}
              <div className="p-8">
                {/* 1. 월간 요약 */}
                <section className="mb-8">
                  <h3 className="text-gray-900 mb-4 pb-2 border-b-2 border-gray-300" style={{ fontSize: '20px', fontWeight: '600' }}>
                    1. 월간 요약
                  </h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* 화재 감지 */}
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-gray-600 mb-1">화재 감지</p>
                          <p className="text-gray-900 mb-2" style={{ fontSize: '16px', fontWeight: '600' }}>
                            처리완료 {monthlyStats.fire.resolved}/{monthlyStats.fire.total}건
                          </p>
                          <p className="text-xs text-gray-500">처리완료율</p>
                        </div>
                        <div className="relative" style={{ width: '100px', height: '100px' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[
                                  { name: '완료', value: monthlyStats.fire.resolved },
                                  { name: '미완료', value: monthlyStats.fire.pending }
                                ]}
                                cx="50%"
                                cy="50%"
                                innerRadius={30}
                                outerRadius={40}
                                dataKey="value"
                                startAngle={90}
                                endAngle={-270}
                              >
                                <Cell fill="#60a5fa" />
                                <Cell fill="#dbeafe" />
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-gray-900 font-bold text-sm">
                              {Math.round((monthlyStats.fire.resolved / monthlyStats.fire.total) * 100)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 쓰레기 투기 */}
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-gray-600 mb-1">쓰레기 투기</p>
                          <p className="text-gray-900 mb-2" style={{ fontSize: '16px', fontWeight: '600' }}>
                            처리완료 {monthlyStats.trash.resolved}/{monthlyStats.trash.total}건
                          </p>
                          <p className="text-xs text-gray-500">처리완료율</p>
                        </div>
                        <div className="relative" style={{ width: '100px', height: '100px' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[
                                  { name: '완료', value: monthlyStats.trash.resolved },
                                  { name: '미완료', value: monthlyStats.trash.pending }
                                ]}
                                cx="50%"
                                cy="50%"
                                innerRadius={30}
                                outerRadius={40}
                                dataKey="value"
                                startAngle={90}
                                endAngle={-270}
                              >
                                <Cell fill="#60a5fa" />
                                <Cell fill="#dbeafe" />
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-gray-900 font-bold text-sm">
                              {Math.round((monthlyStats.trash.resolved / monthlyStats.trash.total) * 100)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {/* 응급 상황 */}
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-gray-600 mb-1">응급 상황</p>
                          <p className="text-gray-900 mb-2" style={{ fontSize: '16px', fontWeight: '600' }}>
                            처리완료 {monthlyStats.emergency.resolved}/{monthlyStats.emergency.total}건
                          </p>
                          <p className="text-xs text-gray-500">처리완료율</p>
                        </div>
                        <div className="relative" style={{ width: '100px', height: '100px' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[
                                  { name: '완료', value: monthlyStats.emergency.resolved },
                                  { name: '미완료', value: monthlyStats.emergency.pending }
                                ]}
                                cx="50%"
                                cy="50%"
                                innerRadius={30}
                                outerRadius={40}
                                dataKey="value"
                                startAngle={90}
                                endAngle={-270}
                              >
                                <Cell fill="#60a5fa" />
                                <Cell fill="#dbeafe" />
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-gray-900 font-bold text-sm">
                              {Math.round((monthlyStats.emergency.resolved / monthlyStats.emergency.total) * 100)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* CCTV 운영률 */}
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-gray-600 mb-1">CCTV 운영률</p>
                          <p className="text-gray-900 mb-2" style={{ fontSize: '16px', fontWeight: '600' }}>
                            정상 {monthlyStats.cctv.operational}/{monthlyStats.cctv.total}대
                          </p>
                          <p className="text-xs text-gray-500">운영률</p>
                        </div>
                        <div className="relative" style={{ width: '100px', height: '100px' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[
                                  { name: '정상', value: monthlyStats.cctv.operational },
                                  { name: '점검', value: monthlyStats.cctv.maintenance }
                                ]}
                                cx="50%"
                                cy="50%"
                                innerRadius={30}
                                outerRadius={40}
                                dataKey="value"
                                startAngle={90}
                                endAngle={-270}
                              >
                                <Cell fill="#60a5fa" />
                                <Cell fill="#dbeafe" />
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-gray-900 font-bold text-sm">
                              {Math.round((monthlyStats.cctv.operational / monthlyStats.cctv.total) * 100)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 2. 대응 성과 */}
                <section className="mb-8">
                  <h3 className="text-gray-900 mb-4 pb-2 border-b-2 border-gray-300" style={{ fontSize: '20px', fontWeight: '600' }}>
                    2. 대응 성과
                  </h3>
                  <div className="bg-gray-50 p-4 mb-4">
                    <table className="w-full">
                      <thead className="border-b-2 border-gray-300">
                        <tr>
                          <th className="text-left py-3 px-4 text-gray-700">구분</th>
                          <th className="text-center py-3 px-4 text-gray-700">총 발생</th>
                          <th className="text-center py-3 px-4 text-gray-700">처리완료</th>
                          <th className="text-center py-3 px-4 text-gray-700">대기중</th>
                          <th className="text-center py-3 px-4 text-gray-700">평균 대응시간</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-gray-200">
                          <td className="py-3 px-4 text-gray-900">화재</td>
                          <td className="py-3 px-4 text-center text-gray-900">{monthlyStats.fire.total}</td>
                          <td className="py-3 px-4 text-center text-green-600">{monthlyStats.fire.resolved}</td>
                          <td className="py-3 px-4 text-center text-orange-600">{monthlyStats.fire.pending}</td>
                          <td className="py-3 px-4 text-center text-gray-900">{monthlyStats.fire.avgResponseTime}</td>
                        </tr>
                        <tr className="border-b border-gray-200">
                          <td className="py-3 px-4 text-gray-900">쓰레기 투기</td>
                          <td className="py-3 px-4 text-center text-gray-900">{monthlyStats.trash.total}</td>
                          <td className="py-3 px-4 text-center text-green-600">{monthlyStats.trash.resolved}</td>
                          <td className="py-3 px-4 text-center text-orange-600">{monthlyStats.trash.pending}</td>
                          <td className="py-3 px-4 text-center text-gray-900">{monthlyStats.trash.avgResponseTime}</td>
                        </tr>
                        <tr className="bg-gray-100 font-semibold">
                          <td className="py-3 px-4 text-gray-900">응급</td>
                          <td className="py-3 px-4 text-center text-gray-900">{monthlyStats.emergency.total}</td>
                          <td className="py-3 px-4 text-center text-green-600">{monthlyStats.emergency.resolved}</td>
                          <td className="py-3 px-4 text-center text-orange-600">{monthlyStats.emergency.pending}</td>
                          <td className="py-3 px-4 text-center text-gray-900">{monthlyStats.emergency.avgResponseTime}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* 3. 주요 사건 목록 */}
                <section className="mb-8">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-gray-300">
                    <h3 className="text-gray-900" style={{ fontSize: '20px', fontWeight: '600' }}>
                      3. 주요 사건 목록
                    </h3>
                    <button
                      onClick={handleAddIncident}
                      className="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-1 text-sm"
                      style={{ borderRadius: '0px' }}
                    >
                      <Plus className="w-4 h-4" />
                      사건 추가
                    </button>
                  </div>
                  <div className="bg-gray-50 p-4">
                    <table className="w-full">
                      <thead className="border-b-2 border-gray-300">
                        <tr>
                          <th className="text-left py-3 px-4 text-gray-700">발생일시</th>
                          <th className="text-left py-3 px-4 text-gray-700">유형</th>
                          <th className="text-left py-3 px-4 text-gray-700">위치</th>
                          <th className="text-center py-3 px-4 text-gray-700">심각도</th>
                          <th className="text-center py-3 px-4 text-gray-700">대응시간</th>
                          <th className="text-center py-3 px-4 text-gray-700">상태</th>
                          <th className="text-center py-3 px-4 text-gray-700">삭제</th>
                        </tr>
                      </thead>
                      <tbody>
                        {majorIncidents.map((incident) => (
                          <tr key={incident.id} className="border-b border-gray-200">
                            <td className="py-3 px-4">
                              <input
                                type="date"
                                value={incident.date}
                                onChange={(e) => handleIncidentChange(incident.id, 'date', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm text-gray-900"
                                style={{ borderRadius: '0px' }}
                              />
                            </td>
                            <td className="py-3 px-4">
                              <select
                                value={incident.type}
                                onChange={(e) => handleIncidentChange(incident.id, 'type', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm text-gray-900"
                                style={{ borderRadius: '0px' }}
                              >
                                <option value="화재">화재</option>
                                <option value="응급">응급</option>
                                <option value="쓰레기">쓰레기</option>
                              </select>
                            </td>
                            <td className="py-3 px-4">
                              <input
                                type="text"
                                value={incident.location}
                                onChange={(e) => handleIncidentChange(incident.id, 'location', e.target.value)}
                                placeholder="위치 입력"
                                className="w-full px-2 py-1 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm text-gray-900"
                                style={{ borderRadius: '0px' }}
                              />
                            </td>
                            <td className="py-3 px-4">
                              <select
                                value={incident.severity}
                                onChange={(e) => handleIncidentChange(incident.id, 'severity', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm text-gray-900"
                                style={{ borderRadius: '0px' }}
                              >
                                <option value="상">상</option>
                                <option value="중">중</option>
                                <option value="하">하</option>
                              </select>
                            </td>
                            <td className="py-3 px-4">
                              <input
                                type="text"
                                value={incident.responseTime}
                                onChange={(e) => handleIncidentChange(incident.id, 'responseTime', e.target.value)}
                                placeholder="대응시간 입력"
                                className="w-full px-2 py-1 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm text-gray-900"
                                style={{ borderRadius: '0px' }}
                              />
                            </td>
                            <td className="py-3 px-4">
                              <select
                                value={incident.status}
                                onChange={(e) => handleIncidentChange(incident.id, 'status', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm text-gray-900"
                                style={{ borderRadius: '0px' }}
                              >
                                <option value="완료">완료</option>
                                <option value="진행중">진행중</option>
                                <option value="대기">대기</option>
                              </select>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => handleRemoveIncident(incident.id)}
                                className="p-1 text-red-600 hover:bg-red-50 transition-colors"
                                style={{ borderRadius: '0px' }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* 4. 운영 현황 분석 */}
                <section className="mb-8">
                  <h3 className="text-gray-900 mb-4 pb-2 border-b-2 border-gray-300" style={{ fontSize: '20px', fontWeight: '600' }}>
                    4. 운영 현황 분석
                  </h3>
                  <div className="bg-gray-50 p-4">
                    <textarea
                      value={operationAnalysis}
                      onChange={(e) => setOperationAnalysis(e.target.value)}
                      placeholder="운영 현황 분석 내용을 입력하세요..."
                      className="w-full p-3 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-gray-700 resize-none"
                      style={{ borderRadius: '0px', minHeight: '150px' }}
                    />
                  </div>
                </section>

                {/* 5. 개선사항 및 건의사항 */}
                <section className="mb-8">
                  <h3 className="text-gray-900 mb-4 pb-2 border-b-2 border-gray-300" style={{ fontSize: '20px', fontWeight: '600' }}>
                    5. 개선사항 및 건의사항
                  </h3>
                  <div className="bg-gray-50 p-4">
                    <textarea
                      value={improvements}
                      onChange={(e) => setImprovements(e.target.value)}
                      placeholder="개선사항 및 건의사항 내용을 입력하세요..."
                      className="w-full p-3 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-gray-700 resize-none"
                      style={{ borderRadius: '0px', minHeight: '150px' }}
                    />
                  </div>
                </section>

                {/* 결론 */}
                <section className="mb-4">
                  <div className="bg-emerald-50 border border-emerald-200 p-6">
                    <h4 className="text-gray-900 mb-3" style={{ fontSize: '18px', fontWeight: '600' }}>결론</h4>
                    <textarea
                      value={conclusion}
                      onChange={(e) => setConclusion(e.target.value)}
                      placeholder="결론 내용을 입력하세요..."
                      className="w-full p-3 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-gray-700 resize-none bg-white"
                      style={{ borderRadius: '0px', minHeight: '100px' }}
                    />
                  </div>
                </section>

                {/* 서명란 */}
                <div className="mt-8 pt-6 border-t-2 border-gray-300">
                  <div className="text-right">
                    <p className="text-sm text-gray-600 mb-1">2025년 11월 25일</p>
                    <p className="text-sm text-gray-900">환경관리과장 [인]</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 인쇄 스타일 */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .bg-white.shadow-lg, .bg-white.shadow-lg * {
            visibility: visible;
          }
          .bg-white.shadow-lg {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            box-shadow: none !important;
          }
          button {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}