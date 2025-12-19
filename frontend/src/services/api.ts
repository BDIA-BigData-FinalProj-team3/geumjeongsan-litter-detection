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
import { getCurrentUser } from './auth';

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

// Mock 사용 여부 (기본: false). 필요 시 .env에 VITE_USE_MOCK_DATA=true 설정
const USE_MOCK_DATA = (import.meta.env.VITE_USE_MOCK_DATA as string | undefined) === 'true';

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

  // 2. Fallback to Mock Data (if backend is offline or fails) - 옵션
  if (!USE_MOCK_DATA) {
    updateCCTVList([]);
    return [];
  }

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
  incidentId?: number; // 관련 사건 ID
  incidentCode?: string; // 사건 코드 (예: FIRE-001)
  incidentType?: string; // 사건 타입 (FIRE, EMERGENCY, TRASH)
  status?: string; // 사건 상태 (PENDING, IN_PROGRESS, COMPLETED)
}

export const getCCTVMedia = async (id: number, fileType: 'video' | 'image' | 'all' = 'all'): Promise<CCTVMedia[]> => {
  try {
    const q =
      fileType === 'video' ? 'VIDEO' :
      fileType === 'image' ? 'FRAME' :
      '';

    const url = q
      ? `${BACKEND_URL}/api/cctv/${id}/media?fileType=${encodeURIComponent(q)}`
      : `${BACKEND_URL}/api/cctv/${id}/media`;

    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`⚠️ [CCTV] Failed to fetch media for CCTV ${id}: ${response.status}`);
      return [];
    }
    const data = await response.json();
    const list: any[] = Array.isArray(data) ? data : [];

    const mapped: CCTVMedia[] = list.map((m: any) => {
      const t = String(m.fileType || '').toUpperCase();
      const type: 'video' | 'image' = t === 'VIDEO' ? 'video' : 'image';
      return {
        id: String(m.fileId ?? m.id ?? ''),
        url: String(m.url ?? ''),
        timestamp: String(m.capturedAt ?? ''),
        type,
        incidentId: m.incidentId,
        incidentCode: m.incidentCode,
        incidentType: m.incidentType,
        status: m.status,
      };
    }).filter(m => !!m.id && !!m.url);

    // fileType === 'all' 이면 그대로, 아니면 필터
    if (fileType === 'all') return mapped;
    return mapped.filter(m => m.type === fileType);
  } catch (error) {
    console.error(`❌ [CCTV] Error fetching media for CCTV ${id}:`, error);
    return [];
  }
};

/**
 * Get fire detection notifications
 * 
 * Backend integration:
 * - Fetch from /api/fire/active
 * - Real-time AI detection events
 * - Include confidence scores and timestamps
 */
export const getFireNotifications = async (): Promise<NotificationItem[]> => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/fire/active`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    
    // 백엔드 데이터를 NotificationItem 형식으로 변환
    return data
      .filter((item: any) => item.type === '화재') // 화재 타입만 필터링
      .map((item: any) => ({
        id: item.id.toString(),
        cctvId: item.cctvId || 'UNKNOWN',
        type: 'fire' as const,
        location: item.location || '알 수 없음',
        time: item.time || '',
        confidence: item.detectionConfidence 
          ? `${Math.round(item.detectionConfidence * 100)}%`
          : (item.detectionBasis && item.detectionBasis.includes('AI') ? '85%' : '수동'),
        timeAgo: calculateTimeAgo(item.time),
        timestamp: new Date(item.time).getTime(),
      }));
  } catch (error) {
    console.error('Failed to fetch fire notifications:', error);
    return USE_MOCK_DATA ? mockFireNotifications : [];
  }
};

/**
 * Get emergency detection notifications
 * 
 * Backend integration:
 * - Fetch from /api/emergency/active
 * - Detect fallen persons, medical emergencies
 */
export const getEmergencyNotifications = async (): Promise<NotificationItem[]> => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/emergency/active`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    
    // 백엔드 데이터를 NotificationItem 형식으로 변환
    return data
      .filter((item: any) => item.type === '응급') // 응급 타입만 필터링
      .map((item: any) => ({
        id: item.id.toString(),
        cctvId: item.cctvId || 'UNKNOWN',
        type: 'emergency' as const,
        location: item.location || '알 수 없음',
        time: item.time || '',
        confidence: item.detectionConfidence 
          ? `${Math.round(item.detectionConfidence * 100)}%`
          : (item.detectionBasis && item.detectionBasis.includes('AI') ? '85%' : '수동'),
        timeAgo: calculateTimeAgo(item.time),
        timestamp: new Date(item.time).getTime(),
      }));
  } catch (error) {
    console.error('Failed to fetch emergency notifications:', error);
    return USE_MOCK_DATA ? mockEmergencyNotifications : [];
  }
};

/**
 * Get trash dumping notifications
 * 
 * Backend integration:
 * - Fetch from /api/trash/active
 * - AI-detected illegal dumping events
 */
