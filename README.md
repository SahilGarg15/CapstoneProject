# StockInsight AI - Capstone Project

A full-stack Stock Prediction and Analysis Application that utilizes Machine Learning to provide next-day stock price predictions and actionable stock recommendations.

## Features

- **Live & Synthetic Data**: Predicts on live market data via `yfinance` (e.g., AAPL, MSFT) and locally generated synthetic tickers.
- **Dual Machine Learning Models**: 
  - **Regressor**: `GradientBoostingRegressor` to predict the exact forecasted closing price.
  - **Classifier**: `RandomForestClassifier` to calculate the probability of price movements (Up/Down) to generate "STRONG BUY", "BUY", "HOLD", "SELL", and "STRONG SELL" signals.
- **Technical Indicators**: Automatically calculates SMA, EMA, MACD, RSI, Bollinger Bands, ATR, and Momentum/ROC on the fly.
- **Interactive Dashboard**: A React frontend with Vite for rapid development, featuring advanced chart visualizations using Recharts.

## Tech Stack

**Backend**:
- Python 3
- FastAPI
- Scikit-Learn
- Pandas & NumPy
- yfinance

**Frontend**:
- React 18
- Vite
- Recharts
- Lucide React (Icons)

## Project Structure

```text
.
├── backend/
│   ├── data_processor.py      # Data fetching (yfinance) & technical indicator engineering
│   ├── generate_synthetic.py  # Utility to generate synthetic market data
│   ├── main.py                # FastAPI endpoints
│   ├── model.py               # ML training and prediction logic (RandomForest, GradientBoosting)
│   ├── requirements.txt       # Python dependencies
│   └── data/                  # Storage for synthetic CSV databases
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/                   # React components and pages
```

## Setup & Installation

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```
3. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the FastAPI development server:
   ```bash
   uvicorn main:app --reload
   ```
   *The backend will be running at `http://127.0.0.1:8000`*

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend will be running typically at `http://localhost:5173`*

## How it works

1. The React frontend allows the user to select a Live or Synthetic stock ticker.
2. The FastAPI backend fetches the relevant historical data.
3. Feature engineering adds necessary technical indicators.
4. The system chronologically splits historical data (80/20) and trains both a Classifier and Regressor model.
5. The model evaluates on the test split, applies the results to the latest market entry, and predicts the next day's closing price and trajectory.
6. The frontend renders the historical backtesting and visualizes the expected prediction signal.

## License

This project is licensed under the MIT License.
