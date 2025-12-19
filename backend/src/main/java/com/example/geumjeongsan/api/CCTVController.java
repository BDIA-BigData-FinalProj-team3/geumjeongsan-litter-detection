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
import com.example.geumjeongsan.domain.incident.FireService;
import com.example.geumjeongsan.domain.cctv.CCTVRepository;
import com.example.geumjeongsan.domain.weather.Weather;
import com.example.geumjeongsan.service.GeminiService;
import com.example.geumjeongsan.service.GeminiJsonExtractor;
import com.example.geumjeongsan.service.S3Service;
import com.example.geumjeongsan.service.ImageOverlayService;
import com.example.geumjeongsan.service.MediaFileService;
import com.example.geumjeongsan.service.WeatherService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
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
import java.util.concurrent.TimeUnit;
import java.net.URI;

@RestController
@RequestMapping("/api/cctv")
@Slf4j
public class CCTVController {

    private final IncidentService incidentService;
    private final TrashService trashService;
    private final EmergencyService emergencyService;
    private final FireService fireService;
    private final CCTVRepository cctvRepository;
    private final RestTemplate restTemplate;
    private final S3Service s3Service;
    private final GeminiService geminiService;
    private final GeminiJsonExtractor geminiJsonExtractor;
    private final WeatherService weatherService;

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

    @Value("${gemini.prompt.fire-bbox-analysis:}")
    private String fireBboxAnalysisPrompt;

    /**
     * FFmpeg 실행 커맨드/경로
     * - 기본값: "ffmpeg" (PATH에서 찾음)
     * - 로컬 Windows에서 PATH가 안 잡히는 경우를 대비해, 아래 extractFrames에서 known 경로를 자동 탐색합니다.
     */
    @Value("${app.ffmpeg.command:ffmpeg}")
    private String configuredFfmpegCommand;

    /**
     * Python 실행 커맨드/경로 (선택)
     * - 예: C:/Users/kmk/anaconda3/python.exe
     * - 예: py -3
     * - 예: python
     */
    @Value("${app.python.command:}")
    private String configuredPythonCommand;

    private final ImageOverlayService imageOverlayService;
    private final MediaFileService mediaFileService;
    private final com.example.geumjeongsan.service.VideoFrameExtractor videoFrameExtractor;
    
    @Value("${app.cctv.fire-analysis.video-url}")
    private String fireAnalysisVideoUrl;
    
    @Value("${app.cctv.fire-analysis.frame-interval-seconds:5}")
    private int frameIntervalSeconds;
    
    @Value("${app.cctv.fire-analysis.max-frames:12}")
    private int maxFrames;

