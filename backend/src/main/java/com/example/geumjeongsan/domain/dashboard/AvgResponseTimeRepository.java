package com.example.geumjeongsan.domain.dashboard;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;

/**
 * 월평균 처리시간 Repository
 * VIEW: view_all_incidents_avg_response_time
 */
@Repository
@RequiredArgsConstructor
@Slf4j
public class AvgResponseTimeRepository {
    
    private final JdbcTemplate jdbcTemplate;
    
    /**
     * 월평균 처리시간 조회
     * VIEW에서 단일 행 집계 결과 반환
     */
    public AvgResponseTime findAvgResponseTime() {
        String sql = "SELECT * FROM view_all_incidents_avg_response_time";
        
        try {
            return jdbcTemplate.queryForObject(sql, (rs, rowNum) -> 
                new AvgResponseTime(
                    getNullableDouble(rs, "avg_response_minutes"),
                    getNullableDouble(rs, "emergency_avg"),
                    getNullableDouble(rs, "fire_avg"),
                    getNullableDouble(rs, "trash_avg")
                )
            );
        } catch (EmptyResultDataAccessException e) {
            log.warn("⚠️ [AvgResponseTime] VIEW returned no rows, returning default values");
            return new AvgResponseTime(null, null, null, null);
        }
    }
    
    /**
     * BigDecimal을 Double로 안전하게 변환
     * PostgreSQL의 NUMERIC/AVG() 결과는 BigDecimal이므로 변환 필요
     */
    private Double getNullableDouble(ResultSet rs, String column) throws SQLException {
        BigDecimal val = rs.getBigDecimal(column);
        return val != null ? val.doubleValue() : null;
    }
}

