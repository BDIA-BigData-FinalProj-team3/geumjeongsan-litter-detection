package com.example.geumjeongsan.api;

import com.example.geumjeongsan.api.dto.AllIncidentDto;
import com.example.geumjeongsan.api.dto.AllIncidentsStatsDto;
import com.example.geumjeongsan.domain.dashboard.*;
import com.example.geumjeongsan.domain.incident.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 전체현황 페이지 API Controller
 * 경로: /api/all-incidents/*
 */
@RestController
@RequestMapping("/api/all-incidents")
@RequiredArgsConstructor
@Slf4j
public class AllIncidentsController {

    private final DailyStatsRepository dailyStatsRepository;
    private final AvgResponseTimeRepository avgResponseTimeRepository;
    private final IncidentListViewRepository incidentListViewRepository;

    /**
     * 전체현황 페이지 상단 통계
     * GET /api/all-incidents/stats
     * Frontend 형식: { todayCount, pendingCount, avgResponseTime, avgResponseTimeFormatted, hotspotLocation }
     */
    @GetMapping("/stats")
    public AllIncidentsStatsDto getAllIncidentsStats() {
        log.info("📊 [AllIncidents] Fetching stats");
        DailyStats dailyStats = dailyStatsRepository.findDailyStats();
        com.example.geumjeongsan.domain.dashboard.AvgResponseTime avgTime = 
                avgResponseTimeRepository.findAvgResponseTime();
        return new AllIncidentsStatsDto(dailyStats, avgTime);
    }

    /**
     * 전체 사건 목록 (전체현황 페이지용)
     * GET /api/all-incidents/list
     * 
     * 쿼리 파라미터:
     * - status: 'active' (진행중) | 'completed' (처리완료)
     * - search: 검색어 (사고코드, CCTV ID, 지역명)
     * 
     * Frontend 형식으로 변환:
     * - type: '화재', '응급', '쓰레기' (한글)
     * - status: '대기중', '진화중', '처리완료' 등 (한글)
     * - severity: '상', '중', '하' (한글)
     */
    @GetMapping("/list")
    public List<AllIncidentDto> getAllIncidentsList(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search
    ) {
        log.info("📋 [AllIncidents] Fetching list - status: {}, search: {}", status, search);

        List<IncidentListView> viewList;

        // 검색어가 있는 경우
        if (search != null && !search.trim().isEmpty()) {
            if ("active".equals(status)) {
                List<String> activeStatuses = Arrays.asList("PENDING", "IN_PROGRESS");
                viewList = incidentListViewRepository.searchByStatusAndKeyword(activeStatuses, search);
            } else if ("completed".equals(status)) {
                viewList = incidentListViewRepository.searchByStatusAndKeyword(
                        Arrays.asList("RESOLVED"), search
                );
            } else {
                viewList = incidentListViewRepository.searchByKeyword(search);
            }
        }
        // 상태별 조회
        else if ("active".equals(status)) {
            List<String> activeStatuses = Arrays.asList("PENDING", "IN_PROGRESS");
            viewList = incidentListViewRepository.findByStatusInOrderByDetectedAtDesc(activeStatuses);
            log.info("✅ [AllIncidents] Active list count: {}", viewList.size());
        } else if ("completed".equals(status)) {
            viewList = incidentListViewRepository.findByStatusInOrderByDetectedAtDesc(
                    Arrays.asList("RESOLVED")
            );
            log.info("✅ [AllIncidents] Completed list count: {}", viewList.size());
        } else {
            // 전체 조회
            viewList = incidentListViewRepository.findAll();
            log.info("✅ [AllIncidents] All list count: {}", viewList.size());
        }

        // Frontend 형식으로 변환 (Backend에서 모든 가공 처리)
        List<AllIncidentDto> result = viewList.stream()
                .map(AllIncidentDto::new)
                .collect(Collectors.toList());
        
        log.info("✅ [AllIncidents] Returning {} incidents", result.size());
        return result;
    }

    /**
     * 사건 상세 조회 (전체현황 페이지용)
     * GET /api/all-incidents/detail/{id}
     * Frontend 형식으로 변환
     */
    @GetMapping("/detail/{id}")
    public AllIncidentDto getAllIncidentDetail(@PathVariable Long id) {
        log.info("🔍 [AllIncidents] Fetching detail - id: {}", id);
        IncidentListView view = incidentListViewRepository.findById(id).orElse(null);
        return view != null ? new AllIncidentDto(view) : null;
    }
}

