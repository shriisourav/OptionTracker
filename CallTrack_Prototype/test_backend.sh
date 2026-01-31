#!/bin/bash

# CallTrack Test Script
# Tests the Python backend and demonstrates all features

echo "🧪 CallTrack Backend Test Suite"
echo "================================"
echo ""

# Test 1: Health Check
echo "Test 1: API Health Check"
curl -s http://localhost:5001/api/health | python3 -m json.tool
echo ""
echo ""

# Test 2: Get Stock Price
echo "Test 2: Get MSFT Current Price"
curl -s http://localhost:5001/api/price/MSFT | python3 -m json.tool
echo ""
echo ""

# Test 3: Get Available Dates
echo "Test 3: Get Available Expiration Dates for MSFT"
curl -s http://localhost:5001/api/dates/MSFT | python3 -m json.tool | head -20
echo "..."
echo ""
echo ""

# Test 4: Compare Strikes (Price Mode)
echo "Test 4: Compare Strikes (Price Mode)"
echo "Comparing MSFT 2026-03-20 strikes around \$420"
curl -s -X POST http://localhost:5001/api/compare/strike \
  -H "Content-Type: application/json" \
  -d '{
    "ticker": "MSFT",
    "date": "2026-03-20",
    "strike": 420,
    "option_type": "calls"
  }' | python3 -m json.tool | head -50
echo "..."
echo ""
echo ""

# Test 5: Compare Dates (Date Mode)
echo "Test 5: Compare Dates (Date Mode)"
echo "Comparing MSFT \$420 strike across different dates"
curl -s -X POST http://localhost:5001/api/compare/date \
  -H "Content-Type: application/json" \
  -d '{
    "ticker": "MSFT",
    "date": "2026-03-20",
    "strike": 420,
    "option_type": "calls"
  }' | python3 -m json.tool | head -50
echo "..."
echo ""
echo ""

# Test 6: CLI Direct Test
echo "Test 6: Direct Python CLI Test"
cd backend
python3 fetch_options.py AAPL strike 2026-03-20 180 calls 2>/dev/null | python3 -m json.tool | head -40
echo "..."
echo ""
echo ""

echo "✅ All tests complete!"
echo ""
echo "Next steps:"
echo "1. Open http://localhost:5001/api/health in browser"
echo "2. Open web_ui/index.html to use the visual interface"
echo "3. Try different tickers: MSFT, AAPL, GOOGL, TSLA, NVDA"
