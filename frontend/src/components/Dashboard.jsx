import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Info, 
  DollarSign, 
  LineChart, 
  CheckCircle, 
  HelpCircle,
  BarChart2,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import StockChart from './StockChart';
import BacktestChart from './BacktestChart';

export default function Dashboard({ 
  prediction, 
  backtest, 
  tickerList, 
  selectedTicker, 
  onTickerChange, 
  loading 
}) {
  const [search, setSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeTab, setActiveTab] = useState('price-chart');
  const suggestionsRef = useRef(null);

  // Close suggestions dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (symbol) => {
    onTickerChange(symbol);
    setSearch('');
    setShowSuggestions(false);
  };

  const filteredSuggestions = tickerList.filter(t => 
    t.symbol.toLowerCase().includes(search.toLowerCase()) ||
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  // Check if stock increased or decreased based on predicted direction
  const isPriceUp = prediction ? prediction.predicted_change_pct >= 0 : true;

  // Custom styling details based on recommendation
  const getSignalClass = (rec) => {
    if (!rec) return '';
    return rec.toLowerCase().replace(' ', '_');
  };

  const getSignalColor = (rec) => {
    switch (rec) {
      case 'STRONG BUY':
      case 'BUY':
        return 'var(--color-success)';
      case 'STRONG SELL':
      case 'SELL':
        return 'var(--color-danger)';
      case 'HOLD':
      default:
        return 'var(--color-hold)';
    }
  };

  // Convert probability to stroke-dashoffset for SVG Gauge
  const getGaugeOffset = (prob) => {
    // Circumference = 2 * PI * r = 2 * 3.14159 * 70 = 439.8
    // Offset ranges from 439.8 (0% filled) to 0 (100% filled)
    const pct = prob || 0.5;
    return 439.8 * (1 - pct);
  };

  const currentTickerName = tickerList.find(t => t.symbol === selectedTicker)?.name || selectedTicker;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Search and Autocomplete Header */}
      <div className="glass-panel stock-summary-card">
        <div className="stock-info">
          <h2>
            {prediction ? `${prediction.ticker}` : selectedTicker}
            <span className="ticker-badge">{prediction?.ticker.includes('INNV') || prediction?.ticker.includes('MEDX') || prediction?.ticker.includes('ENER') || prediction?.ticker.includes('FINA') || prediction?.ticker.includes('AUTO') ? 'Synthetic' : 'Live Market'}</span>
          </h2>
          <p className="last-updated">{currentTickerName} • Last analyzed: {prediction?.last_updated || 'Loading...'}</p>
        </div>
        
        <div className="controls-section">
          {/* Autocomplete Ticker Search */}
          <div className="search-container" ref={suggestionsRef}>
            <Search className="search-icon" />
            <input 
              type="text" 
              className="search-input" 
              placeholder="Search ticker (e.g. AAPL, TSLA, INNV)..." 
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowSuggestions(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && search.trim() !== '') {
                  handleSearchSubmit(search.trim().toUpperCase());
                }
              }}
              onFocus={() => setShowSuggestions(true)}
            />
            {showSuggestions && search && (
              <div className="suggestions-dropdown">
                {filteredSuggestions.length > 0 ? (
                  filteredSuggestions.map((item) => (
                    <button 
                      key={item.symbol} 
                      className="suggestion-item"
                      onClick={() => handleSearchSubmit(item.symbol)}
                    >
                      <span className="suggestion-symbol">{item.symbol}</span>
                      <span className="suggestion-name">{item.name}</span>
                    </button>
                  ))
                ) : (
                  <button 
                    className="suggestion-item"
                    onClick={() => handleSearchSubmit(search.trim().toUpperCase())}
                  >
                    <span className="suggestion-symbol">Search for "{search.toUpperCase()}"</span>
                    <span className="suggestion-name">Fetch live data</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p style={{ color: 'var(--text-secondary)' }}>Training ML ensembles & fetching financial indicators...</p>
        </div>
      ) : prediction ? (
        <div className="dashboard-grid">
          
          {/* 1. Decision Gauge Card */}
          <div className="glass-panel span-4 gauge-card">
            <div className="gauge-title">AI Forecast Recommendation</div>
            <div className="gauge-outer">
              <svg className="gauge-svg" viewBox="0 0 160 160">
                <circle className="gauge-bg-circle" cx="80" cy="80" r="70" />
                <circle 
                  className={`gauge-fill-circle signal-${getSignalClass(prediction.recommendation)}`} 
                  cx="80" 
                  cy="80" 
                  r="70" 
                  style={{
                    strokeDashoffset: getGaugeOffset(prediction.up_probability),
                    stroke: getSignalColor(prediction.recommendation)
                  }}
                />
              </svg>
              <div className="gauge-content">
                <span className="gauge-label">Signal</span>
                <span className={`gauge-value signal-${getSignalClass(prediction.recommendation)}`}>
                  {prediction.recommendation}
                </span>
                <span className="gauge-subvalue">
                  {(prediction.up_probability * 100).toFixed(1)}% Bullish
                </span>
              </div>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '1rem', padding: '0 1rem' }}>
              Signal represents probability of price increase based on Random Forest model parameters.
            </p>
          </div>

          {/* 2. Explainable AI Reason Box */}
          <div className="glass-panel span-8 xai-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3>
                <Info size={18} />
                Decision Justification (Explainable AI - XAI)
              </h3>
              <ul className="reasons-list">
                {prediction.reasons.slice(0, -1).map((reason, idx) => (
                  <li key={idx} className="reason-item">{reason}</li>
                ))}
              </ul>
            </div>
            {/* Conclusion highlight */}
            <div className="reason-item conclusion" style={{ borderLeftColor: getSignalColor(prediction.recommendation) }}>
              {prediction.reasons[prediction.reasons.length - 1]}
            </div>
          </div>

          {/* 3. Real-Time Price Details & Projected Next-Day Forecast */}
          <div className="glass-panel span-4 forecast-panel">
            <div>
              <div className="forecast-title">Target Horizon Forecast</div>
              <div className="forecast-sub">Next session predicted Close</div>
            </div>
            <div className="forecast-val-box">
              <div className="forecast-price">${prediction.predicted_price.toFixed(2)}</div>
              <span className={`forecast-pct ${isPriceUp ? 'up' : 'down'}`} style={{ color: isPriceUp ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {isPriceUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {prediction.predicted_change_pct.toFixed(2)}%
              </span>
            </div>
          </div>

          <div className="glass-panel span-8 stock-summary-card" style={{ padding: '1rem 1.5rem', background: 'var(--bg-tertiary)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Price</span>
              <span style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
                ${prediction.current_price.toFixed(2)}
              </span>
            </div>
            
            <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>RSI (14)</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 600, color: prediction.price_history[prediction.price_history.length - 1].RSI_14 > 70 ? 'var(--color-danger)' : prediction.price_history[prediction.price_history.length - 1].RSI_14 < 30 ? 'var(--color-success)' : '#f3f4f6' }}>
                  {prediction.price_history[prediction.price_history.length - 1].RSI_14?.toFixed(1) || 'N/A'}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>MACD</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 600, color: prediction.price_history[prediction.price_history.length - 1].MACD > prediction.price_history[prediction.price_history.length - 1].MACD_Signal ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  {prediction.price_history[prediction.price_history.length - 1].MACD?.toFixed(2) || 'N/A'}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Volatility (20d)</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-secondary)' }}>
                  {(prediction.price_history[prediction.price_history.length - 1].Volatility_20 * 100)?.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          {/* 4. Multi-tab visual output: History + Prediction OR Strategy Backtesting */}
          <div className="glass-panel span-8">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LineChart size={18} />
                Analysis Visualizer
              </h3>
              <div className="tabs-header">
                <button 
                  className={`tab-btn ${activeTab === 'price-chart' ? 'active' : ''}`}
                  onClick={() => setActiveTab('price-chart')}
                >
                  Technical & Forecast
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'backtest-chart' ? 'active' : ''}`}
                  onClick={() => setActiveTab('backtest-chart')}
                >
                  Historical Strategy Performance
                </button>
              </div>
            </div>

            {activeTab === 'price-chart' ? (
              <div>
                <StockChart history={prediction.price_history} predictedPrice={prediction.predicted_price} />
                <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  <span><span style={{ color: '#06b6d4' }}>●</span> Historical Price</span>
                  <span><span style={{ color: '#6366f1' }}>●</span> SMA-10</span>
                  <span><span style={{ color: '#8b5cf6' }}>●</span> SMA-30</span>
                  <span><span style={{ color: '#f43f5e', textShadow: '0 0 4px #f43f5e' }}>● - -</span> Forecast Next Session</span>
                </div>
              </div>
            ) : (
              <div>
                {backtest ? (
                  <>
                    <div className="backtest-summary">
                      <div className="backtest-stat">
                        <div className="backtest-stat-label">Model Cumulative Return</div>
                        <div className={`backtest-stat-val ${backtest.summary.strategy_return >= 0 ? 'positive' : 'negative'}`}>
                          {backtest.summary.strategy_return >= 0 ? '+' : ''}
                          {backtest.summary.strategy_return.toFixed(2)}%
                        </div>
                      </div>
                      <div className="backtest-stat">
                        <div className="backtest-stat-label">Buy & Hold Return</div>
                        <div className={`backtest-stat-val ${backtest.summary.bh_return >= 0 ? 'positive' : 'negative'}`}>
                          {backtest.summary.bh_return >= 0 ? '+' : ''}
                          {backtest.summary.bh_return.toFixed(2)}%
                        </div>
                      </div>
                      <div className="backtest-stat">
                        <div className="backtest-stat-label">Model Sharpe Ratio</div>
                        <div className="backtest-stat-val" style={{ color: 'var(--color-secondary)' }}>
                          {backtest.summary.strategy_sharpe.toFixed(2)}
                        </div>
                      </div>
                      <div className="backtest-stat">
                        <div className="backtest-stat-label">Model Max Drawdown</div>
                        <div className="backtest-stat-val" style={{ color: 'var(--color-danger)' }}>
                          {backtest.summary.strategy_max_drawdown.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                    <BacktestChart chartData={backtest.chart_data} />
                  </>
                ) : (
                  <div className="loading-container" style={{ padding: '2rem 0' }}>
                    <div className="spinner" style={{ width: 30, height: 30 }}></div>
                    <p style={{ fontSize: '0.85rem' }}>Running backtesting trading strategy simulations...</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 5. Metrics & Validation Card */}
          <div className="glass-panel span-4" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart2 size={18} />
              Validation Performance
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              Tested on chronologically-split out-of-sample data (last 20% of history) to evaluate prediction accuracy under real market conditions.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flexGrow: 1, justifyContent: 'center' }}>
              
              <div className="metric-box">
                <span className="metric-label">Classification Accuracy</span>
                <span className="metric-value" style={{ color: 'var(--color-success)' }}>
                  {(prediction.metrics.accuracy * 100).toFixed(1)}%
                </span>
                <span className="metric-desc">Directional prediction accuracy</span>
              </div>
              
              <div className="metric-box">
                <span className="metric-label">Mean Absolute Error (MAE)</span>
                <span className="metric-value" style={{ color: 'var(--color-secondary)' }}>
                  ${prediction.metrics.mae.toFixed(2)}
                </span>
                <span className="metric-desc">Average absolute dollar deviation</span>
              </div>
              
              <div className="metric-box">
                <span className="metric-label">R² Coefficient</span>
                <span className="metric-value" style={{ color: 'var(--color-hold)' }}>
                  {prediction.metrics.r2.toFixed(3)}
                </span>
                <span className="metric-desc">Goodness of fit (variance explained)</span>
              </div>
              
            </div>
          </div>

        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <AlertTriangle size={48} style={{ color: 'var(--color-warning)', marginBottom: '1rem' }} />
          <h3>Failed to load stock data</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Please verify your internet connection or choose another ticker symbol.</p>
        </div>
      )}
    </div>
  );
}
