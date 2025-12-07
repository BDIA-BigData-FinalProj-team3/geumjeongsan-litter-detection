package com.example.geumjeongsan.api;

import com.example.geumjeongsan.api.dto.*;
import com.example.geumjeongsan.domain.staff.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
// @CrossOrigin(origins = "*")  // 주석 처리: WebConfig.java에서 CORS 설정 관리 (allowCredentials=true와 충돌 방지)
public class AuthController {

    private final AuthService authService;

    /**
     * 로그인
     * POST /api/auth/login
     */
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {
        try {
            LoginResponse response = authService.login(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 아이디 찾기
     * POST /api/auth/find-id
     */
    @PostMapping("/find-id")
    public ResponseEntity<FindIdResponse> findId(@RequestBody FindIdRequest request) {
        FindIdResponse response = authService.findLoginId(request);
        return ResponseEntity.ok(response);
    }

    /**
     * 비밀번호 찾기
     * POST /api/auth/find-password
     */
    @PostMapping("/find-password")
    public ResponseEntity<FindPasswordResponse> findPassword(@RequestBody FindPasswordRequest request) {
        try {
            FindPasswordResponse response = authService.findPassword(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            FindPasswordResponse errorResponse = new FindPasswordResponse(false, null, "일치하는 정보가 없습니다.");
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
}

