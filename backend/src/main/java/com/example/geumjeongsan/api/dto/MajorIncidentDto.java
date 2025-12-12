package com.example.geumjeongsan.api.dto;

import java.time.LocalDate;

/**
 * 주요 사건 목록 DTO
 * VIEW: view_report_incident_list
 */
public record MajorIncidentDto(
    Long incidentId,
    LocalDate date,
    String incidentType,  // ENUM: FIRE, TRASH, EMERGENCY, ROCKFALL
    String locationDesc,
    String severityLevel, // ENUM: HIGH, MEDIUM, LOW
    String status,        // ENUM: RESOLVED, IN_PROGRESS, PENDING
    String sourceType     // ENUM: AUTO, MANUAL
) {}

