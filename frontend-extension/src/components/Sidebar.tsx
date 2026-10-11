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
  ScanFace
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userAccount: { name: string; accNumber: string; balance: number };
  onLogout?: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, userAccount, onLogout }: SidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "transactions", label: "Transactions", icon: Receipt },
    { id: "savings", label: "Savings & Pockets", icon: PiggyBank },
    { id: "cards", label: "Virtual Cards", icon: CreditCard },
    { id: "investments", label: "Investments", icon: Briefcase },
    { id: "calculator", label: "Growth Calculator", icon: Calculator },
    { id: "simulations", label: "My Simulations", icon: TrendingUp },
    { id: "guidance", label: "Smart Guidance", icon: Sparkles },
    { id: "models", label: "AI Models & Security", icon: ScanFace },
  ];

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
  };

  const initials = userAccount.name ? userAccount.name.trim().split(/\s+/).map(n => n[0]).join("").toUpperCase() : "U";

  const navigationContent = (isMobile: boolean) => (
    <>
      <div>
        {/* Capitec Branded Header */}
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
            Capitec Extension
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
            <span className="text-[10px] font-mono text-slate-400 group-hover:text-slate-600 transition flex items-center space-x-0.5">
              <span>Acc: {userAccount.accNumber}</span>
              <span className="text-capitec-red font-bold font-sans">✎</span>
            </span>
          </div>
        </div>
        <button 
          id={`${isMobile ? "mobile" : "desktop"}-btn-logout`}
          title="Sign Out" 
          onClick={onLogout}
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

        <div 
          onClick={() => handleTabClick("profile")}
          className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-capitec-blue text-xs font-bold font-mono cursor-pointer hover:bg-slate-200 transition"
          title="Edit Profile"
        >
          {initials}
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
    </>
  );
}
