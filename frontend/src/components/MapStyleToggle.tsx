interface MapStyleToggleProps {
  currentStyle: 'normal' | 'satellite';
  onToggle: (style: 'normal' | 'satellite') => void;
}

export default function MapStyleToggle({ currentStyle, onToggle }: MapStyleToggleProps) {
  const normalBgColor = currentStyle === 'normal' ? '#2b3990' : '#F4F4F4';
  const normalStrokeColor = currentStyle === 'normal' ? '#2b3990' : '#B2B2B2';
  const normalTextColor = currentStyle === 'normal' ? '#FFFFFF' : '#6D6E71';
  
  const satelliteBgColor = currentStyle === 'satellite' ? '#2b3990' : '#F4F4F4';
  const satelliteStrokeColor = currentStyle === 'satellite' ? '#2b3990' : '#B2B2B2';
  const satelliteTextColor = currentStyle === 'satellite' ? '#FFFFFF' : '#6D6E71';

  return (
    <div className="relative" style={{ width: '120px', height: '30px' }}>
      <svg width="120" height="30" viewBox="0 0 120 30" style={{ display: 'block' }}>
        {/* 일반 버튼 영역 - 왼쪽 둥근 모서리 */}
        <path 
          fill={normalBgColor} 
          d="M 14.5 0.5 C 6.492 0.5 0 6.992 0 15 C 0 23.008 6.492 29.5 14.5 29.5 L 60 29.5 L 60 0.5 Z"
        />
        <path 
          fill="none" 
          stroke={normalStrokeColor} 
          strokeMiterlimit="10" 
          strokeWidth="1"
          d="M 14.5 0.5 C 6.492 0.5 0 6.992 0 15 C 0 23.008 6.492 29.5 14.5 29.5 L 60 29.5"
        />
        <text 
          x="30" 
          y="19" 
          textAnchor="middle"
          fill={normalTextColor} 
          fontFamily="'NanumSquare', sans-serif" 
          fontSize="12"
          fontWeight="500"
        >
          일반
        </text>
        
        {/* 위성 버튼 영역 - 오른쪽 둥근 모서리 */}
        <path 
          fill={satelliteBgColor} 
          d="M 60 0.5 L 105.5 0.5 C 113.508 0.5 120 6.992 120 15 C 120 23.008 113.508 29.5 105.5 29.5 L 60 29.5 Z"
        />
        <path 
          fill="none" 
          stroke={satelliteStrokeColor} 
          strokeMiterlimit="10" 
          strokeWidth="1"
          d="M 60 0.5 L 105.5 0.5 C 113.508 0.5 120 6.992 120 15 C 120 23.008 113.508 29.5 105.5 29.5 L 60 29.5"
        />
        <text 
          x="90" 
          y="19" 
          textAnchor="middle"
          fill={satelliteTextColor} 
          fontFamily="'NanumSquare', sans-serif" 
          fontSize="12"
          fontWeight="500"
        >
          위성
        </text>
      </svg>
      
      {/* 클릭 가능한 영역 */}
      <button
        onClick={() => onToggle('normal')}
        className="absolute left-0 top-0 hover:opacity-90 transition-opacity"
        style={{ 
          width: '60px', 
          height: '30px', 
          padding: 0, 
          border: 'none', 
          background: 'transparent',
          cursor: 'pointer'
        }}
      />
      <button
        onClick={() => onToggle('satellite')}
        className="absolute right-0 top-0 hover:opacity-90 transition-opacity"
        style={{ 
          width: '60px', 
          height: '30px', 
          padding: 0, 
          border: 'none', 
          background: 'transparent',
          cursor: 'pointer'
        }}
      />
    </div>
  );
}
