// OptionTracker - Main Application
// Complete rewrite with robust P/L Calculator

// ============================================
// API Configuration
// ============================================
const RENDER_BACKEND_URL = 'https://optiontracker.onrender.com';
const API_BASE = window.location.hostname === 'localhost' || window.location.protocol === 'file:'
    ? 'http://localhost:5001/api'
    : `${RENDER_BACKEND_URL}/api`;

// ============================================
// Stock Data
// ============================================
const STOCKS = [
    { ticker: 'MSFT', name: 'Microsoft Corporation' },
    { ticker: 'AAPL', name: 'Apple Inc.' },
    { ticker: 'GOOGL', name: 'Alphabet Inc.' },
    { ticker: 'AMZN', name: 'Amazon.com Inc.' },
    { ticker: 'TSLA', name: 'Tesla Inc.' },
    { ticker: 'NVDA', name: 'NVIDIA Corporation' },
    { ticker: 'META', name: 'Meta Platforms Inc.' },
    { ticker: 'AMD', name: 'Advanced Micro Devices' },
    { ticker: 'SPY', name: 'SPDR S&P 500 ETF' },
    { ticker: 'QQQ', name: 'Invesco QQQ Trust' },
    { ticker: 'JPM', name: 'JPMorgan Chase' },
    { ticker: 'NFLX', name: 'Netflix Inc.' }
];

// ============================================
// Application State
// ============================================
const state = {
    ticker: 'MSFT',
    stockData: {},
    currentPrice: 0,
    mode: 'date',
    optionType: 'calls',
    contractQty: 1,
    chainData: [],
    selectedDate: null,
    selectedStrike: null,
    selectedData: null,
    comparisonData: null,
    chartInstance: null,
    watchlist: [],
    currentPage: 'options',
    // P/L Calculator state - isolated to prevent stale data
    plCalculator: {
        lastCalcTime: 0,
        isCalculating: false
    }
};

// DOM Elements cache
const el = {};

// ============================================
// Initialization
// ============================================
document.addEventListener('DOMContentLoaded', init);

function init() {
    cacheElements();
    setupEventListeners();
    loadWatchlistFromStorage();
    el.tickerInput.value = state.ticker;
    loadStock(state.ticker);
}

function cacheElements() {
    const ids = [
        'tickerInput', 'autocomplete', 'stockTicker', 'stockName', 'stockPrice', 'stockChange',
        'prevClose', 'dayRange', 'weekRange', 'volume', 'marketCap', 'peRatio', 'divYield',
        'divRate', 'beta', 'overviewTab', 'fundamentalsTab', 'dateCount', 'datesList',
        'atmStrike', 'strikesContainer', 'priceModeBtn', 'dateModeBtn', 'optionType',
        'contractLabel', 'chartTitle', 'chartLegend', 'priceChart', 'factorsContent',
        'greeksContent', 'infoBid', 'infoMid', 'infoAsk', 'infoSpread', 'infoIV', 'infoVol',
        'infoOI', 'infoChg', 'greekDelta', 'greekGamma', 'greekTheta', 'greekVega',
        'greekRho', 'greekOmega', 'contractQty', 'premiumPer', 'totalCost', 'maxLoss',
        'breakeven', 'targetPrice', 'targetDate', 'calculatePL', 'plResults', 'optionValue',
        'costBasis', 'profitLoss', 'returnPct', 'loadingOverlay', 'addWatchlistBtn',
        'watchlistItems', 'watchlistEmpty'
    ];
    ids.forEach(id => { el[id] = document.getElementById(id); });
}

