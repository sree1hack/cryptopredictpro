import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const SecuritySection = ({ user, sessionInfo, sessionMessage, sessionError, onLogout, onRefreshSession }) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    if (onLogout) {
      onLogout();
    }
  };

  const handleCancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const formatDateTime = (value) => {
    if (!value) return 'N/A';
    return new Date(value).toLocaleString();
  };

  const authMethod = user?.provider === 'google' ? 'Google OAuth 2.0' : 'Email + Password';

  const securityItems = [
    {
      title: 'Current Session',
      description: `Active on this browser. Refreshed: ${formatDateTime(sessionInfo?.refreshedAt)}`,
      icon: 'Monitor',
      status: 'active',
      action: null
    },
    {
      title: 'Authentication Method',
      description: authMethod,
      icon: 'Shield',
      status: 'secure',
      action: null
    },
    {
      title: 'Account Security',
      description: 'Two-factor authentication via Google',
      icon: 'Lock',
      status: 'protected',
      action: null
    },
    {
      title: 'Data Privacy',
      description: 'Your data is encrypted and secure',
      icon: 'Eye',
      status: 'private',
      action: null
    }
  ];

  const getStatusBadge = (status) => {
    const configs = {
      active: { color: 'bg-success/10 text-success', text: 'Active' },
      secure: { color: 'bg-primary/10 text-primary', text: 'Secure' },
      protected: { color: 'bg-warning/10 text-warning', text: 'Protected' },
      private: { color: 'bg-secondary/10 text-secondary', text: 'Private' }
    };
    
    return configs?.[status] || configs?.secure;
  };

  return (
    <div className="bg-card rounded-lg shadow-card p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-foreground">
          Security & Sessions
        </h2>
        <div className="flex items-center text-sm text-success">
          <div className="w-2 h-2 bg-success rounded-full mr-2"></div>
          Secure
        </div>
      </div>
      <div className="space-y-4 mb-6">
        {securityItems?.map((item, index) => {
          const badge = getStatusBadge(item?.status);
          
          return (
            <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                  <Icon name={item?.icon} size={18} className="text-muted-foreground" />
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">
                    {item?.title}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {item?.description}
                  </div>
                </div>
              </div>
              <div className={`px-2 py-1 rounded-md text-xs font-medium ${badge?.color}`}>
                {badge?.text}
              </div>
            </div>
          );
        })}
      </div>
      {/* Session Management */}
      <div className="border-t border-border pt-6">
        <h3 className="text-lg font-medium text-foreground mb-4">
          Session Management
        </h3>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            variant="destructive"
            onClick={handleLogoutClick}
            iconName="LogOut"
            iconPosition="left"
            className="flex-1 sm:flex-none"
          >
            Sign Out
          </Button>
          
          <Button
            variant="outline"
            onClick={onRefreshSession}
            iconName="RefreshCw"
            iconPosition="left"
            className="flex-1 sm:flex-none"
          >
            Refresh Session
          </Button>
        </div>
        {sessionMessage && (
          <p className="mt-3 text-sm text-success">{sessionMessage}</p>
        )}
        {sessionError && (
          <p className="mt-3 text-sm text-error">{sessionError}</p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Session expires: {formatDateTime(sessionInfo?.expiresAt)}
        </p>
      </div>
      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-modal max-w-md w-full p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-destructive/10 rounded-lg flex items-center justify-center">
                <Icon name="LogOut" size={20} className="text-destructive" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Confirm Sign Out
                </h3>
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to sign out?
                </p>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mb-6">
              You will be redirected to the login page and will need to authenticate again to access your account.
            </p>
            
            <div className="flex gap-3">
              <Button
                variant="destructive"
                onClick={handleConfirmLogout}
                className="flex-1"
              >
                Sign Out
              </Button>
              <Button
                variant="outline"
                onClick={handleCancelLogout}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecuritySection;