export const getTrashNotifications = async (): Promise<NotificationItem[]> => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/trash/active`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    
    // 백엔드 데이터를 NotificationItem 형식으로 변환
    return data
      .filter((item: any) => item.type === '쓰레기') // 쓰레기 타입만 필터링
      .map((item: any) => ({
        id: item.id.toString(),
        cctvId: item.cctvId || 'UNKNOWN',
        type: 'trash' as const,
        location: item.location || '알 수 없음',
        time: item.time || '',
        confidence: item.detectionConfidence 
          ? `${Math.round(item.detectionConfidence * 100)}%`
          : (item.detectionBasis && item.detectionBasis.includes('AI') ? '75%' : '수동'),
        timeAgo: calculateTimeAgo(item.time),
        timestamp: new Date(item.time).getTime(),
      }));
  } catch (error) {
    console.error('Failed to fetch trash notifications:', error);
    return mockTrashNotifications; // Fallback to mock data
  }
};

/**
 * 시간 경과 계산 함수
 */
function calculateTimeAgo(timeString: string): string {
  if (!timeString) return '알 수 없음';
  
  try {
    const time = new Date(timeString);
    const now = new Date();
    const diff = now.getTime() - time.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}시간 전`;
    
    const days = Math.floor(hours / 24);
    return `${days}일 전`;
  } catch (error) {
    return '알 수 없음';
  }
}

/**
 * Get helicopter locations
 * 
 * Backend integration:
 * - Fetch from /api/helicopters/locations
 * - Real-time GPS coordinates
 */
