#!/usr/bin/env python3
"""
CallTrack Options Data Engine
The "Quant Brain" that fetches and compares options data
"""

import yfinance as yf
import json
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple


class OptionsComparator:
    """
    Handles the "Neighbor Algorithm" for comparing options
    across strikes (Price Mode) or expiries (Date Mode)
    """
    
    def __init__(self, ticker: str):
        self.ticker = ticker.upper()
        self.stock = yf.Ticker(self.ticker)
        self.current_price = None
        
    def get_current_price(self) -> float:
        """Fetch real-time stock price"""
        try:
            data = self.stock.history(period="1d")
            self.current_price = data['Close'].iloc[-1]
            return self.current_price
        except Exception as e:
            print(f"Error fetching price: {e}", file=sys.stderr)
            return None
    
    def get_available_dates(self) -> List[str]:
        """Get all available expiration dates"""
        return list(self.stock.options)
    
    def find_nearest_dates(self, target_date: str) -> Tuple[Optional[str], str, Optional[str]]:
        """
        Find the target date and its nearest neighbors
        Returns: (date_before, target_date, date_after)
        """
        available_dates = self.get_available_dates()
        
        if target_date not in available_dates:
            raise ValueError(f"Target date {target_date} not available. Available: {available_dates}")
        
        target_idx = available_dates.index(target_date)
        
        date_before = available_dates[target_idx - 1] if target_idx > 0 else None
        date_after = available_dates[target_idx + 1] if target_idx < len(available_dates) - 1 else None
        
        return date_before, target_date, date_after
    
    def get_option_chain(self, date: str, option_type: str = 'calls') -> Optional[Dict]:
        """Fetch option chain for a specific date"""
        try:
            chain = self.stock.option_chain(date)
            df = chain.calls if option_type.lower() == 'calls' else chain.puts
            return df.to_dict('records')
        except Exception as e:
            print(f"Error fetching chain for {date}: {e}", file=sys.stderr)
            return None
    
    def find_strike_neighbors(self, chain_data: List[Dict], target_strike: float) -> Tuple[Optional[float], float, Optional[float]]:
        """
        Find the target strike and its nearest neighbors
        Returns: (strike_below, target_strike, strike_above)
        """
        strikes = sorted([opt['strike'] for opt in chain_data])
        
        if target_strike not in strikes:
            # Find closest strike
            closest = min(strikes, key=lambda x: abs(x - target_strike))
            print(f"Warning: {target_strike} not found. Using closest: {closest}", file=sys.stderr)
            target_strike = closest
        
        target_idx = strikes.index(target_strike)
        
        strike_below = strikes[target_idx - 1] if target_idx > 0 else None
        strike_above = strikes[target_idx + 1] if target_idx < len(strikes) - 1 else None
        
        return strike_below, target_strike, strike_above
    
    def get_option_data(self, chain_data: List[Dict], strike: float) -> Optional[Dict]:
        """Extract specific option data for a strike"""
        for opt in chain_data:
            if opt['strike'] == strike:
                return {
                    'strike': opt['strike'],
                    'lastPrice': opt.get('lastPrice', 0),
                    'bid': opt.get('bid', 0),
                    'ask': opt.get('ask', 0),
                    'mid': (opt.get('bid', 0) + opt.get('ask', 0)) / 2,
                    'volume': opt.get('volume', 0),
                    'openInterest': opt.get('openInterest', 0),
                    'impliedVolatility': opt.get('impliedVolatility', 0),
                    'delta': opt.get('delta', None),
                    'gamma': opt.get('gamma', None),
                    'theta': opt.get('theta', None),
                    'vega': opt.get('vega', None),
                }
        return None
    
    def compare_by_date(self, target_date: str, target_strike: float, option_type: str = 'calls') -> Dict:
        """
        DATE MODE: Compare the same strike across different expiration dates
        Returns data for: [date_before, target_date, date_after] at the same strike
        """
        date_before, target, date_after = self.find_nearest_dates(target_date)
        
        result = {
            'mode': 'date_comparison',
            'ticker': self.ticker,
            'current_price': self.get_current_price(),
            'target_strike': target_strike,
            'option_type': option_type,
            'series': []
        }
        
        # Fetch data for all three dates
        for date, label in [(date_before, 'before'), (target, 'target'), (date_after, 'after')]:
            if date:
                chain = self.get_option_chain(date, option_type)
                if chain:
                    opt_data = self.get_option_data(chain, target_strike)
                    if opt_data:
                        result['series'].append({
                            'label': f"{date} ({label})",
                            'date': date,
                            'position': label,
                            'data': opt_data
                        })
        
        return result
    
    def compare_by_strike(self, target_date: str, target_strike: float, option_type: str = 'calls') -> Dict:
        """
        PRICE MODE: Compare different strikes on the same expiration date
        Returns data for: [strike_below, target_strike, strike_above] on the same date
        """
        chain = self.get_option_chain(target_date, option_type)
        
        if not chain:
            raise ValueError(f"Could not fetch option chain for {target_date}")
        
        strike_below, target, strike_above = self.find_strike_neighbors(chain, target_strike)
        
        result = {
            'mode': 'strike_comparison',
            'ticker': self.ticker,
            'current_price': self.get_current_price(),
            'target_date': target_date,
            'option_type': option_type,
            'series': []
        }
        
        # Fetch data for all three strikes
        for strike, label in [(strike_below, 'below'), (target, 'target'), (strike_above, 'above')]:
            if strike:
                opt_data = self.get_option_data(chain, strike)
                if opt_data:
                    result['series'].append({
                        'label': f"${strike} ({label})",
                        'strike': strike,
                        'position': label,
                        'data': opt_data
                    })
        
        return result


def main():
    """CLI interface for testing"""
    if len(sys.argv) < 5:
        print("Usage: python fetch_options.py <TICKER> <MODE> <DATE> <STRIKE> [CALL/PUT]")
        print("Example: python fetch_options.py MSFT date 2027-01-31 450 call")
        print("Example: python fetch_options.py MSFT strike 2027-01-31 450 call")
        sys.exit(1)
    
    ticker = sys.argv[1]
    mode = sys.argv[2].lower()
    date = sys.argv[3]
    strike = float(sys.argv[4])
    option_type = sys.argv[5] if len(sys.argv) > 5 else 'calls'
    
    comparator = OptionsComparator(ticker)
    
    try:
        if mode == 'date':
            result = comparator.compare_by_date(date, strike, option_type)
        elif mode == 'strike' or mode == 'price':
            result = comparator.compare_by_strike(date, strike, option_type)
        else:
            raise ValueError("Mode must be 'date' or 'strike'")
        
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
