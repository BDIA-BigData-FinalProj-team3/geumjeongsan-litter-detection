package com.example.geumjeongsan.api.dto;

import lombok.Data;

@Data
public class EmergencyRequest {
    private String patientName;
    private Integer age;
    private String gender; // "남" or "여"
    private String location;
    private String cctvId; // "CCTV-001" 형식
    private String incidentTime; // "2025-11-25 14:20" 형식
    private String symptoms;
    private String severity; // "critical", "moderate", "low"
    private String status; // "대응중", "이송완료", "처리완료"
    private String responseTeam;
    private String notes;
}

