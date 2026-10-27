import React, { useState } from 'react';

interface ClubLogoProps {
  className?: string;
  alt?: string;
}

export default function UDLaPovedaLogo({ 
  className = "w-10 h-10",
  alt = "Escudo Oficial FUNDACION. AFE"
}: ClubLogoProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className={`${className} flex items-center justify-center relative select-none`} id="club-afe-crest">
      {!imgError ? (
        <img 
          src="/escudo.png" 
          alt={alt}
          onError={() => setImgError(true)}
          className="w-full h-full object-contain block drop-shadow-xs"
          loading="eager"
          decoding="async"
        />
      ) : (
        /* Vector fallback matching FUNDACION. AFE crest with corporate green & white colors */
        <svg 
          viewBox="0 0 200 200" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full object-contain block"
        >
          {/* White circular badge with corporate emerald green border */}
          <circle cx="100" cy="100" r="95" fill="#ffffff" stroke="#047857" strokeWidth="6" />
          <circle cx="100" cy="100" r="88" fill="#ffffff" stroke="#10b981" strokeWidth="2" strokeDasharray="3 3" />
          
          {/* Top text arc: FUNDACION. AFE */}
          <path id="afeArcFallback" d="M 28,100 A 72,72 0 1,1 172,100" fill="none" />
          <text fill="#047857" fontSize="13.5" fontWeight="900" letterSpacing="0.18em" fontFamily="'Inter', system-ui, sans-serif">
            <textPath href="#afeArcFallback" startOffset="50%" textAnchor="middle">
              FUNDACION. AFE
            </textPath>
          </text>

          {/* 19 and 86 in emerald green */}
          <text x="32" y="104" fill="#059669" fontSize="12" fontWeight="900" fontFamily="sans-serif">19</text>
          <text x="168" y="104" fill="#059669" fontSize="12" fontWeight="900" fontFamily="sans-serif">86</text>

          {/* AFE Centered Logo in corporate Emerald Green */}
          <g transform="translate(45, 68)">
            {/* A */}
            <path d="M 12,42 L 23,4 L 34,42 L 27,42 L 24,31 L 18,31 L 15,42 Z M 19.8,24 L 22.8,13.5 L 25.8,24 Z" fill="#047857" />
            {/* F */}
            <path d="M 40,4 L 66,4 L 66,12 L 48,12 L 48,19 L 63,19 L 63,27 L 48,27 L 48,42 L 40,42 Z" fill="#047857" />
            {/* E */}
            <path d="M 72,4 L 98,4 L 98,12 L 80,12 L 80,19 L 95,19 L 95,27 L 80,27 L 80,34 L 98,34 L 98,42 L 72,42 Z" fill="#047857" />
          </g>

          {/* 5 Bottom Stars in Emerald Green */}
          <g fill="#10b981">
            <polygon points="46,132 47.5,136.5 52,136.5 48.5,139 50,143.5 46,140.5 42,143.5 43.5,139 40,136.5 44.5,136.5" />
            <polygon points="70,149 71.5,153.5 76,153.5 72.5,156 74,160.5 70,157.5 66,160.5 67.5,156 64,153.5 68.5,153.5" />
            <polygon points="100,157 101.5,161.5 106,161.5 102.5,164 104,168.5 100,165.5 96,168.5 97.5,164 94,161.5 98.5,161.5" />
            <polygon points="130,149 131.5,153.5 136,153.5 132.5,156 134,160.5 130,157.5 126,160.5 127.5,156 124,153.5 128.5,153.5" />
            <polygon points="154,132 155.5,136.5 160,136.5 156.5,139 158,143.5 154,140.5 150,143.5 151.5,139 148,136.5 152.5,136.5" />
          </g>
        </svg>
      )}
    </div>
  );
}

export { UDLaPovedaLogo as ClubLogo, UDLaPovedaLogo as AFELogo };
