import { useState, useRef, useEffect, FormEvent } from "react";
import { 
  Send, 
  Sparkles, 
  AlertCircle, 
  UserCircle,
  HelpCircle,
  RefreshCw,
  Loader2,
  Info
} from "lucide-react";
import { ChatMessage, Transaction } from "../types";

interface GuidanceTabProps {
  chatHistory: ChatMessage[];
  onSendMessage: (text: string) => void;
  loadingMessage: boolean;
  transactions: Transaction[];
  availableBalance: number;
  monthlyIncome: number;
}

export default function GuidanceTab({
  chatHistory,
  onSendMessage,
  loadingMessage,
  transactions,
  availableBalance,
  monthlyIncome
}: GuidanceTabProps) {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, loadingMessage]);

  const handleSend = (e: FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || loadingMessage) return;
    onSendMessage(inputText.trim());
    setInputText("");
  };

  // Quick suggestion prompts
  const suggestionPrompts = [
    { label: "Analyze my current transactions", text: "Please look at my active simulated transaction history. How is my budget looking, and where can I optimize?" },
    { label: "Suggest a 50/30/20 budget based on my income", text: `Suggest a strict 50/30/20 South African budget based on my monthly salary of R${monthlyIncome.toFixed(0)}.` },
    { label: "Explain Tax-Free Savings Accounts (TFSA)", text: "How do South African Tax-Free Savings Accounts (TFSA) work, and what are the SARS limits?" },
    { label: "How to maximize Capitec savings interest", text: "What is the best way to leverage Capitec pockets and fixed deposit notices to get maximum interest yield?" }
  ];

  return (
    <div id="guidance-tab-content" className="p-8 space-y-6 max-w-5xl mx-auto flex flex-col h-[calc(100vh-64px)] text-left">
      
      {/* Header info */}
      <div className="shrink-0">
        <h1 className="text-3xl font-bold font-display text-slate-800 tracking-tight flex items-center space-x-2">
          <span>Smart AI Guidance</span>
          <span className="bg-capitec-red/10 text-capitec-red text-xs px-2.5 py-1 rounded-full font-semibold animate-pulse">
            Coach Mode
          </span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Chat with your Wealth<span className="text-capitec-red">IQ</span> financial planner. Get tailored South African tax, budgeting, and compound interest insights.
        </p>
      </div>

      {/* Main chat interface block */}
      <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col min-h-0 shadow-sm relative">
        
        {/* Chat Stream Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
          
          {/* Welcome Message */}
          <div className="flex space-x-3 text-left">
            <div className="w-9 h-9 rounded-full bg-capitec-blue text-white flex items-center justify-center shrink-0 font-bold font-display text-sm">
              IQ
            </div>
            <div className="bg-white border border-slate-100 p-4 rounded-xl rounded-tl-none shadow-3xs max-w-xl text-sm leading-relaxed text-slate-700">
              <span className="font-bold text-slate-800 block mb-1">Welcome to Wealth<span className="text-capitec-red">IQ</span> AI Coach!</span>
              <p>
                Hello! I am your AI-powered South African personal finance assistant. I have full context on your current simulated accounts:
              </p>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 my-2.5 text-xs font-mono text-slate-600 space-y-1">
                <div>• Current Balance: <strong className="text-slate-800">R{availableBalance.toLocaleString("en-ZA")}</strong></div>
                <div>• Active Salary: <strong className="text-slate-800">R{monthlyIncome.toLocaleString("en-ZA")}</strong></div>
                <div>• Transactions Logged: <strong className="text-slate-800">{transactions.length} entries</strong></div>
              </div>
              <p>
                Ask me any questions on saving goals, SARS tax brackets, compound interest, or click one of the quick triggers below to start!
              </p>
            </div>
          </div>

          {/* Render Active Chat History */}
          {chatHistory.map((msg) => {
            const isCoach = msg.sender === "coach";
            return (
              <div key={msg.id} id={`chat-msg-${msg.id}`} className={`flex space-x-3 text-left ${isCoach ? "" : "flex-row-reverse space-x-reverse"}`}>
                
                {/* Avatar */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-sm ${
                  isCoach ? "bg-capitec-blue text-white font-display" : "bg-slate-200 text-slate-700 font-sans"
                }`}>
                  {isCoach ? "IQ" : "ME"}
                </div>

                {/* Bubble */}
                <div className={`p-4 rounded-xl shadow-3xs max-w-xl text-sm leading-relaxed ${
                  isCoach 
                    ? "bg-white border border-slate-100 text-slate-700 rounded-tl-none" 
                    : "bg-slate-800 text-white rounded-tr-none"
                }`}>
                  
                  {/* Handle Markdown-style bold/bullet lists simply and cleanly */}
                  <div className="space-y-2 whitespace-pre-wrap">
                    {msg.text.split("\n").map((line, lidx) => {
                      if (line.startsWith("### ")) {
                        return <h4 key={lidx} className="font-bold text-base mt-2 mb-1 border-b pb-0.5" style={{ color: isCoach ? "#002C4B" : "#ffffff" }}>{line.replace("### ", "")}</h4>;
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
                      return <p key={lidx}>{line}</p>;
                    })}
                  </div>

                </div>

              </div>
            );
          })}

          {/* Loader bubble */}
          {loadingMessage && (
            <div className="flex space-x-3 text-left">
              <div className="w-9 h-9 rounded-full bg-capitec-blue text-white flex items-center justify-center shrink-0 font-bold font-display text-sm">
                IQ
              </div>
              <div className="bg-white border border-slate-100 p-4 rounded-xl rounded-tl-none shadow-3xs text-sm text-slate-400 flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin text-capitec-red" />
                <span>Coach is analyzing your transaction portfolio...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Text Form Area */}
        <div className="p-4 border-t border-slate-200 bg-white shrink-0">
          
          {/* Quick trigger buttons row */}
          {chatHistory.length === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              {suggestionPrompts.map((p, idx) => (
                <button
                  key={idx}
                  id={`suggestion-prompt-btn-${idx}`}
                  onClick={() => onSendMessage(p.text)}
                  className="p-2.5 text-left border border-slate-200 hover:border-capitec-red text-slate-600 hover:text-capitec-red text-xs rounded-lg bg-slate-50/50 hover:bg-slate-50 transition shadow-3xs cursor-pointer font-medium"
                >
                  💡 {p.label}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSend} className="flex space-x-3">
            <input
              id="guidance-chat-input"
              type="text"
              placeholder="Ask anything (e.g. Can you plan a grocery budget?)..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={loadingMessage}
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 focus:border-capitec-blue focus:bg-white text-sm rounded-lg outline-none text-slate-700 transition"
              required
            />
            <button
              id="btn-send-message"
              type="submit"
              disabled={loadingMessage || !inputText.trim()}
              className="px-5 py-3 bg-capitec-blue hover:bg-capitec-blue-light disabled:bg-slate-300 text-white rounded-lg font-semibold text-sm shadow-sm transition flex items-center justify-center shrink-0 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}