function setupEventListeners() {
    // Ticker search
    el.tickerInput?.addEventListener('input', handleTickerInput);
    el.tickerInput?.addEventListener('focus', () => renderAutocomplete(STOCKS));
    el.tickerInput?.addEventListener('blur', () => setTimeout(() => el.autocomplete?.classList.add('hidden'), 200));
    el.tickerInput?.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            el.autocomplete?.classList.add('hidden');
            loadStock(el.tickerInput.value.toUpperCase());
        }
    });

    // Stock info tabs
    document.querySelectorAll('.stock-tab').forEach(tab => {
        tab.addEventListener('click', () => switchStockTab(tab.dataset.tab));
    });

    // Mode toggle
    el.priceModeBtn?.addEventListener('click', () => setMode('strike'));
    el.dateModeBtn?.addEventListener('click', () => setMode('date'));

    // Option type
    el.optionType?.addEventListener('change', e => {
        state.optionType = e.target.value;
        resetPLResults();
        loadFullChain();
    });

    // Info tabs
    document.querySelectorAll('.info-tab').forEach(tab => {
        tab.addEventListener('click', () => switchInfoTab(tab.dataset.info));
    });

    // Contract quantity
    el.contractQty?.addEventListener('input', () => {
        updateCalculator();
        resetPLResults();
    });

    // P/L Calculator - NEW: Uses dedicated calculate function
    el.calculatePL?.addEventListener('click', handleCalculatePL);

    // Reset P/L when target price changes
    el.targetPrice?.addEventListener('input', resetPLResults);

    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            navigateTo(link.dataset.page);
        });
    });

    // Watchlist
    el.addWatchlistBtn?.addEventListener('click', toggleWatchlist);
}

// ============================================
// P/L Calculator - FRESH IMPLEMENTATION
// ============================================

function resetPLResults() {
    el.plResults?.classList.add('hidden');
}

function handleCalculatePL() {
    // Prevent double-clicks
    if (state.plCalculator.isCalculating) {
        console.log('P/L calculation already in progress');
        return;
    }

    // Debounce - prevent rapid calculations
    const now = Date.now();
    if (now - state.plCalculator.lastCalcTime < 300) {
        console.log('P/L calculation debounced');
        return;
    }

    state.plCalculator.isCalculating = true;
    state.plCalculator.lastCalcTime = now;

    try {
        calculatePL();
    } finally {
        state.plCalculator.isCalculating = false;
    }
}

function calculatePL() {
    // Step 1: Get current contract data FRESH from chain
    const currentDate = state.selectedDate;
    const currentStrike = state.selectedStrike;
    const currentType = state.optionType;

    if (!currentDate || !currentStrike) {
        showPLError('Please select an expiration date and strike price first');
        return;
    }

    // Find the date in chain
    const dateData = state.chainData.find(d => d.date === currentDate);
    if (!dateData) {
        showPLError('Selected date not found in options chain');
        return;
    }

    // Find the strike in that date
    const contractData = dateData.strikes.find(s => s.strike === currentStrike);
    if (!contractData) {
        showPLError('Selected strike not found for this date');
        return;
    }

    // Step 2: Get input values
    const targetPriceStr = el.targetPrice?.value || '';
    const targetPrice = targetPriceStr ? parseFloat(targetPriceStr) : state.currentPrice;

    if (isNaN(targetPrice) || targetPrice < 0) {
        showPLError('Please enter a valid target price');
        return;
    }

    const qty = Math.max(1, parseInt(el.contractQty?.value) || 1);
    const mid = contractData.mid || 0;
    const strike = currentStrike;

    if (mid <= 0) {
        showPLError('No valid price data for this contract');
        return;
    }

    // Step 3: Calculate P/L
    // Cost = mid price × 100 shares × quantity
    const costPerContract = mid * 100;
    const totalCost = costPerContract * qty;

    // Intrinsic value at target price
    let intrinsicValue = 0;
    if (currentType === 'calls') {
        // Call: value = max(0, target - strike)
        intrinsicValue = Math.max(0, targetPrice - strike);
    } else {
        // Put: value = max(0, strike - target)
        intrinsicValue = Math.max(0, strike - targetPrice);
    }

    // Option value = intrinsic × 100 × qty
    const optionValueAtTarget = intrinsicValue * 100 * qty;

    // Profit/Loss = Option Value - Cost
    const profitLoss = optionValueAtTarget - totalCost;

    // Return percentage
    const returnPct = totalCost > 0 ? (profitLoss / totalCost) * 100 : 0;

    // Step 4: Display results
    displayPLResults({
        optionValue: optionValueAtTarget,
        cost: totalCost,
        pl: profitLoss,
        returnPct: returnPct,
        // Debug info
        ticker: state.ticker,
        strike: strike,
        type: currentType,
        date: currentDate,
        mid: mid,
        qty: qty,
        targetPrice: targetPrice
    });

    // Log for debugging
    console.log('========== P/L CALCULATION ==========');
    console.log(`Contract: ${state.ticker} $${strike}${currentType === 'calls' ? 'C' : 'P'} exp ${currentDate}`);
    console.log(`Mid Price: $${mid.toFixed(2)} per share`);
    console.log(`Quantity: ${qty} contract(s)`);
    console.log(`Total Cost: $${totalCost.toFixed(2)}`);
    console.log(`Target Price: $${targetPrice.toFixed(2)}`);
    console.log(`Intrinsic Value: $${intrinsicValue.toFixed(2)} per share`);
    console.log(`Option Value at Target: $${optionValueAtTarget.toFixed(2)}`);
    console.log(`Profit/Loss: ${profitLoss >= 0 ? '+' : ''}$${profitLoss.toFixed(2)} (${returnPct.toFixed(1)}%)`);
    console.log('=====================================');
}

