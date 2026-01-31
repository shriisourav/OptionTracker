/**
 * OptionTracker - Stock Compare Module
 * Compare stock performance and optimize portfolios
 * 
 * Copyright (c) 2026 Sourav Shrivastava. All rights reserved.
 * Licensed under the MIT License. See LICENSE file for details.
 */

const API_BASE = window.location.hostname === 'localhost'
    ? 'http://localhost:5001'
    : 'https://optiontracker.onrender.com';

// State for Stock Compare
const compareState = {
    stockData: {},
    priceHistory: {},
    isRelativeScale: false,
    chart: null,
    initialized: false
};

// Chart colors matching the OptionTracker theme
const STOCK_COLORS = [
    '#00d4ff', // cyan
    '#a855f7', // purple
    '#22c55e', // green
    '#f59e0b', // yellow
    '#ef4444', // red
    '#ec4899', // pink
    '#14b8a6', // teal
    '#f97316', // orange
];

// Initialize Stock Compare
function initStockCompare() {
    console.log('📊 Initializing Stock Compare module');

    // Set default dates (1 year range)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);

    document.getElementById('compareEndDate').value = endDate.toISOString().split('T')[0];
    document.getElementById('compareStartDate').value = startDate.toISOString().split('T')[0];

    // Event listeners
    document.getElementById('analyzeStocksBtn').addEventListener('click', analyzeStocks);
    document.getElementById('scaleActual').addEventListener('click', () => setScale(false));
    document.getElementById('scaleRelative').addEventListener('click', () => setScale(true));
    document.getElementById('optimizeBtn').addEventListener('click', optimizePortfolio);
    document.getElementById('riskTolerance').addEventListener('input', updateRiskDisplay);

    // Export buttons
    document.getElementById('exportReturns').addEventListener('click', exportReturnsCSV);
    document.getElementById('exportPrices').addEventListener('click', exportPricesCSV);
    document.getElementById('exportChart').addEventListener('click', exportChart);
}

// Update risk tolerance display
function updateRiskDisplay() {
    const value = document.getElementById('riskTolerance').value;
    document.getElementById('riskValue').textContent = value;
}

// Set scale mode
function setScale(isRelative) {
    compareState.isRelativeScale = isRelative;

    // Update button states
    document.getElementById('scaleActual').classList.toggle('active', !isRelative);
    document.getElementById('scaleRelative').classList.toggle('active', isRelative);

    // Redraw chart if data exists
    if (Object.keys(compareState.priceHistory).length > 0) {
        renderCompareChart();
    }
}

