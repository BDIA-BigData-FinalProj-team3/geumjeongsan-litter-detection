package com.example.geumjeongsan.api;

import com.example.geumjeongsan.api.dto.EmergencyDashboardResponse;
import com.example.geumjeongsan.api.dto.EmergencyIncidentListDto;
import com.example.geumjeongsan.api.dto.EmergencyStatsDto;
import com.example.geumjeongsan.api.dto.HotspotDto;
import com.example.geumjeongsan.domain.incident.EmergencyService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/emergency-dashboard")
public class EmergencyDashboardController {

    private final EmergencyService emergencyService;

    public EmergencyDashboardController(EmergencyService emergencyService) {
        this.emergencyService = emergencyService;
    }

    // 응급 현황 + 목록 (발생/처리완료)
    @GetMapping
    public EmergencyDashboardResponse getDashboard() {
        return emergencyService.getDashboard();
    }
    
    /**
     * 응급 대시보드 상단 통계 (VIEW 기반)
     * GET /api/emergency-dashboard/stats
     */
    @GetMapping("/stats")
    public ResponseEntity<EmergencyStatsDto> getEmergencyStats() {
        EmergencyStatsDto stats = emergencyService.getEmergencyStats();
        return ResponseEntity.ok(stats);
    }
    
    /**
     * 응급 사고다발구간 조회 (VIEW 기반)
     * GET /api/emergency-dashboard/hotspots?period=this_month&minCount=3
     * 
     * @param period 기간 (this_month, 30d, 7d, all) - 기본값: this_month
     * @param minCount 최소 건수 - 기본값: 3
     * @return List<HotspotDto>
     */
    @GetMapping("/hotspots")
    public ResponseEntity<List<HotspotDto>> getEmergencyHotspots(
            @RequestParam(defaultValue = "this_month") String period,
            @RequestParam(defaultValue = "3") Long minCount
    ) {
        List<HotspotDto> hotspots = emergencyService.getEmergencyHotspots(period, minCount);
        return ResponseEntity.ok(hotspots);
    }
    
    /**
     * 응급 사고 목록 조회 (페이지네이션)
     * GET /api/emergency-dashboard/incidents?page=0&size=10
     * 
     * @param page 페이지 번호 (0부터 시작)
     * @param size 페이지당 항목 수
     * @return Page<EmergencyIncidentListDto>
     */
    @GetMapping("/incidents")
    public ResponseEntity<Page<EmergencyIncidentListDto>> getEmergencyIncidents(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        Page<EmergencyIncidentListDto> incidents = emergencyService.getEmergencyIncidents(page, size);
        return ResponseEntity.ok(incidents);
    }
}

