package com.example.geumjeongsan.domain.incident;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IncidentActionRepository extends JpaRepository<IncidentAction, Long> {
    List<IncidentAction> findByIncidentIdOrderByCreatedAtAsc(Long incidentId);
}

