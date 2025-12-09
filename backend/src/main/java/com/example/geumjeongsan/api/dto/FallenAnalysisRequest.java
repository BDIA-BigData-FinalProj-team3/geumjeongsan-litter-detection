package com.example.geumjeongsan.api.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 모델 서버로 보낼 낙상 분석 요청 DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FallenAnalysisRequest {
    private String s3_key;
    private String camera_id;
}

