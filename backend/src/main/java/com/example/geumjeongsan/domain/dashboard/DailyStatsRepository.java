package com.example.geumjeongsan.domain.dashboard;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * 일일 통계 Repository
 * VIEW: view_all_incidents_daily_stats
 */
@Repository
@RequiredArgsConstructor
public class DailyStatsRepository {
    
    private final JdbcTemplate jdbcTemplate;
    
    /**
     * 일일 통계 조회
     * VIEW에서 단일 행 집계 결과 반환
     */
    public DailyStats findDailyStats() {
        String sql = "SELECT * FROM view_all_incidents_daily_stats";
        
        return jdbcTemplate.queryForObject(sql, (rs, rowNum) -> 
            new DailyStats(
                rs.getLong("today_total"),
                rs.getLong("today_emergency"),
                rs.getLong("today_fire"),
                rs.getLong("today_trash"),
                rs.getLong("pending_total"),
                rs.getString("hotspot_location"),
                (Long) rs.getObject("hotspot_count")
            )
        );
    }
}

