// Mock data for dashboard statistics and incident lists
// CCTV data has been moved to src/services/common.ts (Single Source of Truth)

// ==================== Notification Items ====================
export interface NotificationItem {
  id: string;
  cctvId: string;
  type: 'fire' | 'emergency' | 'trash';
  location: string;
  time: string;
  confidence: string;
  timeAgo: string;
  timestamp: number;
}

export const mockFireNotifications: NotificationItem[] = [
  { id: '1', cctvId: 'CCTV-001', location: '등산로 1', time: '2025-11-25 10:15:00', confidence: '95%', timeAgo: '5분 전', timestamp: new Date('2025-11-25 10:15:00').getTime(), type: 'fire' },
  { id: '2', cctvId: 'CCTV-007', location: '등산로 입구 3', time: '2025-11-25 10:00:00', confidence: '92%', timeAgo: '20분 전', timestamp: new Date('2025-11-25 10:00:00').getTime(), type: 'fire' },
];

export const mockEmergencyNotifications: NotificationItem[] = [
  { id: '1', cctvId: 'CCTV-005', location: '등산로 입구 1', time: '2025-11-25 10:05:00', confidence: '92%', timeAgo: '15분 전', timestamp: new Date('2025-11-25 10:05:00').getTime(), type: 'emergency' },
];

export const mockTrashNotifications: NotificationItem[] = [
  { id: '1', cctvId: 'CCTV-003', location: '등산로 3', time: '2025-11-25 10:12:00', confidence: '82%', timeAgo: '8분 전', timestamp: new Date('2025-11-25 10:12:00').getTime(), type: 'trash' },
  { id: '2', cctvId: 'CCTV-009', location: '등산로 입구 5', time: '2025-11-25 10:07:00', confidence: '85%', timeAgo: '13분 전', timestamp: new Date('2025-11-25 10:07:00').getTime(), type: 'trash' },
  { id: '3', cctvId: 'CCTV-015', location: '전망대 2', time: '2025-11-25 09:55:00', confidence: '80%', timeAgo: '25분 전', timestamp: new Date('2025-11-25 09:55:00').getTime(), type: 'trash' },
  { id: '4', cctvId: 'CCTV-004', location: '등산로 4', time: '2025-11-25 09:40:00', confidence: '83%', timeAgo: '40분 전', timestamp: new Date('2025-11-25 09:40:00').getTime(), type: 'trash' },
  { id: '5', cctvId: 'CCTV-010', location: '휴게소 1', time: '2025-11-25 09:25:00', confidence: '81%', timeAgo: '55분 전', timestamp: new Date('2025-11-25 09:25:00').getTime(), type: 'trash' },
  { id: '6', cctvId: 'CCTV-006', location: '등산로 입구 2', time: '2025-11-25 09:10:00', confidence: '84%', timeAgo: '1시간 10분 전', timestamp: new Date('2025-11-25 09:10:00').getTime(), type: 'trash' },
  { id: '7', cctvId: 'CCTV-011', location: '휴게소 2', time: '2025-11-25 08:55:00', confidence: '79%', timeAgo: '1시간 25분 전', timestamp: new Date('2025-11-25 08:55:00').getTime(), type: 'trash' },
];

export const mockHelicopterLocations = [
  { id: 'H-001', x: 18, y: 22 },
  { id: 'H-002', x: 48, y: 18 },
  { id: 'H-003', x: 82, y: 25 },
  { id: 'H-004', x: 38, y: 72 },
  { id: 'H-005', x: 68, y: 75 },
];

// ==================== CCTV Video Clips ====================
export interface VideoClip {
  id: string;
  cctvId: string;
  timestamp: string;
  duration: number; // seconds
  type: 'fire' | 'emergency' | 'trash';
  thumbnailUrl?: string;
  videoUrl?: string;
  fileSize?: string;
  confidence: string;
}

