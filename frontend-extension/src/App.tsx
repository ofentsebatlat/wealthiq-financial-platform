import { useState, FormEvent, useEffect } from "react";
import { X, HelpCircle, AlertCircle, Info, Bell, Headphones, CheckCircle2, ShieldCheck } from "lucide-react";

// Types
import {
  Transaction,
  InvestmentItem,
  SimulationGoal,
  ChatMessage,
  VirtualCard,
  SavingsPocket,
  BankNotification,
  SupportTicket
} from "./types";

// Components
import Sidebar from "./components/Sidebar";
import DashboardTab from "./components/DashboardTab";
import TransactionsTab from "./components/TransactionsTab";
import InvestmentsTab from "./components/InvestmentsTab";
import CalculatorTab from "./components/CalculatorTab";
import SimulationsTab from "./components/SimulationsTab";
import GuidanceTab from "./components/GuidanceTab";
import VirtualCardsTab from "./components/VirtualCardsTab";
import SavingsTab from "./components/SavingsTab";
import SecurityEnrollment, { BankOnboardingDetails } from "./components/SecurityEnrollment";
import BiometricVerifyModal from "./components/BiometricVerifyModal";
import LoginPage from "./components/LoginPage";
import ProfileTab from "./components/ProfileTab";
import AdminPortal from "./components/AdminPortal";
import NotificationDrawer from "./components/NotificationDrawer";
import BankSupportModal from "./components/BankSupportModal";
import LoadingPage from "./components/LoadingPage";
import SessionLockModal from "./components/SessionLockModal";
import { SIMULATED_TRANSACTIONS, BOKANG_SIMULATED_TRANSACTIONS } from "./data/simulatedTransactions";

// Firebase Sync Utilities
import {
  fetchSecurityProfile,
  saveSecurityProfile,
  fetchTransactions,
  saveTransaction,
  deleteTransaction,
  fetchInvestments,
  saveInvestment,
  deleteInvestment,
  fetchSimulationGoals,
  saveSimulationGoal,
  deleteSimulationGoal,
  fetchVirtualCards,
  saveVirtualCard,
  deleteVirtualCard,
  fetchSavingsPockets,
  saveSavingsPocket,
  deleteSavingsPocket
} from "./utils/firebaseSync";

// Initial transactions: Full May–Nov 2026 comprehensive simulated ledger (121 records)
const INITIAL_TRANSACTIONS: Transaction[] = SIMULATED_TRANSACTIONS;

// Initial investments
const INITIAL_INVESTMENTS: InvestmentItem[] = [
  { id: "inv-1", name: "WealthIQ Tax-Free Savings", type: "Fixed Deposit", currentValue: 25000, monthlyContribution: 2500, expectedAnnualReturn: 8.2, dateOpened: "2025-01-10" },
  { id: "inv-2", name: "Satrix Top 40 ETF", type: "Share", currentValue: 18000, monthlyContribution: 1500, expectedAnnualReturn: 11.5, dateOpened: "2025-06-15" },
  { id: "inv-3", name: "WealthIQ Active pocket", type: "Savings pocket", currentValue: 12500, monthlyContribution: 500, expectedAnnualReturn: 5.25, dateOpened: "2026-02-01" }
];

// Initial simulation goals
const INITIAL_GOALS: SimulationGoal[] = [
  { id: "goal-1", name: "Emergency Buffer (3 Months)", targetAmount: 45000, currentSaved: 15000, monthlyContribution: 2000, interestRate: 6.5, targetDate: "2027-10-01", category: "Emergency Fund" },
  { id: "goal-2", name: "Cape Town Flat Deposit", targetAmount: 150000, currentSaved: 25000, monthlyContribution: 3000, interestRate: 6.5, targetDate: "2029-06-15", category: "House" },
  { id: "goal-3", name: "Simulated Vehicle pocket", targetAmount: 220000, currentSaved: 40000, monthlyContribution: 4000, interestRate: 6.5, targetDate: "2030-01-01", category: "Car" }
];

// Initial virtual cards (matching Ofentse's profile)
const INITIAL_CARDS: VirtualCard[] = [
  {
    id: "card-1",
    cardholderName: "Ofentse Batlang",
    cardNumber: "4431 8299 4322 1944",
    expiryDate: "08/31",
    cvv: "392",
    type: "Virtual Debit",
    color: "blue",
    isFrozen: false,
    dailyLimit: 10000,
    monthlyLimit: 30000,
    spentThisMonth: 1500
  },
  {
    id: "card-2",
    cardholderName: "Ofentse Batlang",
    cardNumber: "4431 7711 9022 8415",
    expiryDate: "11/30",
    cvv: "108",
    type: "Virtual Shopping",
    color: "red",
    isFrozen: false,
    dailyLimit: 3000,
    monthlyLimit: 10000,
    spentThisMonth: 0
  }
];

const INITIAL_SAVINGS_POCKETS: SavingsPocket[] = [
  {
    id: "pocket-1",
    name: "Festive Holiday Cape Town",
    balance: 8500,
    targetAmount: 20000,
    targetDate: "2026-12-15",
    interestRate: 6.85,
    category: "Holiday",
    dateCreated: "2026-03-01",
    autoRoundUp: true,
    roundUpAmount: 20
  },
  {
    id: "pocket-2",
    name: "Emergency Rain Shield",
    balance: 14200,
    targetAmount: 30000,
    targetDate: "2026-10-31",
    interestRate: 7.25,
    category: "Emergency",
    dateCreated: "2026-01-15",
    autoRoundUp: false,
    roundUpAmount: 10
  }
];

const INITIAL_NOTIFICATIONS: BankNotification[] = [
  {
    id: "notif-1",
    title: "Salary Payment Credited",
    message: "WealthIQ Salary Credit of R45,000.00 has been credited to your Global One account.",
    date: "July 1, 10:15 AM",
    timestamp: Date.now() - 3600000 * 24 * 3,
    category: "transaction",
    read: false,
    amount: 26500,
    type: "income",
    actionTab: "transactions"
  },
  {
    id: "notif-2",
    title: "Biometric Face ID Verified",
    message: "128-dimensional facial biometrics verified on Windows using strict Euclidean distance (0.45).",
    date: "Today, 10:48 AM",
    timestamp: Date.now() - 600000,
    category: "security",
    read: false,
    actionTab: "profile"
  },
  {
    id: "notif-3",
    title: "FICA & HANIS Compliance Active",
    message: "Your South African ID has been verified with Home Affairs. FICA status active until Oct 2027.",
    date: "July 1, 09:00 AM",
    timestamp: Date.now() - 3600000 * 24 * 3,
    category: "compliance",
    read: true,
    actionTab: "profile"
  },
  {
    id: "notif-4",
    title: "SARS Tax-Free Allowance Notice",
    message: "You have R11,000 remaining on your R36,000 annual SARS tax-free investment allowance.",
    date: "Yesterday, 14:20 PM",
    timestamp: Date.now() - 3600000 * 20,
    category: "advisor",
    read: false,
    actionTab: "investments"
  },
  {
    id: "notif-5",
    title: "Virtual Shopping Card Ready",
    message: "Virtual Debit Card 4431...1944 active with dynamic daily limits and public shield.",
    date: "July 1, 11:30 AM",
    timestamp: Date.now() - 3600000 * 24 * 2,
    category: "security",
    read: true,
    actionTab: "cards"
  }
];

