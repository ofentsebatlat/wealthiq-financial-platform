from django.test import TestCase
from investments.calculator import calculate_growth


class InvestmentCalculatorTestCase(TestCase):
    def test_zero_contribution(self):
        # Starting with R1,000, 10% annual rate, 1 year, no monthly contributions
        # FV = 1000 * (1 + 0.10/12)^12 = 1104.71
        result = calculate_growth(
            starting_amount=1000.0,
            monthly_contribution=0.0,
            annual_rate=10.0,
            years=1
        )
        self.assertEqual(result['final_value'], 1104.71)
        self.assertEqual(result['total_invested'], 1000.0)
        self.assertEqual(result['total_growth'], 104.71)

    def test_monthly_contributions(self):
        # Starting with R0, R500 monthly additions, 8% annual rate, 2 years
        result = calculate_growth(
            starting_amount=0.0,
            monthly_contribution=500.0,
            annual_rate=8.0,
            years=2
        )
        # 24 months, total invested = 12,000
        self.assertEqual(result['total_invested'], 12000.0)
        self.assertGreater(result['final_value'], 12000.0)
        self.assertEqual(len(result['yearly_data']), 2)
