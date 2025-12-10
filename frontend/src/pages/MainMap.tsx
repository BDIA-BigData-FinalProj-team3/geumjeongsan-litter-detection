import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, User, LogOut, ChevronDown, ChevronUp, Flame, Trash2, Camera, Wrench, X, Plus, Minus, Download, Bell, AlertCircle, Move, MessageSquare, Eye, Radar, Video, Plane, Activity, Home, Grid3x3, Video as VideoIcon, Heart, FileText, Edit2, Save, Clock, Wind, MapPin, Map as MapIcon, HeartPulse } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import LogoutButton from '../components/LogoutButton';
import MyPageButton from '../components/MyPageButton';
import DetectionButton from '../components/DetectionButton';
import RiskMapButton from '../components/RiskMapButton';
import CCTVButton from '../components/CCTVButton';
import HelicopterButton from '../components/HelicopterButton';
import HamburgerMenuButton from '../components/HamburgerMenuButton';
import NotificationBellButton from '../components/NotificationBellButton';
import EmergencyMarkerIcon from '../components/EmergencyMarkerIcon';
import TrashMarkerIcon from '../components/TrashMarkerIcon';
import CCTVOnMarkerIcon from '../components/CCTVOnMarkerIcon';
import CCTVOffMarkerIcon from '../components/CCTVOffMarkerIcon';
import { useIncidentCount } from '../contexts/IncidentCountContext';
import { getFireNotifications, getEmergencyNotifications, getTrashNotifications, getHelicopterLocations, getHotspots, getCCTVVideoClips, getCCTVMedia, getCCTVList, getActiveIncidents, getIncidentMarkers, getCCTVStatus, getMainMapWeather, getCCTVIncidents, getTrails, getRiskMapHeatmap, getFireDetail, getEmergencyDetail, getTrashDetail, type RiskMapHeatmapItem } from '../services/api';
import type { VideoClip } from '../services/mock';
import type { CCTVMedia } from '../services/api';
import type { CCTVMarker as BackendCCTVMarker } from '../services/common';
import HotspotFireIcon from '../components/HotspotFireIcon';
import HotspotEmergencyIcon from '../components/HotspotEmergencyIcon';
import HotspotTrashIcon from '../components/HotspotTrashIcon';
import mapImage from 'figma:asset/e2eee362b605222576aa0e01e59c017ebe22e4e9.png';
import logoIcon from 'figma:asset/0abed642df6551dc36712b1dfc4c5cda079eed1a.png';
import headerLogo from 'figma:asset/14f294982efa79d8462919ccdda7d0c0c674d095.png';

// Leaflet 추가
import { MapContainer, TileLayer, Marker, Popup as LeafletPopup, Polyline, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import ReactDOMServer from 'react-dom/server';

interface MainMapProps {
  onNavigate: (screen: string) => void;
}

// Map-compatible CCTV marker format (converted from backend format)
interface MapCCTVMarker {
  id: string;
  cctvId: number; // Backend ID
  cctvCode: string;
  x: number; // Percentage for map display
  y: number; // Percentage for map display
  geom?: { // Actual coordinates from DB
    x: number; // longitude
    y: number; // latitude
  };
  location: string;
  locationDescription?: string; // 상세 위치 설명
  power: 'on' | 'off';
  healthStatus: 'NORMAL' | 'NEED_CHECK' | 'OFFLINE'; // 헬스 상태
  incidents: {
    fire?: number;
    emergency?: number;
    trash?: number;
  };
}

interface CCTVPopup {
  cctv: MapCCTVMarker;
  x: number;
  y: number;
}

interface DetectionPopup {
  marker: MapCCTVMarker;
  incidents: Array<{
    id: number;
    type: 'fire' | 'emergency' | 'trash';
    time: string;
    confidence: string;
    incidentCode?: string;
    sourceType?: string;
    locationDesc?: string;
  }>;
}

// 상세보기 팝업용 인터페이스
interface FireDetail {
  id: number;
  accidentCode: string;
  cctvId: string;
  time: string;
  status: string;
  severity: string;
  windSpeed: string;
  handler: string;
  location?: string;
  detectionBasis?: string;
  responseTime?: string;
  duration?: string;
  transferHospital?: string;
  note?: string;
}

interface EmergencyDetail {
  id: number;
  accidentCode: string;
  type: string;
  cctvId: string;
  time: string;
  status: string;
  severity: string;
  handler: string;
  location?: string;
  detectionBasis?: string;
  responseTime?: string;
  duration?: string;
  patientName?: string;
  gender?: string;
  transferHospital?: string;
  note?: string;
}

interface TrashDetail {
  id: number;
  accidentCode: string;
  cctvId: string;
  time: string;
  status: string;
  severity: string;
  type: string;
  handler: string;
  location?: string;
  detectionBasis?: string;
  responseTime?: string;
  duration?: string;
  note?: string;
}

const RockIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M3 20 L8 10 L12 14 L16 6 L21 20 Z" />
  </svg>
);

const SeismicWaveIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2 12 L6 8 L10 16 L14 4 L18 14 L22 12" />
  </svg>
);

const FireMapMarker = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 96.72 125.04" className={className} style={{ filter: 'drop-shadow(7px 7px 5px rgba(146, 146, 146, 0.75))' }}>
    <g>
      <path fillRule="evenodd" clipRule="evenodd" fill="#FFFFFF" d="M74.481,41.241c0,18.358-33.24,61.788-33.24,61.788
        S8,59.6,8,41.241C8,22.882,22.883,8,41.241,8S74.481,22.882,74.481,41.241z"/>
    </g>
    <g>
      <circle fill="#FF5A5A" cx="41.241" cy="40.43" r="27.834"/>
      <path fillRule="evenodd" clipRule="evenodd" fill="#FFFFFF" d="M39.315,62.526c-1.129-0.265-2.201-0.461-3.24-0.768
        c-3.325-0.981-6.234-2.669-8.475-5.351c-3.346-4.005-3.923-8.571-2.506-13.47c0.9-3.116,2.497-5.878,4.46-8.513
        c1.253,1.481,2.71,2.619,4.431,3.455c0.192-1.104,0.336-2.173,0.57-3.221c0.486-2.171,1.583-4.062,2.759-5.922
        c0.688-1.088,1.359-2.202,1.874-3.377c0.9-2.051,0.513-4.109-0.238-6.125c-0.096-0.258-0.192-0.516-0.286-0.775
        c-0.005-0.014,0.018-0.037,0.061-0.123c0.323,0.133,0.664,0.25,0.983,0.41c5.765,2.889,9.475,7.502,11.36,13.621
        c0.751,2.437,1.179,4.941,1.136,7.492c-0.02,1.173,1.105,1.772,1.99,1.183c0.793-0.528,1.469-1.236,2.168-1.895
        c0.28-0.264,0.485-0.607,0.835-1.056c0.18,0.884,0.358,1.626,0.478,2.377c0.55,3.489,0.664,6.97-0.154,10.445
        c-1.42,6.037-6.055,10.397-12.136,11.284c0.237-0.108,0.475-0.216,0.713-0.324c2.647-1.206,4.573-3.046,5.035-6.039
        c0.138-0.891,0.072-1.846-0.075-2.742c-0.33-1.998-1.318-3.71-2.477-5.282c-0.792,0.606-1.55,1.186-2.468,1.888
        c-0.06-2.291-1.013-4.01-2.138-5.657c-0.935-1.371-1.033-2.822-0.469-4.35c0.046-0.126,0.088-0.254,0.132-0.381
        c-0.041-0.056-0.082-0.111-0.123-0.167c-0.83,0.53-1.714,0.993-2.482,1.603c-2.485,1.972-3.836,4.612-4.328,7.712
        c-0.104,0.658-0.141,1.328-0.183,1.994c-0.052,0.837-0.525,1.109-1.242,0.667c-0.27-0.167-0.502-0.402-0.73-0.629
        c-0.209-0.209-0.389-0.448-0.732-0.852c-0.151,1.162-0.342,2.141-0.396,3.126c-0.17,3.073,0.414,5.919,2.922,7.986
        C37.194,61.451,38.253,61.901,39.315,62.526z"/>
    </g>
  </svg>
);

// 줌 레벨 동기화 컴포넌트
function ZoomController({ zoom, onZoomChange }: { zoom: number; onZoomChange: (zoom: number) => void }) {
  const map = useMap();
  
  // 버튼으로 줌 변경 시 지도에 반영
  useEffect(() => {
    if (map.getZoom() !== zoom) {
      map.setZoom(zoom);
    }
  }, [zoom, map]);
  
  // 휠/더블클릭 등으로 줌 변경 시 상태에 반영
  useMapEvents({
    zoomend: () => {
      const newZoom = map.getZoom();
      if (newZoom !== zoom) {
        onZoomChange(newZoom);
      }
    },
  });
  
  return null;
}

