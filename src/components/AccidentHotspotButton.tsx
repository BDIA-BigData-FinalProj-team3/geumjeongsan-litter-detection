interface AccidentHotspotButtonProps {
  isActive?: boolean;
  onClick?: () => void;
}

export default function AccidentHotspotButton({ isActive = false, onClick }: AccidentHotspotButtonProps) {
  const bgColor = isActive ? '#96ccc8' : '#F4F4F4';
  const strokeColor = '#B2B2B2'; // 테두리 색상은 항상 유지
  const textColor = isActive ? '#FFFFFF' : '#6D6E71';

  return (
    <button onClick={onClick} className="hover:opacity-90 transition-opacity">
      <svg width="94.95px" height="30px" viewBox="-32.084 -27.243 94.95 30">
        <g>
          <path fill={bgColor} d="M-31.584-12.243c0,8.008,6.492,14.5,14.5,14.5h64.95c8.008,0,14.5-6.492,14.5-14.5s-6.491-14.5-14.5-14.5
            h-64.95C-25.092-26.743-31.584-20.251-31.584-12.243C-31.584-12.243-31.584-20.251-31.584-12.243z"/>
          <path fill="none" stroke={strokeColor} strokeMiterlimit="10" d="M-31.584-12.243c0,8.008,6.492,14.5,14.5,14.5h64.95
            c8.008,0,14.5-6.492,14.5-14.5s-6.491-14.5-14.5-14.5h-64.95C-25.092-26.743-31.584-20.251-31.584-12.243
            C-31.584-12.243-31.584-20.251-31.584-12.243z"/>
        </g>
        <text 
          transform="matrix(1 0 0 1 -17.3682 -8.8506)" 
          fill={textColor} 
          fontFamily="'NanumSquare', sans-serif" 
          fontSize="12"
          fontWeight="500"
        >
          사고다발구간
        </text>
      </svg>
    </button>
  );
}

