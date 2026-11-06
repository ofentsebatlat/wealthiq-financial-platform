import { Transaction } from "../types";

export const SIMULATED_TRANSACTIONS: Transaction[] = [
  // =========================================================================
  // MAY 2026 (Total Inflow: R45,000.00 | Total Outflow: R39,944.98 | Net: +R5,055.02)
  // Highlights: Family assistance (sister university money), Mother's Day lunch & garden DIY
  // =========================================================================
  { id: "tx-2026-05-01", date: "2026-05-01", description: "Vodacom Fibre Home Internet (100Mbps uncapped)", category: "Utilities", type: "expense", amount: 899.00 },
  { id: "tx-2026-05-02", date: "2026-05-02", description: "YouTube Premium Individual Subscription", category: "Entertainment", type: "expense", amount: 71.99 },
  { id: "tx-2026-05-03", date: "2026-05-03", description: "Eskom Prepaid Electricity Token", category: "Utilities", type: "expense", amount: 1950.00 },
  { id: "tx-2026-05-05", date: "2026-05-05", description: "Checkers Hyper (Weekly Groceries & Fresh Produce)", category: "Food", type: "expense", amount: 1420.50 },
  { id: "tx-2026-05-08", date: "2026-05-08", description: "Engen 1-Stop (Fuel / Petrol Fill-Up)", category: "Transport", type: "expense", amount: 1250.00 },
  { id: "tx-2026-05-10", date: "2026-05-10", description: "NetFlorist & Woolworths (Mother's Day Gift Hamper & Flowers)", category: "Shopping", type: "expense", amount: 950.00 },
  { id: "tx-2026-05-11", date: "2026-05-11", description: "Woolworths Food (Mid-Week Essentials)", category: "Food", type: "expense", amount: 480.00 },
  { id: "tx-2026-05-14", date: "2026-05-14", description: "Uber South Africa (Commute / Transit)", category: "Transport", type: "expense", amount: 240.00 },
  { id: "tx-2026-05-15", date: "2026-05-15", description: "Builders Warehouse (Patio Pots & Garden Maintenance)", category: "Shopping", type: "expense", amount: 620.00 },
  { id: "tx-2026-05-16", date: "2026-05-16", description: "Checkers Hyper (Weekly Pantry Stock-Up)", category: "Food", type: "expense", amount: 1380.00 },
  { id: "tx-2026-05-19", date: "2026-05-19", description: "Shell Select (Fuel / Petrol Fill-Up)", category: "Transport", type: "expense", amount: 1150.00 },
  { id: "tx-2026-05-21", date: "2026-05-21", description: "Vida e Caffe & Midweek Dining", category: "Food", type: "expense", amount: 385.00 },
  { id: "tx-2026-05-23", date: "2026-05-23", description: "Dis-Chem Pharmacy (Household & Health Sundries)", category: "Health", type: "expense", amount: 450.00 },
  { id: "tx-2026-05-25", date: "2026-05-25", description: "Monthly Net Salary (Primary Employer Direct Deposit)", category: "Income", type: "income", amount: 45000.00 },
  { id: "tx-2026-05-26-1", date: "2026-05-26", description: "WesBank Vehicle Finance (Monthly Car Installment)", category: "Other", type: "expense", amount: 6850.00 },
  { id: "tx-2026-05-26-2", date: "2026-05-26", description: "Child Support Maintenance (Scheduled Court EFT)", category: "Other", type: "expense", amount: 5500.00 },
  { id: "tx-2026-05-26-3", date: "2026-05-26", description: "WealthIQ Core ETF Portfolio (18% Monthly Allocation)", category: "Investment", type: "expense", amount: 8100.00 },
  { id: "tx-2026-05-27-1", date: "2026-05-27", description: "Immediate Payment / WealthIQ Pay (Sister University Books & Allowance)", category: "Other", type: "expense", amount: 3500.00 },
  { id: "tx-2026-05-27-2", date: "2026-05-27", description: "Woolworths Food (Monthly Household Stock-up)", category: "Food", type: "expense", amount: 1850.00 },
  { id: "tx-2026-05-28", date: "2026-05-28", description: "Netflix Standard Subscription (HD Multi-Screen)", category: "Entertainment", type: "expense", amount: 159.00 },
  { id: "tx-2026-05-29", date: "2026-05-29", description: "Spotify Individual Music Streaming", category: "Entertainment", type: "expense", amount: 69.99 },
  { id: "tx-2026-05-30", date: "2026-05-30", description: "Sasol Convenience (Fuel / Petrol Fill-Up)", category: "Transport", type: "expense", amount: 1200.00 },
  { id: "tx-2026-05-31", date: "2026-05-31", description: "Family Weekend Dining & Entertainment", category: "Food", type: "expense", amount: 789.50 },

  // =========================================================================
  // JUNE 2026 (Total Inflow: R45,000.00 | Total Outflow: R34,429.98 | Net: +R10,570.02)
  // Highlights: Lean, disciplined winter recovery month; oil heater purchase & Father's Day
  // =========================================================================
  { id: "tx-2026-06-01", date: "2026-06-01", description: "Vodacom Fibre Home Internet (100Mbps uncapped)", category: "Utilities", type: "expense", amount: 899.00 },
  { id: "tx-2026-06-02", date: "2026-06-02", description: "YouTube Premium Individual Subscription", category: "Entertainment", type: "expense", amount: 71.99 },
  { id: "tx-2026-06-03", date: "2026-06-03", description: "Eskom Prepaid Electricity Token", category: "Utilities", type: "expense", amount: 2150.00 },
  { id: "tx-2026-06-05", date: "2026-06-05", description: "Checkers Hyper (Weekly Groceries & Fresh Produce)", category: "Food", type: "expense", amount: 1410.00 },
  { id: "tx-2026-06-07", date: "2026-06-07", description: "Builders Warehouse (Winter Oil Heater & Seal Insulation)", category: "Utilities", type: "expense", amount: 1380.00 },
  { id: "tx-2026-06-08", date: "2026-06-08", description: "Engen 1-Stop (Fuel / Petrol Fill-Up)", category: "Transport", type: "expense", amount: 1220.00 },
  { id: "tx-2026-06-11", date: "2026-06-11", description: "Woolworths Food (Mid-Week Essentials)", category: "Food", type: "expense", amount: 460.00 },
  { id: "tx-2026-06-14", date: "2026-06-14", description: "Cape Union Mart (Father's Day Outdoor Fleece Gift)", category: "Shopping", type: "expense", amount: 850.00 },
  { id: "tx-2026-06-16", date: "2026-06-16", description: "Checkers Hyper (Weekly Pantry Stock-Up)", category: "Food", type: "expense", amount: 1350.00 },
  { id: "tx-2026-06-19", date: "2026-06-19", description: "Shell Select (Fuel / Petrol Fill-Up)", category: "Transport", type: "expense", amount: 1140.00 },
  { id: "tx-2026-06-21", date: "2026-06-21", description: "Vida e Caffe & Midweek Dining", category: "Food", type: "expense", amount: 320.00 },
  { id: "tx-2026-06-23", date: "2026-06-23", description: "Dis-Chem Pharmacy (Household & Health Sundries)", category: "Health", type: "expense", amount: 360.00 },
  { id: "tx-2026-06-25", date: "2026-06-25", description: "Monthly Net Salary (Primary Employer Direct Deposit)", category: "Income", type: "income", amount: 45000.00 },
  { id: "tx-2026-06-26-1", date: "2026-06-26", description: "WesBank Vehicle Finance (Monthly Car Installment)", category: "Other", type: "expense", amount: 6850.00 },
  { id: "tx-2026-06-26-2", date: "2026-06-26", description: "Child Support Maintenance (Scheduled Court EFT)", category: "Other", type: "expense", amount: 5500.00 },
  { id: "tx-2026-06-26-3", date: "2026-06-26", description: "WealthIQ Core ETF Portfolio (18% Monthly Allocation)", category: "Investment", type: "expense", amount: 8100.00 },
  { id: "tx-2026-06-27", date: "2026-06-27", description: "Woolworths Food (Monthly Household Stock-up)", category: "Food", type: "expense", amount: 1680.00 },
  { id: "tx-2026-06-28", date: "2026-06-28", description: "Netflix Standard Subscription (HD Multi-Screen)", category: "Entertainment", type: "expense", amount: 159.00 },
  { id: "tx-2026-06-29", date: "2026-06-29", description: "Spotify Individual Music Streaming", category: "Entertainment", type: "expense", amount: 69.99 },
  { id: "tx-2026-06-30", date: "2026-06-30", description: "Sasol Convenience (Fuel / Petrol Fill-Up)", category: "Transport", type: "expense", amount: 1150.00 },

  // =========================================================================
  // JULY 2026 (Total Inflow: R45,000.00 | Total Outflow: R42,889.98 | Net: +R2,110.02)
  // Highlights: High-expense winter spike! Car major service, peak electricity & winter coat
  // =========================================================================
  { id: "tx-2026-07-01", date: "2026-07-01", description: "Vodacom Fibre Home Internet (100Mbps uncapped)", category: "Utilities", type: "expense", amount: 899.00 },
  { id: "tx-2026-07-02", date: "2026-07-02", description: "YouTube Premium Individual Subscription", category: "Entertainment", type: "expense", amount: 71.99 },
  { id: "tx-2026-07-03", date: "2026-07-03", description: "Eskom Prepaid Electricity Token (Winter High-Demand Tariff)", category: "Utilities", type: "expense", amount: 2850.00 },
  { id: "tx-2026-07-05", date: "2026-07-05", description: "Checkers Hyper (Weekly Groceries & Winter Soups)", category: "Food", type: "expense", amount: 1520.00 },
  { id: "tx-2026-07-08", date: "2026-07-08", description: "Engen 1-Stop (Fuel / Petrol Fill-Up)", category: "Transport", type: "expense", amount: 1280.00 },
  { id: "tx-2026-07-11", date: "2026-07-11", description: "Woolworths Food (Mid-Week Essentials)", category: "Food", type: "expense", amount: 510.00 },
  { id: "tx-2026-07-14", date: "2026-07-14", description: "Uber South Africa (Commute / Transit in Rain)", category: "Transport", type: "expense", amount: 280.00 },
  { id: "tx-2026-07-15", date: "2026-07-15", description: "Tiger Wheel & Tyre / VW Authorized (Annual Major Car Service & Front Brake Pads)", category: "Transport", type: "expense", amount: 5450.00 },
  { id: "tx-2026-07-17", date: "2026-07-17", description: "Checkers Hyper (Weekly Pantry Stock-Up)", category: "Food", type: "expense", amount: 1420.00 },
  { id: "tx-2026-07-18", date: "2026-07-18", description: "Zara / Woolworths (Winter Thermal Coat & Heavy Boots)", category: "Shopping", type: "expense", amount: 2100.00 },
  { id: "tx-2026-07-20", date: "2026-07-20", description: "Shell Select (Fuel / Petrol Fill-Up)", category: "Transport", type: "expense", amount: 1220.00 },
  { id: "tx-2026-07-22", date: "2026-07-22", description: "Clicks Pharmacy (Winter Flu Vaccine & Cold Medication)", category: "Health", type: "expense", amount: 540.00 },
  { id: "tx-2026-07-23", date: "2026-07-23", description: "Vida e Caffe Hot Beverages & Lunch", category: "Food", type: "expense", amount: 390.00 },
  { id: "tx-2026-07-25", date: "2026-07-25", description: "Monthly Net Salary (Primary Employer Direct Deposit)", category: "Income", type: "income", amount: 45000.00 },
  { id: "tx-2026-07-26-1", date: "2026-07-26", description: "WesBank Vehicle Finance (Monthly Car Installment)", category: "Other", type: "expense", amount: 6850.00 },
  { id: "tx-2026-07-26-2", date: "2026-07-26", description: "Child Support Maintenance (Scheduled Court EFT)", category: "Other", type: "expense", amount: 5500.00 },
  { id: "tx-2026-07-26-3", date: "2026-07-26", description: "WealthIQ Core ETF Portfolio (18% Monthly Allocation)", category: "Investment", type: "expense", amount: 8100.00 },
  { id: "tx-2026-07-27", date: "2026-07-27", description: "Woolworths Food (Monthly Household Stock-up)", category: "Food", type: "expense", amount: 1750.00 },
  { id: "tx-2026-07-28", date: "2026-07-28", description: "Netflix Standard Subscription (HD Multi-Screen)", category: "Entertainment", type: "expense", amount: 159.00 },
  { id: "tx-2026-07-29", date: "2026-07-29", description: "Spotify Individual Music Streaming", category: "Entertainment", type: "expense", amount: 69.99 },
  { id: "tx-2026-07-30", date: "2026-07-30", description: "Sasol Convenience (Fuel / Petrol Fill-Up)", category: "Transport", type: "expense", amount: 1240.00 },
  { id: "tx-2026-07-31", date: "2026-07-31", description: "Winter Comfort Takeaway Dinner", category: "Food", type: "expense", amount: 460.00 },

  // =========================================================================
  // AUGUST 2026 (Total Inflow: R45,000.00 | Total Outflow: R37,189.98 | Net: +R7,810.02)
  // Highlights: Women's Day Drakensberg weekend getaway road trip, SANRAL tolls & outdoor hikes
  // =========================================================================
  { id: "tx-2026-08-01", date: "2026-08-01", description: "Vodacom Fibre Home Internet (100Mbps uncapped)", category: "Utilities", type: "expense", amount: 899.00 },
  { id: "tx-2026-08-02", date: "2026-08-02", description: "YouTube Premium Individual Subscription", category: "Entertainment", type: "expense", amount: 71.99 },
  { id: "tx-2026-08-03", date: "2026-08-03", description: "Eskom Prepaid Electricity Token", category: "Utilities", type: "expense", amount: 2050.00 },
  { id: "tx-2026-08-05", date: "2026-08-05", description: "Checkers Hyper (Weekly Groceries & Road Trip Snacks)", category: "Food", type: "expense", amount: 1390.00 },
  { id: "tx-2026-08-07", date: "2026-08-07", description: "Airbnb South Africa (Drakensberg Mountain Chalet 3-Night Stay)", category: "Entertainment", type: "expense", amount: 3400.00 },
  { id: "tx-2026-08-08", date: "2026-08-08", description: "Engen 1-Stop (Road Trip Full Tank Fill-Up)", category: "Transport", type: "expense", amount: 1380.00 },
  { id: "tx-2026-08-09", date: "2026-08-09", description: "SANRAL E-Tolls & N3 Mooi River Plazas (Road Trip Outbound/Return)", category: "Transport", type: "expense", amount: 520.00 },
  { id: "tx-2026-08-10", date: "2026-08-10", description: "Drakensberg Canopy Tour & Nature Reserve Passes", category: "Entertainment", type: "expense", amount: 1150.00 },
  { id: "tx-2026-08-13", date: "2026-08-13", description: "Woolworths Food (Mid-Week Essentials)", category: "Food", type: "expense", amount: 480.00 },
  { id: "tx-2026-08-16", date: "2026-08-16", description: "Checkers Hyper (Weekly Pantry Stock-Up)", category: "Food", type: "expense", amount: 1290.00 },
  { id: "tx-2026-08-19", date: "2026-08-19", description: "Shell Select (Fuel / Petrol Fill-Up)", category: "Transport", type: "expense", amount: 1160.00 },
  { id: "tx-2026-08-21", date: "2026-08-21", description: "Vida e Caffe & Midweek Coffee", category: "Food", type: "expense", amount: 310.00 },
  { id: "tx-2026-08-23", date: "2026-08-23", description: "Dis-Chem Pharmacy (Household & Health Sundries)", category: "Health", type: "expense", amount: 420.00 },
  { id: "tx-2026-08-25", date: "2026-08-25", description: "Monthly Net Salary (Primary Employer Direct Deposit)", category: "Income", type: "income", amount: 45000.00 },
  { id: "tx-2026-08-26-1", date: "2026-08-26", description: "WesBank Vehicle Finance (Monthly Car Installment)", category: "Other", type: "expense", amount: 6850.00 },
  { id: "tx-2026-08-26-2", date: "2026-08-26", description: "Child Support Maintenance (Scheduled Court EFT)", category: "Other", type: "expense", amount: 5500.00 },
  { id: "tx-2026-08-26-3", date: "2026-08-26", description: "WealthIQ Core ETF Portfolio (18% Monthly Allocation)", category: "Investment", type: "expense", amount: 8100.00 },
  { id: "tx-2026-08-27", date: "2026-08-27", description: "Woolworths Food (Monthly Household Stock-up)", category: "Food", type: "expense", amount: 1650.00 },
  { id: "tx-2026-08-28", date: "2026-08-28", description: "Netflix Standard Subscription (HD Multi-Screen)", category: "Entertainment", type: "expense", amount: 159.00 },
  { id: "tx-2026-08-29", date: "2026-08-29", description: "Spotify Individual Music Streaming", category: "Entertainment", type: "expense", amount: 69.99 },
  { id: "tx-2026-08-30", date: "2026-08-30", description: "Sasol Convenience (Fuel / Petrol Fill-Up)", category: "Transport", type: "expense", amount: 1190.00 },

  // =========================================================================
  // SEPTEMBER 2026 (Total Inflow: R45,000.00 | Total Outflow: R39,528.98 | Net: +R5,471.02)
  // Highlights: Spring tech upgrade (iStore wireless earbuds), dental cleaning & Heritage Braai
  // =========================================================================
  { id: "tx-2026-09-01", date: "2026-09-01", description: "Vodacom Fibre Home Internet (100Mbps uncapped)", category: "Utilities", type: "expense", amount: 899.00 },
  { id: "tx-2026-09-02", date: "2026-09-02", description: "YouTube Premium Individual Subscription", category: "Entertainment", type: "expense", amount: 71.99 },
  { id: "tx-2026-09-03", date: "2026-09-03", description: "Eskom Prepaid Electricity Token", category: "Utilities", type: "expense", amount: 1850.00 },
  { id: "tx-2026-09-05", date: "2026-09-05", description: "Checkers Hyper (Weekly Groceries & Fresh Produce)", category: "Food", type: "expense", amount: 1460.00 },
  { id: "tx-2026-09-08", date: "2026-09-08", description: "Engen 1-Stop (Fuel / Petrol Fill-Up)", category: "Transport", type: "expense", amount: 1240.00 },
  { id: "tx-2026-09-11", date: "2026-09-11", description: "Woolworths Food (Mid-Week Essentials)", category: "Food", type: "expense", amount: 450.00 },
  { id: "tx-2026-09-12", date: "2026-09-12", description: "iStore South Africa (Wireless Noise-Canceling Earbuds & MagSafe)", category: "Shopping", type: "expense", amount: 3699.00 },
  { id: "tx-2026-09-14", date: "2026-09-14", description: "Uber South Africa (Commute / Transit)", category: "Transport", type: "expense", amount: 210.00 },
  { id: "tx-2026-09-16", date: "2026-09-16", description: "Checkers Hyper (Weekly Pantry Stock-Up)", category: "Food", type: "expense", amount: 1390.00 },
  { id: "tx-2026-09-18", date: "2026-09-18", description: "Dr. K. Naidoo Dental Practice (Annual Checkup, Scale & Polish)", category: "Health", type: "expense", amount: 1350.00 },
  { id: "tx-2026-09-20", date: "2026-09-20", description: "Shell Select (Fuel / Petrol Fill-Up)", category: "Transport", type: "expense", amount: 1180.00 },
  { id: "tx-2026-09-22", date: "2026-09-22", description: "Vida e Caffe & Midweek Dining", category: "Food", type: "expense", amount: 360.00 },
  { id: "tx-2026-09-24", date: "2026-09-24", description: "Checkers Meat Market & Food Lover's (Heritage Day Braai & Grill)", category: "Food", type: "expense", amount: 1780.00 },
  { id: "tx-2026-09-25", date: "2026-09-25", description: "Monthly Net Salary (Primary Employer Direct Deposit)", category: "Income", type: "income", amount: 45000.00 },
  { id: "tx-2026-09-26-1", date: "2026-09-26", description: "WesBank Vehicle Finance (Monthly Car Installment)", category: "Other", type: "expense", amount: 6850.00 },
  { id: "tx-2026-09-26-2", date: "2026-09-26", description: "Child Support Maintenance (Scheduled Court EFT)", category: "Other", type: "expense", amount: 5500.00 },
  { id: "tx-2026-09-26-3", date: "2026-09-26", description: "WealthIQ Core ETF Portfolio (18% Monthly Allocation)", category: "Investment", type: "expense", amount: 8100.00 },
  { id: "tx-2026-09-27", date: "2026-09-27", description: "Woolworths Food (Monthly Household Stock-up)", category: "Food", type: "expense", amount: 1690.00 },
  { id: "tx-2026-09-28", date: "2026-09-28", description: "Netflix Standard Subscription (HD Multi-Screen)", category: "Entertainment", type: "expense", amount: 159.00 },
  { id: "tx-2026-09-29", date: "2026-09-29", description: "Spotify Individual Music Streaming", category: "Entertainment", type: "expense", amount: 69.99 },
  { id: "tx-2026-09-30", date: "2026-09-30", description: "Sasol Convenience (Fuel / Petrol Fill-Up)", category: "Transport", type: "expense", amount: 1180.00 },

  // =========================================================================
  // OCTOBER 2026 (Total Inflow: R45,000.00 | Total Outflow: R30,929.98 | Net: +R14,070.02)
  // Highlights: Super-saver frugal challenge month! Minimal eating out, zero luxury purchases
  // =========================================================================
  { id: "tx-2026-10-01", date: "2026-10-01", description: "Vodacom Fibre Home Internet (100Mbps uncapped)", category: "Utilities", type: "expense", amount: 899.00 },
  { id: "tx-2026-10-02", date: "2026-10-02", description: "YouTube Premium Individual Subscription", category: "Entertainment", type: "expense", amount: 71.99 },
  { id: "tx-2026-10-03", date: "2026-10-03", description: "Eskom Prepaid Electricity Token", category: "Utilities", type: "expense", amount: 1750.00 },
  { id: "tx-2026-10-05", date: "2026-10-05", description: "Checkers Hyper (Budget Groceries & Bulk Pantry Staples)", category: "Food", type: "expense", amount: 1250.00 },
  { id: "tx-2026-10-08", date: "2026-10-08", description: "Engen 1-Stop (Fuel / Petrol Fill-Up)", category: "Transport", type: "expense", amount: 1120.00 },
  { id: "tx-2026-10-11", date: "2026-10-11", description: "Woolworths Food (Mid-Week Essentials)", category: "Food", type: "expense", amount: 390.00 },
  { id: "tx-2026-10-14", date: "2026-10-14", description: "Uber South Africa (Transit / Errand)", category: "Transport", type: "expense", amount: 180.00 },
  { id: "tx-2026-10-16", date: "2026-10-16", description: "Checkers Hyper (Weekly Pantry Stock-Up)", category: "Food", type: "expense", amount: 1180.00 },
  { id: "tx-2026-10-18", date: "2026-10-18", description: "Kirstenbosch Picnic & Sunday Market (Modest Outing)", category: "Food", type: "expense", amount: 380.00 },
  { id: "tx-2026-10-20", date: "2026-10-20", description: "Shell Select (Fuel / Petrol Fill-Up)", category: "Transport", type: "expense", amount: 1090.00 },
  { id: "tx-2026-10-22", date: "2026-10-22", description: "Vida e Caffe Morning Coffee", category: "Food", type: "expense", amount: 160.00 },
  { id: "tx-2026-10-23", date: "2026-10-23", description: "Clicks Pharmacy (Personal Care & Daily Multivitamins)", category: "Health", type: "expense", amount: 320.00 },
  { id: "tx-2026-10-25", date: "2026-10-25", description: "Monthly Net Salary (Primary Employer Direct Deposit)", category: "Income", type: "income", amount: 45000.00 },
  { id: "tx-2026-10-26-1", date: "2026-10-26", description: "WesBank Vehicle Finance (Monthly Car Installment)", category: "Other", type: "expense", amount: 6850.00 },
  { id: "tx-2026-10-26-2", date: "2026-10-26", description: "Child Support Maintenance (Scheduled Court EFT)", category: "Other", type: "expense", amount: 5500.00 },
  { id: "tx-2026-10-26-3", date: "2026-10-26", description: "WealthIQ Core ETF Portfolio (18% Monthly Allocation)", category: "Investment", type: "expense", amount: 8100.00 },
  { id: "tx-2026-10-27", date: "2026-10-27", description: "Woolworths Food (Monthly Household Stock-up)", category: "Food", type: "expense", amount: 1520.00 },
  { id: "tx-2026-10-28", date: "2026-10-28", description: "Netflix Standard Subscription (HD Multi-Screen)", category: "Entertainment", type: "expense", amount: 159.00 },
  { id: "tx-2026-10-29", date: "2026-10-29", description: "Spotify Individual Music Streaming", category: "Entertainment", type: "expense", amount: 69.99 },
  { id: "tx-2026-10-30", date: "2026-10-30", description: "Sasol Convenience (Fuel / Petrol Fill-Up)", category: "Transport", type: "expense", amount: 1100.00 },

  // =========================================================================
  // NOVEMBER 1, 2026 (Present Date Start of Month)
  // =========================================================================
  { id: "tx-2026-11-01-1", date: "2026-11-01", description: "Vodacom Fibre Home Internet (100Mbps uncapped)", category: "Utilities", type: "expense", amount: 899.00 },
  { id: "tx-2026-11-01-2", date: "2026-11-01", description: "Takealot (Early Black Friday Early-Bird Deposit)", category: "Shopping", type: "expense", amount: 650.00 },
  { id: "tx-2026-11-01-3", date: "2026-11-01", description: "Vida e Caffe Morning Espresso", category: "Food", type: "expense", amount: 42.00 }
];

