package com.example.geumjeongsan.domain.stats;

import com.example.geumjeongsan.api.dto.CompletionSummaryDto;
import com.example.geumjeongsan.api.dto.IncidentTrendPointDto;
import com.example.geumjeongsan.api.dto.IncidentTypeSummaryDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

/**
 * 통계용 사고 데이터 Repository
 * VIEW: view_stats_daily_incident_type
 */
@Repository
@RequiredArgsConstructor
@Slf4j
public class StatsIncidentRepository {

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
     * 사고 건수 추이 데이터 조회 (그래프용)
     * 기간 + 단위별로 전체/쓰레기/화재/응급 건수 집계
     */
    public List<IncidentTrendPointDto> findIncidentTrend(LocalDate from, LocalDate to, String unit) {
        String truncExpr = getTruncExpr(unit);

        String sql = String.format("""
            SELECT
              %s::date AS period,
              -- 전체
              SUM(total_incidents) AS total,
              -- 유형별
              SUM(total_incidents) FILTER (WHERE incident_type = 'TRASH')     AS trash,
              SUM(total_incidents) FILTER (WHERE incident_type = 'FIRE')      AS fire,
              SUM(total_incidents) FILTER (WHERE incident_type = 'EMERGENCY') AS emergency
            FROM view_stats_daily_incident_type
            WHERE stat_date BETWEEN ? AND ?
            GROUP BY period
            ORDER BY period
        """, truncExpr);

        log.debug("📊 [StatsIncident] findIncidentTrend SQL: {}", sql);

        try {
            return jdbcTemplate.query(sql, (rs, rowNum) -> new IncidentTrendPointDto(
                    rs.getDate("period").toLocalDate(),
                    rs.getLong("total"),
                    rs.getLong("trash"),
                    rs.getLong("fire"),
                    rs.getLong("emergency")
            ), from, to);
        } catch (Exception e) {
            log.error("❌ [StatsIncident] Failed to find incident trend: {}", e.getMessage(), e);
            return List.of();
        }
    }

    /**
     * 사고 유형별 요약 통계 조회
     * 기간 + 단위별로 유형별 전체/AI/완료/미완료 건수 집계
     */
    public List<IncidentTypeSummaryDto> findTypeSummary(LocalDate from, LocalDate to, String unit) {
        String truncExpr = getTruncExpr(unit);

        String sql = String.format("""
            SELECT
              %s::date AS period,
              incident_type,
              SUM(total_incidents)      AS total_incidents,
              SUM(auto_incidents)       AS auto_incidents,
              SUM(resolved_incidents)   AS resolved_incidents,
              SUM(unresolved_incidents) AS unresolved_incidents
            FROM view_stats_daily_incident_type
            WHERE stat_date BETWEEN ? AND ?
            GROUP BY period, incident_type
            ORDER BY period, incident_type
        """, truncExpr);

        log.debug("📊 [StatsIncident] findTypeSummary SQL: {}", sql);

        try {
            return jdbcTemplate.query(sql, (rs, rowNum) ->
                    new IncidentTypeSummaryDto(
                            rs.getDate("period").toLocalDate(),
                            rs.getString("incident_type"),
                            rs.getLong("total_incidents"),
                            rs.getLong("auto_incidents"),
                            rs.getLong("resolved_incidents"),
                            rs.getLong("unresolved_incidents")
                    ), from, to);
        } catch (Exception e) {
            log.error("❌ [StatsIncident] Failed to find type summary: {}", e.getMessage(), e);
            return List.of();
        }
    }

    /**
     * 처리 완료 비율 요약 조회
     * 기간 내 전체 완료/미완료 건수 합계
     */
    public CompletionSummaryDto findCompletionSummary(LocalDate from, LocalDate to) {
        String sql = """
            SELECT
              SUM(resolved_incidents)   AS resolved,
              SUM(unresolved_incidents) AS unresolved
            FROM view_stats_daily_incident_type
            WHERE stat_date BETWEEN ? AND ?
        """;

        log.debug("📊 [StatsIncident] findCompletionSummary SQL: {}", sql);

        try {
            return jdbcTemplate.queryForObject(sql, (rs, rowNum) ->
                    new CompletionSummaryDto(
                            rs.getLong("resolved"),
                            rs.getLong("unresolved")
                    ), from, to);
        } catch (EmptyResultDataAccessException e) {
            log.warn("⚠️ [StatsIncident] No completion summary found, returning default values");
            return new CompletionSummaryDto(0L, 0L);
        } catch (Exception e) {
            log.error("❌ [StatsIncident] Failed to find completion summary: {}", e.getMessage(), e);
            return new CompletionSummaryDto(0L, 0L);
        }
    }
}

