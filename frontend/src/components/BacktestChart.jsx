import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';

export default function BacktestChart({ chartData }) {
  if (!chartData || chartData.length === 0) {
    return <div style={{ color: '#6b7280', padding: '2rem', textAlign: 'center' }}>No historical backtesting data available</div>;
  }

  // Min/Max portfolio values for scaling
  const values = chartData.flatMap(d => [d.Strategy, d.BuyAndHold]);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const yDomain = [
    Math.floor(minVal * 0.95),
    Math.ceil(maxVal * 1.05)
  ];

  // Custom tooltips
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          backgroundColor: '#171b26',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: '10px 14px',
          borderRadius: '8px',
          boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
        }}>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#9ca3af', fontWeight: 600 }}>{data.Date}</p>
          <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: '#6366f1', fontWeight: 700 }}>
            Model Strategy: <span style={{ color: '#6366f1' }}>${data.Strategy.toLocaleString(undefined, {maximumFractionDigits:2})}</span>
          </p>
          <p style={{ margin: '2px 0 0', fontSize: '0.9rem', color: '#9ca3af', fontWeight: 700 }}>
            Buy & Hold: <span style={{ color: '#f3f4f6' }}>${data.BuyAndHold.toLocaleString(undefined, {maximumFractionDigits:2})}</span>
          </p>
          {data.Signal && (
            <p style={{ 
              margin: '6px 0 0', 
              fontSize: '0.8rem', 
              fontWeight: 600, 
              color: data.Signal === 'BUY' ? '#10b981' : data.Signal === 'SELL' ? '#ef4444' : '#8b5cf6' 
            }}>
              Model Decision: {data.Signal}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorStrategy" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
            </linearGradient>
            <linearGradient id="colorBH" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#9ca3af" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#9ca3af" stopOpacity={0.0}/>
            </linearGradient>
          </defs>
          
          <XAxis 
            dataKey="Date" 
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255, 255, 255, 0.05)' }}
            minTickGap={30}
          />
          <YAxis 
            domain={yDomain}
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            orientation="right"
            tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="top" 
            height={36} 
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, color: '#9ca3af' }}
          />

          {/* Buy & Hold Area (Background) */}
          <Area 
            name="Buy & Hold Benchmark"
            type="monotone" 
            dataKey="BuyAndHold" 
            stroke="#9ca3af" 
            strokeWidth={1.5}
            strokeDasharray="3 3"
            fillOpacity={1} 
            fill="url(#colorBH)" 
          />

          {/* Strategy Area (Foreground) */}
          <Area 
            name="Model Strategy"
            type="monotone" 
            dataKey="Strategy" 
            stroke="#6366f1" 
            strokeWidth={2.5}
            fillOpacity={1} 
            fill="url(#colorStrategy)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
