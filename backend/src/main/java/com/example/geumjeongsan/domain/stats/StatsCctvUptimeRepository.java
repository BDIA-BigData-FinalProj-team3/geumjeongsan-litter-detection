package com.example.geumjeongsan.domain.stats;

import com.example.geumjeongsan.api.dto.CctvUptimePointDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

/**
 * CCTV 가동률 통계 Repository
 * VIEW: view_stats_daily_cctv_uptime
 */
@Repository
@RequiredArgsConstructor
@Slf4j
public class StatsCctvUptimeRepository {

    private final JdbcTemplate jdbcTemplate;

    /**
     * unit 파라미터에 따른 date_trunc 표현식 반환
     */
    private String getTruncExpr(String unit) {
        return switch (unit) {
            case "YEAR"  -> "date_trunc('year', stat_date)";
            case "MONTH" -> "date_trunc('month', stat_date)";
            default      -> "date_trunc('day', stat_date)";
        };
    }

    /**
     * 기간 + 단위별 CCTV 가동률 조회
     * 연/월/일 단위로 평균 가동률 집계
     */
    public List<CctvUptimePointDto> findCctvUptime(LocalDate from, LocalDate to, String unit) {
        String truncExpr = getTruncExpr(unit);

        String sql = String.format("""
            SELECT
              %s::date AS period,
              AVG(on_samples)::numeric  AS avg_on_samples,
              AVG(off_samples)::numeric AS avg_off_samples,
              ROUND(AVG(uptime_pct), 1) AS avg_uptime_pct
            FROM view_stats_daily_cctv_uptime
            WHERE stat_date BETWEEN ? AND ?
            GROUP BY period
            ORDER BY period
        """, truncExpr);

        log.debug("📊 [StatsCctv] findCctvUptime SQL: {}", sql);

        try {
            return jdbcTemplate.query(sql, (rs, rowNum) -> {
                java.math.BigDecimal avgOn = rs.getBigDecimal("avg_on_samples");
                java.math.BigDecimal avgOff = rs.getBigDecimal("avg_off_samples");
                java.math.BigDecimal avgUptime = rs.getBigDecimal("avg_uptime_pct");
                
                return new CctvUptimePointDto(
                        rs.getDate("period").toLocalDate(),
                        avgOn != null ? avgOn.longValue() : 0L,
                        avgOff != null ? avgOff.longValue() : 0L,
                        avgUptime != null ? avgUptime.doubleValue() : 0.0
                );
            }, from, to);
        } catch (Exception e) {
            log.error("❌ [StatsCctv] Failed to find CCTV uptime: {}", e.getMessage(), e);
            return List.of();
        }
    }
}

