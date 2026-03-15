import React, { useState, useEffect } from 'react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Icon from '../../../components/AppIcon';

const TimeframeSelector = ({ selectedTimeframe, onTimeframeChange, loading }) => {
  const [activeTab, setActiveTab] = useState('hourly');
  const [hourlyValue, setHourlyValue] = useState(1);
  const [dailyValue, setDailyValue] = useState(1);

  // Initialize values from selectedTimeframe if it exists
  useEffect(() => {
    if (selectedTimeframe) {
      if (selectedTimeframe?.type === 'hourly') {
        setActiveTab('hourly');
        setHourlyValue(selectedTimeframe?.value || 1);
      } else if (selectedTimeframe?.type === 'daily') {
        setActiveTab('daily');
        setDailyValue(selectedTimeframe?.value || 1);
      }
    }
  }, [selectedTimeframe]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);

    // Automatically set the timeframe when switching tabs
    const newTimeframe = {
      type: tab,
      value: tab === 'hourly' ? hourlyValue : dailyValue
    };
    onTimeframeChange(newTimeframe);
  };

  const handleValueChange = (value, type) => {
    const parsedValue = parseInt(value) || 1;
    const min = 1;
    const max = type === 'hourly' ? 24 : 30; // ✅ restrict hourly to 1–24

    const numValue = Math.max(min, Math.min(max, parsedValue));

    if (type === 'hourly') {
      setHourlyValue(numValue);
      if (activeTab === 'hourly') {
        onTimeframeChange({ type: 'hourly', value: numValue });
      }
    } else {
      setDailyValue(numValue);
      if (activeTab === 'daily') {
        onTimeframeChange({ type: 'daily', value: numValue });
      }
    }
  };

  const getDisplayText = () => {
    if (!selectedTimeframe) return '';
    const { type, value } = selectedTimeframe;
    return type === 'hourly'
      ? `${value} Hour${value > 1 ? 's' : ''}`
      : `${value} Day${value > 1 ? 's' : ''}`;
  };

  return (
    <div className="neo-card hud-border p-6">
      <div className="flex items-center mb-4">
        <div className="w-10 h-10 bg-accent/15 rounded-xl flex items-center justify-center mr-3 soft-glow">
          <Icon name="Timer" size={20} color="var(--color-accent)" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Prediction Timeframe</h3>
          <p className="text-sm text-muted-foreground">Select prediction duration</p>
        </div>
      </div>

      {/* Tab Selection */}
      <div className="flex mb-4 bg-muted/70 rounded-xl p-1 border border-border/70">
        <button
          onClick={() => handleTabChange('hourly')}
          disabled={loading}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'hourly'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center justify-center">
            <Icon name="Clock" size={16} className="mr-2" />
            Hourly
          </div>
        </button>
        <button
          onClick={() => handleTabChange('daily')}
          disabled={loading}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'daily'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center justify-center">
            <Icon name="Calendar" size={16} className="mr-2" />
            Daily
          </div>
        </button>
      </div>

      {/* Input Section */}
      <div className="space-y-4">
        {activeTab === 'hourly' && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Number of Hours (1-24)
            </label>
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                min="1"
                max="24"
                value={hourlyValue}
                onChange={(e) => handleValueChange(e.target.value, 'hourly')}
                disabled={loading}
                className="flex-1"
                placeholder="Enter hours"
              />
              <div className="flex space-x-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleValueChange(hourlyValue - 1, 'hourly')}
                  disabled={loading || hourlyValue <= 1}
                  className="px-2"
                >
                  <Icon name="Minus" size={14} />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleValueChange(hourlyValue + 1, 'hourly')}
                  disabled={loading || hourlyValue >= 24}
                  className="px-2"
                >
                  <Icon name="Plus" size={14} />
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'daily' && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Number of Days (1-30)
            </label>
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                min="1"
                max="30"
                value={dailyValue}
                onChange={(e) => handleValueChange(e.target.value, 'daily')}
                disabled={loading}
                className="flex-1"
                placeholder="Enter days"
              />
              <div className="flex space-x-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleValueChange(dailyValue - 1, 'daily')}
                  disabled={loading || dailyValue <= 1}
                  className="px-2"
                >
                  <Icon name="Minus" size={14} />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleValueChange(dailyValue + 1, 'daily')}
                  disabled={loading || dailyValue >= 30}
                  className="px-2"
                >
                  <Icon name="Plus" size={14} />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Selected Timeframe Display */}
      {selectedTimeframe && (
        <div className="mt-4 p-3 bg-muted/70 rounded-xl border border-border/70">
          <div className="flex items-center">
            <Icon name="CheckCircle" size={16} color="var(--color-success)" className="mr-2" />
            <span className="text-sm text-muted-foreground">
              Selected: {getDisplayText()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeframeSelector;
