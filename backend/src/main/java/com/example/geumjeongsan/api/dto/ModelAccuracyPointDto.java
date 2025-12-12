package com.example.geumjeongsan.api.dto;

import java.time.LocalDate;

/**
 * AI 모델 정확도 / 오탐률 데이터 포인트
 * VIEW: view_stats_model_accuracy_daily
 */
public record ModelAccuracyPointDto(
        LocalDate period,        // 연/월/일 기준 날짜 (unit에 따라 trunc된 값)
        String incidentType,     // 'EMERGENCY' | 'FIRE' | 'TRASH' | ...
        String detectionModel,   // 모델 이름 (예: 'yolo-v8')
        long totalAutoIncidents, // AUTO 탐지 총 건수
        long trueIncidents,      // 정탐 건수
        long falseIncidents,     // 오탐 건수
        double accuracyPct,      // 정확도 (%)
        double falseRatePct      // 오탐률 (%)
) {}

