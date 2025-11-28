package com.example.geumjeongsan.domain.media;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MediaFileRepository extends JpaRepository<MediaFile, Long> {
    List<MediaFile> findByIncidentId(Long incidentId);
    List<MediaFile> findByCctvId(Long cctvId);
    List<MediaFile> findByIncidentIdAndFileType(Long incidentId, String fileType);
    List<MediaFile> findByCctvIdAndFileType(Long cctvId, String fileType);
}

