import React, { useEffect, useState } from 'react';
import { X, Video, Camera, Edit2, Save, MapPin, Clock, User, Cpu, ClipboardList, Info, HeartPulse } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline, Polygon, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { getCCTVList, markIncidentAsFalsePositive } from '../services/api';
import { cctvList, getCCTVByCode, getCCTVById } from '../services/common';

// 백엔드 IncidentDetailDto와 일치하는 인터페이스
interface IncidentDetail {
  // 기본 정보
  id: number;
  accidentCode: string;
  type: string;  // '화재', '응급', '쓰레기'
  cctvId: string;
  cctvCode: string;
  location: string;
  locationDesc?: string;
  time: string;
  status: string;
  severity: string;
  handler: string;
  handlerDept?: string;
  detectionBasis: string;
  note?: string;
  responseTime?: string;
  duration?: string;
  
  // CCTV 정보
  cctvAddress?: string;
  cctvAddressDescription?: string;
  latitude?: number;  // CCTV 위도
  longitude?: number;  // CCTV 경도
  
  // AUTO 정보
  isAIDetection: boolean;
  modelName?: string;
  modelVersion?: string;
  confidence?: string;  // "88%"
  confidenceReason?: string;
  severityReason?: string;
  detectedFeatures?: string;
  autoCreatedAt?: string;
  
  // 비디오 분석 정보
  clipUrl?: string;
  frameUrls?: string[];

  // MANUAL 정보 (incident_manual)
  manualLocation?: string;
  manualDescription?: string;
  manualCreatedById?: number;
  
  // 응급 상세
  patientName?: string;
  patientAge?: string;
  patientGender?: string;
  emergencyType?: string;
  emergencySymptom?: string;
  rescueTeam?: string;
  transferHospital?: string;
  
  // 화재 상세
  windSpeed?: string;
  windInfo?: string;
  spreadDirection?: string;
  surroundingRisk?: string;
  
  // 쓰레기 상세
  trashType?: string;
  amount?: string;
  trashNote?: string;
  
  // 낙석 상세 (DDL 기반)
  rockSizeClass?: string;       // 암괴 규모
  affectedAssetType?: string;   // 피해 대상 유형
  affectedAssetName?: string;   // 피해 대상 식별
  damageDescription?: string;   // 피해 설명
}

interface IncidentDetailModalProps {
  type: 'emergency' | 'fire' | 'trash' | 'rockfall';
  detail: IncidentDetail;
  isEditing: boolean;
  editedDetail: IncidentDetail | null;
  onClose: () => void;
  onEditClick: () => void;
  onSave: () => void;
  onCancel: () => void;
  onFieldChange: (field: string, value: string) => void;
  onFalsePositiveComplete?: () => void; // 오탐 처리 완료 후 콜백
}

