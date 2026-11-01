import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { User } from '@supabase/supabase-js';
import type { Product, Sale, Supplier, StockMovement, Notification, Settings as SettingsType } from '../types';

// Default settings for new users
const getDefaultSettings = (user: User | null): SettingsType => ({
  businessName: user?.user_metadata?.business_name || 'My Business',
  ownerName: user?.user_metadata?.owner_name || 'Business Owner',
  phone: '',
  email: user?.email || '',
  address: '',
  currency: 'GHS',
  taxRate: 12.5,
  lowStockThreshold: 5,
  autoBackup: true,
  notifications: {
    lowStock: true,
    dailySummary: true,
    weeklyReport: true,
  },
});

// Generate user-specific storage keys
const getUserStorageKey = (userId: string, dataType: string) => {
  return `stoqu_${userId}_${dataType}`;
};

// Clear any old global storage keys (migration cleanup)
const clearGlobalStorageKeys = () => {
  const globalKeys = [
    'stoqu-products',
    'stoqu-sales', 
    'stoqu-suppliers',
    'stoqu-stock-movements',
    'stoqu-notifications',
    'stoqu-settings'
  ];
  
  globalKeys.forEach(key => {
    localStorage.removeItem(key);
  });
};

export const useUserData = () => {
  const { user, loading: authLoading } = useAuth();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<SettingsType>(getDefaultSettings(null));
  const [dataLoading, setDataLoading] = useState(true);

  // Load user-specific data when user changes
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // User signed out - clear all data
      setProducts([]);
      setSales([]);
      setSuppliers([]);
      setStockMovements([]);
      setNotifications([]);
      setSettings(getDefaultSettings(null));
      setDataLoading(false);
      return;
    }

    // User signed in - load their specific data
    loadUserData(user.id);
  }, [user, authLoading]);

  const loadUserData = (userId: string) => {
    try {
      // Clear any old global storage keys first
      clearGlobalStorageKeys();

      // Load user-specific data
      const userProducts = localStorage.getItem(getUserStorageKey(userId, 'products'));
      const userSales = localStorage.getItem(getUserStorageKey(userId, 'sales'));
      const userSuppliers = localStorage.getItem(getUserStorageKey(userId, 'suppliers'));
      const userStockMovements = localStorage.getItem(getUserStorageKey(userId, 'stock_movements'));
      const userNotifications = localStorage.getItem(getUserStorageKey(userId, 'notifications'));
      const userSettings = localStorage.getItem(getUserStorageKey(userId, 'settings'));

      // Parse and set data, with fallbacks to empty arrays/default settings
      setProducts(userProducts ? JSON.parse(userProducts) : []);
      setSales(userSales ? JSON.parse(userSales) : []);
      setSuppliers(userSuppliers ? JSON.parse(userSuppliers) : []);
      setStockMovements(userStockMovements ? JSON.parse(userStockMovements) : []);
      setNotifications(userNotifications ? JSON.parse(userNotifications) : []);
      setSettings(userSettings ? JSON.parse(userSettings) : getDefaultSettings(user));

      console.log('User data loaded successfully for user:', userId);

    } catch (error) {
      console.error('Error loading user data:', error);
      // On error, start with fresh data
      setProducts([]);
      setSales([]);
      setSuppliers([]);
      setStockMovements([]);
      setNotifications([]);
      setSettings(getDefaultSettings(user));
    } finally {
      setDataLoading(false);
    }
  };

  const saveUserData = (userId: string, dataType: string, data: any) => {
    try {
      localStorage.setItem(getUserStorageKey(userId, dataType), JSON.stringify(data));
    } catch (error) {
      console.error(`Error saving ${dataType}:`, error);
    }
  };

  // Update functions that save to user-specific storage
  const updateProducts = (newProducts: Product[]) => {
    setProducts(newProducts);
    if (user) {
      saveUserData(user.id, 'products', newProducts);
    }
  };

  const updateSales = (newSales: Sale[]) => {
    setSales(newSales);
    if (user) {
      saveUserData(user.id, 'sales', newSales);
    }
  };

  const updateSuppliers = (newSuppliers: Supplier[]) => {
    setSuppliers(newSuppliers);
    if (user) {
      saveUserData(user.id, 'suppliers', newSuppliers);
    }
  };

  const updateStockMovements = (newStockMovements: StockMovement[]) => {
    setStockMovements(newStockMovements);
    if (user) {
      saveUserData(user.id, 'stock_movements', newStockMovements);
    }
  };

  const updateNotifications = (newNotifications: Notification[]) => {
    setNotifications(newNotifications);
    if (user) {
      saveUserData(user.id, 'notifications', newNotifications);
    }
  };

  const updateSettings = (newSettings: SettingsType) => {
    setSettings(newSettings);
    if (user) {
      saveUserData(user.id, 'settings', newSettings);
    }
  };

  // Clear all user data (for account deletion or reset)
  const clearUserData = () => {
    if (!user) return;

    const dataTypes = ['products', 'sales', 'suppliers', 'stock_movements', 'notifications', 'settings'];
    dataTypes.forEach(dataType => {
      localStorage.removeItem(getUserStorageKey(user.id, dataType));
    });

    // Reset to fresh state
    setProducts([]);
    setSales([]);
    setSuppliers([]);
    setStockMovements([]);
    setNotifications([]);
    setSettings(getDefaultSettings(user));
  };

  return {
    // Data
    products,
    sales,
    suppliers,
    stockMovements,
    notifications,
    settings,
    
    // Update functions
    updateProducts,
    updateSales,
    updateSuppliers,
    updateStockMovements,
    updateNotifications,
    updateSettings,
    
    // Utility functions
    clearUserData,
    
    // Loading states
    dataLoading: dataLoading || authLoading,
  };
};
