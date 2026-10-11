import random
from datetime import date, timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from transactions.models import Transaction

User = get_user_model()

EXPENSE_DATA = [
    # (merchant, category, min, max)
    ('Shoprite', 'food', 400, 1200),
    ('Pick n Pay', 'food', 300, 900),
    ('Checkers', 'food', 200, 700),
    ('Woolworths Food', 'food', 300, 800),
    ('KFC', 'food', 80, 220),
    ("Nando's", 'food', 120, 280),
    ('Uber Eats', 'food', 150, 350),
    ('Steers', 'food', 90, 200),
    ('Mugg and Bean', 'food', 100, 250),
    ('Vida e Caffe', 'food', 40, 90),
    ('Engen Petrol', 'transport', 600, 1500),
    ('Sasol Fuel', 'transport', 500, 1400),
    ('Uber', 'transport', 80, 250),
    ('Bolt Ride', 'transport', 60, 200),
    ('E-Toll', 'transport', 100, 300),
    ('Netflix', 'entertainment', 169, 169),
    ('Showmax', 'entertainment', 99, 99),
    ('DStv Premium', 'entertainment', 849, 849),
    ('Spotify', 'entertainment', 60, 60),
    ('Ster-Kinekor', 'entertainment', 120, 300),
    ('Nu Metro Cinema', 'entertainment', 130, 280),
    ('Eskom Prepaid', 'utilities', 300, 800),
    ('Vodacom Data', 'utilities', 99, 299),
    ('MTN Airtime', 'utilities', 50, 200),
    ('Telkom Internet', 'utilities', 399, 799),
    ('City Power', 'utilities', 200, 600),
    ('Discovery Insurance', 'utilities', 400, 900),
    ('Woolworths Clothing', 'shopping', 300, 1200),
    ('Mr Price', 'shopping', 200, 800),
    ('Takealot', 'shopping', 150, 2000),
    ('Sportscene', 'shopping', 400, 1500),
    ('H&M', 'shopping', 300, 1000),
    ('Dis-Chem', 'health', 100, 500),
    ('Clicks Pharmacy', 'health', 80, 400),
    ('Virgin Active Gym', 'health', 499, 499),
    ('Netcare Hospital', 'health', 500, 2000),
    ('Savings Transfer', 'savings', 500, 2000),
]

INCOME_DATA = [
    ('Monthly Salary – Employer', 18000, 35000),
    ('Freelance Payment', 1500, 8000),
    ('Bank Interest', 50, 300),
]


class Command(BaseCommand):
    help = 'Seed realistic mock transaction data for the demo user'

    def handle(self, *args, **kwargs):
        # Get or create demo user
        user, created = User.objects.get_or_create(
            username='demo',
            defaults={
                'first_name': 'Ofentse',
                'last_name': 'Batlang',
                'email': 'demo@wealthiq.co.za',
                'account_number': '4001234567890123',
                'account_balance': Decimal('28450.75'),
            }
        )
        if created:
            user.set_password('WealthIQ2024!')
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Created demo user: demo / WealthIQ2024!'))
        else:
            self.stdout.write(f'Using existing demo user: {user.username}')

        # Clear old transactions for clean seed
        Transaction.objects.filter(user=user).delete()

        today = date.today()
        transactions_created = 0

        # Generate 6 months of data
        for month_offset in range(5, -1, -1):
            # Calculate the month
            month = today.month - month_offset
            year = today.year
            while month <= 0:
                month += 12
                year -= 1

            import calendar
            _, days_in_month = calendar.monthrange(year, month)
            if month == today.month and year == today.year:
                days_in_month = today.day

            # ── Income: salary on 25th ─────────────────────────────
            salary_day = min(25, days_in_month)
            salary = round(random.uniform(22000, 28000), 2)
            Transaction.objects.create(
                user=user,
                merchant='Monthly Salary – Capitec Payroll',
                description='Net salary deposit',
                amount=salary,
                category='income',
                transaction_type='income',
                date=date(year, month, salary_day),
            )
            transactions_created += 1

            # Optional freelance income
            if random.random() > 0.5:
                fl_day = random.randint(1, days_in_month)
                Transaction.objects.create(
                    user=user,
                    merchant='Freelance Payment',
                    description='Web development project',
                    amount=round(random.uniform(2000, 6000), 2),
                    category='income',
                    transaction_type='income',
                    date=date(year, month, fl_day),
                )
                transactions_created += 1

            # ── Expenses: random subset each month ────────────────
            monthly_expenses = random.sample(EXPENSE_DATA, k=random.randint(18, 26))
            for merchant, category, min_amt, max_amt in monthly_expenses:
                tx_date = date(year, month, random.randint(1, days_in_month))
                amount = round(random.uniform(min_amt, max_amt), 2)
                Transaction.objects.create(
                    user=user,
                    merchant=merchant,
                    description='',
                    amount=amount,
                    category=category,
                    transaction_type='expense',
                    date=tx_date,
                )
                transactions_created += 1

        self.stdout.write(self.style.SUCCESS(
            f'Success: Created {transactions_created} transactions for user "{user.username}"'
        ))

