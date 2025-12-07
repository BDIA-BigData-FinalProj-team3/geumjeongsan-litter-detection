// API service layer
// This file provides functions that return mock data
// Later, these functions can be replaced with actual backend API calls

import {
  mockFireNotifications,
  mockEmergencyNotifications,
  mockTrashNotifications,
  mockHelicopterLocations,
  mockDailyStatsRaw,
  mockAllMonthlyData,
  mockAvgResponseTime,
  mockInitialActiveEmergencies,
  mockCompletedEmergencies,
  mockInitialActiveFires,
  mockCompletedFires,
  mockInitialActiveTrashIncidents,
  mockCompletedTrashIncidents,
  mockActiveRockfalls,
  mockCompletedRockfalls,
  mockMonthlyStats,
  mockMajorIncidents,
  getVideoClipsByCCTV,
  type NotificationItem,
  type VideoClip,
  type DailyStats,
  type MonthlyData,
  type AvgResponseTime,
  type EmergencyItem,
  type FireItem,
  type TrashItem,
  type RockfallItem,
  type MajorIncident,
} from './mock';

// Import CCTV data from common.ts (Single Source of Truth)
import {
  cctvList,
  onCCTVs,
  offCCTVs,
  cctvSummary,
  incidentsSummary,
  getCCTVLocation,
  getOffCCTVIds,
  getOffCCTVCodes,
  getCCTVById,
  getCCTVByCode,
  getCCTVsWithIncidents,
  updateCCTVList,
  fireHotspots,
  emergencyHotspots,
  trashHotspots,
  getHotspotsByType,
  getAllHotspots,
  type CCTVMarker,
  type HotspotLocation,
} from './common';

// ==================== CCTV API ====================
/**
 * Get all CCTV list from backend
 * This is the primary CCTV data source
 * 
 * Backend integration:
 * - Fetch from GET /api/cctv/list
 * - Returns array of CCTVResponse objects
 * - Updates common.ts cctvList after fetch
 * 
 * @returns Array of CCTV markers
 */
