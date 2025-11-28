package com.example.geumjeongsan.api;

import com.example.geumjeongsan.api.dto.IncidentStatusUpdateRequest;
import com.example.geumjeongsan.api.dto.TrashDashboardResponse;
import com.example.geumjeongsan.domain.incident.TrashService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/trash")
public class TrashController {

    private final TrashService trashService;

    public TrashController(TrashService trashService) {
        this.trashService = trashService;
    }

    // 쓰레기 현황 + 목록 (발생/처리완료)
    @GetMapping("/dashboard")
    public TrashDashboardResponse getDashboard() {
        return trashService.getDashboard();
    }

    // 쓰레기 사건 상태 업데이트
    @PatchMapping("/{id}/status")
    public ResponseEntity<Void> updateTrashStatus(
            @PathVariable Long id,
            @RequestBody IncidentStatusUpdateRequest request) {
        try {
            trashService.updateTrashStatus(id, request.getStatus(), request.getHandlerName());
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
}

