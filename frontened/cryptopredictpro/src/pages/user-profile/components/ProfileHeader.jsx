import React from 'react';
import Image from '../../../components/AppImage';
import Icon from '../../../components/AppIcon';

const ProfileHeader = ({ user }) => {
  const providerLabel = user?.provider === 'google' ? 'Google' : 'Email Login';

  return (
    <div className="bg-card rounded-lg shadow-card p-6 mb-6">
      <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
        {/* Profile Avatar */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-muted flex items-center justify-center">
            {user?.avatar ? (
              <Image 
                src={user?.avatar} 
                alt={`${user?.name}'s profile`}
                className="w-full h-full object-cover"
              />
            ) : (
              <Icon name="User" size={40} className="text-muted-foreground" />
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-success rounded-full flex items-center justify-center border-2 border-card">
            <Icon name="CheckCircle" size={16} className="text-white" />
          </div>
        </div>

        {/* Profile Info */}
        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {user?.name}
          </h1>
          <p className="text-muted-foreground mb-3">
            {user?.email}
          </p>
          
          {/* Provider Badge */}
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Icon name="Shield" size={14} className="mr-2" />
            Authenticated via {providerLabel}
          </div>
        </div>

        {/* Account Status */}
        <div className="text-center sm:text-right">
          <div className="text-sm text-muted-foreground mb-1">
            Account Status
          </div>
          <div className="inline-flex items-center px-2 py-1 rounded-md bg-success/10 text-success text-sm font-medium">
            <div className="w-2 h-2 bg-success rounded-full mr-2"></div>
            Active
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