export const getHelicopterLocations = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/helicopters/locations`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.warn('⚠️ [Helicopter] Failed to fetch helicopter locations:', error);
  }

  return USE_MOCK_DATA ? Promise.resolve(mockHelicopterLocations) : [];
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
export const getAllMonthlyData = async (start?: string, end?: string) => {
  try {
    let url = `${BACKEND_URL}/api/dashboard/monthly-data`;
    if (start && end) {
      url += `?start=${start}&end=${end}`;
    }
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ [Dashboard] Loaded monthly data:', data);
      return data;
    }
  } catch (error) {
    console.error('❌ [Dashboard] Failed to fetch monthly data:', error);
  }
  // Fallback to mock data
  return Promise.resolve(mockAllMonthlyData);
};

/**
 * Get average response time by incident type
 * Returns response time trends with month-over-month changes
 * 
 * Backend integration:
 * - Fetch from /api/dashboard/avg-response-time?start=YYYY-MM&end=YYYY-MM
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
export const getAvgResponseTime = async (start?: string, end?: string) => {
  try {
    let url = `${BACKEND_URL}/api/dashboard/avg-response-time`;
    if (start && end) {
      url += `?start=${start}&end=${end}`;
    }
    const response = await fetch(url);
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

/**
 * Get AI model accuracy by incident type
 * Returns detection and correct counts for each type
 * 
 * Backend integration:
 * - Fetch from /api/dashboard/ai-accuracy?start=YYYY-MM&end=YYYY-MM
 * - Calculate accuracy from AI detections vs confirmed incidents
 * 
 * Response format:
 * [
 *   { type: '화재', detected: 120, correct: 110 },
 *   { type: '응급', detected: 85, correct: 75 },
 *   { type: '쓰레기', detected: 200, correct: 175 }
 * ]
 */
export const getAiAccuracy = async (start?: string, end?: string) => {
  try {
    let url = `${BACKEND_URL}/api/dashboard/ai-accuracy`;
    if (start && end) {
      url += `?start=${start}&end=${end}`;
    }
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ [Dashboard] Loaded AI accuracy:', data);
      return data;
    }
  } catch (error) {
    console.error('❌ [Dashboard] Failed to fetch AI accuracy:', error);
  }
  
  // 에러 시 기본값 반환 (기존 하드코딩 값)
  return [
    { type: '화재', detected: 120, correct: 110 },
    { type: '응급', detected: 85, correct: 75 },
    { type: '쓰레기', detected: 200, correct: 175 }
  ];
};

// ==================== Statistics API (NEW VIEW 기반) ====================
/**
 * 통계 페이지용 사고 통계 조회
 * VIEW: view_stats_daily_incident_type
 * 
 * @param unit - 기간 단위 ('DAY' | 'MONTH' | 'YEAR')
 * @param from - 시작 날짜 (ISO DATE 형식: 'YYYY-MM-DD')
 * @param to - 종료 날짜 (ISO DATE 형식: 'YYYY-MM-DD')
 * 
 * Response format:
 * {
 *   trend: [
 *     { period: '2025-01-01', total: 100, trash: 50, fire: 30, emergency: 20 }
 *   ],
 *   typeSummary: [
 *     { incidentType: 'TRASH', totalIncidents: 50, autoIncidents: 40, resolvedIncidents: 45, unresolvedIncidents: 5 }
 *   ],
 *   completionSummary: { resolved: 90, unresolved: 10 }
 * }
 */
export interface IncidentTrendPoint {
  period: string; // ISO date
  total: number;
  trash: number;
  fire: number;
  emergency: number;
}

export interface IncidentTypeSummary {
  period: string; // ISO date
  incidentType: string; // "TRASH" | "FIRE" | "EMERGENCY" | "ETC"
  totalIncidents: number;
  autoIncidents: number;
  resolvedIncidents: number;
  unresolvedIncidents: number;
}

export interface CompletionSummary {
  resolved: number;
  unresolved: number;
}

export interface StatsOverviewResponse {
  trend: IncidentTrendPoint[];
  typeSummary: IncidentTypeSummary[];
  completionSummary: CompletionSummary;
}

export const getIncidentStats = async (
  unit: 'DAY' | 'MONTH' | 'YEAR',
  from: string,
  to: string
): Promise<StatsOverviewResponse> => {
  try {
    const url = `${BACKEND_URL}/api/stats/incidents?unit=${unit}&from=${from}&to=${to}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch incident stats: ${response.status}`);
    }
    const data = await response.json();
    console.log('✅ [Stats] Loaded incident stats:', data);
    return data;
  } catch (error) {
    console.error('❌ [Stats] Failed to fetch incident stats:', error);
    // 에러 시 기본값 반환
    return {
      trend: [],
      typeSummary: [],
      completionSummary: { resolved: 0, unresolved: 0 }
    };
  }
};

/**
 * CCTV 가동률 조회
 * VIEW: view_stats_daily_cctv_uptime
 * 
 * @param unit - 기간 단위 ('DAY' | 'MONTH' | 'YEAR')
 * @param from - 시작 날짜 (ISO DATE 형식: 'YYYY-MM-DD')
 * @param to - 종료 날짜 (ISO DATE 형식: 'YYYY-MM-DD')
 * 
 * Response format:
 * [
 *   { period: '2025-01-01', onSamples: 100, offSamples: 5, uptimePct: 95.0 }
 * ]
 */
export interface CctvUptimePoint {
  period: string;     // ISO date 'YYYY-MM-DD'
  onSamples: number;
  offSamples: number;
  uptimePct: number;  // 0~100
}

export const getCctvUptime = async (
  unit: 'DAY' | 'MONTH' | 'YEAR',
  from: string,
  to: string
): Promise<CctvUptimePoint[]> => {
  try {
    const url = `${BACKEND_URL}/api/stats/cctv-uptime?unit=${unit}&from=${from}&to=${to}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch CCTV uptime: ${response.status}`);
    }
    const data = await response.json();
    console.log('✅ [Stats] Loaded CCTV uptime:', data);
    return data;
  } catch (error) {
    console.error('❌ [Stats] Failed to fetch CCTV uptime:', error);
    // 에러 시 기본값 반환
    return [];
  }
};

/**
 * AI 모델 정확도 / 오탐률 조회
 * VIEW: view_stats_model_accuracy_daily
 * 
 * @param unit - 기간 단위 ('DAY' | 'MONTH' | 'YEAR')
 * @param from - 시작 날짜 (ISO DATE 형식: 'YYYY-MM-DD')
 * @param to - 종료 날짜 (ISO DATE 형식: 'YYYY-MM-DD')
 * 
 * Response format:
 * [
 *   {
 *     period: '2025-01-01',
 *     incidentType: 'FIRE',
 *     detectionModel: 'yolo-v8',
 *     totalAutoIncidents: 120,
 *     trueIncidents: 110,
 *     falseIncidents: 10,
 *     accuracyPct: 91.7,
 *     falseRatePct: 8.3
 *   }
 * ]
 */
export interface ModelAccuracyPoint {
  period: string;        // ISO date 'YYYY-MM-DD'
  incidentType: string;  // 'EMERGENCY' | 'FIRE' | 'TRASH' | ...
  detectionModel: string;
  totalAutoIncidents: number;
  trueIncidents: number;
  falseIncidents: number;
  accuracyPct: number;
  falseRatePct: number;
}

export const getModelAccuracy = async (
  unit: 'DAY' | 'MONTH' | 'YEAR',
  from: string,
  to: string
): Promise<ModelAccuracyPoint[]> => {
  try {
    const url = `${BACKEND_URL}/api/stats/model-accuracy?unit=${unit}&from=${from}&to=${to}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch model accuracy: ${response.status}`);
    }
    const data = await response.json();
    console.log('✅ [Stats] Loaded model accuracy:', data);
    return data;
  } catch (error) {
    console.error('❌ [Stats] Failed to fetch model accuracy:', error);
    // 에러 시 기본값 반환
    return [];
  }
};

/**
 * 평균 대응시간 조회
 * VIEW: view_stats_daily_response_time
 * 
 * @param unit - 기간 단위 ('DAY' | 'MONTH' | 'YEAR')
 * @param from - 시작 날짜 (ISO DATE 형식: 'YYYY-MM-DD')
 * @param to - 종료 날짜 (ISO DATE 형식: 'YYYY-MM-DD')
 * 
 * Response format:
 * {
 *   items: [
 *     { type: '전체', time: 25, change: 5, isIncrease: false },
 *     { type: '응급', time: 21, change: 2, isIncrease: false },
 *     { type: '화재', time: 19, change: 5, isIncrease: true },
 *     { type: '쓰레기', time: 32, change: 2, isIncrease: true }
 *   ]
 * }
 */
export interface ResponseTimeItem {
  type: string;      // '전체' | '응급' | '화재' | '쓰레기'
  time: number;      // 평균 대응시간 (분)
  change: number;    // 전월/전년 대비 % (절대값)
  isIncrease: boolean; // true=증가(악화), false=감소(개선)
}

export interface ResponseTimeOverview {
  items: ResponseTimeItem[];
}

export const getResponseTime = async (
  unit: 'DAY' | 'MONTH' | 'YEAR',
  from: string,
  to: string
): Promise<ResponseTimeOverview> => {
  try {
    const url = `${BACKEND_URL}/api/stats/response-time?unit=${unit}&from=${from}&to=${to}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch response time: ${response.status}`);
    }
    const data = await response.json();
    console.log('✅ [Stats] Loaded response time:', data);
    return data;
  } catch (error) {
    console.error('❌ [Stats] Failed to fetch response time:', error);
    // 에러 시 기본값 반환
    return { items: [] };
  }
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
export interface RockfallDashboardResponse {
  todayCount: number;
  pendingCount: number;
  avgResponseTime: number;
  riskAreas: string[];
  activeIncidents: Array<{
    id: number;
    cctvId: string;
    incidentTime: string;
    magnitude: string;
    severity: string;
    status: string;
    handler: string;
    responseTime?: string | null;
    duration?: string | null;
  }>;
  resolvedIncidents: Array<{
    id: number;
    cctvId: string;
    incidentTime: string;
    magnitude: string;
    severity: string;
    status: string;
    handler: string;
    responseTime?: string | null;
    duration?: string | null;
  }>;
}

/**
 * 낙석 대시보드 통합 조회
 * GET /api/rockfalls/dashboard
 */
export const getRockfallDashboard = async (): Promise<RockfallDashboardResponse | null> => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/rockfalls/dashboard`);
    if (!response.ok) {
      throw new Error(`Failed to fetch rockfall dashboard: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('❌ [Rockfall] Failed to fetch dashboard:', error);
    return null;
  }
};

/**
 * 진행 중인 낙석 사고 조회
 */
export const getActiveRockfalls = async (): Promise<RockfallItem[]> => {
  try {
    const dashboard = await getRockfallDashboard();
    if (!dashboard) return [];
    return (dashboard.activeIncidents || []).map((i: any) => ({
      id: i.id,
      cctvId: i.cctvId,
      time: i.incidentTime,
      status: i.status,
      severity: i.severity,
      magnitude: i.magnitude,
      handler: i.handler,
      responseTime: i.responseTime || undefined,
      duration: i.duration || undefined,
    }));
  } catch (error) {
    console.error('Error fetching active rockfalls:', error);
    return [];
  }
};

/**
 * 완료된 낙석 사고 조회
 */
export const getCompletedRockfalls = async (): Promise<RockfallItem[]> => {
  try {
    const dashboard = await getRockfallDashboard();
    if (!dashboard) return [];
    return (dashboard.resolvedIncidents || []).map((i: any) => ({
      id: i.id,
      cctvId: i.cctvId,
      time: i.incidentTime,
      status: i.status,
      severity: i.severity,
      magnitude: i.magnitude,
      handler: i.handler,
      responseTime: i.responseTime || undefined,
      duration: i.duration || undefined,
    }));
  } catch (error) {
    console.error('Error fetching completed rockfalls:', error);
    return [];
  }
};

/**
 * 낙석 통계 조회 (상단 KPI)
 */
export interface RockfallStatsResponse {
  todayCount: number;
  pendingCount: number;
  avgResponseTime: number;
  avgResponseTimeFormatted: string;
}

export const getRockfallStats = async (): Promise<RockfallStatsResponse> => {
  try {
    const dashboard = await getRockfallDashboard();
    if (!dashboard) {
      throw new Error('No dashboard data');
    }
    const minutes = dashboard.avgResponseTime ?? 0;
    const formatted = minutes && minutes > 0 ? `${Math.round(minutes)}분` : '-';
    return {
      todayCount: dashboard.todayCount ?? 0,
      pendingCount: dashboard.pendingCount ?? 0,
      avgResponseTime: minutes,
      avgResponseTimeFormatted: formatted,
    };
  } catch (error) {
    console.error('Error fetching rockfall stats:', error);
    return {
      todayCount: 0,
      pendingCount: 0,
      avgResponseTime: 0,
      avgResponseTimeFormatted: '-'
    };
  }
};

/**
 * 낙석 사고다발구간 조회
 */
export const getRockfallHotspots = async (
  period: 'this_month' | '30d' | '7d' | 'all' = 'this_month',
  limit: number = 1
): Promise<HotspotResponse[]> => {
  try {
    // 백엔드에 별도 hotspots API가 없어서 dashboard의 riskAreas로 대체
    const dashboard = await getRockfallDashboard();
    const areas = dashboard?.riskAreas || [];
    return areas.slice(0, limit).map((area) => ({
      address: area.address,
      incidentCount: area.incidentCount
    }));
  } catch (error) {
    console.error('Error fetching rockfall hotspots:', error);
    return [];
  }
};

// ==================== 낙석 위험 지도 API ====================
/**
 * 낙석 위험 데이터 조회
 * GET /api/mainmap/rockfall-risk
 * 
 * VIEW: view_mainmap_rockfall_risk
 * 문화재 낙석 위험과 등산로 낙석 위험을 통합하여 반환
 */
export interface RockfallRiskItem {
  id: string;
  sourceId: number;
  riskType: 'cultural' | 'trail';
  name?: string;
  cultural?: string;
  riskValue: number;
  styleC: number; // 0-100
  geomGeojson: string; // GeoJSON string
  createdAt: string;
}

export const getRockfallRiskData = async (): Promise<RockfallRiskItem[]> => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/mainmap/rockfall-risk`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ [RockfallRisk] Loaded data:', data.length);
      
      // GeoJSON 문자열을 객체로 파싱
      return data.map((item: any) => ({
        ...item,
        geomGeojson: typeof item.geomGeojson === 'string' ? JSON.parse(item.geomGeojson) : item.geomGeojson
      }));
    }
    console.warn('⚠️ [RockfallRisk] Failed to fetch data');
    return [];
  } catch (error) {
    console.error('❌ [RockfallRisk] Error fetching data:', error);
    return [];
  }
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
 * 
 * @param month - 월 문자열 (YYYY-MM 형식, 예: '2025-11')
 */
