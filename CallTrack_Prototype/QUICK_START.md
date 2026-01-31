# 🚀 CallTrack - Quick Start Guide

## ⚡️ 60-Second Setup

### Step 1: Start the Backend (Terminal 1)
```bash
cd /Users/souravshrivastava/AI/OptionTracker/CallTrack_Prototype/backend
python3 api_server.py
```

✅ You should see:
```
🚀 CallTrack API Server starting...
📊 Access at: http://localhost:5001
 * Running on http://127.0.0.1:5001
```

### Step 2: Open the Web UI
```bash
cd /Users/souravshrivastava/AI/OptionTracker/CallTrack_Prototype/web_ui
open index.html
```

✅ Your browser opens with the CallTrack interface

### Step 3: Try It Out!

**Example 1: Compare Strikes for Microsoft**
1. Enter ticker: `MSFT`
2. Click search 🔍
3. Select mode: **"Compare Strikes"** ✅
4. Choose date: `March 20, 2026`
5. Enter strike: `420`
6. Click **"Analyze Options"**

🎉 See the 3-line chart with:
- Purple: $415 strike (below)
- Cyan: $420 strike (target) ⭐
- Magenta: $425 strike (above)

**Example 2: Compare Expiries for Tesla**
1. Enter ticker: `TSLA`
2. Click search 🔍
3. Select mode: **"Compare Expiries"** ✅
4. Choose date: `March 20, 2026`
5. Enter strike: `350`
6. Click **"Analyze Options"**

🎉 See the same strike across different dates:
- Purple: Earlier expiry
- Cyan: Target date ⭐
- Magenta: Later expiry

---

## 🎯 What You'll See

### 1. Midnight Blue Interface
Premium Bloomberg-style design with:
- Dark blue background
- Neon cyan/purple accents
- Smooth animations
- Professional typography

### 2. Greeks Ribbon
After analysis, see:
- **Delta (Δ)**: Price sensitivity
- **Gamma (Γ)**: Delta change rate
- **Theta (Θ)**: Time decay
- **IV**: Implied volatility %

### 3. Interactive Chart
Chart.js visualization with:
- 3 colored lines (Purple/Cyan/Magenta)
- Hover tooltips with Bid/Ask/Mid
- Clean grid system
- Responsive design

### 4. Data Table
Detailed breakdown showing:
- Strike or Date labels
- Bid/Mid/Ask prices
- Volume & Open Interest
- Implied Volatility

---

## 📊 Best Tickers to Try

| Ticker | Name | Why Try It |
|--------|------|------------|
| MSFT | Microsoft | High volume, liquid options |
| AAPL | Apple | Many strikes available |
| GOOGL | Google | Wide bid-ask spreads |
| TSLA | Tesla | High implied volatility |
| NVDA | Nvidia | Popular tech options |
| SPY | S&P 500 ETF | Most liquid options |
| QQQ | Nasdaq ETF | Tech-heavy options |

---

## 🎨 Features at a Glance

### ✅ Working Now
- [x] Real-time price lookup
- [x] Option chain browsing
- [x] Strike comparison (Price Mode)
- [x] Date comparison (Date Mode)
- [x] 3-line overlay charts
- [x] Greeks display
- [x] Bid/Ask spreads
- [x] Volume & OI data
- [x] Responsive design

### 🚧 Coming in Flutter
- [ ] Mobile app interface
- [ ] Touch-optimized charts
- [ ] Swipe gestures
- [ ] Push notifications
- [ ] Offline caching

---

## 🐛 Troubleshooting

### "API not responding"
**Check:** Is the backend running?
```bash
curl http://localhost:5001/api/health
```

**Should return:**
```json
{
  "service": "CallTrack API",
  "status": "healthy"
}
```

### "No data for ticker"
**Fix:** Check the ticker symbol
- Use uppercase: `MSFT` not `msft`
- Verify it exists: Search on Yahoo Finance
- Try a popular ticker first (MSFT, AAPL)

### "Date not available"
**Fix:** Use dates from the dropdown
- Dropdown shows actual available dates
- Don't type dates manually
- Monthly expiries (3rd Friday) work best

### "Greeks showing N/A"
**Note:** This is normal!
- yfinance doesn't always provide Greeks
- IV is usually available
- This is a data limitation, not a bug

---

## 🔥 Pro Tips

### 1. **Use Round Strikes**
Strikes like $400, $420, $450 have better liquidity than $417.50

### 2. **Pick Monthly Expiries**
Monthly options (3rd Friday) have:
- Higher volume
- Tighter spreads
- More reliable data

### 3. **Check Volume & OI**
Look for:
- Volume > 100
- Open Interest > 500
- Indicates liquid, tradable options

### 4. **Compare ATM Options**
At-the-money options (strike ≈ stock price) show:
- Best Greeks data
- Tightest spreads
- Most activity

### 5. **Try Both Modes**
- **Strike Mode**: See how premium changes with price
- **Date Mode**: See time decay across expiries

---

## 📈 Understanding the Chart

### Color Coding
```
🟣 Purple  = Neighbor 1 (below/before)
🔵 Cyan    = Target (your selection) ⭐
🌸 Magenta = Neighbor 2 (above/after)
```

### Chart Lines
- **Solid line**: Mid price (average of Bid/Ask)
- **Dashed lines**: Bid and Ask prices
- **Tooltip**: Shows Bid/Mid/Ask/Spread on hover

### Interpretation

**Price Mode Example:**
```
$415: $26.12 (purple) - Cheaper, in-the-money
$420: $22.95 (cyan)   - Your target ⭐
$425: $19.85 (magenta)- More expensive, out-of-money
```

**Date Mode Example:**
```
Feb 20: $18.50 (purple)  - Less time, cheaper
Mar 20: $22.95 (cyan)    - Your target ⭐
Apr 17: $26.40 (magenta) - More time, expensive
```

---

## 🎯 Next Steps

### Ready to Go Deeper?

1. **Read the full docs:**
   ```bash
   cd /Users/souravshrivastava/AI/OptionTracker/CallTrack_Prototype
   cat README.md
   cat PROJECT_SUMMARY.md
   ```

2. **Test the API:**
   ```bash
   ./test_backend.sh
   ```

3. **Install Flutter:**
   ```bash
   cd flutter_app
   cat FLUTTER_SETUP.md
   ```

4. **Try the CLI:**
   ```bash
   cd backend
   python3 fetch_options.py MSFT strike 2026-03-20 420 calls
   ```

---

## 📚 Documentation Files

- **README.md** - Complete project overview
- **PROJECT_SUMMARY.md** - What we built & achievements
- **flutter_app/FLUTTER_SETUP.md** - Flutter installation
- **test_backend.sh** - Automated testing

---

## ⏱️ Current Status

**Backend:** 🟢 RUNNING on port 5001
**Web UI:** 🟢 READY (already opened!)
**API:** 🟢 RESPONDING to requests
**Flutter:** 🟡 Setup guide ready

---

## 🎊 You're All Set!

Your CallTrack prototype is:
- ✅ Fully functional
- ✅ Production-quality UI
- ✅ Professional design
- ✅ Fast & responsive
- ✅ Ready to demo!

**Enjoy comparing options like a pro!** 📊🚀

---

**Questions?** Check the PROJECT_SUMMARY.md for:
- Architecture details
- API documentation
- Design philosophy
- Enhancement ideas
- Known issues

**Happy Trading!** 💰📈
