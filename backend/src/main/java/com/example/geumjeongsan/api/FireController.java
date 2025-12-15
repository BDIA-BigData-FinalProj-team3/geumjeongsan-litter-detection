package com.example.geumjeongsan.api;

import com.example.geumjeongsan.api.dto.AllIncidentDto;
import com.example.geumjeongsan.api.dto.IncidentDetailDto;
import com.example.geumjeongsan.api.dto.FireCreateRequest;
import com.example.geumjeongsan.api.dto.FireUpdateRequest;
import com.example.geumjeongsan.api.dto.FireIncidentItem;
import com.example.geumjeongsan.api.dto.IncidentCreateResponse;
import com.example.geumjeongsan.api.dto.SimpleHotspotDto;
import com.example.geumjeongsan.api.dto.FireStatsDto;
import com.example.geumjeongsan.domain.dashboard.DailyStats;
import com.example.geumjeongsan.domain.dashboard.DailyStatsRepository;
import com.example.geumjeongsan.domain.dashboard.AvgResponseTime;
import com.example.geumjeongsan.domain.dashboard.AvgResponseTimeRepository;
import com.example.geumjeongsan.domain.incident.FireService;
import com.example.geumjeongsan.domain.incident.IncidentListView;
import com.example.geumjeongsan.domain.incident.IncidentListViewRepository;
import com.example.geumjeongsan.domain.incident.IncidentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

/**
 * 화재 현황 API Controller
 * 사용 VIEW: view_all_incidents_daily_stats, view_all_incidents_avg_response_time, view_all_incidents_list
 */
@RestController
@RequestMapping("/api/fire")
@RequiredArgsConstructor
@Slf4j
public class FireController {

    private final DailyStatsRepository dailyStatsRepository;
    private final AvgResponseTimeRepository avgResponseTimeRepository;
    private final IncidentListViewRepository incidentListViewRepository;
    private final FireService fireService;
    private final IncidentService incidentService;

    /**
     * 화재 통계
     * GET /api/fire/stats
     */
    @GetMapping("/stats")
    public FireStatsDto getFireStats() {
        log.info("📊 [Fire] Fetching stats");
        
        DailyStats dailyStats = dailyStatsRepository.findDailyStats();
        AvgResponseTime avgTime = avgResponseTimeRepository.findAvgResponseTime();
        
        // 화재 타입의 대기중 건수 (PENDING, IN_PROGRESS)
        List<String> pendingStatuses = Arrays.asList("PENDING", "IN_PROGRESS");
        long firePendingCount = incidentListViewRepository
                .findByStatusInAndIncidentTypeOrderByDetectedAtDesc(pendingStatuses, "FIRE")
                .size();
        
        return FireStatsDto.builder()
                .todayCount(dailyStats.getTodayFire())
                .pendingCount(firePendingCount)
                .avgResponseTime(avgTime.getFireAvg() != null ? avgTime.getFireAvg() : 0.0)
                .avgResponseTimeFormatted(formatResponseTime(avgTime.getFireAvg()))
                .build();
    }

    /**
     * 화재 다발구간
     * GET /api/fire/hotspots
     */
    @GetMapping("/hotspots")
    public List<SimpleHotspotDto> getFireHotspots(
            @RequestParam(defaultValue = "this_month") String period,
            @RequestParam(defaultValue = "1") Long limit
    ) {
        log.info("📍 [Fire] Fetching hotspots - period: {}, limit: {}", period, limit);
        
        List<IncidentListView> fireList = incidentListViewRepository
                .findByIncidentTypeOrderByDetectedAtDesc("FIRE");
        
        Map<String, Long> locationCount = fireList.stream()
                .filter(incident -> incident.getCctvAddress() != null)
                .collect(Collectors.groupingBy(
                        IncidentListView::getCctvAddress,
                        Collectors.counting()
                ));
        
        return locationCount.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(limit)
                .map(entry -> new SimpleHotspotDto(entry.getKey(), entry.getValue().intValue()))
                .collect(Collectors.toList());
    }
    
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
     * 진행중 화재 목록
     * GET /api/fire/active
     */
    @GetMapping("/active")
    public List<AllIncidentDto> getActiveFires() {
        log.info("📋 [Fire] Fetching active list");
        
        // 전체현황과 동일한 방식: 타입 필터링 없이 전체 조회 후 프론트에서 필터링
        List<String> activeStatuses = Arrays.asList("PENDING", "IN_PROGRESS");
        List<IncidentListView> viewList = incidentListViewRepository
                .findByStatusInOrderByDetectedAtDesc(activeStatuses);
        
        return viewList.stream()
                .map(AllIncidentDto::new)
                .collect(Collectors.toList());
    }

