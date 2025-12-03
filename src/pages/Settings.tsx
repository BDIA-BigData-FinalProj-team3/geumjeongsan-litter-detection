import React, { useState, useMemo } from 'react';
import { Settings as SettingsIcon, Mail, User, Phone, Building, Plus, X, Trash2, Search, ArrowRight } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import HamburgerMenuButton from '../components/HamburgerMenuButton';
import { useNavigate } from 'react-router-dom';

interface SettingsProps {
  onNavigate?: (screen: string) => void;
}

interface NotificationEmployee {
  id: number;
  employeeNumber: string;
  department: string;
  name: string;
  email: string;
  phone: string;
}

export default function Settings({ onNavigate }: SettingsProps) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [nameSearch, setNameSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('전체');
  const [rightNameSearch, setRightNameSearch] = useState(''); // 오른쪽 표 검색
  const [rightDepartmentFilter, setRightDepartmentFilter] = useState<string>('전체'); // 오른쪽 표 부서 필터
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [selectedEmployeeDetail, setSelectedEmployeeDetail] = useState<NotificationEmployee | null>(null); // 상세정보 모달용
  const [leftSelectedIds, setLeftSelectedIds] = useState<number[]>([]); // 왼쪽 표 체크박스 선택
  const [rightSelectedIds, setRightSelectedIds] = useState<number[]>([]); // 오른쪽 표 체크박스 선택
  
  // 전체 직원 목록 (왼쪽 표용)
  const [allEmployees, setAllEmployees] = useState<NotificationEmployee[]>([
    { id: 1, employeeNumber: 'EMP-001', department: '응급의료팀', name: '김응급', email: 'kim.emergency@geumjeong.go.kr', phone: '010-1234-5678' },
    { id: 2, employeeNumber: 'EMP-002', department: '응급의료팀', name: '이구조', email: 'lee.rescue@geumjeong.go.kr', phone: '010-2345-6789' },
    { id: 3, employeeNumber: 'EMP-003', department: '화재안전팀', name: '박소방', email: 'park.fire@geumjeong.go.kr', phone: '010-3456-7890' },
    { id: 4, employeeNumber: 'EMP-004', department: '화재안전팀', name: '최안전', email: 'choi.safety@geumjeong.go.kr', phone: '010-4567-8901' },
    { id: 5, employeeNumber: 'EMP-005', department: '응급의료팀', name: '정의료', email: 'jung.medical@geumjeong.go.kr', phone: '010-5678-9012' },
    { id: 6, employeeNumber: 'EMP-006', department: '화재안전팀', name: '강방재', email: 'kang.fire@geumjeong.go.kr', phone: '010-6789-0123' },
    { id: 7, employeeNumber: 'EMP-007', department: '응급의료팀', name: '윤구급', email: 'yoon.emergency@geumjeong.go.kr', phone: '010-7890-1234' },
    { id: 8, employeeNumber: 'EMP-008', department: '화재안전팀', name: '임소방', email: 'lim.fire@geumjeong.go.kr', phone: '010-8901-2345' },
    { id: 9, employeeNumber: 'EMP-009', department: '응급의료팀', name: '한응급', email: 'han.emergency@geumjeong.go.kr', phone: '010-9012-3456' },
    { id: 10, employeeNumber: 'EMP-010', department: '화재안전팀', name: '신안전', email: 'shin.safety@geumjeong.go.kr', phone: '010-0123-4567' },
    { id: 11, employeeNumber: 'EMP-011', department: '응급의료팀', name: '조응급', email: 'cho.emergency@geumjeong.go.kr', phone: '010-1122-3344' },
    { id: 12, employeeNumber: 'EMP-012', department: '화재안전팀', name: '배소방', email: 'bae.fire@geumjeong.go.kr', phone: '010-2233-4455' },
    { id: 13, employeeNumber: 'EMP-013', department: '응급의료팀', name: '서의료', email: 'seo.medical@geumjeong.go.kr', phone: '010-3344-5566' },
    { id: 14, employeeNumber: 'EMP-014', department: '화재안전팀', name: '오방재', email: 'oh.fire@geumjeong.go.kr', phone: '010-4455-6677' },
    { id: 15, employeeNumber: 'EMP-015', department: '응급의료팀', name: '유구조', email: 'yu.rescue@geumjeong.go.kr', phone: '010-5566-7788' },
    { id: 16, employeeNumber: 'EMP-016', department: '화재안전팀', name: '노안전', email: 'no.safety@geumjeong.go.kr', phone: '010-6677-8899' },
    { id: 17, employeeNumber: 'EMP-017', department: '응급의료팀', name: '문응급', email: 'moon.emergency@geumjeong.go.kr', phone: '010-7788-9900' },
    { id: 18, employeeNumber: 'EMP-018', department: '화재안전팀', name: '류소방', email: 'ryu.fire@geumjeong.go.kr', phone: '010-8899-0011' },
    { id: 19, employeeNumber: 'EMP-019', department: '응급의료팀', name: '송의료', email: 'song.medical@geumjeong.go.kr', phone: '010-9900-1122' },
    { id: 20, employeeNumber: 'EMP-020', department: '화재안전팀', name: '전방재', email: 'jeon.fire@geumjeong.go.kr', phone: '010-0011-2233' },
    { id: 21, employeeNumber: 'EMP-021', department: '응급의료팀', name: '홍구조', email: 'hong.rescue@geumjeong.go.kr', phone: '010-1023-4567' },
    { id: 22, employeeNumber: 'EMP-022', department: '화재안전팀', name: '고안전', email: 'go.safety@geumjeong.go.kr', phone: '010-2034-5678' },
    { id: 23, employeeNumber: 'EMP-023', department: '응급의료팀', name: '양응급', email: 'yang.emergency@geumjeong.go.kr', phone: '010-3045-6789' },
    { id: 24, employeeNumber: 'EMP-024', department: '화재안전팀', name: '백소방', email: 'baek.fire@geumjeong.go.kr', phone: '010-4056-7890' },
    { id: 25, employeeNumber: 'EMP-025', department: '응급의료팀', name: '남의료', email: 'nam.medical@geumjeong.go.kr', phone: '010-5067-8901' },
    // 동명이인 추가
    { id: 26, employeeNumber: 'EMP-026', department: '응급의료팀', name: '김응급', email: 'kim.emergency2@geumjeong.go.kr', phone: '010-1234-9999' },
    { id: 27, employeeNumber: 'EMP-027', department: '화재안전팀', name: '이구조', email: 'lee.rescue2@geumjeong.go.kr', phone: '010-2345-9999' },
    { id: 28, employeeNumber: 'EMP-028', department: '응급의료팀', name: '박소방', email: 'park.fire2@geumjeong.go.kr', phone: '010-3456-9999' },
  ]);

  // 선택된 직원 목록 (오른쪽 표용)
  const [selectedEmployees, setSelectedEmployees] = useState<NotificationEmployee[]>([
    { id: 1, employeeNumber: 'EMP-001', department: '응급의료팀', name: '김응급', email: 'kim.emergency@geumjeong.go.kr', phone: '010-1234-5678' },
    { id: 2, employeeNumber: 'EMP-002', department: '응급의료팀', name: '이구조', email: 'lee.rescue@geumjeong.go.kr', phone: '010-2345-6789' },
    { id: 3, employeeNumber: 'EMP-003', department: '화재안전팀', name: '박소방', email: 'park.fire@geumjeong.go.kr', phone: '010-3456-7890' },
  ]);

  // 부서 목록 추출
  const departments = useMemo(() => {
    const deptSet = new Set(allEmployees.map(emp => emp.department));
    return ['전체', ...Array.from(deptSet)];
  }, [allEmployees]);

  // 필터링된 직원 목록 (왼쪽 표용)
  const filteredEmployees = useMemo(() => {
    return allEmployees.filter(emp => {
      // 이미 선택된 직원은 제외
      if (selectedEmployees.some(sel => sel.id === emp.id)) {
        return false;
      }
      
      // 이름 검색 필터
      if (nameSearch && !emp.name.toLowerCase().includes(nameSearch.toLowerCase())) {
        return false;
      }
      
      // 부서 필터
      if (departmentFilter !== '전체' && emp.department !== departmentFilter) {
        return false;
      }
      
      return true;
    });
  }, [allEmployees, selectedEmployees, nameSearch, departmentFilter]);

  // 필터링된 선택된 직원 목록 (오른쪽 표용)
  const filteredSelectedEmployees = useMemo(() => {
    return selectedEmployees.filter(emp => {
      // 이름 검색 필터
      if (rightNameSearch && !emp.name.toLowerCase().includes(rightNameSearch.toLowerCase())) {
        return false;
      }
      
      // 부서 필터
      if (rightDepartmentFilter !== '전체' && emp.department !== rightDepartmentFilter) {
        return false;
      }
      
      return true;
    });
  }, [selectedEmployees, rightNameSearch, rightDepartmentFilter]);

  // 직원번호 기준 오름차순 정렬 함수
  const sortEmployeesByNumber = (employees: NotificationEmployee[]): NotificationEmployee[] => {
    return [...employees].sort((a, b) => {
      return a.employeeNumber.localeCompare(b.employeeNumber);
    });
  };

  // 직원 선택 (왼쪽 -> 오른쪽)
  const handleSelectEmployee = (employee: NotificationEmployee) => {
    if (!selectedEmployees.some(emp => emp.id === employee.id)) {
      const updated = [...selectedEmployees, employee];
      setSelectedEmployees(sortEmployeesByNumber(updated));
    }
  };

  // 일괄 추가 (왼쪽 표에서 선택된 직원들을 오른쪽으로)
  const handleBatchAdd = () => {
    const employeesToAdd = filteredEmployees.filter(emp => leftSelectedIds.includes(emp.id));
    const newEmployees = employeesToAdd.filter(emp => !selectedEmployees.some(sel => sel.id === emp.id));
    const updated = [...selectedEmployees, ...newEmployees];
    setSelectedEmployees(sortEmployeesByNumber(updated));
    setLeftSelectedIds([]);
  };

  // 일괄 삭제 (오른쪽 표에서 선택된 직원들 삭제)
  const handleBatchRemove = () => {
    if (rightSelectedIds.length === 0) return;
    if (window.confirm(`선택한 ${rightSelectedIds.length}명의 직원을 삭제하시겠습니까?`)) {
      const updated = selectedEmployees.filter(emp => !rightSelectedIds.includes(emp.id));
      setSelectedEmployees(sortEmployeesByNumber(updated));
      setRightSelectedIds([]);
      setSelectedEmployeeId(null);
    }
  };

  // 선택된 직원 삭제 (오른쪽 표에서)
  const handleRemoveSelectedEmployee = (id: number) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      const updated = selectedEmployees.filter(emp => emp.id !== id);
      setSelectedEmployees(sortEmployeesByNumber(updated));
      setSelectedEmployeeId(null);
      setRightSelectedIds(rightSelectedIds.filter(selectedId => selectedId !== id));
    }
  };

  // 선택된 직원 행 클릭
  const handleSelectRow = (id: number) => {
    setSelectedEmployeeId(selectedEmployeeId === id ? null : id);
  };

  // 직원 상세정보 표시
  const handleShowEmployeeDetail = (employee: NotificationEmployee) => {
    setSelectedEmployeeDetail(employee);
  };

  // 왼쪽 표 체크박스 토글
  const handleLeftCheckboxToggle = (id: number) => {
    setLeftSelectedIds(prev => 
      prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]
    );
  };

  // 오른쪽 표 체크박스 토글
  const handleRightCheckboxToggle = (id: number) => {
    setRightSelectedIds(prev => 
      prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]
    );
  };

  // 왼쪽 표 전체 선택/해제
  const handleLeftSelectAll = () => {
    if (leftSelectedIds.length === filteredEmployees.length) {
      setLeftSelectedIds([]);
    } else {
      setLeftSelectedIds(filteredEmployees.map(emp => emp.id));
    }
  };

  // 오른쪽 표 전체 선택/해제
  const handleRightSelectAll = () => {
    if (rightSelectedIds.length === filteredSelectedEmployees.length) {
      setRightSelectedIds([]);
    } else {
      setRightSelectedIds(filteredSelectedEmployees.map(emp => emp.id));
    }
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div 
        className="fixed top-0 left-0 z-50 h-screen transition-transform duration-300 ease-in-out"
        style={{ 
          width: '317.56px', 
          backgroundColor: '#2B2847',
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)'
        }}
      >
        <Sidebar onNavigate={onNavigate || (() => {})} currentPath="settings" />
      </div>
      <div className="flex-1 flex flex-col relative bg-white" style={{ marginLeft: sidebarOpen ? '317.56px' : '0px', transition: 'margin-left 0.3s' }}>
        {/* 상단바 */}
        <div className="shadow-md px-6 py-4 flex items-center justify-between border-b border-gray-200" style={{ backgroundColor: '#345eaa' }}>
          <div className="flex items-center gap-3">
            <HamburgerMenuButton onClick={() => setSidebarOpen(!sidebarOpen)} />
            <SettingsIcon className="w-6 h-6 text-gray-200" />
            <h1 className="text-gray-100">설정</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-8 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
              {/* 알림 수신 직원 관리 섹션 */}
              <div className="bg-white shadow-sm border border-gray-200 mb-6" style={{ borderRadius: '0px' }}>
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-gray-900 text-lg font-semibold">알림 수신 직원 관리</h2>
                  <p className="text-gray-600 text-sm mt-1">응급 및 화재사고 탐지 시 알림을 받을 직원을 선택하세요.</p>
                </div>

                {/* 두 개의 표를 나란히 배치 */}
                <div className="grid grid-cols-2 gap-6 p-6">
                  {/* 왼쪽: 선택할 직원 표 */}
                  <div className="flex flex-col">
                    <h3 className="text-gray-900 font-semibold mb-4 text-base">직원 선택</h3>
                    
                    {/* 검색 및 필터 */}
                    <div className="mb-4 flex items-center gap-3">
                      <select
                        value={departmentFilter}
                        onChange={(e) => setDepartmentFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                        style={{ borderRadius: '0px', width: '150px' }}
                      >
                        {departments.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                      <div className="relative flex-1" style={{ maxWidth: '250px' }}>
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={nameSearch}
                          onChange={(e) => setNameSearch(e.target.value)}
                          placeholder="이름으로 검색"
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                          style={{ borderRadius: '0px' }}
                        />
                      </div>
                      {/* 일괄 추가 버튼 */}
                      {leftSelectedIds.length > 0 && (
                        <button
                          onClick={handleBatchAdd}
                          className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-2 text-sm whitespace-nowrap"
                          style={{ borderRadius: '0px' }}
                        >
                          <Plus className="w-4 h-4" />
                          선택한 {leftSelectedIds.length}명 추가
                        </button>
                      )}
                    </div>

                    {/* 직원 목록 테이블 */}
                    <div className="flex-1 overflow-y-auto border border-gray-200" style={{ maxHeight: '500px' }}>
                      <table className="w-full">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-700 uppercase w-12">
                              <input
                                type="checkbox"
                                checked={filteredEmployees.length > 0 && leftSelectedIds.length === filteredEmployees.length}
                                onChange={handleLeftSelectAll}
                                className="cursor-pointer"
                              />
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">직원번호</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">부서명</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">이름</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">이메일</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredEmployees.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-gray-500 text-sm">
                                검색 결과가 없습니다.
                              </td>
                            </tr>
                          ) : (
                            filteredEmployees.map((employee) => (
                              <tr 
                                key={employee.id} 
                                className="hover:bg-gray-50 cursor-pointer"
                                onClick={() => handleShowEmployeeDetail(employee)}
                              >
                                <td className="px-4 py-3 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={leftSelectedIds.includes(employee.id)}
                                    onChange={() => handleLeftCheckboxToggle(employee.id)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="cursor-pointer"
                                  />
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className="text-sm text-gray-900">{employee.employeeNumber}</span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <Building className="w-3 h-3 text-gray-400 mr-1" />
                                    <span className="text-sm text-gray-900">{employee.department}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <User className="w-3 h-3 text-gray-400 mr-1" />
                                    <span className="text-sm text-gray-900">{employee.name}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className="text-sm text-gray-900">{employee.email}</span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 오른쪽: 알림 수신 직원 표 */}
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-gray-900 font-semibold text-base">알림 수신 직원 ({selectedEmployees.length}명)</h3>
                      {/* 일괄 삭제 버튼 */}
                      {rightSelectedIds.length > 0 && (
                        <button
                          onClick={handleBatchRemove}
                          className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-2 text-sm whitespace-nowrap"
                          style={{ borderRadius: '0px' }}
                        >
                          <Trash2 className="w-4 h-4" />
                          선택한 {rightSelectedIds.length}명 삭제
                        </button>
                      )}
                    </div>

                    {/* 검색 및 필터 */}
                    <div className="mb-4 flex items-center gap-3">
                      <select
                        value={rightDepartmentFilter}
                        onChange={(e) => setRightDepartmentFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                        style={{ borderRadius: '0px', width: '150px' }}
                      >
                        {departments.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                      <div className="relative flex-1" style={{ maxWidth: '250px' }}>
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={rightNameSearch}
                          onChange={(e) => setRightNameSearch(e.target.value)}
                          placeholder="이름으로 검색"
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                          style={{ borderRadius: '0px' }}
                        />
                      </div>
                    </div>

                    {/* 알림 수신 직원 목록 테이블 */}
                    <div className="flex-1 overflow-y-auto border border-gray-200" style={{ maxHeight: '500px' }}>
                      <table className="w-full">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-700 uppercase w-12">
                              <input
                                type="checkbox"
                                checked={filteredSelectedEmployees.length > 0 && rightSelectedIds.length === filteredSelectedEmployees.length && filteredSelectedEmployees.every(emp => rightSelectedIds.includes(emp.id))}
                                onChange={handleRightSelectAll}
                                className="cursor-pointer"
                              />
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">직원번호</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">부서명</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">이름</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">이메일</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredSelectedEmployees.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-gray-500 text-sm">
                                {selectedEmployees.length === 0 ? '선택된 직원이 없습니다.' : '검색 결과가 없습니다.'}
                              </td>
                            </tr>
                          ) : (
                            filteredSelectedEmployees.map((employee) => (
                              <tr 
                                key={employee.id} 
                                className="hover:bg-gray-50 cursor-pointer"
                                onClick={() => handleShowEmployeeDetail(employee)}
                              >
                                <td className="px-4 py-3 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={rightSelectedIds.includes(employee.id)}
                                    onChange={() => handleRightCheckboxToggle(employee.id)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="cursor-pointer"
                                  />
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className="text-sm text-gray-900">{employee.employeeNumber}</span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <Building className="w-3 h-3 text-gray-400 mr-1" />
                                    <span className="text-sm text-gray-900">{employee.department}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <User className="w-3 h-3 text-gray-400 mr-1" />
                                    <span className="text-sm text-gray-900">{employee.name}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className="text-sm text-gray-900">{employee.email}</span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 직원 상세정보 모달 */}
      {selectedEmployeeDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedEmployeeDetail(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200" style={{ backgroundColor: '#345eaa' }}>
              <h2 className="text-gray-100 text-lg font-semibold">직원 상세정보</h2>
              <button onClick={() => setSelectedEmployeeDetail(null)} className="text-gray-100 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* 모달 내용 */}
            <div className="p-6">
              <div className="flex flex-col items-center mb-6">
                {/* 증명사진 */}
                <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center mb-4 overflow-hidden">
                  <User className="w-16 h-16 text-gray-400" />
                </div>
                
                {/* 직원명 */}
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{selectedEmployeeDetail.name}</h3>
              </div>

              {/* 상세정보 */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600">직원번호</label>
                  <p className="text-gray-900 mt-1">{selectedEmployeeDetail.employeeNumber}</p>
                </div>
                
                <div>
                  <label className="text-sm text-gray-600">부서명</label>
                  <div className="flex items-center mt-1">
                    <Building className="w-4 h-4 text-gray-400 mr-2" />
                    <p className="text-gray-900">{selectedEmployeeDetail.department}</p>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm text-gray-600">이메일</label>
                  <div className="flex items-center mt-1">
                    <Mail className="w-4 h-4 text-gray-400 mr-2" />
                    <p className="text-gray-900">{selectedEmployeeDetail.email}</p>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm text-gray-600">연락처</label>
                  <div className="flex items-center mt-1">
                    <Phone className="w-4 h-4 text-gray-400 mr-2" />
                    <p className="text-gray-900">{selectedEmployeeDetail.phone}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

