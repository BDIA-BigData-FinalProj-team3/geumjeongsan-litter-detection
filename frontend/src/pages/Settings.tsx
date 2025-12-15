import React, { useState, useMemo, useEffect } from 'react';
import { Settings as SettingsIcon, Mail, User, Phone, Building, Plus, X, Trash2, Search, ArrowRight } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import HamburgerMenuButton from '../components/HamburgerMenuButton';
import { useNavigate } from 'react-router-dom';
import { 
  getAllContacts, 
  createContact, 
  deleteContact,
  subscribeStaff,
  unsubscribeStaff,
  subscribeContact,
  unsubscribeContact,
  getAllRecipients,
  getRecipientsByIncidentType,
  getActiveStaff
} from '../services/api';

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
  position?: string; // 직급/직책
  organization?: string; // 조직/소속
  incidentTypes?: string[]; // 추가: 선택된 사건 유형들
}

interface ExternalContact {
  id: number;
  category: string; // 'FIRE', 'HOSPITAL', 'POLICE' 등
  name: string;
  phone: string;
  organization: string;
  incidentTypes?: string[];
}

export default function Settings({ onNavigate }: SettingsProps) {
  const navigate = useNavigate();
  
  // 반응형: 화면 크기 감지
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  
  // 화면 크기 변경 감지
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 데이터 로드 (직원, 외부 연락처 및 알림 수신자)
  useEffect(() => {
    loadData();
  }, []);
  const [nameSearch, setNameSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('전체');
  const [rightNameSearch, setRightNameSearch] = useState(''); // 오른쪽 표 검색
  const [rightDepartmentFilter, setRightDepartmentFilter] = useState<string>('전체'); // 오른쪽 표 부서 필터
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [selectedEmployeeDetail, setSelectedEmployeeDetail] = useState<NotificationEmployee | null>(null); // 상세정보 모달용
  const [leftSelectedIds, setLeftSelectedIds] = useState<number[]>([]); // 왼쪽 표 체크박스 선택
  const [rightSelectedIds, setRightSelectedIds] = useState<number[]>([]); // 오른쪽 표 체크박스 선택
  const [selectedIncidentTypes, setSelectedIncidentTypes] = useState<string[]>([]); // 선택된 사건 유형들
  const [recipientTab, setRecipientTab] = useState<'staff' | 'external'>('staff'); // 탭 선택
  
  // 전체 직원 목록 (왼쪽 표용)
  const [allEmployees, setAllEmployees] = useState<NotificationEmployee[]>([]);
  
  // 데이터 로드 함수 (재사용 가능)
  const loadData = async () => {
    setLoading(true);
    try {
      // 실제 직원 목록 로드
      const staff = await getActiveStaff();
      console.log('✅ [Settings] Loaded staff from DB:', staff.length, 'employees');
      console.log('🔍 [Settings] Sample staff data:', staff[0]);
      
      // 알림 수신자 로드 (VIEW에서 가져옴)
      const recipients = await getAllRecipients();
      console.log('✅ [Settings] Loaded recipients from VIEW:', recipients.length, 'recipients');
      
      // VIEW에서 직원 정보 추출
      const staffRecipientsFromView = recipients.filter((r: any) => 
        (r.recipientType || r.recipient_type) === 'STAFF'
      );
      
      // VIEW 데이터를 user_id로 매핑
      const viewDataMap = new Map();
      staffRecipientsFromView.forEach((r: any) => {
        const recipientId = r.recipientId || r.recipient_id;
        if (!viewDataMap.has(recipientId)) {
          viewDataMap.set(recipientId, {
            department: r.department || '',
            position: r.position || '',
            organization: r.organization || '',
          });
        }
      });
      
      const mappedStaff = staff.map((s: any) => {
        const userId = s.id || s.userId;
        const viewData = viewDataMap.get(userId) || {};
        
        const dept = viewData.department || s.deptName || s.dept_name || s.department || '';
        const org = viewData.organization || s.deptGroup || s.dept_group || s.organization || '';
        console.log(`🔍 [Settings] Staff ${userId}: deptName="${s.deptName}", deptGroup="${s.deptGroup}", viewDept="${viewData.department}", viewOrg="${viewData.organization}", final="${dept}"`);
        
        return {
          id: userId,
          employeeNumber: s.loginId || `EMP-${String(userId).padStart(3, '0')}`,
          department: dept,
          name: s.name || '',
          email: s.email || '',
          phone: s.phone || '',
          position: viewData.position || s.position || '',
          organization: org,
        };
      });
      setAllEmployees(mappedStaff);
      console.log('✅ [Settings] Mapped staff:', mappedStaff.length, 'employees');

      // 외부 연락처 로드
      const contacts = await getAllContacts();
      console.log('✅ [Settings] Loaded contacts from DB:', contacts.length, 'contacts');
      setAllContacts(contacts.map((c: any) => ({
        id: c.id || c.contactId,
        category: c.category || '',
        name: c.name || '',
        phone: c.phone || '',
        organization: c.organization || '',
      })));
      
      // 직원과 외부 연락처로 분리
      const staffRecipients = recipients.filter((r: any) => 
        (r.recipientType || r.recipient_type) === 'STAFF'
      );
      const externalRecipients = recipients.filter((r: any) => 
        (r.recipientType || r.recipient_type) === 'EXTERNAL'
      );
      
      // 구독 중인 직원 목록 생성
      const subscribedStaffMap = new Map();
      staffRecipients.forEach((r: any) => {
        const recipientId = r.recipientId || r.recipient_id;
        const incidentType = r.incidentType || r.incident_type;
        
        if (!subscribedStaffMap.has(recipientId)) {
          const staffMember = staff.find((s: any) => (s.id || s.userId) === recipientId);
          subscribedStaffMap.set(recipientId, {
            id: recipientId,
            employeeNumber: staffMember?.loginId || r.name || `EMP-${String(recipientId).padStart(3, '0')}`,
            department: r.department || staffMember?.deptName || staffMember?.dept_name || '',
            name: r.name || staffMember?.name || '',
            email: r.email || staffMember?.email || '',
            phone: r.phone || staffMember?.phone || '',
            position: r.position || staffMember?.position || '',
            organization: r.organization || staffMember?.deptGroup || staffMember?.dept_group || '',
            incidentTypes: incidentType ? [incidentType] : [],
          });
        } else {
          const existing = subscribedStaffMap.get(recipientId);
          if (incidentType && !existing.incidentTypes?.includes(incidentType)) {
            existing.incidentTypes = existing.incidentTypes || [];
            existing.incidentTypes.push(incidentType);
          }
        }
      });
      const subscribedStaffList = sortEmployeesByNumber(Array.from(subscribedStaffMap.values()));
      setSelectedEmployees(subscribedStaffList);
      console.log('✅ [Settings] Subscribed staff:', subscribedStaffList.length, 'employees');
      
      // 선택된 외부 연락처 목록 업데이트
      const selectedContactsMap = new Map();
      externalRecipients.forEach((r: any) => {
        const recipientId = r.recipientId || r.recipient_id;
        const incidentType = r.incidentType || r.incident_type;
        
        if (!selectedContactsMap.has(recipientId)) {
          const contact = contacts.find((c: any) => (c.id || c.contactId) === recipientId);
          if (contact) {
            selectedContactsMap.set(recipientId, {
              id: recipientId,
              category: r.department || contact.category || '',
              name: r.name || contact.name || '',
              phone: r.phone || contact.phone || '',
              organization: r.organization || contact.organization || '',
              incidentTypes: incidentType ? [incidentType] : [],
            });
          }
        } else {
          const existing = selectedContactsMap.get(recipientId);
          if (incidentType && !existing.incidentTypes?.includes(incidentType)) {
            existing.incidentTypes = existing.incidentTypes || [];
            existing.incidentTypes.push(incidentType);
          }
        }
      });
      const selectedContactsList = Array.from(selectedContactsMap.values());
      setSelectedContacts(selectedContactsList);
      console.log('✅ [Settings] Selected contacts:', selectedContactsList.length, 'contacts');
      console.log('✅ [Settings] Data loading completed successfully!');
    } catch (error) {
      console.error('❌ [Settings] Failed to load notification data:', error);
    } finally {
      setLoading(false);
    }
  };

  // 선택된 직원 목록 (오른쪽 표용)
  const [selectedEmployees, setSelectedEmployees] = useState<NotificationEmployee[]>([]);

  // 외부 연락처 목록 (전체)
  const [allContacts, setAllContacts] = useState<ExternalContact[]>([]);

  // 선택된 외부 연락처 (오른쪽 표용)
  const [selectedContacts, setSelectedContacts] = useState<ExternalContact[]>([]);
  
  // 로딩 상태
  const [loading, setLoading] = useState(false);

  // 외부 연락처 검색 및 필터
  const [contactNameSearch, setContactNameSearch] = useState('');
  const [contactCategoryFilter, setContactCategoryFilter] = useState<string>('전체');
  const [rightContactNameSearch, setRightContactNameSearch] = useState('');
  const [rightContactCategoryFilter, setRightContactCategoryFilter] = useState<string>('전체');
  const [leftContactSelectedIds, setLeftContactSelectedIds] = useState<number[]>([]);
  const [rightContactSelectedIds, setRightContactSelectedIds] = useState<number[]>([]);

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
      
      // 사건 유형 필터 (선택된 사건 유형이 있을 경우)
      if (selectedIncidentTypes.length > 0) {
        const incidentTypeMap: { [key: string]: string } = {
          '전체': 'ALL',
          '응급': 'EMERGENCY',
          '화재': 'FIRE',
          '쓰레기': 'TRASH',
          '낙석': 'ROCKFALL'
        };
        
        // 선택된 사건 유형 중 하나라도 구독했는지 확인
        const hasSelectedType = selectedIncidentTypes.some(type => {
          const dbType = incidentTypeMap[type];
          return emp.incidentTypes?.includes(dbType);
        });
        
        if (!hasSelectedType) {
          return false;
        }
      }
      
      return true;
    });
  }, [selectedEmployees, rightNameSearch, rightDepartmentFilter, selectedIncidentTypes]);

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
  const handleBatchAdd = async () => {
    const employeesToAdd = filteredEmployees.filter(emp => leftSelectedIds.includes(emp.id));
    const newEmployees = employeesToAdd.filter(emp => !selectedEmployees.some(sel => sel.id === emp.id));
    const updated = [...selectedEmployees, ...newEmployees];
    setSelectedEmployees(sortEmployeesByNumber(updated));
    setLeftSelectedIds([]);
    
    // API 호출: 선택된 사건 유형에 대해 구독
    try {
      const incidentTypeMap: { [key: string]: string } = {
        '응급': 'EMERGENCY',
        '화재': 'FIRE',
        '쓰레기': 'TRASH',
        '낙석': 'ROCKFALL',
        '전체': 'ALL'
      };
      
      // 선택된 유형이 없으면 경고
      if (selectedIncidentTypes.length === 0) {
        alert('사건 유형을 먼저 선택해주세요!');
        return;
      }
      
      console.log(`🔔 [Settings] Adding ${newEmployees.length} employees to ${selectedIncidentTypes.join(', ')}`);
      
      for (const emp of newEmployees) {
        for (const type of selectedIncidentTypes) {
          const dbType = incidentTypeMap[type];
          console.log(`📝 [Settings] Subscribing staff ${emp.id} to ${dbType}`);
          await subscribeStaff(emp.id, dbType);
        }
      }
      
      console.log('✅ [Settings] Subscription completed, reloading data...');
      // 데이터 다시 로드하여 화면 갱신
      await loadData();
    } catch (error) {
      console.error('❌ [Settings] Failed to subscribe staff:', error);
      alert('직원 추가 중 오류가 발생했습니다.');
    }
  };

  // 일괄 삭제 (오른쪽 표에서 선택된 직원들 삭제)
  const handleBatchRemove = async () => {
    if (rightSelectedIds.length === 0) return;
    if (window.confirm(`선택한 ${rightSelectedIds.length}명의 직원을 삭제하시겠습니까?`)) {
      const employeesToRemove = selectedEmployees.filter(emp => rightSelectedIds.includes(emp.id));
      const updated = selectedEmployees.filter(emp => !rightSelectedIds.includes(emp.id));
      setSelectedEmployees(sortEmployeesByNumber(updated));
      setRightSelectedIds([]);
      setSelectedEmployeeId(null);
      
      // API 호출: 모든 사건 유형에 대해 구독 해제
      try {
        const incidentTypeMap: { [key: string]: string } = {
          '전체': 'ALL',
          '응급': 'EMERGENCY',
          '화재': 'FIRE',
          '쓰레기': 'TRASH',
          '낙석': 'ROCKFALL'
        };
        
        for (const emp of employeesToRemove) {
          for (const type of ['전체', '응급', '화재', '쓰레기', '낙석']) {
            const dbType = incidentTypeMap[type];
            await unsubscribeStaff(emp.id, dbType);
          }
        }
      } catch (error) {
        console.error('Failed to unsubscribe staff:', error);
      }
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

  // 사건 유형 토글
  const handleIncidentTypeToggle = (employeeId: number, type: string) => {
    setSelectedEmployees(prev => prev.map(emp => {
      if (emp.id === employeeId) {
        const currentTypes = emp.incidentTypes || [];
        const newTypes = currentTypes.includes(type)
          ? currentTypes.filter(t => t !== type)
          : [...currentTypes, type];
        return { ...emp, incidentTypes: newTypes };
      }
      return emp;
    }));
  };

  // ===== 외부 연락처 관련 함수 =====
  
  // 카테고리 목록 추출
  const categories = useMemo(() => {
    const catSet = new Set(allContacts.map(c => c.category));
    return ['전체', ...Array.from(catSet)];
  }, [allContacts]);

  // 필터링된 외부 연락처 목록 (왼쪽 표용)
  const filteredContacts = useMemo(() => {
    return allContacts.filter(contact => {
      if (selectedContacts.some(sel => sel.id === contact.id)) {
        return false;
      }
      if (contactNameSearch && !contact.name.toLowerCase().includes(contactNameSearch.toLowerCase())) {
        return false;
      }
      if (contactCategoryFilter !== '전체' && contact.category !== contactCategoryFilter) {
        return false;
      }
      return true;
    });
  }, [allContacts, selectedContacts, contactNameSearch, contactCategoryFilter]);

  // 필터링된 선택된 외부 연락처 (오른쪽 표용)
  const filteredSelectedContacts = useMemo(() => {
    return selectedContacts.filter(contact => {
      if (rightContactNameSearch && !contact.name.toLowerCase().includes(rightContactNameSearch.toLowerCase())) {
        return false;
      }
      if (rightContactCategoryFilter !== '전체' && contact.category !== rightContactCategoryFilter) {
        return false;
      }
      
      // 사건 유형 필터 (선택된 사건 유형이 있을 경우)
      if (selectedIncidentTypes.length > 0) {
        const incidentTypeMap: { [key: string]: string } = {
          '전체': 'ALL',
          '응급': 'EMERGENCY',
          '화재': 'FIRE',
          '쓰레기': 'TRASH',
          '낙석': 'ROCKFALL'
        };
        
        // 선택된 사건 유형 중 하나라도 구독했는지 확인
        const hasSelectedType = selectedIncidentTypes.some(type => {
          const dbType = incidentTypeMap[type];
          return contact.incidentTypes?.includes(dbType);
        });
        
        if (!hasSelectedType) {
          return false;
        }
      }
      
      return true;
    });
  }, [selectedContacts, rightContactNameSearch, rightContactCategoryFilter, selectedIncidentTypes]);

  // 외부 연락처 정렬
  const sortContactsByName = (contacts: ExternalContact[]): ExternalContact[] => {
    return [...contacts].sort((a, b) => a.name.localeCompare(b.name));
  };

  // 외부 연락처 일괄 추가
  const handleBatchAddContact = async () => {
    const contactsToAdd = filteredContacts.filter(c => leftContactSelectedIds.includes(c.id));
    const newContacts = contactsToAdd.filter(c => !selectedContacts.some(sel => sel.id === c.id));
    const updated = [...selectedContacts, ...newContacts];
    setSelectedContacts(sortContactsByName(updated));
    setLeftContactSelectedIds([]);
    
    // API 호출: 선택된 사건 유형에 대해 구독
    try {
      const incidentTypeMap: { [key: string]: string } = {
        '응급': 'EMERGENCY',
        '화재': 'FIRE',
        '쓰레기': 'TRASH',
        '낙석': 'ROCKFALL',
        '전체': 'ALL'
      };
      
      // 선택된 유형이 없으면 경고
      if (selectedIncidentTypes.length === 0) {
        alert('사건 유형을 먼저 선택해주세요!');
        return;
      }
      
      console.log(`🔔 [Settings] Adding ${newContacts.length} contacts to ${selectedIncidentTypes.join(', ')}`);
      
      for (const contact of newContacts) {
        for (const type of selectedIncidentTypes) {
          const dbType = incidentTypeMap[type];
          console.log(`📝 [Settings] Subscribing contact ${contact.id} to ${dbType}`);
          await subscribeContact(contact.id, dbType);
        }
      }
      
      console.log('✅ [Settings] Contact subscription completed, reloading data...');
      // 데이터 다시 로드하여 화면 갱신
      await loadData();
    } catch (error) {
      console.error('❌ [Settings] Failed to subscribe contact:', error);
      alert('외부 연락처 추가 중 오류가 발생했습니다.');
    }
  };

  // 외부 연락처 일괄 삭제
  const handleBatchRemoveContact = async () => {
    if (rightContactSelectedIds.length === 0) return;
    if (window.confirm(`선택한 ${rightContactSelectedIds.length}개의 연락처를 삭제하시겠습니까?`)) {
      const contactsToRemove = selectedContacts.filter(c => rightContactSelectedIds.includes(c.id));
      const updated = selectedContacts.filter(c => !rightContactSelectedIds.includes(c.id));
      setSelectedContacts(sortContactsByName(updated));
      setRightContactSelectedIds([]);
      
      // API 호출: 모든 사건 유형에 대해 구독 해제
      try {
        const incidentTypeMap: { [key: string]: string } = {
          '전체': 'ALL',
          '응급': 'EMERGENCY',
          '화재': 'FIRE',
          '쓰레기': 'TRASH',
          '낙석': 'ROCKFALL'
        };
        
        for (const contact of contactsToRemove) {
          for (const type of ['전체', '응급', '화재', '쓰레기', '낙석']) {
            const dbType = incidentTypeMap[type];
            await unsubscribeContact(contact.id, dbType);
          }
        }
      } catch (error) {
        console.error('Failed to unsubscribe contact:', error);
      }
    }
  };

  // 외부 연락처 체크박스 토글
  const handleLeftContactCheckboxToggle = (id: number) => {
    setLeftContactSelectedIds(prev => 
      prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]
    );
  };

  const handleRightContactCheckboxToggle = (id: number) => {
    setRightContactSelectedIds(prev => 
      prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]
    );
  };

  // 외부 연락처 전체 선택/해제
  const handleLeftContactSelectAll = () => {
    if (leftContactSelectedIds.length === filteredContacts.length) {
      setLeftContactSelectedIds([]);
    } else {
      setLeftContactSelectedIds(filteredContacts.map(c => c.id));
    }
  };

  const handleRightContactSelectAll = () => {
    if (rightContactSelectedIds.length === filteredSelectedContacts.length) {
      setRightContactSelectedIds([]);
    } else {
      setRightContactSelectedIds(filteredSelectedContacts.map(c => c.id));
    }
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar - 반응형 (모바일: 75vw, PC: 고정) */}
      <div 
        className="fixed top-0 left-0 z-50 h-screen transition-transform duration-300 ease-in-out"
        style={{ 
          width: isMobile ? '75vw' : '317.56px',
          backgroundColor: '#2B2847',
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)'
        }}
      >
        <Sidebar onNavigate={onNavigate || (() => {})} currentPath="settings" />
      </div>
      
      {/* 모바일 오버레이 */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div className="flex-1 flex flex-col relative bg-white" style={{ marginLeft: sidebarOpen && !isMobile ? '317.56px' : '0px', transition: 'margin-left 0.3s' }}>
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
              {/* 알림 수신자 관리 섹션 */}
              <div className="bg-white shadow-sm border border-gray-200 mb-6" style={{ borderRadius: '0px' }}>
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-gray-900 text-lg font-semibold">알림 수신자 관리</h2>
                      <p className="text-gray-600 text-sm mt-1">사고 탐지 시 알림을 받을 수신자를 선택하세요.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {['전체', '응급', '화재', '쓰레기', '낙석'].map(type => (
                        <button
                          key={type}
                          onClick={() => {
                            setSelectedIncidentTypes(prev => 
                              prev.includes(type) 
                                ? prev.filter(t => t !== type)
                                : [...prev, type]
                            );
                          }}
                          className={`px-4 py-2 text-sm transition-colors ${
                            selectedIncidentTypes.includes(type)
                              ? 'bg-gray-700 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                          style={{ borderRadius: '0px' }}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 탭 */}
                <div className="px-6 pt-4 flex gap-2 border-b border-gray-200">
                  <button
                    onClick={() => {
                      setRecipientTab('staff');
                      setLeftSelectedIds([]);
                      setRightSelectedIds([]);
                    }}
                    className={`px-6 py-2 text-sm font-medium transition-colors ${
                      recipientTab === 'staff'
                        ? 'border-b-2 border-emerald-600 text-emerald-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    직원
                  </button>
                  <button
                    onClick={() => {
                      setRecipientTab('external');
                      setLeftContactSelectedIds([]);
                      setRightContactSelectedIds([]);
                    }}
                    className={`px-6 py-2 text-sm font-medium transition-colors ${
                      recipientTab === 'external'
                        ? 'border-b-2 border-emerald-600 text-emerald-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    외부 연락처
                  </button>
                </div>

                {/* 두 개의 표를 나란히 배치 */}
                <div className="grid grid-cols-2 gap-6 p-6">
                  {recipientTab === 'staff' ? (
                    <>
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
                    </>
                  ) : (
                    <>
                      {/* 외부 연락처 탭 - 왼쪽: 선택할 외부 연락처 */}
                      <div className="flex flex-col">
                        <h3 className="text-gray-900 font-semibold mb-4 text-base">외부 연락처 선택</h3>
                        
                        <div className="mb-4 flex items-center gap-3">
                          <select
                            value={contactCategoryFilter}
                            onChange={(e) => setContactCategoryFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                            style={{ borderRadius: '0px', width: '150px' }}
                          >
                            {categories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                          <div className="relative flex-1" style={{ maxWidth: '250px' }}>
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              value={contactNameSearch}
                              onChange={(e) => setContactNameSearch(e.target.value)}
                              placeholder="이름으로 검색"
                              className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                              style={{ borderRadius: '0px' }}
                            />
                          </div>
                          {leftContactSelectedIds.length > 0 && (
                            <button
                              onClick={handleBatchAddContact}
                              className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-2 text-sm whitespace-nowrap"
                              style={{ borderRadius: '0px' }}
                            >
                              <Plus className="w-4 h-4" />
                              선택한 {leftContactSelectedIds.length}개 추가
                            </button>
                          )}
                        </div>

                        <div className="flex-1 overflow-y-auto border border-gray-200" style={{ maxHeight: '500px' }}>
                          <table className="w-full">
                            <thead className="bg-gray-50 sticky top-0">
                              <tr>
                                <th className="px-4 py-2 text-center text-xs font-medium text-gray-700 uppercase w-12">
                                  <input
                                    type="checkbox"
                                    checked={filteredContacts.length > 0 && leftContactSelectedIds.length === filteredContacts.length}
                                    onChange={handleLeftContactSelectAll}
                                    className="cursor-pointer"
                                  />
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">분류</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">이름</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">전화번호</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">소속</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {filteredContacts.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500 text-sm">
                                    검색 결과가 없습니다.
                                  </td>
                                </tr>
                              ) : (
                                filteredContacts.map((contact) => (
                                  <tr 
                                    key={contact.id} 
                                    className="hover:bg-gray-50 cursor-pointer"
                                  >
                                    <td className="px-4 py-3 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                                      <input
                                        type="checkbox"
                                        checked={leftContactSelectedIds.includes(contact.id)}
                                        onChange={() => handleLeftContactCheckboxToggle(contact.id)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="cursor-pointer"
                                      />
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <span className="text-sm text-gray-900">{contact.category}</span>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <span className="text-sm text-gray-900">{contact.name}</span>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <span className="text-sm text-gray-900">{contact.phone}</span>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <span className="text-sm text-gray-900">{contact.organization}</span>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* 외부 연락처 탭 - 오른쪽: 알림 수신 외부 연락처 */}
                      <div className="flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-gray-900 font-semibold text-base">알림 수신 외부 연락처 ({selectedContacts.length}개)</h3>
                          {rightContactSelectedIds.length > 0 && (
                            <button
                              onClick={handleBatchRemoveContact}
                              className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-2 text-sm whitespace-nowrap"
                              style={{ borderRadius: '0px' }}
                            >
                              <Trash2 className="w-4 h-4" />
                              선택한 {rightContactSelectedIds.length}개 삭제
                            </button>
                          )}
                        </div>

                        <div className="mb-4 flex items-center gap-3">
                          <select
                            value={rightContactCategoryFilter}
                            onChange={(e) => setRightContactCategoryFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                            style={{ borderRadius: '0px', width: '150px' }}
                          >
                            {categories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                          <div className="relative flex-1" style={{ maxWidth: '250px' }}>
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              value={rightContactNameSearch}
                              onChange={(e) => setRightContactNameSearch(e.target.value)}
                              placeholder="이름으로 검색"
                              className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                              style={{ borderRadius: '0px' }}
                            />
                          </div>
                        </div>

                        <div className="flex-1 overflow-y-auto border border-gray-200" style={{ maxHeight: '500px' }}>
                          <table className="w-full">
                            <thead className="bg-gray-50 sticky top-0">
                              <tr>
                                <th className="px-4 py-2 text-center text-xs font-medium text-gray-700 uppercase w-12">
                                  <input
                                    type="checkbox"
                                    checked={filteredSelectedContacts.length > 0 && rightContactSelectedIds.length === filteredSelectedContacts.length && filteredSelectedContacts.every(c => rightContactSelectedIds.includes(c.id))}
                                    onChange={handleRightContactSelectAll}
                                    className="cursor-pointer"
                                  />
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">분류</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">이름</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">전화번호</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">소속</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {filteredSelectedContacts.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500 text-sm">
                                    {selectedContacts.length === 0 ? '선택된 연락처가 없습니다.' : '검색 결과가 없습니다.'}
                                  </td>
                                </tr>
                              ) : (
                                filteredSelectedContacts.map((contact) => (
                                  <tr 
                                    key={contact.id} 
                                    className="hover:bg-gray-50 cursor-pointer"
                                  >
                                    <td className="px-4 py-3 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                                      <input
                                        type="checkbox"
                                        checked={rightContactSelectedIds.includes(contact.id)}
                                        onChange={() => handleRightContactCheckboxToggle(contact.id)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="cursor-pointer"
                                      />
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <span className="text-sm text-gray-900">{contact.category}</span>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <span className="text-sm text-gray-900">{contact.name}</span>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <span className="text-sm text-gray-900">{contact.phone}</span>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <span className="text-sm text-gray-900">{contact.organization}</span>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}
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
                    <p className="text-gray-900">{selectedEmployeeDetail.department || '정보 없음'}</p>
                  </div>
                </div>
                
                {selectedEmployeeDetail.position && (
                  <div>
                    <label className="text-sm text-gray-600">직급/직책</label>
                    <div className="flex items-center mt-1">
                      <User className="w-4 h-4 text-gray-400 mr-2" />
                      <p className="text-gray-900">{selectedEmployeeDetail.position}</p>
                    </div>
                  </div>
                )}
                
                {selectedEmployeeDetail.organization && (
                  <div>
                    <label className="text-sm text-gray-600">소속 조직</label>
                    <div className="flex items-center mt-1">
                      <Building className="w-4 h-4 text-gray-400 mr-2" />
                      <p className="text-gray-900">{selectedEmployeeDetail.organization}</p>
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="text-sm text-gray-600">이메일</label>
                  <div className="flex items-center mt-1">
                    <Mail className="w-4 h-4 text-gray-400 mr-2" />
                    <p className="text-gray-900">{selectedEmployeeDetail.email || '정보 없음'}</p>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm text-gray-600">연락처</label>
                  <div className="flex items-center mt-1">
                    <Phone className="w-4 h-4 text-gray-400 mr-2" />
                    <p className="text-gray-900">{selectedEmployeeDetail.phone || '정보 없음'}</p>
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

