package com.example.geumjeongsan.domain.incident;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

/**
 * 사건 처리 카드 (사건당 1개)
 * Table: incident_response
 */
@Entity
@Table(name = "incident_response")
@Getter
@Setter
public class IncidentResponse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "incident_response_id")
    private Long id;

    @Column(name = "incident_id", nullable = false, unique = true)
    private Long incidentId;

    // 담당자(staff_user.user_id)
    @Column(name = "assigned_to_id")
    private Long assignedToId;

    @Column(name = "assigned_dept_group")
    private String assignedDeptGroup;

    @Column(name = "assigned_dept_name")
    private String assignedDeptName;

    @Column(name = "dispatch_at")
    private OffsetDateTime dispatchAt;

    @Column(name = "arrival_at")
    private OffsetDateTime arrivalAt;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    @Column(name = "resolution_code")
    private String resolutionCode;

    @Column(name = "resolution_note", columnDefinition = "text")
    private String resolutionNote;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}


