/**
 * Charts and analytics script for the WealthIQ dashboard.
 */

document.addEventListener('DOMContentLoaded', () => {
    loadSummaryStats();
    loadCategoryPieChart();
    loadIncomeExpensesChart();
    loadSpendingTrendsChart();
    loadGuidanceTips();
});

let pieChartInstance = null;

/**
 * Fetch and render the spending breakdown pie chart.
 */
function loadCategoryPieChart() {
    const months = document.getElementById('spendingMonths').value;
    
    fetch(`/api/spending-by-category/?months=${months}`)
        .then(res => res.json())
        .then(data => {
            const ctx = document.getElementById('categoryPieChart').getContext('2d');
            
            if (pieChartInstance) {
                pieChartInstance.destroy();
            }

            if (data.values.length === 0) {
                // Show placeholder if no data
                pieChartInstance = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: ['No Expenses Recorded'],
                        datasets: [{
                            data: [1],
                            backgroundColor: ['#e0e0e0'],
                            borderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: true, position: 'bottom', labels: { color: '#757575' } }
                        }
                    }
                });
                return;
            }

            pieChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: data.labels,
                    datasets: [{
                        data: data.values,
                        backgroundColor: data.colors,
                        borderWidth: 1,
                        borderColor: '#ffffff',
                        hoverOffset: 12
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: '#1c1c1c',
                                boxWidth: 12,
                                padding: 16,
                                font: { family: 'system-ui', size: 12 }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const value = context.raw;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((value / total) * 100).toFixed(1);
                                    return ` R${value.toLocaleString()} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });

        });
}

/**
 * Fetch and render the income vs expenses monthly bar chart.
 */
function loadIncomeExpensesChart() {
    fetch('/api/income-vs-expenses/')
        .then(res => res.json())
        .then(data => {
            const ctx = document.getElementById('incomeExpensesChart').getContext('2d');
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: data.labels,
                    datasets: [
                        {
                            label: 'Income',
                            data: data.income,
                            backgroundColor: '#2E7D32',
                            borderRadius: 2,
                            maxBarThickness: 32
                        },
                        {
                            label: 'Expenses',
                            data: data.expenses,
                            backgroundColor: '#E3001B',
                            borderRadius: 2,
                            maxBarThickness: 32
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            grid: { color: '#E0E0E0' },
                            ticks: {
                                color: '#757575',
                                callback: value => 'R' + value.toLocaleString()
                            }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { color: '#757575' }
                        }
                    },
                    plugins: {
                        legend: {
                            labels: { color: '#1c1c1c', font: { family: 'system-ui', size: 12 } }
                        }
                    }
                }
            });
        });
}


/**
 * Fetch and render spending trends per category over time.
 */
function loadSpendingTrendsChart() {
    fetch('/api/spending-trends/')
        .then(res => res.json())
        .then(data => {
            const ctx = document.getElementById('spendingTrendsChart').getContext('2d');
            
            // Adjust fill opacity for flat design
            data.datasets.forEach(ds => {
                ds.backgroundColor = 'transparent';
                ds.borderWidth = 2;
                ds.tension = 0.2; // flatter lines
            });

            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.labels,
                    datasets: data.datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            grid: { color: '#E0E0E0' },
                            ticks: {
                                color: '#757575',
                                callback: value => 'R' + value.toLocaleString()
                            }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { color: '#757575' }
                        }
                    },
                    plugins: {
                        legend: {
                            labels: { color: '#1c1c1c', font: { family: 'system-ui', size: 12 } }
                        }
                    }
                }
            });
        });
}


/**
 * Fetch and render smart guidance insights tips.
 */
function loadGuidanceTips() {
    const container = document.getElementById('guidanceContainer');
    
    fetch('/api/guidance/')
        .then(res => res.json())
        .then(data => {
            container.innerHTML = '';
            
            if (data.tips.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: hsl(var(--text-muted))">
                        No financial tips generated yet. Add more transaction logs to populate.
                    </div>
                `;
                return;
            }
            
            data.tips.forEach(tip => {
                const card = document.createElement('div');
                card.className = `tip-card border-${tip.type}`;
                card.innerHTML = `
                    <div class="tip-card-icon">${tip.icon}</div>
                    <div>
                        <div class="tip-card-title">${tip.title}</div>
                        <div class="tip-card-desc">${tip.message}</div>
                    </div>
                `;
                container.appendChild(card);
            });
        })
        .catch(err => {
            console.error('Failed to load guidance tips:', err);
            container.innerHTML = `
                <div style="text-align: center; padding: 1.5rem; color: #ef4444; font-size: 0.85rem">
                    <i class="fa-solid fa-circle-exclamation"></i> Error loading suggestions.
                </div>
            `;
        });
}

/**
 * Optional API load of summary stats
 */
function loadSummaryStats() {
    // Optional refresh mechanism can go here
}
