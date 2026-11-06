import { collection, getDocs, setDoc, doc, deleteDoc, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { Transaction, InvestmentItem, SimulationGoal, VirtualCard, SavingsPocket } from "../types";

// Types for DB representation of security profile
export interface SecurityProfileData {
  userId?: string;
  userPin: string;
  userFacePhoto: string;
  isSecurityRegistered: boolean;
  userName?: string;
  startingBalance?: number;
  userEmail?: string;
  userPhone?: string;
  idNumber?: string;
  dateOfBirth?: string;
  accountNumber?: string;
  accountType?: string;
  enrollmentDate?: string;
}

export function normalizeUserKey(userKey?: string): string {
  if (!userKey) return "default";
  return userKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
}

function getUserStorageKey(collectionName: string, userKey?: string): string {
  const norm = normalizeUserKey(userKey);
  return `wealthiq_${collectionName}_${norm}`;
}

// ------------------ SECURITY PROFILE ------------------

export async function fetchSecurityProfile(userKey?: string): Promise<SecurityProfileData | null> {
  const norm = normalizeUserKey(userKey);

  // 1. Check user-scoped local storage first
  try {
    const local = localStorage.getItem(`wealthiq_security_profile_${norm}`);
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed && parsed.isSecurityRegistered) {
        return parsed;
      }
    }
  } catch (e) {}

  // 2. Fetch from Firestore (per-user document)
  try {
    const docRef = doc(db, "security_profile", norm);
    const snap = await getDocs(collection(db, "security_profile"));
    for (const d of snap.docs) {
      const data = d.data();
      const matchName = data.userName && normalizeUserKey(data.userName) === norm;
      const matchEmail = data.userEmail && normalizeUserKey(data.userEmail) === norm;
      if (d.id === norm || matchName || matchEmail) {
        return {
          userId: data.userId,
          userPin: data.userPin || "",
          userFacePhoto: data.userFacePhoto || "",
          isSecurityRegistered: !!data.isSecurityRegistered,
          userName: data.userName || "",
          startingBalance: data.startingBalance !== undefined ? Number(data.startingBalance) : 0,
          userEmail: data.userEmail || "",
          userPhone: data.userPhone || "",
          idNumber: data.idNumber || "",
          dateOfBirth: data.dateOfBirth || "",
          accountNumber: data.accountNumber || "",
          accountType: data.accountType || "",
          enrollmentDate: data.enrollmentDate || ""
        };
      }
    }
  } catch (err) {
    console.warn("[FirebaseSync] Notice fetching cloud security profile:", err);
  }

  return null;
}

export async function saveSecurityProfile(profile: SecurityProfileData): Promise<void> {
  const norm = normalizeUserKey(profile.userName || profile.userEmail);
  try {
    localStorage.setItem(`wealthiq_security_profile_${norm}`, JSON.stringify(profile));
    const docRef = doc(db, "security_profile", norm);
    await setDoc(docRef, { ...profile, userKey: norm });
    console.log(`[FirebaseSync] Security profile successfully saved for ${norm}.`);
  } catch (err) {
    console.warn("[FirebaseSync] Notice saving security profile:", err);
  }
}

// ------------------ TRANSACTIONS ------------------

