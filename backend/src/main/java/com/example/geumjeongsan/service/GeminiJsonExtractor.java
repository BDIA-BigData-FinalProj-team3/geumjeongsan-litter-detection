package com.example.geumjeongsan.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Gemini 응답 텍스트에서 JSON을 추출/파싱하는 공통 유틸
 * - ```json ... ``` 코드블록 또는 본문 내 JSON object를 best-effort로 추출
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class GeminiJsonExtractor {
    private final ObjectMapper objectMapper;

    @SuppressWarnings("unchecked")
    public Map<String, Object> extract(String geminiText) {
        if (geminiText == null || geminiText.trim().isEmpty()) return null;

        try {
            // 1) Markdown 코드 블록에서 JSON 추출
            Pattern jsonBlockPattern = Pattern.compile("```(?:json)?\\s*\\n?([\\s\\S]*?)\\n?```", Pattern.CASE_INSENSITIVE);
            Matcher matcher = jsonBlockPattern.matcher(geminiText);
            if (matcher.find()) {
                String jsonStr = matcher.group(1).trim();
                return objectMapper.readValue(jsonStr, Map.class);
            }

            // 2) 중괄호로 시작하는 JSON 문자열 직접 찾기
            int startIdx = geminiText.indexOf('{');
            int endIdx = geminiText.lastIndexOf('}');
            if (startIdx >= 0 && endIdx > startIdx) {
                String jsonStr = geminiText.substring(startIdx, endIdx + 1);
                return objectMapper.readValue(jsonStr, Map.class);
            }

            // 3) 전체 텍스트를 JSON으로 파싱 시도
            return objectMapper.readValue(geminiText.trim(), Map.class);

        } catch (Exception e) {
            log.warn("⚠️ [GeminiJsonExtractor] Failed to parse JSON: {}", e.getMessage());
            log.debug("Gemini raw text: {}", geminiText);
            return null;
        }
    }
}