export default function MainMap({ onNavigate }: MainMapProps) {
  const navigate = useNavigate();
  const { setEmergencyCount, setFireCount, setTrashCount, completedIncidents, addCompletedIncident, setAllNotifications } = useIncidentCount();
  
  // 세션 스토리지를 사용하여 첫 방문인지 확인
  const isFirstVisit = sessionStorage.getItem('visited-mainmap') === null;
  const [sidebarOpen, setSidebarOpen] = useState(!isFirstVisit);
  
  // 첫 방문 플래그 설정
  React.useEffect(() => {
    if (isFirstVisit) {
      sessionStorage.setItem('visited-mainmap', 'true');
    }
  }, [isFirstVisit]);
  
  const [activeView, setActiveView] = useState<'default' | 'detections' | 'cctv' | 'helicopter' | 'risk-map'>('detections');
  const [showAllDetections, setShowAllDetections] = useState(true);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<'fire' | 'emergency' | 'trash'>>(new Set(['fire', 'emergency', 'trash']));
  const [hotspotFilter, setHotspotFilter] = useState<'all' | 'fire' | 'emergency' | 'trash'>('all');
  
  // 위험지도 관련 state
  const [riskMapPeriod, setRiskMapPeriod] = useState<'30d' | '7d' | 'today'>('30d');
  const [riskMapType, setRiskMapType] = useState<'all' | 'fire' | 'emergency' | 'trash'>('all');
  const [riskMapHeatmap, setRiskMapHeatmap] = useState<RiskMapHeatmapItem[]>([]);
  const [hoveredTrailSegment, setHoveredTrailSegment] = useState<{
    entityId: number;
    entityName: string;
    trailName?: string;
    fireCount: number;
    emergencyCount: number;
    trashCount: number;
    x: number;
    y: number;
  } | null>(null);
  const trailHeatmapMap = React.useMemo(() => {
    const map = new Map<number, RiskMapHeatmapItem>();
    riskMapHeatmap.forEach(item => {
      if (item.entityType === 'TRAIL_SEGMENT') {
        map.set(item.entityId, item);
      }
    });
    return map;
  }, [riskMapHeatmap]);
  const [hoveredHotspot, setHoveredHotspot] = useState<{ 
    cctvId: string; 
    location: string; 
    fireCount: number;
    emergencyCount: number;
    trashCount: number;
    x: number; 
    y: number;
  } | null>(null);
  
  // 공통: 백엔드에서 내려오는 [lng, lat] 배열을 Leaflet용 [lat, lng]로 변환
  const toLeafletPositions = (coords: number[][]) =>
    coords.map(([lng, lat]) => [lat, lng] as [number, number]);
  
  // 기간별 히트맵 색상 함수
  const getHeatmapColorByPeriod = (count: number, period: string) => {
    if (period === '30d') {
      // 최근 30일: 0~2 파랑, 3~7 초록, 8~12 노랑, 13~17 주황, 18+ 빨강
      if (count === 0 || count <= 2) return '#3B82F6'; // 파랑
      if (count <= 7) return '#10B981'; // 초록
      if (count <= 12) return '#FBBF24'; // 노랑
      if (count <= 17) return '#F97316'; // 주황
      return '#EF4444'; // 빨강 (18+)
    } else if (period === '7d') {
      // 최근 7일: 0 파랑, 1~4 초록, 5~8 노랑, 9~12 주황, 13+ 빨강
      if (count === 0) return '#3B82F6'; // 파랑
      if (count <= 4) return '#10B981'; // 초록
      if (count <= 8) return '#FBBF24'; // 노랑
      if (count <= 12) return '#F97316'; // 주황
      return '#EF4444'; // 빨강 (13+)
    } else {
      // 당일: 0 파랑, 1~3 초록, 4~6 노랑, 7~9 주황, 10+ 빨강
      if (count === 0) return '#3B82F6'; // 파랑
      if (count <= 3) return '#10B981'; // 초록
      if (count <= 6) return '#FBBF24'; // 노랑
      if (count <= 9) return '#F97316'; // 주황
      return '#EF4444'; // 빨강 (10+)
    }
  };
  const [hoveredTrailId, setHoveredTrailId] = useState<number | null>(null);
  const [selectedCCTV, setSelectedCCTV] = useState<CCTVPopup | null>(null);
  const [selectedDetection, setSelectedDetection] = useState<DetectionPopup | null>(null);
  const [zoomLevel, setZoomLevel] = useState(12.5);
  const [showHelicopters, setShowHelicopters] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationTab, setNotificationTab] = useState<'all' | 'fire' | 'emergency' | 'trash'>('all');
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollContainerHeight, setScrollContainerHeight] = useState(0);
  const [scrollContentHeight, setScrollContentHeight] = useState(0);
  const notificationListRef = React.useRef<HTMLDivElement>(null);
  const filterDropdownButtonRef = React.useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [selectedNotification, setSelectedNotification] = useState<{
    cctvId: string;
    type: 'fire' | 'emergency' | 'trash';
    location: string;
    time: string;
    confidence: string;
  } | null>(null);
  const [highlightedCCTV, setHighlightedCCTV] = useState<string | null>(null);
  const [videoDetailPopup, setVideoDetailPopup] = useState<{
    cctvId: string;
    incidentId?: string;
    incidentCode?: string;
    location: string;
    time: string;
    confidence: string;
    type: 'fire' | 'emergency' | 'trash';
  } | null>(null);
  
  // 개별 사건 상세보기 팝업 State
  const [incidentDetailPopup, setIncidentDetailPopup] = useState<{
    type: 'fire';
    detail: FireDetail;
  } | {
    type: 'emergency';
    detail: EmergencyDetail;
  } | {
    type: 'trash';
    detail: TrashDetail;
  } | null>(null);
  
  const [isEditingIncident, setIsEditingIncident] = useState(false);
  const [editedIncidentDetail, setEditedIncidentDetail] = useState<FireDetail | EmergencyDetail | TrashDetail | null>(null);
  
  // 오탐 처리 모달 State
  const [showFalseReportModal, setShowFalseReportModal] = useState(false);
  const [falseReportReason, setFalseReportReason] = useState('');
  
  const [videoClips, setVideoClips] = useState<VideoClip[]>([]);
  const [selectedVideoClip, setSelectedVideoClip] = useState<VideoClip | null>(null);
  
  const [cctvMediaList, setCctvMediaList] = useState<CCTVMedia[]>([]);
  const [weather, setWeather] = useState<any>(null);

  // videoDetailPopup이 열릴 때 영상 클립 로드
  useEffect(() => {
    const loadVideoClips = async () => {
      if (videoDetailPopup) {
        const clips = await getCCTVVideoClips(videoDetailPopup.cctvId);
        setVideoClips(clips);
      } else {
        setVideoClips([]);
      }
    };
    
    loadVideoClips();
  }, [videoDetailPopup]);

  // selectedCCTV가 변경될 때 영상 리스트 로드
  useEffect(() => {
    const loadCCTVMedia = async () => {
      if (selectedCCTV) {
        // 백엔드 CCTV ID 사용
        const cctvId = selectedCCTV.cctv.cctvId;
        if (cctvId) {
          const media = await getCCTVMedia(cctvId, 'video');
          setCctvMediaList(media);
        } else {
          setCctvMediaList([]);
        }
      } else {
        setCctvMediaList([]);
      }
    };
    
    loadCCTVMedia();
  }, [selectedCCTV]);

  // 초기 알림 데이터 - API에서 가져오기
  const [fireNotifications, setFireNotifications] = useState<Array<{ id: string; cctvId: string; location: string; time: string; confidence: string; timeAgo: string; timestamp: number; type: 'fire' }>>([]);
  const [emergencyNotifications, setEmergencyNotifications] = useState<Array<{ id: string; cctvId: string; location: string; time: string; confidence: string; timeAgo: string; timestamp: number; type: 'emergency' }>>([]);
  const [trashNotifications, setTrashNotifications] = useState<Array<{ id: string; cctvId: string; location: string; time: string; confidence: string; timeAgo: string; timestamp: number; type: 'trash' }>>([]);
  
  // API에서 알림 데이터 로드
  useEffect(() => {
    const loadNotifications = async () => {
      const [fire, emergency, trash] = await Promise.all([
        getFireNotifications(),
        getEmergencyNotifications(),
        getTrashNotifications(),
      ]);
      
      const initialFireNotifications = fire.filter(n => !completedIncidents.has(n.cctvId));
      const initialEmergencyNotifications = emergency.filter(n => !completedIncidents.has(n.cctvId));
      const initialTrashNotifications = trash.filter(n => !completedIncidents.has(n.cctvId));
      
      setFireNotifications(initialFireNotifications);
      setEmergencyNotifications(initialEmergencyNotifications);
      setTrashNotifications(initialTrashNotifications);
    };
    
    loadNotifications();
  }, [completedIncidents]);

  // 알림 개수 변경 시 카운트 업데이트 및 전체 알림 데이터 업데이트
  useEffect(() => {
    setFireCount(fireNotifications.length);
    setEmergencyCount(emergencyNotifications.length);
    setTrashCount(trashNotifications.length);
    
    // 모든 알림을 하나의 배열로 합치고 타입 정보 추가
    const allNotifs = [
      ...fireNotifications.map(n => ({ ...n, type: 'fire' as const })),
      ...emergencyNotifications.map(n => ({ ...n, type: 'emergency' as const })),
      ...trashNotifications.map(n => ({ ...n, type: 'trash' as const }))
    ];
    setAllNotifications(allNotifs);
  }, [fireNotifications, emergencyNotifications, trashNotifications, setFireCount, setEmergencyCount, setTrashCount, setAllNotifications]);

  const [removedCCTVs, setRemovedCCTVs] = useState<Set<string>>(new Set());

  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [popupPositions, setPopupPositions] = useState({
    notification: { x: window.innerWidth / 2 - 250, y: window.innerHeight / 2 - 200 },
    detection: { x: window.innerWidth / 2 - 250, y: window.innerHeight / 2 - 200 },
    cctv: { x: window.innerWidth / 2 - 200, y: window.innerHeight / 2 - 150 },
  });

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragging) return;
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    setPopupPositions(prev => ({ ...prev, [dragging]: { x: newX, y: newY } }));
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  // 개별 사건 상세보기 관련 핸들러
  const handleIncidentFieldChange = (field: string, value: string) => {
    if (editedIncidentDetail) {
      setEditedIncidentDetail({ ...editedIncidentDetail, [field]: value } as any);
    }
  };

  const handleIncidentEditClick = () => {
    if (incidentDetailPopup) {
      setIsEditingIncident(true);
      setEditedIncidentDetail({ ...incidentDetailPopup.detail });
    }
  };

  const handleIncidentSave = () => {
    if (!editedIncidentDetail || !incidentDetailPopup) return;
    
    // 여기서 실제로는 API를 호출하여 저장해야 함
    // 지금은 상태만 업데이트
    setIncidentDetailPopup({
      ...incidentDetailPopup,
      detail: editedIncidentDetail as any,
    });
    setIsEditingIncident(false);
    setEditedIncidentDetail(null);
  };

  const handleIncidentCancel = () => {
    setIsEditingIncident(false);
    setEditedIncidentDetail(null);
  };

  // 스크롤 컨테이너 크기 초기화
  useEffect(() => {
    if (notificationListRef.current && showNotifications) {
      const updateScrollSize = () => {
        if (notificationListRef.current) {
          setScrollContainerHeight(notificationListRef.current.clientHeight);
          setScrollContentHeight(notificationListRef.current.scrollHeight);
        }
      };
      updateScrollSize();
      // ResizeObserver로 크기 변경 감지
      const resizeObserver = new ResizeObserver(updateScrollSize);
      if (notificationListRef.current) {
        resizeObserver.observe(notificationListRef.current);
      }
      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [showNotifications, notificationTab, fireNotifications, emergencyNotifications, trashNotifications]);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, dragOffset]);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showFilterDropdown && filterDropdownButtonRef.current && !filterDropdownButtonRef.current.contains(event.target as Node)) {
        const dropdownElement = document.querySelector('[data-filter-dropdown]');
        if (dropdownElement && !dropdownElement.contains(event.target as Node)) {
          setShowFilterDropdown(false);
        }
      }
    };

    if (showFilterDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showFilterDropdown]);

  const startDrag = (popupType: string, e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setDragging(popupType);
  };

  // CCTV 마커 및 헬리콥터 위치 - API에서 가져오기
  const [cctvMarkers, setCctvMarkers] = useState<MapCCTVMarker[]>([]);
  const [helicopterLocations, setHelicopterLocations] = useState<Array<{ id: string; x: number; y: number }>>([]);
  const [hotspotLocations, setHotspotLocations] = useState<Array<{ cctvId: string; x: number; y: number; location: string; count: number; type: 'fire' | 'emergency' | 'trash' }>>([]);
  const [trails, setTrails] = useState<any[]>([]);
  
  // Convert backend CCTV data to map-compatible format
  const convertToMapMarker = (backendCCTV: BackendCCTVMarker): MapCCTVMarker => {
    // 지도 이미지(금정산)의 대략적인 Bounding Box (추정치)
    // 실제 지도 이미지의 경계 좌표를 정확히 맞춰야 마커가 제 위치에 뜸
    // TODO: 정확한 지도 Bounding Box 좌표로 교체 필요
    const MAP_BOUNDS = {
      minLon: 129.05,  // 서쪽 끝 (금정산 실제 좌표)
      maxLon: 129.075, // 동쪽 끝
      minLat: 35.225,  // 남쪽 끝
      maxLat: 35.245   // 북쪽 끝
    };

    // 위경도 -> 화면 % 좌표 변환 (0 ~ 100%)
    let x = ((backendCCTV.longitude - MAP_BOUNDS.minLon) / (MAP_BOUNDS.maxLon - MAP_BOUNDS.minLon)) * 100;
    let y = 100 - ((backendCCTV.latitude - MAP_BOUNDS.minLat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * 100;

    // 범위 벗어나면 강제 클램핑 (화면 밖으로 안 나가게)
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));
    
    // Determine incidents from lastIncidentType
    const incidents: { fire?: number; emergency?: number; trash?: number } = {};
    if (backendCCTV.lastIncidentType === 'fire') incidents.fire = backendCCTV.incidentCount || 1;
    if (backendCCTV.lastIncidentType === 'emergency') incidents.emergency = backendCCTV.incidentCount || 1;
    if (backendCCTV.lastIncidentType === 'trash') incidents.trash = backendCCTV.incidentCount || 1;
    
    return {
      id: backendCCTV.cctvCode,
      cctvId: backendCCTV.id,
      cctvCode: backendCCTV.cctvCode,
      x: x, 
      y: y,
      geom: { // Actual DB coordinates for Leaflet
        x: backendCCTV.longitude,
        y: backendCCTV.latitude
      },
      location: backendCCTV.locationDesc,
      locationDescription: backendCCTV.locationDesc, 
      power: backendCCTV.powerStatus,
      // 백엔드 MapCCTV 엔티티의 필드와 연동 (api.ts에서 매핑 필요하지만 일단 기본 처리)
      healthStatus: (backendCCTV as any).healthStatus || 'NORMAL', 
      incidents,
    };
  };
  
  // API에서 CCTV 마커, 헬리콥터 위치, 날씨 로드
  useEffect(() => {
    const loadMapData = async () => {
      try {
        console.log("🚀 [MainMap] Loading Map Data...");
        const [incidentMarkers, helicopters, weatherData] = await Promise.all([
          getIncidentMarkers(), // ✅ 새 API: CCTV별로 그룹화된 데이터
          getHelicopterLocations(),
          getMainMapWeather(), // ✅ 날씨 정보
        ]);
        
        console.log("✅ [MainMap] Loaded Incident Markers:", incidentMarkers);

        if (!incidentMarkers || incidentMarkers.length === 0) {
          console.warn("⚠️ [MainMap] No incident marker data received from API.");
          return;
        }

        // ✅ VIEW 데이터를 맵 마커 형식으로 변환 (그룹화 불필요!)
        // 사건이 있는 마커만 필터링 (unresolvedCount > 0 또는 사건 개수 합 > 0)
        const markersWithIncidents = incidentMarkers
          .filter((marker: any) => {
            const hasIncidents = 
              (marker.unresolvedCount && marker.unresolvedCount > 0) ||
              ((marker.fireCount || 0) + (marker.emergencyCount || 0) + (marker.trashCount || 0) > 0);
            return hasIncidents;
          })
          .map((marker: any) => {
            // PostGIS geometry 파싱 (GeomDto format: { x, y })
            const longitude = marker.geom?.x || 0;  // ✅ 직접 x 접근
            const latitude = marker.geom?.y || 0;   // ✅ 직접 y 접근
            
            // 위도/경도 → 백분율 변환 (금정산 범위 기준)
            const x = ((longitude - 129.0) / (129.1 - 129.0)) * 100;
            const y = ((35.3 - latitude) / (35.3 - 35.2)) * 100;
            
            console.log(`📍 [Marker] ${marker.cctvCode}: (${longitude}, ${latitude}) -> (${x.toFixed(2)}%, ${y.toFixed(2)}%)`);
            
            return {
              id: marker.cctvCode,
              cctvId: marker.cctvId,
              cctvCode: marker.cctvCode,
              location: marker.cctvAddress || '위치 미상',
              x: x,
              y: y,
              geom: {
                x: longitude,
                y: latitude,
              },
              power: 'on' as const,
              healthStatus: 'NORMAL' as const,
              incidents: {
                fire: marker.fireCount || 0,
                emergency: marker.emergencyCount || 0,
                trash: marker.trashCount || 0,
              },
            };
          });
        
        console.log("🗺️ [MainMap] Final Map Markers:", markersWithIncidents);
        setCctvMarkers(markersWithIncidents);
        setHelicopterLocations(helicopters);
        setWeather(weatherData);
      } catch (error) {
        console.error("❌ [MainMap] Error loading map data:", error);
      }
    };
    
    loadMapData();
  }, []);

  // 등산로 데이터 로드
  useEffect(() => {
    const loadTrails = async () => {
      try {
        console.log("🥾 [MainMap] Loading Trail Segments...");
        const trailData = await getTrails();
        console.log("✅ [MainMap] Loaded Trails:", trailData);
        setTrails(trailData);
      } catch (error) {
        console.error("❌ [MainMap] Error loading trails:", error);
      }
    };
    
    loadTrails();
  }, []);

  // activeView에 따라 다른 마커 데이터 로드
  useEffect(() => {
    const loadViewData = async () => {
      if (activeView === 'cctv') {
        // 실시간 CCTV 상태 로드
        try {
          console.log("📹 [MainMap] Loading CCTV Status...");
          const cctvStatuses = await getCCTVStatus();
          
          console.log("✅ [MainMap] Loaded CCTV Status:", cctvStatuses);
          
          if (!cctvStatuses || cctvStatuses.length === 0) {
            console.warn("⚠️ [MainMap] No CCTV status data received.");
            return;
          }
          
          // ✅ VIEW 데이터를 맵 마커 형식으로 변환
          const statusMarkers = cctvStatuses.map((status: any) => {
            const longitude = status.geom?.x || 0;
            const latitude = status.geom?.y || 0;
            
            // 위도/경도 → 백분율 변환
            const x = ((longitude - 129.0) / (129.1 - 129.0)) * 100;
            const y = ((35.3 - latitude) / (35.3 - 35.2)) * 100;
            
            console.log(`📹 [CCTV] ${status.cctvCode}: ${status.displayStatus} (${longitude}, ${latitude})`);
            
            return {
              id: status.cctvCode,
              cctvId: status.cctvId,
              cctvCode: status.cctvCode,
              location: status.cctvAddress || '위치 미상',
              x: x,
              y: y,
              geom: {
                x: longitude,
                y: latitude,
              },
              power: status.powerStatus?.toLowerCase() || 'off',
              healthStatus: status.healthStatus || 'OFFLINE',
              displayStatus: status.displayStatus,  // ⭐ OFF / NEED_CHECK / ON
              lastHeartbeat: status.lastHeartbeat,
              lastIncidentId: status.lastIncidentId,
              lastIncidentType: status.lastIncidentType,
              lastIncidentAt: status.lastIncidentAt,
              incidents: {},  // 실시간 CCTV는 사건 카운트 불필요
            };
          });
          
          console.log("🗺️ [MainMap] CCTV Status Markers:", statusMarkers);
          setCctvMarkers(statusMarkers);
        } catch (error) {
          console.error("❌ [MainMap] Error loading CCTV status:", error);
        }
      } else if (activeView === 'detections') {
        // 전체탐지 마커 로드 (이미 초기 로드 시 로드되었지만, 탭 전환 시 재로드)
        try {
          console.log("🚀 [MainMap] Reloading Incident Markers...");
          const incidentMarkers = await getIncidentMarkers();
          
          if (!incidentMarkers || incidentMarkers.length === 0) {
            console.warn("⚠️ [MainMap] No incident marker data received.");
            return;
          }
          
          // 사건이 있는 마커만 필터링 (unresolvedCount > 0 또는 사건 개수 합 > 0)
          const markersWithIncidents = incidentMarkers
            .filter((marker: any) => {
              const hasIncidents = 
                (marker.unresolvedCount && marker.unresolvedCount > 0) ||
                ((marker.fireCount || 0) + (marker.emergencyCount || 0) + (marker.trashCount || 0) > 0);
              return hasIncidents;
            })
            .map((marker: any) => {
              const longitude = marker.geom?.x || 0;
              const latitude = marker.geom?.y || 0;
              
              const x = ((longitude - 129.0) / (129.1 - 129.0)) * 100;
              const y = ((35.3 - latitude) / (35.3 - 35.2)) * 100;
              
              return {
                id: marker.cctvCode,
                cctvId: marker.cctvId,
                cctvCode: marker.cctvCode,
                location: marker.cctvAddress || '위치 미상',
                x: x,
                y: y,
                geom: {
                  x: longitude,
                  y: latitude,
                },
                power: 'on' as const,
                healthStatus: 'NORMAL' as const,
                incidents: {
                  fire: marker.fireCount || 0,
                  emergency: marker.emergencyCount || 0,
                  trash: marker.trashCount || 0,
                },
              };
            });
          
          console.log("🗺️ [MainMap] Incident Markers Reloaded:", markersWithIncidents);
          setCctvMarkers(markersWithIncidents);
        } catch (error) {
          console.error("❌ [MainMap] Error reloading incident markers:", error);
        }
      }
    };
    
    loadViewData();
  }, [activeView]);

  // 사고다발구간 데이터 로드 (기존)
  useEffect(() => {
    const loadHotspots = async () => {
      if (activeView === 'risk-map') {
        const [fire, emergency, trash] = await Promise.all([
          getHotspots('fire'),
          getHotspots('emergency'),
          getHotspots('trash'),
        ]);
        
        const allHotspots = [
          ...fire.map(h => ({ ...h, type: 'fire' as const })),
          ...emergency.map(h => ({ ...h, type: 'emergency' as const })),
          ...trash.map(h => ({ ...h, type: 'trash' as const })),
        ];
        
        setHotspotLocations(allHotspots);
      }
    };
    
    loadHotspots();
  }, [activeView]);

  // 위험지도 히트맵 데이터 로드
  useEffect(() => {
    const loadRiskMapHeatmap = async () => {
      if (activeView === 'risk-map') {
        try {
          console.log('🔥 [RiskMap] Loading heatmap data...', { period: riskMapPeriod, type: riskMapType });
          const data = await getRiskMapHeatmap(riskMapPeriod, riskMapType);
          console.log('✅ [RiskMap] Loaded heatmap:', data.length, 'items');
          console.log('📊 [RiskMap] Data breakdown:', {
            trailSegments: data.filter(d => d.entityType === 'TRAIL_SEGMENT').length,
            cctv: data.filter(d => d.entityType === 'CCTV').length,
            withFire: data.filter(d => (d.fireCount || 0) > 0).length,
            withEmergency: data.filter(d => (d.emergencyCount || 0) > 0).length,
            withTrash: data.filter(d => (d.trashCount || 0) > 0).length,
          });
          
          // 데이터 샘플 로깅 (첫 번째 항목)
          if (data.length > 0) {
            const sample = data[0];
            console.log('📋 [RiskMap] Sample data:', {
              entityType: sample.entityType,
              entityId: sample.entityId,
              entityName: sample.entityName,
              geom: sample.geom,
              fireCount: sample.fireCount,
              emergencyCount: sample.emergencyCount,
              trashCount: sample.trashCount,
              totalCount: sample.totalCount,
            });
          }
          
          setRiskMapHeatmap(data);
        } catch (error) {
          console.error('❌ [RiskMap] Error loading heatmap:', error);
          setRiskMapHeatmap([]);
        }
      } else {
        // 위험지도 모드가 아닐 때는 데이터 초기화
        setRiskMapHeatmap([]);
      }
    };
    
    loadRiskMapHeatmap();
  }, [activeView, riskMapPeriod, riskMapType]);

  const getPriorityIncident = (incidents: MapCCTVMarker['incidents']) => {
    if (incidents.fire) return { type: 'fire' as const, count: incidents.fire };
    if (incidents.emergency) return { type: 'emergency' as const, count: incidents.emergency };
    if (incidents.trash) return { type: 'trash' as const, count: incidents.trash };
    return null;
  };

  const getFilteredMarkers = () => {
    if (!showAllDetections || activeFilters.size === 0) return [];
    // 처리완료된 사건의 CCTV는 제외
    const activeMarkers = cctvMarkers.filter(marker => !completedIncidents.has(marker.id));
    
    // 모든 필터가 활성화되어 있으면 모든 마커 표시
    if (activeFilters.size === 3) return activeMarkers;
    
    // 선택된 필터에 해당하는 사건이 있는 마커만 표시
    return activeMarkers.filter(marker => {
      return (activeFilters.has('fire') && marker.incidents.fire) ||
             (activeFilters.has('emergency') && marker.incidents.emergency) ||
             (activeFilters.has('trash') && marker.incidents.trash);
    });
  };

  const handleFilterSelect = (filter: 'all' | 'fire' | 'emergency' | 'trash') => {
    if (filter === 'all') {
      // 전체가 이미 활성화된 상태면 모두 비활성화, 아니면 모두 활성화
      if (activeFilters.size === 3) {
        setActiveFilters(new Set());
        setShowAllDetections(false);
      } else {
        setActiveFilters(new Set(['fire', 'emergency', 'trash']));
        setShowAllDetections(true);
      }
    } else {
      const newFilters = new Set(activeFilters);
      if (newFilters.has(filter)) {
        // 이미 활성화되어 있으면 제거
        newFilters.delete(filter);
      } else {
        // 비활성화되어 있으면 추가
        newFilters.add(filter);
      }
      setActiveFilters(newFilters);
      setShowAllDetections(newFilters.size > 0);
    }
    setActiveView('detections');
  };

  // 드롭다운 버튼 위치 계산
  useEffect(() => {
    if (showFilterDropdown && filterDropdownButtonRef.current) {
      const rect = filterDropdownButtonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8, // 버튼 아래 8px
        left: rect.left
      });
    }
  }, [showFilterDropdown, sidebarOpen]);

  const handleMarkerClick = async (marker: MapCCTVMarker, event: React.MouseEvent | any) => {
    if (activeView === 'cctv') {
      // Leaflet 마커 클릭 시 clientX/clientY 사용
      const x = event.clientX || (event.currentTarget ? event.currentTarget.getBoundingClientRect().left + event.currentTarget.getBoundingClientRect().width / 2 : 0);
      const y = event.clientY || (event.currentTarget ? event.currentTarget.getBoundingClientRect().top : 0);
      setSelectedCCTV({ cctv: marker, x, y });
    } else if (activeView === 'detections' || activeView === 'risk-map') {
      // 즉시 팝업 표시 (로딩 상태)
      setSelectedDetection({ marker: marker, incidents: [] });
      
      // 백그라운드에서 API 호출 (비동기)
      getCCTVIncidents(marker.cctvId).then((cctvIncidents) => {
        // 디버깅: API 응답 확인
        console.log('🔍 [MainMap] API Response:', cctvIncidents);
        console.log('🔍 [MainMap] First incident:', cctvIncidents[0]);
        
        // 백엔드 응답 형식을 프론트엔드 형식으로 변환
        const incidents: Array<{ 
          id: number;
          type: 'fire' | 'emergency' | 'trash'; 
          time: string; 
          confidence: string;
          incidentCode?: string;
          sourceType?: string;
          locationDesc?: string;
        }> = 
          cctvIncidents.map((incident: any) => {
            // 디버깅: 각 incident 확인
            console.log('🔍 [MainMap] Processing incident:', {
              id: incident.id,
              incidentCode: incident.incidentCode,
              incidentType: incident.incidentType,
              allKeys: Object.keys(incident)
            });
            
            // incidentType을 소문자로 변환 (FIRE -> fire, EMERGENCY -> emergency, TRASH -> trash)
            const type = incident.incidentType?.toLowerCase() || 'fire';
            
            // detectedAt을 time 형식으로 변환
            const time = incident.detectedAt || '';
            
            // detectionConfidence를 confidence 형식으로 변환 (0.95 -> "95%")
            const confidence = incident.detectionConfidence 
              ? `${Math.round(incident.detectionConfidence * 100)}%`
              : '0%';
            
            return {
              id: incident.id,
              type: type as 'fire' | 'emergency' | 'trash',
              time: time,
              confidence: confidence,
              incidentCode: incident.incidentCode, // 실제 DB의 incident_code
              sourceType: incident.sourceType,
              locationDesc: incident.locationDesc
            };
          });
        
        console.log('✅ [MainMap] Processed incidents:', incidents);
        
        // 팝업 업데이트 (데이터 로드 완료)
        setSelectedDetection({ marker: marker, incidents: incidents });
      }).catch((error) => {
        console.error('❌ [MainMap] Failed to load incidents:', error);
        setSelectedDetection({ marker: marker, incidents: [] });
      });
    }
  };

  const getIncidentLabel = (type: 'fire' | 'emergency' | 'trash') => {
    if (type === 'fire') return '화재';
    if (type === 'emergency') return '응급';
    return '쓰레기 투기';
  };

  const getIncidentColor = (type: 'fire' | 'emergency' | 'trash') => {
    if (type === 'fire') return 'bg-red-100 text-red-700';
    if (type === 'emergency') return 'bg-orange-100 text-orange-700';
    return 'bg-green-100 text-green-700';
  };

  return (
    <div className="h-screen flex flex-col relative bg-white">
      {/* Sidebar with smooth slide animation */}
      <div 
        className="fixed top-0 left-0 z-50 h-screen transition-transform duration-300 ease-in-out"
        style={{ 
          width: '317.56px', 
          backgroundColor: '#2B2847',
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)'
        }}
      >
        <Sidebar onNavigate={onNavigate} currentPath="main-map" />
      </div>

      {/* 알림 드롭다운을 최상위 레벨로 분리 */}
      {showNotifications && (
        <div className="fixed" style={{ zIndex: 9999, top: '80px', right: '24px', display: 'flex', gap: '0px' }}>
          {/* 알림 탭 컨테이너 */}
          <div className="shadow-2xl" style={{ backgroundColor: '#414042', borderRadius: '9px', width: '261.129px', height: '369.987px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* 필터 버튼 - SVG 아이콘 사용 */}
            <div className="p-3 flex gap-2" style={{ flexShrink: 0 }}>
            <button 
              onClick={() => setNotificationTab('fire')} 
              className="flex-shrink-0 transition-opacity hover:opacity-80"
              style={{ 
                backgroundColor: notificationTab === 'fire' ? '#2B3990' : '#F4F4F4', 
                border: '1px solid #B2B2B2', 
                borderRadius: '8px' 
              }}
            >
              <svg width="62.667px" height="36px" viewBox="-259.049 -94.946 62.667 36">
                <path fill="#FF5A5A" d="M-259.049-67.946c0,4.971,4.029,9,9,9h44.667c4.971,0,9-4.029,9-9v-18c0-4.971-4.029-9-9-9h-44.667c-4.971,0-9,4.029-9,9V-67.946z"/>
                <path fill="#FFFFFF" d="M-241.159-73.484c-0.62,0.06-1.21,0.112-1.77,0.157c-0.561,0.045-1.168,0.083-1.822,0.113c-0.655,0.03-1.403,0.052-2.243,0.067c-0.84,0.015-1.85,0.022-3.029,0.022v-1.26c0.739,0,1.409,0,2.01,0c0.6,0,1.155-0.01,1.665-0.03v-1.365c-0.42-0.05-0.798-0.15-1.133-0.3s-0.617-0.33-0.848-0.54c-0.229-0.21-0.404-0.442-0.524-0.697c-0.12-0.255-0.181-0.518-0.181-0.788v-0.57c0-0.3,0.078-0.592,0.232-0.877c0.155-0.285,0.375-0.537,0.66-0.757c0.285-0.22,0.635-0.395,1.05-0.525s0.883-0.195,1.403-0.195c0.52,0,0.987,0.065,1.402,0.195s0.765,0.305,1.05,0.525c0.285,0.22,0.505,0.473,0.66,0.757c0.154,0.285,0.232,0.578,0.232,0.877v0.57c0,0.53-0.223,1.012-0.668,1.447c-0.444,0.435-1.067,0.718-1.867,0.848v1.35c0.67-0.02,1.287-0.053,1.853-0.098c0.564-0.045,1.147-0.092,1.747-0.143L-241.159-73.484z M-241.789-81.599h-7.95v-1.275h3.315v-1.665h1.47v1.665h3.165V-81.599z M-245.688-76.964c0.609,0,1.08-0.13,1.409-0.39c0.33-0.26,0.495-0.555,0.495-0.885v-0.3c0-0.33-0.167-0.625-0.502-0.885c-0.335-0.26-0.803-0.39-1.402-0.39c-0.61,0-1.08,0.13-1.41,0.39c-0.33,0.26-0.495,0.555-0.495,0.885v0.3c0,0.33,0.167,0.625,0.502,0.885S-246.289-76.964-245.688-76.964z M-240.469-70.604v-13.83h1.47v5.535h2.07v1.29h-2.07v7.005H-240.469z"/>
                <path fill="#FFFFFF" d="M-232.909-77.339c-0.051,0.15-0.133,0.307-0.248,0.472s-0.247,0.337-0.397,0.518c-0.3,0.36-0.635,0.74-1.005,1.14s-0.755,0.805-1.155,1.215l-1.005-1.005c0.45-0.43,0.87-0.85,1.261-1.26c0.39-0.41,0.744-0.825,1.064-1.245c0.3-0.39,0.5-0.775,0.601-1.155c0.1-0.38,0.149-0.785,0.149-1.215v-1.98h-2.37v-1.245h6.03v1.245h-2.22v1.98c0,0.43,0.057,0.83,0.172,1.2c0.115,0.37,0.323,0.75,0.623,1.14c0.319,0.41,0.649,0.8,0.99,1.17c0.34,0.37,0.734,0.771,1.185,1.2l-1.005,0.99c-0.4-0.399-0.763-0.772-1.088-1.117c-0.325-0.345-0.638-0.698-0.938-1.058c-0.149-0.18-0.28-0.353-0.39-0.518c-0.11-0.165-0.19-0.322-0.24-0.472H-232.909z M-224.374-70.604h-1.455v-7.62h-1.575v6.945h-1.455v-12.87h1.455v4.635h1.575v-4.92h1.455V-70.604z"/>
                <path fillRule="evenodd" clipRule="evenodd" fill="#FFFFFF" d="M-210.588-67.533c-0.548-0.128-1.068-0.224-1.572-0.373c-1.615-0.476-3.027-1.296-4.115-2.597c-1.624-1.945-1.904-4.162-1.217-6.54c0.438-1.513,1.213-2.854,2.166-4.134c0.608,0.72,1.315,1.272,2.151,1.678c0.093-0.536,0.163-1.055,0.276-1.564c0.236-1.054,0.769-1.972,1.339-2.875c0.334-0.528,0.66-1.069,0.911-1.639c0.437-0.996,0.248-1.995-0.116-2.975c-0.047-0.125-0.094-0.25-0.14-0.376c-0.002-0.006,0.009-0.018,0.029-0.059c0.158,0.064,0.322,0.122,0.479,0.199c2.798,1.402,4.6,3.642,5.515,6.612c0.365,1.183,0.573,2.399,0.552,3.637c-0.01,0.57,0.537,0.861,0.967,0.575c0.385-0.257,0.713-0.6,1.053-0.92c0.135-0.128,0.234-0.295,0.404-0.513c0.088,0.429,0.175,0.79,0.232,1.154c0.267,1.694,0.322,3.384-0.075,5.071c-0.689,2.931-2.939,5.048-5.892,5.479c0.115-0.053,0.23-0.105,0.346-0.157c1.285-0.585,2.221-1.479,2.444-2.932c0.067-0.433,0.035-0.896-0.036-1.332c-0.16-0.97-0.64-1.802-1.202-2.564c-0.385,0.294-0.753,0.576-1.198,0.917c-0.029-1.112-0.491-1.947-1.038-2.747c-0.454-0.665-0.501-1.37-0.228-2.112c0.021-0.061,0.043-0.123,0.063-0.185c-0.02-0.027-0.04-0.054-0.06-0.081c-0.402,0.258-0.832,0.483-1.205,0.779c-1.206,0.957-1.862,2.239-2.102,3.744c-0.05,0.319-0.068,0.644-0.088,0.968c-0.025,0.407-0.255,0.539-0.604,0.324c-0.131-0.081-0.243-0.195-0.354-0.306c-0.102-0.101-0.188-0.217-0.355-0.414c-0.073,0.564-0.166,1.039-0.192,1.518c-0.082,1.492,0.201,2.874,1.419,3.877C-211.617-68.055-211.103-67.836-210.588-67.533z"/>
              </svg>
            </button>
            <button 
              onClick={() => setNotificationTab('emergency')} 
              className="flex-shrink-0 transition-opacity hover:opacity-80"
              style={{ backgroundColor: notificationTab === 'emergency' ? '#2B3990' : '#F4F4F4', border: '1px solid #B2B2B2', borderRadius: '8px' }} 
            >
              <svg width="62.667px" height="36px" viewBox="-259.049 -94.946 62.667 36">
                <path fill="#FFB366" d="M-259.049-67.946c0,4.971,4.029,9,9,9h44.667c4.971,0,9-4.029,9-9v-18c0-4.971-4.029-9-9-9h-44.667c-4.971,0-9,4.029-9,9V-67.946z"/>
                <path fill="#FFFFFF" d="M-241.159-73.484c-0.62,0.06-1.21,0.112-1.77,0.157c-0.561,0.045-1.168,0.083-1.822,0.113c-0.655,0.03-1.403,0.052-2.243,0.067c-0.84,0.015-1.85,0.022-3.029,0.022v-1.26c0.739,0,1.409,0,2.01,0c0.6,0,1.155-0.01,1.665-0.03v-1.365c-0.42-0.05-0.798-0.15-1.133-0.3s-0.617-0.33-0.848-0.54c-0.229-0.21-0.404-0.442-0.524-0.697c-0.12-0.255-0.181-0.518-0.181-0.788v-0.57c0-0.3,0.078-0.592,0.232-0.877c0.155-0.285,0.375-0.537,0.66-0.757c0.285-0.22,0.635-0.395,1.05-0.525s0.883-0.195,1.403-0.195c0.52,0,0.987,0.065,1.402,0.195s0.765,0.305,1.05,0.525c0.285,0.22,0.505,0.473,0.66,0.757c0.154,0.285,0.232,0.578,0.232,0.877v0.57c0,0.53-0.223,1.012-0.668,1.447c-0.444,0.435-1.067,0.718-1.867,0.848v1.35c0.67-0.02,1.287-0.053,1.853-0.098c0.564-0.045,1.147-0.092,1.747-0.143L-241.159-73.484z M-241.789-81.599h-7.95v-1.275h3.315v-1.665h1.47v1.665h3.165V-81.599z M-245.688-76.964c0.609,0,1.08-0.13,1.409-0.39c0.33-0.26,0.495-0.555,0.495-0.885v-0.3c0-0.33-0.167-0.625-0.502-0.885c-0.335-0.26-0.803-0.39-1.402-0.39c-0.61,0-1.08,0.13-1.41,0.39c-0.33,0.26-0.495,0.555-0.495,0.885v0.3c0,0.33,0.167,0.625,0.502,0.885S-246.289-76.964-245.688-76.964z M-240.469-70.604v-13.83h1.47v5.535h2.07v1.29h-2.07v7.005H-240.469z"/>
                <path fill="#FFFFFF" d="M-232.909-77.339c-0.051,0.15-0.133,0.307-0.248,0.472s-0.247,0.337-0.397,0.518c-0.3,0.36-0.635,0.74-1.005,1.14s-0.755,0.805-1.155,1.215l-1.005-1.005c0.45-0.43,0.87-0.85,1.261-1.26c0.39-0.41,0.744-0.825,1.064-1.245c0.3-0.39,0.5-0.775,0.601-1.155c0.1-0.38,0.149-0.785,0.149-1.215v-1.98h-2.37v-1.245h6.03v1.245h-2.22v1.98c0,0.43,0.057,0.83,0.172,1.2c0.115,0.37,0.323,0.75,0.623,1.14c0.319,0.41,0.649,0.8,0.99,1.17c0.34,0.37,0.734,0.771,1.185,1.2l-1.005,0.99c-0.4-0.399-0.763-0.772-1.088-1.117c-0.325-0.345-0.638-0.698-0.938-1.058c-0.149-0.18-0.28-0.353-0.39-0.518c-0.11-0.165-0.19-0.322-0.24-0.472H-232.909z M-224.374-70.604h-1.455v-7.62h-1.575v6.945h-1.455v-12.87h1.455v4.635h1.575v-4.92h1.455V-70.604z"/>
                <rect fill="#FFFFFF" x="-215" y="-85" width="3.5" height="16" rx="1"/>
                <rect fill="#FFFFFF" x="-222" y="-78.25" width="16" height="3.5" rx="1"/>
              </svg>
            </button>
            <button 
              onClick={() => setNotificationTab('trash')} 
              className="flex-shrink-0 transition-opacity hover:opacity-80"
              style={{ backgroundColor: notificationTab === 'trash' ? '#2B3990' : '#F4F4F4', border: '1px solid #B2B2B2', borderRadius: '8px' }} 
            >
              <svg width="62.667px" height="36px" viewBox="-240.217 -78.613 62.667 36">
                <path fill="#576F93" d="M-240.217-51.613c0,4.971,4.029,9,9,9h44.667c4.971,0,9-4.029,9-9v-18c0-4.971-4.029-9-9-9h-44.667c-4.971,0-9,4.029-9,9V-51.613z"/>
                <path fill="#FFFFFF" d="M-222.299-57.242v1.092h-10.998v-1.092H-222.299z M-224.977-65.666v1.82c0,0.251,0.013,0.47,0.039,0.657c0.025,0.187,0.069,0.357,0.13,0.513c0.061,0.156,0.141,0.304,0.24,0.442s0.223,0.286,0.37,0.442c0.174,0.19,0.403,0.409,0.689,0.656s0.567,0.475,0.845,0.683l-0.767,0.871c-0.33-0.269-0.62-0.514-0.871-0.734c-0.252-0.221-0.49-0.444-0.715-0.67c-0.338-0.329-0.529-0.567-0.572-0.715h-0.013c-0.026,0.078-0.104,0.191-0.234,0.338c-0.13,0.147-0.277,0.299-0.442,0.455c-0.208,0.2-0.431,0.405-0.669,0.618s-0.519,0.444-0.839,0.695h-0.025c-0.321-0.251-0.601-0.483-0.839-0.695s-0.462-0.418-0.67-0.618c-0.164-0.156-0.312-0.308-0.441-0.455c-0.13-0.147-0.208-0.26-0.234-0.338h-0.013c-0.052,0.147-0.243,0.386-0.572,0.715c-0.226,0.226-0.468,0.455-0.728,0.689c-0.261,0.234-0.568,0.49-0.923,0.767l-0.768-0.871c0.347-0.26,0.656-0.509,0.93-0.748s0.496-0.453,0.67-0.644c0.146-0.156,0.271-0.303,0.37-0.442s0.18-0.286,0.24-0.442c0.061-0.156,0.104-0.327,0.13-0.513c0.026-0.187,0.039-0.405,0.039-0.657v-1.82h1.235v1.82c0,0.251,0.011,0.464,0.032,0.637s0.059,0.332,0.11,0.475c0.053,0.143,0.126,0.284,0.222,0.422c0.095,0.139,0.221,0.299,0.377,0.481c0.121,0.139,0.251,0.271,0.39,0.396s0.29,0.253,0.455,0.383c0.164-0.13,0.316-0.258,0.455-0.383s0.269-0.258,0.39-0.396c0.156-0.182,0.282-0.342,0.377-0.481c0.096-0.139,0.169-0.28,0.222-0.422c0.052-0.143,0.088-0.301,0.11-0.475c0.021-0.173,0.032-0.386,0.032-0.637v-1.82H-224.977z"/>
                <path fill="#FFFFFF" d="M-220.973-57.58v-4.602h3.081v-2.288h-3.081v-1.053h4.303v4.368h-3.081v2.522h0.819c0.572,0,1.131-0.015,1.677-0.045c0.546-0.03,1.097-0.089,1.651-0.175l0.13,1.04c-0.962,0.156-2.245,0.234-3.849,0.234H-220.973z M-214.733-66.29h1.261v11.154h-1.261v-5.993h-1.353v-1.118h1.353V-66.29z M-211.119-54.551h-1.261v-11.986h1.261V-54.551z"/>
                <path fill="#FFFFFF" d="M-209.13-58.191c0.693-0.407,1.28-0.769,1.762-1.085c0.48-0.316,0.882-0.607,1.202-0.871c0.321-0.264,0.572-0.511,0.754-0.741c0.183-0.229,0.319-0.459,0.41-0.689c0.091-0.229,0.147-0.47,0.169-0.722c0.021-0.251,0.032-0.533,0.032-0.845v-1.183h-4.095v-1.105h5.369v2.301c0,0.39-0.012,0.743-0.033,1.059c-0.021,0.317-0.084,0.616-0.188,0.897c-0.104,0.282-0.258,0.559-0.461,0.832c-0.204,0.273-0.49,0.566-0.858,0.877c-0.368,0.312-0.827,0.655-1.378,1.027s-1.22,0.797-2.009,1.274L-209.13-58.191z M-200.992-54.551v-11.986h1.287v11.986H-200.992z"/>
                <path fillRule="evenodd" clipRule="evenodd" fill="#FFFFFF" d="M-196.078-66.744c4.188,0,8.338,0,12.516,0c0,0.097,0.006,0.187-0.002,0.273c-0.211,2.306-0.428,4.61-0.641,6.915c-0.135,1.451-0.27,2.902-0.393,4.354c-0.059,0.696-0.479,1.113-1.186,1.121c-0.682,0.008-1.365,0.002-2.047,0.002c-1.957,0-3.914,0.001-5.871,0c-0.881,0-1.252-0.344-1.332-1.229c-0.219-2.406-0.439-4.813-0.66-7.219c-0.119-1.276-0.242-2.553-0.361-3.829C-196.066-66.474-196.068-66.593-196.078-66.744z M-192.084-57.104c0-0.115,0.008-0.215-0.002-0.313c-0.053-0.605-0.111-1.211-0.166-1.816c-0.131-1.449-0.26-2.898-0.396-4.348c-0.006-0.062-0.08-0.165-0.127-0.166c-0.373-0.015-0.746-0.008-1.137-0.008c0.207,2.24,0.408,4.439,0.613,6.65C-192.883-57.104-192.49-57.104-192.084-57.104z M-187.183-63.745c-0.203,2.219-0.404,4.424-0.607,6.633c0.438,0,0.836,0,1.242,0c0.205-2.222,0.406-4.42,0.609-6.633C-186.367-63.745-186.761-63.745-187.183-63.745z M-190.41-57.104c0.408,0,0.791,0,1.193,0c0-2.223,0-4.43,0-6.638c-0.406,0-0.791,0-1.193,0C-190.41-61.526-190.41-59.325-190.41-57.104z"/>
                <path fillRule="evenodd" clipRule="evenodd" fill="#FFFFFF" d="M-182.615-67.325c-4.818,0-9.594,0-14.387,0c0-0.477-0.037-0.94,0.012-1.395c0.043-0.414,0.4-0.571,0.758-0.669c0.176-0.048,0.365-0.056,0.547-0.058c1.182-0.004,2.361-0.002,3.59-0.002c0-0.267-0.004-0.521,0-0.774c0.01-0.487,0.266-0.747,0.758-0.75c1.014-0.005,2.029-0.005,3.043,0c0.506,0.002,0.758,0.263,0.764,0.772c0.004,0.238,0,0.477,0,0.752c0.123,0,0.221,0,0.318,0c1.096,0,2.195-0.002,3.293,0.002c0.164,0.001,0.332,0.017,0.494,0.05c0.568,0.118,0.811,0.421,0.811,1.001C-182.615-68.046-182.615-67.696-182.615-67.325z M-188.088-69.457c0-0.271,0.016-0.52-0.008-0.764c-0.008-0.071-0.129-0.187-0.197-0.188c-1.014-0.013-2.025-0.012-3.039-0.001c-0.068,0-0.191,0.098-0.197,0.158c-0.021,0.26-0.008,0.524-0.008,0.794C-190.375-69.457-189.254-69.457-188.088-69.457z"/>
              </svg>
            </button>
            <button 
              onClick={() => {
                setNotificationTab('all');
              }} 
              className="flex-shrink-0 transition-opacity hover:opacity-80"
              style={{ backgroundColor: notificationTab === 'all' ? '#2B3990' : '#F4F4F4', border: '1px solid #B2B2B2', borderRadius: '8px' }} 
            >
              <svg width="35.5px" height="36px" viewBox="-205.051 -56.946 35.5 36">
                <path fill="#FFFFFF" d="M-205.051-29.946c0,4.971,4.029,9,9,9h17.5c4.971,0,9-4.029,9-9v-18c0-4.971-4.029-9-9-9h-17.5c-4.971,0-9,4.029-9,9V-29.946z"/>
                <path fill="#58595B" d="M-194.853-40.717c-0.044,0.112-0.149,0.264-0.318,0.455c-0.17,0.191-0.354,0.377-0.553,0.559c-0.277,0.251-0.588,0.509-0.93,0.773c-0.343,0.265-0.695,0.522-1.06,0.773l-0.754-0.923c0.416-0.294,0.811-0.585,1.183-0.871c0.373-0.286,0.672-0.537,0.897-0.754c0.156-0.147,0.288-0.294,0.396-0.442s0.195-0.301,0.26-0.461c0.065-0.16,0.112-0.336,0.144-0.526c0.03-0.191,0.045-0.403,0.045-0.637v-0.793h-2.521v-1.105h6.188v1.105h-2.366v0.741c0,0.416,0.044,0.761,0.13,1.034c0.087,0.273,0.269,0.531,0.547,0.773c0.312,0.277,0.637,0.542,0.975,0.793c0.338,0.251,0.697,0.503,1.079,0.754l-0.729,0.936c-0.338-0.234-0.654-0.463-0.948-0.689c-0.295-0.225-0.599-0.468-0.91-0.728c-0.2-0.165-0.362-0.31-0.487-0.436c-0.126-0.125-0.211-0.236-0.254-0.331H-194.853z M-194.906-34.699h6.448v1.118h-7.734v-4.004h1.286V-34.699z M-189.978-36.896v-4.381h-2.21v-1.105h2.21v-3.055h1.273v8.541H-189.978z"/>
                <path fill="#58595B" d="M-183.843-39.184c-0.044,0.13-0.115,0.267-0.215,0.41s-0.214,0.292-0.344,0.448c-0.261,0.312-0.551,0.642-0.871,0.988c-0.321,0.347-0.655,0.698-1.001,1.053l-0.871-0.871c0.39-0.373,0.754-0.737,1.092-1.092c0.338-0.355,0.646-0.715,0.923-1.079c0.26-0.338,0.434-0.671,0.521-1.001c0.086-0.329,0.13-0.68,0.13-1.053v-1.157h-2.171v-1.079h2.171v-1.56h1.248v1.56h2.041v1.079h-2.041v1.157c0,0.373,0.05,0.719,0.149,1.04s0.279,0.65,0.539,0.988c0.277,0.355,0.563,0.693,0.858,1.014c0.294,0.321,0.637,0.667,1.026,1.04l-0.87,0.858c-0.348-0.347-0.661-0.669-0.943-0.969c-0.281-0.299-0.552-0.604-0.813-0.917c-0.13-0.156-0.242-0.305-0.338-0.448c-0.095-0.143-0.164-0.28-0.208-0.41H-183.843z M-180.086-45.189h1.261v11.154h-1.261v-5.98h-1.755v-1.118h1.755V-45.189z M-176.445-33.451h-1.262v-11.986h1.262V-33.451z"/>
              </svg>
            </button>
          </div>

            {/* 알림 목록 */}
            <div 
              ref={notificationListRef}
              onScroll={(e) => {
                const target = e.currentTarget;
                setScrollTop(target.scrollTop);
                setScrollContainerHeight(target.clientHeight);
                setScrollContentHeight(target.scrollHeight);
              }}
              style={{ overflowY: 'auto', padding: '0 12px 12px 12px', flexGrow: 1, scrollbarWidth: 'none', msOverflowStyle: 'none' }} 
              className="scrollbar-hide"
            >
            {notificationTab === 'all' && (
              <div className="space-y-2">
                {[
                  ...fireNotifications.map(n => ({ ...n, type: 'fire' as const })),
                  ...emergencyNotifications.map(n => ({ ...n, type: 'emergency' as const })),
                  ...trashNotifications.map(n => ({ ...n, type: 'trash' as const }))
                ]
                  .sort((a, b) => b.timestamp - a.timestamp)
                  .map((notification) => {
                    const bgColor = notification.type === 'fire' ? '#FFC7C7' : notification.type === 'emergency' ? '#FFB366' : '#9BACBF';
                    const btnColor = notification.type === 'fire' ? '#FF5A5A' : notification.type === 'emergency' ? '#FF8C42' : '#576F93';
                    const titleColor = notification.type === 'fire' ? '#FF5A5A' : notification.type === 'emergency' ? '#CC6600' : '#142744';
                    const textColor = notification.type === 'fire' ? '#962C2C' : notification.type === 'emergency' ? '#994D00' : '#224A6D';
                    const eventText = notification.type === 'fire' ? '화재' : notification.type === 'emergency' ? '응급' : '쓰레기 투기';
                    
                    return (
                      <div key={`${notification.type}-${notification.id}`} style={{ backgroundColor: bgColor, width: '238px', height: '79.742px', padding: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontFamily: 'NanumSquareBold, NanumSquare, sans-serif', fontWeight: 700 }}>
                        <div className="flex items-start justify-between">
                          <button onClick={() => { setSelectedNotification({ cctvId: notification.cctvId, type: notification.type, location: notification.location, time: notification.time, confidence: notification.confidence }); setHighlightedCCTV(notification.cctvId); }} className="hover:opacity-80">
                            <span style={{ fontSize: '15px', color: titleColor, fontFamily: 'NanumSquareBold, NanumSquare, sans-serif', fontWeight: 700 }}>{notification.cctvId}</span>
                          </button>
                          <span style={{ fontSize: '11px', color: textColor, fontFamily: 'NanumSquareBold, NanumSquare, sans-serif', fontWeight: 700 }}>{notification.timeAgo}</span>
                        </div>
                        <button onClick={() => { setSelectedNotification({ cctvId: notification.cctvId, type: notification.type, location: notification.location, time: notification.time, confidence: notification.confidence }); setHighlightedCCTV(notification.cctvId); }} className="text-left w-full">
                          <p style={{ fontSize: '12px', color: textColor, fontFamily: 'NanumSquareBold, NanumSquare, sans-serif', fontWeight: 700 }}>{notification.location}에서 {eventText} 탐지</p>
                        </button>
                        <div className="flex items-center justify-between">
                          <span style={{ fontSize: '11px', color: textColor, fontFamily: 'NanumSquareBold, NanumSquare, sans-serif', fontWeight: 700 }}>신뢰도 {notification.confidence}</span>
                          <button onClick={() => { 
                            if (notification.type === 'fire') setFireNotifications(prev => prev.filter(n => n.id !== notification.id));
                            else if (notification.type === 'emergency') setEmergencyNotifications(prev => prev.filter(n => n.id !== notification.id));
                            else setTrashNotifications(prev => prev.filter(n => n.id !== notification.id));
                            setRemovedCCTVs(prev => new Set(prev).add(notification.cctvId));
                            addCompletedIncident(notification.cctvId);
                          }} className="hover:opacity-80 transition-colors" style={{ backgroundColor: btnColor, color: '#FFFFFF', padding: '4px 12px', borderRadius: '0px', fontSize: '11px', fontFamily: 'NanumSquareBold, NanumSquare, sans-serif', fontWeight: 700 }}>
                            처리완료
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {notificationTab === 'fire' && (
              <div className="space-y-2">
                {fireNotifications.map((notification) => (
                  <div key={notification.id} style={{ backgroundColor: '#FFC7C7', width: '238px', height: '79.742px', padding: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontFamily: 'NanumSquareBold, NanumSquare, sans-serif', fontWeight: 700 }}>
                    <div className="flex items-start justify-between">
                      <button onClick={() => { setSelectedNotification({ cctvId: notification.cctvId, type: 'fire', location: notification.location, time: notification.time, confidence: notification.confidence }); setHighlightedCCTV(notification.cctvId); }} className="hover:opacity-80">
                        <span style={{ fontSize: '15px', color: '#FF5A5A', fontFamily: 'NanumSquareBold, NanumSquare, sans-serif', fontWeight: 700 }}>{notification.cctvId}</span>
                      </button>
                      <span style={{ fontSize: '11px', color: '#962C2C', fontFamily: 'NanumSquareBold, NanumSquare, sans-serif', fontWeight: 700 }}>{notification.timeAgo}</span>
                    </div>
                    <button onClick={() => { setSelectedNotification({ cctvId: notification.cctvId, type: 'fire', location: notification.location, time: notification.time, confidence: notification.confidence }); setHighlightedCCTV(notification.cctvId); }} className="text-left w-full">
                      <p style={{ fontSize: '12px', color: '#962C2C', fontFamily: 'NanumSquareBold, NanumSquare, sans-serif', fontWeight: 700 }}>{notification.location}에서 화재 탐지</p>
                    </button>
                    <div className="flex items-center justify-between">
                      <span style={{ fontSize: '11px', color: '#962C2C', fontFamily: 'NanumSquareBold, NanumSquare, sans-serif', fontWeight: 700 }}>신뢰도 {notification.confidence}</span>
                      <button onClick={() => { setFireNotifications(prev => prev.filter(n => n.id !== notification.id)); setRemovedCCTVs(prev => new Set(prev).add(notification.cctvId)); addCompletedIncident(notification.cctvId); }} className="hover:opacity-80 transition-colors" style={{ backgroundColor: '#FF5A5A', color: '#FFFFFF', padding: '4px 12px', borderRadius: '0px', fontSize: '11px', fontFamily: 'NanumSquareBold, NanumSquare, sans-serif', fontWeight: 700 }}>
                        처리완료
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {notificationTab === 'emergency' && (
              <div className="space-y-2">
                {emergencyNotifications.map((notification) => (
                  <div key={notification.id} style={{ backgroundColor: '#FFB366', width: '238px', height: '79.742px', padding: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontFamily: 'NanumSquareBold, NanumSquare, sans-serif', fontWeight: 700 }}>
                    <div className="flex items-start justify-between">
                      <button onClick={() => { setSelectedNotification({ cctvId: notification.cctvId, type: 'emergency', location: notification.location, time: notification.time, confidence: notification.confidence }); setHighlightedCCTV(notification.cctvId); }} className="hover:opacity-80">
                        <span style={{ fontSize: '15px', color: '#CC6600', fontFamily: 'NanumSquareBold, NanumSquare, sans-serif', fontWeight: 700 }}>{notification.cctvId}</span>
                      </button>
                      <span style={{ fontSize: '11px', color: '#994D00', fontFamily: 'NanumSquareBold, NanumSquare, sans-serif', fontWeight: 700 }}>{notification.timeAgo}</span>
                    </div>
                    <button onClick={() => { setSelectedNotification({ cctvId: notification.cctvId, type: 'emergency', location: notification.location, time: notification.time, confidence: notification.confidence }); setHighlightedCCTV(notification.cctvId); }} className="text-left w-full">
                      <p style={{ fontSize: '12px', color: '#994D00', fontFamily: 'NanumSquareBold, NanumSquare, sans-serif', fontWeight: 700 }}>{notification.location}에서 응급 탐지</p>
                    </button>
                    <div className="flex items-center justify-between">
                      <span style={{ fontSize: '11px', color: '#994D00', fontFamily: 'NanumSquareBold, NanumSquare, sans-serif', fontWeight: 700 }}>신뢰도 {notification.confidence}</span>
                      <button onClick={() => { setEmergencyNotifications(prev => prev.filter(n => n.id !== notification.id)); setRemovedCCTVs(prev => new Set(prev).add(notification.cctvId)); addCompletedIncident(notification.cctvId); }} className="hover:opacity-80 transition-colors" style={{ backgroundColor: '#FF8C42', color: '#FFFFFF', padding: '4px 12px', borderRadius: '0px', fontSize: '11px', fontFamily: 'NanumSquareBold, NanumSquare, sans-serif', fontWeight: 700 }}>
                        처리완료
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {notificationTab === 'trash' && (
              <div className="space-y-2">
                {trashNotifications.map((notification) => (
                  <div key={notification.id} style={{ backgroundColor: '#9BACBF', width: '238px', height: '79.742px', padding: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontFamily: 'NanumSquareBold, NanumSquare, sans-serif', fontWeight: 700 }}>
                    <div className="flex items-start justify-between">
                      <button onClick={() => { setSelectedNotification({ cctvId: notification.cctvId, type: 'trash', location: notification.location, time: notification.time, confidence: notification.confidence }); setHighlightedCCTV(notification.cctvId); }} className="hover:opacity-80">
                        <span style={{ fontSize: '15px', color: '#142744', fontFamily: 'NanumSquareBold, NanumSquare, sans-serif', fontWeight: 700 }}>{notification.cctvId}</span>
                      </button>
                      <span style={{ fontSize: '11px', color: '#224A6D', fontFamily: 'NanumSquareBold, NanumSquare, sans-serif', fontWeight: 700 }}>{notification.timeAgo}</span>
                    </div>
                    <button onClick={() => { setSelectedNotification({ cctvId: notification.cctvId, type: 'trash', location: notification.location, time: notification.time, confidence: notification.confidence }); setHighlightedCCTV(notification.cctvId); }} className="text-left w-full">
                      <p style={{ fontSize: '12px', color: '#224A6D', fontFamily: 'NanumSquareBold, NanumSquare, sans-serif', fontWeight: 700 }}>{notification.location}에서 쓰레기 투기 탐지</p>
                    </button>
                    <div className="flex items-center justify-between">
                      <span style={{ fontSize: '11px', color: '#224A6D', fontFamily: 'NanumSquareBold, NanumSquare, sans-serif', fontWeight: 700 }}>신뢰도 {notification.confidence}</span>
                      <button onClick={() => { setTrashNotifications(prev => prev.filter(n => n.id !== notification.id)); setRemovedCCTVs(prev => new Set(prev).add(notification.cctvId)); addCompletedIncident(notification.cctvId); }} className="hover:opacity-80 transition-colors" style={{ backgroundColor: '#576F93', color: '#FFFFFF', padding: '4px 12px', borderRadius: '0px', fontSize: '11px', fontFamily: 'NanumSquareBold, NanumSquare, sans-serif', fontWeight: 700 }}>
                        처리완료
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          </div>
          
          {/* 커스텀 스크롤바 - 탭 오른쪽 바깥 */}
          {scrollContentHeight > scrollContainerHeight && scrollContainerHeight > 0 && (
            <div style={{ 
              width: '15px', 
              height: '369.987px',
              position: 'relative',
              marginLeft: '0px'
            }}>
              {/* 흰색 스크롤바 막대 */}
              <div style={{
                position: 'absolute',
                right: '0px',
                top: '0px',
                width: '15px',
                height: '100%',
                backgroundColor: '#FFFFFF',
                border: '1px solid #808285',
                borderRadius: '7.5px'
              }} />
              {/* 회색 pill (스크롤 thumb) - 동적으로 위치 계산 */}
              {(() => {
                const scrollableHeight = scrollContentHeight - scrollContainerHeight;
                const thumbHeight = Math.max(54.5, (scrollContainerHeight / scrollContentHeight) * scrollContainerHeight);
                const trackHeight = scrollContainerHeight;
                const maxThumbTop = trackHeight - thumbHeight;
                const scrollRatio = scrollableHeight > 0 ? scrollTop / scrollableHeight : 0;
                const thumbTop = scrollRatio * maxThumbTop;
                return (
                  <div style={{
                    position: 'absolute',
                    right: '2.5px',
                    top: `${Math.max(0, Math.min(maxThumbTop, thumbTop))}px`,
                    width: '9px',
                    height: `${thumbHeight}px`,
                    backgroundColor: '#808285',
                    borderRadius: '4.5px',
                    transition: 'top 0.1s ease-out'
                  }} />
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* 버튼 컨트롤 영역 - 최상단에 fixed로 배치 */}
      <div className="fixed top-6 flex items-center gap-3 z-50 transition-all duration-300" style={{ left: sidebarOpen ? '340px' : '24px' }}>
        <HamburgerMenuButton onClick={() => setSidebarOpen(!sidebarOpen)} />
        
        <DetectionButton 
          isActive={activeView === 'detections' && showAllDetections && activeFilters.size === 3}
          isFiltered={activeView === 'detections' && showAllDetections && activeFilters.size > 0 && activeFilters.size < 3}
          onClick={() => { 
            if (activeView !== 'detections') {
              setActiveView('detections');
              setShowAllDetections(true);
              setActiveFilters(new Set(['fire', 'emergency', 'trash']));
            } else if (activeFilters.size < 3) {
              setActiveFilters(new Set(['fire', 'emergency', 'trash']));
            } else {
              setShowAllDetections(!showAllDetections);
            }
          }}
        />
        
        <div className="relative">
          <button 
            ref={filterDropdownButtonRef}
            onClick={() => setShowFilterDropdown(!showFilterDropdown)} 
            className="p-2 bg-white border border-gray-200 shadow-md hover:shadow-lg transition-all" 
            style={{ borderRadius: '9999px' }}
          >
            {showFilterDropdown ? (
              <ChevronUp className="w-4 h-4 text-gray-700" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-700" />
            )}
          </button>
        </div>

        <CCTVButton 
          isActive={activeView === 'cctv'}
          onClick={() => {
            setShowFilterDropdown(false);
            if (activeView === 'cctv') {
              setActiveView('detections');
              setShowAllDetections(true);
              setActiveFilters(new Set(['fire', 'emergency', 'trash']));
            } else {
              setActiveView('cctv');
            }
          }}
        />
        
        <RiskMapButton 
          isActive={activeView === 'risk-map'}
          onClick={() => {
            setShowFilterDropdown(false);
            setActiveView(activeView === 'risk-map' ? 'detections' : 'risk-map');
          }}
        />
      </div>

      {/* 위험지도 필터 UI (기간 선택, 타입 선택) */}
      {activeView === 'risk-map' && (
        <div 
          className="fixed bg-white shadow-lg border border-gray-200 p-4 transition-all duration-300" 
          style={{ 
            borderRadius: '8px', 
            minWidth: '280px',
            top: '80px',
            left: sidebarOpen ? '268px' : '24px',
            zIndex: 1000
          }}
        >
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">기간 선택</label>
            <div className="flex flex-wrap gap-2">
              {(['30d', '7d', 'today'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setRiskMapPeriod(period)}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                    riskMapPeriod === period
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {period === '30d' ? '최근 30일' : 
                   period === '7d' ? '최근 7일' : 
                   '당일'}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">사건 타입</label>
            <div className="flex gap-2">
              {(['all', 'fire', 'emergency', 'trash'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setRiskMapType(type)}
                  className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                    riskMapType === type
                      ? type === 'all' ? 'bg-gradient-to-r from-red-400 via-yellow-400 to-green-400 text-white font-semibold' :
                        type === 'fire' ? 'bg-red-500 text-white font-semibold' :
                        type === 'emergency' ? 'bg-orange-500 text-white font-semibold' :
                        'bg-green-500 text-white font-semibold'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type === 'all' && <div className="w-2 h-2 rounded-full bg-white"></div>}
                  {type === 'fire' && <Flame className="w-3 h-3" />}
                  {type === 'emergency' && <HeartPulse className="w-3 h-3" />}
                  {type === 'trash' && <Trash2 className="w-3 h-3" />}
                  {type === 'all' ? '전체' : 
                   type === 'fire' ? '화재' : 
                   type === 'emergency' ? '응급' : 
                   '쓰레기'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 필터 드롭다운 - fixed positioning으로 최상위 레이어에 배치 */}
      {showFilterDropdown && (
        <div 
          data-filter-dropdown
          className="fixed bg-white shadow-xl border border-gray-200 min-w-[150px]" 
          style={{ 
            borderRadius: '0px', 
            zIndex: 9999,
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`
          }}
        >
          <button onClick={() => handleFilterSelect('all')} className={`w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-sm ${activeFilters.size === 3 ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-900'}`}>
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-red-400 via-yellow-400 to-green-400"></div>
            전체
          </button>
          <button onClick={() => handleFilterSelect('fire')} className={`w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-sm ${activeFilters.has('fire') ? 'bg-red-50 text-red-700 font-semibold' : 'text-gray-900'}`}>
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            화재
          </button>
          <button onClick={() => handleFilterSelect('emergency')} className={`w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-sm ${activeFilters.has('emergency') ? 'bg-orange-50 text-orange-700 font-semibold' : 'text-gray-900'}`}>
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            응급
          </button>
          <button onClick={() => handleFilterSelect('trash')} className={`w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-sm ${activeFilters.has('trash') ? 'bg-green-50 text-green-700 font-semibold' : 'text-gray-900'}`}>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            쓰레기
          </button>
        </div>
      )}

      <div className="flex-1 relative bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300" style={{ marginLeft: sidebarOpen ? '256px' : '0px', transition: 'margin-left 0.3s' }}>
        {/* 알림 버튼 - 오른쪽 상단 */}
        <div className="absolute top-6 right-6 z-20">
          <NotificationBellButton onClick={() => setShowNotifications(!showNotifications)} />
        </div>

        {/* 실제 지도 (Leaflet) - 배경으로 사용 */}
        <div className="absolute inset-0" style={{ zIndex: 0 }}>
        <MapContainer 
            center={[35.2599, 129.0536]}
            zoom={zoomLevel} 
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
            minZoom={12}
            maxZoom={18}
            maxBounds={[[35.18, 128.95], [35.34, 129.15]]}
            maxBoundsViscosity={1.0}
            zoomSnap={0.5}
            zoomDelta={0.5}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <ZoomController zoom={zoomLevel} onZoomChange={setZoomLevel} />
            
            {/* 실시간 CCTV 마커 (Leaflet Marker) */}
            {activeView === 'cctv' && cctvMarkers.map((marker) => {
              if (removedCCTVs.has(marker.id)) return null;
              if (!marker.geom || marker.geom.x === undefined || marker.geom.y === undefined) return null;
              
              const isPowerOn = marker.power === 'on';
              const isNeedCheck = marker.healthStatus === 'NEED_CHECK';
              
              // 기존 아이콘 디자인 사용
              let iconHtml = '';
              if (!isPowerOn || marker.healthStatus === 'OFFLINE') {
                // OFF 마커 (기존 CCTVOffMarkerIcon과 동일)
                iconHtml = `<div style="width: 64px; height: 82px; pointer-events: auto;">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" viewBox="103.102 -6.75 98 126" style="filter: drop-shadow(7px 7px 5px rgba(146, 146, 146, 0.75)); pointer-events: none !important;">
                    <g style="pointer-events: none !important;">
                      <g>
                        <g>
                          <path fill-rule="evenodd" clip-rule="evenodd" fill="#FFFFFF" d="M178.216,34.521c0,18.357-33.241,61.787-33.241,61.787 s-33.241-43.43-33.241-61.787c0-18.359,14.883-33.242,33.241-33.242S178.216,16.161,178.216,34.521z"/>
                        </g>
                      </g>
                      <circle fill="#545454" cx="144.975" cy="34.255" r="27.72"/>
                      <text transform="matrix(1 0 0 1 126.5552 39.9102)" fill="#FFFFFF" font-family="NanumSquareB" font-size="20">OFF</text>
                    </g>
                  </svg>
                </div>`;
              } else if (isNeedCheck) {
                // NEED_CHECK 마커 (기존 ON + 경고 아이콘)
                iconHtml = `<div style="width: 64px; height: 82px; position: relative; pointer-events: auto;">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" viewBox="95.975 -44.5 98 126" style="filter: drop-shadow(7px 7px 5px rgba(146, 146, 146, 0.75)); pointer-events: none !important;">
                    <g style="pointer-events: none !important;">
                      <g>
                        <g>
                          <path fill-rule="evenodd" clip-rule="evenodd" fill="#FFFFFF" d="M171.339-2.979c0,18.357-33.241,61.787-33.241,61.787 s-33.241-43.43-33.241-61.787c0-18.359,14.883-33.242,33.241-33.242S171.339-21.339,171.339-2.979z"/>
                        </g>
                      </g>
                      <circle fill="#5392BC" cx="138.098" cy="-3.245" r="27.72"/>
                      <text transform="matrix(1 0 0 1 124.0278 2.4097)" fill="#FFFFFF" font-family="NanumSquareB" font-size="20">ON</text>
                    </g>
                  </svg>
                  <div style="position: absolute; top: -4px; right: 8px; width: 16px; height: 16px; background: #EAB308; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; pointer-events: none !important;">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" style="pointer-events: none !important;">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                  </div>
                </div>`;
              } else {
                // ON 마커 (기존 CCTVOnMarkerIcon과 동일)
                iconHtml = `<div style="width: 64px; height: 82px; pointer-events: auto;">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" viewBox="95.975 -44.5 98 126" style="filter: drop-shadow(7px 7px 5px rgba(146, 146, 146, 0.75)); pointer-events: none !important;">
                    <g style="pointer-events: none !important;">
                      <g>
                        <g>
                          <path fill-rule="evenodd" clip-rule="evenodd" fill="#FFFFFF" d="M171.339-2.979c0,18.357-33.241,61.787-33.241,61.787 s-33.241-43.43-33.241-61.787c0-18.359,14.883-33.242,33.241-33.242S171.339-21.339,171.339-2.979z"/>
                        </g>
                      </g>
                      <circle fill="#5392BC" cx="138.098" cy="-3.245" r="27.72"/>
                      <text transform="matrix(1 0 0 1 124.0278 2.4097)" fill="#FFFFFF" font-family="NanumSquareB" font-size="20">ON</text>
                    </g>
                  </svg>
                </div>`;
              }
              
              return (
                <Marker 
                  key={marker.id}
                  position={[marker.geom.y, marker.geom.x]}
                  icon={L.divIcon({
                    className: 'custom-cctv-marker',
                    html: iconHtml,
                    iconSize: [64, 82],
                    iconAnchor: [32, 82],
                  })}
                  eventHandlers={{
                    click: (e) => {
                      console.log('🎯 CCTV Marker Clicked!', marker);
                      e.originalEvent.stopPropagation();
                      const mapContainer = e.target._map.getContainer();
                      const rect = mapContainer.getBoundingClientRect();
                      const point = e.target._map.latLngToContainerPoint(e.latlng);
                      handleMarkerClick(marker, {
                        clientX: rect.left + point.x,
                        clientY: rect.top + point.y,
                      } as any);
                    },
                  }}
                />
              );
            })}
            
            {/* 전체탐지 모드 마커 (Leaflet Marker - CCTV 기반) */}
            {activeView === 'detections' && getFilteredMarkers().map((marker) => {
              if (removedCCTVs.has(marker.id)) return null;
              if (!marker.geom || marker.geom.x === undefined || marker.geom.y === undefined) return null;
              
              // 우선순위 계산
              const priority = getPriorityIncident(marker.incidents) || { type: 'cctv' as const, count: 0 };
              const isHighlighted = highlightedCCTV === marker.id;
              
              // 우선순위에 따른 아이콘 HTML 생성
              let iconHtml = '';
              if (priority.type === 'fire') {
                // 화재 마커
                iconHtml = `<div style="width: 64px; height: 82px; position: relative;">
                  <svg viewBox="0 0 96.72 125.04" style="filter: drop-shadow(7px 7px 5px rgba(146, 146, 146, 0.75));">
                    <g>
                      <path fill-rule="evenodd" clip-rule="evenodd" fill="#FFFFFF" d="M74.481,41.241c0,18.358-33.24,61.788-33.24,61.788 S8,59.6,8,41.241C8,22.882,22.883,8,41.241,8S74.481,22.882,74.481,41.241z"/>
                    </g>
                    <g>
                      <circle fill="#FF5A5A" cx="41.241" cy="40.43" r="27.834"/>
                      <path fill-rule="evenodd" clip-rule="evenodd" fill="#FFFFFF" d="M39.315,62.526c-1.129-0.265-2.201-0.461-3.24-0.768 c-3.325-0.981-6.234-2.669-8.475-5.351c-3.346-4.005-3.923-8.571-2.506-13.47c0.9-3.116,2.497-5.878,4.46-8.513 c1.253,1.481,2.71,2.619,4.431,3.455c0.192-1.104,0.336-2.173,0.57-3.221c0.486-2.171,1.583-4.062,2.759-5.922 c0.688-1.088,1.359-2.202,1.874-3.377c0.9-2.051,0.513-4.109-0.238-6.125c-0.096-0.258-0.192-0.516-0.286-0.775 c-0.005-0.014,0.018-0.037,0.061-0.123c0.323,0.133,0.664,0.25,0.983,0.41c5.765,2.889,9.475,7.502,11.36,13.621 c0.751,2.437,1.179,4.941,1.136,7.492c-0.02,1.173,1.105,1.772,1.99,1.183c0.793-0.528,1.469-1.236,2.168-1.895 c0.28-0.264,0.485-0.607,0.835-1.056c0.18,0.884,0.358,1.626,0.478,2.377c0.55,3.489,0.664,6.97-0.154,10.445 c-1.42,6.037-6.055,10.397-12.136,11.284c0.237-0.108,0.475-0.216,0.713-0.324c2.647-1.206,4.573-3.046,5.035-6.039 c0.138-0.891,0.072-1.846-0.075-2.742c-0.33-1.998-1.318-3.71-2.477-5.282c-0.792,0.606-1.55,1.186-2.468,1.888 c-0.06-2.291-1.013-4.01-2.138-5.657c-0.935-1.371-1.033-2.822-0.469-4.35c0.046-0.126,0.088-0.254,0.132-0.381 c-0.041-0.056-0.082-0.111-0.123-0.167c-0.83,0.53-1.714,0.993-2.482,1.603c-2.485,1.972-3.836,4.612-4.328,7.712 c-0.104,0.658-0.141,1.328-0.183,1.994c-0.052,0.837-0.525,1.109-1.242,0.667c-0.27-0.167-0.502-0.402-0.73-0.629 c-0.209-0.209-0.389-0.448-0.732-0.852c-0.151,1.162-0.342,2.141-0.396,3.126c-0.17,3.073,0.414,5.919,2.922,7.986 C37.194,61.451,38.253,61.901,39.315,62.526z"/>
                    </g>
                  </svg>
                  ${priority.count > 1 ? `<div style="position: absolute; top: 0; right: 0; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: bold; background: #DC2626; border: 2px solid white;">${priority.count}</div>` : ''}
                </div>`;
              } else if (priority.type === 'emergency') {
                // 응급 마커
                iconHtml = `<div style="width: 64px; height: 82px; position: relative;">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" viewBox="86.725 -31.25 97 126" style="filter: drop-shadow(7px 7px 5px rgba(146, 146, 146, 0.75));">
                    <g>
                      <g>
                        <g>
                          <path fill-rule="evenodd" clip-rule="evenodd" fill="#FFFFFF" d="M161.375,10.389c0,18.358-33.241,61.788-33.241,61.788 s-33.241-43.43-33.241-61.788s14.883-33.241,33.241-33.241S161.375-7.97,161.375,10.389z"/>
                        </g>
                      </g>
                      <circle fill="#99332E" cx="128.134" cy="10.124" r="27.72"/>
                      <polygon fill-rule="evenodd" clip-rule="evenodd" fill="#FFFFFF" points="142.863,5.29 132.968,5.29 132.968,-4.604 123.301,-4.604 123.301,5.29 113.406,5.29 113.406,14.956 123.301,14.956 123.301,24.853 132.968,24.853 132.968,14.956 142.863,14.956"/>
                    </g>
                  </svg>
                  ${priority.count > 1 ? `<div style="position: absolute; top: 0; right: 0; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: bold; background: #F97316; border: 2px solid white;">${priority.count}</div>` : ''}
                </div>`;
              } else {
                // 쓰레기 마커
                iconHtml = `<div style="width: 64px; height: 82px; position: relative;">
                  <svg viewBox="-147.14 4.02 65 80" style="filter: drop-shadow(7px 7px 5px rgba(146, 146, 146, 0.75));">
                    <g>
                      <g>
                        <g>
                          <path fill-rule="evenodd" clip-rule="evenodd" fill="#FFFFFF" d="M-105.005,29.918c0,9.396-17.014,31.623-17.014,31.623 s-17.012-22.228-17.012-31.623s7.617-17.013,17.012-17.013C-112.622,12.906-105.005,20.523-105.005,29.918z"/>
                        </g>
                      </g>
                      <g>
                        <circle fill="#576F93" cx="-122.018" cy="29.769" r="14.331"/>
                        <g>
                          <path fill-rule="evenodd" clip-rule="evenodd" fill="#FFFFFF" d="M-128.28,25.551c4.188,0,8.337,0,12.515,0 c0,0.097,0.007,0.186-0.001,0.273c-0.212,2.306-0.429,4.61-0.642,6.915c-0.135,1.451-0.27,2.902-0.393,4.354 c-0.059,0.696-0.479,1.114-1.185,1.121c-0.683,0.007-1.366,0.002-2.048,0.002c-1.957,0-3.914,0-5.871,0 c-0.88-0.001-1.251-0.345-1.332-1.229c-0.219-2.407-0.438-4.813-0.66-7.219c-0.118-1.276-0.241-2.552-0.361-3.829 C-128.268,25.822-128.27,25.703-128.28,25.551z M-124.285,35.191c0-0.115,0.007-0.215-0.002-0.313 c-0.054-0.605-0.112-1.211-0.167-1.816c-0.131-1.45-0.26-2.899-0.396-4.348c-0.006-0.062-0.08-0.165-0.126-0.167 c-0.374-0.014-0.747-0.008-1.138-0.008c0.207,2.241,0.408,4.439,0.613,6.651C-125.084,35.191-124.693,35.191-124.285,35.191z M-119.386,28.551c-0.202,2.218-0.404,4.423-0.607,6.632c0.438,0,0.836,0,1.242,0c0.205-2.222,0.406-4.419,0.609-6.632 C-118.57,28.551-118.963,28.551-119.386,28.551z M-122.613,35.191c0.408,0,0.791,0,1.193,0c0-2.223,0-4.43,0-6.638 c-0.406,0-0.79,0-1.193,0C-122.613,30.77-122.613,32.97-122.613,35.191z"/>
                          <path fill-rule="evenodd" clip-rule="evenodd" fill="#FFFFFF" d="M-114.818,24.97c-4.818,0-9.594,0-14.387,0 c0-0.477-0.037-0.94,0.012-1.394c0.043-0.414,0.401-0.572,0.758-0.669c0.176-0.047,0.366-0.056,0.548-0.057 c1.181-0.005,2.361-0.002,3.589-0.002c0-0.267-0.004-0.521,0-0.774c0.01-0.487,0.266-0.748,0.758-0.75 c1.015-0.005,2.029-0.005,3.044,0c0.505,0.002,0.757,0.263,0.763,0.772c0.004,0.238,0,0.477,0,0.752c0.123,0,0.221,0,0.318,0 c1.097,0,2.195-0.002,3.293,0.002c0.164,0,0.332,0.016,0.494,0.049c0.568,0.118,0.811,0.421,0.811,1.001 C-114.818,24.25-114.818,24.599-114.818,24.97z M-120.289,22.838c0-0.271,0.015-0.52-0.009-0.764 c-0.008-0.071-0.128-0.187-0.197-0.188c-1.013-0.012-2.025-0.012-3.038-0.001c-0.069,0.001-0.192,0.098-0.197,0.158 c-0.021,0.261-0.009,0.525-0.009,0.794C-122.577,22.838-121.455,22.838-120.289,22.838z"/>
                        </g>
                      </g>
                    </g>
                  </svg>
                  ${priority.count > 1 ? `<div style="position: absolute; top: 0; right: 0; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold; background: #10B981; border: 2px solid white;">${priority.count}</div>` : ''}
                </div>`;
              }
              
              return (
                <Marker 
                  key={marker.id}
                  position={[marker.geom.y, marker.geom.x]}
                  icon={L.divIcon({
                    className: 'custom-incident-marker',
                    html: iconHtml,
                    iconSize: [64, 82],
                    iconAnchor: [32, 82],
                  })}
                  eventHandlers={{
                    click: (e) => {
                      console.log('🎯 Detection Marker Clicked!', marker);
                      e.originalEvent.stopPropagation();
                      const mapContainer = e.target._map.getContainer();
                      const rect = mapContainer.getBoundingClientRect();
                      const point = e.target._map.latLngToContainerPoint(e.latlng);
                      handleMarkerClick(marker, {
                        clientX: rect.left + point.x,
                        clientY: rect.top + point.y,
                      } as any);
                    },
                  }}
                />
              );
            })}
            
            {/* 등산로 렌더링 */}
            {activeView !== 'risk-map' && trails.map((trail) => {
              if (!trail.geom || !trail.geom.coordinates) return null;
              
              // [[lng, lat], ...] → [[lat, lng], ...] 로 변환 (Leaflet 형식)
              const positions = toLeafletPositions(trail.geom.coordinates as number[][]);
              
              // 등산로 중앙 좌표 계산 (라벨 표시 위치 - 경로 위)
              const totalLength = positions.length;
              const midIndex = Math.floor(totalLength / 2);
              const centerPosition = positions[midIndex] as [number, number];
              
              const isHovered = hoveredTrailId === trail.segmentId;
              
              return (
                <React.Fragment key={trail.segmentId}>
                  <Polyline
                    positions={positions}
                    pathOptions={{
                      color: isHovered ? '#059669' : '#10b981',  // hover 시 더 진한 초록
                      weight: isHovered ? 6 : 4,  // hover 시 더 두꺼운 선
                      opacity: isHovered ? 1.0 : 0.8,  // hover 시 더 선명
                    }}
                    eventHandlers={{
                      mouseover: () => {
                        setHoveredTrailId(trail.segmentId);
                      },
                      mouseout: () => {
                        setHoveredTrailId(null);
                      },
                      click: (e) => {
                        e.originalEvent.stopPropagation();
                        const latlng = e.target.getBounds().getCenter();
                        const x = ((latlng.lng - 129.0) / (129.1 - 129.0)) * 100;
                        const y = ((35.3 - latlng.lat) / (35.3 - 35.2)) * 100;
                        setHoveredTrailSegment({
                          entityId: trail.segmentId as number,
                          entityName: trail.segmentName,
                          trailName: trail.trailNameKor,
                          fireCount: 0,
                          emergencyCount: 0,
                          trashCount: 0,
                          x,
                          y,
                        });
                      },
                    }}
                  >
                    {/* 줌 아웃 시: hover 시에만 Tooltip 표시 */}
                    {zoomLevel < 14.5 && (
                      <Tooltip permanent={false}>
                        <div style={{
                          fontSize: '11px',
                          fontWeight: 'bold',
                          color: '#000000',
                        }}>
                          {trail.segmentName}
                        </div>
                      </Tooltip>
                    )}
                  </Polyline>
                  {/* 줌 인 시: 항상 라벨 표시 */}
                  {zoomLevel >= 14.5 && trail.segmentName && (
                    <Marker
                      position={centerPosition}
                      icon={L.divIcon({
                        className: 'trail-label-marker',
                        html: `<div style="
                          font-size: 11px;
                          font-weight: bold;
                          color: #000000;
                          white-space: nowrap;
                          text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.8), -1px -1px 2px rgba(255, 255, 255, 0.8), 1px -1px 2px rgba(255, 255, 255, 0.8), -1px 1px 2px rgba(255, 255, 255, 0.8);
                          pointer-events: none;
                        ">${trail.segmentName}</div>`,
                        iconSize: [0, 0],
                        iconAnchor: [0, 0],
                      })}
                    />
                  )}
                </React.Fragment>
              );
            })}

            {/* 위험지도 모드: 등산로 히트맵 렌더링 (기본 등산로 + 히트맵 통계 결합) */}
            {activeView === 'risk-map' && trails.map((trail) => {
              if (!trail.geom || !trail.geom.coordinates) return null;

              const positions = toLeafletPositions(trail.geom.coordinates as number[][]);
              if (positions.length === 0) return null;

              // 등산로 중앙 좌표 계산 (라벨 위치)
              const totalLength = positions.length;
              const midIndex = Math.floor(totalLength / 2);
              const centerPosition = positions[midIndex] as [number, number];

              // 해당 구간에 대한 위험지도 통계 찾기
              const stats = trailHeatmapMap.get(trail.segmentId as number);
              const getCountByType = () => {
                if (!stats) return 0;
                if (riskMapType === 'fire') return stats.fireCount || 0;
                if (riskMapType === 'emergency') return stats.emergencyCount || 0;
                if (riskMapType === 'trash') return stats.trashCount || 0;
                return stats.totalCount || 0;
              };

              const displayCount = getCountByType();
              const color = getHeatmapColorByPeriod(displayCount, riskMapPeriod);
              const isHovered = hoveredTrailSegment?.entityId === (trail.segmentId as number);

              return (
                <React.Fragment key={`risk-map-trail-${trail.segmentId}`}>
                  {/* 그라데이션 효과를 위한 그림자 레이어 */}
                  <Polyline
                    positions={positions}
                    pathOptions={{
                      color: '#000000',
                      weight: isHovered ? 10 : 8,
                      opacity: 0.15,
                    }}
                  />
                  {/* 메인 라인 */}
                  <Polyline
                    positions={positions}
                    pathOptions={{
                      color,
                      weight: isHovered ? 7 : 5.5,
                      opacity: isHovered ? 1.0 : 0.85,
                    }}
                    eventHandlers={{
                      mouseover: (e) => {
                        const latlng = e.target.getBounds().getCenter();
                        const x = ((latlng.lng - 129.0) / (129.1 - 129.0)) * 100;
                        const y = ((35.3 - latlng.lat) / (35.3 - 35.2)) * 100;
                        setHoveredTrailSegment({
                          entityId: trail.segmentId,
                          entityName: trail.segmentName,
                          trailName: trail.trailNameKor,
                          fireCount: stats?.fireCount || 0,
                          emergencyCount: stats?.emergencyCount || 0,
                          trashCount: stats?.trashCount || 0,
                          x,
                          y,
                        });
                      },
                      mouseout: () => {
                        setHoveredTrailSegment(null);
                      },
                      click: (e) => {
                        e.originalEvent.stopPropagation();
                        const latlng = e.target.getBounds().getCenter();
                        const x = ((latlng.lng - 129.0) / (129.1 - 129.0)) * 100;
                        const y = ((35.3 - latlng.lat) / (35.3 - 35.2)) * 100;
                        setHoveredTrailSegment({
                          entityId: trail.segmentId,
                          entityName: trail.segmentName,
                          trailName: trail.trailNameKor,
                          fireCount: stats?.fireCount || 0,
                          emergencyCount: stats?.emergencyCount || 0,
                          trashCount: stats?.trashCount || 0,
                          x,
                          y,
                        });
                      },
                    }}
                  />
                  {/* 라벨 표시 */}
                  {zoomLevel >= 14.5 && trail.segmentName && (
                    <Marker
                      position={centerPosition}
                      icon={L.divIcon({
                        className: 'trail-label-marker',
                        html: `<div style="
                          font-size: 11px;
                          font-weight: bold;
                          color: #000000;
                          white-space: nowrap;
                          text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.8), -1px -1px 2px rgba(255, 255, 255, 0.8), 1px -1px 2px rgba(255, 255, 255, 0.8), -1px 1px 2px rgba(255, 255, 255, 0.8);
                          pointer-events: none;
                        ">${trail.segmentName}</div>`,
                        iconSize: [0, 0],
                        iconAnchor: [0, 0],
                      })}
                    />
                  )}
                </React.Fragment>
              );
            })}

          
          {/* 위험지도 모드: CCTV 사고다발 구간 마커 (Top 3/Top 5) - 지도 좌표 기반 Marker로 렌더링 */}
          {activeView === 'risk-map' && (() => {
            // 아직 히트맵 데이터가 없으면 아무것도 렌더링하지 않음 (불필요한 경고/로그 방지)
            if (!riskMapHeatmap || riskMapHeatmap.length === 0) {
              return null;
            }

            // CCTV 마커만 필터링
            const cctvItems = riskMapHeatmap.filter(item => 
              item.entityType === 'CCTV' && 
              item.geom && 
              item.geom.type === 'Point' && 
              item.geom.coordinates
            );
            
            // Top 3/Top 5 계산
            let topHotspots: typeof cctvItems = [];
            
            if (riskMapType === 'all') {
              // 전체 선택: 각 유형별 top 3씩
              const fireTop3 = [...cctvItems]
                .filter(item => (item.fireCount || 0) > 0)
                .sort((a, b) => (b.fireCount || 0) - (a.fireCount || 0))
                .slice(0, 3);
              
              const emergencyTop3 = [...cctvItems]
                .filter(item => (item.emergencyCount || 0) > 0)
                .sort((a, b) => (b.emergencyCount || 0) - (a.emergencyCount || 0))
                .slice(0, 3);
              
              const trashTop3 = [...cctvItems]
                .filter(item => (item.trashCount || 0) > 0)
                .sort((a, b) => (b.trashCount || 0) - (a.trashCount || 0))
                .slice(0, 3);
              
              console.log('🔍 [RiskMap] Filtered by type:', {
                fireTop3: fireTop3.length,
                emergencyTop3: emergencyTop3.length,
                trashTop3: trashTop3.length,
              });
              
              // 중복 제거 (같은 CCTV가 여러 타입에 포함될 수 있음)
              const allHotspots = [...fireTop3, ...emergencyTop3, ...trashTop3];
              const uniqueMap = new Map();
              allHotspots.forEach(item => {
                const existing = uniqueMap.get(item.entityId);
                if (!existing || (item.totalCount || 0) > (existing.totalCount || 0)) {
                  uniqueMap.set(item.entityId, item);
                }
              });
              topHotspots = Array.from(uniqueMap.values());
            } else {
              // 타입 선택: 해당 타입 top 5
              const typeKey = riskMapType === 'fire' ? 'fireCount' : 
                              riskMapType === 'emergency' ? 'emergencyCount' : 'trashCount';
              
              const filtered = [...cctvItems].filter(item => {
                const count = Number(item[typeKey]) || 0;
                return count > 0;
              });
              
              console.log('🔍 [RiskMap] Filtered by', typeKey, ':', filtered.length, 'items');
              
              topHotspots = filtered
                .sort((a, b) => {
                  const aCount = Number(a[typeKey]) || 0;
                  const bCount = Number(b[typeKey]) || 0;
                  return bCount - aCount;
                })
                .slice(0, 5);
            }
            
            if (topHotspots.length === 0) {
              return null;
            }
                
            return topHotspots.map((item, index) => {
              // Point도 항상 [[lng, lat]] 형식으로 내려오므로 첫 번째 좌표 사용
              const [lng, lat] = (item.geom.coordinates as number[][])[0];
              
              // 선택한 타입에 따라 아이콘 결정
              const incidentType = riskMapType === 'all' 
                ? ((item.fireCount || 0) > 0 ? 'fire' : 
                   (item.emergencyCount || 0) > 0 ? 'emergency' : 'trash')
                : riskMapType; // 화재/응급/쓰레기 선택 시 해당 타입만
              
              // MapCCTVMarker 형식으로 변환 (Leaflet Marker 클릭 시 사용)
              const markerData: MapCCTVMarker = {
                id: item.cctvCode || item.entityName,
                cctvId: item.entityId,
                cctvCode: item.cctvCode || item.entityName,
                location: item.cctvAddress || item.entityName,
                x: 0,
                y: 0,
                geom: {
                  x: lng,
                  y: lat,
                },
                power: 'on' as const,
                healthStatus: 'NORMAL' as const,
                incidents: {
                  fire: item.fireCount || 0,
                  emergency: item.emergencyCount || 0,
                  trash: item.trashCount || 0,
                },
              };

              // 원래 사용하던 SVG 아이콘(화재/응급/쓰레기)을 그대로 사용하되,
              // Leaflet Marker용 divIcon으로 변환하여 지도 좌표에 고정
              let iconHtml = '';
              if (incidentType === 'fire') {
                iconHtml = ReactDOMServer.renderToString(
                  <HotspotFireIcon style={{ width: '48px', height: '56px' }} />
                );
              } else if (incidentType === 'emergency') {
                iconHtml = ReactDOMServer.renderToString(
                  <HotspotEmergencyIcon style={{ width: '48px', height: '56px' }} />
                );
              } else {
                iconHtml = ReactDOMServer.renderToString(
                  <HotspotTrashIcon style={{ width: '48px', height: '56px' }} />
                );
              }

              const icon = L.divIcon({
                className: 'risk-hotspot-marker',
                html: iconHtml,
                iconSize: [48, 56],
                iconAnchor: [24, 56],
              });

              return (
                <Marker
                  key={`risk-map-cctv-${item.entityType}-${item.entityId}-${index}`}
                  position={[lat, lng]}
                  icon={icon}
                  eventHandlers={{
                    click: (e) => {
                      handleMarkerClick(markerData, e);
                    },
                    mouseover: (e) => {
                      const clientX = (e.originalEvent as MouseEvent).clientX;
                      const clientY = (e.originalEvent as MouseEvent).clientY;
                      setHoveredHotspot({
                        cctvId: item.cctvCode || item.entityName,
                        location: item.cctvAddress || item.entityName,
                        fireCount: item.fireCount || 0,
                        emergencyCount: item.emergencyCount || 0,
                        trashCount: item.trashCount || 0,
                        x: clientX,
                        y: clientY,
                      });
                    },
                    mouseout: () => {
                      setHoveredHotspot(null);
                    },
                  }}
                />
              );
            });
          })()}
          
          </MapContainer>
        </div>

        {/* 날씨 위젯 - 좌측 하단 */}
        {weather && (
          <div 
            className="absolute bottom-6" 
            style={{ 
              left: '16px',
              zIndex: 1000 
            }}
          >
            <div className="bg-white rounded-lg shadow-lg p-4" style={{ minWidth: '200px' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Wind className="w-5 h-5 text-blue-500" />
                  <span className="font-semibold text-gray-800">금정산 날씨</span>
                </div>
              </div>
              
              <div className="space-y-2">
                {/* 기온 */}
                {weather.temperature && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">기온</span>
                    <span className="text-lg font-bold text-blue-600">{weather.temperature}°C</span>
                  </div>
                )}
                
                {/* 습도 */}
                {weather.humidity && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">습도</span>
                    <span className="text-sm font-semibold text-gray-800">{weather.humidity}%</span>
                  </div>
                )}
                
                {/* 풍향/풍속 */}
                {weather.windDirection && weather.windSpeed && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">바람</span>
                    <span className="text-sm font-semibold text-gray-800">
                      {weather.windDirection} {weather.windSpeed}m/s
                    </span>
                  </div>
                )}
                
                {/* 날씨 상태 */}
                {weather.weatherCondition && (
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm text-gray-600">상태</span>
                    <span className="text-sm font-semibold text-gray-800">
                      {weather.weatherCondition === 'CLEAR' && '☀️ 맑음'}
                      {weather.weatherCondition === 'PARTLY_CLOUDY' && '⛅ 구름많음'}
                      {weather.weatherCondition === 'CLOUDY' && '☁️ 흐림'}
                      {weather.weatherCondition === 'RAIN' && '🌧️ 비'}
                      {weather.weatherCondition === 'SNOW' && '❄️ 눈'}
                    </span>
                  </div>
                )}
              </div>
              
              {/* 업데이트 시간 */}
              {weather.obsTime && (
                <div className="mt-2 pt-2 border-t">
                  <span className="text-xs text-gray-400">
                    {new Date(weather.obsTime).toLocaleString('ko-KR', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })} 관측
                  </span>
                </div>
              )}
            </div>
          </div>
        )}



        {/* 위험지도 모드 마커는 riskMapHeatmap으로 통합 (중복 제거) */}



        {showHelicopters && helicopterLocations.map((heli) => (
          <div 
            key={heli.id} 
            className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform"
            style={{ left: `${heli.x}%`, top: `${heli.y}%`, zIndex: 1010 }}
          >
            <div className="w-10 h-10 rounded-full shadow-lg flex items-center justify-center bg-red-500 border-2 border-white">
              <span className="text-white" style={{ fontSize: '16px', fontWeight: 'bold', lineHeight: '1' }}>H</span>
            </div>
          </div>
        ))}


// 수정 코드
        <div className="absolute bottom-6 right-6 flex flex-col gap-1 shadow-lg" style={{ zIndex: 1000 }}>
          <button 
            onClick={() => setZoomLevel(prev => Math.min(prev + 0.5, 18))} 
            disabled={zoomLevel >= 18}
            className={`w-10 h-10 flex items-center justify-center transition-colors ${
              zoomLevel >= 18 
                ? 'bg-gray-200 cursor-not-allowed' 
                : 'bg-white hover:bg-gray-50 cursor-pointer'
            }`} 
            style={{ borderRadius: '0px' }}
          >
            <Plus className={`w-5 h-5 ${zoomLevel >= 18 ? 'text-gray-400' : 'text-gray-700'}`} />
          </button>
          <button 
            onClick={() => setZoomLevel(prev => Math.max(prev - 0.5, 12))} 
            disabled={zoomLevel <= 12}
            className={`w-10 h-10 flex items-center justify-center transition-colors ${
              zoomLevel <= 12 
                ? 'bg-gray-200 cursor-not-allowed' 
                : 'bg-white hover:bg-gray-50 cursor-pointer'
            }`} 
            style={{ borderRadius: '0px' }}
          >
            <Minus className={`w-5 h-5 ${zoomLevel <= 12 ? 'text-gray-400' : 'text-gray-700'}`} />
          </button>
        </div>
      </div>

      {selectedCCTV && (
        <div 
          className="fixed bg-white shadow-2xl border-2 border-gray-300"
          style={{ 
            borderRadius: '0px', 
            left: `${popupPositions.cctv.x}px`, 
            top: `${popupPositions.cctv.y}px`,
            width: '400px',
            zIndex: 2000
          }}
        >
          <div 
            className="bg-emerald-600 px-4 py-3 flex items-center justify-between cursor-move"
            style={{ borderRadius: '0px' }}
            onMouseDown={(e) => startDrag('cctv', e)}
          >
            <div className="flex items-center gap-2">
              <Move className="w-4 h-4 text-white" />
              <h3 className="text-white">CCTV 상세 정보</h3>
            </div>
            <button onClick={() => setSelectedCCTV(null)} className="text-white hover:text-gray-200">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 max-h-[600px] overflow-y-auto">
            {/* CCTV 영상 영역 */}
            <div className="relative h-48 bg-gray-200 flex items-center justify-center mb-4" style={{ borderRadius: '0px' }}>
              {selectedCCTV.cctv.power === 'on' ? (
                <>
                  {/* 실시간 CCTV 영상 (TODO: 실제 영상 스트림 연결) */}
                  <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                    <Camera className="w-12 h-12 text-gray-400" />
                  </div>
                  {/* 점검 필요 오버레이 */}
                  {selectedCCTV.cctv.healthStatus === 'NEED_CHECK' && (
                    <div className="absolute inset-0 bg-yellow-500 bg-opacity-30 flex items-center justify-center">
                      <div className="bg-yellow-500 text-white px-4 py-2 flex items-center gap-2" style={{ borderRadius: '0px' }}>
                        <AlertCircle className="w-5 h-5" />
                        <span className="text-sm font-semibold">점검 필요</span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* 점검중 상태 */
                <div className="w-full h-full bg-gray-300 flex flex-col items-center justify-center">
                  <Wrench className="w-12 h-12 text-gray-500 mb-2" />
                  <span className="text-sm text-gray-600">점검중</span>
                </div>
              )}
            </div>

            {/* CCTV 정보 */}
            <div className="grid grid-cols-2 gap-3 mb-3 pb-3 border-b border-gray-200">
              <div>
                <p className="text-xs text-gray-500">CCTV ID</p>
                <p className="text-sm text-gray-900 font-medium">{selectedCCTV.cctv.cctvCode || selectedCCTV.cctv.id}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">전원 상태</p>
                <span className={`inline-block px-2 py-1 text-xs font-medium ${selectedCCTV.cctv.power === 'on' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`} style={{ borderRadius: '0px' }}>
                  {selectedCCTV.cctv.power === 'on' ? 'ON' : 'OFF'}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500">위치명</p>
                <p className="text-sm text-gray-900">{selectedCCTV.cctv.location}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">헬스 상태</p>
                <span className={`inline-block px-2 py-1 text-xs font-medium ${
                  selectedCCTV.cctv.healthStatus === 'NORMAL' ? 'bg-blue-100 text-blue-700' : 
                  selectedCCTV.cctv.healthStatus === 'NEED_CHECK' ? 'bg-yellow-100 text-yellow-700' : 
                  'bg-gray-100 text-gray-700'
                }`} style={{ borderRadius: '0px' }}>
                  {selectedCCTV.cctv.healthStatus === 'NORMAL' ? '정상' : 
                   selectedCCTV.cctv.healthStatus === 'NEED_CHECK' ? '점검필요' : '오프라인'}
                </span>
              </div>
              {selectedCCTV.cctv.locationDescription && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-500">위치 상세설명</p>
                  <p className="text-sm text-gray-900">{selectedCCTV.cctv.locationDescription}</p>
                </div>
              )}
            </div>

            {/* 영상 리스트 섹션 - 최근 사건 3건 */}
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">영상 리스트 (Video Clips)</h4>
              <p className="text-xs text-gray-500 mb-3">최근 발생 3건</p>
              {cctvMediaList.length > 0 ? (
                <div className="space-y-3">
                  {cctvMediaList.slice(0, 3).map((media, index) => {
                    // TODO: 실제 사건 정보는 API에서 가져와야 함
                    // media에 incident_id나 incident_code가 있다면 사용, 없으면 표시하지 않음
                    const mockIncidentType = index === 0 ? 'fire' : index === 1 ? 'emergency' : 'trash';
                    const mockIncidentStatus = index === 0 ? '대기중' : index === 1 ? '진행중' : '대기중';
                    
                    const typeConfig = {
                      fire: { label: '화재', color: 'bg-red-100 text-red-700' },
                      emergency: { label: '응급', color: 'bg-purple-100 text-purple-700' },
                      trash: { label: '쓰레기', color: 'bg-green-100 text-green-700' }
                    };
                    const config = typeConfig[mockIncidentType as keyof typeof typeConfig];
                    
                    return (
                      <div 
                        key={media.id}
                        className="border border-gray-200 p-3 hover:bg-gray-50 transition-colors"
                        style={{ borderRadius: '0px' }}
                      >
                        {/* 상단: 왼쪽 정보 + 오른쪽 썸네일 */}
                        <div className="flex gap-3 mb-3">
                          {/* 왼쪽: 사건 정보 */}
                          <div className="flex-1 space-y-2">
                            {media.incidentCode && (
                              <div>
                                <p className="text-sm font-medium text-gray-900">사건 ID: {media.incidentCode}</p>
                              </div>
                            )}
                            <div>
                              <span className={`inline-block px-2 py-1 text-xs font-medium ${config.color}`} style={{ borderRadius: '0px' }}>
                                {config.label}
                              </span>
                            </div>
                            <div className="text-xs text-gray-600">
                              <p>{media.timestamp}</p>
                            </div>
                            <div className="text-xs text-gray-600">
                              <p>상태: {mockIncidentStatus}</p>
                            </div>
                            {media.duration && (
                              <p className="text-xs text-gray-500">
                                재생 시간: {Math.floor(media.duration / 60)}분 {media.duration % 60}초
                                {media.fileSize && ` • ${media.fileSize}`}
                              </p>
                            )}
                          </div>
                          
                          {/* 오른쪽: 영상/이미지 썸네일 */}
                          <div 
                            className="w-32 h-32 bg-gray-800 flex items-center justify-center cursor-pointer hover:bg-gray-700 transition-colors relative group"
                            style={{ borderRadius: '0px' }}
                            onClick={() => {
                              // 영상 상세보기 팝업 열기
                              setVideoDetailPopup({
                                cctvId: selectedCCTV?.cctv.cctvCode || selectedCCTV?.cctv.id || 'CCTV-001',
                                incidentId: media.incidentId?.toString(),
                                incidentCode: media.incidentCode,
                                location: selectedCCTV?.cctv.location || '위치 정보 없음',
                                time: media.timestamp,
                                confidence: '85%',
                                type: mockIncidentType as 'fire' | 'emergency' | 'trash'
                              });
                            }}
                          >
                            {media.thumbnailUrl ? (
                              <img src={media.thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                            ) : (
                              <div className="text-center">
                                <Video className="w-12 h-12 text-gray-400 mx-auto mb-1" />
                                <p className="text-xs text-gray-400">영상 재생</p>
                              </div>
                            )}
                            {/* 재생 버튼 오버레이 */}
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center transition-all">
                              <div className="w-12 h-12 rounded-full bg-white bg-opacity-0 group-hover:bg-opacity-90 flex items-center justify-center transition-all">
                                <VideoIcon className="w-6 h-6 text-gray-800 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* 하단: 버튼 그룹 */}
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              // 사건 상세정보 팝업 열기
                              // media에 incidentId가 있으면 실제 DB에서 가져오기
                              if ((media as any).incidentId) {
                                const incidentId = typeof (media as any).incidentId === 'string' 
                                  ? parseInt((media as any).incidentId) 
                                  : (media as any).incidentId;
                                
                                try {
                                  let detailData;
                                  if (mockIncidentType === 'fire') {
                                    detailData = await getFireDetail(incidentId);
                                  } else if (mockIncidentType === 'emergency') {
                                    detailData = await getEmergencyDetail(incidentId);
                                  } else {
                                    detailData = await getTrashDetail(incidentId);
                                  }
                                  
                                  if (detailData) {
                                    setIncidentDetailPopup({
                                      type: mockIncidentType as 'fire' | 'emergency' | 'trash',
                                      detail: {
                                        accidentCode: detailData.accidentCode || (media as any).incidentCode || `INC-${incidentId}`,
                                        cctvId: detailData.cctvCode || detailData.cctvId || selectedCCTV?.cctv.cctvCode || selectedCCTV?.cctv.id || 'CCTV-001',
                                        location: detailData.location || selectedCCTV?.cctv.location || '위치 정보 없음',
                                        detectedAt: detailData.time || media.timestamp,
                                        confidence: detailData.confidence || '85%',
                                        status: detailData.status || mockIncidentStatus,
                                        processor: detailData.handler || '담당자',
                                        modelName: detailData.modelName || 'FireDetect-v2',
                                        modelVersion: detailData.modelVersion || '2.1.0'
                                      } as any
                                    });
                                    return;
                                  }
                                } catch (error) {
                                  console.error('❌ [MainMap] Failed to load incident detail:', error);
                                }
                              }
                              
                              // incidentId가 없거나 API 호출 실패 시 임시 데이터 사용
                              setIncidentDetailPopup({
                                type: mockIncidentType as 'fire' | 'emergency' | 'trash',
                                detail: {
                                  accidentCode: (media as any).incidentCode || '정보 없음',
                                  cctvId: selectedCCTV?.cctv.cctvCode || selectedCCTV?.cctv.id || 'CCTV-001',
                                  location: selectedCCTV?.cctv.location || '위치 정보 없음',
                                  detectedAt: media.timestamp,
                                  confidence: '85%',
                                  status: mockIncidentStatus,
                                  processor: '담당자',
                                  modelName: 'FireDetect-v2',
                                  modelVersion: '2.1.0'
                                } as any
                              });
                            }}
                            className="flex-1 px-3 py-2 text-xs bg-blue-500 text-white hover:bg-blue-600 transition-colors flex items-center justify-center gap-1"
                            style={{ borderRadius: '0px' }}
                          >
                            <Eye className="w-3 h-3" />
                            사건 상세정보
                          </button>
                          <button
                            onClick={() => {
                              // TODO: 실제 다운로드 로직
                              alert(`영상과 이미지를 다운로드합니다.\n${media.timestamp}`);
                            }}
                            className="flex-1 px-3 py-2 text-xs bg-green-500 text-white hover:bg-green-600 transition-colors flex items-center justify-center gap-1"
                            style={{ borderRadius: '0px' }}
                          >
                            <Download className="w-3 h-3" />
                            다운로드
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 text-sm border border-gray-200" style={{ borderRadius: '0px' }}>
                  영상이 없습니다
                </div>
              )}
              
              {/* CCTV 관리 페이지로 이동 버튼 */}
              <button
                onClick={() => {
                  // CCTV 관리 페이지로 이동
                  onNavigate('cctv-management');
                  setSelectedCCTV(null); // 팝업 닫기
                }}
                className="w-full mt-3 px-4 py-2 text-sm bg-gray-700 text-white hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                style={{ borderRadius: '0px' }}
              >
                더보기 (CCTV 관리)
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedDetection && (
        <div 
          className="fixed bg-white shadow-2xl border-2 border-gray-300"
          style={{ 
            borderRadius: '0px', 
            left: `${popupPositions.detection.x}px`, 
            top: `${popupPositions.detection.y}px`,
            width: '500px',
            maxHeight: '600px',
            zIndex: 2100
          }}
        >
          <div 
            className="bg-emerald-600 px-4 py-3 flex items-center justify-between cursor-move"
            style={{ borderRadius: '0px' }}
            onMouseDown={(e) => startDrag('detection', e)}
          >
            <div className="flex items-center gap-2">
              <Move className="w-4 h-4 text-white" />
              <h3 className="text-white">탐지 상세 정보</h3>
            </div>
            <button onClick={() => setSelectedDetection(null)} className="text-white hover:text-gray-200">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 max-h-[calc(600px-60px)] overflow-y-auto">
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-1">CCTV ID</p>
              <p className="text-gray-900">{selectedDetection.marker.id}</p>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-1">위치</p>
              <p className="text-gray-900">{selectedDetection.marker.location}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-2">탐지된 사고 ({selectedDetection.incidents.length}건)</p>
              <div className="space-y-2">
                {selectedDetection.incidents
                  .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
                  .map((incident, index) => {
                  console.log('Rendering incident:', incident);
                  // 최근 10분 이내 사건을 NEW로 표시
                  const incidentTime = new Date(incident.time);
                  const now = new Date();
                  const diffMinutes = (now.getTime() - incidentTime.getTime()) / (1000 * 60);
                  const isNew = diffMinutes < 10;
                  
                  return (
                    <div key={incident.id || index} className="p-3 border border-gray-200 relative" style={{ borderRadius: '0px' }}>
                      {/* NEW 배지 */}
                      {isNew && (
                        <div className="absolute -top-2 -right-2 bg-red-500 text-white px-2 py-0.5 text-xs font-bold" style={{ borderRadius: '0px' }}>
                          NEW
                        </div>
                      )}
                      
                      {/* 유형 배지와 시간을 같은 줄에 */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs ${getIncidentColor(incident.type)} flex items-center gap-1`} style={{ borderRadius: '0px' }}>
                            {incident.type === 'fire' && <Flame className="w-3 h-3" />}
                            {incident.type === 'emergency' && <AlertCircle className="w-3 h-3" />}
                            {incident.type === 'trash' && <Trash2 className="w-3 h-3" />}
                            {getIncidentLabel(incident.type)}
                          </span>
                          {incident.sourceType === 'MANUAL' && (
                            <span className="px-2 py-1 text-xs bg-gray-200 text-gray-700" style={{ borderRadius: '0px' }}>
                              수동등록
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">{incident.time}</span>
                      </div>
                      
                      {/* 사건 ID - 유형 아래로 이동 */}
                      <div className="mb-2">
                        <p className="text-xs text-gray-500">사건 ID: {incident.incidentCode || `INC-${incident.id}`}</p>
                        {incident.locationDesc && (
                          <p className="text-xs text-gray-500">위치: {incident.locationDesc}</p>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-700">신뢰도</span>
                        <span className="text-sm text-emerald-600">{incident.confidence}</span>
                      </div>
                      
                      {/* 자세히보기 버튼 - 모든 유형 지원 */}
                      <button
                        onClick={() => {
                          console.log('자세히보기 clicked:', incident.type);
                          setVideoDetailPopup({
                            cctvId: selectedDetection.marker.id,
                            incidentId: incident.id.toString(),
                            incidentCode: incident.incidentCode,
                            location: incident.locationDesc || selectedDetection.marker.location,
                            time: incident.time,
                            confidence: incident.confidence,
                            type: incident.type
                          });
                        }}
                        className="w-full mt-2 px-4 py-2 text-white transition-colors flex items-center justify-center gap-2"
                        style={{ 
                          borderRadius: '0px',
                          backgroundColor: incident.type === 'fire' ? '#DC2626' : incident.type === 'emergency' ? '#9333EA' : '#10B981',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = incident.type === 'fire' ? '#B91C1C' : incident.type === 'emergency' ? '#7E22CE' : '#059669';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = incident.type === 'fire' ? '#DC2626' : incident.type === 'emergency' ? '#9333EA' : '#10B981';
                        }}
                      >
                        <Eye className="w-4 h-4" />
                        자세히보기
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedNotification && (
        <div 
          className="fixed bg-white shadow-2xl border-2 border-gray-300"
          style={{ 
            borderRadius: '0px', 
            left: `${popupPositions.notification.x}px`, 
            top: `${popupPositions.notification.y}px`,
            width: '500px',
            zIndex: 300
          }}
        >
          <div 
            className="bg-emerald-600 px-4 py-3 flex items-center justify-between cursor-move"
            style={{ borderRadius: '0px' }}
            onMouseDown={(e) => startDrag('notification', e)}
          >
            <div className="flex items-center gap-2">
              <Move className="w-4 h-4 text-white" />
              <h3 className="text-white">알림 상세 정보</h3>
            </div>
            <button onClick={() => { setSelectedNotification(null); setHighlightedCCTV(null); }} className="text-white hover:text-gray-200">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4">
            <div className="mb-3">
              <p className="text-sm text-gray-500 mb-1">CCTV ID</p>
              <p className="text-gray-900">{selectedNotification.cctvId}</p>
            </div>
            <div className="mb-3">
              <p className="text-sm text-gray-500 mb-1">위치</p>
              <p className="text-gray-900">{selectedNotification.location}</p>
            </div>
            <div className="mb-3">
              <p className="text-sm text-gray-500 mb-1">탐지 유형</p>
              <span className={`inline-block px-2 py-1 text-xs ${getIncidentColor(selectedNotification.type)}`} style={{ borderRadius: '0px' }}>
                {getIncidentLabel(selectedNotification.type)}
              </span>
            </div>
            <div className="mb-3">
              <p className="text-sm text-gray-500 mb-1">발생 시간</p>
              <p className="text-gray-900">{selectedNotification.time}</p>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-1">신뢰도</p>
              <p className="text-emerald-600">{selectedNotification.confidence}</p>
            </div>
            <div className="h-48 bg-gray-200 flex items-center justify-center mb-3" style={{ borderRadius: '0px' }}>
              <Camera className="w-12 h-12 text-gray-400" />
            </div>
            
            {/* 화재 또는 응급인 경우 자세히보기 버튼 표시 */}
            {(selectedNotification.type === 'fire' || selectedNotification.type === 'emergency') && (
              <button
                onClick={() => {
                  setVideoDetailPopup({
                    cctvId: selectedNotification.cctvId,
                    location: selectedNotification.location,
                    time: selectedNotification.time,
                    confidence: selectedNotification.confidence,
                    type: selectedNotification.type as 'fire' | 'emergency'
                  });
                  setSelectedNotification(null);
                }}
                className={`w-full mb-3 px-4 py-2 ${selectedNotification.type === 'fire' ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'} text-white transition-colors flex items-center justify-center gap-2`}
                style={{ borderRadius: '0px' }}
              >
                <Eye className="w-4 h-4" />
                자세히보기
              </button>
            )}
            
            <div className="flex gap-2">
              <button 
                onClick={() => alert('문자신고 기능이 실행됩니다.')}
                className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2" 
                style={{ borderRadius: '0px' }}
              >
                <MessageSquare className="w-4 h-4" />
                문자신고
              </button>
              <button 
                onClick={() => alert('영상 다운로드가 시작됩니다.')}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2" 
                style={{ borderRadius: '0px' }}
              >
                <Download className="w-4 h-4" />
                다운로드
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 화재/응급/쓰레기 영상 상세 팝업 */}
      {videoDetailPopup && (
        <div 
          className="fixed bg-white shadow-2xl"
          style={{ 
            borderRadius: '0px', 
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '680px',
            maxHeight: '98vh',
            overflowY: 'auto',
            zIndex: 3000,
            border: `2px solid ${videoDetailPopup.type === 'fire' ? '#DC2626' : videoDetailPopup.type === 'emergency' ? '#9333EA' : '#10B981'}`,
          }}
        >
          <div 
            className="px-4 py-3 flex items-center justify-between"
            style={{ 
              borderRadius: '0px',
              backgroundColor: videoDetailPopup.type === 'fire' ? '#DC2626' : videoDetailPopup.type === 'emergency' ? '#9333EA' : '#10B981',
            }}
          >
            <div className="flex items-center gap-2">
              {videoDetailPopup.type === 'fire' ? (
                <Flame className="w-5 h-5 text-white" />
              ) : videoDetailPopup.type === 'emergency' ? (
                <AlertCircle className="w-5 h-5 text-white" />
              ) : (
                <Trash2 className="w-5 h-5 text-white" />
              )}
              <h3 className="text-white font-semibold">
                {videoDetailPopup.type === 'fire' ? '화재 영상 상세보기' : videoDetailPopup.type === 'emergency' ? '응급 영상 상세보기' : '쓰레기 투기 영상 상세보기'}
              </h3>
            </div>
            <button 
              onClick={() => setVideoDetailPopup(null)} 
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4">
            <div className="mb-3">
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">CCTV ID</p>
                  <p className="text-sm text-gray-900">{videoDetailPopup.cctvId}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">사건 ID</p>
                  <p className="text-sm text-gray-900">{videoDetailPopup.incidentCode || (videoDetailPopup.incidentId ? `INC-${videoDetailPopup.incidentId}` : '사건 ID 없음')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">위치</p>
                  <p className="text-sm text-gray-900">{videoDetailPopup.location}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">발생시간</p>
                  <p className="text-sm text-gray-900">{videoDetailPopup.time}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">신뢰도</p>
                  <p className="text-sm text-red-600">{videoDetailPopup.confidence}</p>
                </div>
              </div>
            </div>

            {/* 현재 영상 영역 */}
            <div className="mb-3">
              <p className="text-sm text-gray-500 mb-2">
                {videoDetailPopup.type === 'trash' ? '녹화 영상' : '감지 영상'}
              </p>
              <div className="bg-gray-900 flex items-center justify-center relative" style={{ borderRadius: '0px', aspectRatio: '16 / 9', width: '100%' }}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    {videoDetailPopup.type === 'fire' ? (
                      <>
                        <Flame className="w-16 h-16 text-red-500 mx-auto mb-2 animate-pulse" />
                        <p className="text-white text-sm">화재 탐지 영상</p>
                      </>
                    ) : videoDetailPopup.type === 'emergency' ? (
                      <>
                        <AlertCircle className="w-16 h-16 text-purple-500 mx-auto mb-2 animate-pulse" />
                        <p className="text-white text-sm">응급 탐지 영상</p>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-16 h-16 text-green-500 mx-auto mb-2" />
                        <p className="text-white text-sm">쓰레기 투기 녹화 영상</p>
                      </>
                    )}
                    <p className="text-gray-400 text-xs mt-1">{videoDetailPopup.cctvId} - {videoDetailPopup.time}</p>
                  </div>
                </div>
              </div>
              
              {/* 영상/이미지 정보 */}
              <div className="mt-2 flex items-center gap-6">
                <div className="flex items-center gap-2 text-sm">
                  <Camera className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">이미지:</span>
                  <span className="text-gray-900 font-medium">2.4MB</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Video className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">영상:</span>
                  <span className="text-gray-900 font-medium">15초 | 8.5MB</span>
                </div>
              </div>
            </div>

            {/* 사건 상세보기 버튼 */}
            <button 
              onClick={async () => {
                // 실제 DB에서 상세 정보 가져오기
                if (!videoDetailPopup.incidentId) {
                  alert('사건 ID가 없습니다.');
                  return;
                }
                
                const incidentId = parseInt(videoDetailPopup.incidentId);
                
                try {
                  if (videoDetailPopup.type === 'fire') {
                    // 화재 상세 정보 API 호출
                    const detailData = await getFireDetail(incidentId);
                    if (!detailData) {
                      alert('사건 정보를 가져올 수 없습니다.');
                      return;
                    }
                    
                    const fireDetail: FireDetail = {
                      id: detailData.id,
                      accidentCode: detailData.accidentCode || videoDetailPopup.incidentCode || `INC-${incidentId}`,
                      cctvId: detailData.cctvCode || detailData.cctvId || videoDetailPopup.cctvId,
                      time: detailData.time || videoDetailPopup.time,
                      status: detailData.status || '대기중',
                      severity: detailData.severity === '상' ? 'high' : detailData.severity === '중' ? 'medium' : 'low',
                      windSpeed: detailData.windSpeed || detailData.windInfo || '정보 없음',
                      handler: detailData.handler || '미배정',
                      location: detailData.location || videoDetailPopup.location,
                      detectionBasis: detailData.detectionBasis || 'AI 자동 탐지',
                    };
                    setIncidentDetailPopup({ type: 'fire', detail: fireDetail });
                  } else if (videoDetailPopup.type === 'emergency') {
                    // 응급 상세 정보 API 호출
                    const detailData = await getEmergencyDetail(incidentId);
                    if (!detailData) {
                      alert('사건 정보를 가져올 수 없습니다.');
                      return;
                    }
                    
                    const emergencyDetail: EmergencyDetail = {
                      id: detailData.id,
                      accidentCode: detailData.accidentCode || videoDetailPopup.incidentCode || `INC-${incidentId}`,
                      type: detailData.type || '응급',
                      cctvId: detailData.cctvCode || detailData.cctvId || videoDetailPopup.cctvId,
                      time: detailData.time || videoDetailPopup.time,
                      status: detailData.status || '대기중',
                      severity: detailData.severity === '상' ? 'high' : detailData.severity === '중' ? 'medium' : 'low',
                      handler: detailData.handler || '미배정',
                      location: detailData.location || videoDetailPopup.location,
                      detectionBasis: detailData.detectionBasis || 'AI 자동 탐지',
                    };
                    setIncidentDetailPopup({ type: 'emergency', detail: emergencyDetail });
                  } else {
                    // 쓰레기 상세 정보 API 호출
                    const detailData = await getTrashDetail(incidentId);
                    if (!detailData) {
                      alert('사건 정보를 가져올 수 없습니다.');
                      return;
                    }
                    
                    const trashDetail: TrashDetail = {
                      id: detailData.id,
                      accidentCode: detailData.accidentCode || videoDetailPopup.incidentCode || `INC-${incidentId}`,
                      cctvId: detailData.cctvCode || detailData.cctvId || videoDetailPopup.cctvId,
                      time: detailData.time || videoDetailPopup.time,
                      status: detailData.status || '미처리',
                      severity: detailData.severity === '상' ? 'high' : detailData.severity === '중' ? 'medium' : 'low',
                      type: detailData.trashType || '무단투기',
                      handler: detailData.handler || '미배정',
                      location: detailData.location || videoDetailPopup.location,
                      detectionBasis: detailData.detectionBasis || 'AI 자동 탐지',
                    };
                    setIncidentDetailPopup({ type: 'trash', detail: trashDetail });
                  }
                } catch (error) {
                  console.error('❌ [MainMap] Failed to load incident detail:', error);
                  alert('사건 정보를 가져오는 중 오류가 발생했습니다.');
                }
              }}
              className="w-full px-4 py-3 mb-2 text-white transition-colors flex items-center justify-center gap-2" 
              style={{ 
                borderRadius: '0px',
                backgroundColor: '#6B7280',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#4B5563';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#6B7280';
              }}
            >
              <Eye className="w-5 h-5" />
              사건 상세보기
            </button>

            {/* 버튼 영역 */}
            {videoDetailPopup.type === 'trash' ? (
              // 쓰레기는 다운로드만
              <button 
                onClick={() => {
                  // TODO: 백엔드 API 연동
                  // fetch(`/api/cctv/${videoDetailPopup.cctvId}/video?timestamp=${videoDetailPopup.time}`)
                  alert(`${videoDetailPopup.cctvId}의 쓰레기 투기 영상을 다운로드합니다.`);
                }}
                className="w-full px-4 py-3 text-white transition-colors flex items-center justify-center gap-2" 
                style={{ 
                  borderRadius: '0px',
                  backgroundColor: '#10B981',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#059669';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#10B981';
                }}
              >
                <Download className="w-5 h-5" />
                다운로드
              </button>
            ) : (
              // 화재/응급은 문자신고 + 다운로드
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    // TODO: 백엔드 API 연동
                    // fetch('/api/alert/sms', { method: 'POST', body: JSON.stringify({ cctvId, type, time }) })
                    alert(`${videoDetailPopup.type === 'fire' ? '화재' : '응급'} 문자신고 기능이 실행됩니다.`);
                  }}
                  className="flex-1 px-4 py-3 text-white transition-colors flex items-center justify-center gap-2" 
                  style={{ 
                    borderRadius: '0px',
                    backgroundColor: '#2563EB',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#1D4ED8';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#2563EB';
                  }}
                >
                  <MessageSquare className="w-5 h-5" />
                  문자신고
                </button>
                <button 
                  onClick={() => {
                    // TODO: 백엔드 API 연동
                    // fetch(`/api/cctv/${videoDetailPopup.cctvId}/video?timestamp=${videoDetailPopup.time}`)
                    alert(`${videoDetailPopup.type === 'fire' ? '화재' : '응급'} 영상 다운로드가 시작됩니다.`);
                  }}
                  className="flex-1 px-4 py-3 text-white transition-colors flex items-center justify-center gap-2" 
                  style={{ 
                    borderRadius: '0px',
                    backgroundColor: '#10B981',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#059669';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#10B981';
                  }}
                >
                  <Download className="w-5 h-5" />
                  다운로드
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 개별 사건 상세보기 팝업 */}
      {incidentDetailPopup && incidentDetailPopup.type === 'fire' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 10000 }} onClick={() => { setIncidentDetailPopup(null); setIsEditingIncident(false); }}>
          <div className="bg-white rounded-lg shadow-xl w-full max-h-[95vh] overflow-y-auto" style={{ maxWidth: '1100px' }} onClick={(e) => e.stopPropagation()}>
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200" style={{ backgroundColor: '#DC2626' }}>
              <h2 className="text-xl font-semibold text-white">화재 상세정보</h2>
              <button onClick={() => { setIncidentDetailPopup(null); setIsEditingIncident(false); }} className="text-white hover:text-gray-200 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* 모달 내용 */}
            <div className="flex p-4 gap-4">
              {/* 좌측 패널 */}
              <div className="flex-1 flex flex-col">
                {/* 지도 영역 */}
                <div className="border border-gray-300 mb-3" style={{ height: '380px', borderRadius: '0px' }}>
                  <MapContainer
                    center={[35.2456, 129.0917]} 
                    zoom={15}
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker 
                      position={[35.2456, 129.0917]}
                      icon={L.divIcon({
                        className: 'custom-fire-marker',
                        html: `<div style="width: 40px; height: 40px;">
                          <svg viewBox="0 0 96.72 125.04" style="filter: drop-shadow(3px 3px 3px rgba(0,0,0,0.3));">
                            <path fill="#FFFFFF" d="M74.481,41.241c0,18.358-33.24,61.788-33.24,61.788S8,59.6,8,41.241C8,22.882,22.883,8,41.241,8S74.481,22.882,74.481,41.241z"/>
                            <circle fill="#FF5A5A" cx="41.241" cy="40.43" r="27.834"/>
                            <path fill="#FFFFFF" d="M39.315,62.526c-1.129-0.265-2.201-0.461-3.24-0.768c-3.325-0.981-6.234-2.669-8.475-5.351c-3.346-4.005-3.923-8.571-2.506-13.47c0.9-3.116,2.497-5.878,4.46-8.513c1.253,1.481,2.71,2.619,4.431,3.455c0.192-1.104,0.336-2.173,0.57-3.221c0.486-2.171,1.583-4.062,2.759-5.922c0.688-1.088,1.359-2.202,1.874-3.377c0.9-2.051,0.513-4.109-0.238-6.125c-0.096-0.258-0.192-0.516-0.286-0.775c-0.005-0.014,0.018-0.037,0.061-0.123c0.323,0.133,0.664,0.25,0.983,0.41c5.765,2.889,9.475,7.502,11.36,13.621c0.751,2.437,1.179,4.941,1.136,7.492c-0.02,1.173,1.105,1.772,1.99,1.183c0.793-0.528,1.469-1.236,2.168-1.895c0.28-0.264,0.485-0.607,0.835-1.056c0.18,0.884,0.358,1.626,0.478,2.377c0.55,3.489,0.664,6.97-0.154,10.445c-1.42,6.037-6.055,10.397-12.136,11.284c0.237-0.108,0.475-0.216,0.713-0.324c2.647-1.206,4.573-3.046,5.035-6.039c0.138-0.891,0.072-1.846-0.075-2.742c-0.33-1.998-1.318-3.71-2.477-5.282c-0.792,0.606-1.55,1.186-2.468,1.888c-0.06-2.291-1.013-4.01-2.138-5.657c-0.935-1.371-1.033-2.822-0.469-4.35c0.046-0.126,0.088-0.254,0.132-0.381c-0.041-0.056-0.082-0.111-0.123-0.167c-0.83,0.53-1.714,0.993-2.482,1.603c-2.485,1.972-3.836,4.612-4.328,7.712c-0.104,0.658-0.141,1.328-0.183,1.994c-0.052,0.837-0.525,1.109-1.242,0.667c-0.27-0.167-0.502-0.402-0.73-0.629c-0.209-0.209-0.389-0.448-0.732-0.852c-0.151,1.162-0.342,2.141-0.396,3.126c-0.17,3.073,0.414,5.919,2.922,7.986C37.194,61.451,38.253,61.901,39.315,62.526z"/>
                          </svg>
                        </div>`,
                        iconSize: [40, 40],
                        iconAnchor: [20, 40],
                      })}
                    />
                  </MapContainer>
                </div>
                
                {/* 영상/이미지 영역 */}
                <div className="flex gap-3">
                  <div className="flex-1 bg-gray-100 border border-gray-300 flex items-center justify-center" style={{ aspectRatio: '16/9', borderRadius: '0px' }}>
                    <div className="text-center text-gray-500">
                      <Video className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm">영상</p>
                    </div>
                  </div>
                  <div className="flex-1 bg-gray-100 border border-gray-300 flex items-center justify-center" style={{ aspectRatio: '16/9', borderRadius: '0px' }}>
                    <div className="text-center text-gray-500">
                      <Camera className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm">이미지</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 우측 패널 */}
              <div className="flex-1 flex flex-col">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">상세정보 내용</h3>
                <div className="grid grid-cols-2 gap-x-8 gap-y-5 flex-1">
                  <div>
                    <label className="text-sm text-gray-600">사고 코드</label>
                    {isEditingIncident && editedIncidentDetail ? (
                      <input
                        type="text"
                        value={(editedIncidentDetail as FireDetail).accidentCode}
                        onChange={(e) => handleIncidentFieldChange('accidentCode', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                        style={{ borderRadius: '0px' }}
                      />
                    ) : (
                      <p className="text-gray-900 mt-1">{incidentDetailPopup.detail.accidentCode}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">CCTV ID</label>
                    {isEditingIncident && editedIncidentDetail ? (
                      <input
                        type="text"
                        value={(editedIncidentDetail as FireDetail).cctvId}
                        onChange={(e) => handleIncidentFieldChange('cctvId', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                        style={{ borderRadius: '0px' }}
                      />
                    ) : (
                      <p className="text-gray-900 mt-1">{incidentDetailPopup.detail.cctvId}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">위치</label>
                    {isEditingIncident && editedIncidentDetail ? (
                      <input
                        type="text"
                        value={(editedIncidentDetail as FireDetail).location || ''}
                        onChange={(e) => handleIncidentFieldChange('location', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                        style={{ borderRadius: '0px' }}
                      />
                    ) : (
                      <p className="text-gray-900 mt-1">{incidentDetailPopup.detail.location}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">유형</label>
                    <p className="text-gray-900 mt-1">화재</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">발생시간</label>
                    {isEditingIncident && editedIncidentDetail ? (
                      <input
                        type="text"
                        value={(editedIncidentDetail as FireDetail).time}
                        onChange={(e) => handleIncidentFieldChange('time', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                        style={{ borderRadius: '0px' }}
                      />
                    ) : (
                      <p className="text-gray-900 mt-1">{incidentDetailPopup.detail.time}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">심각도</label>
                    {isEditingIncident && editedIncidentDetail ? (
                      <select
                        value={(editedIncidentDetail as FireDetail).severity}
                        onChange={(e) => handleIncidentFieldChange('severity', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                        style={{ borderRadius: '0px' }}
                      >
                        <option value="high">상</option>
                        <option value="medium">중</option>
                        <option value="low">하</option>
                      </select>
                    ) : (
                      <p className="mt-1">
                        <span className={`px-2 py-1 text-xs ${
                          incidentDetailPopup.detail.severity === 'high' 
                            ? 'bg-red-100 text-red-700' 
                            : incidentDetailPopup.detail.severity === 'medium'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-blue-100 text-blue-700'
                        }`} style={{ borderRadius: '0px' }}>
                          {incidentDetailPopup.detail.severity === 'high' ? '상' : incidentDetailPopup.detail.severity === 'medium' ? '중' : '하'}
                        </span>
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">상태</label>
                    {isEditingIncident && editedIncidentDetail ? (
                      <select
                        value={(editedIncidentDetail as FireDetail).status}
                        onChange={(e) => handleIncidentFieldChange('status', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                        style={{ borderRadius: '0px' }}
                      >
                        <option value="대기중">대기중</option>
                        <option value="진화중">진화중</option>
                        <option value="진화완료">진화완료</option>
                      </select>
                    ) : (
                      <p className="mt-1">
                        <span className={`px-2 py-1 text-xs ${
                          incidentDetailPopup.detail.status === '진화완료'
                            ? 'bg-green-100 text-green-700' 
                            : incidentDetailPopup.detail.status === '진화중'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-gray-100 text-gray-700'
                        }`} style={{ borderRadius: '0px' }}>
                          {incidentDetailPopup.detail.status}
                        </span>
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">처리자</label>
                    {isEditingIncident && editedIncidentDetail ? (
                      <input
                        type="text"
                        value={(editedIncidentDetail as FireDetail).handler}
                        onChange={(e) => handleIncidentFieldChange('handler', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                        style={{ borderRadius: '0px' }}
                      />
                    ) : (
                      <p className="text-gray-900 mt-1">{incidentDetailPopup.detail.handler}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">탐지근거</label>
                    {isEditingIncident && editedIncidentDetail ? (
                      <input
                        type="text"
                        value={(editedIncidentDetail as FireDetail).detectionBasis || ''}
                        onChange={(e) => handleIncidentFieldChange('detectionBasis', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                        style={{ borderRadius: '0px' }}
                      />
                    ) : (
                      <p className="text-gray-900 mt-1">{incidentDetailPopup.detail.detectionBasis || 'AI 자동 탐지'}</p>
                    )}
                  </div>
                  
                  {/* 모델 정보 (AI 자동 탐지인 경우에만) */}
                  {incidentDetailPopup.detail.detectionBasis === 'AI 자동 탐지' && (
                    <>
                      <div>
                        <label className="text-sm text-gray-600">모델명</label>
                        <p className="text-gray-900 mt-1">FireDetectionModel-v2</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">모델버전</label>
                        <p className="text-gray-900 mt-1">2.0.3</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">신뢰도</label>
                        <p className="text-emerald-600 mt-1 font-medium">92%</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">신뢰도 근거</label>
                        <p className="text-gray-900 mt-1 text-sm">화염 패턴 명확, 연기 농도 높음, 온도 상승 감지</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600 flex items-center gap-1">
                          심각도 상세
                          <span className="text-xs text-gray-400 cursor-help" title="위험도 점수 계산 방법: 화염 크기 + 연기 농도 + 확산 속도">(?)</span>
                        </label>
                        <p className="text-gray-900 mt-1 text-sm">위험도 점수: 85/100 (화염 크기: 높음, 연기 농도: 높음, 확산 속도: 중간)</p>
                      </div>
                    </>
                  )}
                  
                  <div>
                    <label className="text-sm text-gray-600">풍향/풍속</label>
                    <p className="text-gray-900 mt-1">남동풍 15m/s</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">확산 방향</label>
                    <p className="text-gray-900 mt-1">북서쪽 방향</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">주변 위험</label>
                    <p className="text-gray-900 mt-1">등산객 10명 예상, 목조 건물 50m 거리</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">상황메모</label>
                    {isEditingIncident && editedIncidentDetail ? (
                      <textarea
                        value={(editedIncidentDetail as FireDetail).note || ''}
                        onChange={(e) => handleIncidentFieldChange('note', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                        style={{ borderRadius: '0px' }}
                        rows={3}
                      />
                    ) : (
                      <p className="text-gray-900 mt-1">초기 화염 발견, 소방대 출동 요청함</p>
                    )}
                  </div>
                </div>

                {/* 하단 버튼 */}
                <div className="flex gap-3 mt-6">
                  {isEditingIncident ? (
                    <>
                      <button 
                        onClick={handleIncidentSave}
                        className="flex-1 px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2" 
                        style={{ borderRadius: '0px' }}
                      >
                        <Save className="w-4 h-4" />
                        저장
                      </button>
                      <button 
                        onClick={handleIncidentCancel}
                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors" 
                        style={{ borderRadius: '0px' }}
                      >
                        취소
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={handleIncidentEditClick}
                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors flex items-center justify-center gap-2" 
                        style={{ borderRadius: '0px' }}
                      >
                        <Edit2 className="w-4 h-4" />
                        수정
                      </button>
                      <button 
                        onClick={() => {
                          setShowFalseReportModal(true);
                        }}
                        className="flex-1 px-4 py-2 bg-red-500 text-white hover:bg-red-600 transition-colors" 
                        style={{ borderRadius: '0px' }}
                      >
                        오탐처리
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 응급 상세보기 팝업 */}
      {incidentDetailPopup && incidentDetailPopup.type === 'emergency' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 10000 }} onClick={() => { setIncidentDetailPopup(null); setIsEditingIncident(false); }}>
          <div className="bg-white rounded-lg shadow-xl w-full max-h-[95vh] overflow-y-auto" style={{ maxWidth: '1100px' }} onClick={(e) => e.stopPropagation()}>
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200" style={{ backgroundColor: '#9333EA' }}>
              <h2 className="text-xl font-semibold text-white">응급 상세정보</h2>
              <button onClick={() => { setIncidentDetailPopup(null); setIsEditingIncident(false); }} className="text-white hover:text-gray-200 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* 모달 내용 */}
            <div className="flex p-4 gap-4">
              {/* 좌측 패널 */}
              <div className="flex-1 flex flex-col">
                {/* 지도 영역 */}
                <div className="border border-gray-300 mb-3" style={{ height: '380px', borderRadius: '0px' }}>
                  <MapContainer
                    center={[35.2456, 129.0917]} 
                    zoom={15}
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker 
                      position={[35.2456, 129.0917]}
                      icon={L.divIcon({
                        className: 'custom-emergency-marker',
                        html: `<div style="width: 40px; height: 40px;">
                          <svg viewBox="0 0 96.72 125.04" style="filter: drop-shadow(3px 3px 3px rgba(0,0,0,0.3));">
                            <path fill="#FFFFFF" d="M74.481,41.241c0,18.358-33.24,61.788-33.24,61.788S8,59.6,8,41.241C8,22.882,22.883,8,41.241,8S74.481,22.882,74.481,41.241z"/>
                            <circle fill="#9333EA" cx="41.241" cy="40.43" r="27.834"/>
                            <path fill="#FFFFFF" d="M41.24,24.5c-8.82,0-16,7.18-16,16s7.18,16,16,16s16-7.18,16-16S50.06,24.5,41.24,24.5z M48.74,42h-5v5h-5v-5h-5v-5h5v-5h5v5h5V42z"/>
                            <path fill="#FFFFFF" d="M39.315,62.526c-1.129-0.265-2.201-0.461-3.24-0.768c-3.325-0.981-6.234-2.669-8.475-5.351c-3.346-4.005-3.923-8.571-2.506-13.47c0.9-3.116,2.497-5.878,4.46-8.513c1.253,1.481,2.71,2.619,4.431,3.455c0.192-1.104,0.336-2.173,0.57-3.221c0.486-2.171,1.583-4.062,2.759-5.922c0.688-1.088,1.359-2.202,1.874-3.377c0.9-2.051,0.513-4.109-0.238-6.125c-0.096-0.258-0.192-0.516-0.286-0.775c-0.005-0.014,0.018-0.037,0.061-0.123c0.323,0.133,0.664,0.25,0.983,0.41c5.765,2.889,9.475,7.502,11.36,13.621c0.751,2.437,1.179,4.941,1.136,7.492c-0.02,1.173,1.105,1.772,1.99,1.183c0.793-0.528,1.469-1.236,2.168-1.895c0.28-0.264,0.485-0.607,0.835-1.056c0.18,0.884,0.358,1.626,0.478,2.377c0.55,3.489,0.664,6.97-0.154,10.445c-1.42,6.037-6.055,10.397-12.136,11.284c0.237-0.108,0.475-0.216,0.713-0.324c2.647-1.206,4.573-3.046,5.035-6.039c0.138-0.891,0.072-1.846-0.075-2.742c-0.33-1.998-1.318-3.71-2.477-5.282c-0.792,0.606-1.55,1.186-2.468,1.888c-0.06-2.291-1.013-4.01-2.138-5.657c-0.935-1.371-1.033-2.822-0.469-4.35c0.046-0.126,0.088-0.254,0.132-0.381c-0.041-0.056-0.082-0.111-0.123-0.167c-0.83,0.53-1.714,0.993-2.482,1.603c-2.485,1.972-3.836,4.612-4.328,7.712c-0.104,0.658-0.141,1.328-0.183,1.994c-0.052,0.837-0.525,1.109-1.242,0.667c-0.27-0.167-0.502-0.402-0.73-0.629c-0.209-0.209-0.389-0.448-0.732-0.852c-0.151,1.162-0.342,2.141-0.396,3.126c-0.17,3.073,0.414,5.919,2.922,7.986C37.194,61.451,38.253,61.901,39.315,62.526z"/>
                          </svg>
                        </div>`,
                        iconSize: [40, 40],
                        iconAnchor: [20, 40],
                      })}
                    />
                  </MapContainer>
                </div>
                
                {/* 영상/이미지 영역 */}
                <div className="flex gap-3">
                  <div className="flex-1 bg-gray-100 border border-gray-300 flex items-center justify-center" style={{ aspectRatio: '16/9', borderRadius: '0px' }}>
                    <div className="text-center text-gray-500">
                      <Video className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm">영상</p>
                    </div>
                  </div>
                  <div className="flex-1 bg-gray-100 border border-gray-300 flex items-center justify-center" style={{ aspectRatio: '16/9', borderRadius: '0px' }}>
                    <div className="text-center text-gray-500">
                      <Camera className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm">이미지</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 우측 패널 */}
              <div className="flex-1 flex flex-col">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">상세정보 내용</h3>
                <div className="grid grid-cols-2 gap-x-8 gap-y-5 flex-1">
                  <div>
                    <label className="text-sm text-gray-600">사고 코드</label>
                    {isEditingIncident && editedIncidentDetail ? (
                      <input
                        type="text"
                        value={(editedIncidentDetail as EmergencyDetail).accidentCode}
                        onChange={(e) => handleIncidentFieldChange('accidentCode', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                        style={{ borderRadius: '0px' }}
                      />
                    ) : (
                      <p className="text-gray-900 mt-1">{incidentDetailPopup.detail.accidentCode}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">CCTV ID</label>
                    {isEditingIncident && editedIncidentDetail ? (
                      <input
                        type="text"
                        value={(editedIncidentDetail as EmergencyDetail).cctvId}
                        onChange={(e) => handleIncidentFieldChange('cctvId', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                        style={{ borderRadius: '0px' }}
                      />
                    ) : (
                      <p className="text-gray-900 mt-1">{incidentDetailPopup.detail.cctvId}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">위치</label>
                    {isEditingIncident && editedIncidentDetail ? (
                      <input
                        type="text"
                        value={(editedIncidentDetail as EmergencyDetail).location || ''}
                        onChange={(e) => handleIncidentFieldChange('location', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                        style={{ borderRadius: '0px' }}
                      />
                    ) : (
                      <p className="text-gray-900 mt-1">{incidentDetailPopup.detail.location}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">유형</label>
                    {isEditingIncident && editedIncidentDetail ? (
                      <input
                        type="text"
                        value={(editedIncidentDetail as EmergencyDetail).type}
                        onChange={(e) => handleIncidentFieldChange('type', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                        style={{ borderRadius: '0px' }}
                      />
                    ) : (
                      <p className="text-gray-900 mt-1">{incidentDetailPopup.detail.type}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">발생시간</label>
                    {isEditingIncident && editedIncidentDetail ? (
                      <input
                        type="text"
                        value={(editedIncidentDetail as EmergencyDetail).time}
                        onChange={(e) => handleIncidentFieldChange('time', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                        style={{ borderRadius: '0px' }}
                      />
                    ) : (
                      <p className="text-gray-900 mt-1">{incidentDetailPopup.detail.time}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">심각도</label>
                    {isEditingIncident && editedIncidentDetail ? (
                      <select
                        value={(editedIncidentDetail as EmergencyDetail).severity}
                        onChange={(e) => handleIncidentFieldChange('severity', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                        style={{ borderRadius: '0px' }}
                      >
                        <option value="high">상</option>
                        <option value="medium">중</option>
                        <option value="low">하</option>
                      </select>
                    ) : (
                      <p className="mt-1">
                        <span className={`px-2 py-1 text-xs ${
                          incidentDetailPopup.detail.severity === 'high' 
                            ? 'bg-red-100 text-red-700' 
                            : incidentDetailPopup.detail.severity === 'medium'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-blue-100 text-blue-700'
                        }`} style={{ borderRadius: '0px' }}>
                          {incidentDetailPopup.detail.severity === 'high' ? '상' : incidentDetailPopup.detail.severity === 'medium' ? '중' : '하'}
                        </span>
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">상태</label>
                    {isEditingIncident && editedIncidentDetail ? (
                      <select
                        value={(editedIncidentDetail as EmergencyDetail).status}
                        onChange={(e) => handleIncidentFieldChange('status', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                        style={{ borderRadius: '0px' }}
                      >
                        <option value="대기중">대기중</option>
                        <option value="출동중">출동중</option>
                        <option value="현장도착">현장도착</option>
                        <option value="이송중">이송중</option>
                        <option value="처리완료">처리완료</option>
                      </select>
                    ) : (
                      <p className="mt-1">
                        <span className={`px-2 py-1 text-xs ${
                          incidentDetailPopup.detail.status === '처리완료'
                            ? 'bg-green-100 text-green-700' 
                            : incidentDetailPopup.detail.status === '이송중'
                            ? 'bg-purple-100 text-purple-700'
                            : incidentDetailPopup.detail.status === '현장도착'
                            ? 'bg-blue-100 text-blue-700'
                            : incidentDetailPopup.detail.status === '출동중'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-gray-100 text-gray-700'
                        }`} style={{ borderRadius: '0px' }}>
                          {incidentDetailPopup.detail.status}
                        </span>
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">처리자</label>
                    {isEditingIncident && editedIncidentDetail ? (
                      <input
                        type="text"
                        value={(editedIncidentDetail as EmergencyDetail).handler}
                        onChange={(e) => handleIncidentFieldChange('handler', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                        style={{ borderRadius: '0px' }}
                      />
                    ) : (
                      <p className="text-gray-900 mt-1">{incidentDetailPopup.detail.handler}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">탐지근거</label>
                    {isEditingIncident && editedIncidentDetail ? (
                      <input
                        type="text"
                        value={(editedIncidentDetail as EmergencyDetail).detectionBasis || ''}
                        onChange={(e) => handleIncidentFieldChange('detectionBasis', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                        style={{ borderRadius: '0px' }}
                      />
                    ) : (
                      <p className="text-gray-900 mt-1">{incidentDetailPopup.detail.detectionBasis || 'AI 자동 탐지'}</p>
                    )}
                  </div>
                  
                  {/* 모델 정보 (AI 자동 탐지인 경우에만) */}
                  {incidentDetailPopup.detail.detectionBasis === 'AI 자동 탐지' && (
                    <>
                      <div>
                        <label className="text-sm text-gray-600">모델명</label>
                        <p className="text-gray-900 mt-1">EmergencyDetectionModel-v2</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">모델버전</label>
                        <p className="text-gray-900 mt-1">2.1.0</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">신뢰도</label>
                        <p className="text-emerald-600 mt-1 font-medium">88%</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">신뢰도 근거</label>
                        <p className="text-gray-900 mt-1 text-sm">낙상 자세 감지, 움직임 패턴 이상, 장시간 움직임 없음</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600 flex items-center gap-1">
                          심각도 상세
                          <span className="text-xs text-gray-400 cursor-help" title="응급 점수 계산 방법: 낙상 정도 + 반응 여부 + 시간 경과">(?)</span>
                        </label>
                        <p className="text-gray-900 mt-1 text-sm">응급 점수: 78/100 (낙상 정도: 높음, 반응: 없음, 경과시간: 2분)</p>
                      </div>
                    </>
                  )}
                  
                  {incidentDetailPopup.detail.patientName && (
                    <>
                      <div>
                        <label className="text-sm text-gray-600">환자명</label>
                        {isEditingIncident && editedIncidentDetail ? (
                          <input
                            type="text"
                            value={(editedIncidentDetail as EmergencyDetail).patientName || ''}
                            onChange={(e) => handleIncidentFieldChange('patientName', e.target.value)}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                            style={{ borderRadius: '0px' }}
                          />
                        ) : (
                          <p className="text-gray-900 mt-1">{incidentDetailPopup.detail.patientName}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">나이</label>
                        <p className="text-gray-900 mt-1">67세</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">성별</label>
                        <p className="text-gray-900 mt-1">남성</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">응급 유형</label>
                        <p className="text-gray-900 mt-1">낙상</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">증상</label>
                        <p className="text-gray-900 mt-1">의식 없음, 움직임 없음</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">구조팀</label>
                        <p className="text-gray-900 mt-1">119 구조대 1팀</p>
                      </div>
                    </>
                  )}
                  {incidentDetailPopup.detail.transferHospital && (
                    <div>
                      <label className="text-sm text-gray-600">이송병원</label>
                      {isEditingIncident && editedIncidentDetail ? (
                        <input
                          type="text"
                          value={(editedIncidentDetail as EmergencyDetail).transferHospital || ''}
                          onChange={(e) => handleIncidentFieldChange('transferHospital', e.target.value)}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                          style={{ borderRadius: '0px' }}
                        />
                      ) : (
                        <p className="text-gray-900 mt-1">{incidentDetailPopup.detail.transferHospital}</p>
                      )}
                    </div>
                  )}
                  <div>
                    <label className="text-sm text-gray-600">상황메모</label>
                    {isEditingIncident && editedIncidentDetail ? (
                      <textarea
                        value={(editedIncidentDetail as EmergencyDetail).note || ''}
                        onChange={(e) => handleIncidentFieldChange('note', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                        style={{ borderRadius: '0px' }}
                        rows={3}
                      />
                    ) : (
                      <p className="text-gray-900 mt-1">등산로 입구에서 낙상, 즉시 119 신고함</p>
                    )}
                  </div>
                </div>

                {/* 하단 버튼 */}
                <div className="flex gap-3 mt-6">
                  {isEditingIncident ? (
                    <>
                      <button 
                        onClick={handleIncidentSave}
                        className="flex-1 px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2" 
                        style={{ borderRadius: '0px' }}
                      >
                        <Save className="w-4 h-4" />
                        저장
                      </button>
                      <button 
                        onClick={handleIncidentCancel}
                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors" 
                        style={{ borderRadius: '0px' }}
                      >
                        취소
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={handleIncidentEditClick}
                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors flex items-center justify-center gap-2" 
                        style={{ borderRadius: '0px' }}
                      >
                        <Edit2 className="w-4 h-4" />
                        수정
                      </button>
                      <button 
                        onClick={() => {
                          setShowFalseReportModal(true);
                        }}
                        className="flex-1 px-4 py-2 bg-red-500 text-white hover:bg-red-600 transition-colors" 
                        style={{ borderRadius: '0px' }}
                      >
                        오탐처리
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 쓰레기 투기 상세보기 팝업 */}
      {incidentDetailPopup && incidentDetailPopup.type === 'trash' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 10000 }} onClick={() => { setIncidentDetailPopup(null); setIsEditingIncident(false); }}>
          <div className="bg-white rounded-lg shadow-xl w-full max-h-[95vh] overflow-y-auto" style={{ maxWidth: '1100px' }} onClick={(e) => e.stopPropagation()}>
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200" style={{ backgroundColor: '#10B981' }}>
              <h2 className="text-xl font-semibold text-white">쓰레기 투기 상세정보</h2>
              <button onClick={() => { setIncidentDetailPopup(null); setIsEditingIncident(false); }} className="text-white hover:text-gray-200 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* 모달 내용 */}
            <div className="flex p-4 gap-4">
              {/* 좌측 패널 */}
              <div className="flex-1 flex flex-col">
                {/* 지도 영역 */}
                <div className="border border-gray-300 mb-3" style={{ height: '380px', borderRadius: '0px' }}>
                  <MapContainer
                    center={[35.2456, 129.0917]} 
                    zoom={15}
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker 
                      position={[35.2456, 129.0917]}
                      icon={L.divIcon({
                        className: 'custom-trash-marker',
                        html: `<div style="width: 40px; height: 40px;">
                          <svg viewBox="0 0 96.72 125.04" style="filter: drop-shadow(3px 3px 3px rgba(0,0,0,0.3));">
                            <path fill="#FFFFFF" d="M74.481,41.241c0,18.358-33.24,61.788-33.24,61.788S8,59.6,8,41.241C8,22.882,22.883,8,41.241,8S74.481,22.882,74.481,41.241z"/>
                            <circle fill="#10B981" cx="41.241" cy="40.43" r="27.834"/>
                            <path fill="#FFFFFF" d="M32.74,32.93h3v-3h8v3h3v3h-14V32.93z M33.74,38.93h12v16h-12V38.93z M36.74,41.93v10h2v-10H36.74z M40.74,41.93v10h2v-10H40.74z"/>
                            <path fill="#FFFFFF" d="M39.315,62.526c-1.129-0.265-2.201-0.461-3.24-0.768c-3.325-0.981-6.234-2.669-8.475-5.351c-3.346-4.005-3.923-8.571-2.506-13.47c0.9-3.116,2.497-5.878,4.46-8.513c1.253,1.481,2.71,2.619,4.431,3.455c0.192-1.104,0.336-2.173,0.57-3.221c0.486-2.171,1.583-4.062,2.759-5.922c0.688-1.088,1.359-2.202,1.874-3.377c0.9-2.051,0.513-4.109-0.238-6.125c-0.096-0.258-0.192-0.516-0.286-0.775c-0.005-0.014,0.018-0.037,0.061-0.123c0.323,0.133,0.664,0.25,0.983,0.41c5.765,2.889,9.475,7.502,11.36,13.621c0.751,2.437,1.179,4.941,1.136,7.492c-0.02,1.173,1.105,1.772,1.99,1.183c0.793-0.528,1.469-1.236,2.168-1.895c0.28-0.264,0.485-0.607,0.835-1.056c0.18,0.884,0.358,1.626,0.478,2.377c0.55,3.489,0.664,6.97-0.154,10.445c-1.42,6.037-6.055,10.397-12.136,11.284c0.237-0.108,0.475-0.216,0.713-0.324c2.647-1.206,4.573-3.046,5.035-6.039c0.138-0.891,0.072-1.846-0.075-2.742c-0.33-1.998-1.318-3.71-2.477-5.282c-0.792,0.606-1.55,1.186-2.468,1.888c-0.06-2.291-1.013-4.01-2.138-5.657c-0.935-1.371-1.033-2.822-0.469-4.35c0.046-0.126,0.088-0.254,0.132-0.381c-0.041-0.056-0.082-0.111-0.123-0.167c-0.83,0.53-1.714,0.993-2.482,1.603c-2.485,1.972-3.836,4.612-4.328,7.712c-0.104,0.658-0.141,1.328-0.183,1.994c-0.052,0.837-0.525,1.109-1.242,0.667c-0.27-0.167-0.502-0.402-0.73-0.629c-0.209-0.209-0.389-0.448-0.732-0.852c-0.151,1.162-0.342,2.141-0.396,3.126c-0.17,3.073,0.414,5.919,2.922,7.986C37.194,61.451,38.253,61.901,39.315,62.526z"/>
                          </svg>
                        </div>`,
                        iconSize: [40, 40],
                        iconAnchor: [20, 40],
                      })}
                    />
                  </MapContainer>
                </div>
                
                {/* 영상/이미지 영역 */}
                <div className="flex gap-3">
                  <div className="flex-1 bg-gray-100 border border-gray-300 flex items-center justify-center" style={{ aspectRatio: '16/9', borderRadius: '0px' }}>
                    <div className="text-center text-gray-500">
                      <Video className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm">영상</p>
                    </div>
                  </div>
                  <div className="flex-1 bg-gray-100 border border-gray-300 flex items-center justify-center" style={{ aspectRatio: '16/9', borderRadius: '0px' }}>
                    <div className="text-center text-gray-500">
                      <Camera className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm">이미지</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 우측 패널 */}
              <div className="flex-1 flex flex-col">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">상세정보 내용</h3>
                <div className="grid grid-cols-2 gap-x-8 gap-y-5 flex-1">
                  <div>
                    <label className="text-sm text-gray-600">사고 코드</label>
                    {isEditingIncident && editedIncidentDetail ? (
                      <input
                        type="text"
                        value={(editedIncidentDetail as TrashDetail).accidentCode}
                        onChange={(e) => handleIncidentFieldChange('accidentCode', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                        style={{ borderRadius: '0px' }}
                      />
                    ) : (
                      <p className="text-gray-900 mt-1">{incidentDetailPopup.detail.accidentCode}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">CCTV ID</label>
                    {isEditingIncident && editedIncidentDetail ? (
                      <input
                        type="text"
                        value={(editedIncidentDetail as TrashDetail).cctvId}
                        onChange={(e) => handleIncidentFieldChange('cctvId', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                        style={{ borderRadius: '0px' }}
                      />
                    ) : (
                      <p className="text-gray-900 mt-1">{incidentDetailPopup.detail.cctvId}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">위치</label>
                    {isEditingIncident && editedIncidentDetail ? (
                      <input
                        type="text"
                        value={(editedIncidentDetail as TrashDetail).location || ''}
                        onChange={(e) => handleIncidentFieldChange('location', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                        style={{ borderRadius: '0px' }}
                      />
                    ) : (
                      <p className="text-gray-900 mt-1">{incidentDetailPopup.detail.location}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">유형</label>
                    {isEditingIncident && editedIncidentDetail ? (
                      <input
                        type="text"
                        value={(editedIncidentDetail as TrashDetail).type}
                        onChange={(e) => handleIncidentFieldChange('type', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                        style={{ borderRadius: '0px' }}
                      />
                    ) : (
                      <p className="text-gray-900 mt-1">{incidentDetailPopup.detail.type}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">쓰레기 갯수</label>
                    <p className="text-gray-900 mt-1">3개</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">발생시간</label>
                    {isEditingIncident && editedIncidentDetail ? (
                      <input
                        type="text"
                        value={(editedIncidentDetail as TrashDetail).time}
                        onChange={(e) => handleIncidentFieldChange('time', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                        style={{ borderRadius: '0px' }}
                      />
                    ) : (
                      <p className="text-gray-900 mt-1">{incidentDetailPopup.detail.time}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">심각도</label>
                    {isEditingIncident && editedIncidentDetail ? (
                      <select
                        value={(editedIncidentDetail as TrashDetail).severity}
                        onChange={(e) => handleIncidentFieldChange('severity', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                        style={{ borderRadius: '0px' }}
                      >
                        <option value="high">상</option>
                        <option value="medium">중</option>
                        <option value="low">하</option>
                      </select>
                    ) : (
                      <p className="mt-1">
                        <span className={`px-2 py-1 text-xs ${
                          incidentDetailPopup.detail.severity === 'high' 
                            ? 'bg-red-100 text-red-700' 
                            : incidentDetailPopup.detail.severity === 'medium'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-blue-100 text-blue-700'
                        }`} style={{ borderRadius: '0px' }}>
                          {incidentDetailPopup.detail.severity === 'high' ? '상' : incidentDetailPopup.detail.severity === 'medium' ? '중' : '하'}
                        </span>
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">상태</label>
                    {isEditingIncident && editedIncidentDetail ? (
                      <select
                        value={(editedIncidentDetail as TrashDetail).status}
                        onChange={(e) => handleIncidentFieldChange('status', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                        style={{ borderRadius: '0px' }}
                      >
                        <option value="미처리">미처리</option>
                        <option value="처리중">처리중</option>
                        <option value="처리완료">처리완료</option>
                      </select>
                    ) : (
                      <p className="mt-1">
                        <span className={`px-2 py-1 text-xs ${
                          incidentDetailPopup.detail.status === '처리완료'
                            ? 'bg-green-100 text-green-700' 
                            : incidentDetailPopup.detail.status === '처리중'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-gray-100 text-gray-700'
                        }`} style={{ borderRadius: '0px' }}>
                          {incidentDetailPopup.detail.status}
                        </span>
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">처리자</label>
                    {isEditingIncident && editedIncidentDetail ? (
                      <input
                        type="text"
                        value={(editedIncidentDetail as TrashDetail).handler}
                        onChange={(e) => handleIncidentFieldChange('handler', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                        style={{ borderRadius: '0px' }}
                      />
                    ) : (
                      <p className="text-gray-900 mt-1">{incidentDetailPopup.detail.handler}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">탐지근거</label>
                    {isEditingIncident && editedIncidentDetail ? (
                      <input
                        type="text"
                        value={(editedIncidentDetail as TrashDetail).detectionBasis || ''}
                        onChange={(e) => handleIncidentFieldChange('detectionBasis', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                        style={{ borderRadius: '0px' }}
                      />
                    ) : (
                      <p className="text-gray-900 mt-1">{incidentDetailPopup.detail.detectionBasis || 'AI 자동 탐지'}</p>
                    )}
                  </div>
                  
                  {/* 모델 정보 (AI 자동 탐지인 경우에만) */}
                  {incidentDetailPopup.detail.detectionBasis === 'AI 자동 탐지' && (
                    <>
                      <div>
                        <label className="text-sm text-gray-600">모델명</label>
                        <p className="text-gray-900 mt-1">TrashDetectionModel-v1</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">모델버전</label>
                        <p className="text-gray-900 mt-1">1.5.2</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">신뢰도</label>
                        <p className="text-emerald-600 mt-1 font-medium">95%</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">신뢰도 근거</label>
                        <p className="text-gray-900 mt-1 text-sm">쓰레기 객체 명확, 불법 투기 패턴 일치, 위치 부적절</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600 flex items-center gap-1">
                          심각도 상세
                          <span className="text-xs text-gray-400 cursor-help" title="심각도 점수 계산 방법: 쓰레기 양 + 종류 + 위치">(?)</span>
                        </label>
                        <p className="text-gray-900 mt-1 text-sm">심각도 점수: 62/100 (양: 중간, 종류: 일반쓰레기, 위치: 등산로)</p>
                      </div>
                    </>
                  )}
                  
                  <div>
                    <label className="text-sm text-gray-600">상황메모</label>
                    {isEditingIncident && editedIncidentDetail ? (
                      <textarea
                        value={(editedIncidentDetail as TrashDetail).note || ''}
                        onChange={(e) => handleIncidentFieldChange('note', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                        style={{ borderRadius: '0px' }}
                        rows={3}
                      />
                    ) : (
                      <p className="text-gray-900 mt-1">등산로 주변에 불법 투기 발견, 수거 필요</p>
                    )}
                  </div>
                </div>

                {/* 하단 버튼 */}
                <div className="flex gap-3 mt-6">
                  {isEditingIncident ? (
                    <>
                      <button 
                        onClick={handleIncidentSave}
                        className="flex-1 px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2" 
                        style={{ borderRadius: '0px' }}
                      >
                        <Save className="w-4 h-4" />
                        저장
                      </button>
                      <button 
                        onClick={handleIncidentCancel}
                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors" 
                        style={{ borderRadius: '0px' }}
                      >
                        취소
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={handleIncidentEditClick}
                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors flex items-center justify-center gap-2" 
                        style={{ borderRadius: '0px' }}
                      >
                        <Edit2 className="w-4 h-4" />
                        수정
                      </button>
                      <button 
                        onClick={() => {
                          setShowFalseReportModal(true);
                        }}
                        className="flex-1 px-4 py-2 bg-red-500 text-white hover:bg-red-600 transition-colors" 
                        style={{ borderRadius: '0px' }}
                      >
                        오탐처리
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 위험지도 호버 팝업 (사고다발구간) */}
      {activeView === 'risk-map' && hoveredHotspot && (
        <div 
          className="absolute bg-white shadow-xl border-2 border-gray-300 p-3 rounded transform -translate-x-1/2 pointer-events-none" 
          style={{ 
            left: `${hoveredHotspot.x}px`, 
            top: `${hoveredHotspot.y - 8}px`,
            zIndex: 1200 
          }}
        >
          <div className="text-xs text-gray-500 mb-1">사고다발구간</div>
          <div className="text-sm font-bold mb-2">{hoveredHotspot.cctvId}</div>
          <div className="text-xs text-gray-600 mb-2">{hoveredHotspot.location}</div>
          <div className="text-xs space-y-1">
            {hoveredHotspot.fireCount > 0 && (
              <div>🔥 화재 <b>{hoveredHotspot.fireCount}건</b></div>
            )}
            {hoveredHotspot.emergencyCount > 0 && (
              <div>🚑 응급 <b>{hoveredHotspot.emergencyCount}건</b></div>
            )}
            {hoveredHotspot.trashCount > 0 && (
              <div>🗑️ 쓰레기 <b>{hoveredHotspot.trashCount}건</b></div>
            )}
          </div>
          {/* 아래 화살표 */}
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-white"></div>
        </div>
      )}

      {/* 구간별 빈도 팝업 (위험지도 모드에서 표시) */}
      {/* 위험지도 범례 (줌 컨트롤 왼쪽) - 기간별로 다르게 표시 */}
      {activeView === 'risk-map' && (() => {
        const getLegendItems = () => {
          if (riskMapPeriod === '30d') {
            return [
              { color: '#EF4444', label: '18+ 건' },
              { color: '#F97316', label: '13-17 건' },
              { color: '#FBBF24', label: '8-12 건' },
              { color: '#10B981', label: '3-7 건' },
              { color: '#3B82F6', label: '0-2 건' },
            ];
          } else if (riskMapPeriod === '7d') {
            return [
              { color: '#EF4444', label: '13+ 건' },
              { color: '#F97316', label: '9-12 건' },
              { color: '#FBBF24', label: '5-8 건' },
              { color: '#10B981', label: '1-4 건' },
              { color: '#3B82F6', label: '0 건' },
            ];
          } else {
            return [
              { color: '#EF4444', label: '10+ 건' },
              { color: '#F97316', label: '7-9 건' },
              { color: '#FBBF24', label: '4-6 건' },
              { color: '#10B981', label: '1-3 건' },
              { color: '#3B82F6', label: '0 건' },
            ];
          }
        };
        
        const legendItems = getLegendItems();
        const hexToRgba = (hex: string, alpha: number) => {
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };
        
        return (
          <div 
            className="absolute bg-white shadow-lg border border-gray-300 p-3 rounded-lg"
            style={{ 
              top: '10px', 
              right: '60px',
              zIndex: 1000,
              minWidth: '140px'
            }}
          >
            <div className="text-xs font-bold text-gray-700 mb-2">사건 빈도</div>
            <div className="space-y-1.5">
              {legendItems.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-8 h-1 rounded-full" style={{ 
                    background: `linear-gradient(to right, ${item.color}, ${hexToRgba(item.color, 0.7)})`,
                    boxShadow: `0 0 4px ${hexToRgba(item.color, 0.5)}`
                  }}></div>
                  <span className="text-xs text-gray-700">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {activeView === 'risk-map' && hoveredTrailSegment && (
        <div 
          className="absolute bg-white shadow-xl border-2 border-gray-300 p-3 rounded transform -translate-x-1/2 pointer-events-none" 
          style={{ 
            left: `${hoveredTrailSegment.x}%`, 
            top: `${hoveredTrailSegment.y - 8}%`,
            zIndex: 1200 
          }}
        >
          <div className="text-xs text-gray-500 mb-1">구간별 빈도</div>
          <div className="text-sm font-bold mb-2">{hoveredTrailSegment.trailName || hoveredTrailSegment.entityName}</div>
          <div className="text-xs space-y-1">
            {riskMapType === 'all' ? (
              // 전체 선택 시: 모든 타입 표시
              <>
                {hoveredTrailSegment.fireCount > 0 && (
                  <div>🔥 화재 <b>{hoveredTrailSegment.fireCount}건</b></div>
                )}
                {hoveredTrailSegment.emergencyCount > 0 && (
                  <div>🚑 응급 <b>{hoveredTrailSegment.emergencyCount}건</b></div>
                )}
                {hoveredTrailSegment.trashCount > 0 && (
                  <div>🗑️ 쓰레기 <b>{hoveredTrailSegment.trashCount}건</b></div>
                )}
                {hoveredTrailSegment.fireCount === 0 && hoveredTrailSegment.emergencyCount === 0 && hoveredTrailSegment.trashCount === 0 && (
                  <div className="text-gray-400">사건 없음</div>
                )}
              </>
            ) : riskMapType === 'fire' ? (
              // 화재 선택 시: 화재만
              <div>🔥 화재 <b>{hoveredTrailSegment.fireCount}건</b></div>
            ) : riskMapType === 'emergency' ? (
              // 응급 선택 시: 응급만
              <div>🚑 응급 <b>{hoveredTrailSegment.emergencyCount}건</b></div>
            ) : (
              // 쓰레기 선택 시: 쓰레기만
              <div>🗑️ 쓰레기 <b>{hoveredTrailSegment.trashCount}건</b></div>
            )}
          </div>
          {/* 아래 화살표 */}
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-white"></div>
        </div>
      )}

      {/* 오탐 처리 모달 */}
      {showFalseReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 15000 }} onClick={() => { setShowFalseReportModal(false); setFalseReportReason(''); }}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            {/* 모달 헤더 */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">오탐 처리</h2>
              <p className="text-sm text-gray-600 mt-2">오탐 사유를 입력해주세요.</p>
            </div>

            {/* 모달 내용 */}
            <div className="p-6">
              <textarea
                value={falseReportReason}
                onChange={(e) => setFalseReportReason(e.target.value)}
                placeholder="예: 실제 화재가 아닌 일시적인 연기로 확인됨"
                className="w-full h-32 px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                style={{ borderRadius: '0px' }}
              />
            </div>

            {/* 모달 버튼 */}
            <div className="flex gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowFalseReportModal(false);
                  setFalseReportReason('');
                }}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                style={{ borderRadius: '0px' }}
              >
                취소
              </button>
              <button
                onClick={() => {
                  // TODO: 실제 오탐 처리 API 호출
                  alert('오탐 처리되었습니다.\n사유: ' + (falseReportReason || '(사유 없음)'));
                  setShowFalseReportModal(false);
                  setFalseReportReason('');
                }}
                className="flex-1 px-4 py-3 bg-red-500 text-white hover:bg-red-600 transition-colors"
                style={{ borderRadius: '0px' }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}