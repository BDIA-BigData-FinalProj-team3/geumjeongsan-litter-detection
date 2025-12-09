package com.example.geumjeongsan.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrashResponse {
    private Long id;
    private String cctvId;
    private String time;
    private String status; // "대기중", "대응중", "처리완료"
    private String severity; // "high", "medium", "low"
    private String type; // 쓰레기 유형
    private String handler;
    private String responseTime;
    private String duration;
}