// =============================================================================
// BOKANG KHAKHAU - ISOLATED SIMULATED LEDGER (MAY TO NOV 2026)
// Executive FinTech Consultant | Fixed Net Salary: R68,000.00 / month | Opening: R80,000.00
// =============================================================================
export const BOKANG_SIMULATED_TRANSACTIONS: Transaction[] = [
  // MAY 2026 (Inflow: R68,000.00 | Outflows: ~R46,840.00 | Surplus: +R21,160.00)
  { id: "tx-bokang-2026-05-01", date: "2026-05-01", description: "MetroFibre 500Mbps High-Speed Uncapped (Sandton)", category: "Utilities", type: "expense", amount: 1499.00 },
  { id: "tx-bokang-2026-05-02", date: "2026-05-02", description: "Apple One Premier & Cloud Family Subscription", category: "Entertainment", type: "expense", amount: 499.00 },
  { id: "tx-bokang-2026-05-03", date: "2026-05-03", description: "City of Joburg Prepaid Water & Power Token", category: "Utilities", type: "expense", amount: 2850.00 },
  { id: "tx-bokang-2026-05-05", date: "2026-05-05", description: "Woolworths Food Sandton City (Organic Groceries & Wine)", category: "Food", type: "expense", amount: 2450.00 },
  { id: "tx-bokang-2026-05-08", date: "2026-05-08", description: "Sasol Premium 95 Unleaded (BMW M-Sport Fill-Up)", category: "Transport", type: "expense", amount: 1680.00 },
  { id: "tx-bokang-2026-05-11", date: "2026-05-11", description: "Virgin Active Classic Collection (Sandton Gym Membership)", category: "Health", type: "expense", amount: 1850.00 },
  { id: "tx-bokang-2026-05-14", date: "2026-05-14", description: "Discovery Health Classic Executive Plan", category: "Health", type: "expense", amount: 4200.00 },
  { id: "tx-bokang-2026-05-16", date: "2026-05-16", description: "Woolworths Food (Mid-Month Pantry Restock)", category: "Food", type: "expense", amount: 1890.00 },
  { id: "tx-bokang-2026-05-20", date: "2026-05-20", description: "Marble Restaurant Rosebank (Executive Dinner)", category: "Food", type: "expense", amount: 1750.00 },
  { id: "tx-bokang-2026-05-25", date: "2026-05-25", description: "Monthly Net Salary (FinTech Systems Corp Direct Deposit)", category: "Income", type: "income", amount: 68000.00 },
  { id: "tx-bokang-2026-05-26-1", date: "2026-05-26", description: "Sandton Central Luxury Apartment Rental (Scheduled Debit)", category: "Other", type: "expense", amount: 18500.00 },
  { id: "tx-bokang-2026-05-26-2", date: "2026-05-26", description: "BMW Financial Services (BMW 4 Series Gran Coupé)", category: "Transport", type: "expense", amount: 8450.00 },
  { id: "tx-bokang-2026-05-26-3", date: "2026-05-26", description: "WealthIQ Core ETF Portfolio (18% Executive Allocation)", category: "Investment", type: "expense", amount: 12240.00 },
  { id: "tx-bokang-2026-05-28", date: "2026-05-28", description: "Gautrain Commuter Card Reload", category: "Transport", type: "expense", amount: 980.00 },
  { id: "tx-bokang-2026-05-30", date: "2026-05-30", description: "Exclusive Books & Tech Journal Subscriptions", category: "Shopping", type: "expense", amount: 650.00 },

  // JUNE 2026 (Inflow: R68,000.00 | Outflows: ~R44,920.00 | Surplus: +R23,080.00)
  { id: "tx-bokang-2026-06-01", date: "2026-06-01", description: "MetroFibre 500Mbps High-Speed Uncapped (Sandton)", category: "Utilities", type: "expense", amount: 1499.00 },
  { id: "tx-bokang-2026-06-02", date: "2026-06-02", description: "Apple One Premier & Cloud Family Subscription", category: "Entertainment", type: "expense", amount: 499.00 },
  { id: "tx-bokang-2026-06-04", date: "2026-06-04", description: "City of Joburg Prepaid Water & Power Token", category: "Utilities", type: "expense", amount: 2650.00 },
  { id: "tx-bokang-2026-06-06", date: "2026-06-06", description: "Woolworths Food Sandton City (Fresh Groceries)", category: "Food", type: "expense", amount: 2150.00 },
  { id: "tx-bokang-2026-06-09", date: "2026-06-09", description: "Sasol Premium 95 Unleaded (Full Tank)", category: "Transport", type: "expense", amount: 1620.00 },
  { id: "tx-bokang-2026-06-12", date: "2026-06-12", description: "Discovery Health Classic Executive Plan", category: "Health", type: "expense", amount: 4200.00 },
  { id: "tx-bokang-2026-06-15", date: "2026-06-15", description: "Virgin Active Classic Collection (Sandton Gym Membership)", category: "Health", type: "expense", amount: 1850.00 },
  { id: "tx-bokang-2026-06-18", date: "2026-06-18", description: "iStore South Africa (USB-C High-Wattage Travel Charger)", category: "Shopping", type: "expense", amount: 1299.00 },
  { id: "tx-bokang-2026-06-25", date: "2026-06-25", description: "Monthly Net Salary (FinTech Systems Corp Direct Deposit)", category: "Income", type: "income", amount: 68000.00 },
  { id: "tx-bokang-2026-06-26-1", date: "2026-06-26", description: "Sandton Central Luxury Apartment Rental (Scheduled Debit)", category: "Other", type: "expense", amount: 18500.00 },
  { id: "tx-bokang-2026-06-26-2", date: "2026-06-26", description: "BMW Financial Services (BMW 4 Series Gran Coupé)", category: "Transport", type: "expense", amount: 8450.00 },
  { id: "tx-bokang-2026-06-26-3", date: "2026-06-26", description: "WealthIQ Core ETF Portfolio (18% Executive Allocation)", category: "Investment", type: "expense", amount: 12240.00 },
  { id: "tx-bokang-2026-06-28", date: "2026-06-28", description: "The Grillhouse Rosebank (Father's Day Family Lunch)", category: "Food", type: "expense", amount: 2100.00 },

  // JULY 2026 (Inflow: R68,000.00 | Outflows: ~R50,860.00 | Surplus: +R17,140.00)
  // Highlights: BMW Scheduled Oil Service & Cape Town FinTech Summit Flights
  { id: "tx-bokang-2026-07-01", date: "2026-07-01", description: "MetroFibre 500Mbps High-Speed Uncapped (Sandton)", category: "Utilities", type: "expense", amount: 1499.00 },
  { id: "tx-bokang-2026-07-02", date: "2026-07-02", description: "Apple One Premier Subscription", category: "Entertainment", type: "expense", amount: 499.00 },
  { id: "tx-bokang-2026-07-04", date: "2026-07-04", description: "City of Joburg Winter Peak Electricity Token", category: "Utilities", type: "expense", amount: 3200.00 },
  { id: "tx-bokang-2026-07-07", date: "2026-07-07", description: "BMW Auto Bavaria Midrand (Brake Pads & Synthetic Oil Service)", category: "Transport", type: "expense", amount: 4850.00 },
  { id: "tx-bokang-2026-07-10", date: "2026-07-10", description: "FlySafair Return Business Ticket (Cape Town FinTech Summit)", category: "Transport", type: "expense", amount: 3450.00 },
  { id: "tx-bokang-2026-07-12", date: "2026-07-12", description: "Discovery Health Classic Executive Plan", category: "Health", type: "expense", amount: 4200.00 },
  { id: "tx-bokang-2026-07-15", date: "2026-07-15", description: "Virgin Active Classic Collection", category: "Health", type: "expense", amount: 1850.00 },
  { id: "tx-bokang-2026-07-18", date: "2026-07-18", description: "Woolworths Food Sandton City (Stock-up)", category: "Food", type: "expense", amount: 2350.00 },
  { id: "tx-bokang-2026-07-25", date: "2026-07-25", description: "Monthly Net Salary (FinTech Systems Corp Direct Deposit)", category: "Income", type: "income", amount: 68000.00 },
  { id: "tx-bokang-2026-07-26-1", date: "2026-07-26", description: "Sandton Central Luxury Apartment Rental (Scheduled Debit)", category: "Other", type: "expense", amount: 18500.00 },
  { id: "tx-bokang-2026-07-26-2", date: "2026-07-26", description: "BMW Financial Services (BMW 4 Series Gran Coupé)", category: "Transport", type: "expense", amount: 8450.00 },
  { id: "tx-bokang-2026-07-26-3", date: "2026-07-26", description: "WealthIQ Core ETF Portfolio (18% Executive Allocation)", category: "Investment", type: "expense", amount: 12240.00 },
  { id: "tx-bokang-2026-07-29", date: "2026-07-29", description: "V&A Waterfront Dining (CT Tech Conference Dinner)", category: "Food", type: "expense", amount: 1850.00 },

  // AUGUST 2026 (Inflow: R68,000.00 | Outflows: ~R46,250.00 | Surplus: +R21,750.00)
  { id: "tx-bokang-2026-08-01", date: "2026-08-01", description: "MetroFibre 500Mbps High-Speed Uncapped (Sandton)", category: "Utilities", type: "expense", amount: 1499.00 },
  { id: "tx-bokang-2026-08-02", date: "2026-08-02", description: "Apple One Premier Subscription", category: "Entertainment", type: "expense", amount: 499.00 },
  { id: "tx-bokang-2026-08-05", date: "2026-08-05", description: "City of Joburg Prepaid Electricity Token", category: "Utilities", type: "expense", amount: 2550.00 },
  { id: "tx-bokang-2026-08-08", date: "2026-08-08", description: "Sasol Premium 95 Unleaded (Full Tank)", category: "Transport", type: "expense", amount: 1650.00 },
  { id: "tx-bokang-2026-08-12", date: "2026-08-12", description: "Discovery Health Classic Executive Plan", category: "Health", type: "expense", amount: 4200.00 },
  { id: "tx-bokang-2026-08-15", date: "2026-08-15", description: "Virgin Active Classic Collection", category: "Health", type: "expense", amount: 1850.00 },
  { id: "tx-bokang-2026-08-18", date: "2026-08-18", description: "Woolworths Food Sandton City", category: "Food", type: "expense", amount: 2280.00 },
  { id: "tx-bokang-2026-08-25", date: "2026-08-25", description: "Monthly Net Salary (FinTech Systems Corp Direct Deposit)", category: "Income", type: "income", amount: 68000.00 },
  { id: "tx-bokang-2026-08-26-1", date: "2026-08-26", description: "Sandton Central Luxury Apartment Rental (Scheduled Debit)", category: "Other", type: "expense", amount: 18500.00 },
  { id: "tx-bokang-2026-08-26-2", date: "2026-08-26", description: "BMW Financial Services (BMW 4 Series Gran Coupé)", category: "Transport", type: "expense", amount: 8450.00 },
  { id: "tx-bokang-2026-08-26-3", date: "2026-08-26", description: "WealthIQ Core ETF Portfolio (18% Executive Allocation)", category: "Investment", type: "expense", amount: 12240.00 },
  { id: "tx-bokang-2026-08-28", date: "2026-08-28", description: "Country Club Johannesburg (Weekend Golf & Dining)", category: "Entertainment", type: "expense", amount: 1450.00 },

  // SEPTEMBER 2026 (Inflow: R68,000.00 | Outflows: ~R47,600.00 | Surplus: +R20,400.00)
  { id: "tx-bokang-2026-09-01", date: "2026-09-01", description: "MetroFibre 500Mbps High-Speed Uncapped (Sandton)", category: "Utilities", type: "expense", amount: 1499.00 },
  { id: "tx-bokang-2026-09-02", date: "2026-09-02", description: "Apple One Premier Subscription", category: "Entertainment", type: "expense", amount: 499.00 },
  { id: "tx-bokang-2026-09-05", date: "2026-09-05", description: "City of Joburg Prepaid Electricity Token", category: "Utilities", type: "expense", amount: 2450.00 },
  { id: "tx-bokang-2026-09-09", date: "2026-09-09", description: "Sasol Premium 95 Unleaded (Full Tank)", category: "Transport", type: "expense", amount: 1620.00 },
  { id: "tx-bokang-2026-09-12", date: "2026-09-12", description: "Discovery Health Classic Executive Plan", category: "Health", type: "expense", amount: 4200.00 },
  { id: "tx-bokang-2026-09-15", date: "2026-09-15", description: "Virgin Active Classic Collection", category: "Health", type: "expense", amount: 1850.00 },
  { id: "tx-bokang-2026-09-19", date: "2026-09-19", description: "iStore Sandton (Apple Watch Ultra Ocean Band)", category: "Shopping", type: "expense", amount: 2399.00 },
  { id: "tx-bokang-2026-09-25", date: "2026-09-25", description: "Monthly Net Salary (FinTech Systems Corp Direct Deposit)", category: "Income", type: "income", amount: 68000.00 },
  { id: "tx-bokang-2026-09-26-1", date: "2026-09-26", description: "Sandton Central Luxury Apartment Rental (Scheduled Debit)", category: "Other", type: "expense", amount: 18500.00 },
  { id: "tx-bokang-2026-09-26-2", date: "2026-09-26", description: "BMW Financial Services (BMW 4 Series Gran Coupé)", category: "Transport", type: "expense", amount: 8450.00 },
  { id: "tx-bokang-2026-09-26-3", date: "2026-09-26", description: "WealthIQ Core ETF Portfolio (18% Executive Allocation)", category: "Investment", type: "expense", amount: 12240.00 },
  { id: "tx-bokang-2026-09-28", date: "2026-09-28", description: "Woolworths Food Sandton City", category: "Food", type: "expense", amount: 2180.00 },

  // OCTOBER 2026 (Inflow: R68,000.00 | Outflows: ~R42,880.00 | Surplus: +R25,120.00)
  // Highlights: High-Savings Month
  { id: "tx-bokang-2026-10-01", date: "2026-10-01", description: "MetroFibre 500Mbps High-Speed Uncapped (Sandton)", category: "Utilities", type: "expense", amount: 1499.00 },
  { id: "tx-bokang-2026-10-02", date: "2026-10-02", description: "Apple One Premier Subscription", category: "Entertainment", type: "expense", amount: 499.00 },
  { id: "tx-bokang-2026-10-04", date: "2026-10-04", description: "City of Joburg Prepaid Electricity Token", category: "Utilities", type: "expense", amount: 2250.00 },
  { id: "tx-bokang-2026-10-07", date: "2026-10-07", description: "Woolworths Food Sandton City", category: "Food", type: "expense", amount: 1950.00 },
  { id: "tx-bokang-2026-10-10", date: "2026-10-10", description: "Sasol Premium 95 Unleaded (Full Tank)", category: "Transport", type: "expense", amount: 1580.00 },
  { id: "tx-bokang-2026-10-12", date: "2026-10-12", description: "Discovery Health Classic Executive Plan", category: "Health", type: "expense", amount: 4200.00 },
  { id: "tx-bokang-2026-10-15", date: "2026-10-15", description: "Virgin Active Classic Collection", category: "Health", type: "expense", amount: 1850.00 },
  { id: "tx-bokang-2026-10-25", date: "2026-10-25", description: "Monthly Net Salary (FinTech Systems Corp Direct Deposit)", category: "Income", type: "income", amount: 68000.00 },
  { id: "tx-bokang-2026-10-26-1", date: "2026-10-26", description: "Sandton Central Luxury Apartment Rental (Scheduled Debit)", category: "Other", type: "expense", amount: 18500.00 },
  { id: "tx-bokang-2026-10-26-2", date: "2026-10-26", description: "BMW Financial Services (BMW 4 Series Gran Coupé)", category: "Transport", type: "expense", amount: 8450.00 },
  { id: "tx-bokang-2026-10-26-3", date: "2026-10-26", description: "WealthIQ Core ETF Portfolio (18% Executive Allocation)", category: "Investment", type: "expense", amount: 12240.00 },
  { id: "tx-bokang-2026-10-29", date: "2026-10-29", description: "Woolworths Food Sandton City", category: "Food", type: "expense", amount: 1680.00 },

  // NOVEMBER 1, 2026 (Present Month Start)
  { id: "tx-bokang-2026-11-01-1", date: "2026-11-01", description: "MetroFibre 500Mbps High-Speed Uncapped (Sandton)", category: "Utilities", type: "expense", amount: 1499.00 },
  { id: "tx-bokang-2026-11-01-2", date: "2026-11-01", description: "Apple One Premier Subscription", category: "Entertainment", type: "expense", amount: 499.00 },
  { id: "tx-bokang-2026-11-01-3", date: "2026-11-01", description: "Woolworths Food Sandton City (Fresh Essentials)", category: "Food", type: "expense", amount: 580.00 }
];
