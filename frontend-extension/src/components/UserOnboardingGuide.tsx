import React, { useState } from "react";
import {
  X,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  Wallet,
  Receipt,
  PiggyBank,
  CreditCard,
  Sparkles,
  ShieldCheck,
  FileText,
  BookOpen
} from "lucide-react";

interface UserOnboardingGuideProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  startingBalance: number;
  onOpenAddTransaction?: () => void;
  onNavigateToTab?: (tab: string) => void;
}

export default function UserOnboardingGuide({
  isOpen,
  onClose,
  userName,
  startingBalance,
  onOpenAddTransaction,
  onNavigateToTab
}: UserOnboardingGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(true);

  if (!isOpen) return null;

  const todayFormatted = new Date().toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const steps = [
    {
      id: "fresh-start",
      badge: "Account Initialized",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      title: "Clean Slate Starting Today",
      subtitle: `Welcome to WealthIQ, ${userName}! Your financial journey begins now.`,
      icon: Calendar,
      iconColor: "text-emerald-600 bg-emerald-50",
      content: (
        <div className="space-y-4 text-left">
          <p className="text-sm text-slate-600 leading-relaxed">
            Your newly opened <strong>Global One Account</strong> starts with a completely clean ledger on <strong>{todayFormatted}</strong>.
          </p>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Account Status:</span>
              <span className="font-semibold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded">Active & Verified</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Registration Date:</span>
              <span className="font-mono font-semibold text-slate-800">{todayFormatted}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Opening Balance:</span>
              <span className="font-mono font-bold text-capitec-blue text-sm">
                R{startingBalance.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="flex items-start space-x-2 text-xs text-slate-500 bg-blue-50/60 p-3 rounded-lg border border-blue-100">
            <ShieldCheck className="w-4 h-4 text-capitec-blue shrink-0 mt-0.5" />
            <p>
              <strong>Data Isolation Guaranteed:</strong> No historical transactions or sample data from other accounts will ever appear on your profile. Every balance, chart, and statement reflects only your real activity.
            </p>
          </div>
        </div>
      )
    },
    {
      id: "dashboard-overview",
      badge: "Live Telemetry",
      badgeColor: "bg-blue-50 text-capitec-blue border-blue-200",
      title: "Dashboard & Real-Time Cash Flow",
      subtitle: "Track your income, living expenses, and net surplus in real time.",
      icon: Wallet,
      iconColor: "text-capitec-blue bg-blue-50",
      content: (
        <div className="space-y-4 text-left">
          <p className="text-sm text-slate-600 leading-relaxed">
            The <strong>Dashboard Overview</strong> provides a command center for your day-to-day liquidity and monthly commitments:
          </p>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Available Balance</span>
              <span className="font-bold text-slate-800 text-sm font-mono mt-1 block">R{startingBalance.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</span>
              <span className="text-[11px] text-slate-500 mt-1 block">Instant transactional funds</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Savings Margin</span>
              <span className="font-bold text-emerald-600 text-sm font-mono mt-1 block">Live Calculation</span>
              <span className="text-[11px] text-slate-500 mt-1 block">Auto-updates as you spend</span>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            As you log income and expenses, the <strong>Monthly Cash Flow</strong> and <strong>Spending Breakdown</strong> doughnut charts adapt dynamically to highlight where your money goes.
          </p>
        </div>
      )
    },
    {
      id: "transactions-statements",
      badge: "Financial Records",
      badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
      title: "Transactions & Stamped PDF Statements",
      subtitle: "Full audit trail with biometrically authorized bank statements.",
      icon: Receipt,
      iconColor: "text-indigo-600 bg-indigo-50",
      content: (
        <div className="space-y-4 text-left">
          <p className="text-sm text-slate-600 leading-relaxed">
            Record every deposit, EFT transfer, or debit card purchase with precise categories (Food, Transport, Utilities, etc.).
          </p>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-800">
              <FileText className="w-4 h-4 text-capitec-red" />
              <span>Official Capitec Bank Statements</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Generate tamper-evident 1-month or 3-month PDF bank statements for vehicle finance, home loans, or tax submissions with your official account number and biometric verification stamp.
            </p>
          </div>

          {onOpenAddTransaction && (
            <button
              onClick={() => {
                onClose();
                onOpenAddTransaction();
              }}
              className="w-full flex items-center justify-center space-x-2 py-2 bg-capitec-red hover:bg-capitec-red-dark text-white rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              <span>Log Your First Transaction Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )
    },
    {
      id: "savings-pockets",
      badge: "Compound Growth",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      title: "Savings Pockets & Smart Round-Up",
      subtitle: "Grow your wealth effortlessly at competitive interest rates.",
      icon: PiggyBank,
      iconColor: "text-emerald-600 bg-emerald-50",
      content: (
        <div className="space-y-4 text-left">
          <p className="text-sm text-slate-600 leading-relaxed">
            Separate your emergency fund, car deposit, or holiday goals into dedicated <strong>Savings Pockets</strong>:
          </p>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-lg flex items-center justify-between">
              <div>
                <span className="font-bold text-emerald-900 block">Up to 8.25% Annual Return</span>
                <span className="text-emerald-700 text-[11px]">Interest calculated daily and compounded monthly</span>
              </div>
              <span className="font-mono font-bold text-emerald-800 text-sm">8.25%</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <span className="font-bold text-slate-800 block">Smart Round-Up</span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Automatically round up debit transactions to the nearest R5, R10, or R20, funneling spare cents straight into your high-yield pocket.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "ai-coach-security",
      badge: "Intelligent & Secure",
      badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
      title: "AI Financial Coach & Bank-Grade Security",
      subtitle: "Personalized South African advisory protected by biometric verification.",
      icon: Sparkles,
      iconColor: "text-amber-600 bg-amber-50",
      content: (
        <div className="space-y-4 text-left">
          <p className="text-sm text-slate-600 leading-relaxed">
            Get 24/7 personal finance insights powered by Google Gemini AI tailored specifically to South African economic conditions:
          </p>

          <div className="space-y-2 text-xs">
            <div className="flex items-center space-x-2 text-slate-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span><strong>SARS Tax Optimizations:</strong> Tax-Free Savings (TFSA) and retirement deductions.</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span><strong>Retail Grocery Strategies:</strong> Bulk savings across Checkers, Pick n Pay, and Woolworths.</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span><strong>Tokenized Virtual Cards:</strong> Generate disposable virtual cards with custom spend limits.</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span><strong>Biometric Protection:</strong> 4-digit PIN and 3D facial liveness verification for all sensitive actions.</span>
            </div>
          </div>
        </div>
      )
    }
  ];

  const handleFinish = () => {
    if (dontShowAgain) {
      try {
        const key = `wealthiq_guide_seen_${userName.toLowerCase().replace(/[^a-z0-9_]/g, "_")}`;
        localStorage.setItem(key, "true");
      } catch {}
    }
    onClose();
  };

  const step = steps[currentStep];
  const StepIcon = step.icon;

  return (
    <div
      id="user-onboarding-guide-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn"
    >
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
        {/* Top Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-capitec-blue text-white rounded-xl shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="text-base font-bold text-slate-800">
                Wealth<span className="text-capitec-red">IQ</span> Quick Start Guide
              </h3>
              <p className="text-[11px] text-slate-400">
                Step {currentStep + 1} of {steps.length}
              </p>
            </div>
          </div>
          <button
            id="btn-close-onboarding-guide"
            onClick={handleFinish}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            title="Close Guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 h-1">
          <div
            className="bg-capitec-red h-1 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <div className="flex items-center space-x-3 text-left">
            <div className={`p-3 rounded-xl ${step.iconColor}`}>
              <StepIcon className="w-6 h-6" />
            </div>
            <div>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${step.badgeColor}`}>
                {step.badge}
              </span>
              <h4 className="text-lg font-bold text-slate-900 mt-1 leading-snug">
                {step.title}
              </h4>
            </div>
          </div>

          <p className="text-xs text-slate-500 font-medium text-left">
            {step.subtitle}
          </p>

          <div className="pt-2">
            {step.content}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/70 flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            {/* Step Indicators */}
            <div className="flex items-center space-x-1.5">
              {steps.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    idx === currentStep
                      ? "w-6 bg-capitec-red"
                      : "w-2 bg-slate-300 hover:bg-slate-400"
                  }`}
                  title={`Go to step ${idx + 1}`}
                />
              ))}
            </div>

            {/* Back / Next Buttons */}
            <div className="flex items-center space-x-2">
              {currentStep > 0 && (
                <button
                  id="btn-onboarding-prev"
                  type="button"
                  onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
                  className="flex items-center space-x-1 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              )}

              {currentStep < steps.length - 1 ? (
                <button
                  id="btn-onboarding-next"
                  type="button"
                  onClick={() => setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1))}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-capitec-blue hover:bg-capitec-blue-light text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
                >
                  <span>Next</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  id="btn-onboarding-finish"
                  type="button"
                  onClick={handleFinish}
                  className="flex items-center space-x-1.5 px-5 py-2 bg-capitec-red hover:bg-capitec-red-dark text-white text-xs font-bold rounded-lg shadow-xs transition cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Start Banking</span>
                </button>
              )}
            </div>
          </div>

          {/* "Don't show again" checkbox */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center space-x-2 text-[11px] text-slate-500 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-3.5 h-3.5 text-capitec-red rounded border-slate-300 focus:ring-capitec-red"
              />
              <span>Don't show automatically on next login</span>
            </label>
            <button
              onClick={handleFinish}
              className="text-[11px] text-slate-400 hover:text-slate-600 underline cursor-pointer"
            >
              Skip tour
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