export const getMonthlyStats = async (month?: string) => {
  try {
    if (month) {
      const response = await fetch(`${BACKEND_URL}/api/reports/monthly-stats?month=${month}`);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ [MonthlyReport] Loaded monthly stats:', data);
        return data;
      }
    }
  } catch (error) {
    console.warn('⚠️ [MonthlyReport] Failed to fetch monthly stats, using mock data:', error);
  }
  // Fallback to mock data
  return Promise.resolve(mockMonthlyStats);
};

/**
 * Get major incidents for monthly report
 * 
 * Backend integration:
 * - Fetch from /api/reports/major-incidents?month=YYYY-MM
 * - Filter by severity level
 * - Include only significant events
 * 
 * @param month - 월 문자열 (YYYY-MM 형식, 예: '2025-11')
 */
export const getMajorIncidents = async (month?: string): Promise<MajorIncident[]> => {
  try {
    if (month) {
      const response = await fetch(`${BACKEND_URL}/api/reports/major-incidents?month=${month}`);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ [MonthlyReport] Loaded major incidents:', data);
        return data;
      }
    }
  } catch (error) {
    console.warn('⚠️ [MonthlyReport] Failed to fetch major incidents, using mock data:', error);
  }
  // Fallback to mock data
  return Promise.resolve(mockMajorIncidents);
};

