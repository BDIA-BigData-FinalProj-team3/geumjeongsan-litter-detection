package com.example.geumjeongsan.service;

import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.Map;

@Service
public class ImageOverlayService {

    public byte[] drawOverlayJpeg(byte[] inputImageBytes, List<Map<String, Object>> detections) {
        try {
            BufferedImage img = ImageIO.read(new ByteArrayInputStream(inputImageBytes));
            if (img == null) throw new IllegalArgumentException("Unsupported image format");

            int W = img.getWidth();
            int H = img.getHeight();

            Graphics2D g = img.createGraphics();
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g.setStroke(new BasicStroke(3f));
            g.setFont(new Font("SansSerif", Font.BOLD, 18));

            for (Map<String, Object> det : detections) {
                if (det == null) continue;

                String label = det.get("label") != null ? det.get("label").toString() : "obj";
                double score = toDouble(det.get("score"), 0.0);

                @SuppressWarnings("unchecked")
                Map<String, Object> bbox = (Map<String, Object>) det.get("bbox");
                if (bbox == null) continue;

                double x = clamp01(toDouble(bbox.get("x"), 0.0));
                double y = clamp01(toDouble(bbox.get("y"), 0.0));
                double w = clamp01(toDouble(bbox.get("w"), 0.0));
                double h = clamp01(toDouble(bbox.get("h"), 0.0));

                int px = (int) Math.round(x * W);
                int py = (int) Math.round(y * H);
                int pw = (int) Math.round(w * W);
                int ph = (int) Math.round(h * H);

                // 최소/경계 보정
                px = clamp(px, 0, W - 1);
                py = clamp(py, 0, H - 1);
                pw = clamp(pw, 1, W - px);
                ph = clamp(ph, 1, H - py);

                // 색상(라벨별)
                Color c = label.contains("fire") ? new Color(255, 80, 80) :
                          label.contains("smoke") ? new Color(180, 180, 180) :
                          new Color(16, 185, 129);
                g.setColor(c);
                g.drawRect(px, py, pw, ph);

                String text = String.format("%s %.0f%%", label, score * 100.0);
                int textW = g.getFontMetrics().stringWidth(text);
                int textH = g.getFontMetrics().getHeight();

                // 라벨 배경
                g.setColor(new Color(0, 0, 0, 140));
                g.fillRect(px, Math.max(0, py - textH), textW + 10, textH);

                // 라벨 글자
                g.setColor(Color.WHITE);
                g.drawString(text, px + 5, Math.max(15, py - 6));
            }

            g.dispose();

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(img, "jpg", baos);
            return baos.toByteArray();

        } catch (Exception e) {
            throw new RuntimeException("Failed to draw overlay: " + e.getMessage(), e);
        }
    }

    private double clamp01(double v) {
        return Math.max(0.0, Math.min(1.0, v));
    }

    private int clamp(int v, int min, int max) {
        return Math.max(min, Math.min(max, v));
    }

    private double toDouble(Object v, double def) {
        if (v == null) return def;
        if (v instanceof Number n) return n.doubleValue();
        try {
            return Double.parseDouble(v.toString());
        } catch (Exception e) {
            return def;
        }
    }
}

