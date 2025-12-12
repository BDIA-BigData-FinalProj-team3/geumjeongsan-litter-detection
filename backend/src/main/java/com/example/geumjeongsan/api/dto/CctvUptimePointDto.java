package com.example.geumjeongsan.api.dto;

import java.time.LocalDate;

/**
 * CCTV 가동률 추이 데이터
 * VIEW: view_stats_daily_cctv_uptime
 */
public record CctvUptimePointDto(
        LocalDate period,  // 연/월/일 기준 날짜
        long onSamples,    // ON 샘플 수 평균 또는 합계
        long offSamples,   // OFF 샘플 수 평균 또는 합계
        double uptimePct   // 가동률 (%)
) {}

