package com.example.geumjeongsan.domain.dashboard;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * 상단 KPI용 CCTV 집계 Repository
 *
 * 전제(스키마):
 * - cctv_info(cctv_id, is_active)
 * - cctv_status(cctv_id, power_status)
 */
@Repository
@RequiredArgsConstructor
@Slf4j
public class CctvKpiRepository {

    private final JdbcTemplate jdbcTemplate;

    public CctvKpi getCurrentCctvKpi() {
        final String sql = """
            SELECT
              COUNT(*) FILTER (WHERE ci.is_active = TRUE) AS total_active,
              COUNT(*) FILTER (
                WHERE ci.is_active = TRUE
                  AND COALESCE(cs.power_status, 'OFF') = 'ON'
              ) AS on_active
            FROM cctv_info ci
            LEFT JOIN cctv_status cs
              ON cs.cctv_id = ci.cctv_id
        """;

        try {
            return jdbcTemplate.queryForObject(sql, (rs, rowNum) ->
                new CctvKpi(
                    rs.getLong("total_active"),
                    rs.getLong("on_active")
                )
            );
        } catch (Exception e) {
            log.error("❌ [CctvKpiRepository] Failed to load CCTV KPI: {}", e.getMessage(), e);
            return new CctvKpi(0, 0);
        }
    }
}