export const getCCTVList = async (): Promise<CCTVMarker[]> => {
  try {
    // 1. Attempt to fetch from real Backend API
    const response = await fetch(`${API_BASE_URL}/map/cctvs`);
    
    if (response.ok) {
      const data = await response.json();
      
      // Transform Backend Data (MapCCTV) -> Frontend Model (CCTVMarker)
      const realData: CCTVMarker[] = data.map((item: any) => {
        // Handle Geometry parsing (supports GeoJSON or simple x/y object)
        let lng = 129.0; // Default fallback
        let lat = 35.0;
        
        if (item.geom) {
          if (Array.isArray(item.geom.coordinates)) {
            lng = item.geom.coordinates[0];
            lat = item.geom.coordinates[1];
          } else if (typeof item.geom.x === 'number') {
            lng = item.geom.x;
            lat = item.geom.y;
          }
        }

        return {
          id: item.cctvId,
          cctvCode: item.cctvCode,
          name: item.cctvAddress || item.cctvCode,
          locationDesc: item.cctvAddress || '',
          
          // Fields not in View (Use defaults)
          installDate: '2024-01-15', 
          resolution: '1920x1080', 
          isActive: true, // Filtered by WHERE is_active=TRUE in View
          
          powerStatus: (item.powerStatus || 'off').toLowerCase() === 'on' ? 'on' : 'off',
          longitude: lng,
          latitude: lat,
          
          incidentCount: 0, // Will be updated by incidents API separately
          lastIncidentTime: item.lastIncidentAt,
          lastIncidentType: item.lastIncidentType
        };
      });

      console.log('✅ Loaded CCTV list from Backend:', realData.length);
      updateCCTVList(realData);
      return realData;
    }
  } catch (error) {
    console.warn('⚠️ Failed to fetch from Backend, using Mock Data:', error);
  }

  // 2. Fallback to Mock Data (if backend is offline or fails)
  const mockData: CCTVMarker[] = [
    { id: 1, cctvCode: 'CCTV-001', name: '등산로 1 CCTV', locationDesc: '등산로 1', installDate: '2024-01-15', modelName: 'HD-1080P', resolution: '1920x1080', isActive: true, powerStatus: 'on', longitude: 127.5, latitude: 37.5, incidentCount: 1, lastIncidentTime: '2025-11-25 10:15:00', lastIncidentType: 'fire' },
    { id: 2, cctvCode: 'CCTV-002', name: '등산로 2 CCTV', locationDesc: '등산로 2', installDate: '2024-01-15', modelName: 'HD-1080P', resolution: '1920x1080', isActive: true, powerStatus: 'on', longitude: 127.6, latitude: 37.6 },
    { id: 3, cctvCode: 'CCTV-003', name: '등산로 3 CCTV', locationDesc: '등산로 3', installDate: '2024-01-15', modelName: 'HD-1080P', resolution: '1920x1080', isActive: true, powerStatus: 'on', longitude: 127.4, latitude: 37.4, incidentCount: 1, lastIncidentTime: '2025-11-25 10:12:00', lastIncidentType: 'trash' },
    { id: 4, cctvCode: 'CCTV-004', name: '등산로 4 CCTV', locationDesc: '등산로 4', installDate: '2024-01-15', modelName: 'HD-1080P', resolution: '1920x1080', isActive: true, powerStatus: 'on', longitude: 127.55, latitude: 37.55, incidentCount: 1, lastIncidentTime: '2025-11-25 09:40:00', lastIncidentType: 'trash' },
    { id: 5, cctvCode: 'CCTV-005', name: '등산로 입구 1 CCTV', locationDesc: '등산로 입구 1', installDate: '2024-01-15', modelName: 'HD-1080P', resolution: '1920x1080', isActive: true, powerStatus: 'on', longitude: 127.52, latitude: 37.52, incidentCount: 1, lastIncidentTime: '2025-11-25 10:05:00', lastIncidentType: 'emergency' },
    { id: 6, cctvCode: 'CCTV-006', name: '등산로 입구 2 CCTV', locationDesc: '등산로 입구 2', installDate: '2024-01-15', modelName: 'HD-1080P', resolution: '1920x1080', isActive: true, powerStatus: 'on', longitude: 127.58, latitude: 37.58, incidentCount: 1, lastIncidentTime: '2025-11-25 09:10:00', lastIncidentType: 'trash' },
    { id: 7, cctvCode: 'CCTV-007', name: '등산로 입구 3 CCTV', locationDesc: '등산로 입구 3', installDate: '2024-01-15', modelName: 'HD-1080P', resolution: '1920x1080', isActive: true, powerStatus: 'on', longitude: 127.62, latitude: 37.62, incidentCount: 1, lastIncidentTime: '2025-11-25 10:00:00', lastIncidentType: 'fire' },
    { id: 8, cctvCode: 'CCTV-008', name: '등산로 입구 4 CCTV', locationDesc: '등산로 입구 4', installDate: '2024-01-15', modelName: 'HD-1080P', resolution: '1920x1080', isActive: false, powerStatus: 'off', longitude: 127.45, latitude: 37.45 },
    { id: 9, cctvCode: 'CCTV-009', name: '등산로 입구 5 CCTV', locationDesc: '등산로 입구 5', installDate: '2024-01-15', modelName: 'HD-1080P', resolution: '1920x1080', isActive: true, powerStatus: 'on', longitude: 127.48, latitude: 37.48, incidentCount: 1, lastIncidentTime: '2025-11-25 10:07:00', lastIncidentType: 'trash' },
    { id: 10, cctvCode: 'CCTV-010', name: '휴게소 1 CCTV', locationDesc: '휴게소 1', installDate: '2024-01-15', modelName: 'HD-1080P', resolution: '1920x1080', isActive: true, powerStatus: 'on', longitude: 127.56, latitude: 37.56, incidentCount: 1, lastIncidentTime: '2025-11-25 09:25:00', lastIncidentType: 'trash' },
    { id: 11, cctvCode: 'CCTV-011', name: '휴게소 2 CCTV', locationDesc: '휴게소 2', installDate: '2024-01-15', modelName: 'HD-1080P', resolution: '1920x1080', isActive: true, powerStatus: 'on', longitude: 127.65, latitude: 37.65, incidentCount: 1, lastIncidentTime: '2025-11-25 08:55:00', lastIncidentType: 'trash' },
    { id: 12, cctvCode: 'CCTV-012', name: '휴게소 3 CCTV', locationDesc: '휴게소 3', installDate: '2024-01-15', modelName: 'HD-1080P', resolution: '1920x1080', isActive: true, powerStatus: 'on', longitude: 127.68, latitude: 37.68 },
    { id: 13, cctvCode: 'CCTV-013', name: '휴게소 4 CCTV', locationDesc: '휴게소 4', installDate: '2024-01-15', modelName: 'HD-1080P', resolution: '1920x1080', isActive: false, powerStatus: 'off', longitude: 127.5, latitude: 37.5 },
    { id: 14, cctvCode: 'CCTV-014', name: '전망대 1 CCTV', locationDesc: '전망대 1', installDate: '2024-01-15', modelName: 'HD-1080P', resolution: '1920x1080', isActive: true, powerStatus: 'on', longitude: 127.55, latitude: 37.55 },
    { id: 15, cctvCode: 'CCTV-015', name: '전망대 2 CCTV', locationDesc: '전망대 2', installDate: '2024-01-15', modelName: 'HD-1080P', resolution: '1920x1080', isActive: true, powerStatus: 'on', longitude: 127.7, latitude: 37.7, incidentCount: 1, lastIncidentTime: '2025-11-25 09:55:00', lastIncidentType: 'trash' },
    { id: 16, cctvCode: 'CCTV-016', name: '전망대 3 CCTV', locationDesc: '전망대 3', installDate: '2024-01-15', modelName: 'HD-1080P', resolution: '1920x1080', isActive: true, powerStatus: 'on', longitude: 127.45, latitude: 37.45 },
  ];
  
  updateCCTVList(mockData);
  return Promise.resolve(mockData);
};

