// OptionTracker - Main Application with Watchlist & P/L Fix

// API Configuration - Uses Render backend in production
const RENDER_BACKEND_URL = 'https://optiontracker.onrender.com';
const API_BASE = window.location.hostname === 'localhost' || window.location.protocol === 'file:'
    ? 'http://localhost:5001/api'
    : `${RENDER_BACKEND_URL}/api`;

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
    currentPage: 'options'
};

// DOM Elements
const el = {};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', init);

function init() {
    cacheElements();
    setupEventListeners();
    loadWatchlistFromStorage();
    el.tickerInput.value = state.ticker;
    loadStock(state.ticker);
}

function cacheElements() {
    el.tickerInput = document.getElementById('tickerInput');
    el.autocomplete = document.getElementById('autocomplete');
    el.stockTicker = document.getElementById('stockTicker');
    el.stockName = document.getElementById('stockName');
    el.stockPrice = document.getElementById('stockPrice');
    el.stockChange = document.getElementById('stockChange');
    el.prevClose = document.getElementById('prevClose');
    el.dayRange = document.getElementById('dayRange');
    el.weekRange = document.getElementById('weekRange');
    el.volume = document.getElementById('volume');
    el.marketCap = document.getElementById('marketCap');
    el.peRatio = document.getElementById('peRatio');
    el.divYield = document.getElementById('divYield');
    el.divRate = document.getElementById('divRate');
    el.beta = document.getElementById('beta');
    el.overviewTab = document.getElementById('overviewTab');
    el.fundamentalsTab = document.getElementById('fundamentalsTab');
    el.dateCount = document.getElementById('dateCount');
    el.datesList = document.getElementById('datesList');
    el.atmStrike = document.getElementById('atmStrike');
    el.strikesContainer = document.getElementById('strikesContainer');
    el.priceModeBtn = document.getElementById('priceModeBtn');
    el.dateModeBtn = document.getElementById('dateModeBtn');
    el.optionType = document.getElementById('optionType');
    el.contractLabel = document.getElementById('contractLabel');
    el.chartTitle = document.getElementById('chartTitle');
    el.chartLegend = document.getElementById('chartLegend');
    el.priceChart = document.getElementById('priceChart');
    el.factorsContent = document.getElementById('factorsContent');
    el.greeksContent = document.getElementById('greeksContent');
    el.infoBid = document.getElementById('infoBid');
    el.infoMid = document.getElementById('infoMid');
    el.infoAsk = document.getElementById('infoAsk');
    el.infoSpread = document.getElementById('infoSpread');
    el.infoIV = document.getElementById('infoIV');
    el.infoVol = document.getElementById('infoVol');
    el.infoOI = document.getElementById('infoOI');
    el.infoChg = document.getElementById('infoChg');
    el.greekDelta = document.getElementById('greekDelta');
    el.greekGamma = document.getElementById('greekGamma');
    el.greekTheta = document.getElementById('greekTheta');
    el.greekVega = document.getElementById('greekVega');
    el.greekRho = document.getElementById('greekRho');
    el.greekOmega = document.getElementById('greekOmega');
    el.contractQty = document.getElementById('contractQty');
    el.premiumPer = document.getElementById('premiumPer');
    el.totalCost = document.getElementById('totalCost');
    el.maxLoss = document.getElementById('maxLoss');
    el.breakeven = document.getElementById('breakeven');
    el.targetPrice = document.getElementById('targetPrice');
    el.targetDate = document.getElementById('targetDate');
    el.calculatePL = document.getElementById('calculatePL');
    el.plResults = document.getElementById('plResults');
    el.optionValue = document.getElementById('optionValue');
    el.costBasis = document.getElementById('costBasis');
    el.profitLoss = document.getElementById('profitLoss');
    el.returnPct = document.getElementById('returnPct');
    el.loadingOverlay = document.getElementById('loadingOverlay');
    el.addWatchlistBtn = document.getElementById('addWatchlistBtn');
    el.watchlistItems = document.getElementById('watchlistItems');
    el.watchlistEmpty = document.getElementById('watchlistEmpty');
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
    el.optionType?.addEventListener('change', e => { state.optionType = e.target.value; loadFullChain(); });

    // Info tabs
    document.querySelectorAll('.info-tab').forEach(tab => {
        tab.addEventListener('click', () => switchInfoTab(tab.dataset.info));
    });

    // Contract quantity - recalculate on change
    el.contractQty?.addEventListener('input', () => {
        updateCalculator();
        // Reset P/L results when quantity changes
        el.plResults?.classList.add('hidden');
    });

    // P/L Calculator - FIX: Always recalculate with current data
    el.calculatePL?.addEventListener('click', calculateProfitLoss);

    // Reset P/L when target price changes
    el.targetPrice?.addEventListener('input', () => {
        el.plResults?.classList.add('hidden');
    });

    // Navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            navigateTo(link.dataset.page);
        });
    });

    // Add to Watchlist
    el.addWatchlistBtn?.addEventListener('click', toggleWatchlist);
}

