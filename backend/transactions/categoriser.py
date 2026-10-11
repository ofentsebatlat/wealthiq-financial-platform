"""
Rule-based transaction categoriser.
Maps merchant keywords to spending categories.
"""

CATEGORY_RULES = {
    'food': [
        'shoprite', 'checkers', 'pick n pay', 'woolworths food', 'spar', 'food lover',
        'kfc', 'mcdonalds', "mcdonald's", 'steers', 'nandos', "nando's", 'chicken licken',
        'debonairs', 'roman\'s pizza', 'fishaways', 'tashas', 'vida e caffe', 'starbucks',
        'mugg and bean', 'spur', 'wimpy', 'ocean basket', 'uber eats', 'mr delivery',
        'bolt food', 'restaurant', 'cafe', 'bakery', 'grocery', 'supermarket',
    ],
    'transport': [
        'engen', 'sasol', 'total', 'caltex', 'bp petrol', 'shell', 'astron',
        'uber', 'bolt', 'lyft', 'taxi', 'gautrain', 'metrobus', 'myciti',
        'intercape', 'greyhound', 'transnet', 'prasa', 'tolls', 'e-toll',
        'parking', 'auto', 'avis', 'budget car', 'hertz',
    ],
    'entertainment': [
        'netflix', 'showmax', 'dstv', 'ster-kinekor', 'nu metro', 'event', 'ticket',
        'spotify', 'apple music', 'youtube premium', 'gaming', 'playstation', 'xbox',
        'steam', 'taboo', 'grand west', 'casino', 'cinema', 'theatre', 'concert',
        'bar', 'pub', 'nightclub', 'club', 'entertainment',
    ],
    'utilities': [
        'eskom', 'city power', 'ekurhuleni', 'tshwane', 'joburg water', 'municipality',
        'vodacom', 'mtn', 'cell c', 'telkom', 'rain', 'afrihost', 'internet',
        'electricity', 'water', 'rates', 'levies', 'airtime', 'data bundle',
        'insurance', 'discovery', 'momentum', 'sanlam', 'old mutual',
    ],
    'savings': [
        'savings', 'fixed deposit', 'investment', 'unit trust', 'retirement',
        'provident', 'pension', 'capitec save', 'nedbank savings', 'absa savings',
        'transfer to savings', 'pocket',
    ],
    'shopping': [
        'woolworths', 'h&m', 'zara', 'mr price', 'ackermans', 'truworths', 'edgars',
        'pep stores', 'jet', 'markham', 'sportscene', 'totalsports', 'nike', 'adidas',
        'takealot', 'amazon', 'makro', 'game store', 'incredible connection', 'apple store',
        'samsung', 'hm fashion',
    ],
    'health': [
        'clicks', 'dischem', 'dis-chem', 'pharmacy', 'hospital', 'clinic', 'doctor',
        'dentist', 'optometrist', 'virgin active', 'planet fitness', 'gym', 'biokinetics',
        'life healthcare', 'mediclinic', 'netcare', 'pathcare', 'lancet',
    ],
    'education': [
        'unisa', 'university', 'college', 'school', 'tuition', 'course', 'udemy',
        'coursera', 'edx', 'books', 'campus', 'nsfas', 'study',
    ],
    'income': [
        'salary', 'payroll', 'wages', 'deposit', 'transfer from', 'refund',
        'dividend', 'interest earned', 'payment received', 'capitec pay',
    ],
}


def categorise_transaction(merchant: str, description: str = '', transaction_type: str = 'expense') -> str:
    """Auto-categorise a transaction based on merchant name and description."""
    if transaction_type == 'income':
        return 'income'

    text = f"{merchant} {description}".lower()

    for category, keywords in CATEGORY_RULES.items():
        for keyword in keywords:
            if keyword in text:
                return category

    return 'other'
