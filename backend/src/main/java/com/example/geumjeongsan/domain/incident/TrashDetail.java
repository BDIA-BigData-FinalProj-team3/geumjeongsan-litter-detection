package com.example.geumjeongsan.domain.incident;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "trash_detail")
@Getter
@Setter
public class TrashDetail {

    @Id
    @Column(name = "incident_id")
    private Long incidentId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "incident_id")
    private Incident incident;

    @Column(name = "main_category", length = 50)
    private String mainCategory;  // plastic, vinyl, paper, metal, glass, food, etc.

    @Column(name = "object_count")
    private Integer objectCount;

    @Column(name = "note", columnDefinition = "text")
    private String note;
}

