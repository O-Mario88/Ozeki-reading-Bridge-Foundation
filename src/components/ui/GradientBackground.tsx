import React from "react";

/**
 * GradientBackground
 * Provides the soft, premium mesh-gradient ambient background seen across the application.
 * Creates an abstract airy feel with peach, white, and subtle warm red overlapping glows.
 */
export function GradientBackground() {
  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none bg-[#fdfdfc]">
      {/* Top Left Peach/Pink Glow */}
      <div 
        className="absolute -top-[10%] -left-[10%] w-[60%] h-[70%] rounded-full opacity-60 blur-[120px]"
        style={{ background: "radial-gradient(circle, rgba(255,200,210,0.8) 0%, rgba(255,200,210,0) 70%)" }}
      />
      
      {/* Top Right Warm Red/Orange Glow */}
      <div 
        className="absolute -top-[5%] -right-[15%] w-[65%] h-[80%] rounded-full opacity-50 blur-[140px]"
        style={{ background: "radial-gradient(circle, rgba(255,170,140,0.7) 0%, rgba(255,170,140,0) 70%)" }}
      />

      {/* Center White/Light Blue Highlight */}
      <div 
        className="absolute top-[20%] left-[20%] w-[60%] h-[60%] rounded-full opacity-70 blur-[100px]"
        style={{ background: "radial-gradient(circle, rgba(230,240,255,0.8) 0%, rgba(255,255,255,0) 70%)" }}
      />

      {/* Subtle sweeping wave or mesh shape if desired via SVG, but blurred radial gradients match the soft mesh look best */}
      <svg
        className="absolute top-0 left-0 w-full h-full opacity-[0.15]"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1440 800"
        preserveAspectRatio="none"
      >
        <path 
          fill="#ffffff" 
          d="M0,200 Q400,0 800,300 T1440,100 L1440,0 L0,0 Z" 
        />
        <path 
          fill="#ffffff" 
          d="M0,800 Q500,600 900,800 T1440,650 L1440,800 L0,800 Z" 
        />
      </svg>
    </div>
  );
}
