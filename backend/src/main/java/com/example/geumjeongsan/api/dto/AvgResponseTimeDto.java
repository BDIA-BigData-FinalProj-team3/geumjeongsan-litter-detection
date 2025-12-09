package com.example.geumjeongsan.api.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Dashboard 평균 응답시간 응답 DTO
 * Frontend UI 형식: [{ type, time, change, isIncrease }]
 */
@Getter
@AllArgsConstructor
public class AvgResponseTimeDto {
    private String type;
    private Integer time;
    private Integer change;
    private Boolean isIncrease;
}

