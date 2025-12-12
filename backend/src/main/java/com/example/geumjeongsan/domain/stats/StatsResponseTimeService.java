package com.example.geumjeongsan.domain.stats;

import com.example.geumjeongsan.api.dto.ResponseTimeItemDto;
import com.example.geumjeongsan.api.dto.ResponseTimeOverviewDto;
import com.example.geumjeongsan.api.dto.ResponseTimePointDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 평균 대응시간 통계 Service
 * VIEW: view_stats_daily_response_time
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class StatsResponseTimeService {

    private final StatsResponseTimeRepository responseTimeRepository;

    /**
     * 기간 + 단위별 평균 대응시간 조회 (전체/유형별 + 전월/전년 대비)
     */
    public ResponseTimeOverviewDto getResponseTime(String unit, LocalDate from, LocalDate to) {
        log.info("⏱️ [StatsResponseTimeService] getResponseTime - unit: {}, from: {}, to: {}", unit, from, to);

        List<ResponseTimePointDto> points = responseTimeRepository.findResponseTime(from, to, unit);

        if (points.isEmpty()) {
            log.warn("⚠️ [StatsResponseTimeService] No data found, returning default values");
            return new ResponseTimeOverviewDto(List.of(
                    new ResponseTimeItemDto("전체", 0, 0, false),
                    new ResponseTimeItemDto("응급", 0, 0, false),
                    new ResponseTimeItemDto("화재", 0, 0, false),
                    new ResponseTimeItemDto("쓰레기", 0, 0, false),
                    new ResponseTimeItemDto("낙석", 0, 0, false)
            ));
        }

        // 1) 마지막 기간(latestPeriod)과 직전 기간(prevPeriod) 계산
        LocalDate latestPeriod = points.stream()
                .map(ResponseTimePointDto::period)
                .max(LocalDate::compareTo)
                .orElseThrow();

        LocalDate prevPeriod = switch (unit) {
            case "YEAR"  -> latestPeriod.minusYears(1);
            case "MONTH" -> latestPeriod.minusMonths(1);
            default      -> latestPeriod.minusDays(1);
        };

        log.debug("📅 [StatsResponseTimeService] latestPeriod: {}, prevPeriod: {}", latestPeriod, prevPeriod);

        // 2) 현재 기간(latestPeriod) 데이터 집계
        Map<String, Double> currentByType = new HashMap<>();
        double currentTotal = 0.0;
        int currentTotalCount = 0;

        for (ResponseTimePointDto point : points) {
            if (point.period().equals(latestPeriod)) {
                String type = point.incidentType();
                double sec = point.avgSecToResolve();
                currentByType.put(type, currentByType.getOrDefault(type, 0.0) + sec);
                currentTotal += sec;
                currentTotalCount++;
            }
        }

        // 3) 이전 기간(prevPeriod) 데이터 집계
        Map<String, Double> prevByType = new HashMap<>();
        double prevTotal = 0.0;
        int prevTotalCount = 0;

        for (ResponseTimePointDto point : points) {
            if (point.period().equals(prevPeriod)) {
                String type = point.incidentType();
                double sec = point.avgSecToResolve();
                prevByType.put(type, prevByType.getOrDefault(type, 0.0) + sec);
                prevTotal += sec;
                prevTotalCount++;
            }
        }

        // 4) 전체 평균 계산 (초 → 분 변환, 증감률 계산)
        List<ResponseTimeItemDto> items = new ArrayList<>();

        // 4-1) 전체
        double currentAvgSec = currentTotalCount > 0 ? currentTotal / currentTotalCount : 0.0;
        double prevAvgSec = prevTotalCount > 0 ? prevTotal / prevTotalCount : 0.0;
        int currentTimeMin = (int) Math.round(currentAvgSec / 60.0);
        int prevTimeMin = (int) Math.round(prevAvgSec / 60.0);
        int change = calculateChangePercent(prevTimeMin, currentTimeMin);
        boolean isIncrease = currentTimeMin > prevTimeMin;

        items.add(new ResponseTimeItemDto("전체", currentTimeMin, change, isIncrease));

        // 4-2) 유형별 (응급, 화재, 쓰레기, 낙석)
        Map<String, String> typeLabelMap = Map.of(
                "EMERGENCY", "응급",
                "FIRE", "화재",
                "TRASH", "쓰레기",
                "ROCKFALL", "낙석"
        );

        for (Map.Entry<String, String> entry : typeLabelMap.entrySet()) {
            String typeCode = entry.getKey();
            String typeLabel = entry.getValue();

            double currentTypeSec = currentByType.getOrDefault(typeCode, 0.0);
            double prevTypeSec = prevByType.getOrDefault(typeCode, 0.0);

            // 유형별로는 평균이 아니라 합계를 사용 (VIEW에서 이미 평균이므로)
            // 단, 여러 period가 있을 수 있으므로 평균 계산
            int currentTypeMin = (int) Math.round(currentTypeSec / 60.0);
            int prevTypeMin = (int) Math.round(prevTypeSec / 60.0);

            // 이전 기간 데이터가 없으면 change = 0
            int typeChange = prevTypeMin > 0 ? calculateChangePercent(prevTypeMin, currentTypeMin) : 0;
            boolean typeIsIncrease = currentTypeMin > prevTypeMin;

            items.add(new ResponseTimeItemDto(typeLabel, currentTypeMin, typeChange, typeIsIncrease));
        }

        log.info("✅ [StatsResponseTimeService] Calculated {} response time items", items.size());

        return new ResponseTimeOverviewDto(items);
    }

    /**
     * 전월/전년 대비 증감률 % 계산 (절대값)
     */
    private int calculateChangePercent(int prev, int current) {
        if (prev == 0) {
            return 0;
        }
        double change = ((double) (current - prev) / prev) * 100.0;
        return (int) Math.round(Math.abs(change));
    }
}

