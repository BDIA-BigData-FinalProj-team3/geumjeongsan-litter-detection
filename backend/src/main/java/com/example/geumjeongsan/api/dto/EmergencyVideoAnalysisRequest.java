package com.example.geumjeongsan.api.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 응급 분석 요청 DTO
 * - 저장된 S3 영상을 기준으로 분석할 때 사용
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmergencyVideoAnalysisRequest {
    /**
     * S3 key (예: cctv/cctv-001/videos/xxx.mp4)
     */
    private String s3_key;

    /**
     * 카메라 ID (예: cctv-001)
     */
    private String camera_id;

    /**
     * 영상 HTTP URL (예: https://bucket.s3.region.amazonaws.com/cctv/..../video.mp4)
     * - s3_key가 없을 때 서버에서 s3_key로 역변환을 시도합니다.
     */
    private String clip_url;
}