// Mock video clips by CCTV ID
export const mockVideoClips: Record<string, VideoClip[]> = {
  'CCTV-001': [
    { id: 'video-001-1', cctvId: 'CCTV-001', timestamp: '2025-11-25 10:15:00', duration: 120, type: 'fire', confidence: '95%', fileSize: '24MB' },
    { id: 'video-001-2', cctvId: 'CCTV-001', timestamp: '2025-11-25 08:30:00', duration: 90, type: 'fire', confidence: '88%', fileSize: '18MB' },
  ],
  'CCTV-005': [
    { id: 'video-005-1', cctvId: 'CCTV-005', timestamp: '2025-11-25 10:05:00', duration: 150, type: 'emergency', confidence: '92%', fileSize: '30MB' },
    { id: 'video-005-2', cctvId: 'CCTV-005', timestamp: '2025-11-25 07:20:00', duration: 180, type: 'emergency', confidence: '85%', fileSize: '36MB' },
  ],
  'CCTV-003': [
    { id: 'video-003-1', cctvId: 'CCTV-003', timestamp: '2025-11-25 10:12:00', duration: 60, type: 'trash', confidence: '82%', fileSize: '12MB' },
    { id: 'video-003-2', cctvId: 'CCTV-003', timestamp: '2025-11-25 09:00:00', duration: 45, type: 'trash', confidence: '78%', fileSize: '9MB' },
    { id: 'video-003-3', cctvId: 'CCTV-003', timestamp: '2025-11-24 15:30:00', duration: 55, type: 'trash', confidence: '80%', fileSize: '11MB' },
  ],
  'CCTV-010': [
    { id: 'video-010-1', cctvId: 'CCTV-010', timestamp: '2025-11-25 09:25:00', duration: 75, type: 'trash', confidence: '81%', fileSize: '15MB' },
  ],
};

// Get video clips by CCTV ID
export const getVideoClipsByCCTV = (cctvId: string): VideoClip[] => {
  return mockVideoClips[cctvId] || [];
};

// ==================== Dashboard ====================
// Note: CCTV count and incident counts are dynamically calculated from common.ts

// Daily statistics interface
export interface DailyStats {
  currentCCTV: { on: number; total: number };
  fireDetections: number;
  emergencyDetections: number;
  trashDetections: number;
}

// Monthly data interface
export interface MonthlyData {
  year: number;
  month: number;
  monthLabel: string;
  쓰레기: number;
  화재: number;
  응급: number;
  기타: number;
  처리완료: number;
  미완료: number;
  cctvOn: number;
  cctvOff: number;
}

// Mock daily stats (will be replaced with real-time data from DB)
export const mockDailyStatsRaw: DailyStats = {
  currentCCTV: { on: 0, total: 0 }, // Will be calculated from cctvSummary
  fireDetections: 0,
  emergencyDetections: 0,
  trashDetections: 0,
};

// Mock monthly data (will be fetched from DB)
export const mockAllMonthlyData: MonthlyData[] = [
  { year: 2025, month: 8, monthLabel: '8월', 쓰레기: 10, 화재: 2, 응급: 3, 기타: 2, 처리완료: 15, 미완료: 2, cctvOn: 24, cctvOff: 1 },
  { year: 2025, month: 9, monthLabel: '9월', 쓰레기: 15, 화재: 3, 응급: 4, 기타: 2, 처리완료: 20, 미완료: 4, cctvOn: 24.5, cctvOff: 1.2 },
  { year: 2025, month: 10, monthLabel: '10월', 쓰레기: 18, 화재: 4, 응급: 5, 기타: 2, 처리완료: 25, 미완료: 4, cctvOn: 25, cctvOff: 1.3 },
  { year: 2025, month: 11, monthLabel: '11월', 쓰레기: 20, 화재: 4, 응급: 5, 기타: 2, 처리완료: 27, 미완료: 4, cctvOn: 25, cctvOff: 1.3 },
  { year: 2025, month: 12, monthLabel: '12월', 쓰레기: 25, 화재: 3, 응급: 4, 기타: 2, 처리완료: 30, 미완료: 4, cctvOn: 25, cctvOff: 1.3 },
];

// Average response time interface
export interface AvgResponseTime {
  type: string;
  time: number;
  change: number;
  isIncrease: boolean;
}

