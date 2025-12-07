package com.example.geumjeongsan.api.dto;

import com.example.geumjeongsan.domain.incident.IncidentSummary;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.format.DateTimeFormatter;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmergencyIncidentListDto {
    private Long incidentId;
    private String accidentCode;
    private String type;
    private String cctvId;
    private String detectedAt;
    private String severity;
    private String status;
    private String location;
    
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
    
    public static EmergencyIncidentListDto fromEntity(IncidentSummary entity) {
        String accidentCode = "EMG-" + String.format("%03d", entity.getIncidentId());
        
        String severityKor = switch (entity.getSeverityLevel()) {
            case "HIGH" -> "상";
            case "MEDIUM" -> "중";
            case "LOW" -> "하";
            default -> "-";
        };
        
        String statusKor = switch (entity.getStatus()) {
            case "PENDING" -> "대기중";
            case "ACKNOWLEDGED" -> "대응중";
            case "RESOLVED" -> "처리완료";
            case "FALSE_REPORT" -> "오탐";
            default -> entity.getStatus();
        };
        
        return EmergencyIncidentListDto.builder()
                .incidentId(entity.getIncidentId())
                .accidentCode(accidentCode)
                .type("응급환자")
                .cctvId("CCTV-" + String.format("%03d", entity.getCctvId()))
                .detectedAt(entity.getDetectedAt() != null ? entity.getDetectedAt().format(FORMATTER) : "-")
                .severity(severityKor)
                .status(statusKor)
                .location(entity.getLocationDesc() != null ? entity.getLocationDesc() : "-")
                .build();
    }
}

