package com.example.geumjeongsan.domain.incident;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface IncidentRepository extends JpaRepository<Incident, Long> {

    // 화재(FIRE) + 상태별 조회
    List<Incident> findByIncidentTypeAndStatus(String incidentType, String status);
    
    // 화재(FIRE) + 여러 상태 조회 (PENDING, IN_PROGRESS)
    List<Incident> findByIncidentTypeAndStatusIn(String incidentType, List<String> statuses);
    
    // 사고 유형별 조회
    List<Incident> findByIncidentType(String incidentType);
}