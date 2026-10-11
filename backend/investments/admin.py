from django.contrib import admin
from .models import InvestmentProduct, Simulation

@admin.register(InvestmentProduct)
class InvestmentProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'product_type', 'risk_rating', 'expected_annual_return', 'minimum_investment', 'is_active']
    list_filter = ['product_type', 'risk_rating', 'is_active']

@admin.register(Simulation)
class SimulationAdmin(admin.ModelAdmin):
    list_display = ['user', 'product', 'starting_amount', 'years', 'final_value', 'created_at']