/**
 * Get active incidents (PENDING, IN_PROGRESS) for map display
 */
export const getActiveIncidents = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/map/active-incidents`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Loaded Active Incidents from Backend:', data.length);
      return data;
    }
  } catch (error) {
    console.warn('⚠️ Failed to fetch active incidents:', error);
  }
  return [];
};

/**
 * Get all CCTV markers with location and status (for map display)
 * This converts backend CCTVResponse to map-compatible format
 * 
 * Backend integration:
 * - Uses getCCTVList() internally
 * - Converts longitude/latitude to x/y percentages for map
 * 
 * @returns Array of CCTV markers in map format
 */
export const getCCTVMarkers = async (): Promise<CCTVMarker[]> => {
  const list = await getCCTVList();
  return Promise.resolve(list);
};

/**
 * Get incidents for a specific CCTV
 * 
 * Backend integration:
 * - Fetch from GET /api/cctv/{id}/incidents
 * - Returns list of incidents detected by this CCTV
 * 
 * @param id - CCTV ID (number)
 * @returns Array of incident objects
 */
export const getCCTVIncidents = async (id: number): Promise<any[]> => {
  // TODO: Replace with actual API call
  // const response = await fetch(`/api/cctv/${id}/incidents`);
  // return await response.json();
  
  // Mock data for development
  return Promise.resolve([]);
};

/**
 * Get media files (videos/images) for a specific CCTV
 * 
 * Backend integration:
 * - Fetch from GET /api/cctv/{id}/media?fileType={fileType}
 * - fileType: 'video' | 'image' | 'all'
 * - Returns list of media files with URLs
 * 
 * @param id - CCTV ID (number)
 * @param fileType - Type of media to fetch ('video' | 'image' | 'all')
 * @returns Array of media objects with { id, url, timestamp, type, ... }
 */
export interface CCTVMedia {
  id: string;
  url: string;
  timestamp: string;
  type: 'video' | 'image';
  duration?: number; // seconds (for videos)
  fileSize?: string;
  thumbnailUrl?: string;
}

export const getCCTVMedia = async (id: number, fileType: 'video' | 'image' | 'all' = 'all'): Promise<CCTVMedia[]> => {
  // TODO: Replace with actual API call
  // const response = await fetch(`/api/cctv/${id}/media?fileType=${fileType}`);
  // return await response.json();
  
  // Mock data for development
  const mockMedia: CCTVMedia[] = [
    { id: 'media-1', url: '#', timestamp: '2025-11-25 10:15:00', type: 'video', duration: 120, fileSize: '24MB', thumbnailUrl: '#' },
    { id: 'media-2', url: '#', timestamp: '2025-11-25 08:30:00', type: 'video', duration: 90, fileSize: '18MB', thumbnailUrl: '#' },
  ];
  
  if (fileType === 'all') {
    return Promise.resolve(mockMedia);
  }
  
  return Promise.resolve(mockMedia.filter(m => m.type === fileType));
};

/**
 * Get fire detection notifications
 * 
 * Backend integration:
 * - Fetch from /api/notifications/fire
 * - Real-time AI detection events
 * - Include confidence scores and timestamps
 */
export const getFireNotifications = async (): Promise<NotificationItem[]> => {
  // TODO: Replace with actual API call
  // return fetch('/api/notifications/fire').then(res => res.json());
  return Promise.resolve(mockFireNotifications);
};

/**
 * Get emergency detection notifications
 * 
 * Backend integration:
 * - Fetch from /api/notifications/emergency
 * - Detect fallen persons, medical emergencies
 */
export const getEmergencyNotifications = async (): Promise<NotificationItem[]> => {
  // TODO: Replace with actual API call
  // return fetch('/api/notifications/emergency').then(res => res.json());
  return Promise.resolve(mockEmergencyNotifications);
};

/**
 * Get trash dumping notifications
 * 
 * Backend integration:
 * - Fetch from /api/notifications/trash
 * - AI-detected illegal dumping events
 */
export const getTrashNotifications = async (): Promise<NotificationItem[]> => {
  // TODO: Replace with actual API call
  // return fetch('/api/notifications/trash').then(res => res.json());
  return Promise.resolve(mockTrashNotifications);
};

/**
 * Get helicopter locations
 * 
 * Backend integration:
 * - Fetch from /api/helicopters/locations
 * - Real-time GPS coordinates
 */
export const getHelicopterLocations = async () => {
  // TODO: Replace with actual API call
  // return fetch('/api/helicopters/locations').then(res => res.json());
  return Promise.resolve(mockHelicopterLocations);
};

// ==================== Dashboard API ====================
/**
 * Get daily statistics for KPI cards
 * Returns real-time CCTV status and incident counts
 * 
 * Backend integration:
 * - Fetch from /api/dashboard/daily-stats
 * - Include current CCTV on/off status
 * - Include today's incident counts by type
 */
export const getDailyStats = async () => {
  // TODO: Replace with actual API call
  // return fetch('/api/dashboard/daily-stats').then(res => res.json());
  
  // Ensure CCTV list is loaded first
  await getCCTVList();
  
  // Calculate from current data
  const summary = cctvSummary();
  const incidents = incidentsSummary();
  
  const stats = [
    { 
      label: '현재 총 가동 cctv', 
      value: `${summary.on}/${summary.total}` 
    },
    { 
      label: '화재 사고', 
      value: `${incidents.fire}건` 
    },
    { 
      label: '응급 사고', 
      value: `${incidents.emergency}건` 
    },
    { 
      label: '쓰레기 사건', 
      value: `${incidents.trash}건` 
    },
  ];
  
  return Promise.resolve(stats);
};

/**
 * Get monthly data for charts
 * Returns historical data by month
 * 
 * Backend integration:
 * - Fetch from /api/dashboard/monthly-data?start=YYYY-MM&end=YYYY-MM
 * - Group incidents by month
 * - Calculate completion rates
 * - Track CCTV operational status over time
 * - cctvOn/cctvOff: 월 평균 대수 (소수점 가능)
 * 
 * Response format:
 * [
 *   { year: 2025, month: 12, monthLabel: '12월', 
 *     쓰레기: 25, 화재: 3, 응급: 4, 기타: 2,
 *     처리완료: 30, 미완료: 4,
 *     cctvOn: 25, cctvOff: 1.3 }
 * ]
 */
export const getAllMonthlyData = async () => {
  // TODO: Replace with actual API call
  // return fetch('/api/dashboard/monthly-data').then(res => res.json());
  return Promise.resolve(mockAllMonthlyData);
};

/**
 * Get average response time by incident type
 * Returns response time trends with month-over-month changes
 * 
 * Backend integration:
 * - Fetch from /api/dashboard/avg-response-time
 * - Calculate average from completed incidents
 * - Compare with previous month
 * - isIncrease: true (증가, 빨간색 표시), false (감소, 파란색 표시)
 * 
 * Response format:
 * [
 *   { type: '응급', time: 21, change: 2, isIncrease: false },  // 전월 대비 2% 감소
 *   { type: '화재', time: 19, change: 5, isIncrease: true },   // 전월 대비 5% 증가
 *   { type: '쓰레기', time: 32, change: 2, isIncrease: true }   // 전월 대비 2% 증가
 * ]
 */
export const getAvgResponseTime = async () => {
  // TODO: Replace with actual API call
  // return fetch('/api/dashboard/avg-response-time').then(res => res.json());
  return Promise.resolve(mockAvgResponseTime);
};

// ==================== EmergencyDashboard API ====================
/**
 * Get active emergency incidents
 * 
 * Backend integration:
 * - Fetch from /api/emergencies?status=active
 * - Filter by status: '대기중', '대응중'
 * - Include real-time detection data from CCTV AI
 */
export const getActiveEmergencies = async (): Promise<EmergencyItem[]> => {
  // TODO: Replace with actual API call
  // return fetch('/api/emergencies?status=active').then(res => res.json());
  return Promise.resolve(mockInitialActiveEmergencies);
};

/**
 * Get completed emergency incidents
 * 
 * Backend integration:
 * - Fetch from /api/emergencies?status=completed
 * - Include response time and duration
 */
export const getCompletedEmergencies = async (): Promise<EmergencyItem[]> => {
  // TODO: Replace with actual API call
  // return fetch('/api/emergencies?status=completed').then(res => res.json());
  return Promise.resolve(mockCompletedEmergencies);
};

// ==================== FireDashboard API ====================
/**
 * Get active fire incidents
 * 
 * Backend integration:
 * - Fetch from /api/fires?status=active
 * - Include wind speed, severity
 * - AI detection: smoke and flame detection confidence
 */
export const getActiveFires = async (): Promise<FireItem[]> => {
  // TODO: Replace with actual API call
  // return fetch('/api/fires?status=active').then(res => res.json());
  return Promise.resolve(mockInitialActiveFires);
};

/**
 * Get completed fire incidents
 * 
 * Backend integration:
 * - Fetch from /api/fires?status=completed
 * - Include extinguishment time and duration
 */
export const getCompletedFires = async (): Promise<FireItem[]> => {
  // TODO: Replace with actual API call
  // return fetch('/api/fires?status=completed').then(res => res.json());
  return Promise.resolve(mockCompletedFires);
};

// ==================== TrashDashboard API ====================
/**
 * Get active trash dumping incidents
 * 
 * Backend integration:
 * - Fetch from /api/trash?status=active
 * - Include trash type classification (일반쓰레기, 플라스틱, 음식물, 대형쓰레기)
 * - AI detection confidence scores
 */
export const getActiveTrashIncidents = async (): Promise<TrashItem[]> => {
  // TODO: Replace with actual API call
  // return fetch('/api/trash?status=active').then(res => res.json());
  return Promise.resolve(mockInitialActiveTrashIncidents);
};

/**
 * Get completed trash incidents
 * 
 * Backend integration:
 * - Fetch from /api/trash?status=completed
 * - Include cleanup completion time
 */
export const getCompletedTrashIncidents = async (): Promise<TrashItem[]> => {
  // TODO: Replace with actual API call
  // return fetch('/api/trash?status=completed').then(res => res.json());
  return Promise.resolve(mockCompletedTrashIncidents);
};

// ==================== RockfallDashboard API ====================
export const getActiveRockfalls = async (): Promise<RockfallItem[]> => {
  // TODO: Replace with actual API call
  return Promise.resolve(mockActiveRockfalls);
};

export const getCompletedRockfalls = async (): Promise<RockfallItem[]> => {
  // TODO: Replace with actual API call
  return Promise.resolve(mockCompletedRockfalls);
};

// ==================== MonthlyReport API ====================
/**
 * Get monthly statistics for report
 * 
 * Backend integration:
 * - Fetch from /api/reports/monthly-stats?month=YYYY-MM
 * - Aggregate all incident types
 * - Calculate resolution rates
 * - Include CCTV operational statistics
 */
export const getMonthlyStats = async () => {
  // TODO: Replace with actual API call
  // return fetch('/api/reports/monthly-stats?month=2025-11').then(res => res.json());
  return Promise.resolve(mockMonthlyStats);
};

/**
 * Get major incidents for monthly report
 * 
 * Backend integration:
 * - Fetch from /api/reports/major-incidents?month=YYYY-MM
 * - Filter by severity level
 * - Include only significant events
 */
export const getMajorIncidents = async (): Promise<MajorIncident[]> => {
  // TODO: Replace with actual API call
  // return fetch('/api/reports/major-incidents?month=2025-11').then(res => res.json());
  return Promise.resolve(mockMajorIncidents);
};

// ==================== CCTVManagement API ====================
export const getCCTVLocationHelper = (id: string): string => {
  return getCCTVLocation(id);
};

export const getOffCCTVList = (): string[] => {
  return getOffCCTVCodes();
};

// Get CCTV summary (total, on, off counts)
export const getCCTVSummary = async () => {
  // TODO: Replace with actual API call
  return Promise.resolve(cctvSummary());
};

// Get incidents summary
export const getIncidentsSummary = async () => {
  // TODO: Replace with actual API call
  return Promise.resolve(incidentsSummary());
};

// ==================== Hotspot API ====================
/**
 * Get accident hotspot locations by type
 * Returns CCTVs with the highest incident frequency for the selected period
 * 
 * Backend integration:
 * - Fetch from /api/hotspots?type={type}&month=YYYY-MM
 * - Calculate from incident history grouped by CCTV
 * - Sort by frequency and return top locations
 * - Include incident count for each location
 */
export const getHotspots = async (type: 'fire' | 'emergency' | 'trash'): Promise<HotspotLocation[]> => {
  // TODO: Replace with actual API call
  // return fetch(`/api/hotspots?type=${type}&month=2025-11`).then(res => res.json());
  return Promise.resolve(getHotspotsByType(type));
};

/**
 * Get all hotspots (all types combined)
 * 
 * Backend integration:
 * - Fetch from /api/hotspots/all?month=YYYY-MM
 */
export const getAllHotspotsData = async (): Promise<HotspotLocation[]> => {
  // TODO: Replace with actual API call
  // return fetch('/api/hotspots/all?month=2025-11').then(res => res.json());
  return Promise.resolve(getAllHotspots());
};

// ==================== CCTV Video Clips API (Legacy - use getCCTVMedia instead) ====================
/**
 * Get video clips for a specific CCTV (legacy function)
 * 
 * @deprecated Use getCCTVMedia() instead
 * @param cctvId - CCTV code (e.g., 'CCTV-001')
 * @returns Array of video clips
 */
export const getCCTVVideoClips = async (cctvId: string): Promise<VideoClip[]> => {
  // Convert code to ID
  const cctv = getCCTVByCode(cctvId);
  if (!cctv) return Promise.resolve([]);
  
  // Use new API function
  const media = await getCCTVMedia(cctv.id, 'video');
  
  // Convert to legacy format
  return Promise.resolve(media.map(m => ({
    id: m.id,
    cctvId: cctvId,
    timestamp: m.timestamp,
    duration: m.duration || 0,
    type: 'fire' as const, // Default type - should come from backend
    fileSize: m.fileSize,
    confidence: '95%', // Default - should come from backend
  })));
};

// Helper function to generate CCTV thumbnails (100 CCTVs)
export const generateCCTVThumbnails = (allNotifications: NotificationItem[]) => {
  return Array.from({ length: 100 }, (_, i) => {
    const id = `CCTV-${String(i + 1).padStart(3, '0')}`;
    const hour = 14 - Math.floor(i / 20);
    const minute = 60 - ((i % 20) * 3);
    const time = `2025-11-21 ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    const detecting = allNotifications.some(n => n.cctvId === id);
    return { id, time, detecting };
  });
};

