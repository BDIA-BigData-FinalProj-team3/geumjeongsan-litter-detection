package com.example.geumjeongsan.api;

import com.example.geumjeongsan.api.dto.CCTVIncidentDetailResponse;
import com.example.geumjeongsan.api.dto.CCTVResponse;
import com.example.geumjeongsan.api.dto.FallenAnalysisRequest;
import com.example.geumjeongsan.api.dto.FallenAnalysisResponse;
import com.example.geumjeongsan.api.dto.MediaFileResponse;
import com.example.geumjeongsan.domain.incident.IncidentService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.List;

@RestController
@RequestMapping("/api/cctv")
@Slf4j
public class CCTVController {

    private final IncidentService incidentService;
    private final RestTemplate restTemplate;
    private static final String MODEL_SERVER_URL = "http://54.116.3.241:8000/api/v1/video/analyze";

    public CCTVController(IncidentService incidentService, RestTemplate restTemplate) {
        this.incidentService = incidentService;
        this.restTemplate = restTemplate;
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

    /**
     * CCTV 낙상 분석 요청
     * POST /api/cctv/{cctvCode}/fallen-analyze
     * 
     * @param cctvCode - CCTV 코드 (예: "CCTV-001")
     * @return 분석 결과 (모델 서버 응답 + Gemini 메시지)
     */
    @PostMapping("/{cctvCode}/fallen-analyze")
    public ResponseEntity<FallenAnalysisResponse> analyzeFallenVideo(
            @PathVariable String cctvCode) {
        try {
            log.info("🎥 [CCTV] Analyzing fallen video for: {}", cctvCode);
            
            // Convert CCTV-001 to cctv-001 format
            String cameraId = cctvCode.toLowerCase();
            
            // Build S3 key
            String s3Key = String.format("cctv/%s/videos/%s_20251208T140000Z.mp4", cameraId, cameraId);
            
            // Prepare request to model server
            FallenAnalysisRequest request = new FallenAnalysisRequest();
            request.setS3_key(s3Key);
            request.setCamera_id(cameraId);
            
            // Call model server
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<FallenAnalysisRequest> entity = new HttpEntity<>(request, headers);
            
            log.info("📡 [CCTV] Calling model server: {}", MODEL_SERVER_URL);
            ResponseEntity<FallenAnalysisResponse> modelResponse = restTemplate.exchange(
                    MODEL_SERVER_URL,
                    HttpMethod.POST,
                    entity,
                    FallenAnalysisResponse.class
            );
            
            if (modelResponse.getStatusCode().is2xxSuccessful() && modelResponse.getBody() != null) {
                FallenAnalysisResponse response = modelResponse.getBody();
                
                // Add Gemini message (placeholder for now)
                response.setGeminiMessage("Gemini 호출 구현해야함!");
                
                log.info("✅ [CCTV] Analysis completed: {} fallen events detected", 
                        response.getResult() != null ? response.getResult().getFallen_events() : 0);
                
                return ResponseEntity.ok(response);
            } else {
                log.error("❌ [CCTV] Model server returned error: {}", modelResponse.getStatusCode());
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
            }
            
        } catch (Exception e) {
            log.error("❌ [CCTV] Failed to analyze video for {}", cctvCode, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}

