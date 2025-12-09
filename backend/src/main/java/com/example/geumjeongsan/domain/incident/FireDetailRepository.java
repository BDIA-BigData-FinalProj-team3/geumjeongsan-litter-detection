package com.example.geumjeongsan.domain.incident;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface FireDetailRepository extends JpaRepository<FireDetail, Long> {
    Optional<FireDetail> findByIncidentId(Long incidentId);
}

