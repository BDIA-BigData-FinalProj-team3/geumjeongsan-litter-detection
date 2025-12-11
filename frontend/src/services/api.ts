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

// API Base URL - config/api.ts에서 import
import BACKEND_URL from '../config/api';

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
    // 1. Attempt to fetch from real Backend API (view_cctv_management)
    const response = await fetch(`${BACKEND_URL}/api/cctv`);
    
    if (response.ok) {
      const data = await response.json();
      
      // Transform Backend Data (view_cctv_management) -> Frontend Model (CCTVMarker)
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
        } else if (item.longitude && item.latitude) {
          lng = item.longitude;
          lat = item.latitude;
        }

        return {
          id: item.id || item.cctvId,
          cctvCode: item.cctvCode,
          name: item.name || item.cctvCode,
          locationDesc: item.locationDesc || item.cctvAddress || '',
          cctvAddress: item.cctvAddress,
          installDate: item.installDate || '2024-01-15',
          modelName: item.modelName,
          resolution: item.resolution || '1920x1080',
          isActive: item.isActive !== undefined ? item.isActive : true,
          powerStatus: item.powerStatus 
            ? (String(item.powerStatus).toLowerCase().trim() === 'on' ? 'on' : 'off')
            : 'off',
          healthStatus: item.healthStatus,
          lastHeartbeat: item.lastHeartbeat,
          longitude: lng,
          latitude: lat,
          incidentCount: item.incidentCount || 0,
          lastIncidentTime: item.lastIncidentTime || item.lastIncidentAt,
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
    { id: 1, cctvCode: 'CCTV-001', name: '등산로 1 CCTV', locationDesc: '등산로 1', installDate: '2024-01-15', modelName: 'HD-1080P', resolution: '1920x1080', isActive: true, powerStatus: 'on', longitude: 127.5, latitude: 37.5 },
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
    const response = await fetch(`${BACKEND_URL}/api/map/active-incidents`);
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
 * Get incident markers (CCTV-grouped incidents for MainMap)
 * VIEW: view_mainmap_incident_markers
 * 
 * Returns CCTV markers with incident counts already grouped by type
 * - Eliminates need for frontend grouping logic
 * - Directly usable for map marker rendering
 * 
 * @returns Array of incident markers with CCTV location and incident counts
 */
export const getIncidentMarkers = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/mainmap/incident-markers`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ [MainMap] Loaded Incident Markers from VIEW:', data.length);
      return data;
    }
  } catch (error) {
    console.warn('⚠️ [MainMap] Failed to fetch incident markers:', error);
  }
  return [];
};

/**
 * Get CCTV status (for MainMap real-time CCTV tab)
 * VIEW: view_mainmap_cctv_status
 * 
 * Returns CCTV markers with status information
 * - Power status (ON/OFF)
 * - Health status (NORMAL/NEED_CHECK/OFFLINE)
 * - Display status (OFF/NEED_CHECK/ON) - calculated priority
 * - Last incident information
 * 
 * @returns Array of CCTV status with location and state
 */
export const getCCTVStatus = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/mainmap/cctv-status`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ [MainMap] Loaded CCTV Status from VIEW:', data.length);
      return data;
    }
  } catch (error) {
    console.warn('⚠️ [MainMap] Failed to fetch CCTV status:', error);
  }
  return [];
};

/**
 * Get latest weather for MainMap
 * 
 * Returns latest weather information for Geumjeongsan
 * - Temperature, humidity
 * - Wind direction, wind speed
 * - Weather condition (CLEAR/CLOUDY/RAIN/SNOW)
 * 
 * @returns Weather object or null
 */
