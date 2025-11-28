package com.example.geumjeongsan.api;

import com.example.geumjeongsan.api.dto.CCTVIncidentDetailResponse;
import com.example.geumjeongsan.api.dto.CCTVResponse;
import com.example.geumjeongsan.api.dto.MediaFileResponse;
import com.example.geumjeongsan.domain.incident.IncidentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/cctv")
public class CCTVController {

    private final IncidentService incidentService;

    public CCTVController(IncidentService incidentService) {
        this.incidentService = incidentService;
    }

    @GetMapping
    public ResponseEntity<?> getAllCCTV() {
        try {
            List<CCTVResponse> cctvList = incidentService.getAllCCTV();
            return ResponseEntity.ok(cctvList);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("CCTV 데이터 조회 실패: " + e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public CCTVResponse getCCTVById(@PathVariable Long id) {
        return incidentService.getCCTVById(id);
    }

    @GetMapping("/active")
    public List<CCTVResponse> getActiveCCTV() {
        return incidentService.getActiveCCTV();
    }

    // CCTV별 사건 상세 조회
    @GetMapping("/{id}/incidents")
    public ResponseEntity<List<CCTVIncidentDetailResponse.IncidentDetail>> getCCTVIncidents(@PathVariable Long id) {
        try {
            List<CCTVIncidentDetailResponse.IncidentDetail> incidents = incidentService.getCCTVIncidents(id);
            return ResponseEntity.ok(incidents);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    // CCTV별 미디어 조회 (썸네일/영상)
    @GetMapping("/{id}/media")
    public ResponseEntity<List<MediaFileResponse>> getCCTVMedia(
            @PathVariable Long id,
            @RequestParam(required = false) String fileType) {
        try {
            List<MediaFileResponse> media = incidentService.getCCTVMedia(id, fileType);
            return ResponseEntity.ok(media);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}