function displayPLResults(data) {
    if (el.optionValue) {
        el.optionValue.textContent = `$${data.optionValue.toFixed(2)}`;
    }

    if (el.costBasis) {
        el.costBasis.textContent = `$${data.cost.toFixed(2)}`;
    }

    if (el.profitLoss) {
        const sign = data.pl >= 0 ? '+' : '';
        el.profitLoss.textContent = `${sign}$${data.pl.toFixed(2)}`;
        el.profitLoss.className = data.pl >= 0 ? 'green' : 'red';
    }

    if (el.returnPct) {
        const sign = data.returnPct >= 0 ? '+' : '';
        el.returnPct.textContent = `${sign}${data.returnPct.toFixed(1)}%`;
        el.returnPct.className = data.returnPct >= 0 ? 'green' : 'red';
    }

    // Update highlight row color
    const highlightRow = el.plResults?.querySelector('.calc-row.highlight');
    if (highlightRow) {
        highlightRow.classList.remove('profit', 'loss');
        highlightRow.classList.add(data.pl >= 0 ? 'profit' : 'loss');
    }

    el.plResults?.classList.remove('hidden');
}

function showPLError(message) {
    console.warn('P/L Calculator:', message);
    alert(message);
}

// ============================================
// Navigation
// ============================================
function navigateTo(page) {
    state.currentPage = page;
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.page === page);
    });
    document.querySelectorAll('.page-content').forEach(p => {
        p.classList.toggle('active', p.id === `${page}Page`);
    });
    if (page === 'watchlist') renderWatchlist();
}

// ============================================
// Ticker Search
// ============================================
function handleTickerInput(e) {
    const value = e.target.value.toUpperCase();
    const matches = STOCKS.filter(s =>
        s.ticker.includes(value) || s.name.toLowerCase().includes(value.toLowerCase())
    );
    renderAutocomplete(matches.length ? matches : STOCKS);
}

function renderAutocomplete(matches) {
    el.autocomplete.innerHTML = matches.slice(0, 10).map(s => `
        <div class="autocomplete-item" data-ticker="${s.ticker}" data-name="${s.name}">
            <span class="autocomplete-ticker">${s.ticker}</span>
            <span class="autocomplete-name">${s.name}</span>
        </div>
    `).join('');
    el.autocomplete.classList.remove('hidden');
    el.autocomplete.querySelectorAll('.autocomplete-item').forEach(item => {
        item.addEventListener('click', () => {
            el.tickerInput.value = item.dataset.ticker;
            el.autocomplete.classList.add('hidden');
            loadStock(item.dataset.ticker);
        });
    });
}

// ============================================
// Stock Loading
// ============================================
async function loadStock(ticker) {
    if (!ticker) return;
    state.ticker = ticker.toUpperCase();
    showLoading(true);
    resetPLResults();

    try {
        const res = await fetch(`${API_BASE}/price/${ticker}`);
        const data = await res.json();

        if (data.error) throw new Error(data.error);

        state.stockData = data;
        state.currentPrice = data.price;

        updateStockDisplay();
        await loadFullChain();
        updateWatchlistButton();

    } catch (e) {
        console.error('Error loading stock:', e);
        showLoading(false);
    }
}