// Helper function to generate CCTV status data (100 CCTVs)
export const generateCCTVStatusData = (allNotifications: NotificationItem[]) => {
  const offCCTVsList = getOffCCTVCodes(); // Use codes instead of IDs
  return Array.from({ length: 100 }, (_, i) => {
    const id = `CCTV-${String(i + 1).padStart(3, '0')}`;
    const location = getCCTVLocation(id);
    
    const hasNotification = allNotifications.some(n => n.cctvId === id);
    const notificationType = allNotifications.find(n => n.cctvId === id)?.type;
    const detectedIncident = notificationType === 'fire' ? '화재' : notificationType === 'emergency' ? '응급' : notificationType === 'trash' ? '쓰레기' : '-';
    
    const power = hasNotification ? 'on' as const : (offCCTVsList.includes(id) ? 'off' as const : 'on' as const);
    const status = power === 'off' ? '점검필요' : '정상';
    
    const hour = 14 - Math.floor(i / 20);
    const minute = 60 - ((i % 20) * 3);
    const lastDetection = hasNotification 
      ? allNotifications.find(n => n.cctvId === id)?.time || `2025-11-25 ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
      : `2025-11-25 ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    
    return { id, location, status, power, lastDetection, detectedIncident };
  });
};

// ============================================
// 백엔드 API 연동 (VIEW 기반)
// ============================================

