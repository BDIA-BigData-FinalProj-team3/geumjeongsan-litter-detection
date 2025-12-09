package com.example.geumjeongsan.domain.mainmap;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * MainMap - 실시간 CCTV 상태 Repository
 * 
 * VIEW: view_mainmap_cctv_status
 * 
 * 기본 메서드:
 * - findAll(): 모든 활성 CCTV 상태 조회
 */
@Repository
public interface MainMapCCTVStatusRepository extends JpaRepository<MainMapCCTVStatus, Long> {
    
    // 기본 findAll() 사용
    // VIEW가 이미 is_active=TRUE 필터링 완료
}