/**
 * Get available report months (YYYY-MM format)
 * 
 * Backend integration:
 * - Fetch from /api/reports/available-months
 * - Returns array of available months in descending order (newest first)
 * 
 * @returns Array of month strings (e.g., ['2025-12', '2025-11', ...])
 */
export const getAvailableReportMonths = async (): Promise<string[]> => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/reports/available-months`);
    if (response.ok) {
      const data = await response.json();
      // 기대: ['2025-12','2025-11',...]
      return Array.isArray(data) ? data : [];
    }
  } catch (e) {
    console.warn('⚠️ [MonthlyReport] Failed to load available months:', e);
  }
  return [];
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
  try {
    const response = await fetch(`${BACKEND_URL}/api/hotspots?type=${type}`);
    if (response.ok) {
      const data = await response.json();
      return data || [];
    }
  } catch (error) {
    console.warn('⚠️ [Hotspots] Failed to fetch hotspots:', error);
  }
  return USE_MOCK_DATA ? Promise.resolve(getHotspotsByType(type)) : [];
};

/**
 * Get all hotspots (all types combined)
 * 
 * Backend integration:
 * - Fetch from /api/hotspots/all?month=YYYY-MM
 */
export const getAllHotspotsData = async (): Promise<HotspotLocation[]> => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/hotspots/all`);
    if (response.ok) {
      const data = await response.json();
      return data || [];
    }
  } catch (error) {
    console.warn('⚠️ [Hotspots] Failed to fetch all hotspots:', error);
  }
  return USE_MOCK_DATA ? Promise.resolve(getAllHotspots()) : [];
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
  location?: string;
  count?: number;
  address?: string;
  cctvCode?: string;
  incidentCount?: number;
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
export const updateEmergencyStatus = async (
  id: number,
  status: string,
  options?: { assignedToId?: number }
) => {
  try {
    const actorId = getCurrentUser()?.userId;
    const assignedToId = options?.assignedToId ?? actorId; // 기본: 현재 접속자가 처리자(STAFF)
    const response = await fetch(`${BACKEND_URL}/api/emergency/${id}/workflow`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status, actorId, assignedToId }),
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
export const updateFireStatus = async (
  id: number,
  status: string,
  options?: { assignedToId?: number }
) => {
  try {
    const actorId = getCurrentUser()?.userId;
    const assignedToId = options?.assignedToId ?? actorId; // 기본: 현재 접속자가 처리자(STAFF)
    const response = await fetch(`${BACKEND_URL}/api/fire/${id}/workflow`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status, actorId, assignedToId }),
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
export const updateTrashStatus = async (
  id: number,
  status: string,
  options?: { assignedToId?: number }
) => {
  try {
    const actorId = getCurrentUser()?.userId;
    const assignedToId = options?.assignedToId ?? actorId; // 기본: 현재 접속자가 처리자(STAFF)
    const response = await fetch(`${BACKEND_URL}/api/trash/${id}/workflow`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status, actorId, assignedToId }),
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
    const actorId = getCurrentUser()?.userId;
    const response = await fetch(`${BACKEND_URL}/api/emergency/${id}/detail`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...data, actorId }),
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
    const actorId = getCurrentUser()?.userId;
    const response = await fetch(`${BACKEND_URL}/api/fire/${id}/detail`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...data, actorId }),
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
    const actorId = getCurrentUser()?.userId;
    const response = await fetch(`${BACKEND_URL}/api/trash/${id}/detail`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...data, actorId }),
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

