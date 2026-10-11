"""
Smart Guidance Engine — resilient financial advisory service.
Architecture:
  1. Rule-based analysis produces base tips from spending patterns.
  2. Gemini model-rotation queue optionally enriches tips via AI.
     Rotation order: gemini-1.5-flash-8b → gemini-1.5-flash → gemini-1.0-pro
  3. On any AI failure (503, quota, timeout, missing key) the engine
     silently returns pre-cached SA-localised fallback tips.
     Raw error stacks are NEVER propagated to the caller.
"""

from decimal import Decimal
from django.db.models import Sum
from datetime import date
import calendar
import logging
import os

logger = logging.getLogger(__name__)

# ── Gemini model rotation queue ────────────────────────────────────────────────
# Start with the highest-throughput lite model, rotate to heavier tiers on
# overload / quota errors before giving up and using local fallbacks.
MODEL_ROTATION_QUEUE = [
    "gemini-1.5-flash-8b",   # Tier 1 – highest throughput, lowest cost
    "gemini-1.5-flash",       # Tier 2 – standard flash
    "gemini-1.0-pro",         # Tier 3 – stable fallback
]

# ── Optional Gemini import (graceful degradation if package absent) ────────────
try:
    import google.generativeai as genai
    _GEMINI_AVAILABLE = True
except ImportError:
    _GEMINI_AVAILABLE = False

# ── Pre-cached SA-localised fallback tips ─────────────────────────────────────
# Returned verbatim when all AI tiers are exhausted. Never exposes API errors.
_SA_FALLBACK_TIPS = [
    {
        'icon': '🛒',
        'title': 'Smart Grocery Savings',
        'message': (
            'Shop at Checkers or Pick n Pay on their Wednesday/Thursday specials. '
            'Use the Sixty60 app to compare prices and avoid impulse buys. '
            'A R200/week grocery discipline can save R800+ per month.'
        ),
        'type': 'info',
    },
    {
        'icon': '🏦',
        'title': 'Maximise Your Capitec Pocket',
        'message': (
            'Move surplus funds into a Capitec Savings Pocket to earn up to 7.5% p.a. '
            'interest. Even R500/month compounded over 5 years at 7.5% grows to ~R36,000 — '
            'without any market risk.'
        ),
        'type': 'success',
    },
    {
        'icon': '📊',
        'title': 'SA Tax-Free Savings Account (TFSA)',
        'message': (
            'SARS allows up to R36,000 per year (R500,000 lifetime) in a Tax-Free Savings '
            'Account. All growth, dividends, and withdrawals are 100% tax-free. '
            'Open one through Capitec Invest or EasyEquities.'
        ),
        'type': 'info',
    },
    {
        'icon': '⛽',
        'title': 'Cut Fuel Costs',
        'message': (
            'Fill up at Engen or BP on Wednesdays when fuel prices typically reset. '
            'Carpool or use the Uber Pool option for commutes. '
            'Reducing one tank per month saves ~R700–R1,200 depending on your vehicle.'
        ),
        'type': 'warning',
    },
]


def _configure_gemini():
    """Configure Gemini API key from Django settings or environment variable."""
    api_key = None
    try:
        from django.conf import settings
        api_key = getattr(settings, 'GEMINI_API_KEY', None)
    except Exception:
        pass
    if not api_key:
        api_key = os.environ.get('GEMINI_API_KEY')
    if api_key and _GEMINI_AVAILABLE:
        genai.configure(api_key=api_key)
        return True
    return False


def _build_prompt(user, rule_tips: list, stats: dict) -> str:
    """Build a concise SA-contextual prompt for the generative model."""
    tip_titles = ', '.join(t['title'] for t in rule_tips)
    return (
        f"You are a South African personal finance advisor for Capitec Bank.\n"
        f"User's financial summary this month:\n"
        f"  - Balance: R{stats.get('balance', 0):,.2f}\n"
        f"  - Income: R{stats.get('income', 0):,.2f}\n"
        f"  - Expenses: R{stats.get('expenses', 0):,.2f}\n"
        f"  - Savings rate: {stats.get('savings_rate', 0):.1f}%\n"
        f"  - Rule-based alerts: {tip_titles or 'none'}\n\n"
        f"Give exactly 3 actionable financial tips relevant to South Africa "
        f"(mention Checkers, Pick n Pay, Capitec pockets, TFSA limits, or similar "
        f"where appropriate). Return JSON array: "
        f'[{{"icon":"emoji","title":"..","message":"..","type":"info|success|warning"}}]'
    )


def _try_gemini_guidance(user, rule_tips: list, stats: dict) -> list | None:
    """
    Attempt AI-enriched tips using model rotation queue.
    Returns a list of tip dicts on success, or None if all tiers fail.
    Raw exception stacks are caught and silenced.
    """
    if not _GEMINI_AVAILABLE or not _configure_gemini():
        return None

    import json

    for model_name in MODEL_ROTATION_QUEUE:
        try:
            model = genai.GenerativeModel(model_name)
            prompt = _build_prompt(user, rule_tips, stats)
            response = model.generate_content(
                prompt,
                generation_config={"temperature": 0.4, "max_output_tokens": 512},
                request_options={"timeout": 8},
            )
            text = response.text.strip()
            # Strip markdown code fences if present
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            ai_tips = json.loads(text)
            if isinstance(ai_tips, list) and ai_tips:
                # Merge: AI tips first, then any rule tips not covered
                return ai_tips[:4]
        except Exception:
            # Silently rotate to next model — never expose API errors
            continue

    return None  # All tiers exhausted


