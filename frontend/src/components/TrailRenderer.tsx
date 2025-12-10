import React from 'react';
import { Polyline, Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import type { RiskMapHeatmapItem } from '../services/api';

interface TrailRendererProps {
  trails: any[];
  activeView: string;
  zoomLevel: number;
  hoveredTrailId: number | null;
  onHoverTrail: (id: number | null) => void;
  // 위험지도 관련
  riskMapType?: string;
  riskMapPeriod?: string;
  trailHeatmapMap?: Map<number, RiskMapHeatmapItem>;
  onHoverRiskSegment?: (data: any) => void;
  getHeatmapColorByPeriod?: (count: number, period: string) => string;
}

// 공통: 백엔드에서 내려오는 [lng, lat] 배열을 Leaflet용 [lat, lng]로 변환
const toLeafletPositions = (coords: number[][]) =>
  coords.map(([lng, lat]) => [lat, lng] as [number, number]);

const TrailRenderer: React.FC<TrailRendererProps> = ({
  trails,
  activeView,
  zoomLevel,
  hoveredTrailId,
  onHoverTrail,
  riskMapType = 'all',
  riskMapPeriod = '30d',
  trailHeatmapMap,
  onHoverRiskSegment,
  getHeatmapColorByPeriod
}) => {
  // 1. 기본 등산로 모드
  if (activeView !== 'risk-map') {
    return (
      <>
        {trails.map((trail) => {
          if (!trail.geom || !trail.geom.coordinates) return null;
          
          const positions = toLeafletPositions(trail.geom.coordinates as number[][]);
          const totalLength = positions.length;
          const midIndex = Math.floor(totalLength / 2);
          const centerPosition = positions[midIndex];
          const isHovered = hoveredTrailId === trail.segmentId;
          
          return (
            <React.Fragment key={trail.segmentId}>
              <Polyline
                positions={positions}
                pathOptions={{
                  color: isHovered ? '#059669' : '#10b981',
                  weight: isHovered ? 6 : 4,
                  opacity: isHovered ? 1.0 : 0.8,
                }}
                eventHandlers={{
                  mouseover: () => onHoverTrail(trail.segmentId),
                  mouseout: () => onHoverTrail(null),
                }}
              >
                {zoomLevel < 14.5 && (
                  <Tooltip permanent={false}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#000000' }}>
                      {trail.segmentName}
                    </div>
                  </Tooltip>
                )}
              </Polyline>
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
      </>
    );
  }

  // 2. 위험지도 모드
  return (
    <>
      {trails.map((trail) => {
        if (!trail.geom || !trail.geom.coordinates) return null;

        const positions = toLeafletPositions(trail.geom.coordinates as number[][]);
        if (positions.length === 0) return null;

        const totalLength = positions.length;
        const midIndex = Math.floor(totalLength / 2);
        const centerPosition = positions[midIndex];

        // 통계 찾기
        const stats = trailHeatmapMap?.get(trail.segmentId as number);
        
        const getCountByType = () => {
          if (!stats) return 0;
          if (riskMapType === 'fire') return stats.fireCount || 0;
          if (riskMapType === 'emergency') return stats.emergencyCount || 0;
          if (riskMapType === 'trash') return stats.trashCount || 0;
          return stats.totalCount || 0;
        };

        const displayCount = getCountByType();
        const color = getHeatmapColorByPeriod 
          ? getHeatmapColorByPeriod(displayCount, riskMapPeriod)
          : '#3B82F6'; // fallback color
          
        // 위험지도 모드에서는 trail.segmentId와 비교 (상위 컴포넌트에서 관리하는 hoveredTrailId를 위험지도용으로 재사용하거나 별도 prop 사용)
        // 여기서는 상위에서 넘겨준 hoveredId와 비교 (단, 위험지도용 hover state가 따로 있다면 그것과 비교해야 함)
        // MainMap에서는 hoveredTrailSegment?.entityId 를 썼음. 
        // TrailRenderer를 위해 prop을 일반화하거나, 여기서 로직을 맞춤.
        // 여기서는 단순화를 위해 onHoverRiskSegment로 데이터 전체를 올림.
        
        // *주의*: MainMap의 로직을 그대로 가져오려면 hoveredTrailSegment prop이 필요함.
        // 여기서는 간단히 로컬 변수 isHovered를 계산하지 않고 이벤트만 올림.
        // 하지만 스타일링을 위해 isHovered 상태가 필요함.
        // MainMap에서 hoveredTrailSegment를 prop으로 넘겨주는 게 좋음.
        // 일단은 hoveredTrailId prop을 재활용한다고 가정 (MainMap 수정 필요)
        
        const isHovered = hoveredTrailId === trail.segmentId;

        return (
          <React.Fragment key={`risk-map-trail-${trail.segmentId}`}>
            {/* 그림자 */}
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
                  
                  if (onHoverRiskSegment) {
                    onHoverRiskSegment({
                      entityId: trail.segmentId,
                      entityName: trail.segmentName,
                      trailName: trail.trailNameKor,
                      fireCount: stats?.fireCount || 0,
                      emergencyCount: stats?.emergencyCount || 0,
                      trashCount: stats?.trashCount || 0,
                      x,
                      y,
                    });
                  }
                },
                mouseout: () => {
                  if (onHoverRiskSegment) onHoverRiskSegment(null);
                },
              }}
            />
            {/* 라벨 */}
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
    </>
  );
};

export default React.memo(TrailRenderer);

