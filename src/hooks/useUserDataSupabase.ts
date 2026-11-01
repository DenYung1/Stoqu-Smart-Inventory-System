import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
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

export const useUserData = () => {
  const { user, loading: authLoading } = useAuth();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<SettingsType>(getDefaultSettings(null));
  const [dataLoading, setDataLoading] = useState(true);

  // Load user data from Supabase when user changes
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

    // User signed in - load their data from Supabase
    loadUserDataFromDatabase();
  }, [user, authLoading]);

  const loadUserDataFromDatabase = async () => {
    if (!user) return;

    try {
      setDataLoading(true);

      // Load all user data in parallel with user_id filtering
      const [
        productsResult,
        salesResult,
        suppliersResult,
        stockMovementsResult,
        notificationsResult,
        settingsResult
      ] = await Promise.all([
        supabase.from('products').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('sales').select('*').eq('user_id', user.id).order('date', { ascending: false }),
        supabase.from('suppliers').select('*').eq('user_id', user.id).order('name'),
        supabase.from('stock_movements').select('*').eq('user_id', user.id).order('date', { ascending: false }),
        supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('settings').select('*').eq('user_id', user.id).single()
      ]);

      // Set data with fallbacks to empty arrays/default settings
      setProducts(productsResult.data || []);
      setSales(salesResult.data || []);
      setSuppliers(suppliersResult.data || []);
      setStockMovements(stockMovementsResult.data || []);
      setNotifications(notificationsResult.data || []);
      
      // Handle settings - if no settings exist, create default ones
      if (settingsResult.data) {
        setSettings(settingsResult.data as SettingsType);
      } else {
        const defaultSettings = { ...getDefaultSettings(user), user_id: user.id };
        setSettings(defaultSettings);
        // Create default settings in database with user_id
        await supabase.from('settings').insert(defaultSettings);
      }

      console.log('User data loaded from database successfully');

    } catch (error) {
      console.error('Error loading user data from database:', error);
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

  // Database update functions
  const updateProducts = async (newProducts: Product[]) => {
    setProducts(newProducts);
    
    if (!user) return;

    try {
      // For simplicity, we'll update the products as they are modified
      // In a real app, you might want to implement more sophisticated sync logic
      console.log('Products updated locally, database sync handled by individual CRUD operations');
    } catch (error) {
      console.error('Error syncing products to database:', error);
    }
  };

  const updateSales = async (newSales: Sale[]) => {
    setSales(newSales);
    
    if (!user) return;

    try {
      console.log('Sales updated locally, database sync handled by individual CRUD operations');
    } catch (error) {
      console.error('Error syncing sales to database:', error);
    }
  };

  const updateSuppliers = async (newSuppliers: Supplier[]) => {
    setSuppliers(newSuppliers);
    
    if (!user) return;

    try {
      console.log('Suppliers updated locally, database sync handled by individual CRUD operations');
    } catch (error) {
      console.error('Error syncing suppliers to database:', error);
    }
  };

  const updateStockMovements = async (newStockMovements: StockMovement[]) => {
    setStockMovements(newStockMovements);
    
    if (!user) return;

    try {
      console.log('Stock movements updated locally, database sync handled by individual CRUD operations');
    } catch (error) {
      console.error('Error syncing stock movements to database:', error);
    }
  };

  const updateNotifications = async (newNotifications: Notification[]) => {
    setNotifications(newNotifications);
    
    if (!user) return;

    try {
      // Sync notifications to database
      // First, clear existing notifications for this user
      await supabase.from('notifications').delete().eq('user_id', user.id);
      
      // Then insert new notifications with user_id
      if (newNotifications.length > 0) {
        const notificationsWithUserId = newNotifications.map(notification => ({
          ...notification,
          user_id: user.id
        }));
        await supabase.from('notifications').insert(notificationsWithUserId);
      }
    } catch (error) {
      console.error('Error syncing notifications to database:', error);
    }
  };

  const updateSettings = async (newSettings: SettingsType) => {
    setSettings(newSettings);
    
    if (!user) return;

    try {
      // Update settings in database with user_id
      const settingsWithUserId = { ...newSettings, user_id: user.id };
      const { error } = await supabase
        .from('settings')
        .upsert(settingsWithUserId);

      if (error) throw error;
    } catch (error) {
      console.error('Error syncing settings to database:', error);
    }
  };

  // Clear all user data (for account deletion or reset)
  const clearUserData = async () => {
    if (!user) return;

    try {
      // Clear data from database for this user only
      await Promise.all([
        supabase.from('products').delete().eq('user_id', user.id),
        supabase.from('sales').delete().eq('user_id', user.id),
        supabase.from('suppliers').delete().eq('user_id', user.id),
        supabase.from('stock_movements').delete().eq('user_id', user.id),
        supabase.from('notifications').delete().eq('user_id', user.id),
      ]);

      // Reset to fresh state
      setProducts([]);
      setSales([]);
      setSuppliers([]);
      setStockMovements([]);
      setNotifications([]);
      setSettings(getDefaultSettings(user));

      console.log('User data cleared from database');
    } catch (error) {
      console.error('Error clearing user data from database:', error);
    }
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
    loadUserDataFromDatabase,
    
    // Loading states
    dataLoading: dataLoading || authLoading,
  };
};
