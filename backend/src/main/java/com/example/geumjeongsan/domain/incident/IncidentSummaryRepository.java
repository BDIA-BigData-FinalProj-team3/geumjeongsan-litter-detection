package com.example.geumjeongsan.domain.incident;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;

@Repository
public interface IncidentSummaryRepository extends JpaRepository<IncidentSummary, Long> {
    
    /**
     * 당일 발생 건수 (유형별)
     */
    @Query("SELECT COUNT(i) FROM IncidentSummary i " +
           "WHERE CAST(i.detectedAt AS LocalDate) = :date " +
           "AND i.incidentType = :type")
    long countTodayByType(@Param("date") LocalDate date, @Param("type") String type);
    
    /**
     * 대기중 건수 (유형별)
     */
    @Query("SELECT COUNT(i) FROM IncidentSummary i " +
           "WHERE i.isPending = true " +
           "AND i.incidentType = :type")
    long countPendingByType(@Param("type") String type);
    
    /**
     * 월평균 대응시간 (분) - 유형별
     * 특정 연도와 월의 평균 대응시간 계산
     */
    @Query("SELECT AVG(i.responseSeconds) / 60.0 FROM IncidentSummary i " +
           "WHERE YEAR(i.detectedAt) = :year " +
           "AND MONTH(i.detectedAt) = :month " +
           "AND i.incidentType = :type " +
           "AND i.responseSeconds IS NOT NULL")
    Double getAvgResponseMinutes(@Param("year") int year, 
                                   @Param("month") int month, 
                                   @Param("type") String type);
    
    /**
     * 유형별 사고 목록 조회 (페이지네이션, 최신순 정렬)
     */
    Page<IncidentSummary> findByIncidentTypeOrderByDetectedAtDesc(String incidentType, Pageable pageable);
}

