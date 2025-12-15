package com.example.geumjeongsan.api;

import com.example.geumjeongsan.domain.weather.Weather;
import com.example.geumjeongsan.service.WeatherService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
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

            // 2. 파이썬 실행 명령어 준비
            List<String> command = new ArrayList<>();
            
            // OS에 따라 python 명령어 결정 (Linux/Mac: python3, Windows: python)
            String os = System.getProperty("os.name").toLowerCase();
            String pythonCmd = os.contains("win") ? "python" : "python3";
            
            command.add(pythonCmd);
            
            // 파이썬 스크립트 경로: 실행 위치가 repo root든 backend든 안전하게 탐색
            String userDir = System.getProperty("user.dir");
            Path script1 = Paths.get(userDir, "ai", "fire_detector.py");                // user.dir == backend
            Path script2 = Paths.get(userDir, "backend", "ai", "fire_detector.py");    // user.dir == repo root
            Path scriptPath = Files.exists(script1) ? script1 : (Files.exists(script2) ? script2 : null);
            if (scriptPath == null) {
                return ResponseEntity.status(500)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(Map.of("error", "fire_detector.py 경로를 찾을 수 없습니다.", "userDir", userDir));
            }
            command.add(scriptPath.toAbsolutePath().toString());

            // 3. 받은 파일들을 임시 폴더에 저장
            for (MultipartFile file : files) {
                String originalName = file.getOriginalFilename();
                String ext = originalName != null && originalName.contains(".") 
                        ? originalName.substring(originalName.lastIndexOf(".")) 
                        : ".jpg";
                
                File tempFile = File.createTempFile("fire_" + UUID.randomUUID().toString(), ext);
                file.transferTo(tempFile);
                
                tempFiles.add(tempFile);
                command.add(tempFile.getAbsolutePath());
            }

            // 4. 날씨 옵션 추가
            command.add("--wind_dir");
            command.add(windDir);
            command.add("--wind_speed");
            command.add(windSpeed);
            command.add("--humidity");
            command.add(humidity);

            log.info("🚀 [FireDetection] Executing Python: {}", String.join(" ", command));

            // 5. 프로세스 실행
            ProcessBuilder pb = new ProcessBuilder(command);
            pb.redirectErrorStream(true); // stderr를 stdout으로 병합
            Process process = pb.start();

            // 6. 결과 읽기 (JSON 문자열)
            // 인코딩 주의: 파이썬은 utf-8로 출력함
            BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8));
            
            StringBuilder output = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                output.append(line);
            }

            boolean finished = process.waitFor(60, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                return ResponseEntity.status(504)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(Map.of("error", "AI 분석 타임아웃(60s)"));
            }

            int exitCode = process.exitValue();
            String resultJson = output.toString();

            if (exitCode == 0) {
                log.info("✅ [FireDetection] Analysis success");
                // JSON 문자열을 그대로 반환 (프론트에서 파싱)
                return ResponseEntity.ok()
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(resultJson);
            } else {
                log.error("❌ [FireDetection] Analysis failed (Exit Code {}): {}", exitCode, resultJson);
                return ResponseEntity.status(500)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(Map.of("error", "AI Analysis Failed", "exitCode", exitCode, "details", resultJson));
            }

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
}