const INITIAL_TICKETS: SupportTicket[] = [
  {
    id: "ticket-1",
    bankReference: "CAS-38291-KYC",
    subject: "FICA Biometric HANIS Onboarding",
    category: "FICA & KYC",
    status: "Resolved",
    date: "1 Jul 2026",
    description: "Automated electronic identity verification with Home Affairs database completed.",
    preferredContact: "Secure In-App Message"
  },
  {
    id: "ticket-2",
    bankReference: "CAS-41029-CRD",
    subject: "Virtual Shopping Card Activation",
    category: "Card Security",
    status: "Resolved",
    date: "2 Jul 2026",
    description: "Issued virtual card for online shopping with tokenized CVV and customizable limits.",
    preferredContact: "SMS"
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [investments, setInvestments] = useState<InvestmentItem[]>([]);
  const [goals, setGoals] = useState<SimulationGoal[]>([]);
  const [cards, setCards] = useState<VirtualCard[]>([]);
  const [savingsPockets, setSavingsPockets] = useState<SavingsPocket[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [loadingMessage, setLoadingMessage] = useState(false);

  // Bank Communications & Support State
  const [notifications, setNotifications] = useState<BankNotification[]>(INITIAL_NOTIFICATIONS);
  const [tickets, setTickets] = useState<SupportTicket[]>(INITIAL_TICKETS);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);

  // Authentication & Session state: Restores active authenticated session from sessionStorage if present
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      const sess = sessionStorage.getItem("wealthiq_session");
      if (sess) {
        const parsed = JSON.parse(sess);
        return Boolean(parsed.isLoggedIn);
      }
    } catch {}
    return false;
  });
  const [userRole, setUserRole] = useState<"user" | "admin">(() => {
    try {
      const sess = sessionStorage.getItem("wealthiq_session");
      if (sess) {
        const parsed = JSON.parse(sess);
        if (parsed.role === "admin" || parsed.role === "user") return parsed.role;
      }
    } catch {}
    return "user";
  });
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);

  // Security Profile states (Mandatory onboarding enrollment)
  const [isSecurityRegistered, setIsSecurityRegistered] = useState(false);
  const [userPin, setUserPin] = useState("");
  const [userFacePhoto, setUserFacePhoto] = useState("");
  const [userName, setUserName] = useState(() => {
    try {
      const sess = sessionStorage.getItem("wealthiq_session") || localStorage.getItem("wealthiq_session");
      if (sess) {
        const parsed = JSON.parse(sess);
        if (parsed.userName) return parsed.userName;
      }
    } catch {}
    return "";
  });
  const [startingBalance, setStartingBalance] = useState(0);
  const [userEmail, setUserEmail] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [userIdNumber, setUserIdNumber] = useState("");
  const [userDob, setUserDob] = useState("");
  const [userAccountNumber, setUserAccountNumber] = useState("");
  const [userAccountType, setUserAccountType] = useState("Global One Account");
  const [userEnrollmentDate, setUserEnrollmentDate] = useState("");
  const [userMonthlySalary, setUserMonthlySalary] = useState<number>(45000);

  // Session & page loading states
  const [isSessionLoading, setIsSessionLoading] = useState<boolean>(() => {
    try {
      const sess = sessionStorage.getItem("wealthiq_session") || localStorage.getItem("wealthiq_session");
      if (sess) {
        const parsed = JSON.parse(sess);
        return Boolean(parsed.isLoggedIn && parsed.userName);
      }
    } catch {}
    return false;
  });
  const [isSessionLocked, setIsSessionLocked] = useState<boolean>(false);
  const [isPageLoading, setIsPageLoading] = useState<boolean>(false);
  const [loadingPageTitle, setLoadingPageTitle] = useState<string>("Loading WealthIQ");
  const [loadingPageSubtitle, setLoadingPageSubtitle] = useState<string>("Establishing secure connection & decrypting banking records...");

  // Security Measure 1: Inactivity Auto-Lock (2-Minute Session Timeout)
  useEffect(() => {
    if (!isLoggedIn || isSessionLoading || isSessionLocked) return;

    const INACTIVITY_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes (120 seconds)
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsSessionLocked(true);
      }, INACTIVITY_TIMEOUT_MS);
    };

    const activityEvents = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];
    activityEvents.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }));

    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      activityEvents.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [isLoggedIn, isSessionLoading, isSessionLocked]);

  // Smooth page loading transition between navigation tabs
  const handleTabChange = (newTab: string) => {
    if (newTab === activeTab) return;
    setIsPageLoading(true);

    const tabMeta: Record<string, { title: string; subtitle: string }> = {
      dashboard: {
        title: "Loading Dashboard",
        subtitle: "Analyzing live cashflow, account balances, and financial health score..."
      },
      transactions: {
        title: "Loading Transactions",
        subtitle: "Fetching encrypted transaction ledger, merchant details, and VAT receipts..."
      },
      savings: {
        title: "Loading Savings Pockets",
        subtitle: "Calculating interest yields, goal progress, and automatic round-ups..."
      },
      cards: {
        title: "Loading Virtual Cards",
        subtitle: "Accessing tokenized card vault, dynamic CVVs, and spending controls..."
      },
      investments: {
        title: "Loading Investment Vault",
        subtitle: "Valuing active asset positions, SARS tax-free allowance, and APY rates..."
      },
      calculator: {
        title: "Loading Financial Calculator",
        subtitle: "Preparing compound interest formulas and loan repayment simulators..."
      },
      simulations: {
        title: "Loading Wealth Simulations",
        subtitle: "Projecting retirement horizons, inflation models, and target milestones..."
      },
      guidance: {
        title: "Loading AI Financial Guidance",
        subtitle: "Synchronizing with WealthIQ Gemini AI financial advisory intelligence..."
      },
      profile: {
        title: "Loading Security Profile",
        subtitle: "Retrieving verified FICA credentials, HANIS status, and biometric locks..."
      }
    };

    const meta = tabMeta[newTab] || {
      title: "Loading Page",
      subtitle: "Retrieving secure banking records..."
    };

    setLoadingPageTitle(meta.title);
    setLoadingPageSubtitle(meta.subtitle);

    setTimeout(() => {
      setActiveTab(newTab);
      setIsPageLoading(false);
    }, 380);
  };

  // Reusable loader for user-isolated data (Issue 3: Every account has its own isolated data)
  const loadUserData = async (targetName: string) => {
    if (!targetName) return;
    const cleanName = targetName.trim();
    const isOfentse = cleanName.toLowerCase() === "ofentse batlang" || cleanName.toLowerCase() === "ofentse";
    const isBokang = cleanName.toLowerCase().includes("bokang");

    try {
      // 1. Fetch user profile from persistent server API or cloud
      const res = await fetch(`/api/security-profile?name=${encodeURIComponent(cleanName)}`);
      let profile: any = null;
      if (res.ok) {
        profile = await res.json();
      } else {
        profile = await fetchSecurityProfile(cleanName);
      }

      const userSalary = profile?.monthlySalary || (isBokang ? 68000 : 45000);
      setUserMonthlySalary(userSalary);

      if (profile && profile.isSecurityRegistered) {
        setIsSecurityRegistered(true);
        setUserName(profile.userName || cleanName);
        setUserPin(profile.userPin || "");
        setUserFacePhoto(profile.userFacePhoto || "");
        setStartingBalance(profile.startingBalance !== undefined ? Number(profile.startingBalance) : 0);
        setUserEmail(profile.userEmail || "");
        setUserPhone(profile.userPhone || "");
        if (profile.idNumber) setUserIdNumber(profile.idNumber);
        if (profile.dateOfBirth) setUserDob(profile.dateOfBirth);
        if (profile.accountNumber) setUserAccountNumber(profile.accountNumber);
        if (profile.accountType) setUserAccountType(profile.accountType);
        if (profile.enrollmentDate) setUserEnrollmentDate(profile.enrollmentDate);
      } else {
        setUserName(cleanName);
      }

      // 2. Fetch user's isolated transactions
      // Ofentse Batlang seeds with SIMULATED_TRANSACTIONS (R45,000/mo salary)
      // Bokang Khakhau seeds with BOKANG_SIMULATED_TRANSACTIONS (R68,000/mo salary)
      const txSeeds = isOfentse
        ? SIMULATED_TRANSACTIONS
        : isBokang
          ? BOKANG_SIMULATED_TRANSACTIONS
          : [];
      const txs = await fetchTransactions(txSeeds, cleanName);
      setTransactions(txs || []);

      // 3. Fetch user's isolated investments, goals, cards, pockets
      const invs = await fetchInvestments([], cleanName);
      setInvestments(invs || []);

      const simGoals = await fetchSimulationGoals([], cleanName);
      setGoals(simGoals || []);

      const vCards = await fetchVirtualCards([], cleanName);
      setCards(vCards || []);

      const pockets = await fetchSavingsPockets([], cleanName);
      setSavingsPockets(pockets || []);
      if (pockets && pockets.length > 0) {
        processInterestPayouts(pockets);
      }
    } catch (err) {
      console.warn("[WealthIQ] Notice loading user data:", err);
    }
  };

  // Load active user session on app mount
  useEffect(() => {
    let activeName = "";
    try {
      const sess = sessionStorage.getItem("wealthiq_session") || localStorage.getItem("wealthiq_session");
      if (sess) {
        const parsed = JSON.parse(sess);
        if (parsed.userName) activeName = parsed.userName;
      }
    } catch {}

    if (activeName) {
      setLoadingPageTitle("Restoring Secure Session");
      setLoadingPageSubtitle(`Loading account records and ledger for ${activeName}...`);
      loadUserData(activeName).finally(() => {
        setTimeout(() => {
          setIsSessionLoading(false);
        }, 500);
      });
    } else {
      setIsSessionLoading(false);
    }
  }, []);

  // Periodic interest processor background agent (evaluates active interest payout conditions)
  useEffect(() => {
    if (savingsPockets.length === 0) return;
    const interval = setInterval(() => {
      processInterestPayouts(savingsPockets);
    }, 15000); // Evaluates every 15 seconds to simulate real-world clock monitoring
    return () => clearInterval(interval);
  }, [savingsPockets]);

  // Biometric verification pending request state
  const [verificationPending, setVerificationPending] = useState<{
    title: string;
    onSuccess: () => void;
  } | null>(null);

  // Dedicated complete account data wipe on logout (Issue 3)
  const handleLogout = () => {
    try {
      sessionStorage.removeItem("wealthiq_session");
      localStorage.removeItem("wealthiq_session");
      localStorage.removeItem("wealthiq_last_email");
      localStorage.removeItem("wealthiq_last_user");
      localStorage.removeItem("wealthiq_security_profile");
      localStorage.removeItem("capitec_security_profile");
    } catch (e) {}

    // Reset all user state so nothing leaks to the next session
    setUserName("");
    setUserEmail("");
    setUserPhone("");
    setUserIdNumber("");
    setUserDob("");
    setUserAccountNumber("");
    setUserAccountType("Global One Account");
    setUserEnrollmentDate("");
    setStartingBalance(0);
    setUserMonthlySalary(45000);
    setIsSecurityRegistered(false);
    setUserPin("");
    setUserFacePhoto("");

    setTransactions([]);
    setInvestments([]);
    setGoals([]);
    setCards([]);
    setSavingsPockets([]);

    setUserRole("user");
    setIsLoggedIn(false);
    setIsSessionLoading(false);
    setIsPageLoading(false);
    setIsSessionLocked(false);
  };

  // Security Enrollment handler
  const handleSecurityRegister = async (
    name: string,
    pin: string,
    facePhoto: string,
    startBalance: number,
    details?: BankOnboardingDetails
  ) => {
    const cleanName = name.trim();
    const resolvedEmail = details?.email ? details.email.trim().toLowerCase() : "";
    const resolvedPhone = details?.phone ? details.phone.trim() : "";
    const resolvedIdNumber = details?.idNumber || "";
    const resolvedDob = details?.dateOfBirth || "";
    const resolvedAccNo = details?.accountNumber || `16${Math.floor(10000000 + Math.random() * 90000000)}`;
    const resolvedAccType = details?.accountType || "Global One Account";
    const resolvedEnrollDate = details?.enrollmentDate || new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const uniqueUserId = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    setUserName(cleanName);
    setUserPin(pin);
    setUserFacePhoto(facePhoto);
    setStartingBalance(startBalance);
    setUserEmail(resolvedEmail);
    setUserPhone(resolvedPhone);
    setUserIdNumber(resolvedIdNumber);
    setUserDob(resolvedDob);
    setUserAccountNumber(resolvedAccNo);
    setUserAccountType(resolvedAccType);
    setUserEnrollmentDate(resolvedEnrollDate);
    setIsSecurityRegistered(true);
    setShowEnrollmentModal(false);

    // Fresh empty collections for newly registered user (no cross-account data copying)
    setTransactions([]);
    setInvestments([]);
    setGoals([]);
    setCards([]);
    setSavingsPockets([]);

    try {
      sessionStorage.setItem("wealthiq_session", JSON.stringify({
        isLoggedIn: true,
        role: "user",
        userName: cleanName
      }));
      localStorage.setItem("wealthiq_session", JSON.stringify({
        isLoggedIn: true,
        role: "user",
        userName: cleanName
      }));
    } catch (e) {}
    setIsLoggedIn(true);

    const profile = {
      userId: uniqueUserId,
      isSecurityRegistered: true,
      userPin: pin,
      userFacePhoto: facePhoto,
      userName: cleanName,
      startingBalance: startBalance,
      userEmail: resolvedEmail,
      userPhone: resolvedPhone,
      idNumber: resolvedIdNumber,
      dateOfBirth: resolvedDob,
      accountNumber: resolvedAccNo,
      accountType: resolvedAccType,
      enrollmentDate: resolvedEnrollDate
    };

    // 1. Persist to Firestore cloud database
    try {
      await saveSecurityProfile(profile);
      console.log("[WealthIQ] Security profile saved to Firestore database successfully.");
    } catch (err) {
      console.warn("[WealthIQ] Error saving security profile to Firestore:", err);
    }

    // 2. Persist to server database (Express backup)
    try {
      const serverRes = await fetch("/api/security-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile)
      });
      if (!serverRes.ok) {
        const errData = await serverRes.json();
        console.warn("[WealthIQ] Server registration notice:", errData.message);
      } else {
        console.log("[WealthIQ] Security profile saved to server database successfully.");
      }
    } catch (err) {
      console.warn("[WealthIQ] Error saving security profile to server database:", err);
    }

    // 3. Persist to user-scoped browser local storage
    try {
      localStorage.setItem(`wealthiq_security_profile_${cleanName.toLowerCase().replace(/[^a-z0-9_]/g, "_")}`, JSON.stringify(profile));
    } catch {}
  };

  // Handle profile updates from Profile section
  const handleUpdateProfile = async (updated: {
    userName: string;
    userEmail: string;
    userPhone: string;
    userPin: string;
    userFacePhoto: string;
    startingBalance: number;
  }) => {
    setUserName(updated.userName);
    setUserEmail(updated.userEmail);
    setUserPhone(updated.userPhone);
    setUserPin(updated.userPin);
    setUserFacePhoto(updated.userFacePhoto);
    setStartingBalance(updated.startingBalance);

    const profile = {
      isSecurityRegistered: true,
      userPin: updated.userPin,
      userFacePhoto: updated.userFacePhoto,
      userName: updated.userName,
      startingBalance: updated.startingBalance,
      userEmail: updated.userEmail,
      userPhone: updated.userPhone,
      idNumber: userIdNumber,
      dateOfBirth: userDob,
      accountNumber: userAccountNumber,
      accountType: userAccountType,
      enrollmentDate: userEnrollmentDate
    };

    // 1. Sync to Cloud Firestore
    try {
      await saveSecurityProfile(profile);
      console.log("[WealthIQ] Updated security profile successfully saved to Firestore.");
    } catch (err) {
      console.error("Failed to save security profile to Firestore:", err);
    }

    // 2. Sync to Server (Express backup)
    try {
      await fetch("/api/security-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile)
      });
      console.log("[WealthIQ] Updated security profile successfully saved to server.");
    } catch (err) {
      console.error("Failed to save security profile to server:", err);
    }

    // 3. Sync to localStorage
    localStorage.setItem("wealthiq_security_profile", JSON.stringify(profile));
    localStorage.setItem("capitec_security_profile", JSON.stringify(profile));
  };

  // Trigger Biometric Verification helper
  const requestBiometricVerification = (title: string, onSuccess: () => void) => {
    if (!isSecurityRegistered) {
      setShowEnrollmentModal(true);
      return;
    }
    setVerificationPending({ title, onSuccess });
  };

  // Modal State
  const [isAddTxModalOpen, setIsAddTxModalOpen] = useState(false);
  const [newTxDate, setNewTxDate] = useState(new Date().toISOString().split("T")[0]);
  const [newTxDesc, setNewTxDesc] = useState("");
  const [newTxCategory, setNewTxCategory] = useState<Transaction["category"]>("Food");
  const [newTxType, setNewTxType] = useState<Transaction["type"]>("expense");
  const [newTxAmount, setNewTxAmount] = useState(350);

  // Calculate stats dynamically
  // Dynamic available balance is startingBalance plus net of all registered transactions
  const currentNet = transactions.reduce((sum, t) => {
    return sum + (t.type === "income" ? t.amount : -t.amount);
  }, 0);

  const availableBalance = startingBalance + currentNet;

  // Monthly stats calculated from active month's entries or baseline month
  const todayPrefix = new Date().toISOString().slice(0, 7); // e.g. "2026-11"
  const currentMonthTransactions = transactions.filter(t => t.date.startsWith(todayPrefix));
  const rawIncome = currentMonthTransactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const rawExpenses = currentMonthTransactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  // If in early month prior to scheduled 25th payday, show scheduled salary and representative commitments
  const expectedSalary = userMonthlySalary || (userName.toLowerCase().includes("bokang") ? 68000 : 45000);
  const monthlyIncome = rawIncome > 0 ? rawIncome : expectedSalary;
  const representativeExpenses = Math.round(expectedSalary * 0.77);
  const monthlyExpenses = rawExpenses > 1500 ? rawExpenses : representativeExpenses;

  // Savings rate
  const savingsRate = monthlyIncome > 0 
    ? Math.max(0, ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100) 
    : 23.0;

  // Add transaction handler + automatic Bank Notification
  const handleAddTransaction = (newTx: Omit<Transaction, "id">, cardId?: string) => {
    const tx: Transaction = {
      ...newTx,
      id: `tx-${Date.now()}`
    };
    setTransactions(prev => [tx, ...prev]);
    saveTransaction(tx, userName);

    // Push real-time WealthIQ money alert notification
    const isIncome = newTx.type === "income";
    const notifTitle = isIncome ? "Money In: Payment Received" : "Money Out: Transaction Cleared";
    const notifMsg = isIncome
      ? `R${newTx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} credited from ${newTx.description}. Global One balance updated.`
      : `R${newTx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} spent at ${newTx.description} (${newTx.category}).`;

    const newNotif: BankNotification = {
      id: `notif-${Date.now()}`,
      title: notifTitle,
      message: notifMsg,
      date: "Just now",
      timestamp: Date.now(),
      category: "transaction",
      read: false,
      amount: newTx.amount,
      type: newTx.type,
      actionTab: "transactions"
    };
    setNotifications(prev => [newNotif, ...prev]);

    if (cardId) {
      setCards(prev => {
        const updated = prev.map(c => c.id === cardId ? { ...c, spentThisMonth: c.spentThisMonth + newTx.amount } : c);
        const cardToUpdate = updated.find(c => c.id === cardId);
        if (cardToUpdate) {
          saveVirtualCard(cardToUpdate, userName);
        }
        return updated;
      });
    }
  };

  // Bank Notification Handlers
  const handleMarkAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleClearAllNotifications = () => {
    setNotifications([]);
  };

  const handleNotificationClick = (notif: BankNotification) => {
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    if (notif.actionTab) {
      handleTabChange(notif.actionTab);
      setIsNotificationDrawerOpen(false);
    }
  };

  // Add Support Ticket Handler
  const handleAddTicket = (newTicket: SupportTicket) => {
    setTickets(prev => [newTicket, ...prev]);
    
    // Also push a confirmation notification to the drawer
    const ticketNotif: BankNotification = {
      id: `notif-${Date.now()}`,
      title: `Banker Ticket Logged (${newTicket.bankReference})`,
      message: `Your request regarding "${newTicket.subject}" has been received. A WealthIQ specialist will contact you.`,
      date: "Just now",
      timestamp: Date.now(),
      category: "compliance",
      read: false
    };
    setNotifications(prev => [ticketNotif, ...prev]);
  };

  // Delete transaction handler
  const handleDeleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    deleteTransaction(id, userName);
  };

  // Process 7-day interest payouts for all pockets
  const processInterestPayouts = (pocketsList: SavingsPocket[]) => {
    const now = Date.now();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    let anyChanges = false;

    const updatedPockets = pocketsList.map(pocket => {
      const lastPayout = pocket.lastInterestPayoutTime || now;
      const accumulated = pocket.accumulatedInterest || 0;
      const elapsedMs = now - lastPayout;

      if (elapsedMs >= SEVEN_DAYS_MS) {
        const periods = Math.floor(elapsedMs / SEVEN_DAYS_MS);
        
        // Calculate accrued interest for the elapsed time
        const elapsedSeconds = elapsedMs / 1000;
        const apy = pocket.interestRate / 100;
        const earned = pocket.balance * apy * (elapsedSeconds / (365 * 24 * 60 * 60));
        
        const totalPayoutAmount = accumulated + earned;

        if (totalPayoutAmount > 0) {
          const tx: Transaction = {
            id: `tx-interest-${pocket.id}-${Date.now()}`,
            date: new Date().toISOString().split("T")[0],
            description: `7-Day Live Interest Reinvested: ${pocket.name}`,
            category: "Investment",
            type: "income",
            amount: parseFloat(totalPayoutAmount.toFixed(4))
          };
          
          setTransactions(prev => {
            // Avoid duplicate interest transaction for the same ID
            if (prev.some(t => t.id === tx.id)) return prev;
            return [tx, ...prev];
          });
          saveTransaction(tx, userName);
        }

        anyChanges = true;
        return {
          ...pocket,
          accumulatedInterest: 0,
          lastInterestPayoutTime: lastPayout + (periods * SEVEN_DAYS_MS)
        };
      }

      // Initialize lastInterestPayoutTime if missing
      if (pocket.lastInterestPayoutTime === undefined) {
        anyChanges = true;
        return {
          ...pocket,
          lastInterestPayoutTime: now,
          accumulatedInterest: 0
        };
      }

      return pocket;
    });

    if (anyChanges) {
      setSavingsPockets(updatedPockets);
      updatedPockets.forEach(p => saveSavingsPocket(p, userName));
    }
  };

  // Simulate passage of 7 days for testing background interest deposits
  const handleSimulateTimePassage = () => {
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    
    setSavingsPockets(prev => {
      if (prev.length === 0) return prev;
      const updated = prev.map(pocket => {
        const lastPayout = pocket.lastInterestPayoutTime || Date.now();
        return {
          ...pocket,
          lastInterestPayoutTime: lastPayout - SEVEN_DAYS_MS
        };
      });
      
      // Save updated pockets
      updated.forEach(p => saveSavingsPocket(p, userName));
      
      // Trigger evaluation immediately with the new modified last payout times!
      setTimeout(() => {
        processInterestPayouts(updated);
      }, 100);
      
      return updated;
    });
  };

  // Savings Pocket Handlers
  const handleAddPocket = (newPocket: Omit<SavingsPocket, "id">) => {
    const pocket: SavingsPocket = {
      ...newPocket,
      id: `pocket-${Date.now()}`,
      lastInterestPayoutTime: Date.now(),
      accumulatedInterest: 0
    };
    setSavingsPockets(prev => [...prev, pocket]);
    saveSavingsPocket(pocket, userName);
  };

  const handleDeletePocket = (id: string) => {
    const pocket = savingsPockets.find(p => p.id === id);
    if (pocket) {
      // Calculate remaining pending interest
      const now = Date.now();
      const lastPayout = pocket.lastInterestPayoutTime || now;
      const elapsedSeconds = (now - lastPayout) / 1000;
      const apy = pocket.interestRate / 100;
      const earned = pocket.balance * apy * (elapsedSeconds / (365 * 24 * 60 * 60));
      const pendingInterest = (pocket.accumulatedInterest || 0) + earned;
      
      const totalPayout = pocket.balance + pendingInterest;
      
      if (totalPayout > 0) {
        handleAddTransaction({
          date: new Date().toISOString().split("T")[0],
          description: `Closed Pocket: ${pocket.name} Payout`,
          category: "Savings",
          type: "income",
          amount: parseFloat(totalPayout.toFixed(2))
        });
      }
    }
    setSavingsPockets(prev => prev.filter(p => p.id !== id));
    deleteSavingsPocket(id, userName);
  };

  const handleTransferBetweenAccounts = (
    fromPocketId: string | "main",
    toPocketId: string | "main",
    amount: number
  ) => {
    // Helper to accrue interest before balance update
    const accrueInterest = (pocket: SavingsPocket): SavingsPocket => {
      const now = Date.now();
      const lastPayout = pocket.lastInterestPayoutTime || now;
      const elapsedSeconds = (now - lastPayout) / 1000;
      const apy = pocket.interestRate / 100;
      const earned = pocket.balance * apy * (elapsedSeconds / (365 * 24 * 60 * 60));
      return {
        ...pocket,
        accumulatedInterest: (pocket.accumulatedInterest || 0) + earned,
        lastInterestPayoutTime: now
      };
    };

    // 1. Deduct from source
    if (fromPocketId === "main") {
      handleAddTransaction({
        date: new Date().toISOString().split("T")[0],
        description: `Pocket Transfer In`,
        category: "Savings",
        type: "expense",
        amount: amount
      });
    } else {
      setSavingsPockets(prev => {
        const updated = prev.map(p => {
          if (p.id === fromPocketId) {
            const accrued = accrueInterest(p);
            return { ...accrued, balance: accrued.balance - amount };
          }
          return p;
        });
        const target = updated.find(p => p.id === fromPocketId);
        if (target) saveSavingsPocket(target, userName);
        return updated;
      });
    }

    // 2. Add to destination
    if (toPocketId === "main") {
      handleAddTransaction({
        date: new Date().toISOString().split("T")[0],
        description: `Pocket Withdrawal`,
        category: "Savings",
        type: "income",
        amount: amount
      });
    } else {
      setSavingsPockets(prev => {
        const updated = prev.map(p => {
          if (p.id === toPocketId) {
            const accrued = accrueInterest(p);
            return { ...accrued, balance: accrued.balance + amount };
          }
          return p;
        });
        const target = updated.find(p => p.id === toPocketId);
        if (target) saveSavingsPocket(target, userName);
        return updated;
      });
    }
  };

  // Add investment handler
  const handleAddInvestment = (newInv: Omit<InvestmentItem, "id">) => {
    const inv: InvestmentItem = {
      ...newInv,
      id: `inv-${Date.now()}`
    };
    setInvestments(prev => [...prev, inv]);
    saveInvestment(inv, userName);
  };

  // Delete investment handler
  const handleDeleteInvestment = (id: string) => {
    setInvestments(prev => prev.filter(i => i.id !== id));
    deleteInvestment(id, userName);
  };

  // Add simulation goal handler
  const handleAddGoal = (newGoal: Omit<SimulationGoal, "id">) => {
    const goal: SimulationGoal = {
      ...newGoal,
      id: `goal-${Date.now()}`
    };
    setGoals(prev => [...prev, goal]);
    saveSimulationGoal(goal, userName);
  };

  // Delete goal handler
  const handleDeleteGoal = (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
    deleteSimulationGoal(id, userName);
  };

  // Update saved amount inside simulation
  const handleUpdateSavedGoal = (id: string, amount: number) => {
    setGoals(prev => {
      const updated = prev.map(g => g.id === id ? { ...g, currentSaved: amount } : g);
      const target = updated.find(g => g.id === id);
      if (target) saveSimulationGoal(target, userName);
      return updated;
    });
  };

  // Add virtual card handler
  const handleAddCard = (newCard: Omit<VirtualCard, "id">) => {
    const card: VirtualCard = {
      ...newCard,
      id: `card-${Date.now()}`
    };
    setCards(prev => [...prev, card]);
    saveVirtualCard(card, userName);
  };

  // Delete virtual card handler
  const handleDeleteCard = (id: string) => {
    setCards(prev => prev.filter(c => c.id !== id));
    deleteVirtualCard(id, userName);
  };

  // Toggle freeze virtual card
  const handleToggleFreezeCard = (id: string) => {
    setCards(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, isFrozen: !c.isFrozen } : c);
      const target = updated.find(c => c.id === id);
      if (target) saveVirtualCard(target, userName);
      return updated;
    });
  };

  // Update virtual card daily and monthly limits
  const handleUpdateCardLimits = (id: string, dailyLimit: number, monthlyLimit: number) => {
    setCards(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, dailyLimit, monthlyLimit } : c);
      const target = updated.find(c => c.id === id);
      if (target) saveVirtualCard(target, userName);
      return updated;
    });
  };

  // Send message to Coach handler
  const handleSendMessage = async (text: string, persona?: string) => {
    // 1. Add user message
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString()
    };
    setChatHistory(prev => [...prev, userMsg]);
    setLoadingMessage(true);
    handleTabChange("guidance"); // ensure they are looking at guidance

    // 2. Query endpoint
    try {
      const response = await fetch("/api/gemini/guidance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text,
          transactions: transactions.slice(0, 15),
          balance: availableBalance,
          income: monthlyIncome,
          expenses: monthlyExpenses,
          coachPersona: persona || "wealth_builder"
        })
      });
      const data = await response.json();
      
      const coachMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: "coach",
        text: data.response,
        timestamp: new Date().toLocaleTimeString()
      };
      setChatHistory(prev => [...prev, coachMsg]);
    } catch (err) {
      console.error("Failed to fetch coach response:", err);
    } finally {
      setLoadingMessage(false);
    }
  };

  // Add Transaction Modal Submit
  const handleModalSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!newTxDesc.trim()) return;
    
    const processTx = () => {
      handleAddTransaction({
        date: newTxDate,
        description: newTxDesc,
        category: newTxCategory,
        type: newTxType,
        amount: newTxAmount
      });

      // Reset Form and Close
      setNewTxDesc("");
      setNewTxAmount(350);
      setIsAddTxModalOpen(false);
    };

    if (newTxAmount >= 5000) {
      requestBiometricVerification(
        `Authorize manual transaction of R${newTxAmount.toLocaleString("en-ZA")}`,
        processTx
      );
    } else {
      processTx();
    }
  };

  // Helper to change category selection automatically depending on description!
  const handleDescChange = (val: string) => {
    setNewTxDesc(val);
    const lowercase = val.toLowerCase();
    if (lowercase.includes("woolworths") || lowercase.includes("pick") || lowercase.includes("checker") || lowercase.includes("food") || lowercase.includes("grocery")) {
      setNewTxCategory("Food");
      setNewTxType("expense");
    } else if (lowercase.includes("uber") || lowercase.includes("petrol") || lowercase.includes("car") || lowercase.includes("taxi")) {
      setNewTxCategory("Transport");
      setNewTxType("expense");
    } else if (lowercase.includes("netflix") || lowercase.includes("dstv") || lowercase.includes("cinema") || lowercase.includes("game")) {
      setNewTxCategory("Entertainment");
      setNewTxType("expense");
    } else if (lowercase.includes("eskom") || lowercase.includes("electricity") || lowercase.includes("water") || lowercase.includes("rent")) {
      setNewTxCategory("Utilities");
      setNewTxType("expense");
    } else if (lowercase.includes("salary") || lowercase.includes("credit") || lowercase.includes("earn")) {
      setNewTxCategory("Income");
      setNewTxType("income");
    }
  };

  if (!isLoggedIn) {
    return (
      <div id="wealthiq-auth-container">
        <LoginPage
          isSecurityRegistered={isSecurityRegistered}
          userPin={userPin}
          userFacePhoto={userFacePhoto}
          onLoginSuccess={(detectedName?: string, role: "user" | "admin" = "user") => {
            const effectiveName = (detectedName || userName || "Ofentse Batlang").trim();
            try {
              const sessionData = JSON.stringify({
                isLoggedIn: true,
                role,
                userName: effectiveName
              });
              sessionStorage.setItem("wealthiq_session", sessionData);
              localStorage.setItem("wealthiq_session", sessionData);
            } catch (e) {}

            setUserRole(role);
            setIsLoggedIn(true);

            if (role === "admin") return;

            setIsSessionLoading(true);
            setLoadingPageTitle("Authenticating Secure Session");
            setLoadingPageSubtitle(`Signing in as ${effectiveName} & decrypting banking records...`);

            loadUserData(effectiveName).finally(() => {
              setTimeout(() => {
                setIsSessionLoading(false);
              }, 600);
            });
          }}
          onOpenEnrollment={() => setShowEnrollmentModal(true)}
        />

        {/* Remote Profile Onboarding Overlay */}
        {showEnrollmentModal && (
          <SecurityEnrollment 
            onRegister={handleSecurityRegister} 
            defaultName="" 
            onClose={() => setShowEnrollmentModal(false)}
          />
        )}
      </div>
    );
  }

  // Render Full-Screen Loading Page during initial session restoration or login authentication
  if (isSessionLoading) {
    return (
      <LoadingPage
        fullScreen
        message={loadingPageTitle}
        subtitle={loadingPageSubtitle}
      />
    );
  }

  // Render Administrator SecOps Operations Center when authenticated as admin
  if (isLoggedIn && userRole === "admin") {
    return (
      <AdminPortal
        onSwitchToRetail={() => {
          setUserRole("user");
          try {
            const sessionData = JSON.stringify({
              isLoggedIn: true,
              role: "user",
              userName
            });
            sessionStorage.setItem("wealthiq_session", sessionData);
            localStorage.setItem("wealthiq_session", sessionData);
          } catch (e) {}
        }}
        onLogout={handleLogout}
      />
    );
  }

  const maskedAccountNo =
    userAccountNumber && userAccountNumber.length >= 8
      ? `${userAccountNumber.slice(0, 4)}...${userAccountNumber.slice(-4)}`
      : "4431...1944";

  return (
    <div id="wealthiq-app" className="flex bg-brand-bg text-slate-800 min-h-screen font-sans">
      
      {/* Branded Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={handleTabChange} 
        userAccount={{ name: userName, accNumber: maskedAccountNo, balance: availableBalance }} 
        onLogout={handleLogout}
        onOpenNotifications={() => setIsNotificationDrawerOpen(true)}
        onOpenSupport={() => setIsSupportModalOpen(true)}
        unreadNotificationsCount={notifications.filter(n => !n.read).length}
      />

      {/* Main Viewport Content Panel with Top Banking Header */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden pt-14 md:pt-0">
        
        {/* Top Global Banking Navigation Bar */}
        <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 sm:px-8 py-3 flex items-center justify-end shrink-0 z-20 select-none">
          <div className="flex items-center space-x-2.5">
            {/* Banker Support Shortcut Button */}
            <button
              id="btn-topbar-support"
              type="button"
              onClick={() => setIsSupportModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition cursor-pointer"
              title="Speak with a Banker & Official Proof of Payment"
            >
              <Headphones className="w-3.5 h-3.5 text-capitec-blue" />
              <span className="hidden sm:inline">Banker Support</span>
            </button>

            {/* Notification Bell with Dynamic Unread Badge */}
            <button
              id="btn-topbar-notifications"
              type="button"
              onClick={() => setIsNotificationDrawerOpen(true)}
              className="relative p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition cursor-pointer"
              title="Bank Notifications & Alerts"
            >
              <Bell className="w-4 h-4 text-slate-700" />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-capitec-red text-white text-[9px] font-bold flex items-center justify-center animate-pulse shadow-sm">
                  {notifications.filter(n => !n.read).length > 9 ? "9+" : notifications.filter(n => !n.read).length}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Tab Viewport */}
        <main id="main-content-panel" className="flex-1 overflow-y-auto relative bg-slate-50/20">
          {isPageLoading ? (
            <LoadingPage
              message={loadingPageTitle}
              subtitle={loadingPageSubtitle}
            />
          ) : (
            <>
              {activeTab === "dashboard" && (
            <DashboardTab
              transactions={transactions}
              availableBalance={availableBalance}
              openAddTransactionModal={() => setIsAddTxModalOpen(true)}
              monthlyIncome={monthlyIncome}
              monthlyExpenses={monthlyExpenses}
              savingsRate={savingsRate}
            />
          )}
          {activeTab === "transactions" && (
            <TransactionsTab
              transactions={transactions}
              onAddTransaction={handleAddTransaction}
              onDeleteTransaction={handleDeleteTransaction}
              openAddTransactionModal={() => setIsAddTxModalOpen(true)}
              availableBalance={availableBalance}
              onRequestBiometricVerification={requestBiometricVerification}
              onResetToSimulatedLedger={() => {
                const isBokang = userName.toLowerCase().includes("bokang");
                setTransactions(isBokang ? BOKANG_SIMULATED_TRANSACTIONS : SIMULATED_TRANSACTIONS);
              }}
            />
          )}
          {activeTab === "savings" && (
            <SavingsTab
              savingsPockets={savingsPockets}
              availableBalance={availableBalance}
              onAddPocket={handleAddPocket}
              onDeletePocket={handleDeletePocket}
              onTransferBetweenAccounts={handleTransferBetweenAccounts}
              onRequestBiometricVerification={requestBiometricVerification}
              transactions={transactions}
              onSimulateTimePassage={handleSimulateTimePassage}
            />
          )}
          {activeTab === "cards" && (
            <VirtualCardsTab
              cards={cards}
              onAddCard={handleAddCard}
              onDeleteCard={handleDeleteCard}
              onToggleFreeze={handleToggleFreezeCard}
              onUpdateLimits={handleUpdateCardLimits}
              onAddTransaction={handleAddTransaction}
              availableBalance={availableBalance}
              onRequestBiometricVerification={requestBiometricVerification}
            />
          )}
          {activeTab === "investments" && (
            <InvestmentsTab
              investments={investments}
              onAddInvestment={handleAddInvestment}
              onDeleteInvestment={handleDeleteInvestment}
            />
          )}
          {activeTab === "calculator" && <CalculatorTab />}
          {activeTab === "simulations" && (
            <SimulationsTab
              goals={goals}
              onAddGoal={handleAddGoal}
              onDeleteGoal={handleDeleteGoal}
              onUpdateSaved={handleUpdateSavedGoal}
            />
          )}
          {activeTab === "guidance" && (
            <GuidanceTab
              chatHistory={chatHistory}
              onSendMessage={handleSendMessage}
              loadingMessage={loadingMessage}
              transactions={transactions}
              availableBalance={availableBalance}
              monthlyIncome={monthlyIncome}
              monthlyExpenses={monthlyExpenses}
              onClearChat={() => setChatHistory([])}
            />
          )}
              {activeTab === "profile" && (
                <ProfileTab
                  userName={userName}
                  userEmail={userEmail}
                  userPhone={userPhone}
                  userPin={userPin}
                  userFacePhoto={userFacePhoto}
                  startingBalance={startingBalance}
                  idNumber={userIdNumber}
                  dateOfBirth={userDob}
                  accountNumber={userAccountNumber}
                  accountType={userAccountType}
                  enrollmentDate={userEnrollmentDate}
                  onRequestBiometricVerification={requestBiometricVerification}
                  onUpdateProfile={handleUpdateProfile}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Interactive Modal: Add Transaction */}
      {isAddTxModalOpen && (
        <div id="add-transaction-modal-overlay" className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-2xs animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 overflow-hidden shadow-2xl animate-scaleUp">
            
            {/* Header */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center text-left">
              <div>
                <h3 className="font-bold text-slate-800 text-lg font-display">New Sandbox Transaction</h3>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Instantly affects charts & AI context</span>
              </div>
              <button 
                id="btn-close-modal"
                onClick={() => setIsAddTxModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleModalSubmit} className="p-6 space-y-4 text-left">
              
              {/* Type selector */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
                <button
                  id="btn-select-tx-expense"
                  type="button"
                  onClick={() => setNewTxType("expense")}
                  className={`py-2 text-xs font-semibold rounded-md transition ${
                    newTxType === "expense" 
                      ? "bg-white text-capitec-red shadow-sm" 
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Expense Out
                </button>
                <button
                  id="btn-select-tx-income"
                  type="button"
                  onClick={() => setNewTxType("income")}
                  className={`py-2 text-xs font-semibold rounded-md transition ${
                    newTxType === "income" 
                      ? "bg-white text-emerald-600 shadow-sm" 
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Income In
                </button>
              </div>

              {/* Description */}
              <div className="flex flex-col space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase">Description</label>
                <input
                  id="modal-tx-desc"
                  type="text"
                  placeholder="e.g. Woolworths Food, Petrol Shell"
                  value={newTxDesc}
                  onChange={(e) => handleDescChange(e.target.value)}
                  className="p-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-capitec-blue rounded-lg text-sm outline-none text-slate-700 transition"
                  required
                />
                <span className="text-[10px] text-slate-400 italic leading-tight">
                  Categories auto-resolve while typing (e.g., "Woolworths" selects "Food")
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Amount */}
                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Amount (ZAR)</label>
                  <input
                    id="modal-tx-amount"
                    type="number"
                    min={1}
                    value={newTxAmount}
                    onChange={(e) => setNewTxAmount(Number(e.target.value))}
                    className="p-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-capitec-blue rounded-lg text-sm font-mono outline-none text-slate-700 transition"
                    required
                  />
                </div>

                {/* Category */}
                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Category</label>
                  <select
                    id="modal-tx-category"
                    value={newTxCategory}
                    onChange={(e) => setNewTxCategory(e.target.value as Transaction["category"])}
                    className="p-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-capitec-blue rounded-lg text-sm outline-none text-slate-700 transition"
                  >
                    <option value="Food">Food</option>
                    <option value="Transport">Transport</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Shopping">Shopping</option>
                    <option value="Health">Health</option>
                    <option value="Income">Salary / Income</option>
                    <option value="Savings">Savings Transfer</option>
                    <option value="Investment">Investment Allocation</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Date */}
              <div className="flex flex-col space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase">Transaction Date</label>
                <input
                  id="modal-tx-date"
                  type="date"
                  value={newTxDate}
                  onChange={(e) => setNewTxDate(e.target.value)}
                  className="p-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-capitec-blue rounded-lg text-sm font-mono outline-none text-slate-700 transition"
                  required
                />
              </div>

              {/* Action Button */}
              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  id="btn-cancel-modal"
                  type="button"
                  onClick={() => setIsAddTxModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-sm font-semibold text-slate-500 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-confirm-modal"
                  type="submit"
                  className="px-5 py-2 bg-capitec-red hover:bg-capitec-red-dark text-white rounded-lg text-sm font-semibold shadow-sm transition cursor-pointer"
                >
                  Add Transaction
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Remote Profile Onboarding Overlay */}
      {showEnrollmentModal && (
        <SecurityEnrollment 
          onRegister={handleSecurityRegister} 
          defaultName={userName} 
          onClose={() => setShowEnrollmentModal(false)}
        />
      )}

      {/* Biometric Verification Modal Overlay */}
      {verificationPending && (
        <BiometricVerifyModal
          userPin={userPin}
          enrolledFacePhoto={userFacePhoto}
          title={verificationPending.title}
          userName={userName}
          onVerifySuccess={() => {
            const callback = verificationPending.onSuccess;
            setVerificationPending(null);
            callback();
          }}
          onCancel={() => setVerificationPending(null)}
        />
      )}

      {/* In-App Notifications Drawer */}
      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        notifications={notifications}
        onMarkAllAsRead={handleMarkAllNotificationsRead}
        onClearAll={handleClearAllNotifications}
        onNotificationClick={handleNotificationClick}
      />

      {/* WealthIQ Banker & Document Hub Modal */}
      <BankSupportModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
        userName={userName}
        userPhone={userPhone}
        userEmail={userEmail}
        userAccountNumber={userAccountNumber}
        availableBalance={availableBalance}
        transactions={transactions}
        tickets={tickets}
        onAddTicket={handleAddTicket}
      />

      {/* Security Measure 1: Session Inactivity Auto-Lock Modal */}
      {isSessionLocked && (
        <SessionLockModal
          userName={userName}
          accountNumber={userAccountNumber}
          userPin={userPin}
          enrolledFacePhoto={userFacePhoto}
          onUnlockSuccess={() => setIsSessionLocked(false)}
          onLogout={handleLogout}
        />
      )}

    </div>
  );
}