/**
 * 낙석 사건 상태 업데이트
 */
export const updateRockfallStatus = async (
  id: number,
  status: string,
  options?: { assignedToId?: number }
) => {
  try {
    const actorId = getCurrentUser()?.userId;
    const assignedToId = options?.assignedToId ?? actorId; // 기본: 현재 접속자가 처리자(STAFF)
    // 기존 PATCH(/status)는 유지하되, 신규 workflow 엔드포인트를 우선 사용
    const response = await fetch(`${BACKEND_URL}/api/rockfalls/${id}/workflow`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status, actorId, assignedToId }),
    });
    if (!response.ok) {
      throw new Error(`Failed to update rockfall status: ${response.status}`);
    }
    const result = await response.json();
    console.log('✅ [Rockfall] Status updated:', result);
    return result;
  } catch (error) {
    console.error('❌ [Rockfall] Failed to update status:', error);
    throw error;
  }
};

/**
 * 낙석 사건 상세정보 업데이트 (수동 등록/수정)
 */
export const updateRockfallDetail = async (id: number, data: {
  memo?: string;
  severity?: string;
  rockSizeClass?: string;
  affectedAssetType?: string;
  affectedAssetName?: string;
  damageDescription?: string;
}) => {
  try {
    const actorId = getCurrentUser()?.userId;
    const response = await fetch(`${BACKEND_URL}/api/rockfalls/${id}/detail`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...data, actorId }),
    });
    if (!response.ok) {
      throw new Error(`Failed to update rockfall detail: ${response.status}`);
    }
    const result = await response.json();
    console.log('✅ [Rockfall] Detail updated:', result);
    return result;
  } catch (error) {
    console.error('❌ [Rockfall] Failed to update detail:', error);
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
 * ✅ 통합 상세 조회 (대시보드 상세 단일 소스)
 *
 * 원칙:
 * - 모든 "상세" UI는 이 함수(= IncidentDetailDto 기반) 결과만 사용한다.
 * - 기본은 /api/all-incidents/detail/{id}
 * - 낙석은 /api/rockfalls/detail/{id}를 추가로 merge
 */
export const getUnifiedIncidentDetail = async (id: number) => {
  const base = await getAllIncidentDetail(id);
  if (!base) return null;

  // 낙석은 별도 상세가 있으므로 merge
  if ((base as any).type === '낙석') {
    try {
      const rockfall = await getRockfallDetail(id);
      return { ...(base as any), ...(rockfall || {}) };
    } catch (e) {
      console.warn('⚠️ [UnifiedDetail] Failed to load rockfall detail, fallback to base detail', e);
      return base;
    }
  }

  return base;
};

/**
 * 낙석 사건 상세 조회
 * GET /api/rockfalls/detail/{id}
 */
export const getRockfallDetail = async (id: number) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/rockfalls/detail/${id}`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ [Rockfall] Loaded detail:', data);
      return data;
    }
  } catch (error) {
    console.error('❌ [Rockfall] Failed to fetch detail:', error);
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

/**
 * 신규 낙석 사건 등록
 * POST /api/rockfalls/create
 */
export const createRockfall = async (data: {
  detectedAt: string;      // ISO 8601 format
  locationDesc: string;
  severityLevel: string;   // 'HIGH' | 'MEDIUM' | 'LOW'
  rockSizeClass: string;       // 암괴 규모 (필수)
  affectedAssetType: string;   // 피해 대상 유형 (필수)
  affectedAssetName?: string;  // 피해 대상 식별
  damageDescription?: string;  // 피해 설명
  memo?: string;
  createdById?: number;
}) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/rockfalls/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create rockfall: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ [Rockfall] Created:', result);
    return result;
  } catch (error) {
    console.error('❌ [Rockfall] Failed to create:', error);
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

/**
 * 응급 영상 분석(Gemini) + (옵션) DB 저장
 * POST /api/cctv/{cctvCode}/emergency-analyze
 */
export const analyzeEmergencyVideo = async (
  cctvCode: string,
  params?: { clipUrl?: string; s3Key?: string; cameraId?: string; maxFrames?: number; saveToDb?: boolean }
): Promise<any> => {
  const q = new URLSearchParams();
  if (typeof params?.maxFrames === 'number') q.set('maxFrames', String(params.maxFrames));
  if (typeof params?.saveToDb === 'boolean') q.set('saveToDb', String(params.saveToDb));

  const body: any = {};
  if (params?.cameraId) body.camera_id = params.cameraId;
  if (params?.s3Key) body.s3_key = params.s3Key;
  if (params?.clipUrl) body.clip_url = params.clipUrl;

  const url = `${BACKEND_URL}/api/cctv/${encodeURIComponent(cctvCode)}/emergency-analyze${q.toString() ? `?${q.toString()}` : ''}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: Object.keys(body).length ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `응급 분석 실패 (${response.status})`);
  }

  return await response.json();
};

