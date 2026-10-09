import React from 'react';

/**
 * Faithful recreation of the uploaded background.webp:
 * - Sweeping crimson red artistic brush stroke at the top containing the golden 5-pointed star
 * - Open white canvas in the center for the login card
 * - Distressed crimson red horizontal brush stroke along the bottom edge
 */
export const LoginBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none select-none overflow-hidden z-0 bg-white">
      <svg
        className="w-full h-full object-cover min-w-full min-h-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Crimson Red Gradient for top brush */}
          <linearGradient id="bgTopRed" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#C62828" />
            <stop offset="45%" stopColor="#D32F2F" />
            <stop offset="85%" stopColor="#B71C1C" />
            <stop offset="100%" stopColor="#8E0000" />
          </linearGradient>

          {/* Bottom Red Gradient */}
          <linearGradient id="bgBottomRed" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#8E0000" />
            <stop offset="25%" stopColor="#C62828" />
            <stop offset="70%" stopColor="#D32F2F" />
            <stop offset="100%" stopColor="#B71C1C" />
          </linearGradient>

          {/* Star Gradient with Facets */}
          <linearGradient id="starFacetA" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF176" />
            <stop offset="100%" stopColor="#FDD835" />
          </linearGradient>

          <linearGradient id="starFacetB" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FBC02D" />
            <stop offset="100%" stopColor="#F57F17" />
          </linearGradient>

          {/* Subtle Grunge/Distress pattern */}
          <pattern id="grungePattern" width="120" height="120" patternUnits="userSpaceOnUse">
            <circle cx="20" cy="30" r="1.5" fill="#FFFFFF" opacity="0.35" />
            <circle cx="50" cy="80" r="2.2" fill="#FFFFFF" opacity="0.4" />
            <circle cx="85" cy="40" r="1.8" fill="#FFFFFF" opacity="0.3" />
            <circle cx="110" cy="95" r="2.5" fill="#FFFFFF" opacity="0.45" />
            <circle cx="35" cy="110" r="1.2" fill="#FFFFFF" opacity="0.3" />
            <path d="M10,15 Q30,12 45,16" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.3" strokeDasharray="3 3" />
            <path d="M70,85 Q95,82 115,88" stroke="#FFFFFF" strokeWidth="1.4" opacity="0.35" strokeDasharray="4 2" />
          </pattern>

          {/* Brush mask filter for raw organic edges */}
          <filter id="brushRoughness" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="9" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>

        {/* --- 1. TOP SWEEPING RED BRUSH WITH STAR --- */}
        <g filter="url(#brushRoughness)">
          {/* Main top curved brush stroke */}
          <path
            d="M 400,0 
               C 520,30 650,80 820,180 
               C 980,270 1150,340 1440,320 
               L 1440,0 
               Z"
            fill="url(#bgTopRed)"
          />
          {/* Secondary dynamic stroke layer */}
          <path
            d="M 370,-10 
               C 540,60 760,160 1000,280 
               C 1180,360 1350,360 1450,335 
               L 1450,0 
               Z"
            fill="#B71C1C"
            opacity="0.85"
          />
          {/* Frayed brush tip splatter around edge */}
          <path
            d="M 360,0 C 440,40 520,80 620,120 C 580,100 480,45 370,10 Z"
            fill="#C62828"
            opacity="0.9"
          />
          <path
            d="M 720,140 C 850,210 980,285 1100,320 C 1040,290 920,230 780,165 Z"
            fill="#E53935"
            opacity="0.6"
          />
        </g>

        {/* Top brush dry-paint distress texture */}
        <path
          d="M 420,0 C 600,100 850,220 1200,330 L 1440,300 L 1440,0 Z"
          fill="url(#grungePattern)"
        />

        {/* Additional organic splash marks along the top border */}
        <g fill="#B71C1C" opacity="0.65">
          <ellipse cx="480" cy="95" rx="4" ry="2" transform="rotate(-15 480 95)" />
          <ellipse cx="530" cy="130" rx="6" ry="2.5" transform="rotate(-25 530 130)" />
          <ellipse cx="680" cy="205" rx="5" ry="3" transform="rotate(-20 680 205)" />
          <ellipse cx="850" cy="280" rx="7" ry="3" transform="rotate(-10 850 280)" />
          <ellipse cx="1020" cy="335" rx="8" ry="3.5" transform="rotate(5 1020 335)" />
          <ellipse cx="1180" cy="355" rx="9" ry="4" transform="rotate(2 1180 355)" />
        </g>

        {/* --- GOLDEN STAR ON THE RED BRUSH (TOP RIGHT) --- */}
        {/* Center of star at ~ (1150, 140), radius ~ 85 */}
        <g transform="translate(1160, 145) scale(0.95)" filter="drop-shadow(0 4px 10px rgba(0,0,0,0.25))">
          {/* Facets light & shadow */}
          {/* Top vertex (0, -85) */}
          <polygon points="0,-85 0,0 -20,-26" fill="url(#starFacetA)" />
          <polygon points="0,-85 0,0 20,-26" fill="url(#starFacetB)" />

          {/* Right vertex (81, -26) */}
          <polygon points="81,-26 0,0 20,-26" fill="url(#starFacetA)" />
          <polygon points="81,-26 0,0 32,24" fill="url(#starFacetB)" />

          {/* Bottom-right vertex (50, 69) */}
          <polygon points="50,69 0,0 32,24" fill="url(#starFacetA)" />
          <polygon points="50,69 0,0 0,38" fill="url(#starFacetB)" />

          {/* Bottom-left vertex (-50, 69) */}
          <polygon points="-50,69 0,0 0,38" fill="url(#starFacetA)" />
          <polygon points="-50,69 0,0 -32,24" fill="url(#starFacetB)" />

          {/* Left vertex (-81, -26) */}
          <polygon points="-81,-26 0,0 -32,24" fill="url(#starFacetA)" />
          <polygon points="-81,-26 0,0 -20,-26" fill="url(#starFacetB)" />

          {/* Star subtle bright rim */}
          <polygon
            points="0,-85 20,-26 81,-26 32,24 50,69 0,38 -50,69 -32,24 -81,-26 -20,-26"
            fill="none"
            stroke="#FFF59D"
            strokeWidth="1.2"
            opacity="0.8"
          />
        </g>

        {/* --- 2. BOTTOM HORIZONTAL TEXTURED BRUSH STROKE --- */}
        <g filter="url(#brushRoughness)">
          {/* Main bottom sweep */}
          <path
            d="M 0,690 
               C 180,720 400,770 700,810 
               C 950,840 1200,860 1440,845 
               L 1440,900 
               L 0,900 
               Z"
            fill="url(#bgBottomRed)"
          />
          {/* Second textured bottom wave */}
          <path
            d="M 0,670 
               C 120,700 280,750 480,780 
               C 780,825 1100,845 1440,840 
               L 1440,900 
               L 0,900 
               Z"
            fill="#B71C1C"
            opacity="0.88"
          />
        </g>

        {/* Dry-brush white distressing over bottom red band (like in background.webp) */}
        <path
          d="M 0,680 C 250,720 600,780 1440,840 L 1440,900 L 0,900 Z"
          fill="url(#grungePattern)"
        />

        {/* Bottom splatters & paint streaks */}
        <g fill="#C62828" opacity="0.6">
          <ellipse cx="120" cy="670" rx="8" ry="3" transform="rotate(10 120 670)" />
          <ellipse cx="280" cy="725" rx="10" ry="3.5" transform="rotate(12 280 725)" />
          <ellipse cx="460" cy="765" rx="7" ry="2.5" transform="rotate(8 460 765)" />
          <ellipse cx="780" cy="815" rx="9" ry="3" transform="rotate(4 780 815)" />
          <ellipse cx="1120" cy="840" rx="8" ry="3" transform="rotate(-2 1120 840)" />
        </g>
      </svg>
    </div>
  );
};
