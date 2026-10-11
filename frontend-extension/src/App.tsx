import { useState, FormEvent, useEffect } from "react";
import { X, HelpCircle, AlertCircle, Info } from "lucide-react";

// Types
import { Transaction, InvestmentItem, SimulationGoal, ChatMessage, VirtualCard, SavingsPocket } from "./types";

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
import SecurityEnrollment from "./components/SecurityEnrollment";
import BiometricVerifyModal from "./components/BiometricVerifyModal";
import LoginPage from "./components/LoginPage";
import ProfileTab from "./components/ProfileTab";
import ModelsTab from "./components/ModelsTab";

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

// Initial mock transactions (South African / Capitec profile)
const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: "tx-1", date: "2026-07-01", description: "Capitec Salary Credit", category: "Income", type: "income", amount: 26500 },
  { id: "tx-2", date: "2026-07-02", description: "Rent: City Property", category: "Utilities", type: "expense", amount: 6500 },
  { id: "tx-3", date: "2026-07-03", description: "Woolworths Food Store", category: "Food", type: "expense", amount: 1240 },
  { id: "tx-4", date: "2026-07-05", description: "Shell Fuel Petrol", category: "Transport", type: "expense", amount: 850 },
  { id: "tx-5", date: "2026-07-08", description: "Netflix South Africa", category: "Entertainment", type: "expense", amount: 199 },
  { id: "tx-6", date: "2026-07-10", description: "Eskom Prepaid Power", category: "Utilities", type: "expense", amount: 900 },
  { id: "tx-7", date: "2026-07-11", description: "Dis-Chem Pharmacy Mall", category: "Health", type: "expense", amount: 420 },
  { id: "tx-8", date: "2026-07-12", description: "Checkers Hyper Spar", category: "Food", type: "expense", amount: 680 },
  { id: "tx-9", date: "2026-07-13", description: "ATM Cash Withdrawal", category: "Other", type: "expense", amount: 500 },
  { id: "tx-10", date: "2026-07-14", description: "JSE Satrix JSE ETF", category: "Investment", type: "expense", amount: 1500 }
];

