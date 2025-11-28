package com.example.geumjeongsan.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MediaFileResponse {
    private Long fileId;
    private String url;              // S3/MinIO URL
    private String fileType;         // THUMBNAIL, VIDEO, FRAME
    private String capturedAt;       // 촬영 시각
    private Long incidentId;         // 관련 사건 ID (선택적)
}

