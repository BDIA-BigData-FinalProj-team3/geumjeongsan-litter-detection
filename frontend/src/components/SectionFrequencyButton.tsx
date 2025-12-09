interface SectionFrequencyButtonProps {
  isActive?: boolean;
  onClick?: () => void;
}

export default function SectionFrequencyButton({ isActive = false, onClick }: SectionFrequencyButtonProps) {
  const bgColor = isActive ? '#96ccc8' : '#F4F4F4';
  const strokeColor = '#B2B2B2'; // 테두리 색상은 항상 유지
  const textColor = isActive ? '#FFFFFF' : '#6D6E71';

  return (
    <button onClick={onClick} className="hover:opacity-90 transition-opacity">
      <svg width="94.951px" height="30px" viewBox="153.77 47.784 94.951 30">
        <g>
          <path fill={bgColor} d="M154.27,62.784c0,8.008,6.492,14.5,14.5,14.5h64.951c8.008,0,14.5-6.492,14.5-14.5s-6.492-14.5-14.5-14.5
            H168.77C160.762,48.284,154.27,54.776,154.27,62.784C154.27,62.784,154.27,54.776,154.27,62.784z"/>
          <path fill="none" stroke={strokeColor} strokeMiterlimit="10" d="M154.27,62.784c0,8.008,6.492,14.5,14.5,14.5h64.951
            c8.008,0,14.5-6.492,14.5-14.5s-6.492-14.5-14.5-14.5H168.77C160.762,48.284,154.27,54.776,154.27,62.784
            C154.27,62.784,154.27,54.776,154.27,62.784z"/>
        </g>
        <text 
          transform="matrix(1 0 0 1 172.4458 66.1768)" 
          fill={textColor} 
          fontFamily="'NanumSquare', sans-serif" 
          fontSize="12"
          fontWeight="500"
        >
          구간별 빈도
        </text>
      </svg>
    </button>
  );
}

