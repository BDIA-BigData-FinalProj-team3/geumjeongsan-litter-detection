package com.example.geumjeongsan.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FireIncidentItem {
    private Long id;
    private String cctvId;
    private String incidentTime;
    private String severity;
    private String windSpeed;
    private String status;
    private String handler;
    private String responseTime;
    private String duration;
}