export const getMainMapWeather = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/mainmap/weather`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ [MainMap] Loaded Weather:', data?.temperature + '°C');
      return data;
    }
  } catch (error) {
    console.warn('⚠️ [MainMap] Failed to fetch weather:', error);
  }
  return null;
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
  try {
    const response = await fetch(`${BACKEND_URL}/api/cctv/${id}/incidents`);
    if (!response.ok) {
      console.warn(`⚠️ [CCTV] Failed to fetch incidents for CCTV ${id}: ${response.status}`);
      return [];
    }
    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error(`❌ [CCTV] Error fetching incidents for CCTV ${id}:`, error);
    return [];
  }
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
  try {
    const response = await fetch(`${BACKEND_URL}/api/dashboard/daily-stats`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ [Dashboard] Loaded daily stats:', data);
      return data;
    }
  } catch (error) {
    console.error('❌ [Dashboard] Failed to fetch daily stats:', error);
  }
  return null;
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
  try {
    const response = await fetch(`${BACKEND_URL}/api/dashboard/avg-response-time`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ [Dashboard] Loaded avg response time:', data);
      return data; // Backend에서 UI 형식으로 변환해서 반환
    }
  } catch (error) {
    console.error('❌ [Dashboard] Failed to fetch avg response time:', error);
  }
  
  // 에러 시 기본값 반환
  return [
    { type: '응급', time: 0, change: 0, isIncrease: false },
    { type: '화재', time: 0, change: 0, isIncrease: false },
    { type: '쓰레기', time: 0, change: 0, isIncrease: false }
  ];
};

// ==================== EmergencyDashboard API ====================
/**
 * Get active emergency incidents
 */
export const getActiveEmergencies = async (): Promise<EmergencyItem[]> => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/emergency/active`);
    if (response.ok) {
      return await response.json();
    }
    console.error('Failed to fetch active emergencies:', response.status);
    return [];
  } catch (error) {
    console.error('Error fetching active emergencies:', error);
    return [];
  }
};

/**
 * Get completed emergency incidents
 */
export const getCompletedEmergencies = async (): Promise<EmergencyItem[]> => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/emergency/completed`);
    if (response.ok) {
      return await response.json();
    }
    console.error('Failed to fetch completed emergencies:', response.status);
    return [];
  } catch (error) {
    console.error('Error fetching completed emergencies:', error);
    return [];
  }
};

// ==================== FireDashboard API ====================
/**
 * Get active fire incidents
 */
export const getActiveFires = async (): Promise<FireItem[]> => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/fire/active`);
    if (response.ok) {
      return await response.json();
    }
    console.error('Failed to fetch active fires:', response.status);
    return [];
  } catch (error) {
    console.error('Error fetching active fires:', error);
    return [];
  }
};

/**
 * Get completed fire incidents
 */
export const getCompletedFires = async (): Promise<FireItem[]> => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/fire/completed`);
    if (response.ok) {
      return await response.json();
    }
    console.error('Failed to fetch completed fires:', response.status);
    return [];
  } catch (error) {
    console.error('Error fetching completed fires:', error);
    return [];
  }
};

// ==================== TrashDashboard API ====================
/**
 * Get active trash dumping incidents
 */
export const getActiveTrashIncidents = async (): Promise<TrashItem[]> => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/trash/active`);
    if (response.ok) {
      return await response.json();
    }
    console.error('Failed to fetch active trash incidents:', response.status);
    return [];
  } catch (error) {
    console.error('Error fetching active trash incidents:', error);
    return [];
  }
};

/**
 * Get completed trash incidents
 */
