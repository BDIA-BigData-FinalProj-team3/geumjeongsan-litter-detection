package com.example.geumjeongsan.api;

import com.example.geumjeongsan.api.dto.IncidentStatusUpdateRequest;
import com.example.geumjeongsan.api.dto.RockfallDashboardResponse;
import com.example.geumjeongsan.domain.incident.RockfallService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/rockfalls")
public class RockfallController {

    private final RockfallService rockfallService;

    public RockfallController(RockfallService rockfallService) {
        this.rockfallService = rockfallService;
    }

    // 낙석 현황 + 목록 (발생/처리완료)
    @GetMapping("/dashboard")
    public RockfallDashboardResponse getDashboard() {
        return rockfallService.getDashboard();
    }

    // 낙석 사건 상태 업데이트
    @PatchMapping("/{id}/status")
    public ResponseEntity<Void> updateRockfallStatus(
            @PathVariable Long id,
            @RequestBody IncidentStatusUpdateRequest request) {
        try {
            rockfallService.updateRockfallStatus(id, request.getStatus(), request.getHandlerName());
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
}

