import sys
import os
import json
import argparse
import cv2
import numpy as np
import google.generativeai as genai
from PIL import Image
from dotenv import load_dotenv

# 한글 출력 인코딩 설정 (Windows 등 환경 호환)
sys.stdout.reconfigure(encoding='utf-8')

# .env 파일 로드
# 현재 스크립트 파일의 디렉토리 기준으로 .env 파일 로드
current_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(current_dir, '.env'))

# API 키 설정
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

def enhance_image(image_path):
    """
    OpenCV를 사용하여 이미지의 대비를 증가시키고 샤프닝을 적용합니다.
    (연기를 더 잘 보이게 하기 위함)
    """
    try:
        # OpenCV로 이미지 읽기
        # 한글 경로 지원을 위해 numpy로 읽어서 decode
        img_array = np.fromfile(image_path, np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        
        if img is None:
            return None
            
        # 1. 대비 증가 (Alpha: 대비, Beta: 밝기)
        # alpha 1.3이면 대비 30% 증가
        enhanced = cv2.convertScaleAbs(img, alpha=1.3, beta=20)
        
        # 2. BGR(OpenCV) -> RGB(PIL) 변환
        img_rgb = cv2.cvtColor(enhanced, cv2.COLOR_BGR2RGB)
        
        # PIL Image로 변환하여 반환
        return Image.fromarray(img_rgb)
    except Exception:
        return None

def analyze_fire_images(image_paths, wind_dir, wind_speed, humidity):
    """
    이미지 파일 경로들을 받아 Gemini로 산불 분석을 수행합니다.
    """
    if not GEMINI_API_KEY:
        return {"error": "GEMINI_API_KEY가 설정되지 않았습니다."}

    # Gemini 설정
    genai.configure(api_key=GEMINI_API_KEY)
    
    pil_images = []
    
    # 1. 이미지 파일 로드 및 전처리
    for path in image_paths:
        if not os.path.exists(path):
            return {"error": f"이미지 파일을 찾을 수 없습니다: {path}"}
        
        # OpenCV로 전처리해서 가져오기
        processed_img = enhance_image(path)
        
        if processed_img:
            pil_images.append(processed_img)
        else:
            # OpenCV 실패 시 그냥 PIL로 원본 로드 (Fallback)
            try:
                pil_images.append(Image.open(path))
            except Exception as e:
                return {"error": f"이미지 로드 실패 ({path}): {str(e)}"}

    # 2. 프롬프트 구성
    prompt = f"""🔥 산불 조기 감지 전문 프롬프트 (v2.4 - 보수적 화재 판정, 입김/안개 오탐지 방지)

[역할 정의]
당신은 인명과 자연을 보호하기 위해 최적화된 **'초정밀 산불 탐지 AI'**입니다. 
당신의 목표는 원거리의 산림에서 발생하는 실제 화재 연기를 감지하는 것입니다.
**특히 겨울철 촬영 시 발생하는 '입김(Human Breath)', '수증기', '렌즈 앞의 응결'을 실제 화재와 혼동하지 않는 것이 매우 중요합니다.**

[⚠️ 제외 대상 (화재가 아님 - False Positive 주의)]
다음 특징이 보이면 **절대로** 화재로 판별하지 마십시오:
1. **입김/호흡 (Human Breath)**:
   • 화면 하단이나 가장자리에서 불쑥 나타났다가 1~2초 내에 빠르게 사라지는 하얀 연기.
   • 카메라 렌즈 바로 앞에서 발생하여 초점이 맞지 않고 뿌옇게 보이는(Out of focus) 경우.
   • 일정한 리듬(호흡 주기)으로 나타났다 사라지기를 반복하는 경우.
2. **단순 수증기/안개**:
   • 움직임이 정체되어 있거나, 전체적으로 균일하게 깔린 경우.
   • 특정 발화점이 없이 화면 전체가 뿌연 경우.

[화재 연기의 핵심 특징 (True Positive)]
1. **지속적인 발생**: 연기가 사라지지 않고 특정 지점(산, 숲)에서 **계속해서 솟아오름**.
2. **원거리 초점**: 연기가 카메라 바로 앞이 아니라, **배경(풍경) 속에 존재함**.
3. **확산**: 시간이 지날수록 연기의 양이 늘어나거나 바람을 타고 멀리 이동함.

[분석 지침]
**중요**: 5초 간격으로 촬영된 4장의 연속 프레임이 제공됩니다. 프레임 간 비교를 통해:
• 입김처럼 빠르게 사라지는지, 아니면 지속적으로 발생하는지 확인
• 렌즈 앞의 일시적 현상인지, 배경 속 실제 연기인지 구분
• 연기의 이동, 형태 변화, 흐름을 반드시 분석

[현재 기상 조건]
- 풍향: {wind_dir}
- 풍속: {wind_speed} m/s
- 습도: {humidity}%

[화재 확산 위험도 평가 기준]
• **매우낮음**: 풍속 2 m/s 이하 + 습도 70% 이상
• **낮음**: 풍속 3 m/s 이하 + 습도 50% 이상
• **보통**: 풍속 2~5 m/s + 습도 30~60%
• **높음**: 풍속 5 m/s 이상 또는 습도 30% 이하
• **매우높음**: 풍속 8 m/s 이상

[출력 형식 (Output Format)]
분석 내용은 JSON 포맷으로만 출력하며, 모든 설명 값(Value)은 반드시 '한글'로 작성하십시오.
"""

    # 3. 모델 호출 및 설정
    response_schema = {
        "type": "object",
        "properties": {
            "analysis_result": {
                "type": "object",
                "properties": {
                    "is_fire_detected": {"type": "boolean", "description": "화재 감지 여부"},
                    "confidence_score": {"type": "number", "description": "신뢰도 점수 (0.0~1.0)"},
                    "detection_confidence_reason": {"type": "string", "description": "신뢰도 근거 설명"},
                    "risk_level": {"type": "string", "enum": ["심각", "경계", "주의", "안전"]},
                    "spread_direction": {"type": "string"},
                    "spread_risk_level": {"type": "string", "enum": ["매우높음", "높음", "보통", "낮음", "매우낮음"]},
                    "detected_features": {"type": "array", "items": {"type": "string"}},
                    "location_description": {"type": "string"},
                    "smoke_region": {"type": "string"},
                    "needs_detailed_inspection": {"type": "boolean"},
                    "message": {"type": "string"}
                },
                "required": ["is_fire_detected", "confidence_score", "risk_level", "message"]
            }
        },
        "required": ["analysis_result"]
    }

    generation_config = genai.types.GenerationConfig(
        response_mime_type="application/json",
        response_schema=response_schema
    )

    try:
        # 모델은 환경변수로 제어 (기본: gemini-2.5-flash)
        model = genai.GenerativeModel(GEMINI_MODEL)
        
        contents = [prompt]
        contents.extend(pil_images)

        response = model.generate_content(
            contents=contents,
            generation_config=generation_config
        )
        
        return json.loads(response.text)
        
    except Exception as e:
        return {"error": f"Gemini 분석 실패: {str(e)}"}

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Fire Detection CLI')
    parser.add_argument("images", nargs='+', help="이미지 파일 경로 리스트 (띄어쓰기로 구분)")
    parser.add_argument("--wind_dir", default="북풍", help="풍향")
    parser.add_argument("--wind_speed", type=float, default=2.0, help="풍속")
    parser.add_argument("--humidity", type=float, default=50.0, help="습도")
    parser.add_argument("--model", default=None, help="Gemini 모델명 (예: gemini-2.5-flash)")
    
    args = parser.parse_args()

    # CLI에서 모델을 주면 환경변수보다 우선 적용
    if args.model:
        os.environ["GEMINI_MODEL"] = args.model

    result = analyze_fire_images(
        image_paths=args.images,
        wind_dir=args.wind_dir,
        wind_speed=args.wind_speed,
        humidity=args.humidity
    )
    
    # [핵심] 결과 JSON만 표준 출력(stdout)으로 인쇄
    print(json.dumps(result, ensure_ascii=False, indent=2))

