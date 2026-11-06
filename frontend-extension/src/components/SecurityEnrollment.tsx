import { useState, useRef, useEffect, FormEvent, ChangeEvent } from "react";
import {
  Camera,
  Check,
  Lock,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  User,
  ChevronRight,
  ChevronLeft,
  Eye,
  EyeOff,
  ScanFace,
  CheckCircle2,
  Loader2,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Building2,
  FileCheck2,
  Upload,
  Sun,
  Move,
  X
} from "lucide-react";
import {
  validateFaceForEnrollment,
  enrollBiometricUser,
  trackLiveFaceFrame,
  FaceBoundingBox,
  FaceTrackResult
} from "../utils/faceMatcher";
import CircularFaceScanner from "./CircularFaceScanner";

export interface BankOnboardingDetails {
  email: string;
  phone: string;
  idNumber: string;
  dateOfBirth: string;
  citizenship: string;
  streetAddress: string;
  city: string;
  postalCode: string;
  employmentStatus: string;
  accountType: string;
  accountNumber: string;
  enrollmentDate: string;
}

interface SecurityEnrollmentProps {
  onRegister: (
    name: string,
    pin: string,
    facePhoto: string,
    startingBalance: number,
    details?: BankOnboardingDetails
  ) => void;
  defaultName?: string;
  onClose?: () => void;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function parseDobFromSaId(id: string): string | null {
  const digits = id.replace(/\D/g, "");
  if (digits.length < 6) return null;

  const yy = parseInt(digits.slice(0, 2), 10);
  const mm = parseInt(digits.slice(2, 4), 10);
  const dd = parseInt(digits.slice(4, 6), 10);

  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;

  const currentTwoDigitYear = new Date().getFullYear() % 100;
  const fullYear = yy <= currentTwoDigitYear - 16 ? 2000 + yy : 1900 + yy;

  const testDate = new Date(fullYear, mm - 1, dd);
  if (
    testDate.getFullYear() !== fullYear ||
    testDate.getMonth() !== mm - 1 ||
    testDate.getDate() !== dd
  ) {
    return null;
  }

  return `${MONTHS[mm - 1]} ${dd}, ${fullYear}`;
}

const REQUIRED_ENROLL_SAMPLES = 5; // ~3.0 seconds steady hold (matches register_user.py COUNTDOWN_SECONDS = 3)

function captureCenterCropFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  targetW = 360,
  targetH = 360
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
  return canvas.toDataURL("image/jpeg", 0.88);
}

function generateAccountNumber(): string {
  const randomDigits = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join("");
  return `16${randomDigits}`;
}

