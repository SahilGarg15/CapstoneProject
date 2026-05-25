import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import { AlertCircle, LineChart } from 'lucide-react';

const API_BASE_URL = 'http://127.0.0.1:8000';

export default function App() {
  const [tickerList, setTickerList] = useState([]);
  const [selectedTicker, setSelectedTicker] = useState('AAPL');
  const [prediction, setPrediction] = useState(null);
  const [backtest, setBacktest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Fetch available tickers list on mount
  useEffect(() => {
    async function fetchTickers() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/tickers`);
        if (!response.ok) throw new Error('Failed to retrieve tickers list');
        const data = await response.json();
        setTickerList(data);
      } catch (err) {
        console.error('Error fetching ticker symbols:', err);
        // Fallback options in case backend isn't up yet
        setTickerList([
          {symbol: "AAPL", name: "Apple Inc. (Live)"},
          {symbol: "MSFT", name: "Microsoft Corp. (Live)"},
          {symbol: "GOOGL", name: "Alphabet Inc. (Live)"},
          {symbol: "TSLA", name: "Tesla Inc. (Live)"},
          {symbol: "INNV", name: "Innovar Tech (Synthetic)"}
        ]);
      }
    }
    fetchTickers();
  }, []);

  // 2. Fetch prediction and backtest data when ticker changes
  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setError(null);
      setPrediction(null);
      setBacktest(null);

      try {
        // Fetch Prediction
        const predResponse = await fetch(`${API_BASE_URL}/api/predict?ticker=${selectedTicker}`);
        if (!predResponse.ok) {
          const detail = await predResponse.json().catch(() => ({}));
          throw new Error(detail.detail || `Prediction API error: ${predResponse.status}`);
        }
        const predData = await predResponse.json();
        
        if (!active) return;
        setPrediction(predData);

        // Fetch Backtest
        const btResponse = await fetch(`${API_BASE_URL}/api/backtest?ticker=${selectedTicker}`);
        if (!btResponse.ok) {
          const detail = await btResponse.json().catch(() => ({}));
          throw new Error(detail.detail || `Backtest API error: ${btResponse.status}`);
        }
        const btData = await btResponse.json();
        
        if (!active) return;
        setBacktest(btData);
        setLoading(false);
      } catch (err) {
        console.error('Data pipeline error:', err);
        if (active) {
          setError(err.message || 'An unexpected error occurred while fetching analysis');
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, [selectedTicker]);

  return (
    <div className="app-container">
      {/* App Header */}
      <header className="app-header">
        <div className="brand-section">
          <span className="brand-logo">📈</span>
          <div className="brand-title">
            <h1>StockInsight AI</h1>
            <p>Advanced Time-Series Forecasting & Decision Explainability Dashboard</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'right' }}>
            <span style={{ display: 'block', fontWeight: 600, color: 'var(--text-secondary)' }}>Status: Active</span>
            <span>FastAPI Server: {API_BASE_URL}</span>
          </div>
        </div>
      </header>

      {/* Error Alert Panel */}
      {error && (
        <div className="error-container">
          <AlertCircle size={24} style={{ flexShrink: 0 }} />
          <div>
            <h4 style={{ fontWeight: 700, marginBottom: '0.2rem' }}>Data Acquisition Failure</h4>
            <p style={{ fontSize: '0.9rem', opacity: 0.9 }}>{error}</p>
          </div>
        </div>
      )}

      {/* Primary Dashboard View */}
      <Dashboard 
        prediction={prediction}
        backtest={backtest}
        tickerList={tickerList}
        selectedTicker={selectedTicker}
        onTickerChange={setSelectedTicker}
        loading={loading}
      />
    </div>
  );
}
