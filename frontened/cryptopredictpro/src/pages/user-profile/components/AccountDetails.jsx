import React from 'react';
import Icon from '../../../components/AppIcon';

const AccountDetails = ({ user }) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString)?.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const accountDetails = [
    {
      label: 'Full Name',
      value: user?.name,
      icon: 'User',
      editable: false
    },
    {
      label: 'Email Address',
      value: user?.email,
      icon: 'Mail',
      editable: false
    },
    {
      label: 'Authentication Provider',
      value: user?.provider === 'google' ? 'Google' : 'Email',
      icon: 'Shield',
      editable: false
    },
    {
      label: 'Account Created',
      value: formatDate(user?.created_at || user?.createdAt),
      icon: 'Calendar',
      editable: false
    },
    {
      label: 'Last Login',
      value: formatDate(user?.last_login || user?.lastLogin),
      icon: 'Clock',
      editable: false
    },
    {
      label: 'User ID',
      value: user?.id,
      icon: 'Hash',
      editable: false
    }
  ];

  return (
    <div className="bg-card rounded-lg shadow-card p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-foreground">
          Account Details
        </h2>
        <div className="text-sm text-muted-foreground">
          Managed by {user?.provider === 'google' ? 'Google' : 'Email Login'}
        </div>
      </div>
      <div className="space-y-4">
        {accountDetails?.map((detail, index) => (
          <div key={index} className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                <Icon name={detail?.icon} size={18} className="text-muted-foreground" />
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">
                  {detail?.label}
                </div>
                <div className="text-sm text-muted-foreground">
                  {detail?.value}
                </div>
              </div>
            </div>
            
            {!detail?.editable && (
              <div className="flex items-center text-xs text-muted-foreground">
                <Icon name="Lock" size={12} className="mr-1" />
                Read-only
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-start space-x-3">
          <Icon name="Info" size={16} className="text-primary mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Account Information</p>
            <p>Your account details are managed by your authentication provider and cannot be edited directly from this page.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountDetails;
