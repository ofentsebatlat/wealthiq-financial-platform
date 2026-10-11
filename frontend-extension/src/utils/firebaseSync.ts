import { collection, getDocs, setDoc, doc, deleteDoc, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import { Transaction, InvestmentItem, SimulationGoal, VirtualCard, SavingsPocket } from "../types";

// Types for DB representation of security profile
export interface SecurityProfileData {
  userPin: string;
  userFacePhoto: string;
  isSecurityRegistered: boolean;
  userName?: string;
  startingBalance?: number;
  userEmail?: string;
  userPhone?: string;
}

// ------------------ SECURITY PROFILE ------------------

export async function fetchSecurityProfile(): Promise<SecurityProfileData | null> {
  try {
    const coll = collection(db, "security_profile");
    const snap = await getDocs(coll);
    if (!snap.empty) {
      const docData = snap.docs[0].data();
      return {
        userPin: docData.userPin || "",
        userFacePhoto: docData.userFacePhoto || "",
        isSecurityRegistered: !!docData.isSecurityRegistered,
        userName: docData.userName || "",
        startingBalance: docData.startingBalance !== undefined ? Number(docData.startingBalance) : 36546.55,
        userEmail: docData.userEmail || "",
        userPhone: docData.userPhone || ""
      };
    }
  } catch (err) {
    console.error("[FirebaseSync] Error fetching security profile:", err);
  }
  return null;
}

export async function saveSecurityProfile(profile: SecurityProfileData): Promise<void> {
  try {
    const docRef = doc(db, "security_profile", "user_data");
    await setDoc(docRef, profile);
    console.log("[FirebaseSync] Security profile successfully saved to cloud.");
  } catch (err) {
    console.error("[FirebaseSync] Error saving security profile:", err);
  }
}

// ------------------ TRANSACTIONS ------------------

export async function fetchTransactions(initialSeeds: Transaction[]): Promise<Transaction[]> {
  try {
    const coll = collection(db, "transactions");
    const snap = await getDocs(coll);
    if (snap.empty) {
      console.log("[FirebaseSync] Transactions collection is empty. Returning empty list (no seed).");
      return [];
    } else {
      const list: Transaction[] = [];
      snap.forEach(d => {
        const data = d.data();
        list.push({
          id: d.id,
          date: data.date,
          description: data.description,
          category: data.category,
          type: data.type,
          amount: Number(data.amount)
        } as Transaction);
      });
      // Sort newest-first or by date
      return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
  } catch (err) {
    console.error("[FirebaseSync] Error fetching transactions:", err);
    return [];
  }
}

export async function saveTransaction(tx: Transaction): Promise<void> {
  try {
    const docRef = doc(db, "transactions", tx.id);
    await setDoc(docRef, tx);
    console.log("[FirebaseSync] Saved transaction:", tx.id);
  } catch (err) {
    console.error("[FirebaseSync] Error saving transaction:", err);
  }
}

export async function deleteTransaction(id: string): Promise<void> {
  try {
    const docRef = doc(db, "transactions", id);
    await deleteDoc(docRef);
    console.log("[FirebaseSync] Deleted transaction:", id);
  } catch (err) {
    console.error("[FirebaseSync] Error deleting transaction:", err);
  }
}

// ------------------ INVESTMENTS ------------------

export async function fetchInvestments(initialSeeds: InvestmentItem[]): Promise<InvestmentItem[]> {
  try {
    const coll = collection(db, "investments");
    const snap = await getDocs(coll);
    if (snap.empty) {
      console.log("[FirebaseSync] Investments collection is empty. Returning empty list (no seed).");
      return [];
    } else {
      const list: InvestmentItem[] = [];
      snap.forEach(d => {
        const data = d.data();
        list.push({
          id: d.id,
          name: data.name,
          type: data.type,
          currentValue: Number(data.currentValue),
          monthlyContribution: Number(data.monthlyContribution),
          expectedAnnualReturn: Number(data.expectedAnnualReturn),
          dateOpened: data.dateOpened
        } as InvestmentItem);
      });
      return list;
    }
  } catch (err) {
    console.error("[FirebaseSync] Error fetching investments:", err);
    return [];
  }
}

export async function saveInvestment(inv: InvestmentItem): Promise<void> {
  try {
    const docRef = doc(db, "investments", inv.id);
    await setDoc(docRef, inv);
    console.log("[FirebaseSync] Saved investment:", inv.id);
  } catch (err) {
    console.error("[FirebaseSync] Error saving investment:", err);
  }
}

export async function deleteInvestment(id: string): Promise<void> {
  try {
    const docRef = doc(db, "investments", id);
    await deleteDoc(docRef);
    console.log("[FirebaseSync] Deleted investment:", id);
  } catch (err) {
    console.error("[FirebaseSync] Error deleting investment:", err);
  }
}

// ------------------ SIMULATION GOALS ------------------

export async function fetchSimulationGoals(initialSeeds: SimulationGoal[]): Promise<SimulationGoal[]> {
  try {
    const coll = collection(db, "simulation_goals");
    const snap = await getDocs(coll);
    if (snap.empty) {
      console.log("[FirebaseSync] Simulation goals collection is empty. Returning empty list (no seed).");
      return [];
    } else {
      const list: SimulationGoal[] = [];
      snap.forEach(d => {
        const data = d.data();
        list.push({
          id: d.id,
          name: data.name,
          targetAmount: Number(data.targetAmount),
          currentSaved: Number(data.currentSaved),
          monthlyContribution: Number(data.monthlyContribution),
          interestRate: Number(data.interestRate),
          targetDate: data.targetDate,
          category: data.category
        } as SimulationGoal);
      });
      return list;
    }
  } catch (err) {
    console.error("[FirebaseSync] Error fetching simulation goals:", err);
    return [];
  }
}

export async function saveSimulationGoal(g: SimulationGoal): Promise<void> {
  try {
    const docRef = doc(db, "simulation_goals", g.id);
    await setDoc(docRef, g);
    console.log("[FirebaseSync] Saved simulation goal:", g.id);
  } catch (err) {
    console.error("[FirebaseSync] Error saving simulation goal:", err);
  }
}

export async function deleteSimulationGoal(id: string): Promise<void> {
  try {
    const docRef = doc(db, "simulation_goals", id);
    await deleteDoc(docRef);
    console.log("[FirebaseSync] Deleted simulation goal:", id);
  } catch (err) {
    console.error("[FirebaseSync] Error deleting simulation goal:", err);
  }
}

// ------------------ VIRTUAL CARDS ------------------

export async function fetchVirtualCards(initialSeeds: VirtualCard[]): Promise<VirtualCard[]> {
  try {
    const coll = collection(db, "virtual_cards");
    const snap = await getDocs(coll);
    if (snap.empty) {
      console.log("[FirebaseSync] Virtual cards collection is empty. Returning empty list (no seed).");
      return [];
    } else {
      const list: VirtualCard[] = [];
      snap.forEach(d => {
        const data = d.data();
        list.push({
          id: d.id,
          cardholderName: data.cardholderName,
          cardNumber: data.cardNumber,
          expiryDate: data.expiryDate,
          cvv: data.cvv,
          type: data.type,
          color: data.color,
          isFrozen: !!data.isFrozen,
          dailyLimit: Number(data.dailyLimit),
          monthlyLimit: Number(data.monthlyLimit),
          spentThisMonth: Number(data.spentThisMonth)
        } as VirtualCard);
      });
      return list;
    }
  } catch (err) {
    console.error("[FirebaseSync] Error fetching virtual cards:", err);
    return [];
  }
}

export async function saveVirtualCard(c: VirtualCard): Promise<void> {
  try {
    const docRef = doc(db, "virtual_cards", c.id);
    await setDoc(docRef, c);
    console.log("[FirebaseSync] Saved virtual card:", c.id);
  } catch (err) {
    console.error("[FirebaseSync] Error saving virtual card:", err);
  }
}

export async function deleteVirtualCard(id: string): Promise<void> {
  try {
    const docRef = doc(db, "virtual_cards", id);
    await deleteDoc(docRef);
    console.log("[FirebaseSync] Deleted virtual card:", id);
  } catch (err) {
    console.error("[FirebaseSync] Error deleting virtual card:", err);
  }
}

// ------------------ SAVINGS POCKETS ------------------

export async function fetchSavingsPockets(initialSeeds: SavingsPocket[]): Promise<SavingsPocket[]> {
  try {
    const coll = collection(db, "savings_pockets");
    const snap = await getDocs(coll);
    if (snap.empty) {
      console.log("[FirebaseSync] Savings pockets collection is empty. Returning empty list (no seed).");
      return [];
    } else {
      const list: SavingsPocket[] = [];
      snap.forEach(d => {
        const data = d.data();
        list.push({
          id: d.id,
          name: data.name,
          balance: Number(data.balance),
          targetAmount: Number(data.targetAmount),
          targetDate: data.targetDate,
          interestRate: Number(data.interestRate),
          category: data.category,
          dateCreated: data.dateCreated,
          autoRoundUp: !!data.autoRoundUp,
          roundUpAmount: Number(data.roundUpAmount),
          lastInterestPayoutTime: data.lastInterestPayoutTime !== undefined ? Number(data.lastInterestPayoutTime) : undefined,
          accumulatedInterest: data.accumulatedInterest !== undefined ? Number(data.accumulatedInterest) : undefined
        } as SavingsPocket);
      });
      return list;
    }
  } catch (err) {
    console.error("[FirebaseSync] Error fetching savings pockets:", err);
    return [];
  }
}

export async function saveSavingsPocket(p: SavingsPocket): Promise<void> {
  try {
    const docRef = doc(db, "savings_pockets", p.id);
    await setDoc(docRef, p);
    console.log("[FirebaseSync] Saved savings pocket:", p.id);
  } catch (err) {
    console.error("[FirebaseSync] Error saving savings pocket:", err);
  }
}

export async function deleteSavingsPocket(id: string): Promise<void> {
  try {
    const docRef = doc(db, "savings_pockets", id);
    await deleteDoc(docRef);
    console.log("[FirebaseSync] Deleted savings pocket:", id);
  } catch (err) {
    console.error("[FirebaseSync] Error deleting savings pocket:", err);
  }
}
