import React from 'react';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';

const PredictionControls = ({ 
  selectedCrypto, 
  selectedTimeframe, 
  onPredict, 
  loading, 
  lastPrediction 
}) => {
  const canPredict = selectedCrypto && selectedTimeframe && !loading;

  return (
    <div className="neo-card hud-border p-6">
      <div className="flex items-center mb-4">
        <div className="w-10 h-10 bg-success/15 rounded-xl flex items-center justify-center mr-3 soft-glow">
          <Icon name="Zap" size={20} color="var(--color-success)" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Generate Prediction</h3>
          <p className="text-sm text-muted-foreground">AI-powered price analysis</p>
        </div>
      </div>
      <Button
        variant="default"
        size="lg"
        onClick={onPredict}
        disabled={!canPredict}
        loading={loading}
        iconName="TrendingUp"
        iconPosition="left"
        iconSize={20}
        fullWidth
        className="h-14 text-base font-semibold tracking-wide"
      >
        {loading ? 'Generating Prediction...' : 'Predict Price'}
      </Button>
      {!canPredict && !loading && (
        <div className="mt-4 p-3 bg-warning/10 border border-warning/30 rounded-xl">
          <div className="flex items-center">
            <Icon name="AlertTriangle" size={16} color="var(--color-warning)" className="mr-2" />
            <span className="text-sm text-warning">
              Please select both cryptocurrency and timeframe
            </span>
          </div>
        </div>
      )}
      {lastPrediction && (
        <div className="mt-4 p-3 bg-muted/70 rounded-xl border border-border/70">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Icon name="Clock" size={16} color="var(--color-muted-foreground)" className="mr-2" />
              <span className="text-sm text-muted-foreground">Last prediction</span>
            </div>
            <span className="text-sm font-medium text-foreground">
              {new Date(lastPrediction.timestamp)?.toLocaleTimeString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PredictionControls;
