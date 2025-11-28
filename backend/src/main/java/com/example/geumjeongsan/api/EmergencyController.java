package com.example.geumjeongsan.api;

import com.example.geumjeongsan.api.dto.EmergencyRequest;
import com.example.geumjeongsan.api.dto.EmergencyResponse;
import com.example.geumjeongsan.domain.incident.EmergencyService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/emergencies")
public class EmergencyController {

    private final EmergencyService emergencyService;

    public EmergencyController(EmergencyService emergencyService) {
        this.emergencyService = emergencyService;
    }

    // 응급환자 기록 목록 조회
    @GetMapping
    public List<EmergencyResponse> getAllEmergencies() {
        return emergencyService.getAllEmergencies();
    }

    // 응급환자 기록 상세 조회
    @GetMapping("/{id}")
    public ResponseEntity<EmergencyResponse> getEmergency(@PathVariable Long id) {
        // TODO: 상세 조회 구현 (현재는 목록에서 찾기)
        return ResponseEntity.notFound().build();
    }

    // 응급환자 기록 신규 등록
    @PostMapping
    public ResponseEntity<?> createEmergency(@RequestBody EmergencyRequest request) {
        try {
            EmergencyResponse response = emergencyService.createEmergency(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (NumberFormatException e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("CCTV ID 형식이 올바르지 않습니다: " + (request.getCctvId() != null ? request.getCctvId() : "null"));
        } catch (java.time.format.DateTimeParseException e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("발생시간 형식이 올바르지 않습니다. 형식: yyyy-MM-dd HH:mm (예: 2025-11-28 10:00)");
        } catch (Exception e) {
            e.printStackTrace();
            String errorMessage = e.getMessage() != null ? e.getMessage() : "등록 실패: " + e.getClass().getSimpleName();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorMessage);
        }
    }

    // 응급환자 기록 수정
    @PutMapping("/{id}")
    public ResponseEntity<EmergencyResponse> updateEmergency(
            @PathVariable Long id,
            @RequestBody EmergencyRequest request) {
        try {
            EmergencyResponse response = emergencyService.updateEmergency(id, request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    // 응급환자 기록 삭제
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEmergency(@PathVariable Long id) {
        try {
            emergencyService.deleteEmergency(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}

