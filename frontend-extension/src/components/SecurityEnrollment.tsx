import { useState, useRef, useEffect, FormEvent, ChangeEvent } from "react";
import { 
  Camera, 
  Check, 
  Lock, 
  ShieldCheck, 
  AlertCircle, 
  RefreshCw, 
  Key, 
  User,
  Sparkles,
  ChevronRight,
  Eye,
  EyeOff,
  ScanFace,
  CheckCircle2,
  Cpu,
  Loader2
} from "lucide-react";
import { 
  validateFaceForEnrollment, 
  enrollBiometricUser, 
  FaceEnrollmentValidationResult 
} from "../utils/faceMatcher";

interface SecurityEnrollmentProps {
  onRegister: (name: string, pin: string, facePhoto: string, startingBalance: number) => void;
  defaultName?: string;
  onClose?: () => void;
}

export default function SecurityEnrollment({
  onRegister,
  defaultName = "Ofentse Batlang",
  onClose
}: SecurityEnrollmentProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState(defaultName);
  const [startingBalance, setStartingBalance] = useState<number>(36546.55);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Step 2 Camera States & Facial Model AI evaluation
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanApproved, setScanApproved] = useState(false);
  const [validationResult, setValidationResult] = useState<FaceEnrollmentValidationResult | null>(null);
  const [modelFeedback, setModelFeedback] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stop camera on unmount
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
        console.warn("Attempt to autoplay live video feed during enrollment failed:", err);
      });
    }
  }, [cameraStream, cameraActive, step]);

  // Handle Step 1 Submit (PIN Setup)
  const handlePinSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!name.trim()) {
      setErrorMsg("Full name is required.");
      return;
    }
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setErrorMsg("Remote PIN must be exactly 4 digits.");
      return;
    }
    if (pin !== confirmPin) {
      setErrorMsg("PINs do not match. Please verify.");
      return;
    }

    setStep(2);
    startCamera();
  };

  // Start Camera
  const startCamera = async () => {
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 400, height: 400, facingMode: "user" }
      });
      setCameraStream(stream);
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.warn("Camera access denied or unavailable inside frame:", err);
      setCameraError(
        "Webcam video stream blocked or unavailable in your browser security sandbox. Please select and upload a real picture of yourself from your computer instead!"
      );
    }
  };

  // Run face registration using the Deep Metric Facial Model (identical to ModelsTab & backend)
  const processPhotoWithFacialModel = async (photoDataUrl: string) => {
    setCapturedPhoto(photoDataUrl);
    setCameraActive(false);
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }

    setIsScanning(true);
    setScanProgress(0);
    setScanApproved(false);
    setValidationResult(null);
    setModelFeedback("Running Facial Recognition Model (dlib Deep Metric ResNet-34)...");

    // Start model inference in background
    const inferencePromise = validateFaceForEnrollment(photoDataUrl, name);

    let progress = 0;
    const interval = setInterval(async () => {
      progress += 12;
      setScanProgress(Math.min(progress, 90));

      if (progress >= 30 && progress < 60) {
        setModelFeedback("Detecting facial landmarks and eye/jaw coordinate vectors...");
      } else if (progress >= 60 && progress < 90) {
        setModelFeedback("Computing 128-dimensional Deep Metric facial embeddings...");
      }

      if (progress >= 100) {
        clearInterval(interval);
        try {
          const result = await inferencePromise;
          setScanProgress(100);
          setIsScanning(false);
          setValidationResult(result);

          if (result.valid && result.faceDetected) {
            setScanApproved(true);
            setModelFeedback(result.advice || "Facial structure verified by Deep Metric AI model. 128-D vector extracted.");
          } else {
            setScanApproved(false);
            setModelFeedback(result.advice || "No face detected in capture. Please look directly into the camera in good lighting.");
          }
        } catch (err: any) {
          setIsScanning(false);
          setScanApproved(false);
          setModelFeedback("Biometric verification notice: " + (err.message || "Failed to parse face image."));
        }
      }
    }, 110);
  };

  // Capture Image from Video Stream
  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    
    if (context) {
      canvas.width = video.videoWidth || 400;
      canvas.height = video.videoHeight || 400;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/png");
      processPhotoWithFacialModel(dataUrl);
    }
  };

  // Real device photo upload
  const handlePhotoFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        processPhotoWithFacialModel(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileSelector = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Complete Onboarding Registration with Biometric Persistence
  const handleCompleteRegistration = async () => {
    if (pin && capturedPhoto && scanApproved) {
      setIsSubmitting(true);
      try {
        await enrollBiometricUser(name, pin, capturedPhoto);
      } catch (e) {
        console.warn("Enroll notice:", e);
      }
      setIsSubmitting(false);
      onRegister(name, pin, capturedPhoto, startingBalance);
    }
  };

  // Handle number pad clicks for PIN entry
  const handleNumClick = (num: string) => {
    setErrorMsg("");
    if (step === 1) {
      if (pin.length < 4) {
        setPin(prev => prev + num);
      } else if (confirmPin.length < 4) {
        setConfirmPin(prev => prev + num);
      }
    }
  };

  const handleBackspace = () => {
    if (step === 1) {
      if (confirmPin.length > 0) {
        setConfirmPin(prev => prev.slice(0, -1));
      } else if (pin.length > 0) {
        setPin(prev => prev.slice(0, -1));
      }
    }
  };

  return (
    <div id="security-enrollment-view" className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-xl border border-slate-200 overflow-hidden shadow-2xl flex flex-col md:flex-row h-auto md:h-[580px] animate-scaleUp">
        
        {/* Left Side: Branded welcome banner */}
        <div className="bg-capitec-blue p-8 md:w-5/12 text-white flex flex-col justify-between text-left relative overflow-hidden">
          {/* Logo Accents */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-capitec-red/10 rounded-full blur-2xl"></div>
          
          <div className="space-y-6">
            <span className="bg-slate-900/40 text-white text-[10px] font-bold tracking-widest px-3 py-1 rounded-full uppercase">
              Capitec Wealth<span className="text-capitec-red font-extrabold">IQ</span>
            </span>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold font-display tracking-tight leading-tight">
                Mandatory Remote Security Enrollment
              </h2>
              <p className="text-slate-300 text-xs leading-relaxed">
                We safeguard your money with enterprise biometric verification. Establish your Secure Remote PIN and Face Identity to enable digital cards.
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100/10 space-y-3.5 text-[11px] text-slate-300">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>SABRIC Certified Security</span>
            </div>
            <div className="flex items-center space-x-2">
              <Key className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Tokenized Card Pin Guard</span>
            </div>
          </div>
        </div>

        {/* Right Side: Step Contents */}
        <div className="p-8 flex-1 flex flex-col justify-between bg-white text-left overflow-y-auto">
          
          {/* Progress Header */}
          <div className="flex justify-between items-center pb-4 border-b border-slate-100 shrink-0">
            <span className="text-xs font-bold text-slate-400 uppercase">
              Step {step} of 2
            </span>
            <div className="flex items-center space-x-3">
              <div className="flex space-x-1">
                <div className={`w-6 h-1.5 rounded-full ${step >= 1 ? "bg-capitec-red" : "bg-slate-200"}`}></div>
                <div className={`w-6 h-1.5 rounded-full ${step === 2 ? "bg-capitec-red" : "bg-slate-200"}`}></div>
              </div>
              {onClose && (
                <button
                  id="btn-close-enrollment"
                  type="button"
                  onClick={onClose}
                  className="p-1 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer font-bold text-sm flex items-center justify-center leading-none"
                  title="Close Enrollment"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Form Content */}
          <div className="flex-1 my-6 flex flex-col justify-center">
            
            {/* STEP 1: Name and PIN Registration */}
            {step === 1 && (
              <form onSubmit={handlePinSubmit} className="space-y-5 animate-fadeIn">
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-800 text-lg font-display">Configure Security Profile</h3>
                  <p className="text-slate-400 text-xs leading-tight">Create your credentials for approving digital actions.</p>
                </div>

                {errorMsg && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-xs font-medium flex items-center space-x-1.5 animate-pulse">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Name field */}
                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase flex items-center space-x-1">
                    <User className="w-3.5 h-3.5 text-capitec-blue" />
                    <span>Register Name / Surname</span>
                  </label>
                  <input
                    id="security-reg-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ofentse Batlang"
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-capitec-blue outline-none text-slate-700 font-semibold"
                    required
                  />
                </div>

                {/* Starting Balance field */}
                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase flex items-center space-x-1">
                    <span>Starting Account Balance (ZAR)</span>
                  </label>
                  <input
                    id="security-reg-balance"
                    type="number"
                    min="0"
                    step="0.01"
                    value={startingBalance}
                    onChange={(e) => setStartingBalance(Number(e.target.value))}
                    placeholder="e.g. 36546.55"
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-capitec-blue outline-none text-slate-700 font-semibold font-mono"
                    required
                  />
                </div>

                {/* PIN visualization */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Remote PIN</label>
                    <div className="flex space-x-2 justify-center py-2 bg-slate-50 rounded-xl border border-slate-200 h-10 items-center">
                      {[0, 1, 2, 3].map((idx) => (
                        <div 
                          key={idx}
                          className={`w-3 h-3 rounded-full border border-slate-300 transition-all ${
                            pin[idx] ? "bg-capitec-blue scale-110" : "bg-transparent"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Confirm PIN</label>
                    <div className="flex space-x-2 justify-center py-2 bg-slate-50 rounded-xl border border-slate-200 h-10 items-center">
                      {[0, 1, 2, 3].map((idx) => (
                        <div 
                          key={idx}
                          className={`w-3 h-3 rounded-full border border-slate-300 transition-all ${
                            confirmPin[idx] ? "bg-capitec-red scale-110" : "bg-transparent"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* PIN Numeric Pad */}
                <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto pt-2">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleNumClick(num)}
                      className="py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-sm rounded-lg transition active:scale-95 cursor-pointer"
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
                    className="py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-sm rounded-lg transition active:scale-95 cursor-pointer"
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

                <button
                  id="btn-pin-submit"
                  type="submit"
                  disabled={pin.length !== 4 || confirmPin.length !== 4}
                  className="w-full py-3 bg-capitec-red hover:bg-capitec-red-dark disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-sm rounded-xl shadow-sm transition flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <span>Continue to Face Scan</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* STEP 2: Biometric Face Capture */}
            {step === 2 && (
              <div className="space-y-4 animate-fadeIn text-center">
                
                <div className="space-y-1 text-left">
                  <h3 className="font-bold text-slate-800 text-lg font-display">Biometric Face Enrollment</h3>
                  <p className="text-slate-400 text-xs">Look directly into the camera inside the scanning oval.</p>
                </div>

                {/* Webcam/Capture Frame container */}
                <div className="relative w-44 h-56 mx-auto bg-slate-100 rounded-full border-4 border-slate-200 shadow-inner overflow-hidden flex items-center justify-center group">
                  
                  {/* Camera Active View */}
                  {cameraActive && !capturedPhoto && (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                    />
                  )}

                  {/* Captured Static Photo */}
                  {capturedPhoto && (
                    <img
                      src={capturedPhoto}
                      alt="Enrolled Face"
                      className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                    />
                  )}

                  {/* Laser green scanning line indicator */}
                  {isScanning && (
                    <div className="absolute inset-x-0 h-1 bg-emerald-400 shadow-[0_0_8px_#34d399] z-20 animate-bounce top-1/4"></div>
                  )}

                  {/* Circular guide outline overlay */}
                  <div className="absolute inset-2 border-2 border-dashed border-white/60 rounded-full pointer-events-none z-10"></div>

                  {/* Standby Placeholder icon */}
                  {!cameraActive && !capturedPhoto && (
                    <div className="flex flex-col items-center space-y-1 text-slate-400 p-4">
                      <Camera className="w-8 h-8 text-slate-300" />
                      <span className="text-[10px] font-semibold text-center leading-tight">No camera active</span>
                    </div>
                  )}

                  {/* Loading scanned state overlay */}
                  {isScanning && (
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-3xs flex flex-col items-center justify-center text-white z-10">
                      <span className="text-xl font-mono font-bold">{scanProgress}%</span>
                      <span className="text-[9px] uppercase tracking-wider font-semibold opacity-85 mt-1">Analyzing Biometrics</span>
                    </div>
                  )}
                </div>

                {/* Hidden canvas for taking snapshot and real file selector */}
                <canvas ref={canvasRef} className="hidden" />
                <input
                  id="enrollment-file-input"
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoFileUpload}
                  accept="image/*"
                  className="hidden"
                />

                {/* Status and Action Buttons */}
                <div className="space-y-3.5">
                  
                  {/* Notification of camera support failure */}
                  {cameraError && !capturedPhoto && (
                    <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed text-left">
                      💡 {cameraError}
                    </p>
                  )}

                  {/* Model validation in-progress status banner */}
                  {isScanning && (
                    <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center space-x-2 animate-fadeIn text-left">
                      <Loader2 className="w-4 h-4 text-blue-600 shrink-0 animate-spin" />
                      <div className="space-y-0.5">
                        <strong className="block text-[11px] font-bold text-blue-900">dlib Deep Metric Engine Running</strong>
                        <span className="text-[10px] text-blue-700 opacity-90">{modelFeedback || "Analyzing biometric landmarks and extracting 128-d vector..."}</span>
                      </div>
                    </div>
                  )}

                  {/* Registration success approved details from Facial Model */}
                  {scanApproved && validationResult && (
                    <div className="p-3 bg-emerald-50/90 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1.5 animate-fadeIn text-left">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <strong className="text-xs font-bold text-emerald-800 font-display">Biometric Face AI Verified</strong>
                        </div>
                        <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 border border-emerald-300 text-emerald-800">
                          {validationResult.embeddingDim || 128}-D Vector Extracted
                        </span>
                      </div>
                      <p className="text-[10.5px] text-emerald-700 font-medium leading-relaxed">
                        {modelFeedback || validationResult.advice}
                      </p>
                      <div className="pt-1 border-t border-emerald-200/60 flex items-center justify-between text-[10px] text-emerald-600 font-mono">
                        <span>Engine: ResNet-34 Deep Metric</span>
                        <span>Euclidean Tolerance: &le; 0.55</span>
                      </div>
                    </div>
                  )}

                  {/* Face registration rejected by Facial Model */}
                  {!scanApproved && capturedPhoto && !isScanning && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-1.5 animate-fadeIn text-left">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0 animate-pulse" />
                        <strong className="text-xs font-bold text-red-900 font-display">Face Registration Rejected</strong>
                      </div>
                      <p className="text-[10.5px] text-red-700 font-medium leading-relaxed">
                        {modelFeedback || "The facial recognition model could not detect a clear, unobstructed face. Please ensure proper lighting and face the camera directly."}
                      </p>
                      <span className="text-[10px] text-red-600 font-semibold block">
                        💡 Please retake the photo or upload a clearer portrait to activate your account.
                      </span>
                    </div>
                  )}

                  {/* Trigger buttons */}
                  <div className="flex flex-col gap-2.5 pt-2">
                    {cameraActive && !capturedPhoto && (
                      <button
                        id="btn-capture-selfie"
                        type="button"
                        onClick={handleCapture}
                        className="w-full py-2.5 bg-capitec-blue hover:bg-capitec-blue-light text-white font-semibold text-sm rounded-xl shadow transition cursor-pointer flex items-center justify-center space-x-1.5"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Snap Photo & Analyze Face</span>
                      </button>
                    )}

                    {!capturedPhoto && !isScanning && (
                      <div className="flex flex-col sm:flex-row gap-2">
                        {!cameraActive && (
                          <button
                            id="btn-activate-webcam"
                            type="button"
                            onClick={startCamera}
                            className="flex-1 py-2.5 bg-capitec-blue hover:bg-capitec-blue-light text-white font-semibold text-xs rounded-xl shadow transition cursor-pointer flex items-center justify-center space-x-1.5"
                          >
                            <Camera className="w-4 h-4" />
                            <span>Activate Webcam</span>
                          </button>
                        )}
                        <button
                          id="btn-upload-real-photo"
                          type="button"
                          onClick={triggerFileSelector}
                          className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-xl shadow transition cursor-pointer flex items-center justify-center space-x-1.5"
                        >
                          <Sparkles className="w-4 h-4 text-emerald-400" />
                          <span>Upload Face Photo</span>
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
                            setScanApproved(false);
                            setValidationResult(null);
                            setModelFeedback("");
                            startCamera();
                          }}
                          className="py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer flex items-center justify-center space-x-1.5"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Retake with Camera</span>
                        </button>
                        <button
                          id="btn-reupload-file"
                          type="button"
                          onClick={triggerFileSelector}
                          className="py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer flex items-center justify-center space-x-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Upload File</span>
                        </button>
                      </div>
                    )}
                  </div>

                </div>

                {/* Final Register Trigger */}
                <button
                  id="btn-complete-enrollment"
                  type="button"
                  onClick={handleCompleteRegistration}
                  disabled={!scanApproved || !pin || isSubmitting}
                  className="w-full py-3 bg-capitec-red hover:bg-capitec-red-dark disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-sm rounded-xl shadow-sm transition flex items-center justify-center space-x-1.5 cursor-pointer mt-4"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4.5 h-4.5 animate-spin" />
                      <span>Enrolling Biometric Profile...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4.5 h-4.5 stroke-[2.5]" />
                      <span>Activate Security Account</span>
                    </>
                  )}
                </button>

              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
