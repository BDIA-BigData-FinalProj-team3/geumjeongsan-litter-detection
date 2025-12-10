import React, { useState } from 'react';
import { X, Video, Camera, Map, Edit2, Save, Play } from 'lucide-react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';

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
}

interface IncidentDetailModalProps {
  type: 'emergency' | 'fire' | 'trash';
  detail: IncidentDetail;
  isEditing: boolean;
  editedDetail: IncidentDetail | null;
  onClose: () => void;
  onEditClick: () => void;
  onSave: () => void;
  onCancel: () => void;
  onFieldChange: (field: string, value: string) => void;
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
  onFieldChange
}: IncidentDetailModalProps) {
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  const headerColors = {
    emergency: '#9333EA',
    fire: '#DC2626',
    trash: '#576F93'
  };

  const headerTitles = {
    emergency: '응급 상세정보',
    fire: '화재 상세정보',
    trash: '쓰레기 상세정보'
  };

  const markerColors = {
    emergency: '#9333EA',
    fire: '#FF5A5A',
    trash: '#576F93'
  };

  // AI 자동 탐지인지 확인 (백엔드에서 제공)
  const isAIDetection = detail.isAIDetection || false;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 10000 }} onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-h-[95vh] overflow-y-auto" style={{ maxWidth: '1100px' }} onClick={(e) => e.stopPropagation()}>
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200" style={{ backgroundColor: headerColors[type] }}>
          <h2 className="text-xl font-semibold text-white">{headerTitles[type]}</h2>
          <button onClick={onClose} className="text-white hover:text-gray-200 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 모달 내용 */}
        <div className="flex p-4 gap-4">
          {/* 좌측 패널 */}
          <div className="flex-1 flex flex-col">
            {/* 지도 영역 */}
            <div className="border border-gray-300 mb-3" style={{ height: '380px', borderRadius: '0px', position: 'relative', zIndex: 1 }}>
              <MapContainer
                center={
                  detail.latitude && detail.longitude 
                    ? [detail.latitude, detail.longitude] 
                    : [35.2456, 129.0917]  // 기본값: 부산 좌표
                }
                zoom={detail.latitude && detail.longitude ? 17 : 15}
                style={{ height: '100%', width: '100%' }}

                zoomControl={false}
                key={`${detail.latitude || 35.2456}-${detail.longitude || 129.0917}`}  // 좌표 변경 시 지도 재렌더링
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker 
                  position={
                    detail.latitude && detail.longitude 
                      ? [detail.latitude, detail.longitude] 
                      : [35.2456, 129.0917]  // 좌표가 없어도 기본 위치에 마커 표시
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
                />
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
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center pointer-events-none">
                      <div className="bg-white bg-opacity-90 rounded-full p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-8 h-8 text-gray-900" fill="currentColor" />
                      </div>
                    </div>
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
          </div>

          {/* 우측 패널 */}
          <div className="flex-1 flex flex-col">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">상세정보 내용</h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-5 flex-1">
              {/* 공통 필드 */}
              <div>
                <label className="text-sm text-gray-600">사고 코드</label>
                <p className="text-gray-900 mt-1">{detail.accidentCode}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">CCTV ID</label>
                <p className="text-gray-900 mt-1">{detail.cctvId}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">위치</label>
                {isEditing && editedDetail ? (
                  <input
                    type="text"
                    value={editedDetail.location || ''}
                    onChange={(e) => onFieldChange('location', e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                    style={{ borderRadius: '0px' }}
                  />
                ) : (
                  <p className="text-gray-900 mt-1">{detail.location}</p>
                )}
              </div>
              <div>
                <label className="text-sm text-gray-600">유형</label>
                <p className="text-gray-900 mt-1">
                  {type === 'emergency' ? '응급' : type === 'fire' ? '화재' : '쓰레기'}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600">발생시간</label>
                {isEditing && editedDetail ? (
                  <input
                    type="text"
                    value={editedDetail.time}
                    onChange={(e) => onFieldChange('time', e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                    style={{ borderRadius: '0px' }}
                  />
                ) : (
                  <p className="text-gray-900 mt-1">{detail.time}</p>
                )}
              </div>
              <div>
                <label className="text-sm text-gray-600">심각도</label>
                {isEditing && editedDetail ? (
                  <select
                    value={editedDetail.severity}
                    onChange={(e) => onFieldChange('severity', e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                    style={{ borderRadius: '0px' }}
                  >
                    <option value="상">상</option>
                    <option value="중">중</option>
                    <option value="하">하</option>
                  </select>
                ) : (
                  <p className="mt-1">
                    <span className={`px-2 py-1 text-xs ${
                      detail.severity === '상' ? 'bg-red-100 text-red-700' : 
                      detail.severity === '중' ? 'bg-yellow-100 text-yellow-700' : 
                      'bg-blue-100 text-blue-700'
                    }`} style={{ borderRadius: '0px' }}>
                      {detail.severity}
                    </span>
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm text-gray-600">상태</label>
                <p className="mt-1">
                  <span className={`px-2 py-1 text-xs ${
                    detail.status === '처리완료' || detail.status === '진화완료'
                      ? 'bg-green-100 text-green-700' 
                      : detail.status === '대응중' || detail.status === '진화중'
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-gray-100 text-gray-700'
                  }`} style={{ borderRadius: '0px' }}>
                    {detail.status}
                  </span>
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600">처리자</label>
                <p className="text-gray-900 mt-1">{detail.handler}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">탐지근거</label>
                <p className="text-gray-900 mt-1">{detail.detectionBasis || 'AI 자동 탐지'}</p>
              </div>

              {/* AI 자동 탐지인 경우 모델 정보 */}
              {isAIDetection && (
                <>
                  {detail.modelName && (
                    <div>
                      <label className="text-sm text-gray-600">모델명</label>
                      <p className="text-gray-900 mt-1">{detail.modelName}</p>
                    </div>
                  )}
                  {detail.modelVersion && (
                    <div>
                      <label className="text-sm text-gray-600">모델버전</label>
                      <p className="text-gray-900 mt-1">{detail.modelVersion}</p>
                    </div>
                  )}
                  {detail.confidence && (
                    <div>
                      <label className="text-sm text-gray-600">신뢰도</label>
                      <p className="text-emerald-600 mt-1 font-medium">{detail.confidence}</p>
                    </div>
                  )}
                  {detail.confidenceReason && (
                    <div>
                      <label className="text-sm text-gray-600">신뢰도 근거</label>
                      <p className="text-gray-900 mt-1 text-sm">{detail.confidenceReason}</p>
                    </div>
                  )}
                  {detail.severityReason && (
                    <div>
                      <label className="text-sm text-gray-600 flex items-center gap-1">
                        심각도 상세
                        <span className="text-xs text-gray-400 cursor-help" title="심각도 점수 계산 방법">(?)</span>
                      </label>
                      <p className="text-gray-900 mt-1 text-sm">{detail.severityReason}</p>
                    </div>
                  )}
                  {detail.detectedFeatures && (
                    <div>
                      <label className="text-sm text-gray-600">탐지된 특징</label>
                      <p className="text-gray-900 mt-1 text-sm">{detail.detectedFeatures}</p>
                    </div>
                  )}
                </>
              )}

              {/* 응급 전용 필드 */}
              {type === 'emergency' && (
                <>
                  {detail.patientName && (
                    <div>
                      <label className="text-sm text-gray-600">환자명</label>
                      <p className="text-gray-900 mt-1">{detail.patientName}</p>
                    </div>
                  )}
                  {detail.patientAge && (
                    <div>
                      <label className="text-sm text-gray-600">나이</label>
                      <p className="text-gray-900 mt-1">{detail.patientAge}</p>
                    </div>
                  )}
                  {detail.patientGender && (
                    <div>
                      <label className="text-sm text-gray-600">성별</label>
                      <p className="text-gray-900 mt-1">{detail.patientGender}</p>
                    </div>
                  )}
                  {detail.emergencyType && (
                    <div>
                      <label className="text-sm text-gray-600">응급 유형</label>
                      <p className="text-gray-900 mt-1">{detail.emergencyType}</p>
                    </div>
                  )}
                  {detail.emergencySymptom && (
                    <div>
                      <label className="text-sm text-gray-600">증상</label>
                      <p className="text-gray-900 mt-1">{detail.emergencySymptom}</p>
                    </div>
                  )}
                  {detail.rescueTeam && (
                    <div>
                      <label className="text-sm text-gray-600">대응팀</label>
                      <p className="text-gray-900 mt-1">{detail.rescueTeam}</p>
                    </div>
                  )}
                  {detail.transferHospital && (
                    <div>
                      <label className="text-sm text-gray-600">이송병원 및 처리 기관</label>
                      <p className="text-gray-900 mt-1">{detail.transferHospital}</p>
                    </div>
                  )}
                </>
              )}

              {/* 화재 전용 필드 */}
              {type === 'fire' && (
                <>
                  {detail.windInfo && (
                    <div>
                      <label className="text-sm text-gray-600">풍향/풍속</label>
                      <p className="text-gray-900 mt-1">{detail.windInfo}</p>
                    </div>
                  )}
                  {detail.windSpeed && (
                    <div>
                      <label className="text-sm text-gray-600">풍속</label>
                      <p className="text-gray-900 mt-1">{detail.windSpeed}</p>
                    </div>
                  )}
                  {detail.spreadDirection && (
                    <div>
                      <label className="text-sm text-gray-600">확산 방향</label>
                      <p className="text-gray-900 mt-1">{detail.spreadDirection}</p>
                    </div>
                  )}
                  {detail.surroundingRisk && (
                    <div>
                      <label className="text-sm text-gray-600">주변 위험</label>
                      <p className="text-gray-900 mt-1">{detail.surroundingRisk}</p>
                    </div>
                  )}
                </>
              )}

              {/* 쓰레기 전용 필드 */}
              {type === 'trash' && (
                <>
                  {detail.trashType && (
                    <div>
                      <label className="text-sm text-gray-600">쓰레기 종류</label>
                      <p className="text-gray-900 mt-1">{detail.trashType}</p>
                    </div>
                  )}
                  {detail.amount && (
                    <div>
                      <label className="text-sm text-gray-600">양</label>
                      <p className="text-gray-900 mt-1">{detail.amount}</p>
                    </div>
                  )}
                </>
              )}

              {/* 상황메모 */}
              <div className="col-span-2">
                <label className="text-sm text-gray-600">상황메모</label>
                {isEditing && editedDetail ? (
                  <textarea
                    value={editedDetail.note || ''}
                    onChange={(e) => onFieldChange('note', e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 text-gray-900"
                    style={{ borderRadius: '0px' }}
                    rows={3}
                  />
                ) : (
                  <p className="text-gray-900 mt-1">{detail.note || '-'}</p>
                )}
              </div>
              
              {/* 처리 정보 (처리완료인 경우) */}
              {detail.responseTime && (
                <>
                  <div>
                    <label className="text-sm text-gray-600">처리완료 시간</label>
                    <p className="text-gray-900 mt-1">{detail.responseTime}</p>
                  </div>
                  {detail.duration && (
                    <div>
                      <label className="text-sm text-gray-600">소요 시간</label>
                      <p className="text-gray-900 mt-1">{detail.duration}</p>
                    </div>
                  )}
                </>
              )}
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
                  <button 
                    onClick={onEditClick}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors flex items-center justify-center gap-2" 
                    style={{ borderRadius: '0px' }}
                  >
                    <Edit2 className="w-4 h-4" />
                    수정
                  </button>
                  <button 
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

