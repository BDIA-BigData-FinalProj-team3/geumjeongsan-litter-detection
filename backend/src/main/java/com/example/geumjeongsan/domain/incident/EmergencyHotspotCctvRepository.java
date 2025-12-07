package com.example.geumjeongsan.domain.incident;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmergencyHotspotCctvRepository extends JpaRepository<EmergencyHotspotCctv, Long> {
    
    /**
     * 이번 달 기준 사고다발 CCTV (N건 이상)
     * @param minCount 최소 건수 (예: 3건 이상)
     * @return List<EmergencyHotspotCctv>
     */
    @Query("SELECT h FROM EmergencyHotspotCctv h " +
           "WHERE h.emergencyCountThisMonth >= :minCount " +
           "ORDER BY h.emergencyCountThisMonth DESC, h.avgSeverityScore DESC")
    List<EmergencyHotspotCctv> findHotspotsByThisMonth(@Param("minCount") long minCount);
    
    /**
     * 최근 30일 기준 사고다발 CCTV (N건 이상)
     */
    @Query("SELECT h FROM EmergencyHotspotCctv h " +
           "WHERE h.emergencyCount30d >= :minCount " +
           "ORDER BY h.emergencyCount30d DESC, h.avgSeverityScore DESC")
    List<EmergencyHotspotCctv> findHotspotsByLast30Days(@Param("minCount") long minCount);
    
    /**
     * 최근 7일 기준 사고다발 CCTV (N건 이상)
     */
    @Query("SELECT h FROM EmergencyHotspotCctv h " +
           "WHERE h.emergencyCount7d >= :minCount " +
           "ORDER BY h.emergencyCount7d DESC, h.avgSeverityScore DESC")
    List<EmergencyHotspotCctv> findHotspotsByLast7Days(@Param("minCount") long minCount);
    
    /**
     * 전체 기간 사고다발 CCTV (N건 이상)
     */
    @Query("SELECT h FROM EmergencyHotspotCctv h " +
           "WHERE h.totalEmergencyCount >= :minCount " +
           "ORDER BY h.totalEmergencyCount DESC, h.avgSeverityScore DESC")
    List<EmergencyHotspotCctv> findHotspotsByTotal(@Param("minCount") long minCount);
}

