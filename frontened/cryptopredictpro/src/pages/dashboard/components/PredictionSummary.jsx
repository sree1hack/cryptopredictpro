import React from 'react';
import Icon from '../../../components/AppIcon';
import { formatINRPrice } from '../../../services/predictionApi';

const PredictionSummary = ({ predictionSummary, loading, selectedCrypto, selectedTimeframe }) => {
  if (loading) {
    return (
      <div className="neo-card hud-border p-6">
        <div className="animate-pulse">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-muted rounded-lg mr-3"></div>
            <div>
              <div className="h-4 bg-muted rounded w-32 mb-2"></div>
              <div className="h-3 bg-muted rounded w-48"></div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!predictionSummary) {
    return (
      <div className="neo-card hud-border p-6">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center mr-3">
            <Icon name="FileText" size={20} color="var(--color-muted-foreground)" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Prediction Summary</h3>
            <p className="text-sm text-muted-foreground">AI analysis will appear here</p>
          </div>
        </div>
        <p className="text-muted-foreground text-center py-8">
          Generate a prediction to see detailed analysis in INR
        </p>
      </div>
    );
  }

  const getPredictionIcon = (trend) => {
    switch (trend) {
      case 'bullish':
        return { name: 'TrendingUp', color: 'var(--color-success)' };
      case 'bearish':
        return { name: 'TrendingDown', color: 'var(--color-error)' };
      default:
        return { name: 'Minus', color: 'var(--color-warning)' };
    }
  };

  const icon = getPredictionIcon(predictionSummary?.trend);

  // Format timeframe display
  const getTimeframeDisplay = () => {
    if (!selectedTimeframe) return '';
    const { type, value } = selectedTimeframe;
    return type === 'hourly' 
      ? `${value} Hour${value > 1 ? 's' : ''}`
      : `${value} Day${value > 1 ? 's' : ''}`;
  };

  return (
    <div className="neo-card hud-border p-6">
      <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center mr-3 soft-glow">
            <Icon name="FileText" size={20} color="var(--color-primary)" />
          </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Prediction Summary</h3>
          <p className="text-sm text-muted-foreground">
            {selectedCrypto} - {getTimeframeDisplay()} Analysis (INR)
          </p>
        </div>
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-muted/70 rounded-xl border border-border/70">
          <div className="flex items-center">
            <Icon name={icon?.name} size={20} color={icon?.color} className="mr-3" />
            <div>
              <p className="font-medium text-foreground capitalize">{predictionSummary?.trend} Trend</p>
              <p className="text-sm text-muted-foreground">AI Market Analysis</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-foreground">
              {predictionSummary?.priceChange > 0 ? '+' : ''}
              {predictionSummary?.priceChange?.toFixed(2)}%
            </p>
            <p className="text-sm text-muted-foreground">Expected change</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-success/10 border border-success/20 rounded-xl">
            <div className="flex items-center mb-2">
              <Icon name="Target" size={16} color="var(--color-success)" className="mr-2" />
              <span className="text-sm font-medium text-success">Target Price</span>
            </div>
            <p className="text-lg font-bold text-foreground">
              {formatINRPrice(predictionSummary?.targetPrice)}
            </p>
          </div>

          <div className="p-3 bg-warning/10 border border-warning/20 rounded-xl">
            <div className="flex items-center mb-2">
              <Icon name="AlertTriangle" size={16} color="var(--color-warning)" className="mr-2" />
              <span className="text-sm font-medium text-warning">AI Confidence</span>
            </div>
            <p className="text-lg font-bold text-foreground">
              {predictionSummary?.confidence}%
            </p>
          </div>
        </div>

        <div className="p-4 bg-muted/70 rounded-xl border border-border/70">
          <div className="flex items-start">
            <Icon name="Info" size={16} color="var(--color-primary)" className="mr-2 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground mb-1">AI Analysis</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {predictionSummary?.analysis}
              </p>
            </div>
          </div>
        </div>

        {/* Live data indicator */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-success rounded-full mr-2 animate-pulse"></div>
            <span>Generated: {new Date(predictionSummary?.timestamp)?.toLocaleString()}</span>
          </div>
          <span>Live Binance Data • TensorFlow AI</span>
        </div>
      </div>
    </div>
  );
};

export default PredictionSummary;