    /**
     * 처리완료 화재 목록
     * GET /api/fire/completed
     */
    @GetMapping("/completed")
    public List<AllIncidentDto> getCompletedFires() {
        log.info("📋 [Fire] Fetching completed list");
        
        // 전체현황과 동일한 방식
        List<IncidentListView> viewList = incidentListViewRepository
                .findByStatusInOrderByDetectedAtDesc(Arrays.asList("RESOLVED"));
        
        return viewList.stream()
                .map(AllIncidentDto::new)
                .collect(Collectors.toList());
    }

    /**
     * 화재 사건 상세
     * GET /api/fire/detail/{id}
     */
    @GetMapping("/detail/{id}")
    public IncidentDetailDto getFireDetail(@PathVariable Long id) {
        log.info("🔍 [Fire] Fetching detail - id: {}", id);
        IncidentListView view = incidentListViewRepository.findById(id).orElse(null);
        
        if (view != null && !"FIRE".equals(view.getIncidentType())) {
            log.warn("⚠️ [Fire] Incident {} is not FIRE type", id);
            return null;
        }
        
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
                log.warn("⚠️ [Fire] Failed to fetch CCTV coordinates for CCTV ID {}: {}", view.getCctvId(), e.getMessage());
            }
        }
        
        return new IncidentDetailDto(view, latitude, longitude);
    }
    
    /**
     * 신규 화재 사건 등록
     * POST /api/fire/create
     */
    @PostMapping("/create")
    public IncidentCreateResponse createFire(@RequestBody FireCreateRequest request) {
        try {
            log.info("➕ [Fire] Creating new fire incident: {}", request);
            return fireService.createFire(request);
        } catch (Exception e) {
            log.error("❌ [Fire] Failed to create fire: {}", e.getMessage(), e);
            throw e;
        }
    }
    
    /**
     * 화재 사건 수정
     * PUT /api/fire/{id}
     */
    @PutMapping("/{id}")
    public FireIncidentItem updateFire(@PathVariable Long id, @RequestBody FireUpdateRequest request) {
        log.info("✏️ [Fire] Updating fire incident - id: {}", id);
        return fireService.updateFire(id, request);
    }
    
    /**
     * 화재 사건 상세정보 업데이트 (수동 등록)
     * PUT /api/fire/{id}/detail
     */
    @PutMapping("/{id}/detail")
    public Map<String, String> updateFireDetail(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {
        try {
            log.info("✏️ [Fire] Updating fire detail - id: {}", id);
            
            fireService.updateFireDetail(
                    id,
                    request.get("memo"),
                    request.get("severity")
            );
            return Map.of("message", "수정 완료");
        } catch (RuntimeException e) {
            log.error("❌ [Fire] Failed to update detail: {}", e.getMessage());
            throw e;
        }
    }
    
    /**
     * 화재 사건 오탐 처리
     * POST /api/fire/{id}/false-positive
     */
    @PostMapping("/{id}/false-positive")
    public Map<String, String> markFireAsFalsePositive(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {
        try {
            log.info("🚫 [Fire] Marking as false positive - id: {}", id);
            String reason = request.get("reason");
            incidentService.markAsFalsePositive(id, reason);
            return Map.of("message", "오탐 처리 완료");
        } catch (RuntimeException e) {
            log.error("❌ [Fire] Failed to mark as false positive: {}", e.getMessage());
            throw e;
        }
    }
}