/**
 * 쓰레기 프레임(1장) Gemini 분석 + (옵션) DB 저장
 * POST /api/cctv/{cctvCode}/frame/analyze-with-gemini
 * 
 * Qwen과 동일한 multipart/form-data 방식 사용 (CloudFront 호환)
 * - 프론트에서 비디오 재생 중 버튼 클릭 시점의 프레임을 캡처하여 전송
 * - 백엔드에서 원본 프레임을 S3에 저장 (증거 보관)
 */
export const analyzeTrashFrameWithGemini = async (
  cctvCode: string,
  file: Blob,
  params?: { saveToDb?: boolean }
): Promise<any> => {
  // FormData로 전송 (Qwen과 동일한 방식)
  const formData = new FormData();
  formData.append('image', file, 'frame.jpg');
  if (params?.saveToDb !== undefined) {
    formData.append('saveToDb', String(params.saveToDb));
  }

  // multipart/form-data 요청
  const url = `${BACKEND_URL}/api/cctv/${encodeURIComponent(cctvCode)}/frame/analyze-with-gemini`;
  const res = await fetch(url, {
    method: 'POST',
    body: formData
    // Content-Type은 브라우저가 자동으로 설정 (multipart/form-data; boundary=...)
  });
  
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `쓰레기(Gemini) 분석 실패 (${res.status})`);
  }
  
  const result = await res.json();
  
  // 백엔드 응답 형식 변환
  return {
    analysis: result.analysis || result,
    frameUrl: result.frameUrl,
    overlayUrl: result.overlayUrl,
    incidentId: result.incidentId,
    incidentCode: result.incidentCode,
    savedToDb: result.savedToDb
  };
};

/**
 * 화재 분석: 여러 프레임을 Gemini로 분석
 * POST /api/cctv/{cctvCode}/frame/analyze-fire-multi
 */
export const analyzeFireFrames = async (
  cctvCode: string,
  frames: Blob[], // 4장
  params?: { saveToDb?: boolean }
): Promise<any> => {
  // FormData로 4장 전송
  const formData = new FormData();
  
  // 각 프레임을 'images' 키로 추가
  frames.forEach((frame, index) => {
    formData.append('images', frame, `frame_${index}.jpg`);
  });
  
  if (params?.saveToDb !== undefined) {
    formData.append('saveToDb', String(params.saveToDb));
  }

  const url = `${BACKEND_URL}/api/cctv/${encodeURIComponent(cctvCode)}/frame/analyze-fire-multi`;
  const res = await fetch(url, {
    method: 'POST',
    body: formData  // multipart/form-data
  });
  
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `화재 분석 실패 (${res.status})`);
  }
  
  const result = await res.json();
  
  // 백엔드 응답 형식 변환
  return {
    fireDetected: result.fireDetected || false,
    frameUrls: result.frameUrls || [],
    overlayUrls: result.overlayUrls || [],
    detectionCount: result.detectionCount || 0,
    incidentId: result.incidentId,
    incidentCode: result.incidentCode,
    savedToDb: result.savedToDb || false
  };
};

/**
 * 화재 비디오 분석 (Gemini) + (옵션) DB 저장
 * POST /api/fire-detection/analyze-video
 */
export const analyzeFireVideo = async (
  videoFile: Blob,
  params?: {
    cctvCode?: string;
    cctvId?: number;
    locationDesc?: string;
    stopOnDetect?: boolean;
    emitProgress?: boolean;
  }
): Promise<any> => {
  const q = new URLSearchParams();
  if (params?.cctvCode) q.set('cctvCode', params.cctvCode);
  if (typeof params?.cctvId === 'number') q.set('cctvId', String(params.cctvId));
  if (params?.locationDesc) q.set('locationDesc', params.locationDesc);
  if (typeof params?.stopOnDetect === 'boolean') q.set('stopOnDetect', String(params.stopOnDetect));
  if (typeof params?.emitProgress === 'boolean') q.set('emitProgress', String(params.emitProgress));

  const form = new FormData();
  form.append('file', videoFile, 'video.mp4');

  const url = `${BACKEND_URL}/api/fire-detection/analyze-video${q.toString() ? `?${q.toString()}` : ''}`;
  const res = await fetch(url, { method: 'POST', body: form });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `화재 분석 실패 (${res.status})`);
  }
  return await res.json();
};

// ==================== Notification API ====================

