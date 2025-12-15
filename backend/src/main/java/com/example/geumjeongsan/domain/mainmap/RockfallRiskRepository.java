package com.example.geumjeongsan.domain.mainmap;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * 낙석 위험 Repository
 * VIEW: view_mainmap_rockfall_risk
 */
@Repository
public interface RockfallRiskRepository extends JpaRepository<RockfallRisk, String> {
}