const API_BASE_URL = 'http://localhost:8080/api';

/**
 * 응급 대시보드 상단 통계 조회 (실제 백엔드 API)
 * GET /api/emergency-dashboard/stats
 */
export interface EmergencyStatsResponse {
  todayCount: number;
  pendingCount: number;
  avgResponseTime: number;
  avgResponseTimeFormatted: string;
}

export const getEmergencyStats = async (): Promise<EmergencyStatsResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/emergency-dashboard/stats`);
    if (!response.ok) {
      throw new Error(`Failed to fetch emergency stats: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching emergency stats:', error);
    // Fallback to default values
    return {
      todayCount: 0,
      pendingCount: 0,
      avgResponseTime: 0,
      avgResponseTimeFormatted: '-'
    };
  }
};

/**
 * 응급 사고다발구간 조회 (실제 백엔드 API)
 * GET /api/emergency-dashboard/hotspots?period=this_month&minCount=3
 */
export interface HotspotResponse {
  cctvId: number;
  cctvCode: string;
  address: string;
  addressDescription: string;
  incidentCount: number;
  avgSeverityScore: number;
  maxSeverityScore: number;
  firstIncidentAt: string | null;
  lastIncidentAt: string | null;
  latitude: number;
  longitude: number;
  geomWkt: string | null;
}