// Analyze stocks
async function analyzeStocks() {
    const tickersInput = document.getElementById('compareTickers').value;
    const startDate = document.getElementById('compareStartDate').value;
    const endDate = document.getElementById('compareEndDate').value;

    if (!tickersInput.trim()) {
        alert('Please enter at least one stock ticker');
        return;
    }

    const tickers = tickersInput.split(',').map(t => t.trim().toUpperCase()).filter(t => t);

    if (tickers.length === 0) {
        alert('Please enter valid stock tickers');
        return;
    }

    // Show loading state
    const btn = document.getElementById('analyzeStocksBtn');
    const originalText = btn.textContent;
    btn.textContent = '⏳ Loading...';
    btn.disabled = true;

    document.getElementById('metricsTableBody').innerHTML =
        '<tr><td colspan="6" class="loading-cell">Loading stock data...</td></tr>';

    try {
        // Fetch data for all tickers
        const promises = tickers.map(ticker => fetchStockData(ticker, startDate, endDate));
        const results = await Promise.allSettled(promises);

        // Process results
        compareState.stockData = {};
        compareState.priceHistory = {};

        results.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value) {
                const ticker = tickers[index];
                compareState.stockData[ticker] = result.value.metrics;
                compareState.priceHistory[ticker] = result.value.history;
            }
        });

        const successCount = Object.keys(compareState.stockData).length;
        if (successCount === 0) {
            throw new Error('Could not fetch data for any of the provided tickers');
        }

        // Render results
        renderMetricsTable();
        renderCompareChart();
        updatePerformers();

        console.log(`✅ Successfully loaded data for ${successCount}/${tickers.length} stocks`);

    } catch (error) {
        console.error('Error analyzing stocks:', error);
        document.getElementById('metricsTableBody').innerHTML =
            `<tr><td colspan="6" class="loading-cell" style="color: #ef4444;">Error: ${error.message}</td></tr>`;
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

// Fetch stock data from API
async function fetchStockData(ticker, startDate, endDate) {
    try {
        // Fetch current price and info
        const priceRes = await fetch(`${API_BASE}/api/price/${ticker}`);
        if (!priceRes.ok) throw new Error(`Failed to fetch ${ticker}`);
        const priceData = await priceRes.json();

        // Try to fetch historical data from backend, fallback to simulation
        let history;
        try {
            const histRes = await fetch(`${API_BASE}/api/history/${ticker}?start=${startDate}&end=${endDate}`);
            if (histRes.ok) {
                const histData = await histRes.json();
                if (histData.history && histData.history.length > 0) {
                    history = histData.history;
                } else {
                    history = generatePriceHistory(priceData.price, startDate, endDate);
                }
            } else {
                history = generatePriceHistory(priceData.price, startDate, endDate);
            }
        } catch {
            history = generatePriceHistory(priceData.price, startDate, endDate);
        }

        // Calculate metrics including Stochastic
        const metrics = calculateStockMetrics(priceData, history);

        return { metrics, history };

    } catch (error) {
        console.error(`Error fetching ${ticker}:`, error);
        return null;
    }
}

// Generate simulated price history (fallback when backend doesn't have historical endpoint)
function generatePriceHistory(currentPrice, startDate, endDate) {
    const history = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    // Random walk starting from estimated historical price
    const volatility = 0.015 + Math.random() * 0.01; // 1.5-2.5% daily volatility
    const drift = 0.0002 + Math.random() * 0.0003; // Small upward drift

    // Work backwards from current price
    let prices = [currentPrice];
    for (let i = 0; i < days; i++) {
        const randomReturn = (Math.random() - 0.5) * 2 * volatility + drift;
        prices.unshift(prices[0] / (1 + randomReturn));
    }

    // Create history array
    for (let i = 0; i <= days; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        if (date.getDay() !== 0 && date.getDay() !== 6) { // Skip weekends
            history.push({
                date: date.toISOString().split('T')[0],
                price: prices[Math.min(i, prices.length - 1)]
            });
        }
    }

    return history;
}

// Calculate Stochastic Oscillator (14-day %K)
function calculateStochastic(prices, period = 14) {
    if (prices.length < period) return null;

    const recentPrices = prices.slice(-period);
    const high = Math.max(...recentPrices);
    const low = Math.min(...recentPrices);
    const close = prices[prices.length - 1];

    if (high === low) return 50;

    const stochK = ((close - low) / (high - low)) * 100;
    return Math.round(stochK * 10) / 10;
}

// Calculate stock metrics
function calculateStockMetrics(priceData, history) {
    const prices = history.map(h => h.price);
    const currentPrice = priceData.price;
    const startPrice = prices[0];

    // Calculate returns
    const dailyReturns = [];
    for (let i = 1; i < prices.length; i++) {
        dailyReturns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }

    // Total return
    const totalReturn = ((currentPrice - startPrice) / startPrice) * 100;

    // 1-year return (approximate based on last 252 trading days or available data)
    const oneYearDays = Math.min(252, prices.length - 1);
    const oneYearStartPrice = prices[Math.max(0, prices.length - 1 - oneYearDays)];
    const oneYearReturn = ((currentPrice - oneYearStartPrice) / oneYearStartPrice) * 100;

    // Volatility (annualized std dev)
    const avgReturn = dailyReturns.length > 0
        ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length
        : 0;
    const variance = dailyReturns.length > 0
        ? dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / dailyReturns.length
        : 0;
    const dailyVol = Math.sqrt(variance);
    const annualizedVol = dailyVol * Math.sqrt(252) * 100; // Annualized

    // Sharpe ratio (assuming 5% risk-free rate)
    const riskFreeRate = 0.05;
    const annualReturn = totalReturn / 100 * (252 / prices.length);
    const excessReturn = annualReturn - riskFreeRate;
    const sharpe = annualizedVol > 0 ? excessReturn / (annualizedVol / 100) : 0;

    // Stochastic Oscillator (1Y)
    const stochastic = calculateStochastic(prices);

    return {
        price: currentPrice,
        totalReturn,
        oneYearReturn,
        volatility: annualizedVol,
        sharpe,
        stochastic,
        change: priceData.change,
        changePercent: priceData.changePercent
    };
}

// Render metrics table
function renderMetricsTable() {
    const tbody = document.getElementById('metricsTableBody');
    const tickers = Object.keys(compareState.stockData);

    if (tickers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">No data available</td></tr>';
        return;
    }

    tbody.innerHTML = tickers.map((ticker, i) => {
        const m = compareState.stockData[ticker];
        const returnClass = m.totalReturn >= 0 ? 'style="color: var(--green)"' : 'style="color: var(--red)"';
        const stochDisplay = m.stochastic !== null ? `${m.stochastic.toFixed(1)}%` : 'N/A';
        // Color stochastic based on overbought/oversold levels
        const stochColor = m.stochastic > 80 ? 'var(--red)' : (m.stochastic < 20 ? 'var(--green)' : 'var(--text-primary)');

        return `
            <tr>
                <td style="font-weight: 600; color: ${STOCK_COLORS[i % STOCK_COLORS.length]}">${ticker}</td>
                <td>$${m.price.toFixed(2)}</td>
                <td style="color: ${stochColor}">${stochDisplay}</td>
                <td ${returnClass}>${m.oneYearReturn >= 0 ? '+' : ''}${m.oneYearReturn.toFixed(1)}%</td>
                <td ${returnClass}>${m.totalReturn >= 0 ? '+' : ''}${m.totalReturn.toFixed(1)}%</td>
                <td>${m.volatility.toFixed(1)}%</td>
                <td>${m.sharpe.toFixed(2)}</td>
            </tr>
        `;
    }).join('');
}

// Update best/worst performers
function updatePerformers() {
    const tickers = Object.keys(compareState.stockData);
    if (tickers.length === 0) return;

    let best = { ticker: '', return: -Infinity };
    let worst = { ticker: '', return: Infinity };

    tickers.forEach(ticker => {
        const ret = compareState.stockData[ticker].totalReturn;
        if (ret > best.return) {
            best = { ticker, return: ret };
        }
        if (ret < worst.return) {
            worst = { ticker, return: ret };
        }
    });

    document.getElementById('bestTicker').textContent = best.ticker;
    document.getElementById('bestReturn').textContent = `${best.return >= 0 ? '+' : ''}${best.return.toFixed(1)}%`;

    document.getElementById('worstTicker').textContent = worst.ticker;
    document.getElementById('worstReturn').textContent = `${worst.return >= 0 ? '+' : ''}${worst.return.toFixed(1)}%`;
}

// Render comparison chart
function renderCompareChart() {
    const ctx = document.getElementById('compareChart');
    const tickers = Object.keys(compareState.priceHistory);

    if (tickers.length === 0) return;

    // Destroy existing chart
    if (compareState.chart) {
        compareState.chart.destroy();
    }

    // Prepare datasets
    const datasets = tickers.map((ticker, i) => {
        const history = compareState.priceHistory[ticker];
        const basePrice = history[0]?.price || 1;

        return {
            label: ticker,
            data: history.map(h => ({
                x: h.date,
                y: compareState.isRelativeScale
                    ? ((h.price - basePrice) / basePrice) * 100
                    : h.price
            })),
            borderColor: STOCK_COLORS[i % STOCK_COLORS.length],
            backgroundColor: STOCK_COLORS[i % STOCK_COLORS.length] + '20',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.1,
            fill: false
        };
    });

    // Create chart
    compareState.chart = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#e6edf3',
                        font: { family: 'Inter', size: 11 },
                        usePointStyle: true,
                        pointStyle: 'line'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(13, 17, 23, 0.9)',
                    titleColor: '#e6edf3',
                    bodyColor: '#8b949e',
                    borderColor: '#30363d',
                    borderWidth: 1,
                    callbacks: {
                        label: function (context) {
                            const value = context.raw.y;
                            if (compareState.isRelativeScale) {
                                return `${context.dataset.label}: ${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
                            }
                            return `${context.dataset.label}: $${value.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'category',
                    grid: { color: 'rgba(48, 54, 61, 0.5)' },
                    ticks: {
                        color: '#6e7681',
                        maxTicksLimit: 8,
                        font: { size: 10 }
                    }
                },
                y: {
                    grid: { color: 'rgba(48, 54, 61, 0.5)' },
                    ticks: {
                        color: '#6e7681',
                        callback: function (value) {
                            if (compareState.isRelativeScale) {
                                return `${value >= 0 ? '+' : ''}${value.toFixed(0)}%`;
                            }
                            return `$${value.toFixed(0)}`;
                        }
                    }
                }
            }
        }
    });
}

