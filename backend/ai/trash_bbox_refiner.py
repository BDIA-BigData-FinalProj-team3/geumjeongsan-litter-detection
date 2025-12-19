import argparse
import json
import os
import sys

import numpy as np

# OpenCV는 requirements.txt에 있으나, 환경에 없을 수도 있어 import 에러는 그대로 내보내게 둠(자바에서 fallback)
import cv2  # type: ignore


def _read_image(path: str):
    # 한글 경로 대응: numpy로 읽어서 imdecode
    arr = np.fromfile(path, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    return img


def _clamp(v, lo, hi):
    return max(lo, min(hi, v))


def _safe_float(v, default=0.0):
    try:
        if v is None:
            return default
        if isinstance(v, (int, float)):
            return float(v)
        return float(str(v))
    except Exception:
        return default


def _refine_one(img, det, pad_ratio=0.15):
    """
    det: {label, score, bbox:{x,y,w,h}} where x,y,w,h normalized (0..1)
    returns updated det (bbox refined) or original if refinement fails.
    """
    H, W = img.shape[:2]
    bbox = det.get("bbox") if isinstance(det, dict) else None
    if not isinstance(bbox, dict):
        return det

    x = _safe_float(bbox.get("x"), 0.0)
    y = _safe_float(bbox.get("y"), 0.0)
    w = _safe_float(bbox.get("w"), 0.0)
    h = _safe_float(bbox.get("h"), 0.0)

    # clamp normalized
    x = _clamp(x, 0.0, 1.0)
    y = _clamp(y, 0.0, 1.0)
    w = _clamp(w, 0.0, 1.0)
    h = _clamp(h, 0.0, 1.0)
    if w <= 0.0 or h <= 0.0:
        return det

    # to pixels
    px = int(round(x * W))
    py = int(round(y * H))
    pw = int(round(w * W))
    ph = int(round(h * H))

    # ensure sane
    px = _clamp(px, 0, W - 1)
    py = _clamp(py, 0, H - 1)
    pw = _clamp(pw, 1, W - px)
    ph = _clamp(ph, 1, H - py)

    # pad ROI
    pad_x = int(round(pw * pad_ratio))
    pad_y = int(round(ph * pad_ratio))
    x0 = _clamp(px - pad_x, 0, W - 1)
    y0 = _clamp(py - pad_y, 0, H - 1)
    x1 = _clamp(px + pw + pad_x, 1, W)
    y1 = _clamp(py + ph + pad_y, 1, H)
    if x1 <= x0 + 2 or y1 <= y0 + 2:
        return det

    roi = img[y0:y1, x0:x1]
    rh, rw = roi.shape[:2]

    # GrabCut refinement
    try:
        mask = np.zeros((rh, rw), np.uint8)
        bgdModel = np.zeros((1, 65), np.float64)
        fgdModel = np.zeros((1, 65), np.float64)

        # rect inside ROI (avoid border)
        rect = (1, 1, max(1, rw - 2), max(1, rh - 2))
        cv2.grabCut(roi, mask, rect, bgdModel, fgdModel, 3, cv2.GC_INIT_WITH_RECT)

        # foreground mask
        fg = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 1, 0).astype("uint8")
        if fg.sum() < 30:
            return det

        contours, _ = cv2.findContours(fg, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            return det

        # largest contour
        c = max(contours, key=cv2.contourArea)
        if cv2.contourArea(c) < 30:
            return det
        rx, ry, rw2, rh2 = cv2.boundingRect(c)

        # map back to original
        new_px = x0 + rx
        new_py = y0 + ry
        new_pw = rw2
        new_ph = rh2

        # normalize
        nx = _clamp(new_px / W, 0.0, 1.0)
        ny = _clamp(new_py / H, 0.0, 1.0)
        nw = _clamp(new_pw / W, 0.0, 1.0)
        nh = _clamp(new_ph / H, 0.0, 1.0)

        # ignore insane boxes
        if nw <= 0.0 or nh <= 0.0:
            return det
        if nw > 0.95 or nh > 0.95:
            return det

        det2 = dict(det)
        det2["bbox"] = {"x": nx, "y": ny, "w": nw, "h": nh}
        return det2
    except Exception:
        return det


def main():
    parser = argparse.ArgumentParser(description="Refine TRASH bboxes with OpenCV GrabCut")
    parser.add_argument("--image", required=True, help="input image path")
    parser.add_argument("--detections", required=True, help="detections json file path (list)")
    args = parser.parse_args()

    if not os.path.exists(args.image):
        print(json.dumps({"error": "image not found", "detections": []}, ensure_ascii=False))
        return 1
    if not os.path.exists(args.detections):
        print(json.dumps({"error": "detections not found", "detections": []}, ensure_ascii=False))
        return 1

    img = _read_image(args.image)
    if img is None:
        print(json.dumps({"error": "failed to read image", "detections": []}, ensure_ascii=False))
        return 1

    with open(args.detections, "r", encoding="utf-8") as f:
        dets = json.load(f)
    if not isinstance(dets, list):
        dets = []

    refined = []
    for d in dets:
        if isinstance(d, dict):
            refined.append(_refine_one(img, d))

    # stdout: json only
    print(json.dumps({"detections": refined}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


