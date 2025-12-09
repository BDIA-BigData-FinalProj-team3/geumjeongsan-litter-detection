package com.example.geumjeongsan.domain.cctv;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CCTVRepository extends JpaRepository<CCTV, Long> {
    Optional<CCTV> findByCctvCode(String cctvCode);
    
    List<CCTV> findByIsActiveTrue();
    
    List<CCTV> findByIsActiveFalse();
}

