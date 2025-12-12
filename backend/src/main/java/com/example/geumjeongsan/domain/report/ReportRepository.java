package com.example.geumjeongsan.domain.report;

import com.example.geumjeongsan.api.dto.MajorIncidentDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.ResultSetExtractor;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 월간보고서용 Repository
 * VIEW: view_report_daily_incident_type, view_report_daily_cctv_uptime,
 *       view_report_daily_response_time, view_report_incident_list
 */
@Repository
@RequiredArgsConstructor
@Slf4j
public class ReportRepository {

    private final JdbcTemplate jdbcTemplate;

    /**
     * 월간 사고 유형별 통계 조회
     * @return Map<String, Object[]> - key: incident_type, value: [total, resolved, pending]
     */
    public Map<String, Object[]> getMonthlyIncidentStats(LocalDate monthStart, LocalDate monthEnd) {
        String sql = """
            SELECT
                incident_type,
                SUM(total_incidents) AS total,
                SUM(resolved_incidents) AS resolved,
                SUM(unresolved_incidents) AS pending
            FROM view_report_daily_incident_type
            WHERE stat_date BETWEEN ? AND ?
            GROUP BY incident_type
        """;
        
        log.debug("📊 [ReportRepo] getMonthlyIncidentStats: {} ~ {}", monthStart, monthEnd);
        
        try {
            return jdbcTemplate.query(sql, new ResultSetExtractor<Map<String, Object[]>>() {
                @Override
                public Map<String, Object[]> extractData(ResultSet rs) throws SQLException {
                    Map<String, Object[]> result = new HashMap<>();
                    while (rs.next()) {
                        String type = rs.getString("incident_type");
                        result.put(type, new Object[]{
                            rs.getInt("total"),
                            rs.getInt("resolved"),
                            rs.getInt("pending")
                        });
                    }
                    return result;
                }
            }, monthStart, monthEnd);
        } catch (Exception e) {
            log.error("❌ [ReportRepo] Failed to get monthly incident stats: {}", e.getMessage(), e);
            return new HashMap<>();
        }
    }

    /**
     * 월간 평균 대응시간 조회 (유형별)
     * @return Map<String, Double> - key: incident_type, value: 평균 분
     */
    public Map<String, Double> getMonthlyResponseTime(LocalDate monthStart, LocalDate monthEnd) {
        String sql = """
            SELECT
                incident_type,
                ROUND(AVG(avg_sec_to_resolve) / 60, 1) AS avg_response_min
            FROM view_report_daily_response_time
            WHERE stat_date BETWEEN ? AND ?
            GROUP BY incident_type
        """;
        
        log.debug("⏱️ [ReportRepo] getMonthlyResponseTime: {} ~ {}", monthStart, monthEnd);
        
        try {
            return jdbcTemplate.query(sql, new ResultSetExtractor<Map<String, Double>>() {
                @Override
                public Map<String, Double> extractData(ResultSet rs) throws SQLException {
                    Map<String, Double> result = new HashMap<>();
                    while (rs.next()) {
                        result.put(rs.getString("incident_type"), rs.getDouble("avg_response_min"));
                    }
                    return result;
                }
            }, monthStart, monthEnd);
        } catch (Exception e) {
            log.error("❌ [ReportRepo] Failed to get monthly response time: {}", e.getMessage(), e);
            return new HashMap<>();
        }
    }

