package com.example.geumjeongsan.api;

import com.example.geumjeongsan.api.dto.MajorIncidentDto;
import com.example.geumjeongsan.api.dto.MonthlyStatsResponse;
import com.example.geumjeongsan.domain.report.ReportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 월간보고서 API Controller
 * VIEW: view_report_daily_incident_type, view_report_daily_cctv_uptime,
 *       view_report_daily_response_time, view_report_incident_list
 */
@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@Slf4j
public class ReportController {

    private final ReportService reportService;

    /**
     * 월간 통계 조회
     * 
     * 예) GET /api/reports/monthly-stats?month=2025-12
     */
    @GetMapping("/monthly-stats")
    public MonthlyStatsResponse getMonthlyStats(@RequestParam String month) {
        log.info("📊 [ReportController] GET /api/reports/monthly-stats - month: {}", month);
        return reportService.getMonthlyStats(month);
    }

    /**
     * 주요 사건 목록 조회
     * 
     * 예) GET /api/reports/major-incidents?month=2025-12
     */
    @GetMapping("/major-incidents")
    public List<MajorIncidentDto> getMajorIncidents(@RequestParam String month) {
        log.info("📋 [ReportController] GET /api/reports/major-incidents - month: {}", month);
        return reportService.getMajorIncidents(month);
    }

    /**
     * 가능한 월 목록 조회
     * 
     * 예) GET /api/reports/available-months
     */
    @GetMapping("/available-months")
    public List<String> getAvailableMonths() {
        log.info("📅 [ReportController] GET /api/reports/available-months");
        return reportService.getAvailableMonths();
    }
}

