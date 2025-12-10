package com.example.geumjeongsan.domain.incident;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 전체 사건 목록 Repository
 * VIEW: view_all_incidents_list
 */
@Repository
public interface IncidentListViewRepository extends JpaRepository<IncidentListView, Long> {

    /**
     * 상태별 조회 (진행중: PENDING, IN_PROGRESS)
     */
    List<IncidentListView> findByStatusInOrderByDetectedAtDesc(List<String> statuses);

    /**
     * 유형별 조회
     */
    List<IncidentListView> findByIncidentTypeOrderByDetectedAtDesc(String incidentType);

    /**
     * 상태 + 유형별 조회
     */
    List<IncidentListView> findByStatusInAndIncidentTypeOrderByDetectedAtDesc(
            List<String> statuses,
            String incidentType
    );

    /**
     * CCTV ID로 조회
     */
    List<IncidentListView> findByCctvIdOrderByDetectedAtDesc(Long cctvId);

    /**
     * 검색 (사고코드, CCTV ID, 지역명)
     */
    @Query("SELECT i FROM IncidentListView i WHERE " +
            "(i.incidentCode LIKE %:keyword% OR " +
            "i.cctvCode LIKE %:keyword% OR " +
            "i.cctvAddress LIKE %:keyword%) " +
            "ORDER BY i.detectedAt DESC")
    List<IncidentListView> searchByKeyword(@Param("keyword") String keyword);

    /**
     * 상태별 + 검색
     */
    @Query("SELECT i FROM IncidentListView i WHERE " +
            "i.status IN :statuses AND " +
            "(i.incidentCode LIKE %:keyword% OR " +
            "i.cctvCode LIKE %:keyword% OR " +
            "i.cctvAddress LIKE %:keyword%) " +
            "ORDER BY i.detectedAt DESC")
    List<IncidentListView> searchByStatusAndKeyword(
            @Param("statuses") List<String> statuses,
            @Param("keyword") String keyword
    );
}

