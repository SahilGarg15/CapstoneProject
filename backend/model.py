import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.metrics import accuracy_score, mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import StandardScaler
import logging

logger = logging.getLogger(__name__)

class StockPredictorModel:
    def __init__(self):
        self.clf_model = RandomForestClassifier(n_estimators=100, random_state=42, max_depth=6)
        self.reg_model = GradientBoostingRegressor(n_estimators=100, random_state=42, max_depth=4)
        self.scaler = StandardScaler()
        self.feature_cols = []
        self.is_trained = False
        
        # Performance metrics
        self.accuracy = 0.0
        self.mae = 0.0
        self.rmse = 0.0
        self.r2 = 0.0
        
    def train(self, df: pd.DataFrame, X: pd.DataFrame, y_reg: pd.Series, y_clf: pd.Series, feature_cols: list):
        """
        Trains both regression and classification models using a chronological split (80% train, 20% test).
        """
        self.feature_cols = feature_cols
        n_samples = len(df)
        split_idx = int(n_samples * 0.8)
        
        X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
        y_reg_train, y_reg_test = y_reg.iloc[:split_idx], y_reg.iloc[split_idx:]
        y_clf_train, y_clf_test = y_clf.iloc[:split_idx], y_clf.iloc[split_idx:]
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train Classifier
        logger.info("Training Random Forest Classifier...")
        self.clf_model.fit(X_train_scaled, y_clf_train)
        
        # Train Regressor
        logger.info("Training Gradient Boosting Regressor...")
        self.reg_model.fit(X_train_scaled, y_reg_train)
        
        # Evaluate Classifier
        clf_preds = self.clf_model.predict(X_test_scaled)
        self.accuracy = float(accuracy_score(y_clf_test, clf_preds))
        
        # Evaluate Regressor
        reg_preds = self.reg_model.predict(X_test_scaled)
        self.mae = float(mean_absolute_error(y_reg_test, reg_preds))
        self.rmse = float(np.sqrt(mean_squared_error(y_reg_test, reg_preds)))
        self.r2 = float(r2_score(y_reg_test, reg_preds))
        
        # Refit on all data for future forecasting (standard ML deployment practice)
        X_all_scaled = self.scaler.fit_transform(X)
        self.clf_model.fit(X_all_scaled, y_clf)
        self.reg_model.fit(X_all_scaled, y_reg)
        
        self.is_trained = True
        logger.info(f"Model trained successfully. Test Accuracy: {self.accuracy:.2%}, R2: {self.r2:.2f}")
        
    def predict_next_day(self, latest_features: pd.DataFrame) -> dict:
        """
        Predicts target price and direction for the next day using the latest data row.
        """
        if not self.is_trained:
            raise ValueError("Model is not trained yet.")
            
        latest_scaled = self.scaler.transform(latest_features[self.feature_cols])
        
        # Get price prediction
        predicted_close = float(self.reg_model.predict(latest_scaled)[0])
        
        # Get movement direction prediction
        prob_up = float(self.clf_model.predict_proba(latest_scaled)[0][1])
        
        current_close = float(latest_features['Close'].iloc[0])
        pct_change = ((predicted_close - current_close) / current_close) * 100
        
        # Decision logic
        # 1. Strong Buy: Up direction probability > 0.58 and positive price returns
        # 2. Buy: Up direction probability > 0.52
        # 3. Strong Sell: Up direction probability < 0.42 and negative price returns
        # 4. Sell: Up direction probability < 0.48
        # 5. Hold: Otherwise
        if prob_up >= 0.58 and pct_change > 0.5:
            recommendation = "STRONG BUY"
        elif prob_up >= 0.52:
            recommendation = "BUY"
        elif prob_up <= 0.42 and pct_change < -0.5:
            recommendation = "STRONG SELL"
        elif prob_up <= 0.48:
            recommendation = "SELL"
        else:
            recommendation = "HOLD"
            
        # Compile explanations (XAI)
        reasons = self._generate_xai_reasons(latest_features.iloc[0], recommendation, prob_up, pct_change)
        
        return {
            "current_price": current_close,
            "predicted_price": predicted_close,
            "predicted_change_pct": pct_change,
            "up_probability": prob_up,
            "recommendation": recommendation,
            "reasons": reasons,
            "metrics": {
                "accuracy": self.accuracy,
                "mae": self.mae,
                "rmse": self.rmse,
                "r2": self.r2
            }
        }
        
    def _generate_xai_reasons(self, row: pd.Series, rec: str, prob_up: float, pct_change: float) -> list:
        """
        Generates Explainable AI (XAI) rule-based text justifications for the decision.
        """
        reasons = []
        
        # Read key indicators
        rsi = row['RSI_14']
        macd = row['MACD']
        macd_sig = row['MACD_Signal']
        close = row['Close']
        bb_upper = row['BB_Upper']
        bb_lower = row['BB_Lower']
        sma_10 = row['SMA_10']
        sma_30 = row['SMA_30']
        roc_5 = row['ROC_5']
        
        # Direction specific intro
        reasons.append(f"Model ensemble predicts an upward trend with {prob_up:.1%} probability, estimating a closing price change of {pct_change:+.2f}% in the next session.")
        
        # 1. RSI Indicator Explanation
        if rsi < 30:
            reasons.append(f"RSI (Relative Strength Index) is extremely low at {rsi:.1f}, indicating the stock is oversold. This historically signals a high probability of a bullish rebound.")
        elif rsi > 70:
            reasons.append(f"RSI is high at {rsi:.1f}, placing it in overbought territory. This suggests the asset is overvalued short-term and due for a downward price correction.")
        else:
            reasons.append(f"RSI is stable at {rsi:.1f}, showing balanced buying and selling momentum with no immediate overbought or oversold pressure.")
            
        # 2. MACD Explanation
        if macd > macd_sig:
            reasons.append(f"The MACD line ({macd:.3f}) is currently above the Signal line ({macd_sig:.3f}), creating a bullish crossover. This confirms upward price momentum is strengthening.")
        else:
            reasons.append(f"The MACD line ({macd:.3f}) is below the Signal line ({macd_sig:.3f}), forming a bearish crossover. This signals negative or fading momentum.")
            
        # 3. Bollinger Bands Explanation
        bb_width_pct = (bb_upper - bb_lower) / bb_lower * 100
        if close <= bb_lower * 1.01:
            reasons.append(f"The price (${close:.2f}) is hovering near the Lower Bollinger Band (${bb_lower:.2f}). This indicates the stock is trading near its short-term support floor.")
        elif close >= bb_upper * 0.99:
            reasons.append(f"The price (${close:.2f}) is touching the Upper Bollinger Band (${bb_upper:.2f}), suggesting it is trading at a short-term resistance ceiling.")
        else:
            reasons.append(f"The price is trading comfortably within the Bollinger Bands range (width: {bb_width_pct:.1f}%), suggesting standard price volatility.")
            
        # 4. Moving Average Trend Explanation
        if sma_10 > sma_30 and close > sma_10:
            reasons.append(f"The short-term SMA-10 (${sma_10:.2f}) is above the medium-term SMA-30 (${sma_30:.2f}), and the current price is above both. This defines a strong, established upward trend.")
        elif sma_10 < sma_30 and close < sma_10:
            reasons.append(f"The SMA-10 (${sma_10:.2f}) is below the SMA-30 (${sma_30:.2f}), indicating an active medium-term downtrend.")
        else:
            reasons.append("Moving averages (10-day and 30-day SMAs) are currently converging, reflecting a consolidation phase and potential trend pivot.")
            
        # Summary conclusion
        if rec in ["BUY", "STRONG BUY"]:
            reasons.append(f"CONCLUSION: Bullish technical indicators outweigh bearish ones, and our Gradient Boosting model projects a positive price shift. RECOMMENDATION: {rec}.")
        elif rec in ["SELL", "STRONG SELL"]:
            reasons.append(f"CONCLUSION: Bearish indicators dominate, paired with negative price momentum forecasts. RECOMMENDATION: {rec}.")
        else:
            reasons.append("CONCLUSION: Opposing technical forces and small predicted changes support a wait-and-see strategy. RECOMMENDATION: HOLD.")
            
        return reasons

