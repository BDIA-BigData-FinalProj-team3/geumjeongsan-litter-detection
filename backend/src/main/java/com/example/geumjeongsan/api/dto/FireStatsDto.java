package com.example.geumjeongsan.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FireStatsDto {
    private Long todayCount;
    private Long pendingCount;
    private Double avgResponseTime;
    private String avgResponseTimeFormatted;
}