    /**
     * 월간 source_type별 통계 조회 (AUTO vs MANUAL)
     * @return Map<String, Integer> - key: source_type (AUTO/MANUAL), value: 총수
     */
    public Map<String, Integer> getMonthlySourceTypeStats(LocalDate monthStart, LocalDate monthEnd) {
        String sql = """
            SELECT
                source_type,
                SUM(total_incidents) AS total
            FROM view_report_daily_incident_type
            WHERE stat_date BETWEEN ? AND ?
            GROUP BY source_type
        """;
        
        log.debug("🤖 [ReportRepo] getMonthlySourceTypeStats: {} ~ {}", monthStart, monthEnd);
        
        try {
            return jdbcTemplate.query(sql, new ResultSetExtractor<Map<String, Integer>>() {
                @Override
                public Map<String, Integer> extractData(ResultSet rs) throws SQLException {
                    Map<String, Integer> result = new HashMap<>();
                    while (rs.next()) {
                        result.put(rs.getString("source_type"), rs.getInt("total"));
                    }
                    return result;
                }
            }, monthStart, monthEnd);
        } catch (Exception e) {
            log.error("❌ [ReportRepo] Failed to get monthly source type stats: {}", e.getMessage(), e);
            return new HashMap<>();
        }
    }

    /**
     * 월간 CCTV 운영율 조회
     * @return [avgOn, avgOff]
     */
    public int[] getMonthlyCctvStats(LocalDate monthStart, LocalDate monthEnd) {
        String sql = """
            SELECT
                ROUND(AVG(on_samples)) AS avg_on,
                ROUND(AVG(off_samples)) AS avg_off
            FROM view_report_daily_cctv_uptime
            WHERE stat_date BETWEEN ? AND ?
        """;
        
        log.debug("📹 [ReportRepo] getMonthlyCctvStats: {} ~ {}", monthStart, monthEnd);
        
        try {
            return jdbcTemplate.queryForObject(sql, (rs, rowNum) -> new int[]{
                rs.getInt("avg_on"),
                rs.getInt("avg_off")
            }, monthStart, monthEnd);
        } catch (EmptyResultDataAccessException e) {
            log.warn("⚠️ [ReportRepo] No CCTV stats found, returning default values");
            return new int[]{0, 0};
        } catch (Exception e) {
            log.error("❌ [ReportRepo] Failed to get monthly CCTV stats: {}", e.getMessage(), e);
            return new int[]{0, 0};
        }
    }

    /**
     * 주요 사건 목록 조회
     */
    public List<MajorIncidentDto> getMajorIncidents(LocalDate selectedMonth, int limit) {
        // view_report_incident_list에는 source_type이 없으므로 incident 테이블과 조인
        String sql = """
            SELECT
                v.incident_id,
                v.detected_at::date AS date,
                v.incident_type,
                v.location_desc,
                v.severity_level,
                v.status,
                i.source_type
            FROM view_report_incident_list v
            JOIN incident i ON i.incident_id = v.incident_id
            WHERE v.report_month = ?
            ORDER BY v.detected_at DESC
            LIMIT ?
        """;
        
        log.debug("📋 [ReportRepo] getMajorIncidents: {}, limit: {}", selectedMonth, limit);
        
        try {
            return jdbcTemplate.query(sql, (rs, rowNum) -> new MajorIncidentDto(
                rs.getLong("incident_id"),
                rs.getDate("date").toLocalDate(),
                rs.getString("incident_type"),
                rs.getString("location_desc"),
                rs.getString("severity_level"),
                rs.getString("status"),
                rs.getString("source_type")
            ), selectedMonth, limit);
        } catch (Exception e) {
            log.error("❌ [ReportRepo] Failed to get major incidents: {}", e.getMessage(), e);
            return List.of();
        }
    }

    /**
     * 가능한 월 목록 조회
     */
    public List<String> getAvailableMonths() {
        String sql = """
            SELECT DISTINCT 
                TO_CHAR(stat_date, 'YYYY-MM') AS month_str
            FROM view_report_daily_incident_type
            WHERE stat_date IS NOT NULL
            ORDER BY month_str DESC
            LIMIT 24
        """;
        
        log.debug("📅 [ReportRepo] getAvailableMonths");
        
        try {
            return jdbcTemplate.queryForList(sql, String.class);
        } catch (Exception e) {
            log.error("❌ [ReportRepo] Failed to get available months: {}", e.getMessage(), e);
            return List.of();
        }
    }
}

