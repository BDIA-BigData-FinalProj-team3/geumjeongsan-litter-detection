import React from 'react';

const CCTVOnMarkerIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg 
    version="1.1" 
    id="Layer_1" 
    xmlns="http://www.w3.org/2000/svg" 
    xmlnsXlink="http://www.w3.org/1999/xlink" 
    x="0px" 
    y="0px"
    width="98px" 
    height="126px" 
    viewBox="95.975 -44.5 98 126" 
    enableBackground="new 95.975 -44.5 98 126" 
    xmlSpace="preserve"
    className={className}
    style={{ filter: 'drop-shadow(7px 7px 5px rgba(146, 146, 146, 0.75))', ...style }}
  >
    <g>
      <g>
        <g>
          <path 
            fillRule="evenodd" 
            clipRule="evenodd" 
            fill="#FFFFFF" 
            d="M171.339-2.979c0,18.357-33.241,61.787-33.241,61.787
              s-33.241-43.43-33.241-61.787c0-18.359,14.883-33.242,33.241-33.242S171.339-21.339,171.339-2.979z"
          />
        </g>
      </g>
      <circle fill="#5392BC" cx="138.098" cy="-3.245" r="27.72"/>
      <text 
        transform="matrix(1 0 0 1 124.0278 2.4097)" 
        fill="#FFFFFF" 
        fontFamily="'NanumSquareB'" 
        fontSize="20"
      >
        ON
      </text>
    </g>
  </svg>
);

export default CCTVOnMarkerIcon;