export async function fetchTransactions(initialSeeds: Transaction[], userKey?: string): Promise<Transaction[]> {
  const norm = normalizeUserKey(userKey);
  const isOfentse = norm === "ofentse_batlang" || norm === "ofentse";

  // 1. Check user-scoped local storage
  try {
    const local = localStorage.getItem(getUserStorageKey("txs", userKey));
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {}

  // 2. Check Firestore for user's transactions
  try {
    const coll = collection(db, "transactions");
    const snap = await getDocs(coll);
    if (!snap.empty) {
      const list: Transaction[] = [];
      snap.forEach(d => {
        const data = d.data();
        // Strict user filter: only include if explicitly tagged with this user
        if (data.userId && data.userId === norm) {
          list.push({
            id: d.id,
            date: data.date,
            description: data.description,
            category: data.category,
            type: data.type,
            amount: Number(data.amount)
          } as Transaction);
        }
      });
      if (list.length > 0) {
        return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }
    }
  } catch (err) {
    console.warn("[FirebaseSync] Notice fetching cloud transactions:", err);
  }

  // 3. Fallback seeds ONLY for Ofentse Batlang
  if (isOfentse && initialSeeds.length > 0) {
    try {
      localStorage.setItem(getUserStorageKey("txs", userKey), JSON.stringify(initialSeeds));
    } catch {}
    return initialSeeds;
  }

  // New accounts (like Bokang Khakhau) start with an isolated empty ledger
  return [];
}

export async function saveTransaction(tx: Transaction, userKey?: string): Promise<void> {
  const norm = normalizeUserKey(userKey);
  try {
    // 1. Update user-scoped local storage
    const current = await fetchTransactions([], userKey);
    const updated = [tx, ...current.filter(t => t.id !== tx.id)];
    localStorage.setItem(getUserStorageKey("txs", userKey), JSON.stringify(updated));

    // 2. Persist to Firestore with userId tagging
    const docRef = doc(db, "transactions", tx.id);
    await setDoc(docRef, { ...tx, userId: norm });
  } catch (err) {
    console.warn("[FirebaseSync] Notice saving transaction:", err);
  }
}

export async function deleteTransaction(id: string, userKey?: string): Promise<void> {
  const norm = normalizeUserKey(userKey);
  try {
    const current = await fetchTransactions([], userKey);
    const updated = current.filter(t => t.id !== id);
    localStorage.setItem(getUserStorageKey("txs", userKey), JSON.stringify(updated));

    const docRef = doc(db, "transactions", id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn("[FirebaseSync] Notice deleting transaction:", err);
  }
}

// ------------------ INVESTMENTS ------------------

export async function fetchInvestments(initialSeeds: InvestmentItem[], userKey?: string): Promise<InvestmentItem[]> {
  const norm = normalizeUserKey(userKey);
  const isOfentse = norm === "ofentse_batlang" || norm === "ofentse";

  try {
    const local = localStorage.getItem(getUserStorageKey("invs", userKey));
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}

  if (isOfentse && initialSeeds.length > 0) {
    try {
      localStorage.setItem(getUserStorageKey("invs", userKey), JSON.stringify(initialSeeds));
    } catch {}
    return initialSeeds;
  }

  return [];
}

export async function saveInvestment(inv: InvestmentItem, userKey?: string): Promise<void> {
  const norm = normalizeUserKey(userKey);
  try {
    const current = await fetchInvestments([], userKey);
    const updated = [inv, ...current.filter(i => i.id !== inv.id)];
    localStorage.setItem(getUserStorageKey("invs", userKey), JSON.stringify(updated));

    const docRef = doc(db, "investments", inv.id);
    await setDoc(docRef, { ...inv, userId: norm });
  } catch (err) {
    console.warn("[FirebaseSync] Notice saving investment:", err);
  }
}

export async function deleteInvestment(id: string, userKey?: string): Promise<void> {
  const norm = normalizeUserKey(userKey);
  try {
    const current = await fetchInvestments([], userKey);
    const updated = current.filter(i => i.id !== id);
    localStorage.setItem(getUserStorageKey("invs", userKey), JSON.stringify(updated));

    const docRef = doc(db, "investments", id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn("[FirebaseSync] Notice deleting investment:", err);
  }
}

// ------------------ SIMULATION GOALS ------------------

export async function fetchSimulationGoals(initialSeeds: SimulationGoal[], userKey?: string): Promise<SimulationGoal[]> {
  const norm = normalizeUserKey(userKey);
  const isOfentse = norm === "ofentse_batlang" || norm === "ofentse";

  try {
    const local = localStorage.getItem(getUserStorageKey("goals", userKey));
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}

  if (isOfentse && initialSeeds.length > 0) {
    try {
      localStorage.setItem(getUserStorageKey("goals", userKey), JSON.stringify(initialSeeds));
    } catch {}
    return initialSeeds;
  }

  return [];
}

export async function saveSimulationGoal(g: SimulationGoal, userKey?: string): Promise<void> {
  const norm = normalizeUserKey(userKey);
  try {
    const current = await fetchSimulationGoals([], userKey);
    const updated = [g, ...current.filter(x => x.id !== g.id)];
    localStorage.setItem(getUserStorageKey("goals", userKey), JSON.stringify(updated));

    const docRef = doc(db, "simulation_goals", g.id);
    await setDoc(docRef, { ...g, userId: norm });
  } catch (err) {
    console.warn("[FirebaseSync] Notice saving simulation goal:", err);
  }
}

export async function deleteSimulationGoal(id: string, userKey?: string): Promise<void> {
  const norm = normalizeUserKey(userKey);
  try {
    const current = await fetchSimulationGoals([], userKey);
    const updated = current.filter(x => x.id !== id);
    localStorage.setItem(getUserStorageKey("goals", userKey), JSON.stringify(updated));

    const docRef = doc(db, "simulation_goals", id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn("[FirebaseSync] Notice deleting simulation goal:", err);
  }
}

// ------------------ VIRTUAL CARDS ------------------

export async function fetchVirtualCards(initialSeeds: VirtualCard[], userKey?: string): Promise<VirtualCard[]> {
  const norm = normalizeUserKey(userKey);
  const isOfentse = norm === "ofentse_batlang" || norm === "ofentse";

  try {
    const local = localStorage.getItem(getUserStorageKey("cards", userKey));
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}

  if (isOfentse && initialSeeds.length > 0) {
    try {
      localStorage.setItem(getUserStorageKey("cards", userKey), JSON.stringify(initialSeeds));
    } catch {}
    return initialSeeds;
  }

  return [];
}

export async function saveVirtualCard(c: VirtualCard, userKey?: string): Promise<void> {
  const norm = normalizeUserKey(userKey);
  try {
    const current = await fetchVirtualCards([], userKey);
    const updated = [c, ...current.filter(x => x.id !== c.id)];
    localStorage.setItem(getUserStorageKey("cards", userKey), JSON.stringify(updated));

    const docRef = doc(db, "virtual_cards", c.id);
    await setDoc(docRef, { ...c, userId: norm });
  } catch (err) {
    console.warn("[FirebaseSync] Notice saving virtual card:", err);
  }
}

export async function deleteVirtualCard(id: string, userKey?: string): Promise<void> {
  const norm = normalizeUserKey(userKey);
  try {
    const current = await fetchVirtualCards([], userKey);
    const updated = current.filter(x => x.id !== id);
    localStorage.setItem(getUserStorageKey("cards", userKey), JSON.stringify(updated));

    const docRef = doc(db, "virtual_cards", id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn("[FirebaseSync] Notice deleting virtual card:", err);
  }
}

// ------------------ SAVINGS POCKETS ------------------

export async function fetchSavingsPockets(initialSeeds: SavingsPocket[], userKey?: string): Promise<SavingsPocket[]> {
  const norm = normalizeUserKey(userKey);
  const isOfentse = norm === "ofentse_batlang" || norm === "ofentse";

  try {
    const local = localStorage.getItem(getUserStorageKey("pockets", userKey));
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}

  if (isOfentse && initialSeeds.length > 0) {
    try {
      localStorage.setItem(getUserStorageKey("pockets", userKey), JSON.stringify(initialSeeds));
    } catch {}
    return initialSeeds;
  }

  return [];
}

export async function saveSavingsPocket(p: SavingsPocket, userKey?: string): Promise<void> {
  const norm = normalizeUserKey(userKey);
  try {
    const current = await fetchSavingsPockets([], userKey);
    const updated = [p, ...current.filter(x => x.id !== p.id)];
    localStorage.setItem(getUserStorageKey("pockets", userKey), JSON.stringify(updated));

    const docRef = doc(db, "savings_pockets", p.id);
    await setDoc(docRef, { ...p, userId: norm });
  } catch (err) {
    console.warn("[FirebaseSync] Notice saving savings pocket:", err);
  }
}

export async function deleteSavingsPocket(id: string, userKey?: string): Promise<void> {
  const norm = normalizeUserKey(userKey);
  try {
    const current = await fetchSavingsPockets([], userKey);
    const updated = current.filter(x => x.id !== id);
    localStorage.setItem(getUserStorageKey("pockets", userKey), JSON.stringify(updated));

    const docRef = doc(db, "savings_pockets", id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn("[FirebaseSync] Notice deleting savings pocket:", err);
  }
}
