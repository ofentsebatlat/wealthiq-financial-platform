from django.contrib import admin
from .models import Transaction

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ['merchant', 'amount', 'category', 'transaction_type', 'date', 'user']
    list_filter = ['category', 'transaction_type', 'date']
    search_fields = ['merchant', 'description']
    date_hierarchy = 'date'