export const getCompletedTrashIncidents = async (): Promise<TrashItem[]> => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/trash/completed`);
    if (response.ok) {
      return await response.json();
    }
    console.error('Failed to fetch completed trash incidents:', response.status);
    return [];
  } catch (error) {
    console.error('Error fetching completed trash incidents:', error);
    return [];
  }
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
// BACKEND_URL은 config/api.ts에서 import됨

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
    const response = await fetch(`${BACKEND_URL}/api/emergency/stats`);
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
 * 사고다발구간 조회 (간단한 형식)
 */
export interface HotspotResponse {
  location: string;
  count: number;
}

export const getEmergencyHotspots = async (
  period: 'this_month' | '30d' | '7d' | 'all' = 'this_month',
  limit: number = 1
): Promise<HotspotResponse[]> => {
  try {
    const response = await fetch(
      `${BACKEND_URL}/api/emergency/hotspots?period=${period}&limit=${limit}`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch emergency hotspots: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching emergency hotspots:', error);
    return [];
  }
};

/**
 * 응급 사건 상태 업데이트
 */
export const updateEmergencyStatus = async (id: number, status: string, handlerName?: string) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/emergency/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status, handlerName }),
    });
    if (!response.ok) {
      throw new Error(`Failed to update emergency status: ${response.status}`);
    }
    const result = await response.json();
    console.log('✅ [Emergency] Status updated:', result);
    return result;
  } catch (error) {
    console.error('❌ [Emergency] Failed to update status:', error);
    throw error;
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
    const response = await fetch(`${BACKEND_URL}/api/fire/stats`);
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
 * 화재 사고다발구간 조회
 */
export const getFireHotspots = async (
  period: 'this_month' | '30d' | '7d' | 'all' = 'this_month',
  limit: number = 1
): Promise<HotspotResponse[]> => {
  try {
    const response = await fetch(
      `${BACKEND_URL}/api/fire/hotspots?period=${period}&limit=${limit}`
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
 * 화재 사건 상태 업데이트
 */
export const updateFireStatus = async (id: number, status: string, handlerName?: string) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/fire/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status, handlerName }),
    });
    if (!response.ok) {
      throw new Error(`Failed to update fire status: ${response.status}`);
    }
    const result = await response.json();
    console.log('✅ [Fire] Status updated:', result);
    return result;
  } catch (error) {
    console.error('❌ [Fire] Failed to update status:', error);
    throw error;
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
    const response = await fetch(`${BACKEND_URL}/api/trash/stats`);
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
 * 쓰레기 사고다발구간 조회
 */
export const getTrashHotspots = async (
  period: 'this_month' | '30d' | '7d' | 'all' = 'this_month',
  limit: number = 1
): Promise<HotspotResponse[]> => {
  try {
    const response = await fetch(
      `${BACKEND_URL}/api/trash/hotspots?period=${period}&limit=${limit}`
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

/**
 * 쓰레기 사건 상태 업데이트
 */
export const updateTrashStatus = async (id: number, status: string, handlerName?: string) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/trash/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status, handlerName }),
    });
    if (!response.ok) {
      throw new Error(`Failed to update trash status: ${response.status}`);
    }
    const result = await response.json();
    console.log('✅ [Trash] Status updated:', result);
    return result;
  } catch (error) {
    console.error('❌ [Trash] Failed to update status:', error);
    throw error;
  }
};

/**
 * 응급 사건 상세정보 업데이트 (수동 등록)
 */
export const updateEmergencyDetail = async (id: number, data: {
  memo?: string;
  severity?: string;
  patientName?: string;
  patientGender?: string;
  transferHospital?: string;
}) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/emergency/${id}/detail`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`Failed to update emergency detail: ${response.status}`);
    }
    const result = await response.json();
    console.log('✅ [Emergency] Detail updated:', result);
    return result;
  } catch (error) {
    console.error('❌ [Emergency] Failed to update detail:', error);
    throw error;
  }
};

/**
 * 화재 사건 상세정보 업데이트 (수동 등록)
 */
export const updateFireDetail = async (id: number, data: {
  memo?: string;
  severity?: string;
}) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/fire/${id}/detail`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`Failed to update fire detail: ${response.status}`);
    }
    const result = await response.json();
    console.log('✅ [Fire] Detail updated:', result);
    return result;
  } catch (error) {
    console.error('❌ [Fire] Failed to update detail:', error);
    throw error;
  }
};

/**
 * 쓰레기 사건 상세정보 업데이트 (수동 등록)
 */
export const updateTrashDetail = async (id: number, data: {
  memo?: string;
  severity?: string;
  trashType?: string;
  amount?: string;
}) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/trash/${id}/detail`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`Failed to update trash detail: ${response.status}`);
    }
    const result = await response.json();
    console.log('✅ [Trash] Detail updated:', result);
    return result;
  } catch (error) {
    console.error('❌ [Trash] Failed to update detail:', error);
    throw error;
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
      `${BACKEND_URL}/api/emergency-dashboard/incidents?page=${page}&size=${size}`
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

// ============================================
// AllIncidents Dashboard API (전체현황 페이지)
// ============================================

/**
 * 전체현황 상단 통계 조회
 * GET /api/all-incidents/stats
 */
export const getAllIncidentsStats = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/all-incidents/stats`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ [AllIncidents] Loaded stats:', data);
      return data;
    }
  } catch (error) {
    console.error('❌ [AllIncidents] Failed to fetch stats:', error);
  }
  return {
    todayCount: 0,
    pendingCount: 0,
    avgResponseTime: 0,
    avgResponseTimeFormatted: '0분',
    hotspotLocation: '해당 없음'
  };
};

/**
 * 전체현황 사건 목록 조회
 * GET /api/all-incidents/list
 * 
 * @param status - 'active' (진행중) | 'completed' (처리완료)
 * @param search - 검색어
 */
export const getAllIncidentsList = async (status?: string, search?: string) => {
  try {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (search) params.append('search', search);

    const queryString = params.toString();
    const url = `${BACKEND_URL}/api/all-incidents/list${queryString ? '?' + queryString : ''}`;
    
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ [AllIncidents] Loaded list (${status || 'all'}):`, data.length);
      return data;
    }
  } catch (error) {
    console.error('❌ [AllIncidents] Failed to fetch list:', error);
  }
  return [];
};

