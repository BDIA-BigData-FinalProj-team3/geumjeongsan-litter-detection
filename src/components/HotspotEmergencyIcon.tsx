interface HotspotEmergencyIconProps {
  className?: string;
  style?: React.CSSProperties;
}

export default function HotspotEmergencyIcon({ className, style }: HotspotEmergencyIconProps) {
  return (
    <svg 
      version="1.1" 
      xmlns="http://www.w3.org/2000/svg" 
      xmlnsXlink="http://www.w3.org/1999/xlink" 
      x="0px" 
      y="0px"
      width="95.906px" 
      height="112.916px" 
      viewBox="18.035 54 95.906 112.916" 
      enableBackground="new 18.035 54 95.906 112.916"
      xmlSpace="preserve"
      className={className}
      style={style}
    >
      <g>
        <g>
          <path fill="#4C4C4C" d="M27.296,139.366c-8.25,0-11.625-5.846-7.5-12.99l38.692-67.018c4.125-7.145,10.875-7.145,15,0
            l38.692,67.018c4.125,7.145,0.75,12.99-7.5,12.99H27.296z"/>
          <polygon fill="#99332E" stroke="#FFC91D" strokeWidth="2" strokeMiterlimit="10" points="26.5,131.683 65.988,63.287 
            105.478,131.683 		"/>
          <polygon fillRule="evenodd" clipRule="evenodd" fill="#FFFFFF" points="79.5,103.055 70.423,103.055 70.423,93.977 
            61.555,93.977 61.555,103.055 52.477,103.055 52.477,111.922 61.555,111.922 61.555,121 70.423,121 70.423,111.922 79.5,111.922 
              "/>
        </g>
        <polygon fill="#4C4C4C" points="78.576,145.114 65.988,166.916 53.4,145.114 	"/>
      </g>
    </svg>
  );
}


