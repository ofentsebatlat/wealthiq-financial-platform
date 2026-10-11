from django.db import models
from django.conf import settings

RISK_CHOICES = [
    ('low', 'Low Risk'),
    ('medium', 'Medium Risk'),
    ('high', 'High Risk'),
]

PRODUCT_TYPE_CHOICES = [
    ('unit_trust', 'Unit Trust'),
    ('fixed_deposit', 'Fixed Deposit'),
    ('money_market', 'Money Market Account'),
    ('equity', 'Equity-Linked Product'),
]


class InvestmentProduct(models.Model):
    name = models.CharField(max_length=200)
    product_type = models.CharField(max_length=30, choices=PRODUCT_TYPE_CHOICES)
    risk_rating = models.CharField(max_length=10, choices=RISK_CHOICES)
    expected_annual_return = models.DecimalField(max_digits=5, decimal_places=2)
    minimum_investment = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.TextField()
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.get_product_type_display()})"


class Simulation(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='simulations')
    product = models.ForeignKey(InvestmentProduct, on_delete=models.SET_NULL, null=True, blank=True)
    starting_amount = models.DecimalField(max_digits=12, decimal_places=2)
    monthly_contribution = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    interest_rate = models.DecimalField(max_digits=5, decimal_places=2)
    years = models.PositiveIntegerField()
    final_value = models.DecimalField(max_digits=14, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Simulation by {self.user.username} – R{self.final_value}"
