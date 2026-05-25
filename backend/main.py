from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import os
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import logging

from data_processor import fetch_stock_data, add_technical_indicators, prepare_features
from model import StockPredictorModel, run_backtest

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="StockInsight AI API", version="1.0.0")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify frontend port (e.g. http://localhost:5173)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SYNTHETIC_DATA_PATH = os.path.join(BASE_DIR, "data", "synthetic_stock_data.csv")

# Ticker choices
TICKERS_LIST = [
    {"symbol": "AAPL", "name": "Apple Inc. (Live)"},
    {"symbol": "MSFT", "name": "Microsoft Corp. (Live)"},
    {"symbol": "GOOGL", "name": "Alphabet Inc. (Live)"},
    {"symbol": "AMZN", "name": "Amazon.com Inc. (Live)"},
    {"symbol": "TSLA", "name": "Tesla Inc. (Live)"},
    {"symbol": "NVDA", "name": "NVIDIA Corp. (Live)"},
    {"symbol": "INNV", "name": "Innovar Tech (Synthetic)"},
    {"symbol": "MEDX", "name": "Medex Health (Synthetic)"},
    {"symbol": "ENER", "name": "Energy Grid (Synthetic)"},
    {"symbol": "FINA", "name": "Financial Corp (Synthetic)"},
    {"symbol": "AUTO", "name": "AutoDrive EV (Synthetic)"}
]

def load_synthetic_ticker(ticker: str) -> pd.DataFrame:
    """
    Loads synthetic stock data for a specific ticker from the local database.
    """
    if not os.path.exists(SYNTHETIC_DATA_PATH):
        # Generate synthetic data if not exists
        logger.info("Synthetic database not found. Generating now...")
        from generate_synthetic import generate_large_dataset
        generate_large_dataset(SYNTHETIC_DATA_PATH)
        
    df_all = pd.read_csv(SYNTHETIC_DATA_PATH)
    df_ticker = df_all[df_all['Ticker'] == ticker].copy()
    if df_ticker.empty:
        raise ValueError(f"Synthetic ticker {ticker} not found.")
        
    df_ticker['Date'] = pd.to_datetime(df_ticker['Date'])
    df_ticker = df_ticker.sort_values(by='Date').reset_index(drop=True)
    return df_ticker

def get_stock_data_pipeline(ticker: str) -> pd.DataFrame:
    """
    Unified pipeline to fetch stock data (either Live from yfinance or Synthetic from CSV).
    """
    ticker_upper = ticker.upper()
    synthetic_symbols = ["INNV", "MEDX", "ENER", "FINA", "AUTO"]
    
    if ticker_upper in synthetic_symbols:
        df = load_synthetic_ticker(ticker_upper)
    else:
        df = fetch_stock_data(ticker_upper, period="2y")
        
    return df

@app.get("/api/tickers")
async def get_tickers():
    """
    Returns lists of supported live and synthetic tickers.
    """
    return TICKERS_LIST

@app.get("/api/predict")
async def get_prediction(ticker: str = Query(..., description="Stock ticker symbol e.g. AAPL or INNV")):
    try:
        # 1. Fetch raw data
        df = get_stock_data_pipeline(ticker)
        
        # 2. Add technical indicators
        df_indicators = add_technical_indicators(df)
        
        # 3. Separate the last row (prediction row) and historical rows for training
        latest_row = df_indicators.tail(1).copy()
        historical_df = df_indicators.iloc[:-1].copy()
        
        # 4. Prepare features for training on history
        df_clean, X, y_reg, y_clf, feature_cols = prepare_features(historical_df, target_lead=1)
        
        # 5. Train models
        predictor = StockPredictorModel()
        predictor.train(df_clean, X, y_reg, y_clf, feature_cols)
        
        # 6. Predict next day
        prediction_results = predictor.predict_next_day(latest_row)
        
        # 7. Add basic stock metadata
        prediction_results["ticker"] = ticker.upper()
        prediction_results["last_updated"] = latest_row['Date'].iloc[0].strftime('%Y-%m-%d %H:%M:%S')
        prediction_results["price_history"] = df_indicators.tail(90)[['Date', 'Close', 'SMA_10', 'SMA_30']].to_dict(orient='records')
        
        # Convert date to string for JSON serialization
        for item in prediction_results["price_history"]:
            item["Date"] = item["Date"].strftime('%Y-%m-%d')
            
        return prediction_results
        
    except Exception as e:
        logger.exception(f"Error serving prediction for ticker {ticker}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/backtest")
async def get_backtest(ticker: str = Query(..., description="Stock ticker symbol e.g. AAPL or INNV")):
    try:
        # 1. Fetch raw data
        df = get_stock_data_pipeline(ticker)
        
        # 2. Add indicators
        df_indicators = add_technical_indicators(df)
        
        # 3. Prepare features
        df_clean, X, y_reg, y_clf, feature_cols = prepare_features(df_indicators, target_lead=1)
        
        # 4. Train model
        predictor = StockPredictorModel()
        predictor.train(df_clean, X, y_reg, y_clf, feature_cols)
        
        # 5. Run backtest
        backtest_results = run_backtest(df_clean, X, y_clf, predictor)
        
        # Format return payload
        backtest_data = []
        for i in range(len(backtest_results["dates"])):
            backtest_data.append({
                "Date": backtest_results["dates"][i],
                "Strategy": backtest_results["strategy_values"][i],
                "BuyAndHold": backtest_results["bh_values"][i],
                "Signal": backtest_results["signals"][i]
            })
            
        return {
            "ticker": ticker.upper(),
            "summary": backtest_results["summary"],
            "chart_data": backtest_data
        }
        
    except Exception as e:
        logger.exception(f"Error serving backtest for ticker {ticker}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
