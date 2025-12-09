package com.example.geumjeongsan.domain.media;

import com.example.geumjeongsan.domain.cctv.CCTV;
import com.example.geumjeongsan.domain.incident.Incident;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "media_file")
@Getter
@Setter
public class MediaFile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "file_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "incident_id")
    private Incident incident;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cctv_id")
    private CCTV cctv;

    @Column(name = "file_type", length = 20)
    private String fileType; // THUMBNAIL, VIDEO, FRAME

    @Column(name = "url", columnDefinition = "text")
    private String url;

    @Column(name = "captured_at")
    private OffsetDateTime capturedAt;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;
}