function updateStockDisplay() {
    const d = state.stockData;

    if (el.stockTicker) el.stockTicker.textContent = d.ticker || state.ticker;
    if (el.stockName) el.stockName.textContent = d.name || state.ticker;
    if (el.stockPrice) el.stockPrice.textContent = `$${d.price?.toFixed(2) || '0.00'}`;

    const change = d.change || 0;
    const changePct = d.changePercent || 0;
    if (el.stockChange) {
        el.stockChange.textContent = `${change >= 0 ? '+' : ''}$${change.toFixed(2)} (${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%)`;
        el.stockChange.className = `stock-change ${change >= 0 ? 'positive' : 'negative'}`;
    }

    if (el.prevClose) el.prevClose.textContent = `$${d.previousClose?.toFixed(2) || '-'}`;
    if (el.dayRange) el.dayRange.textContent = `$${d.fiftyTwoWeekLow?.toFixed(0) || '-'} - $${d.fiftyTwoWeekHigh?.toFixed(0) || '-'}`;
    if (el.weekRange) el.weekRange.textContent = `$${d.fiftyTwoWeekLow?.toFixed(0) || '-'} - $${d.fiftyTwoWeekHigh?.toFixed(0) || '-'}`;
    if (el.volume) el.volume.textContent = formatNum(d.volume);

    if (el.marketCap) el.marketCap.textContent = formatMarketCap(d.marketCap);
    if (el.peRatio) el.peRatio.textContent = d.peRatio?.toFixed(1) || '-';
    if (el.divYield) el.divYield.textContent = d.dividendYield ? `${(d.dividendYield * 100).toFixed(2)}%` : '-';
    if (el.divRate) el.divRate.textContent = d.dividendRate ? `$${d.dividendRate.toFixed(2)}` : '-';
    if (el.beta) el.beta.textContent = d.beta?.toFixed(2) || '-';
}

// ============================================
// Options Chain
// ============================================
async function loadFullChain() {
    showLoading(true);
    resetPLResults();

    try {
        const res = await fetch(`${API_BASE}/chain/${state.ticker}?type=${state.optionType}`);
        const data = await res.json();

        if (data.error) throw new Error(data.error);

        state.chainData = data.chain || [];
        state.currentPrice = data.currentPrice;

        renderDatesList();
        populateTargetDates();

        if (state.chainData.length > 0) {
            selectDate(state.chainData[0].date);
        }

    } catch (e) {
        console.error('Error loading chain:', e);
    } finally {
        showLoading(false);
    }
}

function renderDatesList() {
    if (el.dateCount) el.dateCount.textContent = state.chainData.length;

    if (el.datesList) {
        el.datesList.innerHTML = state.chainData.map(d => {
            const daysLeft = Math.ceil((new Date(d.date) - new Date()) / (1000 * 60 * 60 * 24));
            return `
                <div class="date-item ${d.date === state.selectedDate ? 'active' : ''}" data-date="${d.date}">
                    <span>${formatDate(d.date)}</span>
                    <span class="days-left">${daysLeft}d</span>
                </div>
            `;
        }).join('');

        el.datesList.querySelectorAll('.date-item').forEach(item => {
            item.addEventListener('click', () => selectDate(item.dataset.date));
        });
    }
}

function selectDate(date) {
    state.selectedDate = date;
    resetPLResults();

    el.datesList?.querySelectorAll('.date-item').forEach(item => {
        item.classList.toggle('active', item.dataset.date === date);
    });

    const dateData = state.chainData.find(d => d.date === date);
    if (dateData) {
        renderStrikesCentered(dateData.strikes);
        const atm = findATM(dateData.strikes);
        if (atm) {
            if (el.atmStrike) el.atmStrike.textContent = `$${atm.strike}`;
            selectStrike(atm.strike);
        }
    }

    updateWatchlistButton();
}

function renderStrikesCentered(strikes) {
    const sorted = [...strikes].sort((a, b) => a.strike - b.strike);

    if (el.strikesContainer) {
        el.strikesContainer.innerHTML = sorted.map(s => {
            const isATM = Math.abs(s.strike - state.currentPrice) < (sorted[1]?.strike - sorted[0]?.strike || 5);
            const isITM = state.optionType === 'calls' ? s.strike < state.currentPrice : s.strike > state.currentPrice;
            const typeLabel = isATM ? 'ATM' : (isITM ? 'ITM' : 'OTM');
            const typeClass = isATM ? 'atm-tag' : (isITM ? 'itm' : 'otm');

            return `
                <div class="strike-item ${s.strike === state.selectedStrike ? 'selected' : ''} ${isATM ? 'atm' : ''}" 
                     data-strike="${s.strike}">
                    <span class="strike-price">$${s.strike}</span>
                    <span class="strike-mid">$${s.mid.toFixed(2)}</span>
                    <span class="strike-type ${typeClass}">${typeLabel}</span>
                </div>
            `;
        }).join('');

        setTimeout(() => {
            const atmEl = el.strikesContainer.querySelector('.atm');
            if (atmEl) atmEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }, 100);

        el.strikesContainer.querySelectorAll('.strike-item').forEach(item => {
            item.addEventListener('click', () => selectStrike(parseFloat(item.dataset.strike)));
        });
    }
}

