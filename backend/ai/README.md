# 산불 감지 AI 모듈

Gemini API와 OpenCV를 사용하여 5초 간격으로 촬영된 4장의 이미지를 분석하고 산불 여부를 판단하는 파이썬 모듈입니다.

## 1. 사전 준비 (Requirements)

이 서버에 **Python 3.x**가 설치되어 있어야 합니다.

## 2. 설치 (Installation)

`ai` 폴더 내부에서 다음 명령어로 필요한 라이브러리를 설치하세요.

```bash
pip install -r requirements.txt
```

## 3. 환경 변수 설정 (Configuration)

`ai` 폴더 내의 `.env` 파일에 Gemini API 키가 올바르게 설정되어 있는지 확인하세요.

```ini
GEMINI_API_KEY=your_api_key_here
```

## 4. 실행 방법 (Usage)

Node.js나 Java 백엔드에서 아래와 같은 명령어로 실행합니다. 결과는 **JSON 형식**으로 출력됩니다.

```bash
# 기본 실행 (이미지 4장 분석)
python fire_detector.py image1.jpg image2.jpg image3.jpg image4.jpg

# 기상 정보 포함 실행 (권장)
python fire_detector.py img1.jpg img2.jpg img3.jpg img4.jpg --wind_dir "북서풍" --wind_speed 3.5 --humidity 40.0
```

## 5. 출력 예시 (Output)

```json
{
  "analysis_result": {
    "is_fire_detected": true,
    "confidence_score": 0.92,
    "detection_confidence_reason": "프레임 간 연기의 이동 패턴이 명확함",
    "risk_level": "심각",
    ...
  }
}
```

## 6. 문제 해결

- `ModuleNotFoundError`: `pip install -r requirements.txt`를 실행했는지 확인하세요.
- `ImportError: libGL.so.1...`: 리눅스 서버의 경우 `sudo apt-get install ffmpeg libsm6 libxext6` 설치가 필요할 수 있습니다 (OpenCV 의존성).

