package com.example.geumjeongsan.api.dto;

import java.util.List;

/**
 * 평균 대응시간 전체 응답 DTO
 */
public record ResponseTimeOverviewDto(
        List<ResponseTimeItemDto> items
) {}

