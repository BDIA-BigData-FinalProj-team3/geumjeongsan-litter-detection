import React from 'react';

interface CulturalButtonProps {
  isActive: boolean;
  onClick: () => void;
}

export default function CulturalButton({ isActive, onClick }: CulturalButtonProps) {
  const bgColor = isActive ? '#2b3990' : '#F4F4F4';
  const strokeColor = isActive ? '#2b3990' : '#B2B2B2';
  const textColor = isActive ? '#FFFFFF' : '#6D6E71';

  // 원본 ResetButton 너비: 124.951px, 내부 h: 94.951
  // 문화재 버튼 너비: 약 75px로 조정 (50px 줄임)
  // 내부 h: 44.951 (94.951 - 50)
  
  return (
    <button onClick={onClick} className="hover:opacity-90 transition-opacity">
      <svg width="74.951px" height="30px" viewBox="13.062 -6.271 74.951 30">
        <g>
          {/* 배경 Path: h94.951 -> h44.951 로 수정 */}
          <path fill={bgColor} d="M13.562,8.729c0,8.008,6.492,14.5,14.5,14.5h44.951c8.008,0,14.5-6.492,14.5-14.5s-6.492-14.5-14.5-14.5
            H28.062C20.054-5.771,13.562,0.722,13.562,8.729C13.562,8.729,13.562,0.722,13.562,8.729z"/>
          {/* 테두리 Path: h94.951 -> h44.951 로 수정 */}
          <path fill="none" stroke={strokeColor} strokeMiterlimit="10" d="M13.562,8.729c0,8.008,6.492,14.5,14.5,14.5h44.951
            c8.008,0,14.5-6.492,14.5-14.5s-6.492-14.5-14.5-14.5H28.062C20.054-5.771,13.562,0.722,13.562,8.729
            C13.562,8.729,13.562,0.722,13.562,8.729z"/>
        </g>
        {/* 텍스트: 위치(transform) 조정 필요. 원본 x: 48.1724 -> 약 23만큼 왼쪽으로 이동? 
            원본 중심부에서 글자수 차이만큼 이동. 
            width 125 -> 75 (50감소). 중심점 25이동.
            텍스트 "문화재"는 3글자. 
            x좌표를 35 정도로 맞춰봄. */}
        <text 
          transform="matrix(1 0 0 1 33 12.1211)" 
          fill={textColor} 
          fontFamily="'NanumSquare', sans-serif" 
          fontSize="12"
          fontWeight="500"
        >
          문화재
        </text>
      </svg>
    </button>
  );
}

