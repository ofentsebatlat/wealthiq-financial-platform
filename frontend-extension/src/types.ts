/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  category: "Income" | "Food" | "Transport" | "Entertainment" | "Utilities" | "Shopping" | "Health" | "Savings" | "Investment" | "Other";
  type: "income" | "expense";
  amount: number;
}

export interface InvestmentItem {
  id: string;
  name: string;
  type: "Share" | "Unit Trust" | "Fixed Deposit" | "Savings pocket" | "Crypto";
  currentValue: number;
  monthlyContribution: number;
  expectedAnnualReturn: number; // e.g. 8.5 for 8.5%
  dateOpened: string;
}

export interface SimulationGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentSaved: number;
  monthlyContribution: number;
  interestRate: number; // e.g. 7.5%
  targetDate: string; // YYYY-MM-DD
  category: "Car" | "House" | "Emergency Fund" | "Debt Payoff" | "Travel" | "Other";
}

export interface ChatMessage {
  id: string;
  sender: "user" | "coach";
  text: string;
  timestamp: string;
}

export interface VirtualCard {
  id: string;
  cardholderName: string;
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  type: "Virtual Debit" | "Virtual Shopping" | "Subscription Card" | "Travel Card";
  color: "blue" | "red" | "dark" | "gold";
  isFrozen: boolean;
  dailyLimit: number;
  monthlyLimit: number;
  spentThisMonth: number;
}

export interface SavingsPocket {
  id: string;
  name: string;
  balance: number;
  targetAmount: number;
  targetDate: string;
  interestRate: number;
  category: "Emergency" | "Holiday" | "Property" | "Education" | "Vehicle" | "General";
  dateCreated: string;
  autoRoundUp: boolean;
  roundUpAmount: number; // R10, R20, R50 round up intervals
  lastInterestPayoutTime?: number;
  accumulatedInterest?: number;
}

export interface BankNotification {
  id: string;
  title: string;
  message: string;
  date: string;
  timestamp: number;
  category: "transaction" | "security" | "compliance" | "advisor";
  read: boolean;
  amount?: number;
  type?: "income" | "expense" | "info";
  actionTab?: string;
}

export interface SupportTicket {
  id: string;
  bankReference: string;
  subject: string;
  category: "Card Security" | "Transaction Dispute" | "Statement Request" | "FICA & KYC" | "Investment Query" | "General";
  status: "Open" | "Under Review" | "Resolved";
  date: string;
  description: string;
  preferredContact: "Phone Call" | "SMS" | "Secure In-App Message";
}

export interface LoginEvent {
  id: string;
  timestamp: string; // ISO String
  userName: string;
  accountNumber?: string;
  method: "biometric_face" | "pin" | "admin_portal";
  status: "success" | "failed";
  similarity?: number;
  distance?: number;
  device: string;
  ipAddress: string;
  details: string;
}

export interface AdminUserAccount {
  userName: string;
  userPin: string;
  userEmail: string;
  userPhone: string;
  accountNumber: string;
  startingBalance: number;
  isFrozen?: boolean;
  hasFacePhoto?: boolean;
  biometricEnrolled?: boolean;
  lastLogin?: string;
}



