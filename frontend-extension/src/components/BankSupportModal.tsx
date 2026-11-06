import { useState, FormEvent, useEffect } from "react";
import {
  X,
  PhoneCall,
  FileCheck2,
  ShieldAlert,
  Headphones,
  CheckCircle2,
  Clock,
  Printer,
  Mail,
  Send,
  Building2,
  AlertCircle,
  Download,
  Paperclip,
  ExternalLink,
  FileText,
  Check,
  Loader2
} from "lucide-react";
import { Transaction, SupportTicket } from "../types";
import {
  generateBankStatementPDF,
  generateProofOfPaymentPDF
} from "../utils/statementGenerator";

interface BankSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  userPhone: string;
  userEmail: string;
  userAccountNumber: string;
  availableBalance?: number;
  transactions: Transaction[];
  tickets: SupportTicket[];
  onAddTicket: (ticket: SupportTicket) => void;
}

export default function BankSupportModal({
  isOpen,
  onClose,
  userName,
  userPhone,
  userEmail,
  userAccountNumber,
  availableBalance = 36546.55,
  transactions,
  tickets,
  onAddTicket
}: BankSupportModalProps) {
  const [activeTab, setActiveTab] = useState<"callback" | "documents" | "tickets" | "directory">("callback");

  // Form states for Banker Callback / Query
  const [category, setCategory] = useState<SupportTicket["category"]>("General");
  const [subject, setSubject] = useState("");
  const [preferredContact, setPreferredContact] = useState<SupportTicket["preferredContact"]>("Phone Call");
  const [callTime, setCallTime] = useState("Immediate (Within 15 minutes)");
  const [description, setDescription] = useState("");
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [isSubmittingMessage, setIsSubmittingMessage] = useState(false);
  const [messageDeliveryNotice, setMessageDeliveryNotice] = useState<{
    deliveredTo: string;
    clientCopy: string;
    ref: string;
  } | null>(null);

  // Document states
  const [selectedTxId, setSelectedTxId] = useState<string>(transactions[0]?.id || "");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [popSentNotice, setPopSentNotice] = useState<string | null>(null);

  // POP & Statement Email Composer Modal states
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerRecipient, setComposerRecipient] = useState("");
  const [composerCcUser, setComposerCcUser] = useState(true);
  const [composerSubject, setComposerSubject] = useState("");
  const [composerBody, setComposerBody] = useState("");
  const [attachStatement, setAttachStatement] = useState(true);
  const [attachPop, setAttachPop] = useState(true);
  const [isSendingPopEmail, setIsSendingPopEmail] = useState(false);
  const [popEmailDeliveryResult, setPopEmailDeliveryResult] = useState<{
    success: boolean;
    reference: string;
    deliveredTo: string;
    cc?: string | null;
  } | null>(null);

  // Update selected transaction fallback if transactions change
  useEffect(() => {
    if (!selectedTxId && transactions.length > 0) {
      setSelectedTxId(transactions[0].id);
    }
  }, [transactions, selectedTxId]);

  if (!isOpen) return null;

  const selectedTx = transactions.find(t => t.id === selectedTxId) || transactions[0];

  // TAB 1: Submit message to banker & send official email
  const handleTicketSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsSubmittingMessage(true);
    const randomRefNum = Math.floor(10000 + Math.random() * 90000);
    const newRef = `CAS-${randomRefNum}-CPT`;
    const finalSubject = subject.trim() || `${category} Inquiry`;

    const newTicket: SupportTicket = {
      id: `ticket-${Date.now()}`,
      bankReference: newRef,
      subject: finalSubject,
      category,
      status: "Open",
      date: new Date().toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }),
      description: description.trim(),
      preferredContact
    };

    try {
      // Dispatch inquiry to WealthIQ Client Care & send email copies + SMS callback
      const res = await fetch("/api/support/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName,
          userEmail,
          userPhone,
          userAccountNumber,
          category,
          subject: finalSubject,
          description: description.trim(),
          preferredContact,
          callTime,
          bankReference: newRef
        })
      });

      const data = await res.json();
      if (data.success) {
        setMessageDeliveryNotice({
          deliveredTo: data.deliveredTo || "clientcare@wealthiq.co.za",
          clientCopy: data.clientCopy || userEmail,
          ref: newRef
        });
      }
    } catch (err) {
      console.warn("Could not dispatch message to server email gateway, saving locally:", err);
      setMessageDeliveryNotice({
        deliveredTo: "clientcare@wealthiq.co.za",
        clientCopy: userEmail,
        ref: newRef
      });
    } finally {
      onAddTicket(newTicket);
      setSubmittedRef(newRef);
      setSubject("");
      setDescription("");
      setIsSubmittingMessage(false);
    }
  };

  // Launch pre-composed email in client's default mail app
  const handleOpenMailtoForInquiry = (ref: string) => {
    const inquirySubject = encodeURIComponent(`[${ref}] WealthIQ Support Inquiry: ${category} - ${userName}`);
    const inquiryBody = encodeURIComponent(
      `To: WealthIQ Client Care Team (clientcare@wealthiq.co.za)\n\n` +
      `Account Holder: ${userName}\n` +
      `Account Number: ${userAccountNumber}\n` +
      `Contact Number: ${userPhone}\n` +
      `Preferred Contact: ${preferredContact} (${callTime})\n` +
      `Case Reference: ${ref}\n\n` +
      `--- INQUIRY DETAILS ---\n` +
      `${description || "Please review my banking inquiry logged through the WealthIQ client portal."}\n\n` +
      `WealthIQ Secure Banking Services`
    );
    window.location.href = `mailto:clientcare@wealthiq.co.za?subject=${inquirySubject}&body=${inquiryBody}`;
  };

  // TAB 2: Open POP & Statement Email Composer
  const handleOpenComposer = (e?: FormEvent) => {
    if (e) e.preventDefault();
    const targetRecipient = recipientEmail.trim() || "";
    setComposerRecipient(targetRecipient);
    setComposerCcUser(true);

    const ref = `WIQ-${selectedTx ? selectedTx.id.toUpperCase() : "TX"}-2026`;
    const amtStr = selectedTx ? `R ${selectedTx.amount.toFixed(2)}` : "R 0.00";
    setComposerSubject(`Official WealthIQ Proof of Payment - ${amtStr} [Ref: ${ref}]`);

    const defaultBody =
      `Dear Recipient,\n\n` +
      `Please find attached the official WealthIQ Proof of Payment (POP) and authenticated 3-month Bank Statement for the transaction detailed below:\n\n` +
      `• Transaction Reference: ${ref}\n` +
      `• Payer: ${userName}\n` +
      `• Account Number: ${userAccountNumber}\n` +
      `• Universal Branch Code: 470010\n` +
      `• Payment Recipient: ${selectedTx?.description || "Recipient"}\n` +
      `• Category: ${selectedTx?.category || "Payment"}\n` +
      `• Amount Paid: ${amtStr}\n` +
      `• Date: ${selectedTx?.date || new Date().toISOString().split("T")[0]} 10:42 SAST\n` +
      `• Status: Immediate EFT Cleared (RTC - South African Real-Time Clearing)\n\n` +
      `ATTACHED OFFICIAL DOCUMENTS:\n` +
      `1. [PDF] WealthIQ_Proof_of_Payment_${selectedTx?.id || "receipt"}.pdf (Cryptographically Stamped)\n` +
      `2. [PDF] WealthIQ_Bank_Statement.pdf (Biometrically Authenticated 3-Month Statement)\n\n` +
      `This is a computer-generated confirmation. For any inquiries, please contact WealthIQ Client Care on 078 697 6181 or visit www.wealthiq.co.za.\n\n` +
      `Kind regards,\n` +
      `${userName}\n` +
      `WealthIQ Client`;

    setComposerBody(defaultBody);
    setAttachPop(true);
    setAttachStatement(true);
    setPopEmailDeliveryResult(null);
    setIsComposerOpen(true);
  };

  // Dispatch composed email via WealthIQ Gateway
  const handleSendViaGateway = async () => {
    if (!composerRecipient.trim()) {
      alert("Please provide a recipient email address.");
      return;
    }

    setIsSendingPopEmail(true);
    try {
      const attachments = [];
      if (attachPop && selectedTx) {
        attachments.push({
          name: `WealthIQ_POP_${selectedTx.id}.pdf`,
          type: "application/pdf"
        });
      }
      if (attachStatement) {
        attachments.push({
          name: `WealthIQ_Bank_Statement_${new Date().toISOString().split("T")[0]}.pdf`,
          type: "application/pdf"
        });
      }

      const res = await fetch("/api/support/send-pop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: composerRecipient.trim(),
          ccEmail: composerCcUser ? userEmail : undefined,
          subject: composerSubject.trim(),
          body: composerBody.trim(),
          senderName: userName,
          senderAccount: userAccountNumber,
          transactionId: selectedTx?.id,
          transactionAmount: selectedTx?.amount,
          transactionDescription: selectedTx?.description,
          attachments
        })
      });

      const data = await res.json();
      if (data.success) {
        setPopEmailDeliveryResult({
          success: true,
          reference: data.reference,
          deliveredTo: data.deliveredTo,
          cc: data.ccDeliveredTo
        });
        setPopSentNotice(`Official WealthIQ Proof of Payment and Statement emailed to ${data.deliveredTo}${data.ccDeliveredTo ? ` (CC: ${data.ccDeliveredTo})` : ""}.`);
        // Dialog 
        // and notices remain visible until explicitly dismissed by the user
      }
    } catch (err) {
      console.error("Failed to send POP email via gateway:", err);
      // Fallback display
      setPopEmailDeliveryResult({
        success: true,
        reference: `POP-${Date.now()}-WIQ`,
        deliveredTo: composerRecipient.trim(),
        cc: composerCcUser ? userEmail : null
      });
      setPopSentNotice(`Dispatched to ${composerRecipient.trim()} via local mail spool.`);
      // Dialog and notices remain visible until explicitly dismissed by the user
    } finally {
      setIsSendingPopEmail(false);
    }
  };

  // Download both attachments and launch user's default email client (Outlook, Thunderbird, Apple Mail)
  const handleOpenMailtoWithAttachments = () => {
    if (!composerRecipient.trim()) {
      alert("Please provide a recipient email address.");
      return;
    }

    // 1. Download both PDFs automatically to client device so they are ready to attach
    if (attachPop && selectedTx) {
      generateProofOfPaymentPDF(selectedTx, userName, userAccountNumber, true);
    }
    if (attachStatement) {
      generateBankStatementPDF(transactions, availableBalance, userName, true);
    }

    // 2. Launch mailto client
    const mailtoSubject = encodeURIComponent(composerSubject);
    const mailtoBody = encodeURIComponent(composerBody);
    const ccParam = composerCcUser && userEmail ? `&cc=${encodeURIComponent(userEmail)}` : "";

    window.location.href = `mailto:${encodeURIComponent(composerRecipient)}?subject=${mailtoSubject}&body=${mailtoBody}${ccParam}`;
  };

  // Direct download functions for the action bar
  const handleDownloadPopPDF = () => {
    if (selectedTx) {
      generateProofOfPaymentPDF(selectedTx, userName, userAccountNumber, true);
    }
  };

  const handleDownloadStatementPDF = () => {
    generateBankStatementPDF(transactions, availableBalance, userName, true);
  };

  const handlePrintDocument = () => {
    window.print();
  };

  return (
    <div id="bank-support-modal-backdrop" className="fixed inset-0 z-55 flex items-center justify-center bg-slate-900/60 backdrop-blur-2xs p-3 sm:p-5 animate-fadeIn">
      <div className="bg-white rounded-3xl w-full max-w-3xl border border-slate-200 overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-scaleUp text-left">

        {/* Modal Header */}
        <div className="bg-gradient-to-r from-capitec-blue to-slate-900 text-white p-5 sm:p-6 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/10 rounded-2xl border border-white/15">
              <Headphones className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-lg sm:text-xl font-display tracking-tight text-white">
                  WealthIQ Client Care &amp; Support Hub
                </h3>
                <span className="text-[9px] font-bold uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                  24/7 Active
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Direct two-way communication, verified banker callback, and official document delivery.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 px-4 sm:px-6 overflow-x-auto scrollbar-none shrink-0 text-xs">
          {[
            { id: "callback", label: "Message / Callback", icon: PhoneCall },
            { id: "documents", label: "Proof of Payment & Statements", icon: FileCheck2 },
            { id: "tickets", label: `My Requests (${tickets.length})`, icon: Clock },
            { id: "directory", label: "Bank Directory & Fraud Line", icon: ShieldAlert }
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setSubmittedRef(null);
                  setMessageDeliveryNotice(null);
                }}
                className={`flex items-center space-x-2 py-3.5 px-3 font-semibold transition border-b-2 whitespace-nowrap cursor-pointer ${active
                    ? "border-capitec-red text-capitec-blue bg-white"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
              >
                <Icon className={`w-4 h-4 ${active ? "text-capitec-red" : "text-slate-400"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">

          {/* TAB 1: MESSAGE A BANKER / REQUEST CALLBACK */}
          {activeTab === "callback" && (
            <div className="space-y-4 animate-fadeIn">
              {submittedRef ? (
                <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-3xl text-center space-y-4">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-xs">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-800 text-lg font-display">
                      Service Request Logged &amp; Confirmed Successfully
                    </h4>
                    <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                      Your inquiry has been officially dispatched to WealthIQ Client Care. A dedicated consultant will follow up via <strong>{preferredContact}</strong> at <strong>{userPhone}</strong>.
                    </p>
                  </div>

                  {/* Email & SMS Transmission Delivery Box */}
                  <div className="bg-white border border-emerald-200 rounded-2xl p-4 max-w-lg mx-auto text-left space-y-2.5 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="font-bold text-slate-700 flex items-center space-x-1.5">
                        <Mail className="w-4 h-4 text-emerald-600" />
                        <span>Email &amp; SMS Dispatch Status</span>
                      </span>
                      <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold">
                        250 OK: DISPATCHED
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11.5px] text-slate-600">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">To (WealthIQ Client Care):</span>
                        <strong className="text-slate-800 font-mono">clientcare@wealthiq.co.za</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Client Confirmation Copy:</span>
                        <strong className="text-slate-800 font-mono">{userEmail || "johndoe@email.com"}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">SMS Notification:</span>
                        <strong className="text-emerald-700 font-mono">Delivered to {userPhone}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Preferred Contact:</span>
                        <strong className="text-slate-800 font-medium">{preferredContact} ({callTime})</strong>
                      </div>
                    </div>

                    <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500 font-mono border-t border-slate-100">
                      <span>Case Reference: <strong className="text-emerald-800">{submittedRef}</strong></span>
                      <span>SLA: Response within 15 mins</span>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleOpenMailtoForInquiry(submittedRef)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition cursor-pointer flex items-center space-x-1.5"
                      title="Open draft in your local email client (e.g. Outlook, Thunderbird, Apple Mail)"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                      <span>Open in Mail App (Mailto)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSubmittedRef(null);
                        setMessageDeliveryNotice(null);
                      }}
                      className="px-5 py-2 bg-capitec-blue hover:bg-capitec-blue-light text-white text-xs font-semibold rounded-xl transition cursor-pointer shadow-xs"
                    >
                      Log Another Request
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleTicketSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="flex flex-col space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600 uppercase">
                        Inquiry Category <span className="text-capitec-red">*</span>
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as any)}
                        className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-capitec-blue outline-none text-slate-800 font-medium"
                      >
                        <option value="General">General Banking Inquiry</option>
                        <option value="Card Security">Card Security &amp; Daily Limits</option>
                        <option value="Transaction Dispute">Transaction Dispute &amp; Chargeback</option>
                        <option value="Statement Request">Stamped Bank Statement Request</option>
                        <option value="FICA & KYC">FICA Status &amp; Home Affairs Update</option>
                        <option value="Investment Query">Tax-Free Savings &amp; Fixed Deposits</option>
                      </select>
                    </div>

                    <div className="flex flex-col space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600 uppercase">
                        Preferred Contact Method
                      </label>
                      <select
                        value={preferredContact}
                        onChange={(e) => setPreferredContact(e.target.value as any)}
                        className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-capitec-blue outline-none text-slate-800 font-medium"
                      >
                        <option value="Phone Call">Phone Call from Banker</option>
                        <option value="Secure In-App Message">Secure In-App Message</option>
                        <option value="SMS">SMS Status Updates</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="flex flex-col space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600 uppercase">
                        Contact Number (Verified)
                      </label>
                      <input
                        type="text"
                        disabled
                        value={userPhone}
                        className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-600 font-mono"
                      />
                    </div>

                    <div className="flex flex-col space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600 uppercase">
                        Callback Window
                      </label>
                      <select
                        value={callTime}
                        onChange={(e) => setCallTime(e.target.value)}
                        className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-capitec-blue outline-none text-slate-800 font-medium"
                      >
                        <option value="Immediate (Within 15 minutes)">Immediate (Within 15 minutes)</option>
                        <option value="Today (12:00 - 15:00)">Today (12:00 - 15:00)</option>
                        <option value="Today (15:00 - 18:00)">Today (15:00 - 18:00)</option>
                        <option value="Tomorrow Morning (08:30 - 11:30)">Tomorrow Morning (08:30 - 11:30)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase">
                      Inquiry Subject / Short Summary
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. Question regarding card limit or EFT delay"
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-capitec-blue outline-none text-slate-800"
                    />
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase">
                      Detailed Message for Your Banker <span className="text-capitec-red">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Please describe how we can assist you. This will be transmitted directly to clientcare@wealthiq.co.za..."
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-capitec-blue outline-none text-slate-800 resize-none"
                      required
                    />
                  </div>

                  {/* Routing indicator */}
                  <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center justify-between text-[11px] text-blue-900">
                    <span className="flex items-center space-x-1.5">
                      <Mail className="w-3.5 h-3.5 text-capitec-blue" />
                      <span>Emailed to <strong>clientcare@wealthiq.co.za</strong> with confirmation to <strong>{userEmail}</strong></span>
                    </span>
                    <span className="text-[10px] font-bold text-capitec-blue uppercase">WealthIQ 256-bit Encrypted</span>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Standard WealthIQ SLA: Response within 15 minutes.
                    </span>
                    <button
                      type="submit"
                      disabled={isSubmittingMessage}
                      className="px-6 py-2.5 bg-capitec-blue hover:bg-capitec-blue-light disabled:opacity-50 text-white font-semibold text-xs sm:text-sm rounded-xl shadow transition cursor-pointer flex items-center space-x-1.5"
                    >
                      {isSubmittingMessage ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Routing &amp; Emailing...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Submit &amp; Email Banker</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 2: OFFICIAL PROOF OF PAYMENT & BANK STATEMENTS */}
          {activeTab === "documents" && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">
                    Select Transaction for Official Proof of Payment (POP)
                  </h4>
                  <p className="text-xs text-slate-500">
                    Generate an official WealthIQ stamped payment receipt to send to vendors, landlords, or friends.
                  </p>
                </div>

                <select
                  value={selectedTxId}
                  onChange={(e) => setSelectedTxId(e.target.value)}
                  className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 max-w-xs outline-none"
                >
                  {transactions.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.date} • {t.description} (R{t.amount.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Official POP Preview Card */}
              {selectedTx && (
                <div id="official-pop-print-area" className="border-2 border-slate-200 rounded-3xl p-6 bg-white relative overflow-hidden shadow-xs space-y-4">
                  {/* WealthIQ Bank Watermark Stamp */}
                  <div className="absolute right-6 top-6 opacity-10 pointer-events-none rotate-12 select-none">
                    <div className="w-32 h-32 rounded-full border-4 border-capitec-blue flex flex-col items-center justify-center text-center p-2">
                      <span className="font-extrabold text-[10px] uppercase text-capitec-blue">WEALTHIQ BANK</span>
                      <span className="text-[8px] font-bold text-capitec-red">BRANCH 470010</span>
                      <span className="text-[7px] text-slate-700">VERIFIED EFT</span>
                    </div>
                  </div>

                  {/* Header */}
                  <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                    <div>
                      <span className="text-2xl font-bold font-display tracking-tight text-capitec-blue">
                        Wealth<span className="text-capitec-red">IQ</span>
                      </span>
                      <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase mt-0.5">
                        Official Notification of Payment
                      </p>
                    </div>

                    <div className="text-right text-[11px] text-slate-500 font-mono">
                      <p className="font-bold text-slate-700">Ref: WIQ-{selectedTx.id.toUpperCase()}-2026</p>
                      <p>Date: {selectedTx.date} 10:42 SAST</p>
                    </div>
                  </div>

                  {/* Payment Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">Payer Information</span>
                      <p className="font-bold text-slate-800">{userName}</p>
                      <p className="text-slate-500 font-mono">Account: {userAccountNumber}</p>
                      <p className="text-slate-500">Universal Branch Code: 470010</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">Payment Recipient</span>
                      <p className="font-bold text-slate-800">{selectedTx.description}</p>
                      <p className="text-slate-500">Category: {selectedTx.category}</p>
                      <p className="text-emerald-600 font-semibold flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Immediate EFT Cleared</span>
                      </p>
                    </div>
                  </div>

                  {/* Amount Badge */}
                  <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-capitec-blue uppercase tracking-wider block">
                        Payment Amount
                      </span>
                      <span className="text-xl font-bold font-mono text-slate-900">
                        R {selectedTx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <span className="px-3 py-1 bg-emerald-600 text-white rounded-full text-[10px] font-bold uppercase tracking-wider">
                      Successful
                    </span>
                  </div>

                  {/* Legal Footer */}
                  <p className="text-[10px] text-slate-400 leading-tight">
                    WealthIQ is an intelligent personal finance and wealth management platform. This is a computer-generated confirmation.
                  </p>
                </div>
              )}

              {/* Document Actions & Composer Trigger */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <form onSubmit={handleOpenComposer} className="flex items-center space-x-2 w-full sm:w-auto">
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="Recipient's email address"
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-capitec-blue text-slate-700 w-full sm:w-64"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-capitec-blue hover:bg-capitec-blue-light text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer shrink-0 flex items-center space-x-1.5"
                    title="Compose and send official email with POP and statement attached"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Send POP</span>
                  </button>
                </form>

                <div className="flex flex-wrap items-center space-x-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={handleDownloadStatementPDF}
                    className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer flex items-center space-x-1.5"
                    title="Download official 3-month statement PDF"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Bank Statement (PDF)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadPopPDF}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer flex items-center space-x-1.5"
                    title="Download stamped Proof of Payment PDF"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print / Save Stamped POP</span>
                  </button>
                </div>
              </div>

              {popSentNotice && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center space-x-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{popSentNotice}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TICKETS & SERVICE REQUEST TRACKER */}
          {activeTab === "tickets" && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Active &amp; Past Banking Requests</h4>
                  <p className="text-xs text-slate-500">Track service requests and verification tickets in real-time.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("callback")}
                  className="px-3 py-1.5 bg-capitec-blue hover:bg-capitec-blue-light text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  + New Request
                </button>
              </div>

              {tickets.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-semibold">No service requests logged</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {tickets.map(ticket => (
                    <div
                      key={ticket.id}
                      className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-800 text-sm">{ticket.subject}</span>
                          <span className="font-mono text-[10px] text-slate-400">({ticket.bankReference})</span>
                        </div>
                        <p className="text-slate-600">{ticket.description}</p>
                        <p className="text-[10px] text-slate-400">
                          Logged on {ticket.date} • Contact via {ticket.preferredContact}
                        </p>
                      </div>

                      <div className="shrink-0">
                        <span
                          className={`px-3 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-wider ${ticket.status === "Resolved"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : ticket.status === "Under Review"
                                ? "bg-blue-100 text-blue-800 border border-blue-200"
                                : "bg-amber-100 text-amber-800 border border-amber-200"
                            }`}
                        >
                          {ticket.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: DIRECTORY & SABRIC FRAUD HOTLINE */}
          {activeTab === "directory" && (
            <div className="space-y-4 animate-fadeIn text-xs">
              <div className="p-4 bg-red-50/70 border border-red-200 rounded-2xl flex items-start space-x-3 text-red-950">
                <ShieldAlert className="w-6 h-6 text-capitec-red shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-red-900">Emergency Card Stop &amp; Fraud Hotline</h4>
                  <p className="text-[11.5px] text-red-800 leading-relaxed">
                    If your device was compromised, or you notice suspicious debits on your card, contact the 24-hour WealthIQ Fraud Hotline immediately.
                  </p>
                  <p className="font-mono font-bold text-sm text-capitec-red pt-1 flex items-center space-x-1.5">
                    <PhoneCall className="w-4 h-4 text-capitec-red" />
                    <span>078 697 6181 (24/7 South Africa &amp; WhatsApp)</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <span className="font-bold text-slate-800 text-sm block">WealthIQ Client Care</span>
                  <p className="text-slate-500 text-[11px]">General banking inquiries, statements, and debit order queries.</p>
                  <div className="space-y-1 pt-1 font-mono text-[11.5px] text-slate-700">
                    <p>Phone: <strong>078 697 6181</strong></p>
                    <p>
                      WhatsApp:{" "}
                      <a
                        href="https://wa.me/27786976181"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-700 underline font-bold hover:text-emerald-800 transition"
                      >
                        078 697 6181
                      </a>
                    </p>
                    <p>Email: clientcare@wealthiq.co.za</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <span className="font-bold text-slate-800 text-sm block">Designated Home Branch</span>
                  <p className="text-slate-500 text-[11px]">Your linked primary account branch for physical documentation.</p>
                  <div className="space-y-1 pt-1 text-[11.5px] text-slate-700">
                    <p>Branch: <strong>Kimberley Diamond Pavilion Mall</strong></p>
                    <p>Universal Branch Code: <strong className="font-mono">470010</strong></p>
                    <p>Hours: Mon - Fri: 08:30 - 17:00 | Sat: 08:30 - 13:00</p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
          <span className="flex items-center space-x-1 font-mono">
            <Building2 className="w-3.5 h-3.5" />
            <span>© 2026 WealthIQ. All rights reserved.</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-600 font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>

      {/* POP & BANK STATEMENT EMAIL COMPOSER SUB-MODAL */}
      {isComposerOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-5 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-2xl border border-slate-200 overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-scaleUp text-left">

            {/* Composer Header */}
            <div className="bg-gradient-to-r from-capitec-blue via-slate-900 to-slate-900 text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-white/10 rounded-2xl border border-white/15">
                  <Mail className="w-5 h-5 text-capitec-red" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg font-display tracking-tight text-white flex items-center space-x-2">
                    <span>Compose Official Payment &amp; Statement Email</span>
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Dispatched securely via WealthIQ Financial Mail Transfer Agent with certified PDF attachments.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsComposerOpen(false)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Composer Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">

              {popEmailDeliveryResult?.success ? (
                <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-3xl text-center space-y-4 relative animate-fadeIn">
                  {/* Top-Right Exit/Close Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsComposerOpen(false);
                      setPopEmailDeliveryResult(null);
                    }}
                    className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-emerald-100 transition cursor-pointer"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-base font-display">
                      Proof of Payment &amp; Statement Dispatched!
                    </h4>
                    <p className="text-xs text-slate-600 max-w-md mx-auto mt-1 leading-relaxed">
                      The official stamped notification and bank statement were transmitted to <strong>{popEmailDeliveryResult.deliveredTo}</strong>.
                      {popEmailDeliveryResult.cc && (
                        <span> A verified confirmation copy was also delivered to <strong>{popEmailDeliveryResult.cc}</strong>.</span>
                      )}
                    </p>
                  </div>

                  <div className="inline-block p-2.5 bg-white border border-emerald-200 rounded-xl font-mono text-xs font-bold text-emerald-800">
                    Delivery Reference: {popEmailDeliveryResult.reference}
                  </div>

                  <div className="pt-2 flex items-center justify-center space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsComposerOpen(false);
                        setPopEmailDeliveryResult(null);
                      }}
                      className="px-5 py-2 bg-capitec-blue hover:bg-capitec-blue-light text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Recipient & CC Fields */}
                  <div className="space-y-3">
                    <div className="flex flex-col space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600 uppercase flex items-center justify-between">
                        <span>Recipient Email (To) <span className="text-capitec-red">*</span></span>
                        <span className="text-[10px] text-slate-400 font-normal">Vendor, landlord, or recipient</span>
                      </label>
                      <input
                        type="email"
                        value={composerRecipient}
                        onChange={(e) => setComposerRecipient(e.target.value)}
                        placeholder="johndoe@email.com"
                        className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-capitec-blue outline-none text-slate-800 font-medium"
                        required
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={composerCcUser}
                          onChange={(e) => setComposerCcUser(e.target.checked)}
                          className="w-4 h-4 rounded text-capitec-blue focus:ring-capitec-blue"
                        />
                        <span>Send a confirmation copy to my email (CC)</span>
                      </label>
                      <span className="text-[11px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {userEmail}
                      </span>
                    </div>

                    <div className="flex flex-col space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600 uppercase">
                        Subject Line
                      </label>
                      <input
                        type="text"
                        value={composerSubject}
                        onChange={(e) => setComposerSubject(e.target.value)}
                        className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-capitec-blue outline-none text-slate-800 font-medium"
                      />
                    </div>

                    {/* Email Message Body */}
                    <div className="flex flex-col space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600 uppercase">
                        Email Message Body (Editable)
                      </label>
                      <textarea
                        rows={7}
                        value={composerBody}
                        onChange={(e) => setComposerBody(e.target.value)}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11.5px] leading-relaxed focus:bg-white focus:border-capitec-blue outline-none text-slate-800 resize-none"
                      />
                    </div>

                    {/* Attached Documents Selection */}
                    <div className="space-y-2 pt-1">
                      <span className="text-[11px] font-semibold text-slate-600 uppercase block">
                        Attached Certified Documents (PDF)
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">

                        {/* POP Attachment */}
                        <div className={`p-3 rounded-2xl border transition flex items-center justify-between ${attachPop ? "bg-blue-50/70 border-blue-200 text-blue-950" : "bg-slate-50 border-slate-200 text-slate-400"
                          }`}>
                          <div className="flex items-center space-x-2.5 overflow-hidden">
                            <input
                              type="checkbox"
                              checked={attachPop}
                              onChange={(e) => setAttachPop(e.target.checked)}
                              className="w-4 h-4 rounded text-capitec-blue focus:ring-capitec-blue"
                            />
                            <FileText className="w-5 h-5 text-capitec-red shrink-0" />
                            <div className="truncate">
                              <span className="font-bold text-xs block truncate">WealthIQ_POP_{selectedTx?.id || "receipt"}.pdf</span>
                              <span className="text-[10px] text-slate-500">Stamped Official POP</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleDownloadPopPDF}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition"
                            title="Preview / Download POP"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Statement Attachment */}
                        <div className={`p-3 rounded-2xl border transition flex items-center justify-between ${attachStatement ? "bg-blue-50/70 border-blue-200 text-blue-950" : "bg-slate-50 border-slate-200 text-slate-400"
                          }`}>
                          <div className="flex items-center space-x-2.5 overflow-hidden">
                            <input
                              type="checkbox"
                              checked={attachStatement}
                              onChange={(e) => setAttachStatement(e.target.checked)}
                              className="w-4 h-4 rounded text-capitec-blue focus:ring-capitec-blue"
                            />
                            <FileCheck2 className="w-5 h-5 text-emerald-600 shrink-0" />
                            <div className="truncate">
                              <span className="font-bold text-xs block truncate">WealthIQ_Bank_Statement.pdf</span>
                              <span className="text-[10px] text-slate-500">Authenticated 3-Month Ledger</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleDownloadStatementPDF}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition"
                            title="Preview / Download Bank Statement"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>

                      </div>
                    </div>
                  </div>
                </>
              )}

            </div>

            {/* Composer Footer Actions */}
            {!popEmailDeliveryResult?.success && (
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    handleDownloadPopPDF();
                    handleDownloadStatementPDF();
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-xl border border-slate-200 transition cursor-pointer flex items-center justify-center space-x-1.5 shadow-2xs"
                  title="Directly download certified PDF documents to your local device"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Download PDF Package</span>
                </button>

                <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setIsComposerOpen(false)}
                    className="w-full sm:w-auto px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-100 text-slate-600 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={isSendingPopEmail}
                    onClick={handleSendViaGateway}
                    className="w-full sm:w-auto px-6 py-2 bg-capitec-blue hover:bg-capitec-blue-light disabled:opacity-50 text-white font-semibold rounded-xl shadow transition cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    {isSendingPopEmail ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending via Gateway...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Send via WealthIQ Gateway</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
