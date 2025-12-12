package com.example.geumjeongsan.domain.stats;

import com.example.geumjeongsan.api.dto.ResponseTimePointDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

/**
 * 평균 대응시간 통계 Repository
 * VIEW: view_stats_daily_response_time
 */
@Repository
@RequiredArgsConstructor
@Slf4j
public class StatsResponseTimeRepository {

    private final JdbcTemplate jdbcTemplate;

    /**
     * unit 파라미터에 따른 date_trunc 표현식 반환
     *
     * - YEAR  → date_trunc('year', stat_date)
     * - MONTH → date_trunc('month', stat_date)
     * - DAY   → date_trunc('day', stat_date)
     */
    private String getTruncExpr(String unit) {
        return switch (unit) {
            case "YEAR"  -> "date_trunc('year', stat_date)";
            case "MONTH" -> "date_trunc('month', stat_date)";
            default      -> "date_trunc('day', stat_date)";
        };
    }

    /**
     * 기간 + 단위(연/월/일)별 평균 대응시간 조회
     *
     * - VIEW: view_stats_daily_response_time
     * - period: unit 기준 날짜 (연/월/일)
     * - incident_type: 사고유형
     * - avg_sec_to_resolve: 해당 기간/유형의 평균 해결시간(초)
     */
    public List<ResponseTimePointDto> findResponseTime(LocalDate from, LocalDate to, String unit) {
        String truncExpr = getTruncExpr(unit);

        String sql = String.format("""
            SELECT
              %s::date AS period,
              incident_type,
              AVG(avg_sec_to_resolve) AS avg_sec_to_resolve
            FROM view_stats_daily_response_time
            WHERE stat_date BETWEEN ? AND ?
            GROUP BY period, incident_type
            ORDER BY period, incident_type
        """, truncExpr);

        log.debug("⏱️ [StatsResponseTime] findResponseTime SQL: {}", sql);

        try {
            return jdbcTemplate.query(sql, (rs, rowNum) ->
                    new ResponseTimePointDto(
                            rs.getDate("period").toLocalDate(),
                            rs.getString("incident_type"),
                            rs.getDouble("avg_sec_to_resolve")
                    ),
                    from, to
            );
        } catch (Exception e) {
            log.error("❌ [StatsResponseTime] Failed to find response time: {}", e.getMessage(), e);
            return List.of();
        }
    }
}