// 외부 연락처 API
export const getAllContacts = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/notifications/contacts`);
    if (!response.ok) throw new Error('Failed to fetch contacts');
    return response.json();
  } catch (error) {
    console.error('❌ [Notification] Failed to fetch contacts:', error);
    throw error;
  }
};

export const createContact = async (contact: {
  category: string;
  name: string;
  phone: string;
  organization: string;
}) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/notifications/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contact),
    });
    if (!response.ok) throw new Error('Failed to create contact');
    return response.json();
  } catch (error) {
    console.error('❌ [Notification] Failed to create contact:', error);
    throw error;
  }
};

export const deleteContact = async (contactId: number) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/notifications/contacts/${contactId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete contact');
  } catch (error) {
    console.error('❌ [Notification] Failed to delete contact:', error);
    throw error;
  }
};

// 알림 구독 API (직원)
export const subscribeStaff = async (userId: number, incidentType: string) => {
  try {
    const response = await fetch(
      `${BACKEND_URL}/api/notifications/subscriptions/staff?userId=${userId}&incidentType=${incidentType}`,
      { method: 'POST' }
    );
    if (!response.ok) throw new Error('Failed to subscribe staff');
    return response.json();
  } catch (error) {
    console.error('❌ [Notification] Failed to subscribe staff:', error);
    throw error;
  }
};

export const unsubscribeStaff = async (userId: number, incidentType: string) => {
  try {
    const response = await fetch(
      `${BACKEND_URL}/api/notifications/subscriptions/staff?userId=${userId}&incidentType=${incidentType}`,
      { method: 'DELETE' }
    );
    if (!response.ok) throw new Error('Failed to unsubscribe staff');
  } catch (error) {
    console.error('❌ [Notification] Failed to unsubscribe staff:', error);
    throw error;
  }
};

// 알림 구독 API (외부 연락처)
export const subscribeContact = async (contactId: number, incidentType: string) => {
  try {
    const response = await fetch(
      `${BACKEND_URL}/api/notifications/subscriptions/contact?contactId=${contactId}&incidentType=${incidentType}`,
      { method: 'POST' }
    );
    if (!response.ok) throw new Error('Failed to subscribe contact');
    return response.json();
  } catch (error) {
    console.error('❌ [Notification] Failed to subscribe contact:', error);
    throw error;
  }
};

export const unsubscribeContact = async (contactId: number, incidentType: string) => {
  try {
    const response = await fetch(
      `${BACKEND_URL}/api/notifications/subscriptions/contact?contactId=${contactId}&incidentType=${incidentType}`,
      { method: 'DELETE' }
    );
    if (!response.ok) throw new Error('Failed to unsubscribe contact');
  } catch (error) {
    console.error('❌ [Notification] Failed to unsubscribe contact:', error);
    throw error;
  }
};

// 알림 수신자 조회 API
export const getAllRecipients = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/notifications/recipients`);
    if (!response.ok) throw new Error('Failed to fetch recipients');
    return response.json();
  } catch (error) {
    console.error('❌ [Notification] Failed to fetch recipients:', error);
    throw error;
  }
};

export const getRecipientsByIncidentType = async (incidentType: string) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/notifications/recipients/incident/${incidentType}`);
    if (!response.ok) throw new Error('Failed to fetch recipients');
    return response.json();
  } catch (error) {
    console.error('❌ [Notification] Failed to fetch recipients:', error);
    throw error;
  }
};

// 활성 직원 목록 조회 API
export const getActiveStaff = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/notifications/staff/active`);
    if (!response.ok) throw new Error('Failed to fetch active staff');
    return response.json();
  } catch (error) {
    console.error('❌ [Notification] Failed to fetch active staff:', error);
    throw error;
  }
};

// ==================== 오탐처리 API ====================

/**
 * 응급 사건 오탐 처리
 * POST /api/emergency/{id}/false-positive
 */
export const markEmergencyAsFalsePositive = async (id: number, reason: string) => {
  try {
    const actorId = getCurrentUser()?.userId;
    const response = await fetch(`${BACKEND_URL}/api/emergency/${id}/false-positive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, actorId }),
    });
    if (!response.ok) throw new Error('Failed to mark emergency as false positive');
    return response.json();
  } catch (error) {
    console.error('❌ [Emergency] Failed to mark as false positive:', error);
    throw error;
  }
};

/**
 * 화재 사건 오탐 처리
 * POST /api/fire/{id}/false-positive
 */
export const markFireAsFalsePositive = async (id: number, reason: string) => {
  try {
    const actorId = getCurrentUser()?.userId;
    const response = await fetch(`${BACKEND_URL}/api/fire/${id}/false-positive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, actorId }),
    });
    if (!response.ok) throw new Error('Failed to mark fire as false positive');
    return response.json();
  } catch (error) {
    console.error('❌ [Fire] Failed to mark as false positive:', error);
    throw error;
  }
};

/**
 * 쓰레기 사건 오탐 처리
 * POST /api/trash/{id}/false-positive
 */
export const markTrashAsFalsePositive = async (id: number, reason: string) => {
  try {
    const actorId = getCurrentUser()?.userId;
    const response = await fetch(`${BACKEND_URL}/api/trash/${id}/false-positive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, actorId }),
    });
    if (!response.ok) throw new Error('Failed to mark trash as false positive');
    return response.json();
  } catch (error) {
    console.error('❌ [Trash] Failed to mark as false positive:', error);
    throw error;
  }
};

/**
 * 전체현황 사건 오탐 처리
 * POST /api/all-incidents/{id}/false-positive
 */
export const markIncidentAsFalsePositive = async (id: number, reason: string) => {
  try {
    const actorId = getCurrentUser()?.userId;
    const response = await fetch(`${BACKEND_URL}/api/all-incidents/${id}/false-positive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, actorId }),
    });
    if (!response.ok) throw new Error('Failed to mark incident as false positive');
    return response.json();
  } catch (error) {
    console.error('❌ [AllIncidents] Failed to mark as false positive:', error);
    throw error;
  }
};