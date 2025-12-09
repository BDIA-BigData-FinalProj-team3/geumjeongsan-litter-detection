package com.example.geumjeongsan.domain.mainmap;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * MainMap - 전체탐지 마커 Repository
 * 
 * VIEW: view_mainmap_incident_markers
 * 
 * 제공 메서드:
 * - findAll(): 모든 CCTV 마커 조회 (사건 개수 포함)
 */
@Repository
public interface MainMapIncidentMarkerRepository extends JpaRepository<MainMapIncidentMarker, Long> {
    
    // JPA가 기본 제공:
    // - findAll() - 모든 마커 조회
    // - findById(Long id) - 특정 CCTV 조회
    
    // 추가 메서드 (필요 시):
    // List<MainMapIncidentMarker> findByTopIncidentTypeNotNull(); // 사건 있는 것만
}

