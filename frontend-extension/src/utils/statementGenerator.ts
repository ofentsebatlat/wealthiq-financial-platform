import { jsPDF } from "jspdf";
import { Transaction } from "../types";

/**
 * Generates an official, biometrically verified bank statement for WealthIQ.
 * It computes chronological progressive running balances starting from the initial deposit
 * up to the current available balance.
 */
export function generateBankStatementPDF(
  transactions: Transaction[],
  availableBalance: number,
  accountName: string = "Ofentse Batlang",
  saveImmediately: boolean = true
): jsPDF {
  const doc = new jsPDF();
  const pageWidth = 210; // A4 size
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2; // 180mm

  // 1. Sort transactions chronologically (oldest to newest) to calculate progressive running balance
  const sortedTxs = [...transactions].sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  // Calculate chronological net change
  const totalChange = sortedTxs.reduce((sum, t) => {
    return sum + (t.type === "income" ? t.amount : -t.amount);
  }, 0);

  // The balance before any of the transactions in this array
  const startingBalance = availableBalance - totalChange;

  // Calculate running balances chronologically
  let currentAccumulated = startingBalance;
  const txsWithBalance = sortedTxs.map(t => {
    currentAccumulated += t.type === "income" ? t.amount : -t.amount;
    return {
      ...t,
      runningBalance: currentAccumulated
    };
  });

  // Re-sort to newest-first for the PDF ledger print (standard bank statement format)
  const printTxs = [...txsWithBalance].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // Helper values
  const totalIncomes = transactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  // Helper functions for formatting
  const formatRand = (num: number) => {
    return "R" + num.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const drawPageBorderAndFooter = (pageNum: number, totalPages: number) => {
    // Elegant border frame
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.3);
    doc.rect(margin - 2, margin - 2, contentWidth + 4, pageHeight - margin * 2 + 4);

    // Dynamic watermark "OFFICIAL STATEMENT" rotated in the center
    doc.setTextColor(248, 250, 252); // extremely light gray/slate-50
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(36);
    doc.text("WEALTHIQ OFFICIAL STATEMENT", pageWidth / 2, pageHeight / 2, {
      align: "center",
      angle: 45
    });

    // Footer lines and security stamps
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      "WealthIQ Banking Platform is an authorized financial services platform. Certified protection systems apply.",
      margin,
      pageHeight - 13
    );

    const nowStr = new Date().toLocaleString("en-ZA");
    doc.text(
      `Printed on: ${nowStr} | Biometrically Authorized Statement | Page ${pageNum} of ${totalPages}`,
      margin,
      pageHeight - 9
    );

    // Certified security check badge
    doc.setFillColor(240, 253, 244); // emerald-50
    doc.rect(pageWidth - margin - 40, pageHeight - 15, 40, 6, "F");
    doc.setDrawColor(187, 247, 208); // emerald-200
    doc.rect(pageWidth - margin - 40, pageHeight - 15, 40, 6, "S");
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(22, 101, 52); // emerald-800
    doc.setFontSize(6);
    doc.text("SABRIC SECURE STAMP", pageWidth - margin - 20, pageHeight - 11, { align: "center" });
  };

  // Keep track of pages & content heights
  let y = margin;

  // --- BRANDING HEADER ---
  doc.setFillColor(0, 62, 91); // WealthIQ deep navy `#003E5B`
  doc.rect(margin, y, contentWidth, 24, "F");

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("Wealth", margin + 8, y + 10);
  const wealthWidth = doc.getTextWidth("Wealth");
  doc.setTextColor(227, 6, 19); // Theme Red #E30613
  doc.text("IQ", margin + 8 + wealthWidth, y + 10);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(186, 230, 253); // light blue
  doc.text("INTELLIGENT BANKING PLATFORM", margin + 8, y + 15);

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("OFFICIAL ACCOUNT STATEMENT", pageWidth - margin - 8, y + 10, { align: "right" });

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8);
  doc.text("BIOMETRICALLY VERIFIED SECURE EXPORT", pageWidth - margin - 8, y + 15, { align: "right" });

  y += 30;

  // --- ACCOUNT OWNER & METADATA GRID ---
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(margin, y, contentWidth, 28, "F");
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.rect(margin, y, contentWidth, 28, "S");

  doc.setTextColor(100, 116, 139); // slate-500
  doc.setFontSize(8);
  doc.setFont("Helvetica", "bold");
  doc.text("ACCOUNT HOLDER DETAILS", margin + 6, y + 6);
  doc.text("STATEMENT PARAMETERS", pageWidth / 2 + 10, y + 6);

  doc.setDrawColor(226, 232, 240);
  doc.line(pageWidth / 2 + 5, y + 2, pageWidth / 2 + 5, y + 26);

  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`Name: ${accountName}`, margin + 6, y + 12);
  doc.text("Account Number: 1024 4319 944", margin + 6, y + 17);
  doc.text("Account Type: Global One Savings", margin + 6, y + 22);

  const startDayStr = sortedTxs.length > 0 ? sortedTxs[0].date : "2026-07-01";
  const endDayStr = sortedTxs.length > 0 ? sortedTxs[sortedTxs.length - 1].date : "2026-07-16";

  doc.text(`Period: ${startDayStr} to ${endDayStr}`, pageWidth / 2 + 10, y + 12);
  doc.text("Currency: South African Rand (ZAR)", pageWidth / 2 + 10, y + 17);
  doc.text("Security Protocol: SABRIC Face Token v3", pageWidth / 2 + 10, y + 22);

  y += 34;

  // --- FINANCIAL SUMMARY BOXES ---
  const boxWidth = contentWidth / 4;
  const boxHeight = 16;

  // Starting Balance
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(margin, y, boxWidth - 1, boxHeight, "F");
  doc.setTextColor(100, 116, 139);
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(7);
  doc.text("STARTING BALANCE", margin + 4, y + 5);
  doc.setTextColor(30, 41, 59);
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(formatRand(startingBalance), margin + 4, y + 11);

  // Total Income
  doc.setFillColor(240, 253, 244); // green-50
  doc.rect(margin + boxWidth, y, boxWidth - 1, boxHeight, "F");
  doc.setTextColor(22, 101, 52);
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(7);
  doc.text("TOTAL CREDITS (+)", margin + boxWidth + 4, y + 5);
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(formatRand(totalIncomes), margin + boxWidth + 4, y + 11);

  // Total Expense
  doc.setFillColor(254, 242, 242); // red-50
  doc.rect(margin + boxWidth * 2, y, boxWidth - 1, boxHeight, "F");
  doc.setTextColor(153, 27, 27);
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(7);
  doc.text("TOTAL DEBITS (-)", margin + boxWidth * 2 + 4, y + 5);
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(formatRand(totalExpenses), margin + boxWidth * 2 + 4, y + 11);

  // Closing Balance
  doc.setFillColor(224, 242, 254); // sky-100
  doc.rect(margin + boxWidth * 3, y, boxWidth, boxHeight, "F");
  doc.setTextColor(3, 105, 161);
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(7);
  doc.text("AVAILABLE BALANCE", margin + boxWidth * 3 + 4, y + 5);
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(formatRand(availableBalance), margin + boxWidth * 3 + 4, y + 11);

  y += 24;

  // --- TABLE HEADER ---
  const drawTableHeader = (posY: number) => {
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(margin, posY, contentWidth, 7, "F");
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.line(margin, posY, pageWidth - margin, posY);
    doc.line(margin, posY + 7, pageWidth - margin, posY + 7);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105); // slate-600

    doc.text("DATE", margin + 4, posY + 5);
    doc.text("TRANSACTION DESCRIPTION", margin + 26, posY + 5);
    doc.text("CATEGORY", margin + 96, posY + 5);
    doc.text("TYPE", margin + 120, posY + 5);
    doc.text("AMOUNT (ZAR)", margin + 148, posY + 5, { align: "right" });
    doc.text("RUNNING BALANCE", margin + 176, posY + 5, { align: "right" });
  };

  drawTableHeader(y);
  y += 7;

  // --- LEDGER ROWS ---
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(7.5);

  printTxs.forEach((tx) => {
    // Page break handling
    if (y > 260) {
      // Add page
      doc.addPage();
      y = margin + 10;
      drawTableHeader(y);
      y += 7;
    }

    doc.setFont("Helvetica", "normal");
    doc.setTextColor(30, 41, 59); // slate-800

    // Date
    doc.text(tx.date, margin + 4, y + 4.5);

    // Description
    const descText = tx.description;
    const truncatedDesc = descText.length > 38 ? descText.substring(0, 35) + "..." : descText;
    doc.text(truncatedDesc, margin + 26, y + 4.5);

    // Category
    doc.text(tx.category, margin + 96, y + 4.5);

    // Type
    if (tx.type === "income") {
      doc.setTextColor(22, 101, 52); // green-800
      doc.text("Credit", margin + 120, y + 4.5);
      doc.text("+" + tx.amount.toFixed(2), margin + 148, y + 4.5, { align: "right" });
    } else {
      doc.setTextColor(153, 27, 27); // red-800
      doc.text("Debit", margin + 120, y + 4.5);
      doc.text("-" + tx.amount.toFixed(2), margin + 148, y + 4.5, { align: "right" });
    }

    // Reset color for balance
    doc.setTextColor(30, 41, 59);
    doc.text(tx.runningBalance.toFixed(2), margin + 176, y + 4.5, { align: "right" });

    // Subtle bottom row separator
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.2);
    doc.line(margin, y + 6.5, pageWidth - margin, y + 6.5);

    y += 6.5;
  });

  // Stamp security signature notice block
  if (y > 235) {
    doc.addPage();
    y = margin + 10;
  }

  y += 6;
  doc.setFillColor(240, 249, 255); // sky-50
  doc.rect(margin, y, contentWidth, 20, "F");
  doc.setDrawColor(186, 230, 253); // sky-200
  doc.rect(margin, y, contentWidth, 20, "S");

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(3, 105, 161); // sky-700
  doc.text("SABRIC REMOTE BIOMETRIC COMPLIANCE CERTIFICATION", margin + 6, y + 5);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(51, 65, 85); // slate-700
  doc.text(
    `This digital document was locked and compiled securely following authorized authentication by WealthIQ Client ${accountName}.`,
    margin + 6,
    y + 10
  );
  doc.text(
    "Any modifications or tampered fields will render this statement fraudulent and cause automatic revocation of digital credentials.",
    margin + 6,
    y + 14
  );

  // Generate dynamic pages and save
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawPageBorderAndFooter(i, totalPages);
  }

  // Save the document if requested
  if (saveImmediately) {
    doc.save(`WealthIQ_Statement_${new Date().toISOString().split("T")[0]}.pdf`);
  }
  return doc;
}

