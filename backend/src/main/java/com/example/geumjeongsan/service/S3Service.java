package com.example.geumjeongsan.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.core.sync.ResponseTransformer;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.io.File;
import java.nio.file.Files;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
@Slf4j
public class S3Service {
    
    @Value("${aws.s3.bucket-name}")
    private String bucketName;
    
    @Value("${aws.region}")
    private String region;
    
    @Value("${aws.access-key-id:}")
    private String accessKeyId;
    
    @Value("${aws.secret-access-key:}")
    private String secretAccessKey;
    
    private S3Client s3Client;
    
    @PostConstruct
    public void init() {
        var builder = S3Client.builder()
                .region(Region.of(region));
        
        // 자격증명이 제공된 경우에만 명시적으로 설정
        if (accessKeyId != null && !accessKeyId.isEmpty() && 
            secretAccessKey != null && !secretAccessKey.isEmpty()) {
            AwsBasicCredentials credentials = AwsBasicCredentials.create(accessKeyId, secretAccessKey);
            builder.credentialsProvider(StaticCredentialsProvider.create(credentials));
            log.info("✅ [S3Service] Using explicit AWS credentials");
        } else {
            log.info("✅ [S3Service] Using default credential provider chain (IAM Role, etc.)");
        }
        
        this.s3Client = builder.build();
        log.info("✅ [S3Service] Initialized with bucket: {}, region: {}", bucketName, region);
    }
    
    @PreDestroy
    public void cleanup() {
        if (s3Client != null) {
            s3Client.close();
        }
    }
    
    /**
     * 이미지를 S3에 업로드
     * 
     * @param imageBytes 이미지 바이트 배열
     * @param cameraId 카메라 ID (예: "cctv-003")
     * @return S3 키 (예: "cctv/cctv-003/frames/cctv-003_frame_20251209T120000.jpg")
     */
    public String uploadFrame(byte[] imageBytes, String cameraId) {
        try {
            // S3 키 생성 (날짜 폴더 없이 frames/ 바로 아래에 저장)
            LocalDateTime now = LocalDateTime.now();
            String timeStr = now.format(DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss"));
            String s3Key = String.format("cctv/%s/frames/%s_frame_%s.jpg", 
                    cameraId, cameraId, timeStr);
            
            // S3에 업로드
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(s3Key)
                    .contentType("image/jpeg")
                    .build();
            
            s3Client.putObject(putObjectRequest, RequestBody.fromBytes(imageBytes));
            
            log.info("✅ [S3Service] Frame uploaded: {}", s3Key);
            return s3Key;
            
        } catch (Exception e) {
            log.error("❌ [S3Service] Failed to upload frame: {}", e.getMessage(), e);
            throw new RuntimeException("S3 업로드 실패: " + e.getMessage());
        }
    }

    /**
     * Overlay 이미지(바운딩 박스가 그려진 이미지)를 S3에 업로드
     * 
     * @param imageBytes 이미지 바이트 배열
     * @param cameraId 카메라 ID (예: "cctv-003")
     * @return S3 키 (예: "cctv/cctv-003/overlays/cctv-003_overlay_20251209T120000.jpg")
     */
    public String uploadOverlayFrame(byte[] imageBytes, String cameraId) {
        try {
            LocalDateTime now = LocalDateTime.now();
            String timeStr = now.format(DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss"));
            String s3Key = String.format("cctv/%s/overlays/%s_overlay_%s.jpg", cameraId, cameraId, timeStr);

            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(s3Key)
                    .contentType("image/jpeg")
                    .build();

            s3Client.putObject(putObjectRequest, RequestBody.fromBytes(imageBytes));
            
            log.info("✅ [S3Service] Overlay frame uploaded: {}", s3Key);
            return s3Key;
        } catch (Exception e) {
            log.error("❌ [S3Service] Failed to upload overlay frame: {}", e.getMessage(), e);
            throw new RuntimeException("S3 overlay 업로드 실패: " + e.getMessage());
        }
    }

    /**
     * S3 키를 HTTP URL로 변환
     * 
     * @param s3Key S3 키 (예: "cctv/cctv-003/overlays/cctv-003_overlay_20251209T120000.jpg")
     * @return HTTP URL (예: "https://bucket-name.s3.ap-northeast-2.amazonaws.com/cctv/cctv-003/overlays/...")
     */
    public String toHttpUrl(String s3Key) {
        return String.format("https://%s.s3.%s.amazonaws.com/%s", bucketName, region, s3Key);
    }

    /**
     * MP4 영상을 S3에 업로드
     *
     * @param videoBytes 영상 바이트 배열
     * @param cameraId 카메라 ID (예: "cctv-003")
     * @return S3 키 (예: "cctv/cctv-003/videos/cctv-003_clip_20251217T120000.mp4")
     */
    public String uploadVideo(byte[] videoBytes, String cameraId) {
        try {
            LocalDateTime now = LocalDateTime.now();
            String timeStr = now.format(DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss"));
            String s3Key = String.format("cctv/%s/videos/%s_clip_%s.mp4", cameraId, cameraId, timeStr);

            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(s3Key)
                    .contentType("video/mp4")
                    .build();

            s3Client.putObject(putObjectRequest, RequestBody.fromBytes(videoBytes));
            log.info("✅ [S3Service] Video uploaded: {}", s3Key);
            return s3Key;
        } catch (Exception e) {
            log.error("❌ [S3Service] Failed to upload video: {}", e.getMessage(), e);
            throw new RuntimeException("S3 video 업로드 실패: " + e.getMessage(), e);
        }
    }

    /**
     * S3 객체를 바이트 배열로 다운로드
     *
     * @param s3Key S3 키
     */
    public byte[] downloadBytes(String s3Key) {
        try {
            GetObjectRequest req = GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(s3Key)
                    .build();
            return s3Client.getObject(req, ResponseTransformer.toBytes()).asByteArray();
        } catch (Exception e) {
            log.error("❌ [S3Service] Failed to download object: {}", s3Key, e);
            throw new RuntimeException("S3 다운로드 실패: " + e.getMessage(), e);
        }
    }

    /**
     * S3 객체를 임시 파일로 다운로드
     *
     * @param s3Key S3 키
     * @param suffix 파일 확장자 (예: ".mp4", ".jpg")
     */
    public File downloadToTempFile(String s3Key, String suffix) {
        try {
            if (suffix == null || suffix.isBlank()) suffix = ".bin";
            byte[] bytes = downloadBytes(s3Key);
            File tmp = File.createTempFile("s3-", suffix);
            Files.write(tmp.toPath(), bytes);
            return tmp;
        } catch (Exception e) {
            log.error("❌ [S3Service] Failed to downloadToTempFile: {}", s3Key, e);
            throw new RuntimeException("S3 임시파일 다운로드 실패: " + e.getMessage(), e);
        }
    }
}

