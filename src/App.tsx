import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { generateId, calculateDashboardStats } from './utils/helpers';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navigation from './components/Navigation';
import Header from './components/Header';
import TrialBanner from './components/TrialBanner';
import TrialExpiredModal from './components/TrialExpiredModal';
import SubscriptionExpiredModal from './components/SubscriptionExpiredModal';
import AccessRestricted from './components/AccessRestricted';
import Dashboard from './components/Dashboard';
import Products from './components/Products';
import Sales from './components/Sales';
import Analytics from './components/Analytics';
import Suppliers from './components/Suppliers';
import StockMovements from './components/StockMovements';
import Reports from './components/Reports';
import Notifications from './components/Notifications';
import Settings from './components/Settings';
import AdminRoute from './components/admin/AdminRoute';
import { useSubscription } from './hooks/useSubscription';
import { useUserData } from './hooks/useUserData';
import { useAuth } from './contexts/AuthContext';
import { getSupabaseClient } from './lib/supabase';
import { SubscriptionDebugPanel } from './utils/subscriptionDebug';
import type { Product, Sale, Supplier, StockMovement, Notification, Settings as SettingsType } from './types';

// Get the Supabase client instance
const supabase = getSupabaseClient();

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Re-enable subscription check but with timeout protection
  const { hasAccess, loading: subscriptionLoading, subscriptionType } = useSubscription();
  const { user } = useAuth();
  
  // Use the new user data hook for isolated data - MUST be at top level before any returns
  const {
    products,
    sales,
    suppliers,
    stockMovements,
    notifications,
    settings,
    updateProducts,
    updateSales,
    updateSuppliers,
    updateStockMovements,
    updateNotifications,
    updateSettings,
    clearUserData,
    syncAllDataToSupabase,
    dataLoading,
  } = useUserData();
  
  // Generate notifications for low stock items with safeguards to prevent infinite loops
  useEffect(() => {
    // Early return conditions to prevent unnecessary execution
    if (!hasAccess || subscriptionLoading || !user || dataLoading) return;
    if (!settings || !settings.notifications || !settings.notifications.lowStock) return; // Don't run if settings not loaded or notifications disabled
    if (products.length === 0) return; // Don't run if no products loaded yet

    // Use a timeout to prevent excessive calls during rapid state changes
    const timeoutId = setTimeout(async () => {
      const lowStockProducts = products.filter(product => 
        product.quantity <= product.minStock && product.quantity > 0
      );
      
      const outOfStockProducts = products.filter(product => product.quantity === 0);

      const newNotifications: Notification[] = [];

      // Check for low stock notifications
      lowStockProducts.forEach(product => {
        const existingNotification = notifications.find(n => 
          n.type === 'low_stock' && 
          n.productId === product.id && 
          !n.isRead
        );

        if (!existingNotification) {
          const newNotification: Notification = {
            id: generateId(),
            type: 'low_stock',
            title: 'Low Stock Alert',
            message: `${product.name} is running low (${product.quantity} left)`,
            productId: product.id,
            isRead: false,
            priority: 'high',
            createdAt: new Date().toISOString(),
          };
          newNotifications.push(newNotification);
        }
      });

      // Check for out of stock notifications
      outOfStockProducts.forEach(product => {
        const existingNotification = notifications.find(n => 
          n.type === 'reorder' && 
          n.productId === product.id && 
          !n.isRead
        );

        if (!existingNotification) {
          const newNotification: Notification = {
            id: generateId(),
            type: 'reorder',
            title: 'Out of Stock',
            message: `${product.name} is out of stock and needs reordering`,
            productId: product.id,
            isRead: false,
            priority: 'high',
            createdAt: new Date().toISOString(),
          };
          newNotifications.push(newNotification);
        }
      });

      // Only update if we have new notifications to add
      if (newNotifications.length > 0) {
        try {
          console.log(`Adding ${newNotifications.length} new notifications`);
          
          // First insert into Supabase
          const notificationsWithUserId = newNotifications.map(notification => ({
            ...notification,
            user_id: user?.id,
            product_id: notification.productId,
            is_read: notification.isRead,
            created_at: notification.createdAt
          }));
          
          const { error: insertError } = await supabase
            .from('notifications')
            .insert(notificationsWithUserId);
          if (insertError) throw insertError;

          // Then update local state
          updateNotifications([...newNotifications, ...notifications]);
        } catch (error) {
          console.error('Error creating notifications:', error);
        }
      }
    }, 1000); // 1 second debounce

    return () => clearTimeout(timeoutId);
  }, [
    // Only depend on essential values that should trigger notification checks
    products.length, // React to products being added/removed
    settings?.notifications?.lowStock, // React to notification setting changes (with safe navigation)
    hasAccess, // React to subscription changes
    user?.id, // React to user changes
    // Note: deliberately excluding 'products' array directly to avoid infinite loops
    // Instead, we'll use a separate effect to track product quantity changes
  ]);

  // Separate effect to track product quantity changes for stock notifications
  useEffect(() => {
    if (!hasAccess || !settings?.notifications?.lowStock || products.length === 0) return;

    // Create a debounced check for quantity changes
    const timeoutId = setTimeout(() => {
      const productQuantities = products.map(p => ({ id: p.id, quantity: p.quantity, minStock: p.minStock }));
      
      productQuantities.forEach(({ id, quantity, minStock }) => {
        // Check if this product crossed a threshold
        if (quantity <= minStock && quantity > 0) {
          const hasExistingLowStockNotification = notifications.some(n => 
            n.type === 'low_stock' && n.productId === id && !n.isRead
          );
          
          if (!hasExistingLowStockNotification) {
            const product = products.find(p => p.id === id);
            if (product) {
              const newNotification: Notification = {
                id: generateId(),
                type: 'low_stock',
                title: 'Low Stock Alert',
                message: `${product.name} is running low (${quantity} left)`,
                productId: id,
                isRead: false,
                priority: 'high',
                createdAt: new Date().toISOString(),
              };
              updateNotifications([newNotification, ...notifications]);
            }
          }
        } else if (quantity === 0) {
          const hasExistingOutOfStockNotification = notifications.some(n => 
            n.type === 'reorder' && n.productId === id && !n.isRead
          );
          
          if (!hasExistingOutOfStockNotification) {
            const product = products.find(p => p.id === id);
            if (product) {
              const newNotification: Notification = {
                id: generateId(),
                type: 'reorder',
                title: 'Out of Stock',
                message: `${product.name} is out of stock and needs reordering`,
                productId: id,
                isRead: false,
                priority: 'high',
                createdAt: new Date().toISOString(),
              };
              updateNotifications([newNotification, ...notifications]);
            }
          }
        }
      });
    }, 500); // Shorter debounce for quantity changes

    return () => clearTimeout(timeoutId);
  }, [
    // Track product quantities specifically
    JSON.stringify(products.map(p => ({ id: p.id, quantity: p.quantity, minStock: p.minStock }))),
    settings?.notifications?.lowStock, // Safe navigation
    hasAccess
  ]);

  // Check for subscription expiry - show appropriate blocking modal based on subscription type
  const hasNoAccess = !hasAccess && !subscriptionLoading && user;
  
  if (hasNoAccess) {
    // Determine which modal to show based on subscription type
    const isTrialExpired = subscriptionType === 'trial' || subscriptionType === 'none';
    const isPaidSubscriptionExpired = subscriptionType === 'monthly' || subscriptionType === 'yearly';
    
    if (isTrialExpired) {
      console.log('Trial expired or no subscription, showing TrialExpiredModal');
      return <TrialExpiredModal />;
    } else if (isPaidSubscriptionExpired) {
      console.log('Paid subscription expired, showing SubscriptionExpiredModal');
      return <SubscriptionExpiredModal />;
    } else {
      // Fallback to trial expired modal for unknown states
      console.log('Unknown subscription state, showing TrialExpiredModal as fallback');
      return <TrialExpiredModal />;
    }
  }
  
  // Show loading while data is being loaded
  if (dataLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-ghana-gold to-primary-500 rounded-xl flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Your Data</h2>
          <p className="text-gray-600">Setting up your personalized workspace...</p>
        </div>
      </div>
    );
  }

  console.log('AppContent: dataLoading is false, rendering main app');

  // Regular user interface below this point
  const handleAddProduct = (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newProduct: Product = {
      ...productData,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    updateProducts([...products, newProduct]);
  };

  const handleAddProductFromCatalog = (catalogProduct: {
    name: string;
    sku_pattern?: string;
    brand?: string;
    category: string;
  }, customData: { cost: number; price: number; quantity: number; minStock: number }) => {
    const newProduct: Product = {
      id: generateId(),
      name: catalogProduct.name,
      sku: catalogProduct.sku_pattern || `${catalogProduct.brand?.slice(0,3).toUpperCase()}-${Date.now()}`,
      category: catalogProduct.category,
      price: customData.price,
      cost: customData.cost,
      quantity: customData.quantity,
      minStock: customData.minStock,
      description: catalogProduct.description,
      supplierId: undefined, // User can assign later
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    updateProducts([...products, newProduct]);
  };

  const handleAddMultipleProducts = (productsData: Array<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>) => {
    const newProducts = productsData.map(productData => ({
      ...productData,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    updateProducts([...products, ...newProducts]);
  };

  const handleUpdateProduct = (id: string, productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    const updatedProducts = products.map(product => 
      product.id === id 
        ? { ...product, ...productData, updatedAt: new Date().toISOString() }
        : product
    );
    updateProducts(updatedProducts);
  };

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        // First delete from Supabase to maintain data consistency
        const { error: deleteError } = await supabase.from('products')
          .delete()
          .eq('id', id)
          .eq('user_id', user?.id);
        if (deleteError) throw deleteError;

        // Then update local state
        const updatedProducts = products.filter(product => product.id !== id);
        const updatedSales = sales.filter(sale => sale.productId !== id);
        const updatedStockMovements = stockMovements.filter(movement => movement.productId !== id);
        const updatedNotifications = notifications.filter(notification => notification.productId !== id);
        
        // Update local state
        updateProducts(updatedProducts);
        updateSales(updatedSales);
        updateStockMovements(updatedStockMovements);
        updateNotifications(updatedNotifications);

        // Also delete related records from Supabase
        await Promise.all([
          supabase.from('sales').delete().eq('product_id', id).eq('user_id', user?.id),
          supabase.from('stock_movements').delete().eq('product_id', id).eq('user_id', user?.id),
          supabase.from('notifications').delete().eq('product_id', id).eq('user_id', user?.id)
        ]);
      } catch (error) {
        console.error('Error deleting product:', error);
        alert('Failed to delete product. Please try again.');
      }
    }
  };

  const handleUpdateProductQuantity = (productId: string, newQuantity: number) => {
    const updatedProducts = products.map(product =>
      product.id === productId
        ? { ...product, quantity: newQuantity, updatedAt: new Date().toISOString() }
        : product
    );
    updateProducts(updatedProducts);
  };

  const handleAddSale = (saleData: Omit<Sale, 'id'>) => {
    const newSale: Sale = {
      ...saleData,
      id: generateId(),
    };
    updateSales([newSale, ...sales]);

    // Create sale notification
    const saleNotification: Notification = {
      id: generateId(),
      type: 'sale',
      title: 'New Sale Recorded',
      message: `Sold ${saleData.quantity} ${saleData.productName} for ${saleData.totalAmount.toFixed(2)}`,
      isRead: false,
      priority: 'low',
      createdAt: new Date().toISOString(),
    };
    updateNotifications([saleNotification, ...notifications]);
  };

  const handleAddSupplier = (supplierData: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newSupplier: Supplier = {
      ...supplierData,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    updateSuppliers([...suppliers, newSupplier]);
  };

  const handleUpdateSupplier = (id: string, supplierData: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>) => {
    const updatedSuppliers = suppliers.map(supplier => 
      supplier.id === id 
        ? { ...supplier, ...supplierData, updatedAt: new Date().toISOString() }
        : supplier
    );
    updateSuppliers(updatedSuppliers);
  };

  const handleDeleteSupplier = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      try {
        // First delete from Supabase to maintain data consistency
        const { error: deleteError } = await supabase.from('suppliers')
          .delete()
          .eq('id', id)
          .eq('user_id', user?.id);
        if (deleteError) throw deleteError;

        // Update local state
        const updatedSuppliers = suppliers.filter(supplier => supplier.id !== id);
        updateSuppliers(updatedSuppliers);

        // Update any products that reference this supplier
        const productsWithSupplier = products.filter(p => p.supplierId === id);
        if (productsWithSupplier.length > 0) {
          const updatedProducts = products.map(product =>
            product.supplierId === id
              ? { ...product, supplierId: undefined, updatedAt: new Date().toISOString() }
              : product
          );
          updateProducts(updatedProducts);
          
          // Update products in Supabase
          await Promise.all(
            productsWithSupplier.map(product =>
              supabase.from('products')
                .update({ supplier_id: null, updated_at: new Date().toISOString() })
                .eq('id', product.id)
            )
          );
        }
      } catch (error) {
        console.error('Error deleting supplier:', error);
        alert('Failed to delete supplier. Please try again.');
      }
    }
  };

  const handleAddStockMovement = (movementData: Omit<StockMovement, 'id'>) => {
    const newMovement: StockMovement = {
      ...movementData,
      id: generateId(),
    };
    updateStockMovements([newMovement, ...stockMovements]);
  };

  const handleUpdateSale = (id: string, saleData: Omit<Sale, 'id'>) => {
    const updatedSales = sales.map(sale => 
      sale.id === id 
        ? { ...sale, ...saleData }
        : sale
    );
    updateSales(updatedSales);
  };

  const handleDeleteSale = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this sale?')) {
      try {
        // First delete from Supabase
        const { error: deleteError } = await supabase.from('sales')
          .delete()
          .eq('id', id)
          .eq('user_id', user?.id);
        if (deleteError) throw deleteError;

        // Then update local state
        const updatedSales = sales.filter(sale => sale.id !== id);
        updateSales(updatedSales);
      } catch (error) {
        console.error('Error deleting sale:', error);
        alert('Failed to delete sale. Please try again.');
      }
    }
  };

  const handleUpdateStockMovement = (id: string, movementData: Omit<StockMovement, 'id'>) => {
    const updatedMovements = stockMovements.map(movement => 
      movement.id === id 
        ? { ...movement, ...movementData }
        : movement
    );
    updateStockMovements(updatedMovements);
  };

  const handleDeleteStockMovement = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this stock movement?')) {
      try {
        // First delete from Supabase
        const { error: deleteError } = await supabase.from('stock_movements')
          .delete()
          .eq('id', id)
          .eq('user_id', user?.id);
        if (deleteError) throw deleteError;

        // Then update local state
        const updatedMovements = stockMovements.filter(movement => movement.id !== id);
        updateStockMovements(updatedMovements);
      } catch (error) {
        console.error('Error deleting stock movement:', error);
        alert('Failed to delete stock movement. Please try again.');
      }
    }
  };

  const handleMarkNotificationAsRead = async (id: string) => {
    try {
      // First update in Supabase
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
      if (updateError) throw updateError;

      // Then update local state
      const updatedNotifications = notifications.map(notification =>
        notification.id === id ? { ...notification, isRead: true } : notification
      );
      updateNotifications(updatedNotifications);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      alert('Failed to mark notification as read. Please try again.');
    }
  };

  const handleMarkAllNotificationsAsRead = async () => {
    try {
      // First update all in Supabase
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user?.id);
      if (updateError) throw updateError;

      // Then update local state
      const updatedNotifications = notifications.map(notification => ({ ...notification, isRead: true }));
      updateNotifications(updatedNotifications);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      alert('Failed to mark all notifications as read. Please try again.');
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      // First delete from Supabase
      const { error: deleteError } = await supabase.from('notifications')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id);
      if (deleteError) throw deleteError;

      // Then update local state
      const updatedNotifications = notifications.filter(notification => notification.id !== id);
      updateNotifications(updatedNotifications);
    } catch (error) {
      console.error('Error deleting notification:', error);
      alert('Failed to delete notification. Please try again.');
    }
  };

  const handleClearAllNotifications = async () => {
    if (window.confirm('Are you sure you want to clear all notifications?')) {
      try {
        // Delete all notifications from Supabase for current user
        const { error: deleteError } = await supabase.from('notifications')
          .delete()
          .eq('user_id', user?.id);
        if (deleteError) throw deleteError;

        // Clear local state
        updateNotifications([]);
      } catch (error) {
        console.error('Error clearing notifications:', error);
        alert('Failed to clear notifications. Please try again.');
      }
    }
  };

  const handleUpdateSettings = async (newSettings: SettingsType) => {
    try {
      if (!user?.id) throw new Error('No user found');

      console.log('Updating settings...', { businessName: newSettings.businessName });

      // Prepare settings data for Supabase (snake_case)
      const settingsData = {
        user_id: user.id,
        business_name: newSettings.businessName || '',
        owner_name: newSettings.ownerName || '',
        phone: newSettings.phone || '',
        email: newSettings.email || '',
        address: newSettings.address || '',
        currency: newSettings.currency || 'GHS',
        tax_rate: newSettings.taxRate || 0,
        low_stock_threshold: newSettings.lowStockThreshold || 5,
        auto_backup: newSettings.autoBackup || false,
        notifications_low_stock: newSettings.notifications?.lowStock || false,
        notifications_daily_summary: newSettings.notifications?.dailySummary || false,
        notifications_weekly_report: newSettings.notifications?.weeklyReport || false,
        updated_at: new Date().toISOString()
      };
      
      console.log('Syncing settings to Supabase...');
      
      const { error: updateError } = await supabase
        .from('settings')
        .upsert(settingsData, { 
          onConflict: 'user_id'
        });
      
      if (updateError) {
        console.error('Supabase settings update error:', updateError);
        throw updateError;
      }

      // Update local state
      updateSettings(newSettings);
      
      // Also update localStorage for offline access
      localStorage.setItem(
        `stoqu_${user.id}_settings`,
        JSON.stringify(newSettings)
      );
      
      console.log('Settings updated successfully:', newSettings.businessName);
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error; // Propagate error to component for user feedback
    }
  };

  const handleExportData = () => {
    const data = {
      products,
      sales,
      suppliers,
      stockMovements,
      notifications,
      settings,
      exportDate: new Date().toISOString(),
      userId: user?.id,
      userEmail: user?.email,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stoqu_backup_${user?.email || 'user'}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleImportData = (data: Record<string, unknown>) => {
    if (window.confirm('This will replace all existing data. Are you sure you want to continue?')) {
      try {
        // Validate that the data belongs to the current user (optional security check)
        if (data.userId && data.userId !== user?.id) {
          if (!window.confirm('This backup appears to be from a different user account. Continue anyway?')) {
            return;
          }
        }

        if (data.products && Array.isArray(data.products)) {
          updateProducts(data.products as Product[]);
        }
        if (data.sales && Array.isArray(data.sales)) {
          updateSales(data.sales as Sale[]);
        }
        if (data.suppliers && Array.isArray(data.suppliers)) {
          updateSuppliers(data.suppliers as Supplier[]);
        }
        if (data.stockMovements && Array.isArray(data.stockMovements)) {
          updateStockMovements(data.stockMovements as StockMovement[]);
        }
        if (data.notifications && Array.isArray(data.notifications)) {
          updateNotifications(data.notifications as Notification[]);
        }
        if (data.settings && typeof data.settings === 'object' && data.settings !== null) {
          updateSettings(data.settings as SettingsType);
        }
        
        alert('Data imported successfully!');
      } catch {
        alert('Error importing data. Please check the file format.');
      }
    }
  };

  const handleNotificationClick = () => {
    setActiveTab('notifications');
  };

  const stats = calculateDashboardStats(products, sales);
  const recentSales = sales.slice(0, 10);
  const unreadNotifications = notifications.filter(n => !n.isRead).length;

  const renderContent = () => {
    const contentMap = {
      dashboard: (
        <Dashboard 
          stats={stats} 
          products={products} 
          recentSales={recentSales}
        />
      ),
      products: (
        <AccessRestricted feature="product management">
          <Products
            products={products}
            suppliers={suppliers}
            onAddProduct={handleAddProduct}
            onAddProductFromCatalog={handleAddProductFromCatalog}
            onAddMultipleProducts={handleAddMultipleProducts}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
          />
        </AccessRestricted>
      ),
      sales: (
        <AccessRestricted feature="sales tracking">
          <Sales
            products={products}
            sales={sales}
            onAddSale={handleAddSale}
            onUpdateSale={handleUpdateSale}
            onDeleteSale={handleDeleteSale}
            onUpdateProductQuantity={handleUpdateProductQuantity}
          />
        </AccessRestricted>
      ),
      suppliers: (
        <AccessRestricted feature="supplier management">
          <Suppliers
            suppliers={suppliers}
            onAddSupplier={handleAddSupplier}
            onUpdateSupplier={handleUpdateSupplier}
            onDeleteSupplier={handleDeleteSupplier}
          />
        </AccessRestricted>
      ),
      'stock-movements': (
        <AccessRestricted feature="stock movement tracking">
          <StockMovements
            products={products}
            suppliers={suppliers}
            stockMovements={stockMovements}
            onAddStockMovement={handleAddStockMovement}
            onUpdateStockMovement={handleUpdateStockMovement}
            onDeleteStockMovement={handleDeleteStockMovement}
            onUpdateProductQuantity={handleUpdateProductQuantity}
          />
        </AccessRestricted>
      ),
      reports: (
        <AccessRestricted feature="advanced reports">
          <Reports
            products={products}
            sales={sales}
            stockMovements={stockMovements}
            suppliers={suppliers}
          />
        </AccessRestricted>
      ),
      notifications: (
        <Notifications
          notifications={notifications}
          onMarkAsRead={handleMarkNotificationAsRead}
          onMarkAllAsRead={handleMarkAllNotificationsAsRead}
          onDeleteNotification={handleDeleteNotification}
          onClearAll={handleClearAllNotifications}
        />
      ),
      analytics: (
        <AccessRestricted feature="business analytics">
          <Analytics
            products={products}
            sales={sales}
          />
        </AccessRestricted>
      ),
      settings: (
        <Settings
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onExportData={handleExportData}
          onImportData={handleImportData}
          onClearUserData={clearUserData}
          onSyncData={syncAllDataToSupabase}
          dataStats={{
            products: products.length,
            sales: sales.length,
            suppliers: suppliers.length,
            stockMovements: stockMovements.length,
          }}
        />
      ),
    };

    return contentMap[activeTab as keyof typeof contentMap] || null;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Navigation */}
      <Navigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        notificationCount={unreadNotifications}
      />
      
      {/* Main Content Area - Only margin on desktop, mobile content takes full width */}
      <div className="flex-1 flex flex-col lg:ml-64 pt-16 lg:pt-0">
        {/* Trial Banner */}
        <TrialBanner />
        
        {/* Header - hidden on mobile since navigation is in top header */}
        <div className="hidden lg:block">
          <Header 
            notificationCount={unreadNotifications}
            onNotificationClick={handleNotificationClick}
          />
        </div>
        
        {/* Page Content - Full width on mobile, constrained on desktop */}
        <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Check if admin route is requested - this should be checked BEFORE ProtectedRoute
  const isAdminRoute = currentPath === '/admin';

  return (
    <Router>
      <AuthProvider>
        {isAdminRoute ? (
          // Admin route bypasses the ProtectedRoute to allow separate admin login
          <AdminRoute />
        ) : (
          // All other routes go through the standard protected route
          <ProtectedRoute>
            <AppContent />
            <SubscriptionDebugPanel />
          </ProtectedRoute>
        )}
      </AuthProvider>
    </Router>
  );
}

export default App;
