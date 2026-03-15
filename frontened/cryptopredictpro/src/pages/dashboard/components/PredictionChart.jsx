import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Icon from '../../../components/AppIcon';
import { formatINRPrice } from '../../../services/predictionApi';

const PredictionChart = ({ predictionData, loading, selectedCrypto }) => {
  if (loading) {
    return (
      <div className="neo-card hud-border p-6 h-96">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Icon name="BarChart3" size={24} color="var(--color-primary)" />
            </div>
            <p className="text-muted-foreground">Fetching live Binance data and generating AI predictions...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!predictionData || predictionData?.length === 0) {
    return (
      <div className="neo-card hud-border p-6 h-96">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="TrendingUp" size={24} color="var(--color-muted-foreground)" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No Prediction Data</h3>
            <p className="text-muted-foreground">Select a cryptocurrency and timeframe to generate live predictions</p>
          </div>
        </div>
      </div>
    );
  }

  // Custom tooltip to show INR formatted prices
  const formatTooltipValue = (value, name) => {
    if (name === 'actual' || name === 'predicted') {
      return [formatINRPrice(value), name === 'actual' ? 'Actual Price (INR)' : 'AI Predicted Price (INR)'];
    }
    return [value, name];
  };

  return (
    <div className="neo-card hud-border p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center mr-3 soft-glow">
            <Icon name="BarChart3" size={20} color="var(--color-primary)" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Live Price Prediction Chart</h3>
            <p className="text-sm text-muted-foreground">
              {selectedCrypto} - Actual vs AI Predicted Prices (INR)
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-primary rounded-full mr-2"></div>
            <span className="text-sm text-muted-foreground">Actual (Live)</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-accent rounded-full mr-2"></div>
            <span className="text-sm text-muted-foreground">AI Predicted</span>
          </div>
        </div>
      </div>
      
      {/* Live data indicator */}
      <div className="flex items-center mb-4 p-2 bg-success/10 border border-success/20 rounded-xl">
        <div className="w-2 h-2 bg-success rounded-full mr-2 animate-pulse"></div>
        <span className="text-xs text-success">Live Binance Data • Updated in Real-time</span>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={predictionData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis 
              dataKey="time" 
              stroke="var(--color-muted-foreground)"
              fontSize={12}
            />
            <YAxis 
              stroke="var(--color-muted-foreground)"
              fontSize={12}
              tickFormatter={(value) => formatINRPrice(value)}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'rgba(8,22,43,0.95)',
                border: '1px solid rgba(97,130,176,0.3)',
                borderRadius: '12px',
                color: 'var(--color-foreground)'
              }}
              formatter={formatTooltipValue}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="actual" 
              stroke="var(--color-primary)" 
              strokeWidth={2}
              dot={{ fill: 'var(--color-primary)', strokeWidth: 2, r: 4 }}
              name="Actual Price"
            />
            <Line 
              type="monotone" 
              dataKey="predicted" 
              stroke="var(--color-accent)" 
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: 'var(--color-accent)', strokeWidth: 2, r: 4 }}
              name="AI Predicted Price"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PredictionChart;
