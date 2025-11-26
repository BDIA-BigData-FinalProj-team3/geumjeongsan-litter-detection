import { useState } from 'react';
import { FileText, Download, Printer, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import Sidebar from './Sidebar';

interface MonthlyReportProps {
  onNavigate: (screen: string) => void;
}

export default function MonthlyReport({ onNavigate }: MonthlyReportProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date(2025, 10, 1)); // 2025년 11월
  const [showPreview, setShowPreview] = useState(true);

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

  // 월간 통계 데이터
  const monthlyStats = {
    fire: { total: 12, resolved: 11, pending: 1, avgResponseTime: '4.2분' },
    rockfall: { total: 28, resolved: 25, pending: 3, avgResponseTime: '5.8분' },
    trash: { total: 156, resolved: 142, pending: 14, avgResponseTime: '12.5분' },
    cctv: { total: 20, operational: 18, maintenance: 2 },
    emergency: { total: 7, resolved: 7, pending: 0, avgResponseTime: '3.1분' }
  };

  // 주요 사건 데이터
  const majorIncidents = [
    { date: '2025-11-03', type: '화재', location: '등산로 2', severity: '상', status: '완료', responseTime: '3.5분' },
    { date: '2025-11-08', type: '낙석', location: '등산로 1', severity: '중', status: '완료', responseTime: '5.2분' },
    { date: '2025-11-15', type: '화재', location: '공원중앙', severity: '상', status: '완료', responseTime: '4.8분' },
    { date: '2025-11-22', type: '낙석', location: '등산로 3', severity: '중', status: '완료', responseTime: '6.1분' },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar onNavigate={onNavigate} currentPath="report" />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
          <h1 className="text-gray-900" style={{ fontSize: '24px', fontWeight: '600' }}>월간 보고서</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">2025년 11월 25일</span>
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
                  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200" style={{ borderRadius: '0px' }}>
                    <Calendar className="w-5 h-5 text-emerald-600" />
                    <span className="text-gray-900 font-medium">{monthStr}</span>
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
                  className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-2"
                  style={{ borderRadius: '0px' }}
                >
                  <Download className="w-4 h-4" />
                  PDF 저장
                </button>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-2"
                  style={{ borderRadius: '0px' }}
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
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-red-50 border-l-4 border-red-500 p-4">
                      <p className="text-sm text-gray-600 mb-1">화재 감지</p>
                      <p className="text-gray-900" style={{ fontSize: '24px', fontWeight: '700' }}>{monthlyStats.fire.total}건</p>
                      <p className="text-xs text-gray-500 mt-2">처리완료: {monthlyStats.fire.resolved}건</p>
                    </div>
                    <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
                      <p className="text-sm text-gray-600 mb-1">낙석 감지</p>
                      <p className="text-gray-900" style={{ fontSize: '24px', fontWeight: '700' }}>{monthlyStats.rockfall.total}건</p>
                      <p className="text-xs text-gray-500 mt-2">처리완료: {monthlyStats.rockfall.resolved}건</p>
                    </div>
                    <div className="bg-green-50 border-l-4 border-green-500 p-4">
                      <p className="text-sm text-gray-600 mb-1">쓰레기 투기</p>
                      <p className="text-gray-900" style={{ fontSize: '24px', fontWeight: '700' }}>{monthlyStats.trash.total}건</p>
                      <p className="text-xs text-gray-500 mt-2">처리완료: {monthlyStats.trash.resolved}건</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-purple-50 border-l-4 border-purple-500 p-4">
                      <p className="text-sm text-gray-600 mb-1">응급 상황</p>
                      <p className="text-gray-900" style={{ fontSize: '24px', fontWeight: '700' }}>{monthlyStats.emergency.total}건</p>
                      <p className="text-xs text-gray-500 mt-2">처리완료: {monthlyStats.emergency.resolved}건</p>
                    </div>
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                      <p className="text-sm text-gray-600 mb-1">CCTV 운영률</p>
                      <p className="text-gray-900" style={{ fontSize: '24px', fontWeight: '700' }}>{Math.round((monthlyStats.cctv.operational / monthlyStats.cctv.total) * 100)}%</p>
                      <p className="text-xs text-gray-500 mt-2">정상: {monthlyStats.cctv.operational}대 / 점검: {monthlyStats.cctv.maintenance}대</p>
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
                          <td className="py-3 px-4 text-gray-900">낙석</td>
                          <td className="py-3 px-4 text-center text-gray-900">{monthlyStats.rockfall.total}</td>
                          <td className="py-3 px-4 text-center text-green-600">{monthlyStats.rockfall.resolved}</td>
                          <td className="py-3 px-4 text-center text-orange-600">{monthlyStats.rockfall.pending}</td>
                          <td className="py-3 px-4 text-center text-gray-900">{monthlyStats.rockfall.avgResponseTime}</td>
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
                  <h3 className="text-gray-900 mb-4 pb-2 border-b-2 border-gray-300" style={{ fontSize: '20px', fontWeight: '600' }}>
                    3. 주요 사건 목록
                  </h3>
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
                        </tr>
                      </thead>
                      <tbody>
                        {majorIncidents.map((incident, index) => (
                          <tr key={index} className="border-b border-gray-200">
                            <td className="py-3 px-4 text-gray-900">{incident.date}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 text-xs ${
                                incident.type === '화재' ? 'bg-red-100 text-red-700' :
                                incident.type === '낙석' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-green-100 text-green-700'
                              }`} style={{ borderRadius: '0px' }}>
                                {incident.type}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-900">{incident.location}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2 py-1 text-xs ${
                                incident.severity === '상' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`} style={{ borderRadius: '0px' }}>
                                {incident.severity}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center text-gray-900">{incident.responseTime}</td>
                            <td className="py-3 px-4 text-center">
                              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700" style={{ borderRadius: '0px' }}>
                                {incident.status}
                              </span>
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
                  <div className="space-y-4">
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                      <h4 className="text-gray-900 mb-2" style={{ fontWeight: '600' }}>시스템 가동률</h4>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        금월 CCTV 시스템 평균 가동률은 <strong>90%</strong>로, 전월 대비 2% 향상되었습니다. 
                        점검 중인 CCTV 2대는 정기 점검 예정이며, 12월 초 정상 복구 예정입니다.
                      </p>
                    </div>
                    <div className="bg-green-50 border-l-4 border-green-500 p-4">
                      <h4 className="text-gray-900 mb-2" style={{ fontWeight: '600' }}>쓰레기 투기 감소 효과</h4>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        AI 탐지 시스템 도입 이후 쓰레기 투기 건수가 전월 대비 <strong>18% 감소</strong>하였으며, 
                        평균 대응 시간도 15.2분에서 12.5분으로 단축되어 빠른 현장 대응이 가능해졌습니다.
                      </p>
                    </div>
                    <div className="bg-orange-50 border-l-4 border-orange-500 p-4">
                      <h4 className="text-gray-900 mb-2" style={{ fontWeight: '600' }}>위험 구역 모니터링</h4>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        등산로 2 구간에서 낙석 감지가 집중적으로 발생(전체의 42%)하고 있어, 
                        추가 낙석 센서 설치 및 위험 안내판 보강이 필요한 것으로 판단됩니다.
                      </p>
                    </div>
                  </div>
                </section>

                {/* 5. 개선사항 및 건의사항 */}
                <section className="mb-8">
                  <h3 className="text-gray-900 mb-4 pb-2 border-b-2 border-gray-300" style={{ fontSize: '20px', fontWeight: '600' }}>
                    5. 개선사항 및 건의사항
                  </h3>
                  <div className="bg-gray-50 p-4">
                    <ul className="space-y-3 text-sm text-gray-700">
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-600 mt-1">•</span>
                        <span><strong>CCTV 추가 설치:</strong> 등산로 3 중간 지점에 사각지대가 존재하여 추가 CCTV 2대 설치 필요</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-600 mt-1">•</span>
                        <span><strong>낙석 센서 확충:</strong> 등산로 2 구간 낙석 다발 지역에 센서 3개 추가 설치 권장</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-600 mt-1">•</span>
                        <span><strong>AI 정확도 개선:</strong> 화재 오탐지율 5% 감소를 위한 학습 데이터 보강 필요</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-600 mt-1">•</span>
                        <span><strong>야간 모니터링 강화:</strong> 야간 쓰레기 투기 증가 추세로 적외선 카메라 성능 개선 검토</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-600 mt-1">•</span>
                        <span><strong>주민 홍보 확대:</strong> AI 감시 시스템 운영 안내문 부착 및 온라인 홍보 강화</span>
                      </li>
                    </ul>
                  </div>
                </section>

                {/* 결론 */}
                <section className="mb-4">
                  <div className="bg-emerald-50 border border-emerald-200 p-6">
                    <h4 className="text-gray-900 mb-3" style={{ fontSize: '18px', fontWeight: '600' }}>결론</h4>
                    <p className="text-sm text-gray-700 leading-relaxed mb-2">
                      {monthStr} Geumjeong Sentinel AI 시스템은 전반적으로 안정적인 운영 성과를 보이고 있으며, 
                      특히 쓰레기 투기 감소 및 대응 시간 단축에서 가시적인 성과를 달성하였습니다.
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      향후 사각지대 해소 및 AI 정확도 개선을 통해 더욱 효과적인 환경 감시 체계를 구축하도록 하겠습니다.
                    </p>
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