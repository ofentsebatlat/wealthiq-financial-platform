from decimal import Decimal
from datetime import date
from django.test import TestCase
from django.contrib.auth import get_user_model
from transactions.models import Transaction
from transactions.categoriser import categorise_transaction
from transactions.analytics import get_summary_stats, get_spending_by_category

User = get_user_model()


class TransactionTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpassword',
            first_name='Test',
            last_name='User',
            account_number='4000000000000001',
            account_balance=Decimal('10000.00'),
        )

    def test_auto_categorisation(self):
        # Expenses
        self.assertEqual(categorise_transaction('Checkers Supermarket'), 'food')
        self.assertEqual(categorise_transaction('Shell Garage'), 'transport')
        self.assertEqual(categorise_transaction('Netflix Subscription'), 'entertainment')
        self.assertEqual(categorise_transaction('Eskom Electricity'), 'utilities')
        self.assertEqual(categorise_transaction('Virgin Active Gym'), 'health')
        self.assertEqual(categorise_transaction('Takealot Online'), 'shopping')
        # Custom type overrides
        self.assertEqual(categorise_transaction('Checkers', transaction_type='income'), 'income')
        self.assertEqual(categorise_transaction('Unknown Shop'), 'other')

    def test_analytics_and_balance(self):
        # Create a salary deposit (income)
        t1 = Transaction.objects.create(
            user=self.user,
            merchant='Capitec Salary',
            amount=Decimal('5000.00'),
            category='income',
            transaction_type='income',
            date=date.today(),
        )
        # Create a food expense
        t2 = Transaction.objects.create(
            user=self.user,
            merchant='Pick n Pay',
            amount=Decimal('1200.00'),
            category='food',
            transaction_type='expense',
            date=date.today(),
        )

        stats = get_summary_stats(self.user)
        self.assertEqual(stats['monthly_income'], 5000.00)
        self.assertEqual(stats['monthly_expenses'], 1200.00)
        self.assertEqual(stats['savings_rate'], 76.0)  # (5000 - 1200) / 5000 * 100 = 76%

        pie_data = get_spending_by_category(self.user)
        self.assertIn('Food & Groceries', pie_data['labels'])
        self.assertIn(1200.0, pie_data['values'])
