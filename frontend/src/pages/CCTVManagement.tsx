import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import HamburgerMenuButton from '../components/HamburgerMenuButton';
import IncidentDetailModal from '../components/IncidentDetailModal';
import { X, ArrowLeft, Search, ChevronDown, ArrowUpDown, Maximize, Camera, Flame, Trash2, AlertCircle, Download, Play } from 'lucide-react';
import { useIncidentCount } from '../contexts/IncidentCountContext';
import { cctvList, getCCTVLocation, getOffCCTVCodes, getCCTVByCode } from '../services/common';
import { getCCTVList, analyzeFallenVideo, type FallenAnalysisResponse } from '../services/api';
import cctv001DemoVideo from '../assets/cctv-001_20251208T140000Z.mp4';
// 더미 비디오 import
import cctv003Video from '../assets/cctv_dummy/cctv-003.mp4';
import cctv004Video from '../assets/cctv_dummy/cctv-004.mp4';
import cctv005Video from '../assets/cctv_dummy/cctv-005.mp4';
import cctv006Video from '../assets/cctv_dummy/cctv-006.mp4';
import cctv007Video from '../assets/cctv_dummy/cctv-007.mp4';
import cctv008Video from '../assets/cctv_dummy/cctv-008.mp4';
import cctv009Video from '../assets/cctv_dummy/cctv-009.mp4';
import cctv010Video from '../assets/cctv_dummy/cctv-010.mp4';

interface CCTVManagementProps {
  onNavigate: (screen: string) => void;
  initialSelectedCCTVId?: string | null;
}

interface CCTVData {
  id: string;
  location: string;
  installDate: string;
  model: string;
  type: string;
}

interface Event {
  id: string;
  time: string;
  type: 'fire' | 'emergency' | 'trash';
  confidence: string;
  location: string;
  severity?: string; // 응급도: '상', '중', '하'
  reportProbability?: string; // 신고가능성지수
  summary?: string; // 요약설명
  clipUrl?: string; // 분석 결과 클립 URL
  frameUrls?: string[]; // 분석 결과 프레임 URL 배열
}

