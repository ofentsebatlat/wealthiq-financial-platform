"""
Investment calculator: compound growth projections.
Formula: FV = PV*(1+r)^n + PMT * [((1+r)^n - 1) / r]
where r = monthly rate, n = total months.
"""
from decimal import Decimal
import math


def calculate_growth(starting_amount: float, monthly_contribution: float,
                     annual_rate: float, years: int) -> dict:
    """
    Compute compound growth month-by-month.
    Returns monthly breakdown list and final value.
    """
    monthly_rate = annual_rate / 100 / 12
    total_months = years * 12
    balance = starting_amount
    monthly_data = []

    for month in range(1, total_months + 1):
        balance = balance * (1 + monthly_rate) + monthly_contribution
        if month % 12 == 0:
            monthly_data.append({
                'year': month // 12,
                'balance': round(balance, 2),
            })

    total_invested = starting_amount + (monthly_contribution * total_months)
    total_growth = balance - total_invested

    return {
        'yearly_data': monthly_data,
        'final_value': round(balance, 2),
        'total_invested': round(total_invested, 2),
        'total_growth': round(total_growth, 2),
        'growth_percent': round((total_growth / total_invested * 100) if total_invested > 0 else 0, 1),
    }
