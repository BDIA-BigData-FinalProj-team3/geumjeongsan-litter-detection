package com.example.geumjeongsan.domain.stats;

import com.example.geumjeongsan.api.dto.ModelAccuracyPointDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

/**
 * AI 모델 정확도 통계 Repository
 * VIEW: view_stats_model_accuracy_daily
 */
@Repository
@RequiredArgsConstructor
@Slf4j
public class StatsModelAccuracyRepository {

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
     * 기간 + 단위별 AI 모델 정확도 / 오탐률 조회
     *
     * - period: unit 기준 날짜 (연/월/일)
     * - incidentType, detectionModel 별로 집계
     */
    public List<ModelAccuracyPointDto> findModelAccuracy(LocalDate from, LocalDate to, String unit) {
        String truncExpr = getTruncExpr(unit);

        String sql = String.format("""
            SELECT
              %s::date AS period,
              incident_type,
              detection_model,
              SUM(total_auto_incidents) AS total_auto_incidents,
              SUM(true_incidents)       AS true_incidents,
              SUM(false_incidents)      AS false_incidents,
              ROUND(
                100.0 * SUM(true_incidents)
                / NULLIF(SUM(total_auto_incidents), 0),
                1
              ) AS accuracy_pct,
              ROUND(
                100.0 * SUM(false_incidents)
                / NULLIF(SUM(total_auto_incidents), 0),
                1
              ) AS false_rate_pct
            FROM view_stats_model_accuracy_daily
            WHERE stat_date BETWEEN ? AND ?
            GROUP BY period, incident_type, detection_model
            ORDER BY period, incident_type, detection_model
        """, truncExpr);

        log.debug("📊 [StatsModelAccuracy] findModelAccuracy SQL: {}", sql);

        try {
            return jdbcTemplate.query(sql, (rs, rowNum) ->
                    new ModelAccuracyPointDto(
                            rs.getDate("period").toLocalDate(),
                            rs.getString("incident_type"),
                            rs.getString("detection_model"),
                            rs.getLong("total_auto_incidents"),
                            rs.getLong("true_incidents"),
                            rs.getLong("false_incidents"),
                            rs.getDouble("accuracy_pct"),
                            rs.getDouble("false_rate_pct")
                    ),
                    from, to
            );
        } catch (Exception e) {
            log.error("❌ [StatsModelAccuracy] Failed to find model accuracy: {}", e.getMessage(), e);
            return List.of();
        }
    }
}