/**
 * 전체현황 사건 상세 조회
 * GET /api/all-incidents/detail/{id}
 */
export const getAllIncidentDetail = async (id: number) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/all-incidents/detail/${id}`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ [AllIncidents] Loaded detail:', data);
      return data;
    }
  } catch (error) {
    console.error('❌ [AllIncidents] Failed to fetch detail:', error);
  }
  return null;
};

/**
 * 응급 사건 상세 조회
 * GET /api/emergency/detail/{id}
 */
export const getEmergencyDetail = async (id: number) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/emergency/detail/${id}`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ [Emergency] Loaded detail:', data);
      return data;
    }
  } catch (error) {
    console.error('❌ [Emergency] Failed to fetch detail:', error);
  }
  return null;
};

/**
 * 화재 사건 상세 조회
 * GET /api/fire/detail/{id}
 */
export const getFireDetail = async (id: number) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/fire/detail/${id}`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ [Fire] Loaded detail:', data);
      return data;
    }
  } catch (error) {
    console.error('❌ [Fire] Failed to fetch detail:', error);
  }
  return null;
};

/**
 * 쓰레기 사건 상세 조회
 * GET /api/trash/detail/{id}
 */
export const getTrashDetail = async (id: number) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/trash/detail/${id}`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ [Trash] Loaded detail:', data);
      return data;
    }
  } catch (error) {
    console.error('❌ [Trash] Failed to fetch detail:', error);
  }
  return null;
};

// ============================================
// Dashboard API - 전체 사건 목록 조회
// ============================================

/**
 * 전체 사건 목록 조회
 * VIEW: view_all_incidents_list
 * 
 * @param status - 'active' (진행중) | 'resolved' (처리완료) | undefined (전체)
 * @param type - 'EMERGENCY' | 'FIRE' | 'TRASH' | undefined (전체)
 * @param search - 검색어 (사고코드, CCTV ID, 지역명)
 * 
 * 예시:
 * - getIncidentsList('active')                    // 진행중 전체
 * - getIncidentsList('active', 'FIRE')            // 진행중 화재만
 * - getIncidentsList('resolved')                  // 처리완료 전체
 * - getIncidentsList(undefined, undefined, 'E-')  // 검색
 */
export const getIncidentsList = async (
  status?: string,
  type?: string,
  search?: string
) => {
  try {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (type) params.append('type', type);
    if (search) params.append('search', search);

    const queryString = params.toString();
    const url = `${BACKEND_URL}/api/dashboard/incidents${queryString ? '?' + queryString : ''}`;
    
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ [Dashboard] Loaded incidents (${status || 'all'}, ${type || 'all'}):`, data.length);
      return data;
    }
  } catch (error) {
    console.error('❌ [Dashboard] Failed to fetch incidents list:', error);
  }
  return [];
};

/**
 * 사건 상세 조회
 * 
 * @param id - 사건 ID
 */
export const getIncidentDetail = async (id: number) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/dashboard/incidents/${id}`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ [Dashboard] Loaded incident detail:', data);
      return data;
    }
  } catch (error) {
    console.error('❌ [Dashboard] Failed to fetch incident detail:', error);
  }
  return null;
};

/**
 * ========================================
 * 신규 사건 등록 API
 * ========================================
 */

/**
 * 신규 응급 사건 등록
 * POST /api/emergency/create
 */
export const createEmergency = async (data: {
  detectedAt: string;      // ISO 8601 format
  locationDesc: string;
  severityLevel: string;   // 'HIGH' | 'MEDIUM' | 'LOW'
  memo?: string;
  patientName?: string;
  patientAge?: string;
  patientGender?: string;
  responseTeam?: string;
  transferDest?: string;
  createdById?: number;
}) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/emergency/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create emergency: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ [Emergency] Created:', result);
    return result;
  } catch (error) {
    console.error('❌ [Emergency] Failed to create:', error);
    throw error;
  }
};

/**
 * 신규 화재 사건 등록
 * POST /api/fire/create
 */
