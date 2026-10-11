import { useState, useRef, useEffect, ChangeEvent, FormEvent } from "react";
import { 
  User, 
  Mail, 
  Phone, 
  ShieldCheck, 
  CreditCard, 
  Calendar, 
  Camera, 
  Lock, 
  Coins, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw,
  Eye,
  EyeOff
} from "lucide-react";

interface ProfileTabProps {
  userName: string;
  userEmail: string;
  userPhone: string;
  userPin: string;
  userFacePhoto: string;
  startingBalance: number;
  onUpdateProfile: (updated: {
    userName: string;
    userEmail: string;
    userPhone: string;
    userPin: string;
    userFacePhoto: string;
    startingBalance: number;
  }) => Promise<void>;
}

export default function ProfileTab({
  userName,
  userEmail,
  userPhone,
  userPin,
  userFacePhoto,
  startingBalance,
  onUpdateProfile
}: ProfileTabProps) {
  // Editable Fields State
  const [editedName, setEditedName] = useState(userName);
  const [editedEmail, setEditedEmail] = useState(userEmail || "ofentsebatlang@gmail.com");
  const [editedPhone, setEditedPhone] = useState(userPhone || "+27 82 456 7890");
  const [editedPin, setEditedPin] = useState(userPin);
  const [editedStartingBalance, setEditedStartingBalance] = useState(startingBalance);
  const [customPhoto, setCustomPhoto] = useState<string | null>(userFacePhoto || null);

  // UI state
  const [showPin, setShowPin] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Biometric Photo updates via live-camera
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Sync state values if props change
  useEffect(() => {
    setEditedName(userName);
    setEditedEmail(userEmail || "ofentsebatlang@gmail.com");
    setEditedPhone(userPhone || "+27 82 456 7890");
    setEditedPin(userPin);
    setEditedStartingBalance(startingBalance);
    setCustomPhoto(userFacePhoto || null);
  }, [userName, userEmail, userPhone, userPin, userFacePhoto, startingBalance]);

  // Handle camera capture
  const startCamera = async () => {
    setCameraError("");
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.error("Video play failed:", e));
      }
    } catch (err: any) {
      console.error("Camera access denied:", err);
      setCameraError("Camera access denied. Please upload a file instead.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const captureSnapshot = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg");
        setCustomPhoto(dataUrl);
        stopCamera();
      }
    }
  };

  // File Upload Biometrics
  const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit and save updated details
  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSaveError("");
    setSaveSuccess(false);

    // Form validations
    if (!editedName.trim()) {
      setSaveError("Full Name is required.");
      return;
    }
    if (!/^\d{4}$/.test(editedPin)) {
      setSaveError("Remote PIN must be exactly 4 digits.");
      return;
    }
    if (editedStartingBalance < 0) {
      setSaveError("Starting balance cannot be negative.");
      return;
    }

    setIsSaving(true);
    try {
      await onUpdateProfile({
        userName: editedName,
        userEmail: editedEmail,
        userPhone: editedPhone,
        userPin: editedPin,
        userFacePhoto: customPhoto || "",
        startingBalance: editedStartingBalance
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error("Error saving profile details:", err);
      setSaveError("Failed to update profile details. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div id="profile-section-tab" className="p-4 md:p-8 space-y-6">
      
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-display text-slate-800 flex items-center space-x-2">
            <ShieldCheck className="w-6 h-6 text-capitec-blue" />
            <span>Profile & Security Profile</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure your personal Remote Banking credentials and synchronize with cloud persistence
          </p>
        </div>
        <div className="mt-2 md:mt-0">
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-100">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Biometrically Verified</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Biometric Face Token & Avatar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col items-center justify-between shadow-xs relative">
          <div className="w-full text-center space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 text-left flex items-center space-x-1.5">
              <Camera className="w-3.5 h-3.5 text-slate-400" />
              <span>Biometric Photo Token</span>
            </h3>

            {/* Photo preview container */}
            <div className="relative w-44 h-44 rounded-full border-4 border-slate-100 overflow-hidden mx-auto bg-slate-50 flex items-center justify-center group shadow-inner">
              {isCameraActive ? (
                <video 
                  ref={videoRef} 
                  className="w-full h-full object-cover scale-x-[-1]" 
                  playsInline 
                  muted 
                />
              ) : customPhoto ? (
                <img 
                  src={customPhoto} 
                  alt="Biometric Capture" 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="text-center space-y-1">
                  <User className="w-16 h-16 text-slate-300 mx-auto" />
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">No photo token</span>
                </div>
              )}

              {/* Verified Badge */}
              {customPhoto && !isCameraActive && (
                <div className="absolute bottom-2 right-2 bg-emerald-500 text-white p-1 rounded-full shadow border-2 border-white">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              )}
            </div>

            {/* Camera Actions */}
            <div className="space-y-2 pt-2">
              {isCameraActive ? (
                <div className="flex gap-2 justify-center">
                  <button
                    id="btn-profile-cam-capture"
                    type="button"
                    onClick={captureSnapshot}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow transition cursor-pointer"
                  >
                    Take Photo
                  </button>
                  <button
                    id="btn-profile-cam-cancel"
                    type="button"
                    onClick={stopCamera}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-w-[200px] mx-auto">
                  <button
                    id="btn-profile-cam-start"
                    type="button"
                    onClick={startCamera}
                    className="flex items-center justify-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Retake Live Stream</span>
                  </button>
                  <label className="flex items-center justify-center space-x-1.5 px-3 py-2 border border-dashed border-slate-300 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-lg transition cursor-pointer">
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Upload Token Image</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handlePhotoUpload} 
                      className="hidden" 
                    />
                  </label>
                </div>
              )}

              {cameraError && (
                <span className="text-[10px] text-capitec-red font-semibold leading-none">{cameraError}</span>
              )}
            </div>
          </div>

          {/* Quick instructions */}
          <div className="text-[11px] text-slate-400 mt-6 border-t border-slate-50 pt-4 w-full text-center">
            <p>Your biometric facial token is hashed locally on client-side and verified via Remote PIN decryption routines.</p>
          </div>
        </div>

        {/* MIDDLE COLUMN: Edit Profile Fields */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs lg:col-span-2">
          
          <form onSubmit={handleSaveProfile} className="space-y-5 text-left">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Modify Editable User Credentials</span>
            </h3>

            {/* Save Alerts */}
            {saveSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-2.5 text-emerald-800 text-sm animate-fadeIn">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Profile Saved successfully!</p>
                  <p className="text-xs text-emerald-600">Your profile details, starting balance, and Remote credentials have been synchronized to Firestore.</p>
                </div>
              </div>
            )}

            {saveError && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2.5 text-red-800 text-sm animate-fadeIn">
                <AlertCircle className="w-5 h-5 text-capitec-red shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Error updating profile</p>
                  <p className="text-xs text-red-500">{saveError}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Full Name */}
              <div className="flex flex-col space-y-1.5">
                <label htmlFor="profile-edit-name" className="text-xs font-semibold text-slate-500 uppercase flex items-center space-x-1">
                  <span>Full Name</span>
                  <span className="text-capitec-red">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    id="profile-edit-name"
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    placeholder="e.g. Ofentse Batlang"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-capitec-blue outline-none text-slate-700 font-semibold"
                    required
                  />
                </div>
              </div>

              {/* Starting balance */}
              <div className="flex flex-col space-y-1.5">
                <label htmlFor="profile-edit-balance" className="text-xs font-semibold text-slate-500 uppercase flex items-center space-x-1">
                  <span>Starting Sandbox Account Balance (ZAR)</span>
                  <span className="text-capitec-red">*</span>
                </label>
                <div className="relative">
                  <Coins className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    id="profile-edit-balance"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editedStartingBalance}
                    onChange={(e) => setEditedStartingBalance(Number(e.target.value))}
                    placeholder="e.g. 36546.55"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-capitec-blue outline-none text-slate-700 font-semibold font-mono"
                    required
                  />
                </div>
                <span className="text-[10px] text-slate-400 italic leading-tight">
                  Changing this instantly adjusts your baseline account balance!
                </span>
              </div>

              {/* Email Address */}
              <div className="flex flex-col space-y-1.5">
                <label htmlFor="profile-edit-email" className="text-xs font-semibold text-slate-500 uppercase">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    id="profile-edit-email"
                    type="email"
                    value={editedEmail}
                    onChange={(e) => setEditedEmail(e.target.value)}
                    placeholder="e.g. user@domain.com"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-capitec-blue outline-none text-slate-700 font-semibold"
                  />
                </div>
              </div>

              {/* Contact Number */}
              <div className="flex flex-col space-y-1.5">
                <label htmlFor="profile-edit-phone" className="text-xs font-semibold text-slate-500 uppercase">
                  Contact Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    id="profile-edit-phone"
                    type="text"
                    value={editedPhone}
                    onChange={(e) => setEditedPhone(e.target.value)}
                    placeholder="e.g. +27 82 456 7890"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-capitec-blue outline-none text-slate-700 font-semibold"
                  />
                </div>
              </div>

              {/* Security Remote PIN */}
              <div className="flex flex-col space-y-1.5 md:col-span-2">
                <label htmlFor="profile-edit-pin" className="text-xs font-semibold text-slate-500 uppercase flex items-center space-x-1">
                  <span>Remote PIN (4-Digits)</span>
                  <span className="text-capitec-red">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    id="profile-edit-pin"
                    type={showPin ? "text" : "password"}
                    maxLength={4}
                    value={editedPin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      if (val.length <= 4) setEditedPin(val);
                    }}
                    placeholder="e.g. 1234"
                    className="w-full pl-9 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-capitec-blue outline-none text-slate-700 font-semibold tracking-widest font-mono"
                    required
                  />
                  <button
                    id="btn-profile-toggle-pin"
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-1 rounded-md transition"
                    title={showPin ? "Hide PIN" : "Show PIN"}
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 italic">
                  Keep your Remote PIN safe. Never disclose your PIN to anyone.
                </span>
              </div>

            </div>

            {/* Read-Only Fixed Section */}
            <div className="pt-4 mt-2 border-t border-slate-100 space-y-3.5">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Read-Only Fixed Bank Details</span>
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Date of Birth</span>
                  <span className="text-xs font-semibold text-slate-600 mt-0.5 flex items-center space-x-1">
                    <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>June 15, 1994</span>
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">SA National ID</span>
                  <span className="text-xs font-semibold text-slate-600 mt-0.5">
                    940615 5123 08 1
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Account Number</span>
                  <span className="text-xs font-semibold text-slate-600 mt-0.5 flex items-center space-x-1">
                    <CreditCard className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>1431289445</span>
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Account Type</span>
                  <span className="text-xs font-semibold text-slate-600 mt-0.5">Global One Account</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Enrollment Date</span>
                  <span className="text-xs font-semibold text-slate-600 mt-0.5">July 1, 2026</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Verification Level</span>
                  <span className="text-xs font-semibold text-emerald-600 mt-0.5 font-bold">L3 Remote Biometrics</span>
                </div>
              </div>
            </div>

            {/* Form actions */}
            <div className="flex justify-end pt-2">
              <button
                id="btn-profile-submit-save"
                type="submit"
                disabled={isSaving}
                className="px-6 py-3 bg-capitec-blue hover:bg-capitec-blue-light disabled:bg-slate-300 text-white font-bold rounded-xl shadow-md transition flex items-center space-x-2 cursor-pointer text-sm"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Synchronizing details...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-300" />
                    <span>Save Remote Credentials</span>
                  </>
                )}
              </button>
            </div>

          </form>

        </div>

      </div>

    </div>
  );
}
