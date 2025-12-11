// Common CCTV data - Single Source of Truth
// Backend structure aligned with CCTVResponse.java

// ==================== CCTV Data Structures ====================
export interface CCTVMarker {
  id: number;
  cctvCode: string;
  name: string;
  locationDesc: string;
  cctvAddress?: string;
  installDate: string;
  modelName: string;
  resolution: string;
  isActive: boolean;
  powerStatus: "on" | "off";
  healthStatus?: string;
  lastHeartbeat?: string;
  longitude: number;
  latitude: number;
  incidentCount?: number;
  lastIncidentTime?: string;
  lastIncidentType?: string;
}

// ==================== CCTV List (Single Source) ====================
// This is the authoritative list of all CCTVs in the system
// Initially empty - will be populated by getCCTVList() API call
export let cctvList: CCTVMarker[] = [];

// ==================== Helper Functions ====================
/**
 * Update the CCTV list (called after API fetch)
 */
export const updateCCTVList = (newList: CCTVMarker[]): void => {
  cctvList = newList;
};

/**
 * Get CCTV summary statistics
 */
export const cctvSummary = (): { total: number; on: number; off: number } => {
  return {
    total: cctvList.length,
    on: onCCTVs().length,
    off: offCCTVs().length,
  };
};

/**
 * Get all active (power on) CCTVs
 */
export const onCCTVs = (): CCTVMarker[] => {
  return cctvList.filter(cctv => cctv.powerStatus === 'on');
};

/**
 * Get all inactive (power off) CCTVs
 */
export const offCCTVs = (): CCTVMarker[] => {
  return cctvList.filter(cctv => cctv.powerStatus === 'off');
};

/**
 * Get CCTV by ID
 */
export const getCCTVById = (id: number): CCTVMarker | undefined => {
  return cctvList.find(cctv => cctv.id === id);
};

/**
 * Get CCTV by code (e.g., 'CCTV-001')
 */
export const getCCTVByCode = (code: string): CCTVMarker | undefined => {
  return cctvList.find(cctv => cctv.cctvCode === code);
};

/**
 * Get CCTVs with incidents
 */
export const getCCTVsWithIncidents = (): CCTVMarker[] => {
  return cctvList.filter(cctv => (cctv.incidentCount || 0) > 0);
};

/**
 * Get CCTV location helper (for backward compatibility)
 */
export const getCCTVLocation = (codeOrId: string | number): string => {
  const cctv = typeof codeOrId === 'string' 
    ? getCCTVByCode(codeOrId)
    : getCCTVById(codeOrId);
  
  if (cctv) return cctv.locationDesc;
  
  // Fallback for old string-based IDs
  if (typeof codeOrId === 'string') {
    const idNum = parseInt(codeOrId.split('-')[1]);
    if (idNum <= 20) return `등산로 ${idNum}`;
    if (idNum <= 40) return `등산로 입구 ${idNum - 20}`;
    if (idNum <= 60) return `휴게소 ${idNum - 40}`;
    if (idNum <= 80) return `전망대 ${idNum - 60}`;
    return `주차장 ${idNum - 80}`;
  }
  
  return '알 수 없음';
};

/**
 * Get list of OFF CCTV IDs
 */
export const getOffCCTVIds = (): number[] => {
  return offCCTVs().map(cctv => cctv.id);
};

/**
 * Get list of OFF CCTV codes
 */
export const getOffCCTVCodes = (): string[] => {
  return offCCTVs().map(cctv => cctv.cctvCode);
};

// ==================== Incidents Summary ====================
/**
 * Calculate incidents summary from CCTV list
 */
export const incidentsSummary = (): { fire: number; emergency: number; trash: number; total: number } => {
  // Calculate total incidents by type from cctvList
  const fire = cctvList.reduce((sum, cctv) => {
    if (cctv.lastIncidentType === 'fire') return sum + (cctv.incidentCount || 0);
    return sum;
  }, 0);
  
  const emergency = cctvList.reduce((sum, cctv) => {
    if (cctv.lastIncidentType === 'emergency') return sum + (cctv.incidentCount || 0);
    return sum;
  }, 0);
  
  const trash = cctvList.reduce((sum, cctv) => {
    if (cctv.lastIncidentType === 'trash') return sum + (cctv.incidentCount || 0);
    return sum;
  }, 0);
  
  return {
    fire,
    emergency,
    trash,
    total: fire + emergency + trash,
  };
};

// ==================== Accident Hotspot Data ====================
// 사고다발구간 - 각 사고 유형별로 가장 많이 발생한 CCTV 위치
export interface HotspotLocation {
  cctvId: string;
  x: number;
  y: number;
  location: string;
  count: number; // 해당 월 동안 발생한 사고 건수
  type?: 'fire' | 'emergency' | 'trash';
}

// 화재 사고다발구간 (더미데이터 - 나중에 백엔드에서 계산)
export const fireHotspots: HotspotLocation[] = [
  { cctvId: 'CCTV-001', x: 25, y: 25, location: '등산로 1', count: 5, type: 'fire' },
];

// 응급 사고다발구간 (더미데이터 - 나중에 백엔드에서 계산)
export const emergencyHotspots: HotspotLocation[] = [
  { cctvId: 'CCTV-005', x: 45, y: 42, location: '등산로 입구 1', count: 3, type: 'emergency' },
];

// 쓰레기 사고다발구간 (더미데이터 - 나중에 백엔드에서 계산)
export const trashHotspots: HotspotLocation[] = [
  { cctvId: 'CCTV-010', x: 55, y: 50, location: '휴게소 1', count: 12, type: 'trash' },
];

// Get hotspots by type
export const getHotspotsByType = (type: 'fire' | 'emergency' | 'trash'): HotspotLocation[] => {
  switch (type) {
    case 'fire':
      return fireHotspots;
    case 'emergency':
      return emergencyHotspots;
    case 'trash':
      return trashHotspots;
    default:
      return [];
  }
};

// Get all hotspots
export const getAllHotspots = (): HotspotLocation[] => {
  return [...fireHotspots, ...emergencyHotspots, ...trashHotspots];
};
