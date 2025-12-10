package com.example.geumjeongsan.domain.dashboard;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * 일일 통계 Repository
 * VIEW: view_all_incidents_daily_stats
 */
@Repository
@RequiredArgsConstructor
@Slf4j
public class DailyStatsRepository {
    
    private final JdbcTemplate jdbcTemplate;
    
    /**
     * 일일 통계 조회
     * VIEW에서 단일 행 집계 결과 반환
     */
    public DailyStats findDailyStats() {
        String sql = "SELECT * FROM view_all_incidents_daily_stats";
        
        try {
            return jdbcTemplate.queryForObject(sql, (rs, rowNum) -> {
                // hotspot_count는 NULL일 수 있으므로 안전하게 처리
                Long hotspotCount = null;
                Object hotspotCountObj = rs.getObject("hotspot_count");
                if (hotspotCountObj != null) {
                    if (hotspotCountObj instanceof Number) {
                        hotspotCount = ((Number) hotspotCountObj).longValue();
                    }
                }
                
                return new DailyStats(
                    rs.getLong("today_total"),
                    rs.getLong("today_emergency"),
                    rs.getLong("today_fire"),
                    rs.getLong("today_trash"),
                    rs.getLong("pending_total"),
                    rs.getString("hotspot_location"),
                    hotspotCount
                );
            });
        } catch (EmptyResultDataAccessException e) {
            // VIEW가 0개 행을 반환하는 경우 기본값 반환
            log.warn("⚠️ [DailyStats] VIEW returned no rows, returning default values");
            return new DailyStats(0L, 0L, 0L, 0L, 0L, null, null);
        }
    }
}

