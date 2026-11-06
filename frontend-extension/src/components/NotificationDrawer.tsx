import { useState } from "react";
import {
  X,
  Bell,
  CheckCheck,
  Trash2,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Building2,
  Sparkles,
  ChevronRight,
  ArrowUpRight
} from "lucide-react";
import { BankNotification } from "../types";

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: BankNotification[];
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onNotificationClick: (notif: BankNotification) => void;
}

export default function NotificationDrawer({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
  onClearAll,
  onNotificationClick
}: NotificationDrawerProps) {
  const [filter, setFilter] = useState<"all" | "transaction" | "security" | "compliance" | "advisor">("all");

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  const filteredNotifications = notifications.filter(n => {
    if (filter === "all") return true;
    return n.category === filter;
  });

  const getCategoryIcon = (n: BankNotification) => {
    if (n.category === "transaction") {
      return n.type === "income" ? (
        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
          <TrendingUp className="w-4 h-4 stroke-[2.5]" />
        </div>
      ) : (
        <div className="w-9 h-9 rounded-xl bg-red-50 text-capitec-red flex items-center justify-center shrink-0 border border-red-100">
          <TrendingDown className="w-4 h-4 stroke-[2.5]" />
        </div>
      );
    }
    if (n.category === "security") {
      return (
        <div className="w-9 h-9 rounded-xl bg-blue-50 text-capitec-blue flex items-center justify-center shrink-0 border border-blue-100">
          <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
        </div>
      );
    }
    if (n.category === "compliance") {
      return (
        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
          <Building2 className="w-4 h-4 stroke-[2.5]" />
        </div>
      );
    }
    return (
      <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
        <Sparkles className="w-4 h-4 stroke-[2.5]" />
      </div>
    );
  };

  return (
    <div id="notification-drawer-backdrop" className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-2xs animate-fadeIn">
      {/* Click outside to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer Panel */}
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-200 animate-slideLeft text-left">
        
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-capitec-blue text-white rounded-xl shadow-3xs">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base font-display">
                  Bank Notifications
                </h3>
                <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase block mt-0.5">
                  WealthIQ Live Feed
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={onMarkAllAsRead}
                  className="px-2.5 py-1 text-xs font-semibold text-capitec-blue hover:bg-blue-50 rounded-lg transition cursor-pointer flex items-center space-x-1"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Read all</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                  title="Clear all notifications"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex space-x-1 pt-4 overflow-x-auto scrollbar-none text-xs">
            {[
              { id: "all", label: "All" },
              { id: "transaction", label: "Money Alerts" },
              { id: "security", label: "Security" },
              { id: "compliance", label: "FICA & Bank" },
              { id: "advisor", label: "Smart Tips" }
            ].map(tab => {
              const active = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition whitespace-nowrap cursor-pointer text-[11px] ${
                    active
                      ? "bg-capitec-blue text-white shadow-3xs"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notifications Scrollable List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-slate-100/80">
          {filteredNotifications.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                <Bell className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-600">No notifications in this view</p>
              <p className="text-xs text-slate-400 max-w-xs">
                You are all caught up with your banking alerts, transactions, and security updates.
              </p>
            </div>
          ) : (
            filteredNotifications.map(notif => (
              <div
                key={notif.id}
                onClick={() => onNotificationClick(notif)}
                className={`pt-3 first:pt-0 pb-3 flex items-start space-x-3 rounded-2xl p-2.5 transition cursor-pointer group ${
                  notif.read ? "bg-white hover:bg-slate-50" : "bg-blue-50/40 hover:bg-blue-50/70 border border-blue-100/60"
                }`}
              >
                {getCategoryIcon(notif)}

                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-800 truncate group-hover:text-capitec-blue transition">
                      {notif.title}
                    </span>
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-capitec-red shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed line-clamp-2">
                    {notif.message}
                  </p>
                  <div className="flex items-center justify-between mt-1.5 pt-1 text-[10px] text-slate-400">
                    <span>{notif.date}</span>
                    {notif.actionTab && (
                      <span className="font-semibold text-capitec-blue flex items-center space-x-0.5 opacity-90 group-hover:underline">
                        <span>View</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer Notice */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-[10.5px] text-slate-400 flex items-center justify-between">
          <span>WealthIQ Live Banking Communications</span>
          <span>© 2026 WealthIQ. All rights reserved.</span>
        </div>

      </div>
    </div>
  );
}

