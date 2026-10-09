import React from 'react';

interface VksLogoProps {
  className?: string;
  size?: number | string;
}

/**
 * Official Vietnam People's Procuracy Emblem (Phù hiệu Kiểm sát Nhân dân Việt Nam)
 * Faithful high-fidelity vector reproduction of the uploaded LOGO KHONG XOA .png
 */
export const VksLogo: React.FC<VksLogoProps> = ({ className = 'w-10 h-10', size }) => {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <svg
      viewBox="0 0 500 500"
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Phù hiệu Kiểm sát Nhân dân"
    >
      <defs>
        {/* Radial Sunburst Gradient */}
        <radialGradient id="vksSunburst" cx="50%" cy="38%" r="50%">
          <stop offset="0%" stopColor="#E53935" />
          <stop offset="70%" stopColor="#C62828" />
          <stop offset="100%" stopColor="#8E0000" />
        </radialGradient>

        {/* Gold Metallic Gradients */}
        <linearGradient id="vksGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF176" />
          <stop offset="30%" stopColor="#FFD700" />
          <stop offset="70%" stopColor="#F57F17" />
          <stop offset="100%" stopColor="#FFB300" />
        </linearGradient>

        <linearGradient id="vksStarLight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF9C4" />
          <stop offset="100%" stopColor="#FFD54F" />
        </linearGradient>

        <linearGradient id="vksStarShadow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFB300" />
          <stop offset="100%" stopColor="#F57F17" />
        </linearGradient>

        {/* Blue Gear Gradient */}
        <linearGradient id="vksBlueGear" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0288D1" />
          <stop offset="50%" stopColor="#0277BD" />
          <stop offset="100%" stopColor="#01579B" />
        </linearGradient>

        {/* Ribbon Gradient */}
        <linearGradient id="vksRibbonGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#E53935" />
          <stop offset="60%" stopColor="#B71C1C" />
          <stop offset="100%" stopColor="#7F0E0E" />
        </linearGradient>

        {/* Shadow filter */}
        <filter id="vksGlow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* --- 1. OUTER GOLD BORDER & CIRCLE --- */}
      <circle cx="250" cy="235" r="195" fill="none" stroke="#FFD700" strokeWidth="10" />
      <circle cx="250" cy="235" r="190" fill="url(#vksSunburst)" />

      {/* --- 2. SUNBURST RAYS (Tia mặt trời tỏa sáng) --- */}
      <g opacity="0.32">
        {Array.from({ length: 24 }).map((_, i) => {
          const angle = i * 15;
          return (
            <polygon
              key={i}
              points="250,235 238,40 262,40"
              fill="#FFF176"
              transform={`rotate(${angle} 250 235)`}
            />
          );
        })}
      </g>

      {/* Inner thin red-gold ring */}
      <circle cx="250" cy="235" r="186" fill="none" stroke="#FFA000" strokeWidth="2" opacity="0.6" />

      {/* --- 3. WHEAT EARS / RICE WREATH (Bông lúa vàng 2 bên) --- */}
      {/* Left side wheat grains */}
      <g fill="url(#vksGoldGrad)" stroke="#E65100" strokeWidth="1.2">
        {[
          { cx: 80, cy: 260, r: 18, rot: 35 },
          { cx: 75, cy: 220, r: 19, rot: 25 },
          { cx: 80, cy: 180, r: 19, rot: 15 },
          { cx: 95, cy: 142, r: 19, rot: 5 },
          { cx: 120, cy: 110, r: 19, rot: -10 },
          { cx: 152, cy: 82, r: 19, rot: -25 },
          { cx: 190, cy: 62, r: 19, rot: -40 },
          { cx: 228, cy: 52, r: 18, rot: -55 },
          // Inner row left
          { cx: 98, cy: 245, r: 16, rot: 30 },
          { cx: 92, cy: 208, r: 16, rot: 20 },
          { cx: 102, cy: 170, r: 17, rot: 10 },
          { cx: 120, cy: 135, r: 17, rot: -5 },
          { cx: 145, cy: 106, r: 17, rot: -20 },
          { cx: 178, cy: 85, r: 17, rot: -35 },
          { cx: 215, cy: 72, r: 16, rot: -50 },
        ].map((g, idx) => (
          <ellipse
            key={`left-${idx}`}
            cx={g.cx}
            cy={g.cy}
            rx={g.r}
            ry={g.r * 0.55}
            transform={`rotate(${g.rot} ${g.cx} ${g.cy})`}
          />
        ))}
      </g>

      {/* Right side wheat grains (mirrored) */}
      <g fill="url(#vksGoldGrad)" stroke="#E65100" strokeWidth="1.2">
        {[
          { cx: 420, cy: 260, r: 18, rot: -35 },
          { cx: 425, cy: 220, r: 19, rot: -25 },
          { cx: 420, cy: 180, r: 19, rot: -15 },
          { cx: 405, cy: 142, r: 19, rot: -5 },
          { cx: 380, cy: 110, r: 19, rot: 10 },
          { cx: 348, cy: 82, r: 19, rot: 25 },
          { cx: 310, cy: 62, r: 19, rot: 40 },
          { cx: 272, cy: 52, r: 18, rot: 55 },
          // Inner row right
          { cx: 402, cy: 245, r: 16, rot: -30 },
          { cx: 408, cy: 208, r: 16, rot: -20 },
          { cx: 398, cy: 170, r: 17, rot: -10 },
          { cx: 380, cy: 135, r: 17, rot: 5 },
          { cx: 355, cy: 106, r: 17, rot: 20 },
          { cx: 322, cy: 85, r: 17, rot: 35 },
          { cx: 285, cy: 72, r: 16, rot: 50 },
        ].map((g, idx) => (
          <ellipse
            key={`right-${idx}`}
            cx={g.cx}
            cy={g.cy}
            rx={g.r}
            ry={g.r * 0.55}
            transform={`rotate(${g.rot} ${g.cx} ${g.cy})`}
          />
        ))}
      </g>

      {/* --- 4. GOLDEN 5-POINTED STAR (Ngôi sao vàng 5 cánh với các khối sáng tối) --- */}
      <g filter="url(#vksGlow)">
        {/* Star facets with 3D light & shade */}
        {/* Top point */}
        <polygon points="250,90 250,175 220,152" fill="url(#vksStarLight)" />
        <polygon points="250,90 250,175 280,152" fill="url(#vksStarShadow)" />
        {/* Top-right point */}
        <polygon points="338,152 250,175 272,205" fill="url(#vksStarLight)" />
        <polygon points="338,152 250,175 280,152" fill="url(#vksStarShadow)" />
        {/* Bottom-right point */}
        <polygon points="305,248 250,175 250,215" fill="url(#vksStarLight)" />
        <polygon points="305,248 250,175 272,205" fill="url(#vksStarShadow)" />
        {/* Bottom-left point */}
        <polygon points="195,248 250,175 250,215" fill="url(#vksStarShadow)" />
        <polygon points="195,248 250,175 228,205" fill="url(#vksStarLight)" />
        {/* Top-left point */}
        <polygon points="162,152 250,175 220,152" fill="url(#vksStarLight)" />
        <polygon points="162,152 250,175 228,205" fill="url(#vksStarShadow)" />
        {/* Star outline border */}
        <polygon
          points="250,90 273,152 338,152 287,192 305,248 250,215 195,248 213,192 162,152 227,152"
          fill="none"
          stroke="#FF8F00"
          strokeWidth="1.5"
        />
      </g>

      {/* --- 5. TWO CROSSED GOLDEN SWORDS (Hai thanh kiếm vắt chéo) --- */}
      <g stroke="#E65100" strokeWidth="1.5">
        {/* Left-to-right sword blade */}
        <polygon
          points="155,245 185,270 345,395 355,385 195,260"
          fill="url(#vksGoldGrad)"
        />
        {/* Left sword hilt (chuôi kiếm) */}
        <rect
          x="145"
          y="235"
          width="18"
          height="18"
          rx="3"
          fill="#FFB300"
          transform="rotate(38 154 244)"
        />
        <circle cx="140" cy="235" r="7" fill="#FF8F00" />
        <line x1="135" y1="260" x2="168" y2="235" stroke="#FFA000" strokeWidth="6" strokeLinecap="round" />

        {/* Right-to-left sword blade */}
        <polygon
          points="345,245 315,270 155,395 145,385 305,260"
          fill="url(#vksGoldGrad)"
        />
        {/* Right sword hilt */}
        <rect
          x="337"
          y="235"
          width="18"
          height="18"
          rx="3"
          fill="#FFB300"
          transform="rotate(-38 346 244)"
        />
        <circle cx="360" cy="235" r="7" fill="#FF8F00" />
        <line x1="365" y1="260" x2="332" y2="235" stroke="#FFA000" strokeWidth="6" strokeLinecap="round" />
      </g>

      {/* Shield/Plate behind the Gear */}
      <path
        d="M175,280 Q250,250 325,280 L320,380 Q250,405 180,380 Z"
        fill="url(#vksGoldGrad)"
        stroke="#E65100"
        strokeWidth="3"
      />

      {/* --- 6. BLUE COGWHEEL / GEAR WITH 12 TEETH & "KS" (Bánh xe răng màu xanh lam) --- */}
      <g filter="url(#vksGlow)">
        {/* Cogwheel base */}
        <circle cx="250" cy="345" r="76" fill="#01579B" stroke="#FFD700" strokeWidth="3" />
        
        {/* 12 Cog Teeth (12 răng cưa của bánh răng) */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = i * 30;
          return (
            <rect
              key={`tooth-${i}`}
              x="241"
              y="261"
              width="18"
              height="16"
              rx="2"
              fill="url(#vksBlueGear)"
              stroke="#FFD700"
              strokeWidth="2"
              transform={`rotate(${angle} 250 345)`}
            />
          );
        })}

        {/* Central blue disk */}
        <circle cx="250" cy="345" r="72" fill="url(#vksBlueGear)" stroke="#81D4FA" strokeWidth="1.5" />

        {/* Inner golden ring border */}
        <circle cx="250" cy="345" r="62" fill="none" stroke="#FFD700" strokeWidth="2.5" />

        {/* Inner deep blue disk */}
        <circle cx="250" cy="345" r="60" fill="#0D47A1" />

        {/* BOLD WHITE LETTERS "KS" */}
        <text
          x="250"
          y="363"
          textAnchor="middle"
          fill="#FFFFFF"
          fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
          fontWeight="900"
          fontSize="56"
          letterSpacing="2"
          style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
        >
          KS
        </text>
      </g>

      {/* --- 7. RED RIBBON (Dải lụa đỏ uốn lượn) --- */}
      {/* Ribbon Left wing fold */}
      <path
        d="M72,250 C95,255 125,270 155,290 C125,296 95,280 65,275 Z"
        fill="#8E0000"
        stroke="#FFD700"
        strokeWidth="1.5"
      />
      <path
        d="M62,255 L165,295 L155,340 L82,310 Z"
        fill="url(#vksRibbonGrad)"
        stroke="#FFD700"
        strokeWidth="2.5"
      />

      {/* Ribbon Right wing fold */}
      <path
        d="M428,250 C405,255 375,270 345,290 C375,296 405,280 435,275 Z"
        fill="#8E0000"
        stroke="#FFD700"
        strokeWidth="1.5"
      />
      <path
        d="M438,255 L335,295 L345,340 L418,310 Z"
        fill="url(#vksRibbonGrad)"
        stroke="#FFD700"
        strokeWidth="2.5"
      />

      {/* Lower Ribbon Loops left & right */}
      <path
        d="M90,345 C130,355 180,380 200,400 C150,395 100,375 78,355 Z"
        fill="#B71C1C"
        stroke="#FFD700"
        strokeWidth="2"
      />
      <path
        d="M410,345 C370,355 320,380 300,400 C350,395 400,375 422,355 Z"
        fill="#B71C1C"
        stroke="#FFD700"
        strokeWidth="2"
      />

      {/* Main Center Banner: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM" */}
      <path
        d="M100,365 Q250,430 400,365 L395,445 Q250,485 105,445 Z"
        fill="url(#vksRibbonGrad)"
        stroke="#FFD700"
        strokeWidth="3.5"
        filter="url(#vksGlow)"
      />

      {/* Ribbon curved text path */}
      <path
        id="vksRibbonPathUpper"
        d="M125,396 Q250,442 375,396"
        fill="none"
      />
      <path
        id="vksRibbonPathLower"
        d="M140,432 Q250,468 360,432"
        fill="none"
      />

      {/* Text: CỘNG HÒA XÃ HỘI CHỦ NGHĨA */}
      <text
        fill="#FFD700"
        fontSize="17"
        fontWeight="800"
        fontFamily="system-ui, -apple-system, sans-serif"
        letterSpacing="1"
      >
        <textPath href="#vksRibbonPathUpper" startOffset="50%" textAnchor="middle">
          CỘNG HÒA XÃ HỘI CHỦ NGHĨA
        </textPath>
      </text>

      {/* Text: VIỆT NAM */}
      <text
        fill="#FFD700"
        fontSize="24"
        fontWeight="900"
        fontFamily="system-ui, -apple-system, sans-serif"
        letterSpacing="4"
      >
        <textPath href="#vksRibbonPathLower" startOffset="50%" textAnchor="middle">
          VIỆT NAM
        </textPath>
      </text>

      {/* --- 8. STEPPED GOLDEN PEDESTAL BASE (Chân đế vàng 3 tầng ở đáy) --- */}
      <g fill="url(#vksGoldGrad)" stroke="#B71C1C" strokeWidth="2">
        {/* Tier 1 */}
        <path d="M145,455 L355,455 L350,467 L150,467 Z" rx="2" />
        {/* Tier 2 */}
        <path d="M140,467 L360,467 L355,478 L145,478 Z" rx="2" />
        {/* Tier 3 (bottom base) */}
        <path d="M135,478 L365,478 L360,488 L140,488 Z" rx="3" />
      </g>
    </svg>
  );
};
