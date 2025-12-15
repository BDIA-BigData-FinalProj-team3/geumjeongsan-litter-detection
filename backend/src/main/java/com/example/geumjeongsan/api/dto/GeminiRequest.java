package com.example.geumjeongsan.api.dto;

import lombok.Builder;
import lombok.Data;
import java.util.ArrayList;
import java.util.List;

/**
 * Gemini API 요청 DTO
 * 텍스트 프롬프트와 이미지(Base64)를 포함한 멀티모달 요청 구조
 */
@Data
@Builder
public class GeminiRequest {
    private List<Content> contents;

    @Data
    @Builder
    public static class Content {
        private List<Part> parts;
    }

    @Data
    @Builder
    public static class Part {
        private String text; // 텍스트 프롬프트용
        private InlineData inlineData; // 이미지 데이터용
    }

    @Data
    @Builder
    public static class InlineData {
        private String mimeType; // "image/jpeg", "image/png" 등
        private String data; // Base64 인코딩된 이미지 문자열
    }

    /**
     * 헬퍼 메서드: 텍스트 1개 + 이미지 N개로 요청 생성
     * 
     * @param text 프롬프트 텍스트
     * @param base64Images Base64로 인코딩된 이미지 리스트
     * @return GeminiRequest 객체
     */
    public static GeminiRequest create(String text, List<String> base64Images) {
        List<Part> parts = new ArrayList<>();
        
        // 1. 텍스트 추가
        if (text != null && !text.isEmpty()) {
            parts.add(Part.builder().text(text).build());
        }
        
        // 2. 이미지들 추가
        if (base64Images != null && !base64Images.isEmpty()) {
            for (String base64 : base64Images) {
                if (base64 != null && !base64.isEmpty()) {
                    parts.add(Part.builder()
                            .inlineData(InlineData.builder()
                                    .mimeType("image/jpeg")
                                    .data(base64)
                                    .build())
                            .build());
                }
            }
        }

        return GeminiRequest.builder()
                .contents(List.of(Content.builder().parts(parts).build()))
                .build();
    }
}

