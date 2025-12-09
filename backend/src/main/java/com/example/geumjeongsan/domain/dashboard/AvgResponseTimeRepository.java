package com.example.geumjeongsan.domain.dashboard;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * 월평균 처리시간 Repository
 * VIEW: view_all_incidents_avg_response_time
 */
@Repository
@RequiredArgsConstructor
public class AvgResponseTimeRepository {
    
    private final JdbcTemplate jdbcTemplate;
    
    /**
     * 월평균 처리시간 조회
     * VIEW에서 단일 행 집계 결과 반환
     */
    public AvgResponseTime findAvgResponseTime() {
        String sql = "SELECT * FROM view_all_incidents_avg_response_time";
        
        return jdbcTemplate.queryForObject(sql, (rs, rowNum) -> 
            new AvgResponseTime(
                (Double) rs.getObject("avg_response_minutes"),
                (Double) rs.getObject("emergency_avg"),
                (Double) rs.getObject("fire_avg"),
                (Double) rs.getObject("trash_avg")
            )
        );
    }
}