export const createFire = async (data: {
  detectedAt: string;      // ISO 8601 format
  locationDesc: string;
  severityLevel: string;   // 'HIGH' | 'MEDIUM' | 'LOW'
  memo?: string;
  createdById?: number;
}) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/fire/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create fire: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ [Fire] Created:', result);
    return result;
  } catch (error) {
    console.error('❌ [Fire] Failed to create:', error);
    throw error;
  }
};

/**
 * 신규 쓰레기 사건 등록
 * POST /api/trash/create
 */
export const createTrash = async (data: {
  detectedAt: string;      // ISO 8601 format
  locationDesc: string;
  severityLevel: string;   // 'HIGH' | 'MEDIUM' | 'LOW'
  memo?: string;
  trashType?: string;
  amount?: string;
  createdById?: number;
}) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/trash/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create trash: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ [Trash] Created:', result);
    return result;
  } catch (error) {
    console.error('❌ [Trash] Failed to create:', error);
    throw error;
  }
};

// ============================================
// MainMap API - 등산로
// ============================================

/**
 * 등산로 구간 조회
 * GET /api/mainmap/trails
 */
export const getTrails = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/mainmap/trails`);
    if (!response.ok) {
      console.warn('⚠️ [MainMap] Failed to fetch trails');
      return [];
    }
    const data = await response.json();
    console.log('✅ [MainMap] Loaded trails:', data.length);
    return data;
  } catch (error) {
    console.error('❌ [MainMap] Error fetching trails:', error);
    return [];
  }
};

// ============================================
// MainMap API - 위험지도 히트맵
// ============================================

/**
 * 위험지도 히트맵 조회
 * GET /api/mainmap/risk-map/heatmap
 * 
 * @param period - 기간: 'month' | 'week' | 'day' | '30d' | '7d' | 'today'
 * @param type - 사건 타입: 'all' | 'fire' | 'emergency' | 'trash'
 * @returns 등산로 구간별/CCTV별 사건 통계
 */
export interface RiskMapHeatmapItem {
  entityType: 'TRAIL_SEGMENT' | 'CCTV';
  entityId: number;
  entityName: string;
  trailName?: string;
  cctvCode?: string;
  cctvAddress?: string;
  geom: {
    type: 'Point' | 'LineString';
    coordinates: number[][] | number[][][];  // Point: [[lng, lat]], LineString: [[lng, lat], [lng, lat], ...]
  };
  fireCount: number;
  emergencyCount: number;
  trashCount: number;
  totalCount: number;
}

export const getRiskMapHeatmap = async (
  period: 'month' | 'week' | 'day' | '30d' | '7d' | 'today' = 'month',
  type: 'all' | 'fire' | 'emergency' | 'trash' = 'all'
): Promise<RiskMapHeatmapItem[]> => {
  try {
    const params = new URLSearchParams({
      period,
      type,
    });
    const response = await fetch(`${BACKEND_URL}/api/mainmap/risk-map/heatmap?${params}`);
    if (!response.ok) {
      console.warn('⚠️ [RiskMap] Failed to fetch heatmap');
      return [];
    }
    const data = await response.json();
    console.log('✅ [RiskMap] Loaded heatmap:', data.length);
    return data;
  } catch (error) {
    console.error('❌ [RiskMap] Error fetching heatmap:', error);
    return [];
  }
};

// ==================== CCTV Fallen Analysis API ====================
/**
 * CCTV 낙상 분석 요청
 * POST /api/cctv/{cctvCode}/fallen-analyze
 * 
 * @param cctvCode - CCTV 코드 (예: 'CCTV-001')
 * @returns 분석 결과 (클립 URL, 프레임 URL들)
 */
export interface FallenAnalysisResponse {
  status: string;
  camera_id: string;
  s3_key: string;
  result: {
    success: boolean;
    total_frames: number;
    fallen_events: number;
    duration: number;
    fps: number;
    effective_fps: number;
    frame_skip: number;
    clip_url: string;
    frame_urls: string[];
  };
  geminiMessage?: string; // Gemini 호출 필요 시 메시지
}

export const analyzeFallenVideo = async (cctvCode: string): Promise<FallenAnalysisResponse> => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/cctv/${cctvCode}/fallen-analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to analyze video: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ [CCTV] Analysis result:', result);
    return result;
  } catch (error) {
    console.error('❌ [CCTV] Failed to analyze video:', error);
    throw error;
  }
};