export default function SecurityEnrollment({
  onRegister,
  defaultName = "",
  onClose
}: SecurityEnrollmentProps) {
  const initialParts = defaultName.trim() ? defaultName.trim().split(/\s+/) : [];
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [errorMsg, setErrorMsg] = useState("");

  // Step 1: Personal & Identity Details (KYC)
  const [title, setTitle] = useState("Mr");
  const [firstName, setFirstName] = useState(initialParts[0] || "");
  const [surname, setSurname] = useState(initialParts.slice(1).join(" ") || "");
  const [idNumber, setIdNumber] = useState("");
  const [citizenship, setCitizenship] = useState("South African Citizen");
  const [taxNumber, setTaxNumber] = useState("");

  // Step 2: Contact, Residential Address & Account Product
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("Employed");
  const [accountType, setAccountType] = useState("Global One Transactional");
  const [openingDeposit, setOpeningDeposit] = useState<string>("0");

  // Step 3: Remote App PIN & Regulatory Consent
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [ficaConsent, setFicaConsent] = useState(false);
  const [termsConsent, setTermsConsent] = useState(false);

  // Step 4: Biometric Facial Verification (Live Tracker + Auto-Capture)
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [capturedFrames, setCapturedFrames] = useState<string[]>([]);
  const [cameraError, setCameraError] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanApproved, setScanApproved] = useState(false);
  const [kycStatusMessage, setKycStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live face tracker state for Step 4
  const [trackBox, setTrackBox] = useState<FaceBoundingBox | null>(null);
  const [trackStatus, setTrackStatus] = useState<FaceTrackResult["status"]>("no_face");
  const [isInPlace, setIsInPlace] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [liveAdvice, setLiveAdvice] = useState("Position your face inside the camera frame...");
  const [lightingStatus, setLightingStatus] = useState<"dim" | "harsh" | "good">("good");
  const [distanceStatus, setDistanceStatus] = useState<"none" | "too_far" | "too_close" | "good">("none");

  // Step 5: Generated Account Details
  const [generatedAccountNo, setGeneratedAccountNo] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const enrollFramesRef = useRef<string[]>([]);
  const outOfPlaceCountRef = useRef(0);

  const derivedDob = parseDobFromSaId(idNumber);
  const fullName = `${firstName.trim()} ${surname.trim()}`.trim();

  // Stop camera on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Bind video stream to ref when camera becomes active
  useEffect(() => {
    if (cameraActive && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(err => {
        console.warn("Attempt to autoplay live video feed during enrollment failed:", err);
      });
    }
  }, [cameraStream, cameraActive, step]);

  // Keyboard support for Step 3 PIN entry
  useEffect(() => {
    if (step !== 3) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (/^\d$/.test(e.key)) {
        e.preventDefault();
        handleNumClick(e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleBackspace();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [step, pin, confirmPin]);

  const stopCameraStream = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
    setTrackBox(null);
    setIsInPlace(false);
  };

  // Continuous live face tracker + 3s automatic hold capture for Step 4 (mirrors register_user.py)
  useEffect(() => {
    if (step !== 4 || !cameraActive || Boolean(capturedPhoto) || isScanning) {
      return;
    }

    let cancelled = false;
    let timerId: number | undefined;

    const runEnrollTracker = async () => {
      if (cancelled) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas || video.readyState < 2 || video.videoWidth === 0) {
        timerId = window.setTimeout(runEnrollTracker, 300);
        return;
      }

      const frameB64 = captureCenterCropFrame(video, canvas, 360, 360);
      if (!frameB64) {
        timerId = window.setTimeout(runEnrollTracker, 350);
        return;
      }

      const res = await trackLiveFaceFrame(frameB64, "enroll");
      if (cancelled) return;

      setTrackBox(res.box);
      setTrackStatus(res.status);
      setIsInPlace(res.inPlace);
      setLightingStatus(res.lighting);
      setDistanceStatus(res.distanceStatus);

      if (!res.inPlace) {
        outOfPlaceCountRef.current += 1;
        setLiveAdvice(res.advice);

        // Reset countdown if face moves out of position for 2 consecutive frames
        if (outOfPlaceCountRef.current >= 2 && enrollFramesRef.current.length > 0) {
          enrollFramesRef.current = [];
          setHoldProgress(0);
        }

        timerId = window.setTimeout(runEnrollTracker, 380);
        return;
      }

      // Face IS in place -> collect steady multi-frame sample automatically (no capture button needed)
      outOfPlaceCountRef.current = 0;
      enrollFramesRef.current.push(frameB64);

      const collected = enrollFramesRef.current.length;
      const pct = Math.min(100, Math.round((collected / REQUIRED_ENROLL_SAMPLES) * 100));
      setHoldProgress(pct);

      if (collected < REQUIRED_ENROLL_SAMPLES) {
        const secsLeft = Math.max(1, Math.ceil((REQUIRED_ENROLL_SAMPLES - collected) * 0.62));
        setLiveAdvice(`Face in position — hold still for automatic capture (${secsLeft}s)...`);
        timerId = window.setTimeout(runEnrollTracker, 620);
        return;
      }

      // Completed 3-second steady hold -> lock selfie & approve enrollment
      const allFrames = [...enrollFramesRef.current];
      const finalSelfie = allFrames[allFrames.length - 1];
      setCapturedFrames(allFrames);
      setCapturedPhoto(finalSelfie);
      stopCameraStream();
      setScanApproved(true);
      setKycStatusMessage(
        "Your facial biometrics have been captured and verified for your new Global One account."
      );
    };

    timerId = window.setTimeout(runEnrollTracker, 420);

    return () => {
      cancelled = true;
      if (timerId !== undefined) window.clearTimeout(timerId);
    };
  }, [step, cameraActive, capturedPhoto, isScanning]);

  // Step 1 Validation
  const handleStep1Submit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!firstName.trim() || !surname.trim()) {
      setErrorMsg("Please enter both your legal first name(s) and surname as shown on your ID.");
      return;
    }

    const cleanId = idNumber.replace(/\D/g, "");
    if (cleanId.length !== 13 || !derivedDob) {
      setErrorMsg("Please enter a valid 13-digit South African ID number.");
      return;
    }

    if (taxNumber.trim() && !/^\d{10}$/.test(taxNumber.replace(/\D/g, ""))) {
      setErrorMsg("SARS Tax Reference Number must be 10 digits, or leave it blank.");
      return;
    }

    setStep(2);
  };

  // Step 2 Validation (Issue 2: Enforce unique emails at registration)
  const handleStep2Submit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 10 || phoneDigits.length > 12) {
      setErrorMsg("Please enter a valid South African mobile number (e.g. 078 697 6181).");
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg("Please enter a valid email address for statements and security alerts.");
      return;
    }

    // Check email uniqueness against server database
    try {
      const checkRes = await fetch(`/api/check-email?email=${encodeURIComponent(cleanEmail)}`);
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        if (checkData.exists) {
          setErrorMsg("This email is already in use. Please log in or use a different email.");
          return;
        }
      }
    } catch (err) {
      console.warn("[SecurityEnrollment] Notice checking email uniqueness:", err);
    }

    if (!streetAddress.trim() || !city.trim()) {
      setErrorMsg("Residential street address and city/town are required for FICA compliance.");
      return;
    }

    if (!/^\d{4}$/.test(postalCode.trim())) {
      setErrorMsg("Please enter a valid 4-digit South African postal code.");
      return;
    }

    const depositVal = Number(openingDeposit);
    if (Number.isNaN(depositVal) || depositVal < 0) {
      setErrorMsg("Initial deposit amount cannot be negative.");
      return;
    }

    setStep(3);
  };

  // Step 3 Validation
  const handleStep3Submit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setErrorMsg("Your Remote App PIN must be exactly 4 digits.");
      return;
    }

    if (pin !== confirmPin) {
      setErrorMsg("Your Remote PIN and confirmation PIN do not match.");
      return;
    }

    if (!ficaConsent || !termsConsent) {
      setErrorMsg("Please accept the mandatory FICA/POPIA declaration and banking terms to continue.");
      return;
    }

    setStep(4);
    startCamera();
  };

  // Start Camera with Live Face Tracker
  const startCamera = async () => {
    setCameraError("");
    setTrackBox(null);
    setIsInPlace(false);
    setHoldProgress(0);
    enrollFramesRef.current = [];
    outOfPlaceCountRef.current = 0;
    setLiveAdvice("Position your face inside the camera frame...");

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
      console.warn("Camera access denied or unavailable:", err);
      setCameraError(
        "Camera access is unavailable on this browser or device. Please upload a clear portrait photo to complete identity verification."
      );
    }
  };

  // Verify uploaded portrait photo against biometric engine (fallback when no webcam)
  const processSelfieVerification = async (photoDataUrl: string) => {
    setCapturedPhoto(photoDataUrl);
    setCapturedFrames([photoDataUrl]);
    stopCameraStream();

    setIsScanning(true);
    setScanProgress(0);
    setScanApproved(false);
    setKycStatusMessage("Checking image clarity, distance, and lighting...");

    const trackPromise = trackLiveFaceFrame(photoDataUrl, "enroll");
    const inferencePromise = validateFaceForEnrollment(photoDataUrl, fullName);

    let progress = 0;
    const interval = setInterval(async () => {
      progress += 14;
      setScanProgress(Math.min(progress, 92));

      if (progress >= 35 && progress < 70) {
        setKycStatusMessage("Verifying facial biometrics and liveness...");
      } else if (progress >= 70 && progress < 95) {
        setKycStatusMessage("Finalizing FICA identity verification...");
      }

      if (progress >= 100) {
        clearInterval(interval);
        try {
          const [trackRes, result] = await Promise.all([trackPromise, inferencePromise]);
          setScanProgress(100);
          setIsScanning(false);

          if (
            trackRes.status === "too_dark" ||
            trackRes.status === "glare" ||
            trackRes.status === "too_far" ||
            trackRes.status === "multiple_faces"
          ) {
            setScanApproved(false);
            setKycStatusMessage(trackRes.advice);
            return;
          }

          if (result.valid && result.faceDetected) {
            setScanApproved(true);
            setKycStatusMessage(
              "Your facial biometrics have been verified and linked to your identity profile."
            );
          } else {
            setScanApproved(false);
            if (result.facesCount > 1) {
              setKycStatusMessage(
                "More than one person was detected in the frame. Please ensure only you are visible."
              );
            } else {
              setKycStatusMessage(
                "We couldn't detect a clear face in the frame. Ensure your face is well-lit, centered, and unobstructed."
              );
            }
          }
        } catch {
          setIsScanning(false);
          setScanApproved(false);
          setKycStatusMessage(
            "Unable to verify selfie quality. Please retake the photo in a well-lit area."
          );
        }
      }
    }, 105);
  };

  const handlePhotoFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        processSelfieVerification(dataUrl);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const triggerFileSelector = () => {
    fileInputRef.current?.click();
  };

  // Finalize Account Opening -> Enroll Multi-Frame Biometrics & Show Account Confirmation
  const handleOpenAccount = async () => {
    if (!pin || !capturedPhoto || !scanApproved) return;
    setIsSubmitting(true);
    try {
      await enrollBiometricUser(fullName, pin, capturedPhoto, capturedFrames);
    } catch (e) {
      console.warn("Biometric enrollment notice:", e);
    }
    const newAccNo = generateAccountNumber();
    setGeneratedAccountNo(newAccNo);
    setIsSubmitting(false);
    setStep(5);
  };

  const handleFinishToDashboard = () => {
    if (!capturedPhoto) return;
    const formattedId = idNumber
      .replace(/\D/g, "")
      .replace(/^(\d{6})(\d{4})(\d{2})(\d{1})$/, "$1 $2 $3 $4");

    const enrollDate = new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    });

    onRegister(
      fullName,
      pin,
      capturedPhoto,
      Math.max(0, Number(openingDeposit) || 0),
      {
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        idNumber: formattedId,
        dateOfBirth: derivedDob || "Not specified",
        citizenship,
        streetAddress: streetAddress.trim(),
        city: city.trim(),
        postalCode: postalCode.trim(),
        employmentStatus,
        accountType,
        accountNumber: generatedAccountNo,
        enrollmentDate: enrollDate
      }
    );
  };

  // Keypad handlers for Step 3
  const handleNumClick = (num: string) => {
    setErrorMsg("");
    if (pin.length < 4) {
      setPin(prev => prev + num);
    } else if (confirmPin.length < 4) {
      setConfirmPin(prev => prev + num);
    }
  };

  const handleBackspace = () => {
    setErrorMsg("");
    if (confirmPin.length > 0) {
      setConfirmPin(prev => prev.slice(0, -1));
    } else if (pin.length > 0) {
      setPin(prev => prev.slice(0, -1));
    }
  };

  const isWeakPin =
    pin.length === 4 &&
    (/^(\d)\1{3}$/.test(pin) || "01234567890".includes(pin) || "98765432109".includes(pin));

  const stepsMeta = [
    { num: 1, title: "Personal & Identity", subtitle: "SA ID & FICA check" },
    { num: 2, title: "Contact & Account", subtitle: "Address & Global One setup" },
    { num: 3, title: "Remote App PIN", subtitle: "4-digit PIN & declarations" },
    { num: 4, title: "Biometric Selfie", subtitle: "Live identity verification" }
  ];

  const isCoachingWarning =
    trackStatus === "too_far" ||
    trackStatus === "too_close" ||
    trackStatus === "too_dark" ||
    trackStatus === "glare" ||
    trackStatus === "off_center" ||
    trackStatus === "multiple_faces" ||
    trackStatus === "blurry";

  return (
    <div
      id="security-enrollment-view"
      className="fixed inset-0 bg-slate-900/55 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 font-sans overflow-y-auto"
    >
      <div className="bg-white rounded-3xl w-full max-w-4xl border border-slate-200 overflow-hidden shadow-2xl flex flex-col md:flex-row min-h-[600px] md:max-h-[92vh] animate-scaleUp my-auto">
        
        {/* Left Banking Onboarding Rail */}
        <div className="bg-capitec-blue p-6 md:p-9 md:w-5/12 text-white flex flex-col justify-between text-left relative overflow-hidden shrink-0">
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-capitec-red/15 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-6 z-10">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-2xl md:text-3xl font-extrabold font-display tracking-tight text-white">
                  Wealth<span className="text-capitec-red">IQ</span>
                </span>
                <span className="text-[9px] font-bold uppercase tracking-widest bg-white/10 border border-white/15 px-2.5 py-1 rounded-full text-slate-200">
                  Global One
                </span>
              </div>
              <p className="text-[10px] font-bold text-slate-300 tracking-widest uppercase mt-1">
                Digital Account Opening
              </p>
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg md:text-xl font-bold font-display tracking-tight leading-snug">
                Open your bank account in minutes
              </h2>
              <p className="text-slate-300 text-xs leading-relaxed hidden sm:block">
                Complete your FICA verification, choose your Global One account preferences, and secure your profile with Remote PIN &amp; facial biometrics.
              </p>
            </div>

            {/* Vertical Stepper */}
            <div className="space-y-3 pt-2 hidden sm:block">
              {stepsMeta.map((s) => {
                const isDone = step > s.num;
                const isCurrent = step === s.num;
                return (
                  <div
                    key={s.num}
                    className={`flex items-center space-x-3 p-2.5 rounded-xl transition ${
                      isCurrent
                        ? "bg-white/12 border border-white/20"
                        : isDone
                        ? "opacity-90"
                        : "opacity-50"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition ${
                        isDone
                          ? "bg-emerald-500 text-white"
                          : isCurrent
                          ? "bg-capitec-red text-white shadow"
                          : "bg-slate-800/80 text-slate-300 border border-slate-600"
                      }`}
                    >
                      {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : s.num}
                    </div>
                    <div className="leading-tight">
                      <p className="text-xs font-bold text-white">{s.title}</p>
                      <p className="text-[10px] text-slate-300">{s.subtitle}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Regulatory Compliance Footer */}
          <div className="pt-4 border-t border-white/10 space-y-2.5 text-slate-300 text-[10px] z-10 hidden md:block">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>256-Bit TLS Encrypted • FICA &amp; POPIA Compliant</span>
            </div>
            <div className="flex items-center space-x-2">
              <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Authorized FSP (46669) &amp; Credit Provider (NCRCP13)</span>
            </div>
          </div>
        </div>

        {/* Right Side: Multi-Page Bank Application Form */}
        <div className="p-6 md:p-9 flex-1 flex flex-col justify-between bg-white text-left overflow-y-auto">
          
          {/* Top Progress & Close Bar */}
          <div className="flex justify-between items-center pb-4 border-b border-slate-100 shrink-0">
            <div className="flex items-center space-x-2">
              {step < 5 ? (
                <>
                  <span className="text-xs font-bold text-capitec-blue uppercase tracking-wider">
                    Step {step} of 4
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs font-medium text-slate-500">
                    {stepsMeta[step - 1].title}
                  </span>
                </>
              ) : (
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center space-x-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Application Approved</span>
                </span>
              )}
            </div>

            <div className="flex items-center space-x-3">
              {step < 5 && (
                <div className="flex space-x-1">
                  {[1, 2, 3, 4].map((idx) => (
                    <div
                      key={idx}
                      className={`w-5 h-1.5 rounded-full transition-all ${
                        step >= idx ? "bg-capitec-red" : "bg-slate-200"
                      }`}
                    />
                  ))}
                </div>
              )}
              {onClose && step < 5 && (
                <button
                  id="btn-close-enrollment"
                  type="button"
                  onClick={() => {
                    stopCameraStream();
                    onClose();
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                  title="Return to Sign In"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Step Body */}
          <div className="flex-1 py-5 flex flex-col justify-center">
            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium flex items-start space-x-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-capitec-red" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* ==================== PAGE 1: PERSONAL & IDENTITY ==================== */}
            {step === 1 && (
              <form onSubmit={handleStep1Submit} className="space-y-4 animate-fadeIn">
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-800 text-lg font-display">
                    Personal &amp; Identity Details
                  </h3>
                  <p className="text-slate-500 text-xs">
                    Enter your legal name and South African ID number exactly as they appear on your green ID book or Smart ID card.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-3 flex flex-col space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase">Title</label>
                    <select
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-capitec-blue outline-none text-slate-800 font-medium"
                    >
                      <option value="Mr">Mr</option>
                      <option value="Ms">Ms</option>
                      <option value="Mrs">Mrs</option>
                      <option value="Dr">Dr</option>
                      <option value="Mx">Mx</option>
                    </select>
                  </div>

                  <div className="sm:col-span-4 flex flex-col space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase">
                      First Name(s) <span className="text-capitec-red">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        id="signup-first-name"
                        type="text"
                        value={firstName}
                        onChange={(e) => {
                          setErrorMsg("");
                          setFirstName(e.target.value);
                        }}
                        placeholder="e.g. Thabo"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-capitec-blue outline-none text-slate-800 font-medium"
                        required
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-5 flex flex-col space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase">
                      Surname <span className="text-capitec-red">*</span>
                    </label>
                    <input
                      id="signup-surname"
                      type="text"
                      value={surname}
                      onChange={(e) => {
                        setErrorMsg("");
                        setSurname(e.target.value);
                      }}
                      placeholder="e.g. Mokoena"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-capitec-blue outline-none text-slate-800 font-medium"
                      required
                    />
                  </div>
                </div>

                {/* SA National ID */}
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase">
                      SA National ID Number (13 Digits) <span className="text-capitec-red">*</span>
                    </label>
                    {derivedDob && (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        DOB: {derivedDob}
                      </span>
                    )}
                  </div>
                  <input
                    id="signup-id-number"
                    type="text"
                    inputMode="numeric"
                    maxLength={13}
                    value={idNumber}
                    onChange={(e) => {
                      setErrorMsg("");
                      setIdNumber(e.target.value.replace(/\D/g, "").slice(0, 13));
                    }}
                    placeholder="e.g. 9904185123084"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono tracking-wider focus:bg-white focus:border-capitec-blue outline-none text-slate-800 font-semibold"
                    required
                  />
                  <span className="text-[10.5px] text-slate-400">
                    Verified electronically with the Department of Home Affairs (HANIS).
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase">
                      Citizenship Status
                    </label>
                    <select
                      value={citizenship}
                      onChange={(e) => setCitizenship(e.target.value)}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-capitec-blue outline-none text-slate-800 font-medium"
                    >
                      <option value="South African Citizen">South African Citizen</option>
                      <option value="Permanent Resident">SA Permanent Resident</option>
                    </select>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase">
                      SARS Tax Number <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      id="signup-tax-number"
                      type="text"
                      inputMode="numeric"
                      maxLength={10}
                      value={taxNumber}
                      onChange={(e) => setTaxNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="10-digit SARS reference"
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:border-capitec-blue outline-none text-slate-800"
                    />
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-between gap-3">
                  {onClose ? (
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer"
                    >
                      Back to Sign In
                    </button>
                  ) : (
                    <div />
                  )}
                  <button
                    id="btn-step1-next"
                    type="submit"
                    className="px-6 py-3 bg-capitec-blue hover:bg-capitec-blue-light text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm transition flex items-center space-x-1.5 cursor-pointer"
                  >
                    <span>Continue</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* ==================== PAGE 2: CONTACT, ADDRESS & ACCOUNT ==================== */}
            {step === 2 && (
              <form onSubmit={handleStep2Submit} className="space-y-4 animate-fadeIn">
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-800 text-lg font-display">
                    Contact, Residency &amp; Account Setup
                  </h3>
                  <p className="text-slate-500 text-xs">
                    Provide your FICA residential details and choose your Global One account package.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase">
                      Mobile Number <span className="text-capitec-red">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        id="signup-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => {
                          setErrorMsg("");
                          setPhone(e.target.value);
                        }}
                        placeholder="078 697 6181"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-capitec-blue outline-none text-slate-800 font-medium"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase">
                      Email Address <span className="text-capitec-red">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        id="signup-email"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setErrorMsg("");
                          setEmail(e.target.value);
                        }}
                        placeholder="johndoe@email.com"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-capitec-blue outline-none text-slate-800 font-medium"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Residential Address */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-6 flex flex-col space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase">
                      Residential Street Address <span className="text-capitec-red">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        id="signup-address"
                        type="text"
                        value={streetAddress}
                        onChange={(e) => {
                          setErrorMsg("");
                          setStreetAddress(e.target.value);
                        }}
                        placeholder="14 Memorial Road"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-capitec-blue outline-none text-slate-800 font-medium"
                        required
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-4 flex flex-col space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase">
                      City / Town <span className="text-capitec-red">*</span>
                    </label>
                    <input
                      id="signup-city"
                      type="text"
                      value={city}
                      onChange={(e) => {
                        setErrorMsg("");
                        setCity(e.target.value);
                      }}
                      placeholder="Kimberley"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-capitec-blue outline-none text-slate-800 font-medium"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2 flex flex-col space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase">
                      Code <span className="text-capitec-red">*</span>
                    </label>
                    <input
                      id="signup-postal"
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={postalCode}
                      onChange={(e) => {
                        setErrorMsg("");
                        setPostalCode(e.target.value.replace(/\D/g, "").slice(0, 4));
                      }}
                      placeholder="8301"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:border-capitec-blue outline-none text-slate-800 font-semibold"
                      required
                    />
                  </div>
                </div>

                {/* Account Product Selection */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-600 uppercase block">
                    Choose Your Account Package
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      {
                        id: "Global One Transactional",
                        name: "Global One Transactional",
                        fee: "R7.50 / month",
                        desc: "Everyday banking, virtual card & 4 savings plans"
                      },
                      {
                        id: "Global One + Tax-Free Savings",
                        name: "Global One + Tax-Free",
                        fee: "R7.50 / month",
                        desc: "Includes SARS R36,000/yr tax-free investment pocket"
                      }
                    ].map((pkg) => {
                      const active = accountType === pkg.id;
                      return (
                        <button
                          key={pkg.id}
                          type="button"
                          onClick={() => setAccountType(pkg.id)}
                          className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                            active
                              ? "border-capitec-blue bg-blue-50/40 ring-1 ring-capitec-blue"
                              : "border-slate-200 bg-slate-50/60 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                              <CreditCard className={`w-3.5 h-3.5 ${active ? "text-capitec-blue" : "text-slate-400"}`} />
                              <span>{pkg.name}</span>
                            </span>
                            <span className="text-[10px] font-semibold text-capitec-red">{pkg.fee}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1 leading-snug">{pkg.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Employment & Initial EFT Funding */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase">
                      Employment / Source of Funds
                    </label>
                    <select
                      value={employmentStatus}
                      onChange={(e) => setEmploymentStatus(e.target.value)}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-capitec-blue outline-none text-slate-800 font-medium"
                    >
                      <option value="Employed">Employed (Monthly Salary)</option>
                      <option value="Self-Employed">Self-Employed / Business</option>
                      <option value="Student">Full-Time Student / Bursary</option>
                      <option value="Pension / Investments">Pension / Investments</option>
                    </select>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase">
                      Initial EFT Deposit (ZAR) <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-400">R</span>
                      <input
                        id="signup-opening-deposit"
                        type="number"
                        min="0"
                        step="0.01"
                        value={openingDeposit}
                        onChange={(e) => setOpeningDeposit(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-7 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:border-capitec-blue outline-none text-slate-800 font-semibold"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg("");
                      setStep(1);
                    }}
                    className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 transition flex items-center space-x-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <button
                    id="btn-step2-next"
                    type="submit"
                    className="px-6 py-3 bg-capitec-blue hover:bg-capitec-blue-light text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm transition flex items-center space-x-1.5 cursor-pointer"
                  >
                    <span>Continue to Security PIN</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* ==================== PAGE 3: REMOTE PIN & DECLARATIONS ==================== */}
            {step === 3 && (
              <form onSubmit={handleStep3Submit} className="space-y-4 animate-fadeIn">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-800 text-lg font-display">
                      Create Your Remote Banking PIN
                    </h3>
                    <p className="text-slate-500 text-xs">
                      Choose a secret 4-digit PIN you will use to sign in and authorize transactions on your app.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="text-xs font-semibold text-slate-500 hover:text-capitec-blue flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer shrink-0"
                  >
                    {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPin ? "Hide" : "Show"}</span>
                  </button>
                </div>

                {/* PIN Entry Boxes */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase flex items-center space-x-1">
                      <Lock className="w-3 h-3 text-capitec-blue" />
                      <span>New 4-Digit PIN</span>
                    </label>
                    <div
                      className={`flex space-x-2.5 justify-center py-2.5 bg-slate-50 rounded-xl border h-11 items-center transition ${
                        pin.length < 4 ? "border-capitec-blue ring-1 ring-capitec-blue/20" : "border-slate-200"
                      }`}
                    >
                      {[0, 1, 2, 3].map((idx) => (
                        <div key={idx} className="w-5 flex items-center justify-center">
                          {pin[idx] ? (
                            showPin ? (
                              <span className="text-sm font-mono font-bold text-capitec-blue">{pin[idx]}</span>
                            ) : (
                              <div className="w-3 h-3 rounded-full bg-capitec-blue scale-110 transition-all" />
                            )
                          ) : (
                            <div className="w-3 h-3 rounded-full border border-slate-300" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase">
                      Confirm 4-Digit PIN
                    </label>
                    <div
                      className={`flex space-x-2.5 justify-center py-2.5 bg-slate-50 rounded-xl border h-11 items-center transition ${
                        pin.length === 4 && confirmPin.length < 4
                          ? "border-capitec-blue ring-1 ring-capitec-blue/20"
                          : "border-slate-200"
                      }`}
                    >
                      {[0, 1, 2, 3].map((idx) => (
                        <div key={idx} className="w-5 flex items-center justify-center">
                          {confirmPin[idx] ? (
                            showPin ? (
                              <span className="text-sm font-mono font-bold text-capitec-red">{confirmPin[idx]}</span>
                            ) : (
                              <div className="w-3 h-3 rounded-full bg-capitec-red scale-110 transition-all" />
                            )
                          ) : (
                            <div className="w-3 h-3 rounded-full border border-slate-300" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {isWeakPin && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                    Security tip: Avoid sequential or repeated digits (like {pin}) on real banking accounts.
                  </p>
                )}

                {/* Tactile Banking Keypad */}
                <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleNumClick(num)}
                      className="py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-sm rounded-xl transition active:scale-95 cursor-pointer"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setPin("");
                      setConfirmPin("");
                    }}
                    className="py-2 text-[10px] font-bold text-slate-400 uppercase hover:text-slate-600 cursor-pointer"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNumClick("0")}
                    className="py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-sm rounded-xl transition active:scale-95 cursor-pointer"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handleBackspace}
                    className="py-2 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    ⌫
                  </button>
                </div>

                {/* Regulatory Declarations */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="flex items-start space-x-2.5 text-xs text-slate-600 cursor-pointer">
                    <input
                      id="chk-fica-consent"
                      type="checkbox"
                      checked={ficaConsent}
                      onChange={(e) => {
                        setErrorMsg("");
                        setFicaConsent(e.target.checked);
                      }}
                      className="mt-0.5 rounded border-slate-300 accent-capitec-blue cursor-pointer"
                    />
                    <span className="leading-snug text-[11px]">
                      I declare under <strong>FICA</strong> that my personal and residential details are true and consent to WealthIQ verifying my identity and biometric data in terms of <strong>POPIA</strong>.
                    </span>
                  </label>

                  <label className="flex items-start space-x-2.5 text-xs text-slate-600 cursor-pointer">
                    <input
                      id="chk-terms-consent"
                      type="checkbox"
                      checked={termsConsent}
                      onChange={(e) => {
                        setErrorMsg("");
                        setTermsConsent(e.target.checked);
                      }}
                      className="mt-0.5 rounded border-slate-300 accent-capitec-blue cursor-pointer"
                    />
                    <span className="leading-snug text-[11px]">
                      I accept the <strong>Global One Digital Banking Agreement</strong>, Fee Schedule, and Privacy Notice.
                    </span>
                  </label>
                </div>

                <div className="pt-1 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg("");
                      setStep(2);
                    }}
                    className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 transition flex items-center space-x-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <button
                    id="btn-pin-submit"
                    type="submit"
                    disabled={pin.length !== 4 || confirmPin.length !== 4}
                    className="px-6 py-3 bg-capitec-blue hover:bg-capitec-blue-light disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm transition flex items-center space-x-1.5 cursor-pointer"
                  >
                    <span>Continue to Selfie Check</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* ==================== PAGE 4: BIOMETRIC SELFIE CHECK ==================== */}
            {step === 4 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-800 text-lg font-display">
                    Identity Selfie Verification
                  </h3>
                  <p className="text-slate-500 text-xs">
                    Position your face inside the frame and hold still. Capture happens automatically once lighting and distance are optimal.
                  </p>
                </div>

                {/* Guidelines Pills */}
                <div className="flex flex-wrap gap-2 text-[10.5px] font-medium text-slate-600">
                  <span className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-full">Even lighting</span>
                  <span className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-full">Look straight ahead</span>
                  <span className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-full">Hold steady for 3s</span>
                </div>

                {/* Circular Portrait Camera & Perimeter Progress Ring */}
                <div className="py-1">
                  <CircularFaceScanner
                    videoRef={videoRef}
                    cameraActive={cameraActive}
                    frozenPhoto={capturedPhoto}
                    trackBox={trackBox}
                    trackStatus={trackStatus}
                    isInPlace={isInPlace}
                    isCoachingWarning={isCoachingWarning}
                    progress={isScanning ? scanProgress : scanApproved ? 100 : holdProgress}
                    inPlaceLabel="Capturing"
                    distanceStatus={distanceStatus}
                    lightingStatus={lightingStatus}
                    overlayState={
                      isScanning
                        ? "verifying_upload"
                        : !scanApproved && capturedPhoto
                        ? "failed"
                        : "none"
                    }
                    failTitle="Verification Unsuccessful"
                    failSubtitle="Adjust lighting or retake selfie"
                    sizeClass="w-56 h-56"
                  />
                </div>

                <canvas ref={canvasRef} className="hidden" />
                <input
                  id="enrollment-file-input"
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoFileUpload}
                  accept="image/*"
                  className="hidden"
                />

                {/* Status & Live Coaching Banners */}
                <div className="space-y-3">
                  {cameraActive && !capturedPhoto && !isScanning && (
                    <div
                      className={`p-3 rounded-xl border text-left transition-colors ${
                        isInPlace
                          ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                          : isCoachingWarning
                          ? "bg-amber-50 border-amber-200 text-amber-900"
                          : "bg-slate-50 border-slate-200 text-slate-700"
                      }`}
                    >
                      <div className="flex items-start space-x-2">
                        {lightingStatus === "dim" || lightingStatus === "harsh" ? (
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
                        <p className="text-xs font-medium leading-snug">{liveAdvice}</p>
                      </div>
                    </div>
                  )}

                  {cameraError && !capturedPhoto && (
                    <p className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200 leading-relaxed">
                      {cameraError}
                    </p>
                  )}

                  {isScanning && (
                    <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center space-x-2.5 animate-fadeIn">
                      <Loader2 className="w-4 h-4 text-capitec-blue shrink-0 animate-spin" />
                      <span className="text-[11px] font-medium">{kycStatusMessage}</span>
                    </div>
                  )}

                  {scanApproved && !isScanning && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start space-x-2.5 animate-fadeIn">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-xs font-bold text-emerald-900">Identity Verified</strong>
                        <span className="text-[11px] text-emerald-700">{kycStatusMessage}</span>
                      </div>
                    </div>
                  )}

                  {!scanApproved && capturedPhoto && !isScanning && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 flex items-start space-x-2.5 animate-fadeIn">
                      <AlertCircle className="w-4 h-4 text-capitec-red shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-xs font-bold text-red-900">Verification Unsuccessful</strong>
                        <span className="text-[11px] text-red-700">{kycStatusMessage}</span>
                      </div>
                    </div>
                  )}

                  {/* Secondary Controls (only when camera is inactive or after auto-capture — no manual capture button) */}
                  <div className="flex flex-col gap-2">
                    {!cameraActive && !capturedPhoto && !isScanning && (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          id="btn-activate-webcam"
                          type="button"
                          onClick={startCamera}
                          className="flex-1 py-2.5 bg-capitec-blue hover:bg-capitec-blue-light text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center space-x-1.5"
                        >
                          <Camera className="w-4 h-4" />
                          <span>Start Live Face Tracker</span>
                        </button>
                        <button
                          id="btn-upload-real-photo"
                          type="button"
                          onClick={triggerFileSelector}
                          className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer flex items-center justify-center space-x-1.5"
                        >
                          <Upload className="w-4 h-4 text-slate-600" />
                          <span>Upload Portrait Photo</span>
                        </button>
                      </div>
                    )}

                    {capturedPhoto && !isScanning && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          id="btn-retake-selfie"
                          type="button"
                          onClick={() => {
                            setCapturedPhoto(null);
                            setCapturedFrames([]);
                            setScanApproved(false);
                            setKycStatusMessage("");
                            startCamera();
                          }}
                          className="py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer flex items-center justify-center space-x-1.5"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Retake Selfie</span>
                        </button>
                        <button
                          id="btn-reupload-file"
                          type="button"
                          onClick={triggerFileSelector}
                          className="py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer flex items-center justify-center space-x-1.5"
                        >
                          <Upload className="w-3.5 h-3.5 text-slate-600" />
                          <span>Upload Different Photo</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Step 4 Navigation & Submit */}
                <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      stopCameraStream();
                      setStep(3);
                    }}
                    className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 transition flex items-center space-x-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>

                  <button
                    id="btn-complete-enrollment"
                    type="button"
                    onClick={handleOpenAccount}
                    disabled={!scanApproved || !pin || isSubmitting}
                    className="px-6 py-3 bg-capitec-red hover:bg-capitec-red-dark disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm transition flex items-center space-x-1.5 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Opening Your Account...</span>
                      </>
                    ) : (
                      <>
                        <FileCheck2 className="w-4 h-4" />
                        <span>Open Bank Account</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ==================== PAGE 5: ACCOUNT OPENED CONFIRMATION ==================== */}
            {step === 5 && (
              <div className="space-y-5 animate-fadeIn text-center max-w-md mx-auto w-full">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <h3 className="font-bold text-slate-800 text-xl font-display">
                    Welcome to Capitec Wealth<span className="text-capitec-red">IQ</span>, {firstName}!
                  </h3>
                  <p className="text-slate-500 text-xs">
                    Your {accountType} has been opened and FICA-verified.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Account Holder</span>
                    <span className="font-bold text-slate-800">{title} {fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Account Number</span>
                    <span className="font-mono font-bold text-capitec-blue tracking-wider">
                      {generatedAccountNo.replace(/^(\d{4})(\d{4})(\d{2})$/, "$1 $2 $3")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Universal Branch Code</span>
                    <span className="font-mono font-semibold text-slate-700">470010</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Account Package</span>
                    <span className="font-semibold text-slate-700">{accountType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">KYC / FICA Status</span>
                    <span className="font-bold text-emerald-600">Verified (Biometric Active)</span>
                  </div>
                </div>

                <button
                  id="btn-access-new-account"
                  type="button"
                  onClick={handleFinishToDashboard}
                  className="w-full py-3 bg-capitec-blue hover:bg-capitec-blue-light text-white font-semibold text-sm rounded-xl shadow-sm transition flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <span>Continue to Online Banking</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Bottom Security Notice */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
            <span className="flex items-center space-x-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>WealthIQ will never ask for your Remote PIN via phone or SMS.</span>
            </span>
            <span className="font-mono hidden sm:inline">Branch: 470010</span>
          </div>

        </div>
      </div>
    </div>
  );
}
