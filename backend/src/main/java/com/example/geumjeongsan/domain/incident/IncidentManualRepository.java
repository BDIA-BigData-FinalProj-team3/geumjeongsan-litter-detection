package com.example.geumjeongsan.domain.incident;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface IncidentManualRepository extends JpaRepository<IncidentManual, Long> {
    Optional<IncidentManual> findByIncidentId(Long incidentId);
}

