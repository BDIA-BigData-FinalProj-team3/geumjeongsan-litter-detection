package com.example.geumjeongsan.domain.incident;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MapActiveIncidentRepository extends JpaRepository<MapActiveIncident, Long> {
    // 기본 findAll()로 진행중인 모든 사건 가져오기
}

