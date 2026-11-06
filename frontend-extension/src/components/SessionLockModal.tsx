import React, { useState, useEffect, useRef } from "react";
import {
  Lock,
  Clock,
  ShieldCheck,
  AlertCircle,
  ScanFace,
  LogOut,
  Camera,
  CheckCircle2
} from "lucide-react";
import CircularFaceScanner from "./CircularFaceScanner";
import { trackLiveFaceFrame, FaceTrackResult, FaceBoundingBox } from "../utils/faceMatcher";

interface SessionLockModalProps {
  userName: string;
  accountNumber?: string;
  userPin?: string;
  enrolledFacePhoto?: string;
  onUnlockSuccess: () => void;
  onLogout: () => void;
}

export default function SessionLockModal({
  userName,
  accountNumber = "1431289445",
  userPin = "",
  enrolledFacePhoto = "",
  onUnlockSuccess,
  onLogout
}: SessionLockModalProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [unlockMethod, setUnlockMethod] = useState<"pin" | "biometric">("pin");

  // Biometric camera states
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState("");
  const [scanResult, setScanResult] = useState<"idle" | "success" | "unrecognized" | "quality_issue">("idle");
  const [frozenFrame, setFrozenFrame] = useState<string | null>(null);
  const [trackBox, setTrackBox] = useState<FaceBoundingBox | null>(null);
  const [trackStatus, setTrackStatus] = useState<FaceTrackResult["status"]>("no_face");
  const [isInPlace, setIsInPlace] = useState(false);
  const [verifyProgress, setVerifyProgress] = useState(0);
  const [liveAdvice, setLiveAdvice] = useState("Align your face inside the circle...");
  const [lightingStatus, setLightingStatus] = useState<"dim" | "harsh" | "good">("good");
  const [distanceStatus, setDistanceStatus] = useState<"none" | "too_far" | "too_close" | "good">("none");
  const [livenessConfirmed, setLivenessConfirmed] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const samplesRef = useRef<Array<{ identified: boolean; username: string | null; similarity: number }>>([]);

  const initials = userName
    ? userName
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "U";

  const maskedAcc =
    accountNumber && accountNumber.length >= 8
      ? `${accountNumber.slice(0, 4)}...${accountNumber.slice(-4)}`
      : "4431...1944";

  // Handle PIN verification
  const verifyEnteredPin = async (val: string) => {
    setIsVerifying(true);
    setError("");

    try {
      const res = await fetch("/api/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin: val,
          identifier: userName || accountNumber
        })
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setIsVerifying(false);
        onUnlockSuccess();
        return;
      } else {
        setError(data.message || "Invalid 4-digit Remote PIN. Please try again.");
        setPin("");
        setIsVerifying(false);
        return;
      }
    } catch {
      // Fallback local comparison if offline
      if (userPin && val === userPin) {
        setIsVerifying(false);
        onUnlockSuccess();
        return;
      }
    }

    setError("Invalid 4-digit Remote PIN. Please try again.");
    setPin("");
    setIsVerifying(false);
  };

  const handleKeypadPress = (digit: string) => {
    if (isVerifying || pin.length >= 4) return;
    setError("");
    const next = pin + digit;
    setPin(next);
    if (next.length === 4) {
      verifyEnteredPin(next);
    }
  };

  const handleClear = () => {
    if (isVerifying) return;
    setError("");
    setPin("");
  };

  const handleBackspace = () => {
    if (isVerifying) return;
    setError("");
    setPin((prev) => prev.slice(0, -1));
  };

  // Keyboard listener
  useEffect(() => {
    if (unlockMethod !== "pin" || isVerifying) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key >= "0" && e.key <= "9") {
        handleKeypadPress(e.key);
      } else if (e.key === "Backspace") {
        handleBackspace();
      } else if (e.key === "Escape") {
        handleClear();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [unlockMethod, isVerifying, pin]);

  // Clean up camera stream
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [cameraStream]);

  // Bind video stream to ref as soon as DOM element becomes available
  useEffect(() => {
    if (cameraActive && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch((err) => {
        console.warn("Attempt to autoplay live video feed failed:", err);
      });
    }
  }, [cameraStream, cameraActive]);

  // Start biometric camera
  const startCamera = async () => {
    setCameraError("");
    setScanResult("idle");
    setFrozenFrame(null);
    samplesRef.current = [];
    setVerifyProgress(0);
    setLivenessConfirmed(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 480, height: 480, facingMode: "user" }
      });
      setCameraStream(stream);
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch {
      setCameraError("Camera access unavailable. Please unlock using your 4-digit PIN.");
    }
  };

  // Face tracking loop for quick biometric unlock
  useEffect(() => {
    if (unlockMethod !== "biometric" || !cameraActive || scanResult !== "idle") return;

    let cancelled = false;
    let timerId: number | undefined;

    const step = async () => {
      if (cancelled) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        timerId = window.setTimeout(step, 300);
        return;
      }

      canvas.width = 360;
      canvas.height = 360;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, 360, 360);
      const b64 = canvas.toDataURL("image/jpeg", 0.85);

      const res = await trackLiveFaceFrame(b64, "verify", userName);
      if (cancelled) return;

      setTrackBox(res.box);
      setTrackStatus(res.status);
      setIsInPlace(res.inPlace);
      setLightingStatus(res.lighting);
      setDistanceStatus(res.distanceStatus);

      if (res.liveness?.blinkDetected) {
        setLivenessConfirmed(true);
      }

      if (!res.inPlace) {
        setLiveAdvice(res.advice);
        timerId = window.setTimeout(step, 380);
        return;
      }

      samplesRef.current.push({
        identified: res.identified,
        username: res.username,
        similarity: res.similarity ?? 0
      });

      const count = samplesRef.current.length;
      const pct = Math.min(100, Math.round((count / 4) * 100));
      setVerifyProgress(pct);

      if (count >= 4) {
        setFrozenFrame(b64);
        if (cameraStream) {
          cameraStream.getTracks().forEach((t) => t.stop());
          setCameraStream(null);
        }
        setCameraActive(false);

        // Check if identified
        const matches = samplesRef.current.filter((s) => s.identified);
        if (matches.length >= 2) {
          setScanResult("success");
          setTimeout(() => {
            onUnlockSuccess();
          }, 450);
        } else {
          setScanResult("unrecognized");
          setError("Biometric face match not recognized. Please unlock with your PIN.");
        }
        return;
      }

      setLiveAdvice("Face in position — verifying identity...");
      timerId = window.setTimeout(step, 450);
    };

    timerId = window.setTimeout(step, 450);
    return () => {
      cancelled = true;
      if (timerId) window.clearTimeout(timerId);
    };
  }, [unlockMethod, cameraActive, scanResult, userName]);

  return (
    <div
      id="wealthiq-session-lock-overlay"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn select-none"
    >
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm p-6 sm:p-7 text-center space-y-5 shadow-2xl animate-scaleUp">
        
        {/* Top Lock Badge */}
        <div className="flex flex-col items-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-capitec-blue/10 border border-capitec-blue/20 text-capitec-blue flex items-center justify-center shadow-inner">
            <Lock className="w-7 h-7 text-capitec-blue animate-soft-pulse" />
          </div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-[11px] font-semibold">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Session Auto-Locked (Inactivity Timeout)</span>
          </div>
        </div>

        {/* User Card */}
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center space-x-3 text-left">
          <div className="w-10 h-10 rounded-xl bg-capitec-blue text-white font-bold flex items-center justify-center text-sm shadow-xs">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm text-slate-800 truncate font-display">{userName}</h4>
            <p className="text-[11px] font-mono text-slate-400">Account: {maskedAcc}</p>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-500" title="Session state preserved" />
        </div>

        {/* Method Toggle */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl text-xs font-semibold relative z-20">
          <button
            type="button"
            onClick={() => {
              if (cameraStream) {
                cameraStream.getTracks().forEach((t) => t.stop());
                setCameraStream(null);
              }
              setCameraActive(false);
              setUnlockMethod("pin");
              setError("");
            }}
            className={`py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center space-x-1 ${
              unlockMethod === "pin" ? "bg-white text-capitec-blue shadow-xs font-bold" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Remote PIN</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setUnlockMethod("biometric");
              setError("");
              startCamera();
            }}
            className={`py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center space-x-1 ${
              unlockMethod === "biometric" ? "bg-white text-capitec-blue shadow-xs font-bold" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <ScanFace className="w-3.5 h-3.5" />
            <span>Face ID</span>
          </button>
        </div>

        {/* Error notice */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-semibold space-y-2 animate-pulse text-left relative z-20">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-capitec-red" />
              <span>{error}</span>
            </div>
            {error.toLowerCase().includes("locked") && (
              <button
                type="button"
                onClick={onLogout}
                className="w-full py-2 bg-capitec-red hover:bg-capitec-red-dark text-white rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Return to Login to Reset PIN via Email OTP</span>
              </button>
            )}
          </div>
        )}

        {/* PIN Entry Mode */}
        {unlockMethod === "pin" && (
          <div className="space-y-3 relative z-20">
            {/* 4-Digit Display Dots */}
            <div
              className="flex space-x-4 justify-center py-3 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer relative overflow-hidden"
              onClick={() => document.getElementById("lock-hidden-pin-input")?.focus()}
            >
              <input
                id="lock-hidden-pin-input"
                name="session_lock_pin"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={pin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  if (val.length <= 4) {
                    setError("");
                    setPin(val);
                    if (val.length === 4) verifyEnteredPin(val);
                  }
                }}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                autoFocus
              />
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full border border-slate-300 transition-all ${
                    pin[idx] ? "bg-capitec-blue scale-110 shadow-3xs" : "bg-white"
                  }`}
                />
              ))}
            </div>

            {isVerifying && (
              <p className="text-xs text-capitec-blue font-semibold animate-pulse">
                Verifying Remote PIN...
              </p>
            )}

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                <button
                  key={num}
                  type="button"
                  disabled={isVerifying}
                  onClick={() => handleKeypadPress(num)}
                  className="py-3 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 border border-slate-200 text-slate-800 font-bold text-sm rounded-xl transition active:scale-95 cursor-pointer relative z-20"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                disabled={isVerifying}
                onClick={handleClear}
                className="py-3 text-xs font-semibold text-slate-400 uppercase hover:text-slate-600 disabled:opacity-50 cursor-pointer relative z-20"
              >
                Clear
              </button>
              <button
                type="button"
                disabled={isVerifying}
                onClick={() => handleKeypadPress("0")}
                className="py-3 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 border border-slate-200 text-slate-800 font-bold text-sm rounded-xl transition active:scale-95 cursor-pointer relative z-20"
              >
                0
              </button>
              <button
                type="button"
                disabled={isVerifying}
                onClick={handleBackspace}
                className="py-3 text-sm font-semibold text-slate-400 hover:text-slate-600 disabled:opacity-50 cursor-pointer flex items-center justify-center relative z-20"
              >
                ⌫
              </button>
            </div>
          </div>
        )}

        {/* Biometric Face ID Mode */}
        {unlockMethod === "biometric" && (
          <div className="space-y-3">
            <div className="relative py-1 flex justify-center">
              <CircularFaceScanner
                videoRef={videoRef}
                cameraActive={cameraActive}
                frozenPhoto={frozenFrame}
                trackBox={trackBox}
                trackStatus={trackStatus}
                isInPlace={isInPlace}
                isCoachingWarning={false}
                progress={verifyProgress}
                inPlaceLabel="Verifying"
                distanceStatus={distanceStatus}
                lightingStatus={lightingStatus}
                livenessConfirmed={livenessConfirmed}
                overlayState={scanResult === "success" ? "success" : scanResult === "unrecognized" ? "unrecognized" : "none"}
                successTitle="Identity Confirmed"
                successSubtitle="Resuming session..."
                sizeClass="w-48 h-48"
              />
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <p className="text-xs text-slate-600 font-medium">{liveAdvice}</p>

            {cameraError && (
              <p className="text-xs text-red-600 bg-red-50 p-2 rounded-xl">{cameraError}</p>
            )}

            {!cameraActive && scanResult === "idle" && (
              <button
                type="button"
                onClick={startCamera}
                className="w-full py-2.5 bg-capitec-blue hover:bg-capitec-blue-light text-white text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Start Face Scanner</span>
              </button>
            )}
          </div>
        )}

        {/* Bottom Actions: Log out option */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 relative z-20">
          <span className="flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>SABRIC Active Shield</span>
          </span>
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center space-x-1.5 py-1 px-2.5 rounded-lg text-slate-500 hover:text-capitec-red hover:bg-red-50 transition cursor-pointer font-semibold relative z-20"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

      </div>
    </div>
  );
}
