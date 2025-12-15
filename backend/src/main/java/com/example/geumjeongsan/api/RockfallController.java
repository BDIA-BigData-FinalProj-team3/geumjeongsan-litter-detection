package com.example.geumjeongsan.api;

import com.example.geumjeongsan.api.dto.IncidentCreateResponse;
import com.example.geumjeongsan.api.dto.IncidentStatusUpdateRequest;
import com.example.geumjeongsan.api.dto.RockfallCreateRequest;
import com.example.geumjeongsan.api.dto.RockfallDashboardResponse;
import com.example.geumjeongsan.api.dto.RockfallDetailDto;
import com.example.geumjeongsan.domain.incident.RockfallService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/rockfalls")
public class RockfallController {

    private static final Logger log = LoggerFactory.getLogger(RockfallController.class);
    private final RockfallService rockfallService;

    public RockfallController(RockfallService rockfallService) {
        this.rockfallService = rockfallService;
    }

    // 낙석 현황 + 목록 (발생/처리완료)
    @GetMapping("/dashboard")
    public RockfallDashboardResponse getDashboard() {
        return rockfallService.getDashboard();
    }

    /**
     * 신규 낙석 사건 등록
     * POST /api/rockfalls/create
     */
    @PostMapping("/create")
    public ResponseEntity<?> createRockfall(@RequestBody RockfallCreateRequest request) {
        try {
            log.info("➕ [Rockfall] Creating new rockfall incident: detectedAt={}, locationDesc={}, severityLevel={}, rockSizeClass={}, affectedAssetType={}",
                    request.getDetectedAt(), request.getLocationDesc(), request.getSeverityLevel(),
                    request.getRockSizeClass(), request.getAffectedAssetType());
            return ResponseEntity.ok(rockfallService.createRockfall(request));
        } catch (Exception e) {
            Throwable root = e;
            while (root.getCause() != null) root = root.getCause();

            log.error("❌ [Rockfall] Failed to create rockfall: {}", e.getMessage(), e);

            return ResponseEntity.status(500).body(Map.of(
                    "message", e.getMessage() != null ? e.getMessage() : "Internal Server Error",
                    "rootCause", root.getClass().getName() + ": " + (root.getMessage() != null ? root.getMessage() : "")
            ));
        }
    }

    /**
     * 낙석 사건 상세 조회 (rockfall_detail)
     * GET /api/rockfalls/detail/{id}
     */
    @GetMapping("/detail/{id}")
    public ResponseEntity<RockfallDetailDto> getRockfallDetail(@PathVariable Long id) {
        return ResponseEntity.ok(rockfallService.getRockfallDetail(id));
    }

    /**
     * 낙석 사건 상세정보 업데이트 (수동 등록/수정)
     * PUT /api/rockfalls/{id}/detail
     */
    @PutMapping("/{id}/detail")
    public ResponseEntity<Map<String, String>> updateRockfallDetail(
            @PathVariable Long id,
            @RequestBody Map<String, String> request
    ) {
        rockfallService.updateRockfallDetail(
                id,
                request.get("memo"),
                request.get("severity"),
                request.get("rockSizeClass"),
                request.get("affectedAssetType"),
                request.get("affectedAssetName"),
                request.get("damageDescription")
        );
        return ResponseEntity.ok(Map.of("message", "수정 완료"));
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