export default function IncidentDetailModal({
  type,
  detail,
  isEditing,
  editedDetail,
  onClose,
  onEditClick,
  onSave,
  onCancel,
  onFieldChange,
  onFalsePositiveComplete
}: IncidentDetailModalProps) {
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showFalseReportModal, setShowFalseReportModal] = useState(false);
  const [falseReportReason, setFalseReportReason] = useState('');
  const [expandedText, setExpandedText] = useState<Record<string, boolean>>({});
  const [resolvedCctvCoords, setResolvedCctvCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const incidentHeaderBg = 'var(--ecoguard-header-bg)';

  const headerColors = {
    emergency: incidentHeaderBg,
    fire: incidentHeaderBg,
    trash: incidentHeaderBg,
    rockfall: incidentHeaderBg
  };

  const headerTitles = {
    emergency: '응급 상세정보',
    fire: '화재 상세정보',
    trash: '쓰레기 상세정보',
    rockfall: '낙석 상세정보'
  };

  const markerColors = {
    emergency: '#9333EA',
    fire: '#FF5A5A',
    trash: '#576F93',
    rockfall: '#576F93' // 쓰레기와 동일한 파란색으로 통일
  };

  // AI 자동 탐지인지 확인 (백엔드에서 제공)
  const isAIDetection = detail.isAIDetection || false;
  const isManualIncident = !isAIDetection;

  // AI 탐지 + CCTV 사건이면 CCTV 실좌표를 기준으로 지도 위치를 맞춤
  useEffect(() => {
    let isCancelled = false;

    const resolveCoords = async () => {
      // 수동등록/좌표 불필요 케이스는 스킵
      if (!isAIDetection) {
        setResolvedCctvCoords(null);
        return;
      }
      if (!detail.cctvId || detail.cctvId === '수동등록') {
        setResolvedCctvCoords(null);
        return;
      }

      // cctvList가 비어있으면 백엔드에서 가져와 캐시 갱신
      if (!cctvList || cctvList.length === 0) {
        try {
          await getCCTVList();
        } catch {
          // ignore
        }
      }

      const codeCandidate = detail.cctvCode || detail.cctvId;
      const cctvByCode = typeof codeCandidate === 'string' ? getCCTVByCode(codeCandidate) : undefined;

      let cctvById;
      if (!cctvByCode && typeof detail.cctvId === 'string') {
        const asNumber = Number(detail.cctvId);
        if (!Number.isNaN(asNumber)) {
          cctvById = getCCTVById(asNumber);
        }
      }

      const cctv = cctvByCode || cctvById;
      if (cctv && typeof cctv.latitude === 'number' && typeof cctv.longitude === 'number') {
        if (!isCancelled) {
          setResolvedCctvCoords({ latitude: cctv.latitude, longitude: cctv.longitude });
        }
      } else if (!isCancelled) {
        setResolvedCctvCoords(null);
      }
    };

    resolveCoords();
    return () => {
      isCancelled = true;
    };
  }, [detail.cctvId, detail.cctvCode, isAIDetection]);

  const hasDetailCoords = typeof detail.latitude === 'number' && typeof detail.longitude === 'number';
  const hasResolvedCoords = typeof resolvedCctvCoords?.latitude === 'number' && typeof resolvedCctvCoords?.longitude === 'number';
  const mapLatitude = hasResolvedCoords ? resolvedCctvCoords!.latitude : (hasDetailCoords ? detail.latitude! : 35.2456);
  const mapLongitude = hasResolvedCoords ? resolvedCctvCoords!.longitude : (hasDetailCoords ? detail.longitude! : 129.0917);

  // 확산 방향 문자열 -> 각도(deg). (0=북, 90=동, 180=남, 270=서)
  const directionToDeg = (dir?: string): number | null => {
    if (!dir) return null;
    const d = dir.trim().toUpperCase();

    // 한글
    if (d.includes('북동') || d.includes('동북')) return 45;
    if (d.includes('동남') || d.includes('남동')) return 135;
    if (d.includes('남서') || d.includes('서남')) return 225;
    if (d.includes('서북') || d.includes('북서')) return 315;
    if (d === '북' || d.includes('북쪽')) return 0;
    if (d === '동' || d.includes('동쪽')) return 90;
    if (d === '남' || d.includes('남쪽')) return 180;
    if (d === '서' || d.includes('서쪽')) return 270;

    // 영문(NE/E/SE/S/SW/W/NW/N)
    if (d === 'N' || d === 'NORTH') return 0;
    if (d === 'NE' || d === 'NORTHEAST') return 45;
    if (d === 'E' || d === 'EAST') return 90;
    if (d === 'SE' || d === 'SOUTHEAST') return 135;
    if (d === 'S' || d === 'SOUTH') return 180;
    if (d === 'SW' || d === 'SOUTHWEST') return 225;
    if (d === 'W' || d === 'WEST') return 270;
    if (d === 'NW' || d === 'NORTHWEST') return 315;

    return null;
  };

  // (lat,lng)에서 deg 방향으로 meters 만큼 이동한 좌표(대충용, 소거리 OK)
  const moveLatLng = (lat: number, lng: number, deg: number, meters: number): [number, number] => {
    const rad = (deg * Math.PI) / 180;
    const dLat = (meters * Math.cos(rad)) / 111320; // 1도 위도 ≈ 111.32km
    const dLng = (meters * Math.sin(rad)) / (111320 * Math.cos((lat * Math.PI) / 180));
    return [lat + dLat, lng + dLng];
  };

  // 화살촉(삼각형) 좌표 생성
  const makeArrowHead = (
    tip: [number, number],
    deg: number,
    lengthM = 22,     // 화살촉 길이
    widthDeg = 22     // 벌어지는 각도(클수록 넓은 화살촉)
  ): [number, number][] => {
    const [lat, lng] = tip;
    const back = moveLatLng(lat, lng, deg + 180, lengthM);
    const left = moveLatLng(back[0], back[1], deg - 90, lengthM * 0.45);
    const right = moveLatLng(back[0], back[1], deg + 90, lengthM * 0.45);
    return [tip, left, right];
  };

  // 확산 “부채꼴” 좌표 생성 (대충의 확산 영역)
  const makeFan = (
    center: [number, number],
    deg: number,
    radiusM = 120,   // 부채꼴 반경
    spreadDeg = 35,  // 좌/우 퍼짐 각도(총 폭 70도)
    steps = 12
  ): [number, number][] => {
    const [lat, lng] = center;
    const points: [number, number][] = [[lat, lng]];
    for (let i = 0; i <= steps; i++) {
      const a = deg - spreadDeg + (i * (spreadDeg * 2)) / steps;
      points.push(moveLatLng(lat, lng, a, radiusM));
    }
    return points;
  };

  // fire + spreadDirection 있을 때만 라인 생성
  const hasSpreadDirection = type === 'fire' && Boolean(detail.spreadDirection);
  const spreadDeg = hasSpreadDirection ? directionToDeg(detail.spreadDirection) : null;
  const spreadLine =
    spreadDeg !== null && (hasDetailCoords || hasResolvedCoords)
      ? ([
          [mapLatitude, mapLongitude],
          moveLatLng(mapLatitude, mapLongitude, spreadDeg, 90), // 메인 선 길이(대충 90m)
        ] as [number, number][])
      : null;

  // 확산 방향 화살촉/부채꼴(각도 매핑 성공 시 표시)
  const spreadArrowHead = spreadLine && spreadDeg !== null ? makeArrowHead(spreadLine[1], spreadDeg) : null;
  const spreadFan = spreadDeg !== null && (hasDetailCoords || hasResolvedCoords) ? makeFan([mapLatitude, mapLongitude], spreadDeg) : null;

  // 오탐처리 핸들러
  const handleFalsePositive = async () => {
    if (!falseReportReason.trim()) {
      alert('오탐 사유를 입력해주세요.');
      return;
    }

    try {
      await markIncidentAsFalsePositive(detail.id, falseReportReason);
      alert('오탐 처리되었습니다.');
      setShowFalseReportModal(false);
      setFalseReportReason('');
      if (onFalsePositiveComplete) {
        onFalsePositiveComplete();
      }
      onClose();
    } catch (error) {
      console.error('오탐 처리 실패:', error);
      alert('오탐 처리에 실패했습니다.');
    }
  };

  // 낙석 + 수동등록이면 1번 캡쳐 스타일 (지도 없이 이미지/영상 박스만)
  const isManualRockfall = type === 'rockfall' && (
    !(hasDetailCoords || hasResolvedCoords) ||
    detail.cctvId === '수동등록' || 
    detail.detectionBasis?.includes('수동') ||
    isManualIncident
  );

  // AI 모델 표기용 (모델명/버전 묶기)
  // ✅ 요구사항: 모델 표기
  // - 응급: yolov8m(탐지) + gemini-2.5-flash(판정)
  // - 그 외 AI: gemini-2.5-flash
  const modelText = isAIDetection
    ? (type === 'emergency' ? 'yolov8m + gemini-2.5-flash' : 'gemini-2.5-flash')
    : [detail.modelName, detail.modelVersion]
    .filter((v): v is string => Boolean(v))
    .join(' / ');

  // ✅ 요구사항: 심각도 산정 근거에 risk_level/spread_risk 같은 키가 UI에 노출되지 않도록 정제
  // - 우선 '매우낮음/낮음/보통/높음/매우높음' 같은 값이 있으면 그것만 추출
  // - 없으면 risk_level/spread_risk 관련 조각을 제거한 텍스트를 사용
  const sanitizeSeverityReason = (v?: string): string => {
    const raw = (v ?? '').trim();
    if (!raw) return '';

    const allowed = ['매우높음', '높음', '보통', '낮음', '매우낮음'] as const;
    for (const token of allowed) {
      if (raw.includes(token)) return token;
    }

    let s = raw;
    // key=value 형태 제거
    s = s.replace(/risk_level\s*=\s*[^,\n]+/gi, '').replace(/spread_risk\s*=\s*[^,\n]+/gi, '');
    // JSON 키 형태 제거 (대충)
    s = s.replace(/"risk_level"\s*:\s*"[^"]*"\s*,?/gi, '')
         .replace(/"spread_risk"\s*:\s*"[^"]*"\s*,?/gi, '');
    // 구분자/공백 정리
    s = s.replace(/\s*,\s*,/g, ',').replace(/^\s*,\s*/g, '').replace(/\s*,\s*$/g, '').trim();

    return s || raw;
  };

  // 섹션 제목(가로 2칸) + 기본 구분선
  const SectionTitle: React.FC<{ children: React.ReactNode; first?: boolean }> = ({
    children,
    first = false,
  }) => (
    <div className={`col-span-2 ${first ? '' : 'mt-1 pt-2 border-t border-gray-200'}`}>
      <h4 className="text-sm font-semibold text-gray-900">{children}</h4>
    </div>
  );

  // 일반 필드(라벨 + 값)
  const Field: React.FC<{ 
    label: string; 
    children: React.ReactNode; 
    compact?: boolean;
    expandable?: boolean; // 강제로 활성화/비활성화
    minLength?: number;   // 최소 길이 (기본: 40자)
  }> = ({ label, children, compact = false, expandable, minLength = 40 }) => {
    // children이 string인지 확인
    const isStringChild = typeof children === 'string';
    const text = isStringChild ? (children as string) : '';
    
    // expandable이 명시되지 않으면 자동 판단 (minLength 이상)
    const shouldExpand = expandable !== undefined 
      ? expandable 
      : (isStringChild && text.length > minLength);

    // 고유 필드 키 생성 (라벨 기반)
    const fieldKey = label.replace(/[^a-zA-Z0-9가-힣]/g, '_').toLowerCase();

    return (
      <div className={compact ? '-mb-3' : ''}>
        <label className="text-[11px] font-semibold text-gray-600 tracking-wide">{label}</label>
        <div className="mt-0.5 text-[13px] text-gray-900">
          {shouldExpand ? (
            <ExpandableText
              fieldKey={fieldKey}
              text={text}
              className="text-[13px] leading-5 whitespace-pre-wrap"
            />
          ) : (
            children
          )}
        </div>
      </div>
    );
  };

  const ExpandableText: React.FC<{
    fieldKey: string;
    text: string;
    className?: string;
  }> = ({ fieldKey, text, className = '' }) => {
    const isExpanded = Boolean(expandedText[fieldKey]);
    // ✅ 3줄 이상이면 더보기 버튼 표시 (약 60자 이상)
    const showToggle = text.length > 60;

    return (
      <div className="relative">
        <p
          className={className}
          style={
            !isExpanded && showToggle ? {
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 3, // ✅ 기본 3줄로 제한
              overflow: 'hidden',
            } as React.CSSProperties : {}
          }
        >
          {text}
        </p>
        {showToggle && (
          <button
            type="button"
            className="mt-1 text-xs text-gray-500 underline"
            onClick={() => setExpandedText((prev) => ({ ...prev, [fieldKey]: !prev[fieldKey] }))}
          >
            {isExpanded ? '접기' : '더보기'}
          </button>
        )}
      </div>
    );
  };

  const typeKo = type === 'emergency' ? '응급' : type === 'fire' ? '화재' : type === 'trash' ? '쓰레기' : '낙석';

  const statusPillClass = (() => {
    if (detail.status === '처리완료' || detail.status === '진화완료') return 'bg-green-100 text-green-700 border-green-200';
    if (detail.status === '대응중' || detail.status === '진화중') return 'bg-orange-100 text-orange-700 border-orange-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  })();

  // ✅ 심각도(상/중/하) 색상: 빨강/주황/노랑으로 통일
  const severityPillClass = (() => {
    if (detail.severity === '상') return 'bg-red-100 text-red-700 border-red-200';
    if (detail.severity === '중') return 'bg-orange-100 text-orange-700 border-orange-200';
    return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  })();

  const RightCard: React.FC<{
    title: string;
    icon?: React.ReactNode;
    accent?: 'red' | 'orange' | 'yellow' | 'blue' | 'purple' | 'gray';
    splitLayout?: boolean;
    children: React.ReactNode;
  }> = ({ title, icon, accent = 'gray', splitLayout = false, children }) => {
    const accentClass =
      accent === 'red' ? 'border-l-red-500' :
      accent === 'orange' ? 'border-l-orange-500' :
      accent === 'yellow' ? 'border-l-yellow-500' :
      accent === 'blue' ? 'border-l-blue-500' :
      accent === 'purple' ? 'border-l-purple-500' :
      'border-l-gray-300';

    return (
      <div
        className={`bg-white border border-gray-200 border-l-4 ${accentClass} p-2.5 flex flex-col min-h-0 h-full`}
        style={{ borderRadius: '0px' }}
      >
        <div className="flex items-center gap-2 mb-1.5 shrink-0">
          {icon}
          <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
        </div>

        {/* ✅ splitLayout일 때는 좌우 분할, 아니면 기존 2열 그리드 */}
        {splitLayout ? (
          <div className="flex-1 min-h-0 flex gap-3">
            {children}
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
              {children}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 10000 }} onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full overflow-hidden flex flex-col"
        style={{ maxWidth: '1320px', height: '90vh', maxHeight: '95vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200" style={{ backgroundColor: headerColors[type] }}>
          <h2 className="text-xl font-semibold text-white">{headerTitles[type]}</h2>
          <button onClick={onClose} className="text-white hover:text-gray-200 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 모달 내용 */}
        <div className="flex-1 min-h-0 overflow-hidden flex p-4 gap-5">
          {/* 좌측 패널 */}
          <div className="flex flex-col min-h-0 overflow-y-auto" style={{ width: '640px' }}>
            {/* ✅ 수동 등록은 자동탐지와 레이아웃을 완전히 분리 */}
            {isManualIncident ? (
              <>
                {isManualRockfall ? (
                  <>
                    {/* (낙석) 수동등록: 기존 1번 캡쳐 스타일 유지 */}
                    <div className="bg-gray-100 border border-gray-300 mb-3 flex items-center justify-center"
                         style={{ height: '380px', borderRadius: '0px' }}>
                      <div className="text-center text-gray-500">
                        <Camera className="w-10 h-10 mx-auto mb-2" />
                        <p className="text-sm">이미지</p>
                      </div>
                    </div>

                    <div className="bg-gray-100 border border-gray-300 flex items-center justify-center"
                         style={{ height: '210px', borderRadius: '0px' }}>
                      <div className="text-center text-gray-500">
                        <Video className="w-10 h-10 mx-auto mb-2" />
                        <p className="text-sm">영상</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* (공통) 수동등록: 미디어/지도 대신 정보 카드 */}
                    <div className="border border-gray-300 bg-white p-4" style={{ borderRadius: '0px' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <Edit2 className="w-4 h-4 text-gray-700" />
                        <h4 className="text-sm font-semibold text-gray-900">수동 등록 정보</h4>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">발생 위치(입력)</p>
                          <p className="text-gray-900 whitespace-pre-wrap">
                            {detail.manualLocation || detail.locationDesc || detail.location || '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">설명</p>
                          <p className="text-gray-900 whitespace-pre-wrap">
                            {detail.manualDescription || detail.note || '-'}
                          </p>
                        </div>
                        <div className="pt-2 border-t border-gray-200 text-xs text-gray-500">
                          수동 등록 사건은 CCTV 영상/프레임 및 AI 분석 정보가 표시되지 않습니다.
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                {/* 기존: 지도 영역 */}
                <div className="border border-gray-300 mb-3" style={{ height: '380px', borderRadius: '0px', position: 'relative', zIndex: 1 }}>
                  <MapContainer
                    center={
                      [mapLatitude, mapLongitude]
                    }
                    zoom={(hasDetailCoords || hasResolvedCoords) ? 17 : 15}
                    style={{ height: '100%', width: '100%' }}

                    zoomControl={false}
                    key={`${mapLatitude}-${mapLongitude}`}  // 좌표 변경 시 지도 재렌더링
                    // ✅ 모달/레이아웃 리사이즈 시 Leaflet이 사이즈를 못 잡아 회색 영역이 생기는 문제 방지
                    whenReady={(e) => {
                      const map = (e as any).target;
                      // 0ms/50ms 두 번 invalidate로 레이아웃 안정화
                      setTimeout(() => map?.invalidateSize?.(), 0);
                      setTimeout(() => map?.invalidateSize?.(), 50);
                    }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker 
                      position={
                        [mapLatitude, mapLongitude]
                      }
                      icon={L.divIcon({
                        className: `custom-${type}-marker`,
                        html: `<div style="width: 40px; height: 40px;">
                          <svg viewBox="0 0 96.72 125.04" style="filter: drop-shadow(3px 3px 3px rgba(0,0,0,0.3));">
                            <path fill="#FFFFFF" d="M74.481,41.241c0,18.358-33.24,61.788-33.24,61.788S8,59.6,8,41.241C8,22.882,22.883,8,41.241,8S74.481,22.882,74.481,41.241z"/>
                            <circle fill="${markerColors[type]}" cx="41.241" cy="40.43" r="27.834"/>
                          </svg>
                        </div>`,
                        iconSize: [40, 40],
                        iconAnchor: [20, 40],
                      })}
                    >
                      {/* 확산 방향이 있는데 각도 매핑이 실패해도 지도 위에 텍스트는 항상 표시 */}
                      {hasSpreadDirection && !spreadLine && (
                        <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent>
                          확산 방향: {detail.spreadDirection}
                        </Tooltip>
                      )}
                    </Marker>
                    {/* 확산 부채꼴(확산 영역 느낌) - 각도 매핑 성공 시 */}
                    {spreadFan && (
                      <Polygon
                        positions={spreadFan}
                        pathOptions={{
                          color: '#ef4444',
                          weight: 1,
                          fillColor: '#ef4444',
                          fillOpacity: 0.12,
                        }}
                      />
                    )}
                    {spreadLine && (
                      <Polyline 
                        positions={spreadLine} 
                        pathOptions={{ color: '#ef4444', weight: 4, opacity: 0.8 }}
                      >
                        <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent>
                          확산 방향: {detail.spreadDirection}
                        </Tooltip>
                      </Polyline>
                    )}
                    {/* 화살촉(삼각형) - 각도 매핑 성공 시 */}
                    {spreadArrowHead && (
                      <Polygon
                        positions={spreadArrowHead}
                        pathOptions={{
                          color: '#ef4444',
                          fillColor: '#ef4444',
                          fillOpacity: 0.9,
                          weight: 0,
                        }}
                      />
                    )}
                  </MapContainer>
                </div>
                
                {/* 영상/이미지 영역 */}
                <div className="flex gap-3" style={{ position: 'relative', zIndex: 10 }}>
                  {/* 클립 영상 */}
                  <div 
                    className="flex-1 bg-gray-100 border border-gray-300 relative cursor-pointer overflow-hidden group" 
                    style={{ aspectRatio: '16/9', borderRadius: '0px', position: 'relative', zIndex: 10 }}
                    onClick={() => detail.clipUrl && setShowVideoModal(true)}
                  >
                    {detail.clipUrl ? (
                      <>
                        <video
                          src={detail.clipUrl}
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                          preload="metadata"
                        />
                      </>
                    ) : (
                      <div className="text-center text-gray-500 h-full flex items-center justify-center">
                        <Video className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">영상</p>
                      </div>
                    )}
                  </div>
                  
                  {/* 프레임 이미지 (_4만 표시) */}
                  <div className="flex-1 bg-gray-100 border border-gray-300 relative cursor-pointer overflow-hidden group" style={{ borderRadius: '0px', position: 'relative', zIndex: 10 }}>
                    {detail.frameUrls && detail.frameUrls.length > 0 ? (
                      <div
                        onClick={() => {
                          const lastFrameIndex = detail.frameUrls!.length - 1; // _4 프레임 (인덱스 3)
                          setSelectedFrameIndex(lastFrameIndex);
                          setShowImageModal(true);
                        }}
                        className="w-full h-full"
                      >
                        <img
                          src={detail.frameUrls[detail.frameUrls.length - 1]} // 마지막 프레임 (_4)
                          alt="Frame 4"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity flex items-center justify-center">
                          <Camera className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 h-full flex items-center justify-center">
                        <Camera className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">이미지</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 우측 패널 */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* ✅ 핵심 하이라이트 */}
            <div className="border border-gray-200 bg-white p-4 mb-3" style={{ borderRadius: '0px' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <HeartPulse className="w-4 h-4 text-gray-700" />
                    <p className="text-sm font-semibold text-gray-900 truncate">{typeKo} 탐지 상세</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-1 text-xs border ${statusPillClass}`} style={{ borderRadius: '0px' }}>
                      상태: {detail.status || '-'}
                    </span>
                    <span className={`px-2 py-1 text-xs border ${severityPillClass}`} style={{ borderRadius: '0px' }}>
                      심각도: {detail.severity || '-'}
                    </span>
                  </div>
                </div>
                <div className="text-right text-xs text-gray-600 shrink-0">
                  <div className="flex items-center justify-end gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{isEditing && editedDetail ? editedDetail.time : detail.time}</span>
                  </div>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="max-w-[240px] truncate">{isEditing && editedDetail ? (editedDetail.location || '-') : (detail.location || '-')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ✅ 그룹 카드들 (가로 확장: 데스크탑에서 2열) */}
            <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden pr-1">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:h-full lg:min-h-0" style={{ gridTemplateRows: '38% 1fr' }}>
                <RightCard title="기본 정보" icon={<ClipboardList className="w-4 h-4 text-gray-700" />} accent={type === 'emergency' ? 'red' : 'gray'}>
                <Field label="사고 코드">{detail.accidentCode}</Field>
                <Field label="유형">{typeKo}</Field>
                <Field label="상태">
                  <span className={`px-2 py-1 text-xs border ${statusPillClass}`} style={{ borderRadius: '0px' }}>
                    {detail.status}
                  </span>
                </Field>
                <Field label="심각도">
                  {isEditing && editedDetail ? (
                    <select
                      value={editedDetail.severity}
                      onChange={(e) => onFieldChange('severity', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 text-gray-900"
                      style={{ borderRadius: '0px' }}
                    >
                      <option value="상">상</option>
                      <option value="중">중</option>
                      <option value="하">하</option>
                    </select>
                  ) : (
                    <span className={`px-2 py-1 text-xs border ${severityPillClass}`} style={{ borderRadius: '0px' }}>
                      {detail.severity}
                    </span>
                  )}
                </Field>
                </RightCard>

              <RightCard title="위치/시간 정보" icon={<MapPin className="w-4 h-4 text-gray-700" />} accent="orange">
                <Field label="발생시간">
                  {isEditing && editedDetail ? (
                    <input
                      type="text"
                      value={editedDetail.time}
                      onChange={(e) => onFieldChange('time', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 text-sm text-gray-900"
                      style={{ borderRadius: '0px' }}
                    />
                  ) : (
                    detail.time
                  )}
                </Field>

                <Field label="위치">
                  {isEditing && editedDetail ? (
                    <input
                      type="text"
                      value={editedDetail.location || ''}
                      onChange={(e) => onFieldChange('location', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 text-sm text-gray-900"
                      style={{ borderRadius: '0px' }}
                    />
                  ) : (
                    detail.location
                  )}
                </Field>

                <Field label="CCTV">{detail.cctvId && detail.cctvId !== '수동등록' ? (detail.cctvCode || detail.cctvId) : '-'}</Field>
                <Field label="처리자">{detail.handlerDept ? `${detail.handler || '미지정'} (${detail.handlerDept})` : (detail.handler || '미지정')}</Field>

                {detail.responseTime && <Field label="처리완료 시간">{detail.responseTime}</Field>}
                {detail.duration && <Field label="소요 시간">{detail.duration}</Field>}
              </RightCard>

              <RightCard title="기술 정보" icon={<Cpu className="w-4 h-4 text-gray-700" />} accent="yellow">
                <Field label="등록 방식">{isAIDetection ? 'AI 자동 탐지' : (detail.detectionBasis || '-')}</Field>
                {modelText && <Field label="모델">{modelText}</Field>}
                {detail.confidence && (
                  <Field label="신뢰도">
                    <span className="text-emerald-600 font-semibold">{detail.confidence}</span>
                  </Field>
                )}
                {detail.severityReason && (
                  <Field label="심각도 산정 근거">
                    {sanitizeSeverityReason(detail.severityReason)}
                  </Field>
                )}
                {detail.autoCreatedAt && <Field label="AI 탐지 시각">{detail.autoCreatedAt}</Field>}
              </RightCard>

              <RightCard title="추가 상세" icon={<Info className="w-4 h-4 text-gray-700" />} accent={type === 'emergency' ? 'red' : 'gray'} splitLayout={type !== 'trash' && type !== 'rockfall'}>
                {type === 'trash' || type === 'rockfall' ? (
                  // 쓰레기, 낙석: 좌우 분할 없이 통합
                  <>
                    {type === 'trash' && (
                      <>
                        {detail.trashType && <Field label="쓰레기 종류">{detail.trashType}</Field>}
                        {detail.amount && <Field label="양/규모">{detail.amount}</Field>}
                      </>
                    )}
                    {type === 'rockfall' && (
                      <>
                        {detail.rockSizeClass && <Field label="암괴 규모">{detail.rockSizeClass}</Field>}
                        {detail.affectedAssetType && <Field label="피해 대상 유형">{detail.affectedAssetType}</Field>}
                        {detail.affectedAssetName && <Field label="피해 대상 식별">{detail.affectedAssetName}</Field>}
                        {detail.damageDescription && <Field label="피해 설명">{detail.damageDescription}</Field>}
                      </>
                    )}
                    {isAIDetection && (
                      <>
                        {detail.confidenceReason && <Field label="신뢰도 근거">{detail.confidenceReason}</Field>}
                        {detail.detectedFeatures && <Field label="탐지 특징">{detail.detectedFeatures}</Field>}
                      </>
                    )}
                  </>
                ) : (
                  // 응급, 화재: 좌우 분할
                  <>
                    {/* 왼쪽 영역: 유형별 상세 */}
                    <div className="flex-1 min-h-0 overflow-y-auto">
                      <div className="space-y-2">
                        {type === 'emergency' && (
                          <>
                            {detail.emergencyType && <Field label="응급 유형">{detail.emergencyType}</Field>}
                            {detail.emergencySymptom && <Field label="증상">{detail.emergencySymptom}</Field>}
                            {detail.rescueTeam && <Field label="대응팀">{detail.rescueTeam}</Field>}
                            {detail.transferHospital && <Field label="이송병원/처리 기관">{detail.transferHospital}</Field>}
                            {detail.patientName && <Field label="환자명">{detail.patientName}</Field>}
                            {detail.patientAge && <Field label="나이">{detail.patientAge}</Field>}
                            {detail.patientGender && <Field label="성별">{detail.patientGender}</Field>}
                          </>
                        )}

                        {type === 'fire' && (
                          <>
                            {detail.windInfo && <Field label="풍향/풍속">{detail.windInfo}</Field>}
                            {detail.spreadDirection && <Field label="확산 방향">{detail.spreadDirection}</Field>}
                            {detail.surroundingRisk && <Field label="주변 위험">{detail.surroundingRisk}</Field>}
                          </>
                        )}
                      </div>
                    </div>

                    {/* 오른쪽 영역: AI 근거 */}
                    <div className="flex-1 min-h-0 overflow-y-auto">
                      <div className="space-y-2">
                        {isAIDetection && (
                          <>
                            {detail.confidenceReason && <Field label="신뢰도 근거">{detail.confidenceReason}</Field>}
                            {detail.detectedFeatures && <Field label="탐지 특징">{detail.detectedFeatures}</Field>}
                          </>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </RightCard>
              </div>
            </div>

            {/* 하단 버튼 */}
            <div className="flex gap-3 mt-6">
              {isEditing ? (
                <>
                  <button 
                    onClick={onSave}
                    className="flex-1 px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2" 
                    style={{ borderRadius: '0px' }}
                  >
                    <Save className="w-4 h-4" />
                    저장
                  </button>
                  <button 
                    onClick={onCancel}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors" 
                    style={{ borderRadius: '0px' }}
                  >
                    취소
                  </button>
                </>
              ) : (
                <>
                  {/* ✅ 수동 등록만 수정 허용(백엔드도 수동 등록 전용 업데이트가 많음) */}
                  {isManualIncident && (
                    <button 
                      onClick={onEditClick}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors flex items-center justify-center gap-2" 
                      style={{ borderRadius: '0px' }}
                    >
                      <Edit2 className="w-4 h-4" />
                      수정
                    </button>
                  )}
                  {isAIDetection && (
                    <button 
                      onClick={() => setShowFalseReportModal(true)}
                      className="flex-1 px-4 py-2 bg-red-500 text-white hover:bg-red-600 transition-colors" 
                      style={{ borderRadius: '0px' }}
                    >
                      오탐처리
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 오탐 처리 모달 */}
      {showFalseReportModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" 
          style={{ zIndex: 20000, padding: '16px' }} 
          onClick={() => { setShowFalseReportModal(false); setFalseReportReason(''); }}
        >
          <div 
            className="bg-white shadow-xl w-full" 
            style={{ borderRadius: '8px', maxWidth: '28rem' }} 
            onClick={(e) => e.stopPropagation()}
          >
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
                onClick={handleFalsePositive}
                className="flex-1 px-4 py-3 bg-red-500 text-white hover:bg-red-600 transition-colors"
                style={{ borderRadius: '0px' }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 비디오 모달 (큰 화면에서 재생) */}
      {showVideoModal && detail.clipUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4" style={{ zIndex: 20000 }} onClick={() => setShowVideoModal(false)}>
          <div className="w-full max-w-6xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setShowVideoModal(false)}
                className="text-white hover:text-gray-300 transition-colors"
              >
                <X className="w-8 h-8" />
              </button>
            </div>
            <video
              src={detail.clipUrl}
              controls
              playsInline
              className="w-full h-auto"
              style={{ maxHeight: '90vh' }}
            />
          </div>
        </div>
      )}

      {/* 이미지 모달 (큰 이미지로 보기) */}
      {showImageModal && detail.frameUrls && selectedFrameIndex !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4" style={{ zIndex: 20000 }} onClick={() => setShowImageModal(false)}>
          <div className="relative w-full max-w-6xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <div className="flex gap-2">
                {detail.frameUrls.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedFrameIndex(index)}
                    className={`px-3 py-1 text-sm ${
                      index === selectedFrameIndex
                        ? 'bg-white text-black'
                        : 'bg-gray-700 text-white hover:bg-gray-600'
                    } transition-colors`}
                    style={{ borderRadius: '0px' }}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowImageModal(false)}
                className="text-white hover:text-gray-300 transition-colors"
              >
                <X className="w-8 h-8" />
              </button>
            </div>
            <img
              src={detail.frameUrls[selectedFrameIndex]}
              alt={`Frame ${selectedFrameIndex + 1}`}
              className="w-full h-auto"
              style={{ maxHeight: '85vh', objectFit: 'contain' }}
            />
            {detail.frameUrls.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFrameIndex(prev => prev !== null && prev > 0 ? prev - 1 : detail.frameUrls!.length - 1);
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-3 hover:bg-opacity-70 transition-opacity"
                  style={{ borderRadius: '0px' }}
                >
                  ←
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFrameIndex(prev => prev !== null && prev < detail.frameUrls!.length - 1 ? prev + 1 : 0);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-3 hover:bg-opacity-70 transition-opacity"
                  style={{ borderRadius: '0px' }}
                >
                  →
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

