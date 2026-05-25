import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceDot
} from 'recharts';

export default function StockChart({ history, predictedPrice }) {
  if (!history || history.length === 0) {
    return <div style={{ color: '#6b7280', padding: '2rem', textAlign: 'center' }}>No historical chart data available</div>;
  }

  // Format historical data for Recharts
  const chartData = history.map(item => ({
    date: item.Date,
    close: parseFloat(item.Close.toFixed(2)),
    sma10: item.SMA_10 ? parseFloat(item.SMA_10.toFixed(2)) : null,
    sma30: item.SMA_30 ? parseFloat(item.SMA_30.toFixed(2)) : null
  }));

  // Create a projection point
  const lastIndex = history.length - 1;
  const lastItem = history[lastIndex];
  const lastDate = new Date(lastItem.Date);
  
  // Calculate next business day
  const nextDate = new Date(lastDate);
  const day = nextDate.getDay();
  const daysToAdd = (day === 5) ? 3 : (day === 6) ? 2 : 1;
  nextDate.setDate(nextDate.getDate() + daysToAdd);
  const nextDateStr = nextDate.toISOString().split('T')[0];

  const predictionPoint = {
    date: nextDateStr,
    close: null,
    predicted: parseFloat(predictedPrice.toFixed(2)),
    sma10: null,
    sma30: null
  };

  // Combine data for charting the dashed line connection
  const combinedData = [...chartData];
  // Add a final entry to chartData that duplicates the last close price but labeled for predicted line start
  combinedData[lastIndex] = {
    ...combinedData[lastIndex],
    predicted: parseFloat(lastItem.Close.toFixed(2))
  };
  combinedData.push(predictionPoint);

  // Min and Max values for YAxis scaling
  const closes = history.map(h => h.Close);
  const minClose = Math.min(...closes, predictedPrice);
  const maxClose = Math.max(...closes, predictedPrice);
  const yDomain = [
    Math.floor(minClose * 0.97),
    Math.ceil(maxClose * 1.03)
  ];

  // Custom tooltips for elegant dark styling
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isPrediction = data.date === nextDateStr;
      
      return (
        <div style={{
          backgroundColor: '#171b26',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: '10px 14px',
          borderRadius: '8px',
          boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
        }}>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#9ca3af', fontWeight: 600 }}>{data.date}</p>
          {!isPrediction && (
            <>
              <p style={{ margin: '4px 0 0', fontSize: '0.95rem', color: '#f3f4f6', fontWeight: 700 }}>
                Close: <span style={{ color: '#06b6d4' }}>${data.close}</span>
              </p>
              {data.sma10 && (
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#a5b4fc' }}>
                  SMA 10: ${data.sma10}
                </p>
              )}
              {data.sma30 && (
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#c084fc' }}>
                  SMA 30: ${data.sma30}
                </p>
              )}
            </>
          )}
          {isPrediction && (
            <p style={{ margin: '4px 0 0', fontSize: '0.95rem', color: '#fb7185', fontWeight: 700 }}>
              Forecast: ${data.predicted}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height: 350 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={combinedData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25}/>
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0}/>
            </linearGradient>
          </defs>
          
          <XAxis 
            dataKey="date" 
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255, 255, 255, 0.05)' }}
            minTickGap={20}
          />
          <YAxis 
            domain={yDomain}
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            orientation="right"
          />
          <Tooltip content={<CustomTooltip />} />
          
          <Legend 
            verticalAlign="top" 
            height={36} 
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, color: '#9ca3af' }}
          />

          {/* Area under historical price */}
          <Area 
            name="Closing Price"
            type="monotone" 
            dataKey="close" 
            stroke="#06b6d4" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorClose)" 
          />

          {/* SMA 10 Line */}
          <Line 
            name="SMA 10"
            type="monotone" 
            dataKey="sma10" 
            stroke="#6366f1" 
            strokeWidth={1.5}
            dot={false}
            activeDot={false}
          />

          {/* SMA 30 Line */}
          <Line 
            name="SMA 30"
            type="monotone" 
            dataKey="sma30" 
            stroke="#8b5cf6" 
            strokeWidth={1.5}
            dot={false}
            activeDot={false}
          />

          {/* Prediction Projection (dashed line from last historical close to prediction) */}
          <Line 
            name="Prediction Forecast"
            type="monotone" 
            dataKey="predicted" 
            stroke="#f43f5e" 
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            activeDot={{ r: 6 }}
          />

          {/* Draw a distinct dot on the forecast point */}
          <ReferenceDot 
            x={nextDateStr} 
            y={predictedPrice} 
            r={5} 
            fill="#f43f5e" 
            stroke="#fff" 
            strokeWidth={1.5}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