// Navigation
function navigateTo(page) {
    state.currentPage = page;

    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.page === page);
    });

    // Update page content
    document.querySelectorAll('.page-content').forEach(p => {
        p.classList.toggle('active', p.id === `${page}Page`);
    });

    // Render watchlist if switching to that page
    if (page === 'watchlist') {
        renderWatchlist();
    }
}

// Ticker handling
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

async function loadStock(ticker) {
    if (!ticker) return;
    state.ticker = ticker.toUpperCase();
    showLoading(true);

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

async function loadFullChain() {
    showLoading(true);

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

        // Reset P/L results when chain changes
        el.plResults?.classList.add('hidden');

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

    // Update list
    el.datesList?.querySelectorAll('.date-item').forEach(item => {
        item.classList.toggle('active', item.dataset.date === date);
    });

    // Render strikes
    const dateData = state.chainData.find(d => d.date === date);
    if (dateData) {
        renderStrikesCentered(dateData.strikes);
        const atm = findATM(dateData.strikes);
        if (atm) {
            if (el.atmStrike) el.atmStrike.textContent = `$${atm.strike}`;
            selectStrike(atm.strike);
        }
    }

    // Reset P/L results when date changes
    el.plResults?.classList.add('hidden');
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

    // Reset P/L results when strike changes
    el.plResults?.classList.add('hidden');
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

    // Greeks
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

// P/L Calculator - FIXED: Always fetches fresh data from current selection
function calculateProfitLoss() {
    // Always get fresh data from current state
    const dateData = state.chainData.find(d => d.date === state.selectedDate);
    const contractData = dateData?.strikes.find(s => s.strike === state.selectedStrike);

    // Update state.selectedData with fresh data
    if (contractData) {
        state.selectedData = contractData;
    }

    const targetPrice = parseFloat(el.targetPrice?.value) || state.currentPrice;
    const s = state.selectedData;

    if (!s || !state.selectedStrike) {
        console.warn('No contract selected - please select a strike first');
        alert('Please select a contract first');
        return;
    }

    const mid = s.mid || 0;
    const strike = state.selectedStrike;
    const qty = parseInt(el.contractQty?.value) || 1;
    state.contractQty = qty;
    const cost = mid * 100 * qty;

    let intrinsic = 0;
    if (state.optionType === 'calls') {
        intrinsic = Math.max(0, targetPrice - strike);
    } else {
        intrinsic = Math.max(0, strike - targetPrice);
    }

    const optValue = intrinsic * 100 * qty;
    const pl = optValue - cost;
    const returnPct = cost > 0 ? (pl / cost) * 100 : 0;

    console.log(`P/L Calc: ${state.ticker} $${strike}${state.optionType === 'calls' ? 'C' : 'P'} @ ${state.selectedDate}`);
    console.log(`  Target: $${targetPrice}, Mid: $${mid}, Qty: ${qty}`);
    console.log(`  Value: $${optValue.toFixed(2)}, Cost: $${cost.toFixed(2)}, P/L: $${pl.toFixed(2)}`);

    if (el.optionValue) el.optionValue.textContent = `$${optValue.toFixed(2)}`;
    if (el.costBasis) el.costBasis.textContent = `$${cost.toFixed(2)}`;
    if (el.profitLoss) {
        el.profitLoss.textContent = `${pl >= 0 ? '+' : ''}$${pl.toFixed(2)}`;
        el.profitLoss.className = pl >= 0 ? 'green' : 'red';
    }
    if (el.returnPct) {
        el.returnPct.textContent = `${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(1)}%`;
        el.returnPct.className = returnPct >= 0 ? 'green' : 'red';
    }

    const highlightRow = el.plResults?.querySelector('.calc-row.highlight');
    if (highlightRow) {
        highlightRow.classList.remove('profit', 'loss');
        highlightRow.classList.add(pl >= 0 ? 'profit' : 'loss');
    }

    el.plResults?.classList.remove('hidden');
}

// Watchlist - Saves full contract (Ticker + Strike + Date + Type)
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

// Called from auth.js when user signs in
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

        // Click to navigate to contract
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

        // Remove button
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

// Tab switching
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

function findATM(strikes) {
    return strikes.reduce((c, s) => !c || Math.abs(s.strike - state.currentPrice) < Math.abs(c.strike - state.currentPrice) ? s : c, null);
}

function showLoading(show) { el.loadingOverlay?.classList.toggle('hidden', !show); }

// Formatting
function formatDate(dateStr) { return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
function formatDateShort(dateStr) { return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }); }
function formatNum(n) { if (!n) return '-'; if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B'; if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'; if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'; return n.toString(); }
function formatMarketCap(n) { if (!n) return '-'; if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`; if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`; if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`; return `$${n}`; }
function generateMonthYearLabels() { const l = []; const now = new Date(); for (let i = 6; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); l.push(d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })); } return l; }
function generatePricePath(midPrice, idx) { const d = []; let p = midPrice * (0.4 + idx * 0.15 + Math.random() * 0.3); for (let i = 0; i < 6; i++) { d.push(Math.max(0.01, p)); p += (midPrice - p) * 0.2 + midPrice * (Math.random() * 0.12 - 0.06); } d.push(midPrice); return d; }

console.log('🚀 OptionTracker - Full App with Watchlist & Fixed P/L Calculator');
