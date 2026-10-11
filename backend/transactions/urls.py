from django.urls import path
from . import views

urlpatterns = [
    path('dashboard/', views.dashboard_view, name='dashboard'),
    path('transactions/', views.transaction_list_view, name='transactions'),
    path('transactions/add/', views.add_transaction_view, name='add_transaction'),
    # JSON API endpoints
    path('api/spending-by-category/', views.api_spending_by_category, name='api_spending_category'),
    path('api/income-vs-expenses/', views.api_income_vs_expenses, name='api_income_expenses'),
    path('api/spending-trends/', views.api_spending_trends, name='api_trends'),
    path('api/stats/', views.api_stats, name='api_stats'),
]
