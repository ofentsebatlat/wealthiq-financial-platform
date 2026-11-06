import { useState, useEffect } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Activity,
  Users,
  Cpu,
  RefreshCw,
  Sliders,
  LogOut,
  ArrowRight,
  AlertTriangle,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  ScanFace,
  KeyRound,
  Download,
  Trash2,
  Sparkles,
  Search,
  Laptop,
  X
} from "lucide-react";
import { LoginEvent, AdminUserAccount } from "../types";
import {
  fetchLoginEvents,
  clearLoginEvents,
  recordLoginEvent,
  fetchAdminUsers,
  updateUserAccountStatus
} from "../utils/adminService";
import { getModelsStatus, ModelsStatusResult } from "../utils/faceMatcher";

interface AdminPortalProps {
  onSwitchToRetail: () => void;
  onLogout: () => void;
}

export default function AdminPortal({ onSwitchToRetail, onLogout }: AdminPortalProps) {
  const [activeAdminTab, setActiveAdminTab] = useState<"live_logins" | "user_management" | "security_config" | "ai_diagnostics">("live_logins");

  // Live Logins State
  const [events, setEvents] = useState<LoginEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [eventFilter, setEventFilter] = useState<"all" | "biometric" | "pin" | "failed">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // User Accounts State
  const [userAccounts, setUserAccounts] = useState<AdminUserAccount[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUserAccount | null>(null);
  const [editingBalance, setEditingBalance] = useState<string>("");
  const [editingPin, setEditingPin] = useState<string>("");

  // Biometric Security Config State
  const [toleranceThreshold, setToleranceThreshold] = useState(0.45);
  const [lockdownMode, setLockdownMode] = useState(false);
  const [livenessStrictness, setLivenessStrictness] = useState<"standard" | "high">("standard");

  // AI & Models Diagnostics State
  const [modelsStatus, setModelsStatus] = useState<ModelsStatusResult | null>(null);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  // Status message banner
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const showBanner = (text: string, type: "success" | "error" | "info" = "success") => {
    setFeedbackMessage({ text, type });
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // 1. Initial Data Fetch
  const loadEventsData = async () => {
    setIsLoadingEvents(true);
    const data = await fetchLoginEvents();
    setEvents(data);
    setIsLoadingEvents(false);
  };

  const loadUsersData = async () => {
    const users = await fetchAdminUsers();
    setUserAccounts(users);
  };

  const loadModelsData = async () => {
    setIsLoadingModels(true);
    const status = await getModelsStatus();
    setModelsStatus(status);
    setIsLoadingModels(false);
  };

  useEffect(() => {
    loadEventsData();
    loadUsersData();
    loadModelsData();
  }, []);

  // 2. Real-time Live Polling Loop for Events
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(async () => {
      const data = await fetchLoginEvents();
      setEvents(data);
    }, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Handle Freezing/Unfreezing user
  const handleToggleFreeze = async (user: AdminUserAccount) => {
    const updatedState = !user.isFrozen;
    const success = await updateUserAccountStatus(user.userName, { isFrozen: updatedState });
    if (success) {
      setUserAccounts(prev =>
        prev.map(u => (u.userName === user.userName ? { ...u, isFrozen: updatedState } : u))
      );
      showBanner(
        `Account for ${user.userName} has been ${updatedState ? "FROZEN (Logins blocked)" : "UNFROZEN (Access restored)"}.`,
        updatedState ? "error" : "success"
      );

      // Log admin action to audit trail
      await recordLoginEvent({
        userName: "System Administrator",
        accountNumber: user.accountNumber,
        method: "admin_portal",
        status: "success",
        device: "SecOps Admin Console",
        ipAddress: "196.25.1.1 (Branch Gateway)",
        details: `Admin Privilege Action: ${updatedState ? "Froze account access" : "Unfroze account"} for ${user.userName}.`
      });
      loadEventsData();
    }
  };

  // Handle PIN reset
  const handleResetPin = async (userName: string) => {
    if (!editingPin || editingPin.length !== 4) {
      showBanner("PIN must be exactly 4 digits.", "error");
      return;
    }
    const success = await updateUserAccountStatus(userName, { resetPin: editingPin });
    if (success) {
      setUserAccounts(prev =>
        prev.map(u => (u.userName === userName ? { ...u, userPin: editingPin } : u))
      );
      showBanner(`Remote PIN for ${userName} reset to ${editingPin}.`, "success");
      setEditingPin("");
      setSelectedUser(null);
    }
  };

  // Handle Balance Adjustment
  const handleAdjustBalance = async (userName: string) => {
    const num = parseFloat(editingBalance);
    if (isNaN(num)) {
      showBanner("Please enter a valid numeric balance amount.", "error");
      return;
    }
    const success = await updateUserAccountStatus(userName, { adjustBalance: num });
    if (success) {
      setUserAccounts(prev =>
        prev.map(u => (u.userName === userName ? { ...u, startingBalance: num } : u))
      );
      showBanner(`Account balance for ${userName} adjusted to R ${num.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}.`, "success");
      setEditingBalance("");
      setSelectedUser(null);
    }
  };

  // Simulate a live test login event for project demonstration
  const handleSimulateTestLogin = async (isSuccess: boolean) => {
    if (isSuccess) {
      await recordLoginEvent({
        userName: "Ofentse Batlang",
        accountNumber: "1431289445",
        method: "biometric_face",
        status: "success",
        similarity: 97.4,
        distance: 0.26,
        device: "WealthIQ Global One Web (Live Tracker)",
        ipAddress: "196.25.1.42 (Kimberley Central)",
        details: "128D Metric Verification: Distance 0.26 <= 0.45 threshold. Identity confirmed."
      });
      showBanner("Simulated authorized biometric login event created.", "success");
    } else {
      await recordLoginEvent({
        userName: "Unrecognized Subject",
        accountNumber: "N/A",
        method: "biometric_face",
        status: "failed",
        similarity: 19.8,
        distance: 0.81,
        device: "Webcam Scanner (Unauthorized Subject)",
        ipAddress: "102.132.88.19 (Unknown Gateway)",
        details: "Intrusion Alert: Unknown facial biometric vector (Distance 0.81 > 0.45). Session rejected."
      });
      showBanner("Simulated unauthorized intrusion attempt recorded.", "error");
    }
    loadEventsData();
  };

  // Clear live logs
  const handleClearLogs = async () => {
    if (confirm("Are you sure you want to clear the live login audit trail?")) {
      await clearLoginEvents();
      setEvents([]);
      showBanner("Live login audit log has been cleared.", "info");
    }
  };

  // Filter events
  const filteredEvents = events.filter(evt => {
    if (eventFilter === "biometric" && evt.method !== "biometric_face") return false;
    if (eventFilter === "pin" && evt.method !== "pin") return false;
    if (eventFilter === "failed" && evt.status !== "failed") return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        evt.userName.toLowerCase().includes(q) ||
        evt.details.toLowerCase().includes(q) ||
        evt.device.toLowerCase().includes(q) ||
        evt.ipAddress.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalLogins = events.length;
  const successfulLogins = events.filter(e => e.status === "success").length;
  const failedLogins = events.filter(e => e.status === "failed").length;
  const biometricLogins = events.filter(e => e.method === "biometric_face").length;
  const successRate = totalLogins > 0 ? Math.round((successfulLogins / totalLogins) * 100) : 100;

  return (
    <div id="admin-portal-container" className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans select-none">

      {/* Top SecOps Master Header */}
      <header className="bg-slate-950/90 border-b border-slate-800 px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 backdrop-blur-md">

        {/* Brand & Mode Identification */}
        <div className="flex items-center space-x-3 text-left">
          <div className="w-9 h-9 rounded-xl bg-capitec-red flex items-center justify-center text-white shadow-lg shadow-capitec-red/20 font-bold">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold font-display tracking-tight text-white">
                Wealth<span className="text-capitec-red">IQ</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-capitec-red/20 text-capitec-red border border-capitec-red/30 uppercase tracking-wider">
                Admin SecOps
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono flex items-center space-x-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Kimberley Central Server • Administrator: CAP-ADMIN-001</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2.5">
          <button
            id="btn-admin-switch-retail"
            type="button"
            onClick={onSwitchToRetail}
            className="flex items-center space-x-2 px-3.5 py-1.5 bg-capitec-blue hover:bg-capitec-blue-light text-white text-xs font-semibold rounded-xl transition cursor-pointer shadow-sm shadow-capitec-blue/20"
            title="Switch back to Retail Customer View (Ofentse)"
          >
            <span>Retail Banking View</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            id="btn-admin-logout"
            type="button"
            onClick={onLogout}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
            title="Sign out of Admin Session"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Real-time Status Notification Banner */}
      {feedbackMessage && (
        <div
          className={`px-6 py-2.5 text-xs font-medium text-center transition-all animate-fadeIn ${feedbackMessage.type === "success"
            ? "bg-emerald-950/80 text-emerald-300 border-b border-emerald-800"
            : feedbackMessage.type === "error"
              ? "bg-rose-950/80 text-rose-300 border-b border-rose-800"
              : "bg-blue-950/80 text-blue-300 border-b border-blue-800"
            }`}
        >
          {feedbackMessage.text}
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

        {/* KPI Live Telemetry Ribbon */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 text-left shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Live Logins</span>
              <Activity className="w-4 h-4 text-capitec-blue" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-white font-mono">{totalLogins}</span>
              <span className="text-[10px] text-emerald-400 font-semibold">{successRate}% Pass</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Live recorded sessions</p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 text-left shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Biometric Scans</span>
              <ScanFace className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-emerald-400 font-mono">{biometricLogins}</span>
              <span className="text-[10px] text-slate-400">128D Embeddings</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Tolerance: &le; {toleranceThreshold}</p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 text-left shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Intrusions / Flags</span>
              <AlertTriangle className={`w-4 h-4 ${failedLogins > 0 ? "text-capitec-red" : "text-slate-400"}`} />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className={`text-2xl font-bold font-mono ${failedLogins > 0 ? "text-capitec-red" : "text-white"}`}>
                {failedLogins}
              </span>
              <span className="text-[10px] text-slate-400">Attempts Blocked</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Active Threat Interception</p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 text-left shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Registered Users</span>
              <Users className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-white font-mono">{userAccounts.length}</span>
              <span className="text-[10px] text-cyan-400 font-semibold">Active Profiles</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">WealthIQ Global One Accounts</p>
          </div>

        </div>

        {/* Admin Navigation Tabs */}
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 overflow-x-auto">
          <button
            id="tab-admin-live-logins"
            type="button"
            onClick={() => setActiveAdminTab("live_logins")}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${activeAdminTab === "live_logins"
              ? "bg-capitec-red text-white shadow-md shadow-capitec-red/20"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
          >
            <Activity className="w-4 h-4" />
            <span>Live Login Monitor & Audit</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 font-mono">
              {events.length}
            </span>
          </button>

          <button
            id="tab-admin-users"
            type="button"
            onClick={() => setActiveAdminTab("user_management")}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${activeAdminTab === "user_management"
              ? "bg-capitec-red text-white shadow-md shadow-capitec-red/20"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
          >
            <Users className="w-4 h-4" />
            <span>User Accounts & Privileges</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 font-mono">
              {userAccounts.length}
            </span>
          </button>

          <button
            id="tab-admin-security-config"
            type="button"
            onClick={() => setActiveAdminTab("security_config")}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${activeAdminTab === "security_config"
              ? "bg-capitec-red text-white shadow-md shadow-capitec-red/20"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Security & Threshold Policies</span>
          </button>

          <button
            id="tab-admin-ai-diagnostics"
            type="button"
            onClick={() => setActiveAdminTab("ai_diagnostics")}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${activeAdminTab === "ai_diagnostics"
              ? "bg-capitec-red text-white shadow-md shadow-capitec-red/20"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Backend AI & Models Health</span>
          </button>
        </div>

        {/* TAB 1: LIVE LOGIN MONITOR & AUDIT */}
        {activeAdminTab === "live_logins" && (
          <div className="space-y-4">

            {/* Filter & Control Bar */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 text-left">

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <span className="text-xs text-slate-400 font-semibold mr-1">Filter:</span>

                <button
                  type="button"
                  onClick={() => setEventFilter("all")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${eventFilter === "all" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"
                    }`}
                >
                  All ({events.length})
                </button>

                <button
                  type="button"
                  onClick={() => setEventFilter("biometric")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center space-x-1 ${eventFilter === "biometric" ? "bg-emerald-900/60 text-emerald-300 border border-emerald-700/50" : "text-slate-400 hover:text-slate-200"
                    }`}
                >
                  <ScanFace className="w-3.5 h-3.5" />
                  <span>Biometric Face AI ({biometricLogins})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEventFilter("pin")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center space-x-1 ${eventFilter === "pin" ? "bg-blue-900/60 text-blue-300 border border-blue-700/50" : "text-slate-400 hover:text-slate-200"
                    }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Remote PIN</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEventFilter("failed")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center space-x-1 ${eventFilter === "failed" ? "bg-rose-900/60 text-rose-300 border border-rose-700/50" : "text-slate-400 hover:text-slate-200"
                    }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Intrusions & Failed ({failedLogins})</span>
                </button>
              </div>

              {/* Search & Actions */}
              <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
                <div className="relative flex-1 md:w-48">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search logs..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-capitec-red placeholder-slate-500"
                  />
                </div>

                {/* Auto Refresh Toggle */}
                <button
                  type="button"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`p-1.5 rounded-xl border text-xs font-semibold flex items-center space-x-1 transition cursor-pointer ${autoRefresh
                    ? "bg-emerald-950/50 text-emerald-400 border-emerald-800"
                    : "bg-slate-900 text-slate-400 border-slate-700"
                    }`}
                  title={autoRefresh ? "Auto-refresh active (3s)" : "Auto-refresh paused"}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? "animate-spin" : ""}`} />
                </button>

                {/* Clear Log */}
                <button
                  type="button"
                  onClick={handleClearLogs}
                  className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-rose-400 rounded-xl transition cursor-pointer"
                  title="Clear Audit Log"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>

            {/* Quick Simulation Bar for Project Presentation */}
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-left">
              <div className="flex items-center space-x-2 text-xs text-slate-400">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Live Project Demo Controls:</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleSimulateTestLogin(true)}
                  className="px-2.5 py-1 bg-emerald-950/80 hover:bg-emerald-900/80 border border-emerald-700/60 text-emerald-300 text-[11px] font-semibold rounded-lg transition cursor-pointer flex items-center space-x-1"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Simulate Authorized Face Login</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulateTestLogin(false)}
                  className="px-2.5 py-1 bg-rose-950/80 hover:bg-rose-900/80 border border-rose-700/60 text-rose-300 text-[11px] font-semibold rounded-lg transition cursor-pointer flex items-center space-x-1"
                >
                  <XCircle className="w-3 h-3" />
                  <span>Simulate Intrusion Attempt</span>
                </button>
              </div>
            </div>

            {/* Live Events Stream List */}
            {filteredEvents.length === 0 ? (
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-12 text-center text-slate-400 space-y-2">
                <ShieldCheck className="w-8 h-8 mx-auto text-slate-500" />
                <p className="text-sm font-semibold text-slate-300">No login events match current filter.</p>
                <p className="text-xs text-slate-500">Live events will appear automatically as users log into WealthIQ.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredEvents.map(evt => {
                  const isSuccess = evt.status === "success";
                  const isBio = evt.method === "biometric_face";
                  const isAdmin = evt.method === "admin_portal";
                  const eventDate = new Date(evt.timestamp);
                  const timeFormatted = eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                  return (
                    <div
                      key={evt.id}
                      className={`p-4 rounded-2xl border transition-all text-left flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${!isSuccess
                        ? "bg-rose-950/20 border-rose-800/60 hover:bg-rose-950/30"
                        : isAdmin
                          ? "bg-slate-800/90 border-capitec-blue/50 hover:bg-slate-800"
                          : "bg-slate-800/70 border-slate-700 hover:bg-slate-800"
                        }`}
                    >
                      {/* Left: User & Method Badge */}
                      <div className="flex items-start space-x-3.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${!isSuccess
                            ? "bg-rose-900/40 text-rose-400 border border-rose-700/50"
                            : isBio
                              ? "bg-emerald-900/40 text-emerald-400 border border-emerald-700/50"
                              : isAdmin
                                ? "bg-blue-900/40 text-cyan-300 border border-cyan-700/50"
                                : "bg-slate-700/50 text-slate-300 border border-slate-600"
                            }`}
                        >
                          {isBio ? (
                            <ScanFace className="w-5 h-5" />
                          ) : isAdmin ? (
                            <ShieldAlert className="w-5 h-5" />
                          ) : (
                            <KeyRound className="w-5 h-5" />
                          )}
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-bold text-white font-display">
                              {evt.userName}
                            </span>

                            {/* Status Pill */}
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${isSuccess
                                ? "bg-emerald-900/40 text-emerald-300 border border-emerald-700/40"
                                : "bg-rose-900/40 text-rose-300 border border-rose-700/40"
                                }`}
                            >
                              {isSuccess ? "Authorized" : "Access Rejected"}
                            </span>

                            {/* Method Pill */}
                            <span className="text-[10px] text-slate-400 font-mono">
                              {isBio ? "Biometric 128D" : isAdmin ? "SecOps Admin" : "Remote PIN"}
                            </span>
                          </div>

                          <p className="text-xs text-slate-300 leading-snug">
                            {evt.details}
                          </p>

                          <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 font-mono pt-1">
                            <span className="flex items-center space-x-1">
                              <Laptop className="w-3 h-3 text-slate-500" />
                              <span>{evt.device}</span>
                            </span>
                            <span>•</span>
                            <span>IP: {evt.ipAddress}</span>
                            {evt.distance !== undefined && (
                              <>
                                <span>•</span>
                                <span className={evt.distance <= toleranceThreshold ? "text-emerald-400" : "text-rose-400"}>
                                  Distance: {evt.distance} (Tolerance: &le; {toleranceThreshold})
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Timestamp */}
                      <div className="text-right shrink-0 self-end md:self-center font-mono">
                        <span className="text-xs font-bold text-slate-200">{timeFormatted}</span>
                        <p className="text-[10px] text-slate-400">{eventDate.toLocaleDateString()}</p>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* TAB 2: USER ACCOUNTS & PRIVILEGES */}
        {activeAdminTab === "user_management" && (
          <div className="space-y-4">

            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex items-center justify-between text-left">
              <div>
                <h3 className="text-sm font-bold text-white">Registered Banking Client Profiles</h3>
                <p className="text-xs text-slate-400">
                  Manage WealthIQ Global One client access, freeze accounts during fraud alerts, and reset remote credentials.
                </p>
              </div>
              <button
                type="button"
                onClick={loadUsersData}
                className="p-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs font-semibold text-slate-200 transition cursor-pointer flex items-center space-x-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Accounts</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {userAccounts.map(account => (
                <div
                  key={account.userName}
                  className={`bg-slate-800/80 border rounded-2xl p-5 text-left flex flex-col justify-between space-y-4 transition ${account.isFrozen ? "border-rose-700/70 bg-rose-950/10" : "border-slate-700"
                    }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-base text-white">{account.userName}</span>
                          {account.isFrozen && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-900/60 text-rose-300 border border-rose-700 uppercase">
                              Frozen
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 font-mono">Acc: {account.accountNumber}</p>
                      </div>

                      <div className="w-8 h-8 rounded-full bg-capitec-blue flex items-center justify-center font-bold text-xs text-white">
                        {account.userName.split(" ").map(n => n[0]).join("")}
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-300">
                      <div className="flex justify-between py-1 border-b border-slate-700/50">
                        <span className="text-slate-400">Available Balance:</span>
                        <span className="font-mono font-bold text-emerald-400">
                          R {account.startingBalance.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-700/50">
                        <span className="text-slate-400">Biometric Profile:</span>
                        <span className="font-semibold text-cyan-300 flex items-center space-x-1">
                          <ScanFace className="w-3.5 h-3.5" />
                          <span>128D Enrolled</span>
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-700/50">
                        <span className="text-slate-400">Remote PIN:</span>
                        <span className="font-mono text-slate-300">•••• ({account.userPin})</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">Email:</span>
                        <span className="truncate max-w-[170px]">{account.userEmail}</span>
                      </div>
                    </div>
                  </div>

                  {/* Account Action Buttons */}
                  <div className="pt-2 border-t border-slate-700/60 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleFreeze(account)}
                      className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center space-x-1.5 ${account.isFrozen
                        ? "bg-emerald-900/70 hover:bg-emerald-800 text-emerald-200 border border-emerald-700"
                        : "bg-rose-900/70 hover:bg-rose-800 text-rose-200 border border-rose-700"
                        }`}
                    >
                      {account.isFrozen ? (
                        <>
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Unfreeze Account</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Freeze Account</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUser(account);
                        setEditingBalance(String(account.startingBalance));
                        setEditingPin(account.userPin);
                      }}
                      className="py-1.5 px-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs font-semibold text-slate-200 transition cursor-pointer"
                    >
                      Manage
                    </button>
                  </div>

                </div>
              ))}
            </div>

            {/* User Edit Modal */}
            {selectedUser && (
              <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
                <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 text-left space-y-4 shadow-2xl">

                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="font-bold text-base text-white">
                      Manage Privileges: {selectedUser.userName}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setSelectedUser(null)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">
                        Override Balance (ZAR)
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          value={editingBalance}
                          onChange={e => setEditingBalance(e.target.value)}
                          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-hidden focus:border-capitec-red"
                        />
                        <button
                          type="button"
                          onClick={() => handleAdjustBalance(selectedUser.userName)}
                          className="px-3 py-2 bg-capitec-blue hover:bg-capitec-blue-light text-white font-semibold rounded-xl"
                        >
                          Save
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">
                        Reset 4-Digit Remote PIN
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          maxLength={4}
                          value={editingPin}
                          onChange={e => setEditingPin(e.target.value.replace(/\D/g, ""))}
                          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-hidden focus:border-capitec-red"
                          placeholder="e.g. 1234"
                        />
                        <button
                          type="button"
                          onClick={() => handleResetPin(selectedUser.userName)}
                          className="px-3 py-2 bg-capitec-blue hover:bg-capitec-blue-light text-white font-semibold rounded-xl"
                        >
                          Update PIN
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedUser(null)}
                      className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs text-slate-300 font-semibold"
                    >
                      Close
                    </button>
                  </div>

                </div>
              </div>
            )}

          </div>
        )}

        {/* TAB 3: BIOMETRIC SECURITY & THRESHOLD POLICIES */}
        {activeAdminTab === "security_config" && (
          <div className="space-y-6 text-left">

            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-6">

              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Sliders className="w-5 h-5 text-capitec-red" />
                  <span>Biometric Euclidean Distance Tolerance Policy</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Adjust the deep metric distance cutoff for 128-dimensional dlib facial embeddings. Lower distances represent stricter matching requirements.
                </p>
              </div>

              {/* Threshold Slider */}
              <div className="space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Tolerance Distance Limit:</span>
                  <span className="font-mono font-bold text-base text-capitec-red">{toleranceThreshold}</span>
                </div>

                <input
                  type="range"
                  min="0.30"
                  max="0.60"
                  step="0.01"
                  value={toleranceThreshold}
                  onChange={e => setToleranceThreshold(parseFloat(e.target.value))}
                  className="w-full accent-capitec-red cursor-pointer"
                />

                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>0.30 (Ultra-Strict / High False Rejection)</span>
                  <span className="font-bold text-emerald-400">0.45 (Optimal WealthIQ Standard)</span>
                  <span>0.60 (Lenient / Higher FAR Risk)</span>
                </div>
              </div>

              {/* Policy Preset Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div
                  onClick={() => setToleranceThreshold(0.38)}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition ${toleranceThreshold === 0.38 ? "bg-slate-800 border-capitec-red" : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
                    }`}
                >
                  <span className="text-xs font-bold text-white block">Strict Security</span>
                  <span className="text-[10px] text-slate-400">Threshold: 0.38. Suitable for high-value transactions (&gt; R50,000).</span>
                </div>

                <div
                  onClick={() => setToleranceThreshold(0.45)}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition ${toleranceThreshold === 0.45 ? "bg-slate-800 border-emerald-500" : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
                    }`}
                >
                  <span className="text-xs font-bold text-emerald-400 block">WealthIQ Standard (Default)</span>
                  <span className="text-[10px] text-slate-400">Threshold: 0.45. Balanced biometric accuracy and rapid user sign-in.</span>
                </div>

                <div
                  onClick={() => setToleranceThreshold(0.50)}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition ${toleranceThreshold === 0.50 ? "bg-slate-800 border-amber-500" : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
                    }`}
                >
                  <span className="text-xs font-bold text-amber-400 block">Low-Light Tolerant</span>
                  <span className="text-[10px] text-slate-400">Threshold: 0.50. Relaxed matching for poor webcam lighting environments.</span>
                </div>
              </div>

              {/* Emergency Lockdown Toggle */}
              <div className="pt-4 border-t border-slate-700/60 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">System Emergency Lockdown Mode</h4>
                  <p className="text-[11px] text-slate-400">
                    Temporarily forces Biometric Facial Verification on all transactions and blocks PIN-only access.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setLockdownMode(!lockdownMode);
                    showBanner(
                      `Lockdown Mode ${!lockdownMode ? "ACTIVATED (Biometric mandatory for all actions)" : "DEACTIVATED"}.`,
                      !lockdownMode ? "error" : "success"
                    );
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${lockdownMode
                    ? "bg-rose-900 text-rose-200 border border-rose-700"
                    : "bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700"
                    }`}
                >
                  {lockdownMode ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  <span>{lockdownMode ? "Lockdown Engaged" : "Standard Mode"}</span>
                </button>
              </div>

            </div>

          </div>
        )}

        {/* TAB 4: BACKEND AI & MODELS HEALTH (EXCLUSIVELY FOR ADMIN) */}
        {activeAdminTab === "ai_diagnostics" && (
          <div className="space-y-4 text-left">

            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-6">

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <Cpu className="w-5 h-5 text-capitec-red" />
                    <span>Machine Learning Architecture & Subsystem Health</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Direct diagnostics for the Sol Plaatje University ICT Year Project backends. Normal retail customers do not see this page.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={loadModelsData}
                  className="p-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs font-semibold text-slate-200 transition cursor-pointer flex items-center space-x-1"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingModels ? "animate-spin" : ""}`} />
                  <span>Refresh Telemetry</span>
                </button>
              </div>

              {/* Subsystems Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* 1. Biometric Face AI */}
                <div className="bg-slate-900/70 border border-slate-700 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">Biometric Face AI</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    dlib deep metric learning engine generating 128-dimensional facial feature vectors.
                  </p>
                  <div className="space-y-1 text-[11px] text-slate-300 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Vector Size:</span>
                      <span>128 Float32</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Threshold:</span>
                      <span>{toleranceThreshold}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Registered:</span>
                      <span>Ofentse, Refilwe, Kamogelo</span>
                    </div>
                  </div>
                </div>

                {/* 2. PyTorch CNN Vision */}
                <div className="bg-slate-900/70 border border-slate-700 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">PyTorch CNN Vision</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800">
                      Loaded
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Pre-trained PyTorch 2.14 image classifier module executing forward passes.
                  </p>
                  <div className="space-y-1 text-[11px] text-slate-300 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Architectures:</span>
                      <span>ResNet18, AlexNet, VGG16</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Input Size:</span>
                      <span>224 &times; 224 RGB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Dataset:</span>
                      <span>ImageNet-1K (1,000 Classes)</span>
                    </div>
                  </div>
                </div>

                {/* 3. Gemini Financial Advisor */}
                <div className="bg-slate-900/70 border border-slate-700 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">Financial AI Coach</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-950 text-purple-400 border border-purple-800">
                      Online
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Google Gemini 2.5 / Flash + South African SARS TFSA and WealthIQ heuristic rules engine.
                  </p>
                  <div className="space-y-1 text-[11px] text-slate-300 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cloud Model:</span>
                      <span>Gemini 2.5 Flash</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Offline Engine:</span>
                      <span>SA Cashflow Rules</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Avg Latency:</span>
                      <span>&lt; 250ms</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

      </div>

    </div>
  );
}

