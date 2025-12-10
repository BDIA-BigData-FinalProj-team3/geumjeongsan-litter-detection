package com.example.geumjeongsan.domain.mainmap;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MainMapTrailRepository extends JpaRepository<MainMapTrail, Long> {
    
    /**
     * 모든 등산로 구간 조회
     */
    List<MainMapTrail> findAll();
}

