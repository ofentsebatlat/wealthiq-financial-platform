import { RefObject } from "react";
import { Check, CheckCircle, AlertCircle, ScanFace, ShieldCheck } from "lucide-react";
import { FaceBoundingBox, FaceTrackResult } from "../utils/faceMatcher";

interface CircularFaceScannerProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  cameraActive: boolean;
  frozenPhoto: string | null;
  privacyBlur?: boolean;
  trackBox: FaceBoundingBox | null;
  trackStatus?: FaceTrackResult["status"];
  isInPlace: boolean;
  isCoachingWarning: boolean;
  progress: number;
  inPlaceLabel?: string;
  distanceStatus: "none" | "too_far" | "too_close" | "good";
  lightingStatus: "dim" | "harsh" | "good";
  overlayState?: "none" | "verifying_upload" | "success" | "unrecognized" | "failed";
  successTitle?: string;
  successSubtitle?: string;
  failTitle?: string;
  failSubtitle?: string;
  sizeClass?: string;
  livenessConfirmed?: boolean;
}

export default function CircularFaceScanner({
  videoRef,
  cameraActive,
  frozenPhoto,
  privacyBlur = false,
  trackBox,
  trackStatus = "no_face",
  isInPlace,
  isCoachingWarning,
  progress,
  inPlaceLabel = "Verifying",
  distanceStatus,
  lightingStatus,
  overlayState = "none",
  successTitle = "Identity Verified",
  successSubtitle = "Signing you in...",
  failTitle = "Face Not Recognized",
  failSubtitle = "No matching account profile found",
  sizeClass = "w-56 h-56",
  livenessConfirmed = false
}: CircularFaceScannerProps) {
  const radius = 112;
  const circumference = 2 * Math.PI * radius;

  const isSuccess = overlayState === "success";
  const isFailure = overlayState === "unrecognized" || overlayState === "failed";
  const isUploadScanning = overlayState === "verifying_upload";

  const clampedProgress = isSuccess || isFailure
    ? 100
    : Math.min(100, Math.max(0, progress));

  const showDeterminateArc =
    isSuccess || isFailure || isUploadScanning || clampedProgress > 0;

  const showOrbitingScanner =
    cameraActive && !frozenPhoto && overlayState === "none" && clampedProgress === 0;

  const dashOffset = circumference - (circumference * clampedProgress) / 100;

  // Track ring background color
  const trackStroke = isSuccess
    ? "#a7f3d0"
    : isFailure
    ? "#fecaca"
    : isInPlace || isUploadScanning
    ? "#d1fae5"
    : isCoachingWarning
    ? "#fde68a"
    : "#e2e8f0";

  // Active circular progress stroke color
  const activeStroke = isSuccess
    ? "#10b981"
    : isFailure
    ? "#ef4444"
    : isCoachingWarning && !isUploadScanning
    ? "#f59e0b"
    : "#10b981";

  // Mirrored face tracker reticle inside the 1:1 circular viewport
  const mirroredBoxStyle = trackBox
    ? {
        top: `${Math.max(4, trackBox.top * 100)}%`,
        left: `${Math.max(4, (1 - trackBox.right) * 100)}%`,
        width: `${Math.min(92, (trackBox.right - trackBox.left) * 100)}%`,
        height: `${Math.min(92, (trackBox.bottom - trackBox.top) * 100)}%`
      }
    : null;

  // Dynamic badge text at bottom rim of circle
  let rimBadgeText = "Position Face";
  if (isUploadScanning) {
    rimBadgeText = `${inPlaceLabel} ${Math.round(clampedProgress)}%`;
  } else if (isInPlace || clampedProgress > 0) {
    rimBadgeText = `${inPlaceLabel} ${Math.round(clampedProgress)}%`;
  } else if (distanceStatus === "too_far") {
    rimBadgeText = "Move Closer";
  } else if (distanceStatus === "too_close") {
    rimBadgeText = "Move Back";
  } else if (lightingStatus === "dim") {
    rimBadgeText = "More Light Needed";
  } else if (lightingStatus === "harsh") {
    rimBadgeText = "Reduce Glare";
  } else if (trackStatus === "multiple_faces") {
    rimBadgeText = "One Person Only";
  } else if (trackStatus === "off_center") {
    rimBadgeText = "Center Face";
  } else if (trackStatus === "blurry") {
    rimBadgeText = "Hold Still";
  }

  return (
    <div className={`relative ${sizeClass} mx-auto flex items-center justify-center select-none`}>
      {/* Outer Circular Progress Track & Determinate Arc */}
      <svg
        viewBox="0 0 240 240"
        className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none z-20"
      >
        {/* Base Circular Track */}
        <circle
          cx="120"
          cy="120"
          r={radius}
          fill="none"
          stroke={trackStroke}
          strokeWidth="6"
          className="transition-colors duration-300"
        />

        {/* Determinate Circular Loading / Verification Progress Arc */}
        {showDeterminateArc && (
          <circle
            cx="120"
            cy="120"
            r={radius}
            fill="none"
            stroke={activeStroke}
            strokeWidth="6.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-all duration-300 ease-out"
            style={{
              filter:
                isSuccess || isInPlace || isUploadScanning
                  ? "drop-shadow(0 0 5px rgba(16, 185, 129, 0.5))"
                  : undefined
            }}
          />
        )}
      </svg>

      {/* Orbiting Scanner Ring Around the Circle Before Lock-On */}
      {showOrbitingScanner && (
        <svg
          viewBox="0 0 240 240"
          className="absolute inset-0 w-full h-full animate-spin pointer-events-none z-20"
          style={{ animationDuration: "2.4s" }}
        >
          <circle
            cx="120"
            cy="120"
            r={radius}
            fill="none"
            stroke={isCoachingWarning ? "#f59e0b" : "#004879"}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${circumference * 0.24} ${circumference * 0.76}`}
          />
        </svg>
      )}

      {/* Inner Circular Camera Viewport */}
      <div className="absolute inset-[11px] rounded-full bg-slate-900 overflow-hidden shadow-inner flex items-center justify-center z-10">
        {cameraActive && !frozenPhoto && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 w-full h-full object-cover scale-x-[-1] transition-all duration-300 ${
              privacyBlur ? "blur-md brightness-95" : ""
            }`}
          />
        )}

        {frozenPhoto && (
          <img
            src={frozenPhoto}
            alt="Biometric verification frame"
            className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
            referrerPolicy="no-referrer"
          />
        )}

        {!cameraActive && !frozenPhoto && (
          <div className="flex flex-col items-center justify-center space-y-1.5 text-slate-400 p-4 text-center">
            <ScanFace className="w-11 h-11 text-slate-400 stroke-[1.4]" />
            <span className="text-[11px] font-medium">Camera standby</span>
          </div>
        )}

        {/* Subtle Inner Circular Guide When Searching */}
        {cameraActive && !frozenPhoto && !mirroredBoxStyle && overlayState === "none" && (
          <div className="absolute inset-5 rounded-full border-2 border-dashed border-white/35 pointer-events-none z-10" />
        )}

        {/* Real-Time Tracked Face Reticle Inside Circle */}
        {cameraActive && !frozenPhoto && mirroredBoxStyle && overlayState === "none" && (
          <div
            style={mirroredBoxStyle}
            className={`absolute rounded-full border-2 transition-all duration-200 pointer-events-none z-20 ${
              isInPlace
                ? "border-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.55)]"
                : "border-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.45)]"
            }`}
          />
        )}

        {/* Uploaded Photo Verification Dimmer */}
        {isUploadScanning && (
          <div className="absolute inset-0 bg-slate-950/55 flex flex-col items-center justify-center text-white z-30 p-4 text-center animate-fadeIn">
            <span className="text-xl font-mono font-bold text-emerald-300">
              {Math.round(clampedProgress)}%
            </span>
            <span className="text-[9.5px] uppercase tracking-wider font-semibold opacity-90 mt-1">
              Verifying Identity
            </span>
          </div>
        )}

        {/* Verified Success Overlay */}
        {isSuccess && (
          <div className="absolute inset-0 bg-emerald-600/92 flex flex-col items-center justify-center text-white z-30 animate-fadeIn p-4 text-center">
            <CheckCircle className="w-9 h-9 text-white" />
            <span className="text-xs font-bold uppercase tracking-wide mt-2">{successTitle}</span>
            {successSubtitle && (
              <span className="text-[10.5px] opacity-90 mt-0.5 leading-snug">{successSubtitle}</span>
            )}
          </div>
        )}

        {/* Unrecognized / Failed Overlay */}
        {isFailure && (
          <div className="absolute inset-0 bg-slate-900/88 flex flex-col items-center justify-center text-white z-30 animate-fadeIn p-4 text-center">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <span className="text-xs font-bold uppercase tracking-wide mt-2 text-red-200">
              {failTitle}
            </span>
            {failSubtitle && (
              <span className="text-[10px] text-slate-300 mt-1 leading-snug px-2">
                {failSubtitle}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Top Liveness Anti-Spoofing Badge */}
      {cameraActive && !frozenPhoto && overlayState === "none" && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold shadow-xs border flex items-center space-x-1 whitespace-nowrap bg-white/95 text-slate-700 border-slate-200">
          <ShieldCheck className={`w-3 h-3 ${livenessConfirmed ? "text-emerald-600" : "text-capitec-blue animate-pulse"}`} />
          <span>{livenessConfirmed ? "Liveness: Blink Confirmed" : "Anti-Spoofing: Active"}</span>
        </div>
      )}

      {/* Bottom Rim Pill Badge */}
      {((cameraActive && !frozenPhoto && overlayState === "none") || isUploadScanning) && (
        <div
          className={`absolute -bottom-2 left-1/2 -translate-x-1/2 z-30 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm border whitespace-nowrap transition-colors duration-200 ${
            isInPlace || isUploadScanning
              ? "bg-emerald-600 text-white border-emerald-500"
              : isCoachingWarning
              ? "bg-amber-500 text-white border-amber-400"
              : "bg-capitec-blue text-white border-capitec-blue"
          }`}
        >
          {rimBadgeText}
        </div>
      )}

      {/* Completed Verified Badge on Rim */}
      {!cameraActive && frozenPhoto && overlayState === "none" && clampedProgress >= 100 && (
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-30 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm bg-emerald-600 text-white border border-emerald-500 flex items-center space-x-1 whitespace-nowrap">
          <Check className="w-3 h-3 stroke-[3]" />
          <span>Captured</span>
        </div>
      )}
    </div>
  );
}
