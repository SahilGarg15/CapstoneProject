import yfinance as yf
import pandas as pd
import numpy as np
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fetch_stock_data(ticker: str, period: str = "2y", interval: str = "1d") -> pd.DataFrame:
    """
    Fetches historical stock price data from Yahoo Finance.
    """
    logger.info(f"Fetching data for ticker {ticker} with period={period}")
    try:
        stock = yf.Ticker(ticker)
        df = stock.history(period=period, interval=interval)
        if df.empty:
            raise ValueError(f"No data returned for ticker {ticker}.")
        df = df.reset_index()
        # Ensure 'Date' is datetime and sorted
        df['Date'] = pd.to_datetime(df['Date'])
        df = df.sort_values('Date').reset_index(drop=True)
        return df
    except Exception as e:
        logger.error(f"Error fetching stock data for {ticker}: {str(e)}")
        raise e

def add_technical_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """
    Calculates technical indicators to be used as features for the ML model.
    """
    df = df.copy()
    
    # 1. Simple Moving Averages (SMA)
    df['SMA_10'] = df['Close'].rolling(window=10).mean()
    df['SMA_30'] = df['Close'].rolling(window=30).mean()
    
    # 2. Exponential Moving Averages (EMA)
    df['EMA_12'] = df['Close'].ewm(span=12, adjust=False).mean()
    df['EMA_26'] = df['Close'].ewm(span=26, adjust=False).mean()
    
    # 3. Relative Strength Index (RSI - 14 days)
    delta = df['Close'].diff()
    gain = (delta.where(delta > 0, 0)).copy()
    loss = (-delta.where(delta < 0, 0)).copy()
    
    avg_gain = gain.rolling(window=14).mean()
    avg_loss = loss.rolling(window=14).mean()
    
    # First values
    for i in range(14, len(df)):
        avg_gain.iloc[i] = (avg_gain.iloc[i-1] * 13 + gain.iloc[i]) / 14
        avg_loss.iloc[i] = (avg_loss.iloc[i-1] * 13 + loss.iloc[i]) / 14
        
    rs = avg_gain / (avg_loss + 1e-10) # avoid division by zero
    df['RSI_14'] = 100 - (100 / (1 + rs))
    
    # Fill leading NaNs for RSI calculation
    df['RSI_14'] = df['RSI_14'].fillna(50)
    
    # 4. Moving Average Convergence Divergence (MACD)
    df['MACD'] = df['Close'].ewm(span=12, adjust=False).mean() - df['Close'].ewm(span=26, adjust=False).mean()
    df['MACD_Signal'] = df['MACD'].ewm(span=9, adjust=False).mean()
    df['MACD_Hist'] = df['MACD'] - df['MACD_Signal']
    
    # 5. Bollinger Bands (20-day period)
    df['BB_Mid'] = df['Close'].rolling(window=20).mean()
    std_20 = df['Close'].rolling(window=20).std()
    df['BB_Upper'] = df['BB_Mid'] + (std_20 * 2)
    df['BB_Lower'] = df['BB_Mid'] - (std_20 * 2)
    
    # 6. Average True Range (ATR - 14 days)
    high_low = df['High'] - df['Low']
    high_pc = (df['High'] - df['Close'].shift(1)).abs()
    low_pc = (df['Low'] - df['Close'].shift(1)).abs()
    
    tr = pd.concat([high_low, high_pc, low_pc], axis=1).max(axis=1)
    df['ATR_14'] = tr.rolling(window=14).mean()
    df['ATR_14'] = df['ATR_14'].bfill() # fill initial NaNs
    
    # 7. Volatility (rolling 20-day standard deviation of returns)
    df['Daily_Return'] = df['Close'].pct_change()
    df['Volatility_20'] = df['Daily_Return'].rolling(window=20).std()
    df['Volatility_20'] = df['Volatility_20'].bfill()
    
    # 8. Momentum / Rate of Change (5-day ROC)
    df['ROC_5'] = ((df['Close'] - df['Close'].shift(5)) / (df['Close'].shift(5) + 1e-10)) * 100
    df['ROC_5'] = df['ROC_5'].fillna(0)
    
    # Fill remaining NaNs
    df = df.bfill()
    
    return df

def prepare_features(df: pd.DataFrame, target_lead: int = 1) -> tuple:
    """
    Creates target variables and returns feature matrix X and target y.
    
    We predict:
    1. Close_Target: The closing price `target_lead` days in the future (for Regression).
    2. Direction_Target: 1 if closing price in `target_lead` days is greater than today's, else 0 (for Classification).
    """
    df = df.copy()
    
    # Create target columns (shifted backwards by target_lead days)
    df['Close_Target'] = df['Close'].shift(-target_lead)
    df['Direction_Target'] = (df['Close_Target'] > df['Close']).astype(int)
    
    # Drop the last `target_lead` rows because their targets will be NaN
    df_clean = df.dropna().copy()
    if len(df_clean) < 40: # Not enough data
        raise ValueError("Insufficient data rows after engineering features.")
        
    feature_cols = [
        'Close', 'Volume', 
        'SMA_10', 'SMA_30', 
        'EMA_12', 'EMA_26', 
        'RSI_14', 'MACD', 'MACD_Signal', 'MACD_Hist',
        'BB_Mid', 'BB_Upper', 'BB_Lower', 
        'ATR_14', 'Volatility_20', 'ROC_5'
    ]
    
    X = df_clean[feature_cols].copy()
    y_reg = df_clean['Close_Target'].copy()
    y_clf = df_clean['Direction_Target'].copy()
    
    # Return the clean dataframe, feature matrix, and targets
    return df_clean, X, y_reg, y_clf, feature_cols
