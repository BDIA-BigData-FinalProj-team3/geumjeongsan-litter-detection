package com.example.geumjeongsan.service;

import org.bytedeco.javacv.*;
import org.bytedeco.javacv.Frame;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.*;
import java.net.URL;
import java.nio.file.Files;
import java.util.*;

@Service
@Slf4j
public class VideoFrameExtractor {
    
    /**
     * URL에서 영상 다운로드 → 임시 파일로 저장
     * 
     * @param videoUrl 영상 URL
     * @return 임시 파일
     */
    public File downloadVideoToTemp(String videoUrl) throws Exception {
        log.info("📥 [VideoExtractor] Downloading video from: {}", videoUrl);
        
        File tempFile = File.createTempFile("cctv-video-", ".mp4");
        tempFile.deleteOnExit();
        
        try (InputStream in = new URL(videoUrl).openStream()) {
            Files.copy(in, tempFile.toPath(), java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        }
        
        long fileSizeKB = tempFile.length() / 1024;
        log.info("✅ [VideoExtractor] Video downloaded: {} ({} KB)", 
                 tempFile.getName(), fileSizeKB);
        
        if (fileSizeKB == 0) {
            throw new RuntimeException("다운로드된 영상 파일이 비어있습니다.");
        }
        
        return tempFile;
    }
    
    /**
     * 영상에서 일정 간격으로 프레임 추출
     * 
     * @param videoFile 비디오 파일
     * @param intervalSeconds 프레임 추출 간격 (초)
     * @param maxFrames 최대 추출 프레임 수
     * @return JPEG 바이트 배열 리스트
     */
    public List<byte[]> extractFrames(File videoFile, int intervalSeconds, int maxFrames) 
            throws Exception {
        
        log.info("🎬 [VideoExtractor] Extracting frames: interval={}s, max={}", 
                 intervalSeconds, maxFrames);
        
        List<byte[]> frames = new ArrayList<>();
        FFmpegFrameGrabber grabber = null;
        Java2DFrameConverter converter = null;
        
        try {
            grabber = new FFmpegFrameGrabber(videoFile);
            grabber.start();
            
            long videoLengthMicros = grabber.getLengthInTime();
            int videoLengthSeconds = (int) (videoLengthMicros / 1_000_000);
            double fps = grabber.getFrameRate();
            
            log.info("📹 [VideoExtractor] Video info: length={}s, fps={}", 
                     videoLengthSeconds, fps);
            
            if (videoLengthSeconds <= 0) {
                throw new RuntimeException("영상 길이를 확인할 수 없습니다.");
            }
            
            converter = new Java2DFrameConverter();
            
            // intervalSeconds마다 프레임 추출
            for (int i = 0; i < maxFrames; i++) {
                int targetSecond = i * intervalSeconds;
                
                if (targetSecond >= videoLengthSeconds) {
                    log.info("⏹️ [VideoExtractor] Reached end of video at {}s", targetSecond);
                    break;
                }
                
                // 특정 시간으로 이동 (마이크로초)
                grabber.setTimestamp(targetSecond * 1_000_000L);
                
                Frame frame = grabber.grabImage();
                if (frame == null) {
                    log.warn("⚠️ [VideoExtractor] Failed to grab frame at {}s", targetSecond);
                    continue;
                }
                
                // Frame → BufferedImage → JPEG bytes
                BufferedImage bufferedImage = converter.convert(frame);
                if (bufferedImage == null) {
                    log.warn("⚠️ [VideoExtractor] Failed to convert frame at {}s", targetSecond);
                    continue;
                }
                
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                ImageIO.write(bufferedImage, "jpg", baos);
                byte[] jpegBytes = baos.toByteArray();
                
                frames.add(jpegBytes);
                log.info("✅ [VideoExtractor] Frame {}: {}s ({} KB)", 
                         i + 1, targetSecond, jpegBytes.length / 1024);
            }
            
        } finally {
            if (converter != null) {
                try {
                    converter.close();
                } catch (Exception e) {
                    log.warn("⚠️ [VideoExtractor] Failed to close converter: {}", e.getMessage());
                }
            }
            if (grabber != null) {
                try {
                    grabber.stop();
                    grabber.release();
                } catch (Exception e) {
                    log.warn("⚠️ [VideoExtractor] Failed to release grabber: {}", e.getMessage());
                }
            }
        }
        
        log.info("🎬 [VideoExtractor] Extraction complete: {} frames", frames.size());
        
        if (frames.isEmpty()) {
            throw new RuntimeException("영상에서 프레임을 추출할 수 없습니다.");
        }
        
        return frames;
    }
}

