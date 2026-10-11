import json
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.utils.decorators import method_decorator
from .models import Transaction
from .categoriser import categorise_transaction
from .analytics import (
    get_spending_by_category,
    get_income_vs_expenses,
    get_spending_trends,
    get_summary_stats,
)


@login_required
def dashboard_view(request):
    stats = get_summary_stats(request.user)
    recent = Transaction.objects.filter(user=request.user)[:8]
    return render(request, 'dashboard/home.html', {
        'stats': stats,
        'recent_transactions': recent,
    })


@login_required
def transaction_list_view(request):
    category_filter = request.GET.get('category', '')
    type_filter = request.GET.get('type', '')
    search = request.GET.get('search', '')

    qs = Transaction.objects.filter(user=request.user)
    if category_filter:
        qs = qs.filter(category=category_filter)
    if type_filter:
        qs = qs.filter(transaction_type=type_filter)
    if search:
        qs = qs.filter(merchant__icontains=search)

    return render(request, 'transactions/list.html', {
        'transactions': qs,
        'category_filter': category_filter,
        'type_filter': type_filter,
        'search': search,
    })


@login_required
def add_transaction_view(request):
    if request.method == 'POST':
        merchant = request.POST.get('merchant')
        description = request.POST.get('description', '')
        amount = request.POST.get('amount')
        transaction_type = request.POST.get('transaction_type')
        date_val = request.POST.get('date')
        category = request.POST.get('category') or categorise_transaction(merchant, description, transaction_type)

        t = Transaction.objects.create(
            user=request.user,
            merchant=merchant,
            description=description,
            amount=amount,
            transaction_type=transaction_type,
            category=category,
            date=date_val,
        )

        # Update account balance
        user = request.user
        if transaction_type == 'income':
            user.account_balance += t.amount
        else:
            user.account_balance -= t.amount
        user.save()

        # Return JSON for AJAX callers (e.g. virtual card checkout on dashboard)
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'status': 'ok',
                'id': t.id,
                'merchant': t.merchant,
                'amount': str(t.amount),
            })

        return redirect('transactions')
    return render(request, 'transactions/add.html')


# ── API Endpoints (JSON) ──────────────────────────────────────────────────────

@login_required
def api_spending_by_category(request):
    months = int(request.GET.get('months', 1))
    data = get_spending_by_category(request.user, months)
    return JsonResponse(data)


@login_required
def api_income_vs_expenses(request):
    data = get_income_vs_expenses(request.user)
    return JsonResponse(data)


@login_required
def api_spending_trends(request):
    data = get_spending_trends(request.user)
    return JsonResponse(data)


@login_required
def api_stats(request):
    data = get_summary_stats(request.user)
    return JsonResponse(data)
