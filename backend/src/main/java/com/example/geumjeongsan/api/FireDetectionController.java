package com.example.geumjeongsan.api;

import com.example.geumjeongsan.domain.cctv.CCTV;
import com.example.geumjeongsan.domain.cctv.CCTVRepository;
import com.example.geumjeongsan.domain.incident.FireService;
import com.example.geumjeongsan.domain.weather.Weather;
import com.example.geumjeongsan.service.WeatherService;
import com.example.geumjeongsan.service.RealtimeSseService;
import com.example.geumjeongsan.service.GeminiService;
import com.example.geumjeongsan.service.S3Service;
import com.example.geumjeongsan.service.ImageOverlayService;
import com.example.geumjeongsan.service.MediaFileService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.io.InputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/fire-detection")
@RequiredArgsConstructor
@Slf4j
public class FireDetectionController {

    private final WeatherService weatherService;
    private final FireService fireService;
    private final CCTVRepository cctvRepository;
    private final ObjectMapper objectMapper;
    private final RealtimeSseService realtimeSseService;
    private final GeminiService geminiService;
    private final S3Service s3Service;
    private final ImageOverlayService imageOverlayService;
    private final MediaFileService mediaFileService;

    /**
     * FFmpeg 실행 커맨드/경로
     * - 기본값: "ffmpeg" (PATH에서 찾음)
     * - 로컬 Windows에서 PATH가 안 잡히는 경우를 대비해, 아래 extractFrames에서 known 경로를 자동 탐색합니다.
     */
    @Value("${app.ffmpeg.command:ffmpeg}")
    private String configuredFfmpegCommand;

    @Value("${gemini.prompt.fire-bbox-analysis:}")
    private String fireBboxAnalysisPrompt;

    /**
     * Python 실행 커맨드/경로 (선택)
     * - 예: C:/Users/kmk/anaconda3/python.exe
     * - 예: py -3
     * - 예: python
     */
    @Value("${app.python.command:}")
    private String configuredPythonCommand;