export const getEmergencyHotspots = async (
  period: 'this_month' | '30d' | '7d' | 'all' = 'this_month',
  minCount: number = 3
): Promise<HotspotResponse[]> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/emergency-dashboard/hotspots?period=${period}&minCount=${minCount}`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch emergency hotspots: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching emergency hotspots:', error);
    // Fallback to empty array
    return [];
  }
};

/**
 * 화재 통계 조회 (실제 백엔드 API)
 * GET /api/fire-dashboard/stats
 */
export interface FireStatsResponse {
  todayCount: number;
  pendingCount: number;
  avgResponseTime: number;
  avgResponseTimeFormatted: string;
}

export const getFireStats = async (): Promise<FireStatsResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/fire-dashboard/stats`);
    if (!response.ok) {
      throw new Error(`Failed to fetch fire stats: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching fire stats:', error);
    return {
      todayCount: 0,
      pendingCount: 0,
      avgResponseTime: 0,
      avgResponseTimeFormatted: '-'
    };
  }
};

/**
 * 화재 사고다발구간 조회 (실제 백엔드 API)
 * GET /api/fire-dashboard/hotspots?period=this_month&minCount=1
 */
export const getFireHotspots = async (
  period: 'this_month' | '30d' | '7d' | 'all' = 'this_month',
  minCount: number = 1
): Promise<HotspotResponse[]> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/fire-dashboard/hotspots?period=${period}&minCount=${minCount}`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch fire hotspots: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching fire hotspots:', error);
    return [];
  }
};

