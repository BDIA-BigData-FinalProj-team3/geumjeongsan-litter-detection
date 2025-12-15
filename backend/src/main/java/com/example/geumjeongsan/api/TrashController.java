package com.example.geumjeongsan.api;

import com.example.geumjeongsan.api.dto.AllIncidentDto;
import com.example.geumjeongsan.api.dto.IncidentDetailDto;
import com.example.geumjeongsan.api.dto.IncidentCreateResponse;
import com.example.geumjeongsan.api.dto.SimpleHotspotDto;
import com.example.geumjeongsan.api.dto.TrashCreateRequest;
import com.example.geumjeongsan.api.dto.TrashUpdateRequest;
import com.example.geumjeongsan.api.dto.TrashIncidentItem;
import com.example.geumjeongsan.api.dto.TrashStatsDto;
import com.example.geumjeongsan.domain.dashboard.DailyStats;
import com.example.geumjeongsan.domain.dashboard.DailyStatsRepository;
import com.example.geumjeongsan.domain.dashboard.AvgResponseTime;
import com.example.geumjeongsan.domain.dashboard.AvgResponseTimeRepository;
import com.example.geumjeongsan.domain.incident.IncidentListView;
import com.example.geumjeongsan.domain.incident.IncidentListViewRepository;
import com.example.geumjeongsan.domain.incident.TrashService;
import com.example.geumjeongsan.domain.incident.IncidentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

/**
 * 쓰레기 현황 API Controller
 * 사용 VIEW: view_all_incidents_daily_stats, view_all_incidents_avg_response_time, view_all_incidents_list
 */
@RestController
@RequestMapping("/api/trash")
@RequiredArgsConstructor
@Slf4j
public class TrashController {

    private final DailyStatsRepository dailyStatsRepository;
    private final AvgResponseTimeRepository avgResponseTimeRepository;
    private final IncidentListViewRepository incidentListViewRepository;
    private final TrashService trashService;
    private final IncidentService incidentService;

    /**
     * 쓰레기 통계
     * GET /api/trash/stats
     */
    @GetMapping("/stats")
    public TrashStatsDto getTrashStats() {
        log.info("📊 [Trash] Fetching stats");
        
        DailyStats dailyStats = dailyStatsRepository.findDailyStats();
        AvgResponseTime avgTime = avgResponseTimeRepository.findAvgResponseTime();
        
        // 쓰레기 타입의 대기중 건수 (PENDING, IN_PROGRESS)
        List<String> pendingStatuses = Arrays.asList("PENDING", "IN_PROGRESS");
        long trashPendingCount = incidentListViewRepository
                .findByStatusInAndIncidentTypeOrderByDetectedAtDesc(pendingStatuses, "TRASH")
                .size();
        
        return TrashStatsDto.builder()
                .todayCount(dailyStats.getTodayTrash())
                .pendingCount(trashPendingCount)
                .avgResponseTime(avgTime.getTrashAvg() != null ? avgTime.getTrashAvg() : 0.0)
                .avgResponseTimeFormatted(formatResponseTime(avgTime.getTrashAvg()))
                .build();
    }

