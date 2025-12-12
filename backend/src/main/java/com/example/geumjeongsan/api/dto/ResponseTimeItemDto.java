package com.example.geumjeongsan.api.dto;

/**
 * 평균 대응시간 카드용 DTO (프론트 UI 형식 그대로)
 */
public record ResponseTimeItemDto(
        String type,       // '전체' | '응급' | '화재' | '쓰레기'
        int time,          // 평균 대응시간 (분)
        int change,        // 전월/전년 대비 % (절대값)
        boolean isIncrease // true=증가(악화), false=감소(개선)
) {}

