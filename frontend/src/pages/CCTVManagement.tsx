import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import HamburgerMenuButton from '../components/HamburgerMenuButton';
import IncidentDetailModal from '../components/IncidentDetailModal';
import { X, ArrowLeft, Search, ChevronDown, ArrowUpDown, Maximize, Camera, Flame, Trash2, AlertCircle, Download, Play, HeartPulse } from 'lucide-react';
import { useIncidentCount } from '../contexts/IncidentCountContext';
import { cctvList, getCCTVLocation, getOffCCTVCodes, getCCTVByCode } from '../services/common';
import { getCCTVList, analyzeFallenVideo, type FallenAnalysisResponse } from '../services/api';
import API_BASE_URL, { INGEST_HLS_URL } from '../config/api';
import Hls from 'hls.js';
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
  qwenResponse?: any; // Qwen 분석 상세 정보 (상세 페이지에서 사용)
}

export default function CCTVManagement({ onNavigate, initialSelectedCCTVId }: CCTVManagementProps) {
  const { allNotifications } = useIncidentCount();
  
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
  const [selectedCCTV, setSelectedCCTV] = useState<CCTVData | null>(null);
  const [showEvents, setShowEvents] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'id' | 'location' | 'status' | 'power'>('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [sortByRecent, setSortByRecent] = useState(false); // 최신순 정렬 토글
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [expandedGrid, setExpandedGrid] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(false); // 상단 그리드 스크롤 활성화 상태
  const [expandedStatusTable, setExpandedStatusTable] = useState(false);
  const [statusScrollEnabled, setStatusScrollEnabled] = useState(false); // 하단 CCTV 현황 스크롤 활성화 상태
  const [acknowledgedEvents, setAcknowledgedEvents] = useState<Set<string>>(new Set());
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [editedEventDetail, setEditedEventDetail] = useState<any>(null);
  
  // Video playback state
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<FallenAnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showGeminiPopup, setShowGeminiPopup] = useState(false);
  const [analysisEvents, setAnalysisEvents] = useState<Event[]>([]); // 분석 결과로 생성된 이벤트
  const [cctvIncidents, setCctvIncidents] = useState<any[]>([]); // DB에서 가져온 실제 사건 목록
  const [isAnalyzingQwen, setIsAnalyzingQwen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  
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
  
  // 라이브 스트림 CCTV ID (CCTV-011)
  const liveStreamCCTVId = 'CCTV-011';
  const HLS_STREAM_URL = `${INGEST_HLS_URL}/cctv-011.m3u8`;

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

  // CCTV-011 선택 시 HLS 스트림 시작
  useEffect(() => {
    if (selectedCCTV && selectedCCTV.id === liveStreamCCTVId && videoRef.current) {
      setIsPlayingVideo(true);
      
      // HLS 지원 확인
      if (Hls.isSupported()) {
        // 기존 HLS 인스턴스 정리
        if (hlsRef.current) {
          hlsRef.current.destroy();
        }
        
        // 새 HLS 인스턴스 생성 (초저지연 설정)
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          
          // 버퍼 크기 최소화 (실시간 우선)
          maxBufferLength: 4,           // 최대 4초만 미리 버퍼링 (기본 30초)
          maxMaxBufferLength: 6,        // 절대 최대 6초 (기본 600초)
          maxBufferSize: 10 * 1000 * 1000, // 10MB (기본 60MB)
          maxBufferHole: 0.5,           // 0.5초 이상 구멍나면 스킵
          
          // 백버퍼 최소화 (과거 데이터)
          backBufferLength: 4,          // 과거 4초만 보관 (90초 → 4초)
          
          // 즉시 재생 시작
          liveSyncDurationCount: 1,     // 1개 세그먼트만 있어도 재생 시작
          liveMaxLatencyDurationCount: 3, // 최대 3개 세그먼트 지연 허용
          
          // 빠른 복구
          manifestLoadingTimeOut: 2000,  // 2초 타임아웃
          manifestLoadingMaxRetry: 3,    // 3회 재시도
          levelLoadingTimeOut: 2000,     // 2초 타임아웃
        });
        
        hlsRef.current = hls;
        hls.loadSource(HLS_STREAM_URL);
        hls.attachMedia(videoRef.current);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          videoRef.current?.play().catch(error => {
            console.error('HLS play error:', error);
          });
        });
        
        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('HLS error:', data);
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.log('Network error, trying to recover...');
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log('Media error, trying to recover...');
                hls.recoverMediaError();
                break;
              default:
                console.log('Fatal error, destroying HLS instance');
                hls.destroy();
                break;
            }
          }
        });
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari 네이티브 HLS 지원
        videoRef.current.src = HLS_STREAM_URL;
        videoRef.current.play().catch(error => {
          console.error('Native HLS play error:', error);
        });
      }
    }
    
    // Cleanup
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [selectedCCTV?.id]);

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

  // Load incidents for selected CCTV from backend
  useEffect(() => {
    const loadCCTVIncidents = async () => {
      if (!selectedCCTV) {
        setCctvIncidents([]);
        return;
      }
      
      try {
        // CCTV ID 추출 (CCTV-001 → 1)
        const cctvIdNum = parseInt(selectedCCTV.id.replace('CCTV-', ''));
        const response = await fetch(`${API_BASE_URL}/api/cctv/${cctvIdNum}/incidents`);
        
        if (response.ok) {
          const incidents = await response.json();
          setCctvIncidents(incidents);
        } else {
          setCctvIncidents([]);
        }
      } catch (error) {
        console.error('Failed to load CCTV incidents:', error);
        setCctvIncidents([]);
      }
    };
    
    loadCCTVIncidents();
  }, [selectedCCTV]);

  // Generate CCTV thumbnails - 100% DB 기반 (VIEW 데이터 사용)
  const cctvThumbnails = backendCCTVs.map(cctv => {
    // VIEW에서 온 데이터 사용 + 영상 있는 CCTV도 detecting 처리
    const hasVideo = dummyCCTVIds.includes(cctv.cctvCode);
    const hasIncident = (cctv.incidentCount || 0) > 0 && cctv.lastIncidentTime;
    const detecting = hasIncident || hasVideo;
    
    // 실제 DB 사건이 있는 경우에만 latestEvent 생성 (영상만 있는 경우 제외)
    const latestEvent = hasIncident ? {
      cctvId: cctv.cctvCode,
      type: cctv.lastIncidentType?.toLowerCase() || 'unknown',
      time: cctv.lastIncidentTime
    } : null;
    
    // powerStatus를 안전하게 정규화 (대소문자 무시)
    const powerStatus = cctv.powerStatus 
      ? (String(cctv.powerStatus).toLowerCase().trim() === 'on' ? 'on' : 'off')
      : 'off';
    
    return { 
      id: cctv.cctvCode,
      time: cctv.lastIncidentTime || '-',
      detecting: !!detecting,
      power: powerStatus,
      latestEvent,
      detectionTime: cctv.lastIncidentTime,
      hasIncident: !!hasIncident
    };
  }).sort((a, b) => {
    // 1) 이벤트 있는 CCTV 먼저
    if (a.detecting !== b.detecting) {
      return a.detecting ? -1 : 1;
    }

    // 2) 둘 다 이벤트 상태 같으면, "영상 연결된 CCTV" 먼저 (더미 비디오 있는 애들)
    const aHasVideo = dummyCCTVIds.includes(a.id);
    const bHasVideo = dummyCCTVIds.includes(b.id);
    if (aHasVideo !== bHasVideo) {
      return aHasVideo ? -1 : 1;
    }

    // 3) 둘 다 이벤트가 있으면 최근 탐지 시간 순
    if (a.detecting && b.detecting) {
      return (b.detectionTime || '').localeCompare(a.detectionTime || '');
    }

    // 4) 나머지는 CCTV ID 순
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

  // DB에서 가져온 이벤트 + 분석 결과 이벤트 합치기
  const dbEvents = cctvIncidents.map((incident: any) => ({
    id: incident.incidentCode || `incident-${incident.incidentId}`,
    time: incident.detectedAt,
    type: incident.incidentType?.toLowerCase() || 'unknown',
    confidence: incident.detectionConfidence ? `${Math.round(incident.detectionConfidence * 100)}%` : '-',
    location: incident.locationDesc || selectedCCTV?.location || '',
    severity: incident.severity || '중',
    reportProbability: '-',
    summary: incident.locationDesc || '',
    clipUrl: null,
    frameUrls: [],
    qwenResponse: null
  }));
  const events = [...dbEvents, ...analysisEvents];

  // CCTV 현황 데이터 - 100% DB 기반 (VIEW 데이터만 사용)
  const cctvStatusDataRaw = backendCCTVs.map(cctv => {
    const id = cctv.cctvCode;
    const location = cctv.locationDesc || cctv.name || id;
    
    // VIEW에서 온 전원 상태
    const power = cctv.powerStatus || 'off';
    const status = power === 'off' ? '점검필요' : '정상';
    
    // VIEW에서 온 최근 감지 시간 (없으면 '-')
    const lastDetection = cctv.lastIncidentTime || '-';
    
    // VIEW에서 온 최근 사건 유형
    const typeMap: Record<string, string> = {
      'FIRE': '화재',
      'EMERGENCY': '응급',
      'TRASH': '쓰레기'
    };
    const detectedIncident = cctv.lastIncidentType 
      ? (typeMap[cctv.lastIncidentType] || '-')
      : '-';

    // VIEW에서 온 헬스 상태
    const rawHealth = cctv.healthStatus || 'NORMAL';
    const healthStatus =
      rawHealth === 'NORMAL' ? '정상' :
      rawHealth === 'NEED_CHECK' ? '점검필요' :
      '오프라인';

    // VIEW에서 온 최근 헬스체크 시간
    const rawHeartbeat = cctv.lastHeartbeat;
    let lastHeartbeat = '-';
    if (rawHeartbeat) {
      try {
        lastHeartbeat = new Date(rawHeartbeat).toLocaleString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).replace(/\./g, '.').replace(/,/g, '');
      } catch {
        lastHeartbeat = String(rawHeartbeat);
      }
    }
    
    return { id, location, status, power, lastDetection, detectedIncident, healthStatus, lastHeartbeat };
  });

  // Apply rule: if power is off, status must be '점검필요'
  const cctvStatusData = cctvStatusDataRaw.map(cctv => ({
    ...cctv,
    status: cctv.power === 'off' ? '점검필요' : cctv.status
  }));

  // Get unique locations
  const uniqueLocations: string[] = Array.from(new Set(cctvStatusData.map(c => c.location)));

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

    // Sort - 최신순이 활성화되면 최신순 우선
    const sorted = [...filtered].sort((a, b) => {
      // 최신순 토글이 켜져 있으면 최근 감지시간으로 정렬
      if (sortByRecent) {
        const aTime = a.lastDetection === '-' ? '0000-00-00' : a.lastDetection;
        const bTime = b.lastDetection === '-' ? '0000-00-00' : b.lastDetection;
        return bTime.localeCompare(aTime); // 내림차순 (최신순)
      }

      // 기본 정렬
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
    // DB에서 실제 CCTV 데이터 찾기
    const cctvFromDB = backendCCTVs.find(c => c.cctvCode === cctvId);
    
    const cctvData = {
      id: cctvId,
      location: cctvFromDB?.locationDesc || cctvFromDB?.name || cctvId,
      installDate: cctvFromDB?.installDate || '-',
      model: cctvFromDB?.modelName || '-',
      type: '고정', // TODO: DB에 추가되면 사용
      resolution: cctvFromDB?.resolution || '1920x1080',
      powerStatus: cctvFromDB?.powerStatus || 'off',
      incidentCount: cctvFromDB?.incidentCount || 0,
      lastIncidentTime: cctvFromDB?.lastIncidentTime || null,
      lastIncidentType: cctvFromDB?.lastIncidentType || null,
    };
    setSelectedCCTV(cctvData);
    
    // 새 이벤트가 있으면 자동으로 팝업 표시
    const cctvEvents = getEventsForCCTV(cctvId);
    const newEvent = cctvEvents.find(e => !acknowledgedEvents.has(e.id));
    if (newEvent) {
      setSelectedEvent(newEvent);
    }
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
      id: parseInt(event.id.replace(/\D/g, '')) || Date.now(), // 숫자만 추출
      accidentCode: event.id,
      cctvId: selectedCCTV?.id || '',
      cctvCode: selectedCCTV?.id || '',
      type: event.type === 'fire' ? '화재' : event.type === 'emergency' ? '응급' : '쓰레기',
      location: event.location,
      time: event.time,
      severity: event.severity || '중',
      status: 'PENDING',
      handler: '미배정',
      detectionBasis: 'AI 자동탐지',
      isAIDetection: true,
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
      // Qwen 응답이 있는 경우 상세 정보 사용
      const qwenResponse = event.qwenResponse;
      const trashType = qwenResponse?.mainCategory || '일반 쓰레기';
      const objectAmount = qwenResponse?.objectAmount || event.summary || '';
      
      // object_amount에서 개수 추출 (예: "총 1개의 쓰레기가 탐지되었습니다" → "1개")
      const countMatch = objectAmount.match(/총\s*(\d+)\s*개/);
      const amount = countMatch ? `${countMatch[1]}개` : '미확인';
      
      return {
        ...baseDetail,
        type: '쓰레기',
        trashType: trashType,
        amount: amount,
        note: objectAmount,
        // Qwen 상세 정보 추가
        detectionConfidenceReason: qwenResponse?.detectionConfidenceReason || '',
        severityLevelReason: qwenResponse?.severityLevelReason || '',
        mainCategory: qwenResponse?.mainCategory || '',
        detectionConfidence: qwenResponse?.detectionConfidence || 0,
        severityLevel: qwenResponse?.severityLevel || 0
      };
    }
  };

  // Handle Qwen frame analysis
  const handleAnalyzeFrameWithQwen = async () => {
    if (!selectedCCTV || selectedCCTV.id !== 'CCTV-003' || !videoRef.current) {
      return;
    }

    setIsAnalyzingQwen(true);
    try {
      const video = videoRef.current;
      
      // 현재 프레임을 canvas로 캡처
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Canvas context를 가져올 수 없습니다.');
      }
      
      ctx.drawImage(video, 0, 0);
      
      // Canvas를 Blob으로 변환
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setIsAnalyzingQwen(false);
          return;
        }
        
        try {
          // FormData로 백엔드에 전송
          const formData = new FormData();
          formData.append('image', blob, 'frame.jpg');
          
          const response = await fetch(
            `${API_BASE_URL}/api/cctv/${selectedCCTV.id}/frame/analyze-with-qwen`,
            {
              method: 'POST',
              body: formData
            }
          );
          
          if (!response.ok) {
            throw new Error(`API 호출 실패: ${response.status}`);
          }
          
          const result = await response.json();
          
          // 백엔드에서 이미 파싱된 데이터를 받음
          if (result.hasTrash) {
            const newEvent: Event = {
              id: `qwen-${Date.now()}`,
              time: result.time || new Date().toLocaleString('ko-KR'),
              type: 'trash',
              confidence: result.confidence || '0%',
              location: result.location || selectedCCTV.location,
              severity: result.severity || '하',
              reportProbability: '높음',
              summary: result.summary || result.objectAmount || `${selectedCCTV.location}에서 쓰레기가 탐지되었습니다.`,
              clipUrl: result.overlayImageUrl || null,
              frameUrls: result.overlayImageUrl ? [result.overlayImageUrl] : [],
              // Qwen 상세 정보 저장 (상세 페이지에서 사용)
              qwenResponse: result
            };
            
            setAnalysisEvents(prev => [...prev, newEvent]);
          } else {
            // 쓰레기가 없는 경우 알림만 표시
            alert('쓰레기가 탐지되지 않았습니다.');
          }
          
        } catch (error) {
          console.error('Qwen 분석 실패:', error);
          alert('Qwen 분석에 실패했습니다: ' + (error instanceof Error ? error.message : String(error)));
        } finally {
          setIsAnalyzingQwen(false);
        }
      }, 'image/jpeg', 0.9);
      
    } catch (error) {
      console.error('프레임 캡처 실패:', error);
      setIsAnalyzingQwen(false);
      alert('프레임 캡처에 실패했습니다: ' + (error instanceof Error ? error.message : String(error)));
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
      
      {/* 모바일 오버레이 */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <div className="flex-1 flex flex-col relative bg-gray-50" style={{ marginLeft: sidebarOpen && !isMobile ? '317.56px' : '0px', transition: 'margin-left 0.3s ease-out' }}>
        {/* 상단바 */}
        <div className="shadow-md px-6 py-4 flex items-center justify-between border-b border-gray-200" style={{ backgroundColor: '#345eaa' }}>
          <div className="flex items-center gap-3">
            <HamburgerMenuButton onClick={() => setSidebarOpen(!sidebarOpen)} />
            <Camera className="w-6 h-6 text-gray-200" />
            <h1 className="text-gray-100">CCTV 관리</h1>
          </div>
        </div>

        <div className={`pt-0 px-8 ${sidebarOpen ? 'pb-1' : 'pb-2'}`}>  {/* 메뉴바 열림 시 하단 여백 더 축소 */}
        <div
          style={{
            // 메뉴바 열렸을 때는 간격 더 축소
            paddingTop: sidebarOpen ? '6px' : '20px',
            paddingLeft: '20px',
            paddingRight: '10px',
            paddingBottom: sidebarOpen ? '2px' : '4px',
          }}
        >
          <div className={`${selectedCCTV ? (sidebarOpen ? 'grid grid-cols-1 lg:grid-cols-2 gap-4' : 'grid grid-cols-2 gap-4') : ''} ${sidebarOpen ? 'mb-2' : 'mb-4'}`}>
            {/* Left: CCTV Display Area */}
            <div className={selectedCCTV ? '' : 'mb-4'}>
              <div className={`flex items-center justify-between ${sidebarOpen ? 'mb-2' : 'mb-3'}`}>
                {/* 실시간 CCTV 텍스트 - 메뉴바 닫힐 때 살짝 커지면서 부드럽게 이동 */}
                <h3
                  className="text-gray-900 font-semibold transition-transform duration-200 ease-out"
                  style={{
                    fontSize: '1.25rem', // 기준 크기 고정
                    transform: sidebarOpen
                      ? 'translate(0, 0) scale(1)'
                      : 'translate(4px, -2px) scale(1.18)',
                    transformOrigin: 'left center',
                  }}
                >
                  실시간 CCTV
                </h3>
                {!selectedCCTV && (
                  <div className={`flex ${sidebarOpen ? 'gap-2' : 'gap-3'}`}>
                    {/* 스크롤 활성화 버튼 */}
                    <button
                      onClick={() => setScrollEnabled(!scrollEnabled)}
                      className={`${sidebarOpen ? 'py-1 text-xs' : 'py-2 text-sm'} bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md transition-all duration-300 ease-out flex items-center justify-center`}
                      style={{
                        width: sidebarOpen ? '41px' : '54px',
                        minWidth: sidebarOpen ? '41px' : '54px',
                        maxWidth: sidebarOpen ? '41px' : '54px',
                        height: sidebarOpen ? '24px' : '30px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        padding: '0',
                        borderRadius: '0px',
                      }}
                    >
                      {scrollEnabled ? '스크롤' : '고정'}
                    </button>
                    
                    {/* 확장 버튼 */}
                    <button
                      onClick={() => setExpandedGrid(!expandedGrid)}
                      className={`${sidebarOpen ? 'px-3 py-1 text-xs' : 'px-4 py-2 text-sm'} bg-gray-800 text-white hover:bg-gray-900 hover:shadow-md transition-all duration-300 ease-out`}
                      style={{ borderRadius: '0px' }}
                    >
                      {expandedGrid ? '축소' : '확장'}
                    </button>
                  </div>
                )}
              </div>
              
              {selectedCCTV ? (
                /* Selected CCTV - Large view */
                <div style={{ height: sidebarOpen ? 'auto' : 'calc(100vh - 150px)' }}>
                  {/* Large CCTV Display */}
                  <div className="bg-white shadow-md" style={{ borderRadius: '0px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <div className="aspect-video group bg-gray-800" style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden',
                      maxHeight: sidebarOpen ? 'none' : '60vh'
                    }}>
                      {/* 비디오 요소 - 더미 비디오 또는 HLS 스트림 */}
                      {(dummyCCTVIds.includes(selectedCCTV.id) || selectedCCTV.id === liveStreamCCTVId) && (
                        <video
                          ref={videoRef}
                          src={dummyCCTVIds.includes(selectedCCTV.id) ? cctvVideoMap[selectedCCTV.id] : undefined}
                          controls
                          muted={selectedCCTV.id !== liveStreamCCTVId}
                          loop={dummyCCTVIds.includes(selectedCCTV.id)}
                          autoPlay
                          className={`w-full h-full object-contain ${isPlayingVideo ? '' : 'hidden'}`}
                          onPlay={() => setIsPlayingVideo(true)}
                        />
                      )}
                      
                      {/* 라이브 스트림 표시 배지 */}
                      {selectedCCTV.id === liveStreamCCTVId && isPlayingVideo && (
                        <div className="absolute top-4 left-4 bg-red-600 px-3 py-1 flex items-center gap-2 z-10" style={{ borderRadius: '4px' }}>
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                          <span className="text-white text-sm font-semibold">LIVE</span>
                        </div>
                      )}
                      
                      {/* Live Feed 화면 (비디오가 재생 중이 아닐 때) */}
                      {(!isPlayingVideo || (!dummyCCTVIds.includes(selectedCCTV.id) && selectedCCTV.id !== liveStreamCCTVId)) && (
                        <>
                          <span className="text-white">{selectedCCTV.id} - Live Feed</span>
                          {/* Power status indicator */}
                          {(() => {
                            const cctvData = backendCCTVs.find(b => b.cctvCode === selectedCCTV.id);
                            let bgColor: string;
                            if (dummyCCTVIds.includes(selectedCCTV.id)) {
                              bgColor = '#ef4444'; // red-500
                            } else {
                              // powerStatus를 안전하게 체크 (대소문자 무시)
                              const powerStatus = cctvData?.powerStatus 
                                ? String(cctvData.powerStatus).toLowerCase().trim() 
                                : 'off';
                              bgColor = powerStatus === 'on' ? '#22c55e' : '#9ca3af'; // green-500 or gray-400
                            }
                            
                            return (
                              <div 
                                className="absolute top-4 left-4 w-4 h-4 rounded-full" 
                                style={{ 
                                  backgroundColor: bgColor,
                                  border: '2px solid white' 
                                }}
                              ></div>
                            );
                          })()}
                          
                          {/* Fullscreen button (오른쪽 아래) */}
                          <button
                            onClick={() => setShowFullscreen(true)}
                            className="absolute bottom-4 right-4 p-2 bg-black bg-opacity-50 text-white hover:bg-opacity-70 hover:scale-110 transition-all duration-300 ease-out opacity-0 group-hover:opacity-100"
                            style={{ borderRadius: '4px' }}
                          >
                            <Maximize className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>
                    <div className={sidebarOpen ? 'p-2' : 'p-4'}>
                      <div className="flex items-center justify-between">
                        <div>
                          {/* 메뉴바 열림 시 작게, 닫힘 시 크게 */}
                          <p
                            className={`${sidebarOpen ? 'text-lg' : 'text-3xl'} text-gray-900`}
                          >
                            {selectedCCTV.id}
                          </p>
                          <p
                            className={`${sidebarOpen ? 'text-sm' : 'text-xl'} text-gray-600`}
                          >
                            {selectedCCTV.location}
                          </p>
                        </div>
                        {/* CCTV-003에 Qwen 분석 버튼 추가 */}
                        {selectedCCTV.id === 'CCTV-003' && dummyCCTVIds.includes(selectedCCTV.id) && (
                          <button
                            onClick={handleAnalyzeFrameWithQwen}
                            disabled={isAnalyzingQwen}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 hover:shadow-lg hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-300 ease-out"
                          >
                            {isAnalyzingQwen ? '분석 중...' : 'Qwen 분석'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Events List - 메뉴바 열렸을 때만 여기 표시 */}
                  {sidebarOpen && (
                    <div style={{ marginTop: '8px' }}>
                      <h3 className="text-gray-900 mb-2 text-sm">이 CCTV의 탐지 이벤트</h3>
                      {events.length > 0 ? (
                        <div className="grid grid-cols-4 gap-4">
                        {events.map((event) => {
                          const EventIcon = event.type === 'fire' ? Flame : event.type === 'emergency' ? AlertCircle : Trash2;
                          const eventColor = event.type === 'fire' ? 'text-red-500' : event.type === 'emergency' ? 'text-purple-500' : 'text-green-500';
                          const eventBg = event.type === 'fire' ? 'bg-red-50' : event.type === 'emergency' ? 'bg-purple-50' : 'bg-green-50';
                          const eventLabel = event.type === 'fire' ? '화재' : event.type === 'emergency' ? '응급' : '쓰레기';
                          const thumbnailUrl = event.frameUrls && event.frameUrls.length > 0 ? event.frameUrls[0] : null;
                          
                          // 메뉴바 열렸을 때: 16:9 이미지 위 + 설명 아래
                          return (
                            <div
                              key={event.id}
                              onClick={() => setSelectedEvent(event)}
                              className="bg-white shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer overflow-hidden group"
                              style={{ borderRadius: '0px' }}
                            >
                              {/* 16:9 비율 이미지 */}
                              <div className={`aspect-video ${!thumbnailUrl ? eventBg : ''} flex items-center justify-center relative overflow-hidden`}>
                                {thumbnailUrl ? (
                                  <img
                                    src={thumbnailUrl}
                                    alt="Event thumbnail"
                                    className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                                  />
                                ) : (
                                  <EventIcon className={`w-8 h-8 ${eventColor} transition-transform duration-300 group-hover:scale-110`} />
                                )}
                                <div className={`absolute top-2 right-2 px-2 py-1 text-xs text-white ${
                                  event.type === 'fire' ? 'bg-red-600' : event.type === 'emergency' ? 'bg-purple-600' : 'bg-green-600'
                                }`}>
                                  {eventLabel}
                                </div>
                              </div>
                              {/* 아래 설명 */}
                              <div className="p-3 bg-white transition-colors duration-300 group-hover:bg-gray-50">
                                <p className="text-sm font-semibold text-gray-900 mb-1 transition-colors duration-300 group-hover:text-blue-600">{event.id}</p>
                                <p className="text-xs text-gray-600 mb-0.5 transition-colors duration-300">{`발생시간: ${event.time}`}</p>
                                <p className="text-xs text-gray-600 transition-colors duration-300">{`신뢰도: ${event.confidence}`}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="bg-gray-50 border-2 border-dashed border-gray-300 p-6 text-center">
                        <Camera className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">탐지된 이벤트가 없습니다</p>
                      </div>
                    )}
                    </div>
                  )}
                </div>
              ) : (
                /* Grid view - all CCTVs */
                <div 
                  // 메뉴바 열렸을 때: 지금 상태 그대로 유지
                  // 메뉴바 닫혔을 때: 같은 기본 간격을 쓰되, 카드 크기만 살짝 줄여서 여백 확보
                  className={`grid grid-cols-4 ${sidebarOpen ? 'gap-2 pr-2' : 'gap-2 pr-2'}`} 
                  style={{ 
                    maxHeight: expandedGrid ? '620px' : '585px',
                    overflowY: scrollEnabled ? 'auto' : 'hidden'
                  }}
                >
                  {cctvThumbnails.map((cctv) => {
                    // 이벤트 타입별 아이콘
                    const EventIcon = cctv.latestEvent?.type === 'fire' ? Flame : 
                                     cctv.latestEvent?.type === 'emergency' ? HeartPulse : 
                                     cctv.latestEvent?.type === 'trash' ? Trash2 : null;
                    
                    // 이벤트 타입별 라벨/색 (전체현황 스타일 참고)
                    const eventLabel =
                      cctv.latestEvent?.type === 'fire' ? '화재' :
                      cctv.latestEvent?.type === 'emergency' ? '응급' :
                      cctv.latestEvent?.type === 'trash' ? '쓰레기' : '';

                    const eventBgClass =
                      cctv.latestEvent?.type === 'fire' ? 'bg-red-50' :
                      cctv.latestEvent?.type === 'emergency' ? 'bg-orange-50' :
                      cctv.latestEvent?.type === 'trash' ? 'bg-green-50' : 'bg-black/40';

                    const eventTextClass =
                      cctv.latestEvent?.type === 'fire' ? 'text-red-600' :
                      cctv.latestEvent?.type === 'emergency' ? 'text-orange-600' :
                      cctv.latestEvent?.type === 'trash' ? 'text-green-600' : 'text-white';

                    // 탐지시간 포맷팅
                    const formatDetectionTime = (time?: string | null) => {
                      if (!time) return '-';
                      try {
                        const d = new Date(time);
                        return d.toLocaleString('ko-KR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                        }).replace(/\./g, '.').replace(/,/g, '');
                      } catch {
                        return time;
                      }
                    };

                    return (
                      <div
                        key={cctv.id}
                        onClick={() => handleCCTVClick(cctv.id)}
                        className={`bg-white shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer overflow-hidden ${
                          cctv.detecting ? 'ring-4 ring-red-600' : ''
                        } ${!sidebarOpen ? 'mt-1 mb-1 mx-2' : ''}`}
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
                              className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
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
                            /* 이벤트 발생 시 썸네일 표시 */
                            <div className="w-full h-full relative flex items-center justify-center">
                              <span className="text-white text-sm">{cctv.id}</span>
                            </div>
                          ) : (
                            /* 정상 CCTV 화면 */
                            <span className="text-white text-sm">{cctv.id}</span>
                          )}
                          {/* Power status indicator */}
                          {(() => {
                            const isVideo = dummyCCTVIds.includes(cctv.id);
                            let bgColor: string;
                            if (isVideo) {
                              bgColor = '#ef4444'; // red-500
                            } else {
                              // powerStatus를 안전하게 체크 (대소문자 무시)
                              const powerStatus = String(cctv.power || 'off').toLowerCase().trim();
                              bgColor = powerStatus === 'on' ? '#4ade80' : '#9ca3af'; // green-400 or gray-400
                            }
                            
                            return (
                              <div 
                                className="absolute top-2 right-2 w-3 h-3 rounded-full z-10" 
                                style={{ 
                                  backgroundColor: bgColor,
                                  border: '1px solid white' 
                                }}
                              ></div>
                            );
                          })()}
                          
                          {/* 영상 안 좌하단 "작은 배지" (아이콘/텍스트만 살짝 키우기 - 레이아웃은 그대로) */}
                          {cctv.hasIncident && cctv.latestEvent && cctv.latestEvent.type !== 'unknown' && (
                            <div className="absolute left-0 bottom-0 flex flex-col items-start gap-0.5 z-20">
                              {/* 이벤트 유형 아이콘 배지 */}
                              <div 
                                className={`rounded-sm ${eventBgClass}`} 
                                style={{ 
                                  display: 'flex', 
                                  flexDirection: 'row', 
                                  alignItems: 'center', 
                                  justifyContent: 'flex-start',
                                  gap: sidebarOpen ? '3px' : '4px',
                                  padding: sidebarOpen ? '3px 5px' : '4px 7px',
                                  whiteSpace: 'nowrap' 
                                }}
                              >
                                {EventIcon && (
                                  <EventIcon 
                                    className={eventTextClass}
                                    style={{ 
                                      width: sidebarOpen ? '10px' : '13px',
                                      height: sidebarOpen ? '10px' : '13px',
                                      minWidth: sidebarOpen ? '10px' : '13px',
                                      minHeight: sidebarOpen ? '10px' : '13px',
                                      flexShrink: 0
                                    }}
                                    strokeWidth={sidebarOpen ? 1.5 : 2}
                                  />
                                )}
                                <span 
                                  className={`font-medium ${eventTextClass}`}
                                  style={{ fontSize: sidebarOpen ? '9px' : '12px', lineHeight: '1', whiteSpace: 'nowrap' }}
                                >
                                  {eventLabel}
                                </span>
                              </div>
                              {/* 빨간색 탐지시간 바 */}
                              <div 
                                className="inline-flex items-center rounded-sm bg-red-500 font-normal text-white"
                                style={{ 
                                  padding: sidebarOpen ? '3px 5px' : '4px 7px',
                                  fontSize: sidebarOpen ? '9px' : '12px',
                                  lineHeight: '1',
                                  whiteSpace: 'nowrap' 
                                }}
                              >
                                탐지시간 : {formatDetectionTime(cctv.latestEvent.time)}
                              </div>
                            </div>
                          )}
                        </div>
                        {/* 하단 설명바 - 메뉴바 상태에 따라 내용만 다르게, 전체 카드 높이는 크게 안 건드림 */}
                        {sidebarOpen ? (
                          // 기존 레이아웃 (메뉴바 펼침)
                          <div className="px-3 py-1 transition-colors duration-300 group-hover:bg-gray-50">
                            <div className="flex items-center gap-2">
                              <p className="text-base text-gray-900 font-medium transition-colors duration-300 group-hover:text-blue-600">{cctv.id}</p>
                              {(() => {
                                const cctvData = backendCCTVs.find(b => b.cctvCode === cctv.id);
                                return cctvData?.locationDesc ? (
                                  <p className="text-base text-gray-900 font-medium">
                                    {cctvData.locationDesc}
                                  </p>
                                ) : null;
                              })()}
                            </div>
                          </div>
                        ) : (
                          // 메뉴바 닫힘: 내용만 조금 더 보여주기 (주소 + 헬스 상태/시간)
                          <div className="px-3 py-2 transition-colors duration-300 group-hover:bg-gray-50">
                            <div className="flex items-start justify-between">
                              {/* 왼쪽: CCTV ID + 위치명 + 주소 한 줄 */}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {/* 썸네일 설명바 ID/위치 폰트 크기를 명시적으로 키움 */}
                                  <p
                                    className="font-semibold text-gray-900"
                                    style={{ fontSize: '1.4rem' }} // 약 22~23px
                                  >
                                    {cctv.id}
                                  </p>
                                  {(() => {
                                    const d = backendCCTVs.find(b => b.cctvCode === cctv.id);
                                    return d?.locationDesc && (
                                      <p
                                        className="font-semibold text-gray-900"
                                        style={{ fontSize: '1.4rem' }}
                                      >
                                        {d.locationDesc}
                                      </p>
                                    );
                                  })()}
                                </div>
                                {(() => {
                                  // 아래 한 줄은 cctv_info.cctv_address (VIEW의 cctv_address) 사용
                                  const d = backendCCTVs.find(b => b.cctvCode === cctv.id);
                                  const address = d?.cctvAddress;
                                  return address && (
                                    <p
                                      className="text-gray-600"
                                      style={{ fontSize: '1rem' }} // 16px 정도
                                    >
                                      {address}
                                    </p>
                                  );
                                })()}
                              </div>
                              {/* 오른쪽: 헬스 상태 + 최근 헬스체크시간 (둘 다 작은 글씨) */}
                              <div className="flex flex-col items-end gap-1 ml-3">
                                {(() => {
                                  const d = backendCCTVs.find(b => b.cctvCode === cctv.id);
                                  const raw = d?.healthStatus || 'NORMAL';
                                  const text =
                                    raw === 'NORMAL' ? '정상' :
                                    raw === 'NEED_CHECK' ? '점검필요' :
                                    '오프라인';
                                  return (
                                    <p className="text-sm text-gray-700">
                                      {text}
                                    </p>
                                  );
                                })()}
                                {(() => {
                                  const d = backendCCTVs.find(b => b.cctvCode === cctv.id);
                                  const hb = d?.lastHeartbeat;
                                  if (!hb) return null;
                                  try {
                                    const formatted = new Date(hb).toLocaleString('ko-KR', {
                                      year: 'numeric',
                                      month: '2-digit',
                                      day: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      hour12: false,
                                    }).replace(/\./g, '.').replace(/,/g, '');
                                    return (
                                      <p className="text-sm text-gray-600">
                                        {formatted}
                                      </p>
                                    );
                                  } catch {
                                    return (
                                      <p className="text-sm text-gray-600">
                                        {hb}
                                      </p>
                                    );
                                  }
                                })()}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column: Detail Panel + Events (when CCTV is selected) */}
            {selectedCCTV && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: sidebarOpen ? '0' : '16px', height: sidebarOpen ? 'auto' : 'calc(100vh - 150px)', overflow: sidebarOpen ? 'visible' : 'hidden' }}>
                {/* Detail Panel */}
                <div className="bg-white shadow-md p-6 relative flex flex-col" style={{ borderRadius: '0px', flex: '0 0 auto' }}>
                <button
                  onClick={() => setSelectedCCTV(null)}
                  className="absolute top-4 right-4 text-gray-600 hover:text-gray-900 hover:scale-110 transition-all duration-200 ease-out"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="mb-4 text-gray-900">CCTV 상세정보</h3>
                {/* 상세정보 내용 */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div>
                    <p className="text-xs text-gray-600">CCTV ID</p>
                    <p className="text-sm text-gray-900 font-medium">{selectedCCTV.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">상세 위치명</p>
                    <p className="text-sm text-gray-900">{selectedCCTV.location}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">구역명</p>
                    <p className="text-sm text-gray-900">
                      {(() => {
                        const cctvData = backendCCTVs.find(b => b.cctvCode === selectedCCTV.id);
                        return cctvData?.zoneName || cctvData?.locationDesc || '-';
                      })()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">설치일</p>
                    <p className="text-sm text-gray-900">{selectedCCTV.installDate}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">모델명</p>
                    <p className="text-sm text-gray-900">{selectedCCTV.model}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">전원 상태</p>
                    <p className={`text-sm inline-flex items-center gap-1 ${
                      selectedCCTV.powerStatus === 'on' ? 'text-green-700' : 'text-gray-700'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        selectedCCTV.powerStatus === 'on' ? 'bg-green-500' : 'bg-gray-400'
                      }`}></span>
                      {selectedCCTV.powerStatus === 'on' ? '정상' : '꺼짐'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">헬스체크 상태</p>
                    <p className="text-sm text-gray-900">
                      {(() => {
                        const cctvData = backendCCTVs.find(b => b.cctvCode === selectedCCTV.id);
                        const raw = cctvData?.healthStatus || 'NORMAL';
                        return raw === 'NORMAL' ? '정상' :
                               raw === 'NEED_CHECK' ? '점검필요' :
                               '오프라인';
                      })()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">마지막 헬스체크시간</p>
                    <p className="text-sm text-gray-900">
                      {(() => {
                        const cctvData = backendCCTVs.find(b => b.cctvCode === selectedCCTV.id);
                        const hb = cctvData?.lastHeartbeat;
                        if (!hb) return '-';
                        try {
                          return new Date(hb).toLocaleString('ko-KR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                          }).replace(/\./g, '.').replace(/,/g, '');
                        } catch {
                          return String(hb);
                        }
                      })()}
                    </p>
                  </div>
                </div>
                </div>

                {/* Events List - 메뉴바 닫혔을 때만 여기 표시 */}
                {!sidebarOpen && (
                  <div style={{ flex: '1 1 auto', overflow: 'hidden', minHeight: 0 }}>
                    <div className="bg-white shadow-md p-4" style={{ borderRadius: '0px' }}>
                      <h3 className="text-gray-900 mb-3 text-base">이 CCTV의 탐지 이벤트</h3>
                      {events.length > 0 ? (
                        <>
                          <div className="space-y-2">
                            {events.slice(0, 3).map((event) => {
                              const EventIcon = event.type === 'fire' ? Flame : event.type === 'emergency' ? AlertCircle : Trash2;
                              const eventColor = event.type === 'fire' ? 'text-red-500' : event.type === 'emergency' ? 'text-purple-500' : 'text-green-500';
                              const eventBg = event.type === 'fire' ? 'bg-red-50' : event.type === 'emergency' ? 'bg-purple-50' : 'bg-green-50';
                              const eventLabel = event.type === 'fire' ? '화재' : event.type === 'emergency' ? '응급' : '쓰레기';
                              const thumbnailUrl = event.frameUrls && event.frameUrls.length > 0 ? event.frameUrls[0] : null;
                              
                              // 메뉴바 닫혔을 때: 왼쪽 16:9 이미지 + 오른쪽 설명
                              return (
                                <div
                                  key={event.id}
                                  onClick={() => setSelectedEvent(event)}
                                  className="bg-white shadow-sm hover:shadow-lg hover:border-blue-200 transition-all duration-300 ease-out cursor-pointer overflow-hidden flex group"
                                  style={{ borderRadius: '0px', border: '1px solid #e5e7eb' }}
                                >
                                  {/* 왼쪽: 16:9 비율 이미지 */}
                                  <div className={`flex-shrink-0 ${!thumbnailUrl ? eventBg : ''} flex items-center justify-center relative overflow-hidden`} style={{ width: '120px', aspectRatio: '16/9' }}>
                                    {thumbnailUrl ? (
                                      <img
                                        src={thumbnailUrl}
                                        alt="Event thumbnail"
                                        className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                                      />
                                    ) : (
                                      <EventIcon className={`w-6 h-6 ${eventColor} transition-transform duration-300 group-hover:scale-110`} />
                                    )}
                                    <div className={`absolute top-1 right-1 px-1.5 py-0.5 text-xs text-white ${
                                      event.type === 'fire' ? 'bg-red-600' : event.type === 'emergency' ? 'bg-purple-600' : 'bg-green-600'
                                    }`}>
                                      {eventLabel}
                                    </div>
                                  </div>
                                  {/* 오른쪽: 설명 */}
                                  <div className="flex-1 p-2 bg-white transition-colors duration-300 group-hover:bg-blue-50">
                                    <p className="text-sm font-semibold text-gray-900 mb-1 transition-colors duration-300 group-hover:text-blue-600">{event.id}</p>
                                    <p className="text-xs text-gray-600 mb-0.5 transition-colors duration-300">{`발생시간: ${event.time}`}</p>
                                    <p className="text-xs text-gray-600 transition-colors duration-300">{`신뢰도: ${event.confidence}`}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {/* 목록 더보기 버튼 (3개 초과 시) */}
                          {events.length > 3 && (
                            <button
                              onClick={() => setShowEvents(true)}
                              className="w-full mt-3 py-2 bg-gray-100 hover:bg-blue-500 text-gray-700 hover:text-white text-sm transition-all duration-300 ease-out hover:shadow-md"
                              style={{ borderRadius: '0px' }}
                            >
                              목록 더보기 ({events.length - 3}개 더 있음)
                            </button>
                          )}
                        </>
                      ) : (
                        <div className="bg-gray-50 border-2 border-dashed border-gray-300 p-4 text-center">
                          <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-xs text-gray-500">탐지된 이벤트가 없습니다</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CCTV 현황 Table - Hide when CCTV is expanded */}
          {!selectedCCTV && (
            <div className="bg-white shadow-md mb-0" style={{ borderRadius: '0px' }}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-900">CCTV 현황</h3>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-2">
                      {/* 하단 CCTV 현황 스크롤 활성화 버튼 */}
                      <button
                        onClick={() => setStatusScrollEnabled(!statusScrollEnabled)}
                        className="py-1 text-xs bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md transition-all duration-300 ease-out flex items-center justify-center"
                        style={{
                          width: '41px',
                          minWidth: '41px',
                          maxWidth: '41px',
                          height: '24px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          padding: '0',
                          borderRadius: '0px'
                        }}
                      >
                        {statusScrollEnabled ? '스크롤' : '고정'}
                      </button>

                      {/* 하단 CCTV 현황 확장 버튼 */}
                      <button
                        onClick={() => setExpandedStatusTable(!expandedStatusTable)}
                        className="px-3 py-1 text-xs bg-gray-800 text-white hover:bg-gray-900 hover:shadow-md transition-all duration-300 ease-out"
                        style={{ borderRadius: '0px' }}
                      >
                        {expandedStatusTable ? '축소' : '확장'}
                      </button>
                    </div>
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
                
                <div 
                  className="overflow-x-auto"
                  style={{
                    height: expandedStatusTable ? '800px' : '600px',
                    overflowY: statusScrollEnabled ? 'auto' : 'hidden'
                  }}
                >
                  <table className="w-full" style={{ tableLayout: 'fixed' }}>
                    <thead className="bg-gray-50 sticky top-0">
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-gray-600" style={{ width: '13%' }}>
                          <button 
                            onClick={() => handleSort('id')}
                            className="flex items-center gap-1 hover:text-gray-900 transition-colors duration-300 ease-out"
                          >
                            CCTV ID
                            <ArrowUpDown className="w-3 h-3" />
                          </button>
                        </th>
                        <th className="text-left py-3 px-4 text-gray-600" style={{ width: '20%' }}>
                          <div className="relative">
                            <button 
                              onClick={() => {
                                setShowLocationFilter(!showLocationFilter);
                                setShowStatusFilter(false);
                                setShowPowerFilter(false);
                              }}
                              className="flex items-center gap-1 hover:text-gray-900 transition-colors duration-300 ease-out"
                            >
                              위치
                              <ChevronDown className="w-3 h-3" />
                            </button>
                            
                            {showLocationFilter && (
                              <div className="absolute top-full left-0 mt-2 bg-white shadow-xl border border-gray-200 z-20 min-w-[150px] max-h-[160px] overflow-y-auto" style={{ borderRadius: '0px' }}>
                                {uniqueLocations.map(location => (
                                  <label 
                                    key={location}
                                    className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm transition-colors duration-200 ease-out"
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
                        <th className="text-left py-3 px-4 text-gray-600" style={{ width: '15%' }}>
                          <div className="relative">
                            <button 
                              onClick={() => {
                                setShowPowerFilter(!showPowerFilter);
                                setShowLocationFilter(false);
                                setShowStatusFilter(false);
                              }}
                              className="flex items-center gap-1 hover:text-gray-900 transition-colors duration-300 ease-out"
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
                        <th className="text-left py-3 px-4 text-gray-600" style={{ width: '15%' }}>
                          헬스체크상태
                        </th>
                        <th className="text-left py-3 px-4 text-gray-600" style={{ width: '18%' }}>
                          최근 헬스체크시간
                        </th>
                        <th className="text-left py-3 px-4 text-gray-600" style={{ width: '18%' }}>
                          <div className="relative inline-block">
                            <span>최근 감지시간</span>
                            <button
                              onClick={() => setSortByRecent(!sortByRecent)}
                              className={`absolute text-xs transition-all whitespace-nowrap hover:opacity-80 ${
                                sortByRecent 
                                  ? 'text-blue-600 font-bold' 
                                  : 'text-gray-400'
                              }`}
                              style={{
                                left: 'calc(100% + 8px)',
                                top: '6px'
                              }}
                            >
                              최신순
                            </button>
                          </div>
                        </th>
                        <th className="text-left py-3 px-4 text-gray-600" style={{ width: '13%' }}>탐지 이벤트</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedCCTVData.length > 0 ? (
                        filteredAndSortedCCTVData.map((cctv) => (
                          <tr 
                            key={cctv.id} 
                            className="border-b border-gray-100 hover:bg-blue-50 hover:shadow-sm cursor-pointer transition-all duration-200 ease-out"
                            onClick={() => handleCCTVClick(cctv.id)}
                          >
                            <td className="py-3 px-4 text-gray-900">{cctv.id}</td>
                            <td className="py-3 px-4 text-gray-900">{cctv.location}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 text-xs ${cctv.power === 'on' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {cctv.power}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 text-xs ${
                                cctv.healthStatus === '정상' ? 'bg-blue-100 text-blue-700' :
                                cctv.healthStatus === '점검필요' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {cctv.healthStatus}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-900">{cctv.lastHeartbeat}</td>
                            <td className="py-3 px-4 text-gray-900">{cctv.lastDetection}</td>
                            <td className="py-3 px-4 text-gray-900">{cctv.detectedIncident}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-gray-500">
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

      {/* 전체 이벤트 목록 모달 */}
      {showEvents && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl max-h-[80vh] flex flex-col" style={{ borderRadius: '0px' }}>
            {/* 헤더 */}
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-900">
                {selectedCCTV?.id} - 전체 탐지 이벤트
              </h2>
              <button
                onClick={() => setShowEvents(false)}
                className="text-gray-600 hover:text-gray-900 hover:scale-110 transition-all duration-200 ease-out"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* 이벤트 리스트 */}
            <div className="flex-1 overflow-y-auto p-6">
              {events.length > 0 ? (
                <div className="space-y-3">
                  {events.map((event) => {
                    const eventLabel = event.type === 'fire' ? '화재' : event.type === 'emergency' ? '응급' : '쓰레기';
                    const eventColor = event.type === 'fire' ? 'text-red-600' : event.type === 'emergency' ? 'text-purple-600' : 'text-green-600';
                    
                    return (
                      <div
                        key={event.id}
                        onClick={() => {
                          setSelectedEvent(event);
                          setShowEvents(false);
                        }}
                        className="bg-white border border-gray-200 hover:border-blue-300 hover:shadow-md p-4 cursor-pointer transition-all duration-300 ease-out"
                        style={{ borderRadius: '0px' }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <span className={`px-3 py-1 text-sm font-medium ${eventColor} bg-opacity-10 ${
                              event.type === 'fire' ? 'bg-red-100' : event.type === 'emergency' ? 'bg-purple-100' : 'bg-green-100'
                            }`}>
                              {eventLabel}
                            </span>
                            <div>
                              <p className="text-base font-semibold text-gray-900">{event.id}</p>
                              <p className="text-sm text-gray-600 mt-1">발생시간: {event.time}</p>
                            </div>
                          </div>
                          {event.confidence && (
                            <p className="text-sm text-gray-500">신뢰도: {event.confidence}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">탐지된 이벤트가 없습니다</p>
                </div>
              )}
            </div>
          </div>
        </div>
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
                className="px-4 py-2 bg-gray-800 text-white hover:bg-gray-900 hover:shadow-lg hover:scale-105 transition-all duration-300 ease-out"
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
              className="p-3 bg-white bg-opacity-20 text-white hover:bg-opacity-40 hover:scale-110 transition-all duration-300 ease-out rounded"
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