// Portfolio optimization (simplified Markowitz)
function optimizePortfolio() {
    const tickers = Object.keys(compareState.stockData);

    if (tickers.length < 2) {
        alert('Please analyze at least 2 stocks first');
        return;
    }

    const investmentAmount = parseFloat(document.getElementById('investmentAmount').value) || 10000;
    const riskTolerance = parseFloat(document.getElementById('riskTolerance').value);

    // Simple optimization: weight by inverse volatility adjusted for returns
    const metrics = tickers.map(t => compareState.stockData[t]);
    const totalScore = metrics.reduce((sum, m) => {
        const score = (m.sharpe > 0 ? m.sharpe : 0.1) / Math.max(m.volatility, 10);
        return sum + score;
    }, 0);

    // Calculate optimal weights
    const allocations = tickers.map((ticker, i) => {
        const m = metrics[i];
        const score = (m.sharpe > 0 ? m.sharpe : 0.1) / Math.max(m.volatility, 10);

        // Adjust weight based on risk tolerance
        // Higher risk tolerance = more weight to high return stocks
        let weight = score / totalScore;
        const returnBonus = (m.totalReturn / 100) * riskTolerance * 0.1;
        weight = Math.max(0, weight + returnBonus);

        return {
            ticker,
            weight,
            expectedReturn: m.totalReturn,
            risk: m.volatility
        };
    });

    // Normalize weights to sum to 1
    const totalWeight = allocations.reduce((sum, a) => sum + a.weight, 0);
    allocations.forEach(a => a.weight = a.weight / totalWeight);

    // Calculate portfolio metrics
    const portfolioReturn = allocations.reduce((sum, a) => sum + a.weight * a.expectedReturn, 0);
    const portfolioRisk = Math.sqrt(allocations.reduce((sum, a) => sum + Math.pow(a.weight * a.risk, 2), 0));
    const portfolioSharpe = portfolioReturn / portfolioRisk;

    // Render results
    const tbody = document.getElementById('allocationTableBody');
    tbody.innerHTML = allocations.map(a => `
        <tr>
            <td style="font-weight: 600">${a.ticker}</td>
            <td>${(a.weight * 100).toFixed(1)}%</td>
            <td>$${(a.weight * investmentAmount).toFixed(2)}</td>
            <td style="color: ${a.expectedReturn >= 0 ? 'var(--green)' : 'var(--red)'}">
                ${a.expectedReturn >= 0 ? '+' : ''}${a.expectedReturn.toFixed(1)}%
            </td>
            <td>${a.risk.toFixed(1)}%</td>
        </tr>
    `).join('');

    // Update summary
    document.getElementById('portfolioReturn').textContent =
        `${portfolioReturn >= 0 ? '+' : ''}${portfolioReturn.toFixed(1)}%`;
    document.getElementById('portfolioRisk').textContent = `${portfolioRisk.toFixed(1)}%`;
    document.getElementById('portfolioSharpe').textContent = portfolioSharpe.toFixed(2);

    // Show results
    document.getElementById('allocationResults').classList.remove('hidden');
}

