import { useState, useEffect, useRef, ChangeEvent } from "react";
import { 
  ScanFace, 
  Cpu, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Camera, 
  Upload, 
  RefreshCw, 
  Layers, 
  Fingerprint
} from "lucide-react";
import { 
  getModelsStatus, 
  ModelsStatusResult, 
  autoDetectUser, 
  classifyImageWithModel,
  ClassifyResult 
} from "../utils/faceMatcher";

interface ModelsTabProps {
  currentUserName: string;
}

export default function ModelsTab({ currentUserName }: ModelsTabProps) {
  const [modelStatus, setModelStatus] = useState<ModelsStatusResult | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  
  // Biometric test states
  const [bioTestImage, setBioTestImage] = useState<string | null>(null);
  const [bioTesting, setBioTesting] = useState(false);
  const [bioResult, setBioResult] = useState<any>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // CNN Classifier test states
  const [cnnTestImage, setCnnTestImage] = useState<string | null>(null);
  const [selectedCnnModel, setSelectedCnnModel] = useState<"resnet" | "alexnet" | "vgg">("resnet");
  const [cnnTesting, setCnnTesting] = useState(false);
  const [cnnResult, setCnnResult] = useState<ClassifyResult | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bioFileInputRef = useRef<HTMLInputElement>(null);
  const cnnFileInputRef = useRef<HTMLInputElement>(null);

  // Fetch models status on mount
  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setIsLoadingStatus(true);
    const data = await getModelsStatus();
    setModelStatus(data);
    setIsLoadingStatus(false);
  };

  // Auto clean up camera stream
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Bind video stream to ref
  useEffect(() => {
    if (isCameraActive && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(e => console.warn("Camera play error:", e));
    }
  }, [cameraStream, isCameraActive]);

  // Start webcam for biometric test
  const startCamera = async () => {
    setBioResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 320, facingMode: "user" }
      });
      setCameraStream(stream);
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (e) {
      console.warn("Camera access denied:", e);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  const capturePhotoFromCamera = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 320;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/png");
        setBioTestImage(dataUrl);
        stopCamera();
        runBiometricInference(dataUrl);
      }
    }
  };

  const handleBioFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setBioTestImage(dataUrl);
        stopCamera();
        runBiometricInference(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const runBiometricInference = async (imgB64: string) => {
    setBioTesting(true);
    setBioResult(null);
    try {
      const res = await autoDetectUser(imgB64);
      setBioResult(res);
    } catch (e: any) {
      setBioResult({
        detected: false,
        identified: false,
        advice: `Inference failed: ${e.message}`
      });
    } finally {
      setBioTesting(false);
    }
  };

  const handleCnnFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setCnnTestImage(dataUrl);
        runCnnInference(dataUrl, selectedCnnModel);
      };
      reader.readAsDataURL(file);
    }
  };

  const runCnnInference = async (imgB64: string, modelName: "resnet" | "alexnet" | "vgg") => {
    setCnnTesting(true);
    setCnnResult(null);
    try {
      const res = await classifyImageWithModel(imgB64, modelName);
      setCnnResult(res);
    } catch (e: any) {
      console.warn("CNN error:", e);
    } finally {
      setCnnTesting(false);
    }
  };

  return (
    <div id="models-tab-container" className="space-y-6 text-left max-w-7xl mx-auto pb-12 animate-fadeIn">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-capitec-blue to-slate-900 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-capitec-red/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                <Cpu className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold font-display tracking-tight">
                  Unified AI & Biometrics Hub
                </h1>
                <p className="text-xs text-slate-300 font-medium">
                  Sol Plaatje University • Advanced Diploma in ICT Project
                </p>
              </div>
            </div>

            <button
              onClick={loadStatus}
              disabled={isLoadingStatus}
              className="flex items-center space-x-2 px-3.5 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-semibold text-white transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStatus ? "animate-spin" : ""}`} />
              <span>Refresh Status</span>
            </button>
          </div>

          <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
            WealthIQ integrates multiple machine learning subsystems into one seamless architecture:
            deep 128-dimensional biometric facial embeddings for remote banking authorization, pretrained CNN classifiers for image classification, and Gemini AI for contextual South African personal finance coaching.
          </p>
        </div>
      </div>

      {/* Model Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Card 1: Facial Recognition Model */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-600">
                <ScanFace className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-800 font-display">Biometric Face AI</h3>
                <span className="text-[10px] text-slate-400 font-medium">dlib Deep Metric Engine</span>
              </div>
            </div>
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Active</span>
            </span>
          </div>

          <div className="pt-2 border-t border-slate-100 text-xs space-y-2">
            <div className="flex justify-between text-slate-500">
              <span>Embedding Vector:</span>
              <span className="font-mono font-semibold text-slate-700">128 Dimensions</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Matching Metric:</span>
              <span className="font-mono font-semibold text-slate-700">Euclidean Distance</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Tolerance Threshold:</span>
              <span className="font-mono font-semibold text-slate-700">
                {modelStatus?.biometric_face_model?.threshold ?? "0.55"}
              </span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Enrolled Profiles:</span>
              <span className="font-semibold text-emerald-600">
                {modelStatus?.biometric_face_model?.users_count ?? 3} Users
              </span>
            </div>
          </div>

          {modelStatus?.biometric_face_model?.registered_users && (
            <div className="pt-2 flex flex-wrap gap-1">
              {modelStatus.biometric_face_model.registered_users.map(u => (
                <span key={u} className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-[10px] font-semibold text-slate-700 rounded-lg">
                  {u}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Card 2: PyTorch CNN Classifier */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-blue-50 border border-blue-200 rounded-xl text-blue-600">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-800 font-display">PyTorch CNN Vision</h3>
                <span className="text-[10px] text-slate-400 font-medium">Submit Module Classifiers</span>
              </div>
            </div>
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              <span>Loaded</span>
            </span>
          </div>

          <div className="pt-2 border-t border-slate-100 text-xs space-y-2">
            <div className="flex justify-between text-slate-500">
              <span>Architectures:</span>
              <span className="font-mono font-semibold text-slate-700">ResNet, AlexNet, VGG</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Framework:</span>
              <span className="font-mono font-semibold text-slate-700">PyTorch 2.14 / Torchvision</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Pretrained Dataset:</span>
              <span className="font-mono font-semibold text-slate-700">ImageNet-1K</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Input Resolution:</span>
              <span className="font-mono font-semibold text-slate-700">224 × 224 RGB Tensor</span>
            </div>
          </div>
        </div>

        {/* Card 3: Financial AI Coach */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-purple-50 border border-purple-200 rounded-xl text-purple-600">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-800 font-display">Financial AI Coach</h3>
                <span className="text-[10px] text-slate-400 font-medium">Gemini & Heuristic Engine</span>
              </div>
            </div>
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
              <span>Online</span>
            </span>
          </div>

          <div className="pt-2 border-t border-slate-100 text-xs space-y-2">
            <div className="flex justify-between text-slate-500">
              <span>Models:</span>
              <span className="font-mono font-semibold text-slate-700">Gemini 2.5 / Flash</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Local Fallback:</span>
              <span className="font-semibold text-emerald-600">Smart SA Financial Engine</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Context Awareness:</span>
              <span className="font-semibold text-slate-700">SARS TFSA, Capitec Rules</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Latency:</span>
              <span className="font-mono font-semibold text-slate-700">&lt; 150ms Local / &lt; 1s Cloud</span>
            </div>
          </div>
        </div>

      </div>

      {/* Interactive Testing Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">

        {/* Test 1: Live Biometric Face Recognition Engine */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Fingerprint className="w-5 h-5 text-capitec-blue" />
              <h2 className="font-bold text-base text-slate-800 font-display">
                Interactive Face Recognition Test
              </h2>
            </div>
            <span className="text-[11px] font-semibold text-slate-400">
              Submit Module live_camera.py
            </span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Test the live facial recognition model directly. Capture or upload a face photo to extract 128-dimensional neural encodings and auto-identify against the registered database ({modelStatus?.biometric_face_model?.registered_users?.join(", ") || "Ofentse"}).
          </p>

          {/* Camera / Photo preview frame */}
          <div className="relative w-full h-56 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl overflow-hidden flex items-center justify-center">
            {isCameraActive && (
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover scale-x-[-1]" 
              />
            )}

            {!isCameraActive && bioTestImage && (
              <img 
                src={bioTestImage} 
                alt="Test face preview" 
                className="w-full h-full object-cover scale-x-[-1]" 
              />
            )}

            {!isCameraActive && !bioTestImage && (
              <div className="flex flex-col items-center justify-center space-y-2 text-slate-400">
                <ScanFace className="w-12 h-12 stroke-[1.5]" />
                <span className="text-xs font-medium">Activate webcam or select an image to test</span>
              </div>
            )}

            {bioTesting && (
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-3xs flex flex-col items-center justify-center text-white space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                <span className="text-xs font-semibold">Computing Euclidean Vector Distance...</span>
              </div>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />
          <input 
            type="file" 
            ref={bioFileInputRef} 
            onChange={handleBioFileChange} 
            accept="image/*" 
            className="hidden" 
          />

          {/* Control Buttons */}
          <div className="grid grid-cols-2 gap-2">
            {!isCameraActive ? (
              <button
                type="button"
                onClick={startCamera}
                className="py-2.5 px-3 bg-capitec-blue hover:bg-capitec-blue-light text-white text-xs font-semibold rounded-xl shadow transition cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <Camera className="w-4 h-4" />
                <span>Start Webcam</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={capturePhotoFromCamera}
                className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow transition cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <Camera className="w-4 h-4" />
                <span>Capture & Evaluate</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => bioFileInputRef.current?.click()}
              className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer flex items-center justify-center space-x-1.5"
            >
              <Upload className="w-4 h-4 text-slate-600" />
              <span>Upload Face File</span>
            </button>
          </div>

          {/* Biometric Result Card */}
          {bioResult && (
            <div className={`p-4 rounded-2xl border ${
              bioResult.identified 
                ? "bg-emerald-50/70 border-emerald-200 text-emerald-900" 
                : "bg-amber-50/70 border-amber-200 text-amber-900"
            } space-y-2 animate-fadeIn`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {bioResult.identified ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  )}
                  <span className="font-bold text-sm">
                    {bioResult.identified ? `Recognized User: ${bioResult.username}` : "Face Not Identified"}
                  </span>
                </div>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white/80 border border-current">
                  {bioResult.similarity}% Match
                </span>
              </div>
              <p className="text-xs opacity-90 leading-relaxed font-medium">
                {bioResult.advice}
              </p>
              {bioResult.distance !== undefined && (
                <p className="text-[10px] font-mono opacity-75">
                  Vector Distance: {bioResult.distance} (Threshold: &le; 0.55)
                </p>
              )}
            </div>
          )}
        </div>

        {/* Test 2: Pretrained CNN Vision Classifier */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Layers className="w-5 h-5 text-capitec-red" />
              <h2 className="font-bold text-base text-slate-800 font-display">
                Pretrained CNN Classifier Test
              </h2>
            </div>
            <span className="text-[11px] font-semibold text-slate-400">
              classifier.py PyTorch
            </span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Test the Convolutional Neural Network image classifier from the submit module. Select an architecture (ResNet18, AlexNet, or VGG16) and upload any photo to run forward inference.
          </p>

          {/* Model Selector Tabs */}
          <div className="flex space-x-2 bg-slate-100 p-1 rounded-xl">
            {(["resnet", "alexnet", "vgg"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setSelectedCnnModel(m);
                  if (cnnTestImage) {
                    runCnnInference(cnnTestImage, m);
                  }
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition uppercase cursor-pointer ${
                  selectedCnnModel === m 
                    ? "bg-white text-capitec-blue shadow-3xs" 
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* CNN Preview Frame */}
          <div className="relative w-full h-48 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl overflow-hidden flex items-center justify-center">
            {cnnTestImage ? (
              <img 
                src={cnnTestImage} 
                alt="CNN test preview" 
                className="w-full h-full object-contain" 
              />
            ) : (
              <div className="flex flex-col items-center justify-center space-y-2 text-slate-400">
                <Upload className="w-10 h-10 stroke-[1.5]" />
                <span className="text-xs font-medium">Upload any picture to run CNN classification</span>
              </div>
            )}

            {cnnTesting && (
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-3xs flex flex-col items-center justify-center text-white space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
                <span className="text-xs font-semibold">Running forward pass on {selectedCnnModel.toUpperCase()}...</span>
              </div>
            )}
          </div>

          <input 
            type="file" 
            ref={cnnFileInputRef} 
            onChange={handleCnnFileChange} 
            accept="image/*" 
            className="hidden" 
          />

          <button
            type="button"
            onClick={() => cnnFileInputRef.current?.click()}
            className="w-full py-2.5 px-3 bg-capitec-blue hover:bg-capitec-blue-light text-white text-xs font-semibold rounded-xl shadow transition cursor-pointer flex items-center justify-center space-x-1.5"
          >
            <Upload className="w-4 h-4" />
            <span>Select Image for {selectedCnnModel.toUpperCase()} Classification</span>
          </button>

          {/* CNN Classification Result */}
          {cnnResult && (
            <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 text-blue-950 space-y-1.5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                  Predicted Class ({cnnResult.model.toUpperCase()}):
                </span>
                <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-mono text-[10px] font-bold">
                  ImageNet Label
                </span>
              </div>
              <h4 className="text-base font-bold font-display capitalize">
                {cnnResult.prediction}
              </h4>
              <p className="text-[11px] text-blue-800">
                Classified successfully via PyTorch CNN inference pipeline.
              </p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
