package com.example.geumjeongsan.api;

import com.example.geumjeongsan.api.dto.CCTVIncidentDetailResponse;
import com.example.geumjeongsan.api.dto.CCTVResponse;
import com.example.geumjeongsan.api.dto.EmergencyVideoAnalysisRequest;
import com.example.geumjeongsan.api.dto.FallenAnalysisRequest;
import com.example.geumjeongsan.api.dto.FallenAnalysisResponse;
import com.example.geumjeongsan.api.dto.MediaFileResponse;
import com.example.geumjeongsan.api.dto.QwenAnalysisResponse;
import com.example.geumjeongsan.api.dto.IncidentCreateResponse;
import com.example.geumjeongsan.domain.incident.IncidentService;
import com.example.geumjeongsan.domain.incident.TrashService;
import com.example.geumjeongsan.domain.incident.EmergencyService;
import com.example.geumjeongsan.domain.cctv.CCTVRepository;
import com.example.geumjeongsan.service.GeminiService;
import com.example.geumjeongsan.service.GeminiJsonExtractor;
import com.example.geumjeongsan.service.S3Service;
import com.example.geumjeongsan.service.ImageOverlayService;
import com.example.geumjeongsan.service.MediaFileService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/cctv")
@Slf4j
public class CCTVController {

    private final IncidentService incidentService;
    private final TrashService trashService;
    private final EmergencyService emergencyService;
    private final CCTVRepository cctvRepository;
    private final RestTemplate restTemplate;
    private final S3Service s3Service;
    private final GeminiService geminiService;
    private final GeminiJsonExtractor geminiJsonExtractor;

    @Value("${app.model-server.url:http://54.116.3.241:8000/api/v1/video/analyze}")
    private String modelServerUrl;
    
    @Value("${qwen.api.url}")
    private String qwenApiUrl;
    
    @Value("${aws.s3.bucket-name}")
    private String bucketName;
    
    @Value("${aws.region}")
    private String region;

    @Value("${gemini.prompt.fallen-analysis:이 CCTV 영상 프레임들을 분석해줘. 화재, 연기, 낙석, 쓰러진 사람 등 위험 상황이 보이는가? 위험도(상/중/하)와 이유를 설명해줘.}")
    private String fallenAnalysisPrompt;

    @Value("${gemini.prompt.trash-analysis:이 CCTV 프레임에서 불법 쓰레기 투기(TRASH)를 판별해줘.}")
    private String trashAnalysisPrompt;

    @Value("${gemini.prompt.trash-bbox-analysis:}")
    private String trashBboxAnalysisPrompt;

    @Value("${gemini.prompt.emergency-analysis:}")
    private String emergencyAnalysisPrompt;

    /**
     * FFmpeg 실행 커맨드/경로
     * - 기본값: "ffmpeg" (PATH에서 찾음)
     * - 로컬 Windows에서 PATH가 안 잡히는 경우를 대비해, 아래 extractFrames에서 known 경로를 자동 탐색합니다.
     */
    @Value("${app.ffmpeg.command:ffmpeg}")
    private String configuredFfmpegCommand;

    private final ImageOverlayService imageOverlayService;
    private final MediaFileService mediaFileService;

    public CCTVController(IncidentService incidentService,
                          TrashService trashService,
                          EmergencyService emergencyService,
                          CCTVRepository cctvRepository,
                          RestTemplate restTemplate,
                          S3Service s3Service,
                          GeminiService geminiService,
                          GeminiJsonExtractor geminiJsonExtractor,
                          ImageOverlayService imageOverlayService,
                          MediaFileService mediaFileService) {
        this.incidentService = incidentService;
        this.trashService = trashService;
        this.emergencyService = emergencyService;
        this.cctvRepository = cctvRepository;
        this.restTemplate = restTemplate;
        this.s3Service = s3Service;
        this.geminiService = geminiService;
        this.geminiJsonExtractor = geminiJsonExtractor;
        this.imageOverlayService = imageOverlayService;
        this.mediaFileService = mediaFileService;
    }

