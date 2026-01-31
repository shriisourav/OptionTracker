#!/usr/bin/env python3
"""
Flask REST API for CallTrack Options Engine
Exposes the Python data engine via HTTP endpoints
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from fetch_options import OptionsComparator
import sys
import math

app = Flask(__name__)
CORS(app)  # Enable CORS for web UI


def sanitize_value(val, default=0):
    """Convert NaN, None, or invalid values to a safe default"""
    if val is None:
        return default
    if isinstance(val, float) and (math.isnan(val) or math.isinf(val)):
        return default
    return val


@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'service': 'CallTrack API'})


@app.route('/api/price/<ticker>', methods=['GET'])
def get_price(ticker):
    """Get current stock price and fundamentals"""
    try:
        import yfinance as yf
        stock = yf.Ticker(ticker)
        info = stock.info
        
        price = info.get('currentPrice') or info.get('regularMarketPrice', 0)
        
        if price is None or price == 0:
            return jsonify({'error': 'Could not fetch price'}), 400
        
        # Get fundamentals
        market_cap = sanitize_value(info.get('marketCap', 0))
        dividend_yield = sanitize_value(info.get('dividendYield', 0))
        dividend_rate = sanitize_value(info.get('dividendRate', 0))
        pe_ratio = sanitize_value(info.get('trailingPE', 0))
        forward_pe = sanitize_value(info.get('forwardPE', 0))
        week_high_52 = sanitize_value(info.get('fiftyTwoWeekHigh', 0))
        week_low_52 = sanitize_value(info.get('fiftyTwoWeekLow', 0))
        prev_close = sanitize_value(info.get('previousClose', 0))
        volume = sanitize_value(info.get('volume', 0))
        avg_volume = sanitize_value(info.get('averageVolume', 0))
        beta = sanitize_value(info.get('beta', 0))
        
        # Calculate change
        change = price - prev_close if prev_close else 0
        change_pct = (change / prev_close * 100) if prev_close else 0
        
        return jsonify({
            'ticker': ticker.upper(),
            'price': price,
            'change': sanitize_value(change),
            'changePercent': sanitize_value(change_pct),
            'previousClose': prev_close,
            'marketCap': market_cap,
            'dividendYield': dividend_yield,
            'dividendRate': dividend_rate,
            'peRatio': pe_ratio,
            'forwardPE': forward_pe,
            'fiftyTwoWeekHigh': week_high_52,
            'fiftyTwoWeekLow': week_low_52,
            'volume': volume,
            'avgVolume': avg_volume,
            'beta': beta,
            'name': info.get('shortName', ticker.upper())
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/dates/<ticker>', methods=['GET'])
def get_dates(ticker):
    """Get available expiration dates"""
    try:
        comparator = OptionsComparator(ticker)
        dates = comparator.get_available_dates()
        
        return jsonify({
            'ticker': ticker.upper(),
            'dates': dates
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/compare/date', methods=['POST'])
def compare_by_date():
    """
    Compare options across dates (Date Mode)
    
    Request body:
    {
        "ticker": "MSFT",
        "date": "2027-01-31",
        "strike": 450,
        "option_type": "calls"
    }
    """
    try:
        data = request.get_json()
        
        ticker = data.get('ticker')
        date = data.get('date')
        strike = float(data.get('strike'))
        option_type = data.get('option_type', 'calls')
        
        if not all([ticker, date, strike]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        comparator = OptionsComparator(ticker)
        result = comparator.compare_by_date(date, strike, option_type)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/compare/strike', methods=['POST'])
def compare_by_strike():
    """
    Compare options across strikes (Price Mode)
    
    Request body:
    {
        "ticker": "MSFT",
        "date": "2027-01-31",
        "strike": 450,
        "option_type": "calls"
    }
    """
    try:
        data = request.get_json()
        
        ticker = data.get('ticker')
        date = data.get('date')
        strike = float(data.get('strike'))
        option_type = data.get('option_type', 'calls')
        
        if not all([ticker, date, strike]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        comparator = OptionsComparator(ticker)
        result = comparator.compare_by_strike(date, strike, option_type)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/chain/<ticker>', methods=['GET'])
def get_full_chain(ticker):
    """
    Get ALL available expiration dates with their strikes and prices
    Returns complete option chain data for contract selection
    """
    try:
        comparator = OptionsComparator(ticker)
        current_price = comparator.get_current_price()
        dates = comparator.get_available_dates()
        
        option_type = request.args.get('type', 'calls')
        
        chain_data = []
        for date in dates:
            try:
                chain = comparator.get_option_chain(date, option_type)
                if chain:
                    # Get strikes near the money for this date
                    strikes_data = []
                    for opt in chain:
                        strike = opt.get('strike', 0)
                        # Include strikes within reasonable range of current price
                        if current_price * 0.7 <= strike <= current_price * 1.3:
                            bid = sanitize_value(opt.get('bid', 0))
                            ask = sanitize_value(opt.get('ask', 0))
                            strikes_data.append({
                                'strike': strike,
                                'lastPrice': sanitize_value(opt.get('lastPrice', 0)),
                                'bid': bid,
                                'ask': ask,
                                'mid': (bid + ask) / 2 if bid and ask else sanitize_value(opt.get('lastPrice', 0)),
                                'change': sanitize_value(opt.get('change', 0)),
                                'percentChange': sanitize_value(opt.get('percentChange', 0)),
                                'volume': sanitize_value(opt.get('volume', 0)),
                                'openInterest': sanitize_value(opt.get('openInterest', 0)),
                                'impliedVolatility': sanitize_value(opt.get('impliedVolatility', 0)),
                            })
                    
                    if strikes_data:
                        chain_data.append({
                            'date': date,
                            'strikes': sorted(strikes_data, key=lambda x: x['strike'])
                        })
            except Exception as e:
                print(f"Error fetching chain for {date}: {e}", file=sys.stderr)
                continue
        
        return jsonify({
            'ticker': ticker.upper(),
            'currentPrice': current_price,
            'optionType': option_type,
            'chain': chain_data
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/contract', methods=['POST'])
def get_contract_details():
    """
    Get detailed info for a specific contract
    Shows 1 contract price, mid price, and price information
    """
    try:
        data = request.get_json()
        
        ticker = data.get('ticker')
        date = data.get('date')
        strike = float(data.get('strike'))
        option_type = data.get('option_type', 'calls')
        
        if not all([ticker, date, strike]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        comparator = OptionsComparator(ticker)
        current_price = comparator.get_current_price()
        chain = comparator.get_option_chain(date, option_type)
        
        if not chain:
            return jsonify({'error': 'Could not fetch option chain'}), 400
        
        # Find the specific contract
        contract = None
        for opt in chain:
            if opt.get('strike') == strike:
                contract = opt
                break
        
        if not contract:
            return jsonify({'error': f'Strike {strike} not found'}), 400
        
        # Calculate contract values
        bid = sanitize_value(contract.get('bid', 0))
        ask = sanitize_value(contract.get('ask', 0))
        mid = (bid + ask) / 2 if bid and ask else sanitize_value(contract.get('lastPrice', 0))
        last = sanitize_value(contract.get('lastPrice', 0))
        
        # 1 contract = 100 shares
        contract_value = mid * 100
        
        return jsonify({
            'ticker': ticker.upper(),
            'stockPrice': current_price,
            'date': date,
            'strike': strike,
            'optionType': option_type,
            'contract': {
                'bid': bid,
                'ask': ask,
                'mid': mid,
                'last': last,
                'spread': ask - bid,
                'contractValue': contract_value,  # 1 contract (100 shares)
                'volume': sanitize_value(contract.get('volume', 0)),
                'openInterest': sanitize_value(contract.get('openInterest', 0)),
                'impliedVolatility': sanitize_value(contract.get('impliedVolatility', 0)),
                'change': sanitize_value(contract.get('change', 0)),
                'percentChange': sanitize_value(contract.get('percentChange', 0)),
                'inTheMoney': contract.get('inTheMoney', False),
            },
            'breakeven': strike + mid if option_type == 'calls' else strike - mid,
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print("🚀 CallTrack API Server starting...")
    print("📊 Access at: http://localhost:5001")
    app.run(debug=True, host='0.0.0.0', port=5001)
