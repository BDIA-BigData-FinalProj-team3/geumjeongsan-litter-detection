package com.example.geumjeongsan.domain.incident;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TrashDetailRepository extends JpaRepository<TrashDetail, Long> {
    Optional<TrashDetail> findByIncidentId(Long incidentId);
}

