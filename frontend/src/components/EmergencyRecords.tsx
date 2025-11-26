import { useState } from 'react';
import { AlertTriangle, Plus, Edit2, Trash2, X, Search, Calendar } from 'lucide-react';
import Sidebar from './Sidebar';

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
  const [records, setRecords] = useState<EmergencyRecord[]>([
    {
      id: 1,
      patientName: '홍길동',
      age: 45,
      gender: '남',
      location: '등산로 2',
      cctvId: 'CCTV-001',
      incidentTime: '2025-11-25 14:20',
      symptoms: '심정지',
      severity: 'critical',
      status: '이송완료',
      responseTeam: '119구조대 A팀',
      notes: 'AED 사용 후 이송'
    },
    {
      id: 2,
      patientName: '김영희',
      age: 32,
      gender: '여',
      location: '등산로 3',
      cctvId: 'CCTV-003',
      incidentTime: '2025-11-25 14:00',
      symptoms: '낙상사고',
      severity: 'moderate',
      status: '대응중',
      responseTeam: '119구조대 B팀',
      notes: '발목 부상 의심'
    },
    {
      id: 3,
      patientName: '박철수',
      age: 58,
      gender: '남',
      location: '공원중앙',
      cctvId: 'CCTV-005',
      incidentTime: '2025-11-25 13:45',
      symptoms: '호흡곤란',
      severity: 'critical',
      status: '처리완료',
      responseTeam: '119구조대 A팀',
      notes: '천식 환자, 산소 공급 후 회복'
    },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<EmergencyRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
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

  const handleDelete = (id: number) => {
    if (confirm('정말로 이 기록을 삭제하시겠습니까?')) {
      setRecords(records.filter(r => r.id !== id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRecord) {
      // 수정
      setRecords(records.map(r => r.id === editingRecord.id ? { ...formData, id: r.id } as EmergencyRecord : r));
    } else {
      // 신규 등록
      const newId = Math.max(...records.map(r => r.id), 0) + 1;
      setRecords([...records, { ...formData, id: newId } as EmergencyRecord]);
    }
    setShowModal(false);
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
                className="px-6 py-3 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-2"
                style={{ borderRadius: '0px' }}
              >
                <Plus className="w-5 h-5" />
                신규 기록 등록
              </button>
            </div>

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
          <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto" style={{ borderRadius: '0px' }}>
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
                    value={formData.incidentTime?.replace(' ', 'T')}
                    onChange={(e) => setFormData({ ...formData, incidentTime: e.target.value.replace('T', ' ') })}
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
