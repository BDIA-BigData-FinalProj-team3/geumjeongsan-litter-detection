import React from 'react';

const EmergencyMarkerIcon = ({ className }: { className?: string }) => (
  <svg 
    version="1.1" 
    id="Layer_1" 
    xmlns="http://www.w3.org/2000/svg" 
    xmlnsXlink="http://www.w3.org/1999/xlink" 
    x="0px" 
    y="0px"
    width="97px" 
    height="126px" 
    viewBox="86.725 -31.25 97 126" 
    enableBackground="new 86.725 -31.25 97 126" 
    xmlSpace="preserve"
    className={className}
    style={{ filter: 'drop-shadow(7px 7px 5px rgba(146, 146, 146, 0.75))' }}
  >
    <g>
      <g>
        <g>
          <path 
            fillRule="evenodd" 
            clipRule="evenodd" 
            fill="#FFFFFF" 
            d="M161.375,10.389c0,18.358-33.241,61.788-33.241,61.788
              s-33.241-43.43-33.241-61.788s14.883-33.241,33.241-33.241S161.375-7.97,161.375,10.389z"
          />
        </g>
      </g>
      <circle fill="#99332E" cx="128.134" cy="10.124" r="27.72"/>
      <polygon 
        fillRule="evenodd" 
        clipRule="evenodd" 
        fill="#FFFFFF" 
        points="142.863,5.29 132.968,5.29 132.968,-4.604 
          123.301,-4.604 123.301,5.29 113.406,5.29 113.406,14.956 123.301,14.956 123.301,24.853 132.968,24.853 132.968,14.956 
          142.863,14.956"
      />
    </g>
  </svg>
);

export default EmergencyMarkerIcon;




