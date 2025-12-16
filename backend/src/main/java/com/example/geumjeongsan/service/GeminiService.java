package com.example.geumjeongsan.service;

import com.example.geumjeongsan.api.dto.GeminiRequest;
import com.example.geumjeongsan.api.dto.GeminiResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.List;

/**
 * Gemini API 호출 서비스
 * 텍스트와 이미지를 조합하여 멀티모달 분석 수행
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GeminiService {

    @Value("${gemini.api.key}")
    private String apiKey;

    @Value("${gemini.api.url}")
    private String baseUrl;

    @Value("${gemini.api.model}")
    private String model;

    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;

    /**
     * Gemini에게 텍스트 + 이미지를 보내고 분석 결과를 받습니다.
     * 
     * @param prompt 질문 내용 (프롬프트)
     * @param base64Images Base64로 인코딩된 이미지 리스트
     * @return AI의 답변 텍스트
     */
    public String analyze(String prompt, List<String> base64Images) {
        if (apiKey == null || apiKey.isEmpty()) {
            log.error("❌ [Gemini] API Key is missing");
            return "Error: Gemini API Key is missing. Please set GEMINI_API_KEY environment variable.";
        }

        if (prompt == null || prompt.isEmpty()) {
            log.warn("⚠️ [Gemini] Prompt is empty");
            return "Error: Prompt cannot be empty.";
        }

        GeminiRequest requestBody = GeminiRequest.create(prompt, base64Images);

        try {
            int maxAttempts = 3;
            long backoffMs = 1500;

            // 2.5 계열이 503을 자주 내면 1.5로 fallback (키/프로젝트 정책에 따라 허용 모델이 다를 수 있음)
            String[] candidateModels = new String[] { model };
            Exception lastException = null;

            for (String candidateModel : candidateModels) {
                String requestUrl = baseUrl + "/v1beta/models/" + candidateModel + ":generateContent?key=" + apiKey;
                for (int attempt = 1; attempt <= maxAttempts; attempt++) {
                    try {
                        log.info("🤖 [Gemini] Calling API model={} attempt={} ({} image(s))",
                                candidateModel, attempt, base64Images != null ? base64Images.size() : 0);

                        String rawResponse = webClientBuilder.build()
                                .post()
                                .uri(requestUrl)
                                .contentType(MediaType.APPLICATION_JSON)
                                .bodyValue(requestBody)
                                .retrieve()
                                .bodyToMono(String.class)
                                .block(); // 동기 호출

                        // JSON 파싱해서 텍스트만 추출
                        // 구조: candidates[0].content.parts[0].text
                        JsonNode root = objectMapper.readTree(rawResponse);

                        if (!root.has("candidates") || root.get("candidates").isEmpty()) {
                            log.error("❌ [Gemini] No candidates in response: {}", rawResponse);
                            return "Error: No response from Gemini API";
                        }

                        JsonNode candidate = root.get("candidates").get(0);
                        if (!candidate.has("content") || !candidate.get("content").has("parts")) {
                            log.error("❌ [Gemini] Invalid response structure: {}", rawResponse);
                            return "Error: Invalid response structure from Gemini API";
                        }

                        JsonNode parts = candidate.get("content").get("parts");
                        if (parts.isEmpty() || !parts.get(0).has("text")) {
                            log.error("❌ [Gemini] No text in response: {}", rawResponse);
                            return "Error: No text in Gemini response";
                        }

                        String result = parts.get(0).get("text").asText();
                        log.info("✅ [Gemini] Analysis completed successfully (model={})", candidateModel);
                        return result;
                    } catch (WebClientResponseException e) {
                        lastException = e;
                        int status = e.getStatusCode().value();
                        // 503/429는 일시 장애/쿼터로 재시도 가치 있음
                        if ((status == 503 || status == 429) && attempt < maxAttempts) {
                            log.warn("⚠️ [Gemini] Temporary error status={} model={} attempt={} -> retry in {}ms",
                                    status, candidateModel, attempt, backoffMs);
                            try { Thread.sleep(backoffMs); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
                            continue;
                        }
                        log.error("❌ [Gemini] API call failed status={} body={}", status, e.getResponseBodyAsString());
                        break; // 다음 모델 후보로 넘어감
                    } catch (Exception e) {
                        lastException = e;
                        log.warn("⚠️ [Gemini] API call failed model={} attempt={} err={}",
                                candidateModel, attempt, e.getMessage());
                        break; // 다음 모델 후보로 넘어감
                    }
                }
            }

            if (lastException != null) {
                return "Error: " + lastException.getMessage();
            }
            return "Error: Gemini API call failed";

        } catch (Exception e) {
            log.error("❌ [Gemini] API Call Failed", e);
            return "Error: " + e.getMessage();
        }
    }

    /**
     * 텍스트만으로 Gemini에게 질문 (이미지 없이)
     * 
     * @param prompt 질문 내용
     * @return AI의 답변 텍스트
     */
    public String analyzeText(String prompt) {
        return analyze(prompt, null);
    }

    /**
     * 단일 이미지 분석
     * 
     * @param prompt 질문 내용
     * @param base64Image Base64로 인코딩된 단일 이미지
     * @return AI의 답변 텍스트
     */
    public String analyzeImage(String prompt, String base64Image) {
        return analyze(prompt, List.of(base64Image));
    }
}