export default function CCTVManagement({ onNavigate, initialSelectedCCTVId }: CCTVManagementProps) {
  const { allNotifications } = useIncidentCount();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedCCTV, setSelectedCCTV] = useState<CCTVData | null>(null);
  const [showEvents, setShowEvents] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'id' | 'location' | 'status' | 'power'>('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [expandedGrid, setExpandedGrid] = useState(false);
  const [expandedStatusTable, setExpandedStatusTable] = useState(false);
  const [acknowledgedEvents, setAcknowledgedEvents] = useState<Set<string>>(new Set());
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [editedEventDetail, setEditedEventDetail] = useState<any>(null);
  
  // Video playback state
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<FallenAnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showGeminiPopup, setShowGeminiPopup] = useState(false);
  const [analysisEvents, setAnalysisEvents] = useState<Event[]>([]); // 분석 결과로 생성된 이벤트
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // 각 CCTV 썸네일 비디오 ref를 관리하는 Map
  const thumbnailVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  
  // 각 CCTV의 현재 프레임 인덱스를 관리하는 Map
  const thumbnailFrameIndices = useRef<Map<string, number>>(new Map());
  
  // Filter dropdowns
  const [showLocationFilter, setShowLocationFilter] = useState(false);
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [showPowerFilter, setShowPowerFilter] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedPowers, setSelectedPowers] = useState<string[]>([]);

  // CCTV ID에 맞는 비디오 매핑
  const cctvVideoMap: Record<string, string> = {
    'CCTV-001': cctv001DemoVideo,
    'CCTV-003': cctv003Video,
    'CCTV-004': cctv004Video,
    'CCTV-005': cctv005Video,
    'CCTV-006': cctv006Video,
    'CCTV-007': cctv007Video,
    'CCTV-008': cctv008Video,
    'CCTV-009': cctv009Video,
    'CCTV-010': cctv010Video,
  };

  // 더미 비디오가 있는 CCTV ID 목록
  const dummyCCTVIds = ['CCTV-001', 'CCTV-003', 'CCTV-004', 'CCTV-005', 'CCTV-006', 'CCTV-007', 'CCTV-008', 'CCTV-009', 'CCTV-010'];

  // Set initial selected CCTV if provided
  useEffect(() => {
    if (initialSelectedCCTVId) {
      const location = getCCTVLocation(initialSelectedCCTVId);
      setSelectedCCTV({
        id: initialSelectedCCTVId,
        location,
        installDate: '2024-01-15',
        model: 'HD-2000X',
        type: '고정',
      });
    }
  }, [initialSelectedCCTVId]);

  // 더미 비디오가 있는 CCTV가 선택되면 자동으로 재생
  useEffect(() => {
    if (selectedCCTV && dummyCCTVIds.includes(selectedCCTV.id) && !isPlayingVideo) {
      // 비디오 요소가 렌더링될 시간을 주기 위해 약간의 지연
      const timer = setTimeout(async () => {
        // Start video playback
        setIsPlayingVideo(true);
        // 비디오 요소가 렌더링된 후 재생
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.play().catch(error => {
              console.error('Video play error:', error);
            });
          }
        }, 0);

        // CCTV-001만 분석 시작
        if (selectedCCTV.id === 'CCTV-001') {
          // Trigger analysis
          setIsAnalyzing(true);
          try {
            const result = await analyzeFallenVideo(selectedCCTV.id);
            setAnalysisResult(result);
            
            // 분석 결과를 이벤트로 변환
            if (result.result && result.result.fallen_events > 0) {
              const newEvent: Event = {
                id: `fallen-${Date.now()}`,
                time: new Date().toLocaleString('ko-KR'),
                type: 'emergency',
                confidence: '95%',
                location: selectedCCTV.location,
                severity: '상',
                reportProbability: '높음',
                summary: `${selectedCCTV.location}에서 낙상 이벤트가 탐지되었습니다.`,
                clipUrl: result.result.clip_url,
                frameUrls: result.result.frame_urls || []
              };
              setAnalysisEvents(prev => [...prev, newEvent]);
            }
            
            // Check if Gemini call is needed
            if (result.geminiMessage) {
              setShowGeminiPopup(true);
            }
          } catch (error) {
            console.error('Failed to analyze video:', error);
          } finally {
            setIsAnalyzing(false);
          }
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [selectedCCTV?.id, isPlayingVideo]); // selectedCCTV.id가 변경될 때마다 실행

  // 썸네일 비디오를 0.5초마다 7프레임씩 건너뛰며 업데이트
  useEffect(() => {
    const interval = setInterval(() => {
      thumbnailVideoRefs.current.forEach((video, cctvId) => {
        if (video && video.readyState >= 2) { // HAVE_CURRENT_DATA 이상
          // 비디오의 FPS 추정 (기본값 30fps)
          const fps = 30; // 일반적인 FPS
          const frameDuration = 1 / fps; // 한 프레임의 시간 (초)
          
          // 현재 프레임 인덱스 가져오기 (없으면 0으로 초기화)
          let currentFrameIndex = thumbnailFrameIndices.current.get(cctvId) || 0;
          
          // 7프레임씩 건너뛰기
          currentFrameIndex += 4;
          
          // 해당 프레임의 시간 계산
          const targetTime = currentFrameIndex * frameDuration;
          
          // 비디오 duration 확인
          if (video.duration && !isNaN(video.duration)) {
            // 비디오 끝을 넘어가면 처음으로 리셋
            if (targetTime >= video.duration) {
              currentFrameIndex = 0;
              video.currentTime = 0;
            } else {
              video.currentTime = targetTime;
            }
            
            // 프레임 인덱스 업데이트
            thumbnailFrameIndices.current.set(cctvId, currentFrameIndex);
          }
        }
      });
    }, 500); // 0.5초마다 실행

    return () => clearInterval(interval);
  }, []);

  // Load CCTV list from backend
  const [backendCCTVs, setBackendCCTVs] = useState<any[]>([]);
  useEffect(() => {
    const loadCCTVs = async () => {
      const cctvs = await getCCTVList();
      setBackendCCTVs(cctvs);
    };
    loadCCTVs();
  }, []);

  // Generate CCTV thumbnails based on backend cctvList (extendable to 100)
  const cctvThumbnails = Array.from({ length: 100 }, (_, i) => {
    const id = `CCTV-${String(i + 1).padStart(3, '0')}`;
    const cctv = backendCCTVs.find(c => c.cctvCode === id) || getCCTVByCode(id);
    const hour = 14 - Math.floor(i / 20);
    const minute = 60 - ((i % 20) * 3);
    const time = `2025-11-21 ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    // 알림이 있는 CCTV는 detecting true
    const detecting = allNotifications.some(n => n.cctvId === id);
    const latestEvent = allNotifications.find(n => n.cctvId === id);
    return { 
      id, 
      time, 
      detecting, 
      power: cctv?.powerStatus || 'on',
      latestEvent,
      detectionTime: detecting ? (latestEvent?.time || time) : null
    };
  }).sort((a, b) => {
    // 이벤트 발생한 CCTV를 제일 위로 정렬
    if (a.detecting && !b.detecting) return -1;
    if (!a.detecting && b.detecting) return 1;
    // 둘 다 이벤트가 있으면 최근 이벤트 순
    if (a.detecting && b.detecting) {
      return (b.detectionTime || '').localeCompare(a.detectionTime || '');
    }
    // 둘 다 이벤트가 없으면 ID 순
    return a.id.localeCompare(b.id);
  });

  // 선택된 CCTV의 이벤트 목록 가져오기
  const getEventsForCCTV = (cctvId: string): Event[] => {
    return allNotifications
      .filter(notification => notification.cctvId === cctvId)
      .map(notification => {
        // 응급도 계산 (confidence 기반)
        const confidenceNum = parseInt(notification.confidence);
        const severity = confidenceNum >= 80 ? '상' : confidenceNum >= 60 ? '중' : '하';
        
        // 신고가능성지수 계산
        const reportProb = confidenceNum >= 75 ? '높음' : confidenceNum >= 50 ? '보통' : '낮음';
        
        // 요약설명 생성
        const summaries: Record<string, string> = {
          fire: `${notification.location}에서 화재 징후가 탐지되었습니다. 즉시 확인이 필요합니다.`,
          emergency: `${notification.location}에서 응급상황이 발생했습니다. 신속한 대응이 필요합니다.`,
          trash: `${notification.location}에서 불법 쓰레기 투기가 발견되었습니다.`
        };
        
        return {
          id: notification.id,
          time: notification.time,
          type: notification.type,
          confidence: notification.confidence,
          location: notification.location,
          severity,
          reportProbability: reportProb,
          summary: summaries[notification.type] || '이벤트가 탐지되었습니다.'
        };
      });
  };

  // 기존 이벤트와 분석 결과 이벤트 합치기
  const baseEvents = selectedCCTV ? getEventsForCCTV(selectedCCTV.id) : [];
  const events = [...baseEvents, ...analysisEvents];

  // CCTV 현황 데이터 (backend cctvList 기반으로 생성)
  const cctvStatusDataRaw = Array.from({ length: 100 }, (_, i) => {
    const id = `CCTV-${String(i + 1).padStart(3, '0')}`;
    const cctv = backendCCTVs.find(c => c.cctvCode === id) || getCCTVByCode(id);
    const location = cctv ? cctv.locationDesc : getCCTVLocation(id);
    
    // 알림이 있는 CCTV 찾기
    const hasNotification = allNotifications.some(n => n.cctvId === id);
    const notificationType = allNotifications.find(n => n.cctvId === id)?.type;
    const detectedIncident = notificationType === 'fire' ? '화재' : notificationType === 'emergency' ? '응급' : notificationType === 'trash' ? '쓰레기' : '-';
    
    // cctvList에서 power 상태 가져오기, 없으면 기본값은 'on' (단, offCCTVs 목록에 있으면 'off')
    const offCCTVsList = getOffCCTVCodes();
    const power = cctv ? cctv.powerStatus : (offCCTVsList.includes(id) ? 'off' as const : 'on' as const);
    const status = power === 'off' ? '점검필요' : '정상';
    
    const hour = 14 - Math.floor(i / 20);
    const minute = 60 - ((i % 20) * 3);
    const lastDetection = hasNotification 
      ? allNotifications.find(n => n.cctvId === id)?.time || `2025-11-25 ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
      : `2025-11-25 ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    
    return { id, location, status, power, lastDetection, detectedIncident };
  });

  // Apply rule: if power is off, status must be '점검필요'
  const cctvStatusData = cctvStatusDataRaw.map(cctv => ({
    ...cctv,
    status: cctv.power === 'off' ? '점검필요' : cctv.status
  }));

  // Get unique locations
  const uniqueLocations = Array.from(new Set(cctvStatusData.map(c => c.location)));

  // Toggle location filter
  const toggleLocationFilter = (location: string) => {
    setSelectedLocations(prev => 
      prev.includes(location) 
        ? prev.filter(l => l !== location)
        : [...prev, location]
    );
  };

  // Toggle status filter
  const toggleStatusFilter = (status: string) => {
    setSelectedStatuses(prev => 
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  // Toggle power filter
  const togglePowerFilter = (power: string) => {
    setSelectedPowers(prev => 
      prev.includes(power)
        ? prev.filter(p => p !== power)
        : [...prev, power]
    );
  };

  // Filter and sort CCTV status data
  const getFilteredAndSortedCCTVData = () => {
    let filtered = cctvStatusData;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(cctv => 
        cctv.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Location filter
    if (selectedLocations.length > 0) {
      filtered = filtered.filter(cctv => selectedLocations.includes(cctv.location));
    }

    // Status filter
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter(cctv => selectedStatuses.includes(cctv.status));
    }

    // Power filter
    if (selectedPowers.length > 0) {
      filtered = filtered.filter(cctv => selectedPowers.includes(cctv.power));
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let aValue: string | number = '';
      let bValue: string | number = '';

      if (sortBy === 'id') {
        aValue = a.id;
        bValue = b.id;
      } else if (sortBy === 'location') {
        aValue = a.location;
        bValue = b.location;
      } else if (sortBy === 'status') {
        aValue = a.status;
        bValue = b.status;
      } else if (sortBy === 'power') {
        aValue = a.power;
        bValue = b.power;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return sorted;
  };

  const filteredAndSortedCCTVData = getFilteredAndSortedCCTVData();

  const handleSort = (column: 'id' | 'location' | 'status' | 'power') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const logData = [
    { id: 'CCTV-001', location: '등산로 1', status: '정상', lastDetection: '2025-11-21 14:23', connection: '연결됨' },
    { id: 'CCTV-003', location: '등산로 3', status: '점검필요', lastDetection: '2025-11-21 14:15', connection: '연결됨' },
    { id: 'CCTV-002', location: '등산로 2', status: '정상', lastDetection: '2025-11-21 14:05', connection: '연결됨' },
    { id: 'CCTV-005', location: '등산로 입구 1', status: '정상', lastDetection: '2025-11-21 13:45', connection: '연결됨' },
    { id: 'CCTV-001', location: '등산로 1', status: '정상', lastDetection: '2025-11-21 13:30', connection: '연결됨' },
    { id: 'CCTV-004', location: '등산로 4', status: '정상', lastDetection: '2025-11-21 13:15', connection: '연결됨' },
    { id: 'CCTV-006', location: '등산로 입구 2', status: '정상', lastDetection: '2025-11-21 12:50', connection: '연결됨' },
    { id: 'CCTV-003', location: '등산로 3', status: '점검필요', lastDetection: '2025-11-21 12:30', connection: '연결됨' },
    { id: 'CCTV-002', location: '등산로 2', status: '정상', lastDetection: '2025-11-21 12:10', connection: '연결됨' },
    { id: 'CCTV-005', location: '등산로 입구 1', status: '정상', lastDetection: '2025-11-21 11:45', connection: '연결됨' },
    { id: 'CCTV-001', location: '등산로 1', status: '정상', lastDetection: '2025-11-21 11:20', connection: '연결됨' },
    { id: 'CCTV-004', location: '등산로 4', status: '정상', lastDetection: '2025-11-21 10:55', connection: '연결됨' },
    { id: 'CCTV-003', location: '등산로 3', status: '점검필요', lastDetection: '2025-11-21 10:30', connection: '연결됨' },
    { id: 'CCTV-006', location: '등산로 입구 2', status: '정상', lastDetection: '2025-11-21 10:10', connection: '연결됨' },
    { id: 'CCTV-002', location: '등산로 2', status: '정상', lastDetection: '2025-11-21 09:45', connection: '연결됨' },
    { id: 'CCTV-005', location: '등산로 입구 1', status: '정상', lastDetection: '2025-11-21 09:20', connection: '연결됨' },
    { id: 'CCTV-001', location: '등산로 1', status: '정상', lastDetection: '2025-11-21 08:50', connection: '연결됨' },
    { id: 'CCTV-004', location: '등산로 4', status: '정상', lastDetection: '2025-11-21 08:25', connection: '연결됨' },
    { id: 'CCTV-003', location: '등산로 3', status: '점검필요', lastDetection: '2025-11-21 08:00', connection: '연결됨' },
    { id: 'CCTV-006', location: '등산로 입구 2', status: '정상', lastDetection: '2025-11-21 07:35', connection: '연결됨' },
    { id: 'CCTV-002', location: '등산로 2', status: '정상', lastDetection: '2025-11-21 07:10', connection: '연결됨' },
    { id: 'CCTV-005', location: '등산로 입구 1', status: '정상', lastDetection: '2025-11-21 06:45', connection: '연결됨' },
    { id: 'CCTV-001', location: '등산로 1', status: '정상', lastDetection: '2025-11-21 06:20', connection: '연결됨' },
    { id: 'CCTV-004', location: '등산로 4', status: '정상', lastDetection: '2025-11-21 05:55', connection: '연결됨' },
  ];

  // Filter log data based on selected CCTV
  const filteredLogData = selectedCCTV ? logData.filter(log => log.id === selectedCCTV.id) : logData;

  const handleCCTVClick = (cctvId: string) => {
    const cctvData = {
      id: cctvId,
      location: getCCTVLocation(cctvId),
      installDate: '2024-01-15',
      model: 'HD-2000X',
      type: '고정',
    };
    setSelectedCCTV(cctvData);
    
    // 새 이벤트가 있으면 자동으로 팝업 표시
    const cctvEvents = getEventsForCCTV(cctvId);
    const newEvent = cctvEvents.find(e => !acknowledgedEvents.has(e.id));
    if (newEvent) {
      setSelectedEvent(newEvent);
    }
    // useEffect에서 자동 재생 처리하므로 여기서는 제거
  };

  const handleEventAcknowledge = () => {
    if (selectedEvent) {
      // 이벤트 확인 완료
      setAcknowledgedEvents(prev => new Set(prev).add(selectedEvent.id));
      setSelectedEvent(null);
    }
  };

  // Event를 IncidentDetail로 변환
  const convertEventToIncidentDetail = (event: Event) => {
    const baseDetail = {
      accidentCode: event.id,
      cctvId: selectedCCTV?.id || '',
      location: event.location,
      time: event.time,
      severity: event.severity || '중',
      status: 'PENDING',
      handler: '미배정',
      detectionBasis: 'AI 자동탐지',
      clipUrl: event.clipUrl,
      frameUrls: event.frameUrls
    };

    if (event.type === 'fire') {
      return {
        ...baseDetail,
        windSpeed: '2.5 m/s',
        spreadDirection: '북동쪽',
        surroundingRisk: '높음',
        note: event.summary || ''
      };
    } else if (event.type === 'emergency') {
      return {
        ...baseDetail,
        type: '응급',
        patientName: '미상',
        patientAge: '미상',
        patientGender: '미상',
        rescueTeam: '미배정',
        transferHospital: '미정',
        note: event.summary || ''
      };
    } else {
      return {
        ...baseDetail,
        type: '쓰레기',
        trashType: '일반 쓰레기',
        amount: '중량',
        note: event.summary || ''
      };
    }
  };

  // Handle video play button click
  const handlePlayVideo = async () => {
    if (!selectedCCTV || selectedCCTV.id !== 'CCTV-001') {
      return; // Only for CCTV-001
    }

    // Start video playback
    setIsPlayingVideo(true);
    // 비디오 요소가 렌더링된 후 재생
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.play().catch(error => {
          console.error('Video play error:', error);
        });
      }
    }, 0);

    // Trigger analysis
    setIsAnalyzing(true);
    try {
      const result = await analyzeFallenVideo(selectedCCTV.id);
      setAnalysisResult(result);
      
      // 분석 결과를 이벤트로 변환
      if (result.result && result.result.fallen_events > 0) {
        const newEvent: Event = {
          id: `fallen-${Date.now()}`,
          time: new Date().toLocaleString('ko-KR'),
          type: 'emergency',
          confidence: '95%',
          location: selectedCCTV.location,
          severity: '상',
          reportProbability: '높음',
          summary: `${selectedCCTV.location}에서 낙상 이벤트가 탐지되었습니다.`,
          clipUrl: result.result.clip_url,
          frameUrls: result.result.frame_urls || []
        };
        setAnalysisEvents(prev => [...prev, newEvent]);
      }
      
      // Check if Gemini call is needed
      if (result.geminiMessage) {
        setShowGeminiPopup(true);
      }
    } catch (error) {
      console.error('Failed to analyze video:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar with smooth slide animation */}
      <div 
        className="fixed top-0 left-0 z-50 h-screen transition-transform duration-300 ease-in-out"
        style={{ 
          width: '317.56px', 
          backgroundColor: '#2B2847',
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)'
        }}
      >
        <Sidebar onNavigate={onNavigate} currentPath="cctv-management" />
      </div>
      
      <div className="flex-1 flex flex-col relative bg-gray-50" style={{ marginLeft: sidebarOpen ? '317.56px' : '0px', transition: 'margin-left 0.3s' }}>
        {/* 상단바 */}
        <div className="shadow-md px-6 py-4 flex items-center justify-between border-b border-gray-200" style={{ backgroundColor: '#345eaa' }}>
          <div className="flex items-center gap-3">
            <HamburgerMenuButton onClick={() => setSidebarOpen(!sidebarOpen)} />
            <Camera className="w-6 h-6 text-gray-200" />
            <h1 className="text-gray-100">CCTV 관리</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className={`${selectedCCTV ? 'grid grid-cols-1 lg:grid-cols-2 gap-8' : ''} mb-8`}>
            {/* Left: CCTV Display Area */}
            <div className={selectedCCTV ? '' : 'mb-8'}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-900">실시간 CCTV</h3>
                {!selectedCCTV && (
                  <button
                    onClick={() => setExpandedGrid(!expandedGrid)}
                    className="px-3 py-1 text-xs bg-gray-800 text-white hover:bg-gray-900 transition-colors"
                    style={{ borderRadius: '0px' }}
                  >
                    {expandedGrid ? '축소' : '확장'}
                  </button>
                )}
              </div>
              
              {selectedCCTV ? (
                /* Selected CCTV - Large view with events list below */
                <div className="space-y-6">
                  {/* Large CCTV Display */}
                  <div className="bg-white shadow-md" style={{ borderRadius: '0px' }}>
                    <div className="aspect-video bg-gray-800 flex items-center justify-center relative group overflow-hidden">
                      {/* 비디오 요소를 항상 렌더링 (더미 비디오가 있는 CCTV일 때) */}
                      {dummyCCTVIds.includes(selectedCCTV.id) && (
                        <video
                          ref={videoRef}
                          src={cctvVideoMap[selectedCCTV.id]}
                          controls
                          muted
                          loop
                          autoPlay
                          className={`w-full h-full object-contain ${isPlayingVideo ? '' : 'hidden'}`}
                          onPlay={() => setIsPlayingVideo(true)}
                        />
                      )}
                      
                      {/* Live Feed 화면 (비디오가 재생 중이 아닐 때) */}
                      {(!isPlayingVideo || !dummyCCTVIds.includes(selectedCCTV.id)) && (
                        <>
                          <span className="text-white">{selectedCCTV.id} - Live Feed</span>
                          {/* Power status indicator */}
                          <div className={`absolute top-4 left-4 w-4 h-4 rounded-full ${
                            cctvStatusData.find(c => c.id === selectedCCTV.id)?.power === 'on' ? 'bg-green-500' : 'bg-gray-400'
                          }`} style={{ border: '2px solid white' }}></div>
                          
                          {/* Fullscreen button (오른쪽 아래) */}
                          <button
                            onClick={() => setShowFullscreen(true)}
                            className="absolute bottom-4 right-4 p-2 bg-black bg-opacity-50 text-white hover:bg-opacity-70 transition-opacity opacity-0 group-hover:opacity-100"
                            style={{ borderRadius: '4px' }}
                          >
                            <Maximize className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="text-lg font-semibold text-gray-900">{selectedCCTV.id}</p>
                      <p className="text-sm text-gray-600">{selectedCCTV.location}</p>
                    </div>
                  </div>

                  {/* Events List - YouTube Style */}
                  <div>
                    <h3 className="text-gray-900 mb-4">이 CCTV의 탐지 이벤트</h3>
                    {events.length > 0 ? (
                      <div className={`grid ${sidebarOpen ? 'grid-cols-4' : 'grid-cols-5'} gap-4`}>
                        {events.map((event) => {
                          const EventIcon = event.type === 'fire' ? Flame : event.type === 'emergency' ? AlertCircle : Trash2;
                          const eventColor = event.type === 'fire' ? 'text-red-500' : event.type === 'emergency' ? 'text-purple-500' : 'text-green-500';
                          const eventBg = event.type === 'fire' ? 'bg-red-50' : event.type === 'emergency' ? 'bg-purple-50' : 'bg-green-50';
                          const eventLabel = event.type === 'fire' ? '화재' : event.type === 'emergency' ? '응급' : '쓰레기';
                          // 분석 결과에서 온 이벤트는 첫 번째 프레임을 썸네일로 사용
                          const thumbnailUrl = event.frameUrls && event.frameUrls.length > 0 ? event.frameUrls[0] : null;
                          
                          return (
                            <div
                              key={event.id}
                              onClick={() => setSelectedEvent(event)}
                              className="bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
                              style={{ borderRadius: '0px' }}
                            >
                              {/* Thumbnail */}
                              <div className={`aspect-video ${!thumbnailUrl ? eventBg : ''} flex items-center justify-center relative overflow-hidden`}>
                                {thumbnailUrl ? (
                                  <img
                                    src={thumbnailUrl}
                                    alt="Event thumbnail"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <EventIcon className={`w-8 h-8 ${eventColor}`} />
                                )}
                                <div className={`absolute top-2 right-2 px-2 py-0.5 text-xs text-white ${
                                  event.type === 'fire' ? 'bg-red-600' : event.type === 'emergency' ? 'bg-purple-600' : 'bg-green-600'
                                }`}>
                                  {eventLabel}
                                </div>
                              </div>
                              {/* Info */}
                              <div className="p-3">
                                <p className="text-sm font-medium text-gray-900 mb-1">사건 ID: {event.id}</p>
                                <p className="text-xs text-gray-600 mb-1">{event.time}</p>
                                <p className="text-xs text-gray-500">{event.location}</p>
                                <p className="text-xs text-gray-500">신뢰도: {event.confidence}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="bg-gray-50 border-2 border-dashed border-gray-300 p-8 text-center">
                        <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">탐지된 이벤트가 없습니다</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Grid view - all CCTVs */
                <div className={`grid grid-cols-4 gap-4 ${expandedGrid ? 'max-h-[700px]' : 'max-h-[360px]'} overflow-y-auto pr-2`}>
                  {cctvThumbnails.map((cctv) => {
                    const EventIcon = cctv.latestEvent?.type === 'fire' ? Flame : 
                                     cctv.latestEvent?.type === 'emergency' ? AlertCircle : 
                                     cctv.latestEvent?.type === 'trash' ? Trash2 : null;
                    return (
                      <div
                        key={cctv.id}
                        onClick={() => handleCCTVClick(cctv.id)}
                        className={`bg-white shadow-md hover:shadow-lg transition-all cursor-pointer overflow-hidden ${
                          cctv.detecting ? 'ring-2 ring-red-500' : ''
                        }`}
                        style={{ borderRadius: '0px' }}
                      >
                        <div className="aspect-video bg-gray-800 flex items-center justify-center relative overflow-hidden">
                          {/* 더미 비디오가 있는 CCTV는 비디오 썸네일 표시 */}
                          {dummyCCTVIds.includes(cctv.id) && cctvVideoMap[cctv.id] ? (
                            <video
                              ref={(el) => {
                                if (el) {
                                  thumbnailVideoRefs.current.set(cctv.id, el);
                                } else {
                                  thumbnailVideoRefs.current.delete(cctv.id);
                                }
                              }}
                              src={cctvVideoMap[cctv.id]}
                              className="w-full h-full object-cover"
                              muted
                              playsInline
                              preload="metadata"
                              onLoadedMetadata={(e) => {
                                // 첫 프레임 설정 (프레임 인덱스 0)
                                const video = e.currentTarget;
                                video.currentTime = 0;
                                // 비디오를 일시정지 상태로 유지 (재생하지 않음)
                                video.pause();
                                // 프레임 인덱스 초기화
                                thumbnailFrameIndices.current.set(cctv.id, 0);
                              }}
                            />
                          ) : cctv.detecting && EventIcon ? (
                            /* 이벤트 발생 시 바운딩 박스 썸네일 표시 */
                            <div className="w-full h-full relative flex items-center justify-center">
                              <span className="text-white text-sm">{cctv.id} - 이벤트 탐지</span>
                              {/* 바운딩 박스 효과 */}
                              <div className="absolute inset-0 border-4 border-red-500 opacity-75" style={{ 
                                top: '20%', 
                                left: '25%', 
                                right: '25%', 
                                bottom: '30%' 
                              }}>
                                <div className="absolute -top-6 left-0 bg-red-500 text-white text-xs px-2 py-1">
                                  {cctv.latestEvent?.type === 'fire' ? '화재' : 
                                   cctv.latestEvent?.type === 'emergency' ? '응급' : '쓰레기'}
                                </div>
                              </div>
                              {/* 이벤트 아이콘 */}
                              <div className="absolute top-2 left-2 bg-red-500 p-1.5 rounded">
                                <EventIcon className="w-4 h-4 text-white" />
                              </div>
                            </div>
                          ) : (
                            /* 정상 CCTV 화면 */
                            <span className="text-white text-sm">{cctv.id}</span>
                          )}
                          {/* Power status indicator */}
                          <div className={`absolute top-2 right-2 w-3 h-3 rounded-full z-10 ${
                            cctvStatusData.find(c => c.id === cctv.id)?.power === 'on' ? 'bg-green-400' : 'bg-gray-400'
                          }`} style={{ border: '1px solid white' }}></div>
                        </div>
                        <div className="p-3">
                          <p className="text-xs text-gray-600">
                            {cctv.detecting ? `탐지: ${cctv.detectionTime}` : `감지: ${cctv.time}`}
                          </p>
                          <p className="text-sm text-gray-900 font-medium">{cctv.id}</p>
                          {cctv.detecting && (
                            <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-red-100 text-red-700">
                              🔴 실시간 탐지 중
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Detail Panel (only when CCTV is selected) */}
            {selectedCCTV && (
              <div className="bg-white shadow-md p-6 relative" style={{ borderRadius: '0px' }}>
                <button
                  onClick={() => setSelectedCCTV(null)}
                  className="absolute top-4 right-4 text-gray-600 hover:text-gray-900"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="mb-4 text-gray-900">CCTV 상세정보</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">CCTV ID</p>
                    <p className="text-gray-900 font-medium">{selectedCCTV?.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">위치</p>
                    <p className="text-gray-900">{selectedCCTV?.location}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">설치 날짜</p>
                    <p className="text-gray-900">{selectedCCTV?.installDate}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">모델명</p>
                    <p className="text-gray-900">{selectedCCTV?.model}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">고정/회전 여부</p>
                    <p className="text-gray-900">{selectedCCTV?.type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">해상도</p>
                    <p className="text-gray-900">1920x1080 (FHD)</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">전원 상태</p>
                    <p className={`inline-flex items-center gap-2 ${
                      cctvStatusData.find(c => c.id === selectedCCTV.id)?.power === 'on' ? 'text-green-700' : 'text-gray-700'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        cctvStatusData.find(c => c.id === selectedCCTV.id)?.power === 'on' ? 'bg-green-500' : 'bg-gray-400'
                      }`}></span>
                      {cctvStatusData.find(c => c.id === selectedCCTV.id)?.power === 'on' ? '정상 작동 중' : '전원 꺼짐'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">탐지 이벤트 수</p>
                    <p className="text-gray-900 font-semibold">{events.length}건</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CCTV 현황 Table - Hide when CCTV is expanded */}
          {!selectedCCTV && (
            <div className="bg-white shadow-md mb-8" style={{ borderRadius: '0px' }}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-900">CCTV 현황</h3>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setExpandedStatusTable(!expandedStatusTable)}
                      className="px-3 py-1 text-xs bg-gray-800 text-white hover:bg-gray-900 transition-colors"
                      style={{ borderRadius: '0px' }}
                    >
                      {expandedStatusTable ? '축소' : '확장'}
                    </button>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="CCTV ID 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-3 py-2 text-sm border border-gray-300 focus:border-emerald-500 outline-none"
                        style={{ borderRadius: '0px' }}
                      />
                    </div>
                  </div>
                </div>
                
                <div className={`overflow-x-auto ${expandedStatusTable ? 'max-h-[600px]' : 'max-h-[300px]'} overflow-y-auto`}>
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-gray-600">
                          <button 
                            onClick={() => handleSort('id')}
                            className="flex items-center gap-1 hover:text-gray-900"
                          >
                            CCTV ID
                            <ArrowUpDown className="w-3 h-3" />
                          </button>
                        </th>
                        <th className="text-left py-3 px-4 text-gray-600">
                          <div className="relative">
                            <button 
                              onClick={() => {
                                setShowLocationFilter(!showLocationFilter);
                                setShowStatusFilter(false);
                                setShowPowerFilter(false);
                              }}
                              className="flex items-center gap-1 hover:text-gray-900"
                            >
                              위치
                              <ChevronDown className="w-3 h-3" />
                            </button>
                            
                            {showLocationFilter && (
                              <div className="absolute top-full left-0 mt-2 bg-white shadow-xl border border-gray-200 z-20 min-w-[150px] max-h-[160px] overflow-y-auto" style={{ borderRadius: '0px' }}>
                                {uniqueLocations.map(location => (
                                  <label 
                                    key={location}
                                    className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedLocations.includes(location)}
                                      onChange={() => toggleLocationFilter(location)}
                                      className="cursor-pointer"
                                    />
                                    <span className="text-gray-900">{location}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        </th>
                        <th className="text-left py-3 px-4 text-gray-600">
                          <div className="relative">
                            <button 
                              onClick={() => {
                                setShowPowerFilter(!showPowerFilter);
                                setShowLocationFilter(false);
                                setShowStatusFilter(false);
                              }}
                              className="flex items-center gap-1 hover:text-gray-900"
                            >
                              전원 상태
                              <ChevronDown className="w-3 h-3" />
                            </button>
                            
                            {showPowerFilter && (
                              <div className="absolute top-full left-0 mt-2 bg-white shadow-xl border border-gray-200 z-20 min-w-[100px]" style={{ borderRadius: '0px' }}>
                                <label className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm">
                                  <input
                                    type="checkbox"
                                    checked={selectedPowers.includes('on')}
                                    onChange={() => togglePowerFilter('on')}
                                    className="cursor-pointer"
                                  />
                                  <span className="text-gray-900">on</span>
                                </label>
                                <label className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm">
                                  <input
                                    type="checkbox"
                                    checked={selectedPowers.includes('off')}
                                    onChange={() => togglePowerFilter('off')}
                                    className="cursor-pointer"
                                  />
                                  <span className="text-gray-900">off</span>
                                </label>
                              </div>
                            )}
                          </div>
                        </th>
                        <th className="text-left py-3 px-4 text-gray-600">최근 감지시간</th>
                        <th className="text-left py-3 px-4 text-gray-600">탐지 이벤트</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedCCTVData.length > 0 ? (
                        filteredAndSortedCCTVData.map((cctv) => (
                          <tr key={cctv.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 text-gray-900">{cctv.id}</td>
                            <td className="py-3 px-4 text-gray-900">{cctv.location}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 text-xs ${cctv.power === 'on' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {cctv.power}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-900">{cctv.lastDetection}</td>
                            <td className="py-3 px-4 text-gray-900">{cctv.detectedIncident}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-500">
                            검색 결과가 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
        </div>

      </div>

      {/* Event Detail Modal - Using IncidentDetailModal */}
      {selectedEvent && (
        <IncidentDetailModal
          type={selectedEvent.type}
          detail={convertEventToIncidentDetail(selectedEvent)}
          isEditing={isEditingEvent}
          editedDetail={editedEventDetail}
          onClose={handleEventAcknowledge}
          onEditClick={() => {
            setIsEditingEvent(true);
            setEditedEventDetail(convertEventToIncidentDetail(selectedEvent));
          }}
          onSave={() => {
            setIsEditingEvent(false);
            setEditedEventDetail(null);
            handleEventAcknowledge();
          }}
          onCancel={() => {
            setIsEditingEvent(false);
            setEditedEventDetail(null);
          }}
          onFieldChange={(field, value) => {
            setEditedEventDetail((prev: any) => ({
              ...prev,
              [field]: value
            }));
          }}
        />
      )}

      {/* Gemini Popup Modal */}
      {showGeminiPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white p-6 max-w-md w-full mx-4" style={{ borderRadius: '0px' }}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Gemini 호출 필요</h3>
            <p className="text-gray-700 mb-4">
              Gemini 호출 구현해야함!
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowGeminiPopup(false)}
                className="px-4 py-2 bg-gray-800 text-white hover:bg-gray-900 transition-colors"
                style={{ borderRadius: '0px' }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Modal */}
      {showFullscreen && selectedCCTV && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={() => setShowFullscreen(false)}
              className="p-3 bg-white bg-opacity-20 text-white hover:bg-opacity-30 transition-colors rounded"
            >
              <X className="w-7 h-7" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="w-full h-full bg-gray-900 flex items-center justify-center relative" style={{ borderRadius: '0px' }}>
              {events.length > 0 ? (
                /* 이벤트가 있으면 이벤트 영상 표시 */
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <div className="text-red-500 mb-4 animate-pulse">
                    {events[0].type === 'fire' ? <Flame className="w-16 h-16 mx-auto mb-2" /> : 
                     events[0].type === 'emergency' ? <AlertCircle className="w-16 h-16 mx-auto mb-2" /> : 
                     <Trash2 className="w-16 h-16 mx-auto mb-2" />}
                  </div>
                  <span className="text-white text-2xl mb-2">{selectedCCTV.id} - 이벤트 발생 영상</span>
                  <span className="text-red-400 text-lg">
                    {events[0].type === 'fire' ? '🔥 화재 탐지' : 
                     events[0].type === 'emergency' ? '🚨 응급상황 탐지' : 
                     '🗑️ 쓰레기 투기 탐지'}
                  </span>
                  <p className="text-gray-400 mt-2">{events[0].time}</p>
                  {/* 바운딩 박스 효과 */}
                  <div className="absolute inset-0 border-8 border-red-500 opacity-50" style={{ 
                    top: '15%', 
                    left: '20%', 
                    right: '20%', 
                    bottom: '25%' 
                  }}>
                    <div className="absolute -top-12 left-0 bg-red-500 text-white text-xl px-4 py-2">
                      {events[0].type === 'fire' ? '화재' : events[0].type === 'emergency' ? '응급상황' : '쓰레기'} - {events[0].confidence}
                    </div>
                  </div>
                </div>
              ) : (
                /* 이벤트가 없으면 기본 CCTV 화면 */
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <Camera className="w-16 h-16 text-gray-600 mb-4" />
                  <span className="text-white text-2xl">{selectedCCTV.id} - 실시간 모니터링</span>
                  <span className="text-green-400 text-lg mt-2">✅ 정상 작동 중</span>
                </div>
              )}
              {/* Status indicator */}
              <div className={`absolute top-6 right-20 flex items-center gap-2 px-4 py-2 bg-black bg-opacity-50 rounded`}>
                <div className={`w-3 h-3 rounded-full ${
                  events.length > 0 ? 'bg-red-500 animate-pulse' : 'bg-green-500'
                }`}></div>
                <span className="text-white text-sm">
                  {events.length > 0 ? '이벤트 발생' : '정상'}
                </span>
              </div>
            </div>
          </div>
          <div className="p-4 bg-gray-900 text-white border-t border-gray-700">
            <div className="flex items-center justify-between max-w-6xl mx-auto">
              <div>
                <p className="text-sm text-gray-400">CCTV ID</p>
                <p className="text-lg font-semibold">{selectedCCTV.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">위치</p>
                <p className="text-lg">{selectedCCTV.location}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">상태</p>
                <p className={`text-lg ${events.length > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {events.length > 0 ? `이벤트 ${events.length}건 탐지` : '정상 작동 중'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">전원</p>
                <p className={`text-lg ${
                  cctvStatusData.find(c => c.id === selectedCCTV.id)?.power === 'on' ? 'text-green-400' : 'text-gray-400'
                }`}>
                  {cctvStatusData.find(c => c.id === selectedCCTV.id)?.power === 'on' ? 'ON' : 'OFF'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}