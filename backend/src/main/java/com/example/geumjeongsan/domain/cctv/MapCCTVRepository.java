package com.example.geumjeongsan.domain.cctv;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MapCCTVRepository extends JpaRepository<MapCCTV, Long> {
    // 기본 findAll() 메서드로 뷰의 모든 데이터를 가져옵니다.
}

