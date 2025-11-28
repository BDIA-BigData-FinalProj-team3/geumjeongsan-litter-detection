import { useState, useEffect } from 'react';
import { AlertTriangle, Plus, Edit2, Trash2, X, Search } from 'lucide-react';
import Sidebar from './Sidebar';
import BACKEND_URL from '@/config/api';

interface EmergencyRecordsProps {
  onNavigate?: (screen: string) => void;
}

interface EmergencyRecord {
  id: number;
  patientName: string;
  age: number;
  gender: '남' | '여';
  location: string;
  cctvId: string;
  incidentTime: string;
  symptoms: string;
  severity: 'critical' | 'moderate' | 'low';
  status: '대응중' | '이송완료' | '처리완료';
  responseTeam: string;
  notes: string;
}

export default function EmergencyRecords({ onNavigate }: EmergencyRecordsProps) {
  const [records, setRecords] = useState<EmergencyRecord[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<EmergencyRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<EmergencyRecord>>({
    patientName: '',
    age: 0,
    gender: '남',
    location: '',
    cctvId: '',
    incidentTime: '',
    symptoms: '',
    severity: 'moderate',
    status: '대응중',
    responseTeam: '',
    notes: ''
  });

  // API에서 데이터 로드
  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${BACKEND_URL}/api/emergencies`);
        
        if (response.ok) {
          const data: EmergencyRecord[] = await response.json();
          setRecords(data || []); // 빈 배열이어도 정상 처리
        } else {
          const errorText = await response.text();
          setError(`응급환자 기록을 불러오는데 실패했습니다. (${response.status}: ${errorText})`);
          console.error('응급환자 기록 조회 실패:', response.status, errorText);
        }
      } catch (err: any) {
        const errorMessage = err.message || '알 수 없는 오류';
        setError(`서버에 연결할 수 없습니다: ${errorMessage}. 백엔드가 실행 중인지 확인해주세요.`);
        console.error('API 호출 실패:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, []);

  const handleCreate = () => {
    setEditingRecord(null);
    setFormData({
      patientName: '',
      age: 0,
      gender: '남',
      location: '',
      cctvId: '',
      incidentTime: '',
      symptoms: '',
      severity: 'moderate',
      status: '대응중',
      responseTeam: '',
      notes: ''
    });
    setShowModal(true);
  };

  const handleEdit = (record: EmergencyRecord) => {
    setEditingRecord(record);
    setFormData(record);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('정말로 이 기록을 삭제하시겠습니까?')) {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${BACKEND_URL}/api/emergencies/${id}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          // DB에서 삭제된 후, 전체 목록을 다시 조회
          const fetchResponse = await fetch(`${BACKEND_URL}/api/emergencies`);
          if (fetchResponse.ok) {
            const data: EmergencyRecord[] = await fetchResponse.json();
            setRecords(data || []);
          }
        } else {
          setError('삭제에 실패했습니다.');
        }
      } catch (err) {
        setError('삭제 중 오류가 발생했습니다.');
        console.error('삭제 실패:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (editingRecord) {
        // 수정
        const response = await fetch(`${BACKEND_URL}/api/emergencies/${editingRecord.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });
        if (response.ok) {
          // DB에서 수정된 후, 전체 목록을 다시 조회
          const fetchResponse = await fetch(`${BACKEND_URL}/api/emergencies`);
          if (fetchResponse.ok) {
            const data: EmergencyRecord[] = await fetchResponse.json();
            setRecords(data || []); // 목록 업데이트 (최신순으로 정렬된 데이터)
          }
          // 모달 닫기 및 상태 초기화
          setShowModal(false);
          setEditingRecord(null); // 수정 모드 해제
          setError(null); // 성공 시 에러 메시지 제거
        } else {
          const errorText = await response.text();
          setError(`수정 실패: ${errorText || '알 수 없는 오류'}`);
        }
      } else {
        // 신규 등록
        // incidentTime 형식 확인 및 변환
        const submitData = { ...formData };
        if (submitData.incidentTime) {
          // datetime-local 형식 (2025-11-28T10:00)을 백엔드 형식 (2025-11-28 10:00)으로 변환
          submitData.incidentTime = submitData.incidentTime.replace('T', ' ');
        }
        
        const response = await fetch(`${BACKEND_URL}/api/emergencies`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(submitData)
        });
        if (response.ok) {
          // DB에 저장된 후, 전체 목록을 다시 조회
          const fetchResponse = await fetch(`${BACKEND_URL}/api/emergencies`);
          if (fetchResponse.ok) {
            const data: EmergencyRecord[] = await fetchResponse.json();
            setRecords(data || []); // 목록 업데이트 (최신순으로 정렬된 데이터)
            // 모달 닫기 및 상태 초기화
            setShowModal(false);
            setEditingRecord(null); // 수정 모드 해제
            setError(null); // 성공 시 에러 메시지 제거
            // 폼 초기화
            setFormData({
              patientName: '',
              age: 0,
              gender: '남',
              location: '',
              cctvId: '',
              incidentTime: '',
              symptoms: '',
              severity: 'moderate',
              status: '대응중',
              responseTeam: '',
              notes: ''
            });
          } else {
            const errorText = await fetchResponse.text();
            setError(`목록 조회 실패: ${errorText || '알 수 없는 오류'}`);
            console.error('목록 조회 실패:', fetchResponse.status, errorText);
          }
        } else {
          let errorText = '';
          try {
            errorText = await response.text();
            // 빈 응답인 경우 헤더에서 에러 메시지 확인
            if (!errorText || errorText.trim().length === 0) {
              errorText = response.headers.get('X-Error-Message') || '알 수 없는 오류';
            }
          } catch (e) {
            errorText = '응답을 읽을 수 없습니다';
          }
          setError(`등록 실패 (${response.status}): ${errorText}`);
          console.error('등록 실패:', {
            status: response.status,
            statusText: response.statusText,
            errorText: errorText,
            requestData: formData
          });
        }
      }
    } catch (err) {
      setError('서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인해주세요.');
      console.error('저장 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter(record =>
    record.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.cctvId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.symptoms.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen">
      <Sidebar onNavigate={onNavigate || (() => {})} currentPath="emergency-records" />
      <div className="flex-1 overflow-y-auto">
        <div className="p-8 bg-gray-50 min-h-screen">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-gray-900">응급환자 기록 관리</h1>
              <button
                onClick={handleCreate}
                disabled={loading}
                className="px-6 py-3 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderRadius: '0px' }}
              >
                <Plus className="w-5 h-5" />
                신규 기록 등록
              </button>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700" style={{ borderRadius: '0px' }}>
                <div className="flex items-center justify-between">
                  <span>{error}</span>
                  <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* 로딩 표시 */}
            {loading && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 text-blue-700 text-center" style={{ borderRadius: '0px' }}>
                처리 중...
              </div>
            )}

            {/* 검색 바 */}
            <div className="bg-white p-4 shadow-sm border border-gray-200 mb-6" style={{ borderRadius: '0px' }}>
              <div className="relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="환자명, 위치, CCTV ID, 증상으로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:outline-none focus:border-emerald-500"
                  style={{ borderRadius: '0px' }}
                />
              </div>
            </div>

            {/* 통계 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 shadow-sm border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">전체 기록</span>
                  <AlertTriangle className="w-5 h-5 text-blue-500" />
                </div>
                <div className="text-gray-900">{records.length}건</div>
              </div>

              <div className="bg-white p-6 shadow-sm border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">중증 환자</span>
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <div className="text-gray-900">{records.filter(r => r.severity === 'critical').length}건</div>
              </div>

              <div className="bg-white p-6 shadow-sm border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">대응중</span>
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                </div>
                <div className="text-gray-900">{records.filter(r => r.status === '대응중').length}건</div>
              </div>

              <div className="bg-white p-6 shadow-sm border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">처리완료</span>
                  <AlertTriangle className="w-5 h-5 text-green-500" />
                </div>
                <div className="text-gray-900">{records.filter(r => r.status === '처리완료').length}건</div>
              </div>
            </div>

            {/* 기록 테이블 */}
            <div className="bg-white shadow-sm border border-gray-200" style={{ borderRadius: '0px' }}>
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-gray-900">응급환자 기록 목록 ({filteredRecords.length}건)</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-gray-600">환자명</th>
                      <th className="px-6 py-3 text-left text-gray-600">나이/성별</th>
                      <th className="px-6 py-3 text-left text-gray-600">CCTV ID</th>
                      <th className="px-6 py-3 text-left text-gray-600">위치</th>
                      <th className="px-6 py-3 text-left text-gray-600">발생시간</th>
                      <th className="px-6 py-3 text-left text-gray-600">증상</th>
                      <th className="px-6 py-3 text-left text-gray-600">심각도</th>
                      <th className="px-6 py-3 text-left text-gray-600">상태</th>
                      <th className="px-6 py-3 text-left text-gray-600">대응팀</th>
                      <th className="px-6 py-3 text-left text-gray-600">액션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((record) => (
                      <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-900">{record.patientName}</td>
                        <td className="px-6 py-4 text-gray-600">{record.age}세 / {record.gender}</td>
                        <td className="px-6 py-4 text-gray-600">{record.cctvId}</td>
                        <td className="px-6 py-4 text-gray-600">{record.location}</td>
                        <td className="px-6 py-4 text-gray-600">{record.incidentTime}</td>
                        <td className="px-6 py-4 text-gray-600">{record.symptoms}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 text-sm ${
                            record.severity === 'critical' 
                              ? 'bg-red-100 text-red-700' 
                              : record.severity === 'moderate'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-green-100 text-green-700'
                          }`} style={{ borderRadius: '0px' }}>
                            {record.severity === 'critical' ? '중증' : record.severity === 'moderate' ? '보통' : '경증'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 text-sm ${
                            record.status === '대응중' 
                              ? 'bg-orange-100 text-orange-700' 
                              : record.status === '이송완료'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-green-100 text-green-700'
                          }`} style={{ borderRadius: '0px' }}>
                            {record.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{record.responseTeam}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(record)}
                              className="p-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                              style={{ borderRadius: '0px' }}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(record.id)}
                              className="p-2 bg-red-600 text-white hover:bg-red-700 transition-colors"
                              style={{ borderRadius: '0px' }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 등록/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-2xl" style={{ borderRadius: '0px' }}>
            <div className="bg-emerald-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-white">{editingRecord ? '응급환자 기록 수정' : '신규 응급환자 기록 등록'}</h2>
              <button onClick={() => setShowModal(false)} className="text-white hover:text-gray-200">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">환자명 *</label>
                  <input
                    type="text"
                    required
                    value={formData.patientName}
                    onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-emerald-500"
                    style={{ borderRadius: '0px' }}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">나이 *</label>
                  <input
                    type="number"
                    required
                    value={formData.age || ''}
                    onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-emerald-500"
                    style={{ borderRadius: '0px' }}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">성별 *</label>
                  <select
                    required
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as '남' | '여' })}
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-emerald-500"
                    style={{ borderRadius: '0px' }}
                  >
                    <option value="남">남</option>
                    <option value="여">여</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">CCTV ID *</label>
                  <input
                    type="text"
                    required
                    value={formData.cctvId}
                    onChange={(e) => setFormData({ ...formData, cctvId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-emerald-500"
                    style={{ borderRadius: '0px' }}
                    placeholder="예: CCTV-001"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">위치 *</label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-emerald-500"
                    style={{ borderRadius: '0px' }}
                    placeholder="예: 등산로 1"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">발생시간 *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.incidentTime ? formData.incidentTime.replace(' ', 'T').substring(0, 16) : ''}
                    onChange={(e) => {
                      const value = e.target.value.replace('T', ' ');
                      setFormData({ ...formData, incidentTime: value });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-emerald-500"
                    style={{ borderRadius: '0px' }}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">증상 *</label>
                  <input
                    type="text"
                    required
                    value={formData.symptoms}
                    onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-emerald-500"
                    style={{ borderRadius: '0px' }}
                    placeholder="예: 심정지, 낙상사고"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">심각도 *</label>
                  <select
                    required
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value as 'critical' | 'moderate' | 'low' })}
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-emerald-500"
                    style={{ borderRadius: '0px' }}
                  >
                    <option value="critical">중증</option>
                    <option value="moderate">보통</option>
                    <option value="low">경증</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">상태 *</label>
                  <select
                    required
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as '대응중' | '이송완료' | '처리완료' })}
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-emerald-500"
                    style={{ borderRadius: '0px' }}
                  >
                    <option value="대응중">대응중</option>
                    <option value="이송완료">이송완료</option>
                    <option value="처리완료">처리완료</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">대응팀 *</label>
                  <input
                    type="text"
                    required
                    value={formData.responseTeam}
                    onChange={(e) => setFormData({ ...formData, responseTeam: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-emerald-500"
                    style={{ borderRadius: '0px' }}
                    placeholder="예: 119구조대 A팀"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-gray-700 mb-2">특이사항</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-emerald-500"
                    style={{ borderRadius: '0px' }}
                    placeholder="특이사항 입력..."
                  />
                </div>
              </div>
              <div className="flex gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                  style={{ borderRadius: '0px' }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                  style={{ borderRadius: '0px' }}
                >
                  {editingRecord ? '수정' : '등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
