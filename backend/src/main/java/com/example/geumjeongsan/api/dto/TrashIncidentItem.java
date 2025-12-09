package com.example.geumjeongsan.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrashIncidentItem {
    private Long id;
    private String cctvId;
    private String incidentTime;
    private String type;  // 쓰레기 유형 (mainCategory)
    private String severity;
    private String status;
    private String handler;
    private String responseTime;
    private String duration;
}

