package com.example.geumjeongsan.domain.stats;

import com.example.geumjeongsan.api.dto.CompletionSummaryDto;
import com.example.geumjeongsan.api.dto.IncidentTrendPointDto;
import com.example.geumjeongsan.api.dto.IncidentTypeSummaryDto;
import com.example.geumjeongsan.api.dto.StatsOverviewDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

/**
 * 통계 데이터 Service
 * VIEW: view_stats_daily_incident_type
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class StatsService {

    private final StatsIncidentRepository incidentRepository;

    /**
     * 통계 페이지용 사고 통계 전체 조회
     * 
     * @param unit 기간 단위 ("YEAR" | "MONTH" | "DAY")
     * @param from 시작 날짜
     * @param to 종료 날짜
     * @return 사고 추이 + 유형별 요약 + 완료율 요약
     */
    public StatsOverviewDto getIncidentStats(String unit, LocalDate from, LocalDate to) {
        log.info("📊 [StatsService] getIncidentStats - unit: {}, from: {}, to: {}", unit, from, to);

        List<IncidentTrendPointDto> trend = incidentRepository.findIncidentTrend(from, to, unit);
        List<IncidentTypeSummaryDto> typeSummary = incidentRepository.findTypeSummary(from, to, unit);
        CompletionSummaryDto completion = incidentRepository.findCompletionSummary(from, to);

        log.info("✅ [StatsService] Loaded - trend: {} points, typeSummary: {} items, completion: resolved={}, unresolved={}",
                trend.size(), typeSummary.size(), completion.resolved(), completion.unresolved());

        return new StatsOverviewDto(trend, typeSummary, completion);
    }
}

