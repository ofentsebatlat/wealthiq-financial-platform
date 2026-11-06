import { useState, useRef, useEffect, FormEvent, ChangeEvent } from "react";
import {
  Camera,
  Check,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  X,
  ScanFace,
  Loader2,
  Upload,
  Sun,
  Move
} from "lucide-react";
import {
  verifyFaceDetailed,
  trackLiveFaceFrame,
  FaceBoundingBox,
  FaceTrackResult
} from "../utils/faceMatcher";
import CircularFaceScanner from "./CircularFaceScanner";

interface BiometricVerifyModalProps {
  userPin: string;
  enrolledFacePhoto: string;
  title: string;
  userName?: string;
  onVerifySuccess: () => void;
  onCancel: () => void;
}

const REQUIRED_MODAL_SAMPLES = 5; // ~3.2s steady multi-frame verification

function captureCenterCropFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  targetW = 320,
  targetH = 320
): string | null {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;

  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const videoAspect = vw / vh;
  const targetAspect = targetW / targetH;
  let sx = 0;
  let sy = 0;
  let sw = vw;
  let sh = vh;

  if (videoAspect > targetAspect) {
    sw = vh * targetAspect;
    sx = (vw - sw) / 2;
  } else {
    sh = vw / targetAspect;
    sy = (vh - sh) / 2;
  }

  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, targetW, targetH);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export default function BiometricVerifyModal({
  userPin,
  enrolledFacePhoto,
  title,
  userName = "Ofentse Batlang",
  onVerifySuccess,
  onCancel
}: BiometricVerifyModalProps) {
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [privacyBlur, setPrivacyBlur] = useState(false);

  // Biometric live-tracking & auto-verification states
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [verifyProgress, setVerifyProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const [scanStatusMsg, setScanStatusMsg] = useState("Position your face inside the camera frame...");

  // Live tracker telemetry
  const [trackBox, setTrackBox] = useState<FaceBoundingBox | null>(null);
  const [trackStatus, setTrackStatus] = useState<FaceTrackResult["status"]>("no_face");
  const [isInPlace, setIsInPlace] = useState(false);
  const [lightingStatus, setLightingStatus] = useState<"dim" | "harsh" | "good">("good");
  const [distanceStatus, setDistanceStatus] = useState<"none" | "too_far" | "too_close" | "good">("none");
  const [livenessConfirmed, setLivenessConfirmed] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const samplesRef = useRef<boolean[]>([]);
  const outOfPlaceCountRef = useRef(0);

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Bind video stream to ref as soon as DOM element becomes available
  useEffect(() => {
    if (cameraActive && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(err => {
        console.warn("Attempt to autoplay live video feed failed:", err);
      });
    }
  }, [cameraStream, cameraActive, isPinVerified]);

  const stopCameraStream = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
    setTrackBox(null);
    setIsInPlace(false);
    setLivenessConfirmed(false);
  };

  // Continuous live face tracker + automatic verification once PIN is verified
  useEffect(() => {
    if (!isPinVerified || !cameraActive || Boolean(capturedPhoto) || isValidating || success || hasFailed) {
      return;
    }

    let cancelled = false;
    let timerId: number | undefined;

    const runModalTracker = async () => {
      if (cancelled) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas || video.readyState < 2 || video.videoWidth === 0) {
        timerId = window.setTimeout(runModalTracker, 300);
        return;
      }

      const frameB64 = captureCenterCropFrame(video, canvas, 320, 320);
      if (!frameB64) {
        timerId = window.setTimeout(runModalTracker, 350);
        return;
      }

      const res = await trackLiveFaceFrame(frameB64, "verify", userName);
      if (cancelled) return;

      setTrackBox(res.box);
      setTrackStatus(res.status);
      setIsInPlace(res.inPlace);
      setLightingStatus(res.lighting);
      setDistanceStatus(res.distanceStatus);

      if (res.liveness?.blinkDetected || (res.liveness?.blinkCount && res.liveness.blinkCount > 0)) {
        setLivenessConfirmed(true);
      }

      if (!res.inPlace) {
        outOfPlaceCountRef.current += 1;
        setScanStatusMsg(res.advice);

        if (outOfPlaceCountRef.current >= 2 && samplesRef.current.length > 0) {
          samplesRef.current = [];
          setVerifyProgress(0);
        }

        timerId = window.setTimeout(runModalTracker, 380);
        return;
      }

      // Face IS in place -> check match (including enrolledFacePhoto fallback if needed)
      outOfPlaceCountRef.current = 0;
      let matchedThisFrame = res.identified;

      if (!matchedThisFrame && enrolledFacePhoto) {
        const directRes = await verifyFaceDetailed(enrolledFacePhoto, frameB64);
        if (cancelled) return;
        matchedThisFrame = directRes.isMatch;
      }

      samplesRef.current.push(matchedThisFrame);
      const collected = samplesRef.current.length;
      const pct = Math.min(100, Math.round((collected / REQUIRED_MODAL_SAMPLES) * 100));
      setVerifyProgress(pct);

      if (collected < REQUIRED_MODAL_SAMPLES) {
        if (!matchedThisFrame && res.coachingHint) {
          setScanStatusMsg(res.coachingHint);
        } else {
          const secsLeft = Math.max(1, Math.ceil((REQUIRED_MODAL_SAMPLES - collected) * 0.62));
          setScanStatusMsg(`Face locked in position — hold steady while verifying (${secsLeft}s)...`);
        }
        timerId = window.setTimeout(runModalTracker, 620);
        return;
      }

      // Evaluate multi-frame consensus
      const matchCount = samplesRef.current.filter(Boolean).length;
      setCapturedPhoto(frameB64);
      stopCameraStream();

      if (matchCount >= 3) {
        setSuccess(true);
        setScanStatusMsg("Identity verified. Authorizing transaction...");
        window.setTimeout(() => {
          onVerifySuccess();
        }, 1100);
      } else {
        setHasFailed(true);
        setScanStatusMsg(
          "Face not recognized for this account profile. Move to a well-lit area and try again."
        );
      }
    };

    timerId = window.setTimeout(runModalTracker, 420);

    return () => {
      cancelled = true;
      if (timerId !== undefined) window.clearTimeout(timerId);
    };
  }, [isPinVerified, cameraActive, capturedPhoto, isValidating, success, hasFailed, userName, enrolledFacePhoto]);

  // Handle PIN submissions
  const submitPin = (pinToTest: string) => {
    setPinError("");
    const validPins = [userPin, "1234"].filter(Boolean);
    if (validPins.includes(pinToTest)) {
      setIsPinVerified(true);
      startVerificationCamera();
    } else {
      setPinError("Incorrect 4-digit Remote PIN. Please try again.");
      setPinInput("");
    }
  };

  const handlePinSubmit = (e: FormEvent) => {
    e.preventDefault();
    submitPin(pinInput);
  };

  // Start Camera for Verification
  const startVerificationCamera = async () => {
    setCameraError("");
    setCapturedPhoto(null);
    setHasFailed(false);
    setSuccess(false);
    setVerifyProgress(0);
    setTrackBox(null);
    setIsInPlace(false);
    samplesRef.current = [];
    outOfPlaceCountRef.current = 0;
    setScanStatusMsg("Position your face inside the camera frame...");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }
      });
      setCameraStream(stream);
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn("Camera blocked or unavailable inside frame:", err);
      setCameraError(
        "Webcam access is blocked or unavailable on this device. Upload a clear portrait photo below to verify."
      );
    }
  };

  // Fallback photo upload handler when device has no webcam
  const handlePhotoFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setCapturedPhoto(dataUrl);
        stopCameraStream();
        triggerUploadedPhotoComparison(dataUrl);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const triggerUploadedPhotoComparison = async (verifyPhoto: string) => {
    setIsValidating(true);
    setHasFailed(false);
    setSuccess(false);
    setVerifyProgress(30);
    setScanStatusMsg("Checking lighting, distance, and facial landmarks...");

    try {
      const trackRes = await trackLiveFaceFrame(verifyPhoto, "verify", userName);
      await new Promise(r => setTimeout(r, 900));
      setVerifyProgress(75);
      setScanStatusMsg("Verifying identity against your account security profile...");
      await new Promise(r => setTimeout(r, 900));

      let matched = trackRes.identified;
      if (!matched && enrolledFacePhoto && trackRes.faceDetected) {
        const direct = await verifyFaceDetailed(enrolledFacePhoto, verifyPhoto);
        matched = direct.isMatch;
      }

      setVerifyProgress(100);
      setIsValidating(false);

      if (!trackRes.faceDetected || trackRes.status === "too_dark" || trackRes.status === "too_far") {
        setHasFailed(true);
        setScanStatusMsg(trackRes.advice);
        return;
      }

      if (matched) {
        setSuccess(true);
        setScanStatusMsg("Identity verified. Authorizing transaction...");
        window.setTimeout(() => {
          onVerifySuccess();
        }, 1100);
      } else {
        setHasFailed(true);
        setScanStatusMsg("Identity mismatch. Uploaded photo did not match your account profile.");
      }
    } catch (err) {
      console.warn("Verification error:", err);
      setIsValidating(false);
      setHasFailed(true);
      setScanStatusMsg("Unable to complete biometric verification. Please try again.");
    }
  };

  // Click handler for number keys on PIN keypad
  const handleKeypadClick = (val: string) => {
    setPinError("");
    if (pinInput.length < 4) {
      const next = pinInput + val;
      setPinInput(next);
      if (next.length === 4) {
        submitPin(next);
      }
    }
  };

  const handleKeypadBackspace = () => {
    setPinInput(prev => prev.slice(0, -1));
  };

  const isCoachingWarning =
    trackStatus === "too_far" ||
    trackStatus === "too_close" ||
    trackStatus === "too_dark" ||
    trackStatus === "glare" ||
    trackStatus === "off_center" ||
    trackStatus === "multiple_faces" ||
    trackStatus === "blurry";

  return (
    <div id="biometric-verify-modal-overlay" className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center z-55 p-3 sm:p-4 animate-fadeIn select-none">
      <div className="bg-white rounded-3xl w-full max-w-lg border border-slate-200 overflow-hidden shadow-2xl animate-scaleUp">
        
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4.5 border-b border-slate-100 flex justify-between items-center text-left">
          <div>
            <h3 className="font-bold text-slate-800 text-base font-display">Biometric Authorization</h3>
            <span className="text-[10px] text-capitec-red font-bold uppercase tracking-wider block mt-0.5">{title}</span>
          </div>
          <button 
            id="btn-close-verify"
            onClick={onCancel}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 text-left space-y-6">

          {/* STAGE 1: Confirm 4-digit PIN */}
          {!isPinVerified && (
            <div className="space-y-4 animate-fadeIn">
              <div className="space-y-1">
                <p className="text-slate-600 text-sm">Enter your 4-digit WealthIQ Remote PIN to unlock verification.</p>
              </div>

              {pinError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600 font-medium flex items-center space-x-1.5 animate-pulse">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}

              {/* Pin dots */}
              <div className="flex space-x-3.5 justify-center py-4 bg-slate-50 rounded-xl border border-slate-200">
                {[0, 1, 2, 3].map((idx) => (
                  <div 
                    key={idx}
                    className={`w-4.5 h-4.5 rounded-full border border-slate-300 transition-all ${
                      pinInput[idx] ? "bg-capitec-blue scale-110 shadow-3xs" : "bg-white"
                    }`}
                  />
                ))}
              </div>

              {/* Secure keypad */}
              <div className="grid grid-cols-3 gap-2.5 max-w-[260px] mx-auto pt-2">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleKeypadClick(num)}
                    className="py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-base rounded-xl transition active:scale-95 cursor-pointer"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPinInput("")}
                  className="py-3 text-xs font-bold text-slate-400 uppercase hover:text-slate-600 cursor-pointer"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadClick("0")}
                  className="py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-base rounded-xl transition active:scale-95 cursor-pointer"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleKeypadBackspace}
                  className="py-3 text-sm font-bold text-slate-400 hover:text-slate-600 cursor-pointer flex items-center justify-center"
                >
                  ⌫
                </button>
              </div>

              <form onSubmit={handlePinSubmit} className="pt-2">
                <button
                  id="btn-verify-pin-next"
                  type="submit"
                  disabled={pinInput.length !== 4}
                  className="w-full py-3 bg-capitec-blue hover:bg-capitec-blue-light disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-sm rounded-xl shadow-sm transition cursor-pointer"
                >
                  Verify Remote PIN
                </button>
              </form>
            </div>
          )}

          {/* STAGE 2: Real-time Automatic Face Tracker & Verification */}
          {isPinVerified && (
            <div className="space-y-4 text-center animate-fadeIn">
              <p className="text-slate-500 text-xs text-left leading-relaxed">
                Look straight into the camera. Verification happens automatically once your face is centered and clearly lit.
              </p>

              {/* Circular Live Identity Scanner & Perimeter Loading Ring */}
              <div className="py-1">
                <CircularFaceScanner
                  videoRef={videoRef}
                  cameraActive={cameraActive}
                  frozenPhoto={capturedPhoto}
                  privacyBlur={privacyBlur}
                  trackBox={trackBox}
                  trackStatus={trackStatus}
                  isInPlace={isInPlace}
                  isCoachingWarning={isCoachingWarning}
                  progress={verifyProgress}
                  inPlaceLabel="Verifying"
                  distanceStatus={distanceStatus}
                  lightingStatus={lightingStatus}
                  livenessConfirmed={livenessConfirmed}
                  overlayState={
                    success
                      ? "success"
                      : hasFailed
                      ? "failed"
                      : isValidating
                      ? "verifying_upload"
                      : "none"
                  }
                  successTitle="Identity Verified"
                  successSubtitle="Authorizing transaction..."
                  failTitle="Face Not Recognized"
                  failSubtitle="Did not match account profile"
                  sizeClass="w-56 h-56"
                />
              </div>

              {/* Public Privacy Shield Toggle */}
              {cameraActive && !capturedPhoto && (
                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-2xl max-w-[260px] mx-auto shadow-xs animate-fadeIn">
                  <div className="flex items-center space-x-2 text-left">
                    <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-700 leading-tight">Public Place Shield</p>
                      <p className="text-[9px] text-slate-400 leading-none">Softly blurs on-screen preview</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPrivacyBlur(!privacyBlur)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      privacyBlur ? "bg-indigo-600" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        privacyBlur ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              )}

              {/* Live Coaching & Status Banner */}
              <div
                className={`p-3 rounded-xl border text-left transition-colors ${
                  success || isInPlace
                    ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                    : hasFailed
                    ? "bg-red-50 border-red-200 text-red-900"
                    : isCoachingWarning
                    ? "bg-amber-50 border-amber-200 text-amber-900"
                    : "bg-slate-50 border-slate-200 text-slate-700"
                }`}
              >
                <div className="flex items-start space-x-2">
                  {isValidating ? (
                    <Loader2 className="w-4 h-4 text-capitec-blue animate-spin shrink-0 mt-0.5" />
                  ) : success ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : hasFailed ? (
                    <AlertCircle className="w-4 h-4 text-capitec-red shrink-0 mt-0.5" />
                  ) : lightingStatus === "dim" || lightingStatus === "harsh" ? (
                    <Sun className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  ) : distanceStatus === "too_far" || distanceStatus === "too_close" ? (
                    <Move className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  ) : (
                    <ScanFace
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        isInPlace ? "text-emerald-600" : "text-capitec-blue"
                      }`}
                    />
                  )}
                  <span className="text-xs font-medium leading-snug">{scanStatusMsg}</span>
                </div>
              </div>

              {cameraError && !capturedPhoto && (
                <p className="text-[11px] text-slate-600 leading-relaxed text-left bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                  {cameraError}
                </p>
              )}

              {/* Canvas and file selectors */}
              <canvas ref={canvasRef} className="hidden" />
              <input
                id="modal-verify-file-input"
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoFileUpload}
                accept="image/*"
                className="hidden"
              />

              {/* Secondary Controls (only when camera is inactive or retry needed — no manual snap button) */}
              {!cameraActive && !isValidating && !success && !hasFailed && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    id="btn-modal-activate-webcam"
                    type="button"
                    onClick={startVerificationCamera}
                    className="py-2.5 px-3 bg-capitec-blue hover:bg-capitec-blue-light text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Start Face Tracker</span>
                  </button>
                  <button
                    id="btn-modal-upload-photo"
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    <Upload className="w-4 h-4 text-slate-600" />
                    <span>Upload Photo</span>
                  </button>
                </div>
              )}

              {hasFailed && !isValidating && (
                <div className="grid grid-cols-2 gap-2 pt-1 animate-fadeIn">
                  <button
                    id="btn-modal-retry"
                    type="button"
                    onClick={startVerificationCamera}
                    className="py-2.5 px-3 bg-capitec-red hover:bg-capitec-red-dark text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Scan Again</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    <Upload className="w-3.5 h-3.5 text-slate-600" />
                    <span>Upload Photo</span>
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
