package com.example.geumjeongsan.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FireResponse {
    private Long id;
    private String cctvId;  // "CCTV-001" 형식
    private String time;    // "2025-11-25 14:15" 형식
    private String status;  // "진화중", "대기중", "진화완료"
    private String severity; // "high", "medium", "low"
    private String windSpeed; // "15km/h"
    private String handler;   // "119" 또는 처리자 이름
    
    // 처리완료 시에만 사용
    private String responseTime; // "2025-11-25 12:45" 형식
    private String duration;    // "45분"
}

