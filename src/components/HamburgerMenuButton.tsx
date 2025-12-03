interface HamburgerMenuButtonProps {
  onClick: () => void;
}

export default function HamburgerMenuButton({ onClick }: HamburgerMenuButtonProps) {
  return (
    <button onClick={onClick} className="hover:opacity-90 transition-opacity">
      <svg width="33.484px" height="31.25px" viewBox="-348.046 -98.547 33.484 31.25">
        <path fill="#F4F4F4" stroke="#B2B2B2" strokeMiterlimit="10" d="M-315.061-72.797c0,2.761-2.238,5-5,5h-22.484
          c-2.762,0-5-2.239-5-5v-20.25c0-2.761,2.238-5,5-5h22.484c2.762,0,5,2.239,5,5V-72.797z"/>
        <g>
          <rect x="-341.938" y="-89.297" fill="#262262" width="21.27" height="2.5"/>
          <rect x="-341.938" y="-84.172" fill="#262262" width="21.27" height="2.5"/>
          <rect x="-341.938" y="-79.047" fill="#262262" width="21.27" height="2.5"/>
        </g>
      </svg>
    </button>
  );
}
