package com.example.geumjeongsan.domain.incident;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface IncidentRepository extends JpaRepository<Incident, Long> {

    // 화재(FIRE) + 상태별 조회
    List<Incident> findByIncidentTypeAndStatus(String incidentType, String status);
    
    // 화재(FIRE) + 여러 상태 조회 (PENDING, IN_PROGRESS)
    List<Incident> findByIncidentTypeAndStatusIn(String incidentType, List<String> statuses);
    
    // 사고 유형별 조회
    List<Incident> findByIncidentType(String incidentType);
    
    // 같은 날짜, 같은 타입의 사건 개수 조회 (사건번호 일련번호 생성용)
    @Query("SELECT COUNT(i) FROM Incident i WHERE i.incidentType = :incidentType AND DATE(i.detectedAt) = :date")
    long countByIncidentTypeAndDetectedAtDate(@Param("incidentType") String incidentType, @Param("date") LocalDate date);
    
    // 특정 패턴으로 시작하는 가장 마지막 incident_code 조회 (예: 'F-251215-%')
    Incident findTopByIncidentCodeStartingWithOrderByIncidentCodeDesc(String prefix);
}