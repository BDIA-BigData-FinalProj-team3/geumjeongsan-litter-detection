package com.example.geumjeongsan.api;

import com.example.geumjeongsan.api.dto.AvgResponseTimeDto;
import com.example.geumjeongsan.api.dto.DailyStatsDto;
import com.example.geumjeongsan.domain.dashboard.*;
import com.example.geumjeongsan.domain.incident.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Dashboard API Controller
 * 전체현황 페이지용 API
 */
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@Slf4j
public class DashboardController {

    private final DailyStatsRepository dailyStatsRepository;
    private final AvgResponseTimeRepository avgResponseTimeRepository;
    private final IncidentListViewRepository incidentListViewRepository;

    /**
     * 일일 통계 (상단 KPI 카드)
     * GET /api/dashboard/daily-stats
     * 
     * Frontend UI 형식으로 변환:
     * [
     *   { label: '현재 총 가동 cctv', value: '25/26' },
     *   { label: '화재 사고', value: '3건' },
     *   { label: '응급 사고', value: '4건' },
     *   { label: '쓰레기 사건', value: '25건' }
     * ]
     */
    @GetMapping("/daily-stats")
    public List<DailyStatsDto> getDailyStats() {
        log.info("📊 [Dashboard] Fetching daily stats");
        
        DailyStats stats = dailyStatsRepository.findDailyStats();
        log.info("✅ [Dashboard] Loaded: todayTotal={}, pendingTotal={}", 
                stats.getTodayTotal(), stats.getPendingTotal());
        
        // TODO: CCTV 가동 현황은 별도 API에서 가져와야 함 (임시로 고정값)
        List<DailyStatsDto> result = new ArrayList<>();
        result.add(new DailyStatsDto("현재 총 가동 cctv", "25/26")); // TODO: 실제 CCTV 현황 연동
        result.add(new DailyStatsDto("화재 사고", stats.getTodayFire() + "건"));
        result.add(new DailyStatsDto("응급 사고", stats.getTodayEmergency() + "건"));
        result.add(new DailyStatsDto("쓰레기 사건", stats.getTodayTrash() + "건"));
        
        return result;
    }

    /**
     * 월평균 처리시간
     * GET /api/dashboard/avg-response-time
     * 
     * Frontend UI 형식으로 변환:
     * [
     *   { type: '응급', time: 21, change: 2, isIncrease: false },
     *   { type: '화재', time: 19, change: 5, isIncrease: true },
     *   { type: '쓰레기', time: 32, change: 2, isIncrease: true }
     * ]
     */
    @GetMapping("/avg-response-time")
    public List<AvgResponseTimeDto> getAvgResponseTime() {
        log.info("⏱️ [Dashboard] Fetching avg response time");
        
        com.example.geumjeongsan.domain.dashboard.AvgResponseTime avgTime = 
                avgResponseTimeRepository.findAvgResponseTime();
        log.info("✅ [Dashboard] Loaded avg response time");
        
        // Frontend UI 형식으로 변환
        // TODO: 전월 대비 증감률(change, isIncrease)은 추후 구현
        List<AvgResponseTimeDto> result = new ArrayList<>();
        result.add(new AvgResponseTimeDto(
                "응급", 
                avgTime.getEmergencyAvg() != null ? avgTime.getEmergencyAvg().intValue() : 0, 
                0, 
                false
        ));
        result.add(new AvgResponseTimeDto(
                "화재", 
                avgTime.getFireAvg() != null ? avgTime.getFireAvg().intValue() : 0, 
                0, 
                false
        ));
        result.add(new AvgResponseTimeDto(
                "쓰레기", 
                avgTime.getTrashAvg() != null ? avgTime.getTrashAvg().intValue() : 0, 
                0, 
                false
        ));
        
        return result;
    }

    /**
     * 전체 사건 목록 (구 버전 - 호환용)
     * GET /api/dashboard/incidents
     */
    @GetMapping("/incidents")
    public List<IncidentListView> getIncidents(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String search
    ) {
        log.info("📋 [Dashboard] Fetching incidents - status: {}, type: {}, search: {}", 
                status, type, search);

        // 검색어가 있는 경우
        if (search != null && !search.trim().isEmpty()) {
            if ("active".equals(status)) {
                List<String> activeStatuses = Arrays.asList("PENDING", "IN_PROGRESS");
                return incidentListViewRepository.searchByStatusAndKeyword(activeStatuses, search);
            } else if ("resolved".equals(status)) {
                return incidentListViewRepository.searchByStatusAndKeyword(
                        Arrays.asList("RESOLVED"), search
                );
            } else {
                return incidentListViewRepository.searchByKeyword(search);
            }
        }

        // 상태별 조회
        if ("active".equals(status)) {
            List<String> activeStatuses = Arrays.asList("PENDING", "IN_PROGRESS");
            if (type != null) {
                return incidentListViewRepository.findByStatusInAndIncidentTypeOrderByDetectedAtDesc(
                        activeStatuses, type.toUpperCase()
                );
            }
            return incidentListViewRepository.findByStatusInOrderByDetectedAtDesc(activeStatuses);
        }

        if ("resolved".equals(status)) {
            if (type != null) {
                return incidentListViewRepository.findByStatusInAndIncidentTypeOrderByDetectedAtDesc(
                        Arrays.asList("RESOLVED"), type.toUpperCase()
                );
            }
            return incidentListViewRepository.findByStatusInOrderByDetectedAtDesc(
                    Arrays.asList("RESOLVED")
            );
        }

        // 전체 조회
        if (type != null) {
            return incidentListViewRepository.findByIncidentTypeOrderByDetectedAtDesc(
                    type.toUpperCase()
            );
        }

        return incidentListViewRepository.findAll();
    }

    /**
     * 사건 상세 조회 (구 버전 - 호환용)
     * GET /api/dashboard/incidents/{id}
     */
    @GetMapping("/incidents/{id}")
    public IncidentListView getIncidentDetail(@PathVariable Long id) {
        log.info("🔍 [Dashboard] Fetching incident detail - id: {}", id);
        return incidentListViewRepository.findById(id)
                .orElse(null);
    }
}
