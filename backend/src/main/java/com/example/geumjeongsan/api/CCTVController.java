package com.example.geumjeongsan.api;

import com.example.geumjeongsan.api.dto.CCTVIncidentDetailResponse;
import com.example.geumjeongsan.api.dto.CCTVResponse;
import com.example.geumjeongsan.api.dto.FallenAnalysisRequest;
import com.example.geumjeongsan.api.dto.FallenAnalysisResponse;
import com.example.geumjeongsan.api.dto.MediaFileResponse;
import com.example.geumjeongsan.api.dto.QwenAnalysisResponse;
import com.example.geumjeongsan.domain.incident.IncidentService;
import com.example.geumjeongsan.service.S3Service;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/cctv")
@Slf4j
public class CCTVController {

    private final IncidentService incidentService;
    private final RestTemplate restTemplate;
    private final S3Service s3Service;
    private static final String MODEL_SERVER_URL = "http://54.116.3.241:8000/api/v1/video/analyze";
    
    @Value("${qwen.api.url}")
    private String qwenApiUrl;
    
    @Value("${aws.s3.bucket-name}")
    private String bucketName;
    
    @Value("${aws.region}")
    private String region;

    public CCTVController(IncidentService incidentService, RestTemplate restTemplate, S3Service s3Service) {
        this.incidentService = incidentService;
        this.restTemplate = restTemplate;
        this.s3Service = s3Service;
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
            e.printStackTrace();
            // 빈 리스트 반환 (404 대신)
            return ResponseEntity.ok(java.util.Collections.emptyList());
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

    /**
     * CCTV 프레임을 Qwen으로 분석
     * POST /api/cctv/{cctvCode}/frame/analyze-with-qwen
     * 
     * @param cctvCode - CCTV 코드 (예: "CCTV-003")
     * @param imageFile - 업로드된 이미지 파일
     * @return Qwen 분석 결과
     */
    @PostMapping("/{cctvCode}/frame/analyze-with-qwen")
    public ResponseEntity<?> analyzeFrameWithQwen(
            @PathVariable String cctvCode,
            @RequestParam("image") MultipartFile imageFile) {
        try {
            log.info("🖼️ [CCTV] Analyzing frame with Qwen for: {}", cctvCode);
            
            // 1. 이미지를 S3에 업로드
            String cameraId = cctvCode.toLowerCase();
            byte[] imageBytes = imageFile.getBytes();
            String s3Key = s3Service.uploadFrame(imageBytes, cameraId);
            
            log.info("📤 [CCTV] Frame uploaded to S3: {}", s3Key);
            
            // 2. Qwen API 호출
            Map<String, String> qwenRequest = new HashMap<>();
            qwenRequest.put("key", s3Key);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, String>> entity = new HttpEntity<>(qwenRequest, headers);
            
            log.info("📡 [CCTV] Calling Qwen API: {}", qwenApiUrl);
            ResponseEntity<Map<String, Object>> qwenResponse = restTemplate.exchange(
                    qwenApiUrl,
                    HttpMethod.POST,
                    entity,
                    new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {}
            );
            
            if (qwenResponse.getStatusCode().is2xxSuccessful() && qwenResponse.getBody() != null) {
                log.info("✅ [CCTV] Qwen analysis completed");
                
                // 3. Qwen 응답 파싱 및 구조화
                Map<String, Object> qwenBody = qwenResponse.getBody();
                QwenAnalysisResponse parsedResponse = parseQwenResponse(qwenBody, cctvCode);
                
                return ResponseEntity.ok(parsedResponse);
            } else {
                log.error("❌ [CCTV] Qwen API returned error: {}", qwenResponse.getStatusCode());
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(Map.of("error", "Qwen API 호출 실패"));
            }
            
        } catch (Exception e) {
            log.error("❌ [CCTV] Failed to analyze frame with Qwen for {}", cctvCode, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Qwen API 응답을 구조화된 DTO로 파싱
     */
    private QwenAnalysisResponse parseQwenResponse(Map<String, Object> qwenBody, String cctvCode) {
        // incident 정보 추출
        Map<String, Object> incident = (Map<String, Object>) qwenBody.get("incident");
        Integer severityLevel = incident != null && incident.get("severity_level") != null
                ? ((Number) incident.get("severity_level")).intValue()
                : 0;
        
        // severity_level이 1 이상이면 쓰레기 탐지됨
        boolean hasTrash = severityLevel >= 1;
        
        // trash_detail 정보 추출
        Map<String, Object> trashDetail = (Map<String, Object>) qwenBody.get("trash_detail");
        String mainCategory = trashDetail != null && trashDetail.get("main_category") != null
                ? (String) trashDetail.get("main_category")
                : "미분류";
        String objectAmount = trashDetail != null && trashDetail.get("object_amount") != null
                ? (String) trashDetail.get("object_amount")
                : "";
        
        // incident_auto 정보 추출
        Map<String, Object> incidentAuto = (Map<String, Object>) qwenBody.get("incident_auto");
        Double detectionConfidence = incidentAuto != null && incidentAuto.get("detection_confidence") != null
                ? ((Number) incidentAuto.get("detection_confidence")).doubleValue()
                : 0.0;
        String detectionConfidenceReason = incidentAuto != null && incidentAuto.get("detection_confidence_reason") != null
                ? (String) incidentAuto.get("detection_confidence_reason")
                : "";
        String severityLevelReason = incidentAuto != null && incidentAuto.get("severity_level_reason") != null
                ? (String) incidentAuto.get("severity_level_reason")
                : "";
        
        // overlay_image_url 추출 및 변환
        String overlayImageUrl = qwenBody.get("overlay_image_url") != null
                ? (String) qwenBody.get("overlay_image_url")
                : null;
        
        // s3:// URL을 HTTP URL로 변환 (응급 분석과 동일한 형식)
        if (overlayImageUrl != null && overlayImageUrl.startsWith("s3://")) {
            // s3://bucket-name/path/to/file → https://bucket-name.s3.region.amazonaws.com/path/to/file
            String s3Path = overlayImageUrl.replace("s3://" + bucketName + "/", "");
            overlayImageUrl = String.format("https://%s.s3.%s.amazonaws.com/%s", bucketName, region, s3Path);
            log.info("🔄 [CCTV] S3 URL 변환: {} → {}", qwenBody.get("overlay_image_url"), overlayImageUrl);
        }
        
        // confidence를 백분율로 변환
        String confidence = String.format("%d%%", Math.round(detectionConfidence * 100));
        
        // severity_level에 따라 심각도 결정 (1=하, 2=중, 3=상)
        String severity;
        if (severityLevel == 1) {
            severity = "하";
        } else if (severityLevel == 2) {
            severity = "중";
        } else if (severityLevel >= 3) {
            severity = "상";
        } else {
            severity = "하";
        }
        
        // 현재 시간
        String time = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        
        return QwenAnalysisResponse.builder()
                .hasTrash(hasTrash)
                .cctvCode(cctvCode)
                .location("")  // 프론트엔드에서 설정
                .time(time)
                .type("trash")
                .confidence(confidence)
                .severity(severity)
                .summary(objectAmount)
                .mainCategory(mainCategory)
                .objectAmount(objectAmount)
                .detectionConfidenceReason(detectionConfidenceReason)
                .severityLevelReason(severityLevelReason)
                .overlayImageUrl(overlayImageUrl)
                .severityLevel(severityLevel)
                .detectionConfidence(detectionConfidence)
                .build();
    }
}

