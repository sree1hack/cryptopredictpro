import React from 'react';
import Icon from '../../../components/AppIcon';

const DashboardStats = ({ user, totalPredictions, accuracyRate, lastActivity }) => {
  const stats = [
    {
      label: 'Total Predictions',
      value: totalPredictions || 0,
      icon: 'BarChart3',
      color: 'var(--color-primary)',
      bgColor: 'bg-primary/10'
    },
    {
      label: 'Accuracy Rate',
      value: `${accuracyRate || 0}%`,
      icon: 'Target',
      color: 'var(--color-success)',
      bgColor: 'bg-success/10'
    },
    {
      label: 'Active Since',
      value: user?.createdAt ? new Date(user.createdAt)?.toLocaleDateString() : 'Today',
      icon: 'Calendar',
      color: 'var(--color-accent)',
      bgColor: 'bg-accent/10'
    },
    {
      label: 'Last Activity',
      value: lastActivity || 'Just now',
      icon: 'Clock',
      color: 'var(--color-secondary)',
      bgColor: 'bg-secondary/10'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats?.map((stat, index) => (
        <div key={index} className="neo-card hud-border p-4">
          <div className="flex items-center">
            <div className={`w-10 h-10 ${stat?.bgColor} rounded-xl flex items-center justify-center mr-3`}>
              <Icon name={stat?.icon} size={20} color={stat?.color} />
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{stat?.label}</p>
              <p className="text-lg font-semibold text-foreground font-display">{stat?.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DashboardStats;
