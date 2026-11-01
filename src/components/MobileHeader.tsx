import React, { useState } from 'react';
import { Menu, X, Bell, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface MobileHeaderProps {
  notificationCount?: number;
  onNotificationClick?: () => void;
  onMenuToggle?: () => void;
  isMenuOpen?: boolean;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({ 
  notificationCount = 0, 
  onNotificationClick,
  onMenuToggle,
  isMenuOpen = false
}) => {
  const { user } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const businessName = user?.user_metadata?.business_name || 'My Business';

  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-40 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left side - Menu toggle and logo */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onMenuToggle}
            className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-ghana-gold to-primary-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="font-bold text-lg text-gray-900">Stoqu</span>
          </div>
        </div>

        {/* Right side - Notifications and user */}
        <div className="flex items-center space-x-2">
          {/* Notifications */}
          <button
            onClick={onNotificationClick}
            className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <Bell className="w-6 h-6" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
          </button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 p-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <User className="w-6 h-6" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="font-medium text-gray-900 truncate">{businessName}</p>
                  <p className="text-sm text-gray-500 truncate">{user?.email}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Business name banner - only show when menu is closed */}
      {!isMenuOpen && (
        <div className="mt-2 px-2">
          <p className="text-xs text-gray-500 truncate">{businessName}</p>
        </div>
      )}
    </header>
  );
};

export default MobileHeader;