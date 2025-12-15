package com.example.geumjeongsan.api;

import com.example.geumjeongsan.api.dto.AllIncidentDto;
import com.example.geumjeongsan.api.dto.IncidentDetailDto;
import com.example.geumjeongsan.api.dto.EmergencyCreateRequest;
import com.example.geumjeongsan.api.dto.EmergencyResponse;
import com.example.geumjeongsan.api.dto.IncidentCreateResponse;
import com.example.geumjeongsan.api.dto.IncidentStatusUpdateRequest;
import com.example.geumjeongsan.api.dto.SimpleHotspotDto;
import com.example.geumjeongsan.api.dto.EmergencyStatsDto;
import com.example.geumjeongsan.domain.dashboard.DailyStats;
import com.example.geumjeongsan.domain.dashboard.DailyStatsRepository;
import com.example.geumjeongsan.domain.dashboard.AvgResponseTime;
import com.example.geumjeongsan.domain.dashboard.AvgResponseTimeRepository;
import com.example.geumjeongsan.domain.incident.EmergencyService;
import com.example.geumjeongsan.domain.incident.IncidentListView;
import com.example.geumjeongsan.domain.incident.IncidentListViewRepository;
import com.example.geumjeongsan.domain.incident.IncidentService;
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
    private final IncidentService incidentService;

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
        
        // 전체현황과 동일한 방식: 타입 필터링 없이 전체 조회 후 프론트에서 필터링
        List<String> activeStatuses = Arrays.asList("PENDING", "IN_PROGRESS");
        List<IncidentListView> viewList = incidentListViewRepository
                .findByStatusInOrderByDetectedAtDesc(activeStatuses);
        
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
        
        // 전체현황과 동일한 방식
        List<IncidentListView> viewList = incidentListViewRepository
                .findByStatusInOrderByDetectedAtDesc(Arrays.asList("RESOLVED"));
        
        return viewList.stream()
                .map(AllIncidentDto::new)
                .collect(Collectors.toList());
    }

    /**
     * 응급 사건 상세
     * GET /api/emergency/detail/{id}
     */
    @GetMapping("/detail/{id}")
    public IncidentDetailDto getEmergencyDetail(@PathVariable Long id) {
        log.info("🔍 [Emergency] Fetching detail - id: {}", id);
        IncidentListView view = incidentListViewRepository.findById(id).orElse(null);
        
        // 응급 타입이 맞는지 검증
        if (view != null && !"EMERGENCY".equals(view.getIncidentType())) {
            log.warn("⚠️ [Emergency] Incident {} is not EMERGENCY type", id);
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
                log.warn("⚠️ [Emergency] Failed to fetch CCTV coordinates for CCTV ID {}: {}", view.getCctvId(), e.getMessage());
            }
        }
        
        return new IncidentDetailDto(view, latitude, longitude);
    }
    
    /**
     * 응급 사건 상태 업데이트
     * PUT /api/emergency/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateEmergencyStatus(
            @PathVariable Long id,
            @RequestBody IncidentStatusUpdateRequest request) {
        try {
            log.info("✏️ [Emergency] Updating emergency incident - id: {}, status: {}", id, request.getStatus());
            
            EmergencyResponse response = emergencyService.updateEmergencyStatus(
                    id,
                    request.getStatus(),
                    request.getHandlerName()
            );
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.error("❌ [Emergency] Validation error: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            log.error("❌ [Emergency] Failed to update emergency: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("❌ [Emergency] Failed to update emergency: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * 응급 사건 상세정보 업데이트 (수동 등록)
     * PUT /api/emergency/{id}/detail
     */
    @PutMapping("/{id}/detail")
    public ResponseEntity<?> updateEmergencyDetail(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {
        try {
            log.info("✏️ [Emergency] Updating emergency detail - id: {}", id);
            
            emergencyService.updateEmergencyDetail(
                    id,
                    request.get("memo"),
                    request.get("severity"),
                    request.get("patientName"),
                    request.get("patientGender"),
                    request.get("transferHospital")
            );
            return ResponseEntity.ok(Map.of("message", "수정 완료"));
        } catch (RuntimeException e) {
            log.error("❌ [Emergency] Failed to update detail: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
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
    
    /**
     * 응급 사건 오탐 처리
     * POST /api/emergency/{id}/false-positive
     */
    @PostMapping("/{id}/false-positive")
    public ResponseEntity<?> markEmergencyAsFalsePositive(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {
        try {
            log.info("🚫 [Emergency] Marking as false positive - id: {}", id);
            String reason = request.get("reason");
            incidentService.markAsFalsePositive(id, reason);
            return ResponseEntity.ok(Map.of("message", "오탐 처리 완료"));
        } catch (RuntimeException e) {
            log.error("❌ [Emergency] Failed to mark as false positive: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("❌ [Emergency] Failed to mark as false positive: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }
}
