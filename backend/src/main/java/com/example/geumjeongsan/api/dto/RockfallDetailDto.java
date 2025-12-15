package com.example.geumjeongsan.api.dto;

import com.example.geumjeongsan.domain.incident.RockfallDetail;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 낙석 상세(rockfall_detail) DTO - DDL 컬럼 그대로 노출
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RockfallDetailDto {
    private Long incidentId;
    private String rockSizeClass;
    private String affectedAssetType;
    private String affectedAssetName;
    private String damageDescription;

    public static RockfallDetailDto from(RockfallDetail detail) {
        if (detail == null) return null;
        return RockfallDetailDto.builder()
                .incidentId(detail.getIncidentId())
                .rockSizeClass(detail.getRockSizeClass())
                .affectedAssetType(detail.getAffectedAssetType())
                .affectedAssetName(detail.getAffectedAssetName())
                .damageDescription(detail.getDamageDescription())
                .build();
    }
}


