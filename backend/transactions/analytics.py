"""
Analytics engine: computes chart data from transaction records.
"""
from decimal import Decimal
from collections import defaultdict
from django.db.models import Sum
from .models import Transaction
import json
from datetime import date, timedelta
import calendar


CATEGORY_COLORS = {
    'food': '#546E7A',
    'transport': '#2E7D32',
    'entertainment': '#7B1FA2',
    'utilities': '#E65100',
    'savings': '#00796B',
    'shopping': '#0288D1',
    'health': '#C2185B',
    'education': '#3F51B5',
    'income': '#2E7D32',
    'other': '#616161',
}



def get_spending_by_category(user, months=1):
    """Return spending totals grouped by category (excluding income)."""
    cutoff = date.today() - timedelta(days=30 * months)
    qs = Transaction.objects.filter(
        user=user,
        transaction_type='expense',
        date__gte=cutoff,
    ).values('category').annotate(total=Sum('amount')).order_by('-total')

    labels = []
    values = []
    colors = []

    for item in qs:
        cat = item['category']
        labels.append(dict(Transaction._meta.get_field('category').choices).get(cat, cat.title()))
        values.append(float(item['total']))
        colors.append(CATEGORY_COLORS.get(cat, '#94A3B8'))

    return {'labels': labels, 'values': values, 'colors': colors}


def get_income_vs_expenses(user, months=6):
    """Return monthly income vs expenses for the past N months."""
    today = date.today()
    month_labels = []
    income_data = []
    expense_data = []

    for i in range(months - 1, -1, -1):
        # Calculate month offset
        month = today.month - i
        year = today.year
        while month <= 0:
            month += 12
            year -= 1

        _, last_day = calendar.monthrange(year, month)
        start = date(year, month, 1)
        end = date(year, month, last_day)

        month_labels.append(start.strftime('%b %Y'))

        inc = Transaction.objects.filter(
            user=user, transaction_type='income', date__range=[start, end]
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        exp = Transaction.objects.filter(
            user=user, transaction_type='expense', date__range=[start, end]
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        income_data.append(float(inc))
        expense_data.append(float(exp))

    return {'labels': month_labels, 'income': income_data, 'expenses': expense_data}


def get_spending_trends(user, months=6):
    """Return spending per category as trend lines over N months."""
    today = date.today()
    categories = ['food', 'transport', 'entertainment', 'utilities', 'shopping', 'health']
    month_labels = []
    datasets = {cat: [] for cat in categories}

    for i in range(months - 1, -1, -1):
        month = today.month - i
        year = today.year
        while month <= 0:
            month += 12
            year -= 1

        _, last_day = calendar.monthrange(year, month)
        start = date(year, month, 1)
        end = date(year, month, last_day)
        month_labels.append(start.strftime('%b'))

        for cat in categories:
            total = Transaction.objects.filter(
                user=user, transaction_type='expense',
                category=cat, date__range=[start, end]
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
            datasets[cat].append(float(total))

    result_datasets = []
    cat_labels = {
        'food': 'Food', 'transport': 'Transport', 'entertainment': 'Entertainment',
        'utilities': 'Utilities', 'shopping': 'Shopping', 'health': 'Health'
    }
    for cat in categories:
        result_datasets.append({
            'label': cat_labels[cat],
            'data': datasets[cat],
            'borderColor': CATEGORY_COLORS[cat],
            'backgroundColor': CATEGORY_COLORS[cat] + '33',
            'tension': 0.4,
            'fill': False,
        })

    return {'labels': month_labels, 'datasets': result_datasets}


def get_summary_stats(user):
    """Return quick stat cards: balance, monthly income, monthly expenses, savings rate."""
    today = date.today()
    _, last_day = calendar.monthrange(today.year, today.month)
    start = date(today.year, today.month, 1)
    end = date(today.year, today.month, last_day)

    monthly_income = Transaction.objects.filter(
        user=user, transaction_type='income', date__range=[start, end]
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

    monthly_expenses = Transaction.objects.filter(
        user=user, transaction_type='expense', date__range=[start, end]
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

    savings_rate = 0
    if monthly_income > 0:
        savings_rate = round(float((monthly_income - monthly_expenses) / monthly_income * 100), 1)

    return {
        'balance': float(user.account_balance),
        'monthly_income': float(monthly_income),
        'monthly_expenses': float(monthly_expenses),
        'savings_rate': savings_rate,
    }
