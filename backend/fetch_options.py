#!/usr/bin/env python3
"""
OptionTracker - Options Data Fetcher
Fetches options data from Yahoo Finance using yfinance

Copyright (c) 2026 Sourav Shrivastava. All rights reserved.
Licensed under the MIT License. See LICENSE file for details.
"""

import yfinance as yf
from datetime import datetime, timedelta
import pandas as pd


class OptionsComparator:
    """
    Options comparison engine implementing the Neighbor Algorithm
    Compares options across:
    - Price Mode: Different strikes on the same expiration date
    - Date Mode: Same strike across different expiration dates
    """
    
    def __init__(self, ticker):
        self.ticker = ticker.upper()
        self.stock = yf.Ticker(self.ticker)
        self._price_cache = None
    
    def get_current_price(self):
        """Get current stock price"""
        if self._price_cache:
            return self._price_cache
            
        info = self.stock.info
        price = info.get('currentPrice') or info.get('regularMarketPrice', 0)
        self._price_cache = price
        return price
    
    def get_available_dates(self):
        """Get list of available expiration dates"""
        try:
            return list(self.stock.options)
        except Exception:
            return []
    
    def get_option_chain(self, date, option_type='calls'):
        """Get full option chain for a specific date"""
        try:
            chain = self.stock.option_chain(date)
            df = chain.calls if option_type == 'calls' else chain.puts
            return df.to_dict('records')
        except Exception as e:
            print(f"Error fetching chain for {date}: {e}")
            return []
    
    def compare_by_strike(self, date, target_strike, option_type='calls'):
        """
        Price Mode: Compare ±1 strike on the same expiration date
        Returns data for target strike and neighboring strikes
        """
        chain = self.get_option_chain(date, option_type)
        if not chain:
            return {'error': 'Could not fetch option chain'}
        
        # Sort by strike
        strikes = sorted(set(opt['strike'] for opt in chain))
        
        # Find target and neighbors
        try:
            idx = strikes.index(target_strike)
        except ValueError:
            # Find closest strike
            idx = min(range(len(strikes)), key=lambda i: abs(strikes[i] - target_strike))
        
        # Get ±1 strike indices
        below_idx = max(0, idx - 1)
        above_idx = min(len(strikes) - 1, idx + 1)
        
        result_strikes = [strikes[below_idx], strikes[idx], strikes[above_idx]]
        
        # Build series data
        series = []
        for i, strike in enumerate(result_strikes):
            opt = next((o for o in chain if o['strike'] == strike), None)
            if opt:
                position = 'below' if i == 0 else ('target' if i == 1 else 'above')
                series.append({
                    'strike': strike,
                    'position': position,
                    'data': {
                        'strike': strike,
                        'bid': opt.get('bid', 0),
                        'ask': opt.get('ask', 0),
                        'mid': (opt.get('bid', 0) + opt.get('ask', 0)) / 2,
                        'last': opt.get('lastPrice', 0),
                        'volume': opt.get('volume', 0),
                        'openInterest': opt.get('openInterest', 0),
                        'iv': opt.get('impliedVolatility', 0)
                    }
                })
        
        return {
            'mode': 'strike',
            'ticker': self.ticker,
            'date': date,
            'targetStrike': target_strike,
            'series': series
        }
    
    def compare_by_date(self, target_date, strike, option_type='calls'):
        """
        Date Mode: Compare same strike across ±1 expiration date
        Returns data for target date and neighboring dates
        """
        dates = self.get_available_dates()
        if not dates or target_date not in dates:
            return {'error': 'Invalid date'}
        
        idx = dates.index(target_date)
        
        # Get ±1 date indices
        before_idx = max(0, idx - 1)
        after_idx = min(len(dates) - 1, idx + 1)
        
        result_dates = [dates[before_idx], dates[idx], dates[after_idx]]
        
        # Build series data
        series = []
        for i, date in enumerate(result_dates):
            chain = self.get_option_chain(date, option_type)
            opt = next((o for o in chain if o['strike'] == strike), None)
            
            if opt:
                position = 'before' if i == 0 else ('target' if i == 1 else 'after')
                series.append({
                    'date': date,
                    'label': date,
                    'position': position,
                    'data': {
                        'strike': strike,
                        'bid': opt.get('bid', 0),
                        'ask': opt.get('ask', 0),
                        'mid': (opt.get('bid', 0) + opt.get('ask', 0)) / 2,
                        'last': opt.get('lastPrice', 0),
                        'volume': opt.get('volume', 0),
                        'openInterest': opt.get('openInterest', 0),
                        'iv': opt.get('impliedVolatility', 0)
                    }
                })
        
        return {
            'mode': 'date',
            'ticker': self.ticker,
            'strike': strike,
            'targetDate': target_date,
            'series': series
        }


def main():
    """Test the options comparator"""
    print("Testing OptionsComparator...")
    
    comp = OptionsComparator("MSFT")
    print(f"Current price: ${comp.get_current_price():.2f}")
    
    dates = comp.get_available_dates()
    print(f"Available dates: {len(dates)}")
    
    if dates:
        print(f"\nFirst 3 dates: {dates[:3]}")
        
        # Test date comparison
        result = comp.compare_by_date(dates[1], 400, 'calls')
        print(f"\nDate comparison result: {result}")


if __name__ == '__main__':
    main()