async function selectStrike(strike) {
    state.selectedStrike = strike;
    resetPLResults();

    el.strikesContainer?.querySelectorAll('.strike-item').forEach(item => {
        item.classList.toggle('selected', parseFloat(item.dataset.strike) === strike);
    });

    const dateData = state.chainData.find(d => d.date === state.selectedDate);
    state.selectedData = dateData?.strikes.find(s => s.strike === strike);

    if (state.selectedData) {
        updateFactorsDisplay();
        updateCalculator();
        if (el.contractLabel) {
            el.contractLabel.textContent = `$${strike}${state.optionType === 'calls' ? 'C' : 'P'} ${formatDateShort(state.selectedDate)}`;
        }
    }

    await loadComparison();
    updateChart();
    updateWatchlistButton();
}

async function loadComparison() {
    const endpoint = state.mode === 'date' ? 'compare/date' : 'compare/strike';

    try {
        const res = await fetch(`${API_BASE}/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ticker: state.ticker,
                date: state.selectedDate,
                strike: state.selectedStrike,
                option_type: state.optionType
            })
        });
        const data = await res.json();
        if (!data.error) state.comparisonData = data;
    } catch (e) {
        console.error('Error:', e);
    }
}

// ============================================
// Chart
// ============================================
function updateChart() {
    const ctx = el.priceChart?.getContext('2d');
    if (!ctx) return;

    if (state.chartInstance) state.chartInstance.destroy();
    if (!state.comparisonData?.series) return;

    const series = state.comparisonData.series;
    const labels = generateMonthYearLabels();

    const colors = { before: '#a855f7', below: '#a855f7', target: '#00d4ff', after: '#22c55e', above: '#22c55e' };

    const datasets = [];
    let allData = [];
    const legendItems = [];

    series.forEach((s, idx) => {
        const color = colors[s.position] || colors.target;
        const data = generatePricePath(s.data.mid, idx);
        allData = allData.concat(data);

        let label = state.mode === 'strike' ? `$${s.data.strike}` : formatDateShort(s.date || s.label);

        datasets.push({
            label, data, borderColor: color, backgroundColor: 'transparent',
            borderWidth: s.position === 'target' ? 3 : 2, tension: 0.4, pointRadius: 0
        });

        const colorClass = s.position === 'target' ? 'cyan' : (s.position === 'before' || s.position === 'below') ? 'purple' : 'green';
        legendItems.push(`<div class="legend-item"><span class="legend-color ${colorClass}"></span>${label}</div>`);
    });

    const maxValue = Math.max(...allData);
    legendItems.push(`<div class="legend-item"><span class="legend-color max"></span>Max</div>`);

    if (el.chartLegend) el.chartLegend.innerHTML = legendItems.join('');
    if (el.chartTitle) el.chartTitle.textContent = `Price Comparison: ±1 ${state.mode === 'strike' ? 'Strike' : 'Date'}`;

    state.chartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { intersect: false, mode: 'index' },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(13, 17, 23, 0.95)', titleColor: '#00d4ff', bodyColor: '#e6edf3',
                    callbacks: { label: ctx => `${ctx.dataset.label}: $${ctx.parsed.y.toFixed(2)}` }
                },
                annotation: {
                    annotations: {
                        maxLine: {
                            type: 'line', yMin: maxValue, yMax: maxValue,
                            borderColor: '#f59e0b', borderWidth: 2, borderDash: [6, 4],
                            label: {
                                display: true, content: `Max: $${maxValue.toFixed(2)}`, position: 'end',
                                backgroundColor: '#f59e0b', color: '#0d1117', font: { size: 11, weight: 'bold' }
                            }
                        }
                    }
                }
            },
            scales: {
                x: { grid: { color: '#21262d' }, ticks: { color: '#6e7681', font: { size: 11 } } },
                y: { grid: { color: '#21262d' }, ticks: { color: '#6e7681', font: { size: 11 }, callback: v => '$' + v.toFixed(1) } }
            }
        }
    });
}

// ============================================
// Factors & Calculator Display
// ============================================
function updateFactorsDisplay() {
    const s = state.selectedData;
    if (!s) return;

    if (el.infoBid) el.infoBid.textContent = `$${(s.bid || 0).toFixed(2)}`;
    if (el.infoMid) el.infoMid.textContent = `$${(s.mid || 0).toFixed(2)}`;
    if (el.infoAsk) el.infoAsk.textContent = `$${(s.ask || 0).toFixed(2)}`;
    if (el.infoSpread) el.infoSpread.textContent = `$${((s.ask || 0) - (s.bid || 0)).toFixed(2)}`;
    if (el.infoIV) el.infoIV.textContent = `${((s.impliedVolatility || 0) * 100).toFixed(0)}%`;
    if (el.infoVol) el.infoVol.textContent = formatNum(s.volume);
    if (el.infoOI) el.infoOI.textContent = formatNum(s.openInterest);

    const chg = s.percentChange || 0;
    if (el.infoChg) {
        el.infoChg.textContent = `${chg >= 0 ? '+' : ''}${chg.toFixed(1)}%`;
        el.infoChg.className = `card-value ${chg >= 0 ? 'green' : 'red'}`;
    }

    // Greeks (estimated values)
    const delta = state.optionType === 'calls' ? 0.52 : -0.48;
    if (el.greekDelta) el.greekDelta.textContent = delta.toFixed(2);
    if (el.greekGamma) el.greekGamma.textContent = '0.03';
    if (el.greekTheta) { el.greekTheta.textContent = '-0.05'; el.greekTheta.className = 'card-value red'; }
    if (el.greekVega) el.greekVega.textContent = '0.15';
    if (el.greekRho) el.greekRho.textContent = '0.08';
    if (el.greekOmega) el.greekOmega.textContent = (delta * state.currentPrice / (s.mid || 1)).toFixed(1);
}

function updateCalculator() {
    state.contractQty = parseInt(el.contractQty?.value) || 1;
    const s = state.selectedData;
    if (!s) return;

    const mid = s.mid || 0;
    const premiumPer = mid * 100;
    const totalCost = premiumPer * state.contractQty;
    const breakeven = state.optionType === 'calls' ? state.selectedStrike + mid : state.selectedStrike - mid;

    if (el.premiumPer) el.premiumPer.textContent = `$${premiumPer.toFixed(2)}`;
    if (el.totalCost) el.totalCost.textContent = `$${totalCost.toFixed(2)}`;
    if (el.maxLoss) el.maxLoss.textContent = `$${totalCost.toFixed(2)}`;
    if (el.breakeven) el.breakeven.textContent = `$${breakeven.toFixed(2)}`;
}

function populateTargetDates() {
    if (el.targetDate) {
        el.targetDate.innerHTML = '<option value="">At Expiration</option>' +
            state.chainData.map(d => `<option value="${d.date}">${formatDateShort(d.date)}</option>`).join('');
    }
}

// ============================================
// Watchlist
// ============================================
function getWatchlistKey() {
    return `${state.ticker}_${state.selectedStrike}_${state.selectedDate}_${state.optionType}`;
}

function toggleWatchlist() {
    const key = getWatchlistKey();
    const idx = state.watchlist.findIndex(w => w.key === key);

    if (idx >= 0) {
        state.watchlist.splice(idx, 1);
    } else {
        state.watchlist.push({
            key,
            ticker: state.ticker,
            strike: state.selectedStrike,
            date: state.selectedDate,
            type: state.optionType,
            stockName: state.stockData.name || state.ticker,
            mid: state.selectedData?.mid || 0,
            addedAt: new Date().toISOString()
        });
    }

    saveWatchlistToStorage();
    updateWatchlistButton();
}

function updateWatchlistButton() {
    if (!el.addWatchlistBtn) return;
    const key = getWatchlistKey();
    const isInWatchlist = state.watchlist.some(w => w.key === key);
    el.addWatchlistBtn.classList.toggle('added', isInWatchlist);
    el.addWatchlistBtn.innerHTML = `<span class="watchlist-icon">${isInWatchlist ? '★' : '☆'}</span>`;
}

function saveWatchlistToStorage() {
    localStorage.setItem('optiontracker_watchlist', JSON.stringify(state.watchlist));
}

function loadWatchlistFromStorage() {
    const stored = localStorage.getItem('optiontracker_watchlist');
    if (stored) {
        try { state.watchlist = JSON.parse(stored); } catch (e) { state.watchlist = []; }
    }
}

window.loadWatchlist = loadWatchlistFromStorage;

function renderWatchlist() {
    if (!el.watchlistItems || !el.watchlistEmpty) return;

    if (state.watchlist.length === 0) {
        el.watchlistEmpty.classList.remove('hidden');
        el.watchlistItems.innerHTML = '';
    } else {
        el.watchlistEmpty.classList.add('hidden');
        el.watchlistItems.innerHTML = state.watchlist.map(w => `
            <div class="watchlist-item" data-key="${w.key}">
                <div class="watchlist-item-left">
                    <div>
                        <span class="watchlist-ticker">${w.ticker}</span>
                        <span class="watchlist-contract">$${w.strike}${w.type === 'calls' ? 'C' : 'P'} ${formatDateShort(w.date)}</span>
                    </div>
                    <span class="watchlist-name">${w.stockName}</span>
                </div>
                <div class="watchlist-item-right">
                    <span class="watchlist-price">$${w.mid?.toFixed(2) || '-'}</span>
                    <button class="remove-watchlist" data-key="${w.key}">×</button>
                </div>
            </div>
        `).join('');

        el.watchlistItems.querySelectorAll('.watchlist-item').forEach(item => {
            item.addEventListener('click', e => {
                if (e.target.classList.contains('remove-watchlist')) return;
                const w = state.watchlist.find(x => x.key === item.dataset.key);
                if (w) {
                    state.optionType = w.type;
                    if (el.optionType) el.optionType.value = w.type;
                    navigateTo('options');
                    loadStock(w.ticker).then(() => {
                        setTimeout(() => {
                            selectDate(w.date);
                            setTimeout(() => selectStrike(w.strike), 300);
                        }, 500);
                    });
                }
            });
        });

        el.watchlistItems.querySelectorAll('.remove-watchlist').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                const key = btn.dataset.key;
                state.watchlist = state.watchlist.filter(w => w.key !== key);
                saveWatchlistToStorage();
                renderWatchlist();
            });
        });
    }
}

// ============================================
// Tab Switching
// ============================================
function switchStockTab(tab) {
    document.querySelectorAll('.stock-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    el.overviewTab?.classList.toggle('hidden', tab !== 'overview');
    el.fundamentalsTab?.classList.toggle('hidden', tab !== 'fundamentals');
}

function switchInfoTab(tab) {
    document.querySelectorAll('.info-tab').forEach(t => t.classList.toggle('active', t.dataset.info === tab));
    el.factorsContent?.classList.toggle('hidden', tab !== 'factors');
    el.greeksContent?.classList.toggle('hidden', tab !== 'greeks');
}

function setMode(mode) {
    state.mode = mode;
    el.priceModeBtn?.classList.toggle('active', mode === 'strike');
    el.dateModeBtn?.classList.toggle('active', mode === 'date');
    if (state.selectedDate && state.selectedStrike) {
        loadComparison().then(updateChart);
    }
}

// ============================================
// Utilities
// ============================================
function findATM(strikes) {
    return strikes.reduce((c, s) => !c || Math.abs(s.strike - state.currentPrice) < Math.abs(c.strike - state.currentPrice) ? s : c, null);
}

function showLoading(show) {
    el.loadingOverlay?.classList.toggle('hidden', !show);
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateShort(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
}

function formatNum(n) {
    if (!n) return '-';
    if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return n.toString();
}

function formatMarketCap(n) {
    if (!n) return '-';
    if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
    if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
    return `$${n}`;
}

function generateMonthYearLabels() {
    const l = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        l.push(d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
    }
    return l;
}

function generatePricePath(midPrice, idx) {
    const d = [];
    let p = midPrice * (0.4 + idx * 0.15 + Math.random() * 0.3);
    for (let i = 0; i < 6; i++) {
        d.push(Math.max(0.01, p));
        p += (midPrice - p) * 0.2 + midPrice * (Math.random() * 0.12 - 0.06);
    }
    d.push(midPrice);
    return d;
}

console.log('🚀 OptionTracker v2.0 - Robust P/L Calculator');
