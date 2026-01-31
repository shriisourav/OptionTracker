# OptionTracker

> A professional options analysis platform with Python backend and responsive Web UI

## 🎯 Project Overview

OptionTracker is a multi-platform options analysis tool that implements the "Neighbor Algorithm" to compare options across:
- **Price Mode**: Compare different strikes on the same expiration date
- **Date Mode**: Compare the same strike across different expiration dates

### Features

- ✅ **Responsive 3-Column Layout** - Works on desktop, tablet, and mobile
- ✅ **Google OAuth Authentication** - Sign in with your Google account
- ✅ **Watchlist** - Save contracts (Ticker + Strike + Date + Type)
- ✅ **Stock Fundamentals** - Market Cap, P/E, Dividend, Beta
- ✅ **Option Greeks** - Delta, Gamma, Theta, Vega, Rho, Omega
- ✅ **P/L Calculator** - What-If scenario analysis
- ✅ **3-Line Comparison Chart** - ±1 Strike or ±1 Date visualization

### Architecture

```
OptionTracker/
├── backend/          # Python data engine (Flask API)
│   ├── api_server.py # REST API endpoints
│   └── fetch_options.py # Options data fetcher
└── web_ui/           # Web interface (HTML/CSS/JS)
    ├── index.html    # Main application
    ├── app.js        # Core functionality
    ├── auth.js       # Google OAuth authentication
    └── style.css     # Responsive styling
```

## 🚀 Quick Start

### 1. Start the Python Backend

```bash
cd backend
pip install -r requirements.txt
python3 api_server.py
```

Server runs at: http://localhost:5001

### 2. Open the Web UI

Simply open `web_ui/index.html` in your browser, or use a local server:

```bash
cd web_ui
python3 -m http.server 8000
```

Then visit: http://localhost:8000

### 3. Test It Out

- Search for: `MSFT`
- Select an expiration date
- Choose a strike price
- Use the P/L Calculator to analyze scenarios
- Add contracts to your Watchlist

## 🔐 Google Authentication Setup

To enable Google Sign-In:

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project or select existing
3. Go to **APIs & Services > Credentials**
4. Create **OAuth 2.0 Client ID** (Web application)
5. Add your domain to **Authorized JavaScript origins**
   - For local: `http://localhost:8000`
6. Copy the **Client ID**
7. Open `web_ui/auth.js` and replace `YOUR_GOOGLE_CLIENT_ID`

For local testing without Google OAuth, use the demo button or run `demoSignIn()` in console.

## 📊 API Endpoints

### Get Stock Price & Fundamentals
```bash
GET /api/price/<ticker>

# Example
curl http://localhost:5001/api/price/MSFT
```

Returns: price, change, market cap, P/E, dividend, beta, 52-week range

### Get Options Chain
```bash
GET /api/chain/<ticker>?type=calls

# Example
curl http://localhost:5001/api/chain/MSFT?type=calls
```

### Compare by Strike (Price Mode)
```bash
POST /api/compare/strike
Content-Type: application/json

{
  "ticker": "MSFT",
  "date": "2026-03-20",
  "strike": 420,
  "option_type": "calls"
}
```

### Compare by Date (Date Mode)
```bash
POST /api/compare/date
```

## 🎨 Features

### Left Panel
- Ticker search with autocomplete
- Stock Overview (price, change, range, volume)
- Stock Fundamentals (Market Cap, P/E, Dividend, Beta)
- Expiration dates list
- Strikes list (centered on ATM)

### Center Panel
- ±Strike / ±Date comparison mode toggle
- Calls / Puts selector
- 3-line price comparison chart with max indicator
- Contract Factors (Bid, Mid, Ask, Spread, IV, Volume, OI)
- Option Greeks (Delta, Gamma, Theta, Vega, Rho, Omega)

### Right Panel
- Position Calculator (Premium, Total Cost, Max Loss, Breakeven)
- What-If Scenario Calculator (target price → projected P/L)

### Watchlist
- Add/remove contracts with star icon
- Saves full contract: Ticker + Strike + Date + Type
- Click to jump to contract
- Persists in localStorage (and syncs with Google account)

## 🛠 Tech Stack

### Backend
- Python 3.9+
- Flask (REST API)
- yfinance (options data)
- flask-cors (CORS support)

### Frontend
- HTML5 + CSS3 (responsive design)
- Vanilla JavaScript
- Chart.js (visualization)
- Google Identity Services (OAuth)
- Inter font family

## 📝 Development Notes

- Port: Backend runs on 5001 (Flask)
- CORS: Enabled for local development
- Greeks: Some may be null (yfinance limitation)
- Authentication: Uses Google Identity Services with JWT decoding

## 📄 License

MIT - Build something awesome!

---

**Built with ⚡️ by OptionTracker Team**