    public CCTVController(IncidentService incidentService,
                          TrashService trashService,
                          EmergencyService emergencyService,
                          FireService fireService,
                          CCTVRepository cctvRepository,
                          RestTemplate restTemplate,
                          S3Service s3Service,
                          GeminiService geminiService,
                          GeminiJsonExtractor geminiJsonExtractor,
                          ImageOverlayService imageOverlayService,
                          MediaFileService mediaFileService,
                          com.example.geumjeongsan.service.VideoFrameExtractor videoFrameExtractor,
                          WeatherService weatherService) {
        this.incidentService = incidentService;
        this.trashService = trashService;
        this.emergencyService = emergencyService;
        this.fireService = fireService;
        this.cctvRepository = cctvRepository;
        this.restTemplate = restTemplate;
        this.s3Service = s3Service;
        this.geminiService = geminiService;
        this.geminiJsonExtractor = geminiJsonExtractor;
        this.imageOverlayService = imageOverlayService;
        this.mediaFileService = mediaFileService;
        this.videoFrameExtractor = videoFrameExtractor;
        this.weatherService = weatherService;
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
                    if (yoloResponse != null && yoloResponse.getResult() != null) {
                        var r = yoloResponse.getResult();
                        log.info("✅ [CCTV] (Emergency) YOLO result: fallen_events={}, total_frames={}, frame_urls={}", 
                                r.getFallen_events(), r.getTotal_frames(), 
                                r.getFrame_urls() != null ? r.getFrame_urls().size() : 0);
                    }
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

            // 2-b) YOLO가 frame_urls를 반환하지 않았으면 (낙상 없음) → 정상으로 판단하고 Gemini 스킵
            if (base64Images.isEmpty()) {
                log.info("✅ [CCTV] (Emergency) No frames from YOLO (fallen_events=0), skipping Gemini analysis");
                
                Map<String, Object> response = new HashMap<>();
                Map<String, Object> analysis = new HashMap<>();
                analysis.put("emergency_level", "정상");
                analysis.put("report_possibility_score", "총 17점 중 17점 (신고 발생 가능성 매우 높음 / 위험 상황 아님)");
                analysis.put("description", "YOLO 분석 결과: 낙상 이벤트 없음. 정상 상황으로 판단됩니다.");
                analysis.put("confidence", 0.95);
                
                Map<String, Object> incident = new HashMap<>();
                incident.put("incident_type", "EMERGENCY");
                incident.put("severity_level", "LOW");
                analysis.put("incident", incident);
                
                response.put("analysis", analysis);
                if (yoloResponse != null) {
                    response.put("yolo", yoloResponse);
                }
                response.put("saveToDb", false);  // 정상 상황은 DB에 저장하지 않음
                
                return ResponseEntity.ok(response);
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
                // 원본 JSON도 참고 정보로 첨부 (길면 잘라서 전달)
                try {
                    String raw = new ObjectMapper().writeValueAsString(yoloResponse);
                    if (raw != null) {
                        String trimmed = raw.length() > 3000 ? raw.substring(0, 3000) + "...(truncated)" : raw;
                        prompt.append("[YOLO(모델서버) 원본 JSON]\n").append(trimmed).append("\n\n");
                    }
                } catch (Exception ignore) {}
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
            if (yoloResponse != null) {
                response.put("yolo", yoloResponse);
            }

            // YOLO clipUrl, frameUrls는 DB 저장 여부와 상관없이 항상 응답에 포함
            String clipUrl = (yoloResponse != null && yoloResponse.getResult() != null)
                    ? yoloResponse.getResult().getClip_url()
                    : null;
            if (clipUrl != null && !clipUrl.isBlank()) {
                response.put("clipUrl", clipUrl);
            }
            if (!usedFrameUrls.isEmpty()) {
                response.put("frameUrls", usedFrameUrls);
            }

            if (saveToDb) {
                try {
                    log.info("💾 [CCTV] (Emergency) Saving incident to database (cctvCode: {})", cctvCode);
                    Long resolvedCctvId = resolveCctvId(null, cctvCode);
                    String resolvedLocationDesc = resolveCctvLocationDesc(resolvedCctvId, cctvCode);
                    OffsetDateTime detectedAtKst = OffsetDateTime.now(ZoneOffset.ofHours(9));

                    log.info("💾 [CCTV] (Emergency) Resolved: cctvId={}, location={}", resolvedCctvId, resolvedLocationDesc);

                    // YOLO 사용 여부 확인
                    boolean hasYolo = yoloResponse != null && yoloResponse.getResult() != null;

                    IncidentCreateResponse created = emergencyService.createEmergencyFromGemini(
                            parsed,
                            resolvedCctvId,
                            resolvedLocationDesc,
                            detectedAtKst,
                            hasYolo
                    );
                    response.put("incidentId", created.getIncidentId());
                    response.put("incidentCode", created.getIncidentCode());

                    log.info("✅ [CCTV] (Emergency) Incident saved to DB: {} (ID: {})", created.getIncidentCode(), created.getIncidentId());

                    // media 저장 (가능하면)
                    try {
                        Long incidentId = created.getIncidentId();
                        if (incidentId != null) {
                            // clip_url을 DB에 저장
                            if (clipUrl != null && !clipUrl.isBlank()) {
                                mediaFileService.saveVideo(incidentId, resolvedCctvId, clipUrl, detectedAtKst);
                                log.info("✅ [CCTV] (Emergency) Clip saved to media_file: {}", clipUrl);
                            }

                            // frame_urls를 DB에 저장
                            if (!usedFrameUrls.isEmpty()) {
                                for (String u : usedFrameUrls) {
                                    if (u == null || u.isBlank()) continue;
                                    mediaFileService.saveFrame(incidentId, resolvedCctvId, u, detectedAtKst);
                                }
                                log.info("✅ [CCTV] (Emergency) {} frames saved to media_file", usedFrameUrls.size());
                            }
                        }
                    } catch (Exception e) {
                        log.warn("⚠️ [CCTV] (Emergency) Failed to save media files: {}", e.getMessage());
                        response.put("mediaSaveWarning", e.getMessage());
                    }
                } catch (Exception e) {
                    log.error("❌ [CCTV] (Emergency) Failed to save incident to DB", e);
                    response.put("dbSaveError", e.getMessage());
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

        // 1) s3:// 형태 지원 (예: s3://bucket/key 또는 s3://key)
        try {
            if (imageUrl.startsWith("s3://")) {
                String noScheme = imageUrl.substring("s3://".length());
                String key = noScheme;
                int slash = noScheme.indexOf('/');
                // s3://bucket/key 형태면 bucket은 무시하고 key만 사용(현재 S3Service는 기본 bucket 사용)
                if (slash > 0) {
                    key = noScheme.substring(slash + 1);
                }
                if (key != null && !key.isBlank()) {
                    byte[] bytes = s3Service.downloadBytes(key);
                    return bytes != null && bytes.length > 0 ? Base64.getEncoder().encodeToString(bytes) : null;
                }
            }
        } catch (Exception ignore) {}

        // 2) 기본: HTTP(S)로 다운로드
        try {
            byte[] bytes = restTemplate.getForObject(imageUrl, byte[].class);
            if (bytes != null && bytes.length > 0) {
                return Base64.getEncoder().encodeToString(bytes);
            }
        } catch (Exception e) {
            // continue to fallback
        }

        // 3) amazonaws.com URL이면 key를 추출해 S3로 다운로드 시도
        try {
            String s3Key = tryParseS3KeyFromHttpUrl(imageUrl);
            if (s3Key != null && !s3Key.isBlank()) {
                byte[] bytes = s3Service.downloadBytes(s3Key);
                return bytes != null && bytes.length > 0 ? Base64.getEncoder().encodeToString(bytes) : null;
            }
        } catch (Exception ignore) {}

        // 4) CloudFront/기타 URL이면 path를 key로 가정(배포에서 CF가 버킷 루트 프록시인 경우)
        try {
            URI uri = URI.create(imageUrl);
            String path = uri.getPath();
            if (path != null && path.startsWith("/")) path = path.substring(1);
            if (path != null && !path.isBlank()) {
                byte[] bytes = s3Service.downloadBytes(path);
                return bytes != null && bytes.length > 0 ? Base64.getEncoder().encodeToString(bytes) : null;
            }
        } catch (Exception ignore) {}

        return null;
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
     * CCTV 프레임을 Gemini로 분석 (Qwen과 동일한 multipart 방식)
     * POST /api/cctv/{cctvCode}/frame/analyze-with-gemini
     * 
     * @param cctvCode - CCTV 코드 (예: "CCTV-003")
     * @param imageFile - 업로드된 이미지 파일
     * @param saveToDb - DB 저장 여부 (optional, 기본 true)
     * @return Gemini 분석 결과
     */
    @PostMapping("/{cctvCode}/frame/analyze-with-gemini")
    public ResponseEntity<?> analyzeFrameWithGemini(
            @PathVariable String cctvCode,
            @RequestParam("image") MultipartFile imageFile,
            @RequestParam(value = "saveToDb", required = false, defaultValue = "true") boolean saveToDb) {
        try {
            log.info("🖼️ [CCTV] Analyzing frame with Gemini for: {}", cctvCode);
            
            // 1. 이미지를 S3에 업로드
            String cameraId = cctvCode.toLowerCase();
            byte[] imageBytes = imageFile.getBytes();
            String frameKey = s3Service.uploadFrame(imageBytes, cameraId);
            String frameUrl = s3Service.toHttpUrl(frameKey);
            log.info("📤 [CCTV] Frame uploaded to S3: {}", frameKey);
            
            // 2. Gemini용 base64 변환
            String geminiBase64 = Base64.getEncoder().encodeToString(imageBytes);
            
            // 3. 프롬프트 선택
            String prompt = (trashBboxAnalysisPrompt != null && !trashBboxAnalysisPrompt.isBlank())
                    ? trashBboxAnalysisPrompt
                    : trashAnalysisPrompt;
            
            // 4. Gemini 분석
            log.info("🤖 [CCTV] Calling Gemini for trash analysis");
            String geminiText = geminiService.analyzeImage(prompt, geminiBase64);
            Map<String, Object> parsedJson = extractJsonFromGeminiResponse(geminiText);
            
            if (parsedJson == null) {
                log.warn("⚠️ [CCTV] Failed to parse Gemini JSON response");
                return ResponseEntity.ok(Map.of(
                        "warning", "Gemini JSON 파싱 실패",
                        "raw", geminiText,
                        "frameUrl", frameUrl
                ));
            }
            
            // 5. detections 추출 (overlay용)
            List<Map<String, Object>> detections = new ArrayList<>();
            if (parsedJson.get("detections") instanceof List<?> list) {
                try {
                    @SuppressWarnings("unchecked")
                    List<Map<String, Object>> dets = (List<Map<String, Object>>) list;
                    detections = dets != null ? dets : new ArrayList<>();
                } catch (Exception ignore) {}
            }
            
            // 6. overlay 생성 + S3 업로드
            String overlayUrl = null;
            try {
                byte[] overlayBytes = imageOverlayService.drawOverlayJpeg(imageBytes, detections);
                String overlayKey = s3Service.uploadOverlayFrame(overlayBytes, cameraId);
                overlayUrl = s3Service.toHttpUrl(overlayKey);
                log.info("✅ [CCTV] Overlay image uploaded: {}", overlayUrl);
            } catch (Exception e) {
                log.warn("⚠️ [CCTV] Failed to create/upload overlay: {}", e.getMessage());
            }
            
            // 7. DB 저장 (옵션)
            Long incidentId = null;
            String incidentCode = null;
            boolean savedToDb = false;
            
            if (saveToDb && parsedJson != null) {
                @SuppressWarnings("unchecked")
                Map<String, Object> incidentMap = (Map<String, Object>) parsedJson.get("incident");
                String incidentType = incidentMap != null ? (String) incidentMap.get("incident_type") : null;
                
                if ("TRASH".equals(incidentType)) {
                    try {
                        log.info("💾 [CCTV] Saving TRASH incident to database");
                        Long resolvedCctvId = resolveCctvId(null, cctvCode);
                        var createResponse = trashService.createTrashFromGemini(
                                parsedJson,
                                resolvedCctvId,
                                "CCTV 버튼 캡처 프레임"
                        );
                        savedToDb = true;
                        incidentId = createResponse.getIncidentId();
                        incidentCode = createResponse.getIncidentCode();
                        log.info("✅ [CCTV] Incident saved to DB: {} (ID: {})", incidentCode, incidentId);
                        
                        // media_file에 overlay 이미지 저장
                        if (overlayUrl != null && incidentId != null) {
                            try {
                                mediaFileService.saveFrame(incidentId, resolvedCctvId, overlayUrl, 
                                        OffsetDateTime.now());
                                log.info("✅ [CCTV] Overlay image saved to media_file: {}", overlayUrl);
                            } catch (Exception e) {
                                log.warn("⚠️ [CCTV] Failed to save overlay to media_file: {}", e.getMessage());
                            }
                        }
                    } catch (Exception e) {
                        log.error("❌ [CCTV] Failed to save incident to DB", e);
                    }
                }
            }
            
            // 8. 응답
            Map<String, Object> response = new HashMap<>();
            response.put("analysis", parsedJson);
            response.put("frameKey", frameKey);
            response.put("frameUrl", frameUrl);
            response.put("overlayUrl", overlayUrl);
            response.put("savedToDb", savedToDb);
            if (incidentCode != null) {
                response.put("incidentCode", incidentCode);
            }
            if (incidentId != null) {
                response.put("incidentId", incidentId);
            }
            
            log.info("✅ [CCTV] Gemini analysis completed");
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("❌ [CCTV] Failed to analyze frame with Gemini for {}", cctvCode, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * 화재 분석: 여러 프레임을 Gemini로 분석
     * POST /api/cctv/{cctvCode}/frame/analyze-fire-multi
     *
     * @param cctvCode - CCTV 코드 (예: "CCTV-002")
     * @param imageFiles - 업로드된 이미지 파일들 (4장)
     * @param saveToDb - DB 저장 여부 (기본 true)
     * @return 화재 분석 결과
     */
    @PostMapping("/{cctvCode}/frame/analyze-fire-multi")
    public ResponseEntity<?> analyzeFireFrames(
            @PathVariable String cctvCode,
            @RequestParam("images") MultipartFile[] imageFiles,
            @RequestParam(value = "saveToDb", defaultValue = "true") boolean saveToDb
    ) {
        try {
            log.info("🔥 [CCTV] Analyzing {} fire frames for: {}", imageFiles.length, cctvCode);
            
            String cameraId = cctvCode.toLowerCase();
            List<String> frameUrls = new ArrayList<>();
            List<String> overlayUrls = new ArrayList<>();
            List<Map<String, Object>> allDetections = new ArrayList<>(); // 모든 detections 수집
            int totalDetectionCount = 0;
            boolean fireDetected = false;
            
            // 각 프레임 처리
            for (int i = 0; i < imageFiles.length; i++) {
                log.info("🖼️ [CCTV] Processing frame {}/{}", i + 1, imageFiles.length);
                
                byte[] imageBytes = imageFiles[i].getBytes();
                
                // 1. S3에 원본 업로드
                String frameKey = s3Service.uploadFrame(imageBytes, cameraId);
                String frameUrl = s3Service.toHttpUrl(frameKey);
                frameUrls.add(frameUrl);
                log.info("📤 [CCTV] Frame {} uploaded to S3: {}", i + 1, frameKey);
                
                // 2. Gemini 분석 (fire-bbox-analysis 프롬프트)
                String base64 = Base64.getEncoder().encodeToString(imageBytes);
                
                String prompt = (fireBboxAnalysisPrompt != null && !fireBboxAnalysisPrompt.isBlank())
                        ? fireBboxAnalysisPrompt
                        : "Detect fire and smoke in this image and return JSON with detections array.";
                
                log.info("🤖 [CCTV] Calling Gemini for frame {}", i + 1);
                String geminiText = geminiService.analyzeImage(prompt, base64);
                Map<String, Object> parsedJson = extractJsonFromGeminiResponse(geminiText);
                
                if (parsedJson == null) {
                    log.warn("⚠️ [CCTV] Failed to parse Gemini response for frame {}", i + 1);
                    continue;
                }
                
                // 3. detections 추출
                List<Map<String, Object>> detections = new ArrayList<>();
                if (parsedJson.get("detections") instanceof List<?> list) {
                    try {
                        @SuppressWarnings("unchecked")
                        List<Map<String, Object>> dets = (List<Map<String, Object>>) list;
                        detections = dets != null ? dets : new ArrayList<>();
                    } catch (Exception ignore) {}
                }
                
                if (!detections.isEmpty()) {
                    fireDetected = true;
                    totalDetectionCount += detections.size();
                    allDetections.addAll(detections); // 전체 목록에 추가
                    log.info("🔥 [CCTV] Frame {} detected {} fire/smoke objects", i + 1, detections.size());
                    
                    // 4. overlay 생성 + S3 업로드
                    try {
                        byte[] overlayBytes = imageOverlayService.drawOverlayJpeg(imageBytes, detections);
                        String overlayKey = s3Service.uploadOverlayFrame(overlayBytes, cameraId);
                        String overlayUrl = s3Service.toHttpUrl(overlayKey);
                        overlayUrls.add(overlayUrl);
                        log.info("✅ [CCTV] Frame {} overlay uploaded: {}", i + 1, overlayUrl);
                    } catch (Exception e) {
                        log.warn("⚠️ [CCTV] Failed to create overlay for frame {}: {}", i + 1, e.getMessage());
                    }
                } else {
                    log.info("✅ [CCTV] Frame {}: No fire/smoke detected", i + 1);
                }
            }
            
            // 5. DB 저장 (화재 감지 시)
            Long incidentId = null;
            String incidentCode = null;
            boolean savedToDbResult = false;
            
            if (saveToDb && fireDetected) {
                try {
                    log.info("💾 [CCTV] Saving fire incident to database");
                    Long resolvedCctvId = resolveCctvId(null, cctvCode);
                    
                    // detections 전체를 FireService에 전달
                    var createResponse = fireService.createFireFromGemini(
                            allDetections,
                            resolvedCctvId,
                            resolveCctvLocationDesc(resolvedCctvId, cctvCode)
                    );
                    incidentId = createResponse.getIncidentId();
                    incidentCode = createResponse.getIncidentCode();
                    savedToDbResult = true;
                    log.info("✅ [CCTV] Fire incident saved to DB: {} (ID: {})", incidentCode, incidentId);
                    
                } catch (Exception e) {
                    log.error("❌ [CCTV] Failed to save fire incident to DB", e);
                }
            }
            
            // 6. 응답
            Map<String, Object> response = new HashMap<>();
            response.put("fireDetected", fireDetected);
            response.put("frameUrls", frameUrls);
            response.put("overlayUrls", overlayUrls);
            response.put("detectionCount", totalDetectionCount);
            response.put("savedToDb", savedToDbResult);
            if (incidentId != null) {
                response.put("incidentId", incidentId);
                response.put("incidentCode", incidentCode);
            }
            
            log.info("✅ [CCTV] Fire analysis complete: detected={}, count={}", fireDetected, totalDetectionCount);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("❌ [CCTV] Failed to analyze fire frames", e);
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
     * S3(HTTP) MP4 URL 기반 쓰레기 분석 (bbox + overlay + 클립 저장)
     * - 감지 프레임 기준 앞뒤 5초(총 10초) 클립 추출 → S3 업로드 → media_file(VIDEO) 저장
     *
     * POST /api/cctv/{cctvCode}/video/analyze-trash-video-s3
     *
     * @param cctvCode CCTV 코드 (예: CCTV-003)
     * @param videoUrl S3 HTTP URL (예: https://bucket.s3.ap-northeast-2.amazonaws.com/...mp4)
     */
    @PostMapping("/{cctvCode}/video/analyze-trash-video-s3")
    public ResponseEntity<?> analyzeTrashVideoFromS3(
            @PathVariable String cctvCode,
            @RequestParam("videoUrl") String videoUrl,
            @RequestParam(value = "saveToDb", required = false, defaultValue = "true") boolean saveToDb,
            @RequestParam(value = "frameCount", required = false, defaultValue = "4") int frameCount,
            @RequestParam(value = "frameIntervalSec", required = false, defaultValue = "5") int frameIntervalSec,
            @RequestParam(value = "stopOnDetect", required = false, defaultValue = "true") boolean stopOnDetect
    ) {
        File tempVideo = null;
        File tempDir = null;

        try {
            if (videoUrl == null || videoUrl.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "videoUrl이 비어 있습니다."));
            }

            log.info("🎬 [CCTV] Analyzing S3 video URL (trash bbox): cctvCode={}, url={}", cctvCode, videoUrl);

            // 1) 임시 디렉토리 생성
            tempDir = new File(System.getProperty("java.io.tmpdir"), "trash-bbox-s3-" + System.currentTimeMillis());
            tempDir.mkdirs();

            // 2) URL에서 mp4 다운로드
            tempVideo = videoFrameExtractor.downloadVideoToTemp(videoUrl.trim());

            // 3) FFmpeg로 프레임 추출
            List<File> frameFiles = extractFrames(tempVideo, tempDir, frameCount, frameIntervalSec);
            log.info("📸 [CCTV] Extracted {} frames (trash bbox)", frameFiles.size());

            if (frameFiles.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "프레임 추출 실패. FFmpeg가 설치되어 있는지 확인하세요."));
            }

            // 4) 프롬프트 설정 (bbox 분석 프롬프트 우선)
            String prompt = (trashBboxAnalysisPrompt != null && !trashBboxAnalysisPrompt.isEmpty())
                    ? trashBboxAnalysisPrompt
                    : trashAnalysisPrompt;

            Long resolvedCctvId = resolveCctvId(null, cctvCode);
            String resolvedLocationDesc = resolveCctvLocationDesc(resolvedCctvId, cctvCode);
            String cameraId = resolvedCctvId != null
                    ? String.format("cctv-%03d", resolvedCctvId)
                    : (cctvCode != null ? cctvCode.toLowerCase() : "cctv-unknown");

            boolean savedToDbResult = false;
            Long incidentId = null;
            String incidentCode = null;
            String clipUrl = null;

            List<Map<String, Object>> perFrameResults = new ArrayList<>();
            List<String> overlayUrls = new ArrayList<>();

            // 5) 프레임 1장씩: Gemini bbox 분석 → overlay 생성 → S3 업로드
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
                log.info("🤖 [CCTV] Analyzing frame {} with Gemini (trash bbox, S3 video)", i);
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

                // 6) TRASH 최초 감지 시 incident 생성 + media_file 저장 + 클립 저장 (옵션)
                if (saveToDb && !savedToDbResult && parsedJson != null) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> incidentMap = (Map<String, Object>) parsedJson.get("incident");
                    String incidentType = incidentMap != null ? (String) incidentMap.get("incident_type") : null;

                    if ("TRASH".equals(incidentType)) {
                        try {
                            log.info("💾 [CCTV] Saving TRASH incident to database (S3 video, frame {})", i);
                            var createResponse = trashService.createTrashFromGemini(
                                    parsedJson,
                                    resolvedCctvId,
                                    (resolvedLocationDesc != null && !resolvedLocationDesc.isBlank())
                                            ? resolvedLocationDesc
                                            : "CCTV 자동 탐지(비디오)"
                            );
                            savedToDbResult = true;
                            incidentId = createResponse.getIncidentId();
                            incidentCode = createResponse.getIncidentCode();

                            // overlay 프레임 저장
                            if (overlayUrl != null && incidentId != null) {
                                try {
                                    mediaFileService.saveFrame(incidentId, resolvedCctvId, overlayUrl, OffsetDateTime.now());
                                    log.info("✅ [CCTV] Overlay saved to media_file: {}", overlayUrl);
                                } catch (Exception e) {
                                    log.warn("⚠️ [CCTV] Failed to save overlay to media_file: {}", e.getMessage());
                                }
                            }

                            // ✅ 감지 프레임 기준 앞뒤 5초(총 10초) 클립 추출 → S3 업로드 → media_file(VIDEO) 저장
                            try {
                                int centerSeconds = i * frameIntervalSec;
                                File clipFile = extractVideoClip(tempVideo, tempDir, centerSeconds, 10);
                                byte[] clipBytes = Files.readAllBytes(clipFile.toPath());
                                String clipKey = s3Service.uploadVideo(clipBytes, cameraId);
                                clipUrl = s3Service.toHttpUrl(clipKey);
                                mediaFileService.saveVideo(incidentId, resolvedCctvId, clipUrl, OffsetDateTime.now());
                                log.info("✅ [CCTV] Trash clip saved to S3+media_file: {}", clipUrl);
                            } catch (Exception e) {
                                log.warn("⚠️ [CCTV] Failed to extract/upload trash clip: {}", e.getMessage());
                            }

                            if (stopOnDetect) {
                                log.info("🛑 [CCTV] Stop on detect enabled, stopping frame processing");
                                break;
                            }
                        } catch (Exception e) {
                            log.error("❌ [CCTV] Failed to save TRASH incident from S3 video frame", e);
                        }
                    }
                }
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("videoUrl", videoUrl);
            response.put("framesExtracted", frameFiles.size());
            response.put("framesProcessed", perFrameResults.size());
            response.put("savedToDb", savedToDbResult);
            response.put("incidentId", incidentId);
            response.put("incidentCode", incidentCode);
            response.put("overlayUrls", overlayUrls);
            response.put("results", perFrameResults);
            if (clipUrl != null) response.put("clipUrl", clipUrl);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("❌ [CCTV] Failed to analyze S3 video (trash bbox)", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        } finally {
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
     * 이미지를 S3에 업로드하고 s3Key 반환
     * POST /api/cctv/{cctvCode}/frame/upload
     * 
     * @param cctvCode CCTV 코드
     * @param imageFile 업로드된 이미지 파일
     * @return S3 key
     */
    @PostMapping("/{cctvCode}/frame/upload")
    public ResponseEntity<?> uploadFrameToS3(
            @PathVariable String cctvCode,
            @RequestParam("image") MultipartFile imageFile) {
        try {
            log.info("📤 [CCTV] Uploading frame to S3: {}", cctvCode);
            
            String cameraId = cctvCode.toLowerCase();
            byte[] imageBytes = imageFile.getBytes();
            String s3Key = s3Service.uploadFrame(imageBytes, cameraId);
            
            log.info("✅ [CCTV] Frame uploaded to S3: {}", s3Key);
            
            return ResponseEntity.ok(Map.of("s3Key", s3Key));
        } catch (Exception e) {
            log.error("❌ [CCTV] Failed to upload frame to S3", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * S3 이미지로 쓰레기 Gemini 분석
     * POST /api/cctv/{cctvCode}/frame/analyze-trash-gemini-from-s3
     * 
     * @param cctvCode CCTV 코드 (예: "CCTV-003")
     * @param s3Key S3 이미지 경로 (예: "cctv/cctv-003/frames/cctv-003_frame_20251218T120000.jpg")
     * @param saveToDb DB 저장 여부 (기본: true)
     * @return 분석 결과 (analysis, overlayUrl, incidentId 등)
     */
    @PostMapping("/{cctvCode}/frame/analyze-trash-gemini-from-s3")
    public ResponseEntity<?> analyzeTrashGeminiFromS3(
            @PathVariable String cctvCode,
            @RequestParam("s3Key") String s3Key,
            @RequestParam(value = "saveToDb", required = false, defaultValue = "true") boolean saveToDb
    ) {
        try {
            log.info("🖼️ [CCTV] Analyzing trash from S3 with Gemini: {} (s3Key: {})", cctvCode, s3Key);
            
            // 1. S3에서 이미지 다운로드
            byte[] imageBytes = s3Service.downloadBytes(s3Key);
            String base64 = Base64.getEncoder().encodeToString(imageBytes);
            
            // 2. Gemini 프롬프트 설정
            String prompt = (trashBboxAnalysisPrompt != null && !trashBboxAnalysisPrompt.isBlank())
                    ? trashBboxAnalysisPrompt
                    : trashAnalysisPrompt;
            
            // 3. Gemini 분석
            log.info("🤖 [CCTV] Calling Gemini for trash analysis");
            String geminiText = geminiService.analyzeImage(prompt, base64);
            Map<String, Object> parsedJson = extractJsonFromGeminiResponse(geminiText);
            
            if (parsedJson == null) {
                log.warn("⚠️ [CCTV] Failed to parse Gemini JSON response");
                return ResponseEntity.ok(Map.of("warning", "Gemini JSON 파싱 실패", "raw", geminiText));
            }
            
            // 4. detections 추출 (overlay용)
            List<Map<String, Object>> detections = new ArrayList<>();
            if (parsedJson.get("detections") instanceof List<?> list) {
                try {
                    @SuppressWarnings("unchecked")
                    List<Map<String, Object>> dets = (List<Map<String, Object>>) list;
                    detections = dets != null ? dets : new ArrayList<>();
                } catch (Exception ignore) {}
            }
            
            // 5. Overlay 생성 & S3 업로드
            String overlayUrl = null;
            try {
                byte[] overlayBytes = imageOverlayService.drawOverlayJpeg(imageBytes, detections);
                Long resolvedCctvId = resolveCctvId(null, cctvCode);
                String cameraId = resolvedCctvId != null
                        ? String.format("cctv-%03d", resolvedCctvId)
                        : cctvCode.toLowerCase();
                String overlayKey = s3Service.uploadOverlayFrame(overlayBytes, cameraId);
                overlayUrl = s3Service.toHttpUrl(overlayKey);
                log.info("✅ [CCTV] Overlay uploaded: {}", overlayUrl);
            } catch (Exception e) {
                log.warn("⚠️ [CCTV] Overlay 생성/업로드 실패: {}", e.getMessage());
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("analysis", parsedJson);
            response.put("overlayUrl", overlayUrl);
            response.put("s3Key", s3Key);
            response.put("saveToDb", saveToDb);
            
            // 6. DB 저장 (옵션)
            if (saveToDb) {
                try {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> incidentMap = (Map<String, Object>) parsedJson.get("incident");
                    String incidentType = incidentMap != null ? (String) incidentMap.get("incident_type") : null;
                    
                    if ("TRASH".equals(incidentType)) {
                        log.info("💾 [CCTV] Saving TRASH incident to database");
                        Long resolvedCctvId = resolveCctvId(null, cctvCode);
                        String locationDesc = resolveCctvLocationDesc(resolvedCctvId, cctvCode);
                        IncidentCreateResponse created = trashService.createTrashFromGemini(
                                parsedJson, resolvedCctvId, locationDesc);
                        response.put("incidentId", created.getIncidentId());
                        response.put("incidentCode", created.getIncidentCode());
                        
                        // media_file 저장 (overlay 프레임)
                        if (overlayUrl != null && created.getIncidentId() != null) {
                            try {
                                mediaFileService.saveFrame(created.getIncidentId(), resolvedCctvId, 
                                        overlayUrl, OffsetDateTime.now());
                                log.info("✅ [CCTV] Overlay saved to media_file");
                            } catch (Exception e) {
                                response.put("mediaSaveWarning", e.getMessage());
                            }
                        }
                        
                        log.info("✅ [CCTV] Incident saved: {} (ID: {})", created.getIncidentCode(), created.getIncidentId());
                    } else {
                        log.info("ℹ️ [CCTV] No TRASH detected (incident_type: {})", incidentType);
                    }
                } catch (Exception e) {
                    log.error("❌ [CCTV] Failed to save incident to DB", e);
                    response.put("dbSaveError", e.getMessage());
                }
            }
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("❌ [CCTV] Failed to analyze trash from S3 with Gemini", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * S3 영상 기반 화재 분석 (CCTV-002 전용)
     * POST /api/cctv/{cctvCode}/frame/analyze-fire-video
     */
    @PostMapping("/{cctvCode}/frame/analyze-fire-video")
    public ResponseEntity<?> analyzeFireFromS3Video(
            @PathVariable String cctvCode,
            @RequestParam(value = "saveToDb", defaultValue = "true") boolean saveToDb
    ) {
        File videoFile = null;
        File tempDir = null;
        List<File> frameFiles = new ArrayList<>();
        
        try {
            log.info("🔥 [CCTV] Starting S3 video fire analysis for: {}", cctvCode);
            
            if (!"CCTV-002".equalsIgnoreCase(cctvCode)) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "화재 분석은 CCTV-002만 지원합니다."));
            }
            
            // 1. 최신 날씨 조회 (DB)
            Weather weather = weatherService.getLatestWeather();
            if (weather == null
                    || weather.getWindDirection() == null
                    || weather.getWindSpeed() == null
                    || weather.getHumidity() == null) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(Map.of("error", "최신 날씨 데이터가 없습니다(DB)"));
            }

            String windDir = weather.getWindDirection();
            String windSpeed = weather.getWindSpeed().toString();
            String humidity = weather.getHumidity().toString();
            log.info("🌤️ [CCTV] Using weather: dir={}, speed={}m/s, humidity={}%", windDir, windSpeed, humidity);
            
            // 2. S3에서 영상 다운로드
            videoFile = videoFrameExtractor.downloadVideoToTemp(fireAnalysisVideoUrl);
            log.info("📥 [CCTV] Video downloaded from S3");
            
            // 3. 임시 디렉토리 생성 및 프레임 추출
            tempDir = new File(System.getProperty("java.io.tmpdir"), "fire-frames-" + System.currentTimeMillis());
            tempDir.mkdirs();
            
            List<byte[]> extractedFrames = videoFrameExtractor.extractFrames(
                videoFile, frameIntervalSeconds, maxFrames
            );
            
            if (extractedFrames.isEmpty()) {
                return ResponseEntity.ok(Map.of(
                    "fireDetected", false,
                    "message", "영상에서 프레임을 추출할 수 없습니다."
                ));
            }
            
            log.info("📸 [CCTV] Extracted {} frames", extractedFrames.size());
            
            // 4. 프레임을 임시 파일로 저장 (Python에 전달하기 위해)
            for (int i = 0; i < extractedFrames.size(); i++) {
                File frameFile = new File(tempDir, "frame_" + i + ".jpg");
                Files.write(frameFile.toPath(), extractedFrames.get(i));
                frameFiles.add(frameFile);
            }
            
            // 5. Python fire_detector.py 실행 (여러 프레임을 한 번에 분석)
            log.info("🐍 [CCTV] Running Python fire_detector.py with {} frames", frameFiles.size());
            String resultJson = runPythonFireDetector(frameFiles, windDir, windSpeed, humidity, null);
            
            // 6. Python 결과 파싱
            ObjectMapper objectMapper = new ObjectMapper();
            @SuppressWarnings("unchecked")
            Map<String, Object> pythonResult = objectMapper.readValue(resultJson, Map.class);
            
            log.info("🔍 [CCTV] Python analysis result: {}", pythonResult);
            
            // 7. analysis_result 추출
            Map<String, Object> analysisResult = null;
            if (pythonResult.get("analysis_result") instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> ar = (Map<String, Object>) pythonResult.get("analysis_result");
                analysisResult = ar;
            }
            
            if (analysisResult == null) {
                log.warn("⚠️ [CCTV] No analysis_result in Python response");
                return ResponseEntity.ok(Map.of(
                    "fireDetected", false,
                    "message", "분석 결과를 파싱할 수 없습니다."
                ));
            }
            
            // 8. 화재 감지 여부 확인
            boolean fireDetected = false;
            if (analysisResult.get("is_fire_detected") instanceof Boolean) {
                fireDetected = (Boolean) analysisResult.get("is_fire_detected");
            }

            // 🔥 감지 프레임 인덱스(0-based). 없으면 0으로 fallback.
            int detectedFrameIndex = 0;
            try {
                Object idxObj = analysisResult.get("detected_frame_index");
                if (idxObj instanceof Number n) detectedFrameIndex = n.intValue();
                else if (idxObj != null) detectedFrameIndex = Integer.parseInt(idxObj.toString());
            } catch (Exception ignore) {
                detectedFrameIndex = 0;
            }
            
            log.info("🔥 [CCTV] Fire detected: {}", fireDetected);
            
            // 9. 프레임을 S3에 업로드
            String cameraId = cctvCode.toLowerCase();
            List<String> frameUrls = new ArrayList<>();
            
            for (byte[] frameBytes : extractedFrames) {
                String frameKey = s3Service.uploadFrame(frameBytes, cameraId);
                String frameUrl = s3Service.toHttpUrl(frameKey);
                frameUrls.add(frameUrl);
            }
            
            log.info("☁️ [CCTV] Uploaded {} frames to S3", frameUrls.size());
            
            // 10. DB 저장 (화재 감지된 경우만)
            Long incidentId = null;
            String incidentCode = null;
            boolean savedToDbResult = false;
            String clipUrl = null;
            
            if (saveToDb && fireDetected) {
                try {
                    log.info("💾 [CCTV] Saving fire incident to database");
                    Long resolvedCctvId = resolveCctvId(null, cctvCode);
                    String locationDesc = resolveCctvLocationDesc(resolvedCctvId, cctvCode);
                    
                    // Python 분석 결과를 기반으로 화재 사고 생성
                    // createFireFromAiAnalysis는 analysis_result를 포함하는 Map을 요구
                    Map<String, Object> aiJson = new HashMap<>();
                    aiJson.put("analysis_result", analysisResult);
                    
                    var createResponse = fireService.createFireFromAiAnalysis(
                        aiJson,
                        resolvedCctvId,
                        locationDesc,
                        weatherService.getLatestWeather(),
                        OffsetDateTime.now()
                    );
                    incidentId = createResponse.getIncidentId();
                    incidentCode = createResponse.getIncidentCode();
                    savedToDbResult = true;
                    
                    // 첫 번째 프레임을 media_file에 저장
                    if (!frameUrls.isEmpty() && incidentId != null) {
                        try {
                            mediaFileService.saveFrame(
                                incidentId, 
                                resolvedCctvId, 
                                frameUrls.get(0), 
                                OffsetDateTime.now()
                            );
                            log.info("✅ [CCTV] First frame saved to media_file");
                        } catch (Exception e) {
                            log.warn("⚠️ [CCTV] Failed to save frame to media_file: {}", e.getMessage());
                        }
                    }

                    // ✅ 감지 프레임 기준 앞뒤 10초(총 20초) 클립 추출 → S3 업로드 → media_file(VIDEO) 저장
                    try {
                        int safeIndex = Math.max(0, Math.min(detectedFrameIndex, extractedFrames.size() - 1));
                        int centerSeconds = safeIndex * frameIntervalSeconds;
                        File clipFile = extractVideoClip(videoFile, tempDir, centerSeconds, 20);
                        byte[] clipBytes = Files.readAllBytes(clipFile.toPath());
                        String clipKey = s3Service.uploadVideo(clipBytes, cameraId);
                        clipUrl = s3Service.toHttpUrl(clipKey);
                        mediaFileService.saveVideo(incidentId, resolvedCctvId, clipUrl, OffsetDateTime.now());
                        log.info("✅ [CCTV] Fire clip saved to S3+media_file: {}", clipUrl);
                    } catch (Exception e) {
                        log.warn("⚠️ [CCTV] Failed to extract/upload fire clip: {}", e.getMessage());
                    }
                    
                    log.info("✅ [CCTV] Fire incident saved: {} (ID: {})", incidentCode, incidentId);
                } catch (Exception e) {
                    log.error("❌ [CCTV] Failed to save fire incident to DB", e);
                }
            }
            
            // 11. 응답 구성
            Map<String, Object> response = new HashMap<>();
            response.put("fireDetected", fireDetected);
            response.put("frameUrls", frameUrls);
            response.put("overlayUrls", new ArrayList<>()); // Python 분석에서는 overlay 생성 안 함
            response.put("detectionCount", fireDetected ? 1 : 0);
            response.put("savedToDb", savedToDbResult);
            response.put("totalFramesAnalyzed", extractedFrames.size());
            response.put("analysisResult", analysisResult); // 전체 분석 결과 포함
            if (incidentId != null) response.put("incidentId", incidentId);
            if (incidentCode != null) response.put("incidentCode", incidentCode);
            if (clipUrl != null && !clipUrl.isBlank()) response.put("clipUrl", clipUrl);
            response.put("detectedFrameIndex", detectedFrameIndex);
            
            log.info("✅ [CCTV] S3 video fire analysis complete: detected={}, frames={}", 
                     fireDetected, extractedFrames.size());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("❌ [CCTV] S3 video fire analysis failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", e.getMessage()));
        } finally {
            // 12. 임시 파일 정리
            cleanupTempFiles(videoFile, frameFiles, tempDir);
        }
    }

    /**
     * Python fire_detector.py 실행 메서드
     */
    private String runPythonFireDetector(
            List<File> frames,
            String windDir,
            String windSpeed,
            String humidity,
            String model
    ) throws Exception {
        String osName = System.getProperty("os.name", "").toLowerCase();
        boolean isWindows = osName.contains("win");

        // fire_detector.py 경로 탐색
        String userDir = System.getProperty("user.dir");
        Path script1 = Paths.get(userDir, "ai", "fire_detector.py");                // user.dir == backend
        Path script2 = Paths.get(userDir, "backend", "ai", "fire_detector.py");    // user.dir == repo root
        Path scriptPath = Files.exists(script1) ? script1 : (Files.exists(script2) ? script2 : null);
        if (scriptPath == null) {
            throw new IllegalStateException("fire_detector.py 경로를 찾을 수 없습니다. userDir=" + userDir);
        }

        // 파이썬 커맨드 후보 목록 구성 (Windows에서 python PATH 문제(ExitCode 9009) 대응)
        List<List<String>> pythonCandidates = new ArrayList<>();
        if (configuredPythonCommand != null && !configuredPythonCommand.isBlank()) {
            // 간단 split (경로에 공백이 있으면 app.python.command에 따옴표 없이 전체 경로를 권장)
            String[] parts = configuredPythonCommand.trim().split("\\s+");
            List<String> cmd = new ArrayList<>();
            for (String p : parts) if (!p.isBlank()) cmd.add(p);
            if (!cmd.isEmpty()) pythonCandidates.add(cmd);
        } else {
            if (isWindows) {
                pythonCandidates.add(List.of("py", "-3"));
                pythonCandidates.add(List.of("py"));
                pythonCandidates.add(List.of("python"));
                pythonCandidates.add(List.of("python3"));
            } else {
                pythonCandidates.add(List.of("python3"));
                pythonCandidates.add(List.of("python"));
            }
        }

        Exception last = null;
        for (List<String> pythonBase : pythonCandidates) {
            List<String> command = new ArrayList<>();
            command.addAll(pythonBase);
            command.add(scriptPath.toAbsolutePath().toString());
            for (File f : frames) command.add(f.getAbsolutePath());
            command.add("--wind_dir"); command.add(windDir);
            command.add("--wind_speed"); command.add(windSpeed);
            command.add("--humidity"); command.add(humidity);
            if (model != null && !model.isBlank()) {
                command.add("--model");
                command.add(model.trim());
            }

            log.info("🚀 [CCTV] Executing Python: {}", String.join(" ", command));

            try {
                ProcessBuilder pb = new ProcessBuilder(command);
                // stderr(경고/로그)가 stdout(JSON)에 섞이면 JSON 파싱이 깨지므로 분리해서 읽습니다.
                pb.redirectErrorStream(false);
                Process process = pb.start();

                StringBuilder stdout = new StringBuilder();
                StringBuilder stderr = new StringBuilder();

                Thread outThread = new Thread(() -> {
                    try (BufferedReader reader = new BufferedReader(
                            new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
                        String line;
                        while ((line = reader.readLine()) != null) {
                            stdout.append(line);
                        }
                    } catch (Exception ignore) {}
                });
                Thread errThread = new Thread(() -> {
                    try (BufferedReader reader = new BufferedReader(
                            new InputStreamReader(process.getErrorStream(), StandardCharsets.UTF_8))) {
                        String line;
                        while ((line = reader.readLine()) != null) {
                            stderr.append(line).append("\n");
                        }
                    } catch (Exception ignore) {}
                });
                outThread.start();
                errThread.start();

                boolean finished = process.waitFor(120, TimeUnit.SECONDS);
                if (!finished) {
                    process.destroyForcibly();
                    throw new RuntimeException("AI 분석 타임아웃(120s)");
                }

                try { outThread.join(3000); } catch (Exception ignore) {}
                try { errThread.join(3000); } catch (Exception ignore) {}

                int exitCode = process.exitValue();
                String resultJson = stdout.toString();
                if (exitCode != 0) {
                    String err = stderr.toString();
                    throw new RuntimeException("AI Analysis Failed (exitCode=" + exitCode + "): " + (err != null && !err.isBlank() ? err : resultJson));
                }

                // 경고/로그는 stderr로 따로 남김 (JSON 파싱에는 영향 없음)
                if (stderr.length() > 0) {
                    log.warn("⚠️ [CCTV] Python stderr: {}", stderr.toString().trim());
                }

                return resultJson;

            } catch (IOException ioe) {
                // python 커맨드 자체를 못 찾는 경우(Windows PATH 문제 등): 다음 후보 시도
                last = ioe;
                log.warn("⚠️ [CCTV] Python command start failed (cmd={}): {}", pythonBase, ioe.getMessage());
                continue;
            } catch (Exception e) {
                last = e;
                // 스크립트 실행/분석 실패는 후보를 바꿔도 해결 안 될 가능성이 커서 바로 던짐
                throw e;
            }
        }

        throw new RuntimeException("Python 실행 커맨드를 찾지 못했습니다. app.python.command 설정을 확인하세요.", last);
    }

    /**
     * 임시 파일 정리
     */
    private void cleanupTempFiles(File videoFile, List<File> frames, File tempDir) {
        try {
            if (frames != null) {
                for (File f : frames) {
                    if (f != null && f.exists()) f.delete();
                }
            }
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

}