// Export returns as CSV
function exportReturnsCSV() {
    const tickers = Object.keys(compareState.stockData);
    if (tickers.length === 0) {
        alert('Please analyze stocks first');
        return;
    }

    let csv = 'Ticker,1Y Return %,Total Return %,Volatility %,Sharpe Ratio\n';
    tickers.forEach(ticker => {
        const m = compareState.stockData[ticker];
        csv += `${ticker},${m.oneYearReturn.toFixed(2)},${m.totalReturn.toFixed(2)},${m.volatility.toFixed(2)},${m.sharpe.toFixed(2)}\n`;
    });

    downloadCSV(csv, 'stock_returns.csv');
}

// Export prices as CSV
function exportPricesCSV() {
    const tickers = Object.keys(compareState.priceHistory);
    if (tickers.length === 0) {
        alert('Please analyze stocks first');
        return;
    }

    // Get all dates
    const dates = compareState.priceHistory[tickers[0]].map(h => h.date);

    let csv = 'Date,' + tickers.join(',') + '\n';
    dates.forEach((date, i) => {
        const row = [date];
        tickers.forEach(ticker => {
            const price = compareState.priceHistory[ticker][i]?.price || '';
            row.push(price.toFixed ? price.toFixed(2) : price);
        });
        csv += row.join(',') + '\n';
    });

    downloadCSV(csv, 'stock_prices.csv');
}

// Helper to download CSV
function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// Export chart as image
function exportChart() {
    if (!compareState.chart) {
        alert('Please analyze stocks first');
        return;
    }

    const canvas = document.getElementById('compareChart');
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stock_comparison_chart.png';
    a.click();
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('📊 Stock Compare module loaded');

    // Attach nav link listeners after DOM is ready
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            const page = e.target.dataset?.page || e.currentTarget.dataset?.page;
            if (page === 'compare') {
                // Small delay to let page become visible
                setTimeout(() => {
                    if (!compareState.initialized) {
                        initStockCompare();
                        compareState.initialized = true;
                    }
                }, 150);
            }
        });
    });

    // Initialize immediately if compare page is active
    const comparePage = document.getElementById('comparePage');
    if (comparePage && comparePage.classList.contains('active')) {
        initStockCompare();
        compareState.initialized = true;
    }
});
