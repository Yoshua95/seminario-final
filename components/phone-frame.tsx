"use client"

import type React from "react"

interface PhoneFrameProps {
  children: React.ReactNode
  className?: string
}

export function PhoneFrame({ children, className = "" }: PhoneFrameProps) {
  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-[#050507] p-0 sm:p-8">
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.3; transform: scale(0.92); }
          50% { opacity: 1; transform: scale(1.08); }
        }
        @keyframes pulseArrow {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.12); }
        }
        @keyframes pulseRow {
          0%, 100% { background-color: rgba(255, 255, 255, 0.15); }
          50% { background-color: rgba(255, 255, 255, 0.05); }
        }
        .animate-pulse-glow { animation: pulseGlow 2s infinite ease-in-out; }
        .animate-pulse-arrow { animation: pulseArrow 1.5s infinite ease-in-out; }
        .hover\\:animate-pulse-row:hover { animation: pulseRow 1.5s infinite ease-in-out; }
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
        
        .mobile-container-fix {
          overscroll-behavior-y: contain;
          touch-action: pan-y;
        }
      `}} />

      <div className="relative w-full max-w-[400px] sm:rounded-[3.2rem] sm:border sm:border-[#1f2029] sm:bg-[#0a0a0e] sm:p-2 sm:shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)]">
        <div className={`relative w-full flex min-h-dvh flex-col overflow-hidden bg-background sm:min-h-[844px] sm:rounded-[2.6rem] mobile-container-fix ${className}`}>
          <div className="pointer-events-none absolute left-1/2 top-3 z-20 hidden h-7 w-28 -translate-x-1/2 rounded-full bg-black sm:block" />
          {children}
        </div>
      </div>
    </div>
  )
}
