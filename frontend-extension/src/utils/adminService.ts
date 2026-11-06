import { LoginEvent, AdminUserAccount } from "../types";

const LOCAL_EVENTS_KEY = "wealthiq_login_events_backup";

/**
 * Record a login event (PIN, Biometric, Admin) to the live audit log
 */
export async function recordLoginEvent(
  eventData: Omit<LoginEvent, "id" | "timestamp">
): Promise<LoginEvent | null> {
  const fallbackEvent: LoginEvent = {
    ...eventData,
    id: "evt-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toISOString()
  };

  // 1. Save to local storage cache immediately
  try {
    const raw = localStorage.getItem(LOCAL_EVENTS_KEY);
    const list: LoginEvent[] = raw ? JSON.parse(raw) : [];
    list.unshift(fallbackEvent);
    localStorage.setItem(LOCAL_EVENTS_KEY, JSON.stringify(list.slice(0, 100)));
  } catch (e) {
    console.warn("[AdminService] Could not write event to localStorage:", e);
  }

  // 2. Transmit to server
  try {
    const res = await fetch("/api/admin/login-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventData)
    });

    if (res.ok) {
      const data = await res.json();
      return data.event;
    }
  } catch (err) {
    console.warn("[AdminService] Server event logging notification:", err);
  }

  return fallbackEvent;
}

/**
 * Fetch the latest live login events stream
 */
export async function fetchLoginEvents(): Promise<LoginEvent[]> {
  try {
    const res = await fetch("/api/admin/login-events");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.events)) {
        return data.events;
      }
    }
  } catch (err) {
    console.warn("[AdminService] Server fetch failed, falling back to local events cache:", err);
  }

  // Fallback to local storage
  try {
    const raw = localStorage.getItem(LOCAL_EVENTS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {}

  return [];
}

/**
 * Clear the live login audit log
 */
export async function clearLoginEvents(): Promise<boolean> {
  try {
    localStorage.removeItem(LOCAL_EVENTS_KEY);
    const res = await fetch("/api/admin/clear-events", { method: "POST" });
    return res.ok;
  } catch (err) {
    return false;
  }
}

/**
 * Fetch registered users and account security statuses for admin management
 */
export async function fetchAdminUsers(): Promise<AdminUserAccount[]> {
  try {
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.users)) {
        return data.users;
      }
    }
  } catch (err) {
    console.warn("[AdminService] Failed to fetch users for admin:", err);
  }

  // Fallback default user accounts
  return [
    {
      userName: "Ofentse Batlang",
      userPin: "1234",
      userEmail: "ofentsebatlang@gmail.com",
      userPhone: "+27 78 697 6181",
      accountNumber: "1431289445",
      startingBalance: 36546.55,
      isFrozen: false,
      hasFacePhoto: true,
      biometricEnrolled: true,
      lastLogin: "Active Now"
    },
    {
      userName: "Refilwe Keketsi",
      userPin: "4321",
      userEmail: "refilwe.keketsi@spu.ac.za",
      userPhone: "+27 71 890 1234",
      accountNumber: "1439902184",
      startingBalance: 18450.00,
      isFrozen: false,
      hasFacePhoto: true,
      biometricEnrolled: true,
      lastLogin: "Yesterday, 16:40"
    },
    {
      userName: "Kamogelo Bantsheng",
      userPin: "5678",
      userEmail: "kamogelo.b@spu.ac.za",
      userPhone: "+27 83 234 5678",
      accountNumber: "1438812901",
      startingBalance: 24900.25,
      isFrozen: false,
      hasFacePhoto: true,
      biometricEnrolled: true,
      lastLogin: "2 days ago"
    }
  ];
}

/**
 * Freeze, unfreeze, reset PIN, or adjust balance on an account
 */
export async function updateUserAccountStatus(
  userName: string,
  updates: { isFrozen?: boolean; resetPin?: string; adjustBalance?: number }
): Promise<boolean> {
  try {
    const res = await fetch("/api/admin/user-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userName, ...updates })
    });
    return res.ok;
  } catch (err) {
    console.warn("[AdminService] Failed to update user status:", err);
    return false;
  }
}

