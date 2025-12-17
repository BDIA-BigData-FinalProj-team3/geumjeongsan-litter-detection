package com.example.geumjeongsan.service;

import com.example.geumjeongsan.domain.cctv.CCTVRepository;
import com.example.geumjeongsan.domain.incident.IncidentRepository;
import com.example.geumjeongsan.domain.media.MediaFile;
import com.example.geumjeongsan.domain.media.MediaFileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class MediaFileService {
    
    private final MediaFileRepository mediaFileRepository;
    private final IncidentRepository incidentRepository;
    private final CCTVRepository cctvRepository;

    @Transactional
    public void saveFrame(Long incidentId, Long cctvId, String url, OffsetDateTime capturedAt) {
        try {
            MediaFile mf = new MediaFile();
            mf.setFileType("FRAME");
            mf.setUrl(url);
            mf.setCapturedAt(capturedAt);
            mf.setCreatedAt(OffsetDateTime.now());
            
            if (incidentId != null) {
                mf.setIncident(incidentRepository.findById(incidentId).orElse(null));
            }
            if (cctvId != null) {
                mf.setCctv(cctvRepository.findById(cctvId).orElse(null));
            }
            
            mediaFileRepository.save(mf);
            log.info("✅ [MediaFileService] Saved frame to DB: incidentId={}, cctvId={}, url={}", 
                    incidentId, cctvId, url);
        } catch (Exception e) {
            log.error("❌ [MediaFileService] Failed to save frame: {}", e.getMessage(), e);
            throw new RuntimeException("MediaFile 저장 실패: " + e.getMessage(), e);
        }
    }

    @Transactional
    public void saveVideo(Long incidentId, Long cctvId, String url, OffsetDateTime capturedAt) {
        try {
            MediaFile mf = new MediaFile();
            mf.setFileType("VIDEO");
            mf.setUrl(url);
            mf.setCapturedAt(capturedAt);
            mf.setCreatedAt(OffsetDateTime.now());

            if (incidentId != null) {
                mf.setIncident(incidentRepository.findById(incidentId).orElse(null));
            }
            if (cctvId != null) {
                mf.setCctv(cctvRepository.findById(cctvId).orElse(null));
            }

            mediaFileRepository.save(mf);
            log.info("✅ [MediaFileService] Saved video to DB: incidentId={}, cctvId={}, url={}",
                    incidentId, cctvId, url);
        } catch (Exception e) {
            log.error("❌ [MediaFileService] Failed to save video: {}", e.getMessage(), e);
            throw new RuntimeException("MediaFile 저장 실패: " + e.getMessage(), e);
        }
    }
}

