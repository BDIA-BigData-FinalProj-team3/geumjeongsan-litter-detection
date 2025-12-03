import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, User, LogOut, ChevronDown, Flame, Trash2, Camera, Wrench, X, Plus, Minus, Download, Bell, AlertCircle, Move, MessageSquare, Eye, Radar, Video, Plane, Activity, Home, Grid3x3, Video as VideoIcon, Heart, FileText } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import LogoutButton from '../components/LogoutButton';
import MyPageButton from '../components/MyPageButton';
import DetectionButton from '../components/DetectionButton';
import MonthlyStatsButton from '../components/MonthlyStatsButton';
import AccidentHotspotButton from '../components/AccidentHotspotButton';
import SectionFrequencyButton from '../components/SectionFrequencyButton';
import CCTVButton from '../components/CCTVButton';
import HelicopterButton from '../components/HelicopterButton';
import HamburgerMenuButton from '../components/HamburgerMenuButton';
import NotificationBellButton from '../components/NotificationBellButton';
import EmergencyMarkerIcon from '../components/EmergencyMarkerIcon';
import TrashMarkerIcon from '../components/TrashMarkerIcon';
import CCTVOnMarkerIcon from '../components/CCTVOnMarkerIcon';
import CCTVOffMarkerIcon from '../components/CCTVOffMarkerIcon';
import { useIncidentCount } from '../contexts/IncidentCountContext';
import { getCCTVMarkers, getFireNotifications, getEmergencyNotifications, getTrashNotifications, getHelicopterLocations, getHotspots, getCCTVVideoClips, getCCTVMedia, getCCTVList } from '../services/api';
import type { VideoClip } from '../services/mock';
import type { CCTVMedia } from '../services/api';
import type { CCTVMarker as BackendCCTVMarker } from '../services/common';
import HotspotFireIcon from '../components/HotspotFireIcon';
import HotspotEmergencyIcon from '../components/HotspotEmergencyIcon';
import HotspotTrashIcon from '../components/HotspotTrashIcon';
import mapImage from 'figma:asset/e2eee362b605222576aa0e01e59c017ebe22e4e9.png';
import logoIcon from 'figma:asset/0abed642df6551dc36712b1dfc4c5cda079eed1a.png';
import headerLogo from 'figma:asset/14f294982efa79d8462919ccdda7d0c0c674d095.png';

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
  location: string;
  power: 'on' | 'off';
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
    type: 'fire' | 'emergency' | 'trash';
    time: string;
    confidence: string;
  }>;
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
  
  const [activeView, setActiveView] = useState<'detections' | 'cctv' | 'monthly-stats' | 'accident-hotspot' | 'section-frequency'>('detections');
  const [showMonthlyStatsButtons, setShowMonthlyStatsButtons] = useState(false);
  const [showAllDetections, setShowAllDetections] = useState(true);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'fire' | 'emergency' | 'trash'>('all');
  const [hotspotFilter, setHotspotFilter] = useState<'all' | 'fire' | 'emergency' | 'trash'>('all');
  const [selectedCCTV, setSelectedCCTV] = useState<CCTVPopup | null>(null);
  const [selectedDetection, setSelectedDetection] = useState<DetectionPopup | null>(null);
  const [zoomLevel, setZoomLevel] = useState(12);
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
    location: string;
    time: string;
    confidence: string;
    type: 'fire' | 'emergency' | 'trash';
  } | null>(null);
  
  const [videoClips, setVideoClips] = useState<VideoClip[]>([]);
  const [selectedVideoClip, setSelectedVideoClip] = useState<VideoClip | null>(null);
  const [cctvMediaList, setCctvMediaList] = useState<CCTVMedia[]>([]);

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
  
  // Convert backend CCTV data to map-compatible format
  const convertToMapMarker = (backendCCTV: BackendCCTVMarker): MapCCTVMarker => {
    // Convert longitude/latitude to x/y percentages (simplified - should use proper map projection)
    // For now, use a simple mapping based on ID or use stored coordinates
    const x = ((backendCCTV.longitude - 127.0) * 100) % 100; // Simplified conversion
    const y = ((backendCCTV.latitude - 37.0) * 100) % 100;
    
    // Determine incidents from lastIncidentType
    const incidents: { fire?: number; emergency?: number; trash?: number } = {};
    if (backendCCTV.lastIncidentType === 'fire') incidents.fire = backendCCTV.incidentCount || 1;
    if (backendCCTV.lastIncidentType === 'emergency') incidents.emergency = backendCCTV.incidentCount || 1;
    if (backendCCTV.lastIncidentType === 'trash') incidents.trash = backendCCTV.incidentCount || 1;
    
    return {
      id: backendCCTV.cctvCode,
      cctvId: backendCCTV.id,
      cctvCode: backendCCTV.cctvCode,
      x: x || 50, // Default to center if conversion fails
      y: y || 50,
      location: backendCCTV.locationDesc,
      power: backendCCTV.powerStatus,
      incidents,
    };
  };
  
  // API에서 CCTV 마커 및 헬리콥터 위치 로드
  useEffect(() => {
    const loadMapData = async () => {
      const [backendCCTVs, helicopters] = await Promise.all([
        getCCTVList(),
        getHelicopterLocations(),
      ]);
      
      // Convert backend format to map format
      const mapMarkers = backendCCTVs.map(convertToMapMarker);
      setCctvMarkers(mapMarkers);
      setHelicopterLocations(helicopters);
    };
    
    loadMapData();
  }, []);

  // 사고다발구간 데이터 로드
  useEffect(() => {
    const loadHotspots = async () => {
      if (activeView === 'accident-hotspot') {
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

  // 배지 숫자 계산
  const fireCount = cctvMarkers.filter(m => m.incidents.fire).length;
  const emergencyCount = cctvMarkers.filter(m => m.incidents.emergency).length;
  const trashCount = cctvMarkers.filter(m => m.incidents.trash).length;


  const getPriorityIncident = (incidents: MapCCTVMarker['incidents']) => {
    if (incidents.fire) return { type: 'fire' as const, count: incidents.fire };
    if (incidents.emergency) return { type: 'emergency' as const, count: incidents.emergency };
    if (incidents.trash) return { type: 'trash' as const, count: incidents.trash };
    return null;
  };

  const getFilteredMarkers = () => {
    if (!showAllDetections) return [];
    // 처리완료된 사건의 CCTV는 제외
    const activeMarkers = cctvMarkers.filter(marker => !completedIncidents.has(marker.id));
    if (selectedFilter === 'all') return activeMarkers;
    return activeMarkers.filter(marker => {
      if (selectedFilter === 'fire') return marker.incidents.fire;
      if (selectedFilter === 'emergency') return marker.incidents.emergency;
      if (selectedFilter === 'trash') return marker.incidents.trash;
      return false;
    });
  };

  const handleFilterSelect = (filter: 'all' | 'fire' | 'emergency' | 'trash') => {
    setSelectedFilter(filter);
    setShowFilterDropdown(false);
    if (!showAllDetections) setShowAllDetections(true);
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

  const handleMarkerClick = (marker: MapCCTVMarker, event: React.MouseEvent) => {
    if (activeView === 'cctv') {
      const rect = event.currentTarget.getBoundingClientRect();
      setSelectedCCTV({ cctv: marker, x: rect.left + rect.width / 2, y: rect.top });
    } else if (activeView === 'detections') {
      const incidents: Array<{ type: 'fire' | 'emergency' | 'trash'; time: string; confidence: string; }> = [];
      if (marker.incidents.fire) {
        for (let i = 0; i < marker.incidents.fire; i++) {
          incidents.push({ type: 'fire', time: `2025-11-25 ${10 + i}:${15 + i * 5}:00`, confidence: `${95 - i * 2}%` });
        }
      }
      if (marker.incidents.emergency) {
        for (let i = 0; i < marker.incidents.emergency; i++) {
          incidents.push({ type: 'emergency', time: `2025-11-25 ${12 + i}:${20 + i * 5}:00`, confidence: `${92 - i * 2}%` });
        }
      }
      if (marker.incidents.trash) {
        for (let i = 0; i < marker.incidents.trash; i++) {
          incidents.push({ type: 'trash', time: `2025-11-25 ${14 + i}:${30 + i * 5}:00`, confidence: `${82 - i * 2}%` });
        }
      }
      setSelectedDetection({ marker: marker, incidents: incidents });
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
              style={{ backgroundColor: notificationTab === 'fire' ? '#2B3990' : '#F4F4F4', border: '1px solid #B2B2B2', borderRadius: '8px' }} 
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
              <svg width="62.667px" height="36px" viewBox="95 0 66 72" style={{ width: '62.667px', height: '36px' }}>
                <g>
                  <g>
                    <g>
                      <path 
                        fillRule="evenodd" 
                        clipRule="evenodd" 
                        fill="#FFFFFF" 
                        d="M161.375,10.389c0,18.358-33.241,61.788-33.241,61.788
                          s-33.241-43.43-33.241-61.788s14.883-33.241,33.241-33.241S161.375-7.97,161.375,10.389z"
                      />
                    </g>
                  </g>
                  <circle fill="#99332E" cx="128.134" cy="10.124" r="27.72"/>
                  <polygon 
                    fillRule="evenodd" 
                    clipRule="evenodd" 
                    fill="#FFFFFF" 
                    points="142.863,5.29 132.968,5.29 132.968,-4.604 
                      123.301,-4.604 123.301,5.29 113.406,5.29 113.406,14.956 123.301,14.956 123.301,24.853 132.968,24.853 132.968,14.956 
                      142.863,14.956"
                  />
                </g>
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
          isActive={activeView === 'detections' && showAllDetections}
          onClick={() => { setShowAllDetections(!showAllDetections); setActiveView('detections'); }}
        />
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <button 
              ref={filterDropdownButtonRef}
              onClick={() => setShowFilterDropdown(!showFilterDropdown)} 
              className="p-2 bg-white border border-gray-200 shadow-md hover:shadow-lg transition-all" 
              style={{ borderRadius: '9999px' }}
            >
              <ChevronDown className="w-4 h-4 text-gray-700" />
            </button>
          </div>

          <CCTVButton 
            isActive={activeView === 'cctv'}
            onClick={() => setActiveView(activeView === 'cctv' ? 'default' : 'cctv')}
          />
          
          <HelicopterButton 
            isActive={activeView === 'helicopter'}
            onClick={() => setActiveView(activeView === 'helicopter' ? 'default' : 'helicopter')}
          />
          
        </div>
      </div>
      
      {/* 하단 행: 월간 통계, 사고다발구간, 구간별 빈도 - 전체탐지 버튼과 정렬 */}
      {/* 햄버거(33.484px) + gap(12px) = 45.484px 오프셋 */}
      <div className="fixed flex gap-3 z-50 transition-all duration-300" style={{ top: '66px', left: sidebarOpen ? '385.484px' : '69.484px' }}>
        <MonthlyStatsButton 
          isActive={showMonthlyStatsButtons}
          onClick={() => {
            setShowMonthlyStatsButtons(!showMonthlyStatsButtons);
          }}
        />
        {showMonthlyStatsButtons && (
          <>
            <AccidentHotspotButton 
              isActive={activeView === 'accident-hotspot'}
              onClick={() => {
                setActiveView('accident-hotspot');
              }}
            />
            <SectionFrequencyButton 
              isActive={activeView === 'section-frequency'}
              onClick={() => {
                setActiveView('section-frequency');
              }}
            />
          </>
        )}
      </div>

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
          <button onClick={() => handleFilterSelect('all')} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-sm text-gray-900">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-red-400 via-yellow-400 to-green-400"></div>
            전체
          </button>
          <button onClick={() => handleFilterSelect('fire')} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-sm text-gray-900">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            화재
          </button>
          <button onClick={() => handleFilterSelect('emergency')} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-sm text-gray-900">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            응급
          </button>
          <button onClick={() => handleFilterSelect('trash')} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-sm text-gray-900">
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

        {/* 지도 배경 이미지 */}
        <div className="absolute inset-0" style={{ 
          backgroundImage: `url(${mapImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}>
          {/* 지역명 라벨 */}
          <div className="absolute" style={{ left: '10%', top: '10%' }}>
            <span className="text-sm text-gray-700 font-semibold drop-shadow-md">북문</span>
          </div>
          <div className="absolute" style={{ left: '15%', top: '20%' }}>
            <span className="text-sm text-gray-700 font-semibold drop-shadow-md">등산로 1</span>
          </div>
          <div className="absolute" style={{ left: '60%', top: '25%' }}>
            <span className="text-sm text-gray-700 font-semibold drop-shadow-md">등산로 2</span>
          </div>
          <div className="absolute" style={{ left: '45%', top: '45%' }}>
            <span className="text-sm text-gray-700 font-semibold drop-shadow-md">공원중앙</span>
          </div>
          <div className="absolute" style={{ left: '20%', top: '55%' }}>
            <span className="text-sm text-gray-700 font-semibold drop-shadow-md">등산로 3</span>
          </div>
          <div className="absolute" style={{ left: '75%', top: '75%' }}>
            <span className="text-sm text-gray-700 font-semibold drop-shadow-md">남문</span>
          </div>
        </div>

        {/* 전체탐지 모드 마커 */}
        {activeView === 'detections' && getFilteredMarkers().map((marker) => {
          if (removedCCTVs.has(marker.id)) return null;
          const priority = getPriorityIncident(marker.incidents);
          if (!priority) return null;
          const isHighlighted = highlightedCCTV === marker.id;
          
          return (
            <div 
              key={marker.id}
              onClick={(e) => handleMarkerClick(marker, e)}
              className={`absolute transform -translate-x-1/2 -translate-y-full cursor-pointer hover:scale-110 transition-all ${isHighlighted ? 'scale-125 animate-pulse' : ''}`}
              style={{ left: `${marker.x}%`, top: `${marker.y}%`, zIndex: isHighlighted ? 20 : 10 }}
            >
              {priority.type === 'fire' ? (
                <div className="relative">
                  <FireMapMarker className="w-16 h-20" style={{ width: '56px', height: '70px' }} />
                  {priority.count > 1 && (
                    <div 
                      className="absolute top-0 right-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs bg-red-600"
                      style={{ border: '2px solid white', fontSize: '11px', fontWeight: 'bold' }}
                    >
                      {priority.count}
                    </div>
                  )}
                </div>
              ) : priority.type === 'emergency' ? (
                <div className="relative">
                  <EmergencyMarkerIcon className="w-16 h-20" style={{ width: '56px', height: '70px' }} />
                  {priority.count > 1 && (
                    <div 
                      className="absolute top-0 right-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs bg-orange-600"
                      style={{ border: '2px solid white', fontSize: '11px', fontWeight: 'bold' }}
                    >
                      {priority.count}
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <TrashMarkerIcon className="w-12 h-14" style={{ width: '30px', height: '35px' }} />
                  {priority.count > 1 && (
                    <div 
                      className="absolute top-0 right-0 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs bg-green-600"
                      style={{ border: '2px solid white', fontSize: '10px', fontWeight: 'bold' }}
                    >
                      {priority.count}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* 사고다발구간 모드 마커 */}
        {activeView === 'accident-hotspot' && hotspotLocations
          .filter(hotspot => hotspotFilter === 'all' || hotspot.type === hotspotFilter)
          .map((hotspot) => (
            <div 
              key={`hotspot-${hotspot.cctvId}`}
              className="absolute transform -translate-x-1/2 -translate-y-full cursor-pointer hover:scale-110 transition-all"
              style={{ 
                left: `${hotspot.x}%`, 
                top: `${hotspot.y}%`,
                zIndex: 50,
              }}
              title={`${hotspot.location} - ${hotspot.count}건`}
            >
              {hotspot.type === 'fire' && (
                <HotspotFireIcon style={{ width: '48px', height: '56px' }} />
              )}
              {hotspot.type === 'emergency' && (
                <HotspotEmergencyIcon style={{ width: '48px', height: '56px' }} />
              )}
              {hotspot.type === 'trash' && (
                <HotspotTrashIcon style={{ width: '48px', height: '56px' }} />
              )}
            </div>
          ))}

        {/* 실시간 CCTV 모드 마커 */}
        {activeView === 'cctv' && cctvMarkers.map((marker) => {
          const isPowerOn = marker.power === 'on';
          
          return (
            <div 
              key={marker.id}
              onClick={(e) => handleMarkerClick(marker, e)}
              className="absolute transform -translate-x-1/2 -translate-y-full cursor-pointer hover:scale-110 transition-transform"
              style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
            >
              {isPowerOn ? (
                <CCTVOnMarkerIcon className="w-16 h-20" style={{ width: '56px', height: '70px' }} />
              ) : (
                <CCTVOffMarkerIcon className="w-16 h-20" style={{ width: '56px', height: '70px' }} />
              )}
            </div>
          );
        })}

        {showHelicopters && helicopterLocations.map((heli) => (
          <div 
            key={heli.id} 
            className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform"
            style={{ left: `${heli.x}%`, top: `${heli.y}%` }}
          >
            <div className="w-10 h-10 rounded-full shadow-lg flex items-center justify-center bg-red-500 border-2 border-white">
              <span className="text-white" style={{ fontSize: '16px', fontWeight: 'bold', lineHeight: '1' }}>H</span>
            </div>
          </div>
        ))}


        <div className="absolute bottom-6 right-6 flex flex-col gap-1 shadow-lg">
          <button onClick={() => setZoomLevel(prev => Math.min(prev + 1, 18))} className="w-10 h-10 bg-white hover:bg-gray-50 flex items-center justify-center transition-colors" style={{ borderRadius: '0px' }}>
            <Plus className="w-5 h-5 text-gray-700" />
          </button>
          <div className="w-10 h-10 bg-white flex items-center justify-center text-sm text-gray-700" style={{ borderRadius: '0px' }}>
            {zoomLevel}
          </div>
          <button onClick={() => setZoomLevel(prev => Math.max(prev - 1, 8))} className="w-10 h-10 bg-white hover:bg-gray-50 flex items-center justify-center transition-colors" style={{ borderRadius: '0px' }}>
            <Minus className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      </div>

      {selectedCCTV && (
        <div 
          className="fixed bg-white shadow-2xl border-2 border-gray-300 z-50"
          style={{ 
            borderRadius: '0px', 
            left: `${popupPositions.cctv.x}px`, 
            top: `${popupPositions.cctv.y}px`,
            width: '400px'
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
            <div className="h-48 bg-gray-200 flex items-center justify-center mb-4" style={{ borderRadius: '0px' }}>
              <Camera className="w-12 h-12 text-gray-400" />
            </div>
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
              <div>
                <p className="text-xs text-gray-500">CCTV ID</p>
                <p className="text-sm text-gray-900">{selectedCCTV.cctv.id}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">전원 상태</p>
                <span className={`inline-block px-2 py-1 text-xs ${selectedCCTV.cctv.power === 'on' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`} style={{ borderRadius: '0px' }}>
                  {selectedCCTV.cctv.power}
                </span>
              </div>
            </div>

            {/* 영상 리스트 섹션 */}
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">영상 리스트 (Video Clips)</h4>
              {cctvMediaList.length > 0 ? (
                <div className="space-y-3">
                  {cctvMediaList.map((media) => (
                    <div 
                      key={media.id}
                      className="border border-gray-200 p-3 hover:bg-gray-50 transition-colors"
                      style={{ borderRadius: '0px' }}
                    >
                      {/* 썸네일 placeholder */}
                      <div className="h-24 bg-gray-100 flex items-center justify-center mb-2" style={{ borderRadius: '0px' }}>
                        {media.thumbnailUrl ? (
                          <img src={media.thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                        ) : (
                          <Video className="w-8 h-8 text-gray-400" />
                        )}
                      </div>
                      
                      {/* 제목/타임스탬프 */}
                      <div className="mb-2">
                        <p className="text-xs font-medium text-gray-900 mb-1">
                          {media.timestamp}
                        </p>
                        {media.duration && (
                          <p className="text-xs text-gray-500">
                            재생 시간: {Math.floor(media.duration / 60)}분 {media.duration % 60}초
                            {media.fileSize && ` • ${media.fileSize}`}
                          </p>
                        )}
                      </div>
                      
                      {/* 다운로드 버튼 */}
                      <a
                        href={media.url}
                        download
                        className="w-full px-3 py-2 text-xs text-white transition-colors flex items-center justify-center gap-1"
                        style={{
                          borderRadius: '0px',
                          backgroundColor: '#10B981',
                          textDecoration: 'none',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#059669';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#10B981';
                        }}
                        onClick={(e) => {
                          // TODO: 실제 다운로드 로직
                          if (media.url === '#') {
                            e.preventDefault();
                            alert(`${media.timestamp} 영상을 다운로드합니다.`);
                          }
                        }}
                      >
                        <Download className="w-3 h-3" />
                        다운로드
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 text-sm border border-gray-200" style={{ borderRadius: '0px' }}>
                  영상이 없습니다
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedDetection && (
        <div 
          className="fixed bg-white shadow-2xl border-2 border-gray-300 z-50"
          style={{ 
            borderRadius: '0px', 
            left: `${popupPositions.detection.x}px`, 
            top: `${popupPositions.detection.y}px`,
            width: '500px',
            maxHeight: '600px'
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
                {selectedDetection.incidents.map((incident, index) => {
                  console.log('Rendering incident:', incident);
                  return (
                    <div key={index} className="p-3 border border-gray-200" style={{ borderRadius: '0px' }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs ${getIncidentColor(incident.type)} flex items-center gap-1`} style={{ borderRadius: '0px' }}>
                            {incident.type === 'fire' && <Flame className="w-3 h-3" />}
                            {incident.type === 'emergency' && <AlertCircle className="w-3 h-3" />}
                            {incident.type === 'trash' && <Trash2 className="w-3 h-3" />}
                            {getIncidentLabel(incident.type)}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">{incident.time}</span>
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
                            location: selectedDetection.marker.location,
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
            width: '600px',
            zIndex: 400,
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
          <div className="p-6">
            <div className="mb-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">CCTV ID</p>
                  <p className="text-gray-900">{videoDetailPopup.cctvId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">위치</p>
                  <p className="text-gray-900">{videoDetailPopup.location}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">발생시간</p>
                  <p className="text-gray-900">{videoDetailPopup.time}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">신뢰도</p>
                  <p className="text-red-600">{videoDetailPopup.confidence}</p>
                </div>
              </div>
            </div>

            {/* 현재 영상 영역 */}
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-2">
                {videoDetailPopup.type === 'trash' ? '녹화 영상' : '감지 영상'}
              </p>
              <div className="h-80 bg-gray-900 flex items-center justify-center relative" style={{ borderRadius: '0px' }}>
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
            </div>

            {/* 탐지된 영상 리스트 */}
            <div className="mb-4">
              <p className="text-sm text-gray-700 font-semibold mb-3">
                탐지된 영상 리스트 ({videoClips.length}개)
              </p>
              {videoClips.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {videoClips.map((clip) => (
                    <div 
                      key={clip.id}
                      className="border border-gray-200 p-3 hover:bg-gray-50 transition-colors"
                      style={{ borderRadius: '0px' }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 text-xs ${
                              clip.type === 'fire' ? 'bg-red-100 text-red-700' : 
                              clip.type === 'emergency' ? 'bg-purple-100 text-purple-700' : 
                              'bg-green-100 text-green-700'
                            }`} style={{ borderRadius: '0px' }}>
                              {clip.type === 'fire' ? '화재' : clip.type === 'emergency' ? '응급' : '쓰레기'}
                            </span>
                            <span className="text-xs text-gray-600">
                              {clip.duration}초 | {clip.fileSize}
                            </span>
                          </div>
                          <p className="text-xs text-gray-700">{clip.timestamp}</p>
                          <p className="text-xs text-emerald-600">신뢰도: {clip.confidence}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedVideoClip(clip);
                            alert(`${clip.timestamp} 영상을 재생합니다.`);
                          }}
                          className="flex-1 px-3 py-1.5 text-xs text-white transition-colors flex items-center justify-center gap-1"
                          style={{
                            borderRadius: '0px',
                            backgroundColor: '#3B82F6',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#2563EB';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#3B82F6';
                          }}
                        >
                          <Eye className="w-3 h-3" />
                          재생하기
                        </button>
                        <button
                          onClick={() => {
                            // TODO: 백엔드 API 연동
                            // fetch(`/api/cctv/video/download?videoId=${clip.id}`)
                            alert(`${clip.timestamp} 영상을 다운로드합니다.`);
                          }}
                          className="flex-1 px-3 py-1.5 text-xs text-white transition-colors flex items-center justify-center gap-1"
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
                          <Download className="w-3 h-3" />
                          다운로드
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 text-sm border border-gray-200" style={{ borderRadius: '0px' }}>
                  탐지된 영상이 없습니다
                </div>
              )}
            </div>

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
    </div>
  );
}