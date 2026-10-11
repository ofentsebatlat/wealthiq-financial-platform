/**
 * Investment Calculator Logic
 * Handles real-time projections, charts, and product defaults.
 */

let growthChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    // Initial triggers
    applyProductDefaults();
    runCalculation();
    
    // Bind form events
    const form = document.getElementById('calcForm');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        runCalculation();
        saveSimulation();
    });
});

/**
 * Sync rates and mins when user selects a linked Capitec product.
 */
function applyProductDefaults() {
    const dropdown = document.getElementById('product_id');
    const selectedOption = dropdown.options[dropdown.selectedIndex];
    
    if (selectedOption.value) {
        const rate = selectedOption.getAttribute('data-rate');
        const minVal = selectedOption.getAttribute('data-min');
        
        document.getElementById('interest_rate').value = rate;
        
        // Setup warning checks
        const minValInt = parseFloat(minVal);
        document.getElementById('minInvestWarning').style.display = 'none';
        
        const startCapital = document.getElementById('starting_amount');
        startCapital.oninput = () => {
            const inputVal = parseFloat(startCapital.value);
            const warning = document.getElementById('minInvestWarning');
            if (inputVal < minValInt) {
                document.getElementById('warnMinVal').innerText = minValInt.toLocaleString();
                warning.style.display = 'block';
            } else {
                warning.style.display = 'none';
            }
        };
        // trigger initial check
        startCapital.oninput();
    } else {
        document.getElementById('minInvestWarning').style.display = 'none';
        document.getElementById('starting_amount').oninput = null;
    }
}

/**
 * Runs compound interest logic client-side and renders Chart.js graph.
 */
function runCalculation() {
    const start = parseFloat(document.getElementById('starting_amount').value) || 0;
    const monthly = parseFloat(document.getElementById('monthly_contribution').value) || 0;
    const rate = parseFloat(document.getElementById('interest_rate').value) || 0;
    const years = parseInt(document.getElementById('years').value) || 5;

    const monthlyRate = rate / 100 / 12;
    const totalMonths = years * 12;

    let balance = start;
    let totalInvested = start;
    
    const labels = ['Start'];
    const balanceData = [start];
    const investedData = [start];

    for (let month = 1; month <= totalMonths; month++) {
        balance = balance * (1 + monthlyRate) + monthly;
        totalInvested += monthly;

        // Push yearly metrics to data points
        if (month % 12 === 0) {
            labels.push(`Year ${month / 12}`);
            balanceData.push(Math.round(balance));
            investedData.push(Math.round(totalInvested));
        }
    }

    const totalGrowth = balance - totalInvested;

    // Update metrics row displays
    document.getElementById('metricsRow').style.display = 'grid';
    document.getElementById('valInvested').innerText = `R${Math.round(totalInvested).toLocaleString()}`;
    document.getElementById('valGrowth').innerText = `R${Math.round(totalGrowth).toLocaleString()}`;
    document.getElementById('valFinal').innerText = `R${Math.round(balance).toLocaleString()}`;

    // Render chart
    const ctx = document.getElementById('growthChart').getContext('2d');
    if (growthChartInstance) {
        growthChartInstance.destroy();
    }

    growthChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Projected Balance',
                    data: balanceData,
                    borderColor: '#2E7D32',
                    backgroundColor: 'transparent',
                    fill: false,
                    tension: 0.15,
                    borderWidth: 2.5
                },
                {
                    label: 'Total Capital Invested',
                    data: investedData,
                    borderColor: '#757575',
                    backgroundColor: 'transparent',
                    borderDash: [4, 4],
                    tension: 0,
                    borderWidth: 1.5
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
}


/**
 * Optionally saves simulation results to user profile DB using fetch.
 */
function saveSimulation() {
    const dropdown = document.getElementById('product_id');
    const productVal = dropdown.value;
    if (!productVal) return; // Custom simulator logs are client-only

    const start = parseFloat(document.getElementById('starting_amount').value) || 0;
    const monthly = parseFloat(document.getElementById('monthly_contribution').value) || 0;
    const rate = parseFloat(document.getElementById('interest_rate').value) || 0;
    const years = parseInt(document.getElementById('years').value) || 5;

    // Send server-side form submission to Django to persist simulation log
    const form = document.getElementById('calcForm');
    
    // We update calculation values and allow standard form submit to save simulation log.
    // To ensure session isn't refreshed dynamically, we will let form submit standard POST
    form.submit();
}
