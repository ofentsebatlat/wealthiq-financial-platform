import { useState, useRef, useEffect, FormEvent } from "react";
import { 
  Send, 
  Sparkles, 
  AlertCircle, 
  UserCircle,
  HelpCircle,
  RefreshCw,
  Loader2,
  Info,
  Volume2,
  VolumeX,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  Sliders,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  ShieldCheck,
  PiggyBank,
  Calculator,
  RotateCcw,
  Compass,
  ArrowRight
} from "lucide-react";
import { ChatMessage, Transaction } from "../types";

export type CoachPersona = "wealth_builder" | "frugal_auditor" | "fire_strategist";

interface GuidanceTabProps {
  chatHistory: ChatMessage[];
  onSendMessage: (text: string, persona?: string) => void;
  loadingMessage: boolean;
  transactions: Transaction[];
  availableBalance: number;
  monthlyIncome: number;
  monthlyExpenses?: number;
  onClearChat?: () => void;
}

export default function GuidanceTab({
  chatHistory,
  onSendMessage,
  loadingMessage,
  transactions,
  availableBalance,
  monthlyIncome,
  monthlyExpenses = 34650,
  onClearChat
}: GuidanceTabProps) {
  const [inputText, setInputText] = useState("");
  const [selectedPersona, setSelectedPersona] = useState<CoachPersona>("wealth_builder");
  const [showSimulator, setShowSimulator] = useState(false);
  
  // Interactive Simulation Playground State
  const [simPercent, setSimPercent] = useState<number>(18);
  const [simYears, setSimYears] = useState<number>(10);
  const [simAnnualReturn, setSimAnnualReturn] = useState<number>(9.0);

  // Message interactivity states
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [messageFeedback, setMessageFeedback] = useState<Record<string, "up" | "down">>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, loadingMessage]);

  // Clean up speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSend = (e: FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || loadingMessage) return;
    onSendMessage(inputText.trim(), selectedPersona);
    setInputText("");
  };

  const handleTriggerPrompt = (text: string) => {
    if (loadingMessage) return;
    onSendMessage(text, selectedPersona);
  };

  // Text-to-Speech Toggle
  const toggleSpeech = (id: string, text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (speakingMessageId === id) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();
    
    // Clean markdown asterisks and headers for natural speech
    const cleanSpeech = text
      .replace(/###/g, "")
      .replace(/\*\*/g, "")
      .replace(/•/g, "")
      .replace(/-/g, "")
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Pick English South African / British / Global voice if available
    const voices = window.speechSynthesis.getVoices();
    const saVoice = voices.find(v => v.lang.includes("en-ZA") || v.lang.includes("en-GB") || v.lang.includes("en"));
    if (saVoice) utterance.voice = saVoice;

    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);

    setSpeakingMessageId(id);
    window.speechSynthesis.speak(utterance);
  };

  // Copy to clipboard
  const copyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  // Feedback rating
  const rateMessage = (id: string, type: "up" | "down") => {
    setMessageFeedback(prev => ({ ...prev, [id]: type }));
  };

  // ----------------------------------------------------
  // INTERACTIVE SIMULATION CALCULATIONS
  // ----------------------------------------------------
  const monthlyDeposit = (monthlyIncome * simPercent) / 100;
  const monthlyRate = (simAnnualReturn / 100) / 12;
  const totalMonths = simYears * 12;
  
  // Future Value calculation of ordinary annuity with compound growth
  const basePortfolio = Math.round(monthlyIncome * 1.0); // baseline invested portfolio
  let simFutureVal = basePortfolio;
  for (let m = 0; m < totalMonths; m++) {
    simFutureVal = (simFutureVal + monthlyDeposit) * (1 + monthlyRate);
  }
  const totalContributed = basePortfolio + (monthlyDeposit * totalMonths);
  const totalGains = Math.max(0, simFutureVal - totalContributed);

  // Financial health vitals
  const savingsMargin = monthlyIncome > 0 ? (((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100).toFixed(1) : "23.0";
  const fixedObligations = Math.round(monthlyIncome * 0.274); // baseline fixed commitments
  const fixedRatio = monthlyIncome > 0 ? ((fixedObligations / monthlyIncome) * 100).toFixed(1) : "27.4";
  const runwayMonths = monthlyExpenses > 0 ? (availableBalance / monthlyExpenses).toFixed(1) : "2.8";

  // Contextual Carousel Prompts
  const quickChips = [
    { label: "Fluctuation Audit", query: "Audit my May to November cash flow fluctuations. Why did July spike and how should I prepare?" },
    { label: "50/30/20 Blueprint", query: `Break down a 50/30/20 budget for my R${monthlyIncome.toFixed(0)} salary.` },
    { label: "SARS TFSA Rules", query: "Explain South African Tax-Free Savings Account (TFSA) limits and tax immunities." },
    { label: "Car Sinking Fund", query: "How should I structure an automated WealthIQ pocket sinking fund for annual car maintenance?" },
    { label: "Sister & Family Allowance", query: "What is the best way to budget for family support and sister university allowance without draining savings?" },
    { label: "Subscriptions Audit", query: "Audit my digital subscriptions (Netflix, YouTube, Spotify, Fibre) and show where I can save." },
    { label: "10-Year ETF Compounding", query: `Project my R${Math.round(monthlyIncome * 0.18).toLocaleString("en-ZA")}/mo ETF investment compounding over 10 years at 9% p.a.` },
    { label: "Maximize Interest", query: "How can I earn up to 8.25% interest using WealthIQ multi-notice savings pockets?" }
  ];

  return (
    <div id="guidance-tab-content" className="p-3 sm:p-6 space-y-3 sm:space-y-4 max-w-5xl mx-auto flex flex-col h-[calc(100dvh-4.5rem)] text-left relative overflow-hidden">
      
      {/* Header Info & Interactive Persona Switcher */}
      <div className="shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-slate-800 tracking-tight flex items-center space-x-2 flex-wrap">
            <span>Smart AI Guidance</span>
            <span className="bg-capitec-red/10 text-capitec-red text-xs px-2.5 py-1 rounded-full font-semibold">
              Coach Mode
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time interactive South African financial coaching, personalized budget simulations, and tax strategies.
          </p>
        </div>

        {/* Persona Mode Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold gap-1 shrink-0 self-stretch sm:self-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setSelectedPersona("wealth_builder")}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center space-x-1 whitespace-nowrap ${
              selectedPersona === "wealth_builder"
                ? "bg-white text-emerald-800 shadow-xs font-bold"
                : "text-slate-500 hover:text-slate-800"
            }`}
            title="Balanced, pragmatic wealth building & compound growth"
          >
            <span>Wealth Builder</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedPersona("frugal_auditor")}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center space-x-1 whitespace-nowrap ${
              selectedPersona === "frugal_auditor"
                ? "bg-white text-capitec-red shadow-xs font-bold"
                : "text-slate-500 hover:text-slate-800"
            }`}
            title="Strict audit of expenses, spending cuts & sinking funds"
          >
            <span>Budget Auditor</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedPersona("fire_strategist")}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center space-x-1 whitespace-nowrap ${
              selectedPersona === "fire_strategist"
                ? "bg-white text-indigo-700 shadow-xs font-bold"
                : "text-slate-500 hover:text-slate-800"
            }`}
            title="High-yield investing, early retirement & aggressive compounding"
          >
            <span>FIRE Strategist</span>
          </button>
        </div>
      </div>

      {/* Interactive Financial Health Scorecard */}
      <div className="shrink-0 bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-3xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-bold font-mono text-sm shrink-0">
            88
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-bold text-slate-800">Financial Vitals Score:</span>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Excellent (88/100)
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Tap any vitals card below to have Coach run a live audit</p>
          </div>
        </div>

        {/* 3 Clickable Vitals Cards */}
        <div className="flex items-center space-x-2 sm:space-x-3 text-xs w-full sm:w-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => handleTriggerPrompt(`Coach, please audit my ${savingsMargin}% savings margin and recommend how to optimize it.`)}
            className="p-2 bg-slate-50 hover:bg-emerald-50 border border-slate-100 hover:border-emerald-200 rounded-lg text-left transition cursor-pointer shrink-0"
            title="Click to audit savings margin"
          >
            <span className="text-[10px] text-slate-400 block font-semibold uppercase">Savings Rate</span>
            <span className="font-mono font-bold text-emerald-600">{savingsMargin}%</span>
            <span className="text-[9px] text-slate-400 ml-1">(&gt;20% target)</span>
          </button>

          <button
            type="button"
            onClick={() => handleTriggerPrompt(`Coach, please evaluate my fixed obligations ratio of ${fixedRatio}% (WesBank vehicle finance and child support).`)}
            className="p-2 bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 rounded-lg text-left transition cursor-pointer shrink-0"
            title="Click to audit fixed commitments"
          >
            <span className="text-[10px] text-slate-400 block font-semibold uppercase">Fixed Ratio</span>
            <span className="font-mono font-bold text-blue-600">{fixedRatio}%</span>
            <span className="text-[9px] text-slate-400 ml-1">(&lt;35% safe)</span>
          </button>

          <button
            type="button"
            onClick={() => handleTriggerPrompt(`Coach, assess my current cash runway of ${runwayMonths} months (R${availableBalance.toLocaleString("en-ZA")}) and advise on emergency reserves.`)}
            className="p-2 bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 rounded-lg text-left transition cursor-pointer shrink-0"
            title="Click to stress-test runway"
          >
            <span className="text-[10px] text-slate-400 block font-semibold uppercase">Cash Runway</span>
            <span className="font-mono font-bold text-indigo-600">{runwayMonths} mos</span>
            <span className="text-[9px] text-slate-400 ml-1">in reserve</span>
          </button>
        </div>
      </div>

      {/* Interactive Simulation Playground Drawer Toggle */}
      <div className="shrink-0">
        <button
          type="button"
          onClick={() => setShowSimulator(!showSimulator)}
          className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-slate-900 to-capitec-blue text-white rounded-xl shadow-sm hover:opacity-95 transition text-xs font-semibold cursor-pointer"
        >
          <div className="flex items-center space-x-2">
            <Calculator className="w-4 h-4 text-emerald-400" />
            <span>Interactive "What-If" Wealth & Compounding Playground</span>
            <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full border border-emerald-400/30">
              Live Tool
            </span>
          </div>
          <div className="flex items-center space-x-1 text-slate-300">
            <span>{showSimulator ? "Hide Calculator" : "Open Calculator"}</span>
            {showSimulator ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {/* Expanded Interactive Calculator Panel */}
        {showSimulator && (
          <div className="mt-2 p-3 sm:p-4 bg-white border border-slate-200 rounded-xl shadow-sm animate-fadeIn space-y-4 text-xs max-h-[32vh] overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Slider: Investment % */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-slate-700">Monthly Allocation:</span>
                  <span className="font-mono font-bold text-capitec-blue">{simPercent}% (R{monthlyDeposit.toFixed(0)}/mo)</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="35"
                  step="1"
                  value={simPercent}
                  onChange={(e) => setSimPercent(Number(e.target.value))}
                  className="w-full accent-capitec-blue cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>10% (R4,500)</span>
                  <span>18% (Standard)</span>
                  <span>35% (R15,750)</span>
                </div>
              </div>

              {/* Horizon Buttons */}
              <div>
                <span className="font-semibold text-slate-700 block mb-1.5">Horizon Timeline:</span>
                <div className="grid grid-cols-4 gap-1">
                  {[5, 10, 15, 20].map((y) => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => setSimYears(y)}
                      className={`py-1.5 rounded-lg font-mono font-semibold transition cursor-pointer text-center ${
                        simYears === y 
                          ? "bg-capitec-blue text-white shadow-xs" 
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {y}y
                    </button>
                  ))}
                </div>
              </div>

              {/* Annual Return */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-slate-700">Nominal Annual Return:</span>
                  <span className="font-mono font-bold text-emerald-600">{simAnnualReturn}% p.a.</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {[7.5, 9.0, 11.0].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setSimAnnualReturn(r)}
                      className={`py-1.5 rounded-lg font-mono font-semibold transition cursor-pointer text-center ${
                        simAnnualReturn === r 
                          ? "bg-emerald-600 text-white shadow-xs" 
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {r}%
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Simulation Results Bar */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg font-bold">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Projected Portfolio Value ({simYears} Years):</span>
                  <span className="text-base sm:text-lg font-bold font-mono text-slate-900">
                    R{simFutureVal.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-4 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Contributions:</span>
                  <span className="font-bold text-slate-700">R{totalContributed.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Compound Interest:</span>
                  <span className="font-bold text-emerald-600">+R{totalGains.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}</span>
                </div>
              </div>

              {/* Action Button: Ask Coach */}
              <button
                type="button"
                onClick={() => handleTriggerPrompt(`Coach, please analyze my simulation: If I invest R${monthlyDeposit.toFixed(0)}/month (${simPercent}% of salary) for ${simYears} years at ${simAnnualReturn}% return to reach R${simFutureVal.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}, what is your strategic advice?`)}
                className="px-3.5 py-2 bg-capitec-blue hover:bg-capitec-blue-light text-white font-semibold rounded-lg shadow-xs transition flex items-center space-x-1.5 cursor-pointer ml-auto"
              >
                <span>Ask Coach To Plan This</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Chat Interface Container */}
      <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col min-h-0 shadow-sm relative">
        
        {/* Chat Stream Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50">
          
          {/* Welcome Message */}
          <div className="flex space-x-3 text-left">
            <div className="w-9 h-9 rounded-full bg-capitec-blue text-white flex items-center justify-center shrink-0 font-bold font-display text-sm">
              IQ
            </div>
            <div className="bg-white border border-slate-100 p-4 rounded-xl rounded-tl-none shadow-3xs max-w-xl text-sm leading-relaxed text-slate-700">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-slate-800">
                  Welcome to Wealth<span className="text-capitec-red">IQ</span> AI Coach!
                </span>
                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {selectedPersona === "frugal_auditor" 
                    ? "Budget Auditor Mode" 
                    : selectedPersona === "fire_strategist"
                    ? "FIRE Strategist Mode"
                    : "Wealth Builder Mode"}
                </span>
              </div>
              <p>
                Hello Ofentse! I have analyzed your live May–November ledger with fluctuating seasonal expenses:
              </p>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 my-2 text-xs font-mono text-slate-600 space-y-1">
                <div>• Available Balance: <strong className="text-slate-800">R{availableBalance.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</strong></div>
                <div>• Baseline Take-Home: <strong className="text-slate-800">R{monthlyIncome.toLocaleString("en-ZA", { minimumFractionDigits: 2 })} / mo</strong></div>
                <div>• Seasonal Outflow Range: <strong className="text-slate-800">R30.9k (Oct) – R42.9k (Jul)</strong></div>
                <div>• Active Fluctuation Entries: <strong className="text-slate-800">{transactions.length} verified transactions</strong></div>
              </div>
              <p className="text-xs text-slate-500">
                Ask me any question, tap the vitals cards above, run a What-If compound simulation, or pick any quick prompt below!
              </p>
            </div>
          </div>

          {/* Active Chat History */}
          {chatHistory.map((msg) => {
            const isCoach = msg.sender === "coach";
            const isSpeaking = speakingMessageId === msg.id;
            const isCopied = copiedMessageId === msg.id;
            const rating = messageFeedback[msg.id];

            return (
              <div key={msg.id} id={`chat-msg-${msg.id}`} className={`flex space-x-3 text-left ${isCoach ? "" : "flex-row-reverse space-x-reverse"}`}>
                
                {/* Avatar */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-sm ${
                  isCoach ? "bg-capitec-blue text-white font-display shadow-xs" : "bg-slate-800 text-white font-sans"
                }`}>
                  {isCoach ? "IQ" : "ME"}
                </div>

                {/* Bubble Container */}
                <div className={`group relative p-4 rounded-xl shadow-3xs max-w-xl text-sm leading-relaxed ${
                  isCoach 
                    ? "bg-white border border-slate-200/90 text-slate-700 rounded-tl-none" 
                    : "bg-slate-900 text-white rounded-tr-none"
                }`}>
                  
                  {/* Markdown Renderer */}
                  <div className="space-y-2 whitespace-pre-wrap">
                    {msg.text.split("\n").map((line, lidx) => {
                      if (line.startsWith("### ")) {
                        return (
                          <h4 
                            key={lidx} 
                            className="font-bold text-base mt-2 mb-1 border-b border-slate-100 pb-1 font-display" 
                            style={{ color: isCoach ? "#002C4B" : "#ffffff" }}
                          >
                            {line.replace("### ", "")}
                          </h4>
                        );
                      }
                      if (line.startsWith("**") && line.endsWith("**")) {
                        return <strong key={lidx} className="block font-bold text-slate-800 mt-1">{line.replace(/\*\*/g, "")}</strong>;
                      }
                      if (line.trim().startsWith("- ")) {
                        return (
                          <div key={lidx} className="flex items-start space-x-1.5 ml-1 my-0.5">
                            <span className="text-capitec-red font-bold select-none shrink-0">•</span>
                            <span>{line.replace("- ", "")}</span>
                          </div>
                        );
                      }
                      if (line.trim().startsWith("• ")) {
                        return (
                          <div key={lidx} className="flex items-start space-x-1.5 ml-3 my-0.5 text-xs text-slate-600">
                            <span className="text-slate-400 select-none shrink-0">›</span>
                            <span>{line.replace("• ", "")}</span>
                          </div>
                        );
                      }
                      return <p key={lidx}>{line}</p>;
                    })}
                  </div>

                  {/* Interactive Action Controls on Coach Messages */}
                  {isCoach && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center space-x-2">
                        {/* Audio Speak Button */}
                        <button
                          type="button"
                          onClick={() => toggleSpeech(msg.id, msg.text)}
                          className={`p-1.5 rounded-lg border transition cursor-pointer flex items-center space-x-1 ${
                            isSpeaking 
                              ? "bg-red-50 text-capitec-red border-red-200 animate-pulse font-bold" 
                              : "bg-slate-50 hover:bg-slate-100 text-slate-500 border-slate-200"
                          }`}
                          title={isSpeaking ? "Stop Speaking" : "Read Advice Aloud"}
                        >
                          {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                          <span className="text-[10px]">{isSpeaking ? "Stop" : "Listen"}</span>
                        </button>

                        {/* Copy Button */}
                        <button
                          type="button"
                          onClick={() => copyMessage(msg.id, msg.text)}
                          className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200 transition cursor-pointer flex items-center space-x-1"
                          title="Copy to clipboard"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span className="text-[10px]">{isCopied ? "Copied" : "Copy"}</span>
                        </button>
                      </div>

                      {/* Helpful Rating Feedback */}
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => rateMessage(msg.id, "up")}
                          className={`p-1.5 rounded transition cursor-pointer ${
                            rating === "up" ? "text-emerald-600 bg-emerald-50" : "hover:text-slate-700"
                          }`}
                          title="Helpful advice"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => rateMessage(msg.id, "down")}
                          className={`p-1.5 rounded transition cursor-pointer ${
                            rating === "down" ? "text-red-500 bg-red-50" : "hover:text-slate-700"
                          }`}
                          title="Needs improvement"
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                </div>

              </div>
            );
          })}

          {/* Dynamic typing indicator */}
          {loadingMessage && (
            <div className="flex space-x-3 text-left">
              <div className="w-9 h-9 rounded-full bg-capitec-blue text-white flex items-center justify-center shrink-0 font-bold font-display text-sm">
                IQ
              </div>
              <div className="bg-white border border-slate-200 p-3.5 rounded-xl rounded-tl-none shadow-3xs text-xs text-slate-500 flex items-center space-x-2.5">
                <Loader2 className="w-4 h-4 animate-spin text-capitec-red" />
                <span>Coach is cross-referencing your transactions and compiling South African insights...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Text Form Area & Contextual Quick Chips */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-white shrink-0 space-y-2 sm:space-y-3 sticky bottom-0 z-30 shadow-lg">
          
          {/* Always-Accessible Quick Prompts Carousel */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 no-scrollbar text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center space-x-1 mr-1">
              <Sparkles className="w-3 h-3 text-capitec-red" />
              <span>Triggers:</span>
            </span>
            {quickChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleTriggerPrompt(chip.query)}
                disabled={loadingMessage}
                className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 hover:border-capitec-blue rounded-lg transition whitespace-nowrap shrink-0 text-xs font-medium cursor-pointer shadow-3xs"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Form Input Bar */}
          <form onSubmit={handleSend} className="flex items-center space-x-2 sm:space-x-3">
            {onClearChat && chatHistory.length > 0 && (
              <button
                type="button"
                onClick={onClearChat}
                className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-lg transition cursor-pointer shrink-0"
                title="Restart coaching conversation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            <input
              id="guidance-chat-input"
              type="text"
              placeholder={`Ask Coach (${selectedPersona === "frugal_auditor" ? "Budget Auditor" : selectedPersona === "fire_strategist" ? "FIRE Strategist" : "Wealth Builder"})...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={loadingMessage}
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 focus:border-capitec-blue focus:bg-white text-xs sm:text-sm rounded-lg outline-none text-slate-800 transition"
              required
            />

            <button
              id="btn-send-message"
              type="submit"
              disabled={loadingMessage || !inputText.trim()}
              className="px-5 py-3 bg-capitec-blue hover:bg-capitec-blue-light disabled:bg-slate-300 text-white rounded-lg font-semibold text-xs sm:text-sm shadow-sm transition flex items-center justify-center shrink-0 cursor-pointer"
            >
              <Send className="w-4 h-4 mr-1 sm:mr-1.5" />
              <span className="hidden sm:inline">Ask Coach</span>
            </button>
          </form>

        </div>

      </div>

    </div>
  );
}
