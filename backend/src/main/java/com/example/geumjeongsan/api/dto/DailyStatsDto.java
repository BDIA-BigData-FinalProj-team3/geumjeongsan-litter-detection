package com.example.geumjeongsan.api.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Dashboard 일일 통계 응답 DTO
 * Frontend UI 형식: [{ label, value }]
 */
@Getter
@AllArgsConstructor
public class DailyStatsDto {
    private String label;
    private String value;
}

