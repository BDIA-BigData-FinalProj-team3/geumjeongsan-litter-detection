package com.example.geumjeongsan.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmergencyResponse {
    private Long id;
    private String patientName;
    private Integer age;
    private String gender;
    private String location;
    private String cctvId;
    private String incidentTime;
    private String symptoms;
    private String severity; // "critical", "moderate", "low"
    private String status; // "대응중", "이송완료", "처리완료"
    private String responseTeam;
    private String notes;
}

