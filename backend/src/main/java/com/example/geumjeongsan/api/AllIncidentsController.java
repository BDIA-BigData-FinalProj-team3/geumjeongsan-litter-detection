package com.example.geumjeongsan.api;

import com.example.geumjeongsan.api.dto.AllIncidentDto;
import com.example.geumjeongsan.api.dto.IncidentDetailDto;
import com.example.geumjeongsan.api.dto.AllIncidentsStatsDto;
import com.example.geumjeongsan.api.dto.IncidentWorkflowUpdateRequest;
import com.example.geumjeongsan.domain.dashboard.*;
import com.example.geumjeongsan.domain.incident.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
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
    private final IncidentService incidentService;
    private final IncidentManualRepository incidentManualRepository;

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
    public IncidentDetailDto getAllIncidentDetail(@PathVariable Long id) {
        log.info("🔍 [AllIncidents] Fetching detail - id: {}", id);
        IncidentListView view = incidentListViewRepository.findById(id).orElse(null);
        
        if (view == null) {
            return null;
        }
        
        // CCTV 좌표 조회 (VIEW에 있으면 사용, 없으면 별도 조회)
        Double latitude = view.getCctvLatitude();
        Double longitude = view.getCctvLongitude();
        
        // VIEW에 좌표가 없으면 별도 조회
        if ((latitude == null || longitude == null) && view.getCctvId() != null) {
            try {
                var cctvResponse = incidentService.getCCTVById(view.getCctvId());
                if (cctvResponse != null) {
                    latitude = cctvResponse.getLatitude();
                    longitude = cctvResponse.getLongitude();
                }
            } catch (Exception e) {
                log.warn("⚠️ [AllIncidents] Failed to fetch CCTV coordinates for CCTV ID {}: {}", view.getCctvId(), e.getMessage());
            }
        }
        
        var media = incidentService.getIncidentMediaBundle(id);
        var manual = incidentManualRepository.findByIncidentId(id).orElse(null);
        return new IncidentDetailDto(view, latitude, longitude, media.clipUrl(), media.frameUrls(), manual);
    }
    
    /**
     * 사건 오탐 처리 (전체현황 페이지용)
     * POST /api/all-incidents/{id}/false-positive
     */
    @PostMapping("/{id}/false-positive")
    public Map<String, String> markIncidentAsFalsePositive(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {
        try {
            log.info("🚫 [AllIncidents] Marking as false positive - id: {}", id);
            String reason = request.get("reason");
            Long actorId = null;
            try {
                String actorIdStr = request.get("actorId");
                if (actorIdStr != null && !actorIdStr.isBlank()) actorId = Long.parseLong(actorIdStr);
            } catch (Exception ignore) {}
            incidentService.markAsFalsePositive(id, actorId, reason);
            return Map.of("message", "오탐 처리 완료");
        } catch (RuntimeException e) {
            log.error("❌ [AllIncidents] Failed to mark as false positive: {}", e.getMessage());
            throw e;
        }
    }

    /**
     * 공통 workflow 업데이트 (상태변경 + 담당자배정 + actor 기록)
     * PUT /api/all-incidents/{id}/workflow
     */
    @PutMapping("/{id}/workflow")
    public Map<String, Object> updateWorkflow(@PathVariable Long id, @RequestBody IncidentWorkflowUpdateRequest req) {
        incidentService.updateIncidentWorkflow(id, req);
        return Map.of("ok", true);
    }
}

