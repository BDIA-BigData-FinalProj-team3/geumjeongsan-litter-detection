package com.example.geumjeongsan.domain.incident;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "incident_action")
@Getter
@Setter
public class IncidentAction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "action_id")
    private Long id;

    @Column(name = "incident_id", nullable = false)
    private Long incidentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "incident_id", insertable = false, updatable = false)
    private Incident incident;

    @Column(name = "action_type", length = 30)
    private String actionType; // CREATED / ACK / RESOLVED / STATUS_CHANGED / MEMO_ADD ...

    @Column(name = "prev_status", length = 20)
    private String prevStatus;

    @Column(name = "next_status", length = 20)
    private String nextStatus;

    @Column(name = "acknowledged_at")
    private OffsetDateTime acknowledgedAt;

    @Column(name = "resolved_at")
    private OffsetDateTime resolvedAt;

    @Column(name = "actor_id")
    private Long actorId;

    @Column(name = "memo", columnDefinition = "text")
    private String memo;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;
}