// Initial investments
const INITIAL_INVESTMENTS: InvestmentItem[] = [
  { id: "inv-1", name: "Capitec Tax-Free Savings", type: "Fixed Deposit", currentValue: 25000, monthlyContribution: 2500, expectedAnnualReturn: 8.2, dateOpened: "2025-01-10" },
  { id: "inv-2", name: "Satrix Top 40 ETF", type: "Share", currentValue: 18000, monthlyContribution: 1500, expectedAnnualReturn: 11.5, dateOpened: "2025-06-15" },
  { id: "inv-3", name: "Capitec Active pocket", type: "Savings pocket", currentValue: 12500, monthlyContribution: 500, expectedAnnualReturn: 5.25, dateOpened: "2026-02-01" }
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

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [investments, setInvestments] = useState<InvestmentItem[]>([]);
  const [goals, setGoals] = useState<SimulationGoal[]>([]);
  const [cards, setCards] = useState<VirtualCard[]>([]);
  const [savingsPockets, setSavingsPockets] = useState<SavingsPocket[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [loadingMessage, setLoadingMessage] = useState(false);

  // Authentication & Session state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);

  // Security Profile states (Mandatory onboarding enrollment)
  const [isSecurityRegistered, setIsSecurityRegistered] = useState(false);
  const [userPin, setUserPin] = useState("");
  const [userFacePhoto, setUserFacePhoto] = useState("");
  const [userName, setUserName] = useState("Ofentse Batlang");
  const [startingBalance, setStartingBalance] = useState(36546.55);
  const [userEmail, setUserEmail] = useState("ofentsebatlang@gmail.com");
  const [userPhone, setUserPhone] = useState("+27 82 456 7890");

  // Load persistent security profile and other data on application mount
  useEffect(() => {
    const loadAllFirebaseData = async () => {
      try {
        // 1. Fetch Security Profile from Cloud
        const cloudProfile = await fetchSecurityProfile();
        if (cloudProfile && cloudProfile.isSecurityRegistered) {
          setIsSecurityRegistered(true);
          setUserPin(cloudProfile.userPin);
          setUserFacePhoto(cloudProfile.userFacePhoto);
          setUserName(cloudProfile.userName || "Ofentse Batlang");
          setStartingBalance(cloudProfile.startingBalance !== undefined ? cloudProfile.startingBalance : 36546.55);
          setUserEmail(cloudProfile.userEmail || "ofentsebatlang@gmail.com");
          setUserPhone(cloudProfile.userPhone || "+27 82 456 7890");
          console.log("[WealthIQ] Successfully loaded security profile from Firestore database.");
        } else {
          // Local storage fallback
          const localProfileStr = localStorage.getItem("capitec_security_profile");
          if (localProfileStr) {
            try {
              const localProfile = JSON.parse(localProfileStr);
              if (localProfile && localProfile.isSecurityRegistered) {
                setIsSecurityRegistered(true);
                setUserPin(localProfile.userPin || "");
                setUserFacePhoto(localProfile.userFacePhoto || "");
                setUserName(localProfile.userName || "Ofentse Batlang");
                setStartingBalance(localProfile.startingBalance !== undefined ? localProfile.startingBalance : 36546.55);
                setUserEmail(localProfile.userEmail || "ofentsebatlang@gmail.com");
                setUserPhone(localProfile.userPhone || "+27 82 456 7890");
                // Sync fallback to cloud
                await saveSecurityProfile({
                  userPin: localProfile.userPin || "",
                  userFacePhoto: localProfile.userFacePhoto || "",
                  isSecurityRegistered: true,
                  userName: localProfile.userName || "Ofentse Batlang",
                  startingBalance: localProfile.startingBalance !== undefined ? localProfile.startingBalance : 36546.55,
                  userEmail: localProfile.userEmail || "ofentsebatlang@gmail.com",
                  userPhone: localProfile.userPhone || "+27 82 456 7890"
                });
                console.log("[WealthIQ] Synchronized localStorage security profile to Firestore.");
              }
            } catch (e) {
              console.warn("[WealthIQ] Error reading localStorage profile fallback:", e);
            }
          }

          // 1c. Server database fallback
          try {
            const serverRes = await fetch("/api/security-profile");
            if (serverRes.ok) {
              const serverProfile = await serverRes.json();
              if (serverProfile && serverProfile.isSecurityRegistered) {
                setIsSecurityRegistered(true);
                setUserPin(serverProfile.userPin || "1234");
                setUserFacePhoto(serverProfile.userFacePhoto || "");
                setUserName(serverProfile.userName || "Ofentse Batlang");
                setStartingBalance(serverProfile.startingBalance !== undefined ? serverProfile.startingBalance : 36546.55);
                setUserEmail(serverProfile.userEmail || "ofentsebatlang@gmail.com");
                setUserPhone(serverProfile.userPhone || "+27 82 456 7890");
                console.log("[WealthIQ] Synchronized security profile from persistent server database.");
              }
            }
          } catch (e) {
            console.warn("[WealthIQ] Error reading server profile fallback:", e);
          }
        }

        // 2. Fetch other collections from Cloud, with empty seeds to avoid demo data seeding
        const txs = await fetchTransactions([]);
        setTransactions(txs);

        const invs = await fetchInvestments([]);
        setInvestments(invs);

        const simGoals = await fetchSimulationGoals([]);
        setGoals(simGoals);

        const vCards = await fetchVirtualCards([]);
        setCards(vCards);

        const pockets = await fetchSavingsPockets([]);
        setSavingsPockets(pockets);
        processInterestPayouts(pockets);

        console.log("[WealthIQ] All database collections synchronized with Cloud Firestore.");
      } catch (err) {
        console.error("[WealthIQ] Error synchronizing with Cloud Firestore:", err);
      }
    };

    loadAllFirebaseData();
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

  // Security Enrollment handler
  const handleSecurityRegister = async (name: string, pin: string, facePhoto: string, startBalance: number) => {
    setUserName(name);
    setUserPin(pin);
    setUserFacePhoto(facePhoto);
    setStartingBalance(startBalance);
    setIsSecurityRegistered(true);
    setShowEnrollmentModal(false);
    setIsLoggedIn(true);

    const profile = {
      isSecurityRegistered: true,
      userPin: pin,
      userFacePhoto: facePhoto,
      userName: name,
      startingBalance: startBalance
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
      await fetch("/api/security-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userPin: pin, 
          userFacePhoto: facePhoto,
          userName: name,
          startingBalance: startBalance
        })
      });
      console.log("[WealthIQ] Security profile saved to server database successfully.");
    } catch (err) {
      console.warn("[WealthIQ] Error saving security profile to server database:", err);
    }

    // 3. Persist to browser local storage as backup
    localStorage.setItem("capitec_security_profile", JSON.stringify(profile));
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
      userPhone: updated.userPhone
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

  // Monthly stats calculated from active month's entries (current calendar month)
  const todayPrefix = new Date().toISOString().slice(0, 7); // e.g. "2026-07"
  const currentMonthTransactions = transactions.filter(t => t.date.startsWith(todayPrefix));
  const monthlyIncome = currentMonthTransactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const monthlyExpenses = currentMonthTransactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  // Savings rate
  const savingsRate = monthlyIncome > 0 
    ? Math.max(0, ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100) 
    : 0;

  // Add transaction handler
  const handleAddTransaction = (newTx: Omit<Transaction, "id">, cardId?: string) => {
    const tx: Transaction = {
      ...newTx,
      id: `tx-${Date.now()}`
    };
    setTransactions(prev => [tx, ...prev]);
    saveTransaction(tx);

    if (cardId) {
      setCards(prev => {
        const updated = prev.map(c => c.id === cardId ? { ...c, spentThisMonth: c.spentThisMonth + newTx.amount } : c);
        const cardToUpdate = updated.find(c => c.id === cardId);
        if (cardToUpdate) {
          saveVirtualCard(cardToUpdate);
        }
        return updated;
      });
    }
  };

  // Delete transaction handler
  const handleDeleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    deleteTransaction(id);
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
            description: `7-Day Interest Deposit: ${pocket.name}`,
            category: "Savings",
            type: "income",
            amount: parseFloat(totalPayoutAmount.toFixed(4))
          };
          
          setTransactions(prev => {
            // Avoid duplicate interest transaction for the same ID
            if (prev.some(t => t.id === tx.id)) return prev;
            return [tx, ...prev];
          });
          saveTransaction(tx);
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
      updatedPockets.forEach(p => saveSavingsPocket(p));
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
      updated.forEach(p => saveSavingsPocket(p));
      
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
    saveSavingsPocket(pocket);
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
    deleteSavingsPocket(id);
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
        if (target) saveSavingsPocket(target);
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
        if (target) saveSavingsPocket(target);
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
    saveInvestment(inv);
  };

  // Delete investment handler
  const handleDeleteInvestment = (id: string) => {
    setInvestments(prev => prev.filter(i => i.id !== id));
    deleteInvestment(id);
  };

  // Add simulation goal handler
  const handleAddGoal = (newGoal: Omit<SimulationGoal, "id">) => {
    const goal: SimulationGoal = {
      ...newGoal,
      id: `goal-${Date.now()}`
    };
    setGoals(prev => [...prev, goal]);
    saveSimulationGoal(goal);
  };

  // Delete goal handler
  const handleDeleteGoal = (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
    deleteSimulationGoal(id);
  };

  // Update saved amount inside simulation
  const handleUpdateSavedGoal = (id: string, amount: number) => {
    setGoals(prev => {
      const updated = prev.map(g => g.id === id ? { ...g, currentSaved: amount } : g);
      const target = updated.find(g => g.id === id);
      if (target) saveSimulationGoal(target);
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
    saveVirtualCard(card);
  };

  // Delete virtual card handler
  const handleDeleteCard = (id: string) => {
    setCards(prev => prev.filter(c => c.id !== id));
    deleteVirtualCard(id);
  };

  // Toggle freeze virtual card
  const handleToggleFreezeCard = (id: string) => {
    setCards(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, isFrozen: !c.isFrozen } : c);
      const target = updated.find(c => c.id === id);
      if (target) saveVirtualCard(target);
      return updated;
    });
  };

  // Update virtual card daily and monthly limits
  const handleUpdateCardLimits = (id: string, dailyLimit: number, monthlyLimit: number) => {
    setCards(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, dailyLimit, monthlyLimit } : c);
      const target = updated.find(c => c.id === id);
      if (target) saveVirtualCard(target);
      return updated;
    });
  };

  // Send message to Coach handler
  const handleSendMessage = async (text: string) => {
    // 1. Add user message
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString()
    };
    setChatHistory(prev => [...prev, userMsg]);
    setLoadingMessage(true);
    setActiveTab("guidance"); // ensure they are looking at guidance

    // 2. Query endpoint
    try {
      const response = await fetch("/api/gemini/guidance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text,
          transactions: transactions.slice(0, 10),
          balance: availableBalance,
          income: monthlyIncome,
          expenses: monthlyExpenses
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
          onLoginSuccess={async (detectedName?: string) => {
            if (detectedName) {
              setUserName(detectedName);
              setIsSecurityRegistered(true);
              try {
                const res = await fetch(`/api/security-profile?name=${encodeURIComponent(detectedName)}`);
                if (res.ok) {
                  const p = await res.json();
                  if (p.startingBalance !== undefined) setStartingBalance(p.startingBalance);
                  if (p.userPin) setUserPin(p.userPin);
                  if (p.userFacePhoto) setUserFacePhoto(p.userFacePhoto);
                  if (p.userEmail) setUserEmail(p.userEmail);
                  if (p.userPhone) setUserPhone(p.userPhone);
                }
              } catch (e) {
                console.warn("[WealthIQ] Profile sync notice:", e);
              }
            }
            setIsLoggedIn(true);
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

  return (
    <div id="wealthiq-app" className="flex bg-brand-bg text-slate-800 min-h-screen font-sans">
      
      {/* Branded Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        userAccount={{ name: userName, accNumber: "4431...1944", balance: availableBalance }} 
        onLogout={() => setIsLoggedIn(false)}
      />

      {/* Main Viewport Content Panel */}
      <main id="main-content-panel" className="flex-1 overflow-y-auto h-screen relative bg-slate-50/20 pt-14 md:pt-0">
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
            onUpdateProfile={handleUpdateProfile}
          />
        )}
        {activeTab === "models" && (
          <ModelsTab currentUserName={userName} />
        )}
      </main>

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
                  💡 Categories auto-resolve while typing (e.g., "Woolworths" selects "Food")
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

    </div>
  );
}