    /**
     * 쓰레기 다발구간
     * GET /api/trash/hotspots
     */
    @GetMapping("/hotspots")
    public List<SimpleHotspotDto> getTrashHotspots(
            @RequestParam(defaultValue = "this_month") String period,
            @RequestParam(defaultValue = "1") Long limit
    ) {
        log.info("📍 [Trash] Fetching hotspots - period: {}, limit: {}", period, limit);
        
        List<IncidentListView> trashList = incidentListViewRepository
                .findByIncidentTypeOrderByDetectedAtDesc("TRASH");
        
        Map<String, Long> locationCount = trashList.stream()
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
     * 진행중 쓰레기 목록
     * GET /api/trash/active
     */
    @GetMapping("/active")
    public List<AllIncidentDto> getActiveTrashIncidents() {
        log.info("📋 [Trash] Fetching active list");
        
        // 전체현황과 동일한 방식: 타입 필터링 없이 전체 조회 후 프론트에서 필터링
        List<String> activeStatuses = Arrays.asList("PENDING", "IN_PROGRESS");
        List<IncidentListView> viewList = incidentListViewRepository
                .findByStatusInOrderByDetectedAtDesc(activeStatuses);
        
        return viewList.stream()
                .map(AllIncidentDto::new)
                .collect(Collectors.toList());
    }

    /**
     * 처리완료 쓰레기 목록
     * GET /api/trash/completed
     */
    @GetMapping("/completed")
    public List<AllIncidentDto> getCompletedTrashIncidents() {
        log.info("📋 [Trash] Fetching completed list");
        
        // 전체현황과 동일한 방식
        List<IncidentListView> viewList = incidentListViewRepository
                .findByStatusInOrderByDetectedAtDesc(Arrays.asList("RESOLVED"));
        
        return viewList.stream()
                .map(AllIncidentDto::new)
                .collect(Collectors.toList());
    }

    /**
     * 쓰레기 사건 상세
     * GET /api/trash/detail/{id}
     */
    @GetMapping("/detail/{id}")
    public IncidentDetailDto getTrashDetail(@PathVariable Long id) {
        log.info("🔍 [Trash] Fetching detail - id: {}", id);
        IncidentListView view = incidentListViewRepository.findById(id).orElse(null);
        
        if (view != null && !"TRASH".equals(view.getIncidentType())) {
            log.warn("⚠️ [Trash] Incident {} is not TRASH type", id);
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
                log.warn("⚠️ [Trash] Failed to fetch CCTV coordinates for CCTV ID {}: {}", view.getCctvId(), e.getMessage());
            }
        }
        
        return new IncidentDetailDto(view, latitude, longitude);
    }
    
    /**
     * 신규 쓰레기 사건 등록
     * POST /api/trash/create
     */
    @PostMapping("/create")
    public IncidentCreateResponse createTrash(@RequestBody TrashCreateRequest request) {
        try {
            log.info("➕ [Trash] Creating new trash incident: {}", request);
            return trashService.createTrash(request);
        } catch (Exception e) {
            log.error("❌ [Trash] Failed to create trash: {}", e.getMessage(), e);
            throw e;
        }
    }
    
    /**
     * 쓰레기 사건 수정
     * PUT /api/trash/{id}
     */
    @PutMapping("/{id}")
    public TrashIncidentItem updateTrash(@PathVariable Long id, @RequestBody TrashUpdateRequest request) {
        log.info("✏️ [Trash] Updating trash incident - id: {}", id);
        return trashService.updateTrash(id, request);
    }
    
    /**
     * 쓰레기 사건 상세정보 업데이트 (수동 등록)
     * PUT /api/trash/{id}/detail
     */
    @PutMapping("/{id}/detail")
    public Map<String, String> updateTrashDetail(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {
        try {
            log.info("✏️ [Trash] Updating trash detail - id: {}", id);
            
            trashService.updateTrashDetail(
                    id,
                    request.get("memo"),
                    request.get("severity"),
                    request.get("trashType"),
                    request.get("amount")
            );
            return Map.of("message", "수정 완료");
        } catch (RuntimeException e) {
            log.error("❌ [Trash] Failed to update detail: {}", e.getMessage());
            throw e;
        }
    }
    
    /**
     * 쓰레기 사건 오탐 처리
     * POST /api/trash/{id}/false-positive
     */
    @PostMapping("/{id}/false-positive")
    public Map<String, String> markTrashAsFalsePositive(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {
        try {
            log.info("🚫 [Trash] Marking as false positive - id: {}", id);
            String reason = request.get("reason");
            incidentService.markAsFalsePositive(id, reason);
            return Map.of("message", "오탐 처리 완료");
        } catch (RuntimeException e) {
            log.error("❌ [Trash] Failed to mark as false positive: {}", e.getMessage());
            throw e;
        }
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public org.springframework.http.ResponseEntity<Map<String, String>> handleIllegalArgumentException(IllegalArgumentException e) {
        log.warn("⚠️ [Trash] Bad Request: {}", e.getMessage());
        return org.springframework.http.ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public org.springframework.http.ResponseEntity<Map<String, String>> handleException(Exception e) {
        log.error("❌ [Trash] Internal Server Error: {}", e.getMessage(), e);
        return org.springframework.http.ResponseEntity.internalServerError().body(Map.of("error", "서버 오류: " + e.getMessage()));
    }
}