    private Long resolveCctvId(Long cctvId, String cctvCode) {
        if (cctvId != null) return cctvId;
        if (cctvCode == null || cctvCode.isBlank()) return null;

        String normalized = cctvCode.trim();
        // 숫자만 들어오면 CCTV-XXX로 정규화
        if (normalized.matches("^\\d+$")) {
            try {
                int n = Integer.parseInt(normalized);
                normalized = String.format("CCTV-%03d", n);
            } catch (Exception ignored) {}
        }
        normalized = normalized.toUpperCase();
        try {
            return cctvRepository.findByCctvCode(normalized).map(c -> c.getId()).orElse(null);
        } catch (Exception e) {
            log.warn("⚠️ [CCTV] Failed to resolve cctvId from cctvCode={}: {}", normalized, e.getMessage());
            return null;
        }
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
            
            log.info("📡 [CCTV] Calling model server: {}", modelServerUrl);
            ResponseEntity<FallenAnalysisResponse> modelResponse = restTemplate.exchange(
                    modelServerUrl,
                    HttpMethod.POST,
                    entity,
                    FallenAnalysisResponse.class
            );
            
            if (modelResponse.getStatusCode().is2xxSuccessful() && modelResponse.getBody() != null) {
                FallenAnalysisResponse response = modelResponse.getBody();
                
                // Gemini API 호출 (프레임 URL이 있으면 분석)
                try {
                    if (response.getResult() != null && response.getResult().getFrame_urls() != null 
                            && !response.getResult().getFrame_urls().isEmpty()) {
                        log.info("🤖 [CCTV] Calling Gemini API with {} frames", 
                                response.getResult().getFrame_urls().size());
                        
                        // 프레임 URL들을 Base64로 변환하거나, 직접 URL을 사용할 수 있음
                        // 여기서는 예시로 프롬프트만 전달 (실제로는 프레임 이미지를 Base64로 변환 필요)
                        String geminiResult = geminiService.analyzeText(
                                fallenAnalysisPrompt + "\n\n낙상 이벤트 " + 
                                response.getResult().getFallen_events() + "건이 탐지되었습니다."
                        );
                        response.setGeminiMessage(geminiResult);
                        log.info("✅ [CCTV] Gemini analysis completed");
                    } else {
                        response.setGeminiMessage("프레임 정보가 없어 Gemini 분석을 건너뜁니다.");
                    }
                } catch (Exception e) {
                    log.error("❌ [CCTV] Gemini API call failed", e);
                    response.setGeminiMessage("Gemini 분석 중 오류 발생: " + e.getMessage());
                }
                
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
     * CCTV 영상(S3 key)을 기반으로 "응급 상황"을 Gemini(JSON only)로 분석합니다.
     * - (선택) 모델서버(YOLO/낙상 등) 결과를 참고 정보로 전달
     * - 모델서버가 준 frame_urls를 다운로드하여 Base64로 Gemini에 전송
     *
     * POST /api/cctv/{cctvCode}/emergency-analyze
     *
     * @param cctvCode CCTV 코드 (예: "CCTV-001")
     * @param req      { s3_key?: string, camera_id?: string }
     * @param maxFrames Gemini에 보낼 최대 프레임 수(기본 6)
     */
    @PostMapping("/{cctvCode}/emergency-analyze")
    public ResponseEntity<?> analyzeEmergencyVideo(
            @PathVariable String cctvCode,
            @RequestBody(required = false) EmergencyVideoAnalysisRequest req,
            @RequestParam(value = "maxFrames", required = false, defaultValue = "6") int maxFrames,
            @RequestParam(value = "saveToDb", required = false, defaultValue = "true") boolean saveToDb
    ) {
        File tempVideo = null;
        File tempDir = null;
        List<File> frameFiles = new ArrayList<>();

        try {
            String cameraId = (req != null && req.getCamera_id() != null && !req.getCamera_id().isBlank())
                    ? req.getCamera_id().trim()
                    : cctvCode.toLowerCase();

            String s3Key = null;
            if (req != null && req.getS3_key() != null && !req.getS3_key().isBlank()) {
                s3Key = req.getS3_key().trim();
            } else if (req != null && req.getClip_url() != null && !req.getClip_url().isBlank()) {
                s3Key = tryParseS3KeyFromHttpUrl(req.getClip_url().trim());
            }
            if (s3Key == null || s3Key.isBlank()) {
                // 최후 fallback: 기존 더미 규칙
                s3Key = String.format("cctv/%s/videos/%s_20251208T140000Z.mp4", cameraId, cameraId);
            }

            if (emergencyAnalysisPrompt == null || emergencyAnalysisPrompt.isBlank()) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(Map.of("error", "gemini.prompt.emergency-analysis 설정이 비어 있습니다."));
            }

            // 1) 모델서버 호출(선택적이지만 기본은 시도)
            FallenAnalysisResponse yoloResponse = null;
            try {
                FallenAnalysisRequest yoloReq = new FallenAnalysisRequest(s3Key, cameraId);
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                HttpEntity<FallenAnalysisRequest> entity = new HttpEntity<>(yoloReq, headers);

                log.info("📡 [CCTV] (Emergency) Calling model server: {} (s3Key={})", modelServerUrl, s3Key);
                ResponseEntity<FallenAnalysisResponse> modelResp = restTemplate.exchange(
                        modelServerUrl,
                        HttpMethod.POST,
                        entity,
                        FallenAnalysisResponse.class
                );
                if (modelResp.getStatusCode().is2xxSuccessful()) {
                    yoloResponse = modelResp.getBody();
                }
            } catch (Exception e) {
                log.warn("⚠️ [CCTV] (Emergency) Model server call failed, fallback to direct S3+FFmpeg: {}", e.getMessage());
            }

            // 2) Gemini에 보낼 이미지(Base64) 확보
            List<String> base64Images = new ArrayList<>();
            List<String> usedFrameUrls = new ArrayList<>();

            if (yoloResponse != null
                    && yoloResponse.getResult() != null
                    && yoloResponse.getResult().getFrame_urls() != null
                    && !yoloResponse.getResult().getFrame_urls().isEmpty()) {

                List<String> urls = yoloResponse.getResult().getFrame_urls();
                int limit = Math.max(1, Math.min(maxFrames, urls.size()));
                for (int i = 0; i < limit; i++) {
                    String url = urls.get(i);
                    try {
                        String b64 = imageUrlToBase64(url);
                        if (b64 != null && !b64.isBlank()) {
                            base64Images.add(b64);
                            usedFrameUrls.add(url);
                        }
                    } catch (Exception e) {
                        log.warn("⚠️ [CCTV] (Emergency) Failed to fetch frame url: {} ({})", url, e.getMessage());
                    }
                }
            }

            // 2-b) 모델서버 frame_urls가 없으면: S3에서 mp4를 내려받아 FFmpeg로 프레임 추출
            if (base64Images.isEmpty()) {
                try {
                    tempDir = new File(System.getProperty("java.io.tmpdir"), "emergency-frames-" + System.currentTimeMillis());
                    tempDir.mkdirs();

                    tempVideo = s3Service.downloadToTempFile(s3Key, ".mp4");

                    // 기본: 6프레임, 3초 간격
                    int frameCount = Math.max(1, Math.min(maxFrames, 12));
                    frameFiles = extractFrames(tempVideo, tempDir, frameCount, 3);
                    for (File f : frameFiles) {
                        String b64 = imageToBase64(f);
                        if (b64 != null && !b64.isBlank()) base64Images.add(b64);
                    }
                } catch (Exception e) {
                    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                            .body(Map.of("error", "프레임 확보 실패", "details", e.getMessage()));
                }
            }

            if (base64Images.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Gemini에 보낼 프레임이 없습니다."));
            }

            // 3) 프롬프트 구성: YOLO 요약을 참고 정보로 prepend
            StringBuilder prompt = new StringBuilder();
            if (yoloResponse != null && yoloResponse.getResult() != null) {
                var r = yoloResponse.getResult();
                prompt.append("[YOLO(모델서버) 요약]\n")
                        .append("- fallen_events: ").append(r.getFallen_events()).append("\n")
                        .append("- total_frames: ").append(r.getTotal_frames()).append("\n")
                        .append("- fps: ").append(r.getFps()).append("\n")
                        .append("- clip_url: ").append(r.getClip_url()).append("\n")
                        .append("- frame_urls_used: ").append(usedFrameUrls.size()).append("\n\n");
            }
            prompt.append(emergencyAnalysisPrompt);

            // 4) Gemini 호출(멀티 이미지)
            log.info("🤖 [CCTV] (Emergency) Calling Gemini with {} frame(s)", base64Images.size());
            String geminiText = geminiService.analyze(prompt.toString(), base64Images);

            // 5) JSON 파싱하여 그대로 반환
            Map<String, Object> parsed = extractJsonFromGeminiResponse(geminiText);
            if (parsed == null) {
                return ResponseEntity.ok(Map.of(
                        "warning", "Gemini 응답에서 JSON 파싱 실패(원문 포함)",
                        "raw", geminiText
                ));
            }

            // 6) (옵션) DB 저장 자동화 + media_file 저장
            Map<String, Object> response = new HashMap<>();
            response.put("analysis", parsed);
            response.put("saveToDb", saveToDb);

            if (saveToDb) {
                Long resolvedCctvId = resolveCctvId(null, cctvCode);
                String resolvedLocationDesc = resolveCctvLocationDesc(resolvedCctvId, cctvCode);
                OffsetDateTime detectedAtKst = OffsetDateTime.now(ZoneOffset.ofHours(9));

                IncidentCreateResponse created = emergencyService.createEmergencyFromGemini(
                        parsed,
                        resolvedCctvId,
                        resolvedLocationDesc,
                        detectedAtKst
                );
                response.put("incidentId", created.getIncidentId());
                response.put("incidentCode", created.getIncidentCode());

                // media 저장 (가능하면)
                try {
                    Long incidentId = created.getIncidentId();
                    if (incidentId != null) {
                        // clip_url(모델서버) 우선
                        String clipUrl = (yoloResponse != null && yoloResponse.getResult() != null)
                                ? yoloResponse.getResult().getClip_url()
                                : null;
                        if (clipUrl != null && !clipUrl.isBlank()) {
                            mediaFileService.saveVideo(incidentId, resolvedCctvId, clipUrl, detectedAtKst);
                            response.put("clipUrl", clipUrl);
                        }

                        if (!usedFrameUrls.isEmpty()) {
                            // DB에는 "프레임 여러개"로 저장 (최대 maxFrames)
                            for (String u : usedFrameUrls) {
                                if (u == null || u.isBlank()) continue;
                                mediaFileService.saveFrame(incidentId, resolvedCctvId, u, detectedAtKst);
                            }
                            response.put("frameUrls", usedFrameUrls);
                        }
                    }
                } catch (Exception e) {
                    response.put("mediaSaveWarning", e.getMessage());
                }
            }

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("❌ [CCTV] (Emergency) Failed to analyze emergency video", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        } finally {
            try {
                for (File f : frameFiles) {
                    if (f != null && f.exists()) f.delete();
                }
                if (tempVideo != null && tempVideo.exists()) tempVideo.delete();
                if (tempDir != null && tempDir.exists()) {
                    File[] files = tempDir.listFiles();
                    if (files != null) for (File f : files) { try { f.delete(); } catch (Exception ignore) {} }
                    tempDir.delete();
                }
            } catch (Exception ignore) {}
        }
    }

    private String imageUrlToBase64(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) return null;
        byte[] bytes = restTemplate.getForObject(imageUrl, byte[].class);
        if (bytes == null || bytes.length == 0) return null;
        return Base64.getEncoder().encodeToString(bytes);
    }

    private static String tryParseS3KeyFromHttpUrl(String url) {
        try {
            // https://{bucket}.s3.{region}.amazonaws.com/{key}
            int idx = url.indexOf(".amazonaws.com/");
            if (idx < 0) return null;
            return url.substring(idx + ".amazonaws.com/".length());
        } catch (Exception ignore) {
            return null;
        }
    }

    private String resolveCctvLocationDesc(Long cctvId, String cctvCode) {
        if (cctvId == null) return (cctvCode != null ? cctvCode : "CCTV") + " 자동 탐지(응급)";
        try {
            var c = cctvRepository.findById(cctvId).orElse(null);
            if (c == null) return String.format("CCTV-%03d 자동 탐지(응급)", cctvId);
            String loc = c.getLocationDesc() != null && !c.getLocationDesc().isBlank() ? c.getLocationDesc() : c.getName();
            if (loc == null || loc.isBlank()) loc = String.format("CCTV-%03d", cctvId);
            return loc + " 자동 탐지(응급)";
        } catch (Exception e) {
            return String.format("CCTV-%03d 자동 탐지(응급)", cctvId);
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
        @SuppressWarnings("unchecked")
        Map<String, Object> incident = (Map<String, Object>) qwenBody.get("incident");
        Integer severityLevel = incident != null && incident.get("severity_level") != null
                ? ((Number) incident.get("severity_level")).intValue()
                : 0;
        
        // severity_level이 1 이상이면 쓰레기 탐지됨
        boolean hasTrash = severityLevel >= 1;
        
        // trash_detail 정보 추출
        @SuppressWarnings("unchecked")
        Map<String, Object> trashDetail = (Map<String, Object>) qwenBody.get("trash_detail");
        String mainCategory = trashDetail != null && trashDetail.get("main_category") != null
                ? (String) trashDetail.get("main_category")
                : "미분류";
        String objectAmount = trashDetail != null && trashDetail.get("object_amount") != null
                ? (String) trashDetail.get("object_amount")
                : "";
        
        // incident_auto 정보 추출
        @SuppressWarnings("unchecked")
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

    /**
     * 이미지 파일 1장을 Gemini로 쓰레기 분석 (테스트용)
     * POST /api/cctv/test/analyze-image
     * 
     * @param imageFile - 업로드된 이미지 파일 (jpg, png 등)
     * @param customPrompt - 커스텀 프롬프트 (선택, 없으면 application.yml의 trash-analysis 사용)
     * @param cctvId - CCTV ID (선택, DB 저장 시 사용)
     * @return Gemini 분석 결과 및 DB 저장 결과
     */
    @PostMapping("/test/analyze-image")
    public ResponseEntity<?> analyzeImage(
            @RequestParam("file") MultipartFile imageFile,
            @RequestParam(value = "prompt", required = false) String customPrompt,
            @RequestParam(value = "cctvId", required = false) Long cctvId,
            @RequestParam(value = "cctvCode", required = false) String cctvCode) {
        try {
            log.info("🖼️ [CCTV] Analyzing image file for trash: {}", imageFile.getOriginalFilename());
            
            // 1. 이미지를 Base64로 변환
            byte[] imageBytes = imageFile.getBytes();
            String base64Image = Base64.getEncoder().encodeToString(imageBytes);
            
            // 2. 프롬프트 설정 (bbox 분석 프롬프트 사용)
            String prompt = customPrompt != null && !customPrompt.isEmpty() 
                    ? customPrompt 
                    : (trashBboxAnalysisPrompt != null && !trashBboxAnalysisPrompt.isEmpty()
                            ? trashBboxAnalysisPrompt
                            : trashAnalysisPrompt);
            
            // 3. Gemini API 호출 (이미지 1장)
            log.info("🤖 [CCTV] Calling Gemini API with 1 image (trash analysis with bbox)");
            String geminiResult = geminiService.analyzeImage(prompt, base64Image);
            
            // 4. Gemini 응답에서 JSON 추출 및 파싱
            Map<String, Object> parsedJson = extractJsonFromGeminiResponse(geminiResult);
            
            // 5. detections 추출 (bbox 정보)
            List<Map<String, Object>> detections = new ArrayList<>();
            if (parsedJson != null && parsedJson.get("detections") instanceof List<?>) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> dets = (List<Map<String, Object>>) parsedJson.get("detections");
                detections = dets != null ? dets : new ArrayList<>();
            }
            
            // 6. Overlay 이미지 생성 및 S3 업로드
            String overlayUrl = null;
            try {
                byte[] overlayBytes = imageOverlayService.drawOverlayJpeg(imageBytes, detections);
                Long resolvedCctvId = resolveCctvId(cctvId, cctvCode);
                String cameraId = resolvedCctvId != null 
                        ? String.format("cctv-%03d", resolvedCctvId) 
                        : (cctvCode != null ? cctvCode.toLowerCase() : "cctv-unknown");
                String s3Key = s3Service.uploadOverlayFrame(overlayBytes, cameraId);
                overlayUrl = s3Service.toHttpUrl(s3Key);
                log.info("✅ [CCTV] Overlay image uploaded to S3: {}", overlayUrl);
            } catch (Exception e) {
                log.warn("⚠️ [CCTV] Failed to create/upload overlay image: {}", e.getMessage());
            }
            
            boolean savedToDb = false;
            Long incidentId = null;
            String incidentCode = null;
            
            if (parsedJson != null) {
                // 7. incident_type이 TRASH인 경우 DB에 저장
                @SuppressWarnings("unchecked")
                Map<String, Object> incidentMap = (Map<String, Object>) parsedJson.get("incident");
                if (incidentMap != null) {
                    String incidentType = (String) incidentMap.get("incident_type");
                    if ("TRASH".equals(incidentType)) {
                        try {
                            log.info("💾 [CCTV] Saving TRASH incident to database");
                            Long resolvedCctvId = resolveCctvId(cctvId, cctvCode);
                            var createResponse = trashService.createTrashFromGemini(
                                    parsedJson,
                                    resolvedCctvId,
                                    "CCTV 자동 탐지"
                            );
                            savedToDb = true;
                            incidentId = createResponse.getIncidentId();
                            incidentCode = createResponse.getIncidentCode();
                            log.info("✅ [CCTV] Incident saved to DB: {} (ID: {})", incidentCode, incidentId);
                            
                            // 8. media_file에 overlay 이미지 저장
                            if (overlayUrl != null && incidentId != null) {
                                try {
                                    mediaFileService.saveFrame(incidentId, resolvedCctvId, overlayUrl, 
                                            java.time.OffsetDateTime.now());
                                    log.info("✅ [CCTV] Overlay image saved to media_file: {}", overlayUrl);
                                } catch (Exception e) {
                                    log.warn("⚠️ [CCTV] Failed to save overlay to media_file: {}", e.getMessage());
                                }
                            }
                        } catch (Exception e) {
                            log.error("❌ [CCTV] Failed to save incident to DB", e);
                        }
                    } else {
                        log.info("ℹ️ [CCTV] Incident type is not TRASH: {}", incidentType);
                    }
                }
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", geminiResult);
            response.put("fileName", imageFile.getOriginalFilename());
            response.put("parsedJson", parsedJson);
            response.put("overlayUrl", overlayUrl);
            response.put("savedToDb", savedToDb);
            if (incidentCode != null) {
                response.put("incidentCode", incidentCode);
            }
            if (incidentId != null) {
                response.put("incidentId", incidentId);
            }
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("❌ [CCTV] Failed to analyze image", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    private Map<String, Object> extractJsonFromGeminiResponse(String geminiResult) {
        return geminiJsonExtractor.extract(geminiResult);
    }

    /**
     * 로컬 MP4 파일을 업로드하여 Gemini로 쓰레기 분석 (bbox + overlay 저장)
     * POST /api/cctv/test/analyze-local-video
     * 
     * @param videoFile - 업로드된 MP4 파일
     * @param customPrompt - 커스텀 프롬프트 (선택)
     * @param cctvId - CCTV ID (선택)
     * @param cctvCode - CCTV 코드 (선택)
     * @param locationDesc - 위치 설명 (선택)
     * @param frameCount - 추출할 프레임 개수 (기본: 4)
     * @param frameIntervalSec - 프레임 간격(초) (기본: 5)
     * @param stopOnDetect - 첫 TRASH 감지 시 중단 여부 (기본: true)
     * @return 프레임별 분석 결과 및 overlay URL
     */
    @PostMapping("/test/analyze-local-video")
    public ResponseEntity<?> analyzeLocalVideo(
            @RequestParam("file") MultipartFile videoFile,
            @RequestParam(value = "prompt", required = false) String customPrompt,
            @RequestParam(value = "cctvId", required = false) Long cctvId,
            @RequestParam(value = "cctvCode", required = false) String cctvCode,
            @RequestParam(value = "locationDesc", required = false) String locationDesc,
            @RequestParam(value = "frameCount", required = false, defaultValue = "4") int frameCount,
            @RequestParam(value = "frameIntervalSec", required = false, defaultValue = "5") int frameIntervalSec,
            @RequestParam(value = "stopOnDetect", required = false, defaultValue = "true") boolean stopOnDetect) {
        File tempVideo = null;
        File tempDir = null;
        
        try {
            log.info("🎬 [CCTV] Analyzing local video file (trash bbox): {}", videoFile.getOriginalFilename());
            
            // 1. 임시 디렉토리 생성
            tempDir = new File(System.getProperty("java.io.tmpdir"), "trash-bbox-frames-" + System.currentTimeMillis());
            tempDir.mkdirs();
            
            // 2. 업로드된 파일을 임시 파일로 저장
            tempVideo = File.createTempFile("video-", ".mp4", tempDir);
            videoFile.transferTo(tempVideo);
            log.info("📁 [CCTV] Video saved to: {}", tempVideo.getAbsolutePath());
            
            // 3. FFmpeg로 프레임 추출
            List<File> frameFiles = extractFrames(tempVideo, tempDir, frameCount, frameIntervalSec);
            log.info("📸 [CCTV] Extracted {} frames", frameFiles.size());
            
            if (frameFiles.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "프레임 추출 실패. FFmpeg가 설치되어 있는지 확인하세요."));
            }
            
            // 4. 프롬프트 설정 (bbox 분석 프롬프트 우선)
            String prompt = (customPrompt != null && !customPrompt.isEmpty())
                    ? customPrompt
                    : (trashBboxAnalysisPrompt != null && !trashBboxAnalysisPrompt.isEmpty()
                            ? trashBboxAnalysisPrompt
                            : trashAnalysisPrompt);
            
            Long resolvedCctvId = resolveCctvId(cctvId, cctvCode);
            String cameraId = resolvedCctvId != null
                    ? String.format("cctv-%03d", resolvedCctvId)
                    : (cctvCode != null ? cctvCode.toLowerCase() : "cctv-unknown");
            
            boolean savedToDb = false;
            Long incidentId = null;
            String incidentCode = null;
            String clipUrl = null;
            
            List<Map<String, Object>> perFrameResults = new ArrayList<>();
            List<String> overlayUrls = new ArrayList<>();
            
            // 5. 프레임 1장씩: Gemini bbox 분석 → overlay 생성 → S3 업로드
            for (int i = 0; i < frameFiles.size(); i++) {
                File frame = frameFiles.get(i);
                byte[] frameBytes;
                try {
                    frameBytes = Files.readAllBytes(frame.toPath());
                } catch (Exception e) {
                    log.warn("⚠️ [CCTV] Failed to read frame {}: {}", frame.getName(), e.getMessage());
                    continue;
                }
                
                String base64 = Base64.getEncoder().encodeToString(frameBytes);
                
                // 5-1) Gemini bbox 분석 (프레임 1장)
                log.info("🤖 [CCTV] Analyzing frame {} with Gemini (trash bbox)", i);
                String geminiText = geminiService.analyzeImage(prompt, base64);
                Map<String, Object> parsedJson = extractJsonFromGeminiResponse(geminiText);
                
                // 5-2) detections 추출
                List<Map<String, Object>> detections = new ArrayList<>();
                if (parsedJson != null && parsedJson.get("detections") instanceof List<?>) {
                    @SuppressWarnings("unchecked")
                    List<Map<String, Object>> dets = (List<Map<String, Object>>) parsedJson.get("detections");
                    detections = dets != null ? dets : new ArrayList<>();
                }
                
                // 5-3) overlay 생성 + S3 업로드
                String overlayUrl = null;
                try {
                    byte[] overlayBytes = imageOverlayService.drawOverlayJpeg(frameBytes, detections);
                    String s3Key = s3Service.uploadOverlayFrame(overlayBytes, cameraId);
                    overlayUrl = s3Service.toHttpUrl(s3Key);
                    overlayUrls.add(overlayUrl);
                    log.info("✅ [CCTV] Overlay uploaded for frame {}: {}", i, overlayUrl);
                } catch (Exception e) {
                    log.warn("⚠️ [CCTV] Overlay upload failed for frame {}: {}", frame.getName(), e.getMessage());
                }
                
                Map<String, Object> frameResult = new HashMap<>();
                frameResult.put("frameIndex", i);
                frameResult.put("frameFile", frame.getName());
                frameResult.put("parsedJson", parsedJson);
                frameResult.put("overlayUrl", overlayUrl);
                perFrameResults.add(frameResult);
                
                // 6. TRASH 최초 감지 시 incident 생성 + media_file 저장
                if (!savedToDb && parsedJson != null) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> incidentMap = (Map<String, Object>) parsedJson.get("incident");
                    String incidentType = incidentMap != null ? (String) incidentMap.get("incident_type") : null;
                    
                    if ("TRASH".equals(incidentType)) {
                        try {
                            log.info("💾 [CCTV] Saving TRASH incident to database (video, frame {})", i);
                            var createResponse = trashService.createTrashFromGemini(
                                    parsedJson,
                                    resolvedCctvId,
                                    (locationDesc != null && !locationDesc.isBlank())
                                            ? locationDesc
                                            : "CCTV 자동 탐지(비디오)"
                            );
                            savedToDb = true;
                            incidentId = createResponse.getIncidentId();
                            incidentCode = createResponse.getIncidentCode();
                            log.info("✅ [CCTV] Incident saved to DB: {} (id={})", incidentCode, incidentId);
                            
                            // 해당 프레임 overlay를 media_file로 저장
                            if (overlayUrl != null && incidentId != null) {
                                try {
                                    mediaFileService.saveFrame(incidentId, resolvedCctvId, overlayUrl, OffsetDateTime.now());
                                    log.info("✅ [CCTV] Overlay saved to media_file: {}", overlayUrl);
                                } catch (Exception e) {
                                    log.warn("⚠️ [CCTV] Failed to save overlay to media_file: {}", e.getMessage());
                                }
                            }

                            // ✅ 감지 프레임 기준 앞뒤 10초(총 20초) 클립 추출 → S3 업로드 → media_file(VIDEO) 저장
                            try {
                                int centerSeconds = i * frameIntervalSec;
                                File clipFile = extractVideoClip(tempVideo, tempDir, centerSeconds, 20);
                                byte[] clipBytes = Files.readAllBytes(clipFile.toPath());
                                String clipKey = s3Service.uploadVideo(clipBytes, cameraId);
                                clipUrl = s3Service.toHttpUrl(clipKey);
                                mediaFileService.saveVideo(incidentId, resolvedCctvId, clipUrl, OffsetDateTime.now());
                                log.info("✅ [CCTV] Clip saved to S3+media_file: {}", clipUrl);
                            } catch (Exception e) {
                                log.warn("⚠️ [CCTV] Failed to extract/upload clip: {}", e.getMessage());
                            }
                            
                            if (stopOnDetect) {
                                log.info("🛑 [CCTV] Stop on detect enabled, stopping frame processing");
                                break;
                            }
                        } catch (Exception e) {
                            log.error("❌ [CCTV] Failed to save TRASH incident from video frame", e);
                        }
                    }
                }
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("fileName", videoFile.getOriginalFilename());
            response.put("framesExtracted", frameFiles.size());
            response.put("framesProcessed", perFrameResults.size());
            response.put("savedToDb", savedToDb);
            response.put("incidentId", incidentId);
            response.put("incidentCode", incidentCode);
            response.put("overlayUrls", overlayUrls);
            response.put("results", perFrameResults);
            if (clipUrl != null) response.put("clipUrl", clipUrl);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("❌ [CCTV] Failed to analyze local video (trash bbox)", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        } finally {
            // 임시 파일 정리
            cleanupTempFiles(tempVideo, tempDir);
        }
    }

    /**
     * FFmpeg를 사용하여 영상에서 프레임 추출
     * 지정된 간격으로 지정된 개수만큼 추출
     */
    /**
     * FFmpeg를 사용하여 영상에서 프레임 추출 (간격 지정 가능)
     */
    private List<File> extractFrames(File videoFile, File outputDir, int frameCount, int intervalSeconds) throws IOException, InterruptedException {
        List<File> frames = new ArrayList<>();
        
        // FFmpeg 명령어 (Windows/Linux 모두 지원)
        // - 기본: PATH의 ffmpeg
        // - Windows 로컬에서 PATH가 꼬인 경우를 대비해 known 경로를 fallback으로 사용
        String ffmpegCommand = configuredFfmpegCommand != null ? configuredFfmpegCommand.trim() : "ffmpeg";
        if (ffmpegCommand.isEmpty()) ffmpegCommand = "ffmpeg";

        boolean isWindows = System.getProperty("os.name", "").toLowerCase().contains("win");
        if ("ffmpeg".equalsIgnoreCase(ffmpegCommand) && isWindows) {
            String[] candidates = new String[] {
                    "C:\\\\bin\\\\ffmpeg.exe",
                    "C:\\\\ffmpeg\\\\bin\\\\ffmpeg.exe"
            };
            for (String candidate : candidates) {
                File f = new File(candidate);
                if (f.exists() && f.isFile()) {
                    ffmpegCommand = f.getAbsolutePath();
                    break;
                }
            }
        }

        log.info("🎞️ [CCTV] Using ffmpeg command: {} (interval: {}s)", ffmpegCommand, intervalSeconds);
        
        // 각 프레임 추출 (0초, intervalSeconds, 2*intervalSeconds...)
        for (int i = 0; i < frameCount; i++) {
            int timeSeconds = i * intervalSeconds;
            File outputFile = new File(outputDir, String.format("frame_%02d.jpg", i));
            
            try {
                ProcessBuilder pb = new ProcessBuilder(
                        ffmpegCommand,
                        "-y", // 덮어쓰기
                        "-hide_banner",
                        "-loglevel", "error",
                        "-ss", String.valueOf(timeSeconds), // 시작 시간
                        "-i", videoFile.getAbsolutePath(), // 입력 파일
                        "-frames:v", "1", // 1장만 추출
                        "-q:v", "2", // 화질 (1~31, 낮을수록 좋음)
                        "-vf", "scale=640:-1", // 크기 조정 (너비 640px, 높이 자동)
                        outputFile.getAbsolutePath()
                );
                
                pb.redirectErrorStream(true);
                Process process = pb.start();
                
                // ffmpeg 출력(에러 포함) 캡쳐: 실패 원인 파악용
                String ffmpegOut = "";
                try (InputStream is = process.getInputStream()) {
                    byte[] bytes = is.readAllBytes();
                    if (bytes != null && bytes.length > 0) {
                        ffmpegOut = new String(bytes, StandardCharsets.UTF_8);
                    }
                } catch (Exception ignore) {
                    // best-effort
                }
                int exitCode = process.waitFor();
                
                if (exitCode == 0 && outputFile.exists() && outputFile.length() > 0) {
                    frames.add(outputFile);
                    log.debug("✅ [CCTV] Frame extracted: {} ({}s)", outputFile.getName(), timeSeconds);
                } else {
                    log.warn("⚠️ [CCTV] Failed to extract frame at {}s (exitCode={}, out={})",
                            timeSeconds, exitCode, (ffmpegOut == null ? "" : ffmpegOut));
                }
            } catch (Exception e) {
                log.error("❌ [CCTV] Error extracting frame at {}s", timeSeconds, e);
            }
        }
        
        return frames;
    }

    /**
     * 영상에서 특정 시점을 기준으로 앞뒤 durationSeconds/2 만큼 잘라 클립 생성
     * - centerSeconds 기준으로 (center-10s) ~ (center+10s) 형태 (durationSeconds=20일 때)
     * - 재인코딩 없이 copy를 기본으로 사용(빠름). 키프레임 위치에 따라 시작 지점이 약간 앞당겨질 수 있음.
     */
    private File extractVideoClip(File videoFile, File outputDir, int centerSeconds, int durationSeconds) throws IOException, InterruptedException {
        int startSec = Math.max(0, centerSeconds - (durationSeconds / 2));

        String ffmpegCommand = configuredFfmpegCommand != null ? configuredFfmpegCommand.trim() : "ffmpeg";
        if (ffmpegCommand.isEmpty()) ffmpegCommand = "ffmpeg";

        boolean isWindows = System.getProperty("os.name", "").toLowerCase().contains("win");
        if ("ffmpeg".equalsIgnoreCase(ffmpegCommand) && isWindows) {
            String[] candidates = new String[] {
                    "C:\\\\bin\\\\ffmpeg.exe",
                    "C:\\\\ffmpeg\\\\bin\\\\ffmpeg.exe"
            };
            for (String candidate : candidates) {
                File f = new File(candidate);
                if (f.exists() && f.isFile()) {
                    ffmpegCommand = f.getAbsolutePath();
                    break;
                }
            }
        }

        File outputFile = new File(outputDir, String.format("clip_%ds_%ds.mp4", startSec, durationSeconds));

        ProcessBuilder pb = new ProcessBuilder(
                ffmpegCommand,
                "-y",
                "-hide_banner",
                "-loglevel", "error",
                "-ss", String.valueOf(startSec),
                "-i", videoFile.getAbsolutePath(),
                "-t", String.valueOf(durationSeconds),
                "-c", "copy",
                outputFile.getAbsolutePath()
        );

        pb.redirectErrorStream(true);
        Process process = pb.start();

        String ffmpegOut = "";
        try (InputStream is = process.getInputStream()) {
            byte[] bytes = is.readAllBytes();
            if (bytes != null && bytes.length > 0) {
                ffmpegOut = new String(bytes, StandardCharsets.UTF_8);
            }
        } catch (Exception ignore) {}

        int exitCode = process.waitFor();
        if (exitCode == 0 && outputFile.exists() && outputFile.length() > 0) {
            return outputFile;
        }
        throw new IOException("FFmpeg clip extraction failed (exitCode=" + exitCode + ", out=" + ffmpegOut + ")");
    }

    /**
     * 이미지 파일을 Base64 문자열로 변환
     */
    private String imageToBase64(File imageFile) {
        try {
            byte[] imageBytes = Files.readAllBytes(imageFile.toPath());
            return Base64.getEncoder().encodeToString(imageBytes);
        } catch (IOException e) {
            log.error("❌ [CCTV] Failed to convert image to Base64: {}", imageFile.getName(), e);
            return null;
        }
    }

    /**
     * 임시 파일 정리
     */
    private void cleanupTempFiles(File videoFile, File tempDir) {
        try {
            if (videoFile != null && videoFile.exists()) {
                videoFile.delete();
            }
            if (tempDir != null && tempDir.exists()) {
                File[] files = tempDir.listFiles();
                if (files != null) {
                    for (File f : files) {
                        f.delete();
                    }
                }
                tempDir.delete();
            }
        } catch (Exception e) {
            log.warn("⚠️ [CCTV] Failed to cleanup temp files", e);
        }
    }

    /**
     * TRASH 프레임(1장) Gemini 분석 + (옵션) DB 저장 + overlay/media_file 저장
     * POST /api/cctv/{cctvCode}/frame/analyze-trash-gemini
     */
    @PostMapping("/{cctvCode}/frame/analyze-trash-gemini")
    public ResponseEntity<?> analyzeTrashFrameWithGemini(
            @PathVariable String cctvCode,
            @RequestParam("image") MultipartFile imageFile,
            @RequestParam(value = "saveToDb", required = false, defaultValue = "true") boolean saveToDb
    ) {
        try {
            byte[] imageBytes = imageFile.getBytes();
            String base64 = Base64.getEncoder().encodeToString(imageBytes);

            String prompt = (trashBboxAnalysisPrompt != null && !trashBboxAnalysisPrompt.isBlank())
                    ? trashBboxAnalysisPrompt
                    : trashAnalysisPrompt;

            String geminiText = geminiService.analyzeImage(prompt, base64);
            Map<String, Object> parsedJson = extractJsonFromGeminiResponse(geminiText);
            if (parsedJson == null) {
                return ResponseEntity.ok(Map.of("warning", "Gemini JSON 파싱 실패", "raw", geminiText));
            }

            // detections 추출 (overlay용)
            List<Map<String, Object>> detections = new ArrayList<>();
            if (parsedJson.get("detections") instanceof List<?> list) {
                try {
                    @SuppressWarnings("unchecked")
                    List<Map<String, Object>> dets = (List<Map<String, Object>>) list;
                    detections = dets != null ? dets : new ArrayList<>();
                } catch (Exception ignore) {}
            }

            String overlayUrl = null;
            try {
                byte[] overlayBytes = imageOverlayService.drawOverlayJpeg(imageBytes, detections);
                Long resolvedCctvId = resolveCctvId(null, cctvCode);
                String cameraId = resolvedCctvId != null
                        ? String.format("cctv-%03d", resolvedCctvId)
                        : cctvCode.toLowerCase();
                String overlayKey = s3Service.uploadOverlayFrame(overlayBytes, cameraId);
                overlayUrl = s3Service.toHttpUrl(overlayKey);
            } catch (Exception e) {
                log.warn("⚠️ [CCTV] (TrashGemini) overlay 생성/업로드 실패: {}", e.getMessage());
            }

            Map<String, Object> response = new HashMap<>();
            response.put("analysis", parsedJson);
            response.put("overlayUrl", overlayUrl);
            response.put("saveToDb", saveToDb);

            if (saveToDb) {
                Long resolvedCctvId = resolveCctvId(null, cctvCode);
                String locationDesc = resolveCctvLocationDesc(resolvedCctvId, cctvCode);
                IncidentCreateResponse created = trashService.createTrashFromGemini(parsedJson, resolvedCctvId, locationDesc);
                response.put("incidentId", created.getIncidentId());
                response.put("incidentCode", created.getIncidentCode());

                // media_file 저장(overlay 프레임)
                if (overlayUrl != null && created.getIncidentId() != null) {
                    try {
                        mediaFileService.saveFrame(created.getIncidentId(), resolvedCctvId, overlayUrl, OffsetDateTime.now());
                    } catch (Exception e) {
                        response.put("mediaSaveWarning", e.getMessage());
                    }
                }
            }

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("❌ [CCTV] (TrashGemini) Failed to analyze frame", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }
}

