package com.example.geumjeongsan.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Gemini API 응답 DTO
 * API 응답에서 텍스트 부분만 추출하여 사용
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GeminiResponse {
    private String text; // AI가 생성한 텍스트 응답
    private boolean success; // API 호출 성공 여부
    private String errorMessage; // 에러 발생 시 메시지
}

