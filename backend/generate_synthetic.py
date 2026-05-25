import numpy as np
import pandas as pd
import os
from datetime import datetime, timedelta

def generate_stock_path(ticker: str, start_price: float, drift: float, volatility: float, num_days: int, start_date: datetime) -> pd.DataFrame:
    """
    Generates a synthetic stock price path using Geometric Brownian Motion (GBM).
    """
    dt = 1 / 252.0  # Daily time step in years
    prices = [start_price]
    dates = [start_date]
    
    # Generate prices using GBM formula: S_t = S_{t-1} * exp((mu - 0.5 * sigma^2)*dt + sigma*sqrt(dt)*Z)
    np.random.seed(hash(ticker) % 2**32) # Seed based on ticker name for reproducibility
    for i in range(1, num_days):
        z = np.random.normal(0, 1)
        price_t = prices[-1] * np.exp((drift - 0.5 * volatility**2) * dt + volatility * np.sqrt(dt) * z)
        
        # Avoid negative prices
        if price_t <= 0.1:
            price_t = 0.1
            
        prices.append(price_t)
        dates.append(start_date + timedelta(days=i))
        
    df = pd.DataFrame({
        'Date': dates,
        'Open': [p * (1 + np.random.normal(0, 0.005)) for p in prices],
        'High': [p * (1 + abs(np.random.normal(0.005, 0.005))) for p in prices],
        'Low': [p * (1 - abs(np.random.normal(0.005, 0.005))) for p in prices],
        'Close': prices,
        'Volume': np.random.randint(100000, 5000000, size=num_days).astype(float),
        'Ticker': ticker
    })
    
    # Adjust High and Low to be logical
    df['High'] = df[['Open', 'Close', 'High']].max(axis=1)
    df['Low'] = df[['Open', 'Close', 'Low']].min(axis=1)
    
    return df

def generate_large_dataset(output_path: str):
    """
    Generates a large database of stock history with multiple tickers,
    aggregating over 10,000 trading days.
    """
    # 5 tickers, 2500 trading days (approx 10 years) each = 12,500 total rows.
    tickers_config = [
        {"ticker": "INNV", "start_price": 100.0, "drift": 0.12, "volatility": 0.25},  # Tech Innovar Inc (Growth)
        {"ticker": "MEDX", "start_price": 50.0, "drift": 0.08, "volatility": 0.18},   # Medex Health (Defensive)
        {"ticker": "ENER", "start_price": 80.0, "drift": 0.05, "volatility": 0.30},   # Energy Grid (Cyclical)
        {"ticker": "FINA", "start_price": 150.0, "drift": 0.07, "volatility": 0.15},  # Financial Corp (Stable)
        {"ticker": "AUTO", "start_price": 40.0, "drift": 0.15, "volatility": 0.35}    # AutoDrive EV (High Volatility)
    ]
    
    num_days = 2500
    start_date = datetime.now() - timedelta(days=num_days * 1.4) # account for weekends/calendar days approx
    
    all_dfs = []
    
    print(f"Generating synthetic stock dataset containing {len(tickers_config)} tickers and {num_days} days each...")
    
    for t_conf in tickers_config:
        df = generate_stock_path(
            ticker=t_conf["ticker"],
            start_price=t_conf["start_price"],
            drift=t_conf["drift"],
            volatility=t_conf["volatility"],
            num_days=num_days,
            start_date=start_date
        )
        all_dfs.append(df)
        
    large_df = pd.concat(all_dfs, ignore_index=True)
    
    # Sort chronological
    large_df = large_df.sort_values(by=['Ticker', 'Date']).reset_index(drop=True)
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    large_df.to_csv(output_path, index=False)
    print(f"Large synthetic dataset successfully generated at {output_path}!")
    print(f"Total Rows: {len(large_df)}, Size: {os.path.getsize(output_path) / 1024 / 1024:.2f} MB")

if __name__ == "__main__":
    output_dir = os.path.dirname(os.path.abspath(__file__))
    data_file = os.path.join(output_dir, "data", "synthetic_stock_data.csv")
    generate_large_dataset(data_file)
