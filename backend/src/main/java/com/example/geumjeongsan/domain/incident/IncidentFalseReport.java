package com.example.geumjeongsan.domain.incident;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "incident_false_report")
@Getter
@Setter
public class IncidentFalseReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "false_id")
    private Long id;

    @Column(name = "action_id")
    private Long actionId;

    @Column(name = "reason", columnDefinition = "text")
    private String reason;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;
}