def generate_guidance(user) -> list:
    """
    Returns a list of tip dicts: {icon, title, message, type}
    based on the user's last 30 days of transactions.
    Attempts AI enrichment via Gemini rotation queue; falls back gracefully.
    """
    from transactions.models import Transaction

    today = date.today()
    _, last_day = calendar.monthrange(today.year, today.month)
    start = date(today.year, today.month, 1)
    end = date(today.year, today.month, last_day)

    tips = []

    # ── Fetch category totals ─────────────────────────────────────────────────
    expenses = Transaction.objects.filter(
        user=user, transaction_type='expense', date__range=[start, end]
    )
    income_total = Transaction.objects.filter(
        user=user, transaction_type='income', date__range=[start, end]
    ).aggregate(t=Sum('amount'))['t'] or Decimal('0')

    expense_total = expenses.aggregate(t=Sum('amount'))['t'] or Decimal('0')

    food_total = expenses.filter(category='food').aggregate(t=Sum('amount'))['t'] or Decimal('0')
    entertain_total = expenses.filter(category='entertainment').aggregate(t=Sum('amount'))['t'] or Decimal('0')
    transport_total = expenses.filter(category='transport').aggregate(t=Sum('amount'))['t'] or Decimal('0')
    savings_total = expenses.filter(category='savings').aggregate(t=Sum('amount'))['t'] or Decimal('0')

    savings_rate = 0
    if income_total > 0:
        savings_rate = float((income_total - expense_total) / income_total * 100)

    food_pct = float(food_total / expense_total * 100) if expense_total > 0 else 0
    entertain_pct = float(entertain_total / expense_total * 100) if expense_total > 0 else 0
    transport_pct = float(transport_total / expense_total * 100) if expense_total > 0 else 0

    # ── Rule 1: Low savings rate ──────────────────────────────────────────────
    if savings_rate < 10:
        tips.append({
            'icon': '⚠️',
            'title': 'Low Savings Rate',
            'message': (
                f"You're saving only {savings_rate:.1f}% of your income this month. "
                f"Financial experts recommend saving at least 20%. "
                f"Consider setting up an automatic monthly transfer to a Capitec Savings Pocket."
            ),
            'type': 'warning',
        })
    elif savings_rate >= 20:
        tips.append({
            'icon': '🎉',
            'title': 'Great Savings Rate!',
            'message': (
                f"You're saving {savings_rate:.1f}% of your income — well above the recommended 20%. "
                f"Consider putting the surplus into a TFSA (R36,000/year limit) "
                f"or a Capitec Fixed Deposit to earn more."
            ),
            'type': 'success',
        })

    # ── Rule 2: High food spending ────────────────────────────────────────────
    if food_pct > 35:
        tips.append({
            'icon': '🍔',
            'title': 'Food Spending Alert',
            'message': (
                f"Food & groceries account for {food_pct:.1f}% of your expenses this month "
                f"(R{food_total:,.2f}). Shop specials at Checkers or Pick n Pay and "
                f"meal prep on weekends to cut costs by up to 25%."
            ),
            'type': 'warning',
        })

    # ── Rule 3: High entertainment spending ──────────────────────────────────
    if entertain_pct > 20:
        tips.append({
            'icon': '🎬',
            'title': 'Entertainment Budget Check',
            'message': (
                f"Entertainment takes up {entertain_pct:.1f}% of your spending (R{entertain_total:,.2f}). "
                f"Bundle subscriptions and set a monthly cap of 10–15%."
            ),
            'type': 'warning',
        })

    # ── Rule 4: No savings transactions ──────────────────────────────────────
    if savings_total == 0 and income_total > 0:
        tips.append({
            'icon': '💰',
            'title': 'Start Saving This Month',
            'message': (
                f"You haven't made any savings transfers this month. "
                f"Even R{float(income_total) * 0.05:,.2f} (5% of income) "
                f"into a Capitec Pocket adds up significantly. Try our Investment Calculator."
            ),
            'type': 'info',
        })

    # ── Rule 5: Healthy balance — suggest investing ───────────────────────────
    if float(user.account_balance) > 50000:
        tips.append({
            'icon': '📈',
            'title': 'Invest Your Surplus',
            'message': (
                f"Your balance of R{float(user.account_balance):,.2f} is healthy! "
                f"Money in a current account loses value to inflation. "
                f"Explore Fixed Deposits or a TFSA via the Investments tab."
            ),
            'type': 'info',
        })

    # ── Rule 6: High transport spending ──────────────────────────────────────
    if transport_pct > 25:
        tips.append({
            'icon': '🚗',
            'title': 'High Transport Costs',
            'message': (
                f"Transport is {transport_pct:.1f}% of your expenses (R{transport_total:,.2f}). "
                f"Consider carpooling, MyCiTi/Gautrain commutes, or consolidating trips."
            ),
            'type': 'warning',
        })

    # ── Fallback general tip ──────────────────────────────────────────────────
    if not tips:
        tips.append({
            'icon': '💡',
            'title': 'Keep It Up!',
            'message': (
                "Your spending looks balanced this month. "
                "Explore the Investments tab and consider opening a TFSA "
                "to make your money work harder tax-free."
            ),
            'type': 'success',
        })

    rule_tips = tips[:4]

    # ── Attempt AI-enriched tier ──────────────────────────────────────────────
    stats_snapshot = {
        'balance': float(user.account_balance),
        'income': float(income_total),
        'expenses': float(expense_total),
        'savings_rate': savings_rate,
    }
    ai_tips = _try_gemini_guidance(user, rule_tips, stats_snapshot)

    if ai_tips:
        return ai_tips[:4]

    # ── Final fallback: if no rule tips generated, use SA pre-cached tips ─────
    if not rule_tips:
        return _SA_FALLBACK_TIPS[:4]

    return rule_tips
