package com.example.geumjeongsan.api;

import com.example.geumjeongsan.api.dto.FireDashboardResponse;
import com.example.geumjeongsan.api.dto.IncidentStatusUpdateRequest;
import com.example.geumjeongsan.domain.incident.FireService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/fires")
public class FireController {

    private final FireService fireService;

    public FireController(FireService fireService) {
        this.fireService = fireService;
    }

    // 화재 현황 + 목록 (발생/처리완료)
    @GetMapping("/dashboard")
    public FireDashboardResponse getDashboard() {
        return fireService.getDashboard();
    }

    // 화재 사건 상태 업데이트
    @PatchMapping("/{id}/status")
    public ResponseEntity<Void> updateFireStatus(
            @PathVariable Long id,
            @RequestBody IncidentStatusUpdateRequest request) {
        try {
            fireService.updateFireStatus(id, request.getStatus(), request.getHandlerName());
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
}