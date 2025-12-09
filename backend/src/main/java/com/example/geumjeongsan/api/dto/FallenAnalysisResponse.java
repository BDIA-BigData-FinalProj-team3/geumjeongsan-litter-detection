package com.example.geumjeongsan.api.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 낙상 분석 응답 DTO
 * 모델 서버로부터 받은 분석 결과를 그대로 반환
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FallenAnalysisResponse {
    private String status;
    private String camera_id;
    private String s3_key;
    private AnalysisResult result;
    private String geminiMessage; // Gemini 호출 필요 시 메시지

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AnalysisResult {
        private Boolean success;
        private Integer total_frames;
        private Integer fallen_events;
        private Double duration;
        private Double fps;
        private Double effective_fps;
        private Integer frame_skip;
        private String clip_url;
        private List<String> frame_urls;
    }
}

