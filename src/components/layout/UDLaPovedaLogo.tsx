import React from 'react';

interface ClubLogoProps {
  className?: string;
}

export default function UDLaPovedaLogo({ className = "w-10 h-10" }: ClubLogoProps) {
  return (
    <div className={`${className} flex items-center justify-center`} id="club-generic-crest">
      <svg 
        viewBox="0 0 120 120" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full object-contain block"
      >
        <defs>
          <linearGradient id="shieldGrad" x1="60" y1="5" x2="60" y2="115" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <linearGradient id="goldGrad" x1="20" y1="10" x2="100" y2="110" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#ca8a04" />
          </linearGradient>
        </defs>

        {/* Outer Shield Border */}
        <path 
          d="M 60,8 C 94,8 108,24 108,46 C 108,82 60,112 60,112 C 60,112 12,82 12,46 C 12,24 26,8 60,8 Z" 
          fill="url(#goldGrad)" 
        />

        {/* Inner Shield Body */}
        <path 
          d="M 60,12 C 90,12 103,26 103,46 C 103,78 60,106 60,106 C 60,106 17,78 17,46 C 17,26 30,12 60,12 Z" 
          fill="url(#shieldGrad)" 
        />

        {/* Subtle split overlay */}
        <path 
          d="M 60,12 C 78,12 103,22 103,46 C 103,78 60,106 60,106 L 60,12 Z" 
          fill="rgba(255, 255, 255, 0.08)" 
        />

        {/* Diagonal Sash */}
        <path 
          d="M 24,32 L 96,82 L 92,90 L 20,40 Z" 
          fill="url(#goldGrad)" 
          opacity="0.3"
        />

        {/* Center Soccer Ball Graphic */}
        <g transform="translate(60, 50)">
          {/* Ball Outer Circle */}
          <circle cx="0" cy="0" r="17" fill="#ffffff" stroke="url(#goldGrad)" strokeWidth="1.5" />
          
          {/* Central Pentagon */}
          <polygon points="0,-6.5 6.2,-2 3.8,5.4 -3.8,5.4 -6.2,-2" fill="#0f172a" />
          
          {/* Radiating lines & outer pentagons */}
          <line x1="0" y1="-6.5" x2="0" y2="-17" stroke="#0f172a" strokeWidth="1.2" />
          <line x1="6.2" y1="-2" x2="15.5" y2="-5.2" stroke="#0f172a" strokeWidth="1.2" />
          <line x1="3.8" y1="5.4" x2="10.5" y2="13.2" stroke="#0f172a" strokeWidth="1.2" />
          <line x1="-3.8" y1="5.4" x2="-10.5" y2="13.2" stroke="#0f172a" strokeWidth="1.2" />
          <line x1="-6.2" y1="-2" x2="-15.5" y2="-5.2" stroke="#0f172a" strokeWidth="1.2" />
          
          <path d="M -5,-16 L 0,-17 L 5,-16 L 3.2,-12.8 L -3.2,-12.8 Z" fill="#0f172a" />
          <path d="M 13.5,-9.8 L 15.5,-5.2 L 16.5,-0.5 L 12.8,0.5 L 10.4,-4.2 Z" fill="#0f172a" />
          <path d="M 15.5,6.2 L 10.5,13.2 L 5.8,16 L 4.8,12.2 L 9,7.5 Z" fill="#0f172a" />
          <path d="M -5.8,16 L -10.5,13.2 L -15.5,6.2 L -9,7.5 L -4.8,12.2 Z" fill="#0f172a" />
          <path d="M -16.5,-0.5 L -15.5,-5.2 L -13.5,-9.8 L -10.4,-4.2 L -12.8,0.5 Z" fill="#0f172a" />
        </g>

        {/* Golden Banner at bottom reading "CLUB" */}
        <path 
          d="M 28,78 L 92,78 L 86,93 L 34,93 Z" 
          fill="url(#goldGrad)" 
          stroke="#ca8a04" 
          strokeWidth="0.8" 
        />
        <text 
          x="60" 
          y="89" 
          textAnchor="middle" 
          fill="#0f172a" 
          fontFamily="'Inter', 'Arial Black', sans-serif" 
          fontWeight="900" 
          fontSize="11" 
          letterSpacing="0.2em"
        >
          CLUB
        </text>

        {/* 3 Stars at top */}
        <polygon points="60,17 61.5,21 65.5,21 62.2,23.5 63.5,27.5 60,25 56.5,27.5 57.8,23.5 54.5,21 58.5,21" fill="url(#goldGrad)" />
        <polygon points="45,21 46.2,24.2 49.5,24.2 46.8,26.2 47.8,29.5 45,27.5 42.2,29.5 43.2,26.2 40.5,24.2 43.8,24.2" fill="url(#goldGrad)" />
        <polygon points="75,21 76.2,24.2 79.5,24.2 76.8,26.2 77.8,29.5 75,27.5 72.2,29.5 73.2,26.2 70.5,24.2 73.8,24.2" fill="url(#goldGrad)" />
      </svg>
    </div>
  );
}

export { UDLaPovedaLogo as ClubLogo };
