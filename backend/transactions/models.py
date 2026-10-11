from django.db import models
from django.conf import settings

CATEGORY_CHOICES = [
    ('food', 'Food & Groceries'),
    ('transport', 'Transport'),
    ('entertainment', 'Entertainment'),
    ('utilities', 'Utilities'),
    ('savings', 'Savings'),
    ('shopping', 'Shopping'),
    ('health', 'Health & Medical'),
    ('education', 'Education'),
    ('income', 'Income'),
    ('other', 'Other'),
]

TRANSACTION_TYPE_CHOICES = [
    ('income', 'Income'),
    ('expense', 'Expense'),
]


class Transaction(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='transactions')
    merchant = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='other')
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPE_CHOICES)
    date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.merchant} – R{self.amount} ({self.category})"
