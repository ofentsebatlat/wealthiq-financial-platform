from decimal import Decimal
from django.core.management.base import BaseCommand
from investments.models import InvestmentProduct


class Command(BaseCommand):
    help = 'Seed investment products for WealthIQ'

    def handle(self, *args, **kwargs):
        # Clear old investment products
        InvestmentProduct.objects.all().delete()

        products = [
            # Unit Trusts
            {
                'name': 'Capitec Active Growth Fund',
                'product_type': 'unit_trust',
                'risk_rating': 'high',
                'expected_annual_return': Decimal('14.50'),
                'minimum_investment': Decimal('500.00'),
                'description': 'A high-growth unit trust focusing on JSE top-performing equities. Perfect for long-term wealth creation with a minimum 5-year investment horizon.'
            },
            {
                'name': 'WealthIQ Balanced Conservative Fund',
                'product_type': 'unit_trust',
                'risk_rating': 'medium',
                'expected_annual_return': Decimal('9.80'),
                'minimum_investment': Decimal('250.00'),
                'description': 'A diversified portfolio combining equities, bonds, and cash. Designed to offer stable capital growth with reduced volatility.'
            },
            # Fixed Deposits
            {
                'name': 'WealthIQ 12-Month Fixed Deposit',
                'product_type': 'fixed_deposit',
                'risk_rating': 'low',
                'expected_annual_return': Decimal('8.25'),
                'minimum_investment': Decimal('1000.00'),
                'description': 'Lock in a guaranteed high interest rate for 12 months. Zero monthly fees, perfect for risk-averse savers with specific timeline goals.'
            },
            {
                'name': 'WealthIQ 60-Month Fixed Deposit',
                'product_type': 'fixed_deposit',
                'risk_rating': 'low',
                'expected_annual_return': Decimal('10.50'),
                'minimum_investment': Decimal('10000.00'),
                'description': 'Earn our highest guaranteed rate over a 5-year term. Excellent for securing interest rates and growing your core savings.'
            },
            # Money Market Accounts
            {
                'name': 'Capitec High-Yield Money Market',
                'product_type': 'money_market',
                'risk_rating': 'low',
                'expected_annual_return': Decimal('7.75'),
                'minimum_investment': Decimal('100.00'),
                'description': 'High liquidity savings account offering bank-beating interest rates. Withdraw funds anytime with 24-hour notice.'
            },
            # Equity-Linked Products
            {
                'name': 'WealthIQ JSE Top 40 Index Tracker',
                'product_type': 'equity',
                'risk_rating': 'high',
                'expected_annual_return': Decimal('15.20'),
                'minimum_investment': Decimal('1000.00'),
                'description': 'Directly mirrors the performance of the largest 40 companies listed on the Johannesburg Stock Exchange. High risk but matches equity market returns.'
            },
            {
                'name': 'Global Tech Leaders Basket',
                'product_type': 'equity',
                'risk_rating': 'high',
                'expected_annual_return': Decimal('18.40'),
                'minimum_investment': Decimal('2500.00'),
                'description': 'An equity-linked instrument structured around global technology companies including Microsoft, Apple, and Alphabet. Expressly designed for capital growth.'
            }
        ]

        for p in products:
            InvestmentProduct.objects.create(**p)

        self.stdout.write(self.style.SUCCESS(f'Successfully seeded {len(products)} investment products.'))
