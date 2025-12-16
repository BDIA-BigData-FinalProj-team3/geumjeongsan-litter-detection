package com.example.geumjeongsan.api;

import com.example.geumjeongsan.domain.cctv.CCTV;
import com.example.geumjeongsan.domain.cctv.CCTVRepository;
import com.example.geumjeongsan.domain.incident.FireService;
import com.example.geumjeongsan.domain.weather.Weather;
import com.example.geumjeongsan.service.WeatherService;
import com.example.geumjeongsan.service.RealtimeSseService;
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
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

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
            // 끝까지 스캔(20초 단위)하되, "첫 감지만 1건 저장"을 기본 동작으로 제공
            @RequestParam(value = "segmentStepSec", required = false, defaultValue = "20") int segmentStepSec,
            @RequestParam(value = "maxSegments", required = false, defaultValue = "9999") int maxSegments,
            // 마지막 구간에서 4장이 안 나와도 분석할 수 있게 최소 프레임 수를 허용 (권장: 2)
            @RequestParam(value = "minFrames", required = false, defaultValue = "2") int minFrames,
            // 스캔 진행 상황을 SSE로 푸시할지 여부
            @RequestParam(value = "emitProgress", required = false, defaultValue = "true") boolean emitProgress
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
            int scannedSegments = 0;
            boolean fireDetected = false;
            Integer detectedSegmentStartSec = null;
            String lastResultJson = null;
            Map<String, Object> lastParsed = null;
            boolean savedToDb = false;
            String incidentCode = null;
            Long incidentId = null;

            if (emitProgress) {
                realtimeSseService.publish("fire.scan.started", Map.of(
                        "scanId", scanId,
                        "cctvId", resolvedCctvId,
                        "locationDesc", resolvedLocationDesc,
                        "segmentStepSec", segmentStepSec,
                        "minFrames", minFrames,
                        "mode", "FIRST",
                        "fileName", videoFile.getOriginalFilename() != null ? videoFile.getOriginalFilename() : ""
                ));
            }

            for (int seg = 0; seg < maxSegments; seg++) {
                int segmentStartSec = seg * segmentStepSec;

                // segmentStartSec 기준 0/5/10/15초 프레임 4장 추출
                frameFiles = extractFramesFromStart(tempVideo, tempDir, segmentStartSec, 4, 5);
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
                if (parsed != null) {
                    try {
                        @SuppressWarnings("unchecked")
                        Map<String, Object> ar = (Map<String, Object>) parsed.get("analysis_result");
                        isFire = ar != null && Boolean.TRUE.equals(ar.get("is_fire_detected"));
                    } catch (Exception ignore) {}
                }

                if (emitProgress) {
                    realtimeSseService.publish("fire.scan.segment", Map.of(
                            "scanId", scanId,
                            "segmentIndex", seg,
                            "segmentStartSec", segmentStartSec,
                            "frames", framesCount,
                            "isFireDetected", isFire
                    ));
                }

                // 프레임 파일은 구간마다 바로 삭제(디스크 누적 방지)
                for (File f : frameFiles) {
                    try { if (f != null && f.exists()) f.delete(); } catch (Exception ignore) {}
                }
                frameFiles.clear();

                if (isFire && parsed != null) {
                    fireDetected = true;
                    detectedSegmentStartSec = segmentStartSec;
                    try {
                        String loc = resolvedLocationDesc + " (t=" + segmentStartSec + "s)";
                        var createResp = fireService.createFireFromAiAnalysis(parsed, resolvedCctvId, loc, weather);
                        savedToDb = true;
                        incidentCode = createResp.getIncidentCode();
                        incidentId = createResp.getIncidentId();
                    } catch (Exception e) {
                        log.error("❌ [FireDetection] Failed to save FIRE incident (segmentStartSec={}s)", segmentStartSec, e);
                    }
                    if (emitProgress) {
                        realtimeSseService.publish("fire.scan.detected", Map.of(
                                "scanId", scanId,
                                "segmentStartSec", segmentStartSec,
                                "savedToDb", savedToDb,
                                "incidentId", incidentId,
                                "incidentCode", incidentCode
                        ));
                    }
                    // ✅ 첫 감지면 즉시 종료
                    break;
                }
            }

            if (emitProgress) {
                realtimeSseService.publish("fire.scan.completed", Map.of(
                        "scanId", scanId,
                        "scannedSegments", scannedSegments,
                        "fireDetected", fireDetected,
                        "detectedSegmentStartSec", detectedSegmentStartSec,
                        "savedToDb", savedToDb,
                        "incidentId", incidentId,
                        "incidentCode", incidentCode
                ));
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("mode", "FIRST");
            response.put("scanId", scanId);
            response.put("scannedSegments", scannedSegments);
            response.put("segmentStepSec", segmentStepSec);
            response.put("minFrames", minFrames);
            response.put("fireDetected", fireDetected);
            response.put("detectedSegmentStartSec", detectedSegmentStartSec);
            response.put("message", lastResultJson);
            response.put("parsedJson", lastParsed);
            response.put("savedToDb", savedToDb);
            response.put("cctvId", resolvedCctvId);
            response.put("locationDesc", resolvedLocationDesc);
            response.put("analyzedAt", OffsetDateTime.now().toString());
            if (incidentCode != null) response.put("incidentCode", incidentCode);
            if (incidentId != null) response.put("incidentId", incidentId);

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(response);

        } catch (Exception e) {
            log.error("❌ [FireDetection] System Error", e);
            return ResponseEntity.status(500)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("error", "Server Error", "details", e.getMessage()));
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
                pb.redirectErrorStream(true);
                Process process = pb.start();

                BufferedReader reader = new BufferedReader(
                        new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8));

                StringBuilder output = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    output.append(line);
                }

                boolean finished = process.waitFor(120, TimeUnit.SECONDS);
                if (!finished) {
                    process.destroyForcibly();
                    throw new RuntimeException("AI 분석 타임아웃(120s)");
                }

                int exitCode = process.exitValue();
                String resultJson = output.toString();
                if (exitCode != 0) {
                    throw new RuntimeException("AI Analysis Failed (exitCode=" + exitCode + "): " + resultJson);
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

