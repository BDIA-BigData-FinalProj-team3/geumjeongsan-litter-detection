package com.example.geumjeongsan.domain.incident;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "trash_detail")
@Getter
@Setter
public class TrashDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "trash_id")
    private Long id;

    @Column(name = "incident_id", unique = true)
    private Long incidentId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "incident_id", insertable = false, updatable = false)
    private Incident incident;

    @Column(name = "main_category", length = 50)
    private String mainCategory;

    @Column(name = "note", columnDefinition = "text")
    private String note;

    @Column(name = "object_amount", columnDefinition = "text")
    private String objectAmount;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;
}
