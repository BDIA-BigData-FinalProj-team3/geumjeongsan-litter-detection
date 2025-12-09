package com.example.geumjeongsan.api.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * 간단한 사고 다발구간 DTO
 * Frontend 형식: { location: string, count: number }
 */
@Getter
@AllArgsConstructor
public class SimpleHotspotDto {
    private String location;
    private Integer count;
    
    /**
     * 복잡한 HotspotDto에서 간단한 형식으로 변환
     */
    public static SimpleHotspotDto fromHotspotDto(HotspotDto dto) {
        return new SimpleHotspotDto(
                dto.getAddress(), 
                dto.getIncidentCount() != null ? dto.getIncidentCount().intValue() : 0
        );
    }
}

