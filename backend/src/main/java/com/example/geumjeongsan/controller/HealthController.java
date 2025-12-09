package com.example.geumjeongsan.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

@RestController
public class HealthController {
    
    @Value("${app.deployment.time:${DEPLOYMENT_TIME:}}")
    private String deploymentTime;
    
    @Value("${app.build.number:${BUILD_NUMBER:unknown}}")
    private String buildNumber;
    
    @Value("${app.commit.sha:${COMMIT_SHA:unknown}}")
    private String commitSha;
    
    @Value("${app.environment:${ENVIRONMENT:test}}")
    private String environment;
    
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "healthy");
        response.put("timestamp", Instant.now().atOffset(ZoneOffset.UTC)
            .format(DateTimeFormatter.ISO_INSTANT));
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/deployment-info")
    public ResponseEntity<Map<String, Object>> deploymentInfo() {
        Map<String, Object> response = new HashMap<>();
        
        // 배포시간이 설정되지 않았으면 현재 시간 사용
        String finalDeploymentTime = deploymentTime.isEmpty() 
            ? Instant.now().atOffset(ZoneOffset.UTC).format(DateTimeFormatter.ISO_INSTANT)
            : deploymentTime;
        
        response.put("deployment_time", finalDeploymentTime);
        response.put("build_number", buildNumber);
        response.put("commit_sha", commitSha.length() > 7 ? commitSha.substring(0, 7) : commitSha);
        response.put("environment", environment);
        
        return ResponseEntity.ok(response);
    }
}

