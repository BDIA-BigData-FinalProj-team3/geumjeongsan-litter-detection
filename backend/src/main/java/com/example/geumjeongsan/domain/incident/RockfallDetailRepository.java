package com.example.geumjeongsan.domain.incident;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RockfallDetailRepository extends JpaRepository<RockfallDetail, Long> {
}

