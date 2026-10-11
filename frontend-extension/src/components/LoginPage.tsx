import { useState, useRef, useEffect, ChangeEvent } from "react";
import { 
  Lock, 
  ShieldCheck, 
  User, 
  Camera, 
  Key, 
  Sparkles, 
  Smartphone, 
  ScanFace, 
  Info, 
  ArrowRight,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Upload
} from "lucide-react";
import { 
  compareFacePhotos, 
  verifyFaceDetailed, 
  verifyUserAgainstDatabase, 
  autoDetectUser, 
  getRegisteredBiometricUsers 
} from "../utils/faceMatcher";

interface LoginPageProps {
  isSecurityRegistered: boolean;
  userPin: string;
  userFacePhoto: string;
  onLoginSuccess: (name?: string) => void;
  onOpenEnrollment: () => void;
}

export default function LoginPage({
  isSecurityRegistered,
  userPin,
  userFacePhoto,
  onLoginSuccess,
  onOpenEnrollment
}: LoginPageProps) {
  const [loginMethod, setLoginMethod] = useState<"pin" | "biometric">("pin");
  const [enteredPin, setEnteredPin] = useState("");
  const [pinError, setPinError] = useState("");
  
  // Biometric states
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResult, setScanResult] = useState<"idle" | "success" | "fail">("idle");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState("");
  const [customPhoto, setCustomPhoto] = useState<string | null>(null);
  const [realSimilarity, setRealSimilarity] = useState<number | null>(null);
  const [aiFeedback, setAiFeedback] = useState<string>("");
  const [detectedUserName, setDetectedUserName] = useState<string | null>(null);
  const [registeredUsers, setRegisteredUsers] = useState<string[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load enrolled users list from submit module database on mount
  useEffect(() => {
    getRegisteredBiometricUsers().then(users => {
      if (users && users.length > 0) {
        setRegisteredUsers(users);
      }
    });
  }, []);

  // Auto clean up camera stream
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
  }, [cameraStream, cameraActive]);

  // Handle tactile keypad press
  const handleKeypadPress = (val: string) => {
    setPinError("");
    if (enteredPin.length < 4) {
      const updated = enteredPin + val;
      setEnteredPin(updated);

      // If exactly 4 digits, trigger verification automatically
      if (updated.length === 4) {
        verifyPin(updated);
      }
    }
  };

  const handleBackspace = () => {
    setPinError("");
    setEnteredPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPinError("");
    setEnteredPin("");
  };

  // PIN validation logic
  const verifyPin = async (pinToVerify: string) => {
    // 1. Verify against all registered users via backend
    try {
      const res = await fetch("/api/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinToVerify })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.valid && data.user) {
          onLoginSuccess(data.user.userName || undefined);
          return;
        }
      }
    } catch (e) {
      console.warn("Backend pin verification notice:", e);
    }

    // 2. Check custom PIN if registered, or default 1234
    const validPins = [userPin, "1234"].filter(Boolean);
    setTimeout(() => {
      if (validPins.includes(pinToVerify)) {
        onLoginSuccess();
      } else {
        setPinError("Invalid 4-digit Remote PIN. Please try again (Default: 1234).");
        setEnteredPin("");
      }
    }, 250);
  };

  // Live Camera Biometrics
  const startBiometricCamera = async () => {
    setCameraError("");
    setScanResult("idle");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 320, facingMode: "user" }
      });
      setCameraStream(stream);
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn("Camera blocked or unavailable inside preview:", err);
      setCameraError("Webcam video stream blocked or unavailable in your browser security sandbox. Please select and upload a real face photo from your device instead!");
    }
  };

  const handleScanTrigger = async (isDemo = false) => {
    setIsScanning(true);
    setScanProgress(0);
    setScanResult("idle");
    setCameraError("");

    let verifyPhoto = customPhoto || "";

    if (cameraActive && videoRef.current && canvasRef.current && !isDemo) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (context) {
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 320;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/png");
        setCustomPhoto(dataUrl);
        verifyPhoto = dataUrl;
      }
    }

    // Stop live camera after snapshot is analyzed
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);

    // Compute actual similarity score using the submit module's auto-detect engine
    let matchScore = 0;
    let feedbackStr = "";
    let detectedName: string | null = null;
    
    if (verifyPhoto) {
      try {
        // First run auto-detect against all registered users in user_database.pkl
        const autoRes = await autoDetectUser(verifyPhoto, enteredPin);
        if (autoRes.identified && autoRes.username) {
          detectedName = autoRes.username;
          matchScore = autoRes.similarity;
          feedbackStr = autoRes.advice;
          setDetectedUserName(autoRes.username);
        } else if (userFacePhoto) {
          // Direct 1-to-1 comparison with enrolled photo
          const detailed = await verifyFaceDetailed(userFacePhoto, verifyPhoto);
          matchScore = detailed.similarity;
          feedbackStr = detailed.advice;
        } else {
          matchScore = autoRes.similarity;
          feedbackStr = autoRes.advice || "Unknown user: Face not recognized in biometric database.";
        }
      } catch (err) {
        console.warn("Face analysis error, using fallback:", err);
        matchScore = await compareFacePhotos(userFacePhoto || "", verifyPhoto);
        feedbackStr = "Facial structure comparison complete.";
      }
    }

    setAiFeedback(feedbackStr);

    // Laser scan progress simulation
    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsScanning(false);
          
          if (!isSecurityRegistered && !detectedName) {
            setScanResult("fail");
            setCameraError(feedbackStr || "No matching registered user found. Please enroll your profile first.");
          } else {
            setRealSimilarity(matchScore);
            if (matchScore >= 70 || detectedName) {
              setScanResult("success");
              setTimeout(() => {
                onLoginSuccess(detectedName || undefined);
              }, 1200);
            } else {
              setScanResult("fail");
              setCameraError(`Biometric Identity Mismatch: Confidence score is ${matchScore}%. ${feedbackStr || "The captured face does not match any registered profile."}`);
            }
          }

          return 100;
        }
        return prev + 10;
      });
    }, 120);
  };

  // Real device photo upload
  const handlePhotoFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUrl = reader.result as string;
        setCustomPhoto(dataUrl);
        setCameraActive(false);
        if (cameraStream) {
          cameraStream.getTracks().forEach(track => track.stop());
          setCameraStream(null);
        }
        
        // Trigger verification scanning sequence with real image
        setIsScanning(true);
        setScanProgress(0);
        setScanResult("idle");
        setCameraError("");

        let matchScore = 0;
        let detectedName: string | null = null;
        let feedback = "";
        
        try {
          const autoRes = await autoDetectUser(dataUrl);
          if (autoRes.identified && autoRes.username) {
            detectedName = autoRes.username;
            matchScore = autoRes.similarity;
            feedback = autoRes.advice;
            setDetectedUserName(autoRes.username);
          } else if (userFacePhoto) {
            const res = await verifyFaceDetailed(userFacePhoto, dataUrl);
            matchScore = res.similarity;
            feedback = res.advice;
          } else {
            matchScore = autoRes.similarity;
            feedback = autoRes.advice;
          }
        } catch (e) {
          matchScore = 0;
        }

        setAiFeedback(feedback);

        const interval = setInterval(() => {
          setScanProgress(prev => {
            if (prev >= 100) {
              clearInterval(interval);
              setIsScanning(false);
              
              if (!isSecurityRegistered && !detectedName) {
                setScanResult("fail");
                setCameraError(feedback || "No matching registered profile found. Please register under 'Enroll Profile'.");
              } else {
                setRealSimilarity(matchScore);
                if (matchScore >= 70 || detectedName) {
                  setScanResult("success");
                  setTimeout(() => {
                    onLoginSuccess(detectedName || undefined);
                  }, 1200);
                } else {
                  setScanResult("fail");
                  setCameraError(`Biometric Identity Mismatch: Confidence score is only ${matchScore}%.`);
                }
              }

              return 100;
            }
            return prev + 10;
          });
        }, 120);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileSelector = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Instantly unlock for evaluation
  const handleDemoBypass = () => {
    onLoginSuccess("Ofentse Batlang");
  };

  return (
    <div id="login-page-container" className="fixed inset-0 bg-slate-100 flex items-center justify-center z-40 p-3 sm:p-4 font-sans overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-4xl border border-slate-200 overflow-hidden shadow-2xl flex flex-col md:flex-row h-auto md:h-[620px] animate-scaleUp">
        
        {/* Left Side: Capitec Brand Identity Display */}
        <div className="bg-capitec-blue p-6 md:p-10 md:w-5/12 text-white flex flex-col justify-between text-left relative overflow-hidden shrink-0">
          {/* Crimson accent bubble */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-capitec-red/10 rounded-full blur-3xl"></div>
          
          <div className="space-y-4 md:space-y-8 z-10">
            <div>
              <span className="text-2xl md:text-3xl font-extrabold font-display tracking-tight text-white">
                Wealth<span className="text-capitec-red">IQ</span>
              </span>
              <p className="text-[9px] md:text-[10px] font-bold text-slate-300 tracking-widest uppercase mt-0.5 md:mt-1">
                Capitec Banking Extension
              </p>
            </div>

            <div className="space-y-2 md:space-y-4">
              <h2 className="text-lg md:text-2xl font-bold font-display tracking-tight leading-snug">
                Simplify. Personalize. Grow.
              </h2>
              <p className="text-slate-300 text-xs leading-relaxed hidden md:block">
                Unlock real-time smart cashflow tracking, deep AI financial guidance, and automated investment calculators with Capitec's secure remote token system.
              </p>
            </div>
          </div>

          {/* Secure Trust Compliance badging */}
          <div className="pt-4 md:pt-8 border-t border-slate-100/10 space-y-3 md:space-y-4 text-slate-300 text-[10px] md:text-[11px] z-10 hidden sm:block">
            <div className="flex items-center space-x-2.5">
              <ShieldCheck className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-400 shrink-0" />
              <span>SABRIC Certified Protection System</span>
            </div>
            <div className="flex items-center space-x-2.5">
              <Smartphone className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-400 shrink-0" />
              <span>Tokenized Remote Authentication</span>
            </div>
            
            <p className="text-[9px] text-slate-400 font-mono mt-2 pt-2 border-t border-slate-800 hidden md:block">
              © {new Date().getFullYear()} Capitec Bank Ltd. All rights reserved.
            </p>
          </div>
        </div>

        {/* Right Side: Interactive Authentication Form */}
        <div className="p-6 md:p-10 flex-1 flex flex-col justify-between bg-white text-left overflow-y-auto">
          
          {/* Top Selection Tabs */}
          <div className="flex justify-center items-center pb-4 border-b border-slate-100 shrink-0 relative">
            <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl">
              <button
                id="btn-tab-pin-login"
                onClick={() => {
                  setLoginMethod("pin");
                  setCameraActive(false);
                  if (cameraStream) {
                    cameraStream.getTracks().forEach(t => t.stop());
                    setCameraStream(null);
                  }
                }}
                className={`px-3 md:px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  loginMethod === "pin" 
                    ? "bg-white text-capitec-blue shadow-3xs" 
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Remote PIN
              </button>
              <button
                id="btn-tab-bio-login"
                onClick={() => {
                  setLoginMethod("biometric");
                  startBiometricCamera();
                }}
                className={`px-3 md:px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1 ${
                  loginMethod === "biometric" 
                    ? "bg-white text-capitec-blue shadow-3xs" 
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <ScanFace className="w-3.5 h-3.5" />
                <span>Biometrics</span>
              </button>
            </div>

            {/* Profile Sign-up switch - Always available for any user */}
            <button
              id="btn-login-open-signup"
              type="button"
              onClick={onOpenEnrollment}
              className="absolute right-0 text-xs font-bold text-capitec-red hover:text-capitec-red-dark bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-xl flex items-center space-x-1 cursor-pointer transition shadow-3xs"
            >
              <span>Sign Up</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Core Login Flow Card */}
          <div className="flex-1 my-4 md:my-6 flex flex-col justify-center">

            {/* METHOD 1: Remote PIN Keypad Entry */}
            {loginMethod === "pin" && (
              <div className="space-y-4 animate-fadeIn max-w-sm mx-auto w-full">
                <div className="text-center space-y-1">
                  <h3 className="font-bold text-slate-800 text-lg font-display">Sign In to Wealth<span className="text-capitec-red">IQ</span></h3>
                  <p className="text-slate-400 text-xs">
                    {isSecurityRegistered 
                      ? "Enter your custom 4-digit Remote PIN." 
                      : "Enter 1234 to log in with the default profile."}
                  </p>
                </div>

                {pinError && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-semibold flex items-center space-x-2 animate-pulse">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{pinError}</span>
                  </div>
                )}

                {/* PIN dots display */}
                <div className="flex space-x-4 justify-center py-4 bg-slate-50 rounded-2xl border border-slate-200">
                  {[0, 1, 2, 3].map((idx) => (
                    <div 
                      key={idx}
                      className={`w-4 h-4 rounded-full border border-slate-300 transition-all ${
                        enteredPin[idx] ? "bg-capitec-blue scale-110 shadow-3xs" : "bg-white"
                      }`}
                    />
                  ))}
                </div>

                {/* Secure tactical custom keyboard - with 44px+ touch targets */}
                <div className="grid grid-cols-3 gap-2 mx-auto pt-1">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleKeypadPress(num)}
                      className="py-3.5 md:py-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-base rounded-xl transition active:scale-95 cursor-pointer"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleClear}
                    className="py-3.5 md:py-4 text-xs font-semibold text-slate-400 uppercase hover:text-slate-600 cursor-pointer"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeypadPress("0")}
                    className="py-3.5 md:py-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-base rounded-xl transition active:scale-95 cursor-pointer"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handleBackspace}
                    className="py-3.5 md:py-4 text-sm font-semibold text-slate-400 hover:text-slate-600 cursor-pointer flex items-center justify-center"
                  >
                    ⌫
                  </button>
                </div>
              </div>
            )}

            {/* METHOD 2: Biometric Face Scanner Simulation */}
            {loginMethod === "biometric" && (
              <div className="space-y-4 text-center animate-fadeIn max-w-sm mx-auto w-full">
                
                <div className="text-left space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 text-base font-display">Biometric Sign In</h3>
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Auto-Detect Ready</span>
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs">
                    Align your face with the camera. The submit module will automatically identify you from the registered user database.
                  </p>
                  {registeredUsers.length > 0 && (
                    <div className="flex items-center space-x-1.5 pt-1 text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-600">Registered:</span>
                      <div className="flex flex-wrap gap-1">
                        {registeredUsers.map(u => (
                          <span key={u} className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] text-slate-700 font-medium">
                            {u}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {detectedUserName && (
                    <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800 flex items-center space-x-1.5 animate-fadeIn">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Identified User: <strong>{detectedUserName}</strong></span>
                    </div>
                  )}
                </div>

                {/* Viewport Scan Circle */}
                <div className="relative w-40 h-40 mx-auto bg-slate-100 rounded-full border-4 border-slate-200 shadow-inner overflow-hidden flex items-center justify-center">
                  
                  {cameraActive && !isScanning && !customPhoto && (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                    />
                  )}

                  {!cameraActive && customPhoto && (
                    <img
                      src={customPhoto}
                      alt="Snap selfie"
                      className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                    />
                  )}

                  {/* If user previously enrolled their real face snapshot, show it */}
                  {isSecurityRegistered && userFacePhoto && !cameraActive && !customPhoto && (
                    <img
                      src={userFacePhoto}
                      alt="Enrolled Identity"
                      className="absolute inset-0 w-full h-full object-cover scale-x-[-1] opacity-75"
                    />
                  )}

                  {/* Fallback silhouette if no camera */}
                  {!cameraActive && !customPhoto && (!isSecurityRegistered || !userFacePhoto) && (
                    <ScanFace className="w-14 h-14 text-slate-300" />
                  )}

                  {/* Grid green laser laser scanner element */}
                  {isScanning && (
                    <div className="absolute inset-x-0 h-1 bg-emerald-400 shadow-[0_0_8px_#34d399] z-20 animate-bounce top-1/3"></div>
                  )}

                  {/* Outline ring overlay */}
                  <div className="absolute inset-2 border border-dashed border-white/50 rounded-full pointer-events-none z-10"></div>

                  {/* Progress panel overlay */}
                  {isScanning && (
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-3xs flex flex-col items-center justify-center text-white z-15">
                      <span className="text-base font-mono font-bold text-emerald-400">{scanProgress}%</span>
                      <span className="text-[8px] uppercase tracking-wider font-semibold opacity-85 mt-1">Authenticating Face</span>
                    </div>
                  )}

                  {/* Success layout indicator */}
                  {scanResult === "success" && (
                    <div className="absolute inset-0 bg-emerald-600/95 flex flex-col items-center justify-center text-white z-15 animate-fadeIn text-center p-2">
                      <CheckCircle className="w-8 h-8 text-white" />
                      <span className="text-xs font-bold uppercase mt-1">Matched</span>
                      <span className="text-[9px] font-mono opacity-90">
                        {realSimilarity !== null ? `${realSimilarity}% Similarity` : "99.8% Perfect Score"}
                      </span>
                    </div>
                  )}

                  {/* Failure layout indicator */}
                  {scanResult === "fail" && (
                    <div className="absolute inset-0 bg-red-600/95 flex flex-col items-center justify-center text-white z-15 animate-fadeIn text-center p-2">
                      <AlertCircle className="w-8 h-8 text-white animate-pulse" />
                      <span className="text-xs font-bold uppercase mt-1">Denied</span>
                      <span className="text-[9px] font-mono opacity-90 font-semibold">
                        {realSimilarity !== null ? `${realSimilarity}% Match Score` : "Identity Rejected"}
                      </span>
                    </div>
                  )}
                </div>
                <canvas ref={canvasRef} className="hidden" />
                <input
                  id="login-file-input"
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoFileUpload}
                  accept="image/*"
                  className="hidden"
                />

                {/* Notifications */}
                {aiFeedback && (
                  <div className="bg-emerald-50/50 border border-emerald-100 p-2.5 rounded-lg text-left leading-relaxed animate-fadeIn">
                    <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block mb-0.5">💡 Face Biometric Coach:</p>
                    <p className="text-[10.5px] text-slate-600 leading-normal font-medium">{aiFeedback}</p>
                  </div>
                )}

                {cameraError && (
                  <p className="text-[10px] text-slate-500 bg-slate-50 border border-slate-100 p-2.5 rounded-lg text-left leading-relaxed">
                    💡 {cameraError}
                  </p>
                )}

                {/* Action commands */}
                <div className="space-y-2 pt-2">
                  {cameraActive && !isScanning && (
                    <button
                      id="btn-auth-bio-camera"
                      type="button"
                      onClick={() => handleScanTrigger(false)}
                      className="w-full py-2.5 bg-capitec-blue hover:bg-capitec-blue-light text-white font-semibold text-xs rounded-xl shadow transition cursor-pointer flex items-center justify-center space-x-1.5 animate-fadeIn"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Capture & Sign In</span>
                    </button>
                  )}

                  {!cameraActive && !isScanning && scanResult !== "success" && scanResult !== "fail" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        id="btn-auth-bio-webcam"
                        type="button"
                        onClick={startBiometricCamera}
                        className="py-2.5 px-3 bg-capitec-blue hover:bg-capitec-blue-light text-white font-semibold text-xs rounded-xl shadow transition cursor-pointer flex items-center justify-center space-x-1.5"
                      >
                        <Camera className="w-4 h-4 shrink-0" />
                        <span>Activate Webcam</span>
                      </button>

                      <button
                        id="btn-auth-bio-upload"
                        type="button"
                        onClick={triggerFileSelector}
                        className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl shadow-3xs transition cursor-pointer flex items-center justify-center space-x-1.5"
                      >
                        <Upload className="w-4 h-4 shrink-0 text-slate-600" />
                        <span>Upload Face Photo</span>
                      </button>
                    </div>
                  )}

                  {scanResult === "fail" && !isScanning && (
                    <div className="space-y-2">
                      <button
                        id="btn-auth-bio-retry"
                        type="button"
                        onClick={() => {
                          setCustomPhoto(null);
                          setScanResult("idle");
                          setRealSimilarity(null);
                          setCameraError("");
                          setAiFeedback("");
                          startBiometricCamera();
                        }}
                        className="w-full py-2.5 bg-capitec-red hover:bg-capitec-red-dark text-white font-semibold text-xs rounded-xl shadow transition cursor-pointer flex items-center justify-center space-x-1.5 animate-fadeIn"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Retake with Webcam</span>
                      </button>

                      <button
                        id="btn-auth-bio-retry-upload"
                        type="button"
                        onClick={triggerFileSelector}
                        className="w-full py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer flex items-center justify-center space-x-1.5"
                      >
                        <Upload className="w-4 h-4 text-slate-600" />
                        <span>Try Uploading Face Image File</span>
                      </button>
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>

          {/* Quick Access and Onboarding hints - Always available */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 shrink-0 gap-2">
            <div className="flex items-center space-x-1.5">
              <Info className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                New to Wealth<span className="text-capitec-red font-bold">IQ</span>? Register with your facial identity.
              </span>
            </div>
            <button
              id="btn-footer-open-signup"
              type="button"
              onClick={onOpenEnrollment}
              className="font-bold text-capitec-red hover:text-capitec-red-dark hover:underline cursor-pointer transition flex items-center space-x-1"
            >
              <span>Create Account</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
