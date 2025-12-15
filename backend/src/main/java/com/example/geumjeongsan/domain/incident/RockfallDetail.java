package com.example.geumjeongsan.domain.incident;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "rockfall_detail")
@Getter
@Setter
public class RockfallDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "rockfall_detail_id")
    private Long rockfallDetailId;

    @Column(name = "incident_id", nullable = false, unique = true)
    private Long incidentId;

    // 연관관계는 조회 편의용 (insert/update는 incidentId가 담당)
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "incident_id", referencedColumnName = "incident_id", insertable = false, updatable = false)
    private Incident incident;

    @Column(name = "rock_size_class", length = 20, nullable = false)
    private String rockSizeClass;

    @Column(name = "damage_description", columnDefinition = "text")
    private String damageDescription;

    @Column(name = "affected_asset_type", length = 30, nullable = false)
    private String affectedAssetType;

    @Column(name = "affected_asset_name", length = 200)
    private String affectedAssetName;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}