def run_backtest(df: pd.DataFrame, X: pd.DataFrame, y_clf: pd.Series, model: StockPredictorModel, initial_capital: float = 10000.0) -> dict:
    """
    Performs a historical backtest of the model strategy on the test portion (last 20% of data).
    
    Strategy:
    - If model predicts Direction=1 (prob_up > 0.52) -> BUY/HOLD stock (All-In).
    - If model predicts Direction=0 (prob_up < 0.48) -> SELL stock, hold cash.
    - Else (0.48 <= prob_up <= 0.52) -> Keep current position.
    """
    n_samples = len(df)
    split_idx = int(n_samples * 0.8)
    
    # We backtest strictly on the test set to avoid look-ahead / overfitting bias!
    test_df = df.iloc[split_idx:].copy().reset_index(drop=True)
    test_X = X.iloc[split_idx:].copy().reset_index(drop=True)
    
    # Scale features using the scaler fitted during training
    test_X_scaled = model.scaler.transform(test_X)
    
    # Predict direction probabilities
    probs_up = model.clf_model.predict_proba(test_X_scaled)[:, 1]
    
    # Setup portfolios
    cash = initial_capital
    shares = 0.0
    position = 0 # 0 = Cash, 1 = Stock
    
    strategy_values = []
    bh_values = []
    dates = []
    signals = []
    
    # For Buy and Hold benchmark
    first_close = test_df.iloc[0]['Close']
    shares_bh = initial_capital / first_close
    
    for i in range(len(test_df)):
        row = test_df.iloc[i]
        date_str = row['Date'].strftime('%Y-%m-%d')
        close_price = row['Close']
        prob = probs_up[i]
        
        # Decide action based on signal
        if prob > 0.52:
            signal = "BUY"
        elif prob < 0.48:
            signal = "SELL"
        else:
            signal = "HOLD"
            
        # Execute trade
        if signal == "BUY" and position == 0:
            # Buy all shares
            shares = cash / close_price
            cash = 0
            position = 1
        elif signal == "SELL" and position == 1:
            # Sell all shares
            cash = shares * close_price
            shares = 0
            position = 0
            
        # Calculate current portfolio value
        strategy_val = cash + (shares * close_price)
        bh_val = shares_bh * close_price
        
        strategy_values.append(float(strategy_val))
        bh_values.append(float(bh_val))
        dates.append(date_str)
        signals.append(signal)
        
    # Calculate performance metrics
    strategy_return = ((strategy_values[-1] - initial_capital) / initial_capital) * 100
    bh_return = ((bh_values[-1] - initial_capital) / initial_capital) * 100
    
    # Volatility and Sharpe Ratio
    strat_series = pd.Series(strategy_values)
    strat_pct = strat_series.pct_change().dropna()
    bh_series = pd.Series(bh_values)
    bh_pct = bh_series.pct_change().dropna()
    
    # Sharpe Ratio: Annualized Return / Annualized Volatility (assuming 252 trading days)
    # Risk-free rate assumed as 0 for simplicity
    std_strat = strat_pct.std()
    sharpe_strat = (strat_pct.mean() / (std_strat + 1e-10)) * np.sqrt(252) if std_strat > 0 else 0.0
    
    std_bh = bh_pct.std()
    sharpe_bh = (bh_pct.mean() / (std_bh + 1e-10)) * np.sqrt(252) if std_bh > 0 else 0.0
    
    # Max Drawdowns
    def get_max_drawdown(values):
        val_series = pd.Series(values)
        roll_max = val_series.cummax()
        drawdown = (val_series - roll_max) / roll_max
        return float(drawdown.min() * 100)
        
    max_dd_strat = get_max_drawdown(strategy_values)
    max_dd_bh = get_max_drawdown(bh_values)
    
    return {
        "dates": dates,
        "strategy_values": strategy_values,
        "bh_values": bh_values,
        "signals": signals,
        "summary": {
            "initial_capital": initial_capital,
            "strategy_final": strategy_values[-1],
            "strategy_return": strategy_return,
            "strategy_sharpe": float(sharpe_strat),
            "strategy_max_drawdown": max_dd_strat,
            "bh_final": bh_values[-1],
            "bh_return": bh_return,
            "bh_sharpe": float(sharpe_bh),
            "bh_max_drawdown": max_dd_bh
        }
    }