// Mock average response time (will be calculated from DB)
// change: 전월 대비 증감 퍼센트
// isIncrease: true=증가(빨간색), false=감소(파란색)
export const mockAvgResponseTime: AvgResponseTime[] = [
  { type: '응급', time: 21, change: -2, isIncrease: false },  // 감소 → 파란색
  { type: '화재', time: 19, change: -2, isIncrease: false },  // 감소 → 파란색
  { type: '쓰레기', time: 32, change: 2, isIncrease: true },  // 증가 → 빨간색
];

// ==================== EmergencyDashboard ====================
export interface EmergencyItem {
  id: number;
  accidentCode: string;
  type: string;
  cctvId: string;
  time: string;
  status: string;
  severity: string;
  handler: string;
  location: string;
  detectionBasis: string;
  patientName?: string;
  gender?: string;
  responseTime?: string;
  duration?: string;
}

export const mockInitialActiveEmergencies: EmergencyItem[] = [
  { id: 1, accidentCode: 'EMG-001', type: '응급환자', cctvId: 'CCTV-005', time: '2025-11-25 10:05', status: '대응중', severity: 'high', handler: '119', location: '공원중앙', detectionBasis: 'AI 자동 탐지: 쓰러진 사람 감지', patientName: '미상', gender: '미상' },
];

export const mockCompletedEmergencies: EmergencyItem[] = [
  { id: 4, accidentCode: 'EMG-004', type: '부상', cctvId: 'CCTV-002', time: '2025-11-25 13:30', responseTime: '2025-11-25 13:42', duration: '12분', status: '처리완료', severity: 'medium', handler: '직원 박영희', location: '등산로 2', detectionBasis: 'AI 자동 탐지: 부상자 감지', patientName: '미상', gender: '미상' },
  { id: 5, accidentCode: 'EMG-005', type: '심정지', cctvId: 'CCTV-001', time: '2025-11-25 12:30', responseTime: '2025-11-25 12:35', duration: '5분', status: '처리완료', severity: 'high', handler: '119', location: '등산로 1', detectionBasis: 'AI 자동 탐지: 심정지 의심 감지', patientName: '미상', gender: '미상' },
  { id: 6, accidentCode: 'EMG-006', type: '낙상사고', cctvId: 'CCTV-004', time: '2025-11-25 11:30', responseTime: '2025-11-25 11:48', duration: '18분', status: '처리완료', severity: 'low', handler: '직원 이준호', location: '휴게소 1', detectionBasis: 'AI 자동 탐지: 낙상 동작 감지', patientName: '미상', gender: '미상' },
];

// ==================== FireDashboard ====================
export interface FireItem {
  id: number;
  accidentCode: string;
  cctvId: string;
  time: string;
  status: string;
  severity: string;
  windSpeed: string;
  handler: string;
  location: string;
  detectionBasis: string;
  responseTime?: string;
  duration?: string;
}

export const mockInitialActiveFires: FireItem[] = [
  { id: 1, accidentCode: 'FIRE-001', cctvId: 'CCTV-001', time: '2025-11-25 10:15', status: '진화중', severity: 'high', windSpeed: '15km/h', handler: '119', location: '등산로 1', detectionBasis: 'AI 자동 탐지: 연기 및 화염 감지' },
  { id: 2, accidentCode: 'FIRE-002', cctvId: 'CCTV-007', time: '2025-11-25 10:00', status: '대기중', severity: 'medium', windSpeed: '12km/h', handler: '119', location: '등산로 2', detectionBasis: 'AI 자동 탐지: 연기 감지' },
];

export const mockCompletedFires: FireItem[] = [
  { id: 3, accidentCode: 'FIRE-003', cctvId: 'CCTV-007', time: '2025-11-25 12:00', responseTime: '2025-11-25 12:45', duration: '45분', status: '진화완료', severity: 'low', windSpeed: '8km/h', handler: '산불 관리 직원', location: '전망대 1', detectionBasis: 'AI 자동 탐지: 화염 감지' },
  { id: 4, accidentCode: 'FIRE-004', cctvId: 'CCTV-005', time: '2025-11-25 09:00', responseTime: '2025-11-25 10:10', duration: '70분', status: '진화완료', severity: 'medium', windSpeed: '10km/h', handler: '119', location: '등산로 입구 1', detectionBasis: 'AI 자동 탐지: 연기 및 화염 감지' },
];