/**
 * 쓰레기 통계 조회 (실제 백엔드 API)
 * GET /api/trash-dashboard/stats
 */
export interface TrashStatsResponse {
  todayCount: number;
  pendingCount: number;
  avgResponseTime: number;
  avgResponseTimeFormatted: string;
}

export const getTrashStats = async (): Promise<TrashStatsResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/trash-dashboard/stats`);
    if (!response.ok) {
      throw new Error(`Failed to fetch trash stats: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching trash stats:', error);
    return {
      todayCount: 0,
      pendingCount: 0,
      avgResponseTime: 0,
      avgResponseTimeFormatted: '-'
    };
  }
};

/**
 * 쓰레기 사고다발구간 조회 (실제 백엔드 API)
 * GET /api/trash-dashboard/hotspots?period=this_month&minCount=1
 */
export const getTrashHotspots = async (
  period: 'this_month' | '30d' | '7d' | 'all' = 'this_month',
  minCount: number = 1
): Promise<HotspotResponse[]> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/trash-dashboard/hotspots?period=${period}&minCount=${minCount}`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch trash hotspots: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching trash hotspots:', error);
    return [];
  }
};

// ============================================
// 사고 목록 조회 API (페이지네이션)
// ============================================

/**
 * 응급 사고 목록 조회 (페이지네이션)
 * GET /api/emergency-dashboard/incidents?page=0&size=10
 */
export interface IncidentListItem {
  incidentId: number;
  accidentCode: string;
  type: string;
  cctvId: string;
  detectedAt: string;
  severity: string;
  status: string;
  location: string;
}

export interface PageResponse<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: {
      empty: boolean;
      sorted: boolean;
      unsorted: boolean;
    };
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  totalPages: number;
  totalElements: number;
  last: boolean;
  size: number;
  number: number;
  sort: {
    empty: boolean;
    sorted: boolean;
    unsorted: boolean;
  };
  numberOfElements: number;
  first: boolean;
  empty: boolean;
}

export const getEmergencyIncidents = async (
  page: number = 0,
  size: number = 10
): Promise<PageResponse<IncidentListItem>> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/emergency-dashboard/incidents?page=${page}&size=${size}`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch emergency incidents: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching emergency incidents:', error);
    // Fallback to empty page
    return {
      content: [],
      pageable: {
        pageNumber: 0,
        pageSize: size,
        sort: { empty: true, sorted: false, unsorted: true },
        offset: 0,
        paged: true,
        unpaged: false
      },
      totalPages: 0,
      totalElements: 0,
      last: true,
      size: size,
      number: 0,
      sort: { empty: true, sorted: false, unsorted: true },
      numberOfElements: 0,
      first: true,
      empty: true
    };
  }
};

