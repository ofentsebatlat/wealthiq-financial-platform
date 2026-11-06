import React from "react";

export interface LoadingPageProps {
  /** Optional message (ignored in minimal circle mode unless needed) */
  message?: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Whether to render as an edge-to-edge full-viewport loading overlay or inline container */
  fullScreen?: boolean;
  /** Size variant of the circle */
  size?: "sm" | "md" | "lg";
}

export default function LoadingPage({
  fullScreen = false,
  size = "md"
}: LoadingPageProps) {
  const sizeClasses = {
    sm: "w-8 h-8 border-2",
    md: "w-12 h-12 border-3",
    lg: "w-16 h-16 border-4"
  }[size] || "w-12 h-12 border-3";

  const spinner = (
    <div className="flex items-center justify-center animate-fadeIn select-none">
      <div className="relative flex items-center justify-center">
        {/* Soft background pulse glow */}
        <div className="absolute -inset-2 bg-gradient-to-r from-capitec-blue/20 to-capitec-red/20 rounded-full blur-md animate-pulse" />
        
        {/* Minimal circular spinner with Capitec Blue & Red branding */}
        <div
          className={`${sizeClasses} rounded-full border-slate-200 border-t-capitec-blue border-r-capitec-red animate-spin`}
        />
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div
        id="wealthiq-fullscreen-loading"
        className="fixed inset-0 z-50 flex items-center justify-center bg-brand-bg/95 backdrop-blur-xs"
      >
        {spinner}
      </div>
    );
  }

  return (
    <div
      id="wealthiq-page-loading"
      className="w-full h-full min-h-[320px] flex items-center justify-center py-12"
    >
      {spinner}
    </div>
  );
}

export { LoadingPage };
