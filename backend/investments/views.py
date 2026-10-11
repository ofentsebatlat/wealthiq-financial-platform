import json
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from .models import InvestmentProduct, Simulation
from .calculator import calculate_growth


@login_required
def products_view(request):
    products = InvestmentProduct.objects.filter(is_active=True)
    grouped = {
        'unit_trust': products.filter(product_type='unit_trust'),
        'fixed_deposit': products.filter(product_type='fixed_deposit'),
        'money_market': products.filter(product_type='money_market'),
        'equity': products.filter(product_type='equity'),
    }
    return render(request, 'investments/products.html', {'grouped': grouped})


@login_required
def calculator_view(request):
    products = InvestmentProduct.objects.filter(is_active=True)
    result = None
    product = None

    if request.method == 'POST':
        starting_amount = float(request.POST.get('starting_amount', 0))
        monthly_contribution = float(request.POST.get('monthly_contribution', 0))
        interest_rate = float(request.POST.get('interest_rate', 0))
        years = int(request.POST.get('years', 1))
        product_id = request.POST.get('product_id')

        result = calculate_growth(starting_amount, monthly_contribution, interest_rate, years)

        if product_id:
            try:
                product = InvestmentProduct.objects.get(id=product_id)
                # Save simulation
                Simulation.objects.create(
                    user=request.user,
                    product=product,
                    starting_amount=starting_amount,
                    monthly_contribution=monthly_contribution,
                    interest_rate=interest_rate,
                    years=years,
                    final_value=result['final_value'],
                )
            except InvestmentProduct.DoesNotExist:
                pass

    return render(request, 'investments/calculator.html', {
        'products': products,
        'result': result,
        'product': product,
    })


@login_required
def simulate_view(request, product_id):
    product = get_object_or_404(InvestmentProduct, id=product_id)
    return render(request, 'investments/calculator.html', {
        'products': InvestmentProduct.objects.filter(is_active=True),
        'selected_product': product,
        'result': None,
    })


@login_required
def my_simulations_view(request):
    sims = Simulation.objects.filter(user=request.user).order_by('-created_at')
    return render(request, 'investments/simulations.html', {'simulations': sims})


@login_required
def api_calculate(request):
    try:
        data = json.loads(request.body)
        result = calculate_growth(
            float(data.get('starting_amount', 0)),
            float(data.get('monthly_contribution', 0)),
            float(data.get('interest_rate', 0)),
            int(data.get('years', 1)),
        )
        return JsonResponse(result)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)
