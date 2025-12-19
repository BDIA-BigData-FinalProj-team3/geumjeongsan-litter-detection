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

                // 좌표 추출 (픽셀/정규화 자동 감지)
                double x = toDouble(bbox.get("x"), 0.0);
                double y = toDouble(bbox.get("y"), 0.0);
                double w = toDouble(bbox.get("w"), 0.0);
                double h = toDouble(bbox.get("h"), 0.0);

                // 픽셀 좌표인지 정규화 좌표인지 자동 판단
                boolean isPixelCoord = (x > 1.0 || y > 1.0 || w > 1.0 || h > 1.0);
                
                // 🔧 일부 모델이 (x,y,w,h) 대신 (x1,y1,x2,y2)를 w/h 자리에 넣는 경우가 있어 보정
                // - normalized: x+w > 1.0 이면 w를 x2로 보고 (w-x)로 변환
                // - pixel: x+w > W 이면 w를 x2로 보고 (w-x)로 변환
                if (!isPixelCoord) {
                    if (w <= 1.0 && x <= 1.0 && (x + w) > 1.01 && w > x) {
                        w = w - x;
                    }
                    if (h <= 1.0 && y <= 1.0 && (y + h) > 1.01 && h > y) {
                        h = h - y;
                    }
                } else {
                    if ((x + w) > (W + 1) && w > x) {
                        w = w - x;
                    }
                    if ((y + h) > (H + 1) && h > y) {
                        h = h - y;
                    }
                }

                if (isPixelCoord) {
                    // 픽셀 → 정규화 변환
                    x = clampDouble(x / W, 0.0, 1.0);
                    y = clampDouble(y / H, 0.0, 1.0);
                    w = clampDouble(w / W, 0.0, 1.0);
                    h = clampDouble(h / H, 0.0, 1.0);
                    System.out.println("📐 [Overlay] Converted pixel coords to normalized: x=" + x + ", y=" + y + ", w=" + w + ", h=" + h);
                } else {
                    // 이미 정규화된 좌표, 0~1 범위로 제한
                    x = clamp01(x);
                    y = clamp01(y);
                    w = clamp01(w);
                    h = clamp01(h);
                }

                // ✅ 일부 모델은 bbox를 center(cx,cy,w,h)로 주는 경우가 있어 오프셋이 생김.
                // - TRASH/FIRE/SMOKE 라벨은 center 기반 케이스가 자주 발생 → 좌상단(top-left)으로 변환
                if (label != null) {
                    String ll = label.toLowerCase();
                    if ((ll.contains("trash") || ll.contains("fire") || ll.contains("smoke")) && w > 0.0 && h > 0.0) {
                        x = clamp01(x - (w / 2.0));
                        y = clamp01(y - (h / 2.0));
                    }
                }

                // 정규화 좌표 → 픽셀 변환
                int px = (int) Math.round(x * W);
                int py = (int) Math.round(y * H);
                int pw = (int) Math.round(w * W);
                int ph = (int) Math.round(h * H);
                
                System.out.println("🎨 [Overlay] Drawing bbox: px=" + px + ", py=" + py + ", pw=" + pw + ", ph=" + ph + " (Image: " + W + "x" + H + ", label=" + label + ")");

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

    private double clampDouble(double v, double min, double max) {
        return Math.max(min, Math.min(max, v));
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