    /**
     * 산불 감지 분석 요청 (이미지 4장 + DB 날씨 정보)
     * POST /api/fire-detection/analyze
     */
    @PostMapping(value = "/analyze", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> analyzeFire(@RequestParam("images") List<MultipartFile> files) {
        log.info("🔥 [FireDetection] Request received with {} images", files.size());

        if (files.size() != 4) {
            return ResponseEntity.badRequest()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("error", "이미지는 정확히 4장 필요합니다.", "received", files.size()));
        }

        List<File> tempFiles = new ArrayList<>();

        try {
            // 1. 최신 날씨 조회
            Weather weather = weatherService.getLatestWeather();
            if (weather == null
                    || weather.getWindDirection() == null
                    || weather.getWindSpeed() == null
                    || weather.getHumidity() == null) {
                return ResponseEntity.status(500)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(Map.of("error", "최신 날씨 데이터가 없습니다(DB)"));
            }

            String windDir = weather.getWindDirection();
            String windSpeed = weather.getWindSpeed().toString();
            String humidity = weather.getHumidity().toString();

            log.info("🌤️ [FireDetection] Using weather: dir={}, speed={}m/s, humidity={}%", windDir, windSpeed, humidity);

            // 3. 받은 파일들을 임시 폴더에 저장
            for (MultipartFile file : files) {
                String originalName = file.getOriginalFilename();
                String ext = originalName != null && originalName.contains(".") 
                        ? originalName.substring(originalName.lastIndexOf(".")) 
                        : ".jpg";
                
                File tempFile = File.createTempFile("fire_" + UUID.randomUUID().toString(), ext);
                file.transferTo(tempFile);
                
                tempFiles.add(tempFile);
            }

            // 4. 파이썬 실행(여러 후보 커맨드로 자동 시도)
            String resultJson = runPythonFireDetector(tempFiles, windDir, windSpeed, humidity, null);
            log.info("✅ [FireDetection] Analysis success");
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(resultJson);

        } catch (Exception e) {
            log.error("❌ [FireDetection] System Error", e);
            return ResponseEntity.status(500)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("error", "Server Error", "details", e.getMessage()));
        } finally {
            // 7. 임시 파일 삭제
            for (File f : tempFiles) {
                if (f.exists()) {
                    f.delete();
                }
            }
        }
    }

    /**
     * 산불 감지 분석 요청 (영상 1개 -> FFmpeg로 0/5/10/15초 프레임 4장 추출 -> 파이썬 분석)
     * POST /api/fire-detection/analyze-video
     *
     * - 쓰레기(영상) 테스트 API와 동일하게 cctvId/cctvCode를 받을 수 있게 함
     */
    @PostMapping(value = "/analyze-video", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> analyzeFireVideo(
            @RequestParam("file") MultipartFile videoFile,
            @RequestParam(value = "cctvId", required = false) Long cctvId,
            @RequestParam(value = "cctvCode", required = false) String cctvCode,
            @RequestParam(value = "locationDesc", required = false) String locationDesc,
            @RequestParam(value = "model", required = false) String model,
            // 끝까지 스캔 (기본: 10초 단위로 이동)
            // 미탐을 줄이기 위해 기본값을 5초로 낮춰 오버랩(겹치기) 스캔합니다.
            @RequestParam(value = "segmentStepSec", required = false, defaultValue = "5") int segmentStepSec,
            @RequestParam(value = "maxSegments", required = false, defaultValue = "9999") int maxSegments,
            // 한 구간에서 몇 장의 프레임을 뽑을지 (기본: 5장 = 2초 간격이면 0~8초)
            @RequestParam(value = "framesPerSegment", required = false, defaultValue = "5") int framesPerSegment,
            // 프레임 간격(초) (기본: 2초)
            @RequestParam(value = "frameIntervalSec", required = false, defaultValue = "2") int frameIntervalSec,
            // 마지막 구간에서 framesPerSegment장이 안 나와도 분석할 수 있게 최소 프레임 수를 허용 (권장: 2)
            @RequestParam(value = "minFrames", required = false, defaultValue = "2") int minFrames,
            // 첫 감지 시 바로 종료할지(기본: false = 끝까지 스캔하며 JSON 계속 푸시)
            @RequestParam(value = "stopOnDetect", required = false, defaultValue = "false") boolean stopOnDetect,
            // 스캔 진행 상황을 SSE로 푸시할지 여부
            @RequestParam(value = "emitProgress", required = false, defaultValue = "true") boolean emitProgress,
            // 미탐 보정: is_fire_detected=false여도 needs_detailed_inspection=true면 감지로 간주할지
            @RequestParam(value = "treatNeedsInspectionAsDetect", required = false, defaultValue = "true") boolean treatNeedsInspectionAsDetect,
            // needs_detailed_inspection만 true일 때, confidence_score가 이 값 이상이면 감지로 간주
            @RequestParam(value = "needsInspectionMinConfidence", required = false, defaultValue = "0.35") double needsInspectionMinConfidence
    ) {
        File tempVideo = null;
        File tempDir = null;
        List<File> frameFiles = new ArrayList<>();

        try {
            log.info("🎬 [FireDetection] Analyzing video: {}", videoFile.getOriginalFilename());

            // 1) 최신 날씨 조회 (DB)
            Weather weather = weatherService.getLatestWeather();
            if (weather == null
                    || weather.getWindDirection() == null
                    || weather.getWindSpeed() == null
                    || weather.getHumidity() == null) {
                return ResponseEntity.status(500)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(Map.of("error", "최신 날씨 데이터가 없습니다(DB)"));
            }

            String windDir = weather.getWindDirection();
            String windSpeed = weather.getWindSpeed().toString();
            String humidity = weather.getHumidity().toString();
            log.info("🌤️ [FireDetection] Using weather: dir={}, speed={}m/s, humidity={}%", windDir, windSpeed, humidity);

            // 2) 임시 디렉토리/파일 생성
            tempDir = new File(System.getProperty("java.io.tmpdir"), "fire-frames-" + System.currentTimeMillis());
            tempDir.mkdirs();
            tempVideo = File.createTempFile("fire-video-", ".mp4", tempDir);
            videoFile.transferTo(tempVideo);
            log.info("📁 [FireDetection] Video saved to: {}", tempVideo.getAbsolutePath());

            Long resolvedCctvId = resolveCctvId(cctvId, cctvCode);
            String resolvedLocationDesc = (locationDesc != null && !locationDesc.isBlank())
                    ? locationDesc
                    : (resolvedCctvId != null ? (resolveCctvCodeOrDefault(resolvedCctvId) + " 자동 탐지(화재)") : "CCTV 자동 탐지(화재)");

            // 3) 끝까지 스캔(20초 단위)하되, 첫 감지만 1건 저장하고 종료
            String scanId = UUID.randomUUID().toString();
            // 스캔 시작 시각은 한국시간(KST) 기준으로 고정
            OffsetDateTime scanStartedAtKst = OffsetDateTime.now(ZoneOffset.ofHours(9));
            int scannedSegments = 0;
            boolean fireDetected = false;
            Integer detectedSegmentStartSec = null;
            String lastResultJson = null;
            Map<String, Object> lastParsed = null;
            boolean savedToDb = false;
            String incidentCode = null;
            Long incidentId = null;
            boolean savedFirst = false;

            if (emitProgress) {
                Map<String, Object> startedPayload = new HashMap<>();
                startedPayload.put("scanId", scanId);
                // cctvId는 null일 수 있음(Map.of는 null 금지)
                if (resolvedCctvId != null) startedPayload.put("cctvId", resolvedCctvId);
                startedPayload.put("locationDesc", resolvedLocationDesc);
                startedPayload.put("segmentStepSec", segmentStepSec);
                startedPayload.put("minFrames", minFrames);
                startedPayload.put("framesPerSegment", framesPerSegment);
                startedPayload.put("frameIntervalSec", frameIntervalSec);
                startedPayload.put("stopOnDetect", stopOnDetect);
                // 저장 정책: FIRST(최초 감지 1건만 저장)
                startedPayload.put("saveMode", "FIRST");
                startedPayload.put("fileName", videoFile.getOriginalFilename() != null ? videoFile.getOriginalFilename() : "");
                startedPayload.put("scanStartedAt", scanStartedAtKst.toString());
                realtimeSseService.publish("fire.scan.started", startedPayload);
            }

            for (int seg = 0; seg < maxSegments; seg++) {
                int segmentStartSec = seg * segmentStepSec;

                // segmentStartSec 기준 프레임 추출 (기본: 2초 간격 5장)
                frameFiles = extractFramesFromStart(tempVideo, tempDir, segmentStartSec, framesPerSegment, frameIntervalSec);
                int framesCount = frameFiles.size();
                if (framesCount < minFrames) {
                    log.info("🛑 [FireDetection] End of video reached (segmentStartSec={}s, frames={})", segmentStartSec, framesCount);
                    break;
                }
                scannedSegments++;

                // 파이썬 1회 실행 (해당 구간)
                String resultJson = runPythonFireDetector(frameFiles, windDir, windSpeed, humidity, model);
                lastResultJson = resultJson;

                Map<String, Object> parsed = null;
                try {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> tmp = objectMapper.readValue(resultJson, Map.class);
                    parsed = tmp;
                } catch (Exception e) {
                    log.warn("⚠️ [FireDetection] Failed to parse JSON at segmentStartSec={}s: {}", segmentStartSec, e.getMessage());
                }
                lastParsed = parsed;

                boolean isFire = false;
                boolean needsInspection = false;
                Double confidenceScore = null;
                if (parsed != null) {
                    try {
                        @SuppressWarnings("unchecked")
                        Map<String, Object> ar = (Map<String, Object>) parsed.get("analysis_result");
                        if (ar != null) {
                            isFire = Boolean.TRUE.equals(ar.get("is_fire_detected"));
                            needsInspection = Boolean.TRUE.equals(ar.get("needs_detailed_inspection"));
                            Object cs = ar.get("confidence_score");
                            if (cs instanceof Number n) confidenceScore = n.doubleValue();
                            else if (cs != null) {
                                try { confidenceScore = Double.parseDouble(cs.toString()); } catch (Exception ignore) {}
                            }
                        }
                    } catch (Exception ignore) {}
                }

                // 미탐 보정: "상세 점검 필요"면 감지 후보로 승격
                boolean detected = isFire;
                if (!detected && treatNeedsInspectionAsDetect && needsInspection) {
                    double cs = confidenceScore != null ? confidenceScore : 0.0;
                    if (cs >= needsInspectionMinConfidence) {
                        detected = true;
                    }
                }

                if (emitProgress) {
                    Map<String, Object> segPayload = new HashMap<>();
                    segPayload.put("scanId", scanId);
                    segPayload.put("segmentIndex", seg);
                    segPayload.put("segmentStartSec", segmentStartSec);
                    segPayload.put("frames", framesCount);
                    segPayload.put("isFireDetected", isFire);
                    segPayload.put("needsDetailedInspection", needsInspection);
                    if (confidenceScore != null) segPayload.put("confidenceScore", confidenceScore);
                    segPayload.put("detected", detected);
                    // 구간별 JSON을 즉시 푸시 (프론트에서 바로바로 렌더)
                    // parsed가 null이면 rawJson만이라도 보내서 디버깅 가능
                    if (parsed != null) segPayload.put("parsedJson", parsed);
                    else segPayload.put("rawJson", resultJson);
                    realtimeSseService.publish("fire.scan.segment", segPayload);
                }

                // 감지 시 첫 프레임 bytes 확보 (overlay 생성용)
                byte[] firstFrameBytesForOverlay = null;
                if (detected && !savedFirst && !frameFiles.isEmpty()) {
                    try {
                        firstFrameBytesForOverlay = Files.readAllBytes(frameFiles.get(0).toPath());
                        log.info("📸 [FireDetection] Captured first frame for overlay (size: {} bytes)", 
                                firstFrameBytesForOverlay != null ? firstFrameBytesForOverlay.length : 0);
                    } catch (Exception e) {
                        log.warn("⚠️ [FireDetection] Failed to read first frame for overlay: {}", e.getMessage());
                    }
                }

                // 프레임 파일은 구간마다 바로 삭제(디스크 누적 방지)
                for (File f : frameFiles) {
                    try { if (f != null && f.exists()) f.delete(); } catch (Exception ignore) {}
                }
                frameFiles.clear();

                if (detected && parsed != null) {
                    fireDetected = true;
                    if (detectedSegmentStartSec == null) detectedSegmentStartSec = segmentStartSec;

                    // ✅ 저장 정책: FIRST (최초 1회만 DB 저장)
                    if (!savedFirst) {
                        try {
                            String loc = resolvedLocationDesc + " (t=" + segmentStartSec + "s)";
                            // 영상 구간 시작초를 스캔 시작시각(KST)에 더해 detectedAt을 생성
                            OffsetDateTime detectedAtKst = scanStartedAtKst.plusSeconds(segmentStartSec);
                            var createResp = fireService.createFireFromAiAnalysis(parsed, resolvedCctvId, loc, weather, detectedAtKst);
                            savedToDb = true;
                            savedFirst = true;
                            incidentCode = createResp.getIncidentCode();
                            incidentId = createResp.getIncidentId();
                            
                            // ✅ DB 저장 성공 후, Gemini bbox → overlay → S3 → media_file
                            if (incidentId != null && firstFrameBytesForOverlay != null && 
                                fireBboxAnalysisPrompt != null && !fireBboxAnalysisPrompt.isEmpty()) {
                                try {
                                    log.info("🎨 [FireDetection] Generating overlay with Gemini bbox for incidentId={}", incidentId);
                                    
                                    // Gemini bbox 분석
                                    String base64 = Base64.getEncoder().encodeToString(firstFrameBytesForOverlay);
                                    String geminiText = geminiService.analyzeImage(fireBboxAnalysisPrompt, base64);
                                    Map<String, Object> geminiJson = extractJsonFromGeminiResponse(geminiText);
                                    
                                    if (geminiJson != null) {
                                        @SuppressWarnings("unchecked")
                                        List<Map<String, Object>> detections = 
                                            (List<Map<String, Object>>) geminiJson.getOrDefault("detections", List.of());
                                        
                                        // Overlay 생성
                                        byte[] overlayBytes = imageOverlayService.drawOverlayJpeg(firstFrameBytesForOverlay, detections);
                                        
                                        // S3 업로드
                                        String cameraId = resolvedCctvId != null 
                                                ? String.format("cctv-%03d", resolvedCctvId) 
                                                : "cctv-unknown";
                                        String overlayKey = s3Service.uploadOverlayFrame(overlayBytes, cameraId);
                                        String overlayUrl = s3Service.toHttpUrl(overlayKey);
                                        
                                        // media_file 저장
                                        mediaFileService.saveFrame(incidentId, resolvedCctvId, overlayUrl, detectedAtKst);
                                        
                                        log.info("✅ [FireDetection] Overlay saved: incidentId={}, url={}", incidentId, overlayUrl);

                                        // ✅ 감지 구간 기준 앞뒤 10초(총 20초) 클립 추출 → S3 업로드 → media_file(VIDEO) 저장
                                        try {
                                            File clipFile = extractVideoClip(tempVideo, tempDir, segmentStartSec, 20);
                                            byte[] clipBytes = Files.readAllBytes(clipFile.toPath());
                                            String clipKey = s3Service.uploadVideo(clipBytes, cameraId);
                                            String clipUrl = s3Service.toHttpUrl(clipKey);
                                            mediaFileService.saveVideo(incidentId, resolvedCctvId, clipUrl, detectedAtKst);
                                            log.info("✅ [FireDetection] Clip saved to S3+media_file: {}", clipUrl);
                                        } catch (Exception e) {
                                            log.warn("⚠️ [FireDetection] Failed to extract/upload clip: {}", e.getMessage());
                                        }
                                    } else {
                                        log.warn("⚠️ [FireDetection] Gemini bbox response parsing failed");
                                    }
                                } catch (Exception e) {
                                    log.warn("⚠️ [FireDetection] Failed to generate/save overlay: {}", e.getMessage());
                                }
                            }
                        } catch (Exception e) {
                            log.error("❌ [FireDetection] Failed to save FIRE incident (segmentStartSec={}s)", segmentStartSec, e);
                        }
                        if (emitProgress) {
                            Map<String, Object> detectedPayload = new HashMap<>();
                            detectedPayload.put("scanId", scanId);
                            detectedPayload.put("segmentStartSec", segmentStartSec);
                            detectedPayload.put("savedToDb", savedToDb);
                            if (incidentId != null) detectedPayload.put("incidentId", incidentId);
                            if (incidentCode != null) detectedPayload.put("incidentCode", incidentCode);
                            realtimeSseService.publish("fire.scan.detected", detectedPayload);
                        }
                    }

                    // 옵션에 따라 감지 즉시 종료
                    if (stopOnDetect) {
                        break;
                    }
                }
            }

            if (emitProgress) {
                Map<String, Object> completedPayload = new HashMap<>();
                completedPayload.put("scanId", scanId);
                completedPayload.put("scannedSegments", scannedSegments);
                completedPayload.put("fireDetected", fireDetected);
                // null 허용(미감지 시)
                completedPayload.put("detectedSegmentStartSec", detectedSegmentStartSec);
                completedPayload.put("savedToDb", savedToDb);
                if (incidentId != null) completedPayload.put("incidentId", incidentId);
                if (incidentCode != null) completedPayload.put("incidentCode", incidentCode);
                completedPayload.put("framesPerSegment", framesPerSegment);
                completedPayload.put("frameIntervalSec", frameIntervalSec);
                completedPayload.put("segmentStepSec", segmentStepSec);
                completedPayload.put("stopOnDetect", stopOnDetect);
                completedPayload.put("saveMode", "FIRST");
                realtimeSseService.publish("fire.scan.completed", completedPayload);
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("saveMode", "FIRST");
            response.put("scanId", scanId);
            response.put("scannedSegments", scannedSegments);
            response.put("segmentStepSec", segmentStepSec);
            response.put("minFrames", minFrames);
            response.put("framesPerSegment", framesPerSegment);
            response.put("frameIntervalSec", frameIntervalSec);
            response.put("stopOnDetect", stopOnDetect);
            response.put("fireDetected", fireDetected);
            response.put("detectedSegmentStartSec", detectedSegmentStartSec);
            response.put("message", lastResultJson);
            response.put("parsedJson", lastParsed);
            response.put("savedToDb", savedToDb);
            response.put("cctvId", resolvedCctvId);
            response.put("locationDesc", resolvedLocationDesc);
            response.put("analyzedAt", OffsetDateTime.now(ZoneOffset.ofHours(9)).toString());
            if (incidentCode != null) response.put("incidentCode", incidentCode);
            if (incidentId != null) response.put("incidentId", incidentId);

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(response);

        } catch (Exception e) {
            log.error("❌ [FireDetection] System Error", e);
            return ResponseEntity.status(500)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "error", "Server Error",
                            // Map.of는 null 금지: message가 null이면 빈 문자열로
                            "details", e.getMessage() != null ? e.getMessage() : ""
                    ));
        } finally {
            cleanupTempFiles(tempVideo, frameFiles, tempDir);
        }
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
            return cctvRepository.findByCctvCode(normalized).map(CCTV::getId).orElse(null);
        } catch (Exception e) {
            log.warn("⚠️ [FireDetection] Failed to resolve cctvId from cctvCode={}: {}", normalized, e.getMessage());
            return null;
        }
    }

    private String resolveCctvCodeOrDefault(Long cctvId) {
        if (cctvId == null) return "CCTV-000";
        try {
            return cctvRepository.findById(cctvId)
                    .map(CCTV::getCctvCode)
                    .orElse(String.format("CCTV-%03d", cctvId));
        } catch (Exception e) {
            return String.format("CCTV-%03d", cctvId);
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
            log.warn("⚠️ [FireDetection] Failed to parse JSON from Gemini response: {}", e.getMessage());
            log.debug("Gemini response: {}", geminiResult);
            return null;
        }
    }

    /**
     * 영상에서 특정 시점을 기준으로 앞뒤 durationSeconds/2 만큼 잘라 클립 생성
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

        File outputFile = new File(outputDir, String.format("fire_clip_%ds_%ds.mp4", startSec, durationSeconds));

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
     * FFmpeg로 영상에서 프레임 추출 (구간 시작점 기준)
     * - segmentStartSec + (0/interval/2*interval/3*interval)
     */
    private List<File> extractFramesFromStart(File videoFile, File outputDir, int segmentStartSec, int frameCount, int intervalSeconds) throws IOException, InterruptedException {
        List<File> frames = new ArrayList<>();

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

        for (int i = 0; i < frameCount; i++) {
            int timeSeconds = segmentStartSec + (i * intervalSeconds);
            File outputFile = new File(outputDir, String.format("frame_%06d_%02d.jpg", segmentStartSec, i));

            ProcessBuilder pb = new ProcessBuilder(
                    ffmpegCommand,
                    "-y",
                    "-hide_banner",
                    "-loglevel", "error",
                    "-ss", String.valueOf(timeSeconds),
                    "-i", videoFile.getAbsolutePath(),
                    "-frames:v", "1",
                    "-q:v", "2",
                    "-vf", "scale=640:-1",
                    outputFile.getAbsolutePath()
            );

            pb.redirectErrorStream(true);
            Process process = pb.start();

            // ffmpeg 출력(에러 포함) 캡쳐
            String ffmpegOut = "";
            try (InputStream is = process.getInputStream()) {
                byte[] bytes = is.readAllBytes();
                if (bytes != null && bytes.length > 0) {
                    ffmpegOut = new String(bytes, StandardCharsets.UTF_8);
                }
            } catch (Exception ignore) {}

            int exitCode = process.waitFor();
            if (exitCode == 0 && outputFile.exists() && outputFile.length() > 0) {
                frames.add(outputFile);
            } else {
                log.warn("⚠️ [FireDetection] Failed to extract frame at {}s (segmentStartSec={}s, exitCode={}, out={})",
                        timeSeconds, segmentStartSec, exitCode, (ffmpegOut == null ? "" : ffmpegOut));
            }
        }

        return frames;
    }

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

            log.info("🚀 [FireDetection] Executing Python: {}", String.join(" ", command));

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
                    log.warn("⚠️ [FireDetection] Python stderr: {}", stderr.toString().trim());
                }

                return resultJson;

            } catch (IOException ioe) {
                // python 커맨드 자체를 못 찾는 경우(Windows PATH 문제 등): 다음 후보 시도
                last = ioe;
                log.warn("⚠️ [FireDetection] Python command start failed (cmd={}): {}", pythonBase, ioe.getMessage());
                continue;
            } catch (Exception e) {
                last = e;
                // 스크립트 실행/분석 실패는 후보를 바꿔도 해결 안 될 가능성이 커서 바로 던짐
                throw e;
            }
        }

        throw new RuntimeException("Python 실행 커맨드를 찾지 못했습니다. app.python.command 설정을 확인하세요.", last);
    }

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
            log.warn("⚠️ [FireDetection] Failed to cleanup temp files", e);
        }
    }
}

