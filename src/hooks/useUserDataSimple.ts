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

export const useUserDataSimple = () => {
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
    console.log('useUserDataSimple effect triggered', { authLoading, user: user?.id });
    
    if (authLoading) {
      console.log('Auth still loading, waiting...');
      return;
    }

    if (!user) {
      // User signed out - clear all data
      console.log('No user found, clearing data');
      setProducts([]);
      setSales([]);
      setSuppliers([]);
      setStockMovements([]);
      setNotifications([]);
      setSettings(getDefaultSettings(null));
      setDataLoading(false);
      return;
    }

    // User signed in - set default data for now
    console.log('User found, setting default data for:', user.id);
    setProducts([]);
    setSales([]);
    setSuppliers([]);
    setStockMovements([]);
    setNotifications([]);
    setSettings(getDefaultSettings(user));
    setDataLoading(false);
  }, [user, authLoading]);

  // Simple update functions
  const updateProducts = async (newProducts: Product[]) => {
    setProducts(newProducts);
  };

  const updateSales = async (newSales: Sale[]) => {
    setSales(newSales);
  };

  const updateSuppliers = async (newSuppliers: Supplier[]) => {
    setSuppliers(newSuppliers);
  };

  const updateStockMovements = async (newStockMovements: StockMovement[]) => {
    setStockMovements(newStockMovements);
  };

  const updateNotifications = async (newNotifications: Notification[]) => {
    setNotifications(newNotifications);
  };

  const updateSettings = async (newSettings: SettingsType) => {
    setSettings(newSettings);
  };

  const clearUserData = async () => {
    setProducts([]);
    setSales([]);
    setSuppliers([]);
    setStockMovements([]);
    setNotifications([]);
    setSettings(getDefaultSettings(user));
  };

  const syncAllDataToSupabase = async () => {
    console.log('syncAllDataToSupabase called (no-op in simple version)');
  };

  const forceStopLoading = () => {
    console.log('Forcing dataLoading to false');
    setDataLoading(false);
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
    syncAllDataToSupabase,
    forceStopLoading,
    
    // Loading states
    dataLoading: dataLoading || authLoading,
  };
};
