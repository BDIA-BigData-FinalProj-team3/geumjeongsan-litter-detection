interface ResetButtonProps {
  isActive?: boolean;
  onClick: () => void;
}

export default function ResetButton({ isActive = false, onClick }: ResetButtonProps) {
  const bgColor = isActive ? '#2b3990' : '#F4F4F4';
  const strokeColor = isActive ? '#2b3990' : '#B2B2B2';
  const textColor = isActive ? '#FFFFFF' : '#6D6E71';
  const iconColor = isActive ? '#FFFFFF' : '#6D6E71';

  return (
    <button onClick={onClick} className="hover:opacity-90 transition-opacity">
      <svg width="124.951px" height="30px" viewBox="13.062 -6.271 124.951 30">
        <g>
          <path fill={bgColor} d="M13.562,8.729c0,8.008,6.492,14.5,14.5,14.5h94.951c8.008,0,14.5-6.492,14.5-14.5s-6.492-14.5-14.5-14.5
            H28.062C20.054-5.771,13.562,0.722,13.562,8.729C13.562,8.729,13.562,0.722,13.562,8.729z"/>
          <path fill="none" stroke={strokeColor} strokeMiterlimit="10" d="M13.562,8.729c0,8.008,6.492,14.5,14.5,14.5h94.951
            c8.008,0,14.5-6.492,14.5-14.5s-6.492-14.5-14.5-14.5H28.062C20.054-5.771,13.562,0.722,13.562,8.729
            C13.562,8.729,13.562,0.722,13.562,8.729z"/>
        </g>
        <text 
          transform="matrix(1 0 0 1 48.1724 12.1211)" 
          fill={textColor} 
          fontFamily="'NanumSquare', sans-serif" 
          fontSize="12"
          fontWeight="500"
        >
          낙석 위험 지도
        </text>
        {/* 낙석 아이콘 (산 모양) - 텍스트 왼쪽에 배치, RiskMapButton의 경고 아이콘과 비슷한 위치 */}
        <g>
          <path fill={iconColor} d="M35,10 L32,4 L35,6 L38,4 L35,10 Z" />
        </g>
      </svg>
    </button>
  );
}

