package com.example.geumjeongsan.api;

import com.example.geumjeongsan.api.dto.CctvUptimePointDto;
import com.example.geumjeongsan.api.dto.ModelAccuracyPointDto;
import com.example.geumjeongsan.api.dto.ResponseTimeOverviewDto;
import com.example.geumjeongsan.api.dto.StatsOverviewDto;
import com.example.geumjeongsan.domain.stats.StatsCctvUptimeService;
import com.example.geumjeongsan.domain.stats.StatsModelAccuracyService;
import com.example.geumjeongsan.domain.stats.StatsResponseTimeService;
import com.example.geumjeongsan.domain.stats.StatsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * 통계 페이지용 API Controller
 * VIEW: view_stats_daily_incident_type, view_stats_daily_cctv_uptime
 */
@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
@Slf4j
public class StatsController {

    private final StatsService statsService;
    private final StatsCctvUptimeService cctvUptimeService;
    private final StatsModelAccuracyService modelAccuracyService;
    private final StatsResponseTimeService responseTimeService;

    /**
     * 통계 페이지용 사고 통계 조회
     * 사고 비율 + 추이 + 완료율을 한 번에 반환
     * 
     * 예) GET /api/stats/incidents?unit=MONTH&from=2025-01-01&to=2025-12-31
     * 
     * @param unit 기간 단위 ("YEAR" | "MONTH" | "DAY", 기본값: "MONTH")
     * @param from 시작 날짜 (필수)
     * @param to 종료 날짜 (필수)
     * @return 통계 전체 요약 데이터
     */
    @GetMapping("/incidents")
    public StatsOverviewDto getIncidentStats(
            @RequestParam(defaultValue = "MONTH") String unit,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        log.info("📊 [StatsController] GET /api/stats/incidents - unit: {}, from: {}, to: {}", unit, from, to);
        
        StatsOverviewDto result = statsService.getIncidentStats(unit, from, to);
        
        log.info("✅ [StatsController] Returning stats overview - trend: {} points, typeSummary: {} items",
                result.trend().size(), result.typeSummary().size());
        
        return result;
    }

    /**
     * CCTV 가동률 조회
     * 
     * 예) GET /api/stats/cctv-uptime?unit=MONTH&from=2025-01-01&to=2025-12-31
     * 
     * @param unit 기간 단위 ("YEAR" | "MONTH" | "DAY", 기본값: "MONTH")
     * @param from 시작 날짜 (필수)
     * @param to 종료 날짜 (필수)
     * @return 기간별 CCTV 가동률 데이터
     */
    @GetMapping("/cctv-uptime")
    public List<CctvUptimePointDto> getCctvUptime(
            @RequestParam(defaultValue = "MONTH") String unit,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        log.info("📊 [StatsController] GET /api/stats/cctv-uptime - unit: {}, from: {}, to: {}", unit, from, to);
        
        List<CctvUptimePointDto> result = cctvUptimeService.getCctvUptime(unit, from, to);
        
        log.info("✅ [StatsController] Returning {} CCTV uptime points", result.size());
        
        return result;
    }

    /**
     * AI 모델 정확도 / 오탐률 조회
     *
     * 예) GET /api/stats/model-accuracy?unit=MONTH&from=2025-01-01&to=2025-12-31
     *
     * @param unit 기간 단위 ("YEAR" | "MONTH" | "DAY", 기본값: "MONTH")
     * @param from 시작 날짜 (필수)
     * @param to   종료 날짜 (필수)
     * @return 기간 + 유형 + 모델별 정확도 / 오탐률 데이터
     */
    @GetMapping("/model-accuracy")
    public List<ModelAccuracyPointDto> getModelAccuracy(
            @RequestParam(defaultValue = "MONTH") String unit,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        log.info("📊 [StatsController] GET /api/stats/model-accuracy - unit: {}, from: {}, to: {}", unit, from, to);

        List<ModelAccuracyPointDto> result = modelAccuracyService.getModelAccuracy(unit, from, to);

        log.info("✅ [StatsController] Returning {} model accuracy points", result.size());

        return result;
    }

    /**
     * 평균 대응시간 조회
     *
     * 예) GET /api/stats/response-time?unit=MONTH&from=2025-01-01&to=2025-12-31
     *
     * @param unit 기간 단위 ("YEAR" | "MONTH" | "DAY", 기본값: "MONTH")
     * @param from 시작 날짜 (필수)
     * @param to   종료 날짜 (필수)
     * @return 기간별 평균 대응시간 (전체/유형별 + 전월/전년 대비)
     */
    @GetMapping("/response-time")
    public ResponseTimeOverviewDto getResponseTime(
            @RequestParam(defaultValue = "MONTH") String unit,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        log.info("⏱️ [StatsController] GET /api/stats/response-time - unit: {}, from: {}, to: {}", unit, from, to);

        ResponseTimeOverviewDto result = responseTimeService.getResponseTime(unit, from, to);

        log.info("✅ [StatsController] Returning {} response time items", result.items().size());

        return result;
    }
}

