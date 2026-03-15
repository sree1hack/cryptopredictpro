import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Icon from '../AppIcon';
import Button from './Button';

const Header = ({ user, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const navigationItems = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: 'BarChart3'
    },
    {
      label: 'Profile',
      path: '/user-profile',
      icon: 'User'
    }
  ];

  const handleNavigation = (path) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
    setIsMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const isActivePath = (path) => {
    return location?.pathname === path;
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-1000 border-b border-border/70 bg-card/70 backdrop-blur-xl">
      <div className="grid-background flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Logo */}
        <div className="flex items-center">
          <div 
            className="flex items-center cursor-pointer transition-smooth hover:opacity-80"
            onClick={() => handleNavigation('/dashboard')}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mr-3 soft-glow">
              <Icon name="TrendingUp" size={20} color="white" />
            </div>
            <span className="text-xl font-bold text-gradient font-display">
              CryptoPredictPro
            </span>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-1">
          {navigationItems?.map((item) => (
            <button
              key={item?.path}
              onClick={() => handleNavigation(item?.path)}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-smooth ${
                isActivePath(item?.path)
                  ? 'bg-primary/20 text-foreground soft-glow'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
              }`}
            >
              <Icon name={item?.icon} size={16} className="mr-2" />
              {item?.label}
            </button>
          ))}
          
          {user && (
            <div className="flex items-center ml-4 pl-4 border-l border-border">
              <div className="flex items-center mr-3">
                <div className="w-8 h-8 bg-secondary/80 rounded-full flex items-center justify-center border border-border/70">
                  <Icon name="User" size={16} color="white" />
                </div>
                <span className="ml-2 text-sm font-medium text-foreground hidden lg:block">
                  {user?.name || user?.email}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                iconName="LogOut"
                iconSize={16}
              >
                Logout
              </Button>
            </div>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMobileMenu}
            iconName={isMobileMenuOpen ? "X" : "Menu"}
            iconSize={20}
          />
        </div>
      </div>
      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-card/95 backdrop-blur-xl border-t border-border shadow-modal z-1001">
          <div className="px-4 py-2 space-y-1">
            {navigationItems?.map((item) => (
              <button
                key={item?.path}
                onClick={() => handleNavigation(item?.path)}
                className={`flex items-center w-full px-3 py-2 rounded-md text-sm font-medium transition-smooth ${
                  isActivePath(item?.path)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Icon name={item?.icon} size={16} className="mr-3" />
                {item?.label}
              </button>
            ))}
            
            {user && (
              <>
                <div className="border-t border-border my-2"></div>
                <div className="flex items-center px-3 py-2">
                  <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                    <Icon name="User" size={16} color="white" />
                  </div>
                  <span className="ml-3 text-sm font-medium text-foreground">
                    {user?.name || user?.email}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-smooth"
                >
                  <Icon name="LogOut" size={16} className="mr-3" />
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
