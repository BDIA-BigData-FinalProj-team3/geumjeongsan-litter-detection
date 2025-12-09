package com.example.geumjeongsan.api;

import com.example.geumjeongsan.api.dto.AllIncidentDto;
import com.example.geumjeongsan.api.dto.EmergencyCreateRequest;
import com.example.geumjeongsan.api.dto.IncidentCreateResponse;
import com.example.geumjeongsan.api.dto.SimpleHotspotDto;
import com.example.geumjeongsan.api.dto.EmergencyStatsDto;
import com.example.geumjeongsan.domain.dashboard.DailyStats;
import com.example.geumjeongsan.domain.dashboard.DailyStatsRepository;
import com.example.geumjeongsan.domain.dashboard.AvgResponseTime;
import com.example.geumjeongsan.domain.dashboard.AvgResponseTimeRepository;
import com.example.geumjeongsan.domain.incident.EmergencyService;
import com.example.geumjeongsan.domain.incident.IncidentListView;
import com.example.geumjeongsan.domain.incident.IncidentListViewRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

/**
 * 응급 현황 API Controller
 * 제공하는 VIEW 사용: view_all_incidents_daily_stats, view_all_incidents_avg_response_time, view_all_incidents_list
 */
@RestController
@RequestMapping("/api/emergency")
@RequiredArgsConstructor
@Slf4j
public class EmergencyController {

    private final DailyStatsRepository dailyStatsRepository;
    private final AvgResponseTimeRepository avgResponseTimeRepository;
    private final IncidentListViewRepository incidentListViewRepository;
    private final EmergencyService emergencyService;

    /**
     * 응급 통계
     * GET /api/emergency/stats
     */
    @GetMapping("/stats")
    public EmergencyStatsDto getEmergencyStats() {
        log.info("📊 [Emergency] Fetching stats");
        
        DailyStats dailyStats = dailyStatsRepository.findDailyStats();
        AvgResponseTime avgTime = avgResponseTimeRepository.findAvgResponseTime();
        
        // 응급 타입의 대기중 건수 (PENDING, IN_PROGRESS)
        List<String> pendingStatuses = Arrays.asList("PENDING", "IN_PROGRESS");
        long emergencyPendingCount = incidentListViewRepository
                .findByStatusInAndIncidentTypeOrderByDetectedAtDesc(pendingStatuses, "EMERGENCY")
                .size();
        
        return EmergencyStatsDto.builder()
                .todayCount(dailyStats.getTodayEmergency())
                .pendingCount(emergencyPendingCount)
                .avgResponseTime(avgTime.getEmergencyAvg() != null ? avgTime.getEmergencyAvg() : 0.0)
                .avgResponseTimeFormatted(formatResponseTime(avgTime.getEmergencyAvg()))
                .build();
    }

    /**
     * 응급 다발구간
     * GET /api/emergency/hotspots
     */
    @GetMapping("/hotspots")
    public List<SimpleHotspotDto> getEmergencyHotspots(
            @RequestParam(defaultValue = "this_month") String period,
            @RequestParam(defaultValue = "1") Long limit
    ) {
        log.info("📍 [Emergency] Fetching hotspots - period: {}, limit: {}", period, limit);
        
        // view_all_incidents_list에서 응급 사건만 조회 후 CCTV별 집계
        List<IncidentListView> emergencyList = incidentListViewRepository
                .findByIncidentTypeOrderByDetectedAtDesc("EMERGENCY");
        
        // CCTV 주소별 카운트
        Map<String, Long> locationCount = emergencyList.stream()
                .filter(incident -> incident.getCctvAddress() != null)
                .collect(Collectors.groupingBy(
                        IncidentListView::getCctvAddress,
                        Collectors.counting()
                ));
        
        // 상위 limit개만 반환
        return locationCount.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(limit)
                .map(entry -> new SimpleHotspotDto(entry.getKey(), entry.getValue().intValue()))
                .collect(Collectors.toList());
    }
    
    /**
     * 응답시간 포맷 변환
     */
    private String formatResponseTime(Double minutes) {
        if (minutes == null || minutes == 0.0) {
            return "-";
        }
        
        long totalMinutes = Math.round(minutes);
        
        if (totalMinutes < 60) {
            return totalMinutes + "분";
        }
        
        long hours = totalMinutes / 60;
        long mins = totalMinutes % 60;
        
        if (mins == 0) {
            return hours + "시간";
        }
        
        return hours + "시간 " + mins + "분";
    }

    /**
     * 진행중 응급 목록
     * GET /api/emergency/active
     */
    @GetMapping("/active")
    public List<AllIncidentDto> getActiveEmergencies() {
        log.info("📋 [Emergency] Fetching active list");
        
        List<String> activeStatuses = Arrays.asList("PENDING", "IN_PROGRESS");
        List<IncidentListView> viewList = incidentListViewRepository
                .findByStatusInAndIncidentTypeOrderByDetectedAtDesc(activeStatuses, "EMERGENCY");
        
        return viewList.stream()
                .map(AllIncidentDto::new)
                .collect(Collectors.toList());
    }

    /**
     * 처리완료 응급 목록
     * GET /api/emergency/completed
     */
    @GetMapping("/completed")
    public List<AllIncidentDto> getCompletedEmergencies() {
        log.info("📋 [Emergency] Fetching completed list");
        
        List<IncidentListView> viewList = incidentListViewRepository
                .findByStatusInAndIncidentTypeOrderByDetectedAtDesc(
                        Arrays.asList("RESOLVED"), 
                        "EMERGENCY"
                );
        
        return viewList.stream()
                .map(AllIncidentDto::new)
                .collect(Collectors.toList());
    }

    /**
     * 응급 사건 상세
     * GET /api/emergency/detail/{id}
     */
    @GetMapping("/detail/{id}")
    public AllIncidentDto getEmergencyDetail(@PathVariable Long id) {
        log.info("🔍 [Emergency] Fetching detail - id: {}", id);
        IncidentListView view = incidentListViewRepository.findById(id).orElse(null);
        
        // 응급 타입이 맞는지 검증
        if (view != null && !"EMERGENCY".equals(view.getIncidentType())) {
            log.warn("⚠️ [Emergency] Incident {} is not EMERGENCY type", id);
            return null;
        }
        
        return view != null ? new AllIncidentDto(view) : null;
    }
    
    /**
     * 신규 응급 사건 등록
     * POST /api/emergency/create
     */
    @PostMapping("/create")
    public ResponseEntity<?> createEmergency(@RequestBody EmergencyCreateRequest request) {
        try {
            log.info("➕ [Emergency] Creating new emergency incident: {}", request);
            IncidentCreateResponse response = emergencyService.createEmergency(request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.error("❌ [Emergency] Validation error: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("❌ [Emergency] Failed to create emergency: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage(), "details", e.getClass().getSimpleName()));
        }
    }
}