// ==================== TrashDashboard ====================
export interface TrashItem {
  id: number;
  accidentCode: string;
  cctvId: string;
  time: string;
  status: string;
  severity: string;
  type: string;
  handler: string;
  location: string;
  detectionBasis: string;
  responseTime?: string;
  duration?: string;
}

export const mockInitialActiveTrashIncidents: TrashItem[] = [
  { id: 1, accidentCode: 'TRASH-001', cctvId: 'CCTV-003', time: '2025-11-25 10:12', status: '대기중', severity: 'high', type: '일반쓰레기', handler: '환경 관리 직원', location: '등산로 3', detectionBasis: 'AI 자동 탐지: 쓰레기 투기 행위 감지' },
  { id: 2, accidentCode: 'TRASH-002', cctvId: 'CCTV-009', time: '2025-11-25 10:07', status: '대응중', severity: 'medium', type: '플라스틱', handler: '환경 관리 직원', location: '등산로 1', detectionBasis: 'AI 자동 탐지: 플라스틱 쓰레기 투기 감지' },
  { id: 3, accidentCode: 'TRASH-003', cctvId: 'CCTV-015', time: '2025-11-25 09:55', status: '대기중', severity: 'medium', type: '일반쓰레기', handler: '환경 관리 직원', location: '등산로 2', detectionBasis: 'AI 자동 탐지: 쓰레기 투기 행위 감지' },
  { id: 4, accidentCode: 'TRASH-004', cctvId: 'CCTV-004', time: '2025-11-25 09:40', status: '대기중', severity: 'low', type: '음식물', handler: '환경 관리 직원', location: '공원중앙', detectionBasis: 'AI 자동 탐지: 음식물 쓰레기 투기 감지' },
  { id: 5, accidentCode: 'TRASH-005', cctvId: 'CCTV-010', time: '2025-11-25 09:25', status: '대응중', severity: 'medium', type: '대형쓰레기', handler: '환경 관리 직원', location: '공원중앙', detectionBasis: 'AI 자동 탐지: 대형 쓰레기 투기 감지' },
  { id: 6, accidentCode: 'TRASH-006', cctvId: 'CCTV-006', time: '2025-11-25 09:10', status: '대기중', severity: 'high', type: '플라스틱', handler: '환경 관리 직원', location: '등산로 2', detectionBasis: 'AI 자동 탐지: 플라스틱 쓰레기 투기 감지' },
  { id: 7, accidentCode: 'TRASH-007', cctvId: 'CCTV-011', time: '2025-11-25 08:55', status: '대기중', severity: 'medium', type: '일반쓰레기', handler: '환경 관리 직원', location: '등산로 2', detectionBasis: 'AI 자동 탐지: 쓰레기 투기 행위 감지' },
];