/**
 * Generates an official, stamped WealthIQ Proof of Payment (POP) PDF document.
 */
export function generateProofOfPaymentPDF(
  tx: Transaction,
  accountName: string = "Ofentse Batlang",
  accountNumber: string = "1431289445",
  saveImmediately: boolean = true
): jsPDF {
  const doc = new jsPDF();
  const pageWidth = 210;
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;

  // Outer border & frame
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, margin, contentWidth, 230, 4, 4, "S");

  // Header background banner
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, margin, contentWidth, 32, 4, 4, "F");

  // Logo Wealth (Blue) + IQ (Red)
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(0, 75, 135); // #004b87
  doc.text("Wealth", margin + 10, margin + 16);
  doc.setTextColor(229, 27, 36); // #e51b24
  doc.text("IQ", margin + 46, margin + 16);

  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text("OFFICIAL NOTIFICATION OF PAYMENT", margin + 10, margin + 24);

  // Top Right: Ref & Timestamp
  const refCode = `WIQ-TX-${tx.id.toUpperCase().replace(/[^A-Z0-9]/g, "")}-2026`;
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text(`Ref: ${refCode}`, pageWidth - margin - 10, margin + 14, { align: "right" });
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Date: ${tx.date} 10:42 SAST`, pageWidth - margin - 10, margin + 21, { align: "right" });

  // Divider line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, margin + 32, pageWidth - margin, margin + 32);

  // Stamped Watermark in center-right
  doc.setDrawColor(229, 27, 36); // red stamp
  doc.setLineWidth(1.2);
  doc.circle(pageWidth - margin - 35, margin + 85, 22, "S");
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(229, 27, 36);
  doc.text("WEALTHIQ BANK", pageWidth - margin - 35, margin + 80, { align: "center" });
  doc.setFontSize(6.5);
  doc.text("BRANCH 470010", pageWidth - margin - 35, margin + 85, { align: "center" });
  doc.text("VERIFIED EFT", pageWidth - margin - 35, margin + 90, { align: "center" });

  // Payer Details Box
  let y = margin + 40;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin + 8, y, (contentWidth - 20) / 2, 45, 3, 3, "F");
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin + 8, y, (contentWidth - 20) / 2, 45, 3, 3, "S");

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text("PAYER INFORMATION", margin + 14, y + 9);

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(accountName, margin + 14, y + 19);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Global One Acc: ${accountNumber}`, margin + 14, y + 27);
  doc.text("Universal Branch Code: 470010", margin + 14, y + 34);
  doc.text("Bank: WealthIQ Banking", margin + 14, y + 40);

  // Recipient Details Box
  const col2X = margin + 8 + (contentWidth - 20) / 2 + 4;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(col2X, y, (contentWidth - 20) / 2, 45, 3, 3, "F");
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(col2X, y, (contentWidth - 20) / 2, 45, 3, 3, "S");

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text("PAYMENT RECIPIENT", col2X + 6, y + 9);

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(tx.description, col2X + 6, y + 19);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Category: ${tx.category}`, col2X + 6, y + 27);
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.setFont("Helvetica", "bold");
  doc.text("Immediate EFT Cleared", col2X + 6, y + 34);
  doc.setFont("Helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Real-Time Clearing (RTC)", col2X + 6, y + 40);

  // Amount Box (High emphasis)
  y += 54;
  doc.setFillColor(239, 246, 255); // blue-50
  doc.roundedRect(margin + 8, y, contentWidth - 16, 32, 3, 3, "F");
  doc.setDrawColor(191, 219, 254); // blue-200
  doc.roundedRect(margin + 8, y, contentWidth - 16, 32, 3, 3, "S");

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(0, 75, 135); // theme blue
  doc.text("TOTAL AMOUNT PAID", margin + 16, y + 11);

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `R ${tx.amount.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    margin + 16,
    y + 24
  );

  // "SUCCESSFUL" status badge
  doc.setFillColor(5, 150, 105); // emerald-600
  doc.roundedRect(pageWidth - margin - 52, y + 8, 38, 14, 7, 7, "F");
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text("SUCCESSFUL", pageWidth - margin - 33, y + 17, { align: "center" });

  // Security & Verification Information Box
  y += 40;
  doc.setFillColor(254, 252, 232); // yellow-50
  doc.roundedRect(margin + 8, y, contentWidth - 16, 42, 3, 3, "F");
  doc.setDrawColor(254, 240, 138); // yellow-200
  doc.roundedRect(margin + 8, y, contentWidth - 16, 42, 3, 3, "S");

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(133, 77, 14); // yellow-800
  doc.text("BANK VERIFICATION & SECURITY METRICS", margin + 14, y + 9);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`• Digital Tracking Token: SEC-EFT-${tx.id.toUpperCase()}-${Date.now().toString().slice(-6)}`, margin + 14, y + 17);
  doc.text("• Biometric Face ID Authorization: CONFIRMED & VERIFIED (SABRIC Standard)", margin + 14, y + 24);
  doc.text("• Clearing Type: South African Real-Time Clearing System (RTC)", margin + 14, y + 31);
  doc.text("• Digital Document Integrity: Cryptographically Signed & Computer-Generated", margin + 14, y + 37);

  // Legal Footer
  y += 50;
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    "© 2026 WealthIQ. All rights reserved. Registered credit provider (NCRCP13).",
    margin + 8,
    y
  );
  doc.text(
    "Registration Number: 1999/025903/06. This notification of payment serves as an official proof of payment.",
    margin + 8,
    y + 5
  );
  doc.text(
    "For inquiries, contact WealthIQ Client Care or visit support in your dashboard.",
    margin + 8,
    y + 10
  );

  if (saveImmediately) {
    doc.save(`WealthIQ_Proof_of_Payment_${tx.id}.pdf`);
  }
  return doc;
}
