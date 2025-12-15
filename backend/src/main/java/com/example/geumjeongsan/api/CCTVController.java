package com.example.geumjeongsan.api;

import com.example.geumjeongsan.api.dto.CCTVIncidentDetailResponse;
import com.example.geumjeongsan.api.dto.CCTVResponse;
import com.example.geumjeongsan.api.dto.FallenAnalysisRequest;
import com.example.geumjeongsan.api.dto.FallenAnalysisResponse;
import com.example.geumjeongsan.api.dto.MediaFileResponse;
import com.example.geumjeongsan.api.dto.QwenAnalysisResponse;
import com.example.geumjeongsan.domain.incident.IncidentService;
import com.example.geumjeongsan.domain.incident.TrashService;
import com.example.geumjeongsan.service.GeminiService;
import com.example.geumjeongsan.service.S3Service;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/cctv")
@Slf4j
public class CCTVController {

    private final IncidentService incidentService;
    private final TrashService trashService;
    private final RestTemplate restTemplate;
    private final S3Service s3Service;
    private final GeminiService geminiService;
    private final ObjectMapper objectMapper;
    private static final String MODEL_SERVER_URL = "http://54.116.3.241:8000/api/v1/video/analyze";
    
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

    public CCTVController(IncidentService incidentService, TrashService trashService, RestTemplate restTemplate, S3Service s3Service, GeminiService geminiService, ObjectMapper objectMapper) {
        this.incidentService = incidentService;
        this.trashService = trashService;
        this.restTemplate = restTemplate;
        this.s3Service = s3Service;
        this.geminiService = geminiService;
        this.objectMapper = objectMapper;
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
            @RequestParam(value = "cctvId", required = false) Long cctvId) {
        try {
            log.info("🖼️ [CCTV] Analyzing image file for trash: {}", imageFile.getOriginalFilename());
            
            // 1. 이미지를 Base64로 변환
            byte[] imageBytes = imageFile.getBytes();
            String base64Image = Base64.getEncoder().encodeToString(imageBytes);
            
            // 2. 프롬프트 설정 (기본값: 쓰레기 분석 프롬프트)
            String prompt = customPrompt != null && !customPrompt.isEmpty() 
                    ? customPrompt 
                    : trashAnalysisPrompt;
            
            // 3. Gemini API 호출 (이미지 1장)
            log.info("🤖 [CCTV] Calling Gemini API with 1 image (trash analysis)");
            String geminiResult = geminiService.analyzeImage(prompt, base64Image);
            
            // 4. Gemini 응답에서 JSON 추출 및 파싱
            Map<String, Object> parsedJson = extractJsonFromGeminiResponse(geminiResult);
            boolean savedToDb = false;
            String incidentCode = null;
            
            if (parsedJson != null) {
                // 5. incident_type이 TRASH인 경우 DB에 저장
                @SuppressWarnings("unchecked")
                Map<String, Object> incidentMap = (Map<String, Object>) parsedJson.get("incident");
                if (incidentMap != null) {
                    String incidentType = (String) incidentMap.get("incident_type");
                    if ("TRASH".equals(incidentType)) {
                        try {
                            log.info("💾 [CCTV] Saving TRASH incident to database");
                            var createResponse = trashService.createTrashFromGemini(
                                    parsedJson,
                                    cctvId,
                                    "CCTV 자동 탐지"
                            );
                            savedToDb = true;
                            incidentCode = createResponse.getIncidentCode();
                            log.info("✅ [CCTV] Incident saved to DB: {}", incidentCode);
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
            response.put("savedToDb", savedToDb);
            if (incidentCode != null) {
                response.put("incidentCode", incidentCode);
            }
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("❌ [CCTV] Failed to analyze image", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Gemini 응답 텍스트에서 JSON 추출
     * Markdown 코드 블록(```json ... ```) 또는 일반 JSON 문자열을 파싱
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> extractJsonFromGeminiResponse(String geminiResult) {
        if (geminiResult == null || geminiResult.trim().isEmpty()) {
            return null;
        }
        
        try {
            // 1. Markdown 코드 블록에서 JSON 추출 시도
            Pattern jsonBlockPattern = Pattern.compile("```(?:json)?\\s*\\n?([\\s\\S]*?)\\n?```", Pattern.CASE_INSENSITIVE);
            Matcher matcher = jsonBlockPattern.matcher(geminiResult);
            if (matcher.find()) {
                String jsonStr = matcher.group(1).trim();
                return objectMapper.readValue(jsonStr, Map.class);
            }
            
            // 2. 중괄호로 시작하는 JSON 문자열 직접 찾기
            int startIdx = geminiResult.indexOf('{');
            int endIdx = geminiResult.lastIndexOf('}');
            if (startIdx >= 0 && endIdx > startIdx) {
                String jsonStr = geminiResult.substring(startIdx, endIdx + 1);
                return objectMapper.readValue(jsonStr, Map.class);
            }
            
            // 3. 전체 텍스트를 JSON으로 파싱 시도
            return objectMapper.readValue(geminiResult.trim(), Map.class);
            
        } catch (Exception e) {
            log.warn("⚠️ [CCTV] Failed to parse JSON from Gemini response: {}", e.getMessage());
            log.debug("Gemini response: {}", geminiResult);
            return null;
        }
    }

    /**
     * 로컬 MP4 파일을 업로드하여 Gemini로 분석 (테스트용)
     * POST /api/cctv/test/analyze-local-video
     * 
     * @param videoFile - 업로드된 MP4 파일
     * @return Gemini 분석 결과
     */
    @PostMapping("/test/analyze-local-video")
    public ResponseEntity<?> analyzeLocalVideo(
            @RequestParam("file") MultipartFile videoFile,
            @RequestParam(value = "prompt", required = false) String customPrompt) {
        File tempVideo = null;
        File tempDir = null;
        
        try {
            log.info("🎬 [CCTV] Analyzing local video file: {}", videoFile.getOriginalFilename());
            
            // 1. 임시 디렉토리 생성
            tempDir = new File(System.getProperty("java.io.tmpdir"), "gemini-frames-" + System.currentTimeMillis());
            tempDir.mkdirs();
            
            // 2. 업로드된 파일을 임시 파일로 저장
            tempVideo = File.createTempFile("video-", ".mp4", tempDir);
            videoFile.transferTo(tempVideo);
            log.info("📁 [CCTV] Video saved to: {}", tempVideo.getAbsolutePath());
            
            // 3. FFmpeg로 프레임 추출 (5초 간격으로 4장)
            List<File> frameFiles = extractFrames(tempVideo, tempDir, 4);
            log.info("📸 [CCTV] Extracted {} frames", frameFiles.size());
            
            if (frameFiles.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "프레임 추출 실패. FFmpeg가 설치되어 있는지 확인하세요."));
            }
            
            // 4. 프레임 이미지를 Base64로 변환
            List<String> base64Images = frameFiles.stream()
                    .map(this::imageToBase64)
                    .filter(img -> img != null && !img.isEmpty())
                    .collect(Collectors.toList());
            
            if (base64Images.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "이미지 변환 실패"));
            }
            
            // 5. 프롬프트 설정 (기본값 또는 사용자 지정)
            String prompt = customPrompt != null && !customPrompt.isEmpty() 
                    ? customPrompt 
                    : fallenAnalysisPrompt;
            
            // 6. Gemini API 호출
            log.info("🤖 [CCTV] Calling Gemini API with {} frames", base64Images.size());
            String geminiResult = geminiService.analyze(prompt, base64Images);
            
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", geminiResult,
                    "framesAnalyzed", base64Images.size()
            ));
            
        } catch (Exception e) {
            log.error("❌ [CCTV] Failed to analyze local video", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        } finally {
            // 임시 파일 정리
            cleanupTempFiles(tempVideo, tempDir);
        }
    }

    /**
     * FFmpeg를 사용하여 영상에서 프레임 추출
     * 5초 간격으로 지정된 개수만큼 추출
     */
    private List<File> extractFrames(File videoFile, File outputDir, int frameCount) throws IOException, InterruptedException {
        List<File> frames = new ArrayList<>();
        
        // FFmpeg 명령어 (Windows/Linux 모두 지원)
        String ffmpegCommand = "ffmpeg";
        
        // 각 프레임 추출 (0초, 5초, 10초, 15초...)
        for (int i = 0; i < frameCount; i++) {
            int timeSeconds = i * 5;
            File outputFile = new File(outputDir, String.format("frame_%02d.jpg", i));
            
            try {
                ProcessBuilder pb = new ProcessBuilder(
                        ffmpegCommand,
                        "-y", // 덮어쓰기
                        "-ss", String.valueOf(timeSeconds), // 시작 시간
                        "-i", videoFile.getAbsolutePath(), // 입력 파일
                        "-frames:v", "1", // 1장만 추출
                        "-q:v", "2", // 화질 (1~31, 낮을수록 좋음)
                        "-vf", "scale=640:-1", // 크기 조정 (너비 640px, 높이 자동)
                        outputFile.getAbsolutePath()
                );
                
                pb.redirectErrorStream(true);
                Process process = pb.start();
                int exitCode = process.waitFor();
                
                if (exitCode == 0 && outputFile.exists() && outputFile.length() > 0) {
                    frames.add(outputFile);
                    log.debug("✅ [CCTV] Frame extracted: {} ({}s)", outputFile.getName(), timeSeconds);
                } else {
                    log.warn("⚠️ [CCTV] Failed to extract frame at {}s", timeSeconds);
                }
            } catch (Exception e) {
                log.error("❌ [CCTV] Error extracting frame at {}s", timeSeconds, e);
            }
        }
        
        return frames;
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
}