export const mockCompletedTrashIncidents: TrashItem[] = [
  { id: 4, accidentCode: 'TRASH-004', cctvId: 'CCTV-002', time: '2025-11-25 13:00', responseTime: '2025-11-25 13:28', duration: '28분', status: '처리완료', severity: 'low', type: '음식물', handler: '환경 관리 직원', location: '등산로 2', detectionBasis: 'AI 자동 탐지: 음식물 쓰레기 투기 감지' },
  { id: 5, accidentCode: 'TRASH-005', cctvId: 'CCTV-004', time: '2025-11-25 12:00', responseTime: '2025-11-25 12:35', duration: '35분', status: '처리완료', severity: 'medium', type: '플라스틱', handler: '환경 관리 직원', location: '휴게소 1', detectionBasis: 'AI 자동 탐지: 플라스틱 쓰레기 투기 감지' },
  { id: 6, accidentCode: 'TRASH-006', cctvId: 'CCTV-003', time: '2025-11-25 11:00', responseTime: '2025-11-25 11:30', duration: '30분', status: '처리완료', severity: 'low', type: '일반쓰레기', handler: '환경 관리 직원', location: '등산로 3', detectionBasis: 'AI 자동 탐지: 쓰레기 투기 행위 감지' },
  { id: 19, accidentCode: 'TRASH-019', cctvId: 'CCTV-020', time: '2025-11-25 10:45', responseTime: '2025-11-25 11:10', duration: '25분', status: '처리완료', severity: 'medium', type: '대형쓰레기', handler: '환경 관리 직원', location: '등산로 8', detectionBasis: 'AI 자동 탐지: 대형 쓰레기 투기 감지' },
  { id: 20, accidentCode: 'TRASH-020', cctvId: 'CCTV-021', time: '2025-11-25 10:30', responseTime: '2025-11-25 10:55', duration: '25분', status: '처리완료', severity: 'high', type: '플라스틱', handler: '환경 관리 직원', location: '전망대 5', detectionBasis: 'AI 자동 탐지: 플라스틱 쓰레기 투기 감지' },
  { id: 21, accidentCode: 'TRASH-021', cctvId: 'CCTV-022', time: '2025-11-25 10:15', responseTime: '2025-11-25 10:40', duration: '25분', status: '처리완료', severity: 'low', type: '음식물', handler: '환경 관리 직원', location: '휴게소 5', detectionBasis: 'AI 자동 탐지: 음식물 쓰레기 투기 감지' },
  { id: 22, accidentCode: 'TRASH-022', cctvId: 'CCTV-023', time: '2025-11-25 10:00', responseTime: '2025-11-25 10:25', duration: '25분', status: '처리완료', severity: 'medium', type: '일반쓰레기', handler: '환경 관리 직원', location: '등산로 9', detectionBasis: 'AI 자동 탐지: 쓰레기 투기 행위 감지' },
  { id: 23, accidentCode: 'TRASH-023', cctvId: 'CCTV-024', time: '2025-11-25 09:45', responseTime: '2025-11-25 10:10', duration: '25분', status: '처리완료', severity: 'high', type: '대형쓰레기', handler: '환경 관리 직원', location: '등산로 10', detectionBasis: 'AI 자동 탐지: 대형 쓰레기 투기 감지' },
  { id: 24, accidentCode: 'TRASH-024', cctvId: 'CCTV-025', time: '2025-11-25 09:30', responseTime: '2025-11-25 09:55', duration: '25분', status: '처리완료', severity: 'medium', type: '플라스틱', handler: '환경 관리 직원', location: '전망대 6', detectionBasis: 'AI 자동 탐지: 플라스틱 쓰레기 투기 감지' },
  { id: 25, accidentCode: 'TRASH-025', cctvId: 'CCTV-026', time: '2025-11-25 09:15', responseTime: '2025-11-25 09:40', duration: '25분', status: '처리완료', severity: 'low', type: '음식물', handler: '환경 관리 직원', location: '휴게소 6', detectionBasis: 'AI 자동 탐지: 음식물 쓰레기 투기 감지' },
  { id: 26, accidentCode: 'TRASH-026', cctvId: 'CCTV-027', time: '2025-11-25 09:00', responseTime: '2025-11-25 09:25', duration: '25분', status: '처리완료', severity: 'medium', type: '일반쓰레기', handler: '환경 관리 직원', location: '등산로 11', detectionBasis: 'AI 자동 탐지: 쓰레기 투기 행위 감지' },
  { id: 27, accidentCode: 'TRASH-027', cctvId: 'CCTV-028', time: '2025-11-25 08:45', responseTime: '2025-11-25 09:10', duration: '25분', status: '처리완료', severity: 'high', type: '대형쓰레기', handler: '환경 관리 직원', location: '등산로 12', detectionBasis: 'AI 자동 탐지: 대형 쓰레기 투기 감지' },
  { id: 28, accidentCode: 'TRASH-028', cctvId: 'CCTV-029', time: '2025-11-25 08:30', responseTime: '2025-11-25 08:55', duration: '25분', status: '처리완료', severity: 'medium', type: '플라스틱', handler: '환경 관리 직원', location: '전망대 7', detectionBasis: 'AI 자동 탐지: 플라스틱 쓰레기 투기 감지' },
  { id: 29, accidentCode: 'TRASH-029', cctvId: 'CCTV-030', time: '2025-11-25 08:15', responseTime: '2025-11-25 08:40', duration: '25분', status: '처리완료', severity: 'low', type: '음식물', handler: '환경 관리 직원', location: '휴게소 7', detectionBasis: 'AI 자동 탐지: 음식물 쓰레기 투기 감지' },
  { id: 30, accidentCode: 'TRASH-030', cctvId: 'CCTV-031', time: '2025-11-25 08:00', responseTime: '2025-11-25 08:25', duration: '25분', status: '처리완료', severity: 'medium', type: '일반쓰레기', handler: '환경 관리 직원', location: '등산로 13', detectionBasis: 'AI 자동 탐지: 쓰레기 투기 행위 감지' },
  { id: 31, accidentCode: 'TRASH-031', cctvId: 'CCTV-032', time: '2025-11-25 07:45', responseTime: '2025-11-25 08:10', duration: '25분', status: '처리완료', severity: 'high', type: '대형쓰레기', handler: '환경 관리 직원', location: '등산로 14', detectionBasis: 'AI 자동 탐지: 대형 쓰레기 투기 감지' },
  { id: 32, accidentCode: 'TRASH-032', cctvId: 'CCTV-033', time: '2025-11-25 07:30', responseTime: '2025-11-25 07:55', duration: '25분', status: '처리완료', severity: 'medium', type: '플라스틱', handler: '환경 관리 직원', location: '전망대 8', detectionBasis: 'AI 자동 탐지: 플라스틱 쓰레기 투기 감지' },
  { id: 33, accidentCode: 'TRASH-033', cctvId: 'CCTV-034', time: '2025-11-25 07:15', responseTime: '2025-11-25 07:40', duration: '25분', status: '처리완료', severity: 'low', type: '음식물', handler: '환경 관리 직원', location: '휴게소 8', detectionBasis: 'AI 자동 탐지: 음식물 쓰레기 투기 감지' },
];

