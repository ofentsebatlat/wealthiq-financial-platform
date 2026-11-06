import { useState } from "react";
import { 
  LayoutDashboard, 
  Receipt, 
  Briefcase, 
  Calculator, 
  Sparkles, 
  TrendingUp, 
  LogOut, 
  UserCircle,
  CreditCard,
  Menu,
  X,
  PiggyBank,
  Headphones,
  Bell,
  Edit2
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userAccount: { name: string; accNumber: string; balance: number };
  onLogout?: () => void;
  onOpenNotifications?: () => void;
  onOpenSupport?: () => void;
  unreadNotificationsCount?: number;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  userAccount,
  onLogout,
  onOpenNotifications,
  onOpenSupport,
  unreadNotificationsCount = 0
}: SidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "transactions", label: "Transactions", icon: Receipt },
    { id: "savings", label: "Savings & Pockets", icon: PiggyBank },
    { id: "cards", label: "Virtual Cards", icon: CreditCard },
    { id: "investments", label: "Investments", icon: Briefcase },
    { id: "calculator", label: "Growth Calculator", icon: Calculator },
    { id: "simulations", label: "My Simulations", icon: TrendingUp },
    { id: "guidance", label: "Smart Guidance", icon: Sparkles },
    { id: "support", label: "Banker & Support Hub", icon: Headphones },
  ];

  const handleTabClick = (tabId: string) => {
    if (tabId === "support") {
      if (onOpenSupport) {
        onOpenSupport();
      } else {
        setActiveTab("support");
      }
    } else {
      setActiveTab(tabId);
    }
    setIsMobileMenuOpen(false);
  };

  const initials = userAccount.name ? userAccount.name.trim().split(/\s+/).map(n => n[0]).join("").toUpperCase() : "U";

  const navigationContent = (isMobile: boolean) => (
    <>
      <div>
        {/* WealthIQ Header */}
        <div className="p-6 border-b border-slate-100 flex flex-col relative">
          {isMobile && (
            <button
              id="btn-close-mobile-menu"
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-5 right-4 p-1 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              title="Close Menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-baseline space-x-1 text-left">
            <span className="text-2xl font-bold font-display tracking-tight text-capitec-blue">
              Wealth<span className="text-capitec-red">IQ</span>
            </span>
          </div>
          <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase mt-0.5 text-left">
            Intelligent Banking
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`${isMobile ? "mobile" : "desktop"}-sidebar-tab-${item.id}`}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  isActive
                    ? "bg-slate-50 text-capitec-blue border-l-4 border-capitec-red pl-3"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <IconComponent className={`w-5 h-5 ${isActive ? "text-capitec-red" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Profile Block */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div 
          onClick={() => handleTabClick("profile")}
          className="flex items-center space-x-3 hover:bg-slate-100/80 p-1.5 -m-1.5 rounded-xl transition cursor-pointer group"
          title="Edit Profile Details"
        >
          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-capitec-blue font-bold text-sm group-hover:bg-capitec-blue group-hover:text-white transition">
            {initials}
          </div>
          <div className="flex flex-col text-left">
            <span className="text-sm font-semibold text-slate-800 leading-tight group-hover:text-capitec-blue transition">
              {userAccount.name}
            </span>
            <span className="text-[10px] font-mono text-slate-400 group-hover:text-slate-600 transition flex items-center space-x-1">
              <span>Acc: {userAccount.accNumber}</span>
              <Edit2 className="w-2.5 h-2.5 text-capitec-red inline" />
            </span>
          </div>
        </div>
        <button 
          id={`${isMobile ? "mobile" : "desktop"}-btn-logout`}
          title="Sign Out" 
          onClick={() => setShowExitConfirm(true)}
          className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer shrink-0"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* MOBILE HEADER: Top fixed banner */}
      <div 
        id="mobile-app-header" 
        className="md:hidden flex h-14 bg-white border-b border-slate-200 fixed top-0 left-0 right-0 items-center justify-between px-4 z-25 select-none"
      >
        <button
          id="btn-mobile-menu-toggle"
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition cursor-pointer"
          title="Open Navigation"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="flex items-center space-x-1">
          <span className="text-xl font-bold font-display tracking-tight text-capitec-blue">
            Wealth<span className="text-capitec-red">IQ</span>
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {onOpenSupport && (
            <button
              id="mobile-btn-support"
              type="button"
              onClick={onOpenSupport}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition cursor-pointer"
              title="Banker Support"
            >
              <Headphones className="w-5 h-5 text-capitec-blue" />
            </button>
          )}

          {onOpenNotifications && (
            <button
              id="mobile-btn-notifications"
              type="button"
              onClick={onOpenNotifications}
              className="relative p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute 0 top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-capitec-red text-white text-[8px] font-bold flex items-center justify-center animate-pulse">
                  {unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount}
                </span>
              )}
            </button>
          )}

          <div 
            onClick={() => handleTabClick("profile")}
            className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-capitec-blue text-xs font-bold font-mono cursor-pointer hover:bg-slate-200 transition"
            title="Edit Profile"
          >
            {initials}
          </div>
        </div>
      </div>

      {/* MOBILE DRAWER: Backdrop overlay */}
      <div 
        id="mobile-drawer-backdrop"
        className={`fixed inset-0 bg-slate-950/40 z-40 transition-all duration-300 md:hidden ${
          isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* MOBILE DRAWER: Slide-out menu panel */}
      <aside
        id="mobile-sidebar-drawer"
        className={`fixed inset-y-0 left-0 w-64 bg-white z-50 flex flex-col justify-between shadow-2xl transition-transform duration-300 transform md:hidden ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {navigationContent(true)}
      </aside>

      {/* DESKTOP SIDEBAR: Stationary left panel */}
      <aside 
        id="desktop-sidebar" 
        className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col justify-between h-screen sticky top-0 shrink-0 select-none z-20"
      >
        {navigationContent(false)}
      </aside>

      {/* Exit Confirmation Dialog */}
      {showExitConfirm && (
        <div id="exit-confirmation-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-sm border border-slate-200 overflow-hidden shadow-2xl p-6 text-center space-y-4 animate-scaleUp">
            <div className="w-12 h-12 bg-red-50 text-capitec-red rounded-full flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-slate-900 font-display">Confirm Sign Out</h3>
              <p className="text-xs text-slate-600">Are you sure you want to exit?</p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                id="btn-cancel-exit"
                onClick={() => setShowExitConfirm(false)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-exit"
                onClick={() => {
                  setShowExitConfirm(false);
                  onLogout?.();
                }}
                className="py-2.5 px-4 rounded-xl bg-capitec-red hover:bg-capitec-red-dark text-white text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
