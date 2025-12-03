import React from 'react';

const CCTVOffMarkerIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg 
    version="1.1" 
    id="Layer_1" 
    xmlns="http://www.w3.org/2000/svg" 
    xmlnsXlink="http://www.w3.org/1999/xlink" 
    x="0px" 
    y="0px"
    width="98px" 
    height="126px" 
    viewBox="103.102 -6.75 98 126" 
    enableBackground="new 103.102 -6.75 98 126" 
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
            d="M178.216,34.521c0,18.357-33.241,61.787-33.241,61.787
              s-33.241-43.43-33.241-61.787c0-18.359,14.883-33.242,33.241-33.242S178.216,16.161,178.216,34.521z"
          />
        </g>
      </g>
      <circle fill="#545454" cx="144.975" cy="34.255" r="27.72"/>
      <text 
        transform="matrix(1 0 0 1 126.5552 39.9102)" 
        fill="#FFFFFF" 
        fontFamily="'NanumSquareB'" 
        fontSize="20"
      >
        OFF
      </text>
    </g>
  </svg>
);

export default CCTVOffMarkerIcon;