// ==================== RockfallDashboard ====================
export interface RockfallItem {
  id: number;
  cctvId: string;
  time: string;
  status: string;
  severity: string;
  magnitude: string;
  handler: string;
  responseTime?: string;
  duration?: string;
}

export const mockActiveRockfalls: RockfallItem[] = [
  { id: 1, cctvId: 'CCTV-003', time: '2025-11-25 14:00', status: '대응중', severity: 'high', magnitude: '3.2', handler: '산림 관리 직원' },
  { id: 2, cctvId: 'CCTV-007', time: '2025-11-25 13:40', status: '대기중', severity: 'medium', magnitude: '2.9', handler: '산림 관리 직원' },
];

export const mockCompletedRockfalls: RockfallItem[] = [
  { id: 3, cctvId: 'CCTV-002', time: '2025-11-25 13:00', responseTime: '2025-11-25 13:15', duration: '15분', status: '처리완료', severity: 'low', magnitude: '1.8', handler: '산림 관리 직원' },
  { id: 4, cctvId: 'CCTV-004', time: '2025-11-25 11:30', responseTime: '2025-11-25 11:55', duration: '25분', status: '처리완료', severity: 'medium', magnitude: '2.1', handler: '산림 관리 직원' },
  { id: 5, cctvId: 'CCTV-005', time: '2025-11-25 09:30', responseTime: '2025-11-25 09:50', duration: '20분', status: '처리완료', severity: 'low', magnitude: '1.5', handler: '산림 관리 직원' },
];

// ==================== MonthlyReport ====================
export interface MajorIncident {
  id: number;
  date: string;
  type: string;
  location: string;
  severity: string;
  status: string;
  responseTime: string;
}

export const mockMonthlyStats = {
  fire: { total: 12, resolved: 11, pending: 1, avgResponseTime: '4.2분' },
  trash: { total: 156, resolved: 142, pending: 14, avgResponseTime: '12.5분' },
  cctv: { total: 100, operational: 95, maintenance: 5 },
  emergency: { total: 7, resolved: 7, pending: 0, avgResponseTime: '3.1분' }
};

export const mockMajorIncidents: MajorIncident[] = [
  { id: 1, date: '2025-11-03', type: '화재', location: '등산로 2', severity: '상', status: '완료', responseTime: '3.5분' },
  { id: 2, date: '2025-11-15', type: '화재', location: '공원중앙', severity: '상', status: '완료', responseTime: '4.8분' },
];

// ==================== CCTVManagement ====================
// CCTV location and status helpers have been moved to src/services/common.ts
// Use getCCTVLocation, getOffCCTVIds from common.ts instead
