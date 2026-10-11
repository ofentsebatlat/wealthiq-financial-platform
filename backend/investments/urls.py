from django.urls import path
from . import views

urlpatterns = [
    path('investments/', views.products_view, name='investments'),
    path('investments/calculator/', views.calculator_view, name='calculator'),
    path('investments/simulate/<int:product_id>/', views.simulate_view, name='simulate'),
    path('investments/my-simulations/', views.my_simulations_view, name='my_simulations'),
    path('api/calculate/', views.api_calculate, name='api_calculate'),
]
