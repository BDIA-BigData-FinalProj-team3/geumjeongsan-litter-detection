import { useNavigate } from 'react-router-dom';

interface RiskMapButtonProps {
  isActive?: boolean;
  onClick?: () => void;
}

export default function RiskMapButton({ isActive = false, onClick }: RiskMapButtonProps) {
  const bgColor = isActive ? '#ef4444' : '#F4F4F4';  // 빨간색 계열로 변경
  const strokeColor = '#B2B2B2';
  const textColor = isActive ? '#FFFFFF' : '#6D6E71';
  const iconColor = isActive ? '#FFFFFF' : '#6D6E71';

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <button onClick={handleClick} className="hover:opacity-90 transition-opacity">
      <svg width="94.951px" height="30px" viewBox="13.062 -6.271 94.951 30">
        <g>
          <path fill={bgColor} d="M13.562,8.729c0,8.008,6.492,14.5,14.5,14.5h64.951c8.008,0,14.5-6.492,14.5-14.5s-6.492-14.5-14.5-14.5
            H28.062C20.054-5.771,13.562,0.722,13.562,8.729C13.562,8.729,13.562,0.722,13.562,8.729z"/>
          <path fill="none" stroke={strokeColor} strokeMiterlimit="10" d="M13.562,8.729c0,8.008,6.492,14.5,14.5,14.5h64.951
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
          위험지도
        </text>
        {/* 위험 아이콘 (삼각형 경고) */}
        <g>
          <path fillRule="evenodd" clipRule="evenodd" fill={iconColor} d="M35,3l-6,10h12L35,3z M34,9h2v2h-2V9z M34,7h2v1h-2V7z"/>
        </g>
      </svg>
    </button>
  );
}

