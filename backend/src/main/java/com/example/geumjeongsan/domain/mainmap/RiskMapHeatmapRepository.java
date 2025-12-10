package com.example.geumjeongsan.domain.mainmap;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 위험지도 히트맵 Repository
 * 
 * VIEW: view_risk_map_heatmap
 * 
 * 제공 메서드:
 * - findAll(): 전체 히트맵 데이터 조회
 * - findByEntityType(): 타입별 조회
 */
@Repository
public interface RiskMapHeatmapRepository extends JpaRepository<RiskMapHeatmap, Long> {
    
    /**
     * 타입별 조회
     * @param entityType "TRAIL_SEGMENT" 또는 "CCTV"
     */
    List<RiskMapHeatmap> findByEntityType(String entityType);
}

